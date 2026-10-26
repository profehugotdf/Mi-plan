# Mi plan / Plan de Ciclos (repo Mi-plan)

> Archivo de instrucciones para Claude (y para cualquiera que trabaje en este repo). Se lee solo al arrancar una conversación con este repo. Si algo de acá deja de ser cierto, actualizalo en el mismo cambio.


Periodización de natación, bici, carrera, kayak y fuerza a partir de la planilla de Hugo:
- curva EXPONDIST, % de carga y zonas;
- ciclos encadenados por evento;
- calendario, semana con horarios y "Plan de hoy" con semáforo de cumplimiento;
- proyección de la Forma y "¿Cómo estoy hoy?" (HRV, TSB y nutrición);
- umbrales y perfil; importar .FIT y .TCX de Garmin;
- sesiones que manda Rumbo.

Lo comparten colegas, su hermano y su primo: la terminología de entrenamiento tiene que ser correcta (periodización, no "planificación"). Hugo prefiere la periodización inversa.

## Lo propio de este repo

- No tiene número de versión visible. Si se agrega, que sea con el mismo formato que Bici o Kayak.
- **Lee** las claves de las otras apps: `correr_sesiones`, `bici_sesiones`, `kayak_sesiones`, `fuerza_sesiones`, `rumbo_sesiones`. Cada una tiene un formato distinto: normalizar al leer, sin asumir.
  - Correr guarda `fecha` al **terminar**, no al empezar; para el inicio, usar `inicioISO` si existe.
  - `fuerza_sesiones.fecha` es solo `AAAA-MM-DD`: no pasarla por funciones de fecha y hora.
- **Escribe**: `plan_ciclos_v1`, `entrenamiento_umbrales`, `entrenamiento_perfil`, `entrenamiento_hrv_registro`, `entrenamiento_proximo_evento`, `entrenamiento_plan_hoy`.
- Sesiones de Rumbo: `importarDesdeRumbo()`, `tssRumbo()` y `rumboDuplicada()` / `limpiarDuplicadosRumbo()`. No se cuentan dos veces las salidas que también grabó una app dedicada.

## Quién y cómo trabajamos

- Usuario: Hugo (profe de educación física y entrenador de triatlón en Ushuaia). Escribe en castellano rioplatense; la app, los textos y los comentarios del código también van en rioplatense.
- Prueba todo en el teléfono: Brave para Android (Samsung S26 Ultra). Manda capturas o videos de pantalla. En Android no hay herramientas de desarrollador: cualquier diagnóstico tiene que estar **adentro de la app** (una tarjeta o un botón de "copiar").
- Si Hugo pega código o un prompt que viene de otra conversación, **primero mirá cómo está el repo ahora** y después actuá. No lo apliques a ciegas.
- **GitHub es la única fuente de verdad.** Arrancá siempre desde lo que está en `main`, nunca desde una copia vieja de otra conversación. Ya pasó: dos versiones de Mi plan se separaron y hubo que unirlas a mano.

## Filosofía de las apps (todas iguales)

- **Un solo `index.html`** con el CSS y el JS adentro. Sin dependencias externas ni build. Funciona sin conexión.
- Hosting: GitHub Pages en `profehugotdf.github.io/<repo>/`. Lo que se sube a `main` se publica solo, en un minuto.
- Pensada para el celular: botones grandes, tolerante a pantallas apagadas y a cortes de señal.
- **No perder datos nunca.** Si guardar falla, que se vea en pantalla, y la sesión no se descarta. Nada de `catch(e){}` mudos en lo que guarda.
- Cambios aditivos: no tocar lo que ya anda (poses, fórmulas calibradas, claves de almacenamiento) salvo que el pedido sea justo eso.

## Cómo entregar un cambio

1. Leer el código que se va a tocar (y lo que lo usa) antes de editar.
2. Si es un bug, primero reproducirlo con una prueba (Node con el pedazo de JS, o Playwright con la página). Después arreglarlo y ver que la prueba pase.
3. Chequear la sintaxis de cada `<script>` (por ejemplo con `node -e "new Function(código)"` o `node --check` sobre el JS extraído).
4. Si la app muestra un número de versión, subirlo y anotar en el comentario de historial **qué se cambió y por qué** (incluido lo que dijo o mostró Hugo).
5. Commit en castellano, directo a `main`, y avisarle a Hugo en pocas líneas qué cambió y cómo probarlo en el teléfono.

## Ecosistema compartido (mismo origen profehugotdf.github.io)

Todas las apps comparten `localStorage` (unos 5 MB en total para todas) y pueden leer las claves de las otras.

- `entrenamiento_forma_registro`: `[{fecha:'AAAA-MM-DD', deporte, tss, id, calorias?}]`. Es la Forma combinada (CTL/ATL/TSB con EWMA). Cada app hace upsert **por id** y **nunca** pisa las entradas de otra. La fecha es **local**: no usar `toISOString().slice(0,10)`, porque corre el día (bug que ya pasó).
- `entrenamiento_umbrales`: `{ritmoUmbralCarreraSegKm, pulsoUmbralCarrera, ftpBici, pulsoUmbralBici, pulsoUmbralKayak, historial}`. Se leen como respaldo cuando la app no tiene uno propio. Al escribir, leer el objeto entero y tocar solo lo propio.
- `entrenamiento_perfil`: `{pesoKg, fechaNacimiento, sexo, historialPeso…}`. Mismo criterio que umbrales.
- Resúmenes que lee Mi plan: `correr_sesiones`, `bici_sesiones`, `kayak_sesiones`, `fuerza_sesiones`, `rumbo_sesiones`. Lo pesado (muestras, tracks) va a IndexedDB, y en localStorage queda un resumen sin muestras (`_resumen:true`) con la misma clave.
- TSS:
  - Correr y Kayak: `100 × horas × (valor/umbral)²`.
  - Bici: potencia normalizada/FTP.
  - Fuerza: sRPE de Foster (`RPE × min / 6`).
  - Rumbo: NGP con pendiente para correr, potencia estimada/FTP para bici.
  - Una salida grabada por Rumbo **y** por la app dedicada cuenta una sola vez, la de la dedicada.
- Rumbo abre las otras apps con `#rumbo=` en el link:
  - Bici y Kayak: `z` + base64url de JSON comprimido con deflate-raw. Bici recibe gpx, escenas, horizonte, cerros y suelo; Kayak recibe `app:'kayak'`, puntos, orillas y perfil, horizonte y cerros.
  - Mi plan: base64 de `{v,s:[sesiones]}`, sin comprimir.
- Hay una app de Backup (`profehugotdf.github.io`) que exporta y restaura localStorage e IndexedDB de todas.
