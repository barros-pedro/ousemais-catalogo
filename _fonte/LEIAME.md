# Fonte do site Ouse Mais

Esta pasta não é publicada (o GitHub Pages ignora pastas que começam com `_`).
Ela guarda o código-fonte para qualquer sessão futura conseguir continuar o trabalho.

- `index.html` – fonte do catálogo. `python3 build.py` gera `github/index.html` (copiar para a raiz do repositório) e `github/sitemap.xml`. As imagens ficam em `/img` na raiz do repositório (copiar para `img/` ao lado do build).
- `painel/` – painel no Google Apps Script (`Code.gs` + `Painel.html`). `Code.template.gs` é o modelo com `__CATS__`/`__SEED__`.
- `pastas/gerar_lub.py` – gera `/lubrificantes/` (categoria + uma página por produto).
- `pastas/gerar_vib.py` – gera a página de venda `/vibradores/vibrador-curvo/` (modelo estilo Apple/Amazon).
- `pastas/pasta.js` – sacola compartilhada com o catálogo + preço/estoque da planilha publicada.

Os geradores leem `../index.html` e escrevem em `pastas/out/`; depois copiar `out/<pasta>` para a raiz do repositório.
