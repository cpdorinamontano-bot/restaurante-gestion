# Sistema de Gestión del Restaurante

Sistema web exclusivo para la administración operativa, financiera y de rentabilidad
de un restaurante. Centraliza ventas, compras, inventarios, recetas, food cost, gastos,
nómina, caja, bancos, cuentas por pagar, cierres y KPIs sobre una sola base de datos,
con auditoría permanente y controles internos.

No es un ERP genérico: está diseñado específicamente para este flujo operativo,
sin replicar Odoo, BIND ni otros sistemas contables.

## Arquitectura

- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS (responsive).
- **Backend**: Supabase (PostgreSQL + Auth + Row Level Security + Storage).
- **Base de datos**: PostgreSQL, migraciones SQL versionadas en `supabase/migrations/`.
- **Auditoría**: bitácora permanente (`bitacora_auditoria`) alimentada por triggers
  genéricos en todas las tablas transaccionales; ninguna tabla financiera permite
  `DELETE` físico (solo baja lógica vía `estatus`).
- **IA**: reservada para fases posteriores, exclusivamente como asistente de
  clasificación/anomalías — nunca para modificar cifras financieras.

Ver `docs/ARQUITECTURA.md`, `docs/MODELO_DATOS.md` y `docs/REGLAS_FINANCIERAS.md`
para el detalle técnico completo.

## Puesta en marcha

```sh
npm install
cp .env.example .env   # completar con la URL y publishable key del proyecto Supabase
npm run dev
```

Las migraciones ya están aplicadas al proyecto Supabase `restaurante-gestion`
(región us-east-1). Para reaplicarlas en otro proyecto, ejecuta en orden los
archivos de `supabase/migrations/`.

### Primer usuario administrador

1. Regístrate desde `/login` usando "Olvidé mi contraseña" no aplica todavía —
   por ahora, crea el usuario desde el dashboard de Supabase (Authentication → Add user)
   o habilita el sign-up y crea la cuenta.
2. En el SQL Editor de Supabase, asigna el rol `admin_sistema` a ese usuario:

```sql
insert into public.usuarios_roles (usuario_id, rol_id)
select u.id, r.id
from auth.users u, public.roles r
where u.email = 'tu-correo@ejemplo.com' and r.codigo = 'admin_sistema';
```

3. Desde ahí, el Administrador del sistema puede asignar roles a los demás
   usuarios (Pao, Dirección, Finanzas) desde `/admin`.

También crea al menos una **sucursal** y una **caja** activas (tabla `sucursales`,
`cajas`) para que los formularios de captura tengan dónde registrar.

## Roles

| Rol | Puede | No puede |
|---|---|---|
| **admin_pao** | Capturar ventas, compras, gastos, caja, inventario, documentos | Cerrar meses, eliminar movimientos, modificar reglas |
| **direccion** | Consultar ventas, costos, food cost, gastos, flujo, KPIs (solo lectura) | Editar registros operativos |
| **finanzas** | Validar, reclasificar, conciliar, aprobar/reabrir cierres, configurar catálogos financieros | — |
| **admin_sistema** | Gestionar usuarios, permisos, catálogos, configuración | Se mantiene separado del rol financiero |

## Estado del proyecto (MVP)

Construido y funcional end-to-end (Fase 40 del proyecto + Nómina):

- Catálogos base, roles, auditoría, RLS por rol en **todas** las tablas.
- Ventas (con formas de pago, descuentos, cortesías, cancelaciones, devoluciones)
  y conciliación automática contra formas de pago.
- Compras, inventarios (ledger de movimientos, costo promedio ponderado),
  conteos físicos con generación automática de ajustes, mermas.
- Recetas y **Food Cost Real** y **Food Cost Teórico** (fórmulas exactas de la
  especificación, reconstruibles desde compras/inventario/ventas).
- Gastos, con generación automática de Cuentas por Pagar a crédito.
- Nómina y **Labor Cost %**.
- Caja (saldo teórico vs. físico) y Bancos (saldo por movimientos).
- Cuentas por Pagar con antigüedad de saldos (0-30/31-60/61-90/+90).
- Cierre diario (checklist) y cierre mensual (flujo de estados con reapertura
  auditada, exclusiva de Finanzas, con motivo obligatorio).
- Motor de alertas (food cost, labor cost, merma, inventario negativo, CxP
  vencida, diferencias de caja) y snapshots de KPIs mensuales.
- Documentos vía Supabase Storage, relacionados a su movimiento de origen.
- Dashboards diferenciados: PAO (captura rápida), Dirección (rentabilidad),
  Finanzas (conciliación y trazabilidad), Admin (usuarios y roles).

**Pendiente para siguientes iteraciones** (documentado, no implementado aún):
edge functions para reportes PDF/Excel automáticos, IA de clasificación/anomalías,
forecast y presupuestos con UI dedicada, carga histórica CSV/XLSX, buscador global,
panel de calidad de datos y semáforo de cierre visual, exportaciones masivas,
respaldo/restauración documentado, y pruebas automatizadas de fórmulas financieras.

## Reglas financieras innegociables

Ver `docs/REGLAS_FINANCIERAS.md`. En resumen: nunca se confunde flujo con utilidad,
compras con costo de ventas, ni presupuesto/proyección con cifras reales; ningún
movimiento financiero se borra físicamente; toda cifra debe poder reconstruirse
desde sus movimientos de origen; los cierres cerrados solo los reabre Finanzas,
con motivo y bitácora.
