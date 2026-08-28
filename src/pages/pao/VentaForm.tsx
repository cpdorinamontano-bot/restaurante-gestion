import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useFormasPago } from "@/hooks/useCatalogos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface LineaFormaPago {
  forma_pago_id: string;
  importe: string;
}

export default function VentaForm() {
  const { sucursalId } = useAuth();
  const navigate = useNavigate();
  const { data: formasPago } = useFormasPago();

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [turno, setTurno] = useState("");
  const [ventaBruta, setVentaBruta] = useState("");
  const [impuestos, setImpuestos] = useState("");
  const [folioPos, setFolioPos] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState<LineaFormaPago[]>([{ forma_pago_id: "", importe: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function actualizarLinea(i: number, campo: keyof LineaFormaPago, valor: string) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sucursalId) return;
    setSaving(true);
    setError(null);
    try {
      const { data: venta, error: ventaError } = await supabase
        .from("ventas")
        .insert({
          fecha,
          turno: turno || null,
          sucursal_id: sucursalId,
          venta_bruta: Number(ventaBruta || 0),
          impuestos: Number(impuestos || 0),
          folio_pos: folioPos || null,
          observaciones: observaciones || null,
        })
        .select("id")
        .single();
      if (ventaError) throw ventaError;

      const filas = lineas
        .filter((l) => l.forma_pago_id && Number(l.importe) > 0)
        .map((l) => ({ venta_id: venta.id, forma_pago_id: l.forma_pago_id, importe: Number(l.importe) }));

      if (filas.length) {
        const { error: fpError } = await supabase.from("ventas_formas_pago").insert(filas);
        if (fpError) throw fpError;
      }

      navigate("/pao");
    } catch (err: any) {
      setError(err.message ?? "Error al guardar la venta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Registrar venta</h1>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Fecha">
              <Input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </Field>
            <Field label="Turno">
              <Input placeholder="Comida / Cena" value={turno} onChange={(e) => setTurno(e.target.value)} />
            </Field>
            <Field label="Venta bruta">
              <Input type="number" step="0.01" min="0" required value={ventaBruta} onChange={(e) => setVentaBruta(e.target.value)} />
            </Field>
            <Field label="Impuestos">
              <Input type="number" step="0.01" min="0" value={impuestos} onChange={(e) => setImpuestos(e.target.value)} />
            </Field>
            <Field label="Folio POS">
              <Input value={folioPos} onChange={(e) => setFolioPos(e.target.value)} />
            </Field>
            <div className="col-span-2">
              <Field label="Observaciones">
                <Textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Formas de pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lineas.map((linea, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <Select value={linea.forma_pago_id} onChange={(e) => actualizarLinea(i, "forma_pago_id", e.target.value)}>
                  <option value="">Selecciona forma de pago</option>
                  {formasPago?.map((fp: any) => (
                    <option key={fp.id} value={fp.id}>
                      {fp.nombre}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Importe"
                  value={linea.importe}
                  onChange={(e) => actualizarLinea(i, "importe", e.target.value)}
                />
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={() => setLineas((p) => [...p, { forma_pago_id: "", importe: "" }])}>
              + Agregar forma de pago
            </Button>
          </CardContent>
        </Card>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        <div className="mt-4 flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar venta"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/pao")}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
