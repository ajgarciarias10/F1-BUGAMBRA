(function(){
  const key='bugambra-theme';
  let selected='light';
  try{const stored=localStorage.getItem(key);if(stored==='dark'||stored==='light')selected=stored}catch{}
  function applyTheme(){
    document.documentElement.dataset.theme=selected;
    document.documentElement.style.colorScheme=selected;
    const light=document.getElementById('light-theme');
    if(light)light.disabled=selected==='dark';
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',selected==='dark'?'#0b1120':'#f3f6fa');
    const button=document.getElementById('theme-toggle');
    if(button){
      const label=selected==='dark'?'Activar tema claro':'Activar tema oscuro';
      button.setAttribute('aria-label',label);
      button.setAttribute('aria-pressed',String(selected==='dark'));
      button.title=label;
      button.innerHTML=selected==='dark'?'<span aria-hidden="true">☀</span>':'<span aria-hidden="true">☾</span>';
    }
  }
  window.toggleSiteTheme=function(){selected=selected==='light'?'dark':'light';applyTheme();try{localStorage.setItem(key,selected)}catch{}};
  applyTheme();
  document.addEventListener('DOMContentLoaded',applyTheme);
  window.addEventListener('storage',function(event){if(event.key===key){selected=event.newValue==='dark'?'dark':'light';applyTheme()}});
})();
