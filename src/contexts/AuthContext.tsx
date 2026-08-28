import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { RolCodigo } from "@/lib/roles";

interface AuthState {
  session: Session | null;
  roles: RolCodigo[];
  nombre: string | null;
  sucursalId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<RolCodigo[]>([]);
  const [nombre, setNombre] = useState<string | null>(null);
  const [sucursalId, setSucursalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function cargarPerfil(userId: string) {
    const [{ data: usuario }, { data: rolesRows }] = await Promise.all([
      supabase.from("usuarios").select("nombre").eq("id", userId).maybeSingle(),
      supabase.from("usuarios_roles").select("roles(codigo)").eq("usuario_id", userId),
    ]);
    setNombre(usuario?.nombre ?? null);
    const codigos = (rolesRows ?? [])
      .map((r: any) => r.roles?.codigo)
      .filter(Boolean) as RolCodigo[];
    setRoles(codigos);

    const { data: sucursal } = await supabase
      .from("sucursales")
      .select("id")
      .eq("estatus", "activo")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    setSucursalId(sucursal?.id ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await cargarPerfil(data.session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setLoading(true);
        await cargarPerfil(newSession.user.id);
        setLoading(false);
      } else {
        setRoles([]);
        setNombre(null);
        setSucursalId(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, roles, nombre, sucursalId, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
