-- =====================================================================
-- Migración 12 — Conciliación de estados de cuenta + helper de presupuestos
-- =====================================================================

-- ---------------------------------------------------------------------
-- Saldo bancario reconstruido a una fecha (ledger de movimientos_bancarios)
-- ---------------------------------------------------------------------
create or replace function public.fn_saldo_bancario_a_fecha(p_cuenta_id uuid, p_fecha date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(abono - cargo), 0)
  from public.movimientos_bancarios
  where cuenta_id = p_cuenta_id and fecha <= p_fecha;
$$;

revoke execute on function public.fn_saldo_bancario_a_fecha(uuid, date) from public, anon;
grant execute on function public.fn_saldo_bancario_a_fecha(uuid, date) to authenticated;

-- ---------------------------------------------------------------------
-- Conciliaciones bancarias: el saldo real del estado de cuenta (capturado
-- a mano por quien lo sube, nunca inferido) contra el saldo que el propio
-- ledger de movimientos_bancarios reconstruye para esa misma fecha.
-- ---------------------------------------------------------------------
create table public.conciliaciones_bancarias (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas_bancarias (id),
  periodo date not null, -- primer día del mes que cubre el estado de cuenta
  saldo_estado_cuenta numeric(14, 2) not null,
  documento_id uuid references public.documentos (id),
  usuario_id uuid references public.usuarios (id),
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notas text,
  unique (cuenta_id, periodo)
);

create trigger trg_aud_conciliaciones_bancarias before insert or update on public.conciliaciones_bancarias
  for each row execute function public.fn_auditoria_generica();

alter table public.conciliaciones_bancarias enable row level security;

create policy conciliaciones_bancarias_select on public.conciliaciones_bancarias
  for select using (public.fn_es_usuario_sistema());
create policy conciliaciones_bancarias_write on public.conciliaciones_bancarias
  for all using (public.fn_es_operativo() or public.fn_es_finanzas())
  with check (public.fn_es_operativo() or public.fn_es_finanzas());

-- Vista: saldo del estado de cuenta vs. saldo reconstruido del ledger, con la diferencia
create view public.v_conciliaciones_bancarias as
select
  cb.id,
  cb.cuenta_id,
  cta.banco,
  cta.alias,
  cb.periodo,
  cb.saldo_estado_cuenta,
  public.fn_saldo_bancario_a_fecha(cb.cuenta_id, (date_trunc('month', cb.periodo) + interval '1 month - 1 day')::date) as saldo_calculado,
  round(cb.saldo_estado_cuenta - public.fn_saldo_bancario_a_fecha(cb.cuenta_id, (date_trunc('month', cb.periodo) + interval '1 month - 1 day')::date), 2) as diferencia,
  cb.documento_id,
  d.storage_path as documento_storage_path,
  d.nombre_archivo as documento_nombre,
  cb.usuario_id,
  cb.created_at,
  cb.notas
from public.conciliaciones_bancarias cb
join public.cuentas_bancarias cta on cta.id = cb.cuenta_id
left join public.documentos d on d.id = cb.documento_id
where cb.estatus = 'activo';

alter view public.v_conciliaciones_bancarias set (security_invoker = true);
