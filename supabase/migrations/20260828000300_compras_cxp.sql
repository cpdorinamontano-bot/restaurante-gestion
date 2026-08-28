-- =====================================================================
-- Migración 03 — Compras + Cuentas por Pagar (FASE 7, 16)
-- =====================================================================

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores (id),
  fecha date not null,
  folio text,
  factura_uuid text,
  categoria_id uuid references public.categorias_productos (id),
  centro_costo_id uuid references public.centros_costo (id),
  sucursal_id uuid references public.sucursales (id),
  subtotal numeric(14, 2) not null default 0,
  impuestos numeric(14, 2) not null default 0,
  total numeric(14, 2) generated always as (subtotal + impuestos) stored,
  forma_pago_id uuid references public.formas_pago (id),
  fecha_vencimiento date,
  estatus_pago text not null default 'pendiente' check (estatus_pago in ('pendiente','pagada','parcial')),
  documento_id uuid,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text
);

create index idx_compras_fecha on public.compras (fecha);
create index idx_compras_proveedor on public.compras (proveedor_id);

create trigger trg_aud_compras before insert or update on public.compras
  for each row execute function public.fn_auditoria_generica();

create table public.compras_detalle (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras (id) on delete cascade,
  producto_id uuid not null references public.productos (id),
  cantidad numeric(14, 4) not null,
  unidad_id uuid references public.unidades_medida (id),
  costo_unitario numeric(14, 4) not null,
  subtotal numeric(14, 2) generated always as (cantidad * costo_unitario) stored,
  created_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id)
);

create index idx_compras_detalle_compra on public.compras_detalle (compra_id);
create index idx_compras_detalle_producto on public.compras_detalle (producto_id);

-- Recalcula compras.subtotal a partir de compras_detalle (fuente de origen)
create or replace function public.fn_recalcular_subtotal_compra()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra_id uuid := coalesce(new.compra_id, old.compra_id);
begin
  update public.compras set
    subtotal = coalesce((select sum(subtotal) from public.compras_detalle where compra_id = v_compra_id), 0)
  where id = v_compra_id;
  return coalesce(new, old);
end;
$$;

create trigger trg_recalc_compras_detalle after insert or update or delete on public.compras_detalle
  for each row execute function public.fn_recalcular_subtotal_compra();

-- ---------------------------------------------------------------------
-- CUENTAS POR PAGAR
-- ---------------------------------------------------------------------
create table public.cuentas_por_pagar (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores (id),
  origen_tabla text not null check (origen_tabla in ('compras', 'gastos')),
  origen_id uuid not null,
  documento_referencia text,
  fecha_emision date not null,
  fecha_vencimiento date not null,
  importe_original numeric(14, 2) not null,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text,
  unique (origen_tabla, origen_id)
);

create index idx_cxp_proveedor on public.cuentas_por_pagar (proveedor_id);
create index idx_cxp_vencimiento on public.cuentas_por_pagar (fecha_vencimiento);

create trigger trg_aud_cxp before insert or update on public.cuentas_por_pagar
  for each row execute function public.fn_auditoria_generica();

create table public.pagos_proveedores (
  id uuid primary key default gen_random_uuid(),
  cuenta_por_pagar_id uuid not null references public.cuentas_por_pagar (id),
  fecha date not null,
  importe numeric(14, 2) not null,
  forma_pago_id uuid references public.formas_pago (id),
  referencia text,
  documento_id uuid,
  usuario_id uuid references public.usuarios (id),
  created_at timestamptz not null default now(),
  notas text
);

create index idx_pagos_prov_cxp on public.pagos_proveedores (cuenta_por_pagar_id);

-- Alta automática de CxP cuando una compra queda a crédito (pendiente/parcial)
create or replace function public.fn_generar_cxp_compra()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estatus_pago in ('pendiente', 'parcial') then
    insert into public.cuentas_por_pagar (proveedor_id, origen_tabla, origen_id, documento_referencia, fecha_emision, fecha_vencimiento, importe_original)
    values (new.proveedor_id, 'compras', new.id, new.folio, new.fecha, coalesce(new.fecha_vencimiento, new.fecha), new.total)
    on conflict (origen_tabla, origen_id) do update set
      importe_original = excluded.importe_original,
      fecha_vencimiento = excluded.fecha_vencimiento;
  end if;
  return new;
end;
$$;

create trigger trg_compras_generar_cxp after insert or update of estatus_pago, total on public.compras
  for each row execute function public.fn_generar_cxp_compra();

-- Vista: saldos y estatus de CxP, siempre reconstruible desde pagos_proveedores
create view public.v_cxp_saldos as
select
  c.id as cuenta_por_pagar_id,
  c.proveedor_id,
  p.nombre as proveedor_nombre,
  c.origen_tabla,
  c.origen_id,
  c.documento_referencia,
  c.fecha_emision,
  c.fecha_vencimiento,
  c.importe_original,
  coalesce(pg.total_pagado, 0) as total_pagado,
  round(c.importe_original - coalesce(pg.total_pagado, 0), 2) as saldo,
  greatest(0, (current_date - c.fecha_vencimiento))::int as dias_vencidos,
  case
    when round(c.importe_original - coalesce(pg.total_pagado, 0), 2) <= 0 then 'PAGADO'
    when coalesce(pg.total_pagado, 0) > 0 then 'PARCIAL'
    when current_date > c.fecha_vencimiento then 'VENCIDO'
    else 'POR_VENCER'
  end as estatus_cxp
from public.cuentas_por_pagar c
join public.proveedores p on p.id = c.proveedor_id
left join (
  select cuenta_por_pagar_id, sum(importe) as total_pagado
  from public.pagos_proveedores
  group by cuenta_por_pagar_id
) pg on pg.cuenta_por_pagar_id = c.id
where c.estatus = 'activo';

-- Vista: antigüedad de saldos (0-30 / 31-60 / 61-90 / +90)
create view public.v_cxp_antiguedad as
select
  *,
  case
    when saldo <= 0 then 'PAGADO'
    when dias_vencidos <= 30 then '0-30'
    when dias_vencidos <= 60 then '31-60'
    when dias_vencidos <= 90 then '61-90'
    else 'MAS_90'
  end as rango_antiguedad
from public.v_cxp_saldos;

create table public.obligaciones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  concepto text not null,
  fecha_vencimiento date not null,
  importe numeric(14, 2) not null,
  estatus_pago text not null default 'pendiente' check (estatus_pago in ('pendiente','pagada','parcial')),
  documento_id uuid,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text
);

create trigger trg_aud_obligaciones before insert or update on public.obligaciones
  for each row execute function public.fn_auditoria_generica();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.compras enable row level security;
alter table public.compras_detalle enable row level security;
alter table public.cuentas_por_pagar enable row level security;
alter table public.pagos_proveedores enable row level security;
alter table public.obligaciones enable row level security;

create policy compras_select on public.compras for select using (public.fn_es_usuario_sistema());
create policy compras_insert on public.compras for insert with check (public.fn_es_operativo());
create policy compras_update on public.compras for update using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy compras_detalle_select on public.compras_detalle for select using (public.fn_es_usuario_sistema());
create policy compras_detalle_insert on public.compras_detalle for insert with check (public.fn_es_operativo());
create policy compras_detalle_update on public.compras_detalle for update using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());

-- CxP: Pao ve y registra pendientes (vía compras); solo Finanzas concilia/edita directamente
create policy cxp_select on public.cuentas_por_pagar for select using (public.fn_es_usuario_sistema());
create policy cxp_write on public.cuentas_por_pagar for all using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy pagos_prov_select on public.pagos_proveedores for select using (public.fn_es_usuario_sistema());
create policy pagos_prov_insert on public.pagos_proveedores for insert with check (public.fn_es_operativo() or public.fn_es_finanzas());
create policy pagos_prov_update on public.pagos_proveedores for update using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy obligaciones_select on public.obligaciones for select using (public.fn_es_usuario_sistema());
create policy obligaciones_write on public.obligaciones for all using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());
