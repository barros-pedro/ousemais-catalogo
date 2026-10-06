// Abre cada página gerada num navegador, espera os produtos aparecerem e grava o HTML pronto no arquivo.
// Assim o Google, as prévias de link do WhatsApp e quem abre o site veem o conteúdo na hora.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const TYPES = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.csv':'text/csv; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json'};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(cfg.raiz, p);
  if (!f.startsWith(cfg.raiz)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'});
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const csv = fs.readFileSync(cfg.csv, 'utf8');
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  // a planilha vem da cópia baixada agora; o resto de fora (fontes, vídeos) não é necessário
  await ctx.route(/docs\.google\.com/, r => /gid=1296274691/.test(r.request().url())
    ? r.fulfill({ status: 200, contentType: 'text/csv; charset=utf-8', body: csv }) : r.abort());
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|youtube|ytimg|drive\.google|googleusercontent/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  let n = 0;
  for (const [file, url, ids] of cfg.paginas) {
    await page.goto(base + url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-ready="1"]', { timeout: 20000 });
    const parts = await page.evaluate(ids => Object.fromEntries(ids.map(i => {
      const el = document.getElementById(i); if (!el) return [i, ''];
      const c = el.cloneNode(true);
      c.querySelectorAll('[data-wired]').forEach(x => x.removeAttribute('data-wired'));
      c.querySelectorAll('.rs-nav').forEach(x => x.remove());
      c.querySelectorAll('.rs').forEach(w => w.replaceWith(...w.childNodes));
      c.querySelectorAll('[data-rw]').forEach(x => x.removeAttribute('data-rw'));
      return [i, c.innerHTML.trim()];
    })), ids);
    const fp = path.join(cfg.raiz, file);
    let h = fs.readFileSync(fp, 'utf8');
    for (const i of ids) h = h.replace(`<!--pre:${i}-->`, () => parts[i] || '');
    if (url === '/') {
      const ld = await page.$eval('#ld-products', e => e.textContent).catch(() => '');
      if (ld) h = h.replace('</head>', () => '<script type="application/ld+json" id="ld-products">' + ld.replace(/</g, '\\u003c') + '</script>\n</head>');
    }
    fs.writeFileSync(fp, h); n++;
  }
  await b.close(); server.close();
  if (errs.length) { console.error('erros no navegador:', errs); process.exit(1); }
  console.log('prerender ok:', n, 'páginas');
})().catch(e => { console.error(e); process.exit(1); });
