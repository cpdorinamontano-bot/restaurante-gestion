import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFoodCostReal, useFoodCostTeorico, useLaborCost, useResumenMes } from "@/hooks/useIndicadores";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatPercent } from "@/lib/utils";

function nombreMes(periodoISO: string) {
  const [y, m] = periodoISO.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

export default function DashboardDireccion() {
  const { sucursalId } = useAuth();
  const [mes, setMes] = useState("2026-03");
  const periodo = `${mes}-01`;

  const { data: fcReal, isLoading } = useFoodCostReal(sucursalId, periodo);
  const { data: fcTeo } = useFoodCostTeorico(sucursalId, periodo);
  const { data: labor } = useLaborCost(sucursalId, periodo);
  const { data: resumen } = useResumenMes(sucursalId, periodo);

  const ventasNetas = fcReal?.ventas_netas ?? 0;
  const costoVentas = fcReal?.costo_real_ventas ?? 0;
  const margenBruto = ventasNetas - costoVentas;
  const gastos = resumen?.gastosTotal ?? 0;
  const costoLaboral = labor?.costo_laboral ?? 0;
  const resultadoOperativo = margenBruto - costoLaboral - gastos;
  const sinVentasCapturadas = ventasNetas === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Rentabilidad — {nombreMes(mes)}</h1>
          <p className="text-sm text-slate-500">¿Cuánto vendimos, cuánto costó, cuánto ganamos?</p>
        </div>
        <label className="flex flex-col text-xs font-medium text-slate-600">
          Periodo
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>
      </div>

      {sinVentasCapturadas && !isLoading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Este mes no tiene ventas capturadas en el módulo de Ventas (tabla <code>ventas</code>), por lo que
          Ventas netas, Food Cost y Margen bruto aparecen en $0. Los movimientos bancarios/caja y gastos
          importados sí están cargados — revísalos en Finanzas → Bancos y en el detalle de Gastos.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Ventas netas" value={formatCurrency(ventasNetas)} />
        <StatCard label="Food Cost real" value={formatPercent(fcReal?.food_cost_real_pct)} />
        <StatCard label="Food Cost teórico" value={formatPercent(fcTeo?.food_cost_teorico_pct)} />
        <StatCard
          label="Desviación Food Cost"
          value={
            fcReal?.food_cost_real_pct != null && fcTeo?.food_cost_teorico_pct != null
              ? formatPercent(fcReal.food_cost_real_pct - fcTeo.food_cost_teorico_pct)
              : "PENDIENTE"
          }
          tone={
            fcReal?.food_cost_real_pct != null && fcTeo?.food_cost_teorico_pct != null
              ? fcReal.food_cost_real_pct - fcTeo.food_cost_teorico_pct > 5
                ? "negativo"
                : "positivo"
              : "neutral"
          }
        />
        <StatCard label="Costo laboral" value={formatCurrency(costoLaboral)} hint={formatPercent(labor?.labor_cost_pct)} />
        <StatCard label="Margen bruto" value={formatCurrency(margenBruto)} />
        <StatCard label="Gastos del mes" value={formatCurrency(gastos)} />
        <StatCard
          label="Resultado operativo"
          value={formatCurrency(resultadoOperativo)}
          tone={resultadoOperativo >= 0 ? "positivo" : "negativo"}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Liquidez</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Disponibilidad bancaria" value={formatCurrency(resumen?.disponibilidadBancaria)} hint="Saldo actual, no depende del mes elegido" />
          <StatCard label="Caja disponible" value={formatCurrency(resumen?.cajaDisponible)} />
          <StatCard label="Cuentas por pagar" value={formatCurrency(resumen?.cxpTotal)} />
          <StatCard label="CxP vencida" value={formatCurrency(resumen?.cxpVencida)} tone={resumen?.cxpVencida ? "negativo" : "positivo"} />
        </div>
      </div>
    </div>
  );
}
