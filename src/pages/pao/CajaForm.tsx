import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useCajas } from "@/hooks/useCatalogos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const TIPOS = [
  { value: "venta_efectivo", label: "Venta en efectivo" },
  { value: "entrada", label: "Entrada" },
  { value: "salida", label: "Salida" },
  { value: "retiro", label: "Retiro" },
  { value: "deposito", label: "Depósito" },
  { value: "gasto", label: "Gasto pagado en efectivo" },
  { value: "reposicion", label: "Reposición de caja chica" },
];

export default function CajaForm() {
  const { sucursalId, session } = useAuth();
  const navigate = useNavigate();
  const { data: cajas } = useCajas(sucursalId);

  const [cajaId, setCajaId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [turno, setTurno] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState("entrada");
  const [importe, setImporte] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cierre de caja
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [saldoFisico, setSaldoFisico] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [cierreMsg, setCierreMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cajaId) return;
    setSaving(true);
    setError(null);
    try {
      const { error: movError } = await supabase.from("movimientos_caja").insert({
        caja_id: cajaId,
        fecha,
        turno: turno || null,
        tipo_movimiento: tipoMovimiento,
        importe: Number(importe),
        usuario_id: session?.user.id,
        notas: notas || null,
      });
      if (movError) throw movError;
      navigate("/administracion");
    } catch (err: any) {
      setError(err.message ?? "Error al registrar el movimiento");
    } finally {
      setSaving(false);
    }
  }

  async function handleCierre(e: React.FormEvent) {
    e.preventDefault();
    if (!cajaId) return;
    setCerrando(true);
    setCierreMsg(null);
    try {
      const { data, error: cierreError } = await supabase
        .from("cierres_caja")
        .insert({
          caja_id: cajaId,
          fecha,
          turno: turno || null,
          saldo_fisico: Number(saldoFisico),
          usuario_id: session?.user.id,
        })
        .select("saldo_teorico, diferencia")
        .single();
      if (cierreError) throw cierreError;
      setCierreMsg(`Saldo teórico: ${data.saldo_teorico} · Diferencia: ${data.diferencia}`);
    } catch (err: any) {
      setCierreMsg(err.message ?? "Error al cerrar la caja");
    } finally {
      setCerrando(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold text-ink-900">Movimiento de caja</h1>

      <Card>
        <CardHeader>
          <CardTitle>Registrar movimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Caja">
              <Select required value={cajaId} onChange={(e) => setCajaId(e.target.value)}>
                <option value="">Selecciona caja</option>
                {cajas?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Fecha">
                <Input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </Field>
              <Field label="Turno">
                <Input value={turno} onChange={(e) => setTurno(e.target.value)} />
              </Field>
            </div>
            <Field label="Tipo de movimiento">
              <Select value={tipoMovimiento} onChange={(e) => setTipoMovimiento(e.target.value)}>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Importe">
              <Input type="number" step="0.01" min="0.01" required value={importe} onChange={(e) => setImporte(e.target.value)} />
            </Field>
            <Field label="Notas">
              <Input value={notas} onChange={(e) => setNotas(e.target.value)} />
            </Field>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando…" : "Registrar movimiento"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate("/administracion")}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cierre de caja del día</CardTitle>
        </CardHeader>
        <CardContent>
          {!mostrarCierre ? (
            <Button variant="secondary" size="sm" onClick={() => setMostrarCierre(true)}>
              Cerrar caja
            </Button>
          ) : (
            <form className="space-y-4" onSubmit={handleCierre}>
              <Field label="Saldo físico contado">
                <Input type="number" step="0.01" required value={saldoFisico} onChange={(e) => setSaldoFisico(e.target.value)} />
              </Field>
              {cierreMsg && <p className="text-sm text-ink-700">{cierreMsg}</p>}
              <Button type="submit" disabled={cerrando || !cajaId}>
                {cerrando ? "Cerrando…" : "Confirmar cierre"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
