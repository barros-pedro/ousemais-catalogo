/* Página de venda: barra fixa, soma do "compre junto" e animação de entrada */
(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const brl = v => "R$ " + v.toFixed(2).replace(".", ",");
  // barra fixa aparece quando o topo sai da tela
  const sticky = $("sticky"), hero = $("topo");
  if (sticky && hero && "IntersectionObserver" in window){
    new IntersectionObserver(([en])=>{
      const show = !en.isIntersecting && en.boundingClientRect.top < 0;
      sticky.classList.toggle("on", show); sticky.setAttribute("aria-hidden", String(!show));
      sticky.querySelector("button").tabIndex = show ? 0 : -1;
    }, {rootMargin:"-80px 0px 0px 0px"}).observe(hero.querySelector(".buy"));
  }
  // soma do compre junto
  const sum = L=>{
    const ids = (document.querySelector("[data-add-many]")?.dataset.addMany || "").split(",");
    const prices = ids.map(id=>L[id] && L[id].price);
    if (prices.every(Boolean)) $("b-sum").textContent = brl(prices.reduce((a,b)=>a+b,0));
  };
  if (window.OUSE && window.OUSE.live) sum(window.OUSE.live);
  document.addEventListener("ouse:live", ev=>sum(ev.detail || {}));
  // entrada suave das seções
  const els = document.querySelectorAll(".reveal");
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window){
    document.documentElement.classList.add("js-reveal");
    const io = new IntersectionObserver(es=>es.forEach(en=>{ if (en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } }), {threshold:.2});
    els.forEach(el=>io.observe(el));
  }
})();
