# Reglas financieras

Estas reglas son innegociables y están implementadas a nivel de base de datos
(no solo en el frontend), para que no dependan de que la UI las respete.

## Fórmulas

**Ventas netas**
```
venta_neta = venta_bruta − descuentos_total − devoluciones_total − cancelaciones_total
```
(columna `GENERATED ALWAYS` en `ventas`; las cortesías se excluyen de esta
fórmula por definición de la especificación, pero se conservan en
`cortesias_total` para análisis operativo — nunca desaparecen del reporte.)

**Food Cost Real**
```
costo_real_ventas = inventario_inicial + compras_netas − inventario_final
food_cost_real_% = costo_real_ventas / ventas_netas × 100
```
Calculado por `fn_food_cost_real(sucursal, periodo)` reconstruyendo el valor
de inventario desde el ledger `movimientos_inventario` (nunca solo desde
facturas de compra).

**Food Cost Teórico**
```
costo_teorico = Σ (cantidad_vendida × costo_estándar_de_receta)
food_cost_teorico_% = costo_teorico / ventas_netas × 100
```
`fn_food_cost_teorico` usa el costo histórico guardado en
`recetas_costo_historico` para el mes evaluado si existe, o el costo vigente
como respaldo si aún no se ha tomado la foto del mes.

**Desviación de Food Cost**
```
desviacion_pp = food_cost_real_% − food_cost_teorico_%
```

**Costo laboral**
```
labor_cost_% = costo_laboral_total_del_mes / ventas_netas × 100
```

**Merma**
```
merma_% = costo_de_merma / ventas_netas × 100
```

**Caja**
```
saldo_teorico = saldo_inicial + entradas − salidas
diferencia = saldo_fisico − saldo_teorico
```

**Cuentas por pagar**
```
saldo = importe_original − Σ pagos
dias_vencidos = hoy − fecha_vencimiento (0 si aún no vence)
estatus = PAGADO | PARCIAL | VENCIDO | POR_VENCER
```
Siempre calculado en la vista `v_cxp_saldos`, nunca almacenado como columna
editable directamente.

## Reglas de negocio innegociables (implementadas)

- **No se confunde flujo con utilidad.** El flujo de caja/bancos se calcula
  de movimientos de efectivo reales (`movimientos_caja`, `movimientos_bancarios`);
  el resultado operativo se calcula de ventas netas − costos − gastos. Son
  cálculos independientes, sin mezclarse en una sola tabla.
- **No se confunden compras con costo de ventas.** `compras.subtotal` es lo
  comprado en el periodo; el costo de ventas usa la identidad de inventario
  (inicial + compras − final), no el total de compras directamente.
- **Food cost nunca se calcula solo por facturas** — siempre pasa por el
  ledger de inventario.
- **No se modifican cierres históricos por cambios posteriores en costos**:
  `recetas_costo_historico` es un snapshot con `unique(receta_id, periodo)` y
  `ON CONFLICT DO NOTHING`.
- **No se borran movimientos financieros.** Ninguna tabla transaccional tiene
  política RLS de `DELETE`; solo baja lógica vía `estatus`.
- **No se ocultan diferencias.** `v_ventas_conciliacion`, `cierres_caja.diferencia`
  y `v_cxp_saldos` siempre exponen la diferencia calculada, nunca la redondean
  a cero ni la omiten.
- **No se permiten cierres sin evidencia.** El cierre mensual exige checklist
  completo antes de poder avanzar a `CERRADO` (validado en el frontend y
  reforzable a nivel de trigger si se requiere mayor rigidez).
- **La IA nunca altera cifras.** Ninguna función de IA (fases futuras) tendrá
  permisos de escritura sobre tablas financieras; solo lectura + sugerencias.
- **No se mezclan presupuesto/proyección con cifras reales.** `presupuestos`
  es una tabla independiente (`REAL vs. PRESUPUESTO` se compara, no se combina).
- **Cuando falta información, se muestra `PENDIENTE`/`INCOMPLETO`, nunca se
  inventa un valor** (`formatCurrency`/`formatPercent` en el frontend
  devuelven literalmente `"PENDIENTE"` ante `null`/`NaN`).
