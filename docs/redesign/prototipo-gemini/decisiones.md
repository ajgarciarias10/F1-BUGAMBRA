# Decisiones del dueño sobre el prototipo (22-10-2026)

El dueño aprobó el prototipo de `docs/redesign/prototipo-gemini/` («me ha gustado mucho») y pidió que se convierta en la aplicación real. Este documento recoge lo que decidió durante la revisión para que no dependa del chat. Los tickets 03 a 12 de `docs/trabajo/redesign/` lo aplican sobre la rama `feature/rediseno-app`, que Vercel publica como preview; `main` y producción no se tocan hasta que el dueño lo decida.

## Aprobado tal cual

- Estilo común: Titillium Web, tokens del `overlay.css`, tema claro y oscuro, menú de hamburguesa, píldoras, sin cajas alrededor de las secciones.
- Tarjetas de piloto y de escudería al estilo formula1.com, con foto, logo y OVR. La carta se gira y el reverso no deja ver la foto.
- Gráficos de evolución alineados con su tabla (mismas columnas), en Clasificación, Mi escudería, Mi piloto y el admin de economía. Le gustó especialmente «Saldo de las tres escuderías tras cada GP».
- Clasificación ordenada: pilotos de cada escudería por puntos y, en la temporada completa, split a split.

## Temporadas

- Origins es una temporada propia, individual por dúos (Toni/Fabi, Jota/Pabliyo…).
- Temporada 1 = Split 1 + Split 2 + Split 3, con numeración de GP seguida (1–18) y una vista total. En Equipos, la Temporada 1 muestra todos los pilotos que han pasado por cada escudería.
- Cada split se puede ver por separado en Clasificación y en Equipos, con sus plantillas, puntos y saldos.
- Las cartas de un split antiguo son las de entonces (escudería y valoración de ese split), también de pilotos que ya no corren.
- La clasificación de la temporada es la suma de los puntos de todos sus splits (confirmado el 22-10-2026).

## Calendario y datos

- Split 3: el GP 16 es Italia (Imola), no España. Ya se puede corregir desde Programar carrera (`main`, commit `bc5f6e3`).
- Jeques y directores son los de la base de datos; el director deportivo de Alfa Romero es Antonio Ceferi (falta asignarlo en Equipos y usuarios).
- Los 211 puntos del dúo Toni/Fabi son correctos: el Excel suma a los dúos los puntos de rivalidad.

## Roles

- El comisario (admin) no tiene escudería ni piloto: su inicio muestra lo pendiente (actas y economía).

## Quitado

- Paddock (muro y carteles de bienvenida) y votaciones (piloto del día): «no les ha molado el sistema de votación». Fuera de portada, inicio, Comunidad, Carreras y admin.

## Admin

- Economía y fichajes y Rivalidades funcionan como el panel actual (mismas columnas y acciones), con el estilo nuevo.
- Rivalidades fáciles de elegir: pilotos por escudería con foto, selección de un toque, 2 o 3 por grupo.
- «Procesar economía» enseña antes el desglose de cada escudería, línea a línea.
- Acta: clasificación y carrera del 1 al 20 (parrilla completa con la IA) o «No corrió»; aviso de puestos repetidos. Un piloto sancionado puede cambiar de puesto; hoy se hace reabriendo el acta.

## TV

- Los vídeos se cargan de Twitch: canal de la liga `tonicotitular` y canal de Fabi `fabiml_204`, con su GP y su resultado.

## Avisos para la implementación

- Posiciones de Origins: el dueño aprobó deducirlas como en el prototipo (puntos de la carrera menos los extra = puntos estándar; 12 = P1, 10 = P2, 9 = P3… 2 = P10; 1 punto = entre P11 y P20; 0 sin terminar = DNF). Es una excepción a la regla de `AGENTS.md` solo para Origins, que únicamente guardó puntos. En Canadá, Jota y Fabi tienen 10 puntos estándar los dos: se muestran ambos como P2 hasta que la liga diga quién ganó.
- El prototipo lee Twitch con el endpoint público de la web de Twitch. En la app debe hacerse con la API oficial desde `apps/api`, con la clave en el servidor.
