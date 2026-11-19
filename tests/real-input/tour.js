// Real-input playtest of Penny's tour + the skip path. Usage: node tour.js <outdir> <sizes>
const H=require("./h.js"),fs=require("fs");
const out=process.argv[2]||"/workspace/ld-current/t/tour"; fs.mkdirSync(out,{recursive:true});
const sizes=(process.argv[3]||"390x844").split(",").map(s=>s.split("x").map(Number));
const SHOTS=process.env.SHOTS!=="0";
function inter(a,b){const x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);return x>4&&y>4?Math.round(x*y):0;}
async function pstate(p){return p.evaluate(()=>{const el=document.getElementById("penny");const vis=el&&!el.hidden&&getComputedStyle(el).display!=="none";
 const q=s=>{const n=document.querySelector(s);if(!n)return null;const r=n.getBoundingClientRect();return r.width?{left:r.left,top:r.top,right:r.right,bottom:r.bottom,w:r.width,h:r.height}:null};
 const hole=el&&el.querySelector(".pn-hole");const holeOn=hole&&hole.style.display!=="none";
 return {vis,text:vis?el.querySelector(".pn-text").textContent:"",count:vis?el.querySelector(".pn-count").textContent:"",action:vis&&el.classList.contains("is-action"),passive:vis&&el.classList.contains("is-passive"),tip:vis&&el.classList.contains("is-tip"),
  box:vis?q("#penny .pn-card"):null,face:null,hole:holeOn?q("#penny .pn-hole"):null,next:vis?el.querySelector(".pn-next").textContent:"",
  overlay:!!document.querySelector("#overlay.on"),door:!!document.querySelector("#door.on"),meta:JSON.parse(localStorage.getItem("lastDividend.v1")||"{}").penny||{},
  vw:innerWidth,vh:innerHeight,scroll:[document.scrollingElement.scrollHeight,innerHeight,document.scrollingElement.scrollWidth,innerWidth]};});}
async function clickVisible(p,sels){for(const s of sels){const h=await p.$(s);if(h&&await h.isVisible().catch(()=>false)&&!(await h.isDisabled().catch(()=>false))){await h.click({timeout:3000}).catch(()=>{});return s;}}return null;}
async function startRun(p,origin){await p.goto(origin);await p.waitForTimeout(900);await p.click("#btn-new");await p.waitForTimeout(700);await p.click("#btn-start");await p.waitForTimeout(1800);
 for(let i=0;i<3;i++){if(await clickVisible(p,["#fy-boss-ok"]))await p.waitForTimeout(800);}}
(async()=>{const env=await H.start(); const report={};
for(const [w,h] of sizes){const tag=w+"x"+h; const R=report[tag]={steps:[],issues:[]}; try{
 // --- A: full tour ---
 let p=await H.page(env,w,h); await startRun(p,env.origin);
 let s=await pstate(p); if(!/Penny/.test(s.text)&&!/guided/.test(s.text)) R.issues.push("no offer: "+s.text.slice(0,60));
 if(SHOTS) await p.screenshot({path:`${out}/${tag}-00-offer.png`});
 await p.click("#penny .pn-next"); await p.waitForTimeout(700);
 let last="",hidden=0,k=0;
 for(let it=0;it<140;it++){s=await pstate(p);
  if(s.scroll[0]>s.scroll[1]+1||s.scroll[2]>s.scroll[3]+1) R.issues.push("page scrolls at "+last.slice(0,30)+" "+s.scroll);
  if(!s.vis){ if(s.meta.done){break;} hidden++; if(hidden>25){ const c=await clickVisible(p,["#fy-boss-ok","#ov-ok","#fy-m-a","#fy-m-b","#fy-m-c","#df-close"]); R.steps.push({hiddenUnstick:c}); hidden=0;} await p.waitForTimeout(250); continue;}
  hidden=0;
  if(s.text!==last){k++; last=s.text; const ov=s.box&&s.hole?inter(s.box,s.hole):0;
   const off=s.hole&&(s.hole.left<-2||s.hole.top<-2||s.hole.right>s.vw+2||s.hole.bottom>s.vh+2);
   R.steps.push({k,count:s.count,next:s.next,text:s.text.slice(0,70),boxOverHole:ov,holeOff:!!off,tip:s.tip});
   if(ov>0) R.issues.push(`step ${k} (${s.count}) box covers target by ${ov}px²`);
   if(s.tip) R.issues.push("tip shown during tour: "+s.text.slice(0,50));
   if(SHOTS&&process.env.SHOTWAIT) await p.waitForTimeout(+process.env.SHOTWAIT); if(SHOTS) await p.screenshot({path:`${out}/${tag}-${String(k).padStart(2,"0")}.png`});
   await p.waitForTimeout(400);
  }
  if(s.passive){await p.waitForTimeout(500);continue;}
  // finish typing first
  if(s.action&&s.hole){ const x=(s.hole.left+s.hole.right)/2,y=(s.hole.top+s.hole.bottom)/2; await p.mouse.click(x,y); await p.waitForTimeout(1100);
    const s2=await pstate(p); if(s2.vis&&s2.text===s.text){ R.steps.push({fallback:"do-it-for-me",text:s.text.slice(0,30)}); await p.click("#penny .pn-next",{timeout:3000}).catch(()=>{}); await p.waitForTimeout(1100);} }
  else { await p.click("#penny .pn-next",{timeout:3000}).catch(()=>{}); await p.waitForTimeout(1000); }
 }
 s=await pstate(p); R.tourDone=!!s.meta.done; R.tipsOffAfterTour=!!s.meta.tipsOff; R.errorsA=p.errs.slice();
 if(SHOTS) await p.screenshot({path:`${out}/${tag}-zz-after.png`});
 await p.ctx.close();
 // --- B: skip at the offer, then play Q1 with real taps; Penny must stay hidden through the fight ---
 p=await H.page(env,w,h); await startRun(p,env.origin);
 await p.click("#penny .pn-skip"); await p.waitForTimeout(500);
 s=await pstate(p); R.skipMeta=s.meta;
 // hand highlight should point at a pin
 const arrow1=await p.evaluate(()=>{const a=document.getElementById("ld-arrow");if(!a||a.hidden)return null;const r=a.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom};});
 R.arrowDeal=arrow1;
 { const bb=await (await p.$(".desk .map .pin.ld-act")||await p.$(".desk .map .pin")).boundingBox(); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); } await p.waitForTimeout(700); /* pins pulse: real mouse tap at centre */
 await clickVisible(p,["#btn-sign:not([disabled])","#dossier .dz-choice:not([disabled])"]); 
 let pennyDuringFight=0; let fightSeen=false;
 for(let i=0;i<120;i++){ await p.waitForTimeout(300); s=await pstate(p); if(s.vis) pennyDuringFight++;
  if(s.door){fightSeen=true; const c=await clickVisible(p,["#door .df-hand .dc.ld-act","#door .df-hand .dc:not(.no)"]); if(!c) await clickVisible(p,["#df-end","#df-close","#rw-skip","#door [data-card]","#rw-take:not([disabled])","#rw-keep","#rw-apass"]); continue;}
  if(s.overlay){await clickVisible(p,["#fy-boss-ok","#ov-ok","#fy-m-b","#fy-m-a"]);continue;}
  const ph=await p.evaluate(()=>window.LD&&document.querySelector(".desk")?document.querySelector("#bunker-card.ready")!=null:false); if(ph&&fightSeen) break; }
 R.fightSeen=fightSeen; R.pennyFramesDuringSkippedFight=pennyDuringFight;
 await p.waitForTimeout(1800); await p.mouse.move(5,5); await p.waitForTimeout(1600); const arrow2=await p.evaluate(()=>{const a=document.getElementById("ld-arrow");if(!a||a.hidden)return null;const r=a.getBoundingClientRect();return {l:Math.round(r.left),t:Math.round(r.top),r:Math.round(r.right),b:Math.round(r.bottom),vw:innerWidth,vh:innerHeight, bunkerAct:!!document.querySelector("#bunker-card.ld-act")};});
 R.arrowBunker=arrow2; if(arrow2&&(arrow2.l<0||arrow2.r>arrow2.vw||arrow2.t<0||arrow2.b>arrow2.vh)) R.issues.push("hand off-screen at bunker "+JSON.stringify(arrow2));
 if(SHOTS) await p.screenshot({path:`${out}/${tag}-skip-hub.png`});
 // open bunker via rail, shot, build via roster
 await p.click("#bunker-card"); await p.waitForTimeout(1100); if(SHOTS) await p.screenshot({path:`${out}/${tag}-skip-bunker.png`});
 const ros=await p.$("#bk-panel [data-roster]"); if(ros&&await ros.isVisible()){await ros.click(); await p.waitForTimeout(600);} else { await p.click(".bk-view [data-room]").catch(()=>{}); await p.waitForTimeout(600);}
 if(SHOTS) await p.screenshot({path:`${out}/${tag}-skip-room.png`});
 s=await pstate(p); if(s.scroll[0]>s.scroll[1]+1) R.issues.push("bunker room page scroll");
 const bpOverflow=await p.evaluate(()=>{const v=document.querySelector(".bk-view");const pn=document.getElementById("bk-panel");return v?{view:[v.scrollHeight,v.clientHeight],panel:pn?[pn.scrollHeight,pn.clientHeight]:null}:null});
 R.bunkerOverflow=bpOverflow; if(bpOverflow&&bpOverflow.panel&&bpOverflow.panel[0]>bpOverflow.panel[1]+2) R.issues.push("bunker panel content clipped "+JSON.stringify(bpOverflow));
 const buy=await clickVisible(p,['#bk-panel [data-up][data-q="sound"]:not([disabled])','#bk-panel [data-up]:not([disabled])']); R.bought=buy; await p.waitForTimeout(1500);
 await clickVisible(p,["#bs-close"]); await p.waitForTimeout(800);
 // rail checks: sizes >= 44
 R.rail=await p.evaluate(()=>[...document.querySelectorAll("#side-rail .sr-btn")].map(b=>{const r=b.getBoundingClientRect();const c=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {id:b.id,w:Math.round(r.width),h:Math.round(r.height),inView:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,top:!!(c&&(c===b||b.contains(c)))};}));
 R.rail.forEach(b=>{if(b.w<44||b.h<44)R.issues.push("rail btn small "+b.id+" "+b.w+"x"+b.h); if(!b.inView)R.issues.push("rail btn off-screen "+b.id); if(!b.top)R.issues.push("rail btn covered "+b.id);});
 // quiet phone tap -> tip
 const ph=await p.$("#btn-phone.quiet"); if(ph){await ph.click(); await p.waitForTimeout(300); R.quietTip=await p.evaluate(()=>!!document.getElementById("sr-tip"));}
 // menu has Penny replay
 await p.click("#btn-menu"); await p.waitForTimeout(500); R.menuReplay=!!(await p.$("#mn-penny")); if(SHOTS) await p.screenshot({path:`${out}/${tag}-menu.png`});
 await clickVisible(p,["#mn-resume"]); await p.waitForTimeout(400);
 R.errorsB=p.errs.slice(); await p.ctx.close();
 console.log(tag, JSON.stringify({done:R.tourDone,steps:R.steps.filter(x=>x.k).length,issues:R.issues,errA:R.errorsA,errB:R.errorsB,skipMeta:R.skipMeta,pennyFight:R.pennyFramesDuringSkippedFight,fight:R.fightSeen,arrowB:R.arrowBunker,quiet:R.quietTip,menu:R.menuReplay}));
}catch(e){R.issues.push("CRASH "+String(e).split("\n")[0]); console.log(tag,"CRASH",String(e).split("\n").slice(0,3).join(" | "));}
}
fs.writeFileSync(out+"/report.json",JSON.stringify(report,null,1)); await env.close();})();
