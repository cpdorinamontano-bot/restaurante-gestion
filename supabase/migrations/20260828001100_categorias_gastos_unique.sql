-- =====================================================================
-- Migración 11 — Constraint único en categorias_gastos.nombre
-- Necesario para poder hacer altas idempotentes (ON CONFLICT) al agregar
-- categorías nuevas, p. ej. durante la carga histórica (FASE 41).
-- =====================================================================
alter table public.categorias_gastos add constraint categorias_gastos_nombre_key unique (nombre);
