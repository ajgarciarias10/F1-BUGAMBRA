# Cuaderno de paddock · propuesta de rediseño

Esta carpeta es una propuesta **para revisión**, independiente de la aplicación React. [Abrir el prototipo](prototype/index.html) o servir `docs/redesign/prototype/` con `python3 -m http.server 8000`. La navegación usa fragmentos (`#inicio`, `#admin-carrera`), de modo que cualquier servidor estático devuelve el mismo `index.html`. `node docs/redesign/prototype/check.cjs` verifica las rutas, recursos locales y la exportación de revisión sin navegador. No hay compilación, solicitudes de datos, cuentas, Gemini ni escrituras a Firestore. Todos los nombres, importes, fechas, circuitos y resultados visibles son ficticios.

## Concepto

Toda la maqueta adopta una lectura editorial de blanco y negro: portada, acceso, jeque, administración y sistema comparten cabecera, tipografía, filetes y espacios amplios. El menú lateral ya existente permanece como acceso global. La cabecera pega el menú a la izquierda, centra el nombre y deja Buscar, tema y Entrar/Perfil/Usuarios como palabras a la derecha. Al desplazarse, el fondo de la cabecera pasa de transparente a papel sólido.

La petición anterior de colores al estilo formula1.com queda **sustituida** por esta dirección. Se conserva el rojo de competición solo como punto de estado y subrayado de sección activa. No se usan degradados de fondo ni paneles pastel. Las ilustraciones SVG locales siguen siendo contenido ficticio; sus colores internos no son tokens de interfaz. El logo original permanece copiado en `assets/`, aunque el nuevo encabezado usa un rótulo tipográfico más ligero.

## Paleta, contraste y tipografía

Se sigue la guía `docs/trabajo/telemetria/prototype/colour-guide.md` consultada con `git show feature/telemetria-prototype:docs/trabajo/telemetria/prototype/colour-guide.md`: un máximo de siete colores de interfaz por tema, contraste de texto de 4,5:1 y gráficos necesarios de 3:1, sin parejas oponentes ni color como único código. Los tokens de cada tema contienen **seis colores únicos**; los alias de estado comparten tinta y papel. `check.cjs` calcula los contrastes de los pares de texto, acento y filete y falla si bajan del mínimo.

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `--paper`, `--surface`, `--raised` | `#ffffff` | `#111111` | Papel continuo, sin tarjetas teñidas |
| `--ink` | `#111111` | `#f5f4ef` | Texto, acción primaria y trazos |
| `--muted` | `#555555` | `#b8b8b3` | Leyendas y datos secundarios |
| `--line`, `--strong-line` | `#767671` | `#8b8b85` | Filetes de 1 px con contraste gráfico |
| `--tint`, `--sand` | `#eeeeee` | `#252523` | Solo fondos mínimos de carga y avatar |
| `--brand`, `--accent` | `#d71920` | `#ed4045` | Punto y subrayado activo |

La familia principal es `Helvetica Neue`, con Helvetica y Arial locales como respaldo. Navegación, etiquetas y títulos usan mayúsculas espaciadas y peso ligero; la letra corriente mide 11–13 px. Solo las escenas protagonistas elevan mucho el tamaño del titular. La monoespaciada se reserva para importes y auditoría. No se descarga ninguna fuente.

## Reglas de composición

| Decisión | Regla |
| --- | --- |
| Espaciado | Márgenes amplios y secciones separadas por aire y filetes; 18 px en móvil y hasta 80 px en escritorio. |
| Radio y elevación | Cero radio y cero sombra en la propuesta; las imágenes se unen sin canaletas. |
| Acciones | Una acción primaria ocupa todo el ancho con tinta y papel invertidos; las secundarias son texto pequeño subrayado. |
| Campos | Etiqueta pequeña en mayúsculas y línea inferior; foco visible y controles de 44 px o más. |
| Movimiento | Transiciones breves; `prefers-reduced-motion` apaga animaciones y desplazamiento suave. |
| Estados | Palabra, signo o icono acompaña siempre al estado y a ingresos/gastos; no se depende del color. |
| Datos | Filas apiladas en móvil, sin tablas anchas ni saldo cero inventado ante error. |

## Componentes

Cabecera de área; menú lateral global (hoja desde la izquierda, enlaces grandes y finos); bloque protagonista editorial; cabecera de página; panel; lista de clasificación; fila de acta; fila de libro; métrica; ficha de piloto con retrato ilustrativo ficticio; botones primario, secundario, texto y peligro; etiquetas de estado; avisos de información, éxito, advertencia y error; campos, selector y formulario; pestañas; estado vacío; esqueleto de carga; estado de error; miniatura con Play explícito; modal; toast; vista previa antes/después; asiento y auditoría previstos. La página [`#sistema`](prototype/index.html#sistema) reúne los estados básicos.

## Navegación y reglas de producto

En 390 px y en 1440 px, el mismo botón ☰ de la izquierda abre el menú lateral existente. El menú contiene las 22 rutas agrupadas en Pública, Jeque y Administración, con la zona actual primero; las flechas e Intro permiten recorrerlo y Escape o el toque exterior lo cierran. También conserva M, Tab fuera de campos y doble pulsación sobre el fondo; Revisar bloquea esos gestos. No hay menú circular ni círculo seguidor. La cabecera permanece pegada y se vuelve opaca al desplazar. El tema sigue al sistema hasta que se elige Claro u Oscuro, guardado en `localStorage` cuando está disponible. Cada ruta incluye una franja de muestra con **Cargando, Sin datos y Error** para inspeccionar los tres estados sin fingir una respuesta real.

La escudería del jeque solo muestra presupuesto y movimientos. El mercado explica el anuncio externo por WhatsApp y el registro posterior por administración. No aparecen controles de fichaje, renovación, cláusula, construcción de coche, garaje o aerodinámica en la vista de jeque. El libro separa puntos de carrera, pole, vuelta rápida, equipo limpio, participación, rivalidad, constructores y ajustes manuales. El acta diferencia **DNF explícito**, **No corrió** y **Posición desconocida**; los puntos no rellenan posiciones. Los vídeos no se cargan antes de Play.

En Acceso y Registro, «Continuar con Google» es un control de muestra y solo informa que no se inició sesión; no conecta Firebase Auth. En Equipos, las fichas abren un detalle que ocupa el ancho de lectura. Las imágenes de escudería y pilotos son SVG ilustrativos locales. Puntos, media de llegada y mejor resultado están marcados como datos ficticios. El detalle no crea una ruta nueva ni afecta resultados reales.

La vista administrativa de economía enseña `precio nuevo − precio registrado`; un valor positivo es cargo y uno negativo es devolución. Si el cargo excede el saldo de muestra, la vista muestra el faltante y desactiva guardar. El ejemplo visual de asiento y auditoría no representa una transacción: en la implementación se debe usar `apps/web/src/utils/presupuesto.ts`, leer valores dentro de una transacción, guardar precio, saldo, libro y auditoría atómicamente con identificador estable, y recargar antes de afirmar éxito. La edición de carrera muestra qué liquidación dependiente debe revertirse antes de cambiar resultados. La imagen de medios es un SVG de muestra, no un resultado Gemini: generación, descarga y publicación son pasos distintos; la clave de Gemini pertenecería solo a la API administrativa autenticada.

## Modo Revisar

El botón flotante **Revisar** aparece discreto al pie de todas las pantallas. Cuando está apagado, las marcas y el panel no aparecen. Al encenderlo, cierra el panel para tocar un elemento; en escritorio también puedes arrastrar una caja. **Marcas** vuelve a abrir el panel; su selector **Pantalla** permite saltar entre rutas sin apagar Revisar. En móvil, pulsa **Dibujar área**: el panel se cierra y puedes arrastrar; vuelve a pulsarlo desde **Marcas** para desplazar la página con normalidad. La nota se edita junto a la selección. Se pueden combinar etiquetas rápidas, elegir importancia y guardar. Cada marca visible lleva un número; tocarlo permite editar o eliminar. `Esc` cierra el editor o cancela el dibujo. El panel agrupa todas las anotaciones por ruta, incluso las de otras pantallas.

**Copiar resumen** crea Markdown para pegar en una conversación. **Descargar JSON** crea un archivo local. **Importar JSON** agrega marcas por ID sin duplicarlas. **Borrar todo** pide confirmación dentro del panel. No se capturan imágenes ni se envían datos. El almacenamiento local depende del origen del navegador; para conservar una revisión, descarga el JSON. Si el almacenamiento falla, el panel avisa y la descarga sigue disponible. El portapapeles puede requerir un contexto seguro; `localhost` funciona en navegadores compatibles.

Formato exportado: objeto con `format: "f1-bugambra-review"`, `version: 1`, `exportedAt` y `annotations`. Cada anotación contiene `id`, `route` (hash), `theme`, `viewport` (`width`, `height` en px), `rect` (`x`, `y`, `w`, `h` como fracciones del elemento elegido), `pageRect` (respaldo relativo al contenido), `selector`, `elementText`, `note`, `tags`, `severity` y `timestamp` ISO. Al cambiar de ruta o tamaño, se busca el selector y se reconstruye la caja con `rect`; si ya no existe, se usa `pageRect`. Las coordenadas son orientativas si cambia profundamente la estructura de una pantalla.

## Mapa de implementación propuesto

Este mapa indica dónde integrar la propuesta **si se aprueba**; no cambia esos archivos.

| Pantalla / pieza | Archivos React que sustituiría o adaptaría |
| --- | --- |
| Portada | `apps/web/src/components/PublicHome.tsx`, `GuestDashboard.tsx`, `NextRaceWidget.tsx` |
| Acceso y registro | `apps/web/src/components/LoginRegister.tsx`, `AestheticLogin.tsx` |
| Instalar | `apps/web/src/components/InstallApp.tsx` |
| Inicio de jeque y navegación | `apps/web/src/components/Dashboards.tsx`, `MobileBottomTabs.tsx` |
| Mi escudería y libro | `apps/web/src/components/TeamEconomyView.tsx` |
| Campeonato | `apps/web/src/components/TotalStandings.tsx`, `SharedDashboard.tsx` |
| Carreras, acta y FIA | `apps/web/src/components/RaceResultsView.tsx`, `RaceReportModal.tsx` |
| Telemetría | `apps/web/src/components/FomLive.tsx`, `OVRTrajectoryPanel.tsx` |
| Comunidad | `apps/web/src/components/PaddockForum.tsx` |
| Mercado | `apps/web/src/components/MarketDeadlineView.tsx`, `AuctionRoom.tsx` |
| Equipos | `apps/web/src/components/TeamsView.tsx` |
| Perfil | `apps/web/src/components/ProfileView.tsx` |
| Buzón de mejoras | `apps/web/src/components/SuggestionsView.tsx`, `Feedback.tsx` |
| Panel administrativo | `apps/web/src/components/AdminDashboard.tsx`, `AdminControlPanel.tsx` |
| Edición de carrera | `apps/web/src/components/AdminDashboard.tsx`, `RaceResultsView.tsx` |
| Economía y fichajes admin | `apps/web/src/components/EconomyAdminPanel.tsx`, `AdminTeamManager.tsx`, `FiaFinancialReportModal.tsx` |
| Vídeo y borrador | `apps/web/src/components/MediaSyncPanel.tsx`, `RaceWinnersImagePanel.tsx`, `StorageImageUpload.tsx` |
| Usuarios | `apps/web/src/components/AdminUsersPanel.tsx` |
| Sistema visual | `apps/web/src/components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`, `Notice.tsx`, `EmptyState.tsx`, `PageHeader.tsx` |

La lista completa de rutas y los puntos de revisión están en [screens.md](screens.md).
