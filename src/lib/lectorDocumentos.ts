export type ConfianzaLectura = "alta" | "media" | "baja";

export interface DatosDocumentoFiscal {
  tipo: "cfdi_xml" | "pdf" | "imagen";
  confianza: ConfianzaLectura;
  rfcEmisor: string | null;
  nombreEmisor: string | null;
  fecha: string | null; // YYYY-MM-DD
  subtotal: number | null;
  iva: number | null;
  total: number | null;
  folio: string | null;
  uuid: string | null;
  conceptos: string[];
}

function vacio(tipo: DatosDocumentoFiscal["tipo"], confianza: ConfianzaLectura): DatosDocumentoFiscal {
  return {
    tipo,
    confianza,
    rfcEmisor: null,
    nombreEmisor: null,
    fecha: null,
    subtotal: null,
    iva: null,
    total: null,
    folio: null,
    uuid: null,
    conceptos: [],
  };
}

/** CFDI (factura electrónica mexicana): XML estructurado — la fuente más confiable, sin necesidad de OCR. */
function parseCfdiXml(xmlText: string): DatosDocumentoFiscal {
  const datos = vacio("cfdi_xml", "alta");
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) return datos;

  const comprobante = doc.getElementsByTagNameNS("*", "Comprobante")[0] ?? doc.documentElement;
  const emisor = doc.getElementsByTagNameNS("*", "Emisor")[0];
  const timbre = doc.getElementsByTagNameNS("*", "TimbreFiscalDigital")[0];
  const conceptos = Array.from(doc.getElementsByTagNameNS("*", "Concepto"));
  const traslados = Array.from(doc.getElementsByTagNameNS("*", "Traslado"));

  datos.rfcEmisor = emisor?.getAttribute("Rfc") ?? null;
  datos.nombreEmisor = emisor?.getAttribute("Nombre") ?? null;
  const fechaRaw = comprobante?.getAttribute("Fecha");
  datos.fecha = fechaRaw ? fechaRaw.slice(0, 10) : null;
  datos.subtotal = comprobante?.getAttribute("SubTotal") ? Number(comprobante.getAttribute("SubTotal")) : null;
  datos.total = comprobante?.getAttribute("Total") ? Number(comprobante.getAttribute("Total")) : null;
  datos.iva = traslados.reduce((s, t) => s + Number(t.getAttribute("Importe") ?? 0), 0) || null;
  datos.folio = comprobante?.getAttribute("Folio") ?? comprobante?.getAttribute("Serie") ?? null;
  datos.uuid = timbre?.getAttribute("UUID") ?? null;
  datos.conceptos = conceptos.map((c) => c.getAttribute("Descripcion") ?? "").filter(Boolean);

  return datos;
}

async function extraerTextoPdf(file: File): Promise<string> {
  const [pdfjsLib, { default: pdfjsWorkerUrl }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.mjs?url"),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  let texto = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i);
    const contenido = await pagina.getTextContent();
    texto += contenido.items.map((it: any) => ("str" in it ? it.str : "")).join(" ") + "\n";
  }
  return texto;
}

async function extraerTextoImagen(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("spa");
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return text;
  } finally {
    await worker.terminate();
  }
}

/** Heurísticas de texto libre (PDF o resultado de OCR) — nunca tan confiables como el XML del CFDI. */
function extraerCamposDeTexto(texto: string): Partial<DatosDocumentoFiscal> {
  const rfcMatch = texto.match(/\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/);
  const uuidMatch = texto.match(/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/);
  const fechaIsoMatch = texto.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  const fechaSlashMatch = texto.match(/\b(\d{2})\/(\d{2})\/(20\d{2})\b/);
  const totalMatches = [...texto.matchAll(/total[:\s$]*\$?\s*([\d,]+\.\d{2})/gi)];
  const subtotalMatches = [...texto.matchAll(/sub\s*total[:\s$]*\$?\s*([\d,]+\.\d{2})/gi)];
  const ivaMatches = [...texto.matchAll(/i\.?\s*v\.?\s*a\.?[:\s$]*\$?\s*([\d,]+\.\d{2})/gi)];

  const numero = (s: string) => Number(s.replace(/,/g, ""));

  let fecha: string | null = null;
  if (fechaIsoMatch) fecha = `${fechaIsoMatch[1]}-${fechaIsoMatch[2]}-${fechaIsoMatch[3]}`;
  else if (fechaSlashMatch) fecha = `${fechaSlashMatch[3]}-${fechaSlashMatch[2]}-${fechaSlashMatch[1]}`;

  return {
    rfcEmisor: rfcMatch?.[0] ?? null,
    uuid: uuidMatch?.[0] ?? null,
    fecha,
    total: totalMatches.length ? numero(totalMatches[totalMatches.length - 1][1]) : null,
    subtotal: subtotalMatches.length ? numero(subtotalMatches[subtotalMatches.length - 1][1]) : null,
    iva: ivaMatches.length ? numero(ivaMatches[ivaMatches.length - 1][1]) : null,
  };
}

export async function leerDocumentoFiscal(file: File): Promise<DatosDocumentoFiscal> {
  const nombre = file.name.toLowerCase();

  if (nombre.endsWith(".xml") || file.type === "text/xml" || file.type === "application/xml") {
    const texto = await file.text();
    return parseCfdiXml(texto);
  }

  if (nombre.endsWith(".pdf") || file.type === "application/pdf") {
    const texto = await extraerTextoPdf(file);
    return { ...vacio("pdf", "media"), ...extraerCamposDeTexto(texto) };
  }

  if (file.type.startsWith("image/")) {
    const texto = await extraerTextoImagen(file);
    return { ...vacio("imagen", "baja"), ...extraerCamposDeTexto(texto) };
  }

  return vacio("pdf", "baja");
}
