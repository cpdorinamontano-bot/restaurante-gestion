import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import type { ReporteMensual } from "@/lib/reportes";
import type { AnalisisGerencial } from "@/lib/analisisGerencial";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { LOGO_BIANCO_STORICO_BASE64 } from "@/assets/logoBase64";

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

const COLOR_TIPO_OBSERVACION: Record<string, [number, number, number]> = {
  Fortaleza: [23, 100, 60],
  Debilidad: [153, 27, 27],
  Recomendación: [30, 64, 150],
};

/**
 * Sección "Resumen para socios y dirección" — el mismo análisis automático que se ve en
 * pantalla (estado del periodo + fortalezas/debilidades/recomendaciones), en lenguaje llano,
 * lista para imprimirse junto al resto del reporte. Devuelve la posición Y donde continuar.
 */
function agregarAnalisisPDF(doc: jsPDF, startY: number, analisis: AnalisisGerencial): number {
  const anchoUtil = doc.internal.pageSize.getWidth() - 28;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(23, 79, 61);
  doc.text("Resumen para socios y dirección", 14, startY);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const estadoLines: string[] = doc.splitTextToSize(analisis.estado, anchoUtil);
  doc.text(estadoLines, 14, startY + 7);

  const filas: [string, string][] = [
    ...analisis.fortalezas.map((f) => ["Fortaleza", f] as [string, string]),
    ...analisis.debilidades.map((d) => ["Debilidad", d] as [string, string]),
    ...analisis.recomendaciones.map((rec) => ["Recomendación", rec] as [string, string]),
  ];

  autoTable(doc, {
    startY: startY + 7 + estadoLines.length * 4.6 + 3,
    head: [["", "Qué observamos y qué recomendamos"]],
    body: filas,
    theme: "grid",
    headStyles: { fillColor: [23, 79, 61] },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 30, fontStyle: "bold" } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const color = COLOR_TIPO_OBSERVACION[String(data.cell.raw)];
        if (color) data.cell.styles.textColor = color;
      }
    },
  });

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Lectura automática a partir de las cifras de este reporte, contra rangos saludables típicos de restaurante. No sustituye el criterio de quien decide.",
    14,
    (doc as any).lastAutoTable.finalY + 5
  );
  doc.setTextColor(0, 0, 0);

  return (doc as any).lastAutoTable.finalY + 10;
}

function agregarAnalisisExcel(ws: ExcelJS.Worksheet, analisis: AnalisisGerencial) {
  const seccion = ws.addRow(["Resumen para socios y dirección"]);
  seccion.font = { bold: true, size: 12 };
  const estadoRow = ws.addRow([analisis.estado]);
  estadoRow.font = { italic: true };
  ws.addRow([]);

  const headerRow = ws.addRow(["Tipo", "Qué observamos y qué recomendamos"]);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF174F3D" } };
  });

  const colorHex: Record<string, string> = { Fortaleza: "FF176432", Debilidad: "FF991B1B", Recomendación: "FF1E4096" };
  const filas: [string, string][] = [
    ...analisis.fortalezas.map((f) => ["Fortaleza", f] as [string, string]),
    ...analisis.debilidades.map((d) => ["Debilidad", d] as [string, string]),
    ...analisis.recomendaciones.map((rec) => ["Recomendación", rec] as [string, string]),
  ];
  filas.forEach(([tipo, texto]) => {
    const row = ws.addRow([tipo, texto]);
    const color = colorHex[tipo];
    if (color) row.getCell(1).font = { bold: true, color: { argb: color } };
  });
  ws.addRow([]);
}

export function exportReporteMensualPDF(r: ReporteMensual, sucursalNombre: string, analisis?: AnalisisGerencial | null) {
  const doc = new jsPDF();
  const mes = nombreMes(r.periodo);

  doc.addImage(LOGO_BIANCO_STORICO_BASE64, "PNG", 14, 9, 50, 8.28);
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text(`Reporte Gerencial Mensual · ${sucursalNombre} · ${mes}`, 14, 24);
  doc.setTextColor(0, 0, 0);

  const ventasFuenteNota =
    r.ventasFuente === "ingresos_bancos_caja" ? " (= ingresos de banco y caja, sin módulo de Ventas)" : "";
  const inicioDetalle = analisis ? agregarAnalisisPDF(doc, 30, analisis) : 30;
  autoTable(doc, {
    startY: inicioDetalle,
    head: [["Ventas", "Monto"]],
    body: [
      [`Ventas totales (brutas)${ventasFuenteNota}`, formatCurrency(r.ventasFuente === "sin_datos" ? null : r.ventasBruta)],
      ["(-) Descuentos", formatCurrency(r.descuentos)],
      ["(-) Devoluciones", formatCurrency(r.devoluciones)],
      ["(-) Cancelaciones", formatCurrency(r.cancelaciones)],
      ["Ventas netas", formatCurrency(r.ventasFuente === "sin_datos" ? null : r.ventasNeta)],
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

export async function exportReporteMensualExcel(r: ReporteMensual, sucursalNombre: string, analisis?: AnalisisGerencial | null) {
  const ventasFuenteNota =
    r.ventasFuente === "ingresos_bancos_caja" ? " (= ingresos de banco y caja, sin módulo de Ventas)" : "";
  const wb = new ExcelJS.Workbook();
  wb.creator = "Bianco Storico — Sistema de Gestión";
  const ws = wb.addWorksheet(`Reporte ${r.periodo.slice(0, 7)}`);

  ws.columns = [{ width: 42 }, { width: 18 }, { width: 14 }];
  ws.addRow([`Bianco Storico — Reporte Gerencial Mensual`]);
  ws.addRow([`${sucursalNombre} · ${nombreMes(r.periodo)}`]);
  ws.addRow([]);

  if (analisis) agregarAnalisisExcel(ws, analisis);

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
  fila(`Ventas totales (brutas)${ventasFuenteNota}`, r.ventasFuente === "sin_datos" ? null : r.ventasBruta);
  fila("(-) Descuentos", r.descuentos === null ? null : -r.descuentos);
  fila("(-) Devoluciones", r.devoluciones === null ? null : -r.devoluciones);
  fila("(-) Cancelaciones", r.cancelaciones === null ? null : -r.cancelaciones);
  fila("Ventas netas", r.ventasFuente === "sin_datos" ? null : r.ventasNeta);
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

type TipoColumna = "texto" | "moneda" | "pct" | "numero" | "fecha";

interface ColumnaTabla {
  header: string;
  width?: number;
  tipo?: TipoColumna;
}

function aplicarFormatoCelda(cell: ExcelJS.Cell, tipo: TipoColumna | undefined, valor: unknown) {
  if (valor === null || valor === undefined || valor === "") {
    cell.value = valor === "" ? "" : valor === null ? "PENDIENTE" : valor;
    return;
  }
  if (tipo === "moneda") {
    cell.value = Number(valor);
    cell.numFmt = '"$"#,##0.00;[Red]-"$"#,##0.00';
  } else if (tipo === "pct") {
    cell.value = Number(valor) / 100;
    cell.numFmt = "0.0%";
  } else if (tipo === "numero") {
    cell.value = Number(valor);
  } else {
    cell.value = valor as string;
  }
}

/**
 * Exporta una tabla simple (encabezados + filas) a Excel — para reportes de lista
 * (gastos, movimientos de banco/caja, empleados, cuentas por cobrar/pagar, etc.).
 * Cada página aporta sus propias columnas y filas ya resueltas; esta función solo
 * formatea y descarga el archivo.
 */
export async function exportTablaExcel(opts: {
  titulo: string;
  subtitulo?: string;
  columnas: ColumnaTabla[];
  filas: (string | number | null)[][];
  nombreArchivo: string;
  filaTotales?: (string | number | null)[];
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Bianco Storico — Sistema de Gestión";
  const ws = wb.addWorksheet("Datos");

  ws.columns = opts.columnas.map((c) => ({ width: c.width ?? 20 }));
  const tituloRow = ws.addRow([opts.titulo]);
  tituloRow.font = { bold: true, size: 13 };
  if (opts.subtitulo) ws.addRow([opts.subtitulo]);
  ws.addRow([]);

  const headerRow = ws.addRow(opts.columnas.map((c) => c.header));
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF174F3D" } };
  });

  opts.filas.forEach((fila) => {
    const row = ws.addRow(fila);
    fila.forEach((valor, i) => aplicarFormatoCelda(row.getCell(i + 1), opts.columnas[i]?.tipo, valor));
  });

  if (opts.filaTotales) {
    const row = ws.addRow(opts.filaTotales);
    row.font = { bold: true };
    row.eachCell((cell) => {
      cell.border = { top: { style: "thin" } };
    });
    opts.filaTotales.forEach((valor, i) => aplicarFormatoCelda(row.getCell(i + 1), opts.columnas[i]?.tipo, valor));
  }

  const buffer = await wb.xlsx.writeBuffer();
  descargarBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), opts.nombreArchivo);
}

interface FilaMatriz {
  label: string;
  tipo: "monto" | "pct" | "seccion";
  indent?: boolean;
  resaltado?: boolean;
  valores?: (number | null)[];
}

/**
 * Exporta una tabla comparativa mes a mes + acumulado (Estado de Resultados,
 * Mes a mes y acumulado) a Excel, manteniendo la misma estructura de filas/columnas
 * que se ve en pantalla.
 */
export async function exportMatrizExcel(opts: {
  titulo: string;
  subtitulo?: string;
  columnas: string[]; // encabezados de periodo (ya incluye la última columna de total)
  filas: FilaMatriz[];
  nombreArchivo: string;
  analisis?: AnalisisGerencial | null;
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Bianco Storico — Sistema de Gestión";
  const ws = wb.addWorksheet("Datos");

  ws.columns = [{ width: 38 }, ...opts.columnas.map(() => ({ width: 16 }))];
  const tituloRow = ws.addRow([opts.titulo]);
  tituloRow.font = { bold: true, size: 13 };
  if (opts.subtitulo) ws.addRow([opts.subtitulo]);
  ws.addRow([]);

  if (opts.analisis) {
    agregarAnalisisExcel(ws, opts.analisis);
  }

  const headerRow = ws.addRow(["Concepto", ...opts.columnas]);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF174F3D" } };
  });

  opts.filas.forEach((fila) => {
    if (fila.tipo === "seccion") {
      const row = ws.addRow([fila.label]);
      row.font = { bold: true };
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEDE6" } };
      return;
    }
    const label = fila.indent ? `  ${fila.label}` : fila.label;
    const row = ws.addRow([label, ...(fila.valores ?? [])]);
    if (fila.resaltado) row.font = { bold: true };
    (fila.valores ?? []).forEach((v, i) => aplicarFormatoCelda(row.getCell(i + 2), fila.tipo === "pct" ? "pct" : "moneda", v));
  });

  const buffer = await wb.xlsx.writeBuffer();
  descargarBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), opts.nombreArchivo);
}

/**
 * Versión en PDF de exportMatrizExcel — para "Mes a mes y acumulado" y "Estado de
 * Resultados". En horizontal porque puede traer hasta 12 columnas de mes + total.
 * Incluye el mismo "Resumen para socios y dirección" que el Reporte Gerencial Mensual,
 * para imprimirse junto con él.
 */
export function exportMatrizPDF(opts: {
  sucursalNombre: string;
  tituloReporte: string;
  subtitulo: string;
  columnas: string[];
  filas: FilaMatriz[];
  nombreArchivo: string;
  analisis?: AnalisisGerencial | null;
}) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.addImage(LOGO_BIANCO_STORICO_BASE64, "PNG", 14, 9, 50, 8.28);
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text(`${opts.tituloReporte} · ${opts.sucursalNombre} · ${opts.subtitulo}`, 14, 24);
  doc.setTextColor(0, 0, 0);

  const inicioTabla = opts.analisis ? agregarAnalisisPDF(doc, 30, opts.analisis) : 30;

  const body = opts.filas.map((fila) => {
    if (fila.tipo === "seccion") {
      return [
        {
          content: fila.label,
          colSpan: opts.columnas.length + 1,
          styles: { fontStyle: "bold" as const, fillColor: [239, 237, 230] as [number, number, number] },
        },
      ];
    }
    const label = fila.indent ? `  ${fila.label}` : fila.label;
    const valores = (fila.valores ?? []).map((v) => (v === null ? "PENDIENTE" : fila.tipo === "pct" ? formatPercent(v) : formatCurrency(v)));
    return [label, ...valores];
  });

  autoTable(doc, {
    startY: inicioTabla,
    head: [["Concepto", ...opts.columnas]],
    body,
    theme: "grid",
    headStyles: { fillColor: [23, 79, 61] },
    styles: { fontSize: 8 },
  });

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "PENDIENTE indica que el dato aún no ha sido capturado en el sistema. Este reporte nunca estima ni completa cifras faltantes.",
    14,
    (doc as any).lastAutoTable.finalY + 6
  );

  doc.save(opts.nombreArchivo);
}
