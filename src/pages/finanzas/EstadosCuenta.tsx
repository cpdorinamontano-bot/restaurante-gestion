import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export default function EstadosCuenta() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const { data: cuentas } = useQuery({
    queryKey: ["cuentas_bancarias_activas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cuentas_bancarias").select("id, banco, alias").eq("estatus", "activo");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: conciliaciones, isLoading } = useQuery({
    queryKey: ["conciliaciones_bancarias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_conciliaciones_bancarias").select("*").order("periodo", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [cuentaId, setCuentaId] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [saldo, setSaldo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cuentaId || !periodo || saldo === "" || !file) return;
    setSaving(true);
    setError(null);
    try {
      const path = `estados-cuenta/${periodo}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: doc, error: docError } = await supabase
        .from("documentos")
        .insert({ tipo: "estado_cuenta", storage_path: path, nombre_archivo: file.name, subido_por: session?.user.id })
        .select("id")
        .single();
      if (docError) throw docError;

      const { error: conciliacionError } = await supabase.from("conciliaciones_bancarias").upsert(
        {
          cuenta_id: cuentaId,
          periodo: `${periodo}-01`,
          saldo_estado_cuenta: Number(saldo),
          documento_id: doc.id,
          usuario_id: session?.user.id,
        },
        { onConflict: "cuenta_id,periodo" }
      );
      if (conciliacionError) throw conciliacionError;

      setSaldo("");
      setFile(null);
      setPeriodo("");
      qc.invalidateQueries({ queryKey: ["conciliaciones_bancarias"] });
    } catch (err: any) {
      setError(err.message ?? "Error al guardar la conciliación");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Estados de cuenta</h1>
        <p className="text-sm text-ink-500">
          Sube el PDF del estado de cuenta y captura el saldo final que muestra el banco — el sistema lo compara contra el
          saldo que reconstruye a partir de los movimientos capturados, para detectar diferencias.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subir estado de cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
            <Field label="Cuenta">
              <Select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} required>
                <option value="">Selecciona…</option>
                {cuentas?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.alias ?? c.banco}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mes que cubre">
              <Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} required />
            </Field>
            <Field label="Saldo final (según el estado de cuenta)">
              <Input type="number" step="0.01" value={saldo} onChange={(e) => setSaldo(e.target.value)} required />
            </Field>
            <Field label="Archivo PDF">
              <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
            </Field>
            {error && <p className="md:col-span-4 text-sm text-rose-600">{error}</p>}
            <div className="md:col-span-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando…" : "Guardar y conciliar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de conciliaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-ink-500">Cargando…</p>
          ) : !conciliaciones?.length ? (
            <p className="text-sm text-ink-500">Aún no se ha subido ningún estado de cuenta.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-ink-500">
                  <tr>
                    <th className="pb-2">Mes</th>
                    <th className="pb-2">Cuenta</th>
                    <th className="pb-2 text-right">Saldo del estado de cuenta</th>
                    <th className="pb-2 text-right">Saldo calculado por el sistema</th>
                    <th className="pb-2 text-right">Diferencia</th>
                    <th className="pb-2">Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {conciliaciones.map((c: any) => {
                    const cuadra = Math.abs(Number(c.diferencia)) < 1;
                    return (
                      <tr key={c.id} className="border-t border-ink-100">
                        <td className="py-2 capitalize">
                          {new Date(`${c.periodo}T00:00:00`).toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
                        </td>
                        <td className="py-2 text-ink-600">{c.alias ?? c.banco}</td>
                        <td className="py-2 text-right tabular">{formatCurrency(c.saldo_estado_cuenta)}</td>
                        <td className="py-2 text-right tabular">{formatCurrency(c.saldo_calculado)}</td>
                        <td className={`py-2 text-right tabular ${cuadra ? "text-emerald-700" : "text-rose-700"}`}>
                          {formatCurrency(c.diferencia)}
                        </td>
                        <td className="py-2">
                          {cuadra ? (
                            <Badge tone="verde">
                              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> Cuadra
                            </Badge>
                          ) : (
                            <Badge tone="rojo">
                              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Revisar
                            </Badge>
                          )}
                        </td>
                      </tr>
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
