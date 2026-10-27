import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLineasNegocio } from "@/hooks/useCatalogos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";

const SIN_CLASIFICAR = "sin_clasificar";

export default function VentasPorLinea() {
  const { sucursalId, session } = useAuth();
  const qc = useQueryClient();
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [nuevaLinea, setNuevaLinea] = useState("");
  const [guardandoLinea, setGuardandoLinea] = useState(false);

  const { data: lineas } = useLineasNegocio(sucursalId);

  const inicio = `${mes}-01`;
  const fin = new Date(new Date(inicio).getFullYear(), new Date(inicio).getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: ventas, isLoading } = useQuery({
    queryKey: ["ventas_por_linea", sucursalId, mes],
    enabled: !!sucursalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ventas")
        .select("id, fecha, turno, venta_neta, folio_pos, linea_negocio_id")
        .eq("sucursal_id", sucursalId!)
        .eq("estatus", "activo")
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order("fecha");
      if (error) throw error;
      return data ?? [];
    },
  });

  const resumen = useMemo(() => {
    const mapa = new Map<string, number>();
    (ventas ?? []).forEach((v) => {
      const clave = v.linea_negocio_id ?? SIN_CLASIFICAR;
      mapa.set(clave, (mapa.get(clave) ?? 0) + Number(v.venta_neta ?? 0));
    });
    const total = [...mapa.values()].reduce((s, m) => s + m, 0);
    const filas = [...mapa.entries()]
      .map(([id, monto]) => ({
        id,
        nombre: id === SIN_CLASIFICAR ? "Sin clasificar" : lineas?.find((l: any) => l.id === id)?.nombre ?? "—",
        monto,
        pct: total > 0 ? (monto / total) * 100 : 0,
      }))
      .sort((a, b) => b.monto - a.monto);
    return { filas, total };
  }, [ventas, lineas]);

  async function asignarLinea(ventaId: string, lineaId: string) {
    await supabase
      .from("ventas")
      .update({ linea_negocio_id: lineaId || null })
      .eq("id", ventaId);
    qc.invalidateQueries({ queryKey: ["ventas_por_linea", sucursalId, mes] });
  }

  async function agregarLinea() {
    if (!sucursalId || !nuevaLinea.trim()) return;
    setGuardandoLinea(true);
    try {
      const { error } = await supabase.from("lineas_negocio").insert({
        sucursal_id: sucursalId,
        nombre: nuevaLinea.trim(),
        created_by: session?.user.id,
        updated_by: session?.user.id,
      });
      if (error) throw error;
      setNuevaLinea("");
      qc.invalidateQueries({ queryKey: ["lineas_negocio", sucursalId] });
    } finally {
      setGuardandoLinea(false);
    }
  }

  async function desactivarLinea(id: string) {
    await supabase.from("lineas_negocio").update({ estatus: "baja" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["lineas_negocio", sucursalId] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Ventas por línea de negocio</h1>
          <p className="text-sm text-ink-500">Qué tanto vende cada línea (ej. restaurante vs. café/panadería), mes a mes.</p>
        </div>
        <label className="flex flex-col text-xs font-medium text-ink-600">
          Mes
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
          />
        </label>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Líneas de negocio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(lineas ?? []).map((l: any) => (
              <span key={l.id} className="inline-flex items-center gap-1.5 rounded-full border border-ink-300 bg-white px-3 py-1 text-xs font-medium text-ink-700">
                {l.nombre}
                <button type="button" onClick={() => desactivarLinea(l.id)} className="text-ink-400 hover:text-rose-700" title="Desactivar">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-end gap-2">
            <input
              type="text"
              value={nuevaLinea}
              onChange={(e) => setNuevaLinea(e.target.value)}
              placeholder="Nueva línea de negocio"
              className="w-64 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
            <Button size="sm" variant="secondary" onClick={agregarLinea} disabled={guardandoLinea || !nuevaLinea.trim()}>
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen del mes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {resumen.filas.map((f) => (
            <div key={f.id} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-sm text-ink-700">{f.nombre}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${f.pct}%` }} />
              </div>
              <span className="w-28 shrink-0 text-right text-sm tabular text-ink-900">{formatCurrency(f.monto)}</span>
              <span className="w-14 shrink-0 text-right text-xs tabular text-ink-500">{f.pct.toFixed(0)}%</span>
            </div>
          ))}
          {!resumen.filas.length && !isLoading && <p className="text-sm text-ink-500">Sin ventas capturadas este mes.</p>}
          <div className="mt-2 flex items-center justify-between border-t border-ink-200 pt-2 font-semibold text-ink-900">
            <span>Total</span>
            <span className="tabular">{formatCurrency(resumen.total)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clasificar ventas del mes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || !ventas ? (
            <p className="px-5 py-4 text-sm text-ink-500">Cargando…</p>
          ) : !ventas.length ? (
            <p className="px-5 py-4 text-sm text-ink-500">Sin ventas capturadas este mes.</p>
          ) : (
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-2.5">Fecha</th>
                    <th className="px-4 py-2.5">Turno</th>
                    <th className="px-4 py-2.5">Folio</th>
                    <th className="px-4 py-2.5 text-right">Venta neta</th>
                    <th className="px-4 py-2.5">Línea de negocio</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((v) => (
                    <tr key={v.id} className="border-t border-ink-100">
                      <td className="px-5 py-2 text-ink-700">{formatDate(v.fecha)}</td>
                      <td className="px-4 py-2 text-ink-600">{v.turno ?? "—"}</td>
                      <td className="px-4 py-2 text-ink-600">{v.folio_pos ?? "—"}</td>
                      <td className="px-4 py-2 text-right tabular text-ink-900">{formatCurrency(Number(v.venta_neta ?? 0))}</td>
                      <td className="px-4 py-2">
                        <select
                          value={v.linea_negocio_id ?? ""}
                          onChange={(e) => asignarLinea(v.id, e.target.value)}
                          className="rounded-md border border-ink-200 px-2 py-1 text-xs"
                        >
                          <option value="">Sin clasificar</option>
                          {(lineas ?? []).map((l: any) => (
                            <option key={l.id} value={l.id}>
                              {l.nombre}
                            </option>
                          ))}
                        </select>
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
