# RECEPY · procedencia visual

Esta aplicación reutiliza el logo, la imagen principal y el clip de cocina preparados para la primera versión web de RECEPY. No se generaron nuevas imágenes para esta migración. Los originales de diseño permanecen en el proyecto web anterior y no se duplican en este paquete.

## `assets/recepy-logo.png`

Logo transparente con la palabra exacta **RECEPY**, creado con la herramienta de generación de imágenes integrada. Se reutiliza en formato PNG para React Native.

Prompt original:

> Use case: logo-brand. Asset type: web app brand wordmark, horizontal logo. Primary request: Create one beautifully crafted sculptural logo with the exact uppercase word RECEPY (R E C E P Y). Six letters, spelled exactly RECEPY. Style: playful puffy inflated soft clay and balloon hybrid lettering, chunky rounded letterforms, glossy warm vermilion red #ed3b2e with soft specular highlights. Every letter feels tactile and a little bouncy, coherent shape language. Front-facing readable horizontal wordmark. Compact spacing, rounded bowls, clear recognizable lettering. Composition: centered wordmark that occupies almost all width in a wide transparent canvas with small even margins. Actual transparent background, no environment. Soft studio lighting from top left, subtle self-shadow only. No tagline, no small print, no symbols, no border, no watermark.

## `assets/rigatoni.webp`

Imagen de comida creada para el prototipo con la herramienta de generación de imágenes integrada. Es una imagen de demostración y no una fotografía de la receta de un creador real. El WebP reutiliza la composición del original con compresión de calidad 87 para una carga más ligera.

Prompt original:

> Use case: photorealistic-natural. Asset type: main portrait food photograph for a recipe social feed. Primary request: An extremely appetizing close-up portrait photo, 4:5 aspect ratio, of rigatoni in roasted red tomato sauce with a whole fresh burrata on top pulled slightly open, fresh basil leaves and a drizzle of olive oil, on a rustic off-white ceramic plate on a deep warm brown kitchen table. Premium casual food photography, natural side daylight, tactile detailed rustic sauce, visible ridges of actual rigatoni pasta, creamy torn burrata texture. Food fills 80% of the frame; photograph from a slightly elevated three-quarter angle, focus on burrata and front rigatoni, softly blurred warm kitchen background. Rich red tomato, creamy white burrata, fresh green basil. No text, no hands, no utensils obscuring the food, no illustration, no logos, no watermark.

## `assets/cooking.mp4`

Clip real de penne vertidos en una sartén con salsa cremosa. Formato H.264, 1280 × 720, audio AAC y duración aproximada de diez segundos. El recurso fue descargado y revisado durante la primera versión.

- Autor: **S R B S C A P E / Pexels**.
- Fuente: [Pasta poured into the sauce](https://www.pexels.com/video/pasta-poured-into-the-sauce-15513721/).
- Licencia: [Pexels](https://www.pexels.com/license/), que permite el uso en sitios y aplicaciones.

## Fotografías y avatares remotos

Las referencias específicas de las demás fotografías de comida y avatares se conservan en `src/data/recipes.ts`. Son imágenes de demostración servidas desde Unsplash; no implican que las personas fotografiadas sean los creadores ficticios de las recetas ni que exista respaldo de un restaurante real. Las fotos propias del usuario se eligen desde la galería y se conservan localmente.
