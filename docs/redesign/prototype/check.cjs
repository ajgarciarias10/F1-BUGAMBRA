/* Headless smoke checks for the static prototype; run with node check.cjs. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=__dirname;
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [,src] of index.matchAll(/\b(?:src|href)="([^"]+)"/g))if(!src.startsWith('#'))assert.ok(fs.existsSync(path.join(root,src)),`index.html: missing ${src}`);
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
for(const [,src] of css.matchAll(/url\(["']?(assets\/[^)"']+)/g))assert.ok(fs.existsSync(path.join(root,src)),`styles.css: missing ${src}`);
function palette(selector){
  const block=css.split(selector)[1]?.split('}')[0];
  assert.ok(block,`missing ${selector} tokens`);
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map(([,key,value])=>[key,value.toLowerCase()]));
}
function luminance(hex){
  const [r,g,b]=hex.slice(1).match(/../g).map(part=>parseInt(part,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return .2126*r+.7152*g+.0722*b;
}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function requireContrast(tokens,front,back,minimum,theme){
  assert.ok(contrast(tokens[front],tokens[back])>=minimum,`${theme}: ${front}/${back} below ${minimum}:1`);
}
for(const [theme,tokens] of [['claro',palette(':root {')],['oscuro',palette(':root[data-theme="dark"] {')]]){
  assert.ok(new Set(Object.values(tokens)).size<=7,`${theme}: more than seven UI colours`);
  for(const background of ['paper','surface','tint']){
    for(const foreground of ['ink','muted'])requireContrast(tokens,foreground,background,4.5,theme);
    for(const foreground of ['line','brand'])requireContrast(tokens,foreground,background,3,theme);
  }
  requireContrast(tokens,'paper','ink',4.5,theme);
  requireContrast(tokens,'brand-ink','brand',4.5,theme);
}
assert.throws(()=>requireContrast(palette(':root {'),'ink','ink',4.5,'control'),'negative control: indistinguishable text');
const reviewContext={module:{exports:{}}};
vm.createContext(reviewContext);
vm.runInContext(fs.readFileSync(path.join(root,'review.js'),'utf8'),reviewContext,{filename:'review.js'});
const review=reviewContext.module.exports;
const mark={id:'review-1',route:'#admin-economia',theme:'dark',viewport:{width:390,height:844},rect:{x:.1,y:.2,w:.3,h:.4},pageRect:{x:.2,y:.3,w:.1,h:.2},selector:'#main > section:nth-of-type(1)',elementText:'Antes / después',note:'El contraste necesita revisión',tags:['Cambiar color','Mover'],severity:'importante',timestamp:'2026-10-20T12:00:00.000Z'};
const restored=review.parseJSON(review.serialize([mark]));
assert.equal(restored.length,1);
assert.deepEqual(JSON.parse(JSON.stringify(restored[0])),mark);
assert.match(review.markdown(restored),/## #admin-economia/);
assert.match(review.markdown(restored),/El contraste necesita revisión/);
assert.match(review.markdown(restored),/Cambiar color, Mover/);
assert.throws(()=>review.parseJSON('{"annotations":[{"route":"#inicio"}]}'));
assert.equal(review.parseJSON('{"annotations":[]}').length,0);

assert.match(index,/id="radial-menu" role="menu" aria-label="Menú lateral"/);
assert.match(css,/#radial-menu\{[^}]*left:0[^}]*background:var\(--paper\)/);
assert.throws(()=>assert.match(index.replace('id="radial-menu" role="menu"',''),/id="radial-menu" role="menu"/),'negative control: missing global radial layer');
const elements=new Map();
let reviewFlag=false;
function element(id){if(!elements.has(id)){const classes=new Set();elements.set(id,{id,value:({"price-old":"8","price-new":"11","price-balance":"12","price-reason":""})[id]||'',innerHTML:'',textContent:'',disabled:false,hidden:['radial-menu','radial-backdrop','team-detail'].includes(id),classList:{add(name){classes.add(name)},remove(name){classes.delete(name)},toggle(name,force){if(force===true)classes.add(name);else if(force===false)classes.delete(name);else if(classes.has(name))classes.delete(name);else classes.add(name)},contains(name){return id==='review-root'&&reviewFlag||classes.has(name)}},style:{setProperty(){}},focus(){doc.activeElement=this},close(){},setAttribute(name,value){this[name]=value},querySelector(){return element('focus-target')},querySelectorAll(){return [...this.innerHTML.matchAll(/<a role="menuitem" href="#([^"]+)/g)].map(([,route])=>({route,focus(){doc.activeElement=this},getAttribute(name){return name==='role'?'menuitem':null},click(){location.hash='#'+route;listeners.hashchange()}}))}});}return elements.get(id)}
const listeners={};
const documentListeners={};
const location={hash:'#portada'};
const doc={body:{className:'',dataset:{}},activeElement:null,documentElement:{dataset:{}},title:'',getElementById:element,addEventListener(name,fn){if(!documentListeners[name])documentListeners[name]=[];documentListeners[name].push(fn)}};
const window={addEventListener(n,fn){listeners[n]=fn},dispatchEvent(){},scrollTo(){}};
const context={document:doc,window,location,innerWidth:1440,innerHeight:900,requestAnimationFrame(){},localStorage:{getItem(){return null},setItem(){}},matchMedia(){return {matches:false,addEventListener(){}}},CustomEvent:class{constructor(n,o){this.type=n;this.detail=o?.detail}},setTimeout,clearTimeout,Intl,Number,Math};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context,{filename:'app.js'});
const routes=Object.keys(window.BugambraPrototype.routes);
const documentedRoutes=[...fs.readFileSync(path.join(root,'..','screens.md'),'utf8').matchAll(/^\| (?:Pública|Jeque|Admin|Sistema) \| `#([^`]+)` \|/gm)].map(([,route])=>route);
assert.deepEqual([...documentedRoutes].sort(),[...routes].sort(),'screens.md and prototype routes differ');
for(const route of routes){
  location.hash='#'+route;listeners.hashchange();const html=element('app').innerHTML;
  assert.match(html,/<main id="main"/);assert.match(html,/<h1>/);
  assert.match(html,/Todos los nombres, resultados y cifras son ficticios/);
  assert.match(html,/class="screen-states"[\s\S]*CARGANDO[\s\S]*SIN DATOS[\s\S]*ERROR/,`${route}: missing states`);
  for(const [,src] of html.matchAll(/\bsrc="([^"]+)"/g))assert.ok(fs.existsSync(path.join(root,src)),`${route}: missing ${src}`);
  for(const [,href] of html.matchAll(/\bhref="([^"]+)"/g)){
    if(href.startsWith('#'))assert.ok(routes.includes(href.slice(1)),`${route}: dead route ${href}`);
    else assert.ok(fs.existsSync(path.join(root,href)),`${route}: missing link ${href}`);
  }
  const drawer=element('radial-menu').innerHTML;
  for(const destination of routes)assert.ok(drawer.includes(`href="#${destination}"`),`${route}: drawer missing #${destination}`);
  for(const [,href] of drawer.matchAll(/\bhref="#([^"]+)"/g))assert.ok(routes.includes(href),`${route}: dead drawer link #${href}`);
}
location.hash='#registro';listeners.hashchange();const registro=element('app').innerHTML;
assert.match(registro,/class="auth auth-editorial"/);
assert.match(registro,/Continuar con Google[\s\S]*<form id="auth-form"/);
assert.throws(()=>assert.match(registro.replace('Continuar con Google',''),/Continuar con Google/),'negative control: missing Google button');
location.hash='#portada';listeners.hashchange();const portada=element('app').innerHTML;
assert.match(portada,/race-editorial\.svg/);
assert.match(portada,/paddock-editorial\.svg/);
location.hash='#escuderia';listeners.hashchange();assert.match(element('app').innerHTML,/Retrato ilustrativo ficticio de Vega Sol/);
const keyTarget={tagName:'DIV',isContentEditable:false,closest(){return null}};
const keydown=documentListeners.keydown[0];
for(const [route,expected] of [['portada','Portada'],['inicio','Mi escudería'],['admin-inicio','Editar carrera']]){
  location.hash='#'+route;listeners.hashchange();
  assert.match(element('app').innerHTML,/id="radial-trigger"[\s\S]*aria-controls="radial-menu"/);
  assert.match(element('radial-menu').innerHTML,new RegExp(expected));
  let prevented=false;
  keydown({key:'m',target:keyTarget,altKey:false,ctrlKey:false,metaKey:false,preventDefault(){prevented=true}});
  assert.equal(prevented,true,`${route}: M prevents default`);
  assert.equal(element('radial-menu').hidden,false,`${route}: M opens menu`);
  assert.equal(element('radial-backdrop').hidden,false);
  keydown({key:'Escape',target:keyTarget,preventDefault(){}});
  assert.equal(element('radial-menu').hidden,true,`${route}: Escape closes menu`);
}
location.hash='#sistema';listeners.hashchange();
keydown({key:'Tab',target:keyTarget,preventDefault(){}});assert.equal(element('radial-menu').hidden,false);
keydown({key:'Tab',target:keyTarget,preventDefault(){}});assert.equal(element('radial-menu').hidden,true);
keydown({key:'Tab',target:keyTarget,preventDefault(){}});assert.equal(element('radial-menu').hidden,true,'third Tab passes through to page');
const bg={tagName:'MAIN',closest(){return null}};
documentListeners.dblclick[0]({target:bg,clientX:300,clientY:350});assert.equal(element('radial-menu').hidden,false);
keydown({key:'Escape',target:keyTarget,preventDefault(){}});
documentListeners.pointerup[0]({target:bg,pointerType:'touch',clientX:300,clientY:350});
documentListeners.pointerup[0]({target:bg,pointerType:'touch',clientX:303,clientY:352});
assert.equal(element('radial-menu').hidden,false);
keydown({key:'Escape',target:keyTarget,preventDefault(){}});
keydown({key:'m',target:{tagName:'INPUT',isContentEditable:false,closest(){return null}},altKey:false,ctrlKey:false,metaKey:false,preventDefault(){}});
assert.equal(element('radial-menu').hidden,true);
location.hash='#equipos';listeners.hashchange();assert.match(element('app').innerHTML,/data-team="marea"/);
const teamButton={id:'',dataset:{team:'marea'},matches(){return false},hasAttribute(){return false}};
documentListeners.click[1]({target:{closest(selector){return selector==='button'?teamButton:null}}});
assert.equal(element('teams-directory').hidden,true);
assert.equal(element('team-detail').hidden,false);
assert.match(element('team-detail').innerHTML,/Vega Sol[\s\S]*Lia Velo/);
assert.match(element('team-detail').innerHTML,/Media de llegada/);
assert.match(element('team-detail').innerHTML,/3,2/);
for(const [,src] of element('team-detail').innerHTML.matchAll(/\bsrc="([^"]+)"/g))assert.ok(fs.existsSync(path.join(root,src)),`team detail: missing ${src}`);
location.hash='#admin-economia';listeners.hashchange();const p=window.BugambraPrototype;
assert.equal(p.previewModel().delta,30);
assert.equal(p.previewModel().after,90);
element('price-new').value='25';assert.equal(p.previewModel().shortfall,50);
element('price-new').value='6';assert.equal(p.previewModel().delta,-20);
element('price-new').value='-2';assert.equal(p.previewModel().delta,-100);
assert.equal(p.previewModel().after,220);
element('price-new').value='8';assert.equal(p.previewModel().delta,0);
console.log(`OK: ${routes.length} documented routes reachable from drawer; no dead links; loading/empty/error per screen; both palettes meet contrast; review JSON/Markdown and prototype interactions.`);
