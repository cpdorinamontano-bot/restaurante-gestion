import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchInventarioAnio, guardarInventarioMes } from "@/lib/inventarioMensual";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatPercent } from "@/lib/utils";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function nombreMes(periodo: string) {
  const [, m] = periodo.split("-").map(Number);
  return MESES[m - 1];
}

export default function InventarioMensual() {
  const { sucursalId, session } = useAuth();
  const qc = useQueryClient();
  const [anio, setAnio] = useState(2026);
  const [edicion, setEdicion] = useState<Record<string, { inicial: string; final: string }>>({});
  const [guardando, setGuardando] = useState<string | null>(null);

  const { data: filas, isLoading } = useQuery({
    queryKey: ["inventario_mensual", sucursalId, anio],
    enabled: !!sucursalId,
    queryFn: () => fetchInventarioAnio(sucursalId!, anio),
  });

  const resumen = useMemo(() => {
    if (!filas) return null;
    const conCaptura = filas.filter((f) => f.costoConsumido !== null);
    const costoConsumidoTotal = conCaptura.reduce((s, f) => s + (f.costoConsumido ?? 0), 0);
    const ventasTotal = conCaptura.reduce((s, f) => s + (f.ventasNeta ?? 0), 0);
    const pctPromedio = ventasTotal > 0 ? (costoConsumidoTotal / ventasTotal) * 100 : null;
    return { mesesCapturados: conCaptura.length, costoConsumidoTotal, pctPromedio };
  }, [filas]);

  function valorEdicion(periodo: string, campo: "inicial" | "final", valorDb: number) {
    return edicion[periodo]?.[campo] ?? String(valorDb);
  }

  function setValor(periodo: string, campo: "inicial" | "final", valor: string, defaults: { inicial: number; final: number }) {
    setEdicion((prev) => ({
      ...prev,
      [periodo]: {
        inicial: campo === "inicial" ? valor : (prev[periodo]?.inicial ?? String(defaults.inicial)),
        final: campo === "final" ? valor : (prev[periodo]?.final ?? String(defaults.final)),
      },
    }));
  }

  async function guardar(periodo: string, defaults: { inicial: number; final: number }) {
    if (!sucursalId) return;
    const inicial = Number(edicion[periodo]?.inicial ?? defaults.inicial);
    const final = Number(edicion[periodo]?.final ?? defaults.final);
    setGuardando(periodo);
    try {
      await guardarInventarioMes({ sucursalId, periodo, inventarioInicial: inicial, inventarioFinal: final, userId: session?.user.id });
      qc.invalidateQueries({ queryKey: ["inventario_mensual", sucursalId, anio] });
      setEdicion((prev) => {
        const next = { ...prev };
        delete next[periodo];
        return next;
      });
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Inventario mensual</h1>
          <p className="text-sm text-ink-500">
            Costo de insumos realmente consumido: inventario inicial + compras del mes − inventario final.
          </p>
        </div>
        <label className="flex flex-col text-xs font-medium text-ink-600">
          Año
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
          >
            <option value={2026}>2026</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Meses con inventario capturado" value={String(resumen?.mesesCapturados ?? 0)} />
        <StatCard label="Costo consumido acumulado" value={formatCurrency(resumen?.costoConsumidoTotal ?? 0)} />
        <StatCard label="% promedio sobre ventas" value={resumen?.pctPromedio != null ? formatPercent(resumen.pctPromedio) : "PENDIENTE"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Captura por mes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-2.5">Mes</th>
                  <th className="px-4 py-2.5 text-right">Inventario inicial</th>
                  <th className="px-4 py-2.5 text-right">Compras de insumos</th>
                  <th className="px-4 py-2.5 text-right">Inventario final</th>
                  <th className="px-4 py-2.5 text-right">Costo consumido</th>
                  <th className="px-4 py-2.5 text-right">% sobre ventas</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading || !filas
                  ? null
                  : filas.map((f) => (
                      <tr key={f.periodo} className="border-t border-ink-100">
                        <td className="px-5 py-2.5 capitalize text-ink-700">{nombreMes(f.periodo)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={valorEdicion(f.periodo, "inicial", f.inventarioInicial)}
                            onChange={(e) => setValor(f.periodo, "inicial", e.target.value, { inicial: f.inventarioInicial, final: f.inventarioFinal })}
                            className="w-28 rounded-lg border border-ink-300 px-2 py-1 text-right text-sm"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-700">{formatCurrency(f.comprasInsumos)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={valorEdicion(f.periodo, "final", f.inventarioFinal)}
                            onChange={(e) => setValor(f.periodo, "final", e.target.value, { inicial: f.inventarioInicial, final: f.inventarioFinal })}
                            className="w-28 rounded-lg border border-ink-300 px-2 py-1 text-right text-sm"
                          />
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right tabular font-semibold ${
                            f.costoConsumido === null ? "text-ink-400" : f.costoConsumido < 0 ? "text-rose-700" : "text-ink-900"
                          }`}
                        >
                          {f.costoConsumido === null ? "PENDIENTE" : formatCurrency(f.costoConsumido)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-700">
                          {f.pctSobreVentas === null ? "—" : formatPercent(f.pctSobreVentas)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button size="sm" variant="secondary" onClick={() => guardar(f.periodo, { inicial: f.inventarioInicial, final: f.inventarioFinal })} disabled={guardando === f.periodo}>
                            {guardando === f.periodo ? "Guardando…" : "Guardar"}
                          </Button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-ink-500">
        Sugerencia: el inventario final de un mes normalmente es el inicial del mes siguiente — cópielo al capturar el
        siguiente periodo. Un costo consumido negativo suele indicar un inventario final capturado por encima del inicial
        más las compras: revise las cifras.
      </p>
    </div>
  );
}
