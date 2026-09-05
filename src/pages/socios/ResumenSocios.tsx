import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchEstadoResultadosMes, sumarEstadoResultados, type EstadoResultadosMes } from "@/lib/reporteEstadoResultados";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function periodosDelAnio(anio: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, "0")}-01`);
}

function nombreMesCorto(periodo: string) {
  const [, m] = periodo.split("-").map(Number);
  return MESES[m - 1].slice(0, 3);
}

function nombreMesLargo(periodo: string) {
  const [, m] = periodo.split("-").map(Number);
  return MESES[m - 1];
}

/** Cifra grande, en tono verde/rojo según signo — la protagonista de la vista. */
function CifraHero({ label, monto, margen, tono }: { label: string; monto: number | null; margen?: number | null; tono: "hero" | "sub" }) {
  const pendiente = monto === null;
  const negativo = monto !== null && monto < 0;
  return (
    <div>
      <p className={tono === "hero" ? "text-sm font-medium text-ink-500" : "text-xs font-medium uppercase tracking-wide text-ink-500"}>
        {label}
      </p>
      <p
        className={
          tono === "hero"
            ? `mt-1 font-display text-4xl font-semibold tabular ${pendiente ? "text-ink-400" : negativo ? "text-rose-700" : "text-brand-700"}`
            : `mt-1 text-2xl font-semibold tabular ${pendiente ? "text-ink-400" : negativo ? "text-rose-700" : "text-ink-900"}`
        }
      >
        {formatCurrency(monto)}
      </p>
      {margen !== undefined && (
        <p className="mt-1 text-sm text-ink-500">
          margen: <span className={negativo ? "text-rose-600" : "text-ink-700"}>{formatPercent(margen)}</span>
        </p>
      )}
    </div>
  );
}

export default function ResumenSocios() {
  const { sucursalId } = useAuth();
  const anioActual = new Date().getFullYear();
  const [anio, setAnio] = useState(anioActual <= 2026 ? 2026 : anioActual);
  const [mesSeleccionado, setMesSeleccionado] = useState<string | null>(null);

  const periodos = useMemo(() => periodosDelAnio(anio), [anio]);

  const { data: meses, isLoading } = useQuery({
    queryKey: ["resumen_socios", sucursalId, anio],
    enabled: !!sucursalId,
    queryFn: () => Promise.all(periodos.map((p) => fetchEstadoResultadosMes(sucursalId!, p))),
  });

  const mesesConDatos = useMemo(() => (meses ?? []).filter((m) => m.tieneDatos), [meses]);
  const anual = useMemo(() => (meses ? sumarEstadoResultados(meses) : null), [meses]);

  const ultimoConDatos = mesesConDatos.length > 0 ? mesesConDatos[mesesConDatos.length - 1] : null;
  const periodoMostrado = mesSeleccionado ?? ultimoConDatos?.periodo ?? periodos[0];
  const mesMostrado: EstadoResultadosMes | undefined = meses?.find((m) => m.periodo === periodoMostrado);

  const grafico = useMemo(
    () =>
      (meses ?? []).map((m) => ({
        mes: nombreMesCorto(m.periodo),
        utilidad: m.tieneDatos ? m.utilidadNeta : null,
      })),
    [meses]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Utilidad y Márgenes</h1>
          <p className="text-sm text-ink-500">Lo que ganó el negocio, mes a mes y en el año — después de gastos y retiros de socios.</p>
        </div>
        <label className="flex flex-col text-xs font-medium text-ink-600">
          Año
          <select
            value={anio}
            onChange={(e) => {
              setAnio(Number(e.target.value));
              setMesSeleccionado(null);
            }}
            className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
          >
            <option value={2026}>2026</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-500">Calculando…</p>
      ) : (
        <>
          {/* Mes seleccionado */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base capitalize">{nombreMesLargo(periodoMostrado)} {anio}</CardTitle>
              <select
                value={periodoMostrado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm capitalize"
              >
                {periodos.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {nombreMesLargo(p)}
                  </option>
                ))}
              </select>
            </CardHeader>
            <CardContent>
              {!mesMostrado || !mesMostrado.tieneDatos ? (
                <p className="py-4 text-sm text-ink-400">PENDIENTE — este mes aún no tiene información capturada.</p>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <CifraHero label="Utilidad neta del mes" monto={mesMostrado.utilidadNeta} margen={mesMostrado.margenUtilidadNeta} tono="hero" />
                  <CifraHero label="Ventas netas" monto={mesMostrado.ventas} tono="sub" />
                  <CifraHero label="Total gastos y retiros" monto={mesMostrado.totalEgresos} tono="sub" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acumulado anual */}
          <Card className="border-brand-200 bg-brand-50/60">
            <CardHeader className="border-b-brand-100">
              <CardTitle className="text-base text-brand-800">Acumulado {anio}</CardTitle>
            </CardHeader>
            <CardContent>
              {!anual || !anual.tieneDatos ? (
                <p className="py-4 text-sm text-ink-400">PENDIENTE — todavía no hay meses con información en {anio}.</p>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <CifraHero label="Utilidad neta del año" monto={anual.utilidadNeta} margen={anual.margenUtilidadNeta} tono="hero" />
                  <CifraHero label="Ventas netas del año" monto={anual.ventas} tono="sub" />
                  <CifraHero label="Total gastos y retiros" monto={anual.totalEgresos} tono="sub" />
                </div>
              )}
              <p className="mt-4 text-xs text-ink-500">
                Suma de los {mesesConDatos.length} {mesesConDatos.length === 1 ? "mes" : "meses"} de {anio} con información capturada.
                {mesesConDatos.length < 12 && " Los meses restantes están PENDIENTES."}
              </p>
            </CardContent>
          </Card>

          {/* Tendencia */}
          {mesesConDatos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Utilidad neta por mes</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grafico} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8eae7" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#5f6a5f" }} axisLine={{ stroke: "#d1d5d0" }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#5f6a5f" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      width={56}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Utilidad neta"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e8eae7", fontSize: 12 }}
                    />
                    <Bar dataKey="utilidad" radius={[4, 4, 0, 0]}>
                      {grafico.map((g, i) => (
                        <Cell key={i} fill={g.utilidad === null ? "#e8eae7" : g.utilidad >= 0 ? "#3c805f" : "#bd3d3d"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tabla mes a mes */}
          <Card>
            <CardHeader>
              <CardTitle>Mes a mes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-5 py-2.5">Mes</th>
                      <th className="px-4 py-2.5 text-right">Ventas</th>
                      <th className="px-4 py-2.5 text-right">Utilidad neta</th>
                      <th className="px-4 py-2.5 text-right">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(meses ?? []).map((m) => (
                      <tr
                        key={m.periodo}
                        className={`cursor-pointer border-t border-ink-100 hover:bg-ink-50 ${
                          m.periodo === periodoMostrado ? "bg-brand-50" : ""
                        }`}
                        onClick={() => setMesSeleccionado(m.periodo)}
                      >
                        <td className="px-5 py-2.5 capitalize text-ink-700">{nombreMesLargo(m.periodo)}</td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-700">{m.tieneDatos ? formatCurrency(m.ventas) : "PENDIENTE"}</td>
                        <td
                          className={`px-4 py-2.5 text-right tabular font-semibold ${
                            !m.tieneDatos ? "text-ink-400" : m.utilidadNeta >= 0 ? "text-brand-700" : "text-rose-700"
                          }`}
                        >
                          {m.tieneDatos ? formatCurrency(m.utilidadNeta) : "PENDIENTE"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-700">{m.tieneDatos ? formatPercent(m.margenUtilidadNeta) : "PENDIENTE"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
