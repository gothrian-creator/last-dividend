// In-scene fights + Discover rewards + deck pile + vault tab: real-input screenshots.
// Usage: DIST=dist OUT=<dir> SIZES=412x915,1280x800 node tests/inscene-shots.js
const H=require("./real-input/h.js"),fs=require("fs");
const OUT=process.env.OUT||"/workspace/last-dividend/test-output/inscene-shots";fs.mkdirSync(OUT,{recursive:true});
const SIZES=(process.env.SIZES||"412x915,1280x800").split(",");
async function vis(p,s){const h=await p.$(s);return h&&await h.isVisible().catch(()=>false)?h:null;}
async function tap(p,s){const h=await vis(p,s);if(!h)return false;const bb=await h.boundingBox();if(!bb)return false;await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);return true;}
async function toFight(p,env,stop,seed){await H.seedRun(p,env.origin,{seed,stop,exec:"mara",smart:true});await p.waitForTimeout(900);
 const pin=await p.$(".desk .map .pin");const bb=await pin.boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(700);
 await tap(p,"#btn-sign:not([disabled])")||await tap(p,"#dossier .dz-choice:not([disabled])");
 await p.waitForSelector("#door.on .df-hand .dc",{timeout:20000});await p.waitForTimeout(1600);}
const venue=p=>p.evaluate(()=>{const d=document.querySelector("#door .door-in");return d&&d.dataset.venue;});
const done=p=>p.evaluate(()=>!!document.querySelector("#door .df-result"));
(async()=>{const env=await H.start();const rep=[];
for(const sz of SIZES){const [w,h]=sz.split("x").map(Number);let p,errs=[];
 // run + deck, vault tab
 p=await H.page(env,w,h);await H.seedRun(p,env.origin,{seed:13,stop:"deal:5",exec:"mara",smart:true});await p.waitForTimeout(1000);
 await p.screenshot({path:`${OUT}/${sz}-run-deck.png`});
 const r=await (await p.$("#bunker-card")).boundingBox();
 await p.screenshot({path:`${OUT}/${sz}-vault-tab.png`,clip:{x:Math.max(0,r.x-70),y:Math.max(0,r.y-60),width:Math.min(w-Math.max(0,r.x-70),r.width+80),height:Math.min(h-Math.max(0,r.y-60),r.height+64)}});
 errs.push(...p.errs);await p.ctx.close();
 // visitor fight, mid-play (card in flight)
 p=await H.page(env,w,h);await toFight(p,env,"deal:5",13);rep.push(sz+" visitor venue="+await venue(p));
 await tap(p,"#door .df-hand .dc:not(.no)");await p.waitForTimeout(150);await p.screenshot({path:`${OUT}/${sz}-visitor-fight.png`});errs.push(...p.errs);await p.ctx.close();
 // away fight
 p=await H.page(env,w,h);await toFight(p,env,"deal:6",13);rep.push(sz+" away venue="+await venue(p));
 await tap(p,"#door .df-hand .dc:not(.no)");await p.waitForTimeout(700);await p.screenshot({path:`${OUT}/${sz}-away-fight.png`});errs.push(...p.errs);await p.ctx.close();
 // knockdown + asset pick + card pick (Q1: a win frames a first trophy)
 p=await H.page(env,w,h);await toFight(p,env,"deal:1",13);
 for(let r2=0;r2<6&&!await done(p);r2++){for(let k=0;k<6;k++){if(!await tap(p,"#door .df-hand .dc:not(.no)"))break;await p.waitForTimeout(520);if(await done(p))break;}if(await done(p))break;await tap(p,"#df-end");await p.waitForTimeout(1400);}
 await p.waitForTimeout(900);await p.screenshot({path:`${OUT}/${sz}-knockdown.png`});
 rep.push(sz+" knockdown "+await p.evaluate(()=>(document.querySelector("#door .sc-end-stamp")||{}).textContent));
 await tap(p,"#df-close");await p.waitForTimeout(1100);
 for(let s=0;s<4;s++){const m=await p.evaluate(()=>{const d=document.querySelector("#door.on.rw-mode");if(!d)return null;return {card:!!d.querySelector("[data-card]"),asset:!!d.querySelector("[data-asset]"),item:!!d.querySelector("#rw-keep")};});
  if(!m)break;
  if(m.item){await tap(p,"#rw-keep");}
  else if(m.asset){await p.screenshot({path:`${OUT}/${sz}-asset-pick.png`});await tap(p,"#door [data-asset]");await p.waitForTimeout(260);await p.screenshot({path:`${OUT}/${sz}-asset-fly.png`});}
  else if(m.card){await tap(p,"#door [data-card]");await p.waitForTimeout(450);await p.screenshot({path:`${OUT}/${sz}-card-pick.png`});await tap(p,"#rw-take");await p.waitForTimeout(260);await p.screenshot({path:`${OUT}/${sz}-card-fly.png`});}
  else break;await p.waitForTimeout(1200);}
 await p.waitForTimeout(900);await p.screenshot({path:`${OUT}/${sz}-after-reward.png`});
 rep.push(sz+" after deck="+await p.evaluate(()=>(document.querySelector("#run-deck .rd-count")||{}).textContent)+" veil="+await p.evaluate(()=>!!document.querySelector("#door.on")));
 errs.push(...p.errs);await p.ctx.close();
 rep.push(sz+" errs "+errs.length+" "+errs.slice(0,4).join(" | "));}
console.log(rep.join("\n"));await env.close();})();
