# Transcripción del Excel · Split 2

Registro de los datos que se transcribieron a mano del Excel de temporada para cargar el
Split 2. El panel que los escribía (`Split2Loader`) se retiró una vez cargado el bloque;
esto queda como la única copia en el repositorio.

Los puntos **ya incluyen el +2 de la pole**. Las posiciones de carrera se despejaban
restando ese +2 al poleman y buscando el resultado en la escala `16, 13, 11, 9, 8, 7, 6,
5, 4, 3, 2, 1`; un piloto con 0 puntos, o un poleman con 2 justos, es un abandono.

Las carreras del Split 2 son la 7 a la 12 de la temporada.

## Calendario

| # | Circuito | Pole | Vuelta rápida |
|---|---|---|---|
| 7 | Canadá | Moles | Fabi |
| 8 | Mónaco | Carlos | Fabi |
| 9 | Barcelona | Pabliyo | Jota |
| 10 | Austria | Jota | Mimic |
| 11 | Gran Bretaña | Pabliyo | Carlos |
| 12 | Bélgica | Moles | Mimic |

La vuelta rápida de Jota es una de las tres que la hoja daba a Mimic: el formato (morado)
no viaja en ninguna exportación y se repartió 2 y 2 para que Alfa Romero recibiera la única
suya de la temporada. Mover cuál es no cambia ningún saldo.

## Pilotos

| Piloto | Escudería | Precio | Operación | Canadá | Mónaco | Barcelona | Austria | Gran Bretaña | Bélgica | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Jose | Zenith | 96M | mantener | 9 | 16 | 9 | 11 | 16 | 7 | 68 |
| Mimic | Zenith | 72.8M | clausula | 13 | 8 | 7 | 16 | 7 | 13 | 64 |
| Carlos | Zenith | 61.5M | subasta | 8 | 2 | 13 | 9 | 11 | 11 | 54 |
| Mesa | Zenith | -5M | subasta | 0 | 0 | 0 | 3 | 0 | 0 | 3 |
| Jota | Alfa Romero | 47.1M | clausula | 16 | 11 | 8 | 15 | 4 | 8 | 62 |
| Moles | Alfa Romero | 30.5M | clausula | 13 | 13 | 11 | 0 | 8 | 7 | 52 |
| Pinilla | Alfa Romero | 0.4M | subasta | 0 | 0 | 0 | 4 | 3 | 6 | 13 |
| Aparicio | Alfa Romero | -42M | clausula | 0 | 0 | 0 | 0 | 0 | 3 | 3 |
| Fabi | Roses | 68.4M | clausula | 7 | 3 | 0 | 8 | 9 | 16 | 43 |
| Toni | Roses | 42M | subasta | 0 | 0 | 0 | 6 | 6 | 4 | 16 |
| Samu | Roses | 5M | subasta | 6 | 2 | 0 | 0 | 0 | 2 | 10 |
| Pabliyo | Roses | 1.5M | mantener | 0 | 0 | 18 | 7 | 15 | 9 | 49 |

## Escuderías

Poles, vueltas rápidas, carreras sin sancionados y participaciones son **acumulados de
temporada**: al Split 2 le correspondía lo que no estuviera ya imputado al Split 1.

| Escudería | Canadá | Mónaco | Barcelona | Austria | Gran Bretaña | Bélgica | Total | Poles | V.ráp. | Sin sanc. | Partic. | Rivalidades | Ajuste riv. | Ajuste premios | Saldo esperado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Zenith | 30 | 26 | 29 | 39 | 34 | 31 | 189 | 3 | 7 | 9 | 12 | 43.5M | -10M | -20M | 163.1M |
| Alfa Romero | 29 | 24 | 19 | 19 | 15 | 24 | 130 | 4 | 1 | 7 | 12 | 37M | -10M | -15M | 165.2M |
| Roses | 13 | 5 | 18 | 21 | 30 | 31 | 118 | 5 | 4 | 5 | 12 | 23M | -4M | -10M | 115.9M |

## Fórmula del saldo

```text
ingresos = puntos*0,1 + poles*2 + vueltas_rápidas*1 + sin_sancionados*3 + participaciones*4 + rivalidades
saldo    = apertura + ingresos - fichajes - ajuste_rivalidades - ajuste_premios
```

La apertura era el cierre conciliado del Split 1. Sin él, se despejaba desde el saldo
esperado para que el bloque cuadrase igualmente.

El saldo esperado de Zenith (163,1M) es el número que no cuadra con el resto de la
contabilidad: ver [incongruencia-zenith.md](incongruencia-zenith.md).
