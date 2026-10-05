/* Ouse Mais — script único do site: página inicial, páginas de categoria e páginas de produto.
   Os produtos vêm da planilha publicada pelo painel (aba "Publicado"). A sacola fica salva no aparelho
   e é a mesma em todas as páginas. */
(function(){
"use strict";
const WHATS = "5582999080594";
const SITE = "https://ousemaisoficial.com.br/";
const CATS = [{id:"all", slug:"", label:"Todos", title:"Todos os produtos"}].concat(/*CATEGORIAS*/[]);
const PAGE = window.OUSE_PAGE || {type:"home"};
const CORES = /*CORES*/{}; // id do produto -> [cor de fundo pastel, foto com fundo branco?]
const SHEETS = {
  catalogo: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSPn1Ol7iSoSkxcpbZbTENz58C20TOy0tNjp-GkXeQHjNn7_6-4fpoS3NHwTycVT3GzdNTClAtunJu5/pub?single=true&output=csv&gid=1296274691",
  previa: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSPn1Ol7iSoSkxcpbZbTENz58C20TOy0tNjp-GkXeQHjNn7_6-4fpoS3NHwTycVT3GzdNTClAtunJu5/pub?single=true&output=csv&gid=777522530",
  entrega: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSPn1Ol7iSoSkxcpbZbTENz58C20TOy0tNjp-GkXeQHjNn7_6-4fpoS3NHwTycVT3GzdNTClAtunJu5/pub?single=true&output=csv&gid=263919990",
};
const COPIA = "/dados/catalogo.csv"; // cópia feita na última atualização do site, usada se a planilha não responder
const IS_PREVIEW = /[?&]previa\b/.test(location.search);

const PRODUCTS = [];
let DATAV = 0;           // muda sempre que chegam dados novos da planilha
let READY = false;       // dados carregados
let FINAL = false;       // dados da planilha (ou da cópia) já chegaram — antes disso pode ser só o cache do aparelho
const $ = id => document.getElementById(id);
const brl = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const wa = msg => `https://wa.me/${WHATS}?text=${encodeURIComponent(msg)}`;
const byId = id => PRODUCTS.find(p=>p.id===id);
const catOf = id => CATS.find(c=>c.id===id);
const norm = s => (s||"").toString().normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const slug = s => norm(s).trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const A = u => /^img\//.test(u) ? "/" + u : u;  // caminhos de imagem valem em qualquer página
const Q = IS_PREVIEW ? "?previa" : "";
const catUrl = id => { const c = catOf(id); return c && c.slug ? `/${c.slug}/${Q}` : `/${Q}`; };
const purl = p => { const c = catOf(p.cat); return `/${c && c.slug ? c.slug : "produto"}/${p.id}/${Q}`; };
const IMG = p => p.img ? A(p.img) : (p.items && p.items.length && byId(p.items[0]) ? IMG(byId(p.items[0])) : `/img/${p.id}.jpg`);
const FULL = p => p.imgFull ? A(p.imgFull) : IMG(p);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fitText = v => { const [m, o] = String(v||"").split(" · "); if (!m) return ""; const t = /^tamanho/i.test(m) ? "Tamanho único" : (m.includes(" ao ") ? `Veste do ${m}` : `Veste ${m}`); return o ? `${t} · ${o}` : t; };
const altOf = p => `${p.name}${p.brand && !p.items && !p.name.includes(p.brand) && !/^(moda íntima|vibrador)$/i.test(p.brand) ? ` – ${p.brand}` : ""}`;

/* ---------- Sacola ---------- */
let cart = {};
// a sacola fica salva no aparelho por até 48 h (discrição em celular compartilhado)
try{ const s = JSON.parse(localStorage.getItem("ousemais-sacola")||"null"); cart = (s && s.items && Date.now()-s.t < 48*3600e3) ? s.items : {}; }catch(e){ cart = {}; }
const P = k => byId(k.split("|")[0]);
const optOf = (p,k) => { const o = k.split("|")[1]; return o && p && p.variants ? p.variants.options.find(x=>x.id===o) : null; };
const lineLabel = k => { const p = P(k), o = optOf(p,k); return o ? (o.lab || `${p.variants.label}: ${o.name}`) : ""; };
const selVar = {};
const firstOpt = v => (v.options.find(o=>o.qty!==0) || v.options[0]).id;
const curKey = p => p.variants ? `${p.id}|${selVar[p.id]||firstOpt(p.variants)}` : p.id;
const keysOf = p => Object.keys(cart).filter(k=>k===p.id || k.startsWith(p.id+"|"));
const save = () => { try{ if (Object.keys(cart).length) localStorage.setItem("ousemais-sacola", JSON.stringify({t:Date.now(), items:cart})); else localStorage.removeItem("ousemais-sacola"); }catch(e){} };
const liveKeys = () => Object.keys(cart).filter(k=>P(k));
const itemsCount = () => liveKeys().reduce((s,k)=>s+cart[k],0);
window.addEventListener("storage", e=>{ if (e.key==="ousemais-sacola"){ try{ const s = JSON.parse(e.newValue||"null"); cart = s && s.items || {}; }catch(_){ cart = {}; } refresh(); } });

function qtyHTML(k, q){
  const n = P(k).name + (lineLabel(k)?` (${lineLabel(k)})`:"");
  return `<div class="qty"><button type="button" data-act="dec" data-key="${k}" aria-label="Remover um ${n}">−</button><output aria-label="Quantidade na sacola">${q}</output><button type="button" data-act="inc" data-key="${k}" aria-label="Adicionar mais um ${n}">+</button></div>`;
}
function varHTML(p, ctx){
  const v = p.variants; if (!v) return "";
  const sel = selVar[p.id]||firstOpt(v);
  const inCart = v.options.filter(o=>cart[`${p.id}|${o.id}`]).map(o=>`${o.name} ×${cart[`${p.id}|${o.id}`]}`);
  if (v.type==="combo"){
    const cur = v.options.find(o=>o.id===sel) || v.options[0], [Ad,B] = v.dims;
    const combo = (ai,bi) => v.options.find(o=>o.a===ai && o.b===bi);
    const outA = x => v.options.filter(o=>o.a===x.id).every(o=>o.qty===0);
    const rowA = Ad.type==="swatch"
      ? `<div class="sw" role="group" aria-label="${Ad.label}">${Ad.options.map(x=>{ const c = combo(x.id, cur.b), has = v.options.some(o=>o.a===x.id && cart[`${p.id}|${o.id}`]); return `<button type="button" class="swb${has?" has":""}${outA(x)?" out":""}" style="--c:${x.color}" data-var="${p.id}" data-opt="${c.id}" aria-pressed="${x.id===cur.a}" title="${x.name}${outA(x)?" (esgotado)":""}"><span class="sr">${Ad.label} ${x.name}${outA(x)?" (esgotado)":""}</span></button>`; }).join("")}<span class="swn">${Ad.options.find(x=>x.id===cur.a).name}</span></div>`
      : `<div class="seg" role="group" aria-label="${Ad.label}"><span class="segl">${Ad.label}</span>${Ad.options.map(x=>`<button type="button" class="segb${outA(x)?" out":""}" data-var="${p.id}" data-opt="${combo(x.id,cur.b).id}" aria-pressed="${x.id===cur.a}">${x.name}</button>`).join("")}</div>`;
    const rowB = `<div class="seg" role="group" aria-label="${B.label}"><span class="segl">${B.label}</span>${B.options.map(y=>{ const c = combo(cur.a, y.id); return `<button type="button" class="segb${c.qty===0?" out":""}${cart[`${p.id}|${c.id}`]?" has":""}" data-var="${p.id}" data-opt="${c.id}" aria-pressed="${y.id===cur.b}" title="${y.name}${c.qty===0?" (esgotado nessa combinação)":""}">${y.name}</button>`; }).join("")}</div>`;
    return `<div class="var">${rowA}${rowB}${cur.qty===0?`<div class="incart" style="color:var(--muted)">${cur.name}: esgotado</div>`:""}${inCart.length?`<div class="incart">Na sacola: ${inCart.join(" · ")}</div>`:""}</div>`;
  }
  const picker = v.type==="swatch"
    ? `<div class="sw" role="group" aria-label="${v.label}">${v.options.map(o=>`<button type="button" class="swb${cart[`${p.id}|${o.id}`]?" has":""}${o.qty===0?" out":""}" style="--c:${o.color}" data-var="${p.id}" data-opt="${o.id}" aria-pressed="${o.id===sel}" title="${o.name}${o.qty===0?" (esgotado)":""}"><span class="sr">${o.name}${o.qty===0?" (esgotado)":""}</span></button>`).join("")}<span class="swn">${v.options.find(o=>o.id===sel).name}${v.options.find(o=>o.id===sel).qty===0?" · esgotado":""}</span></div>`
    : `<label class="vsel" for="${ctx}-${p.id}"><span>${v.label}</span><select id="${ctx}-${p.id}" data-varsel="${p.id}">${v.options.map(o=>`<option value="${o.id}"${o.id===sel?" selected":""}${o.qty===0&&o.id!==sel?" disabled":""}>${o.name}${o.qty===0?" (esgotado)":""}${cart[`${p.id}|${o.id}`]?` (${cart[`${p.id}|${o.id}`]} na sacola)`:""}</option>`).join("")}</select></label>`;
  return `<div class="var">${picker}${inCart.length?`<div class="incart">Na sacola: ${inCart.join(" · ")}</div>`:""}</div>`;
}
function priceHTML(p){
  return p.price!=null
    ? `<span class="price">${p.oldPrice>p.price?`<s>${brl(p.oldPrice)}</s>`:""}${brl(p.price)}</span>${p.oldPrice>p.price?`<span class="save">Economize ${brl(p.oldPrice-p.price)}</span>`:""}`
    : `<span class="price ask">Preço sob consulta</span>`;
}
function buyHTML(p, ctx="c"){
  const k = curKey(p), q = cart[k]||0, big = ctx==="p";
  const price = priceHTML(p);
  if (p.soldOut && !q) return varHTML(p,ctx) + price + `<a class="soon" href="${wa(`Olá! Quero o ${p.name}, que está esgotado no catálogo. Me avisa quando chegar?`)}" target="_blank" rel="noopener">Avise-me quando chegar</a>`;
  const so = p.variants ? optOf(p,k) : null;
  if (so && so.qty===0 && !q) return varHTML(p,ctx) + price + `<button type="button" class="add" disabled>${p.variants.type==="combo" ? "Esgotado nessa combinação" : `Esgotado nesta ${p.variants.label.toLowerCase()}`}</button>`;
  return varHTML(p,ctx) + price + (q ? qtyHTML(k,q) + (big ? `<button type="button" class="btn ghost seebag" data-cart>Ver sacola e enviar pedido</button>` : "") : `<button type="button" class="add" data-act="inc" data-key="${k}">+ Adicionar${big?" à sacola":""}</button>`);
}
function orderMsg(){
  const ids = liveKeys();
  const known = ids.every(k=>P(k).price!=null);
  const sum = ids.reduce((s,k)=>s+(P(k).price||0)*cart[k],0);
  const lines = ids.map(k=>{ const p=P(k), o=optOf(p,k); return `• ${cart[k]}x ${p.name}${o?` — ${o.msg || `${p.variants.label.toLowerCase()} ${o.name}`}${p.variants.note?` (${p.variants.note})`:""}`:""}${p.items||p.variants||!p.brand||p.name.includes(p.brand)?"":` (${p.brand})`}${p.price!=null?` — ${brl(p.price*cart[k])}`:""}${p.items?`\n   (${p.items.filter(byId).map(i=>byId(i).name).join(" + ")})`:""}`; });
  return `Olá, Ouse Mais! Montei este pedido pelo catálogo:\n\n${lines.join("\n")}${known&&ids.length?`\n\nTotal: ${brl(sum)}`:""}\n\n${known?"Podem me passar as informações de pagamento para eu finalizar?":"Podem me confirmar os valores e as informações de pagamento?"}`;
}

/* ---------- Galeria de fotos e vídeos ---------- */
const driveId = u => (String(u).match(/drive\.google\.com\/file\/d\/([\w-]+)/)||[])[1];
const ytId = u => (String(u).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/)||[])[1];
const hasGal = p => !!((p.items && p.items.length) || (p.media && p.media.length));
function slidesOf(p, big){
  const out = [];
  if (p.items && p.items.length){
    if (p.img) out.push({src:A(p.img), cap:"O kit completo", first:true});
    p.items.filter(byId).forEach(i=>out.push({src:IMG(byId(i)), cap:byId(i).name, item:i}));
  } else out.push({src: big ? FULL(p) : IMG(p), cap:p.name, first:true});
  (p.media||[]).forEach(u=>{
    const d = driveId(u), y = ytId(u);
    if (y) out.push({video:`https://www.youtube-nocookie.com/embed/${y}?rel=0&playsinline=1`, thumb:`https://i.ytimg.com/vi/${y}/hqdefault.jpg`, cap:"Vídeo"});
    else if (d) out.push({video:`https://drive.google.com/file/d/${d}/preview`, thumb:`https://drive.google.com/thumbnail?id=${d}&sz=w800`, cap:"Vídeo"});
    else out.push({src:A(u), cap:p.name});
  });
  return out;
}
// card: cada foto é um link para a página do produto · página do produto: fotos grandes e vídeos tocando ali
function galHTML(p, card){
  const slides = slidesOf(p, !card);
  const kit = !!p.items;
  const href = purl(p);
  const slide = (s,i) => {
    const label = `${s.video?"Vídeo":"Foto"} ${i+1} de ${slides.length}${s.cap?": "+s.cap:""}`;
    let inner;
    if (s.video && !card) inner = `<iframe src="${s.video}" title="Vídeo de ${p.name}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    else if (s.video) inner = `<img src="${s.thumb}" alt="Vídeo de ${p.name}" loading="lazy" class="vthumb"><span class="vplay" aria-hidden="true">▶</span>`;
    else inner = `<img src="${s.src}" alt="${s.first ? altOf(p) : s.cap}"${i||card?' loading="lazy"':' fetchpriority="high"'}>`;
    const cap = (kit && !s.first && !s.video) ? `<span class="gal-cap">${s.cap}</span>` : (s.video && card ? `<span class="gal-cap">Ver vídeo</span>` : "");
    return card
      ? `<a class="gal-slide${s.video?" is-video":""}" href="${href}" aria-label="${label}">${inner}${cap}</a>`
      : `<div class="gal-slide${s.video?" is-video":""}" role="group" aria-label="${label}">${inner}${cap}</div>`;
  };
  return `<div class="gal" data-gal data-kit="${p.id}">
    <div class="gal-track">${slides.map(slide).join("")}</div>
    ${slides.length>1 ? `<button type="button" class="gal-nav prev" data-gal-nav="-1" aria-label="Anterior">‹</button>
    <button type="button" class="gal-nav next" data-gal-nav="1" aria-label="Próxima">›</button>
    <div class="gal-dots" aria-hidden="true">${slides.map((_,i)=>`<i${i?"":' class="on"'}></i>`).join("")}</div>` : ""}
  </div>`;
}
function thumbsHTML(p){
  const slides = slidesOf(p, true); if (slides.length < 2) return "";
  return `<div class="pthumbs" role="group" aria-label="Escolher foto">${slides.map((s,i)=>`<button type="button" class="pth${i?"":" on"}" data-thumb="${i}" aria-label="${s.video?"Ver vídeo":`Ver foto ${i+1}`}"><img src="${s.thumb||s.src}" alt="" loading="lazy">${s.video?'<span class="vplay" aria-hidden="true">▶</span>':""}</button>`).join("")}</div>`;
}
function wireGals(root){
  root.querySelectorAll("[data-gal]").forEach(g=>{
    if (g.dataset.wired) return; g.dataset.wired = 1;
    const t = g.querySelector(".gal-track"), dots = [...g.querySelectorAll(".gal-dots i")];
    const ths = [...(g.parentElement.querySelectorAll("[data-thumb]")||[])];
    t.addEventListener("scroll", ()=>{ const i = Math.round(t.scrollLeft / t.clientWidth); dots.forEach((d,j)=>d.classList.toggle("on", j===i)); ths.forEach((d,j)=>d.classList.toggle("on", j===i)); }, {passive:true});
  });
}
function tagsHTML(p){
  const t = [];
  if (p.soldOut) t.push(`<span class="tag out">Esgotado</span>`);
  else if (p.lastUnits) t.push(`<span class="tag last">Últimas unidades</span>`);
  if (TOP.has(p.id)) t.push(`<span class="tag best">Mais vendido</span>`);
  if (p.tag) t.push(`<span class="tag${p.items?" kit":""}">${p.tag}</span>`);
  return t.length ? `<div class="tags">${t.join("")}</div>` : "";
}

/* ---------- Listas e ordenação ---------- */
let sortBy = "destaque";
const ORDER = new Map();
let TOP = new Set();
const byPrice = dir => (a,b)=>{
  if (a.price==null && b.price==null) return ORDER.get(a.id)-ORDER.get(b.id);
  if (a.price==null) return 1; if (b.price==null) return -1;
  return dir*(a.price-b.price) || ORDER.get(a.id)-ORDER.get(b.id);
};
const SORTS = {
  destaque:(a,b)=>ORDER.get(a.id)-ORDER.get(b.id),
  vendidos:(a,b)=>(b.vendidos||0)-(a.vendidos||0) || ORDER.get(a.id)-ORDER.get(b.id),
  menor:byPrice(1), maior:byPrice(-1),
  az:(a,b)=>a.name.localeCompare(b.name,"pt-BR"),
};
const HAY = new Map();
const hayOf = p => norm([p.name,p.brand,p.desc,p.tag,...(p.specs||[]),catOf(p.cat)?.label,...(p.items||[]).filter(byId).flatMap(i=>[byId(i).name,byId(i).desc]),...(p.variants?p.variants.options.map(o=>o.name):[]),p.cat==="calcinhas"?"calcinha lingerie moda intima":""].join(" "));

function cardHTML(p){
  const href = purl(p);
  return `
    <article class="card${keysOf(p).length?" in":""}${p.soldOut?" sold":""}">
      ${hasGal(p)
        ? `<div class="plate has-gal">${tagsHTML(p)}${galHTML(p,true)}</div>`
        : `<a class="plate" href="${href}" aria-label="Ver ${p.name}">${tagsHTML(p)}<img src="${IMG(p)}" alt="${altOf(p)}" loading="lazy"${p.imgFull?' class="photo"':''}></a>`}
      <div class="info">
        <div class="brand">${p.brand}</div>
        <h3 class="name"><a href="${href}">${p.name}</a></h3>
        ${p.fits?`<div class="fits">${fitText(p.fits.split(" · ")[0])}</div>`:""}
        <ul class="specs">${p.specs.map(s=>`<li>${s}</li>`).join("")}</ul>
        <div class="buy">${buyHTML(p,"c")}</div>
      </div>
    </article>`;
}
const moreHTML = () => `
    <a class="more" href="${wa("Olá! Vi o catálogo da Ouse Mais e quero saber se vocês têm outro produto.")}" target="_blank" rel="noopener">
      <strong>Procurando outro produto?</strong>
      <span>A loja tem moda íntima, outros sabores e muito mais.</span>
      <em>Perguntar no WhatsApp →</em>
    </a>`;
const hueOf = hex => { const n = parseInt(hex.slice(1),16), r=(n>>16&255)/255, g=(n>>8&255)/255, b=(n&255)/255, mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn; if (!d) return 0; const h = mx===r ? ((g-b)/d)%6 : mx===g ? (b-r)/d+2 : (r-g)/d+4; return (h*60+360)%360; };
function tilesHTML(except){
  const used = []; // tons já usados: cada caixa tenta um tom diferente da anterior
  const dist = h => used.length ? Math.min(...used.map(u=>Math.min(Math.abs(u-h),360-Math.abs(u-h)))) : 360;
  return CATS.filter(c=>c.id!=="all" && c.id!==except).map(c=>{
    const ps = PRODUCTS.filter(p=>p.cat===c.id);
    if (!ps.length) return "";
    // foto de embalagem (fundo branco) fica melhor sobre a cor; entre elas, a de tom mais diferente das outras caixas
    const soltos = ps.filter(p=>!p.items), pool = soltos.length ? soltos : ps;
    const emb = pool.filter(p=>CORES[p.id] && (c.cheia ? !CORES[p.id][1] : CORES[p.id][1]));
    const p0 = (emb.length ? emb.slice().sort((a,b)=>(dist(hueOf(CORES[b.id][0]))>=60)-(dist(hueOf(CORES[a.id][0]))>=60) || pool.indexOf(a)-pool.indexOf(b))[0] : null) || pool.find(p=>CORES[p.id]) || pool[0];
    if (CORES[p0.id]) used.push(hueOf(CORES[p0.id][0]));
    // categorias marcadas como "cheia" (fetiches, fantasias): a foto ocupa a caixa inteira
    const cor = (CORES[p0.id]||[])[0] || "#f3d6e8", foto = c.cheia || !(CORES[p0.id]||[])[1];
    return `<a class="tile" href="${catUrl(c.id)}"><span class="tile-img${foto?" foto":""}" style="background:${cor}"><img src="${IMG(p0)}" alt="" loading="lazy"></span><span class="tile-t">${c.label}</span><span class="tile-n">${ps.length} ${ps.length===1?"produto":"produtos"}</span></a>`;
  }).join("");
}

/* ---------- Página inicial e páginas de categoria ---------- */
let current = PAGE.type==="cat" ? PAGE.cat : "all";
if (PAGE.type==="home") try{ const h = location.hash.slice(1); if (CATS.some(c=>c.id===h)) current = h; }catch(e){}
let query = "";

function renderFilters(){
  const filters = $("filters"); if (!filters) return;
  filters.innerHTML = CATS.map(c=>{
    const n = c.id==="all" ? PRODUCTS.length : PRODUCTS.filter(p=>p.cat===c.id).length;
    return `<button type="button" id="f-${c.id}" data-cat="${c.id}" aria-pressed="${c.id===current}">${c.label}${n?`<span class="n">${n}</span>`:""}</button>`;
  }).join("");
}
function renderGrid(){
  const grid = $("grid"), filters = $("filters");
  if (!grid || !READY) return;
  const terms = norm(query).split(/\s+/).filter(Boolean);
  const searching = terms.length>0;
  const base = searching ? PRODUCTS : (current==="all" ? PRODUCTS : PRODUCTS.filter(p=>p.cat===current));
  const list = base.filter(p=>terms.every(t=>(HAY.get(p.id)||"").includes(t))).sort(SORTS[sortBy]);
  if (filters) filters.setAttribute("aria-disabled", searching);
  const c = catOf(current);
  if ($("sec-title")) $("sec-title").textContent = searching ? `Resultados para “${query.trim()}”` : (PAGE.type==="cat" ? `Todos os produtos de ${c.label.toLowerCase()}` : c.title);
  if ($("count")) $("count").textContent = `${list.length} ${list.length===1?"produto":"produtos"}`;
  const cl = $("cat-link"); if (cl){ cl.hidden = searching || current==="all" || !list.length; if (!cl.hidden){ cl.href = catUrl(current); cl.textContent = `Abrir a página de ${c.label.toLowerCase()} →`; } }
  if (!searching && !list.length){
    grid.innerHTML = `<div class="noresult"><strong>${c.label}: em breve no catálogo</strong><p>A loja tem produtos dessa categoria. Pergunte no WhatsApp quais estão disponíveis.</p><a class="btn" href="${wa(`Olá! Quero ver as opções de ${c.label.toLowerCase()} da Ouse Mais.`)}" target="_blank" rel="noopener">Ver opções no WhatsApp</a></div>`;
    return;
  }
  if (searching && !list.length){
    grid.innerHTML = `<div class="noresult"><strong>Nenhum produto encontrado</strong><p>Pode ser que a loja tenha e ele só não esteja no catálogo.</p><a class="btn" href="${wa(`Olá! Procurei por "${query.trim()}" no catálogo da Ouse Mais. Vocês têm?`)}" target="_blank" rel="noopener">Perguntar no WhatsApp</a></div>`;
    return;
  }
  const keep = {}; grid.querySelectorAll("[data-gal]").forEach(g=>{ keep[g.dataset.kit] = g.querySelector(".gal-track").scrollLeft; });
  grid.innerHTML = list.map(cardHTML).join("") + moreHTML();
  wireGals(grid);
  grid.querySelectorAll("[data-gal]").forEach(g=>{ if(keep[g.dataset.kit]) g.querySelector(".gal-track").scrollLeft = keep[g.dataset.kit]; });
}
function renderTiles(){
  const t = $("cat-tiles"); if (!t || !READY) return;
  t.innerHTML = tilesHTML(PAGE.type==="cat" ? PAGE.cat : null);
  const box = t.closest("section"); if (box) box.hidden = !t.innerHTML.trim();
}
function renderCatHero(){
  const h = $("cat-hero"); if (!h || !READY) return;
  const c = catOf(PAGE.cat); if (!c) return;
  const ps = PRODUCTS.filter(p=>p.cat===c.id);
  const art = c.capa
    ? `<div class="ch-art photo"><img src="${A(c.capa)}" alt="${c.title} da Ouse Mais" fetchpriority="high"></div>`
    : (ps.length ? `<div class="ch-art trio">${ps.filter(p=>!p.items).concat(ps.filter(p=>p.items)).slice(0,3).map((p,i)=>`<img src="${IMG(p)}" alt="${i?"":altOf(p)}"${i?' loading="lazy"':' fetchpriority="high"'}>`).join("")}</div>` : "");
  h.innerHTML = `<nav class="crumbs" aria-label="Você está em"><a href="/${Q}">Início</a><span aria-hidden="true">›</span><span aria-current="page">${c.label}</span></nav>
    <div class="ch${art?"":" noart"}"><div class="ch-txt"><p class="eyebrow">Ouse Mais · Campestre/AL</p><h1>${c.title}</h1><p>${c.intro||""}</p>
    <p class="ch-n">${ps.length} ${ps.length===1?"produto":"produtos"} · embalagem sigilosa · pedido pelo WhatsApp</p></div>${art}</div>`;
}

/* ---------- Página do produto ---------- */
function kitsWith(p){ return PRODUCTS.filter(k=>k.items && k.items.includes(p.id)); }
function renderProduct(){
  const box = $("prod"); if (!box || !READY) return;
  const p = byId(PAGE.id);
  if (!p){
    if (!FINAL) return; // ainda esperando a planilha
    const c = catOf(PAGE.cat);
    document.title = "Produto indisponível | Ouse Mais";
    box.innerHTML = `<nav class="crumbs" aria-label="Você está em"><a href="/${Q}">Início</a>${c && c.slug?`<span aria-hidden="true">›</span><a href="${catUrl(c.id)}">${c.label}</a>`:""}</nav>
      <div class="noresult gone"><strong>Este produto não está no catálogo agora</strong><p>Ele pode ter esgotado ou saído do site. Veja produtos parecidos ou pergunte no WhatsApp.</p>
      <div class="btns" style="justify-content:center">${c && c.slug?`<a class="btn" href="${catUrl(c.id)}">Ver ${c.label.toLowerCase()}</a>`:`<a class="btn" href="/${Q}">Ver o catálogo</a>`}<a class="btn ghost" href="${wa("Olá! Vi um produto no site da Ouse Mais que não aparece mais. Vocês ainda têm?")}" target="_blank" rel="noopener">Perguntar no WhatsApp</a></div></div>`;
    renderRelated(null);
    return;
  }
  const c = catOf(p.cat);
  if (PAGE.auto){
    const want = purl(p).split("?")[0];
    if (location.pathname !== want){ location.replace(want + location.search); return; }
    document.title = `${p.name} | Ouse Mais`;
  }
  const k = curKey(p), o = optOf(p,k);
  const direct = wa(`Olá, Ouse Mais! Quero o ${p.name}${o?` (${o.msg || o.name})`:""}${p.brand && !p.items && !p.name.includes(p.brand) && !/^(moda íntima|vibrador)$/i.test(p.brand)?` – ${p.brand}`:""}. ${p.price!=null?"Podem me passar as informações de pagamento?":"Podem me confirmar o valor e as informações de pagamento?"}`);
  if (box.dataset.shown===p.id && box.dataset.v===String(DATAV)){
    // só a parte de comprar muda (opção escolhida, sacola): a galeria fica como está
    box.querySelector(".pdp-buy").innerHTML = buyHTML(p,"p");
    box.querySelector(".pdp-wa").href = direct;
    return;
  }
  const kits = kitsWith(p);
  box.innerHTML = `<nav class="crumbs" aria-label="Você está em"><a href="/${Q}">Início</a><span aria-hidden="true">›</span><a href="${catUrl(p.cat)}">${c.label}</a><span aria-hidden="true">›</span><span aria-current="page">${p.name}</span></nav>
  <article class="pdp${p.soldOut?" sold":""}">
    <div class="pdp-media">${tagsHTML(p)}${hasGal(p) ? galHTML(p,false) : `<img class="pdp-img" src="${FULL(p)}" alt="${altOf(p)}" fetchpriority="high">`}${thumbsHTML(p)}</div>
    <div class="pdp-info">
      ${p.brand?`<div class="brand">${p.brand}</div>`:""}
      <h1>${p.name}</h1>
      ${p.fits?`<p class="fits">${fitText(p.fits)}</p>`:""}
      <p class="pdp-desc">${p.desc}</p>
      ${p.specs.length?`<ul class="specs">${p.specs.map(s=>`<li>${s}</li>`).join("")}</ul>`:""}
      ${p.items && p.items.length ? `<div class="kitlist"><strong>Vem no kit</strong><ul>${p.items.filter(byId).map(i=>{const x=byId(i);return `<li><a href="${purl(x)}"><img src="${IMG(x)}" alt=""><span>${x.name}<small>${[x.brand,x.specs[0]].filter(Boolean).join(" · ")}</small></span></a></li>`;}).join("")}</ul></div>` : ""}
      <div class="buy pdp-buy">${buyHTML(p,"p")}</div>
      ${p.lastUnits && !p.soldOut ? `<p class="pdp-stock">Últimas unidades</p>` : ""}
      <a class="pdp-wa" href="${direct}" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.9S23.2 3 16 3z"/></svg>Prefere pedir direto? Chame no WhatsApp</a>
      <ul class="pdp-good">
        <li><b>Embalagem sigilosa</b><span>Seu pedido chega sem nenhuma identificação do que tem dentro.</span></li>
        <li><b>Pedido pelo WhatsApp</b><span>Monte a sacola e envie: a loja confirma pagamento e entrega por lá.</span></li>
      </ul>
    </div>
  </article>
  ${kits.length ? `<section class="pdp-kits" aria-labelledby="k-t"><h2 id="k-t">Também vem ${kits.length===1?"no kit":"nos kits"}</h2><div class="kitrow">${kits.map(x=>`<a class="kitcard" href="${purl(x)}"><img src="${IMG(x)}" alt="" loading="lazy"><span><b>${x.name}</b><small>${x.items.filter(byId).map(i=>byId(i).name).join(" + ")}</small>${x.price!=null?`<em>${brl(x.price)}</em>`:""}</span></a>`).join("")}</div></section>` : ""}`;
  box.dataset.shown = p.id; box.dataset.v = DATAV;
  wireGals(box);
  renderRelated(p);
}
function renderRelated(p){
  const r = $("related"); if (!r) return;
  const cat = p ? p.cat : PAGE.cat;
  const same = PRODUCTS.filter(x=>x.cat===cat && (!p || x.id!==p.id));
  // mesma marca e quem divide kit com ele aparecem primeiro
  const mates = new Set(p ? kitsWith(p).flatMap(k=>k.items) : []);
  const list = same.sort((a,b)=>((p && a.brand!==p.brand)-(p && b.brand!==p.brand)) || (!mates.has(a.id))-(!mates.has(b.id)) || ORDER.get(a.id)-ORDER.get(b.id)).slice(0,4);
  const c = catOf(cat);
  r.innerHTML = list.length ? `<div class="section-h"><div class="sh-l"><h2>Mais em ${c ? c.label.toLowerCase() : "nosso catálogo"}</h2></div>${c && c.slug?`<a class="catlink" href="${catUrl(c.id)}">Ver todos →</a>`:""}</div><div class="grid">${list.map(cardHTML).join("")}</div>` : "";
  wireGals(r);
}

/* ---------- Sacola: barra e popup ---------- */
function renderBag(){
  const ids = liveKeys(), total = itemsCount();
  $("bag").classList.toggle("show", total>0); document.body.classList.toggle("bag-on", total>0);
  $("badge").textContent = total;
  $("bag-title").textContent = `Sacola · ${total} ${total===1?"item":"itens"}`;
  $("bag-items").textContent = ids.map(k=>`${cart[k]}× ${P(k).name}${optOf(P(k),k)?` ${optOf(P(k),k).name.toLowerCase()}`:""}`).join(", ");
  const href = wa(orderMsg());
  $("bag-send").href = href; $("c-send").href = href;
}
let ENTREGA = {};
function renderCart(){
  const ids = liveKeys(), total = itemsCount();
  $("c-count").textContent = total ? `${total} ${total===1?"item":"itens"}` : "";
  $("c-lines").innerHTML = ids.length ? ids.map(k=>{ const p=P(k), q=cart[k]; return `
    <li class="line">
      <a href="${purl(p)}" tabindex="-1" aria-hidden="true"><img src="${IMG(p)}" alt=""></a>
      <div><div class="lb">${p.brand}</div><a class="ln" href="${purl(p)}">${p.name}</a>${lineLabel(k)?`<div class="lv">${lineLabel(k)}${p.variants.note?` · ${p.variants.note}`:""}</div>`:""}<div class="lp">${p.price!=null?brl(p.price*q):"Preço sob consulta"}</div></div>
      ${qtyHTML(k,q)}
    </li>`;}).join("") : `<li class="empty">Sua sacola está vazia. Toque em “+ Adicionar” nos produtos ou kits para montar o pedido.</li>`;
  $("c-foot").hidden = !ids.length;
  const known = ids.every(k=>P(k).price!=null);
  const sum = ids.reduce((s,k)=>s+(P(k).price||0)*cart[k],0);
  $("c-total").innerHTML = known ? `<span>Total</span><b>${brl(sum)}</b>` : "";
  $("c-total").hidden = !known;
  const ent = ENTREGA, lines = [];
  if (ent.pag) lines.push(`Pagamento: ${ent.pag}${ent.parc?` (${ent.parc})`:""}.`);
  if (ent.freteLocal) lines.push(`Frete em Campestre: ${ent.freteLocal}.`);
  if (ent.freteFora) lines.push(`Outras cidades: ${ent.freteFora}.`);
  if (ent.gratis) lines.push(`Frete grátis acima de ${brl(ent.gratis)}.`);
  if (ent.prazo) lines.push(`Prazo: ${ent.prazo}.`);
  lines.push(known ? "O pagamento e a entrega são combinados com a loja no WhatsApp." : "Valores, estoque e frete são confirmados pela loja no WhatsApp.");
  $("c-note").textContent = lines.join(" ");
}
function refresh(){
  renderGrid(); renderProduct(); renderBag();
  if ($("cart").open) renderCart();
}
function renderAll(){ renderFilters(); renderTiles(); renderCatHero(); refresh(); }
function toast(msg){ let t = document.querySelector(".toast"); if(!t){ t = document.createElement("div"); t.className = "toast"; t.setAttribute("role","status"); document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(()=>{ t.hidden = true; }, 2600); }
function change(id, d){
  const pr = P(id); if (!pr) return;
  const op = pr.variants ? optOf(pr, id) : null;
  if (d>0 && op && op.qty!=null && (cart[id]||0) >= op.qty){ toast(op.qty ? `Só temos ${op.qty} ${op.qty===1?"unidade":"unidades"} de ${op.name}` : `${op.name} está esgotado. Escolha outra opção.`); return; }
  if (d>0 && pr.qty!=null){ const used = keysOf(pr).reduce((s,k)=>s+cart[k],0); if (used >= pr.qty){ toast(pr.qty ? `Só temos ${pr.qty} ${pr.qty===1?"unidade":"unidades"} em estoque` : "Produto esgotado"); return; } }
  const was = cart[id]||0;
  cart[id] = was + d;
  if (cart[id]<=0) delete cart[id];
  save(); refresh();
  if (d>0 && !was) toast("Adicionado à sacola ✓");
}
function openCart(){ renderCart(); $("cart").showModal(); }
for (const d of document.querySelectorAll("dialog")) d.addEventListener("click", e=>{ if(e.target===d) d.close(); });
["cart-open-top","bag-view","bag-sum"].forEach(id=>{ const el = $(id); if (el) el.addEventListener("click", openCart); });
$("c-clear").onclick = () => { cart = {}; save(); refresh(); };
$("cta-bottom").href = $("wa-float").href = wa("Olá! Vi o catálogo da Ouse Mais e quero tirar uma dúvida.");

/* ---------- Banners (página inicial) ---------- */
const track = $("track");
let go = ()=>{}, start = ()=>{};
if (track){
  const slides = track.children.length;
  let idx = 0, timer = null;
  $("dots").innerHTML = Array.from({length:slides},(_, i)=>`<button type="button" aria-label="Banner ${i+1}" data-dot="${i}"></button>`).join("");
  go = i => { idx = (i+slides)%slides; track.style.transform = `translateX(-${idx*100}%)`; [...$("dots").children].forEach((b,j)=>b.setAttribute("aria-current", j===idx)); };
  // tempo de cada banner: o 1º (instruções) fica mais tempo para dar tempo de ler
  const SLIDE_MS = i => i===0 ? 8000 : 6000;
  const stop = () => clearTimeout(timer);
  start = () => { stop(); if(!reduce) timer = setTimeout(()=>{ go(idx+1); start(); }, SLIDE_MS(idx)); };
  $("prev").onclick = () => { go(idx-1); start(); };
  $("next").onclick = () => { go(idx+1); start(); };
  const bn = document.querySelector(".banners");
  bn.addEventListener("mouseenter", stop); bn.addEventListener("mouseleave", start);
  let sx = null;
  bn.addEventListener("touchstart", e=>{ sx = e.touches[0].clientX; stop(); }, {passive:true});
  bn.addEventListener("touchend", e=>{ if(sx==null) return; const dx = e.changedTouches[0].clientX - sx; if(Math.abs(dx)>40) go(idx + (dx<0?1:-1)); sx=null; start(); });
  bn.addEventListener("click", e=>{ const dot = e.target.closest("[data-dot]"); if (dot){ go(+dot.dataset.dot); start(); } });
  go(0); start();
}

/* ---------- Cliques ---------- */
const qIn = $("q");
const clearQuery = () => { if (qIn && query){ qIn.value = ""; query = ""; $("q-clear").hidden = true; } };
document.addEventListener("click", e=>{
  const gn = e.target.closest("[data-gal-nav]");
  if (gn){ e.preventDefault(); const t = gn.closest("[data-gal]").querySelector(".gal-track"); const n = t.children.length, i = Math.round(t.scrollLeft/t.clientWidth); const j = (i + +gn.dataset.galNav + n) % n; t.scrollTo({left:j*t.clientWidth, behavior:reduce?"auto":"smooth"}); return; }
  const th = e.target.closest("[data-thumb]");
  if (th){ const t = th.closest(".pdp-media").querySelector(".gal-track"); if (t) t.scrollTo({left:+th.dataset.thumb*t.clientWidth, behavior:reduce?"auto":"smooth"}); return; }
  if (e.target.closest("[data-close]")){ e.target.closest("dialog").close(); return; }
  if (e.target.closest("[data-cart]")){ openCart(); return; }
  const g = e.target.closest("[data-go]");
  if (g){ clearQuery(); current = g.dataset.go; renderFilters(); renderGrid(); $("produtos").scrollIntoView({behavior:reduce?"auto":"smooth"}); return; }
  const f = e.target.closest("[data-cat]");
  if (f){ current = f.dataset.cat; clearQuery(); renderFilters(); renderGrid(); try{ history.replaceState(null, "", current==="all" ? location.pathname + location.search : "#"+current); }catch(_){} return; }
  const sw = e.target.closest("[data-var]");
  if (sw){ selVar[sw.dataset.var] = sw.dataset.opt; refresh(); return; }
  const a = e.target.closest("[data-act]");
  if (a){ change(a.dataset.key, a.dataset.act==="inc"?1:-1); }
});
if (qIn){
  qIn.addEventListener("input", ()=>{ query = qIn.value; $("q-clear").hidden = !query; renderGrid(); });
  qIn.addEventListener("keydown", e=>{ if(e.key==="Enter"){ qIn.blur(); $("produtos").scrollIntoView({behavior:reduce?"auto":"smooth"}); } });
  $("q-clear").onclick = () => { qIn.value = ""; query = ""; $("q-clear").hidden = true; renderGrid(); qIn.focus(); };
}
document.addEventListener("change", e=>{ const s = e.target.closest("[data-varsel]"); if(!s) return; const id=s.id; selVar[s.dataset.varsel] = s.value; refresh(); const n=$(id); if(n) n.focus(); });
if ($("sort")) $("sort").addEventListener("change", e=>{ sortBy = e.target.value; renderGrid(); });

/* ---------- Planilha (produtos, preços, estoque, entrega) ---------- */
function parseCSV(t){
  const rows=[]; let row=[], f="", q=false;
  for (let i=0;i<t.length;i++){
    const c=t[i];
    if (q){ if (c==='"'){ if (t[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=c; }
    else if (c==='"') q=true;
    else if (c===','){ row.push(f); f=""; }
    else if (c==='\n'){ row.push(f); rows.push(row); row=[]; f=""; }
    else if (c!=='\r') f+=c;
  }
  if (f!=="" || row.length){ row.push(f); rows.push(row); }
  return rows;
}
function num(s){
  if (s==null) return null;
  s = String(s).replace(/[^\d,.-]/g,"");
  if (!s || s==="-") return null;
  if (s.includes(",")) s = s.replace(/\./g,"").replace(",",".");
  const n = parseFloat(s);
  return isNaN(n) || n<=0 ? null : n;
}
const col = (head, re) => head.findIndex(x=>re.test(norm(x)));
const SW = {preto:"#151515",vermelho:"#e0141e",branco:"#ffffff",nude:"#eaa58d",rosa:"#f06aa6",pink:"#ff2e88",roxo:"#6b2a9a",lilas:"#b48ad6",azul:"#2a63d6","azul marinho":"#1d2b5a",verde:"#2e9b55",amarelo:"#f5c518",laranja:"#f28c28",vinho:"#7a1030",bordo:"#6d0f2a",bege:"#e8d3b4",marrom:"#6b4226",cinza:"#8a8a8a",dourado:"#d4af37",prata:"#c0c0c0",oncinha:"#c8954a",onca:"#c8954a",transparente:"#f4f4f4"};
function parseVariants(t){
  t = (t||"").trim(); if (!t) return null;
  let note = ""; const m = t.match(/\(([^)]*)\)\s*$/); if (m){ note = m[1].trim(); t = t.slice(0,m.index).trim(); }
  const groups = [], stock = {};
  t.split("|").map(s=>s.trim()).filter(Boolean).forEach(part=>{
    const i = part.indexOf(":"); const label = i>0 ? part.slice(0,i).trim() : "Opção", body = i>0 ? part.slice(i+1) : part;
    if (norm(label)==="estoque"){ body.split(",").forEach(x=>{ const mm = x.trim().match(/^(.+?)\s*=\s*(\d+)$/); if (mm) stock[norm(mm[1].split("/").map(s=>s.trim()).join("/"))] = +mm[2]; }); return; }
    const isColor = /^cor/.test(norm(label));
    const opts = body.split(",").map(s=>s.trim()).filter(Boolean).map(raw=>{ const q = raw.match(/^(.*?)\s*=\s*(\d+)$/); const n = q ? q[1].trim() : raw; return {id:slug(n), name:n, color:SW[norm(n)]||"#c9b8c4", qty: q ? +q[2] : null}; }).filter(o=>o.name);
    if (opts.length) groups.push({label, type:isColor?"swatch":"select", options:opts});
  });
  if (!groups.length) return null;
  if (groups.length === 1){ const g = groups[0]; g.note = note||undefined; g.options.forEach(o=>{ o.msg = `${g.label.toLowerCase()} ${o.name}`; o.lab = `${g.label}: ${o.name}`; }); return g; }
  // dois tipos (ex.: cor e tamanho): cada combinação vira uma opção
  const [a,b] = groups.slice(0,2), options = [];
  a.options.forEach(x=>b.options.forEach(y=>{ const k = norm(`${x.name}/${y.name}`);
    options.push({id:`${x.id}--${y.id}`, name:`${x.name} · ${y.name}`, a:x.id, b:y.id, color:x.color, qty: k in stock ? stock[k] : null,
      msg:`${a.label.toLowerCase()} ${x.name}, ${b.label.toLowerCase()} ${y.name}`, lab:`${a.label}: ${x.name} · ${b.label}: ${y.name}`}); }));
  return {label:`${a.label} e ${b.label.toLowerCase()}`, type:"combo", dims:[a,b], note:note||undefined, options};
}
// Texto vindo da planilha nunca vira código na página
const clean = v => String(v||"").replace(/[<>]/g,"").replace(/"/g,"”").replace(/`/g,"'").trim();
function applyCatalog(rows){
  const [head,...body] = rows; if (!head) return false;
  const I = {id:/^codigo/, tipo:/^tipo/, cat:/^categoria/, name:/^produto/, brand:/^marca/, tag:/^selo/, desc:/^descricao/, specs:/^detalhes/, opts:/^opcoes/, items:/^itens/, media:/^mais fotos/, last:/^ultimas unidades/, fits:/^veste/, img:/^foto$/, imgFull:/^foto ampliada/, price:/^preco$/, old:/^preco antigo/, qty:/^quantidade/, avail:/^disponivel/, show:/^mostrar/, rank:/^ranking/};
  for (const k in I) I[k] = col(head, I[k]);
  if (I.id<0 || I.name<0) return false;
  const g = (r,k) => I[k]>=0 ? clean(r[I[k]]) : "";
  const url = u => /^https:\/\/[^\s"'<>`\\]+$/.test(u) || /^img\/[\w.\/-]+$/.test(u) && !u.includes("..") ? u : "";
  const list = [];
  body.forEach(r=>{
    const id = g(r,"id"), name = g(r,"name"); if (!id || !name || !/^[\w-]+$/.test(id)) return;
    if (/^n/.test(norm(g(r,"show")))) return;
    let c = CATS.find(x=>x.id!=="all" && norm(x.label)===norm(g(r,"cat")));
    if (!c && slug(g(r,"cat"))){ c = {id:slug(g(r,"cat")), slug:slug(g(r,"cat")), label:g(r,"cat"), title:g(r,"cat"), intro:""}; CATS.push(c); }
    const q = g(r,"qty"), qn = parseFloat(q.replace(/\./g,"").replace(",","."));
    const p = {id, name, cat: c ? c.id : "cuidados", brand:g(r,"brand"), tag:g(r,"tag")||undefined, desc:g(r,"desc"),
      specs: g(r,"specs") ? g(r,"specs").split(",").map(s=>s.trim()).filter(Boolean) : [],
      price:num(g(r,"price")), oldPrice:num(g(r,"old")), img:url(g(r,"img")), imgFull:url(g(r,"imgFull")),
      qty: q==="" || isNaN(qn) ? null : Math.max(0, Math.floor(qn)), vendidos:0};
    const rk = num(g(r,"rank")); if (rk) p.vendidos = 1000-rk;
    p.soldOut = /^n/.test(norm(g(r,"avail"))) || p.qty===0;
    p.lastUnits = /^s/.test(norm(g(r,"last")));
    p.fits = g(r,"fits");
    if (norm(g(r,"tipo"))==="kit" || g(r,"items")) p.items = g(r,"items").split(",").map(s=>s.trim()).filter(Boolean);
    const v = parseVariants(g(r,"opts")); if (v){ p.variants = v;
      const qs = v.options.filter(o=>o.qty!=null);
      if (qs.length === v.options.length){ p.qty = qs.reduce((s,o)=>s+o.qty,0); if (p.qty===0) p.soldOut = true; } }
    p.media = g(r,"media").split(/\s+/).map(url).filter(Boolean);
    list.push(p);
  });
  if (!list.length) return false;
  list.forEach(p=>{ if (p.items){ p.items = p.items.filter(i=>list.some(x=>x.id===i && !x.items)); p.specs = [`${p.items.length} ${p.items.length===1?"item":"itens"}`]; } });
  PRODUCTS.length = 0; PRODUCTS.push(...list); DATAV++;
  ORDER.clear(); PRODUCTS.forEach((p,i)=>ORDER.set(p.id,i));
  return true;
}
function pruneCart(){ let ch = false; for (const k in cart){ const p = P(k); if (!p || (p.variants ? !optOf(p,k) : k.includes("|"))){ delete cart[k]; ch = true; } } if (ch) save(); }
function applySheets(d){
  if (!d.catalogo || !applyCatalog(d.catalogo)) return false;
  // kit: preço "de" = soma dos itens separados, quando todos têm preço
  PRODUCTS.filter(k=>k.items).forEach(k=>{ if (k.oldPrice) return; const ps = k.items.map(i=>byId(i)?.price); k.oldPrice = ps.length && ps.every(x=>x!=null) ? ps.reduce((a,b)=>a+b,0) : null; });
  if (d.entrega){
    const m = {}; d.entrega.slice(1).forEach(r=>{ m[norm(r[0]||"")] = clean(r[1]); });
    const get = re => { const k = Object.keys(m).find(x=>re.test(x)); return k ? m[k] : ""; };
    ENTREGA = { pag:get(/^formas de pagamento/), parc:get(/^parcela/), freteLocal:get(/^frete em campestre/), freteFora:get(/^frete para outras/), gratis:num(get(/^frete gratis/)), prazo:get(/^prazo/) };
    const ex = $("notice-extra"); const fp = $("faq-pag"); if (fp) fp.textContent = ENTREGA.pag ? ` Formas aceitas: ${ENTREGA.pag}.` : "";
    if (ex) ex.textContent = ENTREGA.gratis ? `Frete grátis acima de ${brl(ENTREGA.gratis)}` : "";
  }
  PRODUCTS.forEach(p=>HAY.set(p.id, hayOf(p)));
  TOP = new Set([...PRODUCTS].filter(p=>p.vendidos>0).sort((a,b)=>b.vendidos-a.vendidos).slice(0,3).map(p=>p.id));
  READY = true;
  return true;
}
// Página que não existe ainda (produto novo antes da próxima atualização do site): descobre pelo endereço
function resolveAuto(){
  if (PAGE.type!=="auto") return;
  const parts = location.pathname.split("/").filter(Boolean).map(s=>decodeURIComponent(s));
  const c = CATS.find(x=>x.slug && x.slug===parts[0]);
  const id = parts.length >= 2 ? parts[1] : parts[0];
  const p = id && /^[\w-]+$/.test(id) ? byId(id) : null;
  if (p){
    const want = purl(p).split("?")[0];
    if (location.pathname !== want){ location.replace(want + location.search); return "redirect"; }
    PAGE.type = "prod"; PAGE.id = p.id; PAGE.auto = true; PAGE.cat = p.cat; return "prod";
  }
  if (c && parts.length===1){ PAGE.type = "cat"; PAGE.cat = c.id; PAGE.auto = true; current = c.id; document.title = `${c.title} | Ouse Mais`; return "cat"; }
  if (parts.length >= 2 && c){ PAGE.type = "prod"; PAGE.id = id; PAGE.cat = c.id; PAGE.auto = true; return "prod"; }
  return "none";
}
function showAuto(){
  const r = resolveAuto(); if (r==="redirect") return;
  const main = $("auto"); if (!main) return;
  if (PAGE.type==="prod"){ main.innerHTML = `<div id="prod"></div><section class="related" id="related"></section>`; }
  else if (PAGE.type==="cat"){ main.innerHTML = `<section id="cat-hero"></section><section class="catgrid"><div class="section-h"><div class="sh-l"><h2 id="sec-title"></h2><span class="count" id="count"></span></div></div><div class="grid" id="grid"></div></section>`; }
  else if (FINAL){ main.innerHTML = `<div class="noresult gone"><strong>Essa página não existe</strong><p>Mas o catálogo da Ouse Mais está logo ali.</p><a class="btn" href="/${Q}">Ver o catálogo</a></div>`; }
}
async function fetchCSV(u, ms){
  const ctl = new AbortController(); const t = setTimeout(()=>ctl.abort(), ms||8000);
  try{ const r = await fetch(u, {signal:ctl.signal, cache:"no-store"}); clearTimeout(t); if (r.ok){ const rows = parseCSV(await r.text()); return rows.length > 1 ? rows : null; } }catch(e){ clearTimeout(t); }
  return null;
}
function boot(){
  if (PAGE.type==="auto") showAuto(); // página nova que ainda não foi gerada: monta os blocos agora
  renderAll();
  document.documentElement.dataset.ready = READY && FINAL ? "1" : "0";
}
async function loadSheets(){
  if (IS_PREVIEW){ const f = document.createElement("div"); f.className = "preview-flag"; f.textContent = "PRÉVIA: assim vai ficar o site depois de publicar. Os clientes ainda não veem estas mudanças."; document.body.prepend(f); }
  if (!IS_PREVIEW) try{ const c = JSON.parse(localStorage.getItem("ousemais-planilha")||"null"); if (c && applySheets(c)) boot(); }catch(e){}
  const [cat, ent] = await Promise.all([fetchCSV(IS_PREVIEW ? SHEETS.previa + "&t=" + Date.now() : SHEETS.catalogo), fetchCSV(SHEETS.entrega)]);
  let got = cat ? {catalogo:cat} : null;
  if (!got && !READY){ const cp = await fetchCSV(COPIA, 8000); if (cp) got = {catalogo:cp}; }
  if (got && ent) got.entrega = ent;
  FINAL = true;
  if (got && applySheets(got)){ pruneCart(); if (!IS_PREVIEW && cat) try{ localStorage.setItem("ousemais-planilha", JSON.stringify(got)); }catch(e){} }
  else if (!READY){ READY = true; } // sem dados: mostra o que der (mensagens de "em breve")
  if (PAGE.type==="home") updateLD();
  boot();
}

/* ---------- SEO: lista de produtos da página inicial (Google) ---------- */
function updateLD(){
  const items = PRODUCTS.map((p,i)=>({"@type":"ListItem", position:i+1, url:new URL(purl(p).split("?")[0], SITE).href, name:p.name}));
  let s = document.getElementById("ld-products");
  if (!s){ s = document.createElement("script"); s.type = "application/ld+json"; s.id = "ld-products"; document.head.appendChild(s); }
  s.textContent = JSON.stringify({"@context":"https://schema.org","@type":"ItemList", name:"Catálogo Ouse Mais", itemListElement:items});
}

renderBag();
loadSheets();
})();
