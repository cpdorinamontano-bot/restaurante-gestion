-- =====================================================================
-- Migración 15 — Cuentas por cobrar (espejo de cuentas por pagar)
-- =====================================================================
-- A diferencia de CxP (que se genera automáticamente desde compras/gastos
-- a crédito), las ventas a crédito son poco frecuentes en el negocio, así
-- que aquí la captura es manual: quien registra una venta a crédito o un
-- adeudo de cliente da de alta la cuenta por cobrar directamente.

create table public.cuentas_por_cobrar (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  origen_tabla text not null default 'manual' check (origen_tabla in ('ventas', 'manual')),
  origen_id uuid,
  concepto text,
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
  notas text
);

create index idx_cxc_cliente on public.cuentas_por_cobrar (cliente_id);
create index idx_cxc_vencimiento on public.cuentas_por_cobrar (fecha_vencimiento);

create trigger trg_aud_cxc before insert or update on public.cuentas_por_cobrar
  for each row execute function public.fn_auditoria_generica();

create table public.cobros_clientes (
  id uuid primary key default gen_random_uuid(),
  cuenta_por_cobrar_id uuid not null references public.cuentas_por_cobrar (id),
  fecha date not null,
  importe numeric(14, 2) not null,
  forma_pago_id uuid references public.formas_pago (id),
  referencia text,
  documento_id uuid,
  usuario_id uuid references public.usuarios (id),
  created_at timestamptz not null default now(),
  notas text
);

create index idx_cobros_cli_cxc on public.cobros_clientes (cuenta_por_cobrar_id);

-- Vista: saldos y estatus de CxC, siempre reconstruible desde cobros_clientes
create view public.v_cxc_saldos as
select
  c.id as cuenta_por_cobrar_id,
  c.cliente_id,
  cl.nombre as cliente_nombre,
  c.origen_tabla,
  c.origen_id,
  c.concepto,
  c.documento_referencia,
  c.fecha_emision,
  c.fecha_vencimiento,
  c.importe_original,
  coalesce(cb.total_cobrado, 0) as total_cobrado,
  round(c.importe_original - coalesce(cb.total_cobrado, 0), 2) as saldo,
  greatest(0, (current_date - c.fecha_vencimiento))::int as dias_vencidos,
  case
    when round(c.importe_original - coalesce(cb.total_cobrado, 0), 2) <= 0 then 'PAGADO'
    when coalesce(cb.total_cobrado, 0) > 0 then 'PARCIAL'
    when current_date > c.fecha_vencimiento then 'VENCIDO'
    else 'POR_VENCER'
  end as estatus_cxc
from public.cuentas_por_cobrar c
join public.clientes cl on cl.id = c.cliente_id
left join (
  select cuenta_por_cobrar_id, sum(importe) as total_cobrado
  from public.cobros_clientes
  group by cuenta_por_cobrar_id
) cb on cb.cuenta_por_cobrar_id = c.id
where c.estatus = 'activo';

alter view public.v_cxc_saldos set (security_invoker = true);

-- Vista: antigüedad de saldos (0-30 / 31-60 / 61-90 / +90)
create view public.v_cxc_antiguedad as
select
  *,
  case
    when saldo <= 0 then 'PAGADO'
    when dias_vencidos <= 30 then '0-30'
    when dias_vencidos <= 60 then '31-60'
    when dias_vencidos <= 90 then '61-90'
    else 'MAS_90'
  end as rango_antiguedad
from public.v_cxc_saldos;

alter view public.v_cxc_antiguedad set (security_invoker = true);

-- ---------------------------------------------------------------------
-- RLS — captura por Administración/PAO o Finanzas (igual que pagos a
-- proveedores); lectura para todo el sistema.
-- ---------------------------------------------------------------------
alter table public.cuentas_por_cobrar enable row level security;
alter table public.cobros_clientes enable row level security;

create policy cxc_select on public.cuentas_por_cobrar for select using (public.fn_es_usuario_sistema());
create policy cxc_write on public.cuentas_por_cobrar for all
  using (public.fn_es_operativo() or public.fn_es_finanzas())
  with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy cobros_clientes_select on public.cobros_clientes for select using (public.fn_es_usuario_sistema());
create policy cobros_clientes_insert on public.cobros_clientes for insert
  with check (public.fn_es_operativo() or public.fn_es_finanzas());
create policy cobros_clientes_update on public.cobros_clientes for update
  using (public.fn_es_finanzas()) with check (public.fn_es_finanzas());
