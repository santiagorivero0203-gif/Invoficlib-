-- 1. Enums
CREATE TYPE user_role AS ENUM ('admin', 'secretaria');
CREATE TYPE movement_type AS ENUM ('entrada', 'salida');

-- 2. Tabla Perfiles (Extendiendo auth.users)
CREATE TABLE perfiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    rol user_role NOT NULL DEFAULT 'secretaria',
    nombre_completo TEXT NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabla Tasas de Cambio
CREATE TABLE tasas_cambio (
    id BIGSERIAL PRIMARY KEY,
    tasa_ves NUMERIC(12, 4) NOT NULL CHECK (tasa_ves > 0),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Tabla Productos
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_sku TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio_usd NUMERIC(12, 2) NOT NULL CHECK (precio_usd >= 0),
    imagen_url TEXT,
    stock_minimo INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Tabla Movimientos de Inventario (Ledger)
CREATE TABLE movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE NOT NULL,
    tipo movement_type NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    usuario_id UUID REFERENCES perfiles(id) ON DELETE SET NULL NOT NULL,
    motivo TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Habilitar RLS (Row Level Security)
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasas_cambio ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS
-- Perfiles: Todos los autenticados pueden ver perfiles; solo admins o el propio usuario pueden editar.
CREATE POLICY "Permitir lectura de perfiles a usuarios autenticados" ON perfiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir actualizaciones a administradores o al propio usuario" ON perfiles
    FOR UPDATE TO authenticated USING (
        auth.uid() = id OR 
        EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
    );

-- Tasas de Cambio: Lectura para todos; Inserción solo para administradores.
CREATE POLICY "Permitir lectura de tasas a usuarios autenticados" ON tasas_cambio
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir insertar tasas a administradores" ON tasas_cambio
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
    );

-- Productos: Lectura para todos; Escritura solo para administradores.
CREATE POLICY "Permitir lectura de productos a usuarios autenticados" ON productos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir gestión de productos a administradores" ON productos
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
    );

-- Movimientos de Inventario: Lectura e Inserción para todos; Sin UPDATE ni DELETE (Ledger inmutable).
CREATE POLICY "Permitir lectura de movimientos a usuarios autenticados" ON movimientos_inventario
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserción de movimientos a usuarios autenticados" ON movimientos_inventario
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = usuario_id
    );

-- 8. Trigger para crear automáticamente el perfil tras el registro en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, nombre_completo, rol)
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'nombre_completo', 'Nuevo Usuario'), 
        COALESCE((new.raw_user_meta_data->>'rol')::user_role, 'secretaria'::user_role)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
