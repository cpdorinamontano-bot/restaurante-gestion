import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useProductos } from "@/hooks/useCatalogos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface LineaConteo {
  producto_id: string;
  cantidad_fisica: string;
  guardado: boolean;
}

export default function InventarioForm() {
  const { sucursalId, session } = useAuth();
  const navigate = useNavigate();
  const { data: productos } = useProductos();

  const [conteoId, setConteoId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineas, setLineas] = useState<LineaConteo[]>([{ producto_id: "", cantidad_fisica: "", guardado: false }]);
  const [cerrando, setCerrando] = useState(false);
  const [cerrado, setCerrado] = useState(false);

  async function crearConteo(e: React.FormEvent) {
    e.preventDefault();
    if (!sucursalId) return;
    setCreando(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("conteos_inventario")
        .insert({ fecha, sucursal_id: sucursalId, usuario_id: session?.user.id })
        .select("id")
        .single();
      if (err) throw err;
      setConteoId(data.id);
    } catch (err: any) {
      setError(err.message ?? "Error al crear el conteo");
    } finally {
      setCreando(false);
    }
  }

  function actualizarLinea(i: number, campo: keyof LineaConteo, valor: string) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  async function guardarLinea(i: number) {
    const linea = lineas[i];
    if (!conteoId || !linea.producto_id || linea.cantidad_fisica === "") return;
    const { error: err } = await supabase.from("conteos_detalle").insert({
      conteo_id: conteoId,
      producto_id: linea.producto_id,
      cantidad_fisica: Number(linea.cantidad_fisica),
    });
    if (err) {
      setError(err.message);
      return;
    }
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, guardado: true } : l)));
    setLineas((prev) => [...prev, { producto_id: "", cantidad_fisica: "", guardado: false }]);
  }

  async function cerrarConteo() {
    if (!conteoId) return;
    setCerrando(true);
    setError(null);
    try {
      const { error: err } = await supabase.from("conteos_inventario").update({ estatus: "cerrado" }).eq("id", conteoId);
      if (err) throw err;
      setCerrado(true);
    } catch (err: any) {
      setError(err.message ?? "Error al cerrar el conteo");
    } finally {
      setCerrando(false);
    }
  }

  if (!conteoId) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-semibold text-ink-900">Registrar inventario</h1>
        <Card>
          <CardHeader>
            <CardTitle>Nuevo conteo físico</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={crearConteo}>
              <Field label="Fecha">
                <Input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </Field>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <div className="flex gap-3">
                <Button type="submit" disabled={creando}>
                  {creando ? "Creando…" : "Iniciar conteo"}
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

  if (cerrado) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold text-ink-900">Conteo cerrado</h1>
        <p className="text-sm text-ink-500">
          Los ajustes de inventario se generaron automáticamente para las diferencias detectadas.
        </p>
        <Button onClick={() => navigate("/administracion")}>Volver</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-ink-900">Conteo físico de inventario</h1>
      <Card>
        <CardHeader>
          <CardTitle>Existencias contadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineas.map((linea, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <Select
                className="col-span-2"
                value={linea.producto_id}
                disabled={linea.guardado}
                onChange={(e) => actualizarLinea(i, "producto_id", e.target.value)}
              >
                <option value="">Producto</option>
                {productos?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="Cantidad física"
                  disabled={linea.guardado}
                  value={linea.cantidad_fisica}
                  onChange={(e) => actualizarLinea(i, "cantidad_fisica", e.target.value)}
                />
                {!linea.guardado && (
                  <Button type="button" size="sm" onClick={() => guardarLinea(i)}>
                    OK
                  </Button>
                )}
              </div>
            </div>
          ))}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button onClick={cerrarConteo} disabled={cerrando}>
          {cerrando ? "Cerrando…" : "Cerrar conteo y generar ajustes"}
        </Button>
        <Button variant="secondary" onClick={() => navigate("/administracion")}>
          Guardar y salir
        </Button>
      </div>
    </div>
  );
}
