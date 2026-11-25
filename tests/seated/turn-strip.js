#!/usr/bin/env node
// Chair turn, slowed to 6s, shot every 0.5s at one size (SZ) into OUT: to judge the plate sequence by eye.
const H=require("../real-input/h.js"),fs=require("fs");const {seedHouse}=require("./probe.js");
const OUT=process.env.OUT||("/tmp/sd-turn/"+Date.now().toString(36));fs.mkdirSync(OUT,{recursive:true});
(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");const [w,h]=(process.env.SZ||"412x915").split("x").map(Number);
 const p=await H.page(env,w,h);await seedHouse(p,env.origin,{seed:13,stop:"deal:3",exec:process.env.EXEC||"mara",smart:true});await p.waitForTimeout(500);
 await p.evaluate(()=>{LD.SEAT_PULL_MS=200;LD.HOUSE_TURN_MS=6000;});
 await p.click("#house-peek");await p.waitForTimeout(250);
 for(let i=0;i<14;i++){await p.screenshot({path:`${OUT}/t${String(i).padStart(2,"0")}.png`});await p.waitForTimeout(430);}
 console.log(OUT,"errs",p.errs.slice(0,3));await env.close();})();
