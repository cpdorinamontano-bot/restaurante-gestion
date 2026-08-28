import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchDesgloseDiario,
  fetchReporteMensual,
  sumarPeriodos,
  type MetricaDiaria,
  type ReporteMensual,
} from "@/lib/reportes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Fila {
  key: string;
  label: string;
  tipo: "monto" | "pct";
  metrica?: MetricaDiaria;
  get: (r: ReporteMensual) => number | null;
  resaltado?: boolean;
}

const FILAS: Fila[] = [
  { key: "ventas", label: "Ventas netas", tipo: "monto", metrica: "ventas", get: (r) => (r.ventasFuente === "sin_datos" ? null : r.ventasNeta), resaltado: true },
  { key: "cmv", label: "Compras / costo de mercadería vendida", tipo: "monto", metrica: "cmv", get: (r) => (r.cmvFuente === "sin_datos" ? null : r.cmv) },
  { key: "food_cost_pct", label: "Food cost %", tipo: "pct", get: (r) => r.foodCostPct },
  { key: "margen_bruto", label: "Margen bruto", tipo: "monto", get: (r) => r.margenBruto, resaltado: true },
  { key: "laboral", label: "Costo laboral", tipo: "monto", metrica: "laboral", get: (r) => r.costoLaboralTotal },
  { key: "laboral_pct", label: "Costo laboral %", tipo: "pct", get: (r) => r.costoLaboralPct },
  { key: "gastos_fijos", label: "Gastos fijos", tipo: "monto", metrica: "gastos_fijos", get: (r) => r.gastosFijosTotal },
  { key: "gastos_variables", label: "Gastos variables y operativos", tipo: "monto", metrica: "gastos_variables", get: (r) => r.gastosVariablesTotal },
  { key: "impuestos", label: "Impuestos y otros conceptos", tipo: "monto", get: (r) => r.impuestosGasto },
  { key: "resultado_operativo", label: "Resultado operativo", tipo: "monto", get: (r) => r.resultadoOperativo, resaltado: true },
  { key: "resultado_operativo_pct", label: "Resultado operativo %", tipo: "pct", get: (r) => r.resultadoOperativoPct },
  { key: "ganancia_neta", label: "Ganancia / pérdida neta", tipo: "monto", get: (r) => r.gananciaNeta, resaltado: true },
  { key: "ganancia_neta_pct", label: "Ganancia neta %", tipo: "pct", get: (r) => r.gananciaNetaPct },
  { key: "ingresos", label: "Flujo — ingresos (banco + caja)", tipo: "monto", metrica: "ingresos", get: (r) => r.flujoIngresos },
  { key: "egresos", label: "Flujo — egresos (banco + caja)", tipo: "monto", metrica: "egresos", get: (r) => r.flujoEgresos },
  { key: "flujo_neto", label: "Flujo neto", tipo: "monto", get: (r) => r.flujoNeto, resaltado: true },
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
  return new Date(`${periodo}T00:00:00`).toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
}

function FilaDrilldown({ sucursalId, metrica, inicio, fin }: { sucursalId: string; metrica: MetricaDiaria; inicio: string; fin: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["desglose_diario", sucursalId, metrica, inicio, fin],
    queryFn: () => fetchDesgloseDiario(sucursalId, metrica, inicio, fin),
  });

  if (isLoading) return <p className="px-4 py-3 text-xs text-ink-400">Cargando desglose diario…</p>;
  if (!data?.length) return <p className="px-4 py-3 text-xs text-ink-400">Sin movimientos en el rango seleccionado.</p>;

  return (
    <div className="max-h-72 overflow-y-auto border-t border-ink-100 bg-ink-50/60 px-4 py-2">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-ink-50 text-left uppercase tracking-wide text-ink-400">
          <tr>
            <th className="py-1">Fecha</th>
            <th className="py-1 text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.fecha} className="border-t border-ink-100/70">
              <td className="py-1 text-ink-600">{formatDate(d.fecha)}</td>
              <td className="py-1 text-right tabular text-ink-900">{formatCurrency(d.monto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReporteAcumulado() {
  const { sucursalId } = useAuth();
  const [desde, setDesde] = useState("2026-01");
  const [hasta, setHasta] = useState("2026-03");
  const [abierta, setAbierta] = useState<string | null>(null);

  const periodos = useMemo(() => listaPeriodos(desde, hasta), [desde, hasta]);
  const fin = useMemo(() => {
    const [y, m] = hasta.split("-").map(Number);
    return new Date(y, m, 0).toISOString().slice(0, 10);
  }, [hasta]);
  const inicioRango = `${desde}-01`;

  const { data: reportes, isLoading } = useQuery({
    queryKey: ["reporte_acumulado", sucursalId, desde, hasta],
    enabled: !!sucursalId,
    queryFn: () => Promise.all(periodos.map((p) => fetchReporteMensual(sucursalId!, p))),
  });

  const acumulado = reportes ? sumarPeriodos(reportes) : null;

  function formatoCelda(fila: Fila, valor: number | null) {
    if (valor === null) return "PENDIENTE";
    return fila.tipo === "pct" ? formatPercent(valor) : formatCurrency(valor);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Mes a mes y acumulado</h1>
          <p className="text-sm text-ink-500">Doble clic en una línea para ver el desglose día a día.</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Comparativo por periodo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || !reportes || !acumulado ? (
            <p className="px-5 py-4 text-sm text-ink-500">Calculando…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-2.5">Concepto</th>
                    {reportes.map((r) => (
                      <th key={r.periodo} className="px-4 py-2.5 text-right capitalize">
                        {nombreMesCorto(r.periodo)}
                      </th>
                    ))}
                    <th className="px-4 py-2.5 text-right text-ink-900">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {FILAS.map((fila) => {
                    const expandible = !!fila.metrica;
                    const abiertaAqui = abierta === fila.key;
                    return (
                      <Fragment key={fila.key}>
                        <tr
                          onDoubleClick={() => expandible && setAbierta(abiertaAqui ? null : fila.key)}
                          className={`border-t border-ink-100 ${expandible ? "cursor-pointer select-none hover:bg-ink-50" : ""} ${
                            fila.resaltado ? "font-semibold text-ink-900" : "text-ink-700"
                          }`}
                          title={expandible ? "Doble clic para ver el desglose diario" : undefined}
                        >
                          <td className="px-5 py-2">
                            <span className="inline-flex items-center gap-1.5">
                              {expandible &&
                                (abiertaAqui ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-ink-400" />
                                ))}
                              {fila.label}
                            </span>
                          </td>
                          {reportes.map((r) => (
                            <td key={r.periodo} className="px-4 py-2 text-right tabular">
                              {formatoCelda(fila, fila.get(r))}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-right tabular font-semibold text-ink-900">{formatoCelda(fila, fila.get(acumulado))}</td>
                        </tr>
                        {abiertaAqui && fila.metrica && (
                          <tr key={`${fila.key}-detalle`}>
                            <td colSpan={reportes.length + 2} className="p-0">
                              <FilaDrilldown sucursalId={sucursalId!} metrica={fila.metrica} inicio={inicioRango} fin={fin} />
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
