import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { AnalisisGerencial } from "@/lib/analisisGerencial";
import { ThumbsUp, ThumbsDown, Lightbulb } from "lucide-react";

/** Tarjeta de interpretación automática (fortalezas/debilidades/recomendaciones), compartida
 * entre Reporte Gerencial Mensual y Mes a mes y acumulado — misma lectura, distinto alcance
 * de fechas. */
export function AnalisisGerencialCard({ analisis }: { analisis: AnalisisGerencial }) {
  return (
    <Card
      className={
        analisis.tono === "positivo"
          ? "border-brand-200 bg-brand-50/60"
          : analisis.tono === "negativo"
          ? "border-rose-200 bg-rose-50/50"
          : "border-amber-200 bg-amber-50/50"
      }
    >
      <CardHeader>
        <CardTitle className="text-base">Análisis y recomendaciones del periodo</CardTitle>
        <p className="text-sm text-ink-700">{analisis.estado}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              <ThumbsUp className="h-3.5 w-3.5" /> Fortalezas
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-700">
              {analisis.fortalezas.map((f, i) => (
                <li key={i}>• {f}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-800">
              <ThumbsDown className="h-3.5 w-3.5" /> Debilidades
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-700">
              {analisis.debilidades.map((d, i) => (
                <li key={i}>• {d}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-800">
              <Lightbulb className="h-3.5 w-3.5" /> Recomendaciones
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-700">
              {analisis.recomendaciones.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-ink-500">
          Lectura automática a partir de las cifras de este reporte, contra rangos saludables típicos de restaurante. No
          sustituye el criterio de quien decide — es un punto de partida para la conversación.
        </p>
      </CardContent>
    </Card>
  );
}
