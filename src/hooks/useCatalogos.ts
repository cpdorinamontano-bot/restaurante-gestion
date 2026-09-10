import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

async function fetchTabla(tabla: string, columnas = "*") {
  const { data, error } = await (supabase.from(tabla as any) as any)
    .select(columnas)
    .eq("estatus", "activo")
    .order("nombre");
  if (error) throw error;
  return data ?? [];
}

export function useProveedores() {
  return useQuery({ queryKey: ["proveedores"], queryFn: () => fetchTabla("proveedores") });
}

export function useClientes() {
  return useQuery({ queryKey: ["clientes"], queryFn: () => fetchTabla("clientes") });
}

export function useProductos() {
  return useQuery({ queryKey: ["productos"], queryFn: () => fetchTabla("productos") });
}

export function useCategoriasProductos() {
  return useQuery({ queryKey: ["categorias_productos"], queryFn: () => fetchTabla("categorias_productos") });
}

export function useCategoriasGastos() {
  return useQuery({ queryKey: ["categorias_gastos"], queryFn: () => fetchTabla("categorias_gastos") });
}

export function useUnidadesMedida() {
  return useQuery({
    queryKey: ["unidades_medida"],
    queryFn: async () => {
      const { data, error } = await supabase.from("unidades_medida").select("*").order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFormasPago() {
  return useQuery({ queryKey: ["formas_pago"], queryFn: () => fetchTabla("formas_pago") });
}

export function useCentrosCosto() {
  return useQuery({ queryKey: ["centros_costo"], queryFn: () => fetchTabla("centros_costo") });
}

export function useSucursales() {
  return useQuery({ queryKey: ["sucursales"], queryFn: () => fetchTabla("sucursales") });
}

export function useCajas(sucursalId: string | null) {
  return useQuery({
    queryKey: ["cajas", sucursalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cajas")
        .select("*")
        .eq("estatus", "activo")
        .eq("sucursal_id", sucursalId as string);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!sucursalId,
  });
}

export function useCuentasBancarias() {
  return useQuery({
    queryKey: ["cuentas_bancarias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cuentas_bancarias").select("*").eq("estatus", "activo").order("banco");
      if (error) throw error;
      return data ?? [];
    },
  });
}
