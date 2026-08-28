-- =====================================================================
-- Migración 07 — Caja y Bancos (FASE 14, 15)
-- =====================================================================

create table public.cajas (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales (id),
  nombre text not null,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now()
);

create table public.movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  caja_id uuid not null references public.cajas (id),
  fecha date not null default current_date,
  turno text,
  tipo_movimiento text not null check (tipo_movimiento in (
    'venta_efectivo','entrada','salida','retiro','deposito','gasto','reposicion'
  )),
  importe numeric(14, 2) not null check (importe > 0),
  referencia_tabla text,
  referencia_id uuid,
  usuario_id uuid references public.usuarios (id),
  created_at timestamptz not null default now(),
  notas text
);

create index idx_mov_caja_caja_fecha on public.movimientos_caja (caja_id, fecha);

create table public.cierres_caja (
  id uuid primary key default gen_random_uuid(),
  caja_id uuid not null references public.cajas (id),
  fecha date not null default current_date,
  turno text,
  saldo_inicial numeric(14, 2) not null default 0,
  entradas_total numeric(14, 2) not null default 0,
  salidas_total numeric(14, 2) not null default 0,
  saldo_teorico numeric(14, 2) generated always as (saldo_inicial + entradas_total - salidas_total) stored,
  saldo_fisico numeric(14, 2),
  diferencia numeric(14, 2) generated always as (saldo_fisico - (saldo_inicial + entradas_total - salidas_total)) stored,
  usuario_id uuid references public.usuarios (id),
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text
);

create index idx_cierres_caja_caja_fecha on public.cierres_caja (caja_id, fecha);

create trigger trg_aud_cierres_caja before insert or update on public.cierres_caja
  for each row execute function public.fn_auditoria_generica();

-- Precalcula saldo_inicial (del cierre anterior) y entradas/salidas del día desde el ledger
create or replace function public.fn_pre_cierre_caja()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.saldo_inicial is null or new.saldo_inicial = 0 then
    select saldo_fisico into new.saldo_inicial
    from public.cierres_caja
    where caja_id = new.caja_id and estatus = 'activo'
      and (fecha < new.fecha or (fecha = new.fecha and created_at < now()))
    order by fecha desc, created_at desc
    limit 1;
    new.saldo_inicial := coalesce(new.saldo_inicial, 0);
  end if;

  select
    coalesce(sum(case when tipo_movimiento in ('venta_efectivo','entrada','deposito','reposicion') then importe else 0 end), 0),
    coalesce(sum(case when tipo_movimiento in ('salida','retiro','gasto') then importe else 0 end), 0)
  into new.entradas_total, new.salidas_total
  from public.movimientos_caja
  where caja_id = new.caja_id and fecha = new.fecha
    and (new.turno is null or turno = new.turno);

  return new;
end;
$$;

create trigger trg_pre_cierre_caja before insert on public.cierres_caja
  for each row execute function public.fn_pre_cierre_caja();

-- ---------------------------------------------------------------------
-- BANCOS
-- ---------------------------------------------------------------------
create table public.cuentas_bancarias (
  id uuid primary key default gen_random_uuid(),
  banco text not null,
  numero_cuenta text not null,
  alias text,
  moneda text not null default 'MXN',
  saldo_actual numeric(14, 2) not null default 0,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  notas text
);

create trigger trg_aud_cuentas_bancarias before insert or update on public.cuentas_bancarias
  for each row execute function public.fn_auditoria_generica();

create table public.movimientos_bancarios (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas_bancarias (id),
  fecha date not null,
  concepto text,
  referencia text,
  cargo numeric(14, 2) not null default 0,
  abono numeric(14, 2) not null default 0,
  tipo_movimiento text,
  beneficiario text,
  proveedor_id uuid references public.proveedores (id),
  conciliado boolean not null default false,
  referencia_conciliacion_tabla text,
  referencia_conciliacion_id uuid,
  documento_id uuid,
  usuario_id uuid references public.usuarios (id),
  created_at timestamptz not null default now(),
  notas text,
  check (cargo >= 0 and abono >= 0)
);

create index idx_mov_bancarios_cuenta_fecha on public.movimientos_bancarios (cuenta_id, fecha);

create or replace function public.fn_recalcular_saldo_cuenta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuenta_id uuid := coalesce(new.cuenta_id, old.cuenta_id);
begin
  update public.cuentas_bancarias set
    saldo_actual = coalesce((select sum(abono - cargo) from public.movimientos_bancarios where cuenta_id = v_cuenta_id), 0),
    updated_at = now()
  where id = v_cuenta_id;
  return coalesce(new, old);
end;
$$;

create trigger trg_recalc_saldo_cuenta after insert or update or delete on public.movimientos_bancarios
  for each row execute function public.fn_recalcular_saldo_cuenta();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.cajas enable row level security;
alter table public.movimientos_caja enable row level security;
alter table public.cierres_caja enable row level security;
alter table public.cuentas_bancarias enable row level security;
alter table public.movimientos_bancarios enable row level security;

create policy cajas_select on public.cajas for select using (public.fn_es_usuario_sistema());
create policy cajas_write on public.cajas for all using (public.fn_tiene_rol('admin_sistema')) with check (public.fn_tiene_rol('admin_sistema'));

create policy mov_caja_select on public.movimientos_caja for select using (public.fn_es_usuario_sistema());
create policy mov_caja_insert on public.movimientos_caja for insert with check (public.fn_es_operativo());
create policy mov_caja_update on public.movimientos_caja for update using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy cierres_caja_select on public.cierres_caja for select using (public.fn_es_usuario_sistema());
create policy cierres_caja_insert on public.cierres_caja for insert with check (public.fn_es_operativo() or public.fn_es_finanzas());
create policy cierres_caja_update on public.cierres_caja for update using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy cuentas_bancarias_select on public.cuentas_bancarias for select using (public.fn_es_usuario_sistema());
create policy cuentas_bancarias_write on public.cuentas_bancarias for all using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());

create policy mov_bancarios_select on public.movimientos_bancarios for select using (public.fn_es_usuario_sistema());
create policy mov_bancarios_insert on public.movimientos_bancarios for insert with check (public.fn_es_operativo() or public.fn_es_finanzas());
create policy mov_bancarios_update on public.movimientos_bancarios for update using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());
