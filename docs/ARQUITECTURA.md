# Arquitectura técnica

## Stack

- Vite + React 18 + TypeScript, Tailwind CSS (sin librería de componentes externa;
  primitivos propios en `src/components/ui` para mantener el bundle ligero).
- `@tanstack/react-query` para estado de datos remoto (cache, refetch).
- `react-router-dom` para ruteo y guardas por rol (`ProtectedRoute`).
- Supabase JS client (`src/lib/supabase.ts`) con tipos generados desde el
  esquema real (`src/types/database.ts`, regenerar con
  `mcp: generate_typescript_types` o `supabase gen types typescript` tras cada migración).

## Proyecto Supabase

- Project ref: `ognfdvlkvpevxtqqucrj` (org `cpdorinamontano-bot's Org`, plan gratuito).
- Repositorio de código: `cpdorinamontano-bot/restaurante-gestion` (independiente
  de `sat-serene`, que es la plataforma fiscal/contable del despacho y no comparte
  base de datos ni dominio de negocio con este sistema).

## Decisiones técnicas documentadas

1. **`productos` unifica catálogo de venta e insumos** (campo `tipo`:
   `venta` | `insumo` | `ambos`) en vez de tener tablas separadas `productos`
   e `ingredientes`. Evita duplicidad y conflictos de sincronización de costo;
   una receta simplemente referencia productos de tipo `insumo`/`ambos` en
   `receta_detalle`.

2. **`movimientos_inventario` es el ledger único de existencias.** Toda entrada,
   salida, merma, ajuste por conteo y compra genera una fila aquí (nunca se
   edita `inventarios.cantidad_actual` a mano). El costeo usa **costo promedio
   ponderado**: cada entrada recalcula el promedio; cada salida usa el promedio
   vigente. Como el ledger conserva `fecha` y `costo_total` de cada movimiento,
   el valor de inventario en **cualquier fecha pasada** es reconstruible
   (`fn_inventario_valor_a_fecha`), lo que permite calcular Food Cost Real
   sin depender de snapshots manuales.

3. **Food Cost Real ≠ Food Cost Teórico ≠ solo facturas.** Real se calcula con
   la fórmula clásica (Inventario inicial + Compras − Inventario final) / Ventas
   netas, usando el ledger de inventario. Teórico se calcula desde las recetas
   realmente vendidas (`ventas_detalle` → `recetas` → costo vigente o snapshot
   histórico). Nunca se sustituye uno por otro.

4. **Costos de receta no se recalculan retroactivamente.** `recetas_costo_historico`
   guarda una foto mensual inmutable (`unique(receta_id, periodo)`, `on conflict
   do nothing`). El Food Cost Teórico de un mes cerrado siempre usa esa foto,
   no el costo "vigente hoy" de los ingredientes.

5. **Ninguna tabla financiera permite `DELETE` físico.** Las políticas RLS
   simplemente no otorgan `FOR DELETE` en tablas transaccionales; la baja es
   lógica (`estatus = 'baja'`), y el trigger de auditoría clasifica ese caso
   como `BAJA_LOGICA` en la bitácora.

6. **CxP se genera automáticamente** desde `compras`/`gastos` cuando quedan a
   crédito (`estatus_pago in ('pendiente','parcial')`), vía trigger
   (`fn_generar_cxp_compra` / `fn_generar_cxp_gasto`). El saldo y estatus
   (`POR_VENCER`/`VENCIDO`/`PARCIAL`/`PAGADO`) se calculan en la vista
   `v_cxp_saldos` a partir de `pagos_proveedores` — nunca se almacenan como
   columna editable, para que siempre sean reconstruibles.

7. **Cierre mensual con reapertura auditada.** El trigger
   `fn_validar_cambio_cierre_mensual` exige rol Finanzas/Admin y un
   `motivo_cambio` no vacío para reabrir un periodo `CERRADO`, y registra
   cada transición (apertura, cambio de estatus, cierre, reapertura) en
   `cierres_mensuales_historial`.

8. **Endurecimiento de seguridad post-migración inicial.** El advisor de
   Supabase detectó que (a) las vistas quedaban como `SECURITY DEFINER`
   (evadiendo RLS de las tablas base) y (b) Supabase concede `EXECUTE` por
   defecto a `anon`/`authenticated` en funciones nuevas. Se corrigió con
   `security_invoker = true` en las vistas y revocando `EXECUTE` de `anon`
   explícitamente (no basta con revocar de `PUBLIC`), dejando además guardas
   internas (`fn_es_usuario_sistema()` / `fn_es_finanzas()`) dentro de las
   funciones que exponen cifras agregadas o escriben datos — ver migraciones
   `..._seguridad_hardening.sql` y `..._revoke_anon_execute.sql`.

## Estructura de carpetas

```
src/
  components/ui/       primitivos (Button, Card, Input, Badge, StatCard)
  components/layout/   AppShell (sidebar por rol), ProtectedRoute
  contexts/             AuthContext (sesión, roles, sucursal activa)
  hooks/                 catálogos y funciones RPC de indicadores
  pages/pao/             captura operativa diaria
  pages/direccion/        dashboard de rentabilidad (solo lectura)
  pages/finanzas/         conciliación, cierre mensual
  pages/admin/            usuarios y roles
  types/database.ts       tipos generados del esquema real
supabase/migrations/     migraciones SQL versionadas (aplicadas en orden)
```
