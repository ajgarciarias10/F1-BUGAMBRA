// Run in the SIGNED-IN prototype page (DevTools console, or as a bookmarklet).
// Produces ONE self-contained prototype.html (CSS, images, fonts inlined; scripts removed
// so the saved snapshot shows the rendered design, not an empty app shell).
(async () => {
  const toDataURL = async (url) => {
    try {
      const r = await fetch(url, { credentials: 'include' });
      const b = await r.blob();
      return await new Promise((res) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.readAsDataURL(b);
      });
    } catch { return url; }
  };
  const inlineCssUrls = async (css, base) => {
    const re = /url\(\s*(['"]?)(?!data:)([^'")]+)\1\s*\)/g;
    const found = [...css.matchAll(re)];
    for (const m of found) {
      const abs = new URL(m[2], base).href;
      css = css.split(m[0]).join(`url("${await toDataURL(abs)}")`);
    }
    return css;
  };

  const doc = document.documentElement.cloneNode(true);

  // Stylesheets -> <style>
  for (const link of [...doc.querySelectorAll('link[rel~="stylesheet"]')]) {
    try {
      const href = new URL(link.getAttribute('href'), location.href).href;
      let css = await (await fetch(href, { credentials: 'include' })).text();
      css = await inlineCssUrls(css, href);
      const st = document.createElement('style');
      st.textContent = css;
      link.replaceWith(st);
    } catch { /* keep link */ }
  }
  // Adopted/inline styles already in <style> keep their url()s
  for (const st of doc.querySelectorAll('style')) {
    st.textContent = await inlineCssUrls(st.textContent, location.href);
  }
  // Images
  for (const img of doc.querySelectorAll('img[src]')) {
    img.src = await toDataURL(new URL(img.getAttribute('src'), location.href).href);
    img.removeAttribute('srcset');
  }
  // Remove scripts / preloads so the snapshot is static
  doc.querySelectorAll('script, link[rel=preload], link[rel=modulepreload]').forEach((n) => n.remove());

  const html = '<!DOCTYPE html>\n' + doc.outerHTML;
  const file = new File([html], 'prototype.html', { type: 'text/html' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: 'prototype.html' }); // iPhone: Save to Files / AirDrop
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = 'prototype.html';
    a.click();
  }
  console.log('Exported', (html.length / 1024).toFixed(0), 'KB');
})();
