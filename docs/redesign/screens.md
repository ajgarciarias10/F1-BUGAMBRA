# Recorrido para revisar el prototipo

Abre [prototype/index.html](prototype/index.html) y sigue los enlaces, o añade el hash de la tabla. Todos los datos son ficticios. Puedes activar **Revisar** en cualquier ruta: toca un elemento o delimita un área y deja una nota; el panel exporta Markdown o JSON. El JSON registra hash, tema, ventana, caja relativa, selector, texto, nota, etiquetas, importancia y fecha; el detalle del formato está en [README.md](README.md#modo-revisar).

| Área | Ruta | Qué mirar |
| --- | --- | --- |
| Pública | `#portada` | Próximo GP, imágenes editoriales ficticias sin canaletas, aviso oficial, clasificación, instalación y cabecera con menú a la izquierda. |
| Pública | `#login` | Composición editorial mínima, Google de muestra sobre correo y entrada sin cuenta. |
| Pública | `#registro` | Nombre, Google de muestra y formulario de correo; ninguna opción inicia autenticación real. |
| Pública | `#instalar` | Instrucciones por plataforma y aclaración de la demo. |
| Jeque | `#inicio` | Próxima carrera, métricas y lectura rápida del acta; probar el misma cabecera y menú lateral que en la portada; estados de carga, vacío y error. |
| Jeque | `#escuderia` | Retratos ilustrativos de pilotos, saldo solo lectura, libro con ocho fuentes identificables y error sin cero ficticio. |
| Jeque | `#campeonato` | Posiciones y gráfico de tendencia, legibles en móvil. |
| Jeque | `#carreras` | Estados separados de DNF, No corrió y Desconocida; decisiones FIA. |
| Jeque | `#telemetria` | Selector de circuito, miniatura y Play, más estados honestos «sin datos». |
| Jeque | `#comunidad` | Paddock editorial y acceso a participación. |
| Jeque | `#comunidad-votacion` | Opciones de voto y confirmación de demo. |
| Jeque | `#comunidad-archivo` | Entradas de archivo y enlace para compartir. |
| Jeque | `#mercado` | Anuncio por WhatsApp y registro administrativo posterior; sin controles de fichaje. |
| Jeque | `#equipos` | Pulsa una escudería: el listado se convierte en un detalle amplio con imagen local, pilotos retratados, puntos, media de llegada y mejor resultado ficticios. |
| Jeque | `#perfil` | Identidad, rol y preferencias visuales. |
| Jeque | `#buzon` | Formulario de mejora y acceso al modo Revisar. |
| Admin | `#admin-inicio` | Área distinta, cola de trabajo y avisos de revisión. |
| Admin | `#admin-carrera` | Antes/después del acta; qué liquidación revertir primero. |
| Admin | `#admin-economia` | Cambia 11 por 25 para ver fondos insuficientes; 8 muestra sin cambio; 6, devolución. Motivo, asiento, auditoría y guardado simulado. |
| Admin | `#admin-media` | Play explícito, vista previa del borrador y descarga/publicación separadas. |
| Admin | `#admin-usuarios` | Roles y límites de acciones de cuenta. |
| Sistema | `#sistema` | Botones, campos, avisos, vacío, carga, error, modal y toast; el menú lateral global también funciona aquí. |

El botón ☰ abre el mismo menú lateral en móvil y escritorio; incluye las 22 rutas, sin enlaces muertos. El selector de tema permite **Sistema**, **Claro** y **Oscuro**; conviene revisar al menos una página pública, una de jeque, una de admin y `#sistema` en 390 px y 1440 px. Las marcas se vuelven a colocar al redimensionar o volver a una ruta.

El menú lateral se comprueba en una ruta pública, una de jeque y una de administración. Usa el botón ☰, M o Tab fuera de campos, doble clic/toque en el fondo, flechas e Intro; cierra con Escape, M, Tab o toque exterior. Con **Revisar** activo, el gesto no debe interferir con las marcas. En todas las rutas, revisa también la franja final con **Cargando**, **Sin datos** y **Error**; son estados de muestra, no resultados de una petición.
