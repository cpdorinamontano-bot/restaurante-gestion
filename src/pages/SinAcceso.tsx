import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";

export default function SinAcceso() {
  const { signOut } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-50 text-center">
      <h1 className="text-lg font-semibold text-ink-900">Sin acceso</h1>
      <p className="max-w-sm text-sm text-ink-500">
        Tu usuario no tiene un rol asignado en el sistema. Contacta al administrador para que te asigne
        un perfil (PAO, Dirección, Finanzas o Administrador).
      </p>
      <Button variant="secondary" onClick={() => signOut()}>
        Cerrar sesión
      </Button>
    </div>
  );
}
