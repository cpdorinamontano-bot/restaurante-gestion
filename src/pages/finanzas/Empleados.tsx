import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useAreas } from "@/hooks/useCatalogos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowUpRight, Trash2 } from "lucide-react";

const vacio = { nombre: "", puesto: "", areaId: "", fechaIngreso: "", sueldoBase: "" };

export default function Empleados() {
  const { sucursalId, session } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: areas } = useAreas(sucursalId);

  const { data: empleados, isLoading } = useQuery({
    queryKey: ["empleados", sucursalId],
    enabled: !!sucursalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleados")
        .select("*, areas(nombre)")
        .eq("sucursal_id", sucursalId!)
        .eq("estatus", "activo")
        .order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function agregar() {
    if (!sucursalId || !form.nombre.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      const { error } = await supabase.from("empleados").insert({
        sucursal_id: sucursalId,
        nombre: form.nombre.trim(),
        puesto: form.puesto.trim() || null,
        area_id: form.areaId || null,
        fecha_ingreso: form.fechaIngreso || null,
        sueldo_base: form.sueldoBase === "" ? 0 : Number(form.sueldoBase),
        created_by: session?.user.id,
        updated_by: session?.user.id,
      });
      if (error) throw error;
      setForm(vacio);
      qc.invalidateQueries({ queryKey: ["empleados", sucursalId] });
    } catch (e: any) {
      setError(e.message ?? "No se pudo guardar el empleado.");
    } finally {
      setGuardando(false);
    }
  }

  async function darDeBaja(id: string) {
    await supabase.from("empleados").update({ estatus: "baja" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["empleados", sucursalId] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Empleados</h1>
          <p className="text-sm text-ink-500">Catálogo de personal. Para capturar el costo de nómina de cada periodo, ve a Nómina.</p>
        </div>
        <Link
          to="/finanzas/nomina"
          className="inline-flex items-center gap-1 rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          Ir a Nómina <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <StatCard label="Empleados activos" value={String(empleados?.length ?? 0)} />

      <Card>
        <CardHeader>
          <CardTitle>Agregar empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              placeholder="Nombre completo"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm lg:col-span-2"
            />
            <input
              placeholder="Puesto"
              value={form.puesto}
              onChange={(e) => setForm((f) => ({ ...f, puesto: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
            <select
              value={form.areaId}
              onChange={(e) => setForm((f) => ({ ...f, areaId: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            >
              <option value="">Área (opcional)</option>
              {(areas ?? []).map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.fechaIngreso}
              onChange={(e) => setForm((f) => ({ ...f, fechaIngreso: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Sueldo base"
              value={form.sueldoBase}
              onChange={(e) => setForm((f) => ({ ...f, sueldoBase: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
          </div>
          {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
          <div className="mt-3">
            <Button size="sm" onClick={agregar} disabled={guardando || !form.nombre.trim()}>
              {guardando ? "Guardando…" : "Agregar empleado"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plantilla</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || !empleados ? (
            <p className="px-5 py-4 text-sm text-ink-500">Cargando…</p>
          ) : !empleados.length ? (
            <p className="px-5 py-4 text-sm text-ink-500">Sin empleados registrados todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-2.5">Nombre</th>
                    <th className="px-4 py-2.5">Puesto</th>
                    <th className="px-4 py-2.5">Área</th>
                    <th className="px-4 py-2.5">Ingreso</th>
                    <th className="px-4 py-2.5 text-right">Sueldo base</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {empleados.map((e: any) => (
                    <tr key={e.id} className="border-t border-ink-100">
                      <td className="px-5 py-2.5 text-ink-900">{e.nombre}</td>
                      <td className="px-4 py-2.5 text-ink-600">{e.puesto ?? "—"}</td>
                      <td className="px-4 py-2.5 text-ink-600">{e.areas?.nombre ?? "—"}</td>
                      <td className="px-4 py-2.5 text-ink-600">{e.fecha_ingreso ? formatDate(e.fecha_ingreso) : "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-900">{formatCurrency(Number(e.sueldo_base))}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => darDeBaja(e.id)} className="text-ink-400 hover:text-rose-700" title="Dar de baja">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
