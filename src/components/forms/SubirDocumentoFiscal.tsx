import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { leerDocumentoFiscal, type DatosDocumentoFiscal } from "@/lib/lectorDocumentos";
import { Field } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Loader2, FileCheck2 } from "lucide-react";

const CONFIANZA_LABEL: Record<DatosDocumentoFiscal["confianza"], string> = {
  alta: "Lectura confiable (CFDI)",
  media: "Lectura de PDF — revisa los datos",
  baja: "Lectura de foto (OCR) — revisa con cuidado",
};

const CONFIANZA_TONE: Record<DatosDocumentoFiscal["confianza"], "verde" | "amarillo" | "rojo"> = {
  alta: "verde",
  media: "amarillo",
  baja: "rojo",
};

interface Props {
  onDatos: (datos: DatosDocumentoFiscal, documentoId: string) => void;
  tipoDocumento?: string;
}

/** Sube un CFDI (xml), PDF o foto de nota/ticket, lo lee y llena los campos del formulario que la use. */
export function SubirDocumentoFiscal({ onDatos, tipoDocumento = "cfdi" }: Props) {
  const { session } = useAuth();
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<DatosDocumentoFiscal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);

  async function manejarArchivo(file: File) {
    setProcesando(true);
    setError(null);
    setResultado(null);
    setNombreArchivo(file.name);
    try {
      const [datos, documentoId] = await Promise.all([
        leerDocumentoFiscal(file),
        subirYRegistrar(file, tipoDocumento, session?.user.id),
      ]);
      setResultado(datos);
      onDatos(datos, documentoId);
    } catch (e: any) {
      setError(e.message ?? "No se pudo leer el documento. Puedes seguir capturando a mano.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-ink-300 p-4">
      <Field label="CFDI (.xml), PDF o foto de la nota">
        <input
          type="file"
          accept=".xml,.pdf,image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) manejarArchivo(f);
          }}
          className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:cursor-pointer hover:file:bg-brand-700"
        />
      </Field>
      {procesando && (
        <p className="mt-2 flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Leyendo {nombreArchivo}…
        </p>
      )}
      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
      {resultado && !procesando && (
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-brand-600" />
            <span className="font-medium text-ink-800">{nombreArchivo}</span>
            <Badge tone={CONFIANZA_TONE[resultado.confianza]}>{CONFIANZA_LABEL[resultado.confianza]}</Badge>
          </div>
          <p className="text-xs text-ink-500">
            Se llenaron los campos de abajo con lo que se pudo leer — revísalos antes de guardar, sobre todo si vienen de
            una foto.
          </p>
        </div>
      )}
    </div>
  );
}

async function subirYRegistrar(file: File, tipo: string, usuarioId?: string): Promise<string> {
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
  if (uploadError) throw uploadError;
  const { data, error: dbError } = await supabase
    .from("documentos")
    .insert({ tipo, storage_path: path, nombre_archivo: file.name, subido_por: usuarioId })
    .select("id")
    .single();
  if (dbError) throw dbError;
  return data.id as string;
}
