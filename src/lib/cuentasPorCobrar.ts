import { supabase } from "@/lib/supabase";

export interface CuentaPorCobrar {
  id: string;
  clienteId: string;
  clienteNombre: string;
  concepto: string | null;
  fechaEmision: string;
  fechaVencimiento: string;
  importeOriginal: number;
  totalCobrado: number;
  saldo: number;
  diasVencidos: number;
  estatus: "PAGADO" | "PARCIAL" | "VENCIDO" | "POR_VENCER";
  rangoAntiguedad: "PAGADO" | "0-30" | "31-60" | "61-90" | "MAS_90";
}

export async function fetchCuentasPorCobrar(): Promise<CuentaPorCobrar[]> {
  const { data, error } = await supabase
    .from("v_cxc_antiguedad")
    .select("*")
    .order("dias_vencidos", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.cuenta_por_cobrar_id,
    clienteId: r.cliente_id,
    clienteNombre: r.cliente_nombre,
    concepto: r.concepto,
    fechaEmision: r.fecha_emision,
    fechaVencimiento: r.fecha_vencimiento,
    importeOriginal: Number(r.importe_original),
    totalCobrado: Number(r.total_cobrado),
    saldo: Number(r.saldo),
    diasVencidos: r.dias_vencidos,
    estatus: r.estatus_cxc,
    rangoAntiguedad: r.rango_antiguedad,
  }));
}

export async function crearCuentaPorCobrar(input: {
  clienteId: string;
  concepto: string;
  fechaEmision: string;
  fechaVencimiento: string;
  importeOriginal: number;
  userId?: string;
}) {
  const { error } = await supabase.from("cuentas_por_cobrar").insert({
    cliente_id: input.clienteId,
    concepto: input.concepto || null,
    fecha_emision: input.fechaEmision,
    fecha_vencimiento: input.fechaVencimiento,
    importe_original: input.importeOriginal,
    created_by: input.userId,
    updated_by: input.userId,
  });
  if (error) throw error;
}

export async function registrarCobro(input: { cuentaPorCobrarId: string; fecha: string; importe: number; usuarioId?: string; referencia?: string }) {
  const { error } = await supabase.from("cobros_clientes").insert({
    cuenta_por_cobrar_id: input.cuentaPorCobrarId,
    fecha: input.fecha,
    importe: input.importe,
    referencia: input.referencia || null,
    usuario_id: input.usuarioId,
  });
  if (error) throw error;
}
