-- ==============================================================================
-- INVOFICLIB - ESQUEMA DE NOTAS, DEVOLUCIONES, GASTOS Y TRIGGERS DE INVENTARIO
-- ==============================================================================

-- 1. Enums adicionales
DO $$ BEGIN
    CREATE TYPE nota_status AS ENUM ('pagada', 'parcial', 'anulada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gasto_type AS ENUM ('fijo', 'variable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gasto_status AS ENUM ('pagado', 'por_pagar');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Secuencia para correlativo automático de notas (#00001, #00002...)
CREATE SEQUENCE IF NOT EXISTS notas_correlativo_seq START 1;

-- 3. Tabla Clientes (Opcional pero recomendado para normalización de ventas)
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    telefono TEXT,
    documento_id TEXT,
    direccion TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Tabla Notas (Ventas/Pedidos)
CREATE TABLE IF NOT EXISTS notas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlativo TEXT UNIQUE NOT NULL DEFAULT ('#' || LPAD(nextval('notas_correlativo_seq')::TEXT, 5, '0')),
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    cliente_nombre TEXT DEFAULT 'Cliente General',
    usuario_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    subtotal_usd NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal_usd >= 0),
    total_usd NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_usd >= 0),
    estado nota_status NOT NULL DEFAULT 'pagada',
    observaciones TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Tabla Detalles de Nota (Items vendidos)
CREATE TABLE IF NOT EXISTS detalles_nota (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_id UUID REFERENCES notas(id) ON DELETE CASCADE NOT NULL,
    producto_id UUID REFERENCES productos(id) ON DELETE RESTRICT NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario_usd NUMERIC(12, 2) NOT NULL CHECK (precio_unitario_usd >= 0),
    subtotal_usd NUMERIC(12, 2) NOT NULL CHECK (subtotal_usd >= 0),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Tabla Devoluciones (Auditoría e historial de devoluciones dinámicas)
CREATE TABLE IF NOT EXISTS devoluciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_id UUID REFERENCES notas(id) ON DELETE CASCADE NOT NULL,
    producto_id UUID REFERENCES productos(id) ON DELETE RESTRICT NOT NULL,
    detalle_nota_id UUID REFERENCES detalles_nota(id) ON DELETE SET NULL,
    cantidad_devuelta INTEGER NOT NULL CHECK (cantidad_devuelta > 0),
    monto_descontado NUMERIC(12, 2) NOT NULL CHECK (monto_descontado >= 0),
    motivo TEXT DEFAULT 'Devolución de producto',
    usuario_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Tabla Gastos (Gastos fijos y variables)
CREATE TABLE IF NOT EXISTS gastos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'General',
    tipo gasto_type NOT NULL DEFAULT 'variable',
    monto_usd NUMERIC(12, 2) NOT NULL CHECK (monto_usd >= 0),
    estado gasto_status NOT NULL DEFAULT 'pagado',
    descripcion TEXT,
    usuario_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Habilitar RLS en todas las nuevas tablas
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_nota ENABLE ROW LEVEL SECURITY;
ALTER TABLE devoluciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- 9. Políticas RLS
-- Clientes
CREATE POLICY "Permitir lectura de clientes a usuarios autenticados" ON clientes
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir gestión de clientes a usuarios autenticados" ON clientes
    FOR ALL TO authenticated USING (true);

-- Notas
CREATE POLICY "Permitir lectura de notas a usuarios autenticados" ON notas
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir creación y actualización de notas a usuarios autenticados" ON notas
    FOR ALL TO authenticated USING (true);

-- Detalles de Nota
CREATE POLICY "Permitir lectura de detalles_nota a usuarios autenticados" ON detalles_nota
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir creación de detalles_nota a usuarios autenticados" ON detalles_nota
    FOR ALL TO authenticated USING (true);

-- Devoluciones
CREATE POLICY "Permitir lectura de devoluciones a usuarios autenticados" ON devoluciones
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir registro de devoluciones a usuarios autenticados" ON devoluciones
    FOR INSERT TO authenticated WITH CHECK (true);

-- Gastos
CREATE POLICY "Permitir lectura de gastos a usuarios autenticados" ON gastos
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir gestión de gastos a usuarios autenticados" ON gastos
    FOR ALL TO authenticated USING (true);


-- ==============================================================================
-- 10. FUNCIONES PL/PGSQL Y TRIGGERS DE NEGOCIO (LEDGER & AUDITORÍA)
-- ==============================================================================

-- A) Trigger al registrar un detalle de nota: Descuenta inventario automáticamente (salida)
CREATE OR REPLACE FUNCTION public.fn_descontar_inventario_por_venta()
RETURNS TRIGGER AS $$
DECLARE
    v_correlativo TEXT;
    v_usuario_id UUID;
BEGIN
    SELECT correlativo, usuario_id INTO v_correlativo, v_usuario_id 
    FROM public.notas WHERE id = NEW.nota_id;

    -- Registrar salida en el Ledger
    INSERT INTO public.movimientos_inventario (
        producto_id,
        tipo,
        cantidad,
        usuario_id,
        motivo,
        fecha_creacion
    ) VALUES (
        NEW.producto_id,
        'salida',
        NEW.cantidad,
        COALESCE(v_usuario_id, auth.uid()),
        'Venta nota ' || COALESCE(v_correlativo, 'S/N'),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_descontar_inventario_por_venta ON public.detalles_nota;
CREATE TRIGGER trg_descontar_inventario_por_venta
    AFTER INSERT ON public.detalles_nota
    FOR EACH ROW EXECUTE FUNCTION public.fn_descontar_inventario_por_venta();


-- B) Trigger al registrar Devolución:
-- 1. Resta del total_usd de la nota.
-- 2. Registra automáticamente la 'entrada' en movimientos_inventario.
-- 3. Actualiza el estado de la nota si el total llega a 0.
CREATE OR REPLACE FUNCTION public.fn_procesar_devolucion_dinamica()
RETURNS TRIGGER AS $$
DECLARE
    v_correlativo TEXT;
    v_total_actual NUMERIC(12, 2);
    v_nuevo_total NUMERIC(12, 2);
    v_usuario_responsable UUID;
BEGIN
    -- Obtener datos de la nota
    SELECT correlativo, total_usd, usuario_id 
    INTO v_correlativo, v_total_actual, v_usuario_responsable
    FROM public.notas 
    WHERE id = NEW.nota_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La nota indicada con ID % no existe.', NEW.nota_id;
    END IF;

    -- Calcular nuevo total sin permitir negativos
    v_nuevo_total := GREATEST(0, v_total_actual - NEW.monto_descontado);

    -- 1) Actualizar tabla notas (monto y estado si queda en 0)
    UPDATE public.notas
    SET 
        total_usd = v_nuevo_total,
        estado = CASE WHEN v_nuevo_total = 0 THEN 'anulada'::nota_status ELSE estado END,
        fecha_actualizacion = NOW()
    WHERE id = NEW.nota_id;

    -- 2) Registrar 'entrada' en el Ledger de movimientos_inventario
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
        'Devolución de la nota ' || COALESCE(v_correlativo, 'S/N') || COALESCE(' - ' || NEW.motivo, ''),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_procesar_devolucion_dinamica ON public.devoluciones;
CREATE TRIGGER trg_procesar_devolucion_dinamica
    AFTER INSERT ON public.devoluciones
    FOR EACH ROW EXECUTE FUNCTION public.fn_procesar_devolucion_dinamica();
