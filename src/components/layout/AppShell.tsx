import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLES_INFO, secciones } from "@/lib/roles";
import { Button } from "@/components/ui/Button";
import logo from "@/assets/logo-bianco-storico.png";

interface NavItem {
  to: string;
  label: string;
}

export function AppShell({ navItems, titulo }: { navItems: NavItem[]; titulo: string }) {
  const { nombre, roles, signOut } = useAuth();
  const misSecciones = secciones(roles);

  return (
    <div className="flex min-h-screen bg-ink-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-ink-200 bg-white">
        <div className="border-b border-ink-100 px-5 py-5">
          <img src={logo} alt="Bianco Storico" className="h-6 w-auto" />
          <p className="mt-2 text-xs text-ink-500">{titulo}</p>
        </div>

        {misSecciones.length > 1 && (
          <div className="flex flex-wrap gap-1 border-b border-ink-100 px-3 py-3">
            {misSecciones.map((s) => (
              <NavLink
                key={s.codigo}
                to={s.ruta}
                className={({ isActive }) =>
                  `rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    isActive ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                  }`
                }
              >
                {s.nombre}
              </NavLink>
            ))}
          </div>
        )}

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink-100 px-5 py-4">
          <p className="text-sm font-medium text-ink-800">{nombre ?? "Usuario"}</p>
          <p className="text-xs text-ink-500">
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
