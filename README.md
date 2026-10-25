# RECEPY Astra · 2026

<img src="assets/recepy-logo.png" alt="RECEPY" width="220" />

Nueva implementación de RECEPY en 2026, independiente de [Recepy Legacy (2021)](https://github.com/own21m/recepy-legacy). Prototipo funcional para iOS, Android y web, con persistencia local y contenido social de demostración.

Aplicación de RECEPY con **React Native 0.88, Expo SDK 58 y React 19.3**. El tema se adapta al sistema: negro en modo oscuro y beige en modo claro. El logo conserva su identidad roja y los botones tienen extremos circulares. El feed móvil ocupa toda la pantalla, sin pestañas, filtros ni selector de cuadrícula; en la web de escritorio, la receta aparece junto a la publicación cuando hay espacio. El perfil está centrado y las pantallas usan textos directos. El mismo proyecto tiene una vista web local para desarrollar y revisar el diseño.

## Abrir en tu iPhone con Expo Go

1. Conecta el iPhone y esta computadora a la misma red local (el ordenador también puede usar Ethernet).
2. Abre Expo Go actualizado, con soporte para SDK 58. Si Expo solicita iniciar sesión, usa tu propia cuenta de Expo en la CLI y en Expo Go.
3. Inicia el servidor y escanea el QR que genera Expo CLI desde la cámara del iPhone; elige abrirlo en Expo Go.

La dirección local y el QR dependen de la red y se generan al iniciar el servidor. Conserva Metro en marcha mientras usas la aplicación en el teléfono.

## Iniciar el proyecto

Desde esta carpeta, con Node.js y pnpm disponibles:

```sh
git clone https://github.com/own21m/recepy-astra.git
cd recepy-astra
pnpm install
pnpm start
```

En Windows también puedes ejecutar:

```powershell
.\start-local.ps1
```

El script usa Node.js del sistema y, si no lo encuentra, intenta usar el runtime de Node incluido en Codex. Necesita que las dependencias ya estén instaladas. No abre otra ventana ni crea servicios del sistema. Para detener Metro, pulsa `Ctrl+C` en su terminal.

El comando directo equivalente es:

```sh
node node_modules/expo/bin/cli start --go --lan --port 8081
```

`metro.config.js` limita Metro a dos procesos de trabajo para reducir el consumo de memoria durante el desarrollo local con el navegador y Expo Go abiertos.

Para revisar la vista web local:

```sh
pnpm web
```

Si Metro ya está iniciado en el puerto 8081, conserva ese servidor y abre [http://localhost:8081](http://localhost:8081). No hace falta iniciar una segunda instancia. El script también admite `./start-local.ps1 -Web` para arrancar con la vista web.

Si necesitas volver a iniciar sesión en Expo CLI:

```sh
pnpm exec expo login
```

Introduce las credenciales solo en el flujo de Expo. No se han guardado credenciales en este proyecto. La cuenta de Expo sirve para abrir la vista de desarrollo; RECEPY todavía no tiene un sistema propio de cuentas.

## Menú y apariencia

En móvil, «Menú» mide 104 × 42 puntos. El propio botón se expande con animación hasta convertirse en la barra de navegación, sin dejar un segundo botón debajo. Mantiene las dos formas de navegar:

- **Tap:** toca «Menú» para transformarlo en la barra y luego toca el destino.
- **Mantener y deslizar:** mantén el dedo sobre «Menú», deslízalo hasta una sección sin levantarlo y suelta para abrirla. Soltar fuera de los destinos cancela la selección.

El icono de la sección actual permanece rojo. Tras cinco segundos sin actividad en la barra, esta vuelve a convertirse en «Menú»; las interacciones reinician ese tiempo y no se cierra durante un gesto sostenido. La navegación se oculta mientras scrolleas por el feed y vuelve como un botón al detenerte.

La apariencia es automática y sigue los cambios de tema del sistema. El modo claro usa superficies beige, no blancas; el oscuro mantiene el negro. Ambos conservan los acentos y botones principales rojos. Los botones de acción usan forma de cápsula o círculo; «Abrir receta», sobre el feed, mantiene un material rojo translúcido con efecto acrílico.

## Recetas y comentarios en el feed

En móvil, desliza hacia la izquierda sobre la publicación para abrir su receta. El panel entra desde la izquierda y se cierra con la X o arrastrándolo hacia la derecha. Los comentarios aparecen desde abajo y tienen una agarradera superior: arrástrala hacia abajo para cerrar el panel, además de poder usar la X.

Toca el avatar, nombre o cuerpo de un comentario para abrir el perfil de su autor. Cada comentario permite responder y dar o quitar un me gusta. Las respuestas y los likes se guardan en este dispositivo.

En la vista web, a partir de 1100 puntos de ancho, la publicación y la receta se muestran una al lado de la otra. La receta visible se actualiza al cambiar de publicación en el feed y conserva los controles de ingredientes, porciones y cocina.

## La receta es interactiva

En **Crear**, pega o escribe una receta y pulsa **Convertir receta**. El ejemplo incluido muestra un formato que funciona bien:

```text
Pasta de domingo
Porciones: 2
Tiempo: 25 minutos

Ingredientes:
200 g de pasta
2 tomates maduros
1 cucharada de aceite de oliva
Sal al gusto

Preparación:
1. Cuece la pasta durante 10 minutos.
2. Corta los tomates y cocínalos con el aceite durante 8 minutos.
3. Mezcla, ajusta la sal y sirve.
```

La conversión usa un **analizador determinista local**, sin enviar el texto a una IA. Detecta ingredientes, cantidades, unidades, porciones, pasos y tiempos escritos. Admite fracciones y decimales con coma. Cuando falta información o una cantidad es ambigua, muestra avisos para que puedas revisar el texto. No inventa una preparación.

La pantalla de revisión permite comprobar lo detectado y abrir la vista previa. Para publicar una receta local se necesita una foto propia o el ejemplo identificado, una receta completa y marcar que se revisó el resultado. El borrador se guarda mientras escribes.

Al cocinar puedes marcar ingredientes, ajustar porciones, seguir un paso cada vez y usar sus temporizadores. El avance y los datos de esta versión se conservan localmente. Los ingredientes «al gusto» y los intervalos no se convierten en cantidades exactas inventadas.

Los temporizadores guardan su hora de finalización y actualizan la cuenta al volver a la app. Esta versión no programa alarmas nativas ni avisos del sistema cuando la app está cerrada o en segundo plano.

## Qué incluye

- Feed móvil de pantalla completa con fotos y video, cabecera con degradado negro a transparente y botón rojo acrílico para abrir recetas.
- Vista web amplia con la receta al lado de la publicación y sincronizada con el feed.
- Botón «Menú» que se transforma en barra por tap o por mantener, deslizar y soltar; vuelve a contraerse tras cinco segundos sin actividad.
- Icono de la sección actual rojo y botones con extremos circulares.
- Receta con entrada lateral y cierre por gesto; comentarios con agarradera para cerrar hacia abajo.
- Perfiles accesibles desde los comentarios, respuestas y likes locales.
- Tema automático negro o beige según el sistema.
- Descubrimiento y perfiles de creadores centrados.
- Recetario, me gusta, comentarios y seguimiento de demostración.
- Perfil propio editable: nombre, usuario, presentación y foto elegida de la galería.
- Recetas de texto convertidas en ingredientes y pasos interactivos.
- Borradores, publicaciones, preferencias y progreso guardados en el dispositivo.
- Animaciones suaves, movimiento reducido y respuesta háptica compatible.

La interfaz usa Liquid Glass cuando la API está disponible en iOS 26 o posterior. Tiene comprobaciones de disponibilidad y una alternativa con desenfoque o superficies translúcidas para los demás casos. La apariencia puede variar entre Expo Go, iOS, Android y web.

## Datos y alcance de esta versión

Todo el trabajo de esta fase es **local**. No usa Sites de ChatGPT, MongoDB, Auth0 ni otro backend conectado. Las publicaciones no se suben a una red social real y no se sincronizan entre dispositivos. El feed y las cifras de creadores contienen datos de demostración; algunas fotografías y avatares remotos necesitan conexión a internet. Las fotos propias y el estado de la app se guardan localmente.

Los borradores de comentarios se conservan al visitar un perfil y volver al hilo durante la sesión. Consulta [ASSETS.md](ASSETS.md) para conocer la procedencia de los recursos visuales y sus referencias.

Los cambios recientes se verificaron en la vista web local, con TypeScript y con pruebas automatizadas. Se comprobaron el tap del menú y el gesto de mantener y arrastrar por sus destinos. Queda pendiente probar el gesto completo de mantener, deslizar y soltar en un iPhone físico; la vista web no sustituye esa comprobación ni la de permisos, respuesta háptica y materiales nativos.

## Verificación y desarrollo

```sh
pnpm typecheck
pnpm test
pnpm export:web
pnpm export:ios
```

Las comprobaciones recientes incluyen **TypeScript y 36 pruebas automatizadas**: 18 del analizador de recetas, 9 de geometría del menú, 3 de gestos de paneles y 6 de comentarios. La vista web local permite comprobar la navegación, las transiciones de paneles, los comentarios y la distribución adaptable. Durante el desarrollo se exportaron bundles para web e iOS; exportar un bundle no equivale a generar una app firmada ni a ejecutarla en un iPhone físico.

El analizador y sus pruebas están en `src/domain/recipeParser.ts` y `src/domain/recipeParser.test.ts`. La geometría del gesto y sus pruebas están en `src/domain/menuGesture.ts` y `src/domain/menuGesture.test.ts`. Los gestos de paneles y los comentarios también tienen pruebas en `src/domain`. La interfaz nativa está en `src/screens`; los botones y materiales compartidos están en `src/components/primitives.tsx`. Los datos sociales de muestra están en `src/data/recipes.ts`.
