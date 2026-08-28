# Modelo de datos (resumen)

Todas las tablas transaccionales incluyen `id uuid`, `created_at`, `updated_at`,
`created_by`, `updated_by`, `estatus` (`activo`/`baja`), `origen` y `notas`,
según la regla de auditoría de la Fase 4.

## Catálogos
`roles`, `usuarios`, `usuarios_roles`, `sucursales`, `areas`, `centros_costo`,
`proveedores`, `clientes`, `categorias_productos`, `categorias_gastos`,
`unidades_medida`, `productos`, `formas_pago`, `configuracion_sistema`.

## Ventas
`ventas`, `ventas_detalle`, `ventas_formas_pago`, `descuentos`, `cortesias`,
`cancelaciones`, `devoluciones` + vista `v_ventas_conciliacion`.

## Compras y Cuentas por Pagar
`compras`, `compras_detalle`, `cuentas_por_pagar`, `pagos_proveedores`,
`obligaciones` + vistas `v_cxp_saldos`, `v_cxp_antiguedad`.

## Inventarios, recetas y food cost
`inventarios`, `movimientos_inventario`, `conteos_inventario`,
`conteos_detalle`, `mermas`, `recetas`, `receta_detalle`,
`recetas_costo_historico` + vistas `v_recetas_costo`, `v_mermas_resumen` +
funciones `fn_food_cost_real`, `fn_food_cost_teorico`,
`fn_inventario_valor_a_fecha`, `fn_costo_receta`.

## Gastos
`gastos`.

## Nómina
`empleados`, `periodos_nomina`, `nomina_detalle` + función `fn_labor_cost`.

## Caja y Bancos
`cajas`, `movimientos_caja`, `cierres_caja`, `cuentas_bancarias`,
`movimientos_bancarios`.

## Cierres, KPIs, alertas, presupuestos, documentos
`cierres_diarios`, `cierres_mensuales`, `cierres_mensuales_historial`,
`kpis`, `alertas`, `presupuestos`, `documentos` (+ bucket de Storage
`documentos`) + funciones `fn_generar_alertas_periodo`,
`fn_snapshot_kpis_mensual`.

## Auditoría
`bitacora_auditoria` (inmutable, alimentada por `fn_auditoria_generica`
en cada `INSERT`/`UPDATE`/`DELETE` de las tablas suscritas).

Para el detalle completo de columnas, constraints y relaciones, la fuente de
verdad son los archivos en `supabase/migrations/`.
