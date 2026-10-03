// Coloca a lista de produtos já pronta no HTML (Google e prévias leem sem precisar rodar o JavaScript)
const { chromium } = require('playwright'); const fs = require('fs');
const [,, url, out] = process.argv;
(async()=>{
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route(/docs\.google\.com|fonts\.(googleapis|gstatic)/, r=>r.abort());
  await p.goto(url); await p.waitForTimeout(1500);
  const grid = await p.$eval('#grid', e=>e.innerHTML.trim());
  const ld = await p.$eval('#ld-products', e=>e.textContent);
  const n = await p.$$eval('#grid .card, #grid article', x=>x.length);
  await b.close();
  let h = fs.readFileSync(out,'utf8');
  if (!h.includes('<div class="grid" id="grid"></div>')) throw new Error('grid vazio não encontrado');
  h = h.replace('<div class="grid" id="grid"></div>', '<div class="grid" id="grid">'+grid+'</div>');
  h = h.replace('</head>', '<script type="application/ld+json" id="ld-products">'+ld.replace(/</g,'\\u003c')+'</script>\n</head>');
  fs.writeFileSync(out, h); console.log('prerender ok', n, 'cards', grid.length, 'chars');
})();
