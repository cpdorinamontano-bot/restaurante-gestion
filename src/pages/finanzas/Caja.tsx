import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { exportTablaExcel } from "@/lib/reporteExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileSpreadsheet } from "lucide-react";

const TIPOS_INGRESO = ["venta_efectivo", "entrada", "deposito", "reposicion"];

export default function Caja() {
  const [mes, setMes] = useState("2026-08");
  const inicio = `${mes}-01`;
  const fin = new Date(new Date(inicio).getFullYear(), new Date(inicio).getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: movimientos, isLoading } = useQuery({
    queryKey: ["movimientos_caja", mes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimientos_caja")
        .select("*")
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order("fecha", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalIngresos = (movimientos ?? [])
    .filter((m) => TIPOS_INGRESO.includes(m.tipo_movimiento))
    .reduce((s, m) => s + Number(m.importe ?? 0), 0);
  const totalEgresos = (movimientos ?? [])
    .filter((m) => !TIPOS_INGRESO.includes(m.tipo_movimiento))
    .reduce((s, m) => s + Number(m.importe ?? 0), 0);

  function exportar() {
    if (!movimientos?.length) return;
    exportTablaExcel({
      titulo: "Bianco Storico — Movimientos de caja",
      subtitulo: `Mes: ${mes}`,
      columnas: [
        { header: "Fecha", width: 14 },
        { header: "Concepto", width: 32 },
        { header: "Tipo", width: 16 },
        { header: "Salida", width: 16, tipo: "moneda" },
        { header: "Entrada", width: 16, tipo: "moneda" },
      ],
      filas: movimientos.map((m: any) => {
        const esIngreso = TIPOS_INGRESO.includes(m.tipo_movimiento);
        return [m.fecha, m.notas, m.tipo_movimiento, !esIngreso ? Number(m.importe) : null, esIngreso ? Number(m.importe) : null];
      }),
      filaTotales: ["", "", "Total", totalEgresos, totalIngresos],
      nombreArchivo: `caja-${mes}.xlsx`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Caja</h1>
          <p className="text-sm text-ink-500">Efectivo en caja — entradas y salidas capturadas.</p>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex flex-col text-xs font-medium text-ink-600">
            Mes
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            />
          </label>
          {!!movimientos?.length && (
            <Button variant="secondary" size="sm" onClick={exportar}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Entradas del mes" value={formatCurrency(totalIngresos)} tone="positivo" />
        <StatCard label="Salidas del mes" value={formatCurrency(totalEgresos)} tone="negativo" />
        <StatCard label="Neto del mes" value={formatCurrency(totalIngresos - totalEgresos)} tone={totalIngresos - totalEgresos >= 0 ? "positivo" : "negativo"} />
        <StatCard label="Movimientos en el mes" value={String(movimientos?.length ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos de caja</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-ink-500">Cargando…</p>
          ) : !movimientos?.length ? (
            <p className="text-sm text-ink-500">Sin movimientos en este mes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-ink-500">
                  <tr>
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2">Concepto</th>
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2 text-right">Salida</th>
                    <th className="pb-2 text-right">Entrada</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m: any) => {
                    const esIngreso = TIPOS_INGRESO.includes(m.tipo_movimiento);
                    return (
                      <tr key={m.id} className="border-t border-ink-100">
                        <td className="py-1.5">{formatDate(m.fecha)}</td>
                        <td className="py-1.5">{m.notas}</td>
                        <td className="py-1.5 text-ink-500">{m.tipo_movimiento}</td>
                        <td className="py-1.5 text-right text-rose-700">{!esIngreso ? formatCurrency(m.importe) : ""}</td>
                        <td className="py-1.5 text-right text-emerald-700">{esIngreso ? formatCurrency(m.importe) : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
