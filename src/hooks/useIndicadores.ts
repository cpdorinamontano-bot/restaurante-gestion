import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

function primerDiaMes(fecha = new Date()) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1).toISOString().slice(0, 10);
}

export function useFoodCostReal(sucursalId: string | null, periodo = primerDiaMes()) {
  return useQuery({
    queryKey: ["food_cost_real", sucursalId, periodo],
    enabled: !!sucursalId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_food_cost_real", { p_sucursal_id: sucursalId as string, p_periodo: periodo });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function useFoodCostTeorico(sucursalId: string | null, periodo = primerDiaMes()) {
  return useQuery({
    queryKey: ["food_cost_teorico", sucursalId, periodo],
    enabled: !!sucursalId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_food_cost_teorico", { p_sucursal_id: sucursalId as string, p_periodo: periodo });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function useLaborCost(sucursalId: string | null, periodo = primerDiaMes()) {
  return useQuery({
    queryKey: ["labor_cost", sucursalId, periodo],
    enabled: !!sucursalId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_labor_cost", { p_sucursal_id: sucursalId as string, p_periodo: periodo });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function useResumenMes(sucursalId: string | null, periodo = primerDiaMes()) {
  return useQuery({
    queryKey: ["resumen_mes", sucursalId, periodo],
    enabled: !!sucursalId,
    queryFn: async () => {
      const inicio = periodo;
      const fin = new Date(new Date(periodo).getFullYear(), new Date(periodo).getMonth() + 1, 0).toISOString().slice(0, 10);
      const [gastos, cxp, bancos, caja] = await Promise.all([
        supabase.from("gastos").select("total").eq("sucursal_id", sucursalId!).gte("fecha", inicio).lte("fecha", fin),
        supabase.from("v_cxp_saldos").select("saldo, estatus_cxp"),
        supabase.from("cuentas_bancarias").select("saldo_actual").eq("estatus", "activo"),
        supabase.from("cierres_caja").select("saldo_fisico, fecha, caja_id").gte("fecha", inicio).lte("fecha", fin).order("fecha", { ascending: false }).limit(1),
      ]);
      const gastosTotal = (gastos.data ?? []).reduce((s, g) => s + Number(g.total ?? 0), 0);
      const cxpTotal = (cxp.data ?? []).reduce((s, c) => s + Number(c.saldo ?? 0), 0);
      const cxpVencida = (cxp.data ?? []).filter((c) => c.estatus_cxp === "VENCIDO").reduce((s, c) => s + Number(c.saldo ?? 0), 0);
      const disponibilidadBancaria = (bancos.data ?? []).reduce((s, b) => s + Number(b.saldo_actual ?? 0), 0);
      const cajaDisponible = caja.data?.[0]?.saldo_fisico ? Number(caja.data[0].saldo_fisico) : 0;
      return { gastosTotal, cxpTotal, cxpVencida, disponibilidadBancaria, cajaDisponible };
    },
  });
}
