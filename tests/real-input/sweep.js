// Full sweep: title, seeded mid-run hub (shortcut named: era-driver to Q6/Q10), rail overlays, then one quarter with real taps (deal->fight->reward->bunker->end quarter->report).
const H=require("./h.js"),fs=require("fs");
const OUT=process.argv[2]||"/workspace/ld-current/t/sweep"; fs.mkdirSync(OUT,{recursive:true});
const sizes=(process.argv[3]?process.argv[3].split(",").map(s=>s.split("x").map(Number)):H.SIZES);
async function scrolls(p){return p.evaluate(()=>{const se=document.scrollingElement;const out=[];if(se.scrollHeight>innerHeight+1||se.scrollWidth>innerWidth+1)out.push("PAGE "+se.scrollHeight+"/"+innerHeight+" w"+se.scrollWidth);
 document.querySelectorAll("body *").forEach(n=>{if(!n.offsetParent&&getComputedStyle(n).position!=="fixed")return;const cs=getComputedStyle(n);if(/(auto|scroll)/.test(cs.overflowY)&&n.scrollHeight>n.clientHeight+2&&n.clientHeight>20){const r=n.getBoundingClientRect();if(r.width>0&&r.bottom>0&&r.top<innerHeight)out.push((n.id||n.className||n.tagName).toString().slice(0,40)+" "+n.scrollHeight+">"+n.clientHeight);}});return out;});}
async function rail(p){return p.evaluate(()=>{const r=document.querySelector("#side-rail");if(!r)return null;const bs=[...r.querySelectorAll("button")].filter(b=>b.offsetParent).map(b=>{const x=b.getBoundingClientRect();return [b.id,Math.round(x.width),Math.round(x.height),Math.round(x.left),Math.round(x.top)]});const rr=r.getBoundingClientRect();return {rect:[rr.left,rr.top,rr.width,rr.height].map(Math.round),bs,small:bs.filter(b=>b[1]<44||b[2]<44).map(b=>b[0]),off:bs.filter(b=>b[3]+b[1]>innerWidth+1||b[4]+b[2]>innerHeight+1).map(b=>b[0]),icon:(document.querySelector("#bunker-card img")||{}).currentSrc||null,fb:!!document.querySelector("#bunker-card .sr-hatch-fb")}});}
async function vis(p,s){const h=await p.$(s);return h&&await h.isVisible().catch(()=>false)?h:null;}
async function tap(p,s){const h=await vis(p,s);if(!h)return false;const bb=await h.boundingBox();if(!bb)return false;await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);return true;}
async function closeOv(p){{const hs=await p.$$("#overlay.on button");for(const h of hs){const t=((await h.textContent())||"").trim();if(/^(Close|Resume|Back|Done|Hang up|Later)/i.test(t)&&await h.isVisible()){const bb=await h.boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(500);return t;}}}for(const s of ["#dk-close","#pf-close","#ov-close","#ov-ok","#mn-resume",".ov-x","#overlay .btn-close","#overlay [data-close]"]){if(await tap(p,s)){await p.waitForTimeout(500);return s;}}await p.keyboard.press("Escape");await p.waitForTimeout(400);return "esc";}
(async()=>{const env=await H.start();const res={};
for(const [w,h] of sizes){const tag=w+"x"+h;const R=res[tag]={scroll:{},errs:[],notes:[]};try{
 let p=await H.page(env,w,h);await p.goto(env.origin);await p.waitForTimeout(1200);await p.screenshot({path:`${OUT}/${tag}-title.png`});R.scroll.title=await scrolls(p);
 R.titleOverlap=await p.evaluate(()=>{const a=null,b=null;if(!a||!b)return "n/a "+!!a+!!b;const rg=document.createRange();rg.selectNodeContents(a);const x=rg.getBoundingClientRect(),y=b.getBoundingClientRect();const ix=Math.min(x.right,y.right)-Math.max(x.left,y.left),iy=Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top);return ix>2&&iy>2?"OVERLAP "+Math.round(ix)+"x"+Math.round(iy):"ok";});
 R.errs.push(...p.errs);await p.ctx.close();
 for(const [o,lab] of [[{seed:21,stop:"deal:6",exec:"reid"},"q6"],[{seed:23,stop:"deal:10",exec:"soren"},"q10"]]){
  p=await H.page(env,w,h);await H.seedRun(p,env.origin,o);
  R.scroll[lab+"-hub"]=await scrolls(p);R.hubOverlap=await p.evaluate(()=>{const a=document.querySelector(".desk-head .wordmark"),b=document.querySelector(".desk-head .rating, .desk-head [class*=rating], .desk-head [class*=stamp]");if(!a||!b)return "n/a "+!!a+!!b;const rg=document.createRange();rg.selectNodeContents(a);const x=rg.getBoundingClientRect(),y=b.getBoundingClientRect();const ix=Math.min(x.right,y.right)-Math.max(x.left,y.left),iy=Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top);return ix>2&&iy>2?"OVERLAP "+Math.round(ix)+"x"+Math.round(iy):"ok";});R[lab+"-rail"]=await rail(p);await p.screenshot({path:`${OUT}/${tag}-${lab}-hub.png`});
  for(const b of ["#btn-menu","#btn-deck","#btn-portfolio","#btn-phone"]){if(await tap(p,b)){await p.waitForTimeout(700);R.scroll[lab+b]=await scrolls(p);await p.screenshot({path:`${OUT}/${tag}-${lab}-${b.slice(1)}.png`});
    const c=await closeOv(p);const still=await p.$("#overlay.on");if(still&&await still.isVisible()){await closeOv(p);} }}
  if(lab==="q6"){ // one real quarter
   const pin=await p.$(".desk .map .pin");const bb=await pin.boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(800);
   await p.screenshot({path:`${OUT}/${tag}-dossier.png`});R.scroll.dossier=await scrolls(p);
   await tap(p,"#btn-sign:not([disabled])")||await tap(p,"#dossier .dz-choice:not([disabled])");await p.waitForTimeout(1500);
   let fightShot=false,rewardShot=false,idle=0;
   for(let i=0;i<160;i++){await p.waitForTimeout(300);
    if(await vis(p,"#door.on")){idle=0; if(!fightShot&&await vis(p,"#door .df-hand .dc")){fightShot=true;R.scroll.fight=await scrolls(p);await p.screenshot({path:`${OUT}/${tag}-fight.png`});}
      if(!rewardShot&&await vis(p,"#door .rw-in")){rewardShot=true;R.scroll.reward=await scrolls(p);await p.screenshot({path:`${OUT}/${tag}-reward.png`});}
      if(await tap(p,"#door .df-hand .dc:not(.no)"))continue; for(const s of ["#df-end","#df-close","#rw-skip","#rw-keep","#door [data-asset]","#door [data-card]","#rw-take:not([disabled])","#rw-apass"]){if(await tap(p,s))break;} continue;}
    if(await vis(p,"#overlay.on")){if(await tap(p,"#fy-boss-ok")||await tap(p,"#fy-m-a")||await tap(p,"#ov-ok"))continue;}
    const st=await p.evaluate(()=>{const b=document.querySelector("#bunker-card");return b&&!b.classList.contains("locked")&&!b.classList.contains("acted")});if(st&&(++idle>14||rewardShot))break;}
   R.notes.push("fight seen "+fightShot+", reward seen "+rewardShot);
   if(await tap(p,"#bunker-card")){await p.waitForTimeout(1200);R.scroll.bunker=await scrolls(p);await p.screenshot({path:`${OUT}/${tag}-bunker.png`});
     R.bunkerBand=await p.evaluate(()=>{const v=document.querySelector("#overlay.bunker-mode .bk-view");if(!v)return "no bk-view";const r=v.getBoundingClientRect();const kids=[...v.children].map(c=>c.getBoundingClientRect());const used=kids.reduce((a,k)=>a+k.height,0);return {view:Math.round(r.height),kids:Math.round(used),vh:innerHeight};});
     if(await tap(p,"#overlay.bunker-mode [data-room]:not([disabled]) .btn, #overlay.bunker-mode .bk-build:not([disabled])")){await p.waitForTimeout(800);}
     await closeOv(p);}
   else R.notes.push("bunker not tappable");
   await p.waitForTimeout(600);
   if(await tap(p,"#btn-endq")){await p.waitForTimeout(2500);for(let i=0;i<10;i++){if(await vis(p,"#overlay.report-mode")){R.scroll.report=await scrolls(p);await p.screenshot({path:`${OUT}/${tag}-report.png`});break;}await tap(p,"#ov-ok")||await tap(p,"#fy-m-a");await p.waitForTimeout(600);}}
   else R.notes.push("endq not tappable");
  }
  R.errs.push(...p.errs);await p.ctx.close();}
 // fallback icon
 if(tag==="390x844"){p=await H.page(env,w,h);await p.route(/bunker-.*\.webp/,r=>r.abort());await H.seedRun(p,env.origin,{seed:21,stop:"deal:6",exec:"reid"});R.fallback=await rail(p);await p.screenshot({path:`${OUT}/${tag}-fallback.png`});R.fallbackErrs=p.errs.filter(e=>!/bunker-reid|ERR_FAILED/.test(e));R.errs.push(...R.fallbackErrs);await p.ctx.close();}
}catch(e){R.notes.push("CRASH "+String(e).split("\n").slice(0,3).join(" | "));}
const bad=Object.entries(R.scroll).filter(([k,v])=>v&&v.length);console.log(tag,JSON.stringify({errs:R.errs,hub:R.hubOverlap,scrollIssues:bad,rail6:R["q6-rail"]&&{rect:R["q6-rail"].rect,small:R["q6-rail"].small,off:R["q6-rail"].off,icon:R["q6-rail"].icon},rail10icon:R["q10-rail"]&&R["q10-rail"].icon,band:R.bunkerBand,notes:R.notes,fallback:R.fallback&&{fb:R.fallback.fb,icon:R.fallback.icon}}));}
fs.writeFileSync(OUT+"/sweep.json",JSON.stringify(res,null,1));await env.close();})();
