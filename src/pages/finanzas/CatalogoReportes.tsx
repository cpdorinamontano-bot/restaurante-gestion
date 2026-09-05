import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowUpRight } from "lucide-react";

interface DatoReporte {
  nombre: string;
  cubierto: boolean;
}

interface Reporte {
  to: string;
  titulo: string;
  resumen: string;
  contiene: DatoReporte[];
}

const REPORTES: Reporte[] = [
  {
    to: "/finanzas/reporte-mensual",
    titulo: "Reporte Gerencial Mensual",
    resumen: "El reporte fijo de cada mes — lo que se exporta en PDF/Excel para enviar al cierre.",
    contiene: [
      { nombre: "Ventas totales y ventas netas", cubierto: true },
      { nombre: "Compras / costo de mercadería vendida, por categoría", cubierto: true },
      { nombre: "Food cost % (real y teórico)", cubierto: true },
      { nombre: "Margen bruto $ y %", cubierto: true },
      { nombre: "Sueldos, cargas y costo laboral $ y %", cubierto: true },
      { nombre: "Gastos fijos detallados por concepto", cubierto: true },
      { nombre: "Gastos variables y otros operativos", cubierto: true },
      { nombre: "Resultado operativo $ y %", cubierto: true },
      { nombre: "Impuestos y otros conceptos", cubierto: true },
      { nombre: "Ganancia / pérdida neta $ y %", cubierto: true },
      { nombre: "Flujo de efectivo del mes", cubierto: true },
      { nombre: "Cuentas por pagar a proveedores al cierre", cubierto: true },
      { nombre: "Impuestos/obligaciones pendientes al cierre", cubierto: true },
      { nombre: "Comparativo vs. mes anterior (6 indicadores clave)", cubierto: true },
    ],
  },
  {
    to: "/finanzas/acumulado",
    titulo: "Mes a mes y acumulado",
    resumen: "Las mismas líneas del reporte mensual, lado a lado por mes + columna acumulada, con desglose diario.",
    contiene: [
      { nombre: "Comparación de varios meses en una sola tabla", cubierto: true },
      { nombre: "Columna acumulada (suma real, no promedio)", cubierto: true },
      { nombre: "Desglose día a día por doble clic (ventas, compras, gastos, flujo)", cubierto: true },
    ],
  },
  {
    to: "/finanzas/estado-resultados",
    titulo: "Estado de Resultados",
    resumen: "El P&L en 12 columnas (Ene–Dic) más Total, separando la utilidad del negocio de los dividendos y retiros de socios.",
    contiene: [
      { nombre: "Costo de Ventas: Compras + Mano de obra", cubierto: true },
      { nombre: "Gastos Generales por concepto (Propinas, Comisiones, Fijos, Mantenimiento, Impuestos, Otros)", cubierto: true },
      { nombre: "Utilidad financiera $ y % (antes de retiros de socios)", cubierto: true },
      { nombre: "Dividendos y retiros de socios separados de la operación", cubierto: true },
      { nombre: "Utilidad neta $ y % (después de retiros de socios)", cubierto: true },
    ],
  },
  {
    to: "/direccion",
    titulo: "Rentabilidad (Dirección)",
    resumen: "Vista rápida para la dueña: ¿cuánto vendimos, cuánto costó, cuánto ganamos?",
    contiene: [
      { nombre: "Tendencia de 6 meses (ventas y resultado operativo %)", cubierto: true },
      { nombre: "Desviación food cost real vs. teórico", cubierto: true },
      { nombre: "Liquidez: disponibilidad bancaria, caja, CxP", cubierto: true },
    ],
  },
  {
    to: "/finanzas/presupuestos",
    titulo: "Presupuestos",
    resumen: "Objetivo mensual por concepto (ventas, food cost %, costo laboral %, gastos, utilidad) vs. lo real, con variación.",
    contiene: [
      { nombre: "Generar presupuestos por mes", cubierto: true },
      { nombre: "Variación real vs. objetivo, con semáforo", cubierto: true },
    ],
  },
  {
    to: "/finanzas/estados-cuenta",
    titulo: "Estados de cuenta",
    resumen: "Sube el PDF del banco, captura el saldo final real y el sistema lo concilia contra el saldo calculado.",
    contiene: [
      { nombre: "Carga de estados de cuenta en PDF", cubierto: true },
      { nombre: "Saldo bancario conciliado contra el ledger de movimientos", cubierto: true },
    ],
  },
  {
    to: "/finanzas/bancos",
    titulo: "Bancos",
    resumen: "Detalle línea por línea de cada movimiento bancario, filtrable por mes — la fuente cruda detrás de los totales.",
    contiene: [
      { nombre: "Movimientos individuales con concepto y categoría", cubierto: true },
      { nombre: "Saldo actual de la cuenta", cubierto: true },
    ],
  },
  {
    to: "/finanzas/caja",
    titulo: "Caja",
    resumen: "Detalle línea por línea de cada movimiento de efectivo en caja, filtrable por mes.",
    contiene: [
      { nombre: "Movimientos individuales (entradas y salidas)", cubierto: true },
      { nombre: "Entradas, salidas y neto del mes", cubierto: true },
    ],
  },
  {
    to: "/finanzas/gastos",
    titulo: "Gastos",
    resumen: "Detalle línea por línea de cada gasto capturado, filtrable por mes, con top categorías.",
    contiene: [
      { nombre: "Gastos individuales con categoría y estatus de pago", cubierto: true },
    ],
  },
  {
    to: "/finanzas/cierre-mensual",
    titulo: "Cierre mensual",
    resumen: "Checklist y flujo de aprobación del mes (abierto → en revisión → validado → cerrado), con motivo obligatorio para reabrir.",
    contiene: [
      { nombre: "Checklist de 12 puntos antes de cerrar el mes", cubierto: true },
      { nombre: "Generación de alertas y snapshot de KPIs del periodo", cubierto: true },
    ],
  },
];

export default function CatalogoReportes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Catálogo de reportes</h1>
        <p className="text-sm text-ink-500">Todo lo que el sistema calcula hoy, y qué pantalla lo muestra.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {REPORTES.map((r) => (
          <Card key={r.to}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>{r.titulo}</CardTitle>
                <p className="mt-1 text-xs text-ink-500">{r.resumen}</p>
              </div>
              <Link
                to={r.to}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-ink-300 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50"
              >
                Abrir <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {r.contiene.map((d) => (
                  <li key={d.nombre} className="flex items-start gap-2 text-sm text-ink-700">
                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${d.cubierto ? "bg-brand-500" : "bg-ink-300"}`} />
                    {d.nombre}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
