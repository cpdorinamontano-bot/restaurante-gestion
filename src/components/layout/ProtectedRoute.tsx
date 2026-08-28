import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { RolCodigo } from "@/lib/roles";

export function ProtectedRoute({
  allow,
  children,
}: {
  allow: RolCodigo[];
  children: React.ReactNode;
}) {
  const { session, roles, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Cargando…</div>;
  }
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.some((r) => allow.includes(r))) {
    return <Navigate to="/sin-acceso" replace />;
  }
  return <>{children}</>;
}
