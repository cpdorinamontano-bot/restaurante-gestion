import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLES_INFO } from "@/lib/roles";
import { Button } from "@/components/ui/Button";

interface NavItem {
  to: string;
  label: string;
}

export function AppShell({ navItems, titulo }: { navItems: NavItem[]; titulo: string }) {
  const { nombre, roles, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-5">
          <p className="text-sm font-semibold text-slate-900">Bianco Storico</p>
          <p className="text-xs text-slate-500">{titulo}</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-sm font-medium text-slate-800">{nombre ?? "Usuario"}</p>
          <p className="text-xs text-slate-500">
            {roles.map((r) => ROLES_INFO[r].nombre).join(", ") || "Sin rol asignado"}
          </p>
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => signOut()}>
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
