-- Permite adjuntar el documento (CFDI/foto) con el que se capturó la venta, igual que ya existe en compras y gastos.
alter table public.ventas add column documento_id uuid;
