import { supabase } from "@/lib/supabase";

export interface ImpuestoPeriodo {
  id: string;
  periodo: string; // YYYY-MM-01
  tipoImpuesto: string;
  importeCausado: number;
  importePagado: number;
  fechaPago: string | null;
  notas: string | null;
  pendiente: number;
  estado: "PAGADO" | "PARCIAL" | "PENDIENTE";
}

function conDerivados(row: any): ImpuestoPeriodo {
  const importeCausado = Number(row.importe_causado);
  const importePagado = Number(row.importe_pagado);
  const pendiente = Math.max(0, importeCausado - importePagado);
  const estado: ImpuestoPeriodo["estado"] = pendiente <= 0 ? "PAGADO" : importePagado > 0 ? "PARCIAL" : "PENDIENTE";
  return {
    id: row.id,
    periodo: row.periodo,
    tipoImpuesto: row.tipo_impuesto,
    importeCausado,
    importePagado,
    fechaPago: row.fecha_pago,
    notas: row.notas,
    pendiente,
    estado,
  };
}

export async function fetchImpuestosAnio(sucursalId: string, anio: number): Promise<ImpuestoPeriodo[]> {
  const { data, error } = await supabase
    .from("impuestos_periodo")
    .select("*")
    .eq("sucursal_id", sucursalId)
    .eq("estatus", "activo")
    .gte("periodo", `${anio}-01-01`)
    .lte("periodo", `${anio}-12-31`)
    .order("periodo", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(conDerivados);
}

export async function crearImpuesto(input: {
  sucursalId: string;
  periodo: string;
  tipoImpuesto: string;
  importeCausado: number;
  importePagado: number;
  fechaPago?: string | null;
  userId?: string;
}) {
  const { error } = await supabase.from("impuestos_periodo").insert({
    sucursal_id: input.sucursalId,
    periodo: input.periodo,
    tipo_impuesto: input.tipoImpuesto,
    importe_causado: input.importeCausado,
    importe_pagado: input.importePagado,
    fecha_pago: input.fechaPago ?? null,
    created_by: input.userId,
    updated_by: input.userId,
  });
  if (error) throw error;
}

export async function actualizarPago(id: string, importePagado: number, fechaPago: string | null) {
  const { error } = await supabase.from("impuestos_periodo").update({ importe_pagado: importePagado, fecha_pago: fechaPago }).eq("id", id);
  if (error) throw error;
}

export async function eliminarImpuesto(id: string) {
  const { error } = await supabase.from("impuestos_periodo").update({ estatus: "baja" }).eq("id", id);
  if (error) throw error;
}
