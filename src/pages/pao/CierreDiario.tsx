import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, estatusConciliacionTone } from "@/components/ui/Badge";

const ITEMS: { key: string; label: string }[] = [
  { key: "ventas_completas", label: "Ventas completas" },
  { key: "formas_pago_cuadradas", label: "Formas de pago cuadradas" },
  { key: "caja_cuadrada", label: "Caja cuadrada" },
  { key: "gastos_capturados", label: "Gastos capturados" },
  { key: "compras_capturadas", label: "Compras capturadas" },
  { key: "documentos_cargados", label: "Documentos cargados" },
  { key: "diferencias_justificadas", label: "Diferencias justificadas" },
];

export default function CierreDiario() {
  const { sucursalId, session } = useAuth();
  const hoy = new Date().toISOString().slice(0, 10);
  const [cierre, setCierre] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function cargar() {
    if (!sucursalId) return;
    setLoading(true);
    const { data } = await supabase
      .from("cierres_diarios")
      .select("*")
      .eq("sucursal_id", sucursalId)
      .eq("fecha", hoy)
      .maybeSingle();
    if (data) {
      setCierre(data);
    } else {
      const { data: nuevo } = await supabase
        .from("cierres_diarios")
        .insert({ fecha: hoy, sucursal_id: sucursalId })
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
    const { data } = await supabase
      .from("cierres_diarios")
      .update({ checklist: nuevoChecklist })
      .eq("id", cierre.id)
      .select("*")
      .single();
    setCierre(data);
  }

  async function validar() {
    if (!cierre) return;
    const { data } = await supabase
      .from("cierres_diarios")
      .update({ estatus: "VALIDADO", validado_por: session?.user.id, validado_en: new Date().toISOString() })
      .eq("id", cierre.id)
      .select("*")
      .single();
    setCierre(data);
  }

  if (loading || !cierre) return <p className="text-sm text-slate-500">Cargando…</p>;

  const completos = ITEMS.filter((i) => cierre.checklist[i.key]).length;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Cierre del día</h1>
        <Badge tone={estatusConciliacionTone(cierre.estatus)}>{cierre.estatus}</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            Checklist ({completos}/{ITEMS.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ITEMS.map((item) => (
            <label key={item.key} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={!!cierre.checklist[item.key]}
                onChange={() => toggleItem(item.key)}
                disabled={cierre.estatus === "VALIDADO"}
              />
              {item.label}
            </label>
          ))}
        </CardContent>
      </Card>
      {cierre.estatus !== "VALIDADO" && (
        <Button onClick={validar} disabled={completos < ITEMS.length}>
          Validar cierre del día
        </Button>
      )}
    </div>
  );
}
