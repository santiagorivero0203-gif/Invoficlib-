-- ============================================================================
-- INVOFICLIB - ÍNDICES DE RENDIMIENTO Y ESCALABILIDAD (FASE DE PRUEBAS)
-- ============================================================================
-- Ejecutar en el SQL Editor de Supabase para optimizar consultas del Ledger,
-- tablas de órdenes, filtros de movimientos y relaciones relacionales.
-- ============================================================================

-- 1. Índice en la tabla `notas` por `cliente_id` (Crucial para reportes por cliente)
CREATE INDEX IF NOT EXISTS idx_notas_cliente_id 
ON public.notas(cliente_id);

-- 2. Índice en `movimientos_inventario` por `producto_id` (Crucial para Ledger y stock)
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_producto_id 
ON public.movimientos_inventario(producto_id);

-- 3. Índice en `detalles_nota` por `nota_id` (Acelera carga del drawer de pedidos)
CREATE INDEX IF NOT EXISTS idx_detalles_nota_nota_id 
ON public.detalles_nota(nota_id);

-- 4. Índice en `detalles_nota` por `producto_id` (Acelera consultas de rotación de producto)
CREATE INDEX IF NOT EXISTS idx_detalles_nota_producto_id 
ON public.detalles_nota(producto_id);

-- 5. Índice en `movimientos_inventario` por `nota_id` (Acelera trazabilidad de salidas)
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_nota_id 
ON public.movimientos_inventario(nota_id);

-- 6. Índices cronológicos para filtros de fecha rápidos (Hoy, Semana, Mes, Reportes)
CREATE INDEX IF NOT EXISTS idx_notas_fecha_creacion 
ON public.notas(fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_fecha 
ON public.movimientos_inventario(fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_gastos_fecha 
ON public.gastos(fecha DESC);

-- 7. Índice compuesto para notas por estado y tipo de salida
CREATE INDEX IF NOT EXISTS idx_notas_estado_tipo 
ON public.notas(estado, tipo_salida);
