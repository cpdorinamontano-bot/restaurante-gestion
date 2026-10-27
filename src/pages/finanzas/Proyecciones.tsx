import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { fetchReporteMensual, type ReporteMensual } from "@/lib/reportes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatPercent } from "@/lib/utils";

function nombreMesCorto(periodoISO: string) {
  const [y, m] = periodoISO.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
}

function sumarMeses(periodoISO: string, n: number) {
  const [y, m] = periodoISO.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function ultimosPeriodos(mesActual: string, n: number) {
  return Array.from({ length: n }, (_, i) => sumarMeses(mesActual, -(n - 1 - i)));
}

/** Tasa de crecimiento mensual promedio implícita en la serie histórica (de ventas netas con datos reales). */
function crecimientoPromedio(serie: { periodo: string; valor: number | null }[]): number {
  const puntos = serie.filter((p) => p.valor !== null && p.valor! > 0) as { periodo: string; valor: number }[];
  if (puntos.length < 2) return 0;
  const cambios: number[] = [];
  for (let i = 1; i < puntos.length; i++) {
    cambios.push((puntos[i].valor - puntos[i - 1].valor) / puntos[i - 1].valor);
  }
  const promedio = cambios.reduce((s, c) => s + c, 0) / cambios.length;
  return Number((promedio * 100).toFixed(1));
}

export default function Proyecciones() {
  const { sucursalId, session } = useAuth();
  const qc = useQueryClient();
  const [mesBase] = useState(() => new Date().toISOString().slice(0, 7));
  const periodoBase = `${mesBase}-01`;
  const periodosHistoricos = useMemo(() => ultimosPeriodos(periodoBase, 6), [periodoBase]);

  const [horizonte, setHorizonte] = useState(6);
  const [crecVentas, setCrecVentas] = useState(0);
  const [foodCostObj, setFoodCostObj] = useState<string>("");
  const [laborCostObj, setLaborCostObj] = useState<string>("");
  const [crecGastos, setCrecGastos] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado] = useState(false);

  const { data: historico, isLoading } = useQuery({
    queryKey: ["reportes_historico_proyeccion", sucursalId, periodoBase],
    enabled: !!sucursalId,
    queryFn: () => Promise.all(periodosHistoricos.map((p) => fetchReporteMensual(sucursalId!, p))),
  });

  const { data: supuestosGuardados } = useQuery({
    queryKey: ["supuestos_proyeccion", sucursalId],
    enabled: !!sucursalId,
    queryFn: async () => {
      const { data, error } = await supabase.from("supuestos_proyeccion").select("*").eq("sucursal_id", sucursalId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (supuestosGuardados && !cargado) {
      setHorizonte(supuestosGuardados.meses_horizonte);
      setCrecVentas(Number(supuestosGuardados.crecimiento_ventas_pct));
      setFoodCostObj(supuestosGuardados.food_cost_objetivo_pct != null ? String(supuestosGuardados.food_cost_objetivo_pct) : "");
      setLaborCostObj(supuestosGuardados.labor_cost_objetivo_pct != null ? String(supuestosGuardados.labor_cost_objetivo_pct) : "");
      setCrecGastos(Number(supuestosGuardados.crecimiento_gastos_pct));
      setCargado(true);
    }
  }, [supuestosGuardados, cargado]);

  const ultimoReal = useMemo(() => {
    if (!historico) return null;
    return [...historico].reverse().find((r) => r.ventasFuente !== "sin_datos") ?? null;
  }, [historico]);

  const crecimientoSugerido = useMemo(() => {
    if (!historico) return 0;
    return crecimientoPromedio(historico.map((r) => ({ periodo: r.periodo, valor: r.ventasFuente !== "sin_datos" ? r.ventasNeta : null })));
  }, [historico]);

  const proyeccion = useMemo(() => {
    if (!ultimoReal) return [];
    const foodCostPct = foodCostObj !== "" ? Number(foodCostObj) : ultimoReal.foodCostPct ?? 0;
    const laborCostPct = laborCostObj !== "" ? Number(laborCostObj) : ultimoReal.costoLaboralPct ?? 0;
    let ventas = ultimoReal.ventasNeta;
    let gastos = ultimoReal.gastosFijosTotal + ultimoReal.gastosVariablesTotal;
    const filas: { periodo: string; ventas: number; foodCostPct: number; laborCostPct: number; gastos: number; utilidad: number }[] = [];
    for (let i = 1; i <= horizonte; i++) {
      ventas = ventas * (1 + crecVentas / 100);
      gastos = gastos * (1 + crecGastos / 100);
      const margenBruto = ventas * (1 - foodCostPct / 100);
      const costoLaboral = ventas * (laborCostPct / 100);
      const utilidad = margenBruto - costoLaboral - gastos;
      filas.push({ periodo: sumarMeses(ultimoReal.periodo, i), ventas, foodCostPct, laborCostPct, gastos, utilidad });
    }
    return filas;
  }, [ultimoReal, horizonte, crecVentas, crecGastos, foodCostObj, laborCostObj]);

  const dataGrafica = useMemo(() => {
    const historicoPts = (historico ?? [])
      .filter((r) => r.ventasFuente !== "sin_datos")
      .map((r) => ({ mes: nombreMesCorto(r.periodo), ventas: r.ventasNeta, tipo: "Real" }));
    const proyeccionPts = proyeccion.map((p) => ({ mes: nombreMesCorto(p.periodo), ventasProyectadas: p.ventas, tipo: "Proyectado" }));
    return [...historicoPts, ...proyeccionPts];
  }, [historico, proyeccion]);

  async function guardarSupuestos() {
    if (!sucursalId) return;
    setGuardando(true);
    try {
      const { error } = await supabase.from("supuestos_proyeccion").upsert(
        {
          sucursal_id: sucursalId,
          meses_horizonte: horizonte,
          crecimiento_ventas_pct: crecVentas,
          food_cost_objetivo_pct: foodCostObj === "" ? null : Number(foodCostObj),
          labor_cost_objetivo_pct: laborCostObj === "" ? null : Number(laborCostObj),
          crecimiento_gastos_pct: crecGastos,
          updated_by: session?.user.id,
        },
        { onConflict: "sucursal_id" }
      );
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["supuestos_proyeccion", sucursalId] });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Proyecciones</h1>
        <p className="text-sm text-ink-500">
          Ingresos, costos y utilidad esperados hacia adelante, partiendo del último mes real y los supuestos de crecimiento que definas.
        </p>
      </div>

      {isLoading && <p className="text-sm text-ink-500">Calculando histórico…</p>}

      {!isLoading && !ultimoReal && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No hay meses con ventas capturadas todavía — no se puede proyectar sin un punto de partida real.
        </div>
      )}

      {ultimoReal && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Supuestos de crecimiento</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <label className="flex flex-col text-xs font-medium text-ink-600">
                Meses a proyectar
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={horizonte}
                  onChange={(e) => setHorizonte(Number(e.target.value))}
                  className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-ink-600">
                Crecimiento ventas %/mes
                <input
                  type="number"
                  step="0.1"
                  value={crecVentas}
                  onChange={(e) => setCrecVentas(Number(e.target.value))}
                  className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                />
                <span className="mt-1 text-[11px] text-ink-400">Histórico sugiere {crecimientoSugerido}%</span>
              </label>
              <label className="flex flex-col text-xs font-medium text-ink-600">
                Food cost objetivo %
                <input
                  type="number"
                  step="0.1"
                  value={foodCostObj}
                  onChange={(e) => setFoodCostObj(e.target.value)}
                  placeholder={ultimoReal.foodCostPct != null ? ultimoReal.foodCostPct.toFixed(1) : "—"}
                  className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-ink-600">
                Costo laboral objetivo %
                <input
                  type="number"
                  step="0.1"
                  value={laborCostObj}
                  onChange={(e) => setLaborCostObj(e.target.value)}
                  placeholder={ultimoReal.costoLaboralPct != null ? ultimoReal.costoLaboralPct.toFixed(1) : "—"}
                  className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-ink-600">
                Crecimiento gastos %/mes
                <input
                  type="number"
                  step="0.1"
                  value={crecGastos}
                  onChange={(e) => setCrecGastos(Number(e.target.value))}
                  className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                />
              </label>
            </CardContent>
          </Card>

          <div>
            <Button onClick={guardarSupuestos} disabled={guardando} size="sm" variant="secondary">
              {guardando ? "Guardando…" : "Guardar estos supuestos"}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ventas: histórico y proyección</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataGrafica} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e4dc" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6b6f66" }} axisLine={{ stroke: "#d8d5cb" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#6b6f66" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={56} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 8, border: "1px solid #e7e4dc", fontSize: 12 }} />
                  <Line type="monotone" dataKey="ventas" name="Ventas reales" stroke="#207a4f" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  <Line
                    type="monotone"
                    dataKey="ventasProyectadas"
                    name="Ventas proyectadas"
                    stroke="#b8790c"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proyección mes a mes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-2.5">Mes</th>
                    <th className="px-4 py-2.5 text-right">Ventas proyectadas</th>
                    <th className="px-4 py-2.5 text-right">Food cost %</th>
                    <th className="px-4 py-2.5 text-right">Costo laboral %</th>
                    <th className="px-4 py-2.5 text-right">Gastos</th>
                    <th className="px-4 py-2.5 text-right">Utilidad proyectada</th>
                  </tr>
                </thead>
                <tbody>
                  {proyeccion.map((p) => (
                    <tr key={p.periodo} className="border-t border-ink-100">
                      <td className="px-5 py-2.5 capitalize text-ink-700">{nombreMesCorto(p.periodo)}</td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-900">{formatCurrency(p.ventas)}</td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-600">{formatPercent(p.foodCostPct)}</td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-600">{formatPercent(p.laborCostPct)}</td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-600">{formatCurrency(p.gastos)}</td>
                      <td
                        className={`px-4 py-2.5 text-right tabular font-medium ${p.utilidad >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                      >
                        {formatCurrency(p.utilidad)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
