# Análisis de la web actual: F1 Bugambra

Cómo es hoy https://f1-bugambra.vercel.app/ y qué mejoraría (22-10-2026). Sale del código de `apps/web` y de capturas de la parte pública (`capturas-actuales/`); las pantallas con sesión no se han visto en vivo. Los mensajes para Gemini están en [brief-gemini.md](brief-gemini.md).

---

## Cómo es hoy la web

### Lo que se ve hoy en la web pública (capturas del 22-10-2026)

Identidad actual: fondo casi negro, rojo F1, titulares en mayúsculas gruesas, tarjetas con borde fino, fotos de piloto y carteles de escudería muy trabajados (los del Paddock). Problemas visibles:

1. **Móvil, cabecera de portada:** el texto «En portada · Split 3» se pinta encima de la etiqueta «Temporada en curso».
2. **La portada se repite en cada pestaña** (Clasificación, Equipos, Resultados, Paddock, TV) y ocupa toda la primera pantalla. Al tocar una pestaña no ves nada nuevo hasta desplazarte.
3. **Tres botones de estilos distintos** en la portada; el más llamativo es «Ver en vivo», en rojo, aunque el directo esté apagado.
4. **Próximo evento:** «15 · Italia» sin fecha, hora ni cuenta atrás; el 15 no se explica.
5. **Clasificación:**
   - El 1.º y el 3.º llevan el nombre en color, pero el 2.º no.
   - Algunos OVR van en naranja sin leyenda.
   - La diferencia con el líder («-3») es diminuta y gris.
   - En escritorio hay un hueco enorme entre el piloto y la escudería, que se lee muy apagada.
6. **Móvil, selector de temporada:** «Mundial» queda cortado y no se ve que se puede desplazar.
7. **Resultados:** solo el podio de las carreras disputadas; no aparecen las próximas.
8. **TV:** el reproductor de Twitch ocupa el sitio con un «is offline» en inglés y fondo blanco.
9. **Paddock:** las publicaciones son lo más vivo de la web, pero quedan al final de una pestaña.
10. **Login:** el formulario flota en mitad de una pantalla negra vacía, sin imagen ni marca.

Las pantallas con sesión (Inicio, Mi escudería, Campeonato…) no las he visto en vivo; su descripción sale del código.

### Rutas y paneles

| Ruta | Quién entra | Qué es |
|---|---|---|
| `/` | Todos | Portada pública |
| `/login` | Todos | Entrar y registrarse con correo y contraseña o con Google (vincula Google a una cuenta existente) |
| `/instalar` | Todos | Instrucciones para instalar la app por plataforma |
| `/jeque` | `jeque` | Panel de liga con economía |
| `/piloto` | `piloto` | Panel de liga sin economía |
| `/usuario` | `usuario`, `invitado`, `director_deportivo` | Panel de liga sin economía |
| `/admin` | `admin` | Panel de administración |

Los paneles de liga son una sola pantalla con pestañas (`?tab=` en la URL). **Piloto y usuario tienen exactamente las mismas pestañas**; el jeque solo añade «Mi escudería» y el saldo en Inicio.

### Navegación

- Cabecera fija: marca, nombre y rol, botón «Admin» si eres admin, tema claro/oscuro y «Salir».
- En escritorio, una fila de pestañas bajo la cabecera.
- En móvil, una barra inferior con las primeras pestañas y un botón «Más» que abre el resto en una hoja.
- Un banner flotante para instalar la app, que se puede descartar.

### Portada pública (`/`)

- Pestañas: **Clasificación** (pilotos y constructores, selector de temporada, líder destacado), **Equipos**, **Resultados**, **Paddock** y **TV**.
- Bloques: «La competición», «El legado», «¿Primera vez? La liga en 30 segundos», «Qué se comenta» y «Llévate la liga en el móvil».
- Estados de carga, sin datos y error con «Reintentar».

### Pestañas del panel de liga

| Pestaña | Qué tiene hoy |
|---|---|
| **Inicio** | Próximo GP con fecha y hora; último **aviso oficial**; **Mi equipo** con puesto y puntos; **Saldo disponible** (solo jeque, «Saldo no disponible» si no está conciliado); accesos a Resultados y Telemetría. |
| **Mi escudería** (solo jeque) | Resumen: presupuesto, valor de las fichas, valor total y puntos. Plantilla con cartas. Movimientos con estado de conciliación, desglose neto por 11 fuentes que filtran la lista, saldo tras cada movimiento y detalle desplegable. Otras escuderías y agentes libres. |
| **Campeonato** | Clasificaciones; «Mi equipo» con presupuesto, valor de plantilla y logo editable; «Rivalidad y rendimiento»; **comparador cara a cara** de dos pilotos; **ficha individual de piloto** con 11 estadísticas (victorias, podios, poles, vueltas rápidas, DNF, carreras limpias, medias de qualy, carrera y puntos, rating); desarrollo de rating; puntos por carrera; historial cronológico; **Paddock Club / Hall of Fame** con campeones por split; «Central de telemetría GP». |
| **Carreras** | Disputadas y próximas por temporada. Por carrera: podio, **piloto del día** con votación abierta o cerrada (se puede cambiar el voto), vuelta rápida, **acta publicada** y **decisiones FIA** (motivo, efecto, multa aprobada). Estados: posición, DNF, «No corrió», «Posición desconocida». |
| **Telemetría** | Por circuito: vuelta rápida y datos de carrera guardados. Hay pocos datos; el plan de telemetría está aparcado. |
| **Comunidad** | Paddock (muro que carga por tandas), votación actual y archivo de votaciones. |
| **Mercado** | Solo aparece si hay un split con mercado abierto. Cabecera con el estado (abierto/cerrado, sala de pujas o fichaje directo). Con subasta activa: **sala de subasta en vivo** con reloj común, prórrogas y pujas, y solo puja el jeque. Sin subasta: las plantillas en solo lectura. Debajo, el muro de **rumores, rookies y humo de paddock**, uno por split. |
| **Equipos** | Equipos por temporada; al pulsar uno, su detalle: jeque, **director deportivo**, pilotos con su **carta estilo F1 25** (niveles ADV, CORE, ELITE y PRO) y media del equipo. Cada piloto abre una ficha con valoración y carrera a carrera. La ficha abierta queda en la URL y se puede compartir. Hay formato histórico por dúos y temporadas individuales. |
| **TV** | Directo de Twitch que solo se carga al pedirlo, tráilers de cada temporada y entrevistas. |
| **Perfil** | Foto (subida o URL), nombre o alias, logo de la escudería (jeque) y **trayectoria por temporadas** del overall. |
| **Buzón de mejoras** | Propuestas con categoría (interfaz, bugs, mercado, normativa, general) y estado (pendiente, en revisión, aprobada, completada, descartada); el admin responde. |

### Panel de administración (`/admin`)

| Sección | Qué hace |
|---|---|
| **Carreras** | Programar la carrera, meter resultados (posición, no corrió, vuelta rápida, limpio/sancionado, DNF), cerrar el acta para liquidar la economía, decisiones FIA, borrador de imagen del podio con Gemini. |
| **Economía y fichajes** | Resumen de escuderías con ingresos por fuente y «Ajustar saldo»; tabla piloto × circuito con Precios/Rendimiento y «Procesar economía» por circuito; fichar, deshacer fichaje, deshacer alta, ajustar cláusula, renovado; añadir piloto al split; log paso a paso; informe financiero FIA. |
| **Rivalidades** | Grupos de pilotos que compiten por los premios de rivalidad. |
| **Equipos y usuarios** | Escuderías, cuentas y roles; asignar jeque o director deportivo a una escudería. |
| **Paddock** | Revisar que todo esté OK y publicar las bienvenidas oficiales con foto. |
| **Vídeos** | Vídeo de presentación de cada split. |
| **Sugerencias** | Responder y cambiar el estado de las propuestas del buzón. |
| **Datos y mantenimiento** | Split destacado, ventana de fichajes, subasta en vivo, inicio de temporada, recálculo de puntos y revisión de temporadas. |

### Roles

| Rol | Hoy | Lo que quieres |
|---|---|---|
| Invitado | Portada; si entra, panel de usuario | Igual |
| Usuario | Panel sin economía | Igual |
| Piloto | **El mismo panel que el usuario** | Además, una vista propia «Mi piloto» |
| Director deportivo | **El mismo panel que el usuario: no ve la economía de su equipo** | Ver la economía de su escudería en solo lectura |
| Jeque | Panel con economía; puja en la subasta | Igual |
| Admin | Todo | Igual |

---

## Qué mejoraría

### Lo que ya va en los mensajes a Gemini

1. **Demasiadas pestañas.** El jeque tiene 11 y en el móvil la mitad quedan escondidas en «Más». Propongo cinco abajo: Inicio, Mi escudería, Carreras, Campeonato y Más (Comunidad, Mercado, Equipos, TV, Perfil, Buzón).
2. **Campeonato está sobrecargado.** Junta clasificaciones, comparador, ficha de piloto, Hall of Fame, gráficas y una segunda «Central de telemetría» en una sola pantalla. En el mensaje lo divido en Clasificación, Pilotos y Palmarés.
3. **Telemetría fuera del prototipo** (decisión del 22-10-2026). Hoy aparece en su pestaña, dentro de Campeonato y en Inicio, casi sin datos; en la web real habría que esconderla hasta que exista la fase 1 del plan.
4. **El mercado desaparece** cuando no hay un split con mercado abierto, y quien entra por un enlace acaba en Comunidad sin saber por qué. Mejor dejarlo visible con «Mercado cerrado».
5. **Mezcla de idiomas:** «Driver of the Day» junto a «Piloto del día», «Paddock Club · Hall of Fame», «Análisis comparativo de telemetría mundial». Hay que unificar en español.
6. **La economía no muestra la evolución** del saldo por circuito ni los fichajes en el tiempo. Los datos ya existen: cada movimiento lleva su GP y a veces su saldo, y cada piloto guarda su historial de precios.
7. **En el admin, «Datos y mantenimiento»** mezcla controles del mercado (ventana de fichajes, subasta, inicio de temporada) con herramientas de reparación. Mejor una sección «Temporada y mercado» aparte.
8. **Hay dos cosas que corregí de mis documentos de ayer**, porque las había inventado:
   - «Buzón» no son avisos leídos/no leídos: es el buzón de mejoras.
   - «Deshacer mientras no se cierre la carrera» no existe; lo que existe es deshacer fichaje o alta y revertir la economía de una carrera.

### Trabajo de backend (no es para Gemini)

1. **El director deportivo no ve su economía.** En `App.tsx` entra al panel de usuario con `canViewBudget=false`. Hay que darle «Mi escudería» en solo lectura y comprobar que las reglas de Firestore le dejan leer los movimientos de su equipo.
2. **El piloto no tiene vista propia:** su panel es idéntico al del usuario. Su trayectoria está en Perfil y sus rivalidades dentro de Campeonato.
3. **Privacidad:** la colección `usuarios` es de lectura pública (`firestore.rules`, «Public for album») y cada ficha guarda `email` y `auth_email` (`LoginRegister.tsx`). Cualquiera sin sesión puede leer los correos de la liga. Hay que sacar los correos a una colección privada o restringir la lectura.
4. **El admin se reconoce también por correo** escrito a mano en el código del navegador (`App.tsx` y `Dashboards.tsx`). Las reglas son las que protegen de verdad, pero conviene centralizarlo en un único sitio.
5. **Código muerto:** `GuestDashboard.tsx` y `AestheticLogin.tsx` no se usan (ya está en el backlog).
6. **Inicio solo enseña el último aviso oficial:** no hay historial de avisos. Si quieres uno, hace falta una pantalla y su lectura.
