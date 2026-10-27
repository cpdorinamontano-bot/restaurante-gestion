import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { fetchReporteMensual } from "@/lib/reportes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface Deltas {
  ventas: number;
  foodCost: number; // puntos porcentuales
  laborCost: number; // puntos porcentuales
  gastos: number; // % relativo
}

const DELTAS_INICIALES: Deltas = { ventas: 0, foodCost: 0, laborCost: 0, gastos: 0 };

const PRESETS: { nombre: string; deltas: Deltas; descripcion: string }[] = [
  { nombre: "Ventas bajas", deltas: { ventas: -15, foodCost: 0, laborCost: 0, gastos: 0 }, descripcion: "Ventas caen 15%, todo lo demás igual." },
  {
    nombre: "Expansión Dolce Vita",
    deltas: { ventas: 25, foodCost: 1, laborCost: 2, gastos: 20 },
    descripcion: "Punto de partida editable: +25% ventas, +1pt food cost, +2pt costo laboral, +20% gastos por la operación adicional.",
  },
  { nombre: "Alza de insumos", deltas: { ventas: 0, foodCost: 4, laborCost: 0, gastos: 0 }, descripcion: "El food cost sube 4 puntos por costo de insumos." },
];

export default function Escenarios() {
  const { sucursalId, session } = useAuth();
  const qc = useQueryClient();
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const periodoBase = `${mes}-01`;
  const [deltas, setDeltas] = useState<Deltas>(DELTAS_INICIALES);
  const [nombreEscenario, setNombreEscenario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const { data: real, isLoading } = useQuery({
    queryKey: ["reporte_mensual_escenario", sucursalId, periodoBase],
    enabled: !!sucursalId,
    queryFn: () => fetchReporteMensual(sucursalId!, periodoBase),
  });

  const { data: guardados } = useQuery({
    queryKey: ["escenarios_financieros", sucursalId],
    enabled: !!sucursalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escenarios_financieros")
        .select("*")
        .eq("sucursal_id", sucursalId!)
        .eq("estatus", "activo")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const simulado = useMemo(() => {
    if (!real || real.ventasFuente === "sin_datos") return null;
    const ventasSim = real.ventasNeta * (1 + deltas.ventas / 100);
    const foodCostPctSim = Math.max(0, (real.foodCostPct ?? 0) + deltas.foodCost);
    const laborCostPctSim = Math.max(0, (real.costoLaboralPct ?? 0) + deltas.laborCost);
    const gastosSim = (real.gastosFijosTotal + real.gastosVariablesTotal) * (1 + deltas.gastos / 100);
    const margenBrutoSim = ventasSim * (1 - foodCostPctSim / 100);
    const costoLaboralSim = ventasSim * (laborCostPctSim / 100);
    const resultadoOperativoSim = margenBrutoSim - costoLaboralSim - gastosSim;
    const utilidadSim = resultadoOperativoSim - real.impuestosGasto;
    return { ventasSim, foodCostPctSim, laborCostPctSim, gastosSim, resultadoOperativoSim, utilidadSim };
  }, [real, deltas]);

  function aplicarPreset(p: Deltas) {
    setDeltas(p);
    setMensaje(null);
  }

  async function guardarEscenario() {
    if (!sucursalId || !nombreEscenario.trim()) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const { error } = await supabase.from("escenarios_financieros").insert({
        sucursal_id: sucursalId,
        nombre: nombreEscenario.trim(),
        periodo_base: periodoBase,
        delta_ventas_pct: deltas.ventas,
        delta_food_cost_pct: deltas.foodCost,
        delta_labor_cost_pct: deltas.laborCost,
        delta_gastos_pct: deltas.gastos,
        created_by: session?.user.id,
      });
      if (error) throw error;
      setNombreEscenario("");
      qc.invalidateQueries({ queryKey: ["escenarios_financieros", sucursalId] });
      setMensaje("Escenario guardado.");
    } catch (e: any) {
      setMensaje(`Error al guardar: ${e.message}`);
    } finally {
      setGuardando(false);
    }
  }

  function cargarGuardado(g: any) {
    setMes(g.periodo_base.slice(0, 7));
    setDeltas({
      ventas: Number(g.delta_ventas_pct),
      foodCost: Number(g.delta_food_cost_pct),
      laborCost: Number(g.delta_labor_cost_pct),
      gastos: Number(g.delta_gastos_pct),
    });
  }

  async function borrarGuardado(id: string) {
    await supabase.from("escenarios_financieros").update({ estatus: "baja" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["escenarios_financieros", sucursalId] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Escenarios — "¿qué pasa si...?"</h1>
          <p className="text-sm text-ink-500">Simula cambios en ventas, costos y gastos contra un mes real, sin tocar ningún dato capturado.</p>
        </div>
        <label className="flex flex-col text-xs font-medium text-ink-600">
          Mes base
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.nombre}
            type="button"
            onClick={() => aplicarPreset(p.deltas)}
            title={p.descripcion}
            className="rounded-full border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100"
          >
            {p.nombre}
          </button>
        ))}
        <button
          type="button"
          onClick={() => aplicarPreset(DELTAS_INICIALES)}
          className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50"
        >
          Reiniciar
        </button>
      </div>

      {isLoading && <p className="text-sm text-ink-500">Cargando mes base…</p>}
      {!isLoading && real?.ventasFuente === "sin_datos" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Ese mes no tiene ventas capturadas — elige otro mes como base.
        </div>
      )}

      {real && simulado && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Supuestos del escenario</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <label className="flex flex-col text-xs font-medium text-ink-600">
                Cambio en ventas (%)
                <input
                  type="number"
                  step="1"
                  value={deltas.ventas}
                  onChange={(e) => setDeltas((d) => ({ ...d, ventas: Number(e.target.value) }))}
                  className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-ink-600">
                Food cost (puntos)
                <input
                  type="number"
                  step="0.5"
                  value={deltas.foodCost}
                  onChange={(e) => setDeltas((d) => ({ ...d, foodCost: Number(e.target.value) }))}
                  className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-ink-600">
                Costo laboral (puntos)
                <input
                  type="number"
                  step="0.5"
                  value={deltas.laborCost}
                  onChange={(e) => setDeltas((d) => ({ ...d, laborCost: Number(e.target.value) }))}
                  className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-ink-600">
                Cambio en gastos (%)
                <input
                  type="number"
                  step="1"
                  value={deltas.gastos}
                  onChange={(e) => setDeltas((d) => ({ ...d, gastos: Number(e.target.value) }))}
                  className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-2.5">Concepto</th>
                    <th className="px-4 py-2.5 text-right">Real</th>
                    <th className="px-4 py-2.5 text-right">Escenario</th>
                    <th className="px-4 py-2.5 text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-ink-100">
                    <td className="px-5 py-2.5 text-ink-700">Ventas netas</td>
                    <td className="px-4 py-2.5 text-right tabular">{formatCurrency(real.ventasNeta)}</td>
                    <td className="px-4 py-2.5 text-right tabular font-medium text-ink-900">{formatCurrency(simulado.ventasSim)}</td>
                    <td className={`px-4 py-2.5 text-right tabular ${simulado.ventasSim >= real.ventasNeta ? "text-emerald-700" : "text-rose-700"}`}>
                      {formatCurrency(simulado.ventasSim - real.ventasNeta)}
                    </td>
                  </tr>
                  <tr className="border-t border-ink-100">
                    <td className="px-5 py-2.5 text-ink-700">Food cost %</td>
                    <td className="px-4 py-2.5 text-right tabular">{formatPercent(real.foodCostPct)}</td>
                    <td className="px-4 py-2.5 text-right tabular font-medium text-ink-900">{formatPercent(simulado.foodCostPctSim)}</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-500">{deltas.foodCost >= 0 ? "+" : ""}{deltas.foodCost}pt</td>
                  </tr>
                  <tr className="border-t border-ink-100">
                    <td className="px-5 py-2.5 text-ink-700">Costo laboral %</td>
                    <td className="px-4 py-2.5 text-right tabular">{formatPercent(real.costoLaboralPct)}</td>
                    <td className="px-4 py-2.5 text-right tabular font-medium text-ink-900">{formatPercent(simulado.laborCostPctSim)}</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-500">{deltas.laborCost >= 0 ? "+" : ""}{deltas.laborCost}pt</td>
                  </tr>
                  <tr className="border-t border-ink-100">
                    <td className="px-5 py-2.5 text-ink-700">Gastos fijos + variables</td>
                    <td className="px-4 py-2.5 text-right tabular">{formatCurrency(real.gastosFijosTotal + real.gastosVariablesTotal)}</td>
                    <td className="px-4 py-2.5 text-right tabular font-medium text-ink-900">{formatCurrency(simulado.gastosSim)}</td>
                    <td className={`px-4 py-2.5 text-right tabular ${simulado.gastosSim <= real.gastosFijosTotal + real.gastosVariablesTotal ? "text-emerald-700" : "text-rose-700"}`}>
                      {formatCurrency(simulado.gastosSim - (real.gastosFijosTotal + real.gastosVariablesTotal))}
                    </td>
                  </tr>
                  <tr className="border-t border-ink-200 bg-ink-50/60">
                    <td className="px-5 py-3 font-semibold text-ink-800">Ganancia neta</td>
                    <td className="px-4 py-3 text-right tabular font-semibold">{formatCurrency(real.gananciaNeta)}</td>
                    <td className={`px-4 py-3 text-right tabular text-base font-bold ${simulado.utilidadSim >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {formatCurrency(simulado.utilidadSim)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular font-semibold ${
                        simulado.utilidadSim >= (real.gananciaNeta ?? 0) ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {formatCurrency(simulado.utilidadSim - (real.gananciaNeta ?? 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guardar este escenario</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col text-xs font-medium text-ink-600">
                Nombre
                <input
                  type="text"
                  value={nombreEscenario}
                  onChange={(e) => setNombreEscenario(e.target.value)}
                  placeholder="Ej. Ventas bajas en temporada baja"
                  className="mt-1 w-64 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                />
              </label>
              <Button onClick={guardarEscenario} disabled={guardando || !nombreEscenario.trim()} size="sm">
                {guardando ? "Guardando…" : "Guardar escenario"}
              </Button>
              {mensaje && <span className="text-sm text-ink-600">{mensaje}</span>}
            </CardContent>
          </Card>
        </>
      )}

      {!!guardados?.length && (
        <Card>
          <CardHeader>
            <CardTitle>Escenarios guardados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-2.5">Nombre</th>
                  <th className="px-4 py-2.5">Mes base</th>
                  <th className="px-4 py-2.5 text-right">Ventas</th>
                  <th className="px-4 py-2.5 text-right">Food cost</th>
                  <th className="px-4 py-2.5 text-right">Laboral</th>
                  <th className="px-4 py-2.5 text-right">Gastos</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {guardados.map((g: any) => (
                  <tr key={g.id} className="border-t border-ink-100">
                    <td className="px-5 py-2.5 text-ink-700">{g.nombre}</td>
                    <td className="px-4 py-2.5 text-ink-600">{g.periodo_base.slice(0, 7)}</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-600">{g.delta_ventas_pct >= 0 ? "+" : ""}{g.delta_ventas_pct}%</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-600">{g.delta_food_cost_pct >= 0 ? "+" : ""}{g.delta_food_cost_pct}pt</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-600">{g.delta_labor_cost_pct >= 0 ? "+" : ""}{g.delta_labor_cost_pct}pt</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-600">{g.delta_gastos_pct >= 0 ? "+" : ""}{g.delta_gastos_pct}%</td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => cargarGuardado(g)} className="mr-3 text-xs font-medium text-brand-700 hover:underline">
                        Cargar
                      </button>
                      <button type="button" onClick={() => borrarGuardado(g.id)} className="text-xs font-medium text-rose-700 hover:underline">
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
