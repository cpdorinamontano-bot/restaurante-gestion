-- =====================================================================
-- Sistema de Gestión de Restaurante — Migración 01
-- Base: roles, usuarios, catálogos generales, infraestructura de auditoría
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type public.rol_codigo as enum (
  'admin_pao',      -- Administración / captura diaria
  'direccion',      -- Dirección / solo consulta
  'finanzas',       -- Finanzas / validación y cierre
  'admin_sistema'   -- Administrador del sistema
);

create type public.estatus_registro as enum ('activo', 'baja');

-- ---------------------------------------------------------------------
-- TABLAS: roles, usuarios, usuarios_roles (deben existir antes que las
-- funciones de RLS que las consultan)
-- ---------------------------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  codigo public.rol_codigo not null unique,
  nombre text not null,
  descripcion text,
  created_at timestamptz not null default now()
);

insert into public.roles (codigo, nombre, descripcion) values
  ('admin_pao', 'Administración / PAO', 'Captura operativa diaria: ventas, compras, gastos, caja, inventario, documentos'),
  ('direccion', 'Dirección', 'Consulta de rentabilidad e indicadores, preferentemente solo lectura'),
  ('finanzas', 'Finanzas', 'Validación, conciliación, reclasificación y cierre de periodos'),
  ('admin_sistema', 'Administrador del sistema', 'Gestión de usuarios, permisos, catálogos y configuración');

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  email text not null,
  telefono text,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.usuarios_roles (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  rol_id uuid not null references public.roles (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (usuario_id, rol_id)
);

-- Autoprovisión del perfil `usuarios` cuando se crea un auth.users
create or replace function public.fn_crear_usuario_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nombre, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_auth_user_crear_perfil
  after insert on auth.users
  for each row execute function public.fn_crear_usuario_perfil();

-- ---------------------------------------------------------------------
-- FUNCIONES DE UTILIDAD (usadas por RLS y triggers en todas las migraciones)
-- ---------------------------------------------------------------------

-- Rol(es) del usuario autenticado actual
create or replace function public.fn_roles_actuales()
returns setof public.rol_codigo
language sql
stable
security definer
set search_path = public
as $$
  select r.codigo
  from public.usuarios_roles ur
  join public.roles r on r.id = ur.rol_id
  where ur.usuario_id = auth.uid();
$$;

create or replace function public.fn_tiene_rol(p_rol public.rol_codigo)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = auth.uid() and r.codigo = p_rol
  );
$$;

-- Conjunto de roles con acceso de captura operativa (Pao + Admin Sistema)
create or replace function public.fn_es_operativo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.fn_tiene_rol('admin_pao') or public.fn_tiene_rol('admin_sistema');
$$;

-- Finanzas o Admin del sistema: validan, reclasifican, cierran
create or replace function public.fn_es_finanzas()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.fn_tiene_rol('finanzas') or public.fn_tiene_rol('admin_sistema');
$$;

-- Cualquier rol autenticado del sistema (para SELECT de solo lectura amplio)
create or replace function public.fn_es_usuario_sistema()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios_roles ur where ur.usuario_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- BITÁCORA DE AUDITORÍA PERMANENTE
-- ---------------------------------------------------------------------
create table public.bitacora_auditoria (
  id uuid primary key default gen_random_uuid(),
  tabla text not null,
  registro_id uuid,
  accion text not null check (accion in ('INSERT', 'UPDATE', 'DELETE', 'BAJA_LOGICA', 'REAPERTURA')),
  usuario_id uuid references public.usuarios (id),
  valor_anterior jsonb,
  valor_nuevo jsonb,
  motivo text,
  created_at timestamptz not null default now()
);

create index idx_bitacora_tabla_registro on public.bitacora_auditoria (tabla, registro_id);
create index idx_bitacora_created_at on public.bitacora_auditoria (created_at desc);

-- Función genérica: registra created_by/updated_by/timestamps + bitácora
create or replace function public.fn_auditoria_generica()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
    new.created_by := coalesce(new.created_by, v_usuario);
    new.updated_by := v_usuario;

    insert into public.bitacora_auditoria (tabla, registro_id, accion, usuario_id, valor_nuevo)
    values (tg_table_name, new.id, 'INSERT', v_usuario, to_jsonb(new));
    return new;

  elsif tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.updated_by := v_usuario;

    insert into public.bitacora_auditoria (tabla, registro_id, accion, usuario_id, valor_anterior, valor_nuevo)
    values (
      tg_table_name, new.id,
      case when new.estatus = 'baja' and old.estatus = 'activo' then 'BAJA_LOGICA' else 'UPDATE' end,
      v_usuario, to_jsonb(old), to_jsonb(new)
    );
    return new;

  elsif tg_op = 'DELETE' then
    insert into public.bitacora_auditoria (tabla, registro_id, accion, usuario_id, valor_anterior)
    values (tg_table_name, old.id, 'DELETE', v_usuario, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- CATÁLOGOS GENERALES
-- ---------------------------------------------------------------------
create table public.sucursales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  rfc text,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid references public.sucursales (id),
  nombre text not null,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text
);

create table public.centros_costo (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text
);

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rfc text,
  contacto text,
  telefono text,
  email text,
  dias_credito integer not null default 0,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rfc text,
  contacto text,
  telefono text,
  email text,
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id),
  origen text not null default 'CAPTURA',
  notas text
);

create table public.unidades_medida (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  abreviatura text not null unique,
  created_at timestamptz not null default now()
);

insert into public.unidades_medida (nombre, abreviatura) values
  ('Kilogramo', 'kg'), ('Gramo', 'g'), ('Litro', 'l'), ('Mililitro', 'ml'),
  ('Pieza', 'pza'), ('Caja', 'caja'), ('Paquete', 'paq'), ('Porción', 'porc');

-- categoria de productos/compras: alimentos, bebidas, abarrotes, insumos,
-- empaques, limpieza, operación, mantenimiento, otros (FASE 7 y FASE 9)
create table public.categorias_productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in (
    'alimentos','bebidas','abarrotes','insumos','empaques',
    'limpieza','operacion','mantenimiento','otros'
  )),
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now()
);

insert into public.categorias_productos (nombre, tipo) values
  ('Alimentos', 'alimentos'), ('Bebidas', 'bebidas'), ('Abarrotes', 'abarrotes'),
  ('Insumos', 'insumos'), ('Empaques', 'empaques'), ('Limpieza', 'limpieza'),
  ('Operación', 'operacion'), ('Mantenimiento', 'mantenimiento'), ('Otros', 'otros');

-- categorías de gasto (FASE 12)
create table public.categorias_gastos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('fijo','variable','administrativo','operativo')),
  estatus public.estatus_registro not null default 'activo',
  created_at timestamptz not null default now()
);

insert into public.categorias_gastos (nombre, tipo) values
  ('Renta', 'fijo'), ('Seguros', 'fijo'), ('Sistemas', 'fijo'), ('Honorarios', 'fijo'),
  ('Mantenimiento', 'variable'), ('Marketing', 'variable'), ('Servicios', 'variable'),
  ('Administrativos', 'administrativo'), ('Operativos', 'operativo'), ('Otros', 'operativo');

-- ---------------------------------------------------------------------
-- CONFIGURACIÓN DEL SISTEMA (parámetros de alertas, food cost objetivo, etc.)
-- ---------------------------------------------------------------------
create table public.configuracion_sistema (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique,
  valor jsonb not null,
  descripcion text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.usuarios (id)
);

insert into public.configuracion_sistema (clave, valor, descripcion) values
  ('food_cost_objetivo_pct', '31', 'Food cost teórico objetivo (%)'),
  ('food_cost_desviacion_alerta_pct', '5', 'Desviación (real - teórico) en puntos porcentuales que dispara alerta'),
  ('labor_cost_objetivo_pct', '28', 'Costo laboral objetivo sobre ventas netas (%)'),
  ('merma_alerta_pct', '3', 'Merma sobre ventas netas (%) que dispara alerta'),
  ('caja_diferencia_tolerancia', '50', 'Diferencia máxima tolerada en caja (MXN) antes de alerta');

-- ---------------------------------------------------------------------
-- TRIGGERS DE AUDITORÍA PARA CATÁLOGOS TRANSACCIONALES
-- ---------------------------------------------------------------------
create trigger trg_aud_sucursales before insert or update on public.sucursales
  for each row execute function public.fn_auditoria_generica();
create trigger trg_aud_areas before insert or update on public.areas
  for each row execute function public.fn_auditoria_generica();
create trigger trg_aud_centros_costo before insert or update on public.centros_costo
  for each row execute function public.fn_auditoria_generica();
create trigger trg_aud_proveedores before insert or update on public.proveedores
  for each row execute function public.fn_auditoria_generica();
create trigger trg_aud_clientes before insert or update on public.clientes
  for each row execute function public.fn_auditoria_generica();

-- ---------------------------------------------------------------------
-- updated_at genérico para tablas sin flujo completo de auditoría (roles, etc.)
-- ---------------------------------------------------------------------
create or replace function public.fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_usuarios_updated_at before update on public.usuarios
  for each row execute function public.fn_set_updated_at();

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.usuarios enable row level security;
alter table public.usuarios_roles enable row level security;
alter table public.bitacora_auditoria enable row level security;
alter table public.sucursales enable row level security;
alter table public.areas enable row level security;
alter table public.centros_costo enable row level security;
alter table public.proveedores enable row level security;
alter table public.clientes enable row level security;
alter table public.unidades_medida enable row level security;
alter table public.categorias_productos enable row level security;
alter table public.categorias_gastos enable row level security;
alter table public.configuracion_sistema enable row level security;

-- roles: lectura para todo usuario del sistema; solo admin_sistema escribe
create policy roles_select on public.roles for select using (public.fn_es_usuario_sistema());
create policy roles_write on public.roles for all using (public.fn_tiene_rol('admin_sistema')) with check (public.fn_tiene_rol('admin_sistema'));

-- usuarios: cada quien ve su propio perfil; admin_sistema ve y administra todos
create policy usuarios_select_propio on public.usuarios for select using (id = auth.uid() or public.fn_tiene_rol('admin_sistema') or public.fn_es_finanzas() or public.fn_tiene_rol('direccion'));
create policy usuarios_update_propio on public.usuarios for update using (id = auth.uid() or public.fn_tiene_rol('admin_sistema')) with check (id = auth.uid() or public.fn_tiene_rol('admin_sistema'));
create policy usuarios_insert_admin on public.usuarios for insert with check (public.fn_tiene_rol('admin_sistema') or id = auth.uid());

-- usuarios_roles: solo admin_sistema asigna roles; todos pueden ver su propia asignación
create policy usuarios_roles_select on public.usuarios_roles for select using (usuario_id = auth.uid() or public.fn_tiene_rol('admin_sistema'));
create policy usuarios_roles_write on public.usuarios_roles for all using (public.fn_tiene_rol('admin_sistema')) with check (public.fn_tiene_rol('admin_sistema'));

-- bitácora: solo lectura para finanzas/direccion/admin_sistema; nunca editable por nadie (immutable)
create policy bitacora_select on public.bitacora_auditoria for select using (public.fn_es_finanzas() or public.fn_tiene_rol('direccion'));
-- Inserts ocurren únicamente vía funciones SECURITY DEFINER (triggers); no se otorga policy de insert directa a roles de app.

-- catálogos: todo usuario del sistema puede leer; edición operativa vs. validación según catálogo
create policy sucursales_select on public.sucursales for select using (public.fn_es_usuario_sistema());
create policy sucursales_write on public.sucursales for all using (public.fn_tiene_rol('admin_sistema')) with check (public.fn_tiene_rol('admin_sistema'));

create policy areas_select on public.areas for select using (public.fn_es_usuario_sistema());
create policy areas_write on public.areas for all using (public.fn_tiene_rol('admin_sistema')) with check (public.fn_tiene_rol('admin_sistema'));

create policy centros_costo_select on public.centros_costo for select using (public.fn_es_usuario_sistema());
create policy centros_costo_write on public.centros_costo for all using (public.fn_tiene_rol('admin_sistema') or public.fn_es_finanzas()) with check (public.fn_tiene_rol('admin_sistema') or public.fn_es_finanzas());

create policy proveedores_select on public.proveedores for select using (public.fn_es_usuario_sistema());
create policy proveedores_insert on public.proveedores for insert with check (public.fn_es_operativo() or public.fn_es_finanzas());
create policy proveedores_update on public.proveedores for update using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy clientes_select on public.clientes for select using (public.fn_es_usuario_sistema());
create policy clientes_insert on public.clientes for insert with check (public.fn_es_operativo() or public.fn_es_finanzas());
create policy clientes_update on public.clientes for update using (public.fn_es_operativo() or public.fn_es_finanzas()) with check (public.fn_es_operativo() or public.fn_es_finanzas());

create policy unidades_medida_select on public.unidades_medida for select using (public.fn_es_usuario_sistema());
create policy unidades_medida_write on public.unidades_medida for all using (public.fn_tiene_rol('admin_sistema')) with check (public.fn_tiene_rol('admin_sistema'));

create policy categorias_productos_select on public.categorias_productos for select using (public.fn_es_usuario_sistema());
create policy categorias_productos_write on public.categorias_productos for all using (public.fn_tiene_rol('admin_sistema') or public.fn_es_finanzas()) with check (public.fn_tiene_rol('admin_sistema') or public.fn_es_finanzas());

create policy categorias_gastos_select on public.categorias_gastos for select using (public.fn_es_usuario_sistema());
create policy categorias_gastos_write on public.categorias_gastos for all using (public.fn_tiene_rol('admin_sistema') or public.fn_es_finanzas()) with check (public.fn_tiene_rol('admin_sistema') or public.fn_es_finanzas());

create policy configuracion_select on public.configuracion_sistema for select using (public.fn_es_usuario_sistema());
create policy configuracion_write on public.configuracion_sistema for all using (public.fn_tiene_rol('admin_sistema') or public.fn_es_finanzas()) with check (public.fn_tiene_rol('admin_sistema') or public.fn_es_finanzas());
