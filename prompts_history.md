# Historial de Prompts

*Registro íntegro de instrucciones del usuario en el flujo de desarrollo. **Antigravity es el agente principal; Cursor es el secundario.** Los prompts listados aquí son del contexto de Antigravity — Cursor debe leerlos como directrices del agente principal, no como conversación propia.*

## Modelo de colaboración

```
Usuario → Antigravity (principal) → delega tareas menores → Cursor (secundario)
                ↑                                              ↓
                └──────────── documentación compartida ────────┘
                     prompts_history.md · agent.md · design.md
```

| Campo | Significado |
|-------|-------------|
| **Agente** | A quién iba dirigido el prompt originalmente |
| **Delegado a Cursor** | Si Antigravity derivó la ejecución a Cursor |

---

## Prompt 1 (Configuración Inicial)
**Fecha:** 2026-08-11  
**Agente:** Antigravity (principal)  
**Delegado a Cursor:** No  
**Prompt Original:** "Estableciendo las reglas de este proyecto lo voy a llevar a cabo entre tus agentes y los de cursor por lo que lo debes documentar todo de manera precisa haciendo los archivos con los cambios la descripcion del proyecto un archivo que aparte incluya todos los prompts que te de.Esto lo hago para mantener una eficiencia perpicaz y reducir el uso de tokens, tambien quiero que pongas todas las reglas que te di por las que te vas a regir en un archivo agent .md para que cursor tambien lo siga.Aparte de poner un design md en el que se explique por que estetica se rige el codigo.Aparte incluye las instrucciones para que suba los cambios directamente al repositorio de github"

## Prompt 2 (Esperando Descripción)
**Fecha:** 2026-08-11  
**Agente:** Antigravity (principal)  
**Delegado a Cursor:** No  
**Prompt Original:** "Dentro de un rato te voy a dar la descripcion detallada del proyecto ,para que entiendas que quiero hacer"

## Prompt 3 (Requisitos de Inicialización y Fase 1)
**Fecha:** 2026-08-12  
**Agente:** Antigravity (principal)  
**Delegado a Cursor:** No  
**Prompt Original:** "Rol y Configuración Inicial:
Eres un Senior Full-Stack Developer y Arquitecto de Software experto en React, Next.js (App Router), Tailwind CSS, TypeScript y Supabase (PostgreSQL, Auth, Storage).

Contexto del Proyecto (El "Por qué"):
Estás desarrollando un sistema administrativo y de gestión de inventario a la medida para una empresa asociada a la marca "Girasol". Este sistema reemplazará el uso de la aplicación "Fina".

    Naturaleza del negocio: La empresa maneja un alto volumen de entradas y salidas de inventario diariamente.

    Usuarios: Actualmente, el sistema será de uso privatizado y exclusivo para dos personas: el "Jefe" (Administrador total) y la "Secretaria" (Operadora de registros).

    Visión a futuro: Aunque hoy solo tenga 2 usuarios, la arquitectura debe ser de nivel corporativo y 100% escalable. En el futuro cercano, se integrarán automatizaciones avanzadas, incluyendo un bot de Telegram que consumirá datos del sistema para enviar alertas de stock mínimo y cierres de caja.

Reglas Estrictas de Arquitectura (Anti-AI Slop):

    Cero código espagueti: Separa estrictamente la lógica de negocio, las llamadas a la API/Supabase y la interfaz de usuario. Usa Server Components donde tenga sentido por rendimiento y Client Components solo cuando haya interactividad.

    TypeScript Estricto: Prohibido usar any. Define interfaces explícitas y centralizadas para la base de datos y los componentes.

    UI/UX Intuitiva y Profesional: Usa exclusivamente Tailwind CSS y componentes basados en Shadcn UI (o Radix Primitives). Nada de CSS personalizado a menos que sea estrictamente necesario. La interfaz debe ser sobria, orientada a la rápida lectura de datos (tablas claras, modales eficientes), minimizando los clics para la Secretaria.

    No asumas, no alucines: Si un módulo no se solicita en la fase actual, no lo construyas aún.

Lógica de Negocio Clave a Considerar:

    Inventario tipo "Ledger" (Libro Mayor): Nunca sobrescribiremos una columna de "stock". El inventario se calculará sumando y restando los registros de una tabla de movimientos_inventario para evitar condiciones de carrera (race conditions) y mantener una auditoría perfecta.

    Sistema Bimoneda (USD / VES): El sistema debe estar preparado para manejar una tasa de cambio dinámica. Las operaciones base se guardan con referencia a divisas, y el frontend debe facilitar la visualización en ambas monedas.

Fase 1: Tareas a ejecutar inmediatamente (Inicialización):

1. Estructura de Base de Datos (Supabase SQL):
Genera el script SQL para crear las siguientes tablas clave, aplicando Row Level Security (RLS) asumiendo autenticación de Supabase. Prepara la estructura para los futuros webhooks (ej. triggers para Telegram):

    perfiles: id (uuid referenciado a auth.users), rol (enum: 'admin', 'secretaria'), nombre_completo.

    tasas_cambio: id, tasa_ves (numeric), fecha_creacion (timestamp).

    productos: id, codigo_sku (unique), nombre, descripcion, precio_usd (numeric), imagen_url (text, nullable), stock_minimo (integer - para futuras alertas), estado (boolean).

    movimientos_inventario: id, producto_id (fk), tipo (enum: 'entrada', 'salida'), cantidad (integer positivo), usuario_id (fk a perfiles), motivo (text), fecha_creacion.

2. Estructura del Frontend (Next.js):
Genera la estructura de carpetas sugerida para escalar este proyecto (ej. separación de /components, /lib, /hooks, /app).
Proporciona el código de:

    Configuración del cliente de Supabase (Server y Client).

    Un archivo types/database.types.ts basado en el SQL generado.

3. Layout Base del Dashboard:
Crea un DashboardLayout moderno y responsivo que incluya:

    Un Sidebar (barra lateral) con enlaces a: Dashboard, Inventario (Entradas/Salidas), Productos, y Configuración.

    Un Topbar (barra superior) que muestre el usuario activo, un indicador de la "Tasa del Día", y botón de logout.

Salida esperada:
Entrega el código paso a paso. Primero el SQL, luego la estructura de carpetas y configuración base, y finalmente los componentes del Layout. Explica brevemente cómo esta estructura facilitará la integración del bot de Telegram en el futuro. Detente al terminar la Fase 1 para recibir feedback."

## Prompt 4 (Delegación a Cursor)
**Fecha:** 2026-08-12  
**Agente:** Antigravity (principal)  
**Delegado a Cursor:** Sí — generó `cursor_tasks.md`  
**Prompt Original:** "Quisiera que hiceras un archivo especifico con tareas menores que se le pueden delegar a cursor"

## Prompt 5 (Ejecución de cursor_tasks.md)
**Fecha:** 2026-08-12  
**Agente:** Antigravity (principal) — tarea definida en `cursor_tasks.md`  
**Delegado a Cursor:** Sí — ejecución directa  
**Prompt Original:** "@cursor_tasks.md Realiza las tareas asignadas , sigue las reglas del proyecto y asegurate de no dañar nada"

## Prompt 6 (Tema Claro y Evitar AI Slop)
**Fecha:** 2026-08-12  
**Agente:** Antigravity (principal)  
**Delegado a Cursor:** Pendiente / según delegación  
**Prompt Original:** "La app esta solo en modo oscuro cuando es algo que no te dije que hicieras, parece mucho ia"

## Prompt 7 (Renombrar a Invoficlib)
**Fecha:** 2026-08-12  
**Agente:** Antigravity (principal)  
**Delegado a Cursor:** Pendiente / según delegación  
**Prompt Original:** "Y no pongas girasol , pon invoficlib"

## Prompt 8 (Diseño Adaptativo Móvil)
**Fecha:** 2026-08-12  
**Agente:** Antigravity (principal)  
**Delegado a Cursor:** Pendiente / según delegación  
**Prompt Original:** "Aparte de acordarte que la app tambien debe servir en dispositivos moviles por lo qie debe tener una interfaz adaptativa y sencilla de entender"

## Prompt 9 (Registro de Prompts en Historial)
**Fecha:** 2026-08-12  
**Agente:** Antigravity (principal)  
**Delegado a Cursor:** Sí — mantener historial actualizado  
**Prompt Original:** "Agrega aparte cada prompt a @prompts_history.md"

## Prompt 10 (Canal de Comunicación con Cursor)
**Fecha:** 2026-08-12  
**Agente:** Antigravity (principal)  
**Delegado a Cursor:** Sí — usar archivo de comunicación cuando exista  
**Prompt Original:** "Delega tareas a cursor como optimizar ciertos procesos y buscar ideas esteticas puedes hacer un archivo solo para tener comunicacion con el"

## Prompt 11 (Jerarquía de Agentes)
**Fecha:** 2026-08-12  
**Agente:** Antigravity (principal) — directriz para Cursor  
**Delegado a Cursor:** Sí — adoptar rol secundario  
**Prompt Original:** "Estas trabajando en conjunto con antigravity siendo el el agente principal y tu el secundario por lo que tu debes ver esos prompts como los de el"

## Prompt 12 (Solo Tareas Delegadas)
**Fecha:** 2026-08-12  
**Agente:** Antigravity (principal) — directriz para Cursor  
**Delegado a Cursor:** Sí — confirmar alcance de trabajo  
**Prompt Original:** "tu vas a hacer tareas que el te delegue"

---

## Registro de Cambios (por prompt)

*Solo trabajo ejecutado por Cursor (secundario). Antigravity documenta sus propios cambios en el flujo principal.*

### Prompt 5 — Ejecución de cursor_tasks.md (delegado por Antigravity)
**Agente ejecutor:** Cursor (secundario)  
**Archivos creados/modificados:**
- `app/(dashboard)/inventario/page.tsx` — Vista mock de control de inventario
- `app/(dashboard)/productos/page.tsx` — Catálogo mock en grid
- `app/(dashboard)/configuracion/page.tsx` — Configuración mock (tasa USD/VES y perfil)
- `.env.local.example` — Plantilla de variables Supabase
- `components/providers/auth-provider.tsx` — AuthProvider mock con `useAuth`
- `components/ui/button.tsx`, `card.tsx`, `badge.tsx` — Componentes UI reutilizables
- `app/layout.tsx` — Integración de AuthProvider
- `components/dashboard/topbar.tsx` — Consumo de `useAuth` para perfil y logout

### Prompt 9 + 11 — Documentación de roles y historial
**Agente ejecutor:** Cursor (secundario)  
**Archivos creados/modificados:**
- `prompts_history.md` — Estructura con agente principal/secundario y prompts separados del registro de cambios
- `agent.md` — Sección de roles Antigravity (principal) / Cursor (secundario)
- `project_description.md` — Roles principal/secundario explícitos

### Prompt 12 — Confirmación de alcance (solo delegación)
**Agente ejecutor:** Cursor (secundario)  
**Archivos creados/modificados:**
- `agent.md` — Regla explícita: Cursor solo actúa bajo delegación de Antigravity

### cursor_communication.md — Tareas 1–4 (delegado por Antigravity)
**Agente ejecutor:** Cursor (secundario)  
**Archivos creados/modificados:**
- `components/dashboard/topbar.tsx` — Hamburger móvil, `onMenuToggle`, estilos semánticos
- `app/layout.tsx` — Metadata Invoficlib, body semántico
- `app/(dashboard)/page.tsx` — Rebranding + Card/Badge + grids adaptativas
- `app/(dashboard)/inventario/page.tsx` — Estilos semánticos, tabla responsive
- `app/(dashboard)/productos/page.tsx` — Estilos semánticos, grids adaptativas
- `app/(dashboard)/configuracion/page.tsx` — Estilos semánticos, inputs unificados
- `cursor_communication.md` — Reporte de completación

## Prompt 13 (Servidor en vivo)
**Fecha:** 2026-08-13  
**Agente:** Antigravity (principal)  
**Prompt Original:** "Abre la app en un server en vivo"

## Prompt 14 (Soporte Modo Claro)
**Fecha:** 2026-08-13  
**Agente:** Antigravity (principal)  
**Prompt Original:** "Y falta el modo claro aun"

## Prompt 15 (Análisis de Listas Desplegables del DOCX)
**Fecha:** 2026-08-13  
**Agente:** Antigravity (principal)  
**Prompt Original:** "C:\Users\user\Desktop\video proyectos\Invoficlib proyects\Funciones mas utilizadas a replicar.docx Analiza laslistas desplegables que salen al tocar cada cosa"

## Prompt 16 (Estética Apple Minimalista)
**Fecha:** 2026-08-13  
**Agente:** Antigravity (principal)  
**Prompt Original:** "Quisiera que se viera el modo claro con un estilo minimalista al estilo apple"

## Prompt 17 (Creación de Proyecto en Stitch)
**Fecha:** 2026-08-13  
**Agente:** Antigravity (principal)  
**Prompt Original:** "crea un proyecto en stitch para que te ayude a diseñar"

## Prompt 19 (Optimización de tokens, inspiración Stitch y delegación a Cursor / OpenCode)
**Fecha:** 2026-08-13  
**Agente:** Antigravity (principal)  
**Prompt Original:** "Recuerda que era para basarte asi que si gasta muchos tokens el mcp solo toma inspiracion Y delega tareas a cursor y si son muy basicas a opencode"

## Prompt 20 (Arquitectura de Notas, Devoluciones, Gastos y Módulos POS)
**Fecha:** 2026-08-13  
**Agente:** Antigravity (principal)  
**Prompt Original:** "Rol: Eres un Senior Full-Stack Developer y Arquitecto de Software trabajando en el proyecto Invoficlib (Stack: React 18, Vite, Next.js App Router, Tailwind CSS, Supabase)... Parte A: Entrega el código SQL completo con las tablas de notas, devoluciones y los Triggers."

## Prompt 21 (Subdivisión de tareas a Cursor para la Fase 2)
**Fecha:** 2026-08-13  
**Agente:** Antigravity (principal)  
**Prompt Original:** "subdivide tareas a cursor"

## Prompt 22 (Archivos primarios de análisis para OpenCode)
**Fecha:** 2026-08-13  
**Agente:** Antigravity (principal)  
**Prompt Original:** "Que archivos debe analizar opencode de manera primaria"

## Prompt 24 (Optimización de Inventario, filtros y acceso rápido en Sidebar)
**Fecha:** 2026-08-14  
**Agente:** Antigravity (principal)  
**Prompt Original:** "Quisiera que en inventario se viera un poco mas grande la barra de busqueda, filtros de busqueda como en la imagen,esas dos barras de ali las veo necesarias igual,arregles el error de la segunda imagen, Quisiera que aparte de tener alli el acceso al historial de movimientos Que tambien sea accesible desde la barra lateral cuando se despliega inventario.Ademas quiero que quites el texto resaltado que esta en la tercera imagen ya que parece mucho ia slop"

## Prompt 25 (Lógica de Promociones, Devoluciones libro por libro y alerta de stock)
**Fecha:** 2026-08-14  
**Agente:** Antigravity (principal)  
**Prompt Original:** "Tienes mal programada la logica de las promociones uno debe poder ingresar a la nota y las devoluciones normalmente son parte de los libros no todos uno debe poder entrar en a nota y elegir que libro de la nota y que cantidad se devuelve al inventario., Aparte de preguntar antes de emitir una nota por si no hay stock suficiente como un mensaje advirtiendo que no hay stock y si se desea proseguir. Y recordar que las promociones no te ingresan dinero debido a que son como un "regalo" hacia al profesor o mas como un pacto de que si le gusta se lo queda para que despues eso nos traiga beneficios mas adelante."

## Prompt 26 (Reemplazo del sistema Fina: Prevención de bugs de conteo, View stock_actual y Nota Imprimible)
**Fecha:** 2026-08-14  
**Agente:** Antigravity (principal)  
**Prompt Original:** "Vamos a reemplazar el sistema de facturación heredado (Fina). El sistema viejo tenía un bug crítico y un diseño deficiente. Nuestro objetivo es garantizar que la nueva lógica matemática sea impecable y que el diseño de las "Notas" para imprimir sea profesional, moderno y coherente con la UI de la app. 1. Prevención del Bug de Cálculo de Unidades: usar estrictamente reduce sumando cantidades. 2. Refactorización del Módulo de Inventario (View stock_actual). 3. Componente PrintableNota moderno."

## Prompt 27 (Sincronización Automática de Tasas BCV Bimoneda USD/EUR y Skeletons de Navegación)
**Fecha:** 2026-08-14  
**Agente:** Antigravity (principal)  
**Prompt Original:** "Comienza la migración SQL y la integración de este sistema de tasas... No seria mejor que se sincronizara sola la tasa?"

## Prompt 28 (Tipografía Inter + JetBrains Mono y Mejora de Contraste)
**Fecha:** 2026-08-14  
**Agente:** Antigravity (principal)  
**Prompt Original:** "Quisiera que usaras una tipografia un poco mas legible debido a que se pierde un poco con el fondo los resaltados"

## Prompt 29 (Conexión y Lectura de Tareas de Notion vía MCP)
**Fecha:** 2026-08-15  
**Agente:** Antigravity (principal)  
**Prompt Original:** "Ahora puedes leer tareas de notion ya que coecte el mcp es cierto? https://app.notion.com/p/Tareas-semanales-ef0053ab737283b0a86a01b7cbd73cb0?source=copy_link"

## Prompt 31 (Ejecución de Suite de Tareas de Notion: Pedidos, Inventario y Micro-Animaciones)
**Fecha:** 2026-08-15  
**Agente:** Antigravity (principal)  
**Prompt Original:** "Revisa todas las tareas que estan en notion / Hazlo todo"

---

## Registro de Cambios (por prompt)

### Prompt 31 — Suite Completa de Tareas de Notion (2026-08-15)
**Agente ejecutor:** Antigravity (principal)  
**Archivos creados/modificados:**
- `app/(dashboard)/pedidos/pedidos-client.tsx` — Visualización de hora exacta y fecha en cada pedido, buscador universal en tiempo real, filtro de fecha con mini-calendario integrado (Hoy, Esta Semana, Selector de Fecha) y modal de anulación con reversión de inventario para Administradores.
- `lib/actions/notas.ts` — Implementada `anularNotaCompleta` con auditoría contable y reversión estricta de stock al Ledger (`movimientos_inventario`).
- `app/(dashboard)/inventario/inventario-client.tsx` — Flujo ágil para creación de múltiples productos con el botón *"Guardar y registrar otro"*, auto-incremento inteligente del SKU sugerido (`LIB-001`, `LIB-002`...) y notificaciones pop-in de éxito.
- `components/ui/button.tsx` — Jerarquía visual estricta ampliada (`primary`, `secondary`, `outline`, `ghost`, `danger`) con tamaños responsivos y micro-interacciones `active:scale-[0.98]`.
- `components/ui/badge.tsx` — Nuevas variantes semánticas (`default`, `warning`, `info`, `outline`, `disponible`).
- `components/ui/drawer.tsx` — Soporte para diferentes tamaños (`sm`, `md`, `lg`, `xl`).
- `app/globals.css` — Micro-animaciones añadidas (`.animate-pop-in`, `.animate-pulse-subtle`, `.card-interactive` con elevación Apple).
- `types/database.types.ts` — Sincronización de esquema (`tasa`, `moneda` y relaciones relacionales de Supabase).

### Prompt 30 — Auditoría del Código y Conexión de Datos Vivos (2026-08-15)
**Agente ejecutor:** Antigravity (principal)  
**Archivos creados/modificados:**
- `app/(dashboard)/vender/vender-client.tsx` — Eliminados `ErrorMessage` y `TASA_FALLBACK` no utilizados.
- `lib/actions/cuentas.ts` — Eliminada la declaración redundante de `getTasaVigente()`.
- `lib/mock/operaciones.ts` — Eliminado archivo obsoleto con datos estáticos de prueba.
- `app/(dashboard)/page.tsx` — Conectado el Dashboard a datos vivos del Ledger de Supabase (`getProductosConStock` y `getMovimientos`), calculando métricas, alertas de stock mínimo y tabla de últimos movimientos en tiempo real.
- `prompts_history.md` — Actualización integral del historial de prompts.

### Prompt 29 — Integración con Notion MCP (2026-08-15)
**Agente ejecutor:** Antigravity (principal)  
**Archivos creados/modificados:**
- Consulta e integración mediante el servidor `notion-mcp-server` de la lista de tareas semanales compartida por el usuario.

### Prompt 28 — Tipografía de Alto Rendimiento y Contraste Visual (2026-08-14)
**Agente ejecutor:** Antigravity (principal)  
**Archivos creados/modificados:**
- `app/layout.tsx` — Migración a fuentes de Google `Inter` para texto general y `JetBrains Mono` para valores numéricos y tablas.
- `app/globals.css` — Ajustes de contraste reforzado (`#111111` / `#515154` en light, `#f1f5f9` / `#a8b8cc` en dark), `text-rendering: optimizeLegibility`, `font-feature-settings` OpenType y kerning optimizado.

### Prompt 27 — Sincronización Automática de Tasas BCV Bimoneda USD/EUR (2026-08-14)
**Agente ejecutor:** Antigravity (principal)  
**Archivos creados/modificados:**
- `supabase/migration_tasas_bcv.sql` — Migración SQL para tabla `tasas_cambio` con soporte de bimoneda (`moneda` USD/EUR), constraints y políticas RLS.
- `app/api/cron/sync-tasas/route.ts` — Endpoint de sincronización automática contra la API oficial del BCV (`ve.dolarapi.com`).
- `components/providers/tasas-provider.tsx` — Proveedor global reactivo con auto-sync en segundo plano y suscripción a Supabase Realtime.
- `app/(dashboard)/loading.tsx` — Pantalla de transición inmediata tipo Skeleton para eliminar sensación de lentitud al cambiar de ruta.

### Prompt 26 — Reemplazo del Sistema Fina y Nota Imprimible (2026-08-14)
**Agente ejecutor:** Antigravity (principal)  
**Archivos creados/modificados:**
- `components/PrintableNota.tsx` — Componente moderno de notas fiscales/comprobantes para impresión con cálculo estricto de unidades físicas mediante `reduce`.
- `lib/actions/productos.ts` — Soporte para consulta directa de la vista `stock_actual`.

### Prompt 25 — Gestión Avanzada de Promociones y Devoluciones (2026-08-14)
**Agente ejecutor:** Antigravity (principal)  
**Archivos creados/modificados:**
- `app/(dashboard)/promociones/page.tsx` — Interfaz de promociones con devolución libro por libro hacia inventario y lógica de muestras obsequiadas de cortesía.
- `app/(dashboard)/vender/vender-client.tsx` — Modal de advertencia antes de emitir notas si el producto no cuenta con stock suficiente.

### Prompt 24 — Barra de Búsqueda y Navegación Mejorada de Inventario (2026-08-14)
**Agente ejecutor:** Antigravity (principal)  
**Archivos creados/modificados:**
- `app/(dashboard)/inventario/inventario-client.tsx` — Barra de búsqueda ampliada, filtros por estado y stock, y eliminación de textos superfluos.
- `components/dashboard/sidebar.tsx` — Acceso directo al Historial de Movimientos desplegable desde el submenú de Inventario.

### Prompt 23 — Instrucciones de despliegue en Supabase SQL (2026-08-13)
**Agente ejecutor:** Antigravity (principal)  
**Archivos creados/modificados:**
- `prompts_history.md` — Registro del Prompt 23.

### Prompt 22 — Definición de archivos de entrada para OpenCode (2026-08-13)
**Agente ejecutor:** Antigravity (principal)  
**Archivos creados/modificados:**
- `prompts_history.md` — Registro del Prompt 22.

### cursor_communication.md — Fase 2 Módulos Operativos (delegado por Antigravity, 2026-08-13)
**Agente ejecutor:** Cursor (secundario)  
**Archivos creados/modificados:**
- `app/(dashboard)/vender/page.tsx` — Punto de venta bimoneda con carrito y emisión mock
- `app/(dashboard)/pedidos/page.tsx` — Tabla de notas, drawer de detalle, modal de devolución
- `app/(dashboard)/gastos/page.tsx` — Métricas, tabs, modal de agregar gasto
- `app/(dashboard)/cuentas/page.tsx` — Resumen financiero Bento con desglose de rentabilidad
- `components/ui/drawer.tsx`, `modal.tsx`, `tabs.tsx` — Componentes compartidos
- `components/ui/badge.tsx` — Variantes `pagada`, `parcial`, `anulada`, `pagado`, `por_pagar`
- `lib/mock/operaciones.ts`, `lib/format.ts` — Datos mock y utilidades de formato
- `cursor_communication.md` — Tareas marcadas + reporte de completación

### Prompt 21 — Subdivisión y asignación de tareas a Cursor (2026-08-13)
**Agente ejecutor:** Antigravity (principal)  
**Archivos creados/modificados:**
- `cursor_communication.md` — Subdivisión estructurada de las 4 tareas clave para Cursor (Punto de Venta bimoneda, Notas y Devoluciones Dinámicas, Módulo de Gastos y Resumen Financiero).
- `prompts_history.md` — Registro del Prompt 21.

### Prompt 20 — Parte A: Modelo SQL de Notas, Devoluciones y Triggers Ledger (2026-08-13)
**Agente ejecutor:** Antigravity (principal)  
**Archivos creados/modificados:**
- `supabase/schema_notas_devoluciones.sql` — Esquema relacional completo para `clientes`, `notas`, `detalles_nota`, `devoluciones`, `gastos`, con triggers automáticos PL/pgSQL para alimentar el Ledger de `movimientos_inventario` y recalcular el saldo de las notas al efectuar devoluciones.
- `types/database.types.ts` — Definición estricta en TypeScript de todas las nuevas entidades de Supabase.
- `prompts_history.md` — Registro del Prompt 20.

### Prompt 19 — Jerarquía tripartita y optimización de tokens (2026-08-13)
**Agente ejecutor:** Antigravity (principal)  
**Archivos creados/modificados:**
- `agent.md` — Inclusión formal de **OpenCode** como agente terciario (tareas auxiliares/básicas), **Cursor** como secundario (desarrollo de UI delegado) y **Antigravity** como principal (arquitectura y toma de inspiración Stitch con optimización de tokens).
- `opencode_tasks.md` — Archivo creado para la asignación de tareas mecánicas a OpenCode.
- `prompts_history.md` — Registro del Prompt 19.

### Prompts 14–18 — Implementación de Estilo Apple Minimalista y Navegación Stitch (2026-08-13)
**Agente ejecutor:** Antigravity (principal)  
**Archivos creados/modificados:**
- `app/globals.css` — Tokens semánticos Apple Minimal (fondos `#f5f5f7`, tarjetas `#ffffff`, tipografía `#1d1d1f`, alto contraste y legibilidad total en modo claro y oscuro).
- `components/providers/theme-provider.tsx` — Proveedor de temas con `next-themes`.
- `components/ui/theme-toggle.tsx` — Switch de cambio instantáneo de tema Claro/Oscuro en el Topbar.
- `components/dashboard/sidebar.tsx` — Reestructuración completa con menús desplegables tipo acordeón multinivel (Inventario -> Registros -> Entradas/Salidas, Pedidos, Cuentas, Gastos, Resumen Financiero) según el documento de requerimientos.
- `components/dashboard/topbar.tsx` — Píldora de tasa BCV estilo Apple y contrastes nítidos.
- `components/ui/card.tsx` — Esquinas redondeadas `rounded-[20px]` con sombras difuminadas suaves de 20px.
- `components/ui/button.tsx` — Variantes modernas y sobrias de Apple.
- `app/(dashboard)/layout.tsx`, `page.tsx`, `inventario/page.tsx`, `productos/page.tsx`, `configuracion/page.tsx` — Refactorización con el nuevo sistema de tokens para máxima legibilidad.


