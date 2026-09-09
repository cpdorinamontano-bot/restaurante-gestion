import { supabase } from "@/lib/supabase";
import { fetchEstadoResultadosMes } from "@/lib/reporteEstadoResultados";

export interface FilaInventarioMensual {
  id: string | null;
  periodo: string; // YYYY-MM-01
  capturado: boolean; // existe fila en inventarios_mensuales
  inventarioInicial: number;
  comprasInsumos: number;
  inventarioFinal: number;
  costoConsumido: number | null; // null hasta que se capture el inventario final del mes
  ventasNeta: number | null;
  pctSobreVentas: number | null;
  notas: string | null;
}

function periodosDelAnio(anio: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, "0")}-01`);
}

/** Compras de insumos del mes — misma clasificación que usan los reportes (categoría que contiene "compra"). */
async function fetchComprasInsumosPorMes(sucursalId: string, anio: number): Promise<Record<string, number>> {
  const inicio = `${anio}-01-01`;
  const fin = `${anio}-12-31`;
  const { data, error } = await supabase
    .from("gastos")
    .select("fecha, subtotal, impuestos, categorias_gastos!inner(nombre)")
    .eq("sucursal_id", sucursalId)
    .eq("estatus", "activo")
    .gte("fecha", inicio)
    .lte("fecha", fin)
    .ilike("categorias_gastos.nombre", "%compra%");
  if (error) throw error;
  const porMes: Record<string, number> = {};
  (data ?? []).forEach((g: any) => {
    const periodo = `${g.fecha.slice(0, 7)}-01`;
    porMes[periodo] = (porMes[periodo] ?? 0) + Number(g.subtotal ?? 0) + Number(g.impuestos ?? 0);
  });
  return porMes;
}

export async function fetchInventarioAnio(sucursalId: string, anio: number): Promise<FilaInventarioMensual[]> {
  const periodos = periodosDelAnio(anio);

  const [capturaRes, comprasPorMes, ventasPorMes] = await Promise.all([
    supabase
      .from("inventarios_mensuales")
      .select("*")
      .eq("sucursal_id", sucursalId)
      .eq("estatus", "activo")
      .gte("periodo", periodos[0])
      .lte("periodo", periodos[11]),
    fetchComprasInsumosPorMes(sucursalId, anio),
    Promise.all(periodos.map((p) => fetchEstadoResultadosMes(sucursalId, p))),
  ]);
  if (capturaRes.error) throw capturaRes.error;

  const capturaPorPeriodo = new Map((capturaRes.data ?? []).map((r: any) => [r.periodo, r]));
  const ventasPorPeriodo = new Map(ventasPorMes.map((v) => [v.periodo, v]));

  return periodos.map((periodo) => {
    const fila = capturaPorPeriodo.get(periodo);
    const comprasInsumos = comprasPorMes[periodo] ?? 0;
    const inventarioInicial = fila ? Number(fila.inventario_inicial) : 0;
    const inventarioFinal = fila ? Number(fila.inventario_final) : 0;
    const capturado = !!fila;
    const costoConsumido = capturado ? inventarioInicial + comprasInsumos - inventarioFinal : null;
    const estadoMes = ventasPorPeriodo.get(periodo);
    const ventasNeta = estadoMes?.tieneDatos ? estadoMes.ventas : null;
    const pctSobreVentas = costoConsumido !== null && ventasNeta ? (costoConsumido / ventasNeta) * 100 : null;
    return {
      id: fila?.id ?? null,
      periodo,
      capturado,
      inventarioInicial,
      comprasInsumos,
      inventarioFinal,
      costoConsumido,
      ventasNeta,
      pctSobreVentas,
      notas: fila?.notas ?? null,
    };
  });
}

export async function guardarInventarioMes(params: {
  sucursalId: string;
  periodo: string;
  inventarioInicial: number;
  inventarioFinal: number;
  userId?: string;
}) {
  const { error } = await supabase.from("inventarios_mensuales").upsert(
    {
      sucursal_id: params.sucursalId,
      periodo: params.periodo,
      inventario_inicial: params.inventarioInicial,
      inventario_final: params.inventarioFinal,
      updated_by: params.userId,
      created_by: params.userId,
    },
    { onConflict: "periodo,sucursal_id" }
  );
  if (error) throw error;
}
