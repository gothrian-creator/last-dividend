#!/usr/bin/env node
// Seated desk (house rules, Mara): screenshots of every state at the four test sizes. OUT=/tmp/sd-shots by default.
const H=require("../real-input/h.js"),fs=require("fs");
const {seedHouse}=require("./probe.js");
const OUT=process.env.OUT||("/tmp/sd-shots/"+Date.now().toString(36));fs.mkdirSync(OUT,{recursive:true});
const SIZES=(process.env.SIZES||"412x915,360x800,800x1280,1280x800").split(",");
const STOP=process.env.STOP||"deal:3", SEED=+(process.env.SEED||13);
(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");
 for(const sz of SIZES){const [w,h]=sz.split("x").map(Number);
  const p=await H.page(env,w,h);await seedHouse(p,env.origin,{seed:SEED,stop:STOP,exec:"mara",smart:true});
  await p.waitForTimeout(500);
  const info=await p.evaluate(()=>({sd:!!document.querySelector(".desk.sd"),turn:JSON.parse(localStorage.getItem(LD.HOUSE_SAVE_KEY)).midRun.turn}));
  console.log(sz,JSON.stringify(info));
  await p.screenshot({path:`${OUT}/${sz}-1-rest.png`});
  await p.click("#sd-tab");await p.waitForTimeout(450);
  await p.screenshot({path:`${OUT}/${sz}-2-fan.png`});
  await p.click("#sd-tab");await p.waitForTimeout(400);
  const tag=await p.$(".sd-tag");if(tag){await tag.click();await p.waitForTimeout(500);}
  await p.screenshot({path:`${OUT}/${sz}-3-dossier.png`});
  const sign=await p.$("#btn-sign:not([disabled])");if(sign){await sign.click();}else{const c=await p.$("#dossier .dz-choice:not([disabled])");if(c)await c.click();}
  await p.waitForTimeout(1600);
  const fight=await p.evaluate(()=>!!document.querySelector("#door.sd-fight"));
  await p.screenshot({path:`${OUT}/${sz}-4-${fight?"fight":"aftersign"}.png`});
  if(fight){
    const card=await p.$(".sd-fhand .dc:not(.no)");if(card){await card.click();await p.waitForTimeout(900);}
    await p.screenshot({path:`${OUT}/${sz}-5-played.png`});
  }
  if(fight){
    for(let i=0;i<2;i++){const st=await p.$("#df-settle:not([disabled])");if(st){await st.click();await p.waitForTimeout(900);}}await p.waitForTimeout(600);
    await p.screenshot({path:`${OUT}/${sz}-6-result.png`});
    for(let i=0;i<6;i++){const c=await p.$("#df-close, #rw-skip, #rw-keep, #rw-apass, #fy-boss-ok");if(!c)break;try{await c.click();}catch(e){}await p.waitForTimeout(900);}
  }
  await p.screenshot({path:`${OUT}/${sz}-7-bunkerphase.png`});
  const rg=await p.evaluate(()=>{const r=document.querySelector(".desk.sd .sd-region");if(!r)return null;const b=r.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2];});
  const inf=await p.evaluate(()=>({phase:JSON.parse(localStorage.getItem(LD.HOUSE_SAVE_KEY)).midRun.phase,door:!document.getElementById("door").hidden,hv:!!document.querySelector("#house-root:not([hidden])")}));
  console.log(sz,"after fight",JSON.stringify(inf));
  const net=inf.door?null:await p.$(".desk.sd .sd-net[data-net]");if(net){await net.evaluate(e=>e.click());await p.waitForTimeout(500);await p.screenshot({path:`${OUT}/${sz}-8-net.png`});}
  console.log(sz,"errs",p.errs.slice(0,6));await p.ctx.close();}
 await env.close();})();
