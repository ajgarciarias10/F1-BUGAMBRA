# Instrucciones para generar el vídeo explicativo de instalación

Objetivo: un vídeo que explique a la gente de la liga cómo instalar F1 Bugambra en
el móvil, cubriendo **Android** y **iPhone/iPad**.

Hay dos caminos y conviene entender la diferencia antes de elegir:

| | NotebookLM (Video Overview) | Gemini |
|---|---|---|
| Qué hace | Convierte tus documentos en un vídeo narrado con diapositivas | Escribe el guion, o genera clips con Veo |
| Duración | Admite vídeos largos, de varios minutos | Los clips de Veo son de segundos |
| Mejor para | **El vídeo completo de instalación** | El guion, los textos y la locución |

**Recomendación: haz el vídeo en NotebookLM** (opción A) y usa Gemini solo si
quieres afinar el guion antes (opción C). Un vídeo de instalación necesita durar
varios minutos y mostrar pasos ordenados: eso es justo lo que hace NotebookLM y lo
que Veo no puede hacer.

---

## Opción A — NotebookLM (la recomendada)

### Paso 1. Crear el cuaderno

1. Entra en <https://notebooklm.google.com> con tu cuenta de Google.
2. Pulsa **Crear** / **New notebook**.
3. Añade como fuente el archivo **`docs/guia-instalacion-app.md`** de este
   repositorio. Puedes subirlo como archivo, o abrirlo, copiar todo el texto y
   pegarlo como fuente de texto.
4. Opcional pero recomendado: añade como segunda fuente **capturas de pantalla**
   del móvil con el menú de Chrome abierto y con el menú Compartir de Safari
   abierto. NotebookLM las usará en las diapositivas y el vídeo queda mucho más
   claro.

### Paso 2. Generar el vídeo

1. En el panel de **Studio**, elige **Video Overview** (Resumen en vídeo).
2. Pulsa en personalizar / **Customize** antes de generarlo.
3. Pega ahí el prompt del recuadro siguiente.
4. Genera. Tarda unos minutos.

### Prompt para pegar en NotebookLM

```
Haz un vídeo tutorial en español de España que explique, paso a paso, cómo
instalar la aplicación F1 Bugambra en el móvil. El público son los miembros de
una liga privada de F1 virtual: gente de todas las edades y con poca paciencia
para tecnicismos.

Estructura el vídeo exactamente en estas cinco partes:

1. INTRODUCCIÓN (unos 30 segundos). Qué es F1 Bugambra y qué se gana instalándola:
   icono propio, pantalla completa, arranque rápido. Deja claras desde el principio
   las tres cosas que más tranquilizan: es gratis, no hace falta Play Store ni App
   Store, y ocupa muy poco espacio.

2. ANDROID (unos 2 minutos). Los pasos con Chrome, en orden y numerados. Enseña
   primero el camino fácil (la tarjeta de aviso con el botón Instalar) y después el
   camino manual por el menú de los tres puntos, para quien no vea el aviso.
   Menciona el detalle de los accesos directos al mantener pulsado el icono.

3. IPHONE Y IPAD (unos 2 minutos). Los pasos con Safari. Insiste, y repítelo, en
   que en iPhone hay que usar Safari obligatoriamente, porque Chrome en iPhone no
   puede instalar aplicaciones web. Es el error más habitual.

4. CÓMO SABER QUE HA FUNCIONADO (unos 30 segundos). La señal es que ya no se ve la
   barra de direcciones del navegador.

5. PROBLEMAS FRECUENTES (1 minuto). Enlaces abiertos desde Instagram o WhatsApp que
   no dejan instalar, no encontrar la opción en iPhone, y cómo desinstalar.

Tono: cercano, directo y tranquilo, como quien le explica algo a un amigo por
teléfono. Sin jerga. Si aparece la palabra "PWA", explícala en la misma frase.

Ritmo: pausado. Es un tutorial y la gente va a ir siguiéndolo con el móvil en la
mano, así que deja aire entre paso y paso y repite el paso clave de cada sección.

Estilo visual: deportivo y limpio, con la identidad de la Fórmula 1: rojo, negro y
blanco, tipografía gruesa. Una idea por diapositiva. Los pasos, numerados y en
pantalla mientras se narran.

Duración objetivo: entre 5 y 7 minutos.
```

### Paso 3. Repasar antes de repartirlo

Comprueba estas tres cosas en el vídeo generado, que son donde más se equivoca:

- Que **no diga** que hay que descargarla de Play Store o App Store.
- Que deje claro que **en iPhone es obligatorio Safari**.
- Que la dirección web que se vea o se diga sea la real de la liga.

Después, descárgalo y compártelo por el grupo. Conviene acompañarlo del enlace
directo a la página de ayuda de la propia web (la sección «Instalar la app»), para
quien prefiera leer.

---

## Opción B — Gemini para clips cortos (Veo)

Sirve para una pieza corta de promoción, **no** para el tutorial completo: los
clips de Veo duran segundos y no encadenan pasos.

Prompt para Gemini:

```
Genera un clip vertical de 8 segundos, sin texto sobreimpreso, para anunciar que
la liga de F1 virtual F1 Bugambra ya se puede instalar como aplicación en el móvil.

Plano: una mano sostiene un teléfono en vertical. En la pantalla del teléfono
aparece un icono de aplicación negro con las letras "F1" en blanco, en cursiva
gruesa, y una barra roja debajo. El dedo pulsa el icono y la aplicación se abre a
pantalla completa.

Estilo: fotografía publicitaria de producto, luz lateral suave, fondo oscuro
desenfocado con un punto de luz roja. Cámara fija con un ligero acercamiento.
Estética de retransmisión deportiva: negro, rojo y blanco.
```

---

## Opción C — Gemini para escribir el guion antes

Si prefieres controlar el texto y grabar tú la voz, o pulir el guion antes de
llevarlo a NotebookLM:

```
Eres guionista de vídeos tutoriales. A partir del documento que te paso, escribe
el guion de un vídeo de entre 5 y 7 minutos que explique cómo instalar la
aplicación F1 Bugambra en Android y en iPhone.

Devuélvelo como una tabla con tres columnas: tiempo aproximado, lo que se ve en
pantalla, y la locución palabra por palabra.

Requisitos:
- Español de España, tono cercano y sin tecnicismos.
- Secciones: introducción, Android, iPhone y iPad, comprobación final y problemas
  frecuentes.
- La locución tiene que poder leerse en voz alta tal cual, sin tropezar.
- Marca con [PAUSA] los momentos en los que quien mira el vídeo debe parar para
  hacer el paso en su móvil.
- En la sección de iPhone, avisa dos veces de que hay que usar Safari.

[Pega aquí el contenido de docs/guia-instalacion-app.md]
```

Con el guion terminado, súbelo a NotebookLM como fuente adicional junto a la guía y
genera el vídeo con el prompt de la opción A.
