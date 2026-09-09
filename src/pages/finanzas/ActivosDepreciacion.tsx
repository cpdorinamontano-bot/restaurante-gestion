import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  crearActivoFijo,
  darDeBajaActivoFijo,
  depreciacionEnPeriodo,
  depreciacionMensual,
  fechaFinDepreciacion,
  fetchActivosFijos,
} from "@/lib/activosFijos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";

const TIPOS = ["Equipo", "Mobiliario", "Mejora / remodelación", "Otro"];

function periodoActualISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

const vacio = { nombre: "", tipo: "Equipo", fechaInicio: "", costo: "", vidaUtilMeses: "36", valorResidual: "0" };

export default function ActivosDepreciacion() {
  const { sucursalId, session } = useAuth();
  const qc = useQueryClient();
  const [periodo] = useState(periodoActualISO());
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: activos, isLoading } = useQuery({
    queryKey: ["activos_fijos", sucursalId],
    enabled: !!sucursalId,
    queryFn: () => fetchActivosFijos(sucursalId!),
  });

  const resumen = useMemo(() => {
    if (!activos) return null;
    const depreciacionMensualTotal = activos.reduce((s, a) => s + depreciacionEnPeriodo(a, periodo), 0);
    const valorLibrosTotal = activos.reduce((s, a) => s + a.costo, 0);
    return { depreciacionMensualTotal, valorLibrosTotal, cantidad: activos.length };
  }, [activos, periodo]);

  async function agregar() {
    if (!sucursalId || !form.nombre || !form.fechaInicio || !form.costo || !form.vidaUtilMeses) return;
    setGuardando(true);
    setError(null);
    try {
      await crearActivoFijo({
        sucursalId,
        nombre: form.nombre,
        tipo: form.tipo,
        fechaInicio: form.fechaInicio,
        costo: Number(form.costo),
        vidaUtilMeses: Number(form.vidaUtilMeses),
        valorResidual: Number(form.valorResidual || 0),
        userId: session?.user.id,
      });
      setForm(vacio);
      qc.invalidateQueries({ queryKey: ["activos_fijos", sucursalId] });
    } catch (e: any) {
      setError(e.message ?? "No se pudo guardar el activo.");
    } finally {
      setGuardando(false);
    }
  }

  async function darDeBaja(id: string) {
    await darDeBajaActivoFijo(id);
    qc.invalidateQueries({ queryKey: ["activos_fijos", sucursalId] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Activos y depreciación</h1>
        <p className="text-sm text-ink-500">Equipo, mobiliario y mejoras, con depreciación mensual en línea recta desde su fecha de inicio.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Activos registrados" value={String(resumen?.cantidad ?? 0)} />
        <StatCard label="Costo total registrado" value={formatCurrency(resumen?.valorLibrosTotal ?? 0)} />
        <StatCard label="Depreciación del mes actual" value={formatCurrency(resumen?.depreciacionMensualTotal ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar activo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <input
              placeholder="Nombre / descripción"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm lg:col-span-2"
            />
            <select
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              type="date"
              value={form.fechaInicio}
              onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Costo"
              value={form.costo}
              onChange={(e) => setForm((f) => ({ ...f, costo: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
            <input
              type="number"
              placeholder="Vida útil (meses)"
              value={form.vidaUtilMeses}
              onChange={(e) => setForm((f) => ({ ...f, vidaUtilMeses: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Valor residual"
              value={form.valorResidual}
              onChange={(e) => setForm((f) => ({ ...f, valorResidual: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
          </div>
          {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
          <div className="mt-3">
            <Button size="sm" onClick={agregar} disabled={guardando}>
              {guardando ? "Guardando…" : "Agregar activo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activos registrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || !activos ? (
            <p className="px-5 py-4 text-sm text-ink-500">Cargando…</p>
          ) : !activos.length ? (
            <p className="px-5 py-4 text-sm text-ink-500">Sin activos registrados todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-2.5">Activo</th>
                    <th className="px-4 py-2.5">Tipo</th>
                    <th className="px-4 py-2.5">Inicio</th>
                    <th className="px-4 py-2.5 text-right">Costo</th>
                    <th className="px-4 py-2.5 text-right">Depreciación mensual</th>
                    <th className="px-4 py-2.5">Se deprecia hasta</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {activos.map((a) => (
                    <tr key={a.id} className="border-t border-ink-100">
                      <td className="px-5 py-2.5 text-ink-900">{a.nombre}</td>
                      <td className="px-4 py-2.5 text-ink-600">{a.tipo}</td>
                      <td className="px-4 py-2.5 text-ink-600">{formatDate(a.fechaInicio)}</td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-700">{formatCurrency(a.costo)}</td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-900">{formatCurrency(depreciacionMensual(a))}</td>
                      <td className="px-4 py-2.5 text-ink-600">{formatDate(fechaFinDepreciacion(a).toISOString().slice(0, 10))}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => darDeBaja(a.id)} className="text-ink-400 hover:text-rose-700" title="Dar de baja">
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
