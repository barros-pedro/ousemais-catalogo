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
- `site/vendas.json` – páginas de venda (vibradores): chamada, etiquetas da foto, blocos de história, passos,
  especificações (null = "Confirme no WhatsApp"), "compre junto" e o cartão da vitrine da página inicial.
  Produto listado aqui ganha página de venda no lugar da página simples. `"indexar": true` só depois de aprovada.
  Fotos recortadas (fundo transparente) ficam em `img/venda/<id>.webp`.
- Página inicial: banners, categorias com busca, kits, mais vendidos (coluna Ranking), vitrine de vibradores
  (de `vendas.json`), promoções (Preço antigo maior que o preço) e informações úteis. `/produtos/` lista tudo.

## Campanha sazonal (Black Friday)
- `site/campanha.json` liga a campanha: `ativa`, `nome`, `inicio`, `fim` (null = até desligar; com data aparece
  "termina em…" na faixa), `pagina` (`black-friday`), `destaque` (produto da foto grande) e `foto`/`foto_alt`.
- No período, um script no `<head>` põe a classe `bf` no `<html>`: a faixa de aviso vira a faixa da campanha, o
  carrossel dá lugar a um hero fixo (foto real da loja com a etiqueta de preço do produto em destaque), entra o bloco
  "Desconto por categoria" (maior desconto por categoria e faixas de preço) e as promoções sobem para depois das categorias.
- Fora do período nada disso aparece. Para conferir antes: `?bf` no fim do endereço.
- `/black-friday/`: produtos com Preço antigo maior que o Preço (sem kits nem esgotados), do maior desconto para o
  menor, com filtro por categoria e por faixa de preço. Endereços diretos: `/black-friday/#calcinhas`,
  `/black-friday/#ate-20`, `#20-50`, `#acima-50`. Imagem de compartilhamento: `img/black-friday.jpg`.
- Valem o ano todo: selo de desconto (−X%), "Só restam N" com 3 ou menos em estoque, no máximo 2 selos por foto,
  ordenação "Maior desconto" e a economia na sacola e na mensagem do pedido.
- Os números saem da planilha. Com `ativa: false` tudo some e a página `/black-friday/` é apagada na próxima atualização.
