import { cn } from "@/lib/utils";

export type Semaforo = "verde" | "amarillo" | "rojo" | "neutral";

const styles: Record<Semaforo, string> = {
  verde: "bg-emerald-100 text-emerald-800",
  amarillo: "bg-amber-100 text-amber-800",
  rojo: "bg-rose-100 text-rose-800",
  neutral: "bg-ink-100 text-ink-700",
};

export function Badge({ tone = "neutral", children }: { tone?: Semaforo; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[tone])}>
      {children}
    </span>
  );
}

export function SemaforoDot({ tone }: { tone: Semaforo }) {
  const colors: Record<Semaforo, string> = {
    verde: "bg-semaforo-verde",
    amarillo: "bg-semaforo-amarillo",
    rojo: "bg-semaforo-rojo",
    neutral: "bg-ink-300",
  };
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", colors[tone])} />;
}

export function estatusConciliacionTone(estatus: string): Semaforo {
  switch (estatus) {
    case "CUADRADO":
    case "PAGADO":
    case "VALIDADO":
    case "CERRADO":
      return "verde";
    case "DIFERENCIA":
    case "VENCIDO":
    case "CON_OBSERVACIONES":
      return "rojo";
    case "PENDIENTE":
    case "EN_REVISION":
    case "PARCIAL":
    case "POR_VENCER":
    case "ABIERTO":
      return "amarillo";
    default:
      return "neutral";
  }
}
