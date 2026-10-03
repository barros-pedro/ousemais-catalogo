# Gera a pasta de exemplo /lubrificantes/ (categoria + uma página por produto).
# Não mexe no site principal: usa os mesmos dados de reserva do index.html e,
# no navegador, atualiza preço e estoque pela planilha publicada.
import json, os, re, html, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, '..', 'index.html')
OUT = os.path.join(ROOT, 'out', 'lubrificantes')
SITE = "https://ousemaisoficial.com.br/"
WA = "5582999080594"
INDEXAR = False   # exemplo: fica fora do Google até aprovar

src = open(SRC, encoding='utf-8').read()

def eval_js_array(code):
    import subprocess
    r = subprocess.run(['node', '-e', 'process.stdout.write(JSON.stringify(eval(require("fs").readFileSync(0,"utf8"))))'],
                       input='(' + code + ')', capture_output=True, text=True, check=True)
    return json.loads(r.stdout)

start = src.index('const PRODUCTS = [') + len('const PRODUCTS = ')
depth = 0
for i in range(start, len(src)):
    if src[i] == '[': depth += 1
    elif src[i] == ']':
        depth -= 1
        if depth == 0: end = i + 1; break
PRODUCTS = eval_js_array(src[start:end])
CATALOG_URL = re.search(r'catalogo:\s*"([^"]+)"', src).group(1)
by = {p['id']: p for p in PRODUCTS}
LUB = [p for p in PRODUCTS if p.get('cat') == 'lub']
KITS = [p for p in PRODUCTS if p.get('items')]

e = lambda s: html.escape(str(s or ''), quote=True)

def money(v):
    return ('R$ %.2f' % v).replace('.', ',') if v else ''

def wa_link(msg):
    from urllib.parse import quote
    return f"https://wa.me/{WA}?text={quote(msg)}"

def bom_saber(p):
    out = []
    specs = ' '.join(p.get('specs', []))
    d = p.get('desc', '').lower()
    if 'base água' in specs.lower() or 'base de água' in d or 'solúvel em água' in d:
        out.append(('À base de água', 'Fácil de lavar, não mancha e combina com preservativos e com brinquedos de silicone.'))
    if p.get('tag') == 'Esquenta':
        out.append(('Efeito que esquenta', 'Dá uma sensação de calor ao contato. Teste antes em uma área pequena.'))
    if p.get('tag') == 'Gelado':
        out.append(('Efeito refrescante', 'Dá uma sensação de frescor ao contato, ótima para alternar com o Hot.'))
    if 'aroma' in d:
        out.append(('Com aroma', 'Deixa o momento mais gostoso sem perder a textura de lubrificante.'))
    if 'banho' in d:
        out.append(('Para o banho', 'Feito para não sair com a água, ideal para debaixo do chuveiro.'))
    out.append(('Embalagem sigilosa', 'Seu pedido chega sem nenhuma identificação do que tem dentro.'))
    return out

HEAD_COMMON = '''<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#5b0f7a">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;900&family=Figtree:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/lubrificantes/pasta.css">
''' + ('' if INDEXAR else '<meta name="robots" content="noindex, follow">\n')

def page(title, desc, url, image, body, ld):
    return f'''<!doctype html>
<html lang="pt-BR"><head>
{HEAD_COMMON}<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="Ouse Mais">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image}"><meta property="og:image:secure_url" content="{image}"><meta property="og:image:type" content="image/jpeg">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False).replace("</", "<\\/")}</script>
</head><body>
<div class="notice"><b>Embalagem sigilosa:</b> ninguém sabe o que tem dentro.</div>
<header class="top"><a class="mark" href="/" aria-label="Ouse Mais, voltar ao catálogo">OUSE<span>+</span></a>
<a class="cartbtn" href="/" id="cart-top">Sacola <span class="count" id="count">0</span></a></header>
<main class="wrap">
{body}
</main>
<footer class="foot"><p>Ouse Mais · Sex shop e moda íntima em Campestre/AL · Venda proibida para menores de 18 anos.</p>
<p><a href="/">Ver catálogo completo</a> · <a href="{wa_link("Olá! Vi os lubrificantes no site da Ouse Mais e quero tirar uma dúvida.")}" target="_blank" rel="noopener">WhatsApp (82) 99908-0594</a></p></footer>
<div class="bag" id="bag" hidden><span id="bag-txt"></span><a class="btn" href="/">Finalizar pedido</a></div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>window.OUSE = {{ catalogo: {json.dumps(CATALOG_URL)}, wa: "{WA}" }};</script>
<script src="/lubrificantes/pasta.js" defer></script>
</body></html>
'''

def card(p):
    url = f"/lubrificantes/{p['id']}/"
    tag = f'<span class="tag">{e(p["tag"])}</span>' if p.get('tag') else ''
    specs = ' · '.join(p.get('specs', []))
    return f'''<article class="card" data-id="{e(p['id'])}">
  <a class="plate" href="{url}">{tag}<img src="/img/{e(p['id'])}.jpg" alt="{e(p['name'])} – {e(p.get('brand'))}" loading="lazy" width="800" height="800"></a>
  <div class="info"><div class="brand">{e(p.get('brand'))}</div>
  <h3 class="name"><a href="{url}">{e(p['name'])}</a></h3>
  <p class="spec">{e(specs)}</p>
  <div class="price" data-price>{e(money(p.get('price'))) or 'Preço no WhatsApp'}</div>
  <button type="button" class="add" data-add="{e(p['id'])}">+ Adicionar</button></div>
</article>'''

shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)

# ---------- página da categoria ----------
guia = [
    ('Para o dia a dia', 'Neutro, sem cheiro nem efeito: confortável e combina com tudo.', ['love-lub-neutro']),
    ('Para sentir algo diferente', 'Com efeito que esquenta ou refresca ao contato.', ['love-lub-hot', 'love-lub-ice', 'jato-sex-esquenta']),
    ('Com aroma', 'Mesma textura de lubrificante, com cheirinho de fruta ou menta.', ['rilex-morango', 'rilex-menta']),
    ('Para o banho', 'Não sai com a água, feito para usar debaixo do chuveiro.', ['aqua-silicon']),
]
def chip(i):
    p = by[i]
    return (f'<a class="chip" href="/lubrificantes/{i}/"><img src="/lubrificantes/mini/{e(i)}.jpg" alt="" width="40" height="40" loading="lazy">'
            f'<span>{e(p["name"])}</span><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>')
guia_html = ''.join(f'''<div class="pick"><h3>{e(t)}</h3><p>{e(d)}</p><div class="chips">{"".join(chip(i) for i in ids if i in by)}</div></div>''' for t, d, ids in guia)
faq = [
    ('Lubrificante à base de água pode ser usado com camisinha?', 'Pode. Lubrificantes à base de água são compatíveis com preservativos e com brinquedos de silicone. Em caso de dúvida, confira sempre a embalagem do produto.'),
    ('Qual a diferença entre o Hot, o Ice e o Neutro?', 'Os três são à base de água. O Hot dá sensação de calor, o Ice dá sensação de frescor e o Neutro não tem efeito, é o mais versátil.'),
    ('Como faço o pedido?', 'Adicione os lubrificantes à sacola e toque em Finalizar pedido. No catálogo, a mensagem vai pronta para o WhatsApp da loja e a gente confirma valores e entrega por lá.'),
    ('A embalagem é sigilosa?', 'Sim. Todos os pedidos vão em embalagem sem nenhuma identificação do conteúdo.'),
]
faq_html = ''.join(f'<details><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in faq)
cat_body = f'''<nav class="crumbs" aria-label="Você está em"><a href="/">Catálogo</a> › <span>Lubrificantes</span></nav>
<section class="hero">
  <div class="hero-img"><img src="/lubrificantes/capa.jpg" alt="Lubrificantes Love Lub Hot, Ice e Neutro, Aqua Silicon, Rilex Morango e Menta e Jato Sex Esquenta" width="1400" height="820" fetchpriority="high"></div>
  <div class="hero-txt"><p class="eyebrow">Ouse Mais · Campestre/AL</p>
  <h1>Lubrificantes</h1>
  <p class="lead">Lubrificante deixa tudo mais confortável e prazeroso, a sós ou a dois. Aqui tem opções à base de água, com efeito que esquenta ou refresca, com aroma e até para usar no banho. Pedido pelo WhatsApp e entrega em embalagem sigilosa.</p>
  <a class="btn" href="#p-t">Ver os lubrificantes</a></div>
</section>
<section aria-labelledby="g-t"><h2 id="g-t">Qual escolher?</h2><div class="guide">{guia_html}</div></section>
<section aria-labelledby="p-t"><h2 id="p-t">Todos os lubrificantes</h2><div class="grid">{''.join(card(p) for p in LUB)}</div></section>
<section class="faq" aria-labelledby="f-t"><h2 id="f-t">Dúvidas sobre lubrificantes</h2>{faq_html}</section>'''
cat_ld = [
    {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Lubrificantes | Ouse Mais", "url": SITE + "lubrificantes/",
     "isPartOf": {"@type": "WebSite", "name": "Ouse Mais", "url": SITE},
     "breadcrumb": {"@type": "BreadcrumbList", "itemListElement": [
         {"@type": "ListItem", "position": 1, "name": "Catálogo", "item": SITE},
         {"@type": "ListItem", "position": 2, "name": "Lubrificantes", "item": SITE + "lubrificantes/"}]},
     "mainEntity": {"@type": "ItemList", "itemListElement": [
         {"@type": "ListItem", "position": i + 1, "url": SITE + f"lubrificantes/{p['id']}/", "name": p['name']} for i, p in enumerate(LUB)]}},
    {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
]
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(page(
    'Lubrificantes em Campestre/AL | Ouse Mais',
    'Lubrificantes à base de água, que esquentam, refrescam, com aroma ou para o banho. Love Lub, Rilex e mais, com embalagem sigilosa e pedido pelo WhatsApp.',
    SITE + 'lubrificantes/', SITE + 'lubrificantes/capa.jpg', cat_body, cat_ld))

# ---------- uma página por produto ----------
for p in LUB:
    pid = p['id']; url = SITE + f'lubrificantes/{pid}/'
    kits = [k for k in KITS if pid in k['items']]
    outros = [x for x in LUB if x['id'] != pid][:4]
    bom = ''.join(f'<li><b>{e(t)}</b><span>{e(d)}</span></li>' for t, d in bom_saber(p))
    tag = f'<span class="pill">{e(p["tag"])}</span>' if p.get('tag') else ''
    specs = ''.join(f'<li>{e(s)}</li>' for s in p.get('specs', []))
    kit_html = ''.join(f'''<a class="kitlink" href="/#kit"><img src="/img/{e(k['id'])}.jpg" alt="" loading="lazy" width="80" height="80"><span><b>{e(k['name'])}</b><small>{e(k['desc'])}</small></span></a>''' for k in kits)
    msg = f"Olá, Ouse Mais! Quero o {p['name']} ({p.get('brand')}). Vocês podem confirmar o valor e a entrega?"
    body = f'''<nav class="crumbs" aria-label="Você está em"><a href="/">Catálogo</a> › <a href="/lubrificantes/">Lubrificantes</a> › <span>{e(p['name'])}</span></nav>
<article class="prod" data-id="{e(pid)}">
  <div class="pimg"><img src="/img/{e(pid)}.jpg" alt="{e(p['name'])} – {e(p.get('brand'))}" width="800" height="800"></div>
  <div class="pbody">
    <div class="brand">{e(p.get('brand'))}</div>
    <h1>{e(p['name'])}</h1>{tag}
    <p class="desc">{e(p.get('desc'))}</p>
    <ul class="specs">{specs}</ul>
    <div class="price big" data-price>{e(money(p.get('price'))) or 'Preço no WhatsApp'}</div>
    <p class="stock" data-stock></p>
    <div class="actions"><button type="button" class="add" data-add="{e(pid)}">+ Adicionar à sacola</button>
    <a class="btn ghost" href="{wa_link(msg)}" target="_blank" rel="noopener">Pedir no WhatsApp</a></div>
    <h2>Bom saber</h2><ul class="good">{bom}</ul>
  </div>
</article>
{f'<section aria-labelledby="k-t"><h2 id="k-t">Vem nos kits</h2><div class="kits">{kit_html}</div></section>' if kits else ''}
<section aria-labelledby="o-t"><h2 id="o-t">Combina com</h2><div class="grid">{''.join(card(x) for x in outros)}</div>
<p class="more"><a class="btn ghost" href="/lubrificantes/">Ver todos os lubrificantes</a></p></section>'''
    prod_ld = {"@context": "https://schema.org", "@type": "Product", "name": p['name'], "image": SITE + f"img/{pid}.jpg",
               "description": p.get('desc'), "category": "Lubrificantes", "url": url}
    if p.get('brand'): prod_ld["brand"] = {"@type": "Brand", "name": p['brand']}
    if p.get('price'): prod_ld["offers"] = {"@type": "Offer", "price": "%.2f" % p['price'], "priceCurrency": "BRL", "availability": "https://schema.org/InStock", "url": url}
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Catálogo", "item": SITE},
        {"@type": "ListItem", "position": 2, "name": "Lubrificantes", "item": SITE + "lubrificantes/"},
        {"@type": "ListItem", "position": 3, "name": p['name'], "item": url}]}
    d = os.path.join(OUT, pid); os.makedirs(d)
    open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(page(
        f"{p['name']} – {p.get('brand')} | Ouse Mais",
        f"{p.get('desc')} Na Ouse Mais, em Campestre/AL, com embalagem sigilosa e pedido pelo WhatsApp.",
        url, SITE + f"img/{pid}.jpg", body, [prod_ld, crumbs]))

shutil.copy(os.path.join(ROOT, 'pasta.css'), OUT)
shutil.copytree(os.path.join(ROOT, 'mini'), os.path.join(OUT, 'mini'))
shutil.copy(os.path.join(ROOT, 'lubrificantes-capa.jpg'), os.path.join(OUT, 'capa.jpg'))
shutil.copy(os.path.join(ROOT, 'pasta.js'), OUT)
print('gerado:', len(LUB), 'produtos em', OUT)
