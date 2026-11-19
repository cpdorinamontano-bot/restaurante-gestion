import { supabase } from "@/lib/supabase";
import { fetchActivosFijos, depreciacionMensual, type ActivoFijo } from "@/lib/activosFijos";

function mesesEntre(desdeISO: string, hastaISO: string): number {
  const d1 = new Date(`${desdeISO}T00:00:00`);
  const d2 = new Date(`${hastaISO}T00:00:00`);
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

function valorNetoActivo(activo: ActivoFijo, corteISO: string): number {
  const transcurridos = mesesEntre(activo.fechaInicio, corteISO) + 1;
  if (transcurridos <= 0) return activo.costo;
  const mensual = depreciacionMensual(activo);
  const meses = Math.min(transcurridos, activo.vidaUtilMeses);
  return Math.max(activo.valorResidual, activo.costo - mensual * meses);
}

export interface BalanceGeneralResumen {
  corte: string;
  bancos: number;
  caja: number;
  cuentasPorCobrar: number;
  inventario: number;
  activosFijosNetos: number;
  otrosActivos: { concepto: string; monto: number }[];
  totalActivos: number;
  cuentasPorPagar: number;
  otrosPasivos: { concepto: string; monto: number }[];
  totalPasivos: number;
  capital: number;
}

/**
 * Replica la lógica de cálculo de BalanceGeneral.tsx como función independiente, para
 * poder incluir un resumen del balance general dentro del PDF completo para socios sin
 * tocar esa página (que ya está probada y en uso).
 */
export async function fetchBalanceGeneralResumen(sucursalId: string, corte: string): Promise<BalanceGeneralResumen> {
  const { data: cuentas } = await supabase.from("cuentas_bancarias").select("id").eq("estatus", "activo");
  const saldosBancarios = cuentas?.length
    ? (
        await Promise.all(
          cuentas.map((c: { id: string }) => supabase.rpc("fn_saldo_bancario_a_fecha", { p_cuenta_id: c.id, p_fecha: corte }))
        )
      ).reduce((s, r) => s + Number(r.data ?? 0), 0)
    : 0;

  const { data: movCaja } = await supabase.from("movimientos_caja").select("tipo_movimiento, importe").lte("fecha", corte);
  const ingresosCaja = (movCaja ?? [])
    .filter((m) => ["venta_efectivo", "entrada", "deposito", "reposicion"].includes(m.tipo_movimiento))
    .reduce((s, m) => s + Number(m.importe ?? 0), 0);
  const egresosCaja = (movCaja ?? [])
    .filter((m) => ["salida", "retiro", "gasto"].includes(m.tipo_movimiento))
    .reduce((s, m) => s + Number(m.importe ?? 0), 0);
  const saldoCaja = ingresosCaja - egresosCaja;

  const { data: cxcRows } = await supabase
    .from("v_cxc_antiguedad")
    .select("saldo, fecha_emision")
    .gt("saldo", 0)
    .lte("fecha_emision", corte);
  const cxcPendiente = (cxcRows ?? []).reduce((s, r: { saldo: number | null }) => s + Number(r.saldo ?? 0), 0);

  const { data: cxpRows } = await supabase
    .from("v_cxp_antiguedad")
    .select("saldo, fecha_emision")
    .gt("saldo", 0)
    .lte("fecha_emision", corte);
  const cxpPendiente = (cxpRows ?? []).reduce((s, r: { saldo: number | null }) => s + Number(r.saldo ?? 0), 0);

  const { data: invRows } = await supabase
    .from("inventarios_mensuales")
    .select("inventario_final, periodo")
    .eq("sucursal_id", sucursalId)
    .eq("estatus", "activo")
    .lte("periodo", corte)
    .order("periodo", { ascending: false })
    .limit(1);
  const inventarioFinal = invRows?.[0]?.inventario_final != null ? Number(invRows[0].inventario_final) : 0;

  const activos = await fetchActivosFijos(sucursalId);
  const activosFijosNetos = activos.reduce((s, a) => s + valorNetoActivo(a, corte), 0);

  const { data: otros } = await supabase
    .from("balance_otros_conceptos")
    .select("*")
    .eq("sucursal_id", sucursalId)
    .eq("estatus", "activo");
  const otrosActivos = (otros ?? [])
    .filter((c: { tipo: string }) => c.tipo === "activo")
    .map((c: { concepto: string; saldo: number }) => ({ concepto: c.concepto, monto: Number(c.saldo) }));
  const otrosPasivos = (otros ?? [])
    .filter((c: { tipo: string }) => c.tipo === "pasivo")
    .map((c: { concepto: string; saldo: number }) => ({ concepto: c.concepto, monto: Number(c.saldo) }));

  const totalActivos =
    saldosBancarios +
    saldoCaja +
    cxcPendiente +
    inventarioFinal +
    activosFijosNetos +
    otrosActivos.reduce((s, c) => s + c.monto, 0);
  const totalPasivos = cxpPendiente + otrosPasivos.reduce((s, c) => s + c.monto, 0);

  return {
    corte,
    bancos: saldosBancarios,
    caja: saldoCaja,
    cuentasPorCobrar: cxcPendiente,
    inventario: inventarioFinal,
    activosFijosNetos,
    otrosActivos,
    totalActivos,
    cuentasPorPagar: cxpPendiente,
    otrosPasivos,
    totalPasivos,
    capital: totalActivos - totalPasivos,
  };
}
