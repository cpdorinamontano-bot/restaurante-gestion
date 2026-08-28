import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/utils";
import { Banknote, ShoppingCart, Receipt, Landmark, PackageSearch, FileUp, AlertCircle } from "lucide-react";

const ACCIONES = [
  { to: "/administracion/ventas", label: "Registrar venta", icon: Banknote },
  { to: "/administracion/compras", label: "Registrar compra", icon: ShoppingCart },
  { to: "/administracion/gastos", label: "Registrar gasto", icon: Receipt },
  { to: "/administracion/caja", label: "Movimiento de caja", icon: Landmark },
  { to: "/administracion/inventario", label: "Registrar inventario", icon: PackageSearch },
  { to: "/administracion/documentos", label: "Subir documento", icon: FileUp },
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
        <h1 className="font-display text-2xl font-semibold text-ink-900">Hoy</h1>
        <p className="text-sm text-ink-500 capitalize">{new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
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
              className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-ink-200 bg-white p-6 text-center shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-elevated"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition group-hover:bg-brand-100">
                <a.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
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
                <li key={a.id} className="flex items-start gap-2 text-sm text-ink-700">
                  <AlertCircle
                    className={`mt-0.5 h-4 w-4 shrink-0 ${a.severidad === "critical" ? "text-semaforo-rojo" : "text-semaforo-amarillo"}`}
                  />
                  {a.mensaje}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
