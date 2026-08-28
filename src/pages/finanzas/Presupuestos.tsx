import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { fetchReporteMensual } from "@/lib/reportes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatPercent } from "@/lib/utils";

type Categoria = "ventas" | "food_cost" | "labor_cost" | "gastos" | "utilidad";

interface FilaPresupuesto {
  categoria: Categoria;
  label: string;
  unidad: "monto" | "pct";
  invertido: boolean; // true = menor es mejor (costos)
  real: (r: ReturnType<typeof calcularReales>) => number | null;
}

function calcularReales(r: Awaited<ReturnType<typeof fetchReporteMensual>>) {
  return {
    ventas: r.ventasFuente === "sin_datos" ? null : r.ventasNeta,
    food_cost: r.foodCostPct,
    labor_cost: r.costoLaboralPct,
    gastos: r.gastosFijosTotal + r.gastosVariablesTotal,
    utilidad: r.gananciaNeta,
  };
}

const FILAS: FilaPresupuesto[] = [
  { categoria: "ventas", label: "Ventas netas", unidad: "monto", invertido: false, real: (v) => v.ventas },
  { categoria: "food_cost", label: "Food cost %", unidad: "pct", invertido: true, real: (v) => v.food_cost },
  { categoria: "labor_cost", label: "Costo laboral %", unidad: "pct", invertido: true, real: (v) => v.labor_cost },
  { categoria: "gastos", label: "Gastos fijos + variables", unidad: "monto", invertido: true, real: (v) => v.gastos },
  { categoria: "utilidad", label: "Ganancia neta", unidad: "monto", invertido: false, real: (v) => v.utilidad },
];

export default function Presupuestos() {
  const { sucursalId, session } = useAuth();
  const qc = useQueryClient();
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const periodo = `${mes}-01`;
  const [valores, setValores] = useState<Partial<Record<Categoria, string>>>({});
  const [guardando, setGuardando] = useState<Categoria | null>(null);

  const { data: reporte } = useQuery({
    queryKey: ["reporte_mensual", sucursalId, periodo],
    enabled: !!sucursalId,
    queryFn: () => fetchReporteMensual(sucursalId!, periodo),
  });

  const { data: presupuestos } = useQuery({
    queryKey: ["presupuestos", sucursalId, periodo],
    enabled: !!sucursalId,
    queryFn: async () => {
      const { data, error } = await supabase.from("presupuestos").select("*").eq("sucursal_id", sucursalId!).eq("periodo", periodo);
      if (error) throw error;
      return data ?? [];
    },
  });

  const reales = reporte ? calcularReales(reporte) : null;

  function objetivoActual(categoria: Categoria) {
    if (valores[categoria] !== undefined) return valores[categoria]!;
    const guardado = presupuestos?.find((p) => p.categoria === categoria);
    return guardado ? String(guardado.valor_objetivo) : "";
  }

  async function guardar(categoria: Categoria) {
    if (!sucursalId) return;
    const valor = objetivoActual(categoria);
    if (valor === "") return;
    setGuardando(categoria);
    try {
      const { error } = await supabase
        .from("presupuestos")
        .upsert(
          { periodo, sucursal_id: sucursalId, categoria, valor_objetivo: Number(valor), created_by: session?.user.id },
          { onConflict: "periodo,sucursal_id,categoria" }
        );
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["presupuestos", sucursalId, periodo] });
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Presupuestos</h1>
          <p className="text-sm text-ink-500">Define el objetivo de cada mes y compáralo contra lo real ya calculado en el reporte.</p>
        </div>
        <label className="flex flex-col text-xs font-medium text-ink-600">
          Mes
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
          />
        </label>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-2.5">Concepto</th>
                <th className="px-4 py-2.5 text-right">Objetivo del mes</th>
                <th className="px-4 py-2.5 text-right">Real</th>
                <th className="px-4 py-2.5 text-right">Variación</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {FILAS.map((fila) => {
                const real = reales ? fila.real(reales) : null;
                const objetivoStr = objetivoActual(fila.categoria);
                const objetivo = objetivoStr === "" ? null : Number(objetivoStr);
                const variacion = real !== null && objetivo !== null && objetivo !== 0 ? ((real - objetivo) / Math.abs(objetivo)) * 100 : null;
                const cumple = variacion === null ? null : fila.invertido ? variacion <= 0 : variacion >= 0;
                const formato = (v: number) => (fila.unidad === "pct" ? formatPercent(v) : formatCurrency(v));
                return (
                  <tr key={fila.categoria} className="border-t border-ink-100">
                    <td className="px-5 py-2.5 text-ink-700">{fila.label}</td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={objetivoStr}
                        onChange={(e) => setValores((prev) => ({ ...prev, [fila.categoria]: e.target.value }))}
                        className="w-32 rounded-lg border border-ink-300 px-2 py-1 text-right text-sm"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-900">{real === null ? "PENDIENTE" : formato(real)}</td>
                    <td
                      className={`px-4 py-2.5 text-right tabular font-medium ${
                        cumple === null ? "text-ink-400" : cumple ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {variacion === null ? "—" : `${variacion > 0 ? "+" : ""}${variacion.toFixed(1)}%`}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="secondary" onClick={() => guardar(fila.categoria)} disabled={guardando === fila.categoria}>
                        {guardando === fila.categoria ? "Guardando…" : "Guardar"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
