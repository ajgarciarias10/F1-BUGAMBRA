"""Saca de las celdas volcadas de Origins una tabla por carrera: banderas 1/0, puntos estándar, extra, rivalidad."""
import sys, re, json
cells = {}
for line in open(sys.argv[1], encoding='utf-8'):
    m = re.match(r"(\w+?)(\d+) '(.*?)'", line, re.S)
    if m: cells[(m.group(1), int(m.group(2)))] = m.group(3)
def colnum(c):
    n = 0
    for ch in c: n = n * 26 + ord(ch) - 64
    return n
def colname(n):
    s = ''
    while n: n, r = divmod(n - 1, 26); s = chr(65 + r) + s
    return s
carreras = [('Silverstone', 'L', 2), ('Baréin', 'L', 15), ('Monza', 'Y', 2), ('Montmeló', 'Y', 15), ('Mónaco', 'AL', 2), ('Canadá', 'AL', 15)]
campos = ['limpio', 'terminar', 'pole', 'vr', 'pilotoDia', 'racha', 'estandar', 'extra', 'rivalidad', 'puntosPiloto', 'puntosEquipo']
out = []
for i, (nombre, c0, r0) in enumerate(carreras):
    filas = []
    for r in range(r0, r0 + 10):
        quien = cells.get((c0, r), '').strip()
        f = {'piloto': quien}
        for k, campo in enumerate(campos):
            v = cells.get((colname(colnum(c0) + 1 + k), r), '0')
            f[campo] = float(v) if v.replace('.', '', 1).replace('-', '', 1).isdigit() else v
        filas.append(f)
    out.append({'n': i + 1, 'circuito': nombre, 'doble': i == 5, 'filas': filas})
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
for c in out:
    print(c['n'], c['circuito'], sorted([int(f['estandar']) for f in c['filas']], reverse=True))
