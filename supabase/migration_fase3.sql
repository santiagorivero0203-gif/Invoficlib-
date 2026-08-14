-- ==============================================================================
-- INVOFICLIB — MIGRACIÓN FASE 3: Salidas Avanzadas + RBAC
-- ==============================================================================
-- Ejecutar DESPUÉS de schema.sql, schema_notas_devoluciones.sql y schema_patches.sql.
-- Cada sección es idempotente: se puede ejecutar varias veces sin romper nada.
--
-- CAMBIOS PRINCIPALES:
--   1. Nuevos ENUMs: tipo_salida_enum, estado_flotante_enum, tipo_cliente_enum
--   2. ALTER clientes: +tipo, +contacto, -documento_id, -direccion
--   3. ALTER notas: +tipo_salida, +estado_flotante
--   4. ALTER movimientos_inventario: +nota_id (trazabilidad al origen)
--   5. Triggers refactorizados para soportar los 3 flujos de salida
--   6. Nuevas RPCs: liquidar_promocion, procesar_corte_consignacion
--   7. RLS de DELETE restringida a admin (Jefe)
--   8. obtener_resumen_financiero actualizada para excluir flotantes
-- ==============================================================================


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  1. NUEVOS ENUMS                                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- Tipo de salida: define la modalidad de la nota
DO $$ BEGIN
    CREATE TYPE tipo_salida_enum AS ENUM ('venta', 'promocion', 'consignacion');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Estado flotante: ciclo de vida de promociones y consignaciones
DO $$ BEGIN
    CREATE TYPE estado_flotante_enum AS ENUM ('abierta', 'cerrada');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de cliente: segmentación comercial (colegios, vendedores ambulantes, general)
DO $$ BEGIN
    CREATE TYPE tipo_cliente_enum AS ENUM ('colegio', 'vendedor', 'general');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  2. ALTER TABLE clientes                                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
-- Agregar columnas requeridas por la Fase 3.
-- Eliminar columnas no utilizadas (documento_id, direccion).

-- 2a. Agregar columna 'tipo' si no existe
DO $$ BEGIN
    ALTER TABLE public.clientes ADD COLUMN tipo tipo_cliente_enum NOT NULL DEFAULT 'general';
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- 2b. Agregar columna 'contacto' (nombre de persona de contacto, ej. coordinadora del colegio)
DO $$ BEGIN
    ALTER TABLE public.clientes ADD COLUMN contacto TEXT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- 2c. Eliminar columnas obsoletas (solo si existen)
DO $$ BEGIN
    ALTER TABLE public.clientes DROP COLUMN IF EXISTS documento_id;
    ALTER TABLE public.clientes DROP COLUMN IF EXISTS direccion;
END $$;

-- Resultado esperado de \d clientes:
--   id             UUID PK
--   nombre         TEXT NOT NULL
--   telefono       TEXT
--   tipo           tipo_cliente_enum NOT NULL DEFAULT 'general'
--   contacto       TEXT
--   fecha_creacion TIMESTAMPTZ


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  3. ALTER TABLE notas                                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
-- Agregar tipo_salida y estado_flotante.
-- La columna 'estado' (nota_status) se MANTIENE para el ciclo de devoluciones.
-- Semántica:
--   - tipo_salida: define QUÉ tipo de transacción es (venta/promoción/consignación)
--   - estado_flotante: controla si la nota flotante está abierta o cerrada
--   - estado (nota_status): controla pagada/parcial/anulada (devoluciones)

-- 3a. Agregar tipo_salida con default 'venta' (compatibilidad con notas existentes)
DO $$ BEGIN
    ALTER TABLE public.notas ADD COLUMN tipo_salida tipo_salida_enum NOT NULL DEFAULT 'venta';
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- 3b. Agregar estado_flotante con default 'cerrada' (las ventas directas nacen cerradas)
DO $$ BEGIN
    ALTER TABLE public.notas ADD COLUMN estado_flotante estado_flotante_enum NOT NULL DEFAULT 'cerrada';
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Resultado: las notas existentes (todas eran ventas) quedan con
-- tipo_salida = 'venta', estado_flotante = 'cerrada'. Compatibilidad total.


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  4. ALTER TABLE movimientos_inventario                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
-- Agregar nota_id para trazabilidad: vincular cada movimiento a la nota que lo originó.
-- Es nullable porque las entradas manuales (compra de stock) no tienen nota asociada.

DO $$ BEGIN
    ALTER TABLE public.movimientos_inventario
        ADD COLUMN nota_id UUID REFERENCES notas(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Índice para consultas frecuentes "¿qué movimientos generó esta nota?"
CREATE INDEX IF NOT EXISTS idx_movimientos_nota_id
    ON public.movimientos_inventario (nota_id);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  5. REFACTORIZAR TRIGGERS EXISTENTES                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ──────────────────────────────────────────────────────────────────────────────
-- 5A. fn_descontar_inventario_por_venta (REFACTORIZADO)
-- ──────────────────────────────────────────────────────────────────────────────
-- Cambios:
--   1. Incluye nota_id en el movimiento para trazabilidad
--   2. El motivo refleja el tipo_salida ('Venta', 'Promoción', 'Consignación')
-- Comportamiento: TODAS las modalidades generan salida en el Ledger al insertar
-- detalles. La diferencia entre ellas es si suman a ingresos o no (eso lo
-- controla obtener_resumen_financiero, no este trigger).
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_descontar_inventario_por_venta()
RETURNS TRIGGER AS $$
DECLARE
    v_correlativo  TEXT;
    v_usuario_id   UUID;
    v_tipo_salida  tipo_salida_enum;
    v_motivo_label TEXT;
BEGIN
    -- Obtener datos de la nota padre
    SELECT correlativo, usuario_id, tipo_salida
    INTO v_correlativo, v_usuario_id, v_tipo_salida
    FROM public.notas
    WHERE id = NEW.nota_id;

    -- Mapear tipo_salida a etiqueta legible para el motivo del Ledger
    v_motivo_label := CASE v_tipo_salida
        WHEN 'venta'        THEN 'Venta'
        WHEN 'promocion'    THEN 'Promoción'
        WHEN 'consignacion' THEN 'Consignación'
        ELSE 'Salida'
    END;

    -- Registrar salida en el Ledger con nota_id para trazabilidad
    INSERT INTO public.movimientos_inventario (
        producto_id,
        tipo,
        cantidad,
        usuario_id,
        motivo,
        nota_id,
        fecha_creacion
    ) VALUES (
        NEW.producto_id,
        'salida',
        NEW.cantidad,
        COALESCE(v_usuario_id, auth.uid()),
        v_motivo_label || ' nota ' || COALESCE(v_correlativo, 'S/N'),
        NEW.nota_id,
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear trigger (DROP + CREATE para garantizar la versión nueva)
DROP TRIGGER IF EXISTS trg_descontar_inventario_por_venta ON public.detalles_nota;
CREATE TRIGGER trg_descontar_inventario_por_venta
    AFTER INSERT ON public.detalles_nota
    FOR EACH ROW EXECUTE FUNCTION public.fn_descontar_inventario_por_venta();


-- ──────────────────────────────────────────────────────────────────────────────
-- 5B. fn_procesar_devolucion_dinamica (REFACTORIZADO)
-- ──────────────────────────────────────────────────────────────────────────────
-- Cambios:
--   1. Incluye nota_id en el movimiento de entrada (trazabilidad)
--   2. Compatible con los 3 tipos de salida
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_procesar_devolucion_dinamica()
RETURNS TRIGGER AS $$
DECLARE
    v_correlativo         TEXT;
    v_subtotal_original   NUMERIC(12, 2);
    v_total_actual        NUMERIC(12, 2);
    v_nuevo_total         NUMERIC(12, 2);
    v_nuevo_estado        nota_status;
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

    -- Determinar nuevo estado:
    --   0         → anulada  (devolución total)
    --   < original → parcial  (devolución parcial)
    --   = original → pagada   (sin cambio neto)
    v_nuevo_estado := CASE
        WHEN v_nuevo_total = 0                  THEN 'anulada'::nota_status
        WHEN v_nuevo_total < v_subtotal_original THEN 'parcial'::nota_status
        ELSE 'pagada'::nota_status
    END;

    -- 1) Actualizar cabecera de la nota
    UPDATE public.notas
    SET
        total_usd          = v_nuevo_total,
        estado             = v_nuevo_estado,
        fecha_actualizacion = NOW()
    WHERE id = NEW.nota_id;

    -- 2) Registrar 'entrada' en el Ledger con nota_id para trazabilidad
    INSERT INTO public.movimientos_inventario (
        producto_id,
        tipo,
        cantidad,
        usuario_id,
        motivo,
        nota_id,
        fecha_creacion
    ) VALUES (
        NEW.producto_id,
        'entrada',
        NEW.cantidad_devuelta,
        COALESCE(NEW.usuario_id, auth.uid(), v_usuario_responsable),
        'Devolución nota ' || COALESCE(v_correlativo, 'S/N')
            || CASE WHEN NEW.motivo IS NOT NULL THEN ' — ' || NEW.motivo ELSE '' END,
        NEW.nota_id,
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_procesar_devolucion_dinamica ON public.devoluciones;
CREATE TRIGGER trg_procesar_devolucion_dinamica
    AFTER INSERT ON public.devoluciones
    FOR EACH ROW EXECUTE FUNCTION public.fn_procesar_devolucion_dinamica();


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  6. NUEVAS FUNCIONES RPC                                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ──────────────────────────────────────────────────────────────────────────────
-- 6A. liquidar_promocion(p_nota_id UUID)
-- ──────────────────────────────────────────────────────────────────────────────
-- Convierte una promoción abierta en venta cerrada.
-- Lógica:
--   1. Verifica que la nota sea tipo 'promocion' y estado_flotante 'abierta'
--   2. Cambia estado_flotante → 'cerrada', estado → 'pagada'
--   3. El monto total_usd (ya descontadas las devoluciones previas) ahora
--      será contabilizado por obtener_resumen_financiero como ingreso.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.liquidar_promocion(p_nota_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_nota RECORD;
BEGIN
    -- Obtener y validar la nota
    SELECT id, correlativo, tipo_salida, estado_flotante, total_usd
    INTO v_nota
    FROM public.notas
    WHERE id = p_nota_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Nota no encontrada.');
    END IF;

    IF v_nota.tipo_salida != 'promocion' THEN
        RETURN jsonb_build_object('ok', false, 'error',
            'Solo se pueden liquidar notas de tipo promoción. Esta nota es de tipo ' || v_nota.tipo_salida || '.');
    END IF;

    IF v_nota.estado_flotante != 'abierta' THEN
        RETURN jsonb_build_object('ok', false, 'error',
            'Esta promoción ya fue cerrada/liquidada.');
    END IF;

    -- Liquidar: cerrar la nota y marcar como pagada
    UPDATE public.notas
    SET
        estado_flotante     = 'cerrada',
        estado              = 'pagada',
        fecha_actualizacion = NOW()
    WHERE id = p_nota_id;

    RETURN jsonb_build_object(
        'ok', true,
        'correlativo', v_nota.correlativo,
        'monto_liquidado', v_nota.total_usd
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.liquidar_promocion(UUID) TO authenticated;


-- ──────────────────────────────────────────────────────────────────────────────
-- 6B. procesar_corte_consignacion(p_nota_id, p_items JSONB)
-- ──────────────────────────────────────────────────────────────────────────────
-- Procesa el corte semanal de una consignación.
-- Entrada p_items: array de objetos con la forma:
--   [
--     { "detalle_nota_id": "uuid", "producto_id": "uuid", "vendidos": 3, "devueltos": 2 },
--     ...
--   ]
-- Lógica por cada item:
--   1. 'vendidos' → se deja como salida (ya existente). Se suma al ingreso.
--   2. 'devueltos' → se crea un movimiento de 'entrada' en el Ledger.
-- Después de procesar todos los items:
--   3. Recalcular total_usd de la nota (solo lo vendido).
--   4. Si no quedan items flotantes → estado_flotante = 'cerrada'.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.procesar_corte_consignacion(
    p_nota_id UUID,
    p_items   JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_nota           RECORD;
    v_item           JSONB;
    v_detalle        RECORD;
    v_devueltos      INTEGER;
    v_vendidos       INTEGER;
    v_total_vendido  NUMERIC(12, 2) := 0;
    v_total_devuelto INTEGER := 0;
    v_usuario        UUID;
    v_items_flotantes INTEGER;
BEGIN
    -- 1. Validar la nota
    SELECT id, correlativo, tipo_salida, estado_flotante, usuario_id
    INTO v_nota
    FROM public.notas
    WHERE id = p_nota_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Nota no encontrada.');
    END IF;

    IF v_nota.tipo_salida != 'consignacion' THEN
        RETURN jsonb_build_object('ok', false, 'error',
            'Solo se pueden procesar cortes de notas tipo consignación.');
    END IF;

    IF v_nota.estado_flotante != 'abierta' THEN
        RETURN jsonb_build_object('ok', false, 'error',
            'Esta consignación ya fue cerrada.');
    END IF;

    v_usuario := COALESCE(auth.uid(), v_nota.usuario_id);

    -- 2. Procesar cada item del corte
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_devueltos := (v_item->>'devueltos')::INTEGER;
        v_vendidos  := (v_item->>'vendidos')::INTEGER;

        -- Obtener el detalle para calcular montos
        SELECT id, producto_id, cantidad, precio_unitario_usd
        INTO v_detalle
        FROM public.detalles_nota
        WHERE id = (v_item->>'detalle_nota_id')::UUID;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('ok', false, 'error',
                'Detalle de nota ' || (v_item->>'detalle_nota_id') || ' no encontrado.');
        END IF;

        -- Validar que vendidos + devueltos no excedan la cantidad original
        IF (v_vendidos + v_devueltos) > v_detalle.cantidad THEN
            RETURN jsonb_build_object('ok', false, 'error',
                'La suma de vendidos (' || v_vendidos || ') y devueltos (' || v_devueltos
                || ') excede la cantidad original (' || v_detalle.cantidad || ').');
        END IF;

        -- 2a. Registrar devolución en el Ledger (entrada al inventario)
        IF v_devueltos > 0 THEN
            INSERT INTO public.movimientos_inventario (
                producto_id, tipo, cantidad, usuario_id, motivo, nota_id, fecha_creacion
            ) VALUES (
                v_detalle.producto_id,
                'entrada',
                v_devueltos,
                v_usuario,
                'Corte consignación nota ' || COALESCE(v_nota.correlativo, 'S/N')
                    || ' — devueltos ' || v_devueltos || ' uds.',
                p_nota_id,
                NOW()
            );

            -- También registrar en tabla devoluciones para auditoría
            INSERT INTO public.devoluciones (
                nota_id, producto_id, detalle_nota_id,
                cantidad_devuelta, monto_descontado, motivo, usuario_id
            ) VALUES (
                p_nota_id,
                v_detalle.producto_id,
                v_detalle.id,
                v_devueltos,
                v_devueltos * v_detalle.precio_unitario_usd,
                'Corte de consignación — devolución',
                v_usuario
            );

            v_total_devuelto := v_total_devuelto + v_devueltos;
        END IF;

        -- 2b. Acumular lo vendido (las salidas del Ledger ya existen desde la creación)
        IF v_vendidos > 0 THEN
            v_total_vendido := v_total_vendido + (v_vendidos * v_detalle.precio_unitario_usd);
        END IF;
    END LOOP;

    -- 3. Recalcular total_usd de la nota = solo lo efectivamente vendido
    UPDATE public.notas
    SET
        total_usd           = v_total_vendido,
        estado              = CASE WHEN v_total_vendido > 0 THEN 'pagada'::nota_status ELSE 'anulada'::nota_status END,
        estado_flotante     = 'cerrada',
        fecha_actualizacion = NOW()
    WHERE id = p_nota_id;

    RETURN jsonb_build_object(
        'ok', true,
        'correlativo', v_nota.correlativo,
        'total_vendido_usd', v_total_vendido,
        'total_devuelto_uds', v_total_devuelto
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.procesar_corte_consignacion(UUID, JSONB) TO authenticated;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  7. RLS: RESTRICCIONES DE ROL (RBAC)                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
-- Jefe (admin):  Acceso total.
-- Secretaria:    NO puede anular/eliminar notas. NO puede eliminar clientes.

-- 7a. Notas — DELETE solo para admin (Jefe)
DROP POLICY IF EXISTS "Permitir creación y actualización de notas a usuarios autenticados" ON public.notas;

-- SELECT: todos los autenticados
CREATE POLICY "notas_select_authenticated" ON public.notas
    FOR SELECT TO authenticated USING (true);

-- INSERT: todos los autenticados
CREATE POLICY "notas_insert_authenticated" ON public.notas
    FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: todos los autenticados (para liquidaciones, cortes, devoluciones)
CREATE POLICY "notas_update_authenticated" ON public.notas
    FOR UPDATE TO authenticated USING (true);

-- DELETE: solo admin (Jefe)
CREATE POLICY "notas_delete_admin_only" ON public.notas
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
    );

-- 7b. Clientes — DELETE solo para admin (Jefe)
DROP POLICY IF EXISTS "Permitir gestión de clientes a usuarios autenticados" ON public.clientes;

-- SELECT: todos
CREATE POLICY "clientes_select_authenticated" ON public.clientes
    FOR SELECT TO authenticated USING (true);

-- INSERT: todos
CREATE POLICY "clientes_insert_authenticated" ON public.clientes
    FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: todos
CREATE POLICY "clientes_update_authenticated" ON public.clientes
    FOR UPDATE TO authenticated USING (true);

-- DELETE: solo admin (Jefe)
CREATE POLICY "clientes_delete_admin_only" ON public.clientes
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
    );


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  8. ACTUALIZAR obtener_resumen_financiero()                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
-- ANTES: Sumaba todas las notas con estado = 'pagada'.
-- AHORA: Suma solo notas con estado = 'pagada' Y estado_flotante = 'cerrada'.
-- Esto excluye correctamente las promociones/consignaciones abiertas,
-- que aún no han sido liquidadas y no deben contar como ingreso.

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
    -- Ingresos: solo notas cerradas y pagadas (ventas directas + promociones liquidadas + consignaciones cortadas)
    SELECT COALESCE(SUM(total_usd), 0) INTO v_ingresos
    FROM public.notas
    WHERE estado = 'pagada'
      AND estado_flotante = 'cerrada';

    -- COGS: subtotales de detalles de notas que generaron ingreso
    SELECT COALESCE(SUM(dn.subtotal_usd), 0) INTO v_cogs
    FROM public.detalles_nota dn
    JOIN public.notas n ON n.id = dn.nota_id
    WHERE n.estado = 'pagada'
      AND n.estado_flotante = 'cerrada';

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


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  9. ÍNDICES ADICIONALES                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- Notas: filtrar por tipo_salida es frecuente (panel de flotantes)
CREATE INDEX IF NOT EXISTS idx_notas_tipo_salida
    ON public.notas (tipo_salida);

-- Notas: filtrar por estado_flotante (buscar las abiertas)
CREATE INDEX IF NOT EXISTS idx_notas_estado_flotante
    ON public.notas (estado_flotante);

-- Clientes: búsqueda por tipo
CREATE INDEX IF NOT EXISTS idx_clientes_tipo
    ON public.clientes (tipo);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  10. VISTA ACTUALIZADA: notas_flotantes_abiertas                            ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
-- Vista de conveniencia para listar rápidamente las notas de
-- promoción/consignación que aún están abiertas.

CREATE OR REPLACE VIEW public.notas_flotantes_abiertas AS
SELECT
    n.id,
    n.correlativo,
    n.tipo_salida,
    n.cliente_nombre,
    c.nombre   AS cliente_nombre_normalizado,
    c.tipo     AS cliente_tipo,
    n.total_usd,
    n.estado,
    n.estado_flotante,
    n.fecha_creacion,
    n.fecha_actualizacion,
    -- Contar cuántos items tiene la nota para referencia rápida
    (SELECT COUNT(*) FROM public.detalles_nota dn WHERE dn.nota_id = n.id)::INTEGER AS total_items
FROM public.notas n
LEFT JOIN public.clientes c ON c.id = n.cliente_id
WHERE n.estado_flotante = 'abierta'
  AND n.tipo_salida IN ('promocion', 'consignacion')
ORDER BY n.fecha_creacion DESC;

GRANT SELECT ON public.notas_flotantes_abiertas TO authenticated;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  📝 RESUMEN DE CAMBIOS — MIGRACIÓN FASE 3                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- NUEVOS ENUMS:
--   tipo_salida_enum     ('venta', 'promocion', 'consignacion')
--   estado_flotante_enum ('abierta', 'cerrada')
--   tipo_cliente_enum    ('colegio', 'vendedor', 'general')
--
-- ALTER TABLES:
--   clientes  → +tipo, +contacto, -documento_id, -direccion
--   notas     → +tipo_salida, +estado_flotante
--   movimientos_inventario → +nota_id (FK a notas, nullable)
--
-- TRIGGERS REFACTORIZADOS:
--   fn_descontar_inventario_por_venta  → incluye nota_id + motivo por tipo_salida
--   fn_procesar_devolucion_dinamica    → incluye nota_id en entrada del Ledger
--
-- NUEVAS RPCs:
--   liquidar_promocion(UUID)                → cierra una promoción abierta
--   procesar_corte_consignacion(UUID, JSONB)→ corte semanal de consignación
--
-- RLS (RBAC):
--   notas    → DELETE solo admin
--   clientes → DELETE solo admin
--
-- VISTA:
--   notas_flotantes_abiertas → lista las promociones/consignaciones abiertas
--
-- ACTUALIZADO:
--   obtener_resumen_financiero() → excluye notas con estado_flotante = 'abierta'
--
-- ╚══════════════════════════════════════════════════════════════════════════════╝
