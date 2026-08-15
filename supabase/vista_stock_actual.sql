-- ─────────────────────────────────────────────────────────────────
-- VISTA DE STOCK ACTUAL DE PRODUCTOS (LEDGER AGGREGATION)
-- ─────────────────────────────────────────────────────────────────
-- Agrupa los movimientos de inventario por producto, calculando:
-- 1. stock: Entradas menos salidas en bodega.
-- 2. valor_total_usd: Stock disponible multiplicado por precio USD.
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.stock_actual AS
SELECT 
    p.id AS producto_id,
    p.id AS id,
    p.codigo_sku,
    p.nombre,
    p.descripcion,
    p.precio_usd,
    p.stock_minimo,
    p.estado,
    p.imagen_url,
    p.fecha_creacion,
    COALESCE(
        SUM(
            CASE 
                WHEN m.tipo = 'entrada' THEN m.cantidad
                WHEN m.tipo = 'salida' THEN -m.cantidad
                ELSE 0
            END
        ), 0
    )::integer AS stock,
    (
        COALESCE(
            SUM(
                CASE 
                    WHEN m.tipo = 'entrada' THEN m.cantidad
                    WHEN m.tipo = 'salida' THEN -m.cantidad
                    ELSE 0
                END
            ), 0
        ) * p.precio_usd
    )::numeric(12,2) AS valor_total_usd
FROM public.productos p
LEFT JOIN public.movimientos_inventario m ON p.id = m.producto_id
WHERE p.estado = true
GROUP BY p.id, p.codigo_sku, p.nombre, p.descripcion, p.precio_usd, p.stock_minimo, p.estado, p.imagen_url, p.fecha_creacion;

-- Permisos de lectura
GRANT SELECT ON public.stock_actual TO anon, authenticated;
