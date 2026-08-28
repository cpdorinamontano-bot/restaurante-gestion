-- =====================================================================
-- Migración 10 — Bucket de Storage para documentos (FASE 30)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

create policy documentos_storage_select on storage.objects for select
  using (bucket_id = 'documentos' and public.fn_es_usuario_sistema());

create policy documentos_storage_insert on storage.objects for insert
  with check (bucket_id = 'documentos' and (public.fn_es_operativo() or public.fn_es_finanzas()));

create policy documentos_storage_update on storage.objects for update
  using (bucket_id = 'documentos' and public.fn_es_finanzas())
  with check (bucket_id = 'documentos' and public.fn_es_finanzas());
