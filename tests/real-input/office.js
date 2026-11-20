// Real-input playtest of the 40s office (office.js): plays quarters with real taps and logs what the walking executive does.
// Usage: node office.js <outdir> <sizes> ; env RUN='{"seed":21,"stop":"deal:1","exec":"reid"}' QUARTERS=4 VIDEO=1 SHOTS=1
const H=require("./h.js"),fs=require("fs");
const OUT=process.argv[2]||"/workspace/ld-current/t/office"; fs.mkdirSync(OUT,{recursive:true});
const sizes=(process.argv[3]||"390x844").split(",").map(s=>s.split("x").map(Number));
const RUN=JSON.parse(process.env.RUN||'{"seed":21,"stop":"deal:1","exec":"reid"}'), NQ=+(process.env.QUARTERS||3);
const LOGGER=`(()=>{window.__o4=[];const t0=Date.now();let lp="",lc="";setInterval(()=>{const e=document.querySelector(".o4-ex"),s=document.querySelector(".o4-stage");if(!e||!s)return;const p=e.dataset.pose||"";const c=s.className.replace(/door-\\d|city-\\d|mood-\\w+|o4-stage|o4-rm/g,"").trim();const q=p.indexOf("walk")===0?"walk":p;if(q!==lp){window.__o4.push([Date.now()-t0,"pose",q,s.dataset.era,s.dataset.exec]);lp=q;}if(c!==lc){window.__o4.push([Date.now()-t0,"cls",c]);lc=c;}},60);})();`;
async function vis(p,s){const h=await p.$(s);return h&&await h.isVisible().catch(()=>false)?h:null;}
async function tap(p,s){const h=await vis(p,s);if(!h)return false;const bb=await h.boundingBox();if(!bb)return false;await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);return true;}
async function scrolls(p){return p.evaluate(()=>{const se=document.scrollingElement;return se.scrollHeight>innerHeight+1||se.scrollWidth>innerWidth+1?"PAGE "+se.scrollHeight+"/"+innerHeight:"";});}
(async()=>{const env=await H.start();const all={};
for(const [w,h] of sizes){const tag=w+"x"+h+"-"+RUN.exec;const R=all[tag]={q:[],issues:[]};
 const ctxOpt=process.env.VIDEO?{recordVideo:{dir:OUT+"/vid-"+tag,size:{width:w,height:h}}}:null;
 let p;
 if(ctxOpt){const touch=w<1100||h>w;const ctx=await env.browser.newContext(Object.assign({viewport:{width:w,height:h},hasTouch:touch,isMobile:w<700,deviceScaleFactor:1},ctxOpt));p=await ctx.newPage();p.errs=[];p.ctx=ctx;
   p.on("console",m=>{if(m.type()==="error")p.errs.push("console: "+m.text())});p.on("pageerror",e=>p.errs.push("pageerror: "+e));p.on("requestfailed",r=>p.errs.push("reqfail: "+r.url()));p.on("response",r=>{if(r.status()>=400)p.errs.push("http "+r.status()+" "+r.url())});}
 else p=await H.page(env,w,h);
 await p.addInitScript(LOGGER);
 try{
 await H.seedRun(p,env.origin,RUN);
 for(let q=0;q<NQ;q++){
  const Q={};
  const info=await p.evaluate(()=>{const s=document.querySelector(".o4-stage");const st=JSON.parse(localStorage.getItem("lastDividend.v1")).midRun;return {turn:st&&st.turn,era:s&&s.dataset.era,lay:s&&s.dataset.lay,want:st&&LD.eraOf(st),exec:s&&s.dataset.exec};});
  Q.info=info; if(info.era!=String(info.want)) R.issues.push("era mismatch "+JSON.stringify(info));
  if(process.env.SHOTS) await p.screenshot({path:`${OUT}/${tag}-q${info.turn}-hub.png`});
  const pin=await p.$(".desk .map .pin.ld-act")||await p.$(".desk .map .pin");
  if(!pin){R.issues.push("no pin q"+info.turn);break;}
  const bb=await pin.boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(700);
  const m0=await p.evaluate(()=>window.__o4.length);
  await tap(p,"#btn-sign:not([disabled])")||await tap(p,"#dossier .dz-choice:not([disabled])");
  await p.waitForTimeout(700); if(process.env.SHOTS) await p.screenshot({path:`${OUT}/${tag}-q${info.turn}-signed.png`});
  let fight=false,entShot=false;
  for(let i=0;i<200;i++){await p.waitForTimeout(250);
   if(!entShot&&await p.$(".o4-stage.o4-open")){entShot=true;if(process.env.SHOTS)await p.screenshot({path:`${OUT}/${tag}-q${info.turn}-entrance.png`});}
   if(await vis(p,"#door.on")){fight=true; if(await tap(p,"#door .df-hand .dc:not(.no)"))continue; for(const s of ["#df-end","#df-close","#rw-skip","#rw-keep","#door [data-asset]","#door [data-card]","#rw-take:not([disabled])","#rw-apass"]){if(await tap(p,s))break;} continue;}
   if(await vis(p,"#overlay.on")){if(await tap(p,"#fy-boss-ok")||await tap(p,"#fy-m-a")||await tap(p,"#ov-ok"))continue;}
   const st=await p.evaluate(()=>{const b=document.querySelector("#bunker-card");return !!(b&&!b.classList.contains("locked")&&!b.classList.contains("acted"))||!!document.querySelector("#btn-endq:not(.ld-dim)")});if(st&&(fight||i>12))break;}
  Q.fight=fight; await p.waitForTimeout(2500);
  Q.afterFight=await p.evaluate(()=>{const s=document.querySelector(".o4-stage"),e=document.querySelector(".o4-ex");return {hidden:e&&e.style.opacity==="0",cls:s&&s.className};});
  if(await tap(p,"#bunker-card:not(.locked)")){await p.waitForTimeout(1200);
    const ros=await p.$("#bk-panel [data-roster]"); if(ros&&await ros.isVisible()){await ros.click();await p.waitForTimeout(500);}
    const b=await tap(p,'#bk-panel [data-up]:not([disabled])'); Q.built=b; await p.waitForTimeout(2600);
    if(await vis(p,"#overlay.bunker-mode")){await tap(p,"#bs-close");await p.waitForTimeout(800);} await p.waitForTimeout(1800);
    if(process.env.SHOTS) await p.screenshot({path:`${OUT}/${tag}-q${info.turn}-bunker.png`});}
  Q.scroll=await scrolls(p); if(Q.scroll) R.issues.push(Q.scroll+" q"+info.turn);
  await tap(p,"#btn-endq"); await p.waitForTimeout(1600); if(process.env.SHOTS) await p.screenshot({path:`${OUT}/${tag}-q${info.turn}-endq.png`});
  for(let i=0;i<30;i++){ if(await vis(p,"#overlay.report-mode")){await p.waitForTimeout(600); for(const s of ["#ov-ok","#rp-ok","#overlay.report-mode .btn-primary","#overlay.report-mode button"]){if(await tap(p,s))break;} await p.waitForTimeout(900);}
    else if(await vis(p,"#overlay.on")){if(!(await tap(p,"#fy-boss-ok")||await tap(p,"#fy-m-a")||await tap(p,"#ov-ok")||await tap(p,"#overlay.on .btn-primary")))await p.keyboard.press("Escape");await p.waitForTimeout(700);}
    else if(await vis(p,"#btn-skip-react")){await tap(p,"#btn-skip-react");await p.waitForTimeout(700);}
    else { const ok=await p.evaluate(()=>!!document.querySelector(".desk .map .pin")&&!document.querySelector(".desk.closing")); if(ok) break; await p.waitForTimeout(500);} }
  await p.waitForTimeout(1200);
  const log=await p.evaluate(m0=>window.__o4.slice(m0),m0); Q.poses=[...new Set(log.filter(x=>x[1]==="pose").map(x=>x[2]))]; Q.cls=[...new Set(log.filter(x=>x[1]==="cls").map(x=>x[2]).filter(Boolean))];
  R.q.push(Q);
 }
 }catch(e){R.issues.push("CRASH "+String(e).split("\n")[0]);}
 R.errs=p.errs.slice(); const vp=p.video&&p.video(); await p.ctx.close(); if(vp) R.video=await vp.path();
 console.log(tag,JSON.stringify(R));
}
fs.writeFileSync(OUT+"/office-"+RUN.exec+".json",JSON.stringify(all,null,1));await env.close();})();
