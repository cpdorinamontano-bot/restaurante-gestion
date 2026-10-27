-- =====================================================================
-- Migración — Planeación financiera hacia adelante + piezas estructurales
-- Presupuesto anual (reutiliza `presupuestos`), proyecciones, escenarios
-- "qué pasa si", balance general simplificado, y ventas por línea de negocio.
-- (Nómina por empleado reutiliza empleados/periodos_nomina/nomina_detalle,
-- ya existentes — solo falta la interfaz, sin cambios de esquema.)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Líneas de negocio (p.ej. Restaurante, Café y panadería) — permite
-- clasificar ventas por línea sin tocar la granularidad de captura actual.
-- ---------------------------------------------------------------------
create table public.lineas_negocio (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid references public.sucursales (id),
  nombre text not null,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  notas text,
  unique (sucursal_id, nombre)
);

create trigger trg_aud_lineas_negocio before insert or update on public.lineas_negocio
  for each row execute function public.fn_auditoria_generica();

insert into public.lineas_negocio (sucursal_id, nombre)
select s.id, v.nombre
from public.sucursales s
cross join (values ('Restaurante'), ('Café y panadería')) as v(nombre);

alter table public.ventas add column linea_negocio_id uuid references public.lineas_negocio (id);

-- ---------------------------------------------------------------------
-- Supuestos de proyección (crecimiento esperado) — un renglón vigente por
-- sucursal, editable; las proyecciones se calculan en el cliente a partir
-- de aquí y del histórico real ya disponible en fetchReporteMensual.
-- ---------------------------------------------------------------------
create table public.supuestos_proyeccion (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales (id),
  meses_horizonte int not null default 6 check (meses_horizonte between 1 and 24),
  crecimiento_ventas_pct numeric(6, 2) not null default 0,
  food_cost_objetivo_pct numeric(6, 2),
  labor_cost_objetivo_pct numeric(6, 2),
  crecimiento_gastos_pct numeric(6, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.usuarios (id),
  unique (sucursal_id)
);

create trigger trg_supuestos_proyeccion_updated_at before update on public.supuestos_proyeccion
  for each row execute function public.fn_set_updated_at();

-- ---------------------------------------------------------------------
-- Escenarios financieros ("qué pasa si") — guardan los supuestos de un
-- escenario con nombre sobre un mes base; el resultado se calcula en el
-- cliente contra el real de ese mes, nunca se guarda un resultado fijo.
-- ---------------------------------------------------------------------
create table public.escenarios_financieros (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales (id),
  nombre text not null,
  periodo_base date not null,
  delta_ventas_pct numeric(6, 2) not null default 0,
  delta_food_cost_pct numeric(6, 2) not null default 0,
  delta_labor_cost_pct numeric(6, 2) not null default 0,
  delta_gastos_pct numeric(6, 2) not null default 0,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  notas text
);

-- ---------------------------------------------------------------------
-- Otros conceptos del balance general simplificado — activos o pasivos
-- que no viven en ningún otro módulo (préstamos, depósitos en garantía).
-- Bancos, caja, CxC, CxP, inventario y activos fijos se toman de sus
-- propias tablas/vistas; esto solo cubre lo que queda fuera.
-- ---------------------------------------------------------------------
create table public.balance_otros_conceptos (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales (id),
  tipo text not null check (tipo in ('activo', 'pasivo')),
  concepto text not null,
  saldo numeric(14, 2) not null default 0,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  notas text
);

create trigger trg_aud_balance_otros_conceptos before insert or update on public.balance_otros_conceptos
  for each row execute function public.fn_auditoria_generica();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.lineas_negocio enable row level security;
alter table public.supuestos_proyeccion enable row level security;
alter table public.escenarios_financieros enable row level security;
alter table public.balance_otros_conceptos enable row level security;

create policy lineas_negocio_select on public.lineas_negocio for select using (public.fn_es_usuario_sistema());
create policy lineas_negocio_write on public.lineas_negocio for all
  using (public.fn_es_operativo() or public.fn_es_finanzas())
  with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy supuestos_proyeccion_select on public.supuestos_proyeccion for select using (public.fn_es_usuario_sistema());
create policy supuestos_proyeccion_write on public.supuestos_proyeccion for all
  using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy escenarios_financieros_select on public.escenarios_financieros for select using (public.fn_es_usuario_sistema());
create policy escenarios_financieros_write on public.escenarios_financieros for all
  using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy balance_otros_conceptos_select on public.balance_otros_conceptos for select using (public.fn_es_usuario_sistema());
create policy balance_otros_conceptos_write on public.balance_otros_conceptos for all
  using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());
