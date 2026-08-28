import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useProveedores, useCategoriasGastos, useCentrosCosto, useFormasPago } from "@/hooks/useCatalogos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function GastoForm() {
  const { sucursalId } = useAuth();
  const navigate = useNavigate();
  const { data: proveedores } = useProveedores();
  const { data: categorias } = useCategoriasGastos();
  const { data: centrosCosto } = useCentrosCosto();
  const { data: formasPago } = useFormasPago();

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [proveedorId, setProveedorId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [categoriaGastoId, setCategoriaGastoId] = useState("");
  const [centroCostoId, setCentroCostoId] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [impuestos, setImpuestos] = useState("0");
  const [formaPagoId, setFormaPagoId] = useState("");
  const [estatusPago, setEstatusPago] = useState<"pendiente" | "pagada" | "parcial">("pagada");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sucursalId || !categoriaGastoId) return;
    setSaving(true);
    setError(null);
    try {
      const { error: gastoError } = await supabase.from("gastos").insert({
        fecha,
        proveedor_id: proveedorId || null,
        concepto,
        categoria_gasto_id: categoriaGastoId,
        centro_costo_id: centroCostoId || null,
        sucursal_id: sucursalId,
        subtotal: Number(subtotal || 0),
        impuestos: Number(impuestos || 0),
        forma_pago_id: formaPagoId || null,
        estatus_pago: estatusPago,
        fecha_vencimiento: fechaVencimiento || null,
        observacion: observacion || null,
      });
      if (gastoError) throw gastoError;
      navigate("/pao");
    } catch (err: any) {
      setError(err.message ?? "Error al guardar el gasto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-ink-900">Registrar gasto</h1>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Detalle del gasto</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Fecha">
              <Input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </Field>
            <Field label="Proveedor (opcional)">
              <Select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
                <option value="">Sin proveedor</option>
                {proveedores?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="col-span-2">
              <Field label="Concepto">
                <Input required value={concepto} onChange={(e) => setConcepto(e.target.value)} />
              </Field>
            </div>
            <Field label="Categoría">
              <Select required value={categoriaGastoId} onChange={(e) => setCategoriaGastoId(e.target.value)}>
                <option value="">Selecciona categoría</option>
                {categorias?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Centro de costo">
              <Select value={centroCostoId} onChange={(e) => setCentroCostoId(e.target.value)}>
                <option value="">Sin centro de costo</option>
                {centrosCosto?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subtotal">
              <Input type="number" step="0.01" min="0" required value={subtotal} onChange={(e) => setSubtotal(e.target.value)} />
            </Field>
            <Field label="Impuestos">
              <Input type="number" step="0.01" min="0" value={impuestos} onChange={(e) => setImpuestos(e.target.value)} />
            </Field>
            <Field label="Forma de pago">
              <Select value={formaPagoId} onChange={(e) => setFormaPagoId(e.target.value)}>
                <option value="">Selecciona forma de pago</option>
                {formasPago?.map((fp: any) => (
                  <option key={fp.id} value={fp.id}>
                    {fp.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estatus de pago">
              <Select value={estatusPago} onChange={(e) => setEstatusPago(e.target.value as any)}>
                <option value="pagada">Pagado</option>
                <option value="pendiente">Pendiente (crédito)</option>
                <option value="parcial">Parcial</option>
              </Select>
            </Field>
            {estatusPago !== "pagada" && (
              <Field label="Fecha de vencimiento">
                <Input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
              </Field>
            )}
            <div className="col-span-2">
              <Field label="Observación">
                <Textarea rows={2} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
              </Field>
            </div>
          </CardContent>
        </Card>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        <div className="mt-4 flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar gasto"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/pao")}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
