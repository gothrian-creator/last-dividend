#!/usr/bin/env node
// House desk deal props: the deal lies on the table as a prop; tap it to open (typed slip = the deal), tap another to compare,
// drag it to your hands (or tap Sign) to sign. Checks at the five test sizes, touch-first:
//  - three props on the rim, stickers on screen, no pin tags / lines;  - the peek opens one prop, its slip is live deal text, readable,
//  - the chosen deal's pin stays visible (not under the open prop or its slip);  - one tap swaps to another deal; tapping it again closes;
//  - no animation anywhere tweens the opacity of a painted image (no crossfades), only transforms;  - drag-to-hands signs that deal;
//  - Sign on the slip signs;  - a crisis telegram lists every response with its cost, and a response signs that choice.
const H=require("../real-input/h.js");const {seedHouse}=require("./probe.js");
const SIZES=(process.env.SIZES||"360x800,412x915,800x1150,800x1280,1280x800").split(",");let bad=0,n=0;
function ok(c,m){n++;if(!c){bad++;console.log("FAIL",m);}else if(process.env.V)console.log("ok",m);}
async function tap(p,x,y,touch){if(touch)await p.touchscreen.tap(x,y);else await p.mouse.click(x,y);}
async function tapEl(p,sel,touch,fy){const e=await p.$(sel);if(!e)return false;const b=await e.boundingBox();await tap(p,b.x+b.width/2,b.y+b.height*(fy||0.55),touch);return true;}
/* records every animation that runs, so a crossfade between two paintings can't sneak in */
const WATCH=()=>{window.__anims=[];const seen=new Set();const tick=()=>{document.getAnimations().forEach(a=>{if(seen.has(a))return;seen.add(a);const k=a.effect&&a.effect.getKeyframes?a.effect.getKeyframes():[];const t=a.effect&&a.effect.target;
  window.__anims.push({tag:t?t.tagName:"",cls:t?String(t.className&&t.className.baseVal!=null?t.className.baseVal:t.className):"",props:[...new Set(k.flatMap(f=>Object.keys(f).filter(x=>!["offset","easing","composite","computedOffset"].includes(x))))],name:a.animationName||a.transitionProperty||""});});requestAnimationFrame(tick);};tick();};
async function drag(p,from,to,touch){
  if(!touch){await p.mouse.move(from[0],from[1]);await p.mouse.down();for(let i=1;i<=12;i++){await p.mouse.move(from[0]+(to[0]-from[0])*i/12,from[1]+(to[1]-from[1])*i/12);await p.waitForTimeout(16);}await p.mouse.up();return;}
  const c=await p.context().newCDPSession(p);const pt=(x,y)=>[{x,y,id:1,radiusX:8,radiusY:8,force:1}];
  await c.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:pt(...from)});
  for(let i=1;i<=12;i++){await c.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:pt(from[0]+(to[0]-from[0])*i/12,from[1]+(to[1]-from[1])*i/12)});await p.waitForTimeout(16);}
  await c.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});}
const midRun=p=>p.evaluate(()=>{const s=JSON.parse(localStorage.getItem(LD.HOUSE_SAVE_KEY)).midRun;return {phase:s.phase,last:s.lastDealId,turn:s.turn,hist:(s.history||[]).slice(-1)[0]||null};});
(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");
 for(const sz of SIZES){const [w,h]=sz.split("x").map(Number),touch=w<1100||h>w;
  let p=await H.page(env,w,h);await seedHouse(p,env.origin,{seed:13,stop:"deal:3",exec:"mara",smart:true});await p.waitForTimeout(700);await p.evaluate(WATCH);
  const d=await p.evaluate(()=>{const R=e=>{const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom};};const hud=R(document.querySelector(".sd-hud"));
    const vis=e=>{const cs=getComputedStyle(e);return cs.display!=="none"&&cs.visibility!=="hidden"&&e.getBoundingClientRect().width>0;};
    return {props:document.querySelectorAll(".sd-prop").length,imgs:document.querySelectorAll(".sd-propimg").length,tags:[...document.querySelectorAll(".sd-tag")].filter(vis).length,lines:[...document.querySelectorAll(".sd-lines")].filter(vis).length,
      stk:[...document.querySelectorAll(".sd-stk")].map(e=>({tx:e.textContent,...R(e)})),hud,W:innerWidth,H:innerHeight,dz:document.getElementById("dossier").classList.contains("on"),
      table:document.querySelector(".sd-table").getAttribute("src"),pinsAdd:[...document.querySelectorAll(".sd-pin")].every(e=>e.classList.contains("add"))};});
  ok(d.props===3&&d.imgs===3,sz+" three deal props on the rim "+d.props);ok(!d.tags&&!d.lines,sz+" no pin tags or tag lines over the map");
  ok(d.stk.every(s=>/\d|respon/i.test(s.tx)&&s.l>=-1&&s.r<=d.W+1&&s.t>d.hud.b&&s.b<=d.H),sz+" each sticker carries the amount and sits on screen "+JSON.stringify(d.stk));
  ok(/sd-table-clean/.test(d.table)&&d.pinsAdd,sz+" pin-free table plate, every pin a glass head");
  // peek prop 0
  const pr=await p.$$(".sd-prop");let bb=await pr[0].boundingBox();await tap(p,bb.x+bb.width/2,bb.y+bb.height*0.6,touch);await p.waitForTimeout(900);
  const k=await p.evaluate(()=>{const st=LD.seatPeekState(),sl=document.querySelector("#sd-peek .pk-slip"),pk=document.querySelector("#sd-peek .pk");if(!st.id||!sl)return {open:false};
    const d=LD.dealById(st.id),sr=sl.getBoundingClientRect(),fs=[...sl.querySelectorAll(".ps-t,.ps-r span,.ps-r b")].map(e=>parseFloat(getComputedStyle(e).fontSize));
    const pin=st.pin,hit=pin?document.elementFromPoint(pin[0],pin[1]):null,pinEl=document.querySelector('.sd-pin[data-deal="'+st.id+'"]');
    const inside=(r,q)=>q&&q[0]>r.left-4&&q[0]<r.right+4&&q[1]>r.top-4&&q[1]<r.bottom+4;const pr=pk.getBoundingClientRect();
    const cs=getComputedStyle(sl);
    return {open:pk.classList.contains("is-open"),id:st.id,title:sl.querySelector(".ps-t").textContent===d.title,minFs:Math.min(...fs),pinVis:!!(hit&&pinEl&&(hit===pinEl||pinEl.contains(hit))),pinUnderProp:inside(pr,pin),pinUnderSlip:inside(sr,pin),
      onScreen:sr.left>=-1&&sr.right<=innerWidth+1&&sr.top>=0&&sr.bottom<=innerHeight,noBorder:parseFloat(cs.borderTopWidth)===0,dz:document.getElementById("dossier").classList.contains("on"),rimHidden:getComputedStyle(document.querySelector('.sd-propimg[data-deal="'+st.id+'"]')).visibility==="hidden",
      knock:/Knocking/i.test(sl.textContent),pays:/Pays now/i.test(sl.textContent)};});
  ok(k.open&&k.title,sz+" tap opens the prop; its slip carries the deal's own title "+JSON.stringify(k));
  ok(k.pays&&k.knock,sz+" slip shows pays now and who comes knocking");
  ok(k.minFs>=10.9,sz+" slip text readable (min "+k.minFs+"px)");
  ok(k.pinVis&&!k.pinUnderProp&&!k.pinUnderSlip,sz+" the chosen deal's pin stays visible "+JSON.stringify(k));
  ok(k.onScreen&&k.noBorder&&!k.dz&&k.rimHidden,sz+" slip on screen, no UI border, no deal-sheet box, the rim copy lifted "+JSON.stringify(k));
  // compare: one tap on another prop swaps
  bb=await pr[1].boundingBox();await tap(p,bb.x+bb.width/2,bb.y+bb.height*0.6,touch);await p.waitForTimeout(900);
  const k2=await p.evaluate(()=>({id:LD.seatPeekState().id,n:document.querySelectorAll("#sd-peek .pk").length,slips:document.querySelectorAll("#sd-peek .pk-slip").length}));
  ok(k2.id&&k2.id!==k.id&&k2.n===1&&k2.slips===1,sz+" one tap on another prop swaps the peek "+JSON.stringify(k2));
  bb=await pr[1].boundingBox();
  const shown=await p.evaluate(()=>{const e=document.querySelector(".sd-prop[data-deal='"+LD.seatPeekState().id+"']");return getComputedStyle(e).visibility;});
  // tap the open one's empty rim slot area = the table: closes
  await tap(p,w*0.5,h*0.97>h-20?h*0.6:h*0.6,touch);await p.waitForTimeout(700);
  const k3=await p.evaluate(()=>({id:LD.seatPeekState().id,pk:document.querySelectorAll("#sd-peek .pk").length,rim:[...document.querySelectorAll(".sd-propimg")].every(e=>getComputedStyle(e).visibility!=="hidden")}));
  ok(!k3.id&&!k3.pk&&k3.rim,sz+" tapping the table closes it back to the rim "+JSON.stringify(k3));
  // drag to the hands signs
  bb=await pr[0].boundingBox();await tap(p,bb.x+bb.width/2,bb.y+bb.height*0.6,touch);await p.waitForTimeout(900);
  const id0=await p.evaluate(()=>LD.seatPeekState().id);const box=await p.evaluate(()=>LD.seatPeekState().box);
  await drag(p,[box.x+box.w*0.5,box.y+box.h*0.85],[w*0.5,h*0.9],touch);await p.waitForTimeout(350);
  const mid=await p.evaluate(()=>({busy:LD.seatPeekState().busy,contract:!!document.querySelector("#sd-peek .pk-slip.is-contract")}));
  ok(mid.busy&&mid.contract,sz+" letting go over the hands grows the slip into the contract "+JSON.stringify(mid));
  await p.waitForTimeout(2400);
  const an=await p.evaluate(()=>window.__anims);const fades=an.filter(a=>a.tag==="IMG"&&a.props.includes("opacity"));const tws=an.filter(a=>a.props.includes("transform"));
  ok(!fades.length,sz+" no painted image fades (no crossfades) "+JSON.stringify(fades.slice(0,4)));ok(tws.length>=4,sz+" moves are transform tweens ("+tws.length+")");
  const s1=await midRun(p);ok(s1.last===id0&&s1.phase!=="deal",sz+" drag to hands signed "+id0+" "+JSON.stringify(s1));
  ok(!p.errs.length,sz+" no console errors "+JSON.stringify(p.errs.slice(0,3)));await p.ctx.close();
  // Sign on the slip
  p=await H.page(env,w,h);await seedHouse(p,env.origin,{seed:13,stop:"deal:3",exec:"mara",smart:true});await p.waitForTimeout(700);
  await tapEl(p,".sd-prop:nth-of-type(3)",touch);await tapEl(p,".sd-prop[data-deal='blackout-insurance']",touch);await p.waitForTimeout(900);
  const sid=await p.evaluate(()=>LD.seatPeekState().id);await tapEl(p,"#btn-sign",touch,0.7);await p.waitForTimeout(2600);
  const s2=await midRun(p);ok(sid&&s2.last===sid,sz+" Sign on the slip signs "+sid+" "+JSON.stringify(s2));await p.ctx.close();
  // crisis telegram: every response with its cost
  p=await H.page(env,w,h);await seedHouse(p,env.origin,{seed:13,stop:"deal:5",exec:"mara",smart:true});await p.waitForTimeout(700);
  await tapEl(p,".sd-prop[data-deal='crisis-inquiry']",touch);await p.waitForTimeout(900);
  const c=await p.evaluate(()=>{const d=LD.dealById("crisis-inquiry"),sl=document.querySelector("#sd-peek .pk-slip");if(!sl)return null;const ch=[...sl.querySelectorAll(".ps-ch")];
    const pin=LD.seatPeekState().pin,sr=sl.getBoundingClientRect();
    return {n:ch.length,want:d.choices.length,costs:ch.every(e=>e.querySelector(".ps-cr")&&e.querySelector(".ps-cr").textContent.trim().length>2),labels:ch.every((e,i)=>e.textContent.indexOf(d.choices[i].label)>=0),
      bottom:sr.bottom,H:innerHeight,pinClear:!pin||!(pin[0]>sr.left&&pin[0]<sr.right&&pin[1]>sr.top&&pin[1]<sr.bottom)};});
  ok(c&&c.n===c.want&&c.costs&&c.labels,sz+" crisis telegram lists every response with its cost "+JSON.stringify(c));ok(c&&c.pinClear,sz+" crisis slip keeps the pin visible");
  const pick=await p.evaluate(()=>{const b=[...document.querySelectorAll("#sd-peek .ps-ch:not([disabled])")][0];return b?b.getAttribute("data-choice"):null;});
  await tapEl(p,"#sd-peek .ps-ch[data-choice='"+pick+"']",touch);await p.waitForTimeout(2600);
  const s3=await midRun(p);ok(s3.last==="crisis-inquiry",sz+" a response signs the crisis "+pick+" "+JSON.stringify(s3));
  ok(!p.errs.length,sz+" no console errors (crisis) "+JSON.stringify(p.errs.slice(0,3)));await p.ctx.close();
 }
 await env.close();console.log(bad?"PROPS FAIL "+bad+"/"+n:"PROPS OK "+n);process.exit(bad?1:0);})();
