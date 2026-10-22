# Brief para Gemini Canvas: F1 Bugambra

Los mensajes enviados a Gemini Canvas para el prototipo, tal como se enviaron y en orden (versión vigente del 22-10-2026). Sustituyen a todos los mensajes anteriores.

- El mensaje 1 va con las capturas de la web real: `capturas-actuales/`.
- El mensaje 4 va con las referencias de la web de F1: `referencias-f1/`.
- Cómo es hoy la web y qué mejoraría: [analisis-web-actual.md](analisis-web-actual.md).

---

## Mensajes

Cómo usarlos:
- Abre un **chat nuevo** en Gemini y activa **Canvas** (el botón «Canvas» bajo la caja de texto) antes de enviar el primero.
- Envía los mensajes **de uno en uno**, esperando a que termine cada uno. Adjunta las capturas de `docs/redesign/capturas-actuales/` solo con el mensaje 1.
- Copia solo el texto de dentro de cada bloque. Lo que hay fuera de los bloques no se pega.
- Si vuelve a negarse, pide «Continúa en Canvas con el mismo archivo» o divide ese mensaje en dos.

### Mensaje 1. Base y parte pública

```text
Usa Canvas. Quiero que mejores el diseño de mi web, F1 Bugambra (https://f1-bugambra.vercel.app/), una web privada de una liga de F1 25 entre amigos, en español de España y con tuteo, que se usa sobre todo desde el móvil. Te adjunto capturas de cómo se ve hoy. No inventes otra web: conserva su estructura, sus funciones y su identidad (fondo oscuro con tema claro opcional, rojo F1 como acento, titulares en mayúsculas, fotos y cartas de piloto, carteles de escudería) y súbela de nivel: más moderna, viva y luminosa, con brillos y degradados suaves, jerarquía clara y un menú lateral tipo Zara que se abre desde la izquierda con enlaces grandes y finos.

Crea un prototipo en un solo archivo HTML con CSS y JavaScript propios, sin librerías ni red, con datos ficticios en un objeto state y navegación por hash. Iremos por partes; en este primer paso haz solo:
1. La estructura común: cabecera, menú lateral, tema claro/oscuro y una barra de prototipo para elegir el rol (invitado, usuario, piloto, director deportivo, jeque, admin).
2. #portada: pestañas Clasificación, Equipos, Resultados, Paddock y TV.
3. #login y #registro (correo, contraseña y Google) y #instalar (iPhone, Android, ordenador).

Corrige estos problemas que se ven en las capturas:
- En móvil, «En portada · Split 3» se pinta encima de la etiqueta «Temporada en curso».
- La portada gigante se repite en cada pestaña. Muéstrala completa solo en Clasificación; en las demás, una cabecera compacta.
- Hay tres botones de estilos distintos. Deja una acción principal; «Ver en vivo» solo destaca cuando hay directo.
- «Próximo evento: 15 · Italia» necesita fecha, hora, cuenta atrás y explicar el número.
- Clasificación: el podio se marca igual para 1.º, 2.º y 3.º; el OVR en naranja necesita leyenda; la diferencia con el líder se tiene que leer bien; en escritorio, sin el hueco vacío entre piloto y escudería.
- Los selectores horizontales muestran que hay más opciones.
- Resultados enseña también las próximas carreras.
- TV: si el directo está apagado, una tarjeta propia en español en vez del aviso de Twitch.
- El Paddock, con los carteles de bienvenida de cada escudería, sube a la portada como «Qué se comenta».
- El login tiene imagen y marca, no un formulario solo en una pantalla negra.

Datos de la liga: 3 escuderías (Alfa Romero, Zenith, Roses), 11 pilotos, carreras con estado Disputada, Próxima o Pendiente. No hay dorsales, motor, sede ni tiempos de carrera. Importes en millones con formato «67,1 M€».

Colores: máximo 7 colores de interfaz sin contar los de escudería; contraste de texto de al menos 4,5:1 en ambos temas; el color nunca es la única señal.

Antes del código, dime en cinco líneas qué mejoras respecto a las capturas.
```

### Mensaje 2. Pantallas de la liga

```text
Sigue en el mismo archivo. Primero, quita el modo Revisar de la barra del prototipo: no lo quiero.

Luego añade las pantallas con sesión. Cada rol solo ve en el menú lo que puede usar:
- Usuario: Inicio, Campeonato, Carreras, Comunidad, Mercado (sin pujar), Equipos, TV, Perfil y Buzón.
- Piloto: lo mismo, más «Mi piloto».
- Director deportivo: lo mismo, más «Mi escudería» en solo lectura.
- Jeque: «Mi escudería» y puede pujar en el mercado.
- Admin: todo (su panel lo haremos en otro paso).

En móvil, barra inferior con cinco accesos (Inicio, Mi escudería o Campeonato, Carreras, Comunidad, Más) y el resto en el menú.

Pantallas:
- #inicio: próximo GP con fecha, hora y cuenta atrás; último aviso oficial; mi equipo con puesto y puntos; saldo (solo jeque y director deportivo; «Saldo no disponible» si no se conoce, nunca 0).
- #mi-piloto: puntos, podios, valoración, evolución por carrera, rivalidades, escudería y trayectoria por temporadas.
- #campeonato, con tres pestañas: Clasificación (pilotos y escuderías, diferencia con el líder, evolución por carrera); Pilotos (ficha con victorias, podios, poles, vueltas rápidas, DNF, carreras limpias, medias de qualy, carrera y puntos, y rating, más un comparador cara a cara); Palmarés (campeones por split).
- #carreras: calendario con Disputada, Próxima y Pendiente. Detalle con podio destacado, resultados (posición, DNF, «No corrió», «Posición desconocida»), vuelta rápida, votación al piloto del día (se puede cambiar el voto mientras está abierta), acta y decisiones FIA (motivo, efecto, multa).
- #comunidad: Paddock (muro), votación actual y archivo.
- #mercado: estado (Abierto o Cerrado, «Sala de pujas» o «Fichaje directo»). Sala de subasta con piloto en juego, puja actual, reloj común y prórrogas; solo el jeque ve el botón de pujar. Debajo, muro de rumores. Si está cerrado, la pestaña sigue visible y lo dice.
- #equipos: escuderías con jeque, director deportivo, cartas de piloto estilo F1 25 (niveles ADV, CORE, ELITE, PRO) y media del equipo; ficha del piloto carrera a carrera.
- #tv: directo que se carga al pulsar, tráilers por temporada y entrevistas.
- #perfil: foto, alias, logo de escudería (jeque) y trayectoria.
- #buzon: buzón de mejoras con categoría, estado (pendiente, en revisión, aprobada, completada, descartada) y respuesta del admin.

Todo en español: nada de «Driver of the Day» ni «Hall of Fame».

Al terminar, enumera las rutas que has hecho y qué rol ve cada una.
```

### Mensaje 3. Carta del piloto, Mi escudería, administración y efectos

```text
Sigue en el mismo archivo y no rompas lo que ya funciona. Haz estas cinco partes, en este orden, y al final dime cuáles has hecho y cuáles no.

PARTE 1. CARTA DEL PILOTO
Al tocar el nombre o la foto de un piloto en cualquier pantalla (clasificación de la portada y de Campeonato, resultados de carrera, Equipos, Mercado, Mi escudería, Mi piloto), se abre su carta estilo F1 25 en una ventana:
- Por delante: foto, nombre, escudería con su logo y color, nivel (ADV, CORE, ELITE o PRO) y valoración general.
- Al girarla o desplazarse: sus estadísticas (victorias, podios, poles, vueltas rápidas, DNF, carreras limpias, medias de qualy, carrera y puntos) y su carrera a carrera del split (posición, puntos, piloto del día y vuelta rápida en cada GP).
- Para el jeque, el director deportivo y el admin: además su cláusula y su precio de mantener.
- Se cierra con una X, con Esc o tocando fuera, y la ruta cambia (por ejemplo #equipos/piloto/fabi) para poder compartir el enlace.

PARTE 2. MI ESCUDERÍA (#escuderia; jeque y director deportivo, este último sin botones de edición)
1. Resumen: presupuesto disponible, valor de las fichas (suma de cláusulas), valor total y puntos.
2. Plantilla: carta de cada piloto con cláusula actual, precio de compra y una línea pequeña con la evolución de su precio por circuito.
3. Movimientos: etiqueta «Conciliado» o «Pendiente de conciliar»; «Desglose por fuente (neto)» con 11 botones que filtran la lista (Puntos de carrera, Pole, Vuelta rápida, Participación, Equipo sin sancionados, Rivalidad, Premio de temporada, Fichajes y cláusulas, Ajuste de precio de compra, Ajuste manual del administrador, Otros). Cada movimiento lleva concepto, fecha, GP, fuente, importe con + o − y saldo después, o «Saldo no registrado»; al tocarlo se despliega piloto, carrera y referencia.
4. Evolución por circuito: gráfico con un punto por GP con el saldo tras la carrera y lo ganado o perdido. Los fichajes, cláusulas y ventas se marcan en su GP, con forma distinta para entrada y salida. Debajo, una tabla con las mismas cifras. Un GP sin saldo queda vacío con «sin saldo registrado»: nada inventado.
5. Fichajes del split: piloto, tipo (fichaje, cláusula, subasta, venta), importe y GP.
6. Otras escuderías y agentes libres.
Datos ficticios: 6 GP (uno sin saldo), 2 fichajes, 1 venta y movimientos de todas las fuentes.

PARTE 3. ADMINISTRACIÓN: MENÚ Y SECCIONES
Cuando en la barra de prototipo se elige el rol «Admin», el menú lateral muestra un bloque «Administración» con estas 8 entradas, cada una con su pantalla. Con cualquier otro rol, el bloque no aparece y esas rutas llevan a #inicio.
1. #admin-carreras: elegir carrera; una fila por piloto (posición, «No corrió», DNF, vuelta rápida, limpio o sancionado); decisiones FIA (piloto, motivo, efecto, multa); resumen antes de cerrar; «Cerrar acta» con confirmación.
2. #admin-economia: ver la parte 4.
3. #admin-rivalidades: grupos de pilotos que compiten entre sí; crear grupo, añadir y quitar pilotos.
4. #admin-usuarios: cuentas con nombre, rol (los seis roles) y escudería; para jeque y director deportivo, la escudería es obligatoria.
5. #admin-paddock: publicar el aviso oficial y las bienvenidas de cada escudería con su cartel.
6. #admin-videos: vídeo de presentación de cada split (enlace y vista previa).
7. #admin-sugerencias: propuestas del buzón con su estado y respuesta del admin.
8. #admin-temporada: interruptores de ventana de fichajes y subasta en vivo, split destacado e «Iniciar temporada» con confirmación.

PARTE 4. ADMINISTRACIÓN: ECONOMÍA (#admin-economia)
1. Resumen de escuderías: tabla con Escudería, Inicial, Mercado, Ajuste de cláusulas, una columna por fuente de ingreso (Puntos, Pole, Vuelta rápida, Participación, Equipo sin sancionados, Rivalidad, Premio de temporada), Total disponible y Puntos. Botón «Ajustar saldo» por escudería y «Sin registro» cuando falta un dato. En móvil, una tarjeta por escudería con las cifras desplegables.
2. Pilotos y mercado: un piloto por fila y una columna por circuito, con selector Precios / Rendimiento. En Precios, cada celda muestra mantener y cláusula de ese GP. En la cabecera de cada circuito, «Procesar economía» o «Economía procesada». Por piloto: Fichar, Deshacer fichaje, Deshacer alta, Ajustar cláusula y la marca «Renovado».
3. Formulario «Añadir piloto / Fichaje»: escudería, valor de mercado, cláusula mínima, precio de mantener y la opción «Piloto en subasta: precio libre».
4. Procesar una carrera: antes, un resumen de lo que se suma o resta a cada escudería; después, un registro paso a paso y «Reintentar» si falla.
5. Evolución del saldo de todas las escuderías por circuito: una línea por escudería con patrón y marcador distintos, no solo color; fichajes y ventas marcados en su GP; y una tabla con las mismas cifras.
Toda acción de dinero muestra antes un resumen («Se restarán 12,0 M€ a Zenith por el fichaje de Fabi»), pide confirmación, enseña el resultado y ofrece «Deshacer» cuando exista. El botón se desactiva mientras se procesa.
Datos ficticios: un circuito sin procesar, uno procesado, una escudería sin saldo inicial, dos fichajes, una venta y un piloto renovado.

PARTE 5. EFECTOS Y REPASO
- Efectos: titular que entra letra a letra, cifras que cuentan hasta su valor, cuenta atrás con dígitos tipo panel de aeropuerto, filas de clasificación que se reordenan, podio en 3D ligero, cartas de piloto que se giran, transición entre pantallas tipo semáforo de salida y menú que entra con cortina.
- Sin romper nada: anima solo transform y opacity; con «reducir movimiento» se apaga todo; ningún efecto oculta datos ni retrasa acciones.
- Repasa: cada rol ve solo lo suyo; no hay enlaces muertos; cada pantalla tiene estado de carga, vacío y error con «Reintentar»; botones de al menos 44 px; se puede usar con teclado; contraste correcto en claro y oscuro.

Al final, enumera las partes 1 a 5 y di de cada una qué has hecho y qué no has podido comprobar.
```

---

### Mensaje 4. Pilotos, escuderías y clasificación al estilo de la web de F1

Adjunta las capturas de `docs/redesign/referencias-f1/` si Gemini no puede abrir los enlaces.

```text
Sigue en el mismo archivo. Ahora ajusta tres partes inspirándote en cómo lo hace la web oficial de F1 (formula1.com/en/drivers, /en/teams y /en/results/2026/drivers). Copia el estilo, no la marca: nada de logos, tipografía ni nombres de F1.

1. PILOTOS (en Equipos y en una vista «Pilotos» de Campeonato)
- Una tarjeta grande por piloto, rellena del color de su escudería con un degradado y una trama de puntos sutil.
- Arriba a la izquierda, el nombre en fino y el alias o apellido en negrita, y debajo la escudería en pequeño.
- En lugar del dorsal (la liga no tiene), su OVR en cifra grande de contorno y su nivel (ADV, CORE, ELITE, PRO).
- Abajo a la izquierda, el logo de la escudería en un círculo.
- La foto del piloto recortada a la derecha, llegando hasta el borde inferior.
- Ordenadas por escudería: dos columnas en escritorio y una en móvil.
- Al tocarla se abre la carta del piloto.

2. ESCUDERÍAS (#equipos)
- Una tarjeta grande por escudería, con el mismo degradado y la misma trama en su color.
- Nombre de la escudería grande, arriba a la izquierda; debajo, sus pilotos en línea con un avatar redondo pequeño y el formato «Nombre ALIAS».
- Logo de la escudería en un círculo arriba a la derecha.
- En la mitad inferior, el cartel de la escudería (o las fotos de sus pilotos) a sangre, y una franja fina con puntos de constructores y media OVR.
- Al tocarla, se abre el detalle de la escudería.

3. CLASIFICACIÓN (portada y Campeonato)
- Arriba, una subnavegación con selector de temporada (Origins, Split 1, Split 2, Split 3, Mundial) y las pestañas Carreras, Pilotos, Escuderías y Palmarés; la activa va subrayada en rojo.
- Debajo, un filtro en forma de píldora («Todas las escuderías»).
- Título grande del tipo «CLASIFICACIÓN DE PILOTOS · SPLIT 3».
- La tabla va en un panel limpio y claro con columnas POS, PILOTO (avatar redondo con borde del color de su escudería, y el nombre), ESCUDERÍA (logo pequeño y nombre), DIF. (diferencia con el líder) y PTS alineados a la derecha.
- Filas separadas por líneas finas, sin colores de fondo. El podio se marca con un símbolo en la columna POS, igual para el 1.º, el 2.º y el 3.º.
- En móvil: POS, piloto con su escudería debajo en pequeño, y PTS.
- La de escuderías sigue el mismo formato.

Respeta las reglas de color: el color de la escudería va en tarjetas, avatares y logos, nunca como color de texto; el texto sobre la tarjeta mantiene un contraste de al menos 4,5:1.

Al terminar, dime qué has cambiado en cada una de las tres partes.
```

### Mensaje 5. Un mismo estilo en toda la web, menos artificial

```text
Sigue en el mismo archivo. Ahora mismo cada pantalla parece de una web distinta y el conjunto se ve demasiado artificial. Haz una pasada de unificación. Esto manda sobre lo que te pedí antes sobre efectos.

UN SOLO ESTILO EN TODA LA WEB
- El estilo de referencia es el del mensaje anterior: tarjetas de piloto y de escudería con su color, y clasificación en tabla limpia. Todas las pantallas (portada, inicio, carreras, mercado, mi escudería, comunidad, perfil, admin) usan el mismo lenguaje.
- Define una vez los tokens en variables CSS y úsalos en todo: colores, tamaños de letra, espaciados, radio de las esquinas, grosor de línea y sombras. Nada de valores sueltos pantalla por pantalla.
- Una sola tipografía con 4 o 5 tamaños fijos. Los títulos de sección, iguales en todas las pantallas.
- Un solo estilo de tarjeta, de tabla, de pestañas, de botón principal, de botón secundario, de campo de formulario y de aviso. Si dos cosas hacen lo mismo, se ven igual.
- La misma cabecera, el mismo menú y el mismo ancho de contenido en todas las pantallas, también en el admin.

MENOS ARTIFICIAL
- Lo que da vida son los datos reales y las fotos de pilotos y los carteles de escudería, no la decoración.
- Quita el brillo de neón, el efecto cristal, las sombras de color, los degradados en todos los fondos, los emojis en la interfaz, los iconos de relleno y los textos de relleno grandilocuentes.
- El degradado y la trama solo van en las tarjetas de piloto y de escudería. El resto de la web va sobre fondo liso.
- Efectos: quita el podio 3D, la transición tipo semáforo, el titular letra a letra y cualquier cosa que siga al cursor. Quédate solo con transiciones cortas al cambiar de pantalla, cifras que cuentan hasta su valor la primera vez y la carta del piloto que se gira al tocarla. Todo se apaga con «reducir movimiento».
- Los textos, en el tono de una liga entre amigos: claros y cortos, sin frases de anuncio.

Al terminar, enséñame la lista de tokens y componentes que has definido y di qué has quitado.
```
