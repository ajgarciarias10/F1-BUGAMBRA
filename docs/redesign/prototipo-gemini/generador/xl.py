"""Lee celdas (valor y fórmula) de una hoja de un .xlsx sin dependencias. Uso: xl.py <xlsx> <hoja> <rango A1:M30>"""
import sys, zipfile, re, xml.etree.ElementTree as ET
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
path, hoja, rango = sys.argv[1:4]
z = zipfile.ZipFile(path)
shared = []
if 'xl/sharedStrings.xml' in z.namelist():
    for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
        shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
wb = ET.fromstring(z.read('xl/workbook.xml'))
rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
target = {r.get('Id'): r.get('Target') for r in rels}
sheets = {s.get('name'): target[s.get('{%s}id' % NS['r'])] for s in wb.find('m:sheets', NS)}
if hoja == '?':
    print(list(sheets)); sys.exit()
ws = ET.fromstring(z.read('xl/' + sheets[hoja].lstrip('/').replace('xl/', '')))
def col(s): 
    n = 0
    for ch in s: n = n * 26 + ord(ch) - 64
    return n
a, b = rango.split(':')
ca, ra = re.match(r'([A-Z]+)(\d+)', a).groups(); cb, rb = re.match(r'([A-Z]+)(\d+)', b).groups()
for c in ws.iter('{%s}c' % NS['m']):
    ref = c.get('r'); cc, rr = re.match(r'([A-Z]+)(\d+)', ref).groups()
    if not (col(ca) <= col(cc) <= col(cb) and int(ra) <= int(rr) <= int(rb)): continue
    v = c.find('m:v', NS); f = c.find('m:f', NS)
    val = v.text if v is not None else ''
    if c.get('t') == 's' and val != '': val = shared[int(val)]
    if val == '' and f is None: continue
    print(ref, repr(val), ('= ' + (f.text or '(compartida)')) if f is not None else '')
