-- =====================================================================
-- Migración 08 — Documentos, Cierres (diario/mensual), KPIs, Alertas,
-- Presupuestos (FASE 17, 21, 22, 26, 30, 44)
-- =====================================================================

-- ---------------------------------------------------------------------
-- DOCUMENTOS (Supabase Storage)
-- ---------------------------------------------------------------------
create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in (
    'cfdi','factura','ticket','estado_cuenta','comprobante_bancario',
    'cotizacion','orden_compra','inventario','excel','pdf','imagen','otro'
  )),
  storage_path text not null,
  nombre_archivo text,
  tabla_relacionada text,
  registro_relacionado_id uuid,
  subido_por uuid references public.usuarios (id),
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  notas text
);

create index idx_documentos_relacion on public.documentos (tabla_relacionada, registro_relacionado_id);

alter table public.compras add constraint fk_compras_documento foreign key (documento_id) references public.documentos (id);
alter table public.gastos add constraint fk_gastos_documento foreign key (documento_id) references public.documentos (id);
alter table public.mermas add constraint fk_mermas_documento foreign key (evidencia_documento_id) references public.documentos (id);
alter table public.movimientos_inventario add constraint fk_mov_inv_documento foreign key (documento_id) references public.documentos (id);
alter table public.pagos_proveedores add constraint fk_pagos_prov_documento foreign key (documento_id) references public.documentos (id);
alter table public.movimientos_bancarios add constraint fk_mov_banc_documento foreign key (documento_id) references public.documentos (id);
alter table public.obligaciones add constraint fk_obligaciones_documento foreign key (documento_id) references public.documentos (id);

-- ---------------------------------------------------------------------
-- CIERRE DIARIO (FASE 21)
-- ---------------------------------------------------------------------
create table public.cierres_diarios (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  sucursal_id uuid not null references public.sucursales (id),
  checklist jsonb not null default '{
    "ventas_completas": false, "formas_pago_cuadradas": false, "caja_cuadrada": false,
    "gastos_capturados": false, "compras_capturadas": false, "documentos_cargados": false,
    "diferencias_justificadas": false
  }'::jsonb,
  estatus text not null default 'ABIERTO' check (estatus in ('ABIERTO','PENDIENTE','VALIDADO')),
  validado_por uuid references public.usuarios (id),
  validado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  notas text,
  unique (fecha, sucursal_id)
);

create trigger trg_aud_cierres_diarios before insert or update on public.cierres_diarios
  for each row execute function public.fn_auditoria_generica();

-- ---------------------------------------------------------------------
-- CIERRE MENSUAL (FASE 22, 47) con historial de apertura/cierre/reapertura
-- ---------------------------------------------------------------------
create table public.cierres_mensuales (
  id uuid primary key default gen_random_uuid(),
  periodo date not null,
  sucursal_id uuid not null references public.sucursales (id),
  estatus text not null default 'ABIERTO' check (estatus in (
    'ABIERTO','EN_REVISION','CON_OBSERVACIONES','VALIDADO','CERRADO'
  )),
  checklist jsonb not null default '{
    "ventas_conciliadas": false, "caja_conciliada": false, "bancos_conciliados": false,
    "compras_completas": false, "inventario_validado": false, "food_cost_calculado": false,
    "nomina_integrada": false, "gastos_clasificados": false, "cxp_validada": false,
    "obligaciones_registradas": false, "documentos_completos": false, "variaciones_analizadas": false
  }'::jsonb,
  motivo_cambio text,
  cerrado_por uuid references public.usuarios (id),
  cerrado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  notas text,
  unique (periodo, sucursal_id)
);

create table public.cierres_mensuales_historial (
  id uuid primary key default gen_random_uuid(),
  cierre_mensual_id uuid not null references public.cierres_mensuales (id),
  accion text not null check (accion in ('APERTURA','CAMBIO_ESTATUS','CIERRE','REAPERTURA')),
  estatus_anterior text,
  estatus_nuevo text not null,
  usuario_id uuid references public.usuarios (id),
  motivo text,
  fecha timestamptz not null default now()
);

create index idx_cierres_mensuales_hist_cierre on public.cierres_mensuales_historial (cierre_mensual_id);

-- Solo Finanzas/Admin puede reabrir un periodo CERRADO, y exige motivo (FASE 47)
create or replace function public.fn_validar_cambio_cierre_mensual()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.estatus = 'CERRADO' and new.estatus <> 'CERRADO' then
    if not public.fn_es_finanzas() then
      raise exception 'Solo Finanzas puede reabrir un periodo cerrado';
    end if;
    if new.motivo_cambio is null or length(trim(new.motivo_cambio)) = 0 then
      raise exception 'Debe indicar el motivo de la reapertura';
    end if;
    insert into public.cierres_mensuales_historial (cierre_mensual_id, accion, estatus_anterior, estatus_nuevo, usuario_id, motivo)
    values (new.id, 'REAPERTURA', old.estatus, new.estatus, auth.uid(), new.motivo_cambio);
  elsif new.estatus = 'CERRADO' and old.estatus <> 'CERRADO' then
    new.cerrado_por := auth.uid();
    new.cerrado_en := now();
    insert into public.cierres_mensuales_historial (cierre_mensual_id, accion, estatus_anterior, estatus_nuevo, usuario_id, motivo)
    values (new.id, 'CIERRE', old.estatus, new.estatus, auth.uid(), new.motivo_cambio);
  elsif new.estatus <> old.estatus then
    insert into public.cierres_mensuales_historial (cierre_mensual_id, accion, estatus_anterior, estatus_nuevo, usuario_id, motivo)
    values (new.id, 'CAMBIO_ESTATUS', old.estatus, new.estatus, auth.uid(), new.motivo_cambio);
  end if;
  return new;
end;
$$;

create trigger trg_validar_cambio_cierre_mensual before update on public.cierres_mensuales
  for each row execute function public.fn_validar_cambio_cierre_mensual();

create or replace function public.fn_registrar_apertura_cierre_mensual()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cierres_mensuales_historial (cierre_mensual_id, accion, estatus_anterior, estatus_nuevo, usuario_id, motivo)
  values (new.id, 'APERTURA', null, new.estatus, auth.uid(), 'Apertura de periodo');
  return new;
end;
$$;

create trigger trg_registrar_apertura_cierre_mensual after insert on public.cierres_mensuales
  for each row execute function public.fn_registrar_apertura_cierre_mensual();

-- ---------------------------------------------------------------------
-- KPIs (snapshots históricos para tablero rápido y comparativos)
-- ---------------------------------------------------------------------
create table public.kpis (
  id uuid primary key default gen_random_uuid(),
  periodo date not null,
  tipo_periodo text not null check (tipo_periodo in ('diario','mensual')),
  sucursal_id uuid not null references public.sucursales (id),
  nombre_kpi text not null,
  valor numeric(18, 4),
  meta numeric(18, 4),
  created_at timestamptz not null default now(),
  unique (periodo, tipo_periodo, sucursal_id, nombre_kpi)
);

-- Genera/actualiza el snapshot mensual de los KPIs principales para una sucursal+periodo
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

-- ---------------------------------------------------------------------
-- ALERTAS (FASE 26)
-- ---------------------------------------------------------------------
create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  severidad text not null default 'warning' check (severidad in ('info','warning','critical')),
  mensaje text not null,
  sucursal_id uuid references public.sucursales (id),
  entidad_tabla text,
  entidad_id uuid,
  estatus text not null default 'abierta' check (estatus in ('abierta','atendida','descartada')),
  atendida_por uuid references public.usuarios (id),
  atendida_en timestamptz,
  created_at timestamptz not null default now()
);

create index idx_alertas_estatus on public.alertas (estatus, created_at desc);

-- Motor de alertas: evalúa condiciones configurables sobre el mes indicado
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

-- ---------------------------------------------------------------------
-- PRESUPUESTOS (FASE 44)
-- ---------------------------------------------------------------------
create table public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  periodo date not null,
  sucursal_id uuid not null references public.sucursales (id),
  categoria text not null check (categoria in ('ventas','food_cost','labor_cost','gastos','utilidad')),
  valor_objetivo numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  notas text,
  unique (periodo, sucursal_id, categoria)
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.documentos enable row level security;
alter table public.cierres_diarios enable row level security;
alter table public.cierres_mensuales enable row level security;
alter table public.cierres_mensuales_historial enable row level security;
alter table public.kpis enable row level security;
alter table public.alertas enable row level security;
alter table public.presupuestos enable row level security;

create policy documentos_select on public.documentos for select using (public.fn_es_usuario_sistema());
create policy documentos_insert on public.documentos for insert with check (public.fn_es_operativo() or public.fn_es_finanzas());
create policy documentos_update on public.documentos for update using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy cierres_diarios_select on public.cierres_diarios for select using (public.fn_es_usuario_sistema());
create policy cierres_diarios_insert on public.cierres_diarios for insert with check (public.fn_es_operativo());
create policy cierres_diarios_update on public.cierres_diarios for update using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy cierres_mensuales_select on public.cierres_mensuales for select using (public.fn_es_usuario_sistema());
create policy cierres_mensuales_insert on public.cierres_mensuales for insert with check (public.fn_es_finanzas());
create policy cierres_mensuales_update on public.cierres_mensuales for update using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy cierres_mensuales_hist_select on public.cierres_mensuales_historial for select using (public.fn_es_usuario_sistema());

create policy kpis_select on public.kpis for select using (public.fn_es_usuario_sistema());
create policy kpis_write on public.kpis for all using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy alertas_select on public.alertas for select using (public.fn_es_usuario_sistema());
create policy alertas_update on public.alertas for update using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy presupuestos_select on public.presupuestos for select using (public.fn_es_usuario_sistema());
create policy presupuestos_write on public.presupuestos for all using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());
