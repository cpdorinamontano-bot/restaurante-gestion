import { supabase } from "@/lib/supabase";

export interface ActivoFijo {
  id: string;
  nombre: string;
  tipo: string;
  fechaInicio: string; // YYYY-MM-DD
  costo: number;
  vidaUtilMeses: number;
  valorResidual: number;
  notas: string | null;
}

export function depreciacionMensual(activo: Pick<ActivoFijo, "costo" | "valorResidual" | "vidaUtilMeses">): number {
  return Math.max(0, (activo.costo - activo.valorResidual) / activo.vidaUtilMeses);
}

function primerDiaMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function fechaFinDepreciacion(activo: Pick<ActivoFijo, "fechaInicio" | "vidaUtilMeses">): Date {
  const inicio = new Date(`${activo.fechaInicio}T00:00:00`);
  return new Date(inicio.getFullYear(), inicio.getMonth() + activo.vidaUtilMeses, inicio.getDate());
}

/** Depreciación aplicable en un mes dado (0 si el activo no ha iniciado o ya se depreció por completo). */
export function depreciacionEnPeriodo(activo: ActivoFijo, periodoISO: string): number {
  const periodo = primerDiaMes(new Date(`${periodoISO}T00:00:00`));
  const inicio = primerDiaMes(new Date(`${activo.fechaInicio}T00:00:00`));
  const fin = primerDiaMes(fechaFinDepreciacion(activo));
  if (periodo < inicio || periodo >= fin) return 0;
  return depreciacionMensual(activo);
}

export async function fetchActivosFijos(sucursalId: string): Promise<ActivoFijo[]> {
  const { data, error } = await supabase
    .from("activos_fijos")
    .select("*")
    .eq("sucursal_id", sucursalId)
    .eq("estatus", "activo")
    .order("fecha_inicio", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((a: any) => ({
    id: a.id,
    nombre: a.nombre,
    tipo: a.tipo,
    fechaInicio: a.fecha_inicio,
    costo: Number(a.costo),
    vidaUtilMeses: a.vida_util_meses,
    valorResidual: Number(a.valor_residual),
    notas: a.notas,
  }));
}

export async function crearActivoFijo(input: {
  sucursalId: string;
  nombre: string;
  tipo: string;
  fechaInicio: string;
  costo: number;
  vidaUtilMeses: number;
  valorResidual: number;
  userId?: string;
}) {
  const { error } = await supabase.from("activos_fijos").insert({
    sucursal_id: input.sucursalId,
    nombre: input.nombre,
    tipo: input.tipo,
    fecha_inicio: input.fechaInicio,
    costo: input.costo,
    vida_util_meses: input.vidaUtilMeses,
    valor_residual: input.valorResidual,
    created_by: input.userId,
    updated_by: input.userId,
  });
  if (error) throw error;
}

export async function darDeBajaActivoFijo(id: string) {
  const { error } = await supabase.from("activos_fijos").update({ estatus: "baja" }).eq("id", id);
  if (error) throw error;
}
