import { supabase } from "@/lib/supabase";
import type { DesgloseItem } from "@/lib/reportes";

export interface EstadoResultadosMes {
  periodo: string; // YYYY-MM-01
  tieneDatos: boolean;

  ventas: number;
  ventasFuente: "modulo_ventas" | "ingresos_bancos_caja" | "sin_datos";

  compras: number;
  manoDeObra: number;
  totalCostoVentas: number;
  pctMO: number | null;
  pctCosto: number | null;

  propinas: number;
  comisiones: number;
  gastosFijos: number;
  mantenimiento: number;
  impuestos: number;
  otrosGastosGenerales: number;
  otrosGastosGeneralesDesglose: DesgloseItem[];
  totalGastosGenerales: number;

  utilidadFinanciera: number;
  margenUtilidadFinanciera: number | null;

  retirosSocios: number;
  gastosPersonalesSocios: number;
  nominaSocios: number;
  totalRetSocios: number;
  margenSocios: number | null;

  totalEgresos: number;
  utilidadNeta: number;
  margenUtilidadNeta: number | null;
}

function rangoMes(periodoInicio: string) {
  const inicio = new Date(`${periodoInicio}T00:00:00`);
  const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);
  return { inicio: periodoInicio, fin: fin.toISOString().slice(0, 10) };
}

function pct(num: number, den: number): number | null {
  return den > 0 ? Number(((num / den) * 100).toFixed(2)) : null;
}

export async function fetchEstadoResultadosMes(sucursalId: string, periodoInicio: string): Promise<EstadoResultadosMes> {
  const { inicio, fin } = rangoMes(periodoInicio);
  const periodo = `${periodoInicio.slice(0, 7)}-01`;

  const [ventasRes, gastosRes, movBancariosRes, movCajaRes] = await Promise.all([
    supabase.from("ventas").select("venta_neta").eq("sucursal_id", sucursalId).eq("estatus", "activo").gte("fecha", inicio).lte("fecha", fin),
    supabase
      .from("gastos")
      .select("subtotal, impuestos, categorias_gastos(nombre, tipo, es_socios)")
      .eq("sucursal_id", sucursalId)
      .eq("estatus", "activo")
      .gte("fecha", inicio)
      .lte("fecha", fin),
    supabase.from("movimientos_bancarios").select("abono").gte("fecha", inicio).lte("fecha", fin),
    supabase
      .from("movimientos_caja")
      .select("importe, tipo_movimiento")
      .gte("fecha", inicio)
      .lte("fecha", fin)
      .in("tipo_movimiento", ["venta_efectivo", "entrada", "deposito", "reposicion"]),
  ]);

  const ventasFilas = ventasRes.data ?? [];
  const ventasModulo = ventasFilas.reduce((s, v) => s + Number(v.venta_neta ?? 0), 0);
  const gastos = gastosRes.data ?? [];

  // Igual que fetchReporteMensual: el módulo de Ventas es la fuente ideal; si no se ha
  // capturado ahí, los ingresos de banco y caja YA reflejan las ventas cobradas del periodo.
  let ventas = 0;
  let ventasFuente: EstadoResultadosMes["ventasFuente"] = "sin_datos";
  if (ventasModulo > 0) {
    ventas = ventasModulo;
    ventasFuente = "modulo_ventas";
  } else {
    const flujoIngresos =
      (movBancariosRes.data ?? []).reduce((s, m) => s + Number(m.abono ?? 0), 0) +
      (movCajaRes.data ?? []).reduce((s, m) => s + Number(m.importe ?? 0), 0);
    if (flujoIngresos > 0) {
      ventas = flujoIngresos;
      ventasFuente = "ingresos_bancos_caja";
    }
  }

  let compras = 0;
  let manoDeObra = 0;
  let propinas = 0;
  let comisiones = 0;
  let gastosFijos = 0;
  let mantenimiento = 0;
  let impuestos = 0;
  let retirosSocios = 0;
  let gastosPersonalesSocios = 0;
  let nominaSocios = 0;
  const otrosMap = new Map<string, number>();

  gastos.forEach((g: any) => {
    const cat = g.categorias_gastos;
    const nombre: string = cat?.nombre ?? "Sin categoría";
    const esSocios: boolean = !!cat?.es_socios;
    const monto = Number(g.subtotal ?? 0) + Number(g.impuestos ?? 0);

    if (esSocios) {
      if (/nómina socio|nomina socio/i.test(nombre)) nominaSocios += monto;
      else if (/retiro/i.test(nombre)) retirosSocios += monto;
      else gastosPersonalesSocios += monto;
      return;
    }
    if (/compra/i.test(nombre)) {
      compras += monto;
      return;
    }
    if (/^nómina|^nomina/i.test(nombre)) {
      manoDeObra += monto;
      return;
    }
    if (/propina/i.test(nombre)) {
      propinas += monto;
      return;
    }
    if (/comisi/i.test(nombre)) {
      comisiones += monto;
      return;
    }
    if (/impuesto/i.test(nombre)) {
      impuestos += monto;
      return;
    }
    if (/mantenimiento/i.test(nombre)) {
      mantenimiento += monto;
      return;
    }
    if (/gastos fijos/i.test(nombre)) {
      gastosFijos += monto;
      return;
    }
    otrosMap.set(nombre, (otrosMap.get(nombre) ?? 0) + monto);
  });

  const otrosGastosGeneralesDesglose = [...otrosMap.entries()]
    .map(([nombre, monto]) => ({ nombre, monto }))
    .sort((a, b) => b.monto - a.monto);
  const otrosGastosGenerales = otrosGastosGeneralesDesglose.reduce((s, o) => s + o.monto, 0);

  const totalCostoVentas = compras + manoDeObra;
  const totalGastosGenerales = propinas + comisiones + gastosFijos + mantenimiento + impuestos + otrosGastosGenerales;
  const utilidadFinanciera = ventas - totalCostoVentas - totalGastosGenerales;
  const totalRetSocios = retirosSocios + gastosPersonalesSocios + nominaSocios;
  const totalEgresos = totalCostoVentas + totalGastosGenerales + totalRetSocios;
  const utilidadNeta = utilidadFinanciera - totalRetSocios;

  // Requiere ventas Y gastos capturados: si solo hay depósitos bancarios pero ningún gasto
  // categorizado todavía, el costo real es desconocido (no cero) — se marca PENDIENTE en
  // vez de mostrar una utilidad inflada y falsa.
  const tieneDatos = ventasFuente !== "sin_datos" && gastos.length > 0;

  return {
    periodo,
    tieneDatos,
    ventas,
    ventasFuente,
    compras,
    manoDeObra,
    totalCostoVentas,
    pctMO: tieneDatos ? pct(manoDeObra, ventas) : null,
    pctCosto: tieneDatos ? pct(totalCostoVentas, ventas) : null,
    propinas,
    comisiones,
    gastosFijos,
    mantenimiento,
    impuestos,
    otrosGastosGenerales,
    otrosGastosGeneralesDesglose,
    totalGastosGenerales,
    utilidadFinanciera,
    margenUtilidadFinanciera: tieneDatos ? pct(utilidadFinanciera, ventas) : null,
    retirosSocios,
    gastosPersonalesSocios,
    nominaSocios,
    totalRetSocios,
    margenSocios: tieneDatos ? pct(totalRetSocios, ventas) : null,
    totalEgresos,
    utilidadNeta,
    margenUtilidadNeta: tieneDatos ? pct(utilidadNeta, ventas) : null,
  };
}

function mergeDesglose(listas: DesgloseItem[][]): DesgloseItem[] {
  const mapa = new Map<string, number>();
  listas.flat().forEach((it) => mapa.set(it.nombre, (mapa.get(it.nombre) ?? 0) + it.monto));
  return [...mapa.entries()].map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto);
}

/** Combina varios meses en un total: suma los $ y recalcula los % sobre las bases sumadas. Ignora meses sin datos. */
export function sumarEstadoResultados(meses: EstadoResultadosMes[]): EstadoResultadosMes {
  const conDatos = meses.filter((m) => m.tieneDatos);
  const sum = (f: (m: EstadoResultadosMes) => number) => conDatos.reduce((s, m) => s + f(m), 0);

  const ventas = sum((m) => m.ventas);
  const compras = sum((m) => m.compras);
  const manoDeObra = sum((m) => m.manoDeObra);
  const totalCostoVentas = compras + manoDeObra;

  const propinas = sum((m) => m.propinas);
  const comisiones = sum((m) => m.comisiones);
  const gastosFijos = sum((m) => m.gastosFijos);
  const mantenimiento = sum((m) => m.mantenimiento);
  const impuestos = sum((m) => m.impuestos);
  const otrosGastosGeneralesDesglose = mergeDesglose(conDatos.map((m) => m.otrosGastosGeneralesDesglose));
  const otrosGastosGenerales = sum((m) => m.otrosGastosGenerales);
  const totalGastosGenerales = propinas + comisiones + gastosFijos + mantenimiento + impuestos + otrosGastosGenerales;

  const utilidadFinanciera = ventas - totalCostoVentas - totalGastosGenerales;

  const retirosSocios = sum((m) => m.retirosSocios);
  const gastosPersonalesSocios = sum((m) => m.gastosPersonalesSocios);
  const nominaSocios = sum((m) => m.nominaSocios);
  const totalRetSocios = retirosSocios + gastosPersonalesSocios + nominaSocios;

  const totalEgresos = totalCostoVentas + totalGastosGenerales + totalRetSocios;
  const utilidadNeta = utilidadFinanciera - totalRetSocios;
  const tieneDatos = conDatos.length > 0;

  return {
    periodo: "TOTAL",
    tieneDatos,
    ventas,
    ventasFuente: tieneDatos ? "ingresos_bancos_caja" : "sin_datos",
    compras,
    manoDeObra,
    totalCostoVentas,
    pctMO: tieneDatos ? pct(manoDeObra, ventas) : null,
    pctCosto: tieneDatos ? pct(totalCostoVentas, ventas) : null,
    propinas,
    comisiones,
    gastosFijos,
    mantenimiento,
    impuestos,
    otrosGastosGenerales,
    otrosGastosGeneralesDesglose,
    totalGastosGenerales,
    utilidadFinanciera,
    margenUtilidadFinanciera: tieneDatos ? pct(utilidadFinanciera, ventas) : null,
    retirosSocios,
    gastosPersonalesSocios,
    nominaSocios,
    totalRetSocios,
    margenSocios: tieneDatos ? pct(totalRetSocios, ventas) : null,
    totalEgresos,
    utilidadNeta,
    margenUtilidadNeta: tieneDatos ? pct(utilidadNeta, ventas) : null,
  };
}
