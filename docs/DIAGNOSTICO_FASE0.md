# Diagnóstico Fase 0

## Contexto

La solicitud original describía un sistema integral de gestión para restaurante,
a construir "auditando primero el proyecto existente". El repositorio disponible
en la sesión (`cpdorinamontano-bot/sat-serene`) resultó ser una plataforma
madura y en producción de automatización fiscal/contable para un despacho
contable mexicano (CFDI, SAT, nómina/IMSS, DIOT, conciliación bancaria,
contabilidad electrónica): 383 migraciones SQL, más de 200 Edge Functions,
y un frontend orientado 100% a ese dominio (`Clientes`, `DirectorioClientes`,
`SatAutomatizacion`, `NominaImssHub`, etc.). No existía ningún rastro de
conceptos de restaurante (ventas POS, recetas, food cost, caja de turno).

Dado que construir un sistema paralelo de ~40 tablas nuevas dentro de una
plataforma financiera real, en producción y con clientes reales, sin
autorización explícita, viola directamente la regla de no sustituir/mezclar
información existente sin autorización, se consultó al usuario antes de
escribir cualquier migración. La decisión confirmada fue: **proyecto nuevo e
independiente**, con nómina incluida desde el MVP.

## Resultado

- Repositorio nuevo: `cpdorinamontano-bot/restaurante-gestion` (privado).
- Proyecto Supabase nuevo: `restaurante-gestion` (`ognfdvlkvpevxtqqucrj`,
  us-east-1, plan gratuito), sin relación con los proyectos de `sat-serene`
  ni `imss-idse-platform`.
- No se tocó, leyó destructivamente ni se reutilizó ninguna tabla de
  `sat-serene`. Ambos sistemas permanecen completamente aislados;
  cualquier integración futura (p. ej. exportar el concentrado contable
  mensual del restaurante hacia el despacho) sería una fase explícita y
  posterior, nunca implícita.

## Qué se reutilizó conceptualmente (no en código)

Algunos patrones ya probados en `sat-serene` se replicaron por buenas
prácticas (no por copia de código): bitácora de auditoría permanente con
trigger genérico, baja lógica en vez de `DELETE` físico, RLS en cada tabla,
y separación estricta entre roles operativos y roles financieros.
