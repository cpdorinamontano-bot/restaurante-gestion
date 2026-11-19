import type { ReporteMensual } from "@/lib/reportes";
import { formatCurrency, formatPercent } from "@/lib/utils";

export type PuntoEquilibrio =
  | { alcanzable: false; costosFijos: number; margenContribucionPct: number }
  | {
      alcanzable: true;
      costosFijos: number;
      margenContribucionPct: number;
      ventasEquilibrio: number;
      diferencia: number;
      avancePct: number;
    };

/**
 * Trata costo de ventas + gastos variables como costo variable, y nómina + gastos fijos
 * como costo fijo del periodo — el criterio estándar para punto de equilibrio en un
 * restaurante con planilla comprometida mes a mes. Aplica igual a un mes o a un rango
 * acumulado (sumarPeriodos ya deja el objeto con la misma forma de ReporteMensual).
 */
export function calcularPuntoEquilibrio(r: ReporteMensual): PuntoEquilibrio | null {
  if (r.ventasFuente === "sin_datos" || r.cmvFuente === "sin_datos" || r.ventasNeta <= 0) return null;
  const costosVariables = r.cmv + r.gastosVariablesTotal;
  const costosFijos = r.costoLaboralTotal + r.gastosFijosTotal;
  const margenContribucionPct = (r.ventasNeta - costosVariables) / r.ventasNeta;
  if (margenContribucionPct <= 0) {
    return { alcanzable: false, costosFijos, margenContribucionPct };
  }
  const ventasEquilibrio = costosFijos / margenContribucionPct;
  return {
    alcanzable: true,
    costosFijos,
    margenContribucionPct,
    ventasEquilibrio,
    diferencia: r.ventasNeta - ventasEquilibrio,
    avancePct: (r.ventasNeta / ventasEquilibrio) * 100,
  };
}

export interface AnalisisGerencial {
  estado: string;
  tono: "positivo" | "neutral" | "negativo";
  fortalezas: string[];
  debilidades: string[];
  recomendaciones: string[];
}

/**
 * Lectura automática del periodo a partir de las mismas cifras del reporte — no reemplaza
 * el criterio de quien lee el reporte, es un punto de partida basado en rangos saludables
 * típicos de restaurante (food cost 28-32%, costo laboral 25-30%). Sirve igual para un mes
 * (Reporte Gerencial Mensual) o para un rango acumulado (Mes a mes y acumulado), por eso
 * "anterior" es opcional: solo aplica la comparación contra el periodo previo cuando existe.
 */
export function generarAnalisisGerencial(
  actual: ReporteMensual,
  anterior: ReporteMensual | null,
  equilibrio: PuntoEquilibrio | null
): AnalisisGerencial | null {
  if (actual.ventasFuente === "sin_datos") return null;

  const fortalezas: string[] = [];
  const debilidades: string[] = [];
  const recomendaciones: string[] = [];

  if (actual.resultadoOperativoPct !== null) {
    if (actual.resultadoOperativoPct >= 15) {
      fortalezas.push(`Margen operativo sólido: ${formatPercent(actual.resultadoOperativoPct)} de las ventas.`);
    } else if (actual.resultadoOperativoPct < 5) {
      debilidades.push(`Margen operativo muy ajustado: ${formatPercent(actual.resultadoOperativoPct)} de las ventas.`);
      recomendaciones.push("Revisar la estructura de costos fijos y variables para ampliar el margen operativo.");
    }
    if (anterior?.resultadoOperativoPct != null) {
      const delta = actual.resultadoOperativoPct - anterior.resultadoOperativoPct;
      if (delta >= 2) {
        fortalezas.push(`El margen operativo mejoró ${delta.toFixed(1)} pts contra el periodo anterior.`);
      } else if (delta <= -2) {
        debilidades.push(`El margen operativo bajó ${Math.abs(delta).toFixed(1)} pts contra el periodo anterior.`);
        recomendaciones.push("Investigar qué categoría de gasto o de costo de ventas subió respecto al periodo anterior.");
      }
    }
  }

  if (actual.foodCostPct !== null) {
    if (actual.foodCostPct <= 30) {
      fortalezas.push(`Food cost controlado: ${formatPercent(actual.foodCostPct)} de las ventas.`);
    } else if (actual.foodCostPct > 35) {
      debilidades.push(`Food cost elevado: ${formatPercent(actual.foodCostPct)} de las ventas (rango saludable: 28%-32%).`);
      recomendaciones.push("Revisar precios de compra a proveedores y mermas; capturar recetas para medir food cost teórico.");
    }
  }

  if (actual.costoLaboralPct !== null) {
    if (actual.costoLaboralPct <= 28) {
      fortalezas.push(`Costo laboral eficiente: ${formatPercent(actual.costoLaboralPct)} de las ventas.`);
    } else if (actual.costoLaboralPct > 33) {
      debilidades.push(`Costo laboral elevado: ${formatPercent(actual.costoLaboralPct)} de las ventas (rango saludable: 25%-30%).`);
      recomendaciones.push("Revisar horarios y turnos contra el nivel de ventas por día para ajustar la plantilla.");
    }
  }

  if (equilibrio?.alcanzable) {
    if ((equilibrio.diferencia ?? 0) >= 0) {
      fortalezas.push(`Las ventas del periodo superaron el punto de equilibrio en ${formatCurrency(equilibrio.diferencia ?? 0)}.`);
    } else {
      debilidades.push(`Las ventas del periodo quedaron ${formatCurrency(Math.abs(equilibrio.diferencia ?? 0))} por debajo del punto de equilibrio.`);
      recomendaciones.push("Priorizar acciones que aumenten ventas o reduzcan costos fijos hasta superar el punto de equilibrio.");
    }
  }

  if (actual.ventasNeta > 0 && actual.cxpPendiente > 0) {
    const cxpPct = (actual.cxpPendiente / actual.ventasNeta) * 100;
    if (cxpPct > 20) {
      debilidades.push(`Cuentas por pagar pendientes equivalen a ${formatPercent(cxpPct)} de las ventas del periodo.`);
      recomendaciones.push("Dar seguimiento al calendario de pagos a proveedores para evitar recargos o cortes de suministro.");
    }
  }

  const estado =
    actual.resultadoOperativo === null
      ? "Sin datos suficientes para evaluar el estado operativo del periodo."
      : actual.resultadoOperativo >= 0
      ? `El negocio es rentable en operación en este periodo, con un margen operativo de ${formatPercent(actual.resultadoOperativoPct)}.`
      : "El negocio tuvo pérdida operativa en este periodo: los costos superaron a las ventas antes de impuestos y retiros.";

  const tono: AnalisisGerencial["tono"] =
    actual.resultadoOperativo === null || actual.resultadoOperativo < 0
      ? "negativo"
      : debilidades.length > fortalezas.length
      ? "neutral"
      : "positivo";

  return {
    estado,
    tono,
    fortalezas: fortalezas.length ? fortalezas : ["No se identificaron fortalezas destacables en este periodo con los datos disponibles."],
    debilidades: debilidades.length ? debilidades : ["No se identificaron debilidades relevantes en este periodo con los datos disponibles."],
    recomendaciones: recomendaciones.length
      ? recomendaciones
      : ["Mantener el monitoreo mensual de márgenes y costos; no se identifican acciones urgentes."],
  };
}
