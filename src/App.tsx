import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

import Login from "@/pages/Login";
import SinAcceso from "@/pages/SinAcceso";

import Hoy from "@/pages/pao/Hoy";
import VentaForm from "@/pages/pao/VentaForm";
import CompraForm from "@/pages/pao/CompraForm";
import GastoForm from "@/pages/pao/GastoForm";
import CajaForm from "@/pages/pao/CajaForm";
import InventarioForm from "@/pages/pao/InventarioForm";
import DocumentoForm from "@/pages/pao/DocumentoForm";
import CierreDiario from "@/pages/pao/CierreDiario";

import DashboardDireccion from "@/pages/direccion/DashboardDireccion";

import DashboardFinanzas from "@/pages/finanzas/DashboardFinanzas";
import CierreMensual from "@/pages/finanzas/CierreMensual";

import Usuarios from "@/pages/admin/Usuarios";

const queryClient = new QueryClient();

const NAV_PAO = [
  { to: "/pao", label: "Hoy" },
  { to: "/pao/ventas", label: "Ventas" },
  { to: "/pao/compras", label: "Compras" },
  { to: "/pao/gastos", label: "Gastos" },
  { to: "/pao/caja", label: "Caja" },
  { to: "/pao/inventario", label: "Inventario" },
  { to: "/pao/documentos", label: "Documentos" },
  { to: "/pao/cierre-diario", label: "Cierre del día" },
];

const NAV_DIRECCION = [{ to: "/direccion", label: "Rentabilidad" }];

const NAV_FINANZAS = [
  { to: "/finanzas", label: "Panel" },
  { to: "/finanzas/cierre-mensual", label: "Cierre mensual" },
];

const NAV_ADMIN = [{ to: "/admin", label: "Usuarios y permisos" }];

function RedirectHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect) navigate(redirect, { replace: true });
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <RedirectHandler />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/sin-acceso" element={<SinAcceso />} />

            <Route
              path="/pao"
              element={
                <ProtectedRoute allow={["admin_pao", "admin_sistema"]}>
                  <AppShell navItems={NAV_PAO} titulo="Administración / PAO" />
                </ProtectedRoute>
              }
            >
              <Route index element={<Hoy />} />
              <Route path="ventas" element={<VentaForm />} />
              <Route path="compras" element={<CompraForm />} />
              <Route path="gastos" element={<GastoForm />} />
              <Route path="caja" element={<CajaForm />} />
              <Route path="inventario" element={<InventarioForm />} />
              <Route path="documentos" element={<DocumentoForm />} />
              <Route path="cierre-diario" element={<CierreDiario />} />
            </Route>

            <Route
              path="/direccion"
              element={
                <ProtectedRoute allow={["direccion", "admin_sistema"]}>
                  <AppShell navItems={NAV_DIRECCION} titulo="Dirección" />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardDireccion />} />
            </Route>

            <Route
              path="/finanzas"
              element={
                <ProtectedRoute allow={["finanzas", "admin_sistema"]}>
                  <AppShell navItems={NAV_FINANZAS} titulo="Finanzas" />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardFinanzas />} />
              <Route path="cierre-mensual" element={<CierreMensual />} />
            </Route>

            <Route
              path="/admin"
              element={
                <ProtectedRoute allow={["admin_sistema"]}>
                  <AppShell navItems={NAV_ADMIN} titulo="Administrador del sistema" />
                </ProtectedRoute>
              }
            >
              <Route index element={<Usuarios />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
