export type RolCodigo = "admin_pao" | "direccion" | "finanzas" | "admin_sistema";

export const ROLES_INFO: Record<RolCodigo, { nombre: string; ruta: string }> = {
  admin_pao: { nombre: "Administración", ruta: "/administracion" },
  direccion: { nombre: "Dirección", ruta: "/direccion" },
  finanzas: { nombre: "Finanzas", ruta: "/finanzas" },
  admin_sistema: { nombre: "Administrador del sistema", ruta: "/admin" },
};

export function rutaPrincipal(roles: RolCodigo[]): string {
  if (roles.includes("finanzas")) return "/finanzas";
  if (roles.includes("direccion")) return "/direccion";
  if (roles.includes("admin_pao")) return "/administracion";
  if (roles.includes("admin_sistema")) return "/admin";
  return "/sin-acceso";
}

export function secciones(roles: RolCodigo[]): { codigo: RolCodigo; nombre: string; ruta: string }[] {
  const orden: RolCodigo[] = ["finanzas", "direccion", "admin_pao", "admin_sistema"];
  return orden.filter((r) => roles.includes(r)).map((r) => ({ codigo: r, ...ROLES_INFO[r] }));
}
