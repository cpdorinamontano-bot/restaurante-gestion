import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function Gastos() {
  const [mes, setMes] = useState("2026-03");
  const inicio = `${mes}-01`;
  const fin = new Date(new Date(inicio).getFullYear(), new Date(inicio).getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: gastos, isLoading } = useQuery({
    queryKey: ["gastos_lista", mes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gastos")
        .select("*, categorias_gastos(nombre)")
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order("fecha", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = (gastos ?? []).reduce((s, g) => s + Number(g.subtotal ?? 0) + Number(g.impuestos ?? 0), 0);

  const porCategoria = new Map<string, number>();
  (gastos ?? []).forEach((g: any) => {
    const nombre = g.categorias_gastos?.nombre ?? "Sin categoría";
    porCategoria.set(nombre, (porCategoria.get(nombre) ?? 0) + Number(g.subtotal ?? 0));
  });
  const topCategorias = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-900">Gastos</h1>
        <label className="flex flex-col text-xs font-medium text-ink-600">
          Mes
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="mt-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Gastos del mes" value={formatCurrency(total)} tone="negativo" />
        <StatCard label="Registros" value={String(gastos?.length ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top categorías del mes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topCategorias.length === 0 ? (
            <p className="text-sm text-ink-500">Sin gastos en este mes.</p>
          ) : (
            topCategorias.map(([nombre, monto]) => (
              <div key={nombre} className="flex items-center justify-between text-sm">
                <span className="text-ink-700">{nombre}</span>
                <span className="font-medium text-ink-900">{formatCurrency(monto)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-ink-500">Cargando…</p>
          ) : !gastos?.length ? (
            <p className="text-sm text-ink-500">Sin gastos en este mes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-ink-500">
                  <tr>
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2">Concepto</th>
                    <th className="pb-2">Categoría</th>
                    <th className="pb-2">Estatus</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((g: any) => (
                    <tr key={g.id} className="border-t border-ink-100">
                      <td className="py-1.5">{formatDate(g.fecha)}</td>
                      <td className="py-1.5">{g.concepto}</td>
                      <td className="py-1.5 text-ink-500">{g.categorias_gastos?.nombre}</td>
                      <td className="py-1.5 text-ink-500">{g.estatus_pago}</td>
                      <td className="py-1.5 text-right">{formatCurrency(Number(g.subtotal) + Number(g.impuestos))}</td>
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
