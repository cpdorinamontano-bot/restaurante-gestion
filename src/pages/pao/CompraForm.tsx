import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useProveedores, useProductos, useUnidadesMedida, useFormasPago, useCategoriasProductos } from "@/hooks/useCatalogos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SubirDocumentoFiscal } from "@/components/forms/SubirDocumentoFiscal";
import type { DatosDocumentoFiscal } from "@/lib/lectorDocumentos";

interface LineaCompra {
  producto_id: string;
  cantidad: string;
  unidad_id: string;
  costo_unitario: string;
}

export default function CompraForm() {
  const { sucursalId } = useAuth();
  const navigate = useNavigate();
  const { data: proveedores } = useProveedores();
  const { data: productos } = useProductos();
  const { data: unidades } = useUnidadesMedida();
  const { data: formasPago } = useFormasPago();
  const { data: categorias } = useCategoriasProductos();

  const [proveedorId, setProveedorId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [folio, setFolio] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [impuestos, setImpuestos] = useState("0");
  const [formaPagoId, setFormaPagoId] = useState("");
  const [estatusPago, setEstatusPago] = useState<"pendiente" | "pagada" | "parcial">("pendiente");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [lineas, setLineas] = useState<LineaCompra[]>([{ producto_id: "", cantidad: "", unidad_id: "", costo_unitario: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentoId, setDocumentoId] = useState<string | null>(null);
  const [conceptosDocumento, setConceptosDocumento] = useState<string[]>([]);
  const [proveedorNoEncontrado, setProveedorNoEncontrado] = useState<string | null>(null);

  function actualizarLinea(i: number, campo: keyof LineaCompra, valor: string) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  function aplicarDatosDocumento(datos: DatosDocumentoFiscal, docId: string) {
    setDocumentoId(docId);
    setConceptosDocumento(datos.conceptos);
    setProveedorNoEncontrado(null);
    if (datos.fecha) setFecha(datos.fecha);
    if (datos.folio) setFolio(datos.folio);
    else if (datos.uuid) setFolio(datos.uuid);
    if (datos.iva != null) setImpuestos(String(datos.iva));
    if (datos.rfcEmisor) {
      const coincidencia = proveedores?.find((p: any) => p.rfc?.toUpperCase() === datos.rfcEmisor?.toUpperCase());
      if (coincidencia) setProveedorId(coincidencia.id);
      else setProveedorNoEncontrado(`RFC ${datos.rfcEmisor}${datos.nombreEmisor ? ` (${datos.nombreEmisor})` : ""} no está en el catálogo de proveedores — selecciónalo o créalo.`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sucursalId || !proveedorId) return;
    setSaving(true);
    setError(null);
    try {
      const { data: compra, error: compraError } = await supabase
        .from("compras")
        .insert({
          proveedor_id: proveedorId,
          fecha,
          folio: folio || null,
          categoria_id: categoriaId || null,
          sucursal_id: sucursalId,
          impuestos: Number(impuestos || 0),
          forma_pago_id: formaPagoId || null,
          estatus_pago: estatusPago,
          fecha_vencimiento: fechaVencimiento || null,
          documento_id: documentoId,
        })
        .select("id")
        .single();
      if (compraError) throw compraError;

      const filas = lineas
        .filter((l) => l.producto_id && Number(l.cantidad) > 0)
        .map((l) => ({
          compra_id: compra.id,
          producto_id: l.producto_id,
          cantidad: Number(l.cantidad),
          unidad_id: l.unidad_id || null,
          costo_unitario: Number(l.costo_unitario || 0),
        }));
      if (!filas.length) throw new Error("Agrega al menos un producto");

      const { error: detalleError } = await supabase.from("compras_detalle").insert(filas);
      if (detalleError) throw detalleError;

      navigate("/administracion");
    } catch (err: any) {
      setError(err.message ?? "Error al guardar la compra");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-ink-900">Registrar compra</h1>

      <SubirDocumentoFiscal tipoDocumento="cfdi" onDatos={aplicarDatosDocumento} />

      <form onSubmit={handleSubmit} className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Proveedor">
                <Select required value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
                  <option value="">Selecciona proveedor</option>
                  {proveedores?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              {proveedorNoEncontrado && <p className="mt-1 text-xs text-amber-700">{proveedorNoEncontrado}</p>}
            </div>
            <Field label="Fecha">
              <Input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </Field>
            <Field label="Folio / Factura">
              <Input value={folio} onChange={(e) => setFolio(e.target.value)} />
            </Field>
            <Field label="Categoría">
              <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                <option value="">Selecciona categoría</option>
                {categorias?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
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
                <option value="pendiente">Pendiente (crédito)</option>
                <option value="pagada">Pagada</option>
                <option value="parcial">Parcial</option>
              </Select>
            </Field>
            {estatusPago !== "pagada" && (
              <Field label="Fecha de vencimiento">
                <Input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
              </Field>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conceptosDocumento.length > 0 && (
              <div className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
                Conceptos en el documento (captúralos abajo con el producto del catálogo que corresponda):
                <ul className="mt-1 list-disc pl-4">
                  {conceptosDocumento.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {lineas.map((linea, i) => (
              <div key={i} className="grid grid-cols-4 gap-2">
                <Select
                  className="col-span-2"
                  value={linea.producto_id}
                  onChange={(e) => actualizarLinea(i, "producto_id", e.target.value)}
                >
                  <option value="">Producto</option>
                  {productos?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
                <Input placeholder="Cantidad" type="number" step="0.01" value={linea.cantidad} onChange={(e) => actualizarLinea(i, "cantidad", e.target.value)} />
                <Select value={linea.unidad_id} onChange={(e) => actualizarLinea(i, "unidad_id", e.target.value)}>
                  <option value="">Unidad</option>
                  {unidades?.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.abreviatura}
                    </option>
                  ))}
                </Select>
                <Input
                  className="col-span-4 md:col-span-1"
                  placeholder="Costo unitario"
                  type="number"
                  step="0.0001"
                  value={linea.costo_unitario}
                  onChange={(e) => actualizarLinea(i, "costo_unitario", e.target.value)}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setLineas((p) => [...p, { producto_id: "", cantidad: "", unidad_id: "", costo_unitario: "" }])}
            >
              + Agregar producto
            </Button>
          </CardContent>
        </Card>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        <div className="mt-4 flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar compra"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/administracion")}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
