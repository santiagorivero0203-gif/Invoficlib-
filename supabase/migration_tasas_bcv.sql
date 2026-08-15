-- ─────────────────────────────────────────────────────────────────
-- MIGRACIÓN: SISTEMA DE TASAS DE CAMBIO (USD/EUR BCV)
-- ─────────────────────────────────────────────────────────────────
-- Adapta la tabla `tasas_cambio` para admitir múltiples monedas (USD/EUR)
-- y habilita Supabase Realtime para propagar los cambios al instante.
-- ─────────────────────────────────────────────────────────────────

-- 1. Agregar columna moneda (si no existe)
ALTER TABLE public.tasas_cambio ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'USD' CHECK (moneda IN ('USD', 'EUR'));

-- 2. Renombrar columna tasa_ves a tasa (si existe)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasas_cambio' AND column_name = 'tasa_ves'
  ) THEN
    ALTER TABLE public.tasas_cambio RENAME COLUMN tasa_ves TO tasa;
  END IF;
END $$;

-- 3. Crear índice para optimizar consultas de tasas vigentes
CREATE INDEX IF NOT EXISTS idx_tasas_cambio_moneda_fecha ON public.tasas_cambio (moneda, fecha_creacion DESC);

-- 4. Habilitar replicación de Realtime para la tabla
-- (Esto permite recibir actualizaciones en vivo con useTasasCambio sin refrescar)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasas_cambio;

-- Mensaje de confirmación
SELECT 'Migración de tasas de cambio completada con éxito. Ya puedes ejecutar este SQL en Supabase.' AS resultado;
