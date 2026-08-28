-- =====================================================================
-- Migración 06 — Nómina y costo laboral (FASE 13)
-- =====================================================================

create table public.empleados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  puesto text,
  area_id uuid references public.areas (id),
  sucursal_id uuid references public.sucursales (id),
  fecha_ingreso date,
  sueldo_base numeric(14, 2) not null default 0,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text
);

create trigger trg_aud_empleados before insert or update on public.empleados
  for each row execute function public.fn_auditoria_generica();

create table public.periodos_nomina (
  id uuid primary key default gen_random_uuid(),
  fecha_inicio date not null,
  fecha_fin date not null,
  tipo text not null check (tipo in ('semanal','quincenal','mensual')),
  estatus text not null default 'abierto' check (estatus in ('abierto','cerrado')),
  created_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  notas text,
  check (fecha_fin >= fecha_inicio)
);

create index idx_periodos_nomina_fechas on public.periodos_nomina (fecha_inicio, fecha_fin);

create table public.nomina_detalle (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null references public.periodos_nomina (id) on delete cascade,
  empleado_id uuid not null references public.empleados (id),
  sueldo numeric(14, 2) not null default 0,
  bonos numeric(14, 2) not null default 0,
  horas_extras numeric(14, 2) not null default 0,
  prestaciones numeric(14, 2) not null default 0,
  cargas_patronales numeric(14, 2) not null default 0,
  otros_costos numeric(14, 2) not null default 0,
  costo_total numeric(14, 2) generated always as (
    sueldo + bonos + horas_extras + prestaciones + cargas_patronales + otros_costos
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  notas text,
  unique (periodo_id, empleado_id)
);

create index idx_nomina_detalle_periodo on public.nomina_detalle (periodo_id);
create index idx_nomina_detalle_empleado on public.nomina_detalle (empleado_id);

create trigger trg_nomina_detalle_updated_at before update on public.nomina_detalle
  for each row execute function public.fn_set_updated_at();

-- Costo laboral % = costo laboral total del mes / ventas netas del mes, por sucursal
create or replace function public.fn_labor_cost(p_sucursal_id uuid, p_periodo date)
returns table (costo_laboral numeric, ventas_netas numeric, labor_cost_pct numeric)
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
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.empleados enable row level security;
alter table public.periodos_nomina enable row level security;
alter table public.nomina_detalle enable row level security;

create policy empleados_select on public.empleados for select using (public.fn_es_usuario_sistema());
create policy empleados_write on public.empleados for all using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy periodos_nomina_select on public.periodos_nomina for select using (public.fn_es_usuario_sistema());
create policy periodos_nomina_write on public.periodos_nomina for all using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy nomina_detalle_select on public.nomina_detalle for select using (public.fn_es_usuario_sistema());
create policy nomina_detalle_write on public.nomina_detalle for all using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());
