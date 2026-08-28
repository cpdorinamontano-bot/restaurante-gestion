import { supabase } from "@/lib/supabase";

export interface DesgloseItem {
  nombre: string;
  monto: number;
}

export interface ReporteMensual {
  periodo: string; // YYYY-MM-01
  sucursalId: string;

  ventasBruta: number;
  ventasNeta: number;
  ventasFuente: "modulo_ventas" | "ingresos_bancos_caja" | "sin_datos";
  descuentos: number | null;
  devoluciones: number | null;
  cancelaciones: number | null;
  cortesias: number | null;
  numVentas: number;

  cmv: number; // costo de mercadería vendida (mejor fuente disponible)
  cmvFuente: "food_cost_real" | "gastos_historico" | "sin_datos";
  cmvPorCategoria: DesgloseItem[];
  foodCostPct: number | null;
  foodCostTeoricoPct: number | null;

  costoLaboralNomina: number;
  costoLaboralGastoHistorico: number;
  costoLaboralTotal: number;
  costoLaboralPct: number | null;

  gastosFijos: DesgloseItem[];
  gastosFijosTotal: number;
  gastosVariables: DesgloseItem[];
  gastosVariablesTotal: number;
  gastosOperativosPct: number | null; // (fijos+variables+laboral) / ventas netas

  impuestosGasto: number;

  margenBruto: number | null;
  margenBrutoPct: number | null;
  resultadoOperativo: number | null;
  resultadoOperativoPct: number | null;
  gananciaNeta: number | null;
  gananciaNetaPct: number | null;

  flujoIngresos: number;
  flujoEgresos: number;
  flujoNeto: number;
  saldoBancarioActual: number | null;

  cxpPendiente: number;
  obligacionesPendientes: number;
}

function rangoMes(periodoInicio: string) {
  const inicio = new Date(`${periodoInicio}T00:00:00`);
  const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);
  return { inicio: periodoInicio, fin: fin.toISOString().slice(0, 10) };
}

export function mesAnterior(periodoInicio: string) {
  const d = new Date(`${periodoInicio}T00:00:00`);
  const anterior = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return anterior.toISOString().slice(0, 10);
}

export async function fetchReporteMensual(sucursalId: string, periodoInicio: string): Promise<ReporteMensual> {
  const { inicio, fin } = rangoMes(periodoInicio);
  const periodoDate = `${periodoInicio.slice(0, 7)}-01`;

  const [
    ventasRes,
    comprasRes,
    foodCostRealRes,
    foodCostTeoricoRes,
    laborRes,
    nominaHistRes,
    gastosRes,
    movBancariosRes,
    movCajaRes,
    cuentaRes,
    cxpRes,
    obligacionesRes,
  ] = await Promise.all([
    supabase
      .from("ventas")
      .select("venta_bruta, venta_neta, descuentos_total, devoluciones_total, cancelaciones_total, cortesias_total")
      .eq("sucursal_id", sucursalId)
      .eq("estatus", "activo")
      .gte("fecha", inicio)
      .lte("fecha", fin),
    supabase
      .from("compras")
      .select("subtotal, categorias_productos(nombre, tipo)")
      .eq("estatus", "activo")
      .gte("fecha", inicio)
      .lte("fecha", fin),
    supabase.rpc("fn_food_cost_real", { p_sucursal_id: sucursalId, p_periodo: periodoDate }),
    supabase.rpc("fn_food_cost_teorico", { p_sucursal_id: sucursalId, p_periodo: periodoDate }),
    supabase.rpc("fn_labor_cost", { p_sucursal_id: sucursalId, p_periodo: periodoDate }),
    supabase
      .from("gastos")
      .select("subtotal, impuestos, categorias_gastos!inner(nombre)")
      .eq("estatus", "activo")
      .gte("fecha", inicio)
      .lte("fecha", fin)
      .ilike("categorias_gastos.nombre", "%nómina%"),
    supabase
      .from("gastos")
      .select("subtotal, impuestos, categorias_gastos(nombre, tipo)")
      .eq("estatus", "activo")
      .gte("fecha", inicio)
      .lte("fecha", fin),
    supabase.from("movimientos_bancarios").select("cargo, abono").gte("fecha", inicio).lte("fecha", fin),
    supabase.from("movimientos_caja").select("tipo_movimiento, importe").gte("fecha", inicio).lte("fecha", fin),
    supabase.from("cuentas_bancarias").select("saldo_actual").eq("estatus", "activo"),
    supabase.from("v_cxp_saldos").select("saldo, fecha_emision").gt("saldo", 0).lte("fecha_emision", fin),
    supabase.from("obligaciones").select("importe").eq("estatus", "activo").neq("estatus_pago", "pagada"),
  ]);

  const movBancarios = movBancariosRes.data ?? [];
  const movCaja = movCajaRes.data ?? [];
  const flujoIngresos =
    movBancarios.reduce((s, m) => s + Number(m.abono ?? 0), 0) +
    movCaja
      .filter((m) => ["venta_efectivo", "entrada", "deposito", "reposicion"].includes(m.tipo_movimiento))
      .reduce((s, m) => s + Number(m.importe ?? 0), 0);
  const flujoEgresos =
    movBancarios.reduce((s, m) => s + Number(m.cargo ?? 0), 0) +
    movCaja
      .filter((m) => ["salida", "retiro", "gasto"].includes(m.tipo_movimiento))
      .reduce((s, m) => s + Number(m.importe ?? 0), 0);

  const ventas = ventasRes.data ?? [];
  const ventasModuloBruta = ventas.reduce((s, v) => s + Number(v.venta_bruta ?? 0), 0);
  const ventasModuloNeta = ventas.reduce((s, v) => s + Number(v.venta_neta ?? 0), 0);

  // El módulo de Ventas es la fuente ideal (trae descuentos/devoluciones/cancelaciones
  // desglosados). Cuando no se ha capturado ahí, los ingresos de banco y caja YA
  // reflejan las ventas cobradas del periodo (así es como el negocio registró su
  // ingreso históricamente) y se usan como venta neta, sin desglose de descuentos.
  let ventasFuente: ReporteMensual["ventasFuente"] = "sin_datos";
  let ventasBruta = 0;
  let ventasNeta = 0;
  let descuentos: number | null = null;
  let devoluciones: number | null = null;
  let cancelaciones: number | null = null;
  let cortesias: number | null = null;
  if (ventasModuloNeta > 0) {
    ventasFuente = "modulo_ventas";
    ventasBruta = ventasModuloBruta;
    ventasNeta = ventasModuloNeta;
    descuentos = ventas.reduce((s, v) => s + Number(v.descuentos_total ?? 0), 0);
    devoluciones = ventas.reduce((s, v) => s + Number(v.devoluciones_total ?? 0), 0);
    cancelaciones = ventas.reduce((s, v) => s + Number(v.cancelaciones_total ?? 0), 0);
    cortesias = ventas.reduce((s, v) => s + Number(v.cortesias_total ?? 0), 0);
  } else if (flujoIngresos > 0) {
    ventasFuente = "ingresos_bancos_caja";
    ventasBruta = flujoIngresos;
    ventasNeta = flujoIngresos;
  }

  const compras = comprasRes.data ?? [];
  const cmvPorCategoriaMap = new Map<string, number>();
  compras.forEach((c: any) => {
    const nombre = c.categorias_productos?.tipo ?? "Sin categoría";
    cmvPorCategoriaMap.set(nombre, (cmvPorCategoriaMap.get(nombre) ?? 0) + Number(c.subtotal ?? 0));
  });
  const comprasTotalCapturadas = compras.reduce((s, c: any) => s + Number(c.subtotal ?? 0), 0);

  const foodCostReal = foodCostRealRes.data?.[0] ?? null;
  const foodCostTeorico = foodCostTeoricoRes.data?.[0] ?? null;

  const gastosHistoricoNomina = (nominaHistRes.data ?? []).reduce(
    (s: number, g: any) => s + Number(g.subtotal ?? 0) + Number(g.impuestos ?? 0),
    0
  );

  const gastos = gastosRes.data ?? [];
  const gastosComprasHistorico = gastos
    .filter((g: any) => /compra/i.test(g.categorias_gastos?.nombre ?? ""))
    .reduce((s: number, g: any) => s + Number(g.subtotal ?? 0) + Number(g.impuestos ?? 0), 0);

  let cmv = 0;
  let cmvFuente: ReporteMensual["cmvFuente"] = "sin_datos";
  if (foodCostReal && Number(foodCostReal.costo_real_ventas) !== 0) {
    cmv = Number(foodCostReal.costo_real_ventas);
    cmvFuente = "food_cost_real";
  } else if (comprasTotalCapturadas > 0) {
    cmv = comprasTotalCapturadas;
    cmvFuente = "food_cost_real";
  } else if (gastosComprasHistorico > 0) {
    cmv = gastosComprasHistorico;
    cmvFuente = "gastos_historico";
  }
  const foodCostPct = ventasNeta > 0 && cmvFuente !== "sin_datos" ? Number(((cmv / ventasNeta) * 100).toFixed(2)) : null;
  const foodCostTeoricoPct = foodCostTeorico?.food_cost_teorico_pct != null ? Number(foodCostTeorico.food_cost_teorico_pct) : null;

  const costoLaboralNomina = Number(laborRes.data?.[0]?.costo_laboral ?? 0);
  const costoLaboralTotal = costoLaboralNomina + gastosHistoricoNomina;
  const costoLaboralPct = ventasNeta > 0 ? Number(((costoLaboralTotal / ventasNeta) * 100).toFixed(2)) : null;

  const gastosFijosMap = new Map<string, number>();
  const gastosVariablesMap = new Map<string, number>();
  let impuestosGasto = 0;
  gastos.forEach((g: any) => {
    const nombre: string = g.categorias_gastos?.nombre ?? "Sin categoría";
    const tipo: string = g.categorias_gastos?.tipo ?? "operativo";
    const monto = Number(g.subtotal ?? 0) + Number(g.impuestos ?? 0);
    if (/nómina|nomina/i.test(nombre)) return; // ya contado en costo laboral
    if (/impuesto/i.test(nombre)) {
      impuestosGasto += monto;
      return;
    }
    if (/compra/i.test(nombre) && cmvFuente === "gastos_historico") return; // ya contado como CMV, no duplicar en gastos
    if (tipo === "fijo") {
      gastosFijosMap.set(nombre, (gastosFijosMap.get(nombre) ?? 0) + monto);
    } else {
      gastosVariablesMap.set(nombre, (gastosVariablesMap.get(nombre) ?? 0) + monto);
    }
  });
  const gastosFijos = [...gastosFijosMap.entries()].map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto);
  const gastosVariables = [...gastosVariablesMap.entries()].map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto);
  const gastosFijosTotal = gastosFijos.reduce((s, g) => s + g.monto, 0);
  const gastosVariablesTotal = gastosVariables.reduce((s, g) => s + g.monto, 0);
  const gastosOperativosPct =
    ventasNeta > 0 ? Number((((gastosFijosTotal + gastosVariablesTotal + costoLaboralTotal) / ventasNeta) * 100).toFixed(2)) : null;

  const margenBruto = cmvFuente !== "sin_datos" ? ventasNeta - cmv : null;
  const margenBrutoPct = margenBruto !== null && ventasNeta > 0 ? Number(((margenBruto / ventasNeta) * 100).toFixed(2)) : null;

  const resultadoOperativo = margenBruto !== null ? margenBruto - costoLaboralTotal - gastosFijosTotal - gastosVariablesTotal : null;
  const resultadoOperativoPct =
    resultadoOperativo !== null && ventasNeta > 0 ? Number(((resultadoOperativo / ventasNeta) * 100).toFixed(2)) : null;

  const gananciaNeta = resultadoOperativo !== null ? resultadoOperativo - impuestosGasto : null;
  const gananciaNetaPct = gananciaNeta !== null && ventasNeta > 0 ? Number(((gananciaNeta / ventasNeta) * 100).toFixed(2)) : null;

  const cuentas = cuentaRes.data ?? [];
  const saldoBancarioActual = cuentas.length ? cuentas.reduce((s, c) => s + Number(c.saldo_actual ?? 0), 0) : null;

  const cxpPendiente = (cxpRes.data ?? []).reduce((s, c: any) => s + Number(c.saldo ?? 0), 0);
  const obligacionesPendientes = (obligacionesRes.data ?? []).reduce((s, o: any) => s + Number(o.importe ?? 0), 0);

  return {
    periodo: periodoDate,
    sucursalId,
    ventasBruta,
    ventasNeta,
    ventasFuente,
    descuentos,
    devoluciones,
    cancelaciones,
    cortesias,
    numVentas: ventas.length,
    cmv,
    cmvFuente,
    cmvPorCategoria: [...cmvPorCategoriaMap.entries()].map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto),
    foodCostPct,
    foodCostTeoricoPct,
    costoLaboralNomina,
    costoLaboralGastoHistorico: gastosHistoricoNomina,
    costoLaboralTotal,
    costoLaboralPct,
    gastosFijos,
    gastosFijosTotal,
    gastosVariables,
    gastosVariablesTotal,
    gastosOperativosPct,
    impuestosGasto,
    margenBruto,
    margenBrutoPct,
    resultadoOperativo,
    resultadoOperativoPct,
    gananciaNeta,
    gananciaNetaPct,
    flujoIngresos,
    flujoEgresos,
    flujoNeto: flujoIngresos - flujoEgresos,
    saldoBancarioActual,
    cxpPendiente,
    obligacionesPendientes,
  };
}
