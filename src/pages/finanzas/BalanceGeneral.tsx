import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useCuentasBancarias } from "@/hooks/useCatalogos";
import { fetchActivosFijos, depreciacionMensual, type ActivoFijo } from "@/lib/activosFijos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

function mesesEntre(desdeISO: string, hastaISO: string): number {
  const d1 = new Date(`${desdeISO}T00:00:00`);
  const d2 = new Date(`${hastaISO}T00:00:00`);
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

function valorNetoActivo(activo: ActivoFijo, corteISO: string): number {
  const transcurridos = mesesEntre(activo.fechaInicio, corteISO) + 1;
  if (transcurridos <= 0) return activo.costo;
  const mensual = depreciacionMensual(activo);
  const meses = Math.min(transcurridos, activo.vidaUtilMeses);
  return Math.max(activo.valorResidual, activo.costo - mensual * meses);
}

export default function BalanceGeneral() {
  const { sucursalId, session } = useAuth();
  const qc = useQueryClient();
  const [corte, setCorte] = useState(() => new Date().toISOString().slice(0, 10));
  const [nuevoTipo, setNuevoTipo] = useState<"activo" | "pasivo">("pasivo");
  const [nuevoConcepto, setNuevoConcepto] = useState("");
  const [nuevoSaldo, setNuevoSaldo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const { data: cuentas } = useCuentasBancarias();

  const { data: saldosBancarios } = useQuery({
    queryKey: ["saldos_bancarios_corte", corte, cuentas?.map((c: any) => c.id).join(",")],
    enabled: !!cuentas?.length,
    queryFn: async () => {
      const resultados = await Promise.all(
        (cuentas ?? []).map((c: any) => supabase.rpc("fn_saldo_bancario_a_fecha", { p_cuenta_id: c.id, p_fecha: corte }))
      );
      return resultados.reduce((s, r) => s + Number(r.data ?? 0), 0);
    },
  });

  const { data: saldoCaja } = useQuery({
    queryKey: ["saldo_caja_corte", sucursalId, corte],
    enabled: !!sucursalId,
    queryFn: async () => {
      const { data, error } = await supabase.from("movimientos_caja").select("tipo_movimiento, importe").lte("fecha", corte);
      if (error) throw error;
      const ingresos = (data ?? [])
        .filter((m) => ["venta_efectivo", "entrada", "deposito", "reposicion"].includes(m.tipo_movimiento))
        .reduce((s, m) => s + Number(m.importe ?? 0), 0);
      const egresos = (data ?? [])
        .filter((m) => ["salida", "retiro", "gasto"].includes(m.tipo_movimiento))
        .reduce((s, m) => s + Number(m.importe ?? 0), 0);
      return ingresos - egresos;
    },
  });

  const { data: cxcPendiente } = useQuery({
    queryKey: ["cxc_pendiente_corte", corte],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_cxc_antiguedad").select("saldo, fecha_emision").gt("saldo", 0).lte("fecha_emision", corte);
      if (error) throw error;
      return (data ?? []).reduce((s, r: any) => s + Number(r.saldo ?? 0), 0);
    },
  });

  const { data: cxpPendiente } = useQuery({
    queryKey: ["cxp_pendiente_corte", corte],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_cxp_antiguedad").select("saldo, fecha_emision").gt("saldo", 0).lte("fecha_emision", corte);
      if (error) throw error;
      return (data ?? []).reduce((s, r: any) => s + Number(r.saldo ?? 0), 0);
    },
  });

  const { data: inventarioFinal } = useQuery({
    queryKey: ["inventario_final_corte", sucursalId, corte],
    enabled: !!sucursalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventarios_mensuales")
        .select("inventario_final, periodo")
        .eq("sucursal_id", sucursalId!)
        .eq("estatus", "activo")
        .lte("periodo", corte)
        .order("periodo", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0]?.inventario_final != null ? Number(data[0].inventario_final) : 0;
    },
  });

  const { data: activosFijos } = useQuery({
    queryKey: ["activos_fijos_balance", sucursalId],
    enabled: !!sucursalId,
    queryFn: () => fetchActivosFijos(sucursalId!),
  });

  const activosFijosNetos = useMemo(() => {
    if (!activosFijos) return 0;
    return activosFijos.reduce((s, a) => s + valorNetoActivo(a, corte), 0);
  }, [activosFijos, corte]);

  const { data: otrosConceptos } = useQuery({
    queryKey: ["balance_otros_conceptos", sucursalId],
    enabled: !!sucursalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("balance_otros_conceptos")
        .select("*")
        .eq("sucursal_id", sucursalId!)
        .eq("estatus", "activo")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const otrosActivos = (otrosConceptos ?? []).filter((c) => c.tipo === "activo");
  const otrosPasivos = (otrosConceptos ?? []).filter((c) => c.tipo === "pasivo");
  const otrosActivosTotal = otrosActivos.reduce((s, c) => s + Number(c.saldo), 0);
  const otrosPasivosTotal = otrosPasivos.reduce((s, c) => s + Number(c.saldo), 0);

  const totalActivos = (saldosBancarios ?? 0) + (saldoCaja ?? 0) + (cxcPendiente ?? 0) + (inventarioFinal ?? 0) + activosFijosNetos + otrosActivosTotal;
  const totalPasivos = (cxpPendiente ?? 0) + otrosPasivosTotal;
  const capital = totalActivos - totalPasivos;

  async function agregarConcepto() {
    if (!sucursalId || !nuevoConcepto.trim() || nuevoSaldo === "") return;
    setGuardando(true);
    try {
      const { error } = await supabase.from("balance_otros_conceptos").insert({
        sucursal_id: sucursalId,
        tipo: nuevoTipo,
        concepto: nuevoConcepto.trim(),
        saldo: Number(nuevoSaldo),
        created_by: session?.user.id,
      });
      if (error) throw error;
      setNuevoConcepto("");
      setNuevoSaldo("");
      qc.invalidateQueries({ queryKey: ["balance_otros_conceptos", sucursalId] });
    } finally {
      setGuardando(false);
    }
  }

  async function quitarConcepto(id: string) {
    await supabase.from("balance_otros_conceptos").update({ estatus: "baja" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["balance_otros_conceptos", sucursalId] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Balance general simplificado</h1>
          <p className="text-sm text-ink-500">Qué tienes, qué debes y qué te queda, a una fecha de corte.</p>
        </div>
        <label className="flex flex-col text-xs font-medium text-ink-600">
          Corte al
          <input
            type="date"
            value={corte}
            onChange={(e) => setCorte(e.target.value)}
            className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Activos — qué tienes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Fila label="Bancos" valor={saldosBancarios} />
            <Fila label="Caja" valor={saldoCaja} />
            <Fila label="Cuentas por cobrar" valor={cxcPendiente} />
            <Fila label="Inventario" valor={inventarioFinal} />
            <Fila label="Activos fijos (valor neto)" valor={activosFijosNetos} />
            {otrosActivos.map((c) => (
              <Fila key={c.id} label={c.concepto} valor={Number(c.saldo)} />
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-ink-200 pt-2 font-semibold text-ink-900">
              <span>Total activos</span>
              <span className="tabular">{formatCurrency(totalActivos)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pasivos — qué debes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Fila label="Cuentas por pagar" valor={cxpPendiente} />
            {otrosPasivos.map((c) => (
              <Fila key={c.id} label={c.concepto} valor={Number(c.saldo)} />
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-ink-200 pt-2 font-semibold text-ink-900">
              <span>Total pasivos</span>
              <span className="tabular">{formatCurrency(totalPasivos)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-300 bg-brand-50/40">
          <CardHeader>
            <CardTitle>Capital — qué te queda</CardTitle>
          </CardHeader>
          <CardContent className="flex h-full flex-col justify-between">
            <p className="text-xs text-ink-500">Activos totales menos pasivos totales.</p>
            <p className={`mt-4 text-3xl font-bold tabular ${capital >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatCurrency(capital)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Otros activos y pasivos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-ink-500">
            Para lo que no vive en ningún otro módulo del sistema: préstamos, depósitos en garantía, etc.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-xs font-medium text-ink-600">
              Tipo
              <select
                value={nuevoTipo}
                onChange={(e) => setNuevoTipo(e.target.value as "activo" | "pasivo")}
                className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
              >
                <option value="activo">Activo</option>
                <option value="pasivo">Pasivo</option>
              </select>
            </label>
            <label className="flex flex-col text-xs font-medium text-ink-600">
              Concepto
              <input
                type="text"
                value={nuevoConcepto}
                onChange={(e) => setNuevoConcepto(e.target.value)}
                placeholder="Ej. Préstamo bancario"
                className="mt-1 w-56 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-ink-600">
              Saldo
              <input
                type="number"
                step="0.01"
                value={nuevoSaldo}
                onChange={(e) => setNuevoSaldo(e.target.value)}
                className="mt-1 w-36 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
              />
            </label>
            <Button size="sm" onClick={agregarConcepto} disabled={guardando || !nuevoConcepto.trim() || nuevoSaldo === ""}>
              Agregar
            </Button>
          </div>

          {!!otrosConceptos?.length && (
            <table className="mt-4 w-full text-sm">
              <tbody>
                {otrosConceptos.map((c) => (
                  <tr key={c.id} className="border-t border-ink-100">
                    <td className="py-2 text-ink-700">{c.tipo === "activo" ? "Activo" : "Pasivo"}</td>
                    <td className="py-2 text-ink-700">{c.concepto}</td>
                    <td className="py-2 text-right tabular text-ink-900">{formatCurrency(Number(c.saldo))}</td>
                    <td className="py-2 text-right">
                      <button type="button" onClick={() => quitarConcepto(c.id)} className="text-xs font-medium text-rose-700 hover:underline">
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Fila({ label, valor }: { label: string; valor: number | null | undefined }) {
  return (
    <div className="flex items-center justify-between text-ink-700">
      <span>{label}</span>
      <span className="tabular">{formatCurrency(valor ?? 0)}</span>
    </div>
  );
}
