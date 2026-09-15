# Mercado y bienvenidas por split

## Uso del administrador

En **Admin → Datos y mantenimiento → Mercado y subasta**:

1. Selecciona el split.
2. Activa **Ventana de fichajes** para permitir operaciones.
3. Activa **Subasta en vivo** para mostrar las pujas, o desactívala para usar fichajes directos.
4. Realiza los traspasos o adjudica las pujas reales.

La sala aparece aquí únicamente cuando la subasta está activada y el split está en preparación. El botón **Comenzar split** está en el bloque **Temporada**, tanto para subastas como para fichajes directos. Para crear otro split, pulsa **Preparar siguiente split o temporada**; el formulario se carga en ese momento.

## Organización del administrador

- **Carreras:** programación, resultados, cierre del acta y liquidación económica. Reabrir, revertir, deshacer y recalcular están agrupados en «Corregir una carrera o recalcular el split».
- **Economía y fichajes:** presupuestos, contratos y traspasos.
- **Rivalidades:** único editor de los grupos manuales del split.
- **Equipos y usuarios:** escuderías, cuentas y roles. Las fotos y escudos se editan en un bloque desplegable.
- **Vídeos:** presentaciones de los splits.
- **Sugerencias:** propuestas de la comunidad.
- **Datos y mantenimiento:** split destacado, interruptores de mercado y subasta, inicio y preparación de splits.

Se han retirado de la interfaz las herramientas de importación de Origins, revisión de Excel, exploración de Firestore, trayectoria de OVR y copia de imágenes entre bases. También se ha eliminado el reset genérico de circuitos, la configuración duplicada de rivalidades y los controles de mercado repetidos en equipos. Los componentes técnicos retirados no se importan ni se montan desde el panel.

Mientras un administrador tenga abierta la web, se revisan los mercados abiertos cada diez segundos. También funciona al navegar a la portada o al panel personal. Si se cierra la web, la revisión se reanuda al volver a abrirla con una cuenta administradora: no es un proceso desplegado en el servidor.

## Regla de finalización

- Cada equipo recibe una publicación de bienvenida al completar su plantilla.
- Las escuderías no tienen límite de pilotos. El administrador marca manualmente cada plantilla como completa cuando decide cerrar su composición; esa confirmación es la que permite cerrar el mercado y preparar las bienvenidas.
- Los agentes libres y los pilotos con `participa_hasta` definido no ocupan plazas de equipo. Un fichaje gratuito sí ocupa plaza.
- Cuando **todos** los equipos del split están completos, se guarda `fichajes_abiertos: false` y `mercado_cerrado_por_plantillas: true`.
- Ese split desaparece del selector de Mercado. Si el usuario estaba consultándolo, pasa al Paddock. Otros splits con mercado disponible siguen accesibles.
- La bienvenida se publica una sola vez por equipo y split, con ID `welcome_{splitId}_{teamId}`. Es un anuncio del momento de completar el equipo, no una plantilla editable.
- Las subastas en curso y los simulacros con movimientos pendientes de deshacer no generan anuncios ni cierres.
- No se inicia la temporada automáticamente. Eso sigue siendo una acción del administrador.

La publicación y el cierre se guardan en una transacción de Firestore. Se mantienen los permisos existentes: solo el administrador puede publicar como Paddock y cerrar splits.

## Fichajes entre splits (columna de traspasos)

La columna de fichajes de **Economía y fichajes** es solo de lectura: nunca escribe ni reconstruye los campos `pending_*` en Firestore, porque esos mismos campos gobiernan los cargos y las devoluciones de presupuesto.

Para cada piloto del split seleccionado se busca su ficha en el split siguiente (ignorando las que tienen `participa_hasta`) y se muestra uno de estos estados:

- **Pactado desde este split:** hay `pending_equipoId` y `pending_precio_compra` en la ficha actual, pero el destino aún no coincide con lo guardado en el split siguiente.
- **Registrado:** el pacto ya está aplicado, o el piloto tiene ficha con equipo y precio en el split siguiente aunque no quedara rastro del pacto anterior.
- **Pendiente:** en el split siguiente el piloto sigue en agentes libres con un pacto anotado; todavía no forma parte del equipo de destino.
- **Sin registro de destino:** no existe ficha suya en el split siguiente.

Antes solo se leían las marcas de traspaso del propio split, así que un fichaje ya aplicado en el split siguiente desaparecía de la tabla. En el Split 2 eso dejaba visible únicamente a Jota.

La palabra bajo el precio describe la operación, no el estado del campo `congelado`: **pactado** si el pacto sigue sin aplicarse, **fichado** si ya está registrado en el split siguiente y **pendiente** si el piloto continúa en agentes libres. Antes solo se escribía «pactado» en las fichas congeladas, así que los traspasos ya aplicados parecían no haber ocurrido.

Cuando una ficha conserva su pacto y además el traspaso ya está registrado en el split siguiente, la fila avisa de que ese pacto **sigue reservando presupuesto en este split**. Es un resto de una operación aplicada a medias y hay que deshacerlo desde la propia fila.

Los precios se muestran con su signo tal y como están guardados. Un precio negativo indica un dato económico que hay que revisar en el split, no un error de la tabla.

## Deshacer un fichaje

Al pactar un traspaso se guarda en la ficha del split actual, en `pending_fichas_previas`, una copia de dónde estaba el piloto en el split siguiente antes del pacto. Deshacer restaura esa copia tal cual.

Antes, deshacer borraba la ficha del equipo de destino y **siempre** creaba una nueva en el equipo de origen con el precio del split actual. Si el piloto venía de agentes libres o todavía no tenía ficha allí, se le inventaba un contrato que la tabla mostraba como «Renovado». Además solo miraba el equipo del pacto, así que las copias en otros equipos sobrevivían y el piloto quedaba duplicado en el split.

Ahora, al deshacer:

- Se anula el pacto y se devuelve el importe al presupuesto del equipo que fichaba.
- Se borran **todas** las fichas del piloto en el split siguiente, no solo la del equipo del pacto.
- Se restaura exactamente la copia guardada. Si antes no tenía ficha, se queda fuera: no se le inventa ningún equipo.
- Si el pacto es anterior a este cambio y no hay copia guardada, se le retira del split siguiente y el registro de procesos avisa de que hay que colocarlo a mano.
- La operación pide confirmación y explica lo que va a pasar.

La decisión está en `apps/web/src/utils/revertFichaje.ts`, separada de Firestore para poder probarla.

## Liberar a un piloto, y dónde vive el dinero

Cada fila de **Economía y fichajes** tiene la acción **liberar**: saca al piloto de su escudería y lo deja como agente libre en ese mismo split, con precio 0 y sin pacto. Es la única forma de corregir una ficha mal puesta. Antes no existía: si el piloto no tenía pacto pendiente, el botón de la fila solo llevaba al split siguiente, y la papelera aparecía únicamente en las fichas legacy.

**Liberar no mueve dinero, y es deliberado.** En este modelo el gasto va atado al **pacto**, no a la ficha:

- Pactar un fichaje cobra al equipo de destino.
- Deshacer ese pacto le devuelve exactamente lo cobrado.
- Mover una ficha de sitio no cobra ni devuelve nada.

Cobrar o devolver el `precio_compra` al liberar inventaría un movimiento que nadie hizo: una ficha puede estar mal puesta sin que se haya pagado jamás por ella. El presupuesto «anterior a los acuerdos» de un split es su presupuesto heredado íntegro, y se recupera deshaciendo los pactos, no tocando plantillas.

El presupuesto guardado del equipo es la única fuente de verdad. Se calculaba además, en paralelo, como `inicial − coste de la plantilla − pactos entrantes`, y eso cobraba dos veces: el inicial es el presupuesto **heredado**, o sea lo que quedó después de pagar a esa plantilla en el split anterior. Con ese cálculo, el presupuesto anterior a cualquier acuerdo ya aparecía con el coste de cada fichaje restado, y al editar el precio de un piloto la resta se guardaba en la base. Ahora solo se aplica la diferencia del precio editado.

La regla del signo vive en `apps/web/src/utils/presupuesto.ts`, con pruebas, para que cobrar y devolver no puedan discrepar.

## Verificación manual en un split de prueba

1. Abre Datos y mantenimiento y prueba ambos interruptores. Recarga: deben conservar su estado y mostrar el split correcto.
2. Con dos equipos incompletos, completa uno. Debe aparecer una bienvenida con sus pilotos; el otro debe poder seguir fichando.
3. Completa el segundo. En la siguiente revisión debe cerrarse únicamente ese split y desaparecer de Mercado.
4. Recarga o abre dos sesiones admin: no deben duplicarse las bienvenidas.
5. Repite una adjudicación en modo simulacro: no debe anunciar el equipo ni cerrar el mercado.
6. Comprueba la navegación móvil, la guía de portada y los botones para empezar un mensaje en el Paddock.

## Comprobaciones locales

```sh
corepack npm run typecheck
node --import tsx --test apps/web/src/utils/*.test.ts
corepack npm run build
```
