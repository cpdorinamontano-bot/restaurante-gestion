-- =====================================================================
-- Migración 09 — Endurecimiento de seguridad (FASE 34)
-- Corrige hallazgos del advisor de Supabase:
--  1) Vistas SECURITY DEFINER que evadían RLS de las tablas base
--  2) Funciones SECURITY DEFINER ejecutables por `anon`/`authenticated`
--     sin control de acceso interno (podían filtrar datos financieros
--     sin pasar por RLS)
--  3) search_path mutable en función auxiliar
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Vistas: forzar que se evalúen con los privilegios (y RLS) del
--    usuario que consulta, no del dueño de la vista.
-- ---------------------------------------------------------------------
alter view public.v_ventas_conciliacion set (security_invoker = true);
alter view public.v_cxp_saldos set (security_invoker = true);
alter view public.v_cxp_antiguedad set (security_invoker = true);
alter view public.v_recetas_costo set (security_invoker = true);
alter view public.v_mermas_resumen set (security_invoker = true);

-- ---------------------------------------------------------------------
-- 2) Revocar ejecución pública por defecto; solo `authenticated` puede
--    invocar funciones, y las que exponen datos financieros agregados
--    o realizan escritura llevan además un guardia interno de rol.
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public;
grant execute on all functions in schema public to authenticated;
alter default privileges in schema public revoke execute on functions from public;

create or replace function public.fn_costo_receta(p_receta_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_costo numeric;
begin
  if not public.fn_es_usuario_sistema() then
    raise exception 'No autorizado';
  end if;
  select coalesce(sum(rd.cantidad * rd.factor_conversion * p.costo_promedio), 0)
    / greatest(1 - (r.merma_estandar_pct / 100.0), 0.01)
  into v_costo
  from public.recetas r
  join public.receta_detalle rd on rd.receta_id = r.id
  join public.productos p on p.id = rd.producto_id
  where r.id = p_receta_id
  group by r.merma_estandar_pct;
  return coalesce(v_costo, 0);
end;
$$;

create or replace function public.fn_inventario_valor_a_fecha(p_sucursal_id uuid, p_fecha date)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_valor numeric;
begin
  if not public.fn_es_usuario_sistema() then
    raise exception 'No autorizado';
  end if;
  select coalesce(sum(
    case when tipo_movimiento in ('entrada_compra','traspaso_entrada','inventario_inicial','ajuste_positivo')
      then costo_total else -costo_total end
  ), 0) into v_valor
  from public.movimientos_inventario
  where sucursal_id = p_sucursal_id and fecha <= p_fecha;
  return v_valor;
end;
$$;

create or replace function public.fn_food_cost_real(p_sucursal_id uuid, p_periodo date)
returns table (
  inventario_inicial numeric, compras_netas numeric, inventario_final numeric,
  costo_real_ventas numeric, ventas_netas numeric, food_cost_real_pct numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.fn_es_usuario_sistema() then
    raise exception 'No autorizado';
  end if;
  return query
  with periodo as (
    select date_trunc('month', p_periodo)::date as inicio,
           (date_trunc('month', p_periodo) + interval '1 month - 1 day')::date as fin
  ),
  inv_ini as (select public.fn_inventario_valor_a_fecha(p_sucursal_id, (select inicio from periodo) - 1) as v),
  inv_fin as (select public.fn_inventario_valor_a_fecha(p_sucursal_id, (select fin from periodo)) as v),
  compras as (
    select coalesce(sum(c.subtotal), 0) as v
    from public.compras c, periodo
    where c.sucursal_id = p_sucursal_id and c.estatus = 'activo'
      and c.fecha between periodo.inicio and periodo.fin
  ),
  ventas as (
    select coalesce(sum(v.venta_neta), 0) as v
    from public.ventas v, periodo
    where v.sucursal_id = p_sucursal_id and v.estatus = 'activo'
      and v.fecha between periodo.inicio and periodo.fin
  )
  select
    inv_ini.v, compras.v, inv_fin.v,
    (inv_ini.v + compras.v - inv_fin.v),
    ventas.v,
    case when ventas.v > 0 then round((inv_ini.v + compras.v - inv_fin.v) / ventas.v * 100, 2) else null end
  from inv_ini, compras, inv_fin, ventas;
end;
$$;

create or replace function public.fn_food_cost_teorico(p_sucursal_id uuid, p_periodo date)
returns table (costo_teorico numeric, ventas_netas numeric, food_cost_teorico_pct numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.fn_es_usuario_sistema() then
    raise exception 'No autorizado';
  end if;
  return query
  with periodo as (
    select date_trunc('month', p_periodo)::date as inicio,
           (date_trunc('month', p_periodo) + interval '1 month - 1 day')::date as fin
  ),
  costo as (
    select coalesce(sum(
      vd.cantidad * coalesce(
        (select rch.costo_total from public.recetas_costo_historico rch
         where rch.receta_id = r.id and rch.periodo = date_trunc('month', p_periodo)::date),
        public.fn_costo_receta(r.id)
      )
    ), 0) as v
    from public.ventas_detalle vd
    join public.ventas v on v.id = vd.venta_id
    join public.recetas r on r.producto_terminado_id = vd.producto_id and r.estatus = 'activo'
    where v.sucursal_id = p_sucursal_id and v.estatus = 'activo'
      and v.fecha between (select inicio from periodo) and (select fin from periodo)
  ),
  ventas as (
    select coalesce(sum(v.venta_neta), 0) as v
    from public.ventas v, periodo
    where v.sucursal_id = p_sucursal_id and v.estatus = 'activo'
      and v.fecha between periodo.inicio and periodo.fin
  )
  select costo.v, ventas.v,
    case when ventas.v > 0 then round(costo.v / ventas.v * 100, 2) else null end
  from costo, ventas;
end;
$$;

create or replace function public.fn_labor_cost(p_sucursal_id uuid, p_periodo date)
returns table (costo_laboral numeric, ventas_netas numeric, labor_cost_pct numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.fn_es_usuario_sistema() then
    raise exception 'No autorizado';
  end if;
  return query
  with periodo as (
    select date_trunc('month', p_periodo)::date as inicio,
           (date_trunc('month', p_periodo) + interval '1 month - 1 day')::date as fin
  ),
  costo as (
    select coalesce(sum(nd.costo_total), 0) as v
    from public.nomina_detalle nd
    join public.periodos_nomina pn on pn.id = nd.periodo_id
    join public.empleados e on e.id = nd.empleado_id
    where e.sucursal_id = p_sucursal_id
      and pn.fecha_inicio <= (select fin from periodo)
      and pn.fecha_fin >= (select inicio from periodo)
  ),
  ventas as (
    select coalesce(sum(v.venta_neta), 0) as v
    from public.ventas v, periodo
    where v.sucursal_id = p_sucursal_id and v.estatus = 'activo'
      and v.fecha between periodo.inicio and periodo.fin
  )
  select costo.v, ventas.v,
    case when ventas.v > 0 then round(costo.v / ventas.v * 100, 2) else null end
  from costo, ventas;
end;
$$;

-- Funciones de escritura/administración: exigen rol Finanzas/Admin
create or replace function public.fn_generar_alertas_periodo(p_sucursal_id uuid, p_periodo date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_periodo date := date_trunc('month', p_periodo)::date;
  v_fc_real record;
  v_fc_teo record;
  v_labor record;
  v_merma numeric;
  v_desviacion_max numeric;
  v_labor_max numeric;
  v_merma_max numeric;
  v_caja_tolerancia numeric;
  v_count integer := 0;
  r record;
begin
  if not public.fn_es_finanzas() then
    raise exception 'No autorizado';
  end if;

  select (valor::text)::numeric into v_desviacion_max from public.configuracion_sistema where clave = 'food_cost_desviacion_alerta_pct';
  select (valor::text)::numeric into v_labor_max from public.configuracion_sistema where clave = 'labor_cost_objetivo_pct';
  select (valor::text)::numeric into v_merma_max from public.configuracion_sistema where clave = 'merma_alerta_pct';
  select (valor::text)::numeric into v_caja_tolerancia from public.configuracion_sistema where clave = 'caja_diferencia_tolerancia';

  select * into v_fc_real from public.fn_food_cost_real(p_sucursal_id, v_periodo);
  select * into v_fc_teo from public.fn_food_cost_teorico(p_sucursal_id, v_periodo);
  select * into v_labor from public.fn_labor_cost(p_sucursal_id, v_periodo);
  select coalesce(costo_merma, 0) into v_merma from public.v_mermas_resumen where sucursal_id = p_sucursal_id and periodo = v_periodo;

  if v_fc_real.food_cost_real_pct is not null and v_fc_teo.food_cost_teorico_pct is not null
     and (v_fc_real.food_cost_real_pct - v_fc_teo.food_cost_teorico_pct) > coalesce(v_desviacion_max, 5) then
    insert into public.alertas (tipo, severidad, mensaje, sucursal_id)
    values ('food_cost_desviacion', 'critical', format(
      'Desviación de Food Cost: real %s%% vs teórico %s%% (+%s pp)',
      v_fc_real.food_cost_real_pct, v_fc_teo.food_cost_teorico_pct,
      round(v_fc_real.food_cost_real_pct - v_fc_teo.food_cost_teorico_pct, 2)
    ), p_sucursal_id);
    v_count := v_count + 1;
  end if;

  if v_labor.labor_cost_pct is not null and v_labor.labor_cost_pct > coalesce(v_labor_max, 28) then
    insert into public.alertas (tipo, severidad, mensaje, sucursal_id)
    values ('labor_cost_excedido', 'warning', format('Costo laboral %s%% supera el objetivo de %s%%', v_labor.labor_cost_pct, v_labor_max), p_sucursal_id);
    v_count := v_count + 1;
  end if;

  if v_fc_real.ventas_netas > 0 and (v_merma / v_fc_real.ventas_netas * 100) > coalesce(v_merma_max, 3) then
    insert into public.alertas (tipo, severidad, mensaje, sucursal_id)
    values ('merma_excesiva', 'warning', format('Merma %s%% sobre ventas netas', round(v_merma / v_fc_real.ventas_netas * 100, 2)), p_sucursal_id);
    v_count := v_count + 1;
  end if;

  for r in select * from public.inventarios where sucursal_id = p_sucursal_id and cantidad_actual < 0 loop
    insert into public.alertas (tipo, severidad, mensaje, sucursal_id, entidad_tabla, entidad_id)
    values ('inventario_negativo', 'critical', 'Inventario negativo detectado', p_sucursal_id, 'inventarios', r.id);
    v_count := v_count + 1;
  end loop;

  for r in select * from public.v_cxp_saldos where estatus_cxp = 'VENCIDO' loop
    insert into public.alertas (tipo, severidad, mensaje, entidad_tabla, entidad_id)
    values ('proveedor_vencido', 'warning', format('CxP vencida: %s por %s (%s días)', r.proveedor_nombre, r.saldo, r.dias_vencidos), 'cuentas_por_pagar', r.cuenta_por_pagar_id);
    v_count := v_count + 1;
  end loop;

  for r in select * from public.cierres_caja
    where caja_id in (select id from public.cajas where sucursal_id = p_sucursal_id)
      and saldo_fisico is not null and abs(diferencia) > coalesce(v_caja_tolerancia, 50)
      and date_trunc('month', fecha)::date = v_periodo
  loop
    insert into public.alertas (tipo, severidad, mensaje, sucursal_id, entidad_tabla, entidad_id)
    values ('caja_con_diferencia', 'warning', format('Diferencia de caja: %s', r.diferencia), p_sucursal_id, 'cierres_caja', r.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.fn_snapshot_kpis_mensual(p_sucursal_id uuid, p_periodo date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_periodo date := date_trunc('month', p_periodo)::date;
  v_fc_real record;
  v_fc_teo record;
  v_labor record;
  v_merma numeric;
begin
  if not public.fn_es_finanzas() then
    raise exception 'No autorizado';
  end if;

  select * into v_fc_real from public.fn_food_cost_real(p_sucursal_id, v_periodo);
  select * into v_fc_teo from public.fn_food_cost_teorico(p_sucursal_id, v_periodo);
  select * into v_labor from public.fn_labor_cost(p_sucursal_id, v_periodo);
  select coalesce(costo_merma, 0) into v_merma from public.v_mermas_resumen
    where sucursal_id = p_sucursal_id and periodo = v_periodo;

  insert into public.kpis (periodo, tipo_periodo, sucursal_id, nombre_kpi, valor)
  values
    (v_periodo, 'mensual', p_sucursal_id, 'ventas_netas', v_fc_real.ventas_netas),
    (v_periodo, 'mensual', p_sucursal_id, 'food_cost_real_pct', v_fc_real.food_cost_real_pct),
    (v_periodo, 'mensual', p_sucursal_id, 'food_cost_teorico_pct', v_fc_teo.food_cost_teorico_pct),
    (v_periodo, 'mensual', p_sucursal_id, 'food_cost_desviacion_pct',
      coalesce(v_fc_real.food_cost_real_pct, 0) - coalesce(v_fc_teo.food_cost_teorico_pct, 0)),
    (v_periodo, 'mensual', p_sucursal_id, 'labor_cost_pct', v_labor.labor_cost_pct),
    (v_periodo, 'mensual', p_sucursal_id, 'merma_pct',
      case when v_fc_real.ventas_netas > 0 then round(v_merma / v_fc_real.ventas_netas * 100, 2) else null end)
  on conflict (periodo, tipo_periodo, sucursal_id, nombre_kpi)
  do update set valor = excluded.valor, created_at = now();
end;
$$;

create or replace function public.fn_snapshot_costo_recetas(p_periodo date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if not public.fn_es_finanzas() then
    raise exception 'No autorizado';
  end if;

  insert into public.recetas_costo_historico (receta_id, periodo, costo_total, margen, margen_pct, calculado_por)
  select
    r.id, date_trunc('month', p_periodo)::date, public.fn_costo_receta(r.id),
    round(r.precio_venta - public.fn_costo_receta(r.id), 2),
    case when r.precio_venta > 0 then round((r.precio_venta - public.fn_costo_receta(r.id)) / r.precio_venta * 100, 2) else null end,
    auth.uid()
  from public.recetas r
  where r.estatus = 'activo'
  on conflict (receta_id, periodo) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- 3) search_path mutable
-- ---------------------------------------------------------------------
create or replace function public.fn_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Re-otorgar ejecución a `authenticated` para las funciones recién recreadas
grant execute on all functions in schema public to authenticated;
