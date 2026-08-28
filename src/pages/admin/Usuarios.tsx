import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ROLES_INFO, type RolCodigo } from "@/lib/roles";

interface UsuarioRow {
  id: string;
  nombre: string;
  email: string;
  roles: RolCodigo[];
}

const TODOS_ROLES: RolCodigo[] = ["admin_pao", "direccion", "finanzas", "admin_sistema"];

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [rolesCatalogo, setRolesCatalogo] = useState<{ id: string; codigo: RolCodigo }[]>([]);
  const [loading, setLoading] = useState(true);

  async function cargar() {
    setLoading(true);
    const [{ data: usuariosData }, { data: rolesData }, { data: usuariosRolesData }] = await Promise.all([
      supabase.from("usuarios").select("id, nombre, email").eq("estatus", "activo").order("nombre"),
      supabase.from("roles").select("id, codigo"),
      supabase.from("usuarios_roles").select("usuario_id, roles(codigo)"),
    ]);
    setRolesCatalogo(rolesData ?? []);
    const rolesPorUsuario = new Map<string, RolCodigo[]>();
    (usuariosRolesData ?? []).forEach((r: any) => {
      const arr = rolesPorUsuario.get(r.usuario_id) ?? [];
      if (r.roles?.codigo) arr.push(r.roles.codigo);
      rolesPorUsuario.set(r.usuario_id, arr);
    });
    setUsuarios(
      (usuariosData ?? []).map((u) => ({ ...u, roles: rolesPorUsuario.get(u.id) ?? [] }))
    );
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function asignarRol(usuarioId: string, codigo: RolCodigo) {
    const rol = rolesCatalogo.find((r) => r.codigo === codigo);
    if (!rol) return;
    await supabase.from("usuarios_roles").insert({ usuario_id: usuarioId, rol_id: rol.id });
    cargar();
  }

  async function quitarRol(usuarioId: string, codigo: RolCodigo) {
    const rol = rolesCatalogo.find((r) => r.codigo === codigo);
    if (!rol) return;
    await supabase.from("usuarios_roles").delete().eq("usuario_id", usuarioId).eq("rol_id", rol.id);
    cargar();
  }

  if (loading) return <p className="text-sm text-ink-500">Cargando…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink-900">Usuarios y permisos</h1>
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {usuarios.map((u) => (
            <div key={u.id} className="flex flex-col gap-2 border-b border-ink-100 pb-4 last:border-0 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-ink-800">{u.nombre}</p>
                <p className="text-xs text-ink-500">{u.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {u.roles.map((r) => (
                  <Badge key={r} tone="verde">
                    <button onClick={() => quitarRol(u.id, r)} title="Quitar rol">
                      {ROLES_INFO[r].nombre} ✕
                    </button>
                  </Badge>
                ))}
                <Select
                  className="w-auto text-xs"
                  value=""
                  onChange={(e) => e.target.value && asignarRol(u.id, e.target.value as RolCodigo)}
                >
                  <option value="">+ Asignar rol</option>
                  {TODOS_ROLES.filter((r) => !u.roles.includes(r)).map((r) => (
                    <option key={r} value={r}>
                      {ROLES_INFO[r].nombre}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
