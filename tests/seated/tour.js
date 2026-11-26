#!/usr/bin/env node
// Penny's guided first quarter on the seated house desk (the default game since the flip): fresh save, default URL, real
// taps on the highlighted control (falling back to "do it for me"), at the five sizes. Checks: the offer appears, every step
// shows a visible target (or is a passive/next step), the card never covers its target, nothing scrolls, the tour finishes
// and is saved as done, no page errors. Also the skip path: Penny stays quiet afterwards. Exit 1 on any failure.
const H=require("../real-input/h.js"),fs=require("fs");
const SIZES=(process.env.SIZES||"360x800,412x915,800x1150,800x1280,1280x800").split(",");const OUT=process.env.OUT||"";if(OUT)fs.mkdirSync(OUT,{recursive:true});
let bad=0,n=0;function ok(c,m){n++;if(!c){bad++;console.log("FAIL",m);}}
const inter=(a,b)=>{const x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);return x>4&&y>4?Math.round(x*y):0;};
async function ps(p){return p.evaluate(()=>{const el=document.getElementById("penny");const vis=!!(el&&!el.hidden&&getComputedStyle(el).display!=="none");
 const q=s=>{const n=document.querySelector(s);if(!n)return null;const r=n.getBoundingClientRect();return r.width?{left:r.left,top:r.top,right:r.right,bottom:r.bottom}:null};
 const hole=el&&el.querySelector(".pn-hole"),holeOn=!!(hole&&hole.style.display!=="none");
 return {vis,text:vis?el.querySelector(".pn-text").textContent:"",count:vis?el.querySelector(".pn-count").textContent:"",action:vis&&el.classList.contains("is-action"),passive:vis&&el.classList.contains("is-passive"),
  box:vis?q("#penny .pn-card"):null,hole:holeOn?q("#penny .pn-hole"):null,meta:JSON.parse(localStorage.getItem("lastDividend.v1")||"{}").penny||{},
  sd:!!document.querySelector(".desk.sd"),scroll:document.scrollingElement.scrollHeight>innerHeight+1||document.scrollingElement.scrollWidth>innerWidth+1};});}
async function vclick(p,sels){for(const s of sels){const h=await p.$(s);if(h&&await h.isVisible().catch(()=>false)){await h.click({timeout:2500}).catch(()=>{});return s;}}return null;}
async function fresh(p,origin){await p.goto(origin);await p.evaluate(()=>localStorage.clear());await p.goto(origin);await p.waitForTimeout(900);
 await p.click("#btn-new");await p.waitForTimeout(700);await p.click("#btn-start");await p.waitForTimeout(2000);
 for(let i=0;i<4;i++){if(await vclick(p,["#fy-boss-ok"]))await p.waitForTimeout(800);}}
(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");
 for(const sz of SIZES){const [w,h]=sz.split("x").map(Number);
  let p=await H.page(env,w,h);await fresh(p,env.origin);let s=await ps(p);
  ok(s.sd,sz+" fresh default start is the seated desk");ok(s.vis&&/Penny/.test(s.text),sz+" Penny offers the tour");
  await p.click("#penny .pn-next");await p.waitForTimeout(700);
  let last="",k=0,hidden=0,steps=[];
  for(let it=0;it<500;it++){s=await ps(p);if(s.scroll)ok(false,sz+" page scrolls at "+last.slice(0,40));
   if(!s.vis){if(s.meta.done)break;hidden++;if(hidden>8){await vclick(p,["#hv-back","#fy-boss-ok","#ov-ok","#fy-m-a","#fy-m-b","#fy-m-c","#df-close","#rw-apass","#rw-skip"]);hidden=0;}await p.waitForTimeout(300);continue;}
   hidden=0;
   if(s.text!==last){k++;last=s.text;steps.push(s.count+" "+s.text.slice(0,48));const ov=s.box&&s.hole?inter(s.box,s.hole):0;ok(!ov,sz+` step ${k} (${s.count}) card covers its target by ${ov}px² :: ${s.text.slice(0,40)}`);
    if(s.hole)ok(s.hole.left>-3&&s.hole.top>-3&&s.hole.right<w+3&&s.hole.bottom<h+3,sz+" step "+k+" target on screen "+JSON.stringify(s.hole));
    if(OUT)await p.screenshot({path:`${OUT}/${sz}-tour-${String(k).padStart(2,"0")}.png`});await p.waitForTimeout(300);}
   if(s.passive){await p.waitForTimeout(500);continue;}
   if(s.action&&s.hole){const x=(s.hole.left+s.hole.right)/2,y=(s.hole.top+s.hole.bottom)/2;await p.mouse.click(x,y);await p.waitForTimeout(1300);
    const s2=await ps(p);if(s2.vis&&s2.text===s.text){await p.click("#penny .pn-next",{timeout:2500}).catch(()=>{});await p.waitForTimeout(1300);}}
   else{await p.click("#penny .pn-next",{timeout:2500}).catch(()=>{});await p.waitForTimeout(1100);}}
  if(process.env.V){await p.screenshot({path:"/tmp/tourend-"+sz+".png"});console.log(await p.evaluate(()=>JSON.stringify({ov:document.getElementById("overlay").className,door:document.getElementById("door").className,pn:(document.getElementById("penny")||{}).hidden,pntext:((document.querySelector("#penny .pn-text")||{}).textContent||"").slice(0,60),hv:!!document.querySelector("#hv-back"),peek:!!document.querySelector("#house-peek"),body:document.body.className,mid:(JSON.parse(localStorage.getItem("lastDividend.v1")).midRun||{}).phase,turn:(JSON.parse(localStorage.getItem("lastDividend.v1")).midRun||{}).turn})));}
  s=await ps(p);ok(s.meta.done,sz+" tour finishes and is saved done (steps "+k+": "+steps.join(" | ")+")");ok(k>=12,sz+" tour shows its steps ("+k+")");
  ok(!p.errs.length,sz+" no page errors "+p.errs.slice(0,3));if(process.env.V)console.log(sz,steps.join("\n  "));
  await p.ctx.close();
  // skip path
  p=await H.page(env,w,h);await fresh(p,env.origin);await p.click("#penny .pn-skip");await p.waitForTimeout(500);s=await ps(p);
  ok(!s.vis&&s.meta.done&&s.meta.tipsOff,sz+" skip hides Penny and mutes tips "+JSON.stringify(s.meta));
  await (await p.$(".sd-prop")).click();await p.waitForTimeout(700);s=await ps(p);ok(!s.vis,sz+" Penny stays quiet after a skip");
  ok(!p.errs.length,sz+" skip path no page errors "+p.errs.slice(0,3));await p.ctx.close();}
 await env.close();console.log(bad?`TOUR FAIL ${bad}/${n}`:`TOUR OK ${n}`);process.exit(bad?1:0);})();
