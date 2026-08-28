import { useAuth } from "@/contexts/AuthContext";
import { useFoodCostReal, useFoodCostTeorico, useLaborCost, useResumenMes } from "@/hooks/useIndicadores";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default function DashboardDireccion() {
  const { sucursalId } = useAuth();
  const { data: fcReal } = useFoodCostReal(sucursalId);
  const { data: fcTeo } = useFoodCostTeorico(sucursalId);
  const { data: labor } = useLaborCost(sucursalId);
  const { data: resumen } = useResumenMes(sucursalId);

  const ventasNetas = fcReal?.ventas_netas ?? 0;
  const costoVentas = fcReal?.costo_real_ventas ?? 0;
  const margenBruto = ventasNetas - costoVentas;
  const gastos = resumen?.gastosTotal ?? 0;
  const costoLaboral = labor?.costo_laboral ?? 0;
  const resultadoOperativo = margenBruto - costoLaboral - gastos;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Rentabilidad del mes</h1>
        <p className="text-sm text-slate-500">¿Cuánto vendimos, cuánto costó, cuánto ganamos?</p>
      </div>

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
          <StatCard label="Disponibilidad bancaria" value={formatCurrency(resumen?.disponibilidadBancaria)} />
          <StatCard label="Caja disponible" value={formatCurrency(resumen?.cajaDisponible)} />
          <StatCard label="Cuentas por pagar" value={formatCurrency(resumen?.cxpTotal)} />
          <StatCard label="CxP vencida" value={formatCurrency(resumen?.cxpVencida)} tone={resumen?.cxpVencida ? "negativo" : "positivo"} />
        </div>
      </div>
    </div>
  );
}
