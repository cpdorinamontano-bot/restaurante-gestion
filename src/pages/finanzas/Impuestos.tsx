import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { actualizarPago, crearImpuesto, eliminarImpuesto, fetchImpuestosAnio } from "@/lib/impuestos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge, estatusConciliacionTone } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { Trash2 } from "lucide-react";

const vacio = { periodo: "", tipoImpuesto: "", importeCausado: "", importePagado: "0", fechaPago: "" };

export default function Impuestos() {
  const { sucursalId, session } = useAuth();
  const qc = useQueryClient();
  const [anio, setAnio] = useState(2026);
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edicionPago, setEdicionPago] = useState<Record<string, { pagado: string; fecha: string }>>({});

  const { data: impuestos, isLoading } = useQuery({
    queryKey: ["impuestos_periodo", sucursalId, anio],
    enabled: !!sucursalId,
    queryFn: () => fetchImpuestosAnio(sucursalId!, anio),
  });

  const resumen = useMemo(() => {
    if (!impuestos) return null;
    return {
      causado: impuestos.reduce((s, i) => s + i.importeCausado, 0),
      pagado: impuestos.reduce((s, i) => s + i.importePagado, 0),
      pendiente: impuestos.reduce((s, i) => s + i.pendiente, 0),
    };
  }, [impuestos]);

  async function agregar() {
    if (!sucursalId || !form.periodo || !form.tipoImpuesto || !form.importeCausado) return;
    setGuardando(true);
    setError(null);
    try {
      await crearImpuesto({
        sucursalId,
        periodo: `${form.periodo}-01`,
        tipoImpuesto: form.tipoImpuesto,
        importeCausado: Number(form.importeCausado),
        importePagado: Number(form.importePagado || 0),
        fechaPago: form.fechaPago || null,
        userId: session?.user.id,
      });
      setForm(vacio);
      qc.invalidateQueries({ queryKey: ["impuestos_periodo", sucursalId, anio] });
    } catch (e: any) {
      setError(e.message ?? "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarPago(id: string, defaults: { pagado: number; fecha: string | null }) {
    const pagado = Number(edicionPago[id]?.pagado ?? defaults.pagado);
    const fecha = edicionPago[id]?.fecha ?? defaults.fecha ?? "";
    await actualizarPago(id, pagado, fecha || null);
    qc.invalidateQueries({ queryKey: ["impuestos_periodo", sucursalId, anio] });
    setEdicionPago((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function eliminar(id: string) {
    await eliminarImpuesto(id);
    qc.invalidateQueries({ queryKey: ["impuestos_periodo", sucursalId, anio] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Impuestos — causado vs. pagado</h1>
          <p className="text-sm text-ink-500">Lo que se debe del periodo (causado) frente a lo que ya se pagó.</p>
        </div>
        <label className="flex flex-col text-xs font-medium text-ink-600">
          Año
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm">
            <option value={2026}>2026</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Causado en el año" value={formatCurrency(resumen?.causado ?? 0)} />
        <StatCard label="Pagado en el año" value={formatCurrency(resumen?.pagado ?? 0)} />
        <StatCard label="Pendiente" value={formatCurrency(resumen?.pendiente ?? 0)} tone={resumen?.pendiente ? "negativo" : "positivo"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar impuesto del periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="month"
              value={form.periodo}
              onChange={(e) => setForm((f) => ({ ...f, periodo: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
            <input
              placeholder="Tipo (IVA, ISR, IMSS…)"
              value={form.tipoImpuesto}
              onChange={(e) => setForm((f) => ({ ...f, tipoImpuesto: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Importe causado"
              value={form.importeCausado}
              onChange={(e) => setForm((f) => ({ ...f, importeCausado: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Importe pagado"
              value={form.importePagado}
              onChange={(e) => setForm((f) => ({ ...f, importePagado: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
            <input
              type="date"
              value={form.fechaPago}
              onChange={(e) => setForm((f) => ({ ...f, fechaPago: e.target.value }))}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
          </div>
          {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
          <div className="mt-3">
            <Button size="sm" onClick={agregar} disabled={guardando}>
              {guardando ? "Guardando…" : "Registrar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Impuestos del año</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || !impuestos ? (
            <p className="px-5 py-4 text-sm text-ink-500">Cargando…</p>
          ) : !impuestos.length ? (
            <p className="px-5 py-4 text-sm text-ink-500">Sin impuestos registrados en {anio}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-2.5">Periodo</th>
                    <th className="px-4 py-2.5">Tipo</th>
                    <th className="px-4 py-2.5 text-right">Causado</th>
                    <th className="px-4 py-2.5 text-right">Pagado</th>
                    <th className="px-4 py-2.5 text-right">Pendiente</th>
                    <th className="px-4 py-2.5">Fecha de pago</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {impuestos.map((i) => (
                    <tr key={i.id} className="border-t border-ink-100">
                      <td className="px-5 py-2.5 capitalize text-ink-700">
                        {new Date(`${i.periodo}T00:00:00`).toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
                      </td>
                      <td className="px-4 py-2.5 text-ink-900">{i.tipoImpuesto}</td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-700">{formatCurrency(i.importeCausado)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={edicionPago[i.id]?.pagado ?? String(i.importePagado)}
                          onChange={(e) => setEdicionPago((prev) => ({ ...prev, [i.id]: { pagado: e.target.value, fecha: prev[i.id]?.fecha ?? (i.fechaPago ?? "") } }))}
                          className="w-24 rounded-lg border border-ink-300 px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular font-medium ${i.pendiente > 0 ? "text-rose-700" : "text-ink-500"}`}>
                        {formatCurrency(i.pendiente)}
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="date"
                          value={edicionPago[i.id]?.fecha ?? (i.fechaPago ?? "")}
                          onChange={(e) => setEdicionPago((prev) => ({ ...prev, [i.id]: { pagado: prev[i.id]?.pagado ?? String(i.importePagado), fecha: e.target.value } }))}
                          className="rounded-lg border border-ink-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={estatusConciliacionTone(i.estado)}>{i.estado}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => guardarPago(i.id, { pagado: i.importePagado, fecha: i.fechaPago })}>
                            Guardar
                          </Button>
                          <button onClick={() => eliminar(i.id)} className="text-ink-400 hover:text-rose-700" title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
