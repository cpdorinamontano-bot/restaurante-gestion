import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, estatusConciliacionTone } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function DashboardFinanzas() {
  const { sucursalId } = useAuth();

  const { data } = useQuery({
    queryKey: ["finanzas_resumen", sucursalId],
    enabled: !!sucursalId,
    queryFn: async () => {
      const [ventasPendCount, ventasPend, cxpVencida, alertas, cierreMensual] = await Promise.all([
        supabase
          .from("v_ventas_conciliacion")
          .select("*", { count: "exact", head: true })
          .neq("estatus_calculado", "CUADRADO")
          .not("origen", "like", "importado_%"),
        supabase
          .from("v_ventas_conciliacion")
          .select("*")
          .neq("estatus_calculado", "CUADRADO")
          .not("origen", "like", "importado_%")
          .order("fecha", { ascending: false })
          .limit(10),
        supabase.from("v_cxp_antiguedad").select("*").order("dias_vencidos", { ascending: false }).limit(10),
        supabase.from("alertas").select("*").eq("estatus", "abierta").order("created_at", { ascending: false }).limit(10),
        supabase
          .from("cierres_mensuales")
          .select("*")
          .eq("sucursal_id", sucursalId!)
          .order("periodo", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        ventasPendientesTotal: ventasPendCount.count ?? 0,
        ventasPendientes: ventasPend.data ?? [],
        cxp: cxpVencida.data ?? [],
        alertas: alertas.data ?? [],
        cierreMensual: cierreMensual.data,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Panel de Finanzas</h1>
          <p className="text-sm text-ink-500">Validación, conciliación y trazabilidad</p>
        </div>
        <Link to="/finanzas/cierre-mensual" className="text-sm font-medium text-brand-700 hover:underline">
          Ir a cierre mensual →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Cierre del mes actual"
          value={data?.cierreMensual?.estatus ?? "SIN INICIAR"}
        />
        <StatCard label="Ventas por conciliar" value={String(data?.ventasPendientesTotal ?? 0)} tone={data?.ventasPendientesTotal ? "negativo" : "positivo"} />
        <StatCard label="Alertas abiertas" value={String(data?.alertas.length ?? 0)} tone={data?.alertas.length ? "negativo" : "positivo"} />
        <StatCard label="CxP con antigüedad" value={String(data?.cxp.filter((c: any) => c.rango_antiguedad !== "PAGADO").length ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventas pendientes de conciliar</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.ventasPendientes.length ? (
            <p className="text-sm text-ink-500">No hay diferencias pendientes.</p>
          ) : (
            <>
            {data.ventasPendientesTotal > data.ventasPendientes.length && (
              <p className="mb-2 text-xs text-ink-500">
                Mostrando las {data.ventasPendientes.length} más recientes de {data.ventasPendientesTotal} en total.
              </p>
            )}
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-ink-500">
                <tr>
                  <th className="pb-2">Fecha</th>
                  <th className="pb-2">Venta neta</th>
                  <th className="pb-2">Formas de pago</th>
                  <th className="pb-2">Diferencia</th>
                  <th className="pb-2">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {data.ventasPendientes.map((v: any) => (
                  <tr key={v.venta_id} className="border-t border-ink-100">
                    <td className="py-2">{formatDate(v.fecha)}</td>
                    <td className="py-2">{formatCurrency(v.venta_neta)}</td>
                    <td className="py-2">{formatCurrency(v.total_formas_pago)}</td>
                    <td className="py-2">{formatCurrency(v.diferencia)}</td>
                    <td className="py-2">
                      <Badge tone={estatusConciliacionTone(v.estatus_calculado)}>{v.estatus_calculado}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas por pagar — antigüedad de saldos</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.cxp.length ? (
            <p className="text-sm text-ink-500">Sin cuentas por pagar registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-ink-500">
                <tr>
                  <th className="pb-2">Proveedor</th>
                  <th className="pb-2">Vencimiento</th>
                  <th className="pb-2">Saldo</th>
                  <th className="pb-2">Días vencido</th>
                  <th className="pb-2">Rango</th>
                </tr>
              </thead>
              <tbody>
                {data.cxp.map((c: any) => (
                  <tr key={c.cuenta_por_pagar_id} className="border-t border-ink-100">
                    <td className="py-2">{c.proveedor_nombre}</td>
                    <td className="py-2">{formatDate(c.fecha_vencimiento)}</td>
                    <td className="py-2">{formatCurrency(c.saldo)}</td>
                    <td className="py-2">{c.dias_vencidos}</td>
                    <td className="py-2">
                      <Badge tone={estatusConciliacionTone(c.estatus_cxp)}>{c.rango_antiguedad}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alertas abiertas</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.alertas.length ? (
            <p className="text-sm text-ink-500">Sin alertas pendientes.</p>
          ) : (
            <ul className="space-y-2">
              {data.alertas.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span>{a.mensaje}</span>
                  <Badge tone={a.severidad === "critical" ? "rojo" : "amarillo"}>{a.severidad}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
