import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { fetchReporteMensual } from "@/lib/reportes";
import { exportTablaExcel } from "@/lib/reporteExport";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowUpRight, FileSpreadsheet, Wand2 } from "lucide-react";

type Categoria = "ventas" | "food_cost" | "labor_cost" | "gastos" | "utilidad";

const FILAS: { categoria: Categoria; label: string; unidad: "monto" | "pct" }[] = [
  { categoria: "ventas", label: "Ventas netas", unidad: "monto" },
  { categoria: "food_cost", label: "Food cost %", unidad: "pct" },
  { categoria: "labor_cost", label: "Costo laboral %", unidad: "pct" },
  { categoria: "gastos", label: "Gastos fijos + variables", unidad: "monto" },
  { categoria: "utilidad", label: "Ganancia neta", unidad: "monto" },
];

/** Mismo criterio que la comparación real-vs-objetivo de Presupuestos.tsx. */
function calcularRealesDelMes(r: Awaited<ReturnType<typeof fetchReporteMensual>>) {
  return {
    ventas: r.ventasFuente === "sin_datos" ? null : r.ventasNeta,
    food_cost: r.foodCostPct,
    labor_cost: r.costoLaboralPct,
    gastos: r.gastosFijosTotal + r.gastosVariablesTotal,
    utilidad: r.gananciaNeta,
  };
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function periodosDelAnio(anio: number) {
  return Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, "0")}-01`);
}

type Celdas = Record<string, Record<Categoria, string>>; // periodo -> categoria -> valor (string para edición)

export default function PresupuestoAnual() {
  const { sucursalId, session } = useAuth();
  const qc = useQueryClient();
  const [anio, setAnio] = useState(() => new Date().getFullYear());
  const periodos = useMemo(() => periodosDelAnio(anio), [anio]);
  const [celdas, setCeldas] = useState<Celdas>({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [crecimientoPct, setCrecimientoPct] = useState("0");
  const [generando, setGenerando] = useState(false);

  const { data: presupuestos, isLoading } = useQuery({
    queryKey: ["presupuestos_anio", sucursalId, anio],
    enabled: !!sucursalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presupuestos")
        .select("*")
        .eq("sucursal_id", sucursalId!)
        .gte("periodo", periodos[0])
        .lte("periodo", periodos[11]);
      if (error) throw error;
      return data ?? [];
    },
  });

  function valorCelda(periodo: string, categoria: Categoria): string {
    const editado = celdas[periodo]?.[categoria];
    if (editado !== undefined) return editado;
    const guardado = presupuestos?.find((p) => p.periodo === periodo && p.categoria === categoria);
    return guardado ? String(guardado.valor_objetivo) : "";
  }

  function setCelda(periodo: string, categoria: Categoria, valor: string) {
    setCeldas((prev) => ({ ...prev, [periodo]: { ...prev[periodo], [categoria]: valor } }));
    setMensaje(null);
  }

  function totalAnual(categoria: Categoria, unidad: "monto" | "pct"): number | null {
    const valores = periodos.map((p) => valorCelda(p, categoria)).filter((v) => v !== "");
    if (!valores.length) return null;
    const nums = valores.map(Number);
    if (unidad === "pct") return nums.reduce((s, n) => s + n, 0) / nums.length;
    return nums.reduce((s, n) => s + n, 0);
  }

  async function copiarATodoElAnio(categoria: Categoria) {
    const base = valorCelda(periodos[0], categoria);
    if (base === "") return;
    setCeldas((prev) => {
      const next = { ...prev };
      periodos.forEach((p) => {
        next[p] = { ...next[p], [categoria]: base };
      });
      return next;
    });
  }

  /**
   * Prellena los 12 meses del año en edición con el real del año anterior, mes a mes
   * (enero del año anterior → enero de este año, y así sucesivamente), aplicando un
   * % de crecimiento opcional a los montos (ventas, gastos, utilidad). Los porcentajes
   * (food cost, costo laboral) se copian igual — un % no "crece", es una meta de eficiencia.
   * No guarda nada todavía: solo llena las celdas para que se revisen/ajusten antes de
   * "Guardar presupuesto".
   */
  async function generarDesdeReal() {
    if (!sucursalId) return;
    setGenerando(true);
    setMensaje(null);
    try {
      const anioBase = anio - 1;
      const periodosBase = periodosDelAnio(anioBase);
      const reportes = await Promise.all(periodosBase.map((p) => fetchReporteMensual(sucursalId, p)));
      const factor = 1 + (Number(crecimientoPct) || 0) / 100;

      let huboDatos = false;
      setCeldas((prev) => {
        const next = { ...prev };
        reportes.forEach((r, i) => {
          const reales = calcularRealesDelMes(r);
          const periodoNuevo = periodos[i];
          FILAS.forEach(({ categoria, unidad }) => {
            const real = reales[categoria];
            if (real === null) return;
            huboDatos = true;
            const valor = unidad === "monto" ? real * factor : real;
            next[periodoNuevo] = { ...next[periodoNuevo], [categoria]: valor.toFixed(2) };
          });
        });
        return next;
      });
      setMensaje(
        huboDatos
          ? `Presupuesto ${anio} prellenado con el real de ${anioBase}${factor !== 1 ? ` (+${crecimientoPct}% en montos)` : ""}. Revísalo y ajusta antes de guardar.`
          : `${anioBase} no tiene datos reales capturados todavía — no hay nada que prellenar.`
      );
    } finally {
      setGenerando(false);
    }
  }

  function exportarExcel() {
    exportTablaExcel({
      titulo: `Bianco Storico — Presupuesto anual ${anio}`,
      columnas: [
        { header: "Concepto", width: 28 },
        ...MESES.map((m) => ({ header: m, width: 10, tipo: "numero" as const })),
        { header: "Total", width: 14, tipo: "numero" as const },
      ],
      filas: FILAS.map((fila) => [
        fila.label,
        ...periodos.map((p) => {
          const v = valorCelda(p, fila.categoria);
          return v === "" ? null : Number(v);
        }),
        totalAnual(fila.categoria, fila.unidad),
      ]),
      nombreArchivo: `presupuesto-anual-${anio}.xlsx`,
    });
  }

  async function guardarAnio() {
    if (!sucursalId) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const filas: { periodo: string; sucursal_id: string; categoria: Categoria; valor_objetivo: number; created_by?: string }[] = [];
      periodos.forEach((periodo) => {
        FILAS.forEach(({ categoria }) => {
          const valor = celdas[periodo]?.[categoria];
          if (valor !== undefined && valor !== "") {
            filas.push({ periodo, sucursal_id: sucursalId, categoria, valor_objetivo: Number(valor), created_by: session?.user.id });
          }
        });
      });
      if (!filas.length) {
        setMensaje("No hay cambios por guardar.");
        return;
      }
      const { error } = await supabase.from("presupuestos").upsert(filas, { onConflict: "periodo,sucursal_id,categoria" });
      if (error) throw error;
      setCeldas({});
      qc.invalidateQueries({ queryKey: ["presupuestos_anio", sucursalId, anio] });
      qc.invalidateQueries({ queryKey: ["presupuestos"] });
      setMensaje(`Presupuesto ${anio} guardado.`);
    } catch (e: any) {
      setMensaje(`Error al guardar: ${e.message}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Presupuesto anual</h1>
          <p className="text-sm text-ink-500">Define el objetivo de cada mes del año en una sola vista. El detalle mes a mes contra lo real está en Presupuestos.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs font-medium text-ink-600">
            Año
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="mt-1 w-24 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
          </label>
          <Button variant="secondary" size="sm" onClick={exportarExcel}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Link
            to="/finanzas/presupuestos"
            className="inline-flex items-center gap-1 rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            Ver real vs. objetivo <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <Card className="border-brand-200 bg-brand-50/50">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div>
            <p className="text-sm font-medium text-ink-800">Armar {anio} a partir de lo real de {anio - 1}</p>
            <p className="mt-0.5 text-xs text-ink-500">
              Prellena los 12 meses con las cifras reales del año anterior, mes a mes. Puedes ajustar un % de crecimiento para
              ventas, gastos y utilidad — los porcentajes de food cost y costo laboral se copian igual. Nada se guarda hasta
              que presiones "Guardar presupuesto".
            </p>
          </div>
          <label className="flex flex-col text-xs font-medium text-ink-600">
            Crecimiento en montos
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={crecimientoPct}
                onChange={(e) => setCrecimientoPct(e.target.value)}
                className="w-20 rounded-lg border border-ink-300 px-2 py-1.5 text-right text-sm"
              />
              <span className="text-ink-500">%</span>
            </div>
          </label>
          <Button size="sm" onClick={generarDesdeReal} disabled={generando}>
            <Wand2 className="h-4 w-4" /> {generando ? "Generando…" : `Generar desde real de ${anio - 1}`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="sticky left-0 bg-white px-5 py-2.5">Concepto</th>
                {MESES.map((m) => (
                  <th key={m} className="px-2 py-2.5 text-right">
                    {m}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="px-5 py-6 text-center text-ink-500">
                    Cargando…
                  </td>
                </tr>
              ) : (
                FILAS.map((fila) => {
                  const total = totalAnual(fila.categoria, fila.unidad);
                  return (
                    <tr key={fila.categoria} className="border-t border-ink-100">
                      <td className="sticky left-0 whitespace-nowrap bg-white px-5 py-2 text-ink-700">{fila.label}</td>
                      {periodos.map((periodo) => (
                        <td key={periodo} className="px-1 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={valorCelda(periodo, fila.categoria)}
                            onChange={(e) => setCelda(periodo, fila.categoria, e.target.value)}
                            className="w-20 rounded-md border border-ink-200 px-1.5 py-1 text-right text-xs"
                            placeholder="—"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right text-xs font-semibold tabular text-ink-900">
                        {total === null ? "—" : fila.unidad === "pct" ? `${total.toFixed(1)}%` : total.toLocaleString("es-MX", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => copiarATodoElAnio(fila.categoria)}
                          className="whitespace-nowrap text-xs font-medium text-brand-700 hover:underline"
                          title="Copia el valor de enero a los 12 meses"
                        >
                          Copiar a todos
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={guardarAnio} disabled={guardando}>
          {guardando ? "Guardando…" : `Guardar presupuesto ${anio}`}
        </Button>
        {mensaje && <span className="text-sm text-ink-600">{mensaje}</span>}
      </div>
    </div>
  );
}
