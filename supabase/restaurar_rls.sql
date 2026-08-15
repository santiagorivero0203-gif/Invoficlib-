-- ─────────────────────────────────────────────────────────────────
-- RESTAURAR RLS PARA PRODUCCIÓN (SUPABASE AUTH REAL)
-- ─────────────────────────────────────────────────────────────────
-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase
-- para volver a activar la seguridad de nivel de fila (RLS).
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalles_nota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devoluciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Mensaje de confirmación
SELECT 'RLS restaurado con éxito para producción.' AS resultado;
