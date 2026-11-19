import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { exportTablaExcel } from "@/lib/reporteExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileSpreadsheet } from "lucide-react";

export default function Bancos() {
  const [mes, setMes] = useState("2026-08");
  const inicio = `${mes}-01`;
  const fin = new Date(new Date(inicio).getFullYear(), new Date(inicio).getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: cuentas } = useQuery({
    queryKey: ["cuentas_bancarias_lista"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cuentas_bancarias").select("*").eq("estatus", "activo");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: movimientos, isLoading } = useQuery({
    queryKey: ["movimientos_bancarios", mes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimientos_bancarios")
        .select("*")
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order("fecha", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalCargo = (movimientos ?? []).reduce((s, m) => s + Number(m.cargo ?? 0), 0);
  const totalAbono = (movimientos ?? []).reduce((s, m) => s + Number(m.abono ?? 0), 0);

  function exportar() {
    if (!movimientos?.length) return;
    exportTablaExcel({
      titulo: "Bianco Storico — Movimientos bancarios",
      subtitulo: `Mes: ${mes}`,
      columnas: [
        { header: "Fecha", width: 14 },
        { header: "Concepto", width: 32 },
        { header: "Tipo", width: 16 },
        { header: "Cargo", width: 16, tipo: "moneda" },
        { header: "Abono", width: 16, tipo: "moneda" },
      ],
      filas: movimientos.map((m: any) => [m.fecha, m.concepto, m.tipo_movimiento, Number(m.cargo) || null, Number(m.abono) || null]),
      filaTotales: ["", "", "Total", totalCargo, totalAbono],
      nombreArchivo: `bancos-${mes}.xlsx`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-900">Bancos</h1>
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
        <StatCard label="Saldo actual de la cuenta" value={formatCurrency(cuentas?.[0]?.saldo_actual)} hint="No depende del mes elegido" />
        <StatCard label="Ingresos del mes (abonos)" value={formatCurrency(totalAbono)} tone="positivo" />
        <StatCard label="Egresos del mes (cargos)" value={formatCurrency(totalCargo)} tone="negativo" />
        <StatCard label="Movimientos en el mes" value={String(movimientos?.length ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos ({cuentas?.[0]?.alias ?? cuentas?.[0]?.banco ?? "cuenta"})</CardTitle>
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
                    <th className="pb-2">Categoría</th>
                    <th className="pb-2 text-right">Cargo</th>
                    <th className="pb-2 text-right">Abono</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m: any) => (
                    <tr key={m.id} className="border-t border-ink-100">
                      <td className="py-1.5">{formatDate(m.fecha)}</td>
                      <td className="py-1.5">{m.concepto}</td>
                      <td className="py-1.5 text-ink-500">{m.tipo_movimiento}</td>
                      <td className="py-1.5 text-right text-rose-700">{Number(m.cargo) > 0 ? formatCurrency(m.cargo) : ""}</td>
                      <td className="py-1.5 text-right text-emerald-700">{Number(m.abono) > 0 ? formatCurrency(m.abono) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
