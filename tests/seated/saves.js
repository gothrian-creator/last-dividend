#!/usr/bin/env node
// Saves across the flip (the house desk became the default on 2026-11-26). Exit 1 on any failure.
//  1 fresh default start -> a house run in the main save (lastDividend.v1), seated desk
//  2 an old shop mid-run in the main save -> the default page resumes it as the shop game (old desk), playable
//  3 a legacy mid-run with no ruleset field -> resumes as shop
//  4 a ?house=1 test-slot run, empty main save -> the default page picks it up once (seated desk); the test slot is left as is
//  5 ?classic=1 fresh start -> shop run; ?house=1 fresh start -> house run in its own slot
const H=require("../real-input/h.js"),fs=require("fs");const DRIVER=fs.readFileSync(__dirname+"/../era-driver.js","utf8");
const SZ=(process.env.SIZE||"412x915").split("x").map(Number);let bad=0,n=0;function ok(c,m){n++;if(!c){bad++;console.log("FAIL",m);}}
const PEN={penny:{offered:true,done:true,tipsOff:true,tips:{}},audioOff:true,seenTutorial:true,coachDone:true};
async function freshStart(p,url){await p.goto(url);await p.evaluate(()=>localStorage.clear());await p.goto(url);await p.waitForTimeout(800);
 await p.evaluate(m=>{localStorage.setItem("lastDividend.v1",JSON.stringify(m));localStorage.setItem("lastDividend.house.v1",JSON.stringify(m));},PEN);await p.goto(url);await p.waitForTimeout(800);
 await p.click("#btn-new");await p.waitForTimeout(700);await p.click("#btn-start");await p.waitForTimeout(2200);
 for(let i=0;i<3;i++){const b=await p.$("#fy-boss-ok");if(b&&await b.isVisible()){await b.click();await p.waitForTimeout(700);}}}
const look=p=>p.evaluate(()=>{const g=k=>{try{return JSON.parse(localStorage.getItem(k)||"null");}catch(e){return null;}};const m=g("lastDividend.v1"),h=g("lastDividend.house.v1");
 return {sd:!!document.querySelector("#screen-desk .desk.sd"),old:!!document.querySelector("#screen-desk .desk")&&!document.querySelector(".desk.sd"),flag:LD.HOUSE_RULES,
  main:m&&m.midRun?m.midRun.ruleset||"(none)":null,slot:h&&h.midRun?h.midRun.ruleset:null,merged:!!(m&&m.houseSlotMerged),slotTurn:h&&h.midRun?h.midRun.turn:null,mainTurn:m&&m.midRun?m.midRun.turn:null};});
async function seedRaw(p,url,key,o,strip){await p.goto(url);await p.waitForTimeout(300);
 await p.evaluate(([DRIVER,key,o,PEN,strip])=>{localStorage.clear();const st=new Function("module",DRIVER+"; return eraDrive;")(undefined)(window.LD,o);if(strip)delete st.ruleset;
  localStorage.setItem(key,JSON.stringify(Object.assign({},PEN,{midRun:st})));},[DRIVER,key,o,PEN,strip]);}
async function cont(p,url){await p.goto(url);await p.waitForTimeout(700);await p.click("#btn-continue");await p.waitForTimeout(1800);
 for(let i=0;i<3;i++){const b=await p.$("#fy-boss-ok");if(b&&await b.isVisible()){await b.click();await p.waitForTimeout(700);}}}
(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");const O=env.origin;let p,s;
 // 1
 p=await H.page(env,...SZ);await freshStart(p,O);s=await look(p);ok(s.sd&&s.main==="house"&&s.flag===true,"1 fresh default start = house run in the main save "+JSON.stringify(s));ok(!p.errs.length,"1 no page errors "+p.errs.slice(0,3));await p.ctx.close();
 // 2 old shop save (made by a classic page) opened on the default page
 p=await H.page(env,...SZ);await seedRaw(p,O+"?classic=1","lastDividend.v1",{seed:13,stop:"deal:3",exec:"mara",smart:true});await cont(p,O);s=await look(p);
 ok(s.old&&s.main==="shop","2 old shop save resumes as the shop game on the default page "+JSON.stringify(s));
 { const pin=await p.$(".desk .map .pin");ok(!!pin,"2 the shop map pins are there");if(pin){const bb=await pin.boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(700);
   const sign=await p.$("#btn-sign:not([disabled])")||await p.$("#dossier .dz-choice:not([disabled])");ok(!!sign,"2 a deal can be opened and signed");if(sign){await sign.click();await p.waitForTimeout(2500);}
   s=await look(p);ok(s.main==="shop"&&s.mainTurn===3,"2 still the shop run after signing "+JSON.stringify(s));} }
 ok(!p.errs.length,"2 no page errors "+p.errs.slice(0,3));await p.ctx.close();
 // 3 legacy save without ruleset
 p=await H.page(env,...SZ);await seedRaw(p,O+"?classic=1","lastDividend.v1",{seed:7,stop:"deal:2",exec:"reid",smart:true},true);await cont(p,O);s=await look(p);
 ok(s.old&&(s.main==="(none)"||s.main==="shop"),"3 legacy save (no ruleset) resumes as shop "+JSON.stringify(s));ok(!p.errs.length,"3 no page errors "+p.errs.slice(0,3));await p.ctx.close();
 // 4 test-slot pickup
 p=await H.page(env,...SZ);await seedRaw(p,O+"?house=1","lastDividend.house.v1",{seed:13,stop:"deal:3",exec:"mara",smart:true});s=await look(p);ok(s.slot==="house"&&!s.main,"4 setup: run only in the test slot "+JSON.stringify(s));
 await cont(p,O);s=await look(p);ok(s.sd&&s.main==="house"&&s.merged&&s.slot==="house"&&s.slotTurn===3,"4 default page picks up the test-slot run, slot kept "+JSON.stringify(s));
 await p.goto(O);await p.waitForTimeout(600);s=await look(p);ok(s.main==="house"&&s.mainTurn===3,"4 merge happens once, no double "+JSON.stringify(s));ok(!p.errs.length,"4 no page errors "+p.errs.slice(0,3));await p.ctx.close();
 // 5
 p=await H.page(env,...SZ);await freshStart(p,O+"?classic=1");s=await look(p);ok(s.old&&s.main==="shop"&&s.flag===false,"5 ?classic=1 fresh start = shop run "+JSON.stringify(s));await p.ctx.close();
 p=await H.page(env,...SZ);await freshStart(p,O+"?house=1");s=await look(p);ok(s.sd&&s.slot==="house","5 ?house=1 still plays house in its own slot "+JSON.stringify(s));ok(!p.errs.length,"5 no page errors "+p.errs.slice(0,3));await p.ctx.close();
 await env.close();console.log(bad?`SAVES FAIL ${bad}/${n}`:`SAVES OK ${n}`);process.exit(bad?1:0);})();
