import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { fetchReporteMensual } from "@/lib/reportes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function nombreMes(periodoISO: string) {
  const [y, m] = periodoISO.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function nombreMesCorto(periodoISO: string) {
  const [y, m] = periodoISO.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "short" });
}

function ultimosPeriodos(mesActual: string, n: number) {
  const [y, m] = mesActual.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(y, m - 1 - (n - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
}

export default function DashboardDireccion() {
  const { sucursalId } = useAuth();
  const [mes, setMes] = useState("2026-08");
  const periodo = `${mes}-01`;
  const periodos = useMemo(() => ultimosPeriodos(mes, 6), [mes]);

  const { data: actual, isLoading } = useQuery({
    queryKey: ["reporte_mensual", sucursalId, periodo],
    enabled: !!sucursalId,
    queryFn: () => fetchReporteMensual(sucursalId!, periodo),
  });

  const { data: tendencia } = useQuery({
    queryKey: ["reporte_tendencia", sucursalId, periodos],
    enabled: !!sucursalId,
    queryFn: async () => {
      const datos = await Promise.all(periodos.map((p) => fetchReporteMensual(sucursalId!, p)));
      return datos.map((d) => ({
        mes: nombreMesCorto(d.periodo),
        ventasNetas: d.ventasNeta,
        resultadoOperativoPct: d.resultadoOperativoPct ?? 0,
      }));
    },
  });

  const { data: estado } = useQuery({
    queryKey: ["liquidez_estado", sucursalId, periodo],
    enabled: !!sucursalId,
    queryFn: async () => {
      const fin = new Date(new Date(periodo).getFullYear(), new Date(periodo).getMonth() + 1, 0).toISOString().slice(0, 10);
      const [cxp, caja] = await Promise.all([
        supabase.from("v_cxp_saldos").select("saldo, estatus_cxp"),
        supabase
          .from("cierres_caja")
          .select("saldo_fisico, fecha")
          .lte("fecha", fin)
          .order("fecha", { ascending: false })
          .limit(1),
      ]);
      const cxpVencida = (cxp.data ?? []).filter((c) => c.estatus_cxp === "VENCIDO").reduce((s, c) => s + Number(c.saldo ?? 0), 0);
      const cajaDisponible = caja.data?.[0]?.saldo_fisico != null ? Number(caja.data[0].saldo_fisico) : null;
      return { cxpVencida, cajaDisponible };
    },
  });

  const sinDatos = !!actual && actual.ventasFuente === "sin_datos";
  const ventasDesdeIngresos = !!actual && actual.ventasFuente === "ingresos_bancos_caja";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 capitalize">Rentabilidad — {nombreMes(mes)}</h1>
          <p className="text-sm text-ink-500">¿Cuánto vendimos, cuánto costó, cuánto ganamos?</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs font-medium text-ink-600">
            Periodo
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
          </label>
          <Link
            to="/direccion/reporte-mensual"
            className="inline-flex items-center gap-1 rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            Reporte completo <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {sinDatos && !isLoading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Este mes no tiene ventas ni movimientos de banco/caja capturados — no hay información para calcular rentabilidad.
        </div>
      )}
      {ventasDesdeIngresos && !isLoading && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          Este mes no tiene detalle capturado en el módulo de Ventas — la venta neta se toma de los ingresos reales de banco y
          caja del periodo.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Ventas netas" value={formatCurrency(actual?.ventasNeta)} />
        <StatCard label="Food Cost real" value={formatPercent(actual?.foodCostPct)} />
        {actual?.foodCostTeoricoPct != null && <StatCard label="Food Cost teórico" value={formatPercent(actual.foodCostTeoricoPct)} />}
        {actual?.foodCostPct != null && actual?.foodCostTeoricoPct != null && (
          <StatCard
            label="Desviación Food Cost"
            value={formatPercent(actual.foodCostPct - actual.foodCostTeoricoPct)}
            tone={actual.foodCostPct - actual.foodCostTeoricoPct > 5 ? "negativo" : "positivo"}
          />
        )}
        <StatCard label="Costo laboral" value={formatCurrency(actual?.costoLaboralTotal)} hint={formatPercent(actual?.costoLaboralPct)} />
        <StatCard label="Margen bruto" value={formatCurrency(actual?.margenBruto)} hint={formatPercent(actual?.margenBrutoPct)} />
        <StatCard label="Gastos fijos + variables" value={formatCurrency((actual?.gastosFijosTotal ?? 0) + (actual?.gastosVariablesTotal ?? 0))} />
        <StatCard
          label="Resultado operativo"
          value={formatCurrency(actual?.resultadoOperativo)}
          hint={formatPercent(actual?.resultadoOperativoPct)}
          tone={actual?.resultadoOperativo != null ? (actual.resultadoOperativo >= 0 ? "positivo" : "negativo") : "neutral"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tendencia — últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {!tendencia ? (
            <p className="text-sm text-ink-500">Calculando tendencia…</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tendencia} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e4dc" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6b6f66" }} axisLine={{ stroke: "#d8d5cb" }} tickLine={false} />
                <YAxis
                  yAxisId="ventas"
                  tick={{ fontSize: 12, fill: "#6b6f66" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  width={56}
                />
                <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 12, fill: "#6b6f66" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={44} />
                <Tooltip
                  formatter={(value: number, name) =>
                    name === "Ventas netas" ? [formatCurrency(value), name] : [formatPercent(value), name]
                  }
                  contentStyle={{ borderRadius: 8, border: "1px solid #e7e4dc", fontSize: 12 }}
                />
                <Line yAxisId="ventas" type="monotone" dataKey="ventasNetas" name="Ventas netas" stroke="#207a4f" strokeWidth={2} dot={{ r: 3 }} />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="resultadoOperativoPct"
                  name="Resultado operativo %"
                  stroke="#b8790c"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink-700">Liquidez</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Disponibilidad bancaria" value={formatCurrency(actual?.saldoBancarioActual)} hint="Saldo actual, no depende del mes elegido" />
          {estado?.cajaDisponible != null && <StatCard label="Caja disponible" value={formatCurrency(estado.cajaDisponible)} />}
          <StatCard label="Cuentas por pagar" value={formatCurrency(actual?.cxpPendiente)} />
          <StatCard label="CxP vencida" value={formatCurrency(estado?.cxpVencida)} tone={estado?.cxpVencida ? "negativo" : "positivo"} />
        </div>
      </div>
    </div>
  );
}
