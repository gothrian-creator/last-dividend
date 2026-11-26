#!/usr/bin/env node
// Every visitor seated across the table in a real seated fight (the fight's own layout, the art swapped in), at SZ. OUT dir.
// Checks: the art loads, the visitor stands behind the table (feet hidden), head clear of the HUD/name bar, nothing over the face.
const H=require("../real-input/h.js"),fs=require("fs");const {seedHouse}=require("./probe.js");
const OUT=process.env.OUT||("/tmp/sd-opps/"+Date.now().toString(36));fs.mkdirSync(OUT,{recursive:true});
const SIZES=(process.env.SIZES||"412x915").split(",");let bad=0,n=0;function ok(c,m){n++;if(!c){bad++;console.log("FAIL",m);}}
(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");
 for(const sz of SIZES){const [w,h]=sz.split("x").map(Number);
  const p=await H.page(env,w,h);await seedHouse(p,env.origin,{seed:13,stop:"deal:3",exec:"mara",smart:true});await p.waitForTimeout(500);
  await (await p.$(".sd-prop")).click();await p.waitForTimeout(500);await p.click("#btn-sign");await p.waitForTimeout(2600);
  /* NOSEAT=1 shows the old standing cut-outs (for before/after shots) */
  if(process.env.NOSEAT)await p.evaluate(()=>{for(const k of Object.keys(LD.SEAT.opp))if(/-seat$/.test(k))delete LD.SEAT.opp[k];});
  const arts=await p.evaluate(()=>Object.keys(LD.SEAT.opp));
  for(const art of (process.env.ARTS?process.env.ARTS.split(","):arts)){
   const r=await p.evaluate(async(art)=>{const old=document.getElementById("sc-opp");const tmp=document.createElement("div");tmp.innerHTML=LD.seatOppHtml(art,"idle",["idle","attack","hit","block","defeated"]);old.replaceWith(tmp.firstChild);
     window.dispatchEvent(new Event("resize"));const im=document.querySelector("#sc-opp img.p-idle");await new Promise(r=>{if(im.complete)r();else{im.onload=r;im.onerror=r;}});await new Promise(r=>setTimeout(r,250));
     const R=e=>{const b=e.getBoundingClientRect();return {l:b.left,t:b.top,r:b.right,b:b.bottom};};
     const box=LD.SEAT.opp[document.getElementById("sc-opp").getAttribute("data-art")],f=LD.seatFrame(innerWidth,innerHeight),hx=LD.seatToScreen(f,box[0]+box[2]*0.5,box[1]+box[3]*0.12);
     const face={l:hx[0]-30,r:hx[0]+30,t:hx[1]-26,b:hx[1]+26};const ov=(a,b)=>a&&b&&Math.min(a.r,b.r)-Math.max(a.l,b.l)>2&&Math.min(a.b,b.b)-Math.max(a.t,b.t)>2;
     const d=document.getElementById("door");const cover=["#sc-bubble","#df-intent",".sd-fhead",".sd-hud"].filter(s=>{const e=d.querySelector(s);return e&&ov(R(e),face);});
     return {loaded:im.naturalWidth>0,cover};},art);
   ok(r.loaded,sz+" "+art+" art loads");ok(!r.cover.length,sz+" "+art+" face clear "+JSON.stringify(r.cover));
   await p.screenshot({path:`${OUT}/${sz}-${art}.png`});}
  ok(!p.errs.length,sz+" no page errors "+p.errs.slice(0,3));await p.ctx.close();}
 await env.close();console.log(bad?"OPPS FAIL "+bad+" / "+n:"OPPS OK "+n+" checks",OUT);process.exit(bad?1:0);})();
