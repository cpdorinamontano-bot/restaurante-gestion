import { Link, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { ArrowUpRight } from "lucide-react";

type Seccion = "direccion" | "finanzas";

interface Reporte {
  ruta: string; // relativo a /direccion o /finanzas — "" apunta al índice de la sección
  titulo: string;
  resumen: string;
  disponibleEn: Seccion[];
}

interface Categoria {
  nombre: string;
  reportes: Reporte[];
}

const CATEGORIAS: Categoria[] = [
  {
    nombre: "Resultados y rentabilidad",
    reportes: [
      {
        ruta: "",
        titulo: "Rentabilidad",
        resumen: "¿Cuánto vendimos, cuánto costó, cuánto ganamos? Una vista rápida.",
        disponibleEn: ["direccion"],
      },
      {
        ruta: "utilidad",
        titulo: "Utilidad y Márgenes",
        resumen: "Utilidad operativa y retiros de socios, mes a mes y acumulado del año.",
        disponibleEn: ["direccion", "finanzas"],
      },
      {
        ruta: "reporte-mensual",
        titulo: "Reporte Gerencial Mensual",
        resumen: "Análisis, fortalezas, debilidades y recomendaciones del mes, listo para exportar en PDF o Excel.",
        disponibleEn: ["direccion", "finanzas"],
      },
      {
        ruta: "acumulado",
        titulo: "Mes a mes y acumulado",
        resumen: "Comparativo de varios meses en una sola tabla, con drill-down diario.",
        disponibleEn: ["direccion", "finanzas"],
      },
      {
        ruta: "estado-resultados",
        titulo: "Estado de Resultados",
        resumen: "El P&L completo del año, mes por mes, con total.",
        disponibleEn: ["direccion", "finanzas"],
      },
      {
        ruta: "presupuestos",
        titulo: "Presupuestos",
        resumen: "Lo real contra el objetivo del mes, por concepto.",
        disponibleEn: ["finanzas"],
      },
      {
        ruta: "cuentas",
        titulo: "Cuentas por cobrar y pagar",
        resumen: "Lo que deben los clientes y lo que se debe a proveedores, con antigüedad de saldos.",
        disponibleEn: ["direccion", "finanzas"],
      },
    ],
  },
  {
    nombre: "Bancos y caja",
    reportes: [
      {
        ruta: "bancos",
        titulo: "Bancos",
        resumen: "Movimientos bancarios línea por línea, por mes.",
        disponibleEn: ["finanzas"],
      },
      {
        ruta: "caja",
        titulo: "Caja",
        resumen: "Entradas y salidas de efectivo, por mes.",
        disponibleEn: ["finanzas"],
      },
      {
        ruta: "estados-cuenta",
        titulo: "Estados de cuenta",
        resumen: "Conciliación del saldo bancario contra el estado de cuenta.",
        disponibleEn: ["finanzas"],
      },
    ],
  },
  {
    nombre: "Gastos y cierre",
    reportes: [
      {
        ruta: "gastos",
        titulo: "Gastos",
        resumen: "Cada gasto capturado, con su categoría y estatus.",
        disponibleEn: ["finanzas"],
      },
      {
        ruta: "cierre-mensual",
        titulo: "Cierre mensual",
        resumen: "Checklist y aprobación del mes antes de darlo por cerrado.",
        disponibleEn: ["finanzas"],
      },
    ],
  },
  {
    nombre: "Costo real e impuestos",
    reportes: [
      {
        ruta: "inventario-mensual",
        titulo: "Inventario mensual",
        resumen: "Costo de insumos realmente consumido: inicial + compras − final.",
        disponibleEn: ["finanzas"],
      },
      {
        ruta: "activos",
        titulo: "Activos y depreciación",
        resumen: "Equipo y mobiliario con su depreciación mensual en línea recta.",
        disponibleEn: ["finanzas"],
      },
      {
        ruta: "impuestos",
        titulo: "Impuestos",
        resumen: "Lo causado del periodo frente a lo ya pagado.",
        disponibleEn: ["finanzas"],
      },
    ],
  },
];

export default function CatalogoReportes() {
  const location = useLocation();
  const seccion: Seccion = location.pathname.startsWith("/direccion") ? "direccion" : "finanzas";
  const base = `/${seccion}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Catálogo de reportes</h1>
        <p className="text-sm text-ink-500">Todo lo que puedes consultar, en un solo lugar.</p>
      </div>

      {CATEGORIAS.map((cat) => {
        const reportes = cat.reportes.filter((r) => r.disponibleEn.includes(seccion));
        if (!reportes.length) return null;
        return (
          <div key={cat.nombre}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">{cat.nombre}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {reportes.map((r) => (
                <Link key={r.ruta} to={r.ruta ? `${base}/${r.ruta}` : base}>
                  <Card className="h-full transition-colors hover:border-brand-300 hover:bg-brand-50/40">
                    <CardContent className="flex h-full flex-col justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-ink-900">{r.titulo}</h3>
                        <p className="mt-1 text-xs text-ink-500">{r.resumen}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">
                        Abrir <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
