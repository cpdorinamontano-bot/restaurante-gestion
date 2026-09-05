import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { ArrowUpRight } from "lucide-react";

interface Reporte {
  to: string;
  titulo: string;
  resumen: string;
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
        to: "/finanzas/reporte-mensual",
        titulo: "Reporte Gerencial Mensual",
        resumen: "El reporte fijo de cada mes, listo para exportar en PDF o Excel.",
      },
      {
        to: "/finanzas/acumulado",
        titulo: "Mes a mes y acumulado",
        resumen: "Comparativo de varios meses en una sola tabla, con drill-down diario.",
      },
      {
        to: "/finanzas/estado-resultados",
        titulo: "Estado de Resultados",
        resumen: "El P&L completo del año, mes por mes, con total.",
      },
      {
        to: "/direccion",
        titulo: "Rentabilidad",
        resumen: "¿Cuánto vendimos, cuánto costó, cuánto ganamos? Una vista rápida.",
      },
      {
        to: "/finanzas/presupuestos",
        titulo: "Presupuestos",
        resumen: "Lo real contra el objetivo del mes, por concepto.",
      },
    ],
  },
  {
    nombre: "Bancos y caja",
    reportes: [
      {
        to: "/finanzas/bancos",
        titulo: "Bancos",
        resumen: "Movimientos bancarios línea por línea, por mes.",
      },
      {
        to: "/finanzas/caja",
        titulo: "Caja",
        resumen: "Entradas y salidas de efectivo, por mes.",
      },
      {
        to: "/finanzas/estados-cuenta",
        titulo: "Estados de cuenta",
        resumen: "Conciliación del saldo bancario contra el estado de cuenta.",
      },
    ],
  },
  {
    nombre: "Gastos y cierre",
    reportes: [
      {
        to: "/finanzas/gastos",
        titulo: "Gastos",
        resumen: "Cada gasto capturado, con su categoría y estatus.",
      },
      {
        to: "/finanzas/cierre-mensual",
        titulo: "Cierre mensual",
        resumen: "Checklist y aprobación del mes antes de darlo por cerrado.",
      },
    ],
  },
];

export default function CatalogoReportes() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Catálogo de reportes</h1>
        <p className="text-sm text-ink-500">Todo lo que puedes consultar, en un solo lugar.</p>
      </div>

      {CATEGORIAS.map((cat) => (
        <div key={cat.nombre}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">{cat.nombre}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {cat.reportes.map((r) => (
              <Link key={r.to} to={r.to}>
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
      ))}
    </div>
  );
}
