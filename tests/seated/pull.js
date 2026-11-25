#!/usr/bin/env node
// Seated desk pull-back (desk -> chair turn) and the reverse, through the real buttons. Slowed so mid frames can be shot.
const H=require("../real-input/h.js"),fs=require("fs");const {seedHouse}=require("./probe.js");
const OUT=process.env.OUT||("/tmp/sd-pull/"+Date.now().toString(36));fs.mkdirSync(OUT,{recursive:true});
const SIZES=(process.env.SIZES||"412x915,360x800,800x1280,1280x800").split(",");let bad=0;
function ok(c,m){if(!c){bad++;console.log("FAIL",m);}}
(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");
 for(const sz of SIZES){const [w,h]=sz.split("x").map(Number);
  const p=await H.page(env,w,h);await seedHouse(p,env.origin,{seed:13,stop:"deal:3",exec:process.env.EXEC||"mara",smart:true});await p.waitForTimeout(500);
  // static strip through the pose curve
  for(const t of [0,0.25,0.5,0.75,1]){await p.evaluate(t=>LD.seatPose(t),t);await p.waitForTimeout(80);await p.screenshot({path:`${OUT}/${sz}-pose-${t}.png`});}
  await p.evaluate(()=>LD.seatPose(0));
  await p.evaluate(()=>{LD.SEAT_PULL_MS=4000;LD.HOUSE_TURN_MS=1600;});
  await p.click("#house-peek");await p.waitForTimeout(2000);
  const mid=await p.evaluate(()=>({pull:document.querySelector(".desk.sd").classList.contains("is-pulling"),shield:!!document.getElementById("sd-shield")}));
  ok(mid.pull&&mid.shield,sz+" mid pull state "+JSON.stringify(mid));
  await p.screenshot({path:`${OUT}/${sz}-pull-mid.png`});
  await p.waitForTimeout(2300);await p.screenshot({path:`${OUT}/${sz}-turn-start.png`});
  await p.waitForTimeout(2400);
  const open=await p.evaluate(()=>{const r=document.getElementById("house-root");return !!(r&&!r.hidden&&document.getElementById("hv-back"));});
  ok(open,sz+" house view open");await p.screenshot({path:`${OUT}/${sz}-house.png`});
  if(open){await p.click("#hv-back");await p.waitForTimeout(1600+2000);
    await p.screenshot({path:`${OUT}/${sz}-back-mid.png`});
    await p.waitForTimeout(3200);
    const back=await p.evaluate(()=>({pull:document.querySelector(".desk.sd").classList.contains("is-pulling"),t:getComputedStyle(document.querySelector(".desk.sd")).getPropertyValue("--pull").trim(),hv:(document.getElementById("house-root")||{}).hidden,peek:!document.getElementById("house-peek").hidden}));
    ok(!back.pull&&back.peek,sz+" back at desk "+JSON.stringify(back));
    await p.screenshot({path:`${OUT}/${sz}-back-done.png`});}
  ok(!p.errs.length,sz+" errors "+p.errs.slice(0,4));console.log(sz,"done");await p.ctx.close();}
 await env.close();console.log(bad?"PULL FAIL "+bad:"PULL OK","->",OUT);process.exit(bad?1:0);})();
