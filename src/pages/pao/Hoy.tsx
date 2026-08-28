import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/utils";

const ACCIONES = [
  { to: "/pao/ventas", label: "Registrar venta", icon: "💵" },
  { to: "/pao/compras", label: "Registrar compra", icon: "🛒" },
  { to: "/pao/gastos", label: "Registrar gasto", icon: "🧾" },
  { to: "/pao/caja", label: "Movimiento de caja", icon: "🏦" },
  { to: "/pao/inventario", label: "Registrar inventario", icon: "📦" },
  { to: "/pao/documentos", label: "Subir documento", icon: "📎" },
];

export default function Hoy() {
  const { sucursalId } = useAuth();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data } = useQuery({
    queryKey: ["hoy", sucursalId, hoy],
    enabled: !!sucursalId,
    queryFn: async () => {
      const [ventas, compras, gastos, alertas, cierre] = await Promise.all([
        supabase.from("ventas").select("venta_neta").eq("sucursal_id", sucursalId!).eq("fecha", hoy),
        supabase.from("compras").select("total").eq("sucursal_id", sucursalId!).eq("fecha", hoy),
        supabase.from("gastos").select("total").eq("sucursal_id", sucursalId!).eq("fecha", hoy),
        supabase.from("alertas").select("id, mensaje, severidad").eq("estatus", "abierta").order("created_at", { ascending: false }).limit(5),
        supabase.from("cierres_diarios").select("*").eq("sucursal_id", sucursalId!).eq("fecha", hoy).maybeSingle(),
      ]);
      return {
        ventasHoy: (ventas.data ?? []).reduce((s, v) => s + Number(v.venta_neta ?? 0), 0),
        comprasHoy: (compras.data ?? []).reduce((s, c) => s + Number(c.total ?? 0), 0),
        gastosHoy: (gastos.data ?? []).reduce((s, g) => s + Number(g.total ?? 0), 0),
        alertas: alertas.data ?? [],
        cierre: cierre.data,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Hoy</h1>
        <p className="text-sm text-ink-500">{new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Ventas de hoy" value={formatCurrency(data?.ventasHoy)} />
        <StatCard label="Compras de hoy" value={formatCurrency(data?.comprasHoy)} />
        <StatCard label="Gastos de hoy" value={formatCurrency(data?.gastosHoy)} />
        <StatCard
          label="Cierre del día"
          value={data?.cierre?.estatus ?? "ABIERTO"}
          hint={data?.cierre ? undefined : "Aún no se ha iniciado"}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink-700">Captura rápida</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {ACCIONES.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white p-6 text-center shadow-sm transition hover:border-brand-300 hover:shadow"
            >
              <span className="text-3xl">{a.icon}</span>
              <span className="text-sm font-medium text-ink-800">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

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
                <li key={a.id} className="text-sm text-ink-700">
                  <span className="font-medium">{a.severidad === "critical" ? "🔴" : "🟡"}</span> {a.mensaje}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
