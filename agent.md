# Reglas Globales del Proyecto (Para Cursor y Antigravity)

Estas reglas dictan el comportamiento esperado de cualquier agente IA operando en este proyecto.

## Roles de los Agentes

| Agente | Rol | Responsabilidad |
|--------|-----|-----------------|
| **Antigravity** | Principal (Arquitecto) | Arquitectura general, lógica de negocio, decisiones de producto, SQL, integraciones y delegación de tareas. Toma inspiración de Stitch/MCP optimizando el consumo de tokens. |
| **Cursor** | Secundario (Desarrollador) | **Ejecuta tareas de desarrollo y refactorización que Antigravity le delegue** (componentes, lógica de UI, vistas intermedias). |
| **OpenCode** | Terciario (Auxiliar) | **Ejecuta tareas muy básicas y repetitivas** (corrección de formato, stubs simples, tareas mecánicas de bajo nivel). |

### Reglas de Operación y Delegación

1. **Uso Eficiente de Tokens (MCP / Stitch):** Antigravity utiliza Stitch/MCP primordialmente como fuente de inspiración visual y referencia de diseño, evitando llamadas pesadas o redundantes para preservar tokens.
2. **Delegación para Cursor:** Solo trabaja bajo delegación explícita en `cursor_communication.md` o `cursor_tasks.md`.
3. **Delegación para OpenCode:** Asignación de tareas puntuales, directas y mecánicas especificadas en `opencode_tasks.md` cuando corresponda.
4. **Contexto de Prompts:** Los prompts en `prompts_history.md` pertenecen al flujo de Antigravity; los agentes secundarios los usan como referencia de contexto.
5. **No dañar código existente:** Todo cambio debe mantener coherencia con los módulos existentes.

---

1. **Documentación:** Documenta todo el código que hagas de manera precisa.
2. **Coherencia:** Asegúrate de que lo que estás escribiendo tiene coherencia dentro de la estructura general del proyecto.
3. **Resolución de problemas:** Ofrece siempre soluciones concretas a los problemas en lugar de solo identificarlos.
4. **Registro de cambios:** Documenta los cambios realizados cada vez que modifiques o añadas características.
5. **Reutilización:** Usa de manera inteligente el código ya escrito, evitando la duplicidad innecesaria.
6. **Diseño Visual:** Genera imágenes si la situación de diseño lo amerita. Mantén un foco estricto en proveer una estética moderna y premium (como se especifica en `design.md`).
