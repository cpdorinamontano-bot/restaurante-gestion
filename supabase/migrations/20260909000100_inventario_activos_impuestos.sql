-- =====================================================================
-- Migración 14 — Inventario mensual, Activos y depreciación, Impuestos
-- causado vs. pagado (control administrativo por periodo)
-- =====================================================================

-- ---------------------------------------------------------------------
-- INVENTARIO MENSUAL: costo de insumos realmente consumido
-- (inventario inicial + compras del mes − inventario final), en vez de
-- solo sumar compras. Las compras del mes se leen de gastos (categoría
-- "Compras"), no se duplican aquí.
-- ---------------------------------------------------------------------
create table public.inventarios_mensuales (
  id uuid primary key default gen_random_uuid(),
  periodo date not null, -- primer día del mes
  sucursal_id uuid not null references public.sucursales (id),
  inventario_inicial numeric(14, 2) not null default 0,
  inventario_final numeric(14, 2) not null default 0,
  notas text,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  unique (periodo, sucursal_id)
);

create trigger trg_aud_inventarios_mensuales before insert or update on public.inventarios_mensuales
  for each row execute function public.fn_auditoria_generica();

-- ---------------------------------------------------------------------
-- ACTIVOS Y DEPRECIACIÓN: equipo, mobiliario y mejoras con depreciación
-- mensual en línea recta desde su fecha de inicio.
-- ---------------------------------------------------------------------
create table public.activos_fijos (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales (id),
  nombre text not null,
  tipo text not null default 'Equipo',
  fecha_inicio date not null,
  costo numeric(14, 2) not null,
  vida_util_meses integer not null check (vida_util_meses > 0),
  valor_residual numeric(14, 2) not null default 0,
  notas text,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id)
);

create index idx_activos_fijos_fecha on public.activos_fijos (fecha_inicio);

create trigger trg_aud_activos_fijos before insert or update on public.activos_fijos
  for each row execute function public.fn_auditoria_generica();

-- ---------------------------------------------------------------------
-- IMPUESTOS POR PERIODO: lo causado (lo que se debe del periodo) frente
-- a lo pagado — distinto del gasto en efectivo cuando se paga.
-- ---------------------------------------------------------------------
create table public.impuestos_periodo (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales (id),
  periodo date not null, -- primer día del mes que causa el impuesto
  tipo_impuesto text not null,
  importe_causado numeric(14, 2) not null default 0,
  importe_pagado numeric(14, 2) not null default 0,
  fecha_pago date,
  notas text,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id)
);

create index idx_impuestos_periodo_periodo on public.impuestos_periodo (periodo);

create trigger trg_aud_impuestos_periodo before insert or update on public.impuestos_periodo
  for each row execute function public.fn_auditoria_generica();

-- ---------------------------------------------------------------------
-- RLS — mismo criterio que presupuestos: cualquier usuario del sistema
-- puede leer; solo Finanzas (o admin_sistema) captura y edita.
-- ---------------------------------------------------------------------
alter table public.inventarios_mensuales enable row level security;
alter table public.activos_fijos enable row level security;
alter table public.impuestos_periodo enable row level security;

create policy inventarios_mensuales_select on public.inventarios_mensuales for select using (public.fn_es_usuario_sistema());
create policy inventarios_mensuales_write on public.inventarios_mensuales for all using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy activos_fijos_select on public.activos_fijos for select using (public.fn_es_usuario_sistema());
create policy activos_fijos_write on public.activos_fijos for all using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy impuestos_periodo_select on public.impuestos_periodo for select using (public.fn_es_usuario_sistema());
create policy impuestos_periodo_write on public.impuestos_periodo for all using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());
