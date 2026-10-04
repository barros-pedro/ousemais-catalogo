# Fonte do site Ouse Mais

Esta pasta não é publicada (o GitHub Pages ignora pastas que começam com `_`).

## Como o site funciona
- Os produtos vêm da planilha que o painel publica (aba "Publicado"). O site lê a planilha ao abrir,
  então preço, estoque, textos e fotos mudam na hora em todas as páginas.
- `build.py` gera as páginas fixas: início (`/`), uma por categoria (`/lubrificantes/`) e uma por
  produto (`/lubrificantes/love-lub-hot/`), mais `sitemap.xml`, `404.html`, `/assets/` e `/dados/catalogo.csv`
  (cópia da planilha usada se o Google não responder).
- O GitHub Actions (`.github/workflows/atualizar-site.yml`) roda o `build.py` de hora em hora e sempre
  que algo em `_fonte/` muda. Produto novo ganha página fixa na próxima rodada; até lá, o `404.html`
  monta a página do produto na hora a partir da planilha.
- Para gerar à mão: `python3 _fonte/build.py` (precisa de Python 3, Node e Playwright com Chromium).

## Arquivos
- `site/loja.js` – todo o comportamento (sacola, opções, galeria, página de produto e de categoria).
- `site/loja.css` – visual. `site/home.html` – miolo da página inicial. `site/parte-*.html` – topo, rodapé, sacola.
- `site/categorias.json` – categorias: endereço, título, texto de abertura, capa. Categoria nova criada
  no painel funciona sozinha (endereço = nome sem acento); para ter texto e capa, acrescente aqui.
- `prerender.js` – grava o HTML já montado nas páginas (Google e prévias de link).
- `dados/catalogo.csv` – última cópia da planilha publicada.
- `painel/` – painel no Google Apps Script (`Code.gs` + `Painel.html`).
- `especiais/` – página de venda do vibrador (`/vibradores/vibrador-curvo/`), feita à parte. Produtos em
  `ESPECIAIS` no `build.py` não têm a página trocada pelo gerador.
