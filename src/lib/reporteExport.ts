import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import type { ReporteMensual } from "@/lib/reportes";
import { formatCurrency, formatPercent } from "@/lib/utils";

function nombreMes(periodo: string) {
  return new Date(`${periodo}T00:00:00`).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function filaCaptura(label: string, monto: number | null, pct?: number | null) {
  return [label, formatCurrency(monto), pct === undefined ? "" : formatPercent(pct)];
}

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportReporteMensualPDF(r: ReporteMensual, sucursalNombre: string) {
  const doc = new jsPDF();
  const mes = nombreMes(r.periodo);

  doc.setFontSize(16);
  doc.text("Bianco Storico — Reporte Gerencial Mensual", 14, 16);
  doc.setFontSize(11);
  doc.text(`${sucursalNombre} · ${mes}`, 14, 23);

  autoTable(doc, {
    startY: 30,
    head: [["Ventas", "Monto"]],
    body: [
      ["Ventas totales (brutas)", formatCurrency(r.ventasBruta)],
      ["(-) Descuentos", formatCurrency(r.descuentos)],
      ["(-) Devoluciones", formatCurrency(r.devoluciones)],
      ["(-) Cancelaciones", formatCurrency(r.cancelaciones)],
      ["Ventas netas", formatCurrency(r.ventasNeta)],
      ["Cortesías (informativo, no resta de venta neta)", formatCurrency(r.cortesias)],
    ],
    theme: "grid",
    headStyles: { fillColor: [23, 79, 61] },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    head: [["Costo de mercadería / Food cost", "Monto", "% s/ ventas"]],
    body: [
      filaCaptura("Compras y costo de mercadería vendida (CMV)", r.cmvFuente === "sin_datos" ? null : r.cmv, r.foodCostPct),
      ...r.cmvPorCategoria.map((c) => [`  · ${c.nombre}`, formatCurrency(c.monto), ""]),
      filaCaptura("Food cost teórico (referencia, según recetas)", null, r.foodCostTeoricoPct),
      filaCaptura("Margen bruto", r.margenBruto, r.margenBrutoPct),
    ],
    theme: "grid",
    headStyles: { fillColor: [23, 79, 61] },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    head: [["Costo laboral", "Monto", "% s/ ventas"]],
    body: [
      ["Nómina (módulo de nómina)", formatCurrency(r.costoLaboralNomina), ""],
      ["Nómina registrada como gasto (histórico)", formatCurrency(r.costoLaboralGastoHistorico), ""],
      filaCaptura("Costo laboral total", r.costoLaboralTotal, r.costoLaboralPct),
    ],
    theme: "grid",
    headStyles: { fillColor: [23, 79, 61] },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    head: [["Gastos fijos", "Monto"]],
    body: [...r.gastosFijos.map((g) => [g.nombre, formatCurrency(g.monto)]), ["Total gastos fijos", formatCurrency(r.gastosFijosTotal)]],
    theme: "grid",
    headStyles: { fillColor: [23, 79, 61] },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    head: [["Gastos variables y operativos", "Monto"]],
    body: [
      ...r.gastosVariables.map((g) => [g.nombre, formatCurrency(g.monto)]),
      ["Total gastos variables/operativos", formatCurrency(r.gastosVariablesTotal)],
    ],
    theme: "grid",
    headStyles: { fillColor: [23, 79, 61] },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    head: [["Resultado del periodo", "Monto", "% s/ ventas"]],
    body: [
      filaCaptura("Resultado operativo", r.resultadoOperativo, r.resultadoOperativoPct),
      filaCaptura("Impuestos y otros conceptos", -r.impuestosGasto, null),
      filaCaptura("Ganancia / pérdida neta", r.gananciaNeta, r.gananciaNetaPct),
    ],
    theme: "grid",
    headStyles: { fillColor: [17, 24, 21] },
    bodyStyles: { fontStyle: "bold" },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    head: [["Flujo de efectivo y saldos", "Monto"]],
    body: [
      ["Ingresos del periodo (bancos + caja)", formatCurrency(r.flujoIngresos)],
      ["Egresos del periodo (bancos + caja)", formatCurrency(r.flujoEgresos)],
      ["Flujo neto del periodo", formatCurrency(r.flujoNeto)],
      ["Saldo bancario actual (a la fecha de consulta)", formatCurrency(r.saldoBancarioActual)],
      ["Cuentas por pagar pendientes (saldo actual)", formatCurrency(r.cxpPendiente)],
      ["Obligaciones/impuestos pendientes (saldo actual)", formatCurrency(r.obligacionesPendientes)],
    ],
    theme: "grid",
    headStyles: { fillColor: [23, 79, 61] },
  });

  doc.setFontSize(8);
  doc.text(
    "PENDIENTE indica que el dato aún no ha sido capturado en el sistema. Este reporte nunca estima ni completa cifras faltantes.",
    14,
    (doc as any).lastAutoTable.finalY + 8
  );

  doc.save(`reporte-gerencial-${r.periodo.slice(0, 7)}.pdf`);
}

export async function exportReporteMensualExcel(r: ReporteMensual, sucursalNombre: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Bianco Storico — Sistema de Gestión";
  const ws = wb.addWorksheet(`Reporte ${r.periodo.slice(0, 7)}`);

  ws.columns = [{ width: 42 }, { width: 18 }, { width: 14 }];
  ws.addRow([`Bianco Storico — Reporte Gerencial Mensual`]);
  ws.addRow([`${sucursalNombre} · ${nombreMes(r.periodo)}`]);
  ws.addRow([]);

  function seccion(titulo: string) {
    const row = ws.addRow([titulo]);
    row.font = { bold: true };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEDE6" } };
  }

  function fila(label: string, monto: number | null, pct?: number | null) {
    const row = ws.addRow([label, monto, pct ?? null]);
    row.getCell(2).numFmt = '"$"#,##0.00;[Red]-"$"#,##0.00';
    if (pct !== undefined) row.getCell(3).numFmt = "0.0%";
    if (pct !== undefined && pct !== null) row.getCell(3).value = pct / 100;
  }

  seccion("Ventas");
  fila("Ventas totales (brutas)", r.ventasBruta);
  fila("(-) Descuentos", -r.descuentos);
  fila("(-) Devoluciones", -r.devoluciones);
  fila("(-) Cancelaciones", -r.cancelaciones);
  fila("Ventas netas", r.ventasNeta);
  fila("Cortesías (informativo)", r.cortesias);
  ws.addRow([]);

  seccion("Compras / costo de mercadería vendida (CMV)");
  fila("CMV total", r.cmvFuente === "sin_datos" ? null : r.cmv, r.foodCostPct);
  r.cmvPorCategoria.forEach((c) => fila(`  · ${c.nombre}`, c.monto));
  fila("Food cost teórico (referencia)", null, r.foodCostTeoricoPct);
  fila("Margen bruto", r.margenBruto, r.margenBrutoPct);
  ws.addRow([]);

  seccion("Costo laboral");
  fila("Nómina (módulo de nómina)", r.costoLaboralNomina);
  fila("Nómina registrada como gasto (histórico)", r.costoLaboralGastoHistorico);
  fila("Costo laboral total", r.costoLaboralTotal, r.costoLaboralPct);
  ws.addRow([]);

  seccion("Gastos fijos");
  r.gastosFijos.forEach((g) => fila(g.nombre, g.monto));
  fila("Total gastos fijos", r.gastosFijosTotal);
  ws.addRow([]);

  seccion("Gastos variables y operativos");
  r.gastosVariables.forEach((g) => fila(g.nombre, g.monto));
  fila("Total gastos variables/operativos", r.gastosVariablesTotal);
  ws.addRow([]);

  seccion("Resultado del periodo");
  fila("Resultado operativo", r.resultadoOperativo, r.resultadoOperativoPct);
  fila("Impuestos y otros conceptos", -r.impuestosGasto);
  fila("Ganancia / pérdida neta", r.gananciaNeta, r.gananciaNetaPct);
  ws.addRow([]);

  seccion("Flujo de efectivo y saldos");
  fila("Ingresos del periodo (bancos + caja)", r.flujoIngresos);
  fila("Egresos del periodo (bancos + caja)", r.flujoEgresos);
  fila("Flujo neto del periodo", r.flujoNeto);
  fila("Saldo bancario actual (a la fecha de consulta)", r.saldoBancarioActual);
  fila("Cuentas por pagar pendientes (saldo actual)", r.cxpPendiente);
  fila("Obligaciones/impuestos pendientes (saldo actual)", r.obligacionesPendientes);

  const buffer = await wb.xlsx.writeBuffer();
  descargarBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `reporte-gerencial-${r.periodo.slice(0, 7)}.xlsx`
  );
}
