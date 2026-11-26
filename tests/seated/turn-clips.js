#!/usr/bin/env node
// Mara's era turn clips (1978 board, 2008 island, Now wall panel) at the test sizes (including a tablet-with-chrome 800x1130): the clip is preloaded, plays over the start plate,
// lands on the era's end plate and the feed/era layer; Now lays the present-day feed on the frameless panel with Mara's foreground above
// it (no old TV plate, no 1978 feeds). Fallbacks: clip blocked -> plate crossfade; Skip mid-clip; reduced motion; another exec (no clip).
// Also the knock on the seated desk. SHOTS=dir saves screens. Exit 1 on any failure.
const H=require("../real-input/h.js"),fs=require("fs");const {seedHouse}=require("./probe.js");
const SIZES=(process.env.SIZES||"360x800,412x915,800x1130,800x1150,800x1280,1280x800").split(",");const SHOTS=process.env.SHOTS;if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
let bad=0,n=0;function ok(c,m){n++;if(!c){bad++;console.log("FAIL",m);}}
const ERA={2:{key:"1978",end:"board-after.webp",scr:/is-board is-full/},6:{key:"2008",end:"2008-end.webp",scr:/is-isle is-full/},10:{key:"now",end:"now-end.webp",scr:/^hv-screen/}};
async function seed(p,O,t,o){await seedHouse(p,O,Object.assign({seed:13,stop:"deal:"+(t>8?6:t),exec:"mara",smart:true,build:true,patch:t>8?"st.turn="+t+";":undefined},o||{}));}
async function ready(p){for(let i=0;i<40;i++){const c=await p.evaluate(()=>LD.houseUi.clip());if(c.ready)return c;await p.waitForTimeout(150);}return p.evaluate(()=>LD.houseUi.clip());}
async function peek(p){const b=await p.$("#house-peek");if(b&&await b.isVisible()){await b.click({timeout:2000});return true;}return false;}
async function after(p){for(let i=0;i<40;i++){if(await p.$("#hv-back"))return true;await p.waitForTimeout(150);}return false;}
async function framing(p,tag){
  const r=await p.evaluate(()=>{
    const vw=innerWidth,vh=innerHeight,box=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,b:r.bottom,rgt:r.right};};
    const hits=(a,b)=>a&&b&&a.x<b.rgt&&b.x<a.rgt&&a.y<b.b&&b.y<a.b;
    const hud=box(document.querySelector("#house-root .sd-hud, #house-root .hv-hud"));
    const goal=box(document.querySelector("#house-root .hv-goal"));
    const items=[...document.querySelectorAll("#house-root .hv-eslot, #house-root .hv-echip, #house-root .hv-pips, #house-root.is-now-panel .hv-cell")].map(e=>({t:(e.textContent||e.className||"").trim().slice(0,48),...box(e)}));
    const issues=[];
    for(const it of items){
      if(it.y<-1||it.b>vh+1||it.x<-1||it.rgt>vw+1) issues.push("clipped "+it.t);
      if(hits(it,hud)) issues.push("under HUD "+it.t);
      if(hits(it,goal)) issues.push("overlaps goal "+it.t);
    }
    if(goal&&(goal.y<-1||goal.b>vh+1||hits(goal,hud))) issues.push("goal not clear");
    return issues;
  });
  ok(!r.length,tag+" cells, labels and goal sit clear of the HUD "+(r.join("; ")||"ok"));
}
const plates=p=>p.evaluate(()=>[...document.querySelectorAll("#house-root .hv-plate")].map(i=>i.getAttribute("src")));
(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");const O=env.origin;
 for(const sz of SIZES){const [W,Hh]=sz.split("x").map(Number);
  for(const t of [2,6,10]){const E=ERA[t],tag=sz+" "+E.key;const p=await H.page(env,W,Hh);await seed(p,O,t);
   const c=await ready(p);ok(c.key===E.key&&c.clip==="turn-"+E.key&&c.ready,tag+" clip preloaded "+JSON.stringify(c));
   ok(await peek(p),tag+" look-back button");
   let playing=false,midShot=false;for(let i=0;i<30&&!playing;i++){await p.waitForTimeout(80);playing=await p.evaluate(()=>!!document.querySelector("#house-root .hv-vid.is-on"));}
   ok(playing,tag+" clip plays over the plates");
   if(playing){const st=await p.evaluate(()=>{const v=document.querySelector("#house-root .hv-vid"),pl=document.querySelector("#house-root .hv-plates");return {t:v.currentTime,after:pl.nextElementSibling===v,inRig:!!v.closest(".hv-rig")};});
    ok(st.after&&st.inRig,tag+" video sits in .hv-rig right over .hv-plates "+JSON.stringify(st));
    await p.waitForTimeout(500);if(SHOTS){await p.screenshot({path:`${SHOTS}/turn-${E.key}-${sz}-mid.png`});midShot=true;}}
   ok(await after(p),tag+" lands facing the screen");await p.waitForTimeout(300);
   const r=await p.evaluate(()=>({vid:!!document.querySelector("#house-root .hv-vid"),cls:(document.querySelector("#house-root .hv-root")||{}).className,scr:(document.querySelector("#house-root .hv-screen")||{}).className||"",
     op:getComputedStyle(document.querySelector("#house-root .hv-screen")).opacity,c:LD.houseUi.clip(),fg:!!document.querySelector("#house-root .hv-fg"),
     feeds:[...document.querySelectorAll("#house-root .hv-screen .hv-cell img")].map(i=>i.getAttribute("src"))}));
   const pl=await plates(p);
   ok(!r.vid,tag+" clip removed after landing");ok(r.c.played===1&&r.c.fell===0,tag+" played once, no fallback "+JSON.stringify(r.c));
   ok(pl[pl.length-1].endsWith("/"+E.end),tag+" end plate "+pl[pl.length-1]);ok(E.scr.test(r.scr)&&+r.op>0.99,tag+" screen layer shown "+r.scr+" "+r.op);
   if(t===10){ok(/is-now-panel/.test(r.cls)&&r.fg,tag+" Now panel + Mara foreground");ok(pl.every(s=>/era\/mara\/now-/.test(s)),tag+" no old TV plates "+pl.join());
     ok(r.feeds.length>=4&&r.feeds.every(s=>/house\/now\/feed\//.test(s)),tag+" present-day feeds "+r.feeds.join());
     // the mapped panel: the feed's corners land on the painted quad (rig px)
     const q=await p.evaluate(()=>{const rig=document.querySelector("#house-root .hv-rig"),m=new DOMMatrix(getComputedStyle(rig).transform),inv=m.inverse(),cells=[...document.querySelectorAll("#house-root .hv-screen .hv-cell")];
       const b=cells.map(e=>e.getBoundingClientRect());const pt=(x,y)=>{const o=inv.transformPoint(new DOMPoint(x,y));return [Math.round(o.x),Math.round(o.y)];};
       return [pt(b[0].left,b[0].top),pt(b[2].left,b[2].bottom)];});
     ok(Math.abs(q[0][0]-73)<=3&&Math.abs(q[0][1]-225)<=3&&Math.abs(q[1][0]-73)<=3&&Math.abs(q[1][1]-651)<=3,tag+" feed mapped onto the panel "+JSON.stringify(q));}
   await framing(p,tag);
   if(SHOTS)await p.screenshot({path:`${SHOTS}/turn-${E.key}-${sz}-after.png`});
   // turn back: the reverse plate path back to the desk
   await p.click("#hv-back");let back=false;for(let i=0;i<30&&!back;i++){await p.waitForTimeout(120);back=await p.evaluate(()=>!document.querySelector("#house-root .hv-root"));}
   ok(back,tag+" turns back to the desk");
   ok(!p.errs.length,tag+" no page errors "+p.errs.slice(0,2));await p.ctx.close();}}
 // clip blocked -> plate crossfade
 {const p=await H.page(env,412,915);await p.route(/turn-2008\.(mp4|webm)/,r=>r.abort());await seed(p,O,6);await p.waitForTimeout(800);
  const c=await p.evaluate(()=>LD.houseUi.clip());ok(!c.ready,"blocked: no clip ready "+JSON.stringify(c));await peek(p);
  await p.waitForTimeout(400);ok(!(await p.$("#house-root .hv-vid")),"blocked: no video");ok(await after(p),"blocked: crossfade lands");
  const pl=await plates(p);ok(pl[5].endsWith("/2008-end.webp")&&pl[0].endsWith("/2008-start.webp"),"blocked: 2008 plates "+pl.join());
  ok(!p.errs.filter(e=>!/reqfail|ERR_FAILED/.test(e)).length,"blocked: no page errors "+p.errs.slice(0,2));await p.ctx.close();}
 // clip that never starts (start timeout) -> crossfade
 {const p=await H.page(env,412,915);await seed(p,O,2);await ready(p);await p.evaluate(()=>{LD.TURN_CLIP_START_MS=1;});await peek(p);
  ok(await after(p),"slow start: lands");const c=await p.evaluate(()=>LD.houseUi.clip());ok(c.fell===1&&c.played===0,"slow start: fell back to the crossfade "+JSON.stringify(c));
  ok(!(await p.$("#house-root .hv-vid")),"slow start: no video left");ok(!p.errs.length,"slow start: no page errors "+p.errs.slice(0,2));await p.ctx.close();}
 // Skip mid-clip
 {const p=await H.page(env,412,915);await seed(p,O,10);await ready(p);await p.evaluate(()=>{LD.TURN_CLIP_RATE=0.25;});await peek(p);
  for(let i=0;i<30;i++){if(await p.$("#house-root .hv-vid.is-on"))break;await p.waitForTimeout(80);}
  ok(!!(await p.$("#house-root .hv-vid.is-on")),"skip: clip is playing");await p.click("#hv-skip").catch(()=>{});await p.waitForTimeout(200);
  ok(!!(await p.$("#hv-back"))&&!(await p.$("#house-root .hv-vid")),"skip: straight to the screen, clip gone");ok(!p.errs.length,"skip: no page errors "+p.errs.slice(0,2));await p.ctx.close();}
 // reduced motion
 {const ctx=await env.browser.newContext({viewport:{width:412,height:915},hasTouch:true,isMobile:true,reducedMotion:"reduce"});const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(""+e));p.ctx=ctx;
  await seed(p,O,6);await p.waitForTimeout(600);const c=await p.evaluate(()=>LD.houseUi.clip());ok(!c.ready,"reduced: clip not fetched");await peek(p);await p.waitForTimeout(500);
  ok(!!(await p.$("#hv-back"))&&!(await p.$("#house-root .hv-vid")),"reduced: instant, no clip");ok(!p.errs.length,"reduced: no page errors");await ctx.close();}
 // another exec: no clip, shared plates
 {const p=await H.page(env,412,915);await seed(p,O,6,{exec:"reid"});await p.waitForTimeout(800);const c=await p.evaluate(()=>LD.houseUi.clip());ok(!c.key&&!c.ready,"reid: no Mara clip "+JSON.stringify(c));
  await peek(p);ok(await after(p),"reid: lands");const pl=await plates(p);ok(!pl.some(s=>/era\/mara/.test(s)),"reid: never Mara's plates");ok(!p.errs.length,"reid: no page errors "+p.errs.slice(0,2));await p.ctx.close();}
 // the knock on the seated desk
 for(const sz of ["360x800","1280x800"]){const [W,Hh]=sz.split("x").map(Number);const p=await H.page(env,W,Hh);await seed(p,O,6,{patch:"st.unrest=85;"});
  await p.evaluate(()=>LD.knockNow());await p.waitForTimeout(250);
  const k=await p.evaluate(()=>{const e=document.querySelector("#screen-desk .desk.sd .sd-knock.show");if(!e)return null;const r=e.getBoundingClientRect();return {t:e.textContent,x:r.x,y:r.y,w:r.width,h:r.height,op:+getComputedStyle(e).opacity};});
  ok(k&&/BANG|KNOCK|tap/.test(k.t)&&k.x>=0&&k.y>=0&&k.x+k.w<=W&&k.op>0.2,sz+" knock shows on the seated desk "+JSON.stringify(k));
  if(SHOTS)await p.screenshot({path:`${SHOTS}/knock-${sz}.png`});ok(!p.errs.length,sz+" knock: no page errors "+p.errs.slice(0,2));await p.ctx.close();}
 await env.close();console.log(bad?"TURN CLIPS FAIL "+bad+"/"+n:"TURN CLIPS OK "+n);process.exit(bad?1:0);})();
