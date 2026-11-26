#!/usr/bin/env node
// Seated desk: play to the bunker phase, open the bunker, End quarter, and shoot the close (stamp + beats). OUT dir.
const H=require("../real-input/h.js"),fs=require("fs");const {seedHouse}=require("./probe.js");
const OUT=process.env.OUT||("/tmp/sd-endq/"+Date.now().toString(36));fs.mkdirSync(OUT,{recursive:true});
const SIZES=(process.env.SIZES||"412x915,360x800,800x1280,1280x800").split(",");
(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");
 for(const sz of SIZES){const [w,h]=sz.split("x").map(Number);
  const p=await H.page(env,w,h);await seedHouse(p,env.origin,{seed:13,stop:"deal:3",exec:"mara",smart:true});await p.waitForTimeout(500);
  await (await p.$(".sd-prop")).click();await p.waitForTimeout(500);
  const sign=await p.$("#btn-sign:not([disabled])");if(sign)await sign.click();await p.waitForTimeout(2600);
  if(await p.$("#door.sd-fight")){for(let i=0;i<2;i++){const st=await p.$("#df-settle:not([disabled])");if(st){await st.click();await p.waitForTimeout(900);}}await p.waitForTimeout(600);
    for(let i=0;i<6;i++){const c=await p.$("#df-close, #rw-skip, #rw-keep, #rw-apass, #fy-boss-ok");if(!c)break;try{await c.click();}catch(e){}await p.waitForTimeout(900);}}
  await p.waitForTimeout(2500);
  if(!(await p.$("#house-root:not([hidden])"))){const pk=await p.$("#house-peek");if(pk){await pk.click();await p.waitForTimeout(3500);}}
  await p.screenshot({path:`${OUT}/${sz}-visitor.png`});
  for(let i=0;i<3;i++){const a=await p.$("#hv-admit");if(!a)break;await a.click();await p.waitForTimeout(1200);}
  await p.screenshot({path:`${OUT}/${sz}-bunker.png`});
  const e=await p.$("#hv-endq");console.log(sz,"endq",!!e);
  if(e){await e.click();for(let i=0;i<10;i++){await p.waitForTimeout(450);await p.screenshot({path:`${OUT}/${sz}-close-${i}.png`});}}
  if(process.env.DUMP)console.log(await p.evaluate(()=>{const o=document.getElementById("overlay"),pn=o&&o.querySelector(".panel");return o?[o.className,pn&&getComputedStyle(pn).backgroundColor,pn&&getComputedStyle(pn).backgroundImage.slice(0,80)]:null;}));
  console.log(sz,"errs",p.errs.slice(0,4));await p.ctx.close();}
 await env.close();})();
