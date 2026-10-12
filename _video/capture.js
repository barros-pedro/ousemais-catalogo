const { chromium } = require('playwright');
const fs=require('fs');
const BASE=process.argv[2]||'http://localhost:8771', OUT=process.argv[3]||'cap';
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,
   userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
 if(BASE.includes('localhost')) await ctx.route(/docs\.google|fonts\.g|googleusercontent|drive\.google/, r=>r.abort());
 const p=await ctx.newPage(); const log=[];
 p.on('pageerror',e=>log.push('ERR '+e.message));
 const go=async u=>{await p.goto(BASE+u,{waitUntil:'networkidle'});await p.waitForTimeout(1500);
   await p.evaluate(()=>document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in')));};
 const shot=async(n,full)=>{await p.waitForTimeout(500);await p.screenshot({path:`${OUT}/${n}.png`,fullPage:!!full});log.push(n);};
 const lazyAll=async()=>{const h=await p.evaluate(()=>document.body.scrollHeight);for(let y=0;y<h;y+=600){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(120);}await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(800);};
 // home
 await go('/'); await shot('home_top');
 for(let i=1;i<=4;i++){ if(await p.$('#next')){await p.evaluate(()=>document.getElementById('next').click()); await p.waitForTimeout(900); await shot('home_banner'+i);} }
 await lazyAll(); await p.evaluate(()=>document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')); await p.waitForTimeout(1500);
 await shot('home_full',true);
 // cats
 await p.evaluate(()=>{const e=document.getElementById('cat-tiles')||document.getElementById('cats-title');e&&e.scrollIntoView({block:'start'});scrollBy(0,-70)}); await shot('home_cats');
 // search
 await p.fill('#q','lubrificante'); await p.waitForTimeout(800);
 await p.evaluate(()=>{document.getElementById('q').scrollIntoView({block:'start'});scrollBy(0,-90)}); await shot('search_lub');
 await p.fill('#q','vibrador'); await p.waitForTimeout(800); await shot('search_vib');
 // categoria
 await go('/vibradores/'); await lazyAll(); await shot('cat_vib_top'); await shot('cat_vib_full',true);
 await go('/calcinhas/'); await lazyAll(); await shot('cat_calc_top');
 // sales page varinha
 await go('/vibradores/varinha-magica/'); await lazyAll(); await shot('vd_varinha_top'); await shot('vd_varinha_full',true);
 // golfinho colors + cart
 await go('/vibradores/golfinho/'); await lazyAll(); await shot('golf_top');
 const sw=await p.$$('#vd-buy .swb'); log.push('swb '+sw.length);
 for(let i=0;i<sw.length;i++){ const s=(await p.$$('#vd-buy .swb'))[i]; await s.evaluate(e=>e.click()); await p.waitForTimeout(700); await shot('golf_cor'+i); }
 const add=await p.$('#vd-buy .add'); if(add){ await add.evaluate(e=>e.click()); await p.waitForTimeout(900); await shot('golf_added'); }
 // calcinha options
 await go('/calcinhas/calcinha-laco/'); await shot('calc_top');
 const sw2=await p.$$('.pdp-buy .swb'); if(sw2[1]){await sw2[1].evaluate(e=>e.click()); await p.waitForTimeout(600);} await shot('calc_cor');
 const add2=await p.$('.pdp-buy .add'); if(add2){await add2.evaluate(e=>e.click()); await p.waitForTimeout(900);} await shot('calc_added');
 // lub add from home row then open cart
 await go('/lubrificantes/love-lub-hot/'); const a3=await p.$('.pdp-buy .add'); if(a3){await a3.evaluate(e=>e.click());await p.waitForTimeout(700);} await shot('lub_added');
 await p.evaluate(()=>{const b=document.querySelector('[data-cart]')||document.getElementById('bag-view'); b&&b.click();}); await p.waitForTimeout(1200); await shot('cart_open');
 const href=await p.evaluate(()=>document.getElementById('bag-send')?.href||document.getElementById('c-send')?.href);
 fs.writeFileSync(`${OUT}/wa.txt`, decodeURIComponent((href||'').split('text=')[1]||''));
 fs.writeFileSync(`${OUT}/log.txt`, log.join('\n')); console.log(log.join('\n'));
 await b.close();
})();
