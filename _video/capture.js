const { chromium } = require('playwright');const fs=require('fs');
const BASE=process.argv[2]||'http://localhost:8771', OUT=process.argv[3]||'cap';fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,
   userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
 if(BASE.includes('localhost')) await ctx.route(/docs\.google|fonts\.g|googleusercontent|drive\.google/, r=>r.abort());
 const p=await ctx.newPage();const log=[];p.on('pageerror',e=>log.push('ERR '+e.message));
 const go=async u=>{await p.goto(BASE+u,{waitUntil:'networkidle'});await p.waitForTimeout(1500);await p.evaluate(()=>document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in')));};
 const shot=async(n,o={})=>{await p.waitForTimeout(400);await p.screenshot({path:`${OUT}/${n}.png`,...o});log.push(n);};
 const lazyAll=async()=>{const h=await p.evaluate(()=>document.body.scrollHeight);for(let y=0;y<h;y+=500){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(150);}await p.evaluate(()=>{document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager');scrollTo(0,0)});await p.waitForTimeout(1200);};
 const unfix=async()=>p.evaluate(()=>{document.querySelectorAll('body *').forEach(e=>{const s=getComputedStyle(e);if(s.position==='fixed')e.style.display='none';else if(s.position==='sticky')e.style.position='static';});});
 const center=async sel=>p.evaluate(s=>{const e=document.querySelector(s);if(e){e.scrollIntoView({block:'center'});}},sel);
 const rect=async sel=>p.evaluate(s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,sy:scrollY};},sel);
 const meta={};
 // home clean full
 await go('/');await lazyAll();await unfix();await shot('home_clean_full',{fullPage:true});
 // category tiles individually
 await go('/');await lazyAll();await unfix();
 const tiles=await p.$$('#cat-tiles .tile');log.push('tiles '+tiles.length);
 for(let i=0;i<tiles.length;i++){const t=(await p.$$('#cat-tiles .tile'))[i];await t.scrollIntoViewIfNeeded();await p.waitForTimeout(300);await t.screenshot({path:`${OUT}/tile_${i}.png`});}
 meta.tiles=await p.$$eval('#cat-tiles .tile',a=>a.map(e=>e.innerText.replace(/\n+/g,' | ')));
 // vibradores category: cards
 await go('/vibradores/');await lazyAll();await shot('cat_vib_top');await unfix();
 const cards=await p.$$('.card');log.push('cards '+cards.length);
 for(let i=0;i<Math.min(cards.length,8);i++){const c=(await p.$$('.card'))[i];await c.scrollIntoViewIfNeeded();await p.waitForTimeout(400);await c.screenshot({path:`${OUT}/vcard_${i}.png`});}
 meta.vcards=await p.$$eval('.card',a=>a.slice(0,8).map(e=>e.innerText.split('\n').slice(0,4).join(' | ')));
 // search: per prefix
 await go('/');await lazyAll();
 await p.evaluate(()=>{const e=document.getElementById('q');const r=e.getBoundingClientRect();scrollBy(0,r.top-300);});await p.waitForTimeout(500);
 const q=await rect('#q');meta.q=q;
 await shot('srch_0');
 const W='lubrificante';
 for(let i=1;i<=W.length;i++){await p.fill('#q',W.slice(0,i));await p.waitForTimeout(500);await p.evaluate(()=>{const e=document.getElementById('q');const r=e.getBoundingClientRect();scrollBy(0,r.top-300);});await p.waitForTimeout(250);await shot('srch_'+i);}
 meta.qAfter=await rect('#q');
 await p.evaluate(()=>{const e=document.getElementById('busca')||document.getElementById('grid');e&&e.scrollIntoView({block:'start'});});await p.waitForTimeout(800);await shot('srch_res');
 // kit love lub
 await go('/kits/kit-love-lub/');await lazyAll();await shot('kit_top');await unfix();await shot('kit_full',{fullPage:true});
 // calc: buy area centered, states
 await go('/calcinhas/calcinha-laco/');await lazyAll();
 await center('.pdp-buy');await p.evaluate(()=>scrollBy(0,-120));await p.waitForTimeout(600);await shot('buy_0');
 meta.buy=await p.$$eval('.pdp-buy .swb',a=>a.map(e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,t:e.getAttribute('aria-label')||e.title||e.textContent}}));
 meta.add=await rect('.pdp-buy .add');
 const sw=await p.$$('.pdp-buy .swb');if(sw[1]){await sw[1].evaluate(e=>e.click());await p.waitForTimeout(700);} await shot('buy_1');
 meta.add1=await rect('.pdp-buy .add');
 const ad=await p.$('.pdp-buy .add');if(ad){await ad.evaluate(e=>e.click());await p.waitForTimeout(900);} await shot('buy_2');
 // add golfinho + lub hot, open cart
 await go('/vibradores/golfinho/');const g=await p.$('#vd-buy .add');if(g){await g.evaluate(e=>e.click());await p.waitForTimeout(700);}
 await go('/lubrificantes/love-lub-hot/');const l=await p.$('.pdp-buy .add');if(l){await l.evaluate(e=>e.click());await p.waitForTimeout(700);}
 await shot('bag_bar');
 await p.evaluate(()=>{const b=document.querySelector('[data-cart]')||document.getElementById('bag-view');b&&b.click();});await p.waitForTimeout(1300);await shot('cart_open');
 meta.send=await rect('#c-send');
 const href=await p.evaluate(()=>document.getElementById('c-send')?.href||'');meta.wa=decodeURIComponent((href.split('text=')[1]||''));
 fs.writeFileSync(`${OUT}/meta.json`,JSON.stringify(meta,null,1));fs.writeFileSync(`${OUT}/log.txt`,log.join('\n'));console.log(log.join('\n'));
 await b.close();})();
