/**
 * Painel Ouse Mais — Google Apps Script
 * --------------------------------------
 * Fica dentro da planilha (Extensões → Apps Script).
 * O painel grava num RASCUNHO. O site só muda quando alguém clica em "Publicar no site".
 *
 * Acesso: link + senha. A senha fica em Configurações do projeto → Propriedades do script → PAINEL_SENHA.
 * Trocar a senha desconecta todos os aparelhos.
 *
 * Abas usadas (criadas pela função instalar):
 *   Rascunho   → onde o painel grava
 *   Publicado  → o que o site mostra (publicar esta aba na Web em CSV)
 *   Histórico  → quem publicou, quando e o quê (com cópia para desfazer)
 */

const CONFIG = {
  // Tentativas erradas de senha antes de bloquear por 15 minutos
  MAX_TENTATIVAS: 5,
  // Endereço do site (usado para mostrar as fotos antigas e o link de prévia)
  SITE: 'https://ousemaisoficial.com.br/',
  // Nome da pasta do Google Drive onde as fotos novas ficam guardadas
  PASTA_FOTOS: 'Ouse Mais - Fotos do site',
};

const TAB_DRAFT = 'Rascunho';
const TAB_PUB = 'Publicado';
const TAB_LOG = 'Histórico';

const HEAD = ['Código', 'Tipo', 'Categoria', 'Produto', 'Marca', 'Selo', 'Descrição', 'Detalhes', 'Opções', 'Itens do kit',
  'Foto', 'Foto ampliada', 'Preço', 'Preço antigo', 'Quantidade', 'Disponível', 'Mostrar no site', 'Ranking', 'Atualizado em', 'Atualizado por',
  'Mais fotos e vídeos', 'Últimas unidades', 'Veste', 'Revisar'];
const KEYS = ['id', 'tipo', 'cat', 'name', 'brand', 'tag', 'desc', 'specs', 'opts', 'items',
  'img', 'imgFull', 'price', 'oldPrice', 'qty', 'avail', 'show', 'rank', 'updatedAt', 'updatedBy', 'media', 'last', 'fits', 'review'];
const NUMERIC = ['price', 'oldPrice', 'qty', 'rank'];

const CATS = ["Lubrificantes", "Anais", "Comestíveis", "Jogos", "Calcinhas", "Lingeries", "Fantasias", "Anéis", "Vibradores", "Kits", "Fetiches", "Masturbadores", "Cuidados"];
const SEED = [
 {
  "id": "kit-a-dois",
  "tipo": "Kit",
  "cat": "Kits",
  "name": "Kit A Dois",
  "brand": "Kit Ouse Mais",
  "tag": "Kit",
  "desc": "Para uma noite diferente: lubrificante que aquece, gel beijável de morango e a pomada esquenta de bolso.",
  "specs": "",
  "opts": "",
  "items": "love-lub-hot, d4-morango, jato-sex-esquenta",
  "img": "img/kit-a-dois.jpg",
  "imgFull": ""
 },
 {
  "id": "kit-love-lub",
  "tipo": "Kit",
  "cat": "Kits",
  "name": "Kit Love Lub Completo",
  "brand": "Kit Ouse Mais",
  "tag": "Kit",
  "desc": "As três versões do Love Lub juntas. Teste o calor, o frio e o neutro e descubra o seu favorito.",
  "specs": "",
  "opts": "",
  "items": "love-lub-hot, love-lub-ice, love-lub-neutro",
  "img": "img/kit-love-lub.jpg",
  "imgFull": ""
 },
 {
  "id": "kit-beijavel",
  "tipo": "Kit",
  "cat": "Kits",
  "name": "Kit Beijável",
  "brand": "Kit Ouse Mais",
  "tag": "Kit",
  "desc": "Três géis para o sexo oral: morango, lolipop com efeito vibrante e o Kuloko de bolso.",
  "specs": "",
  "opts": "",
  "items": "d4-morango, sedenta, kuloko",
  "img": "img/kit-beijavel.jpg",
  "imgFull": ""
 },
 {
  "id": "kit-descoberta",
  "tipo": "Kit",
  "cat": "Kits",
  "name": "Kit Descoberta",
  "brand": "Kit Ouse Mais",
  "tag": "Kit",
  "desc": "Para quem está começando: o vibrador curvo em silicone com o lubrificante neutro, que combina com tudo.",
  "specs": "",
  "opts": "",
  "items": "vibrador-curvo, love-lub-neutro",
  "img": "img/kit-descoberta.jpg",
  "imgFull": ""
 },
 {
  "id": "calcinha-laco",
  "tipo": "Produto",
  "cat": "Calcinhas",
  "name": "Calcinha Laço de Cetim",
  "brand": "Moda íntima",
  "tag": "",
  "desc": "Calcinha fio em renda com laço de cetim e alças reguláveis nas laterais. Dá para levar mais de uma cor no mesmo pedido.",
  "specs": "Renda, Alças reguláveis",
  "opts": "Cor: Preto, Vermelho, Branco, Nude",
  "items": "",
  "img": "img/calcinha-laco.jpg",
  "imgFull": "img/calcinha-laco-full.jpg"
 },
 {
  "id": "calcinha-frase",
  "tipo": "Produto",
  "cat": "Calcinhas",
  "name": "Calcinha com Frase",
  "brand": "Moda íntima",
  "tag": "Cor sob consulta",
  "desc": "Calcinha fio em renda com frase em letras douradas e strass, alças reguláveis. Escolha a frase. As cores disponíveis são confirmadas pela loja no WhatsApp.",
  "specs": "Renda, Letras douradas, Strass",
  "opts": "Frase: ME CHUPA, TODA SUA, SAFADA, ME FODE, DELÍCIA, GOSTOSA, SUA PUTA, ME COME (cor a combinar)",
  "items": "",
  "img": "img/calcinha-frase.jpg",
  "imgFull": "img/calcinha-frase-full.jpg"
 },
 {
  "id": "love-lub-hot",
  "tipo": "Produto",
  "cat": "Lubrificantes",
  "name": "Love Lub Hot",
  "brand": "La Pimienta",
  "tag": "Esquenta",
  "desc": "Lubrificante à base de água com efeito que aquece ao contato.",
  "specs": "60 g, Base água",
  "opts": "",
  "items": "",
  "img": "img/love-lub-hot.jpg",
  "imgFull": ""
 },
 {
  "id": "love-lub-ice",
  "tipo": "Produto",
  "cat": "Lubrificantes",
  "name": "Love Lub Ice",
  "brand": "La Pimienta",
  "tag": "Gelado",
  "desc": "Lubrificante à base de água com sensação refrescante, para quem gosta de contraste.",
  "specs": "60 g, Base água",
  "opts": "",
  "items": "",
  "img": "img/love-lub-ice.jpg",
  "imgFull": ""
 },
 {
  "id": "love-lub-neutro",
  "tipo": "Produto",
  "cat": "Lubrificantes",
  "name": "Love Lub Neutro",
  "brand": "La Pimienta",
  "tag": "",
  "desc": "Lubrificante à base de água sem efeito de calor ou frio. O básico que combina com tudo.",
  "specs": "60 g, Base água",
  "opts": "",
  "items": "",
  "img": "img/love-lub-neutro.jpg",
  "imgFull": ""
 },
 {
  "id": "aqua-silicon",
  "tipo": "Produto",
  "cat": "Lubrificantes",
  "name": "Aqua Silicon",
  "brand": "La Pimienta",
  "tag": "Resiste à água",
  "desc": "Lubrificante resistente à água, feito para usar no banho.",
  "specs": "30 g",
  "opts": "",
  "items": "",
  "img": "img/aqua-silicon.jpg",
  "imgFull": ""
 },
 {
  "id": "rilex-morango",
  "tipo": "Produto",
  "cat": "Lubrificantes",
  "name": "Gel Lubrificante Morango",
  "brand": "Rilex",
  "tag": "",
  "desc": "Gel íntimo solúvel em água, incolor e não gorduroso, com aroma de morango.",
  "specs": "50 g, Base água",
  "opts": "",
  "items": "",
  "img": "img/rilex-morango.jpg",
  "imgFull": ""
 },
 {
  "id": "rilex-menta",
  "tipo": "Produto",
  "cat": "Lubrificantes",
  "name": "Gel Lubrificante Menta",
  "brand": "Rilex",
  "tag": "",
  "desc": "Gel íntimo solúvel em água, incolor e não gorduroso, com aroma de menta.",
  "specs": "50 g, Base água",
  "opts": "",
  "items": "",
  "img": "img/rilex-menta.jpg",
  "imgFull": ""
 },
 {
  "id": "d4-morango",
  "tipo": "Produto",
  "cat": "Comestíveis",
  "name": "D4 Gel Beijável Morango",
  "brand": "Sexy Fantasy",
  "tag": "",
  "desc": "Gel umectante beijável com sabor de morango.",
  "specs": "60 g, Beijável",
  "opts": "",
  "items": "",
  "img": "img/d4-morango.jpg",
  "imgFull": ""
 },
 {
  "id": "sedenta",
  "tipo": "Produto",
  "cat": "Comestíveis",
  "name": "Sedenta por Oral",
  "brand": "Sedenta",
  "tag": "Vibrante",
  "desc": "Gel com efeito vibrante e glitter, sabor lolipop. Feito para o sexo oral.",
  "specs": "50 g, Glitter, Lolipop",
  "opts": "",
  "items": "",
  "img": "img/sedenta.jpg",
  "imgFull": ""
 },
 {
  "id": "kuloko",
  "tipo": "Produto",
  "cat": "Comestíveis",
  "name": "Kuloko Gel Beijável",
  "brand": "Hot Flowers",
  "tag": "",
  "desc": "Gel beijável em bisnaga de 15 g, pequena para levar na bolsa.",
  "specs": "15 g, Beijável",
  "opts": "",
  "items": "",
  "img": "img/kuloko.jpg",
  "imgFull": ""
 },
 {
  "id": "jato-sex-esquenta",
  "tipo": "Produto",
  "cat": "Lubrificantes",
  "name": "Jato Sex Esquenta",
  "brand": "Pepper Blend",
  "tag": "Esquenta",
  "desc": "Pomada esquenta em latinha de 7 g que cabe no bolso.",
  "specs": "7 g",
  "opts": "",
  "items": "",
  "img": "img/jato-sex-esquenta.jpg",
  "imgFull": ""
 },
 {
  "id": "vibrador-curvo",
  "tipo": "Produto",
  "cat": "Vibradores",
  "name": "Vibrador Curvo em U",
  "brand": "Vibrador",
  "tag": "",
  "desc": "Silicone macio com formato curvo que se adapta ao corpo. Pergunte no WhatsApp sobre funções e modos.",
  "specs": "Silicone, Rosa",
  "opts": "",
  "items": "",
  "img": "img/vibrador-curvo.jpg",
  "imgFull": ""
 }
];

/* ============ Abrir o painel ============ */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Painel')
    .setTitle('Painel Ouse Mais')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

/* ============ Entrar e sair ============ */

function login(senha, nome) {
  const props = PropertiesService.getScriptProperties();
  const real = props.getProperty('PAINEL_SENHA');
  if (!real) throw new Error('A senha do painel ainda não foi definida. Veja o passo a passo de instalação.');
  const cache = CacheService.getScriptCache();
  if (cache.get('bloqueado')) throw new Error('Muitas tentativas erradas. Tente de novo em 15 minutos.');
  if (String(senha || '') !== real) {
    const n = Number(cache.get('erros') || 0) + 1;
    cache.put('erros', String(n), 900);
    if (n >= CONFIG.MAX_TENTATIVAS) { cache.put('bloqueado', '1', 900); cache.remove('erros'); }
    throw new Error('Senha incorreta.' + (n < CONFIG.MAX_TENTATIVAS ? ' Restam ' + (CONFIG.MAX_TENTATIVAS - n) + ' tentativas.' : ' Painel bloqueado por 15 minutos.'));
  }
  cache.remove('erros');
  const quem = String(nome || '').trim().slice(0, 40) || 'Equipe';
  const token = Utilities.getUuid();
  props.setProperty('T_' + token, JSON.stringify({ nome: quem, fp: fingerprint_(real) }));
  return { token: token, nome: quem };
}

function logout(token) {
  if (token) PropertiesService.getScriptProperties().deleteProperty('T_' + token);
  return true;
}

/* ============ Funções chamadas pelo painel ============ */

function getData(token) {
  const email = guard_(token);
  return {
    email: email,
    nome: email,
    site: CONFIG.SITE,
    preview: CONFIG.SITE + '?previa=1',
    cats: CATS,
    draft: readTab_(TAB_DRAFT),
    pub: readTab_(TAB_PUB),
    log: readLog_(8),
  };
}

function saveProduct(token, obj) {
  const email = guard_(token);
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const p = clean_(obj);
    if (!p.name) throw new Error('Dê um nome ao produto.');
    const sh = sheet_(TAB_DRAFT);
    const list = readTab_(TAB_DRAFT);
    if (!p.id || !/^[a-z0-9-]+$/i.test(p.id)) p.id = uniqueId_(p.name, list);
    p.updatedAt = now_();
    p.updatedBy = email;
    const idx = list.findIndex(function (x) { return x.id === p.id; });
    if (idx >= 0) {
      sh.getRange(idx + 2, 1, 1, KEYS.length).setValues([rowOf_(p)]);
    } else {
      sh.appendRow(rowOf_(p));
    }
    return { saved: p, draft: readTab_(TAB_DRAFT) };
  } finally {
    lock.releaseLock();
  }
}

// Para revisar: tira o produto da lista de revisão (coluna Revisar do rascunho)
function markReviewed(token, id) {
  guard_(token);
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(TAB_DRAFT);
    readTab_(TAB_DRAFT); // garante a coluna Revisar no cabeçalho
    const values = sh.getDataRange().getValues();
    const head = values[0].map(String);
    const iId = head.indexOf('Código'), iV = head.indexOf('Revisar');
    if (iV < 0) throw new Error('A planilha está sem a coluna Revisar.');
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][iId]).trim() === String(id)) sh.getRange(r + 1, iV + 1).setValue('');
    }
    return { draft: readTab_(TAB_DRAFT) };
  } finally {
    lock.releaseLock();
  }
}

// Mais vendidos: recebe a lista de códigos na ordem (1º, 2º, 3º…) e grava a coluna Ranking do rascunho
function saveRanking(token, ids) {
  const email = guard_(token);
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    ids = (ids || []).map(String).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    const sh = sheet_(TAB_DRAFT);
    const values = sh.getDataRange().getValues();
    const head = values[0].map(String);
    const iId = head.indexOf('Código'), iR = head.indexOf('Ranking'), iA = head.indexOf('Atualizado em'), iB = head.indexOf('Atualizado por');
    if (iId < 0 || iR < 0) throw new Error('A planilha está sem a coluna Ranking.');
    for (let r = 1; r < values.length; r++) {
      const id = String(values[r][iId]).trim(); if (!id) continue;
      const want = ids.indexOf(id) + 1 || '';
      if (String(values[r][iR]) === String(want)) continue;
      sh.getRange(r + 1, iR + 1).setValue(want);
      if (iA >= 0) sh.getRange(r + 1, iA + 1).setValue(now_());
      if (iB >= 0) sh.getRange(r + 1, iB + 1).setValue(email);
    }
    return { draft: readTab_(TAB_DRAFT) };
  } finally {
    lock.releaseLock();
  }
}

function deleteProduct(token, id) {
  guard_(token);
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const list = readTab_(TAB_DRAFT);
    const idx = list.findIndex(function (x) { return x.id === id; });
    if (idx >= 0) sheet_(TAB_DRAFT).deleteRow(idx + 2);
    return readTab_(TAB_DRAFT);
  } finally {
    lock.releaseLock();
  }
}

function getImages(token, urls) {
  guard_(token);
  return (urls || []).slice(0, 6).map(function (u) {
    try {
      u = String(u || '');
      if (!/^https:\/\//.test(u) && !/^img\/[\w.-]+$/.test(u)) return '';
      const abs = /^https:/.test(u) ? u : CONFIG.SITE + u;
      const r = UrlFetchApp.fetch(abs, { followRedirects: true, muteHttpExceptions: true });
      if (r.getResponseCode() !== 200) return '';
      const type = String(r.getHeaders()['Content-Type'] || 'image/jpeg').split(';')[0];
      if (!/^image\//.test(type)) return '';
      return 'data:' + type + ';base64,' + Utilities.base64Encode(r.getBlob().getBytes());
    } catch (e) {
      return '';
    }
  });
}

function uploadPhoto(token, base64, fileName) {
  guard_(token);
  const folder = folder_();
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), 'image/jpeg', fileName || ('foto-' + Date.now() + '.jpg'));
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}

function uploadVideo(token, base64, fileName, mime) {
  guard_(token);
  const folder = folder_();
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), /^video\/[\w.+-]+$/.test(mime || '') ? mime : 'video/mp4', fileName || ('video-' + Date.now() + '.mp4'));
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/file/d/' + file.getId() + '/view';
}

function publish(token) {
  const email = guard_(token);
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const draft = readTab_(TAB_DRAFT);
    const pub = readTab_(TAB_PUB);
    const problems = blocking_(draft);
    if (problems.length) throw new Error('Corrija antes de publicar: ' + problems.join(' · '));
    const summary = summarize_(pub, draft);
    if (!summary.length) return { ok: true, nothing: true, log: readLog_(8) };
    writeTab_(TAB_PUB, draft);
    log_(email, summary.join('\n'), pub);
    return { ok: true, pub: readTab_(TAB_PUB), log: readLog_(8) };
  } finally {
    lock.releaseLock();
  }
}

function discardDraft(token) {
  guard_(token);
  writeTab_(TAB_DRAFT, readTab_(TAB_PUB));
  return readTab_(TAB_DRAFT);
}

function undoLast(token) {
  const email = guard_(token);
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(TAB_LOG);
    const values = sh.getDataRange().getValues();
    for (let r = values.length - 1; r >= 1; r--) {
      const snap = values[r][3];
      if (snap && String(values[r][2]).indexOf('Desfeito') !== 0) {
        const prev = JSON.parse(snap);
        const current = readTab_(TAB_PUB);
        writeTab_(TAB_PUB, prev);
        writeTab_(TAB_DRAFT, prev);
        sh.getRange(r + 1, 3).setValue('Desfeito em ' + now_() + ' — ' + values[r][2]);
        log_(email, 'Desfeito: voltou para a versão anterior à publicação de ' + values[r][0], current, true);
        return { pub: readTab_(TAB_PUB), draft: readTab_(TAB_DRAFT), log: readLog_(8) };
      }
    }
    throw new Error('Não há publicação para desfazer.');
  } finally {
    lock.releaseLock();
  }
}

/* ============ Instalação (rodar uma vez no editor) ============ */

function instalar() {
  const ss = SpreadsheetApp.getActive();
  // Preços e dados que já estavam nas abas antigas
  const old = oldValues_(ss);
  const base = SEED.map(function (s) {
    const o = old[s.id] || {};
    return clean_(Object.assign({}, s, {
      cat: o.cat || s.cat,
      price: o.price, oldPrice: o.oldPrice, rank: o.rank,
      qty: '', avail: o.avail || 'Sim', show: 'Sim',
      updatedAt: now_(), updatedBy: 'instalação',
    }));
  });
  [TAB_PUB, TAB_DRAFT].forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() < 2) writeTab_(name, base);
    formatTab_(sh);
  });
  let lg = ss.getSheetByName(TAB_LOG);
  if (!lg) {
    lg = ss.insertSheet(TAB_LOG);
    lg.getRange(1, 1, 1, 4).setValues([['Data', 'Quem', 'O que mudou', 'Versão anterior (não editar)']]).setFontWeight('bold');
    lg.setFrozenRows(1);
    lg.setColumnWidth(3, 520);
    lg.hideColumns(4);
  }
  const folder = folder_();
  if (!PropertiesService.getScriptProperties().getProperty('PAINEL_SENHA')) Logger.log('Falta definir a senha: Configurações do projeto → Propriedades do script → PAINEL_SENHA.');
  Logger.log('Pronto! Abas criadas: Rascunho, Publicado e Histórico. Pasta de fotos: ' + folder.getUrl());
}

/* ============ Apoio ============ */

function fingerprint_(senha) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'ousemais:' + senha)).slice(0, 16);
}
function guard_(token) {
  const props = PropertiesService.getScriptProperties();
  const raw = token ? props.getProperty('T_' + token) : null;
  const real = props.getProperty('PAINEL_SENHA');
  if (!raw || !real) throw new Error('SESSAO: Entre de novo com a senha do painel.');
  const t = JSON.parse(raw);
  if (t.fp !== fingerprint_(real)) { props.deleteProperty('T_' + token); throw new Error('SESSAO: A senha mudou. Entre de novo.'); }
  return t.nome;
}
function sheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('A aba "' + name + '" não existe. Rode a função instalar no Apps Script.');
  return sh;
}
function now_() {
  return Utilities.formatDate(new Date(), 'America/Maceio', 'dd/MM/yyyy HH:mm');
}
function ensureHead_(sh) {
  // versões novas do painel acrescentam colunas no fim: completa o cabeçalho sem mexer nos dados
  const w = Math.max(sh.getLastColumn ? sh.getLastColumn() : HEAD.length, 1);
  const cur = sh.getRange(1, 1, 1, Math.min(w, HEAD.length)).getValues()[0].map(String);
  const isPrefix = cur.every(function (h, i) { return h === '' || h === HEAD[i]; });
  if (isPrefix && cur.filter(String).length < HEAD.length) sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]);
}
function readTab_(name) {
  const sh = sheet_(name);
  if (sh.getLastRow() >= 1) ensureHead_(sh);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const head = values[0].map(String);
  const idx = HEAD.map(function (h) { return head.indexOf(h); });
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const o = {};
    KEYS.forEach(function (k, i) { const c = idx[i]; o[k] = c >= 0 ? values[r][c] : ''; });
    if (String(o.id).trim() === '') continue;
    out.push(clean_(o));
  }
  return out;
}
function writeTab_(name, list) {
  const sh = sheet_(name);
  sh.clearContents();
  const rows = [HEAD].concat(list.map(rowOf_));
  sh.getRange(1, 1, rows.length, HEAD.length).setValues(rows);
}
function formatTab_(sh) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold').setBackground('#5b0f7a').setFontColor('#ffffff');
  sh.getRange('A:A').setNumberFormat('@');
  sh.getRange('M:N').setNumberFormat('0.00');
}
function rowOf_(o) {
  // texto que começa com = + - @ viraria fórmula na planilha; o apóstrofo guarda como texto
  return KEYS.map(function (k) { const v = o[k]; return v === undefined || v === null ? '' : txt_(v); });
}
function txt_(v) {
  return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
}
function num_(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (typeof v === 'number') return isNaN(v) ? '' : v;
  let s = String(v).replace(/[^\d,.-]/g, '');
  if (!s) return '';
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? '' : n;
}
function yesNo_(v, dflt) {
  const s = String(v === undefined || v === null ? '' : v).trim().toLowerCase();
  if (s === '') return dflt;
  return /^(n|não|nao|false|esgot)/.test(s) ? 'Não' : 'Sim';
}
function clean_(o) {
  const p = {};
  KEYS.forEach(function (k) { p[k] = o[k] === undefined || o[k] === null ? '' : o[k]; });
  ['id', 'tipo', 'cat', 'name', 'brand', 'tag', 'desc', 'specs', 'opts', 'items', 'img', 'imgFull', 'updatedAt', 'updatedBy', 'media', 'fits', 'review']
    .forEach(function (k) { p[k] = String(p[k]).trim(); });
  NUMERIC.forEach(function (k) { p[k] = num_(p[k]); });
  if (p.price !== '' && p.price <= 0) p.price = '';
  if (p.oldPrice !== '' && p.oldPrice <= 0) p.oldPrice = '';
  if (p.qty !== '') p.qty = Math.max(0, Math.floor(p.qty));
  if (p.rank !== '') p.rank = Math.max(1, Math.floor(p.rank));
  p.tipo = /kit/i.test(p.tipo) || p.items ? 'Kit' : 'Produto';
  p.avail = yesNo_(p.avail, 'Sim');
  p.show = yesNo_(p.show, 'Sim');
  p.last = yesNo_(p.last, 'Não');
  return p;
}
function uniqueId_(name, list) {
  const base = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'produto';
  let id = base, n = 2;
  while (list.some(function (x) { return x.id === id; })) id = base + '-' + (n++);
  return id;
}
function blocking_(list) {
  const out = [];
  list.forEach(function (p) {
    if (!p.name) out.push('produto sem nome (' + p.id + ')');
    if (CATS.indexOf(p.cat) < 0) out.push(p.name + ': categoria inválida');
  });
  return out;
}
function money_(v) {
  return v === '' ? 'sob consulta' : 'R$ ' + Number(v).toFixed(2).replace('.', ',');
}
function summarize_(before, after) {
  const out = [];
  const LABEL = { name: 'nome', cat: 'categoria', brand: 'marca', tag: 'selo', desc: 'descrição', specs: 'detalhes', opts: 'opções',
    items: 'itens do kit', img: 'foto', media: 'mais fotos e vídeos', fits: 'numeração que veste', last: 'selo últimas unidades', imgFull: 'foto ampliada', price: 'preço', oldPrice: 'preço antigo', qty: 'quantidade',
    avail: 'disponível', show: 'mostrar no site', rank: 'ranking' };
  const map = {};
  before.forEach(function (p) { map[p.id] = p; });
  after.forEach(function (p) {
    const b = map[p.id];
    if (!b) { out.push('Novo: ' + p.name); return; }
    const ch = [];
    Object.keys(LABEL).forEach(function (k) {
      if (String(b[k]) !== String(p[k])) {
        if (k === 'price' || k === 'oldPrice') ch.push(LABEL[k] + ' ' + money_(b[k]) + ' → ' + money_(p[k]));
        else if (k === 'desc' || k === 'img' || k === 'imgFull' || k === 'media') ch.push(LABEL[k] + ' alterada');
        else ch.push(LABEL[k] + ' ' + (b[k] === '' ? '—' : b[k]) + ' → ' + (p[k] === '' ? '—' : p[k]));
      }
    });
    if (ch.length) out.push(p.name + ': ' + ch.join('; '));
    delete map[p.id];
  });
  Object.keys(map).forEach(function (id) { out.push('Removido: ' + map[id].name); });
  return out;
}
function log_(email, text, snapshot, isUndo) {
  const sh = sheet_(TAB_LOG);
  let snap = JSON.stringify(snapshot);
  if (snap.length > 48000) snap = '';
  sh.appendRow([now_(), txt_(email), txt_(text), snap]);
}
function readLog_(n) {
  const sh = SpreadsheetApp.getActive().getSheetByName(TAB_LOG);
  if (!sh) return [];
  const v = sh.getDataRange().getValues();
  const out = [];
  for (let r = v.length - 1; r >= 1 && out.length < n; r--) {
    out.push({ when: String(v[r][0]), who: String(v[r][1]), what: String(v[r][2]), canUndo: !!v[r][3] && String(v[r][2]).indexOf('Desfeito') !== 0 });
  }
  return out;
}
function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* pasta apagada: cria outra */ }
  }
  const it = DriveApp.getFoldersByName(CONFIG.PASTA_FOTOS);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG.PASTA_FOTOS);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}
function oldValues_(ss) {
  const out = {};
  function read(name, map) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const v = sh.getDataRange().getValues();
    const h = v[0].map(function (x) { return String(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); });
    const ci = function (re) { return h.findIndex(function (x) { return re.test(x); }); };
    const iId = ci(/^codigo/);
    if (iId < 0) return;
    for (let r = 1; r < v.length; r++) {
      const id = String(v[r][iId]).trim();
      if (!id) continue;
      const o = out[id] || (out[id] = {});
      map(o, v[r], ci);
    }
  }
  read('Produtos', function (o, row, ci) {
    const iC = ci(/^categoria/), iP = ci(/^preco \(/), iO = ci(/^preco antigo/), iR = ci(/^ranking/), iD = ci(/^disponib/);
    if (iC >= 0 && CATS.indexOf(String(row[iC]).trim()) >= 0) o.cat = String(row[iC]).trim();
    if (iP >= 0) o.price = row[iP];
    if (iO >= 0) o.oldPrice = row[iO];
    if (iR >= 0) o.rank = row[iR];
    if (iD >= 0 && /esgot/i.test(String(row[iD]))) o.avail = 'Não';
  });
  read('Kits', function (o, row, ci) {
    const iP = ci(/^preco do kit/), iD = ci(/^disponib/);
    if (iP >= 0) o.price = row[iP];
    if (iD >= 0 && /esgot/i.test(String(row[iD]))) o.avail = 'Não';
  });
  return out;
}
