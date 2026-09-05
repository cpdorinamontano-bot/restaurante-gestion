-- =====================================================================
-- Agrega origen a v_ventas_conciliacion
-- =====================================================================
-- Las ventas importadas del histórico (origen 'importado_<mes>_2026')
-- nunca capturaron el desglose por forma de pago por transacción — ese
-- nivel de detalle no existía en los archivos fuente. La conciliación
-- venta-por-venta solo aplica a partir de la captura en vivo (origen
-- 'CAPTURA'), así que el origen se expone aquí para poder filtrarlas.

create or replace view public.v_ventas_conciliacion as
select
  v.id as venta_id,
  v.fecha,
  v.sucursal_id,
  v.venta_neta,
  coalesce(fp.total_formas_pago, 0) as total_formas_pago,
  round(v.venta_neta - coalesce(fp.total_formas_pago, 0), 2) as diferencia,
  case
    when fp.total_formas_pago is null then 'PENDIENTE'
    when abs(v.venta_neta - fp.total_formas_pago) < 0.01 then 'CUADRADO'
    else 'DIFERENCIA'
  end as estatus_calculado,
  v.origen
from public.ventas v
left join (
  select venta_id, sum(importe) as total_formas_pago
  from public.ventas_formas_pago
  group by venta_id
) fp on fp.venta_id = v.id
where v.estatus = 'activo';

alter view public.v_ventas_conciliacion set (security_invoker = true);
