# Descripción del Proyecto: Invoficlib

Este proyecto está configurado para desarrollarse utilizando un esquema colaborativo con agentes de Inteligencia Artificial (**Antigravity** como agente **principal** y **Cursor** como agente **secundario**). El objetivo principal es mantener una **alta eficiencia** y un **uso minimizado de tokens**, basándose en una documentación sólida de todos los cambios, directrices estéticas e historial de desarrollo.

## Roles de los Agentes

- **Antigravity (principal):** Recibe los prompts del usuario, define arquitectura, lógica de negocio y delega tareas menores.
- **Cursor (secundario):** Ejecuta únicamente lo delegado (`cursor_tasks.md`, comunicaciones de Antigravity) sin alterar decisiones del agente principal.

Los prompts registrados en `prompts_history.md` pertenecen al flujo de **Antigravity**; Cursor los usa como contexto compartido.

## Arquitectura de Configuración y Documentación
Los siguientes archivos guían el comportamiento de los agentes durante el ciclo de desarrollo:

- `agent.md`: Reglas operativas que ambos agentes (Antigravity y Cursor) deben respetar (basado en coherencia, reutilización, y buena documentación).
- `design.md`: Sistema de diseño detallado para garantizar una apariencia visual Premium, uso de buenas prácticas UI/UX e implementación de SEO.
- `prompts_history.md`: Registro íntegro de las instrucciones (prompts) pasadas al sistema para mantener el contexto global eficientemente.
- *Nota:* Cualquier cambio de código deberá ser documentado detalladamente por el agente antes de darse por completado, actualizando o referenciando los archivos modificados.

---

## Instrucciones para Control de Versiones (GitHub)

Para subir cualquier cambio realizado directamente a tu repositorio de GitHub, usa los siguientes comandos en la terminal desde la raíz del proyecto.

1. **Revisar el estado actual:**
   ```bash
   git status
   ```

2. **Añadir todos los cambios documentados al staging area:**
   ```bash
   git add .
   ```

3. **Crear el commit:** (Usa un mensaje conciso pero descriptivo siguiendo convenciones semánticas)
   ```bash
   git commit -m "feat: [Descripción clara de lo añadido o modificado en base a las reglas de agentes]"
   ```
   *Ejemplos de prefijos: `feat:` para nuevas características, `fix:` para correcciones de errores, `docs:` para cambios en documentación.*

4. **Subir los cambios al repositorio:**
   ```bash
   git push origin main
   ```
   *(Si estás trabajando en otra rama, reemplaza `main` por el nombre de tu rama correspondiente).*
