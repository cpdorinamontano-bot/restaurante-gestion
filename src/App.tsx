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

import ResumenSocios from "@/pages/socios/ResumenSocios";

import DashboardFinanzas from "@/pages/finanzas/DashboardFinanzas";
import CierreMensual from "@/pages/finanzas/CierreMensual";
import Bancos from "@/pages/finanzas/Bancos";
import Caja from "@/pages/finanzas/Caja";
import GastosLista from "@/pages/finanzas/Gastos";
import ReporteMensual from "@/pages/finanzas/ReporteMensual";
import ReporteAcumulado from "@/pages/finanzas/ReporteAcumulado";
import EstadoResultados from "@/pages/finanzas/EstadoResultados";
import EstadosCuenta from "@/pages/finanzas/EstadosCuenta";
import Presupuestos from "@/pages/finanzas/Presupuestos";
import InventarioMensual from "@/pages/finanzas/InventarioMensual";
import ActivosDepreciacion from "@/pages/finanzas/ActivosDepreciacion";
import Impuestos from "@/pages/finanzas/Impuestos";
import CuentasPorCobrarPagar from "@/pages/finanzas/CuentasPorCobrarPagar";
import CatalogoReportes from "@/pages/finanzas/CatalogoReportes";

import Usuarios from "@/pages/admin/Usuarios";

const queryClient = new QueryClient();

const NAV_ADMINISTRACION = [
  { to: "/administracion", label: "Hoy" },
  { to: "/administracion/ventas", label: "Ventas" },
  { to: "/administracion/compras", label: "Compras" },
  { to: "/administracion/gastos", label: "Gastos" },
  { to: "/administracion/caja", label: "Caja" },
  { to: "/administracion/inventario", label: "Inventario" },
  { to: "/administracion/documentos", label: "Documentos" },
  { to: "/administracion/cierre-diario", label: "Cierre del día" },
];

const NAV_DIRECCION = [
  { to: "/direccion/utilidad", label: "Utilidad y Márgenes" },
  { to: "/direccion", label: "Rentabilidad" },
  { to: "/direccion/catalogo", label: "Catálogo de reportes" },
  { to: "/direccion/reporte-mensual", label: "Reporte mensual" },
  { to: "/direccion/acumulado", label: "Mes a mes y acumulado" },
  { to: "/direccion/estado-resultados", label: "Estado de Resultados" },
  { to: "/direccion/cuentas", label: "Cuentas por cobrar y pagar" },
];

const NAV_FINANZAS = [
  { to: "/finanzas/utilidad", label: "Utilidad y Márgenes" },
  { to: "/finanzas", label: "Panel" },
  { to: "/finanzas/catalogo", label: "Catálogo de reportes" },
  { to: "/finanzas/reporte-mensual", label: "Reporte mensual" },
  { to: "/finanzas/acumulado", label: "Mes a mes y acumulado" },
  { to: "/finanzas/estado-resultados", label: "Estado de Resultados" },
  { to: "/finanzas/bancos", label: "Bancos" },
  { to: "/finanzas/caja", label: "Caja" },
  { to: "/finanzas/estados-cuenta", label: "Estados de cuenta" },
  { to: "/finanzas/presupuestos", label: "Presupuestos" },
  { to: "/finanzas/gastos", label: "Gastos" },
  { to: "/finanzas/inventario-mensual", label: "Inventario mensual" },
  { to: "/finanzas/activos", label: "Activos y depreciación" },
  { to: "/finanzas/impuestos", label: "Impuestos" },
  { to: "/finanzas/cuentas", label: "Cuentas por cobrar y pagar" },
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
              path="/administracion"
              element={
                <ProtectedRoute allow={["admin_pao", "admin_sistema"]}>
                  <AppShell navItems={NAV_ADMINISTRACION} titulo="Administración" />
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
              <Route path="utilidad" element={<ResumenSocios />} />
              <Route path="catalogo" element={<CatalogoReportes />} />
              <Route path="reporte-mensual" element={<ReporteMensual />} />
              <Route path="acumulado" element={<ReporteAcumulado />} />
              <Route path="estado-resultados" element={<EstadoResultados />} />
              <Route path="cuentas" element={<CuentasPorCobrarPagar />} />
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
              <Route path="utilidad" element={<ResumenSocios />} />
              <Route path="catalogo" element={<CatalogoReportes />} />
              <Route path="reporte-mensual" element={<ReporteMensual />} />
              <Route path="acumulado" element={<ReporteAcumulado />} />
              <Route path="estado-resultados" element={<EstadoResultados />} />
              <Route path="bancos" element={<Bancos />} />
              <Route path="caja" element={<Caja />} />
              <Route path="estados-cuenta" element={<EstadosCuenta />} />
              <Route path="presupuestos" element={<Presupuestos />} />
              <Route path="gastos" element={<GastosLista />} />
              <Route path="inventario-mensual" element={<InventarioMensual />} />
              <Route path="activos" element={<ActivosDepreciacion />} />
              <Route path="impuestos" element={<Impuestos />} />
              <Route path="cuentas" element={<CuentasPorCobrarPagar />} />
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
