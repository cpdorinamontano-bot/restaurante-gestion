import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, estatusConciliacionTone } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Input";

const ITEMS: { key: string; label: string }[] = [
  { key: "ventas_conciliadas", label: "Ventas conciliadas" },
  { key: "caja_conciliada", label: "Caja conciliada" },
  { key: "bancos_conciliados", label: "Bancos conciliados" },
  { key: "compras_completas", label: "Compras completas" },
  { key: "inventario_validado", label: "Inventario validado" },
  { key: "food_cost_calculado", label: "Food cost calculado" },
  { key: "nomina_integrada", label: "Nómina integrada" },
  { key: "gastos_clasificados", label: "Gastos clasificados" },
  { key: "cxp_validada", label: "CxP validada" },
  { key: "obligaciones_registradas", label: "Obligaciones registradas" },
  { key: "documentos_completos", label: "Documentos completos" },
  { key: "variaciones_analizadas", label: "Variaciones analizadas" },
];

const FLUJO = ["ABIERTO", "EN_REVISION", "CON_OBSERVACIONES", "VALIDADO", "CERRADO"];

function periodoActual() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function CierreMensual() {
  const { sucursalId, session } = useAuth();
  const periodo = periodoActual();
  const [cierre, setCierre] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [motivoReapertura, setMotivoReapertura] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function cargar() {
    if (!sucursalId) return;
    setLoading(true);
    const { data } = await supabase
      .from("cierres_mensuales")
      .select("*")
      .eq("sucursal_id", sucursalId)
      .eq("periodo", periodo)
      .maybeSingle();
    if (data) {
      setCierre(data);
    } else {
      const { data: nuevo } = await supabase
        .from("cierres_mensuales")
        .insert({ periodo, sucursal_id: sucursalId })
        .select("*")
        .single();
      setCierre(nuevo);
    }
    setLoading(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalId]);

  async function toggleItem(key: string) {
    if (!cierre) return;
    const nuevoChecklist = { ...cierre.checklist, [key]: !cierre.checklist[key] };
    const { data } = await supabase.from("cierres_mensuales").update({ checklist: nuevoChecklist }).eq("id", cierre.id).select("*").single();
    setCierre(data);
  }

  async function avanzarEstatus() {
    if (!cierre) return;
    const idx = FLUJO.indexOf(cierre.estatus);
    const siguiente = FLUJO[idx + 1];
    if (!siguiente) return;
    const { data, error } = await supabase.from("cierres_mensuales").update({ estatus: siguiente, motivo_cambio: null }).eq("id", cierre.id).select("*").single();
    if (error) {
      setMensaje(error.message);
      return;
    }
    setCierre(data);
  }

  async function reabrir() {
    if (!cierre || !motivoReapertura.trim()) return;
    const { data, error } = await supabase
      .from("cierres_mensuales")
      .update({ estatus: "EN_REVISION", motivo_cambio: motivoReapertura })
      .eq("id", cierre.id)
      .select("*")
      .single();
    if (error) {
      setMensaje(error.message);
      return;
    }
    setCierre(data);
    setMotivoReapertura("");
  }

  async function generarAlertas() {
    if (!sucursalId) return;
    const { error } = await supabase.rpc("fn_generar_alertas_periodo", { p_sucursal_id: sucursalId, p_periodo: periodo });
    setMensaje(error ? error.message : "Alertas del periodo generadas.");
  }

  async function snapshotKpis() {
    if (!sucursalId) return;
    const { error } = await supabase.rpc("fn_snapshot_kpis_mensual", { p_sucursal_id: sucursalId, p_periodo: periodo });
    setMensaje(error ? error.message : "KPIs del periodo actualizados.");
  }

  if (loading || !cierre) return <p className="text-sm text-slate-500">Cargando…</p>;

  const completos = ITEMS.filter((i) => cierre.checklist[i.key]).length;
  const puedeAvanzar = FLUJO.indexOf(cierre.estatus) < FLUJO.length - 1;
  const siguiente = FLUJO[FLUJO.indexOf(cierre.estatus) + 1];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Cierre mensual — {periodo.slice(0, 7)}</h1>
        <Badge tone={estatusConciliacionTone(cierre.estatus)}>{cierre.estatus}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Checklist ({completos}/{ITEMS.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {ITEMS.map((item) => (
            <label key={item.key} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={!!cierre.checklist[item.key]}
                onChange={() => toggleItem(item.key)}
                disabled={cierre.estatus === "CERRADO"}
              />
              {item.label}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Herramientas del cierre</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="secondary" size="sm" onClick={generarAlertas}>
            Generar alertas del periodo
          </Button>
          <Button variant="secondary" size="sm" onClick={snapshotKpis}>
            Actualizar KPIs del periodo
          </Button>
        </CardContent>
      </Card>

      {mensaje && <p className="text-sm text-slate-700">{mensaje}</p>}

      {cierre.estatus !== "CERRADO" && puedeAvanzar && (
        <Button onClick={avanzarEstatus} disabled={siguiente === "CERRADO" && completos < ITEMS.length}>
          Avanzar a {siguiente}
        </Button>
      )}

      {cierre.estatus === "CERRADO" && (
        <Card>
          <CardHeader>
            <CardTitle>Reabrir periodo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Motivo de la reapertura (obligatorio)">
              <Input value={motivoReapertura} onChange={(e) => setMotivoReapertura(e.target.value)} />
            </Field>
            <Button variant="danger" onClick={reabrir} disabled={!motivoReapertura.trim()}>
              Reabrir periodo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
