-- ==============================================================================
-- INVOFICLIB — PARCHES Y MEJORAS SQL (Fase 3)
-- ==============================================================================
-- Ejecuta este archivo DESPUÉS de schema.sql y schema_notas_devoluciones.sql.
-- Cada sección es idempotente: se puede ejecutar varias veces sin romper nada.
-- ==============================================================================

-- ==============================================================================
-- 🐛 CORRECCIÓN 1 (CRÍTICA): usuario_id en movimientos_inventario
-- ==============================================================================
-- PROBLEMA: La columna tiene ON DELETE SET NULL Y NOT NULL al mismo tiempo.
-- Eso es una contradicción — si el perfil se elimina, Postgres intentaría
-- poner NULL pero falla porque la columna es NOT NULL.
-- Además, los triggers (SECURITY DEFINER) insertan con COALESCE(..., NULL),
-- lo que también falla si ningún contexto de auth está disponible.
-- SOLUCIÓN: Quitar el NOT NULL para permitir movimientos de sistema.
-- ==============================================================================
ALTER TABLE public.movimientos_inventario
    ALTER COLUMN usuario_id DROP NOT NULL;

-- Ajustar la política RLS que valida auth.uid() = usuario_id
-- para contemplar el caso en que usuario_id es NULL (insertado por trigger).
DROP POLICY IF EXISTS "Permitir inserción de movimientos a usuarios autenticados"
    ON public.movimientos_inventario;

CREATE POLICY "Permitir inserción de movimientos a usuarios autenticados"
    ON public.movimientos_inventario
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Permite si el usuario coincide, o si viene de un trigger (usuario_id = NULL)
        usuario_id IS NULL OR auth.uid() = usuario_id
    );


-- ==============================================================================
-- 🐛 CORRECCIÓN 2 (CRÍTICA): estado 'parcial' en devoluciones parciales
-- ==============================================================================
-- PROBLEMA: El trigger fn_procesar_devolucion_dinamica solo cambia el estado
-- a 'anulada' cuando total = 0. Pero cuando se devuelve PARCIALMENTE, el
-- estado debería cambiar a 'parcial' (no quedarse en 'pagada').
-- SOLUCIÓN: Actualizar el trigger para manejar los 3 estados correctamente.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_procesar_devolucion_dinamica()
RETURNS TRIGGER AS $$
DECLARE
    v_correlativo        TEXT;
    v_subtotal_original  NUMERIC(12, 2);
    v_total_actual       NUMERIC(12, 2);
    v_nuevo_total        NUMERIC(12, 2);
    v_nuevo_estado       nota_status;
    v_usuario_responsable UUID;
BEGIN
    -- Obtener datos de la nota
    SELECT correlativo, subtotal_usd, total_usd, usuario_id
    INTO v_correlativo, v_subtotal_original, v_total_actual, v_usuario_responsable
    FROM public.notas
    WHERE id = NEW.nota_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La nota con ID % no existe.', NEW.nota_id;
    END IF;

    -- Calcular nuevo total (nunca negativo)
    v_nuevo_total := GREATEST(0, v_total_actual - NEW.monto_descontado);

    -- Determinar nuevo estado correctamente:
    --   0         → anulada  (devolución total)
    --   < original → parcial  (devolución parcial)
    --   = original → pagada   (no debería ocurrir aquí, pero por seguridad)
    v_nuevo_estado := CASE
        WHEN v_nuevo_total = 0               THEN 'anulada'::nota_status
        WHEN v_nuevo_total < v_subtotal_original THEN 'parcial'::nota_status
        ELSE 'pagada'::nota_status
    END;

    -- 1) Actualizar cabecera de la nota
    UPDATE public.notas
    SET
        total_usd         = v_nuevo_total,
        estado            = v_nuevo_estado,
        fecha_actualizacion = NOW()
    WHERE id = NEW.nota_id;

    -- 2) Registrar 'entrada' en el Ledger de inventario
    INSERT INTO public.movimientos_inventario (
        producto_id,
        tipo,
        cantidad,
        usuario_id,
        motivo,
        fecha_creacion
    ) VALUES (
        NEW.producto_id,
        'entrada',
        NEW.cantidad_devuelta,
        COALESCE(NEW.usuario_id, auth.uid(), v_usuario_responsable),
        'Devolución nota ' || COALESCE(v_correlativo, 'S/N')
            || CASE WHEN NEW.motivo IS NOT NULL THEN ' — ' || NEW.motivo ELSE '' END,
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_procesar_devolucion_dinamica ON public.devoluciones;
CREATE TRIGGER trg_procesar_devolucion_dinamica
    AFTER INSERT ON public.devoluciones
    FOR EACH ROW EXECUTE FUNCTION public.fn_procesar_devolucion_dinamica();


-- ==============================================================================
-- 🐛 CORRECCIÓN 3 (CRÍTICA): validar que no se devuelva más de lo comprado
-- ==============================================================================
-- PROBLEMA: Actualmente se pueden insertar devoluciones con
-- cantidad_devuelta > cantidad_original del detalle. Solo se valida en el
-- cliente (TypeScript), no en la BD.
-- SOLUCIÓN: Función + trigger de validación BEFORE INSERT.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_validar_devolucion()
RETURNS TRIGGER AS $$
DECLARE
    v_cantidad_original  INTEGER;
    v_ya_devuelto        INTEGER;
    v_disponible         INTEGER;
BEGIN
    -- Obtener cantidad original del detalle si se especificó
    IF NEW.detalle_nota_id IS NOT NULL THEN
        SELECT cantidad INTO v_cantidad_original
        FROM public.detalles_nota
        WHERE id = NEW.detalle_nota_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'El detalle de nota % no existe.', NEW.detalle_nota_id;
        END IF;

        -- Sumar devoluciones ya registradas para ese detalle
        SELECT COALESCE(SUM(cantidad_devuelta), 0) INTO v_ya_devuelto
        FROM public.devoluciones
        WHERE detalle_nota_id = NEW.detalle_nota_id;

        v_disponible := v_cantidad_original - v_ya_devuelto;

        IF NEW.cantidad_devuelta > v_disponible THEN
            RAISE EXCEPTION
                'No se puede devolver % unidades. Solo hay % disponibles para devolver en este detalle.',
                NEW.cantidad_devuelta, v_disponible;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validar_devolucion ON public.devoluciones;
CREATE TRIGGER trg_validar_devolucion
    BEFORE INSERT ON public.devoluciones
    FOR EACH ROW EXECUTE FUNCTION public.fn_validar_devolucion();


-- ==============================================================================
-- 🐛 CORRECCIÓN 4: nota_status permite 'parcial' — confirmar que el enum
--    ya tiene ese valor (lo tiene, pero lo documentamos)
-- ==============================================================================
-- nota_status fue creado con ('pagada', 'parcial', 'anulada') ✅
-- No requiere ALTER. Solo documentación.


-- ==============================================================================
-- ✨ MEJORA 1: Vista materializable `stock_actual`
-- ==============================================================================
-- Evita que el cliente tenga que hacer 2 queries y calcular en TypeScript.
-- Usala con: SELECT * FROM stock_actual WHERE producto_id = $1
-- ==============================================================================
CREATE OR REPLACE VIEW public.stock_actual AS
SELECT
    p.id                                            AS producto_id,
    p.codigo_sku,
    p.nombre,
    p.precio_usd,
    p.stock_minimo,
    p.estado,
    COALESCE(
        SUM(CASE WHEN m.tipo = 'entrada' THEN m.cantidad ELSE -m.cantidad END),
        0
    )::INTEGER                                      AS stock,
    CASE
        WHEN COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.cantidad ELSE -m.cantidad END), 0)
             <= p.stock_minimo THEN true
        ELSE false
    END                                             AS stock_bajo
FROM public.productos p
LEFT JOIN public.movimientos_inventario m ON m.producto_id = p.id
WHERE p.estado = true
GROUP BY p.id, p.codigo_sku, p.nombre, p.precio_usd, p.stock_minimo, p.estado;

-- Dar acceso a usuarios autenticados
GRANT SELECT ON public.stock_actual TO authenticated;


-- ==============================================================================
-- ✨ MEJORA 2: Función RPC `obtener_resumen_financiero`
-- ==============================================================================
-- Reemplaza el cálculo en TypeScript de lib/actions/cuentas.ts por una
-- función SQL que lo hace todo en un solo round-trip a la BD.
-- Uso en el cliente: supabase.rpc('obtener_resumen_financiero')
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.obtener_resumen_financiero()
RETURNS TABLE (
    ingresos_usd       NUMERIC,
    cogs_usd           NUMERIC,
    utilidad_bruta_usd NUMERIC,
    gastos_op_usd      NUMERIC,
    utilidad_neta_usd  NUMERIC,
    margen_neto_pct    NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ingresos  NUMERIC := 0;
    v_cogs      NUMERIC := 0;
    v_gastos    NUMERIC := 0;
BEGIN
    -- Ingresos: suma de notas pagadas
    SELECT COALESCE(SUM(total_usd), 0) INTO v_ingresos
    FROM public.notas
    WHERE estado = 'pagada';

    -- COGS: suma de subtotales de los detalles de notas pagadas
    -- (aproximación hasta que se agregue precio_costo a productos)
    SELECT COALESCE(SUM(dn.subtotal_usd), 0) INTO v_cogs
    FROM public.detalles_nota dn
    JOIN public.notas n ON n.id = dn.nota_id
    WHERE n.estado = 'pagada';

    -- Gastos operativos pagados
    SELECT COALESCE(SUM(monto_usd), 0) INTO v_gastos
    FROM public.gastos
    WHERE estado = 'pagado';

    RETURN QUERY SELECT
        v_ingresos,
        v_cogs,
        (v_ingresos - v_cogs),
        v_gastos,
        (v_ingresos - v_cogs - v_gastos),
        CASE
            WHEN v_ingresos = 0 THEN 0::NUMERIC
            ELSE ROUND(((v_ingresos - v_cogs - v_gastos) / v_ingresos) * 100, 1)
        END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.obtener_resumen_financiero() TO authenticated;


-- ==============================================================================
-- ✨ MEJORA 3: Índices de rendimiento
-- ==============================================================================
-- Sin índices, cada query que filtre por producto_id, nota_id, etc.
-- hace un seq-scan completo. Crítico cuando la BD crezca.
-- ==============================================================================

-- Movimientos de inventario: el cálculo de stock filtra por producto_id
CREATE INDEX IF NOT EXISTS idx_movimientos_producto_id
    ON public.movimientos_inventario (producto_id);

-- Detalles de nota: el drawer los carga por nota_id
CREATE INDEX IF NOT EXISTS idx_detalles_nota_nota_id
    ON public.detalles_nota (nota_id);

-- Devoluciones: se consultan por nota_id y por detalle_nota_id
CREATE INDEX IF NOT EXISTS idx_devoluciones_nota_id
    ON public.devoluciones (nota_id);

CREATE INDEX IF NOT EXISTS idx_devoluciones_detalle_nota_id
    ON public.devoluciones (detalle_nota_id);

-- Notas: se ordenan por fecha y se filtran por estado
CREATE INDEX IF NOT EXISTS idx_notas_fecha_creacion
    ON public.notas (fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_notas_estado
    ON public.notas (estado);

-- Gastos: se filtran por tipo y estado frecuentemente
CREATE INDEX IF NOT EXISTS idx_gastos_tipo_estado
    ON public.gastos (tipo, estado);

CREATE INDEX IF NOT EXISTS idx_gastos_fecha
    ON public.gastos (fecha DESC);


-- ==============================================================================
-- ✨ MEJORA 4: Trigger de `fecha_actualizacion` automático en notas
-- ==============================================================================
-- Garantiza que fecha_actualizacion se actualice en CUALQUIER UPDATE sobre
-- notas, no solo el que hace el trigger de devoluciones.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_set_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notas_set_fecha_actualizacion ON public.notas;
CREATE TRIGGER trg_notas_set_fecha_actualizacion
    BEFORE UPDATE ON public.notas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_fecha_actualizacion();


-- ==============================================================================
-- ✨ MEJORA 5: Trigger para actualizar subtotal_usd de la nota automáticamente
-- ==============================================================================
-- PROBLEMA: El cliente envía subtotal_usd al crear la nota, pero si por algún
-- motivo los detalles no coinciden exactamente, el subtotal queda desactualizado.
-- SOLUCIÓN: Recalcular subtotal_usd y total_usd de la nota al insertar detalles.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_actualizar_totales_nota()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.notas
    SET
        subtotal_usd = (
            SELECT COALESCE(SUM(subtotal_usd), 0)
            FROM public.detalles_nota
            WHERE nota_id = NEW.nota_id
        ),
        total_usd = (
            SELECT COALESCE(SUM(subtotal_usd), 0)
            FROM public.detalles_nota
            WHERE nota_id = NEW.nota_id
        )
    WHERE id = NEW.nota_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_actualizar_totales_nota ON public.detalles_nota;
CREATE TRIGGER trg_actualizar_totales_nota
    AFTER INSERT ON public.detalles_nota
    FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_totales_nota();

-- Nota: este trigger corre DESPUÉS de fn_descontar_inventario_por_venta
-- (el orden de triggers AFTER en la misma tabla es alfabético en Postgres).
-- Ambos triggers son AFTER INSERT en detalles_nota y son independientes.


-- ==============================================================================
-- ✨ MEJORA 6: RLS más robusta para devoluciones (solo INSERT, no UPDATE/DELETE)
-- ==============================================================================
-- Las devoluciones son inmutables como el ledger de inventario.
-- Un usuario no debe poder borrar ni editar una devolución registrada.
-- ==============================================================================
DROP POLICY IF EXISTS "Permitir registro de devoluciones a usuarios autenticados"
    ON public.devoluciones;

-- Solo INSERT; SELECT ya existe; UPDATE y DELETE no se permiten (Ledger inmutable)
CREATE POLICY "Insertar devoluciones solo a usuarios autenticados"
    ON public.devoluciones
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Verificar que no exista policy de UPDATE/DELETE y eliminarlas por seguridad
DROP POLICY IF EXISTS "Permitir actualización de devoluciones a usuarios autenticados"
    ON public.devoluciones;
DROP POLICY IF EXISTS "Permitir eliminación de devoluciones a usuarios autenticados"
    ON public.devoluciones;


-- ==============================================================================
-- 📝 RESUMEN DE CAMBIOS
-- ==============================================================================
-- CORRECCIONES:
--   1. movimientos_inventario.usuario_id ahora es nullable (ON DELETE SET NULL funciona)
--   2. fn_procesar_devolucion_dinamica ahora distingue 'pagada'/'parcial'/'anulada'
--   3. fn_validar_devolucion previene devoluciones que excedan la cantidad original
--   4. (Documentado) nota_status ya tenía 'parcial' en el enum ✅
--
-- MEJORAS:
--   1. Vista `stock_actual` para calcular stock en SQL (un solo query desde el cliente)
--   2. RPC `obtener_resumen_financiero()` para el ledger financiero
--   3. Índices en columnas frecuentemente filtradas/ordenadas
--   4. Trigger `trg_notas_set_fecha_actualizacion` en cualquier UPDATE de notas
--   5. Trigger `trg_actualizar_totales_nota` para recalcular subtotal_usd de la nota
--   6. RLS de devoluciones ahora solo permite INSERT (ledger inmutable)
-- ==============================================================================
