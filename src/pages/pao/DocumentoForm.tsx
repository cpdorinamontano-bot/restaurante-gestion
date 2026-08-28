import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const TIPOS = [
  "cfdi","factura","ticket","estado_cuenta","comprobante_bancario",
  "cotizacion","orden_compra","inventario","excel","pdf","imagen","otro",
];

export default function DocumentoForm() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [tipo, setTipo] = useState("factura");
  const [file, setFile] = useState<File | null>(null);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("documentos").insert({
        tipo,
        storage_path: path,
        nombre_archivo: file.name,
        subido_por: session?.user.id,
        notas: notas || null,
      });
      if (dbError) throw dbError;

      navigate("/administracion");
    } catch (err: any) {
      setError(err.message ?? "Error al subir el documento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold text-ink-900">Subir documento</h1>
      <Card>
        <CardHeader>
          <CardTitle>Nuevo documento</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Tipo de documento">
              <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Archivo">
              <Input type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
            <Field label="Notas">
              <Input value={notas} onChange={(e) => setNotas(e.target.value)} />
            </Field>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={saving || !file}>
                {saving ? "Subiendo…" : "Subir documento"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate("/administracion")}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
