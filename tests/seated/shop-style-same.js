#!/usr/bin/env node
// Stronger than pixels: the default (shop) game's DOM and computed styles must be identical to a baseline build, element by element,
// on the desk, the dossier and the first fight, at every size. DIST_A = baseline, DIST_B = new. Animations are frozen in both.
const H=require("../real-input/h.js");const {seedHouse}=require("./probe.js");const HOUSE=!!process.env.HOUSE; // HOUSE=1: the ?house=1 desk instead: desk, open prop, signed fight

const A=process.env.DIST_A,B=process.env.DIST_B||"/workspace/last-dividend-v3/dist";
const SIZES=(process.env.SIZES||"360x800,412x915,800x1280,1280x800,800x1150").split(",");
const SKIP=/^(transform|translate|rotate|scale|opacity|filter|perspective-origin|transform-origin|inline-size|block-size|width|height|left|top|right|bottom|inset.*|margin-left|margin-top|background-position.*|clip-path|d|stroke-dash.*|offset.*)$/; // moving things only (timers drive them)
const grab=`(()=>{const out=[];for(const e of document.querySelectorAll("body *")){if(e.closest(".sd-tag,.sd-lines"))continue;const cs=getComputedStyle(e);let s="";for(let i=0;i<cs.length;i++){const p=cs[i];s+=p+":"+cs.getPropertyValue(p)+";";}
 s=s.replace(/http:\\/\\/127\\.0\\.0\\.1:\\d+/g,"");out.push([e.tagName+"."+(typeof e.className==="string"?e.className:e.getAttribute("class")||"")+"#"+e.id,s]);}return out;})()`;
async function shoot(dist){const env=await H.start(dist);const res={};
 for(const sz of SIZES){const [w,h]=sz.split("x").map(Number);const p=await H.page(env,w,h);await p.emulateMedia({reducedMotion:"reduce"});
  if(HOUSE)await seedHouse(p,env.origin,{seed:13,stop:"deal:3",exec:"mara",smart:true});else await H.seedRun(p,env.origin,{seed:13,stop:"deal:3",exec:"mara",smart:true});
  await p.addStyleTag({content:"*,*::before,*::after{animation:none!important;transition:none!important}"});await p.waitForTimeout(1500);
  res[sz+" desk"]=await p.evaluate(grab);
  if(HOUSE){const pr=await p.$(".sd-prop");if(pr){const bb=await pr.boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height*0.55);await p.waitForTimeout(1600);}}
  else{const pin=await p.$(".desk .map .pin");if(pin){const bb=await pin.boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(900);}}
  res[sz+" dossier"]=await p.evaluate(grab);
  const sign=await p.$("#btn-sign:not([disabled])");if(sign){await sign.click();await p.waitForTimeout(HOUSE?5000:3000);}
  res[sz+" fight"]=await p.evaluate(grab);
  await p.ctx.close();
  if(!HOUSE){const q=await H.page(env,w,h);await q.emulateMedia({reducedMotion:"reduce"});await H.seedRun(q,env.origin,{seed:13,stop:"bunker",exec:"mara",smart:true});
   await q.addStyleTag({content:"*,*::before,*::after{animation:none!important;transition:none!important}"});await q.waitForTimeout(1200);
   res[sz+" bunker-desk"]=await q.evaluate(grab);const bc=await q.$("#bunker-card");if(bc){await bc.click();await q.waitForTimeout(1500);}res[sz+" bunker"]=await q.evaluate(grab);await q.ctx.close();}}
 await env.close();return res;}
(async()=>{const a=await shoot(A),b=await shoot(B);let bad=0;
 for(const k of Object.keys(a)){const x=a[k],y=b[k];let diffEl=0,diffProp=new Map();
  if(x.length!==y.length){console.log(k,"ELEMENT COUNT",x.length,y.length);bad++;continue;}
  for(let i=0;i<x.length;i++){if(x[i][0]!==y[i][0]){diffEl++;diffProp.set("tag/class:"+x[i][0].slice(0,50)+" vs "+y[i][0].slice(0,50),1);continue;}
   if(x[i][1]===y[i][1])continue;const pa=Object.fromEntries(x[i][1].split(";").filter(Boolean).map(s=>{const j=s.indexOf(":");return [s.slice(0,j),s.slice(j+1)];})),pb=Object.fromEntries(y[i][1].split(";").filter(Boolean).map(s=>{const j=s.indexOf(":");return [s.slice(0,j),s.slice(j+1)];}));
   let hit=false;for(const p of new Set([...Object.keys(pa),...Object.keys(pb)])){if(pa[p]!==pb[p]&&!SKIP.test(p)){hit=true;diffProp.set(p+" @"+x[i][0].slice(0,40)+": "+pa[p]+" -> "+pb[p],1);}}
   if(hit)diffEl++;}
  console.log(k,x.length,"elements,",diffEl,"differ"+(diffEl?" e.g. "+[...diffProp.keys()].slice(0,4).join(" | "):""));bad+=diffEl>0;}
 console.log(bad?"SHOP STYLE DIFFERS":"SHOP STYLE SAME");process.exit(bad?1:0);})();
