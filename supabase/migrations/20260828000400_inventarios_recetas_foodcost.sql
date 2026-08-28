-- =====================================================================
-- Migración 04 — Inventarios, movimientos, conteos, mermas, recetas y
-- Food Cost Real / Teórico (FASE 8, 9, 10, 11)
-- =====================================================================

-- ---------------------------------------------------------------------
-- INVENTARIOS (saldo corriente por producto + sucursal)
-- ---------------------------------------------------------------------
create table public.inventarios (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id),
  sucursal_id uuid not null references public.sucursales (id),
  unidad_id uuid references public.unidades_medida (id),
  cantidad_actual numeric(14, 4) not null default 0,
  costo_promedio_actual numeric(14, 4) not null default 0,
  updated_at timestamptz not null default now(),
  unique (producto_id, sucursal_id)
);

-- ---------------------------------------------------------------------
-- MOVIMIENTOS DE INVENTARIO (ledger: única fuente de verdad de existencias)
-- ---------------------------------------------------------------------
create table public.movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id),
  sucursal_id uuid not null references public.sucursales (id),
  tipo_movimiento text not null check (tipo_movimiento in (
    'entrada_compra','salida_venta','salida_consumo',
    'traspaso_entrada','traspaso_salida','merma',
    'ajuste_positivo','ajuste_negativo','inventario_inicial'
  )),
  cantidad numeric(14, 4) not null check (cantidad > 0),
  costo_unitario numeric(14, 4),
  costo_total numeric(14, 2) generated always as (cantidad * costo_unitario) stored,
  fecha date not null default current_date,
  motivo text,
  usuario_id uuid references public.usuarios (id),
  documento_id uuid,
  referencia_tabla text,
  referencia_id uuid,
  created_at timestamptz not null default now(),
  notas text
);

create index idx_mov_inv_producto_sucursal on public.movimientos_inventario (producto_id, sucursal_id, fecha);
create index idx_mov_inv_fecha on public.movimientos_inventario (fecha);
create index idx_mov_inv_referencia on public.movimientos_inventario (referencia_tabla, referencia_id);

-- Para salidas sin costo explícito, usa el costo promedio vigente (valuación PPP)
create or replace function public.fn_pre_movimiento_inventario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promedio numeric(14, 4);
begin
  if new.tipo_movimiento not in ('entrada_compra','traspaso_entrada','inventario_inicial','ajuste_positivo')
     and new.costo_unitario is null then
    select costo_promedio_actual into v_promedio
    from public.inventarios
    where producto_id = new.producto_id and sucursal_id = new.sucursal_id;
    new.costo_unitario := coalesce(v_promedio, 0);
  end if;
  if new.costo_unitario is null then
    new.costo_unitario := 0;
  end if;
  return new;
end;
$$;

create trigger trg_pre_movimiento_inventario before insert on public.movimientos_inventario
  for each row execute function public.fn_pre_movimiento_inventario();

-- Aplica el movimiento al saldo corriente (costo promedio ponderado en entradas)
create or replace function public.fn_aplicar_movimiento_inventario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cant_actual numeric(14, 4);
  v_costo_actual numeric(14, 4);
  v_nuevo_cant numeric(14, 4);
  v_nuevo_costo numeric(14, 4);
  v_unidad uuid;
begin
  insert into public.inventarios (producto_id, sucursal_id, unidad_id)
  select new.producto_id, new.sucursal_id, p.unidad_id
  from public.productos p where p.id = new.producto_id
  on conflict (producto_id, sucursal_id) do nothing;

  select cantidad_actual, costo_promedio_actual into v_cant_actual, v_costo_actual
  from public.inventarios
  where producto_id = new.producto_id and sucursal_id = new.sucursal_id
  for update;

  if new.tipo_movimiento in ('entrada_compra','traspaso_entrada','inventario_inicial','ajuste_positivo') then
    v_nuevo_cant := v_cant_actual + new.cantidad;
    if v_nuevo_cant <> 0 then
      v_nuevo_costo := ((v_cant_actual * v_costo_actual) + (new.cantidad * new.costo_unitario)) / v_nuevo_cant;
    else
      v_nuevo_costo := new.costo_unitario;
    end if;
    update public.inventarios
      set cantidad_actual = v_nuevo_cant, costo_promedio_actual = v_nuevo_costo, updated_at = now()
      where producto_id = new.producto_id and sucursal_id = new.sucursal_id;
    update public.productos set costo_promedio = v_nuevo_costo, updated_at = now() where id = new.producto_id;
  else
    v_nuevo_cant := v_cant_actual - new.cantidad;
    update public.inventarios
      set cantidad_actual = v_nuevo_cant, updated_at = now()
      where producto_id = new.producto_id and sucursal_id = new.sucursal_id;
  end if;

  return new;
end;
$$;

create trigger trg_aplicar_movimiento_inventario after insert on public.movimientos_inventario
  for each row execute function public.fn_aplicar_movimiento_inventario();

-- Compras confirmadas generan automáticamente su entrada de inventario
create or replace function public.fn_compra_detalle_genera_movimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sucursal uuid;
  v_fecha date;
begin
  select sucursal_id, fecha into v_sucursal, v_fecha from public.compras where id = new.compra_id;
  if v_sucursal is null then
    return new;
  end if;
  insert into public.movimientos_inventario
    (producto_id, sucursal_id, tipo_movimiento, cantidad, costo_unitario, fecha, motivo, referencia_tabla, referencia_id)
  values
    (new.producto_id, v_sucursal, 'entrada_compra', new.cantidad, new.costo_unitario, v_fecha, 'Compra', 'compras_detalle', new.id);
  return new;
end;
$$;

create trigger trg_compras_detalle_movimiento after insert on public.compras_detalle
  for each row execute function public.fn_compra_detalle_genera_movimiento();

-- ---------------------------------------------------------------------
-- CONTEOS FÍSICOS DE INVENTARIO
-- ---------------------------------------------------------------------
create table public.conteos_inventario (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  sucursal_id uuid not null references public.sucursales (id),
  usuario_id uuid references public.usuarios (id),
  estatus text not null default 'abierto' check (estatus in ('abierto','cerrado')),
  created_at timestamptz not null default now(),
  cerrado_en timestamptz,
  notas text
);

create table public.conteos_detalle (
  id uuid primary key default gen_random_uuid(),
  conteo_id uuid not null references public.conteos_inventario (id) on delete cascade,
  producto_id uuid not null references public.productos (id),
  cantidad_teorica numeric(14, 4) not null default 0,
  cantidad_fisica numeric(14, 4) not null,
  costo_unitario numeric(14, 4) not null default 0,
  diferencia numeric(14, 4) generated always as (cantidad_fisica - cantidad_teorica) stored,
  valor_diferencia numeric(14, 2) generated always as ((cantidad_fisica - cantidad_teorica) * costo_unitario) stored,
  created_at timestamptz not null default now()
);

create index idx_conteos_detalle_conteo on public.conteos_detalle (conteo_id);

-- Al insertar el detalle, toma automáticamente la existencia y costo teóricos vigentes
create or replace function public.fn_snapshot_conteo_detalle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sucursal uuid;
begin
  select sucursal_id into v_sucursal from public.conteos_inventario where id = new.conteo_id;
  select coalesce(cantidad_actual, 0), coalesce(costo_promedio_actual, 0)
    into new.cantidad_teorica, new.costo_unitario
  from public.inventarios
  where producto_id = new.producto_id and sucursal_id = v_sucursal;
  new.cantidad_teorica := coalesce(new.cantidad_teorica, 0);
  new.costo_unitario := coalesce(new.costo_unitario, 0);
  return new;
end;
$$;

create trigger trg_snapshot_conteo_detalle before insert on public.conteos_detalle
  for each row execute function public.fn_snapshot_conteo_detalle();

-- Al cerrar un conteo, genera ajustes de inventario por cada diferencia detectada
create or replace function public.fn_cerrar_conteo_inventario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.estatus = 'cerrado' and old.estatus = 'abierto' then
    new.cerrado_en := now();
    for r in select * from public.conteos_detalle where conteo_id = new.id and diferencia <> 0 loop
      insert into public.movimientos_inventario
        (producto_id, sucursal_id, tipo_movimiento, cantidad, costo_unitario, fecha, motivo, usuario_id, referencia_tabla, referencia_id)
      values (
        r.producto_id, new.sucursal_id,
        case when r.diferencia > 0 then 'ajuste_positivo' else 'ajuste_negativo' end,
        abs(r.diferencia), r.costo_unitario, new.fecha,
        'Ajuste por conteo físico', new.usuario_id, 'conteos_detalle', r.id
      );
    end loop;
  end if;
  return new;
end;
$$;

create trigger trg_cerrar_conteo before update on public.conteos_inventario
  for each row execute function public.fn_cerrar_conteo_inventario();

-- ---------------------------------------------------------------------
-- MERMAS
-- ---------------------------------------------------------------------
create table public.mermas (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id),
  sucursal_id uuid not null references public.sucursales (id),
  cantidad numeric(14, 4) not null check (cantidad > 0),
  costo_unitario numeric(14, 4),
  costo_total numeric(14, 2) generated always as (cantidad * costo_unitario) stored,
  motivo text not null check (motivo in (
    'caducidad','desperdicio','error_produccion','sobreproduccion',
    'dano','cortesia','consumo_interno','robo','otro'
  )),
  fecha date not null default current_date,
  responsable_id uuid references public.usuarios (id),
  autorizado_por uuid references public.usuarios (id),
  evidencia_documento_id uuid,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text
);

create trigger trg_aud_mermas before insert or update on public.mermas
  for each row execute function public.fn_auditoria_generica();

create or replace function public.fn_merma_genera_movimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.movimientos_inventario
    (producto_id, sucursal_id, tipo_movimiento, cantidad, costo_unitario, fecha, motivo, usuario_id, referencia_tabla, referencia_id)
  values
    (new.producto_id, new.sucursal_id, 'merma', new.cantidad, new.costo_unitario, new.fecha, new.motivo, new.responsable_id, 'mermas', new.id);
  return new;
end;
$$;

create trigger trg_mermas_movimiento after insert on public.mermas
  for each row execute function public.fn_merma_genera_movimiento();

-- ---------------------------------------------------------------------
-- RECETAS
-- ---------------------------------------------------------------------
create table public.recetas (
  id uuid primary key default gen_random_uuid(),
  producto_terminado_id uuid not null references public.productos (id),
  rendimiento numeric(14, 4) not null default 1,
  merma_estandar_pct numeric(6, 2) not null default 0,
  precio_venta numeric(14, 2),
  vigente_desde date not null default current_date,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text
);

create trigger trg_aud_recetas before insert or update on public.recetas
  for each row execute function public.fn_auditoria_generica();

create table public.receta_detalle (
  id uuid primary key default gen_random_uuid(),
  receta_id uuid not null references public.recetas (id) on delete cascade,
  producto_id uuid not null references public.productos (id),
  cantidad numeric(14, 4) not null,
  unidad_id uuid references public.unidades_medida (id),
  factor_conversion numeric(14, 4) not null default 1,
  created_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id)
);

create index idx_receta_detalle_receta on public.receta_detalle (receta_id);

-- Costo vigente de una receta (live, a costos actuales de ingredientes)
create or replace function public.fn_costo_receta(p_receta_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(rd.cantidad * rd.factor_conversion * p.costo_promedio), 0)
    / greatest(1 - (r.merma_estandar_pct / 100.0), 0.01)
  from public.recetas r
  join public.receta_detalle rd on rd.receta_id = r.id
  join public.productos p on p.id = rd.producto_id
  where r.id = p_receta_id
  group by r.merma_estandar_pct;
$$;

create view public.v_recetas_costo as
select
  r.id as receta_id,
  r.producto_terminado_id,
  pt.nombre as producto_nombre,
  r.rendimiento,
  r.merma_estandar_pct,
  r.precio_venta,
  public.fn_costo_receta(r.id) as costo_total,
  round(r.precio_venta - public.fn_costo_receta(r.id), 2) as margen,
  case when r.precio_venta > 0
    then round((r.precio_venta - public.fn_costo_receta(r.id)) / r.precio_venta * 100, 2)
    else null
  end as margen_pct
from public.recetas r
join public.productos pt on pt.id = r.producto_terminado_id
where r.estatus = 'activo';

-- Snapshot histórico de costo de receta por periodo (no se recalcula retroactivamente)
create table public.recetas_costo_historico (
  id uuid primary key default gen_random_uuid(),
  receta_id uuid not null references public.recetas (id),
  periodo date not null,
  costo_total numeric(14, 4) not null,
  margen numeric(14, 2),
  margen_pct numeric(6, 2),
  calculado_en timestamptz not null default now(),
  calculado_por uuid references public.usuarios (id),
  unique (receta_id, periodo)
);

create or replace function public.fn_snapshot_costo_recetas(p_periodo date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
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
-- FOOD COST: valor de inventario reconstruible a cualquier fecha desde el ledger
-- ---------------------------------------------------------------------
create or replace function public.fn_inventario_valor_a_fecha(p_sucursal_id uuid, p_fecha date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(
    case when tipo_movimiento in ('entrada_compra','traspaso_entrada','inventario_inicial','ajuste_positivo')
      then costo_total else -costo_total end
  ), 0)
  from public.movimientos_inventario
  where sucursal_id = p_sucursal_id and fecha <= p_fecha;
$$;

-- FOOD COST REAL = (Inventario inicial + Compras netas − Inventario final) / Ventas netas
create or replace function public.fn_food_cost_real(p_sucursal_id uuid, p_periodo date)
returns table (
  inventario_inicial numeric, compras_netas numeric, inventario_final numeric,
  costo_real_ventas numeric, ventas_netas numeric, food_cost_real_pct numeric
)
language sql
stable
security definer
set search_path = public
as $$
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
    (inv_ini.v + compras.v - inv_fin.v) as costo_real_ventas,
    ventas.v,
    case when ventas.v > 0 then round((inv_ini.v + compras.v - inv_fin.v) / ventas.v * 100, 2) else null end
  from inv_ini, compras, inv_fin, ventas;
$$;

-- FOOD COST TEÓRICO = costo estándar de recetas realmente vendidas / ventas netas
create or replace function public.fn_food_cost_teorico(p_sucursal_id uuid, p_periodo date)
returns table (costo_teorico numeric, ventas_netas numeric, food_cost_teorico_pct numeric)
language sql
stable
security definer
set search_path = public
as $$
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
$$;

-- Resumen de mermas por periodo/sucursal
create view public.v_mermas_resumen as
select
  m.sucursal_id,
  date_trunc('month', m.fecha)::date as periodo,
  sum(m.costo_total) as costo_merma
from public.mermas m
where m.estatus = 'activo'
group by m.sucursal_id, date_trunc('month', m.fecha)::date;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.inventarios enable row level security;
alter table public.movimientos_inventario enable row level security;
alter table public.conteos_inventario enable row level security;
alter table public.conteos_detalle enable row level security;
alter table public.mermas enable row level security;
alter table public.recetas enable row level security;
alter table public.receta_detalle enable row level security;
alter table public.recetas_costo_historico enable row level security;

create policy inventarios_select on public.inventarios for select using (public.fn_es_usuario_sistema());
create policy inventarios_write on public.inventarios for all using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy mov_inv_select on public.movimientos_inventario for select using (public.fn_es_usuario_sistema());
create policy mov_inv_insert on public.movimientos_inventario for insert with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy conteos_select on public.conteos_inventario for select using (public.fn_es_usuario_sistema());
create policy conteos_insert on public.conteos_inventario for insert with check (public.fn_es_operativo());
create policy conteos_update on public.conteos_inventario for update using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy conteos_detalle_select on public.conteos_detalle for select using (public.fn_es_usuario_sistema());
create policy conteos_detalle_insert on public.conteos_detalle for insert with check (public.fn_es_operativo());
create policy conteos_detalle_update on public.conteos_detalle for update using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy mermas_select on public.mermas for select using (public.fn_es_usuario_sistema());
create policy mermas_insert on public.mermas for insert with check (public.fn_es_operativo());
create policy mermas_update on public.mermas for update using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy recetas_select on public.recetas for select using (public.fn_es_usuario_sistema());
create policy recetas_write on public.recetas for all using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy receta_detalle_select on public.receta_detalle for select using (public.fn_es_usuario_sistema());
create policy receta_detalle_write on public.receta_detalle for all using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy recetas_hist_select on public.recetas_costo_historico for select using (public.fn_es_usuario_sistema());
create policy recetas_hist_insert on public.recetas_costo_historico for insert with check (public.fn_es_finanzas());
