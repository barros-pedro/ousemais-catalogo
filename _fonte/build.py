import base64,glob,json
src=open('index.html').read().replace('<title>Catálogo Ouse Mais</title>','<title>Ouse Mais | Sex Shop e Moda Íntima em Campestre/AL</title>')
h=src
emb=lambda p:'data:image/jpeg;base64,'+base64.b64encode(open(p,'rb').read()).decode()
import re
h=re.sub(r'src="img/([\w-]+)\.jpg"',lambda mm:'src="'+emb('img/'+mm.group(1)+'.jpg')+'"',h)
m={f[4:-4]:emb(f) for f in glob.glob('img/*.jpg') if 'vitrine' not in f}
h=h.replace('const WHATS','const IMGS='+json.dumps(m)+';\nconst WHATS',1)
fav="data:image/svg+xml,"+"%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%235b0f7a'/%3E%3Ctext x='32' y='45' font-family='Arial Black,Arial' font-weight='900' font-size='38' text-anchor='middle' fill='%23ff4f9d'%3E+%3C/text%3E%3C/svg%3E"
SITE="https://ousemaisoficial.com.br/"
TITLE="Ouse Mais | Sex Shop e Moda Íntima em Campestre/AL"
DESC="Sex shop e moda íntima em Campestre/AL: lubrificantes, comestíveis, calcinhas, vibradores e kits. Embalagem sigilosa, envio rápido e pedido pelo WhatsApp."
store={"@context":"https://schema.org","@type":"Store","name":"Ouse Mais","alternateName":"Ouse+","description":DESC,"url":SITE,
 "image":SITE+"img/vitrine.jpg","telephone":"+55 82 99908-0594",
 "address":{"@type":"PostalAddress","addressLocality":"Campestre","addressRegion":"AL","addressCountry":"BR"},
 "areaServed":"Alagoas","sameAs":["https://www.instagram.com/ousemais_oficial/"],
 "logo":SITE+"icon-512.png","currenciesAccepted":"BRL","knowsLanguage":"pt-BR",
 "contactPoint":{"@type":"ContactPoint","telephone":"+55 82 99908-0594","contactType":"sales","availableLanguage":"Portuguese"}}
website={"@context":"https://schema.org","@type":"WebSite","name":"Ouse Mais","alternateName":"Ouse Mais Sex Shop","url":SITE,"inLanguage":"pt-BR"}
# perguntas frequentes: tiradas da própria seção visível do site
_src=open('index.html').read()
_faq=re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p></details>',_src)
faq={"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":re.sub('<[^>]+>','',a)}} for q,a in _faq]}
head=f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="{DESC}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="{SITE}">
<meta name="theme-color" content="#5b0f7a">
<meta name="geo.region" content="BR-AL"><meta name="geo.placename" content="Campestre">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Ouse Mais">
<meta property="og:title" content="{TITLE}">
<meta property="og:description" content="{DESC}">
<meta property="og:url" content="{SITE}">
<meta property="og:image" content="{SITE}img/compartilhar.jpg">
<meta property="og:image:secure_url" content="{SITE}img/compartilhar.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Vitrine de produtos da Ouse Mais">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{TITLE}">
<meta name="twitter:description" content="{DESC}">
<meta name="twitter:image" content="{SITE}img/compartilhar.jpg">
<script type="application/ld+json">{json.dumps(store,ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(website,ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(faq,ensure_ascii=False)}</script>
ICONS
'''
h=head.replace('ICONS',f'<link rel="icon" href="{fav}">')+h.replace('<style>','<style>\nbody{margin:0}',1).replace('</style>','</style></head><body>',1)+'\n</body></html>'
open('catalogo-ousemais.html','w').write(h)

# versão para o GitHub: imagens como arquivos (mais leve, carrega só o que aparece)
g=head.replace('ICONS','<link rel="icon" href="/favicon.ico" sizes="48x48">\n<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">')+src.replace('<style>','<style>\nbody{margin:0}',1).replace('</style>','</style></head><body>',1)+'\n</body></html>'
import os,shutil
os.makedirs('github',exist_ok=True)
open('github/index.html','w').write(g)

open('github/sitemap.xml','w').write(f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
<url><loc>{SITE}</loc><lastmod>{__import__('datetime').date.today().isoformat()}</lastmod><changefreq>weekly</changefreq>
'''+"".join(f"<image:image><image:loc>{SITE}img/{f[4:]}</image:loc></image:image>\n" for f in sorted(glob.glob('img/*.jpg')) if '-full' not in f)+"</url>\n</urlset>\n")

# lista de produtos já pronta no HTML do GitHub (para Google e prévias de link)
import subprocess
subprocess.run(['node','prerender.js','file://'+os.path.abspath('github/index.html'),'github/index.html'],check=True,env={**os.environ,'NODE_PATH':subprocess.run(['npm','root','-g'],capture_output=True,text=True).stdout.strip()})
