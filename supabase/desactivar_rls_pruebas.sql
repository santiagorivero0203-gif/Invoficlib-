-- ─────────────────────────────────────────────────────────────────
-- DESACTIVAR RLS TEMPORALMENTE PARA PRUEBAS LOCALES (FASE 3)
-- ─────────────────────────────────────────────────────────────────
-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase
-- para permitir agregar productos, clientes y movimientos directamente
-- desde la interfaz web sin requerir Supabase Auth real todavía.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.productos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalles_nota DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.devoluciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles DISABLE ROW LEVEL SECURITY;

-- Opcional: Otorgar todos los permisos a anon y authenticated en estas tablas
GRANT ALL ON public.productos TO anon, authenticated;
GRANT ALL ON public.movimientos_inventario TO anon, authenticated;
GRANT ALL ON public.clientes TO anon, authenticated;
GRANT ALL ON public.notas TO anon, authenticated;
GRANT ALL ON public.detalles_nota TO anon, authenticated;
GRANT ALL ON public.devoluciones TO anon, authenticated;
GRANT ALL ON public.gastos TO anon, authenticated;
GRANT ALL ON public.perfiles TO anon, authenticated;

-- Mensaje de confirmación
SELECT 'RLS desactivado temporalmente para pruebas locales. Ya puedes usar la app sin bloqueos.' AS resultado;
