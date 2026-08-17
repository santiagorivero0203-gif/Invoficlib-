-- ============================================================================
-- SCRIPT DE REGISTRO DIRECTO DE USUARIO Y PERFIL PARA SANTIAGO RIVERO
-- ============================================================================
-- Ejecuta este script en el SQL Editor de Supabase (https://supabase.com/dashboard/project/libcjbesfttwgmigpkot/sql)
-- Crea el usuario en auth.users con contraseña encriptada (32988090) y su perfil
-- ============================================================================

-- 1. Habilitar extensión pgcrypto para hash de contraseñas si no existe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Asegurar que el enum 'developer' exista en user_role
DO $$
BEGIN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'developer';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Crear o actualizar usuario en auth.users con la clave: 32988090
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Verificar si el usuario ya existe
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'santiago.rivero0203@gmail.com';

    IF v_user_id IS NULL THEN
        -- Generar nuevo UUID e insertar usuario en auth.users
        v_user_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            'santiago.rivero0203@gmail.com',
            crypt('32988090', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"nombre_completo":"Santiago Rivero","rol":"developer"}',
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        );
    ELSE
        -- Si ya existe, actualizar contraseña confirmada y metadatos
        UPDATE auth.users
        SET 
            encrypted_password = crypt('32988090', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_user_meta_data = '{"nombre_completo":"Santiago Rivero","rol":"developer"}',
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- 4. Crear o actualizar el perfil en la tabla public.perfiles
    INSERT INTO public.perfiles (id, rol, nombre_completo, fecha_creacion)
    VALUES (v_user_id, 'developer'::public.user_role, 'Santiago Rivero', NOW())
    ON CONFLICT (id)
    DO UPDATE SET 
        rol = 'developer'::public.user_role,
        nombre_completo = 'Santiago Rivero';

    RAISE NOTICE '¡Usuario santiago.rivero0203@gmail.com configurado exitosamente con ID: %!', v_user_id;
END $$;
