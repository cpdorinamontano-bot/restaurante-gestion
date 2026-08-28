-- =====================================================================
-- Migración 09b — Refuerzo: revocar EXECUTE explícitamente a `anon`
-- (Supabase concede EXECUTE a `anon`/`authenticated` por defecto en
-- funciones nuevas más allá de PUBLIC; hay que revocarlo explícitamente
-- por rol, no solo desde PUBLIC)
-- =====================================================================
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;
