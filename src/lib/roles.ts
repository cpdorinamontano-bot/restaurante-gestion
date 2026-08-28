export type RolCodigo = "admin_pao" | "direccion" | "finanzas" | "admin_sistema";

export const ROLES_INFO: Record<RolCodigo, { nombre: string; ruta: string }> = {
  admin_pao: { nombre: "Administración / PAO", ruta: "/pao" },
  direccion: { nombre: "Dirección", ruta: "/direccion" },
  finanzas: { nombre: "Finanzas", ruta: "/finanzas" },
  admin_sistema: { nombre: "Administrador del sistema", ruta: "/admin" },
};

export function rutaPrincipal(roles: RolCodigo[]): string {
  if (roles.includes("admin_pao")) return "/pao";
  if (roles.includes("finanzas")) return "/finanzas";
  if (roles.includes("direccion")) return "/direccion";
  if (roles.includes("admin_sistema")) return "/admin";
  return "/sin-acceso";
}
