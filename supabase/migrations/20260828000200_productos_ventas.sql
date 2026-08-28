-- =====================================================================
-- Migración 02 — Productos + Ventas + Conciliación de ventas (FASE 5-6)
-- =====================================================================

-- ---------------------------------------------------------------------
-- PRODUCTOS (catálogo único: se usa como venta e insumo/ingrediente;
-- decisión documentada en docs/ARQUITECTURA.md — evita duplicar
-- "productos" e "ingredientes" como tablas separadas y conflictivas)
-- ---------------------------------------------------------------------
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria_id uuid references public.categorias_productos (id),
  unidad_id uuid references public.unidades_medida (id),
  tipo text not null default 'venta' check (tipo in ('venta', 'insumo', 'ambos')),
  costo_promedio numeric(14, 4) not null default 0,
  precio_venta numeric(14, 2),
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text
);

create trigger trg_aud_productos before insert or update on public.productos
  for each row execute function public.fn_auditoria_generica();

-- ---------------------------------------------------------------------
-- FORMAS DE PAGO
-- ---------------------------------------------------------------------
create table public.formas_pago (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('efectivo','tarjeta_credito','tarjeta_debito','transferencia','plataforma','otros')),
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now()
);

insert into public.formas_pago (nombre, tipo) values
  ('Efectivo', 'efectivo'),
  ('Tarjeta de crédito', 'tarjeta_credito'),
  ('Tarjeta de débito', 'tarjeta_debito'),
  ('Transferencia', 'transferencia'),
  ('Plataforma delivery', 'plataforma'),
  ('Otros', 'otros');

-- ---------------------------------------------------------------------
-- VENTAS
-- ---------------------------------------------------------------------
create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  turno text,
  sucursal_id uuid not null references public.sucursales (id),
  venta_bruta numeric(14, 2) not null default 0,
  descuentos_total numeric(14, 2) not null default 0,
  cortesias_total numeric(14, 2) not null default 0,
  devoluciones_total numeric(14, 2) not null default 0,
  cancelaciones_total numeric(14, 2) not null default 0,
  impuestos numeric(14, 2) not null default 0,
  -- VENTAS NETAS = venta bruta − descuentos − devoluciones − cancelaciones
  -- (cortesías se excluyen de la fórmula, pero se conservan para análisis)
  venta_neta numeric(14, 2) generated always as (
    venta_bruta - descuentos_total - devoluciones_total - cancelaciones_total
  ) stored,
  folio_pos text,
  observaciones text,
  estatus_conciliacion text not null default 'PENDIENTE'
    check (estatus_conciliacion in ('CUADRADO','DIFERENCIA','PENDIENTE','EN_REVISION')),
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text
);

create index idx_ventas_fecha on public.ventas (fecha);
create index idx_ventas_sucursal on public.ventas (sucursal_id, fecha);

create trigger trg_aud_ventas before insert or update on public.ventas
  for each row execute function public.fn_auditoria_generica();

create table public.ventas_detalle (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id) on delete cascade,
  producto_id uuid references public.productos (id),
  cantidad numeric(14, 4) not null,
  precio_unitario numeric(14, 2) not null,
  importe numeric(14, 2) generated always as (cantidad * precio_unitario) stored,
  created_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id)
);

create index idx_ventas_detalle_venta on public.ventas_detalle (venta_id);
create index idx_ventas_detalle_producto on public.ventas_detalle (producto_id);

create table public.ventas_formas_pago (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id) on delete cascade,
  forma_pago_id uuid not null references public.formas_pago (id),
  importe numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id)
);

create index idx_ventas_fp_venta on public.ventas_formas_pago (venta_id);

create table public.descuentos (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id) on delete cascade,
  motivo text not null,
  importe numeric(14, 2) not null,
  usuario_id uuid references public.usuarios (id),
  autorizado_por uuid references public.usuarios (id),
  created_at timestamptz not null default now(),
  notas text
);

create table public.cortesias (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id) on delete cascade,
  producto_id uuid references public.productos (id),
  cantidad numeric(14, 4) not null default 1,
  costo_estimado numeric(14, 2) not null default 0,
  motivo text not null,
  usuario_id uuid references public.usuarios (id),
  autorizado_por uuid references public.usuarios (id),
  created_at timestamptz not null default now(),
  notas text
);

create table public.cancelaciones (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id) on delete cascade,
  motivo text not null,
  importe numeric(14, 2) not null,
  usuario_id uuid references public.usuarios (id),
  autorizado_por uuid references public.usuarios (id),
  created_at timestamptz not null default now(),
  notas text
);

create table public.devoluciones (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id) on delete cascade,
  producto_id uuid references public.productos (id),
  cantidad numeric(14, 4) not null default 1,
  importe numeric(14, 2) not null,
  motivo text not null,
  usuario_id uuid references public.usuarios (id),
  autorizado_por uuid references public.usuarios (id),
  created_at timestamptz not null default now(),
  notas text
);

-- ---------------------------------------------------------------------
-- Recalcular automáticamente los totales de la venta a partir de los
-- movimientos de origen (descuentos, cortesías, cancelaciones, devoluciones)
-- ---------------------------------------------------------------------
create or replace function public.fn_recalcular_totales_venta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta_id uuid := coalesce(new.venta_id, old.venta_id);
begin
  update public.ventas v set
    descuentos_total = coalesce((select sum(importe) from public.descuentos where venta_id = v_venta_id), 0),
    cortesias_total = coalesce((select sum(costo_estimado) from public.cortesias where venta_id = v_venta_id), 0),
    cancelaciones_total = coalesce((select sum(importe) from public.cancelaciones where venta_id = v_venta_id), 0),
    devoluciones_total = coalesce((select sum(importe) from public.devoluciones where venta_id = v_venta_id), 0)
  where v.id = v_venta_id;
  return coalesce(new, old);
end;
$$;

create trigger trg_recalc_descuentos after insert or update or delete on public.descuentos
  for each row execute function public.fn_recalcular_totales_venta();
create trigger trg_recalc_cortesias after insert or update or delete on public.cortesias
  for each row execute function public.fn_recalcular_totales_venta();
create trigger trg_recalc_cancelaciones after insert or update or delete on public.cancelaciones
  for each row execute function public.fn_recalcular_totales_venta();
create trigger trg_recalc_devoluciones after insert or update or delete on public.devoluciones
  for each row execute function public.fn_recalcular_totales_venta();

-- ---------------------------------------------------------------------
-- CONCILIACIÓN DE VENTAS (FASE 6): venta neta vs. formas de pago capturadas
-- ---------------------------------------------------------------------
create view public.v_ventas_conciliacion as
select
  v.id as venta_id,
  v.fecha,
  v.sucursal_id,
  v.venta_neta,
  coalesce(fp.total_formas_pago, 0) as total_formas_pago,
  round(v.venta_neta - coalesce(fp.total_formas_pago, 0), 2) as diferencia,
  case
    when fp.total_formas_pago is null then 'PENDIENTE'
    when abs(v.venta_neta - fp.total_formas_pago) < 0.01 then 'CUADRADO'
    else 'DIFERENCIA'
  end as estatus_calculado
from public.ventas v
left join (
  select venta_id, sum(importe) as total_formas_pago
  from public.ventas_formas_pago
  group by venta_id
) fp on fp.venta_id = v.id
where v.estatus = 'activo';

-- Mantener ventas.estatus_conciliacion sincronizado con formas de pago capturadas
create or replace function public.fn_recalcular_conciliacion_venta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta_id uuid := coalesce(new.venta_id, old.venta_id);
  v_neta numeric(14,2);
  v_total_fp numeric(14,2);
begin
  select venta_neta into v_neta from public.ventas where id = v_venta_id;
  select coalesce(sum(importe), 0) into v_total_fp from public.ventas_formas_pago where venta_id = v_venta_id;

  update public.ventas set estatus_conciliacion = case
    when v_total_fp = 0 then 'PENDIENTE'
    when abs(v_neta - v_total_fp) < 0.01 then 'CUADRADO'
    else 'DIFERENCIA'
  end
  where id = v_venta_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_conciliacion_ventas_fp after insert or update or delete on public.ventas_formas_pago
  for each row execute function public.fn_recalcular_conciliacion_venta();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.productos enable row level security;
alter table public.formas_pago enable row level security;
alter table public.ventas enable row level security;
alter table public.ventas_detalle enable row level security;
alter table public.ventas_formas_pago enable row level security;
alter table public.descuentos enable row level security;
alter table public.cortesias enable row level security;
alter table public.cancelaciones enable row level security;
alter table public.devoluciones enable row level security;

create policy productos_select on public.productos for select using (public.fn_es_usuario_sistema());
create policy productos_insert on public.productos for insert with check (public.fn_es_operativo() or public.fn_es_finanzas());
create policy productos_update on public.productos for update using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy formas_pago_select on public.formas_pago for select using (public.fn_es_usuario_sistema());
create policy formas_pago_write on public.formas_pago for all using (public.fn_tiene_rol('admin_sistema')) with check (public.fn_tiene_rol('admin_sistema'));

-- Ventas: Pao captura; Finanzas valida/reclasifica; Dirección solo lee.
-- Nadie puede hacer DELETE físico (no se otorga policy de delete): baja lógica vía UPDATE estatus.
create policy ventas_select on public.ventas for select using (public.fn_es_usuario_sistema());
create policy ventas_insert on public.ventas for insert with check (public.fn_es_operativo());
create policy ventas_update on public.ventas for update using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy ventas_detalle_select on public.ventas_detalle for select using (public.fn_es_usuario_sistema());
create policy ventas_detalle_insert on public.ventas_detalle for insert with check (public.fn_es_operativo());
create policy ventas_detalle_update on public.ventas_detalle for update using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy ventas_fp_select on public.ventas_formas_pago for select using (public.fn_es_usuario_sistema());
create policy ventas_fp_insert on public.ventas_formas_pago for insert with check (public.fn_es_operativo());
create policy ventas_fp_update on public.ventas_formas_pago for update using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy descuentos_select on public.descuentos for select using (public.fn_es_usuario_sistema());
create policy descuentos_insert on public.descuentos for insert with check (public.fn_es_operativo());
create policy descuentos_update on public.descuentos for update using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy cortesias_select on public.cortesias for select using (public.fn_es_usuario_sistema());
create policy cortesias_insert on public.cortesias for insert with check (public.fn_es_operativo());
create policy cortesias_update on public.cortesias for update using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy cancelaciones_select on public.cancelaciones for select using (public.fn_es_usuario_sistema());
create policy cancelaciones_insert on public.cancelaciones for insert with check (public.fn_es_operativo());
create policy cancelaciones_update on public.cancelaciones for update using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy devoluciones_select on public.devoluciones for select using (public.fn_es_usuario_sistema());
create policy devoluciones_insert on public.devoluciones for insert with check (public.fn_es_operativo());
create policy devoluciones_update on public.devoluciones for update using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());
