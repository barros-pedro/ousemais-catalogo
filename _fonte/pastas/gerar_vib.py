# Página de venda (estilo Apple/Amazon) do Vibrador Curvo em U.
# Exemplo isolado: não mexe no catálogo. Preço e estoque vêm da planilha no navegador.
import json, os, re, html, shutil, subprocess
from urllib.parse import quote

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, '..', 'index.html')
OUT = os.path.join(ROOT, 'out', 'vibradores')
SITE = "https://ousemaisoficial.com.br/"
WA = "5582999080594"
PID, PAR = "vibrador-curvo", "love-lub-neutro"

src = open(SRC, encoding='utf-8').read()
start = src.index('const PRODUCTS = [') + len('const PRODUCTS = ')
depth = 0
for i in range(start, len(src)):
    if src[i] == '[': depth += 1
    elif src[i] == ']':
        depth -= 1
        if depth == 0: end = i + 1; break
PRODUCTS = json.loads(subprocess.run(['node', '-e', 'process.stdout.write(JSON.stringify(eval(require("fs").readFileSync(0,"utf8"))))'],
                                     input='(' + src[start:end] + ')', capture_output=True, text=True, check=True).stdout)
CATALOG_URL = re.search(r'catalogo:\s*"([^"]+)"', src).group(1)
by = {p['id']: p for p in PRODUCTS}
P, LUB = by[PID], by[PAR]
e = lambda s: html.escape(str(s or ''), quote=True)
wa = lambda m: f"https://wa.me/{WA}?text={quote(m)}"

# Especificações: None = ainda não confirmado pela loja (aparece "Confirme no WhatsApp")
SPECS = [
    ('Material', 'Silicone'),
    ('Cor', 'Rosa'),
    ('Formato', 'Curvo, em U'),
    ('Modos de vibração', None),
    ('Como controla', None),
    ('Bateria e recarga', None),
    ('Resistente à água', None),
    ('Medidas', None),
]
spec_rows = ''.join(
    f'<tr><th scope="row">{e(k)}</th><td>{e(v) if v else "<a href=\"" + e(wa(f"Olá! Sobre o {P["name"]}: {k.lower()}?")) + "\" target=\"_blank\" rel=\"noopener\">Confirme no WhatsApp</a>"}</td></tr>'
    for k, v in SPECS)

FAQ = [
    ('É discreto?', 'O pedido chega em embalagem sem nenhuma identificação do conteúdo, e a conversa toda acontece no WhatsApp da loja.'),
    ('Qual lubrificante usar?', 'Com brinquedos de silicone, use lubrificante à base de água, como o Love Lub Neutro. Lubrificante de silicone pode danificar o material do brinquedo.'),
    ('Como limpar?', 'Antes e depois de usar, lave com água morna e sabonete neutro, seque bem e guarde separado de outros brinquedos. Confira também as instruções da embalagem.'),
    ('Como faço o pedido?', 'Toque em Adicionar à sacola e depois em Finalizar pedido: a mensagem vai pronta para o WhatsApp da loja e a gente confirma valor, entrega e pagamento por lá.'),
]
faq_html = ''.join(f'<details><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in FAQ)

title = f"{P['name']} | Ouse Mais"
desc = "Vibrador em silicone macio com formato curvo em U, que acompanha o corpo. Na Ouse Mais, em Campestre/AL, com embalagem sigilosa e pedido pelo WhatsApp."
url = SITE + f"vibradores/{PID}/"
img_abs = SITE + f"img/{PID}.jpg"
ld = [{"@context": "https://schema.org", "@type": "Product", "name": P['name'], "image": img_abs, "description": desc,
       "category": "Vibradores", "material": "Silicone", "color": "Rosa", "url": url},
      {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
          {"@type": "ListItem", "position": 1, "name": "Catálogo", "item": SITE},
          {"@type": "ListItem", "position": 2, "name": "Vibradores", "item": SITE + "#vib"},
          {"@type": "ListItem", "position": 3, "name": P['name'], "item": url}]},
      {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
          {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}]
msg = f"Olá, Ouse Mais! Tenho interesse no {P['name']}. Vocês podem me contar sobre os modos de vibração, valor e entrega?"
IMG = "/vibradores/vibrador-curvo.webp"

page = f'''<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#3d0a55">
<meta name="robots" content="noindex, follow">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="product"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="Ouse Mais">
<meta property="og:title" content="{e(P['name'])} – feito para acompanhar o seu corpo">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{img_abs}"><meta property="og:image:secure_url" content="{img_abs}"><meta property="og:image:type" content="image/jpeg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;900&family=Figtree:wght@400;500;600;700&display=swap">
<link rel="preload" as="image" href="{IMG}">
<link rel="stylesheet" href="/vibradores/venda.css">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False).replace("</", "<\\/")}</script>
</head><body>
<div class="notice"><b>Embalagem sigilosa:</b> ninguém sabe o que tem dentro.</div>
<header class="top"><a class="mark" href="/" aria-label="Ouse Mais, voltar ao catálogo">OUSE<span>+</span></a>
<a class="cartbtn" href="/" id="cart-top">Sacola <span class="count" id="count">0</span></a></header>

<!-- barra fixa que aparece depois do topo (como na Apple) -->
<div class="sticky" id="sticky" data-id="{PID}" aria-hidden="true">
  <div class="sticky-in"><span class="s-name">{e(P['name'])}</span><span class="s-price" data-price>Preço no WhatsApp</span>
  <button type="button" class="s-add" data-add="{PID}" tabindex="-1">Adicionar</button></div>
</div>

<main>
<nav class="crumbs wrap" aria-label="Você está em"><a href="/">Catálogo</a> › <a href="/#vib">Vibradores</a> › <span>{e(P['name'])}</span></nav>

<section class="hero wrap" id="topo" data-id="{PID}">
  <div class="hero-copy">
    <p class="eyebrow">Novo na Ouse Mais</p>
    <h1>{e(P['name'])}</h1>
    <p class="tagline">Feito para acompanhar<br>o seu corpo.</p>
    <div class="buy">
      <div class="price" data-price>Preço no WhatsApp</div>
      <p class="stock" data-stock></p>
      <div class="buy-btns">
        <button type="button" class="btn add" data-add="{PID}">Adicionar à sacola</button>
        <a class="btn ghost" href="{e(wa(msg))}" target="_blank" rel="noopener">Tirar dúvidas no WhatsApp</a>
      </div>
      <ul class="assure"><li>Embalagem sigilosa</li><li>Pedido pelo WhatsApp</li><li>Campestre/AL</li></ul>
    </div>
  </div>
  <figure class="hero-fig">
    <div class="halo" aria-hidden="true"></div>
    <img src="{IMG}" alt="{e(P['name'])} rosa, em silicone, com formato curvo em U" width="562" height="548" fetchpriority="high">
    <span class="callout c1" aria-hidden="true">Ponta fina<br>e arredondada</span>
    <span class="callout c2" aria-hidden="true">Corpo maior,<br>que preenche</span>
    <span class="callout c3" aria-hidden="true">Curva em U</span>
  </figure>
</section>

<section class="facts" aria-label="Destaques">
  <div class="wrap facts-in">
    <div class="fact"><b>Silicone</b><span>Toque macio, liso e fácil de limpar</span></div>
    <div class="fact"><b>Em U</b><span>Formato que se adapta ao corpo</span></div>
    <div class="fact"><b>A sós ou a dois</b><span>Para explorar no seu ritmo</span></div>
    <div class="fact"><b>Sigiloso</b><span>Chega sem identificação do conteúdo</span></div>
  </div>
</section>

<section class="story s-pink">
  <div class="wrap story-in">
    <div class="story-copy reveal">
      <p class="kicker">Design</p>
      <h2>Uma curva pensada<br>para encaixar.</h2>
      <p>De um lado, uma ponta fina e arredondada. Do outro, um corpo maior e macio. A curva em U une os dois e acompanha o formato do corpo, sem ângulos nem quinas.</p>
    </div>
    <div class="story-fig reveal"><img src="{IMG}" alt="" loading="lazy" width="562" height="548" class="tilt"></div>
  </div>
</section>

<section class="story s-lilac">
  <div class="wrap story-in rev">
    <div class="story-copy reveal">
      <p class="kicker">Material</p>
      <h2>Silicone macio.<br>Do jeito que tem que ser.</h2>
      <p>O silicone tem toque aveludado, é liso e não tem poros onde a sujeira se acumula. Limpar é simples: água morna e sabonete neutro antes e depois de usar.</p>
    </div>
    <div class="story-fig reveal"><div class="swatch" aria-hidden="true"><span>Silicone</span></div></div>
  </div>
</section>

<section class="story s-white">
  <div class="wrap center reveal">
    <p class="kicker">Do seu jeito</p>
    <h2>A sós ou a dois.<br>Você escolhe o ritmo.</h2>
    <p class="narrow">Para quem está começando a explorar ou para quem quer trazer uma novidade para o casal. Quer saber os modos de vibração e como ele é controlado? A gente explica tudo no WhatsApp, sem constrangimento.</p>
    <a class="btn ghost" href="{e(wa(msg))}" target="_blank" rel="noopener">Perguntar no WhatsApp</a>
  </div>
</section>

<section class="how wrap" aria-labelledby="how-t">
  <h2 id="how-t">Como usar</h2>
  <ol class="steps">
    <li><span class="n">1</span><b>Lave antes</b><span>Água morna e sabonete neutro. Seque bem.</span></li>
    <li><span class="n">2</span><b>Use lubrificante à base de água</b><span>Ele deixa tudo mais confortável e não danifica o silicone.</span></li>
    <li><span class="n">3</span><b>Encontre a posição</b><span>Teste com calma e ajuste a curva ao seu corpo.</span></li>
    <li><span class="n">4</span><b>Lave e guarde</b><span>Depois de seco, guarde em um saquinho, separado de outros brinquedos.</span></li>
  </ol>
</section>

<section class="bundle wrap" aria-labelledby="b-t">
  <h2 id="b-t">Compre junto</h2>
  <div class="bundle-box">
    <div class="b-items">
      <a class="b-item" href="#topo" data-id="{PID}"><img src="/img/{PID}.jpg" alt="" width="120" height="120" loading="lazy"><b>{e(P['name'])}</b><span class="b-price" data-price>–</span></a>
      <span class="plus" aria-hidden="true">+</span>
      <a class="b-item" href="/lubrificantes/{PAR}/" data-id="{PAR}"><img src="/img/{PAR}.jpg" alt="" width="120" height="120" loading="lazy"><b>{e(LUB['name'])}</b><span class="b-price" data-price>–</span></a>
    </div>
    <div class="b-total"><span>Os dois juntos</span><strong id="b-sum">Preço no WhatsApp</strong>
      <button type="button" class="btn add" data-add-many="{PID},{PAR}">Adicionar os dois à sacola</button>
      <small>Também vendemos juntos no <a href="/#kit">Kit Descoberta</a>.</small></div>
  </div>
</section>

<section class="specs wrap" aria-labelledby="s-t">
  <h2 id="s-t">Especificações</h2>
  <table>{spec_rows}</table>
</section>

<section class="faq wrap" aria-labelledby="f-t">
  <h2 id="f-t">Dúvidas frequentes</h2>{faq_html}
</section>

<section class="final" data-id="{PID}">
  <div class="wrap center">
    <img src="{IMG}" alt="" width="180" height="178" loading="lazy">
    <h2>Pronta para ousar?</h2>
    <div class="price" data-price>Preço no WhatsApp</div>
    <div class="buy-btns center-btns"><button type="button" class="btn add" data-add="{PID}">Adicionar à sacola</button>
    <a class="btn ghost light" href="{e(wa(msg))}" target="_blank" rel="noopener">Falar no WhatsApp</a></div>
  </div>
</section>
</main>

<footer class="foot"><p>Ouse Mais · Sex shop e moda íntima em Campestre/AL · Venda proibida para menores de 18 anos. Imagens ilustrativas.</p>
<p><a href="/">Ver catálogo completo</a> · <a href="{e(wa("Olá! Vi o site da Ouse Mais e quero tirar uma dúvida."))}" target="_blank" rel="noopener">WhatsApp (82) 99908-0594</a></p></footer>
<div class="bag" id="bag" hidden><span id="bag-txt"></span><a class="btn" href="/">Finalizar pedido</a></div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>window.OUSE = {{ catalogo: {json.dumps(CATALOG_URL)}, wa: "{WA}" }};</script>
<script src="/vibradores/pasta.js" defer></script>
<script src="/vibradores/venda.js" defer></script>
</body></html>
'''

shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(os.path.join(OUT, PID))
open(os.path.join(OUT, PID, 'index.html'), 'w', encoding='utf-8').write(page)
for f in ['venda.css', 'venda.js']: shutil.copy(os.path.join(ROOT, 'vib', f), OUT)
shutil.copy(os.path.join(ROOT, 'pasta.js'), OUT)
shutil.copy(os.path.join(ROOT, 'vib', 'vibrador-curvo.webp'), OUT)
print('gerado', os.path.join(OUT, PID))
