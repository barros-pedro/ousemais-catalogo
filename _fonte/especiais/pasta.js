/* Páginas de categoria/produto: sacola compartilhada com o catálogo e preço/estoque vindos da planilha */
(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "ousemais-sacola", MAX_AGE = 48*3600e3;
  const norm = s => (s||"").toString().normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
  const brl = v => "R$ " + v.toFixed(2).replace(".", ",");
  const LIVE = {}; // id -> {price, oldPrice, qty, soldOut, last}

  /* ---- sacola (mesmo formato do catálogo) ---- */
  let cart = {};
  try{ const s = JSON.parse(localStorage.getItem(KEY)||"null"); cart = (s && s.items && Date.now()-s.t < MAX_AGE) ? s.items : {}; }catch(e){ cart = {}; }
  const save = () => { try{ if (Object.keys(cart).length) localStorage.setItem(KEY, JSON.stringify({t:Date.now(), items:cart})); else localStorage.removeItem(KEY); }catch(e){} };
  const total = () => Object.values(cart).reduce((a,b)=>a+(+b||0),0);
  function paintBag(){
    const n = total();
    $("count").textContent = n;
    $("bag").hidden = !n;
    $("bag-txt").textContent = n ? `Sacola · ${n} ${n===1?"item":"itens"}` : "";
    document.body.classList.toggle("bag-on", n>0);
  }
  let tt;
  function toast(msg){ const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(()=>t.classList.remove("show"), 2200); }
  document.addEventListener("click", ev=>{
    const many = ev.target.closest("[data-add-many]");
    if (many && !many.disabled){
      const ids = many.dataset.addMany.split(",").filter(Boolean);
      const blocked = ids.find(id=>{ const L = LIVE[id]; return L && (L.soldOut || L.hidden || (L.qty != null && (+cart[id]||0) >= L.qty)); });
      if (blocked){ toast("Um dos itens está sem estoque. Fale com a gente no WhatsApp."); return; }
      ids.forEach(id=>{ cart[id] = (+cart[id]||0) + 1; }); save(); paintBag();
      toast(`${ids.length} itens adicionados à sacola ✓`); return;
    }
    const b = ev.target.closest("[data-add]"); if (!b || b.disabled) return;
    const id = b.dataset.add, live = LIVE[id];
    const have = +cart[id] || 0;
    if (live && live.qty != null && have >= live.qty){ toast(live.qty ? `Só temos ${live.qty} ${live.qty===1?"unidade":"unidades"} em estoque` : "Produto esgotado"); return; }
    cart[id] = have + 1; save(); paintBag();
    toast("Adicionado à sacola ✓");
  });
  window.addEventListener("storage", e=>{ if (e.key===KEY){ try{ const s = JSON.parse(e.newValue||"null"); cart = s && s.items || {}; }catch(_){ cart = {}; } paintBag(); } });

  /* ---- planilha publicada ---- */
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
    s = String(s).replace(/[^\d,.-]/g,""); if (!s || s==="-") return null;
    if (s.includes(",")) s = s.replace(/\./g,"").replace(",",".");
    const n = parseFloat(s); return isNaN(n) || n<=0 ? null : n;
  }
  const safeUrl = u => /^https:\/\/[^\s"'<>`\\]+$/.test(u) || /^img\/[\w.-]+$/.test(u) ? u : "";
  const ytId = u => (u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/)||[])[1];
  const drId = u => (u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]{10,})/)||[])[1];
  const abs = u => /^img\//.test(u) ? "/" + u : u;
  // fotos e vídeos extras do painel ("Mais fotos e vídeos") na página do produto
  function gallery(){
    const box = document.querySelector(".prod .pimg"); if (!box) return;
    const L = LIVE[box.closest("[data-id]").dataset.id]; if (!L) return;
    const main = box.querySelector("img");
    const slides = [];
    const first = L.img ? abs(L.img) : main.getAttribute("src");
    slides.push({img:first});
    L.media.forEach(u=>{ const y = ytId(u), d = drId(u);
      if (y) slides.push({video:`https://www.youtube-nocookie.com/embed/${y}?rel=0&playsinline=1&autoplay=1`, thumb:`https://i.ytimg.com/vi/${y}/hqdefault.jpg`});
      else if (d) slides.push({video:`https://drive.google.com/file/d/${d}/preview`, thumb:`https://drive.google.com/thumbnail?id=${d}&sz=w400`});
      else slides.push({img:abs(u)}); });
    if (main.getAttribute("src") !== first) main.src = first;
    let strip = box.parentElement.querySelector(".thumbs"); if (strip) strip.remove();
    if (slides.length < 2) return;
    strip = document.createElement("div"); strip.className = "thumbs"; strip.setAttribute("role","group"); strip.setAttribute("aria-label","Fotos e vídeos");
    slides.forEach((s,i)=>{
      const b = document.createElement("button"); b.type = "button"; b.className = "th" + (i? "" : " on"); b.setAttribute("aria-label", s.video ? "Ver vídeo" : `Ver foto ${i+1}`);
      const im = document.createElement("img"); im.src = s.thumb || s.img; im.alt = ""; im.loading = "lazy"; b.append(im);
      if (s.video){ const pl = document.createElement("span"); pl.className = "play"; pl.textContent = "▶"; b.append(pl); }
      b.addEventListener("click", ()=>{
        strip.querySelectorAll(".th").forEach(x=>x.classList.toggle("on", x===b));
        box.querySelectorAll("iframe").forEach(f=>f.remove());
        if (s.video){ const f = document.createElement("iframe"); f.src = s.video; f.title = "Vídeo do produto"; f.allow = "autoplay; encrypted-media; picture-in-picture"; f.allowFullscreen = true; box.append(f); }
        else main.src = s.img;
      });
      strip.append(b);
    });
    box.after(strip);
  }
  function apply(rows){
    if (!rows || !rows.length) return;
    const head = rows[0].map(norm), col = re => head.findIndex(x=>re.test(x));
    const I = {id:col(/^codigo/), price:col(/^preco$/), old:col(/^preco antigo/), qty:col(/^quantidade/), avail:col(/^disponivel/), show:col(/^mostrar/), last:col(/^ultimas unidades/), img:col(/^foto$/), media:col(/^mais fotos/)};
    if (I.id < 0) return;
    const g = (r,k) => I[k]>=0 ? String(r[I[k]]||"").trim() : "";
    rows.slice(1).forEach(r=>{
      const id = g(r,"id"); if (!/^[\w-]+$/.test(id)) return;
      const q = g(r,"qty"), qn = parseFloat(q.replace(/\./g,"").replace(",","."));
      const qty = q==="" || isNaN(qn) ? null : Math.max(0, Math.floor(qn));
      LIVE[id] = { img:safeUrl(g(r,"img")), media:g(r,"media").split(/\s+/).map(safeUrl).filter(Boolean), price:num(g(r,"price")), oldPrice:num(g(r,"old")), qty, hidden:/^n/.test(norm(g(r,"show"))),
        soldOut:/^n/.test(norm(g(r,"avail"))) || qty===0, last:/^s/.test(norm(g(r,"last"))) };
    });
    document.querySelectorAll("[data-id]").forEach(el=>{
      const L = LIVE[el.dataset.id]; if (!L) return;
      const pr = el.querySelector("[data-price]");
      if (pr) pr.classList.toggle("ask", !L.price);
      if (pr){ pr.textContent = ""; if (L.price){ if (L.oldPrice && L.oldPrice > L.price){ const s = document.createElement("s"); s.textContent = brl(L.oldPrice); pr.append(s, " "); } pr.append(brl(L.price)); } else pr.textContent = "Preço no WhatsApp"; }
      const add = el.querySelector("[data-add]");
      if (add){ add.disabled = L.soldOut || L.hidden; if (add.disabled) add.textContent = "Esgotado"; }
      const st = el.querySelector("[data-stock]");
      if (st) st.textContent = L.soldOut || L.hidden ? "Esgotado no momento. Pergunte no WhatsApp quando chega." : (L.last ? "Últimas unidades" : "");
      if (el.classList.contains("card") && L.hidden) el.hidden = true;
    });
    gallery();
    window.OUSE.live = LIVE;
    document.dispatchEvent(new CustomEvent("ouse:live", {detail:LIVE}));
  }
  try{ const c = JSON.parse(localStorage.getItem("ousemais-planilha")||"null"); if (c && c.catalogo) apply(c.catalogo); }catch(e){}
  (async()=>{
    try{
      const ctl = new AbortController(); const t = setTimeout(()=>ctl.abort(), 8000);
      const r = await fetch(window.OUSE.catalogo, {signal:ctl.signal, cache:"no-store"}); clearTimeout(t);
      if (r.ok) apply(parseCSV(await r.text()));
    }catch(e){}
  })();
  paintBag();
})();
