import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchEstadoResultadosMes, sumarEstadoResultados, type EstadoResultadosMes } from "@/lib/reporteEstadoResultados";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Fila {
  key: string;
  label: string;
  tipo: "monto" | "pct" | "seccion";
  get?: (m: EstadoResultadosMes) => number | null;
  resaltado?: boolean;
  indent?: boolean;
  expandible?: boolean;
}

const FILAS: Fila[] = [
  { key: "ventas", label: "Ventas", tipo: "monto", get: (m) => m.ventas, resaltado: true },
  { key: "sec_costo", label: "Costo de Ventas", tipo: "seccion" },
  { key: "compras", label: "Compras", tipo: "monto", get: (m) => m.compras, indent: true },
  { key: "mano_obra", label: "Mano de obra", tipo: "monto", get: (m) => m.manoDeObra, indent: true },
  { key: "total_costo_ventas", label: "Total costo de Ventas", tipo: "monto", get: (m) => m.totalCostoVentas, resaltado: true },
  { key: "pct_mo", label: "% Mano de obra", tipo: "pct", get: (m) => m.pctMO, indent: true },
  { key: "pct_costo", label: "% Costo de Ventas", tipo: "pct", get: (m) => m.pctCosto, indent: true },
  { key: "sec_gastos", label: "Gastos Generales", tipo: "seccion" },
  { key: "propinas", label: "Propinas", tipo: "monto", get: (m) => m.propinas, indent: true },
  { key: "comisiones", label: "Comisiones", tipo: "monto", get: (m) => m.comisiones, indent: true },
  { key: "gastos_fijos", label: "Gastos fijos", tipo: "monto", get: (m) => m.gastosFijos, indent: true },
  { key: "mantenimiento", label: "Mantenimiento", tipo: "monto", get: (m) => m.mantenimiento, indent: true },
  { key: "impuestos", label: "Impuestos", tipo: "monto", get: (m) => m.impuestos, indent: true },
  { key: "otros_gg", label: "Otros gastos generales", tipo: "monto", get: (m) => m.otrosGastosGenerales, indent: true, expandible: true },
  { key: "total_gastos_generales", label: "Total gastos generales", tipo: "monto", get: (m) => m.totalGastosGenerales, resaltado: true },
  { key: "utilidad_financiera", label: "Utilidad financiera", tipo: "monto", get: (m) => m.utilidadFinanciera, resaltado: true },
  { key: "margen_financiero", label: "Margen", tipo: "pct", get: (m) => m.margenUtilidadFinanciera, indent: true },
  { key: "sec_socios", label: "Dividendos y retiros", tipo: "seccion" },
  { key: "retiros_socios", label: "Retiros socios", tipo: "monto", get: (m) => m.retirosSocios, indent: true },
  { key: "gastos_personales_socios", label: "Gastos personales socios", tipo: "monto", get: (m) => m.gastosPersonalesSocios, indent: true },
  { key: "nomina_socios", label: "Nómina socios", tipo: "monto", get: (m) => m.nominaSocios, indent: true },
  { key: "total_ret_socios", label: "Total dividendos y retiros", tipo: "monto", get: (m) => m.totalRetSocios, resaltado: true },
  { key: "margen_socios", label: "Margen socios", tipo: "pct", get: (m) => m.margenSocios, indent: true },
  { key: "total_egresos", label: "Total egresos", tipo: "monto", get: (m) => m.totalEgresos, resaltado: true },
  { key: "utilidad_neta", label: "Utilidad neta", tipo: "monto", get: (m) => m.utilidadNeta, resaltado: true },
  { key: "margen_neto", label: "Margen", tipo: "pct", get: (m) => m.margenUtilidadNeta, indent: true },
];

function listaPeriodos(desde: string, hasta: string): string[] {
  const [y1, m1] = desde.split("-").map(Number);
  const [y2, m2] = hasta.split("-").map(Number);
  const periodos: string[] = [];
  let y = y1;
  let m = m1;
  while (y < y2 || (y === y2 && m <= m2)) {
    periodos.push(`${y}-${String(m).padStart(2, "0")}-01`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return periodos;
}

function nombreMesCorto(periodo: string) {
  return new Date(`${periodo}T00:00:00`).toLocaleDateString("es-MX", { month: "short" });
}

export default function EstadoResultados() {
  const { sucursalId } = useAuth();
  const [desde, setDesde] = useState("2026-01");
  const [hasta, setHasta] = useState("2026-12");
  const [abierta, setAbierta] = useState<string | null>(null);

  const periodos = useMemo(() => listaPeriodos(desde, hasta), [desde, hasta]);

  const { data: meses, isLoading } = useQuery({
    queryKey: ["estado_resultados", sucursalId, desde, hasta],
    enabled: !!sucursalId,
    queryFn: () => Promise.all(periodos.map((p) => fetchEstadoResultadosMes(sucursalId!, p))),
  });

  const total = meses ? sumarEstadoResultados(meses) : null;

  const mesesConDatos = useMemo(() => (meses ?? []).filter((m) => m.tieneDatos), [meses]);

  const tendencia = useMemo(
    () =>
      mesesConDatos.map((m) => ({
        mes: nombreMesCorto(m.periodo),
        ventas: m.ventas,
        margenFinanciero: m.margenUtilidadFinanciera ?? 0,
        margenNeto: m.margenUtilidadNeta ?? 0,
      })),
    [mesesConDatos]
  );

  const estructura = useMemo(
    () =>
      mesesConDatos.map((m) => ({
        mes: nombreMesCorto(m.periodo),
        costoVentasPct: m.ventas > 0 ? Number(((m.totalCostoVentas / m.ventas) * 100).toFixed(1)) : 0,
        gastosGeneralesPct: m.ventas > 0 ? Number(((m.totalGastosGenerales / m.ventas) * 100).toFixed(1)) : 0,
        retirosPct: m.ventas > 0 ? Number(((m.totalRetSocios / m.ventas) * 100).toFixed(1)) : 0,
        utilidadNetaPct: m.margenUtilidadNeta ?? 0,
      })),
    [mesesConDatos]
  );

  function celda(fila: Fila, mes: EstadoResultadosMes) {
    if (!fila.get) return null;
    if (!mes.tieneDatos) return "PENDIENTE";
    const valor = fila.get(mes);
    if (valor === null) return "PENDIENTE";
    return fila.tipo === "pct" ? formatPercent(valor) : formatCurrency(valor);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Estado de Resultados</h1>
          <p className="text-sm text-ink-500">
            Ventas, Costo de Ventas, Gastos Generales, Utilidad financiera y Dividendos/retiros de socios, mes a mes. Los meses sin datos
            capturados se muestran como PENDIENTE.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex flex-col text-xs font-medium text-ink-600">
            Desde
            <input type="month" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm" />
          </label>
          <label className="flex flex-col text-xs font-medium text-ink-600">
            Hasta
            <input type="month" value={hasta} onChange={(e) => setHasta(e.target.value)} className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm" />
          </label>
        </div>
      </div>

      {!isLoading && total && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Ventas (periodo)" value={total.tieneDatos ? formatCurrency(total.ventas) : "PENDIENTE"} />
            <StatCard
              label="Utilidad financiera"
              value={total.tieneDatos ? formatCurrency(total.utilidadFinanciera) : "PENDIENTE"}
              hint={total.tieneDatos ? `${formatPercent(total.margenUtilidadFinanciera)} de ventas — antes de retiros` : undefined}
              tone={total.tieneDatos ? (total.utilidadFinanciera >= 0 ? "positivo" : "negativo") : "neutral"}
            />
            <StatCard
              label="Dividendos y retiros"
              value={total.tieneDatos ? formatCurrency(total.totalRetSocios) : "PENDIENTE"}
              hint={total.tieneDatos ? `${formatPercent(total.margenSocios)} de ventas` : undefined}
            />
            <StatCard
              label="Utilidad neta"
              value={total.tieneDatos ? formatCurrency(total.utilidadNeta) : "PENDIENTE"}
              hint={total.tieneDatos ? `${formatPercent(total.margenUtilidadNeta)} de ventas — después de retiros` : undefined}
              tone={total.tieneDatos ? (total.utilidadNeta >= 0 ? "positivo" : "negativo") : "neutral"}
            />
          </div>

          {mesesConDatos.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ventas y márgenes — meses con datos</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tendencia} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8eae7" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#5f6a5f" }} axisLine={{ stroke: "#d1d5d0" }} tickLine={false} />
                      <YAxis
                        yAxisId="ventas"
                        tick={{ fontSize: 12, fill: "#5f6a5f" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        width={56}
                      />
                      <YAxis
                        yAxisId="pct"
                        orientation="right"
                        tick={{ fontSize: 12, fill: "#5f6a5f" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                        width={44}
                      />
                      <Tooltip
                        formatter={(value: number, name) => (name === "Ventas" ? [formatCurrency(value), name] : [formatPercent(value), name])}
                        contentStyle={{ borderRadius: 8, border: "1px solid #e8eae7", fontSize: 12 }}
                      />
                      <Line yAxisId="ventas" type="monotone" dataKey="ventas" name="Ventas" stroke="#3c805f" strokeWidth={2} dot={{ r: 3 }} />
                      <Line
                        yAxisId="pct"
                        type="monotone"
                        dataKey="margenFinanciero"
                        name="Margen financiero %"
                        stroke="#b8790c"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line yAxisId="pct" type="monotone" dataKey="margenNeto" name="Margen neto %" stroke="#bd3d3d" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estructura de costos (% de ventas)</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={estructura} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8eae7" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#5f6a5f" }} axisLine={{ stroke: "#d1d5d0" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#5f6a5f" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={44} />
                      <Tooltip formatter={(value: number, name) => [`${value}%`, name]} contentStyle={{ borderRadius: 8, border: "1px solid #e8eae7", fontSize: 12 }} />
                      <Bar dataKey="costoVentasPct" name="Costo de Ventas %" stackId="a" fill="#3c805f" />
                      <Bar dataKey="gastosGeneralesPct" name="Gastos Generales %" stackId="a" fill="#8bbea3" />
                      <Bar dataKey="retirosPct" name="Dividendos y retiros %" stackId="a" fill="#b8790c" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Resultados {desde.slice(0, 4)}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || !meses || !total ? (
            <p className="px-5 py-4 text-sm text-ink-500">Calculando…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-2.5">Concepto</th>
                    {meses.map((m) => (
                      <th key={m.periodo} className="px-4 py-2.5 text-right capitalize">
                        {nombreMesCorto(m.periodo)}
                      </th>
                    ))}
                    <th className="px-4 py-2.5 text-right text-ink-900">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {FILAS.map((fila) => {
                    if (fila.tipo === "seccion") {
                      return (
                        <tr key={fila.key} className="border-t border-ink-200 bg-ink-50/80">
                          <td colSpan={meses.length + 2} className="px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                            {fila.label}
                          </td>
                        </tr>
                      );
                    }
                    const abiertaAqui = abierta === fila.key;
                    return (
                      <Fragment key={fila.key}>
                        <tr
                          onDoubleClick={() => fila.expandible && setAbierta(abiertaAqui ? null : fila.key)}
                          className={`border-t border-ink-100 ${fila.expandible ? "cursor-pointer select-none hover:bg-ink-50" : ""} ${
                            fila.resaltado ? "font-semibold text-ink-900" : "text-ink-700"
                          }`}
                          title={fila.expandible ? "Doble clic para ver el desglose por categoría" : undefined}
                        >
                          <td className={`px-5 py-2 ${fila.indent ? "pl-8 text-ink-600" : ""}`}>
                            <span className="inline-flex items-center gap-1.5">
                              {fila.expandible &&
                                (abiertaAqui ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-ink-400" />
                                ))}
                              {fila.label}
                            </span>
                          </td>
                          {meses.map((m) => (
                            <td key={m.periodo} className="px-4 py-2 text-right tabular">
                              {celda(fila, m)}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-right tabular font-semibold text-ink-900">{celda(fila, total)}</td>
                        </tr>
                        {abiertaAqui && fila.expandible && (
                          <tr>
                            <td colSpan={meses.length + 2} className="border-t border-ink-100 bg-ink-50/60 p-0">
                              {total.otrosGastosGeneralesDesglose.length === 0 ? (
                                <p className="px-5 py-3 text-xs text-ink-400">Sin movimientos en el rango seleccionado.</p>
                              ) : (
                                <table className="w-full text-xs">
                                  <tbody>
                                    {total.otrosGastosGeneralesDesglose.map((d) => (
                                      <tr key={d.nombre} className="border-t border-ink-100/70">
                                        <td className="py-1 pl-8 pr-4 text-ink-600">{d.nombre}</td>
                                        <td className="py-1 pr-5 text-right tabular text-ink-900">{formatCurrency(d.monto)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
