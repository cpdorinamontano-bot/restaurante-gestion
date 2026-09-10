import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useClientes } from "@/hooks/useCatalogos";
import { crearCuentaPorCobrar, fetchCuentasPorCobrar, registrarCobro } from "@/lib/cuentasPorCobrar";
import { fetchCuentasPorPagar, registrarPago } from "@/lib/cuentasPorPagar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge, estatusConciliacionTone } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const cxcVacio = { clienteId: "", concepto: "", fechaEmision: new Date().toISOString().slice(0, 10), fechaVencimiento: "", importe: "" };

export default function CuentasPorCobrarPagar() {
  const { session } = useAuth();
  const location = useLocation();
  const puedeCapturar = location.pathname.startsWith("/finanzas");
  const qc = useQueryClient();

  const { data: clientes } = useClientes();

  const { data: cxc, isLoading: cargandoCxc } = useQuery({ queryKey: ["cuentas_por_cobrar"], queryFn: fetchCuentasPorCobrar });
  const { data: cxp, isLoading: cargandoCxp } = useQuery({ queryKey: ["cuentas_por_pagar_detalle"], queryFn: fetchCuentasPorPagar });

  const [formCxc, setFormCxc] = useState(cxcVacio);
  const [guardandoCxc, setGuardandoCxc] = useState(false);
  const [errorCxc, setErrorCxc] = useState<string | null>(null);

  const [cobros, setCobros] = useState<Record<string, string>>({});
  const [pagos, setPagos] = useState<Record<string, string>>({});
  const [registrando, setRegistrando] = useState<string | null>(null);

  const resumenCxc = useMemo(() => {
    if (!cxc) return null;
    return {
      total: cxc.reduce((s, c) => s + c.saldo, 0),
      vencido: cxc.filter((c) => c.estatus === "VENCIDO").reduce((s, c) => s + c.saldo, 0),
    };
  }, [cxc]);

  const resumenCxp = useMemo(() => {
    if (!cxp) return null;
    return {
      total: cxp.reduce((s, c) => s + c.saldo, 0),
      vencido: cxp.filter((c) => c.estatus === "VENCIDO").reduce((s, c) => s + c.saldo, 0),
    };
  }, [cxp]);

  async function agregarCxc() {
    if (!formCxc.clienteId || !formCxc.fechaVencimiento || !formCxc.importe) return;
    setGuardandoCxc(true);
    setErrorCxc(null);
    try {
      await crearCuentaPorCobrar({
        clienteId: formCxc.clienteId,
        concepto: formCxc.concepto,
        fechaEmision: formCxc.fechaEmision,
        fechaVencimiento: formCxc.fechaVencimiento,
        importeOriginal: Number(formCxc.importe),
        userId: session?.user.id,
      });
      setFormCxc(cxcVacio);
      qc.invalidateQueries({ queryKey: ["cuentas_por_cobrar"] });
    } catch (e: any) {
      setErrorCxc(e.message ?? "No se pudo registrar la cuenta por cobrar.");
    } finally {
      setGuardandoCxc(false);
    }
  }

  async function cobrar(id: string) {
    const importe = Number(cobros[id]);
    if (!importe || importe <= 0) return;
    setRegistrando(id);
    try {
      await registrarCobro({ cuentaPorCobrarId: id, fecha: new Date().toISOString().slice(0, 10), importe, usuarioId: session?.user.id });
      qc.invalidateQueries({ queryKey: ["cuentas_por_cobrar"] });
      setCobros((prev) => ({ ...prev, [id]: "" }));
    } finally {
      setRegistrando(null);
    }
  }

  async function pagar(id: string) {
    const importe = Number(pagos[id]);
    if (!importe || importe <= 0) return;
    setRegistrando(id);
    try {
      await registrarPago({ cuentaPorPagarId: id, fecha: new Date().toISOString().slice(0, 10), importe, usuarioId: session?.user.id });
      qc.invalidateQueries({ queryKey: ["cuentas_por_pagar_detalle"] });
      setPagos((prev) => ({ ...prev, [id]: "" }));
    } finally {
      setRegistrando(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Cuentas por cobrar y por pagar</h1>
        <p className="text-sm text-ink-500">Lo que le deben al negocio y lo que el negocio debe a proveedores.</p>
      </div>

      {/* ---------------- CUENTAS POR COBRAR ---------------- */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-ink-700">Cuentas por cobrar</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
          <StatCard label="Total por cobrar" value={formatCurrency(resumenCxc?.total ?? 0)} />
          <StatCard label="Vencido" value={formatCurrency(resumenCxc?.vencido ?? 0)} tone={resumenCxc?.vencido ? "negativo" : "positivo"} />
        </div>

        {puedeCapturar && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registrar cuenta por cobrar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <select
                  value={formCxc.clienteId}
                  onChange={(e) => setFormCxc((f) => ({ ...f, clienteId: e.target.value }))}
                  className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                >
                  <option value="">Cliente</option>
                  {clientes?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                <input
                  placeholder="Concepto"
                  value={formCxc.concepto}
                  onChange={(e) => setFormCxc((f) => ({ ...f, concepto: e.target.value }))}
                  className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                />
                <input
                  type="date"
                  value={formCxc.fechaEmision}
                  onChange={(e) => setFormCxc((f) => ({ ...f, fechaEmision: e.target.value }))}
                  className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                />
                <input
                  type="date"
                  value={formCxc.fechaVencimiento}
                  onChange={(e) => setFormCxc((f) => ({ ...f, fechaVencimiento: e.target.value }))}
                  className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Importe"
                  value={formCxc.importe}
                  onChange={(e) => setFormCxc((f) => ({ ...f, importe: e.target.value }))}
                  className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
                />
              </div>
              {errorCxc && <p className="mt-2 text-sm text-rose-700">{errorCxc}</p>}
              <div className="mt-3">
                <Button size="sm" onClick={agregarCxc} disabled={guardandoCxc}>
                  {guardandoCxc ? "Guardando…" : "Registrar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {cargandoCxc || !cxc ? (
              <p className="px-5 py-4 text-sm text-ink-500">Cargando…</p>
            ) : !cxc.length ? (
              <p className="px-5 py-4 text-sm text-ink-500">Sin cuentas por cobrar registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-5 py-2.5">Cliente</th>
                      <th className="px-4 py-2.5">Concepto</th>
                      <th className="px-4 py-2.5">Vencimiento</th>
                      <th className="px-4 py-2.5 text-right">Saldo</th>
                      <th className="px-4 py-2.5 text-right">Días vencido</th>
                      <th className="px-4 py-2.5">Estado</th>
                      {puedeCapturar && <th className="px-4 py-2.5"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {cxc.map((c) => (
                      <tr key={c.id} className="border-t border-ink-100">
                        <td className="px-5 py-2.5 text-ink-900">{c.clienteNombre}</td>
                        <td className="px-4 py-2.5 text-ink-600">{c.concepto ?? "—"}</td>
                        <td className="px-4 py-2.5 text-ink-600">{formatDate(c.fechaVencimiento)}</td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-900">{formatCurrency(c.saldo)}</td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-700">{c.diasVencidos}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={estatusConciliacionTone(c.estatus)}>{c.estatus}</Badge>
                        </td>
                        {puedeCapturar && (
                          <td className="px-4 py-2.5">
                            {c.saldo > 0 && (
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Importe"
                                  value={cobros[c.id] ?? ""}
                                  onChange={(e) => setCobros((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                  className="w-24 rounded-lg border border-ink-300 px-2 py-1 text-right text-sm"
                                />
                                <Button size="sm" variant="secondary" onClick={() => cobrar(c.id)} disabled={registrando === c.id}>
                                  Cobrar
                                </Button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------- CUENTAS POR PAGAR ---------------- */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-ink-700">Cuentas por pagar</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
          <StatCard label="Total por pagar" value={formatCurrency(resumenCxp?.total ?? 0)} />
          <StatCard label="Vencido" value={formatCurrency(resumenCxp?.vencido ?? 0)} tone={resumenCxp?.vencido ? "negativo" : "positivo"} />
        </div>
        <p className="text-xs text-ink-500">
          Se generan automáticamente cuando una compra o un gasto queda a crédito — no se capturan aquí a mano.
        </p>

        <Card>
          <CardContent className="p-0">
            {cargandoCxp || !cxp ? (
              <p className="px-5 py-4 text-sm text-ink-500">Cargando…</p>
            ) : !cxp.length ? (
              <p className="px-5 py-4 text-sm text-ink-500">Sin cuentas por pagar registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-5 py-2.5">Proveedor</th>
                      <th className="px-4 py-2.5">Vencimiento</th>
                      <th className="px-4 py-2.5 text-right">Saldo</th>
                      <th className="px-4 py-2.5 text-right">Días vencido</th>
                      <th className="px-4 py-2.5">Estado</th>
                      {puedeCapturar && <th className="px-4 py-2.5"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {cxp.map((c) => (
                      <tr key={c.id} className="border-t border-ink-100">
                        <td className="px-5 py-2.5 text-ink-900">{c.proveedorNombre}</td>
                        <td className="px-4 py-2.5 text-ink-600">{formatDate(c.fechaVencimiento)}</td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-900">{formatCurrency(c.saldo)}</td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-700">{c.diasVencidos}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={estatusConciliacionTone(c.estatus)}>{c.estatus}</Badge>
                        </td>
                        {puedeCapturar && (
                          <td className="px-4 py-2.5">
                            {c.saldo > 0 && (
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Importe"
                                  value={pagos[c.id] ?? ""}
                                  onChange={(e) => setPagos((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                  className="w-24 rounded-lg border border-ink-300 px-2 py-1 text-right text-sm"
                                />
                                <Button size="sm" variant="secondary" onClick={() => pagar(c.id)} disabled={registrando === c.id}>
                                  Pagar
                                </Button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
