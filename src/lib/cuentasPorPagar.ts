import { supabase } from "@/lib/supabase";

export interface CuentaPorPagar {
  id: string;
  proveedorNombre: string;
  fechaEmision: string;
  fechaVencimiento: string;
  importeOriginal: number;
  totalPagado: number;
  saldo: number;
  diasVencidos: number;
  estatus: "PAGADO" | "PARCIAL" | "VENCIDO" | "POR_VENCER";
  rangoAntiguedad: "PAGADO" | "0-30" | "31-60" | "61-90" | "MAS_90";
}

export async function fetchCuentasPorPagar(): Promise<CuentaPorPagar[]> {
  const { data, error } = await supabase
    .from("v_cxp_antiguedad")
    .select("*")
    .order("dias_vencidos", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.cuenta_por_pagar_id,
    proveedorNombre: r.proveedor_nombre,
    fechaEmision: r.fecha_emision,
    fechaVencimiento: r.fecha_vencimiento,
    importeOriginal: Number(r.importe_original),
    totalPagado: Number(r.total_pagado),
    saldo: Number(r.saldo),
    diasVencidos: r.dias_vencidos,
    estatus: r.estatus_cxp,
    rangoAntiguedad: r.rango_antiguedad,
  }));
}

export async function registrarPago(input: { cuentaPorPagarId: string; fecha: string; importe: number; usuarioId?: string; referencia?: string }) {
  const { error } = await supabase.from("pagos_proveedores").insert({
    cuenta_por_pagar_id: input.cuentaPorPagarId,
    fecha: input.fecha,
    importe: input.importe,
    referencia: input.referencia || null,
    usuario_id: input.usuarioId,
  });
  if (error) throw error;
}
