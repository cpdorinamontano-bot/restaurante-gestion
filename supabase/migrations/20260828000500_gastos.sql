-- =====================================================================
-- Migración 05 — Gastos (FASE 12) + generación automática de CxP a crédito
-- =====================================================================

create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  proveedor_id uuid references public.proveedores (id),
  concepto text not null,
  categoria_gasto_id uuid not null references public.categorias_gastos (id),
  centro_costo_id uuid references public.centros_costo (id),
  sucursal_id uuid references public.sucursales (id),
  subtotal numeric(14, 2) not null default 0,
  impuestos numeric(14, 2) not null default 0,
  total numeric(14, 2) generated always as (subtotal + impuestos) stored,
  forma_pago_id uuid references public.formas_pago (id),
  fecha_vencimiento date,
  estatus_pago text not null default 'pendiente' check (estatus_pago in ('pendiente','pagada','parcial')),
  documento_id uuid,
  observacion text,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text
);

create index idx_gastos_fecha on public.gastos (fecha);
create index idx_gastos_categoria on public.gastos (categoria_gasto_id);

create trigger trg_aud_gastos before insert or update on public.gastos
  for each row execute function public.fn_auditoria_generica();

-- Alta automática de CxP cuando un gasto queda a crédito y tiene proveedor
create or replace function public.fn_generar_cxp_gasto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estatus_pago in ('pendiente', 'parcial') and new.proveedor_id is not null then
    insert into public.cuentas_por_pagar (proveedor_id, origen_tabla, origen_id, documento_referencia, fecha_emision, fecha_vencimiento, importe_original)
    values (new.proveedor_id, 'gastos', new.id, new.concepto, new.fecha, coalesce(new.fecha_vencimiento, new.fecha), new.total)
    on conflict (origen_tabla, origen_id) do update set
      importe_original = excluded.importe_original,
      fecha_vencimiento = excluded.fecha_vencimiento;
  end if;
  return new;
end;
$$;

create trigger trg_gastos_generar_cxp after insert or update of estatus_pago, subtotal, impuestos on public.gastos
  for each row execute function public.fn_generar_cxp_gasto();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.gastos enable row level security;

create policy gastos_select on public.gastos for select using (public.fn_es_usuario_sistema());
create policy gastos_insert on public.gastos for insert with check (public.fn_es_operativo());
create policy gastos_update on public.gastos for update using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());
