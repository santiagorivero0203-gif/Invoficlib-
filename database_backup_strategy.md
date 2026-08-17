# Estrategia de Respaldo y Migración Segura a Soft Deletes — Invoficlib

Este documento define la arquitectura de respaldos, contingencia y el script SQL exacto para migrar de la actual **Fase de Pruebas** (con borrado físico permitido) al entorno de **Producción** con **Soft Deletes** (`deleted_at`).

---

## 1. Política y Estrategia de Respaldos (Backups)

### A. Respaldos Automatizados en Supabase
1. **Daily Backups (Automáticos):** Supabase ejecuta copias completas de la base de datos PostgreSQL diariamente y las retiene según el plan contratado (7 a 30 días).
2. **Point-In-Time Recovery (PITR):** Recomendado habilitar en el Dashboard de Supabase para producción. Permite restaurar el estado exacto de la base de datos a cualquier segundo específico de los últimos 7 días ante cualquier error humano grave.

### B. Respaldo Manual de Seguridad Pre-Lanzamiento (CLI)
Antes de ejecutar cualquier migración a producción, se debe generar un snapshot local completo mediante `pg_dump`:

```bash
# Exportar esquema y datos completos de Supabase a un archivo local .sql
pg_dump -h db.YOUR_SUPABASE_PROJECT_REF.supabase.co -U postgres -d postgres -F c -b -v -f "invoficlib_pre_produccion_$(date +%Y%m%d_%H%M%S).dump"
```

---

## 2. Script SQL Exacto para Migración a Soft Deletes (Pre-Producción)

En la fase de pruebas actual, permitimos sentencias `DELETE` normales para facilitar la limpieza de datos. Antes del lanzamiento a producción oficial, se debe ejecutar el siguiente script SQL en el **SQL Editor de Supabase**:

```sql
-- ============================================================================
-- SCRIPT DE MIGRACIÓN: IMPLEMENTACIÓN DE SOFT DELETES
-- ============================================================================

-- 1. Agregar columna `deleted_at` a la tabla `clientes`
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Agregar columna `deleted_at` a la tabla `productos`
ALTER TABLE public.productos 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Agregar columna `deleted_at` a la tabla `notas`
ALTER TABLE public.notas 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 4. Índices parciales para optimizar consultas que excluyen eliminados
CREATE INDEX IF NOT EXISTS idx_clientes_active 
ON public.clientes(id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_productos_active 
ON public.productos(id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notas_active 
ON public.notas(id) 
WHERE deleted_at IS NULL;

-- 5. Actualización de Políticas RLS para ocultar registros eliminados por defecto
-- Clientes:
DROP POLICY IF EXISTS "Lectura de clientes activos" ON public.clientes;
CREATE POLICY "Lectura de clientes activos" 
ON public.clientes 
FOR SELECT 
USING (deleted_at IS NULL);

-- Productos:
DROP POLICY IF EXISTS "Lectura de productos activos" ON public.productos;
CREATE POLICY "Lectura de productos activos" 
ON public.productos 
FOR SELECT 
USING (deleted_at IS NULL);

-- Notas:
DROP POLICY IF EXISTS "Lectura de notas activas" ON public.notas;
CREATE POLICY "Lectura de notas activas" 
ON public.notas 
FOR SELECT 
USING (deleted_at IS NULL);

-- 6. Función de utilidad para restauración rápida de registros (Admin Only)
CREATE OR REPLACE FUNCTION public.restaurar_registro(
  p_tabla TEXT,
  p_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_tabla = 'clientes' THEN
    UPDATE public.clientes SET deleted_at = NULL WHERE id = p_id;
  ELSIF p_tabla = 'productos' THEN
    UPDATE public.productos SET deleted_at = NULL WHERE id = p_id;
  ELSIF p_tabla = 'notas' THEN
    UPDATE public.notas SET deleted_at = NULL WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'Tabla no soportada para restauración: %', p_tabla;
  END IF;
  RETURN TRUE;
END;
$$;
```

---

## 3. Comportamiento en la Aplicación

| Fase | Clientes | Productos | Notas / Pedidos |
|---|---|---|---|
| **Pruebas (Actual)** | `DELETE` físico directo permitido para resetear datos. | `DELETE` físico y desactivación disponibles. | `DELETE` físico en cascada o anulación contable. |
| **Producción Oficial** | `UPDATE clientes SET deleted_at = now()` | `UPDATE productos SET deleted_at = now()` | `anularNotaCompleta` obligatorio para integridad del Ledger. |
