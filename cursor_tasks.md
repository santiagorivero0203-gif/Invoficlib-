# 🎯 Cursor Tasks — Fase 3: Migración a Supabase Real

**Estado:** COMPLETADA · **Prioridad:** ALTA  
**Arquitecto:** Antigravity · **Ejecutor:** Cursor  
**Fecha:** 2026-08-13

---

## Contexto

Las 4 vistas principales (`/vender`, `/pedidos`, `/gastos`, `/cuentas`) funcionan
con datos mock provenientes de `lib/mock/operaciones.ts`.

Antigravity creó una capa de acceso a datos en `lib/actions/` con todas las
funciones ya tipadas contra el esquema real de Supabase. Tu trabajo es
**reemplazar los mocks** de cada página por llamadas a esas funciones.

### Archivos de referencia obligatoria
- `lib/actions/notas.ts` — queries para notas, detalles y devoluciones
- `lib/actions/productos.ts` — CRUD de productos + cálculo de stock
- `lib/actions/gastos.ts` — gastos con filtros + métricas
- `lib/actions/cuentas.ts` — ledger financiero (ingresos, COGS, utilidades)
- `lib/actions/tasa.ts` — tasa de cambio USD/VES vigente
- `lib/supabase/client.ts` — cliente browser (ya existe, no modificar)
- `lib/supabase/server.ts` — cliente server SSR (ya existe, no modificar)
- `types/database.types.ts` — tipos completos del esquema

---

## Reglas de diseño (NO ROMPER)
- Modo claro únicamente, fondo `#f5f5f7`, texto `#1d1d1f`
- Bordes redondeados `rounded-[20px]` en tarjetas
- Tipografía Inter, sombras suaves `shadow-sm`
- Sin dark mode, sin gradientes llamativos
- Mantener todos los comentarios JSDoc existentes

---

## TAREA 1 — `/vender/page.tsx` · Catálogo real de productos

### Objetivo
Reemplazar el array de productos mock por datos reales de Supabase.
La tasa de cambio también debe venir de la tabla `tasas_cambio`.

### Cambios requeridos en `app/(dashboard)/vender/page.tsx`

1. **Convertir a Server Component** la parte de carga de datos:
   - Al montar la página, llamar `getProductosConStock()` de `lib/actions/productos.ts`
   - Llamar `getTasaVigente()` de `lib/actions/tasa.ts`
   - Pasar los datos como props al componente cliente interno

2. **Mantener el estado client-side** (carrito, búsqueda, switch bimoneda)
   usando un componente `'use client'` separado: `VenderClient`.

3. **Al confirmar la venta** (botón "Emitir Nota"), llamar `crearNota()` de
   `lib/actions/notas.ts` con:
   ```ts
   crearNota(
     {
       cliente_nombre: cliente || 'Consumidor Final',
       subtotal_usd: subtotal,
       total_usd: total,
       estado: 'pagada',
     },
     carrito.map(item => ({
       producto_id: item.id,
       cantidad: item.cantidad,
       precio_unitario_usd: item.precio_usd,
       subtotal_usd: item.precio_usd * item.cantidad,
     }))
   )
   ```

4. **Manejar estados de carga y error**:
   - Spinner o skeleton mientras carga el catálogo
   - Toast o mensaje inline si falla la emisión de la nota
   - Deshabilitar el botón "Emitir Nota" mientras está en proceso

5. **Fallback de tasa**: Si `getTasaVigente()` retorna null, mostrar un
   banner amarillo suave advirtiendo que no hay tasa registrada y usar `42.50`
   como valor temporal.

---

## TAREA 2 — `/pedidos/page.tsx` · Listado real de notas

### Objetivo
Reemplazar el array de notas mock por datos reales. El drawer de detalle y
el modal de devolución deben operar contra Supabase.

### Cambios requeridos en `app/(dashboard)/pedidos/page.tsx`

1. **Carga inicial**: Al montar, llamar `getNotas()` de `lib/actions/notas.ts`.
   La query ya incluye las `devoluciones` en el mismo request.

2. **Abrir drawer**: Al hacer clic en una fila, llamar `getNotaCompleta(nota.id)`
   para obtener los `detalles_nota` con nombres de producto.

3. **Registrar devolución**: Al confirmar el modal, llamar `crearDevolucion()`:
   ```ts
   crearDevolucion({
     nota_id: notaSeleccionada.id,
     producto_id: productoDevuelto.producto_id,
     detalle_nota_id: productoDevuelto.id,
     cantidad_devuelta: cantidad,
     monto_descontado: cantidad * productoDevuelto.precio_unitario_usd,
     motivo: motivoTexto,
   })
   ```
   > El trigger `trg_procesar_devolucion_dinamica` en Supabase recalcula
   > automáticamente el total y el estado de la nota. NO actualizar la nota
   > manualmente desde el cliente.

4. **Refrescar datos**: Después de una devolución exitosa, volver a llamar
   `getNotaCompleta(nota.id)` para actualizar el drawer con los nuevos totales.

5. **Estados de carga**: Mostrar skeleton en la tabla mientras carga.
   Deshabilitar el botón "Confirmar Devolución" durante la mutación.

---

## TAREA 3 — `/gastos/page.tsx` · Gastos reales con filtros

### Objetivo
Reemplazar los gastos mock. Los filtros de Tabs deben disparar queries
reales con los parámetros correspondientes.

### Cambios requeridos en `app/(dashboard)/gastos/page.tsx`

1. **Carga inicial**: Llamar `getGastos()` y `getResumenGastos()` de
   `lib/actions/gastos.ts` para poblar la tabla y las 4 tarjetas métricas.

2. **Filtros reactivos**: Al cambiar el Tab de tipo o estado, re-llamar
   `getGastos(tipo, estado)` con los parámetros actualizados.
   Manejar con `useState` + `useEffect` o con `useTransition` para fluidez.

3. **Crear gasto**: Al confirmar el modal, llamar `crearGasto()`:
   ```ts
   crearGasto({
     nombre: form.nombre,
     categoria: form.categoria,
     tipo: form.tipo,
     monto_usd: parseFloat(form.monto),
     estado: form.estado,
     descripcion: form.descripcion || null,
     fecha: new Date().toISOString(),
   })
   ```
   Después de crear, re-fetch `getGastos()` y `getResumenGastos()`.

4. **Marcar como pagado**: Cada fila debe tener un botón (ícono ✓) que llame
   `marcarGastoPagado(id)` si el gasto está en estado `por_pagar`.

---

## TAREA 4 — `/cuentas/page.tsx` · Ledger financiero real

### Objetivo
Reemplazar los datos del resumen financiero mock por el cálculo real
desde `lib/actions/cuentas.ts`.

### Cambios requeridos en `app/(dashboard)/cuentas/page.tsx`

1. **Carga de datos**: Llamar `getResumenFinanciero()` de `lib/actions/cuentas.ts`.

2. **Mapear al estado visual**:
   - `data.ingresos_usd` → tarjeta Ingresos
   - `data.cogs_usd` → tarjeta COGS
   - `data.utilidad_bruta_usd` → tarjeta Utilidad Bruta
   - `data.gastos_op_usd` → tarjeta Gastos Operativos
   - `data.utilidad_neta_usd` → tarjeta Utilidad Neta
   - `data.margen_neto_pct` → indicador de margen

3. **Estado vacío**: Si todos los valores son 0, mostrar:
   > "Aún no hay datos financieros. Registra tu primera venta en /vender."

4. **Tasa de cambio**: Llamar `getTasaVigente()` de `lib/actions/tasa.ts`
   y mostrar las cifras también en VES debajo de cada tarjeta USD.

---

## TAREA 5 — Componente de error reutilizable

Crear `components/ui/error-message.tsx`:
```tsx
/** Mensaje de error inline para sustituir datos cuando Supabase falla. */
export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-[12px] bg-red-50 border border-red-200 p-4 text-sm text-red-700">
      <strong>Error al cargar los datos:</strong> {message}
    </div>
  )
}
```

Usarlo en cada página cuando `error !== null`.

---

## Criterio de aceptación

- [x] `/vender`: Catálogo real. Emitir nota inserta en `notas` + `detalles_nota`.
- [x] `/pedidos`: Tabla con notas reales. Drawer con productos. Devolución inserta en `devoluciones`.
- [x] `/gastos`: Datos y métricas de Supabase. Filtros funcionales. Crear gastos.
- [x] `/cuentas`: Ledger desde datos reales.
- [x] `npm run build` pasa sin errores de TypeScript.
- [x] Diseño Apple Minimal intacto.

---

## Nota de ejecución (Cursor, 2026-08-13)

- `types/database.types.ts` se completó con `Views`, `Functions` y `Relationships`
  (requeridos por `@supabase/supabase-js` 2.112.x; sin ellos el schema resuelve a `never`
  y ninguna query tipa). Es el formato estándar de `supabase gen types`.
- `/vender` quedó como Server Component con `export const dynamic = 'force-dynamic'`.
- `lib/mock/operaciones.ts` quedó sin usos; no se eliminó.
- Pendiente ajeno a esta fase: conectar Supabase Auth (las políticas RLS son solo
  `authenticated`, por lo que con el AuthProvider mock las consultas anónimas no devuelven filas).
