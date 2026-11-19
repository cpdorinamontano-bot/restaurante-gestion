import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchReporteMensual, mesAnterior, sumarPeriodos, type ReporteMensual as ReporteMensualData } from "@/lib/reportes";
import { fetchEstadoResultadosMes, sumarEstadoResultados, type EstadoResultadosMes } from "@/lib/reporteEstadoResultados";
import { fetchBalanceGeneralResumen } from "@/lib/balanceGeneralResumen";
import { exportReporteMensualExcel, exportReporteMensualPDF, exportReporteCompletoSociosPDF } from "@/lib/reporteExport";
import { calcularPuntoEquilibrio, generarAnalisisGerencial } from "@/lib/analisisGerencial";
import { AnalisisGerencialCard } from "@/components/finanzas/AnalisisGerencialCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { FileDown, FileSpreadsheet, TrendingDown, TrendingUp, Minus, AlertTriangle, Users } from "lucide-react";

function periodoActualISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function nombreMesCorto(periodo: string) {
  return new Date(`${periodo}T00:00:00`).toLocaleDateString("es-MX", { month: "short" });
}

function finDeMes(periodo: string) {
  const [y, m] = periodo.slice(0, 7).split("-").map(Number);
  return new Date(y, m, 0).toISOString().slice(0, 10);
}

interface FilaAcumulado {
  label: string;
  tipo: "monto" | "pct";
  get: (r: ReporteMensualData) => number | null;
  resaltado?: boolean;
}

const FILAS_ACUMULADO: FilaAcumulado[] = [
  { label: "Ventas netas", tipo: "monto", get: (r) => (r.ventasFuente === "sin_datos" ? null : r.ventasNeta), resaltado: true },
  { label: "Compras / costo de mercadería vendida", tipo: "monto", get: (r) => (r.cmvFuente === "sin_datos" ? null : r.cmv) },
  { label: "Food cost %", tipo: "pct", get: (r) => r.foodCostPct },
  { label: "Margen bruto", tipo: "monto", get: (r) => r.margenBruto, resaltado: true },
  { label: "Costo laboral", tipo: "monto", get: (r) => r.costoLaboralTotal },
  { label: "Costo laboral %", tipo: "pct", get: (r) => r.costoLaboralPct },
  { label: "Gastos fijos", tipo: "monto", get: (r) => r.gastosFijosTotal },
  { label: "Gastos variables y operativos", tipo: "monto", get: (r) => r.gastosVariablesTotal },
  { label: "Impuestos y otros conceptos", tipo: "monto", get: (r) => r.impuestosGasto },
  { label: "Resultado operativo", tipo: "monto", get: (r) => r.resultadoOperativo, resaltado: true },
  { label: "Resultado operativo %", tipo: "pct", get: (r) => r.resultadoOperativoPct },
  { label: "Ganancia / pérdida neta", tipo: "monto", get: (r) => r.gananciaNeta, resaltado: true },
  { label: "Ganancia neta %", tipo: "pct", get: (r) => r.gananciaNetaPct },
  { label: "Flujo — ingresos (banco + caja)", tipo: "monto", get: (r) => r.flujoIngresos },
  { label: "Flujo — egresos (banco + caja)", tipo: "monto", get: (r) => r.flujoEgresos },
  { label: "Flujo neto", tipo: "monto", get: (r) => r.flujoNeto, resaltado: true },
];

interface FilaER {
  label: string;
  tipo: "monto" | "pct" | "seccion";
  get?: (m: EstadoResultadosMes) => number | null;
  resaltado?: boolean;
  indent?: boolean;
}

const FILAS_ESTADO_RESULTADOS: FilaER[] = [
  { label: "Ventas", tipo: "monto", get: (m) => m.ventas, resaltado: true },
  { label: "Costo de Ventas", tipo: "seccion" },
  { label: "Compras", tipo: "monto", get: (m) => m.compras, indent: true },
  { label: "Mano de obra", tipo: "monto", get: (m) => m.manoDeObra, indent: true },
  { label: "Total costo de Ventas", tipo: "monto", get: (m) => m.totalCostoVentas, resaltado: true },
  { label: "Gastos Generales", tipo: "seccion" },
  { label: "Propinas", tipo: "monto", get: (m) => m.propinas, indent: true },
  { label: "Comisiones", tipo: "monto", get: (m) => m.comisiones, indent: true },
  { label: "Gastos fijos", tipo: "monto", get: (m) => m.gastosFijos, indent: true },
  { label: "Mantenimiento", tipo: "monto", get: (m) => m.mantenimiento, indent: true },
  { label: "Impuestos", tipo: "monto", get: (m) => m.impuestos, indent: true },
  { label: "Otros gastos generales", tipo: "monto", get: (m) => m.otrosGastosGenerales, indent: true },
  { label: "Total gastos generales", tipo: "monto", get: (m) => m.totalGastosGenerales, resaltado: true },
  { label: "Utilidad financiera", tipo: "monto", get: (m) => m.utilidadFinanciera, resaltado: true },
  { label: "Dividendos y retiros", tipo: "seccion" },
  { label: "Retiros socios", tipo: "monto", get: (m) => m.retirosSocios, indent: true },
  { label: "Gastos personales socios", tipo: "monto", get: (m) => m.gastosPersonalesSocios, indent: true },
  { label: "Nómina socios", tipo: "monto", get: (m) => m.nominaSocios, indent: true },
  { label: "Total dividendos y retiros", tipo: "monto", get: (m) => m.totalRetSocios, resaltado: true },
  { label: "Total egresos", tipo: "monto", get: (m) => m.totalEgresos, resaltado: true },
  { label: "Utilidad neta", tipo: "monto", get: (m) => m.utilidadNeta, resaltado: true },
];

function valorER(fila: FilaER, mes: EstadoResultadosMes): number | null {
  if (!fila.get || !mes.tieneDatos) return null;
  return fila.get(mes);
}

function Tendencia({ actual, anterior, invertido = false }: { actual: number | null; anterior: number | null; invertido?: boolean }) {
  if (actual === null || anterior === null || anterior === 0) {
    return <span className="inline-flex items-center gap-1 text-xs text-ink-400">— sin comparativo</span>;
  }
  const delta = actual - anterior;
  const mejora = invertido ? delta < 0 : delta > 0;
  if (Math.abs(delta) < 0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-ink-500">
        <Minus className="h-3.5 w-3.5" /> sin cambio
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${mejora ? "text-emerald-700" : "text-rose-700"}`}>
      {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {delta > 0 ? "+" : ""}
      {delta.toFixed(1)} pts vs. mes anterior
    </span>
  );
}

function ComparativoCard({
  label,
  actual,
  anterior,
  formato,
  invertido = false,
}: {
  label: string;
  actual: number | null;
  anterior: number | null;
  formato: (v: number | null) => string;
  invertido?: boolean;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink-900">{formato(actual)}</p>
      <p className="mt-1 text-xs text-ink-400">Mes anterior: {formato(anterior)}</p>
      <div className="mt-2">
        <Tendencia actual={actual} anterior={anterior} invertido={invertido} />
      </div>
    </Card>
  );
}

function Renglon({ label, monto, pct, negativo = false, resaltado = false }: { label: string; monto: number | null; pct?: number | null; negativo?: boolean; resaltado?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 text-sm ${resaltado ? "border-t border-ink-200 pt-2 font-semibold text-ink-900" : "text-ink-700"}`}>
      <span>{label}</span>
      <span className="flex items-center gap-3 tabular">
        <span className={negativo ? "text-rose-700" : ""}>{monto === null ? "PENDIENTE" : formatCurrency(negativo ? -Math.abs(monto) : monto)}</span>
        {pct !== undefined && <span className="w-16 text-right text-ink-400">{pct === null ? "" : formatPercent(pct)}</span>}
      </span>
    </div>
  );
}

function Desglose({ items, total }: { items: { nombre: string; monto: number }[]; total: number }) {
  if (!items.length) return <p className="text-sm text-ink-500">Sin registros en este periodo.</p>;
  return (
    <div className="space-y-1">
      {items.map((it) => (
        <div key={it.nombre} className="flex items-center justify-between text-sm">
          <span className="text-ink-600">{it.nombre}</span>
          <span className="tabular text-ink-900">{formatCurrency(it.monto)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-ink-100 pt-1 text-sm font-semibold text-ink-900">
        <span>Total</span>
        <span className="tabular">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

export default function ReporteMensual() {
  const { sucursalId } = useAuth();
  const [periodo, setPeriodo] = useState(periodoActualISO());
  const [generandoCompleto, setGenerandoCompleto] = useState(false);
  const periodoAnteriorISO = mesAnterior(periodo);

  const { data: actual, isLoading } = useQuery({
    queryKey: ["reporte_mensual", sucursalId, periodo],
    enabled: !!sucursalId,
    queryFn: () => fetchReporteMensual(sucursalId!, periodo),
  });

  const { data: anterior } = useQuery({
    queryKey: ["reporte_mensual", sucursalId, periodoAnteriorISO],
    enabled: !!sucursalId,
    queryFn: () => fetchReporteMensual(sucursalId!, periodoAnteriorISO),
  });

  const mesLabel = new Date(`${periodo}T00:00:00`).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const equilibrio = actual ? calcularPuntoEquilibrio(actual) : null;
  const analisis = actual ? generarAnalisisGerencial(actual, anterior ?? null, equilibrio) : null;

  async function descargarPDFCompletoSocios() {
    if (!sucursalId || !actual) return;
    setGenerandoCompleto(true);
    try {
      const anio = periodo.slice(0, 4);
      const mesHasta = Number(periodo.slice(5, 7));
      const periodosAnio = Array.from({ length: mesHasta }, (_, i) => `${anio}-${String(i + 1).padStart(2, "0")}-01`);

      const [reportesAnio, mesesER, balance] = await Promise.all([
        Promise.all(periodosAnio.map((p) => fetchReporteMensual(sucursalId, p))),
        Promise.all(periodosAnio.map((p) => fetchEstadoResultadosMes(sucursalId, p))),
        fetchBalanceGeneralResumen(sucursalId, finDeMes(periodo)),
      ]);

      const acumuladoAnio = sumarPeriodos(reportesAnio);
      const equilibrioAnio = calcularPuntoEquilibrio(acumuladoAnio);
      const analisisAcumulado = generarAnalisisGerencial(acumuladoAnio, null, equilibrioAnio);
      const totalER = sumarEstadoResultados(mesesER);

      exportReporteCompletoSociosPDF({
        sucursalNombre: "Bianco Storico",
        periodoLabel: mesLabel,
        reporteMensual: actual,
        analisisMensual: analisis,
        acumulado: {
          subtitulo: `${nombreMesCorto(reportesAnio[0].periodo)} a ${nombreMesCorto(reportesAnio[reportesAnio.length - 1].periodo)} ${anio}`,
          columnas: [...reportesAnio.map((r) => nombreMesCorto(r.periodo)), "Acumulado"],
          filas: FILAS_ACUMULADO.map((fila) => ({
            label: fila.label,
            tipo: fila.tipo,
            resaltado: fila.resaltado,
            valores: [...reportesAnio.map((r) => fila.get(r)), fila.get(acumuladoAnio)],
          })),
          analisis: analisisAcumulado,
        },
        estadoResultados: {
          subtitulo: `${nombreMesCorto(mesesER[0].periodo)} a ${nombreMesCorto(mesesER[mesesER.length - 1].periodo)} ${anio}`,
          columnas: [...mesesER.map((m) => nombreMesCorto(m.periodo)), "Total"],
          filas: FILAS_ESTADO_RESULTADOS.map((fila) =>
            fila.tipo === "seccion"
              ? { label: fila.label, tipo: "seccion" as const }
              : {
                  label: fila.label,
                  tipo: fila.tipo,
                  indent: fila.indent,
                  resaltado: fila.resaltado,
                  valores: [...mesesER.map((m) => valorER(fila, m)), valorER(fila, totalER)],
                }
          ),
        },
        balance,
        nombreArchivo: `reporte-completo-socios-${periodo.slice(0, 7)}.pdf`,
      });
    } finally {
      setGenerandoCompleto(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Reporte Gerencial Mensual</h1>
          <p className="text-sm text-ink-500 capitalize">{mesLabel} — visión de gestión y rentabilidad</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs font-medium text-ink-600">
            Mes
            <input
              type="month"
              value={periodo.slice(0, 7)}
              onChange={(e) => setPeriodo(`${e.target.value}-01`)}
              className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
          </label>
          {actual && (
            <>
              <Button variant="secondary" size="sm" onClick={() => exportReporteMensualPDF(actual, "Bianco Storico", analisis)}>
                <FileDown className="h-4 w-4" /> PDF
              </Button>
              <Button variant="secondary" size="sm" onClick={() => exportReporteMensualExcel(actual, "Bianco Storico", analisis)}>
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </Button>
              <Button size="sm" onClick={descargarPDFCompletoSocios} disabled={generandoCompleto}>
                <Users className="h-4 w-4" /> {generandoCompleto ? "Generando…" : "PDF completo para socios"}
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading || !actual ? (
        <p className="text-sm text-ink-500">Calculando reporte…</p>
      ) : (
        <>
          {actual.ventasFuente === "sin_datos" && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>No hay ventas ni ingresos capturados para este periodo. Los porcentajes sobre ventas se muestran como PENDIENTE hasta que se registre algo en Administración.</span>
            </div>
          )}
          {actual.ventasFuente === "ingresos_bancos_caja" && (
            <div className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Este periodo no tiene detalle capturado en el módulo de Ventas, así que la venta neta se toma de los ingresos
                reales de banco y caja (lo que efectivamente entró). No hay desglose de descuentos, devoluciones o
                cancelaciones porque esa POS no se ha conectado todavía — en cuanto se capture venta a venta, este reporte usa
                automáticamente ese detalle en su lugar.
              </span>
            </div>
          )}

          {analisis && <AnalisisGerencialCard analisis={analisis} />}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <ComparativoCard label="Ventas netas" actual={actual.ventasNeta} anterior={anterior?.ventasNeta ?? null} formato={formatCurrency} />
            <ComparativoCard label="Food cost %" actual={actual.foodCostPct} anterior={anterior?.foodCostPct ?? null} formato={(v) => formatPercent(v)} invertido />
            <ComparativoCard label="Costo laboral %" actual={actual.costoLaboralPct} anterior={anterior?.costoLaboralPct ?? null} formato={(v) => formatPercent(v)} invertido />
            <ComparativoCard label="Gastos operativos %" actual={actual.gastosOperativosPct} anterior={anterior?.gastosOperativosPct ?? null} formato={(v) => formatPercent(v)} invertido />
            <ComparativoCard label="Margen operativo %" actual={actual.resultadoOperativoPct} anterior={anterior?.resultadoOperativoPct ?? null} formato={(v) => formatPercent(v)} />
            <ComparativoCard label="Ganancia neta %" actual={actual.gananciaNetaPct} anterior={anterior?.gananciaNetaPct ?? null} formato={(v) => formatPercent(v)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Estado de resultados del periodo</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-ink-50">
              <Renglon
                label={`Ventas totales (brutas)${actual.ventasFuente === "ingresos_bancos_caja" ? " (= ingresos de banco y caja)" : ""}`}
                monto={actual.ventasFuente === "sin_datos" ? null : actual.ventasBruta}
              />
              <Renglon label="(–) Descuentos" monto={actual.descuentos} negativo />
              <Renglon label="(–) Devoluciones" monto={actual.devoluciones} negativo />
              <Renglon label="(–) Cancelaciones" monto={actual.cancelaciones} negativo />
              <Renglon label="Ventas netas" monto={actual.ventasFuente === "sin_datos" ? null : actual.ventasNeta} resaltado />
              <Renglon
                label={`(–) Compras y costo de mercadería vendida${actual.cmvFuente === "gastos_historico" ? " (estimado desde gastos)" : ""}`}
                monto={actual.cmvFuente === "sin_datos" ? null : actual.cmv}
                pct={actual.foodCostPct}
                negativo
              />
              <Renglon label="Margen bruto" monto={actual.margenBruto} pct={actual.margenBrutoPct} resaltado />
              <Renglon label="(–) Costo laboral (sueldos y cargas)" monto={actual.costoLaboralTotal} pct={actual.costoLaboralPct} negativo />
              <Renglon label="(–) Gastos fijos" monto={actual.gastosFijosTotal} negativo />
              <Renglon label="(–) Gastos variables y operativos" monto={actual.gastosVariablesTotal} negativo />
              <Renglon label="Resultado operativo" monto={actual.resultadoOperativo} pct={actual.resultadoOperativoPct} resaltado />
              <Renglon label="(–) Impuestos y otros conceptos" monto={actual.impuestosGasto} negativo />
              <Renglon label="Ganancia / pérdida neta" monto={actual.gananciaNeta} pct={actual.gananciaNetaPct} resaltado />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Punto de equilibrio</CardTitle>
            </CardHeader>
            <CardContent>
              {!equilibrio ? (
                <p className="py-2 text-sm text-ink-400">PENDIENTE — falta ventas o costo de ventas capturado este periodo para calcularlo.</p>
              ) : !equilibrio.alcanzable ? (
                <p className="text-sm text-rose-700">
                  Con la estructura de costos actual, el costo variable consume el {formatPercent(equilibrio.margenContribucionPct * 100)} de
                  cada venta o más — ningún nivel de ventas cubre los costos fijos ({formatCurrency(equilibrio.costosFijos)}) sin antes bajar el
                  costo variable.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                      <p className="text-sm font-medium text-ink-500">Ventas necesarias para no perder</p>
                      <p className="mt-1 font-display text-3xl font-semibold tabular text-ink-900">{formatCurrency(equilibrio.ventasEquilibrio)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Ventas reales del mes</p>
                      <p className="mt-1 text-xl font-semibold tabular text-ink-900">{formatCurrency(actual!.ventasNeta)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                        {equilibrio.diferencia >= 0 ? "Ventas por arriba del equilibrio" : "Faltan ventas para el equilibrio"}
                      </p>
                      <p className={`mt-1 text-xl font-semibold tabular ${equilibrio.diferencia >= 0 ? "text-brand-700" : "text-rose-700"}`}>
                        {formatCurrency(Math.abs(equilibrio.diferencia))}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-ink-600">
                    {equilibrio.diferencia >= 0
                      ? `Ya se superó el punto de equilibrio: se vendió ${formatPercent(equilibrio.avancePct)} de lo necesario para cubrir costos fijos y variables del mes.`
                      : `Se alcanzó ${formatPercent(equilibrio.avancePct)} de las ventas necesarias para cubrir costos fijos y variables del mes.`}
                  </p>
                  <p className="mt-2 text-xs text-ink-500">
                    Margen de contribución: {formatPercent(equilibrio.margenContribucionPct * 100)} · Costos fijos del mes (nómina + gastos
                    fijos): {formatCurrency(equilibrio.costosFijos)}. Trata costo de ventas y gastos variables como costo variable.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Compras / CMV por categoría</CardTitle>
              </CardHeader>
              <CardContent>
                {actual.cmvFuente === "gastos_historico" && (
                  <p className="mb-2 text-xs text-ink-500">
                    Sin detalle por categoría: este monto proviene de gastos clasificados como "Compras" en el histórico, no del módulo de Compras/Inventario.
                  </p>
                )}
                <Desglose items={actual.cmvPorCategoria} total={actual.cmv} />
                {actual.foodCostTeoricoPct !== null && (
                  <p className="mt-3 text-xs text-ink-500">Food cost teórico (según recetas): {formatPercent(actual.foodCostTeoricoPct)}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Costo laboral</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">Nómina (módulo de nómina)</span>
                  <span className="tabular text-ink-900">{formatCurrency(actual.costoLaboralNomina)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">Nómina registrada como gasto (histórico)</span>
                  <span className="tabular text-ink-900">{formatCurrency(actual.costoLaboralGastoHistorico)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-ink-100 pt-1 text-sm font-semibold text-ink-900">
                  <span>Total</span>
                  <span className="tabular">{formatCurrency(actual.costoLaboralTotal)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gastos fijos por concepto</CardTitle>
              </CardHeader>
              <CardContent>
                <Desglose items={actual.gastosFijos} total={actual.gastosFijosTotal} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gastos variables y operativos</CardTitle>
              </CardHeader>
              <CardContent>
                <Desglose items={actual.gastosVariables} total={actual.gastosVariablesTotal} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Flujo de efectivo del periodo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">Ingresos (bancos + caja)</span>
                  <span className="tabular text-emerald-700">{formatCurrency(actual.flujoIngresos)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">Egresos (bancos + caja)</span>
                  <span className="tabular text-rose-700">{formatCurrency(actual.flujoEgresos)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-ink-100 pt-1 text-sm font-semibold text-ink-900">
                  <span>Flujo neto del periodo</span>
                  <span className="tabular">{formatCurrency(actual.flujoNeto)}</span>
                </div>
                <p className="pt-2 text-xs text-ink-500">
                  Saldo bancario actual (a hoy, no del cierre del periodo): {formatCurrency(actual.saldoBancarioActual)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pendientes al cierre</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">Cuentas por pagar a proveedores</span>
                  <span className="tabular text-ink-900">{formatCurrency(actual.cxpPendiente)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">Obligaciones e impuestos pendientes</span>
                  <span className="tabular text-ink-900">{formatCurrency(actual.obligacionesPendientes)}</span>
                </div>
                <p className="pt-2 text-xs text-ink-500">Saldos a la fecha de consulta; no son un corte histórico exacto al último día del periodo.</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
