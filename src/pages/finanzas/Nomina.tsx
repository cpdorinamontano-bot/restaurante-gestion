import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

const CAMPOS = ["sueldo", "bonos", "horas_extras", "prestaciones", "cargas_patronales", "otros_costos"] as const;
type Campo = (typeof CAMPOS)[number];

const vacioPeriodo = { fechaInicio: "", fechaFin: "", tipo: "quincenal" as "semanal" | "quincenal" | "mensual" };

export default function Nomina() {
  const { sucursalId, session } = useAuth();
  const qc = useQueryClient();
  const [periodoId, setPeriodoId] = useState<string | null>(null);
  const [nuevoPeriodo, setNuevoPeriodo] = useState(vacioPeriodo);
  const [creandoPeriodo, setCreandoPeriodo] = useState(false);
  const [filas, setFilas] = useState<Record<string, Partial<Record<Campo, string>>>>({});
  const [guardandoEmpleado, setGuardandoEmpleado] = useState<string | null>(null);

  const { data: periodos } = useQuery({
    queryKey: ["periodos_nomina"],
    queryFn: async () => {
      const { data, error } = await supabase.from("periodos_nomina").select("*").order("fecha_inicio", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const periodoActivo = useMemo(() => {
    if (periodoId) return periodos?.find((p) => p.id === periodoId) ?? null;
    return periodos?.[0] ?? null;
  }, [periodos, periodoId]);

  const { data: empleados } = useQuery({
    queryKey: ["empleados_activos", sucursalId],
    enabled: !!sucursalId,
    queryFn: async () => {
      const { data, error } = await supabase.from("empleados").select("*").eq("sucursal_id", sucursalId!).eq("estatus", "activo").order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: detalle } = useQuery({
    queryKey: ["nomina_detalle", periodoActivo?.id],
    enabled: !!periodoActivo,
    queryFn: async () => {
      const { data, error } = await supabase.from("nomina_detalle").select("*").eq("periodo_id", periodoActivo!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: laborCost } = useQuery({
    queryKey: ["labor_cost", sucursalId, periodoActivo?.fecha_inicio],
    enabled: !!sucursalId && !!periodoActivo,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_labor_cost", { p_sucursal_id: sucursalId!, p_periodo: periodoActivo!.fecha_inicio });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  function valorCelda(empleadoId: string, campo: Campo): string {
    const editado = filas[empleadoId]?.[campo];
    if (editado !== undefined) return editado;
    const guardado = detalle?.find((d) => d.empleado_id === empleadoId);
    if (guardado) return String(guardado[campo]);
    if (campo === "sueldo") {
      const emp = empleados?.find((e) => e.id === empleadoId);
      return emp ? String(emp.sueldo_base) : "";
    }
    return "0";
  }

  function setCelda(empleadoId: string, campo: Campo, valor: string) {
    setFilas((prev) => ({ ...prev, [empleadoId]: { ...prev[empleadoId], [campo]: valor } }));
  }

  function costoTotalFila(empleadoId: string): number {
    return CAMPOS.reduce((s, c) => s + Number(valorCelda(empleadoId, c) || 0), 0);
  }

  async function guardarFila(empleadoId: string) {
    if (!periodoActivo) return;
    setGuardandoEmpleado(empleadoId);
    try {
      const valores = Object.fromEntries(CAMPOS.map((c) => [c, Number(valorCelda(empleadoId, c) || 0)]));
      const { error } = await supabase.from("nomina_detalle").upsert(
        { periodo_id: periodoActivo.id, empleado_id: empleadoId, ...valores, updated_by: session?.user.id, created_by: session?.user.id },
        { onConflict: "periodo_id,empleado_id" }
      );
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["nomina_detalle", periodoActivo.id] });
      qc.invalidateQueries({ queryKey: ["labor_cost", sucursalId, periodoActivo.fecha_inicio] });
    } finally {
      setGuardandoEmpleado(null);
    }
  }

  async function crearPeriodo() {
    if (!nuevoPeriodo.fechaInicio || !nuevoPeriodo.fechaFin) return;
    setCreandoPeriodo(true);
    try {
      const { data, error } = await supabase
        .from("periodos_nomina")
        .insert({ fecha_inicio: nuevoPeriodo.fechaInicio, fecha_fin: nuevoPeriodo.fechaFin, tipo: nuevoPeriodo.tipo, created_by: session?.user.id })
        .select()
        .single();
      if (error) throw error;
      setNuevoPeriodo(vacioPeriodo);
      await qc.invalidateQueries({ queryKey: ["periodos_nomina"] });
      setPeriodoId(data.id);
    } finally {
      setCreandoPeriodo(false);
    }
  }

  const costoTotalPeriodo = (empleados ?? []).reduce((s, e) => s + costoTotalFila(e.id), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Nómina por empleado</h1>
          <p className="text-sm text-ink-500">Captura el costo de cada periodo, por empleado. El costo laboral del mes se calcula a partir de aquí.</p>
        </div>
        <Link
          to="/finanzas/empleados"
          className="inline-flex items-center gap-1 rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          Catálogo de empleados <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Periodo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs font-medium text-ink-600">
            Periodo capturado
            <select
              value={periodoActivo?.id ?? ""}
              onChange={(e) => setPeriodoId(e.target.value)}
              className="mt-1 w-64 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            >
              {(periodos ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {formatDate(p.fecha_inicio)} — {formatDate(p.fecha_fin)} ({p.tipo})
                </option>
              ))}
            </select>
          </label>
          <span className="pb-1.5 text-xs text-ink-400">o crea uno nuevo:</span>
          <label className="flex flex-col text-xs font-medium text-ink-600">
            Inicio
            <input
              type="date"
              value={nuevoPeriodo.fechaInicio}
              onChange={(e) => setNuevoPeriodo((p) => ({ ...p, fechaInicio: e.target.value }))}
              className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-ink-600">
            Fin
            <input
              type="date"
              value={nuevoPeriodo.fechaFin}
              onChange={(e) => setNuevoPeriodo((p) => ({ ...p, fechaFin: e.target.value }))}
              className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-ink-600">
            Tipo
            <select
              value={nuevoPeriodo.tipo}
              onChange={(e) => setNuevoPeriodo((p) => ({ ...p, tipo: e.target.value as typeof nuevoPeriodo.tipo }))}
              className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            >
              <option value="semanal">Semanal</option>
              <option value="quincenal">Quincenal</option>
              <option value="mensual">Mensual</option>
            </select>
          </label>
          <Button size="sm" variant="secondary" onClick={crearPeriodo} disabled={creandoPeriodo || !nuevoPeriodo.fechaInicio || !nuevoPeriodo.fechaFin}>
            {creandoPeriodo ? "Creando…" : "Crear periodo"}
          </Button>
        </CardContent>
      </Card>

      {periodoActivo && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard label="Costo laboral del periodo" value={formatCurrency(costoTotalPeriodo)} />
            <StatCard label="Costo laboral del mes (nómina)" value={formatCurrency(laborCost?.costo_laboral ?? null)} />
            <StatCard label="Costo laboral % sobre ventas del mes" value={formatPercent(laborCost?.labor_cost_pct ?? null)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalle por empleado</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!empleados?.length ? (
                <p className="px-5 py-4 text-sm text-ink-500">No hay empleados activos — agrégalos en el catálogo primero.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                      <tr>
                        <th className="px-5 py-2.5">Empleado</th>
                        <th className="px-2 py-2.5 text-right">Sueldo</th>
                        <th className="px-2 py-2.5 text-right">Bonos</th>
                        <th className="px-2 py-2.5 text-right">Horas extra</th>
                        <th className="px-2 py-2.5 text-right">Prestaciones</th>
                        <th className="px-2 py-2.5 text-right">Cargas patronales</th>
                        <th className="px-2 py-2.5 text-right">Otros</th>
                        <th className="px-3 py-2.5 text-right">Total</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {empleados.map((e) => (
                        <tr key={e.id} className="border-t border-ink-100">
                          <td className="px-5 py-2 text-ink-700">{e.nombre}</td>
                          {CAMPOS.map((campo) => (
                            <td key={campo} className="px-1 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={valorCelda(e.id, campo)}
                                onChange={(ev) => setCelda(e.id, campo, ev.target.value)}
                                className="w-24 rounded-md border border-ink-200 px-1.5 py-1 text-right text-xs"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right text-xs font-semibold tabular text-ink-900">{formatCurrency(costoTotalFila(e.id))}</td>
                          <td className="px-3 py-2 text-right">
                            <Button size="sm" variant="secondary" onClick={() => guardarFila(e.id)} disabled={guardandoEmpleado === e.id}>
                              {guardandoEmpleado === e.id ? "…" : "Guardar"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
