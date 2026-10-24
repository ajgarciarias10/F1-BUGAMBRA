# Prompts para rediseñar F1 Bugambra con Stitch

Pega primero el **Prompt base** en Stitch. Luego, en el mismo proyecto, pega los prompts de pantalla uno a uno para conservar el mismo lenguaje visual. Pídele variantes móvil y escritorio de cada pantalla.

## Prompt base — producto y reglas que no se deben cambiar

```text
Rediseña la interfaz de F1 Bugambra, una liga privada de Fórmula 1. La mayoría entra desde el móvil y consulta la web unos minutos; la experiencia debe ser rápida, obvia y ligera. Diseña primero para móvil (390 px) y adapta después a escritorio (1440 px).

Usa español claro. Mantén una estética de paddock nocturno: fondo oscuro, rojo F1 reservado para acciones principales, texto grande y legible, controles táctiles cómodos y navegación corta. Evita tablas anchas, paneles administrativos mezclados con vistas de usuario, animaciones, carruseles, vídeo automático y gráficos que no ayuden a decidir.

Respeta este funcionamiento real de la liga:
- El jeque consulta su escudería, saldos, movimientos, calendario, resultados y avisos. No puede editar presupuestos.
- Los acuerdos de fichajes, renovaciones y cláusulas solo se ejecutan cuando la liga los anuncia por WhatsApp. El administrador los registra después en el panel. No ofrezcas botones para que el jeque inicie o renueve estas operaciones por su cuenta.
- Los ajustes de presupuesto los introduce el admin después de leer WhatsApp. La web no adivina ni corrige saldos por su cuenta.
- Las posiciones, DNFs, sanciones y decisiones FIA las introduce o corrige el administrador. Cero puntos no significa DNF. “No corrió”, “DNF” y “posición desconocida” son estados distintos.
- En esta liga no se construyen coches: no incluyas garaje, piezas, mejoras, desarrollo de coche ni límite aerodinámico.
- El administrador publica para cada circuito el vídeo de la vuelta rápida antes de la carrera. El usuario lo ve desde Telemetría. Muestra una miniatura y carga el reproductor solo tras tocar “Reproducir”.
- Los usuarios registrados pueden votar al mejor piloto. El administrador puede compartir votaciones de circuitos pasados mediante enlace.
- Después de la carrera, el administrador puede pedir a Gemini un borrador de imagen de los ganadores. La imagen requiere previsualización y acción manual para descargar o publicar; nunca se publica sola.
- Editar una carrera antigua puede cambiar posiciones, puntos, premios, ratings y liquidaciones. Antes de confirmar, el administrador debe ver el impacto y un estado claro de lo que debe revertirse y recalcularse. Nada de éxito aparente si falla una escritura.

Diseña componentes y pantallas con datos de ejemplo claramente ficticios, sin fijar cifras de equipos o pilotos en el diseño. No inventes reglas, sanciones, movimientos ni resultados. Distingue visualmente acciones disponibles, información pendiente, error, guardado y confirmación.

Entrega una interfaz consistente y prototipable con enlaces entre pantallas. Stitch solo diseña la experiencia: las fórmulas, permisos y cálculos pertenecen a funciones existentes/configurables del producto, no a valores codificados en la UI.
```

## Prompt 1 — mapa y navegación del jeque

```text
Sobre el proyecto F1 Bugambra y las reglas del Prompt base, rediseña la navegación completa del jeque. Crea estas pantallas enlazadas: Inicio, Mi escudería, Campeonato, Carreras, Telemetría, Comunidad y Perfil. Mantén una barra inferior móvil con un máximo de cinco destinos visibles y agrupa el resto en “Más”; en escritorio usa una navegación compacta.

Inicio debe contestar de inmediato: cuándo es el próximo GP, qué aviso oficial publicó el administrador, cómo va mi equipo y cuál es mi saldo disponible. Añade accesos a ver resultados y Telemetría. No uses un hero de vídeo.

Mi escudería presenta pilotos, puntos, presupuesto y movimientos recientes. El jeque solo consulta. Las operaciones de WhatsApp se muestran cuando el administrador las haya registrado; no muestres controles de editar saldo, fichar, renovar ni ejecutar cláusula. No pongas funciones de coche o aerodinámica.

Usa nombres breves de menú, tarjetas pequeñas y estados vacíos útiles. No metas toda la información de la temporada en Inicio.
```

## Prompt 2 — Mi escudería y economía entendible

```text
Diseña la pantalla “Mi escudería” de F1 Bugambra en móvil y escritorio. La persona debe distinguir sin esfuerzo: presupuesto disponible, valor de las fichas, puntos del equipo e historial de movimientos.

Cada movimiento muestra fecha, GP/acuerdo, concepto, importe con signo y saldo posterior. Separa ingresos deportivos, fichajes, premios, sanciones económicas aprobadas y ajustes manuales del administrador. Al tocar una fila, muestra su explicación y referencia. No escondas ajustes dentro de una suma sin desglose.

El jeque no puede cambiar presupuesto ni iniciar fichajes, renovaciones o cláusulas. Un acuerdo anunciado por WhatsApp aparece como registrado solo después de que lo introduzca el administrador. Incluye estados “sin movimientos”, “saldo pendiente de conciliar” y error de carga sin inventar un saldo cero.
```

## Prompt 3 — Carreras, acta y sanciones FIA

```text
Diseña “Carreras” para F1 Bugambra: listado de circuitos pasados y próximos, detalle de carrera y acta publicada. En el acta muestra por piloto qualy, posición final, puntos y etiquetas diferentes para DNF, no corrió y posición desconocida.

Incluye un bloque “Decisiones FIA” que muestre únicamente decisiones registradas por el administrador: piloto/equipo afectado, tipo de sanción, efecto deportivo, motivo breve y carrera. Si hay multa de dinero, preséntala como aprobada y enlazada al movimiento económico; no inventes ni calcules multas. El jeque no edita el acta.

Desde cada carrera pasada ofrece ver resultados y compartir la votación al mejor piloto si existe. El voto requiere cuenta registrada. Diseña estados de votación abierta, cerrada y no disponible. Evita tablas horizontales en móvil.
```

## Prompt 4 — Telemetría y vuelta rápida

```text
Diseña Telemetría de F1 Bugambra para que el usuario elija un circuito y vea los datos que ya existen de pilotos y carrera. Añade el vídeo de la vuelta rápida que publica el administrador para ese circuito antes de correr.

El vídeo ocupa una tarjeta 16:9 con miniatura, nombre del GP y botón explícito “Reproducir vuelta rápida”. No insertes ni descargues el reproductor hasta que se pulse. Si falta el vídeo, muestra “Vídeo pendiente de publicación” y conserva visible el resto de la telemetría disponible. Incluye selección de circuitos anteriores.

No inventes velocidad, sectores, trazadas o gráficos que no estén guardados en el producto. No uses autoplay, fondos de vídeo ni carga de todos los reproductores al entrar.
```

## Prompt 5 — Admin: editar carrera pasada con impacto

```text
Diseña el espacio de trabajo “Carreras” exclusivo del administrador. Debe permitir seleccionar split y circuito, editar posiciones de qualy/carrera, marcar DNF o no corrió, marcar vuelta rápida y registrar sanciones/decisiones FIA con motivo. Añade la URL o publicación del vídeo de vuelta rápida del circuito.

Al editar una carrera ya cerrada, antes de guardar muestra una vista previa con valores anteriores y nuevos, puntos afectados, ratings, premios y liquidaciones dependientes. Indica qué liquidaciones deben revertirse primero y qué se recalculará después; exige confirmación explícita. Si falta información, bloquea esa parte y explica qué falta. Muestra progreso, resultado y error real del guardado.

No diseñes un botón mágico de recalcular todo ni sobrescrituras silenciosas. No inventes DNF por cero puntos ni posiciones a partir de puntos. Las transacciones, permisos y cálculos se resolverán en backend/servicios.
```

## Prompt 6 — Admin: registrar acuerdos de WhatsApp y ajustar economía

```text
Diseña “Economía y fichajes” para administración. El admin registra un acuerdo que ya fue anunciado por WhatsApp: fecha/referencia, split, equipo, piloto si aplica, concepto, importe oficial, motivo y autor. Incluye tipos de ajuste de presupuesto, cambio de precio de compra, fichaje, renovación/cláusula y sanción económica aprobada.

En un cambio de precio muestra solo la diferencia sobre lo ya cobrado: si el precio pasa de 54M a 44M, devuelve 10M. Si sube, cobra solo la diferencia. Si el saldo no alcanza, indica cuánto falta y no permite aplicar. Muestra saldo y precio antes/después, asiento de ledger y auditoría en una vista previa.

Los importes los introduce el administrador a partir del acuerdo oficial; no pongas presupuestos objetivo, pilotos o cifras prefijadas en botones. No recalcules ni cambies saldos iniciales al ajustar un precio. El jeque no puede abrir este panel.
```

## Prompt 7 — Admin: vídeo y publicación posterior a carrera

```text
Diseña una pantalla del administrador para publicar el vídeo de vuelta rápida asociado a cada circuito y preparar la publicación posterior a la carrera. El vídeo puede añadirse antes de la carrera y actualizarse por GP. Muestra una vista previa ligera y el estado publicado/pendiente.

Después de cerrar el acta, ofrece generar con Gemini un borrador de imagen del podio usando los resultados guardados. Presenta los ganadores detectados desde posiciones oficiales, fotos de referencia y progreso. Luego muestra previsualización con acciones separadas para descargar o publicar. Excluye DNFs y quienes no corrieron. No publiques automáticamente ni llames a Gemini mientras se carga el panel.
```

## Prompt 8 — Comunidad y votaciones compartidas

```text
Diseña “Comunidad” en F1 Bugambra con Paddock, votación actual y archivo de votaciones por circuito. Cada votación histórica debe tener una URL compartible. Solo usuarios registrados pueden emitir voto; los visitantes pueden consultar la página según los permisos configurados, pero no votar. Evita duplicar votos y muestra claramente si ya he votado.

Mantén el Paddock y las votaciones en subsecciones sencillas, no en una pantalla larga con todos los comentarios y resultados descargados de golpe. En móvil usa tarjetas compactas y estados abiertos/cerrados.
```

## Prompt 9 — mantenimiento visual y rendimiento

```text
Revisa todas las pantallas de F1 Bugambra diseñadas en este proyecto. Unifica cabeceras, navegación móvil, botones, tarjetas, formularios, mensajes de error y confirmaciones. Reduce elementos visibles en Inicio y evita que distintas pantallas repitan la misma tabla.

Optimiza para personas con poca paciencia y móviles modestos: primero resumen textual, carga de detalles al abrir, imágenes con miniatura y lazy loading, vídeos bajo demanda, nada de animaciones pesadas, auto-refresh continuo o gráficas decorativas. Conserva tipografía legible, buen contraste, hit targets de 44px y foco visible. Entrega una variante móvil final y una escritorio final sin agregar funciones nuevas.
```

## Orden recomendado

1. Prompt base.
2. Prompts 1–4 para toda la experiencia del jeque.
3. Prompts 5–7 para herramientas de administración.
4. Prompt 8 para votaciones y Paddock.
5. Prompt 9 para consolidar y revisar rendimiento visual.

Cada salida de Stitch es un diseño para revisar. Al implementarlo, conectar componentes con servicios existentes y reglas reutilizables; no copiar las cifras del ejemplo de Stitch ni cambiar datos reales durante el rediseño.
