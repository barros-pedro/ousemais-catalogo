#!/usr/bin/env python3
"""Gera o site da Ouse Mais a partir da planilha publicada pelo painel.

Saída (na raiz do repositório):
  /index.html                     página inicial
  /<categoria>/index.html         uma página por categoria (ex.: /lubrificantes/)
  /<categoria>/<produto>/index.html  uma página por produto (ex.: /lubrificantes/love-lub-hot/)
  /404.html                       monta na hora páginas de produtos novos que ainda não foram gerados
  /assets/loja.css, /assets/loja.js, /dados/catalogo.csv, /sitemap.xml

Uso:  python3 _fonte/build.py            (baixa a planilha; se não conseguir, usa _fonte/dados/catalogo.csv)
      python3 _fonte/build.py --sem-prerender   (pula o passo que deixa o HTML pronto para o Google)
Roda sozinho no GitHub Actions (.github/workflows/atualizar-site.yml).
"""
import csv, hashlib, html, io, json, os, re, shutil, subprocess, sys, unicodedata, urllib.request

FONTE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(FONTE)
S = os.path.join(FONTE, 'site')
SITE = "https://ousemaisoficial.com.br/"
MARCA = 'data-gerado="ouse"'          # páginas geradas aqui (as outras nunca são apagadas)
ESPECIAIS = {"vibrador-curvo"}        # produtos com página de venda feita à mão: o gerador não sobrescreve

e = lambda s: html.escape(str(s or ''), quote=True)
rd = lambda p: open(p, encoding='utf-8').read()
def wr(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(s)
def norm(s):
    return unicodedata.normalize('NFD', str(s or '')).encode('ascii', 'ignore').decode().lower().strip()
def slug(s):
    return re.sub(r'^-|-$', '', re.sub(r'[^a-z0-9]+', '-', norm(s)))

CATS = json.load(open(os.path.join(S, 'categorias.json'), encoding='utf-8'))
JS = rd(os.path.join(S, 'loja.js'))
CSS = rd(os.path.join(S, 'loja.css'))
CAT_URL = re.search(r'catalogo:\s*"([^"]+)"', JS).group(1)

# ---------------- 1. dados ----------------
COPIA = os.path.join(FONTE, 'dados', 'catalogo.csv')
def baixar():
    try:
        req = urllib.request.Request(CAT_URL, headers={'User-Agent': 'ouse-build'})
        t = urllib.request.urlopen(req, timeout=40).read().decode('utf-8')
        rows = list(csv.reader(io.StringIO(t)))
        if len(rows) > 1 and norm(rows[0][0]).startswith('codigo'):
            return t
        print('aviso: planilha veio vazia ou em formato inesperado')
    except Exception as ex:
        print('aviso: não consegui baixar a planilha (%s); usando a cópia salva' % ex)
    return None
t = baixar()
if t:
    if not os.path.exists(COPIA) or rd(COPIA) != t: wr(COPIA, t)
else:
    t = rd(COPIA)
ROWS = list(csv.reader(io.StringIO(t)))

def num(v):
    v = re.sub(r'[^\d,.-]', '', str(v or ''))
    if not v or v == '-': return None
    if ',' in v: v = v.replace('.', '').replace(',', '.')
    try: n = float(v)
    except ValueError: return None
    return n if n > 0 else None
def url_ok(u):
    return u if re.match(r'^https://[^\s"\'<>`\\]+$', u) or (re.match(r'^img/[\w./-]+$', u) and '..' not in u) else ''
clean = lambda v: re.sub(r'[<>]', '', str(v or '')).replace('"', '”').replace('`', "'").strip()

head = [norm(h) for h in ROWS[0]]
def ci(pat):
    for i, h in enumerate(head):
        if re.match(pat, h): return i
    return -1
I = {k: ci(p) for k, p in dict(id=r'^codigo', tipo=r'^tipo', cat=r'^categoria', name=r'^produto', brand=r'^marca', tag=r'^selo',
     desc=r'^descricao', specs=r'^detalhes', items=r'^itens', img=r'^foto$', imgFull=r'^foto ampliada', price=r'^preco$',
     old=r'^preco antigo', qty=r'^quantidade', avail=r'^disponivel', show=r'^mostrar', opts=r'^opcoes').items()}
g = lambda r, k: clean(r[I[k]]) if I[k] >= 0 and I[k] < len(r) else ''

PRODS = []
for r in ROWS[1:]:
    pid, name = g(r, 'id'), g(r, 'name')
    if not pid or not name or not re.match(r'^[\w-]+$', pid) or norm(g(r, 'show')).startswith('n'): continue
    lab = g(r, 'cat')
    c = next((x for x in CATS if norm(x['label']) == norm(lab)), None)
    if not c and slug(lab):  # categoria nova criada no painel
        c = {"id": slug(lab), "slug": slug(lab), "label": lab, "title": lab, "intro": "",
             "desc": f"{lab} da Ouse Mais. Embalagem sigilosa e pedido pelo WhatsApp, em Campestre/AL."}
        CATS.append(c)
    c = c or next(x for x in CATS if x['id'] == 'cuidados')
    q = g(r, 'qty'); qn = num(q) if q not in ('', '0') else (0 if q == '0' else None)
    p = dict(id=pid, name=name, cat=c['id'], brand=g(r, 'brand'), desc=g(r, 'desc'),
             specs=[s.strip() for s in g(r, 'specs').split(',') if s.strip()], img=url_ok(g(r, 'img')), imgFull=url_ok(g(r, 'imgFull')),
             price=num(g(r, 'price')), qty=qn, items=[s.strip() for s in g(r, 'items').split(',') if s.strip()],
             kit=norm(g(r, 'tipo')) == 'kit' or bool(g(r, 'items')))
    p['soldOut'] = norm(g(r, 'avail')).startswith('n') or p['qty'] == 0
    PRODS.append(p)
BY = {p['id']: p for p in PRODS}
for p in PRODS:
    if p['kit']: p['items'] = [i for i in p['items'] if i in BY and not BY[i]['kit']]
CAT = {c['id']: c for c in CATS}
abs_img = lambda u: (SITE + u) if u.startswith('img/') else u
def img_of(p):
    if p['img']: return abs_img(p['img'])
    if p['kit'] and p['items']: return img_of(BY[p['items'][0]])
    return SITE + f"img/{p['id']}.jpg"
purl = lambda p: f"/{CAT[p['cat']]['slug']}/{p['id']}/"
curl = lambda c: f"/{c['slug']}/"
GENERIC = {'moda íntima', 'vibrador', 'kit ouse mais'}
def brand_ok(p): return p['brand'] and p['brand'].lower() not in GENERIC and p['brand'] not in p['name']
print(f'{len(PRODS)} produtos, {len({p["cat"] for p in PRODS})} categorias com produtos')

# cor de fundo de cada produto (tom pastel tirado da própria foto) para as caixas de categoria
def cor_da_foto(path):
    try:
        from PIL import Image
        import colorsys
        im = Image.open(path).convert('RGB'); im.thumbnail((80, 80)); W, H = im.size; px = list(im.getdata())
        borda = [im.getpixel((x, y)) for x in range(W) for y in (0, H - 1)] + [im.getpixel((x, y)) for y in range(H) for x in (0, W - 1)]
        branco = sum(1 for r, g, b in borda if min(r, g, b) > 235) / len(borda) > .8
        hs = {}
        for r, g, b in px:
            h, l, s_ = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if s_ < .25 or l > .92 or l < .12: continue
            k = int(h * 24) % 24; hs[k] = hs.get(k, 0) + s_
        if not hs: return None, branco
        k = max(hs, key=hs.get); h = (k + .5) / 24
        r, g, b = colorsys.hls_to_rgb(h, .79, .85)
        return '#%02x%02x%02x' % (int(r * 255), int(g * 255), int(b * 255)), branco
    except Exception:
        return None, False
def recorte(src, dst):
    """Foto de fundo branco recortada rente ao produto (para caixas em que ele ocupa o quadrado todo)."""
    try:
        from PIL import Image, ImageChops
        im = Image.open(src).convert('RGB')
        box = ImageChops.difference(im, Image.new('RGB', im.size, (255, 255, 255))).convert('L').point(lambda v: 255 if v > 22 else 0).getbbox()
        if not box: return False
        m = int(max(im.size) * .02); x0, y0, x1, y1 = box
        im = im.crop((max(0, x0 - m), max(0, y0 - m), min(im.width, x1 + m), min(im.height, y1 + m)))
        im.thumbnail((700, 700)); os.makedirs(os.path.dirname(dst), exist_ok=True); im.save(dst, quality=85)
        return True
    except Exception:
        return False
def foto_local(u):
    """Caminho no disco da foto principal. Foto enviada pelo painel (Google Drive) é baixada uma vez e guardada."""
    if u.startswith('img/'):
        f = os.path.join(RAIZ, u); return f if os.path.exists(f) else None
    if not u.startswith('https://'): return None
    f = os.path.join(FONTE, 'dados', 'fotos', hashlib.sha1(u.encode()).hexdigest()[:16] + '.jpg')
    if os.path.exists(f): return f
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'ouse-build'})
        data = urllib.request.urlopen(req, timeout=30).read()
        if len(data) < 500: return None
        os.makedirs(os.path.dirname(f), exist_ok=True); open(f, 'wb').write(data); return f
    except Exception as ex:
        print('aviso: não baixei a foto de', u[:60], ex); return None
CORES = {}
for p in PRODS:
    fl = foto_local(p['img']) if p['img'] else None
    if fl:
        c_, w_ = cor_da_foto(fl)
        if c_:
            CORES[p['id']] = [c_, 1 if w_ else 0]
            if w_ and recorte(fl, os.path.join(RAIZ, 'img', 'recorte', p['id'] + '.jpg')): CORES[p['id']].append(1)

# ---------------- 2. arquivos de CSS e JS ----------------
cats_js = [{k: c.get(k, '') for k in ('id', 'slug', 'label', 'title', 'intro', 'capa', 'cheia', 'cor') if c.get(k)} for c in CATS]
JS_OUT = JS.replace('/*CATEGORIAS*/[]', json.dumps(cats_js, ensure_ascii=False))
JS_OUT = JS_OUT.replace('/*CORES*/{}', json.dumps(CORES))
assert JS_OUT != JS, 'marcador /*CATEGORIAS*/ não encontrado no loja.js'
V = hashlib.sha1((CSS + JS_OUT).encode()).hexdigest()[:10]
wr(os.path.join(RAIZ, 'assets', 'loja.css'), CSS)
wr(os.path.join(RAIZ, 'assets', 'loja.js'), JS_OUT)
wr(os.path.join(RAIZ, 'dados', 'catalogo.csv'), t)

# ---------------- 3. moldura das páginas ----------------
PARTE = {n: rd(os.path.join(S, f'parte-{n}.html')) for n in ('aviso', 'topo', 'rodape', 'fim')}
FONTS = '''<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;900&family=Figtree:wght@400;500;600;700&display=swap">'''
ICONS = '''<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">'''
def ld(obj): return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace('</', '<\\/') + '</script>'
def page(*, title, desc, path, image, main, cfg, lds=(), og_type='website', robots='index, follow, max-image-preview:large', extra=''):
    url = SITE + path.lstrip('/')
    return f'''<!doctype html>
<html lang="pt-BR" {MARCA}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#5b0f7a">
<meta name="geo.region" content="BR-AL"><meta name="geo.placename" content="Campestre">
<meta property="og:type" content="{og_type}">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Ouse Mais">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{e(image)}">
<meta property="og:image:secure_url" content="{e(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{e(image)}">
{extra}{"".join(ld(x) + chr(10) for x in lds)}{ICONS}
{FONTS}
<link rel="stylesheet" href="/assets/loja.css?v={V}">
</head><body>
<noscript><p style="padding:16px;font-family:sans-serif">Ative o JavaScript para comprar pelo catálogo da Ouse Mais, ou fale com a loja pelo WhatsApp: (82) 99908-0594.</p></noscript>
{PARTE["aviso"]}<div class="wrap">
{PARTE["topo"]}<main>
{main}
</main>
{PARTE["rodape"]}</div>
{PARTE["fim"]}<script>window.OUSE_PAGE={json.dumps(cfg)};</script>
<script src="/assets/loja.js?v={V}" defer></script>
</body></html>
'''
pre = lambda i: f'<!--pre:{i}-->'
def short(s, n=155):
    s = re.sub(r'\s+', ' ', s).strip()
    return s if len(s) <= n else s[:n].rsplit(' ', 1)[0].rstrip(',.;:') + '…'
crumb = lambda items: {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
    {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u.lstrip('/')} for i, (n, u) in enumerate(items)]}
TILES = lambda t: f'''<section class="cats more-cats" aria-labelledby="mc-t"><div class="cats-h"><h2 id="mc-t">{t}</h2></div><div class="cat-tiles" id="cat-tiles" data-pre>{pre("cat-tiles")}</div></section>'''
SORT = '''<label class="sort" for="sort">Ordenar por
        <select id="sort"><option value="destaque">Destaques</option><option value="vendidos">Mais vendidos</option><option value="menor">Menor preço</option><option value="maior">Maior preço</option><option value="az">Nome (A a Z)</option></select>
      </label>'''

GERADAS = {}   # caminho do arquivo -> html
PRERENDER = [] # (caminho do arquivo, endereço, [ids])

# página inicial
DESC_HOME = "Sex shop e moda íntima em Campestre/AL: lubrificantes, comestíveis, calcinhas, vibradores e kits. Embalagem sigilosa, envio rápido e pedido pelo WhatsApp."
store = {"@context": "https://schema.org", "@type": "Store", "name": "Ouse Mais", "alternateName": "Ouse+", "description": DESC_HOME, "url": SITE,
         "image": SITE + "img/vitrine.jpg", "telephone": "+55 82 99908-0594",
         "address": {"@type": "PostalAddress", "addressLocality": "Campestre", "addressRegion": "AL", "addressCountry": "BR"},
         "areaServed": "Alagoas", "sameAs": ["https://www.instagram.com/ousemais_oficial/"], "logo": SITE + "icon-512.png",
         "currenciesAccepted": "BRL", "knowsLanguage": "pt-BR",
         "contactPoint": {"@type": "ContactPoint", "telephone": "+55 82 99908-0594", "contactType": "sales", "availableLanguage": "Portuguese"}}
website = {"@context": "https://schema.org", "@type": "WebSite", "name": "Ouse Mais", "alternateName": "Ouse Mais Sex Shop", "url": SITE, "inLanguage": "pt-BR"}
home_main = rd(os.path.join(S, 'home.html'))
faq = re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p></details>', home_main)
faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub('<[^>]+>', '', a)}} for q, a in faq]}
home_main = home_main.replace('id="grid" data-pre></div>', f'id="grid" data-pre>{pre("grid")}</div>').replace('id="cat-tiles" data-pre></div>', f'id="cat-tiles" data-pre>{pre("cat-tiles")}</div>')
GERADAS['index.html'] = page(title="Ouse Mais | Sex Shop e Moda Íntima em Campestre/AL", desc=DESC_HOME, path='/', image=SITE + 'img/compartilhar.jpg',
    main=home_main, cfg={"type": "home"}, lds=[store, website, faq_ld],
    extra='<meta property="og:image:type" content="image/jpeg">\n<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">\n<meta property="og:image:alt" content="Vitrine de produtos da Ouse Mais">\n')
PRERENDER.append(('index.html', '/', ['grid', 'cat-tiles']))

# categorias
CAT_PATHS = []
for c in CATS:
    ps = [p for p in PRODS if p['cat'] == c['id']]
    path = curl(c)
    capa = SITE + c['capa'] if c.get('capa') else (img_of(next((p for p in ps if not p['kit']), ps[0])) if ps else SITE + 'img/compartilhar.jpg')
    main = f'''<section id="cat-hero" data-pre>{pre("cat-hero")}</section>
<section class="catgrid" aria-labelledby="sec-title">
    <div class="section-h">
      <div class="sh-l"><h2 id="sec-title">{e(c["title"])}</h2><span class="count" id="count"></span></div>
      {SORT}
    </div>
    <div class="grid" id="grid" data-pre>{pre("grid")}</div>
</section>
{TILES("Outras categorias")}'''
    lds = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": f"{c['title']} | Ouse Mais", "url": SITE + path.lstrip('/'),
            "description": c.get('desc', ''), "isPartOf": {"@type": "WebSite", "name": "Ouse Mais", "url": SITE},
            "mainEntity": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE + purl(p).lstrip('/'), "name": p['name']} for i, p in enumerate(ps)]}},
           crumb([("Início", "/"), (c['label'], path)])]
    f = path.strip('/') + '/index.html'
    GERADAS[f] = page(title=f"{c['title']} em Campestre/AL | Ouse Mais", desc=c.get('desc') or f"{c['title']} da Ouse Mais.", path=path, image=capa,
                      main=main, cfg={"type": "cat", "cat": c['id']}, lds=lds, robots='index, follow, max-image-preview:large' if ps else 'noindex, follow')
    PRERENDER.append((f, path, ['cat-hero', 'grid', 'cat-tiles']))
    if ps: CAT_PATHS.append(path)

# produtos
PROD_PATHS = []
for p in PRODS:
    path = purl(p); c = CAT[p['cat']]
    PROD_PATHS.append((path, p))
    if p['id'] in ESPECIAIS: continue
    nm = p['name'] + (f" – {p['brand']}" if brand_ok(p) else '')
    desc = short(f"{p['desc']} Na Ouse Mais, em Campestre/AL: embalagem sigilosa e pedido pelo WhatsApp.") if p['desc'] else f"{p['name']} na Ouse Mais, em Campestre/AL. Embalagem sigilosa e pedido pelo WhatsApp."
    img = img_of(p)
    prod = {"@context": "https://schema.org", "@type": "Product", "name": p['name'], "image": [img], "description": p['desc'] or p['name'],
            "sku": p['id'], "category": c['label'], "url": SITE + path.lstrip('/')}
    if brand_ok(p): prod["brand"] = {"@type": "Brand", "name": p['brand']}
    extra = ''
    if p['price']:
        prod["offers"] = {"@type": "Offer", "price": "%.2f" % p['price'], "priceCurrency": "BRL", "url": SITE + path.lstrip('/'),
                          "availability": "https://schema.org/OutOfStock" if p['soldOut'] else "https://schema.org/InStock",
                          "itemCondition": "https://schema.org/NewCondition", "seller": {"@type": "Organization", "name": "Ouse Mais"}}
        extra = f'<meta property="product:price:amount" content="{"%.2f" % p["price"]}">\n<meta property="product:price:currency" content="BRL">\n'
    main = f'''<div id="prod" data-pre>{pre("prod")}</div>
<section class="related" id="related" data-pre>{pre("related")}</section>
{TILES("Navegue por categoria")}'''
    f = path.strip('/') + '/index.html'
    GERADAS[f] = page(title=f"{nm} | Ouse Mais", desc=desc, path=path, image=img, main=main, og_type='product',
                      cfg={"type": "prod", "id": p['id'], "cat": p['cat']}, lds=[prod, crumb([("Início", "/"), (c['label'], curl(c)), (p['name'], path)])], extra=extra)
    PRERENDER.append((f, path, ['prod', 'related', 'cat-tiles']))

# 404: monta na hora produto/categoria que ainda não tem página
GERADAS['404.html'] = page(title="Ouse Mais | Sex Shop e Moda Íntima em Campestre/AL", desc=DESC_HOME, path='/', image=SITE + 'img/compartilhar.jpg',
    main=f'''<div id="auto"><div class="noresult gone"><strong>Carregando…</strong><p>Se demorar, <a href="/">volte para o catálogo</a>.</p></div></div>
{TILES("Navegue por categoria")}''', cfg={"type": "auto"}, robots='noindex')

# ---------------- 4. grava, apagando páginas geradas antes que não existem mais ----------------
novos = {os.path.normpath(os.path.join(RAIZ, f)) for f in GERADAS}
for dp, dns, fns in os.walk(RAIZ):
    dns[:] = [d for d in dns if d not in ('.git', '_fonte', 'assets', 'img', 'dados', 'painel', 'node_modules', '.github')]
    for fn in fns:
        fp = os.path.normpath(os.path.join(dp, fn))
        if fn == 'index.html' and fp not in novos and MARCA in rd(fp)[:400]:
            os.remove(fp); print('removida página antiga:', os.path.relpath(fp, RAIZ))
            d = os.path.dirname(fp)
            while d != RAIZ and not os.listdir(d): os.rmdir(d); d = os.path.dirname(d)
for f, h in GERADAS.items(): wr(os.path.join(RAIZ, f), h)

# capas de categoria
for c in CATS:
    if c.get('capa') and not os.path.exists(os.path.join(RAIZ, c['capa'])):
        print('aviso: capa não encontrada:', c['capa'])

# sitemap (sem data para não mudar à toa)
urls = ['/'] + CAT_PATHS + [pth for pth, _ in PROD_PATHS]
imgs = {pth: img_of(p) for pth, p in PROD_PATHS}
wr(os.path.join(RAIZ, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
   + ''.join(f'<url><loc>{SITE}{u.lstrip("/")}</loc>' + (f'<image:image><image:loc>{e(imgs[u])}</image:loc></image:image>' if u in imgs else '') + '</url>\n' for u in urls) + '</urlset>\n')

# ---------------- 5. HTML pronto (Google, prévias de link e quem abre sem esperar a planilha) ----------------
if '--sem-prerender' not in sys.argv:
    lista = os.path.join(FONTE, 'dados', '.prerender.json')
    json.dump({"raiz": RAIZ, "csv": os.path.join(RAIZ, 'dados', 'catalogo.csv'), "paginas": PRERENDER}, open(lista, 'w'))
    env = dict(os.environ)
    if not env.get('NODE_PATH'):
        env['NODE_PATH'] = subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True).stdout.strip()
    subprocess.run(['node', os.path.join(FONTE, 'prerender.js'), lista], check=True, env=env)
    os.remove(lista)
else:
    for f in GERADAS: wr(os.path.join(RAIZ, f), re.sub(r'<!--pre:[\w-]+-->', '', rd(os.path.join(RAIZ, f))))
print(f'pronto: {len(GERADAS)} páginas (v={V})')
