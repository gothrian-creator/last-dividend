#!/usr/bin/env node
// Era goals in the browser: the 1978 board, the 2008 island and the Now bunker at the five sizes (layout: every slot on
// screen and clear of the card and HUD), a real holdings order through the UI, a v1 save (no era block) resuming, another
// exec on the shared TV fallback, ?classic=1 untouched. SHOTS=dir also saves the screens. Exit 1 on any failure.
const H=require("../real-input/h.js"),fs=require("fs");const {seedHouse}=require("./probe.js");
const SIZES=(process.env.SIZES||"360x800,412x915,800x1150,800x1280,1280x800").split(",");const SHOTS=process.env.SHOTS;if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
let bad=0,n=0;function ok(c,m){n++;if(!c){bad++;console.log("FAIL",m);}}
const inter=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
async function openHouse(p){for(let i=0;i<8;i++){if(await p.$("#hv-back"))break;const b=await p.$("#house-peek");if(b&&await b.isVisible()){await b.click({timeout:1500}).catch(()=>{});}await p.waitForTimeout(900);}await p.waitForTimeout(500);return !!(await p.$("#hv-back"));}
async function cards(p){for(let i=0;i<3;i++){const kn=await p.$("#hv-knock");if(kn){await kn.click({timeout:2000}).catch(()=>{});await p.waitForTimeout(500);}const a=await p.$("#hv-admit:not([disabled])")||await p.$("#hv-turnaway");if(a){await p.waitForTimeout(600);await a.click({timeout:2000}).catch(()=>{});await p.waitForTimeout(1000);continue;}const k=await p.$("#hv-keep:not([disabled])")||await p.$("#hv-break");if(k){await p.waitForTimeout(600);await k.click({timeout:2000}).catch(()=>{});await p.waitForTimeout(1000);continue;}break;}}
async function layout(p,W,H,tag){
  const r=await p.evaluate(()=>{const bb=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    const chips=[...document.querySelectorAll("#house-root .hv-eslot .hv-echip")].map(bb);const card=document.querySelector("#house-root .hv-ecard");const hud=document.querySelector("#house-root .sd-hud, #house-root .hv-hud");
    const back=document.querySelector("#hv-back");const goal=document.querySelector("#house-root .hv-goal");
    return {chips,card:card?bb(card):null,hud:hud?bb(hud):null,back:back?bb(back):null,goal:goal?bb(goal):null,era:(document.querySelector("#house-root .hv-root")||{}).className};});
  ok(r.chips.length===4,tag+" four slots ("+r.chips.length+") "+r.era);
  const cut=await p.evaluate(()=>[...document.querySelectorAll("#house-root .hv-eslot .hv-echip b, #house-root .hv-eslot .hv-echip small")].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent));
  ok(!cut.length,tag+" no slot label cut off "+JSON.stringify(cut));
  r.chips.forEach((c,i)=>{ok(c.x>=-1&&c.y>=-1&&c.x+c.width<=W+1&&c.y+c.height<=H+1,tag+` slot ${i} on screen ${JSON.stringify(c)}`);
    if(r.card)ok(inter(c,r.card)<4,tag+` slot ${i} clear of the card`);if(r.hud)ok(inter(c,r.hud)<4,tag+` slot ${i} clear of the HUD`);});
  ok(r.card&&r.card.y+r.card.height<=H+1&&r.card.x>=0,tag+" card on screen");
  if(r.card&&r.back)ok(inter(r.card,r.back)<4,tag+" card clear of Turn back");
  if(r.goal&&r.hud)ok(inter(r.goal,r.hud)<4,tag+" goal ribbon clear of the HUD");
  return r;}
(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");const O=env.origin;
 for(const sz of SIZES){const [W,Hh]=sz.split("x").map(Number);
  for(const t of [2,6,10]){const p=await H.page(env,W,Hh);
   await seedHouse(p,O,{seed:13,stop:"deal:"+(t>8?6:t),exec:"mara",smart:true,build:true,patch:t>8?"st.turn="+t+";":undefined});
   const open=await openHouse(p);ok(open,sz+" t"+t+" house opens");
   if(t<=8){await layout(p,W,Hh,sz+" t"+t);
     const cls=await p.evaluate(()=>(document.querySelector("#house-root .hv-screen")||{}).className||"");ok(t<=4?/is-board is-full/.test(cls):/is-isle is-full/.test(cls),sz+" t"+t+" Mara plate "+cls);}
   else{const cls=await p.evaluate(()=>(document.querySelector("#house-root .hv-screen")||{}).className||"");ok(!/hv-era/.test(cls)&&/hv-screen/.test(cls),sz+" t10 bunker feed "+cls);
     ok(await p.evaluate(()=>/Act III goal/.test((document.querySelector("#house-root .hv-goal")||{getAttribute:()=>""}).getAttribute("aria-label")||"")&&/Act III/i.test((document.querySelector("#house-root .hv-goal")||{}).textContent||"")),sz+" t10 Act III ribbon");}
   if(SHOTS)await p.screenshot({path:`${SHOTS}/era-${t<=4?"1978":t<=8?"2008":"now"}-${sz}.png`});
   ok(!p.errs.length,sz+" t"+t+" no page errors "+p.errs.slice(0,2));await p.ctx.close();}}
 // a real order through the UI (412x915, Q2 after the deal)
 {const p=await H.page(env,412,915);await seedHouse(p,O,{seed:13,stop:"deal:2",exec:"mara",smart:true,patch:"st.phase='bunker';st.dealPickedThisTurn=true;st.cash=Math.max(st.cash,60);"});
  await openHouse(p);await cards(p);const before=await p.evaluate(()=>JSON.parse(localStorage.getItem(LD.HOUSE_SAVE_KEY)).midRun.house.era);
  ok(before&&before.v===2,"order: fresh-seeded run has the v2 era block");
  const btn=await p.$("#house-root .hv-era-up.btn-coral");ok(!!btn,"order: an order button is live after the deal");
  if(btn){const k=await btn.getAttribute("data-eslot");await p.click("#house-root .hv-era-up.btn-coral",{timeout:5000});await p.waitForTimeout(900);
   const after=await p.evaluate(()=>JSON.parse(localStorage.getItem(LD.HOUSE_SAVE_KEY)).midRun.house.era);
   ok(after.company[k].build===before.company[k].lv+1&&after.actQ===2,"order: "+k+" is building and saved "+JSON.stringify(after.company[k]));
   ok(!(await p.$("#house-root .hv-era-up.btn-coral")),"order: one order a quarter (no live button after)");
   const chip=await p.evaluate(k=>(document.querySelector('#house-root .hv-eslot[data-eslot="'+k+'"]')||{}).className,k);ok(/is-building/.test(chip),"order: the board shows it building "+chip);
   if(SHOTS)await p.screenshot({path:`${SHOTS}/era-1978-ordered-412x915.png`});}
  ok(!p.errs.length,"order: no page errors "+p.errs.slice(0,2));await p.ctx.close();}
 // a v1 save (saved before the era goals) resumes at Q6
 {const p=await H.page(env,412,915);await seedHouse(p,O,{seed:13,stop:"deal:6",exec:"mara",smart:true,patch:"delete st.house.era;"});
  const ok1=await openHouse(p);ok(ok1,"v1 save at Q6 resumes and the house opens");
  const cls=await p.evaluate(()=>(document.querySelector("#house-root .hv-screen")||{}).className||"");ok(/is-isle/.test(cls),"v1 save at Q6 shows the island "+cls);
  ok(!p.errs.length,"v1 save: no page errors "+p.errs.slice(0,2));await p.ctx.close();}
 // other execs: shared TV fallback
 for(const ex of ["reid","cassius"]){const p=await H.page(env,412,915);await seedHouse(p,O,{seed:13,stop:"deal:2",exec:ex,smart:true});
  await openHouse(p);const cls=await p.evaluate(()=>(document.querySelector("#house-root .hv-screen")||{}).className||"");
  ok(/hv-era is-board is-tv/.test(cls),ex+" 1978 uses their own TV with the shared vignettes "+cls);
  const plates=await p.evaluate(()=>[...document.querySelectorAll("#house-root .hv-plate")].map(i=>i.getAttribute("src")).join(","));ok(!/era\/mara/.test(plates),ex+" never shows Mara's plates");
  if(SHOTS)await p.screenshot({path:`${SHOTS}/era-1978-${ex}-412x915.png`});ok(!p.errs.length,ex+" no page errors "+p.errs.slice(0,2));await p.ctx.close();}
 // ?classic=1: no era anything
 {const p=await H.page(env,412,915);await p.goto(O+"?classic=1");await p.waitForTimeout(500);await p.evaluate(()=>localStorage.clear());await p.goto(O+"?classic=1");await p.waitForTimeout(700);
  await p.evaluate(()=>localStorage.setItem("lastDividend.v1",JSON.stringify({penny:{offered:true,done:true,tipsOff:true,tips:{}},audioOff:true,seenTutorial:true,coachDone:true})));await p.goto(O+"?classic=1");await p.waitForTimeout(700);
  await p.click("#btn-new");await p.waitForTimeout(600);await p.click("#btn-start");await p.waitForTimeout(2000);
  const s=await p.evaluate(()=>{const m=JSON.parse(localStorage.getItem("lastDividend.v1")||"{}").midRun;return {rs:m&&m.ruleset,house:!!(m&&m.house),era:!!document.querySelector(".hv-era")};});
  ok(s.rs==="shop"&&!s.house&&!s.era,"?classic=1 fresh start: shop run, no era block "+JSON.stringify(s));ok(!p.errs.length,"classic: no page errors "+p.errs.slice(0,2));await p.ctx.close();}
 await env.close();console.log(bad?`ERA FAIL ${bad}/${n}`:`ERA OK ${n}`);process.exit(bad?1:0);})();
