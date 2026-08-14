# Reglas de Diseño y Estética (Design System)

Este proyecto sigue una estética moderna, premium y dinámica, orientada a ofrecer la mejor experiencia de usuario (UX) e interfaz de usuario (UI). Cualquier código visual o de interfaz de usuario debe regirse estrictamente por las siguientes normas.

## 1. Principios Core
- **Estética Rica y Premium:** El diseño debe impactar a primera vista. No se admiten diseños "simples", aburridos o genéricos (se evitarán MVP visualmente básicos).
- **Estilo Minimalista (Apple-like) para Modo Claro:** El modo claro debe usar fondos grises muy claros (`#f5f5f7`), tarjetas blancas puras (`#ffffff`), sombras extremadamente sutiles y difuminadas (`rgba(0,0,0,0.04)`), y bordes casi invisibles o inexistentes. Los bordes de las tarjetas deben ser muy redondeados (`rounded-2xl` o `20px`). El texto principal debe ser un gris carbón oscuro (`#1d1d1f`), nunca negro puro.
- **Colores:** Se prohíbe el uso de colores genéricos básicos (ej: red, blue, green). Se deben usar paletas de colores armoniosas, preferiblemente valores curados (ej: colores HSL bien ajustados, esquemas para modos oscuros elegantes o glassmorphism).
- **Tipografía:** Emplear fuentes modernas de alta legibilidad (ej: Inter, Roboto, Outfit desde Google Fonts) como estándar, anulando la tipografía por defecto del navegador.
- **Dinamismo e Interactividad:** La interfaz debe sentirse viva. Es obligatorio incorporar micro-interacciones (hover effects fluidos), transiciones CSS suaves y animaciones que enriquezcan la experiencia del usuario sin saturarla.

## 2. Tecnologías y Herramientas
- **Base Técnica:** HTML semántico y JavaScript para la lógica. Se puede usar Vanilla CSS para tener el control total de los estilos. Si el usuario pide explícitamente TailwindCSS, debe configurarse tras preguntar la versión deseada.
- **Frameworks:** Para aplicaciones web complejas, si se especifica, usar Next.js o Vite (instalación silenciosa/desatendida vía npx).
- **Generación Visual:** En ausencia de recursos gráficos (imágenes/assets), los agentes generarán de manera inteligente imágenes o assets temporales usando herramientas como `generate_image`, evitando el uso de placeholders antiestéticos.

## 3. Prácticas SEO a Implementar (Cuando aplique)
- Todo documento HTML generado debe tener sus etiquetas `<title>` descriptivas, meta descripciones y seguir una correcta jerarquía de encabezados (un único `<h1>`).
- El HTML debe ser semántico y todos los elementos interactivos deben contar con atributos `id` o `aria` consistentes.
