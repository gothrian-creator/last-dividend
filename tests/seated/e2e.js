#!/usr/bin/env node
// Seated desk end-to-end at the four test sizes: layout checks (no overlaps, nothing off screen, the visitor's face clear),
// a full deal -> fight -> settle -> desk loop, and the default (shop) game untouched. Exit 1 on any failure.
const H=require("../real-input/h.js");const {seedHouse}=require("./probe.js");
const SIZES=(process.env.SIZES||"360x800,412x915,800x1280,1280x800").split(",");let bad=0,n=0;
function LD_CAP(sz){const [w,h]=sz.split("x").map(Number);return w>=h*1.2?9:w>500?10:6;}
function ok(c,m){n++;if(!c){bad++;console.log("FAIL",m);}}
const R=e=>{const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height};};
(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");
 for(const sz of SIZES){const [w,h]=sz.split("x").map(Number);
  const p=await H.page(env,w,h);await seedHouse(p,env.origin,{seed:13,stop:"deal:3",exec:process.env.EXEC||"mara",smart:true});await p.waitForTimeout(700);
  const d=await p.evaluate(()=>{const R=e=>{const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom};};
    const hud=R(document.querySelector(".desk.sd .sd-hud"));const tags=[...document.querySelectorAll(".sd-prop .sd-stk")].map(R);
    const ov=(a,b)=>Math.min(a.r,b.r)-Math.max(a.l,b.l)>1&&Math.min(a.b,b.b)-Math.max(a.t,b.t)>1;let tagOv=0;
    for(let i=0;i<tags.length;i++)for(let j=i+1;j<tags.length;j++)if(ov(tags[i],tags[j]))tagOv++;
    const hudKids=[...document.querySelectorAll(".desk.sd .sd-hud .sd-meter, .desk.sd .sd-hud .sd-net, .desk.sd .sd-hud .sd-cash")].map(R);
    return {sd:!!document.querySelector("#screen-desk .desk.sd"),tags:tags.length,tagOv,tagsOff:tags.filter(t=>t.l<0||t.r>innerWidth||t.t<hud.b||t.b>innerHeight).length,
      hudClip:hudKids.filter(k=>k.b>hud.b-14||k.t<hud.t).length,scrollX:document.scrollingElement.scrollWidth>innerWidth,scrollY:document.scrollingElement.scrollHeight>innerHeight+1};});
  ok(d.sd,sz+" seated desk rendered");ok(d.tags>=1&&!d.tagOv,sz+" deal tags present and not overlapping "+JSON.stringify(d));
  ok(!d.tagsOff,sz+" tags on screen, below the HUD");ok(!d.hudClip,sz+" HUD contents inside the bar (not in the stepped edge)");ok(!d.scrollX&&!d.scrollY,sz+" no page scroll");
  // fan
  await p.click("#sd-tab");await p.waitForTimeout(500);
  const f=await p.evaluate(()=>{const R=e=>{const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom};};
    const cards=[...document.querySelectorAll("#sd-fan .dc")].map(R);const all=R(document.getElementById("run-deck")),bk=document.getElementById("house-peek"),tab=R(document.querySelector(".sd-tabl"));
    const ov=(a,b)=>Math.min(a.r,b.r)-Math.max(a.l,b.l)>1&&Math.min(a.b,b.b)-Math.max(a.t,b.t)>1;
    const L=document.querySelector(".desk.sd").classList.contains("is-land"),col=L?LD.seatColumn(innerWidth,innerHeight):[0,innerWidth];
    const vis=c=>Math.max(0,Math.min(c.r,col[1])-Math.max(c.l,col[0]))/(c.r-c.l);
    return {n:cards.length,off:cards.filter(c=>(c.l+c.r)/2<col[0]||(c.l+c.r)/2>col[1]||c.l<col[0]-1||c.r>col[1]+1||c.b>innerHeight+1).length,allBk:bk&&!bk.hidden?ov(all,R(bk.querySelector("small"))):false,allTab:ov(all,tab),allOff:all.r>innerWidth||all.l<0};});
  ok(f.n>0&&!f.off,sz+" every fan card whole on screen "+JSON.stringify(f));ok(!f.allBk&&!f.allTab&&!f.allOff,sz+" Deck list clear of the Bunker label and the tab "+JSON.stringify(f));
  ok(f.n<=LD_CAP(sz)+1,sz+" fan shows at most the cap of kinds plus a +N "+f.n);
  { const c=await p.$("#sd-fan .dc:nth-child(2)");const bb=await c.boundingBox();await p.mouse.click(bb.x+10,bb.y+bb.height*0.4);await p.waitForTimeout(350);
    const L=await p.evaluate(()=>{const c=document.querySelector("#sd-fan .dc.is-lift");if(!c)return null;const r=c.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,W:innerWidth,H:innerHeight,top:document.elementFromPoint((r.left+r.right)/2,r.top+r.height*0.75)===c||c.contains(document.elementFromPoint((r.left+r.right)/2,r.top+r.height*0.75))};});
    ok(L&&L.l>=0&&L.r<=L.W&&L.b<=L.H+1&&L.top,sz+" tapped card lifts whole and on top "+JSON.stringify(L));
    await p.mouse.click((L.l+L.r)/2,L.t+(L.b-L.t)*0.6);await p.waitForTimeout(300);ok(!(await p.$("#sd-fan .dc.is-lift")),sz+" tapping the lifted card sets it back"); }
  await p.click("#sd-tab");await p.waitForTimeout(400);
  // dossier
  await (await p.$(".sd-prop")).click();await p.waitForTimeout(500);
  const z=await p.evaluate(()=>{const sl=document.querySelector("#sd-peek .pk-slip");if(sl){const t=getComputedStyle(sl.querySelector(".ps-t"));
      return {props:true,on:!document.getElementById("dossier").classList.contains("on"),sign:!!sl.querySelector("#btn-sign"),h3:t.color,fs:parseFloat(t.fontSize)};}
    const dz=document.getElementById("dossier"),dd=dz.querySelector(".dz"),cs=getComputedStyle(dd),h3=getComputedStyle(dz.querySelector("h3"));
    return {on:dz.classList.contains("on"),bgImg:cs.backgroundImage,h3:h3.color,sign:!!document.getElementById("btn-sign")};});
  if(z.props){ok(z.on&&z.sign,sz+" the prop opens with its typed slip and Sign (no deal sheet box)");ok(/rgb\((2\d|3\d), /.test(z.h3)&&z.fs>=13,sz+" slip title is dark typewriter ink, readable "+JSON.stringify(z));}
  else{ok(z.on&&z.sign,sz+" tag opens the deal sheet with Sign");ok(z.bgImg==="none"&&/rgb\((4\d|3\d|2\d|5\d), /.test(z.h3),sz+" deal sheet is cream with dark ink "+JSON.stringify(z));}
  // fight
  await p.click("#btn-sign");await p.waitForTimeout(2600);
  const g=await p.evaluate(()=>{const R=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom};};
    const d=document.getElementById("door");if(!d.classList.contains("sd-fight"))return {fight:false};
    const op=document.getElementById("sc-opp"),box=LD.SEAT.opp[op.getAttribute("data-art")],f=LD.seatFrame(innerWidth,innerHeight);
    const hx=LD.seatToScreen(f,box[0]+box[2]*0.5,box[1]+box[3]*0.12);const face={l:hx[0]-30,r:hx[0]+30,t:hx[1]-26,b:hx[1]+26};
    const ov=(a,b)=>a&&b&&Math.min(a.r,b.r)-Math.max(a.l,b.l)>2&&Math.min(a.b,b.b)-Math.max(a.t,b.t)>2;
    const cover=["#sc-bubble","#df-intent",".sd-fhead",".sd-hud",".sd-caps .sd-cap"].filter(s=>ov(R(d.querySelector(s)),face));
    const it=R(document.getElementById("df-intent")),cap=R(d.querySelector(".sd-caps .sd-cap"));
    const bub=d.querySelector("#sc-bubble"),bcs=bub&&getComputedStyle(bub),bl=bub?Math.floor((bub.getBoundingClientRect().height-parseFloat(bcs.paddingTop)-parseFloat(bcs.paddingBottom)-parseFloat(bcs.borderTopWidth)-parseFloat(bcs.borderBottomWidth))/parseFloat(bcs.lineHeight)+0.4):0;
    const bubIt=ov(R(bub),it),bubCap=ov(R(bub),cap),capDock=[...d.querySelectorAll(".sd-fdock .dc, .sd-fdock button")].some(e=>ov(cap,R(e)));
    return {fight:true,cover,capIt:ov(it,cap),face,bl,bubIt,bubCap,capDock};});
  ok(g.fight,sz+" signing seats the visitor across the table");
  if(g.fight){ok(!g.cover.length,sz+" nothing covers the visitor's face "+JSON.stringify(g));ok(!g.capIt,sz+" opener caption clear of the intent");ok(!g.bubIt&&!g.bubCap&&!g.capDock,sz+" speech, next move, caption and hand do not overlap "+JSON.stringify(g));if(sz.startsWith("360"))ok(g.bl>0&&g.bl<=3,sz+" speech is 3 lines or fewer "+g.bl);
    const s0=await p.evaluate(()=>+document.getElementById("df-scrut-n").textContent);
    const c=await p.$(".sd-fhand .dc:not(.no)");if(c){await c.click();await p.waitForTimeout(1000);}
    const s1=await p.evaluate(()=>({n:+document.getElementById("df-scrut-n").textContent,card:!!document.querySelector("#sd-tcard .dc"),cls:(document.getElementById("sc-bubble")||{}).className||""}));
    ok(s1.n<=s0&&s1.card,sz+" a played card lands on the table "+JSON.stringify([s0,s1]));
    for(let i=0;i<2;i++){const st=await p.$("#df-settle:not([disabled])");if(st){await st.click();await p.waitForTimeout(900);}}
    const res=await p.evaluate(()=>{const b=document.querySelector(".sd-result > b");return b?getComputedStyle(b).color:null;});
    ok(res&&/rgb\(([0-9]|[1-9][0-9]|1[0-3][0-9]), /.test(res),sz+" result title readable "+res);
    for(let i=0;i<6;i++){const c2=await p.$("#df-close, #rw-skip, #rw-keep");if(!c2)break;await c2.evaluate(e=>e.click());await p.waitForTimeout(900);}
    await p.waitForTimeout(800);
    const back=await p.evaluate(()=>({desk:!!document.querySelector("#screen-desk .desk.sd"),door:!document.getElementById("door").hidden,phase:JSON.parse(localStorage.getItem(LD.HOUSE_SAVE_KEY)).midRun.phase}));
    ok(back.desk&&!back.door&&back.phase==="bunker",sz+" back at the seated desk after the fight "+JSON.stringify(back));}
  ok(!p.errs.length,sz+" no page errors "+p.errs.slice(0,3));await p.ctx.close();
  // the default game: no flag, the old desk, no seated markup
  const q=await H.page(env,w,h);await H.seedRun(q,env.origin,{seed:13,stop:"deal:3",exec:"mara",smart:true});
  const def=await q.evaluate(()=>({desk:!!document.querySelector("#screen-desk .desk"),sd:!!document.querySelector(".sd, .sd-hud, #sd-tab"),rs:JSON.parse(localStorage.getItem("lastDividend.v1")).midRun.ruleset,flag:!!LD.HOUSE_RULES}));
  ok(def.desk&&!def.sd&&def.rs!=="house"&&!def.flag,sz+" default game keeps the old desk "+JSON.stringify(def));
  ok(!q.errs.length,sz+" default game no page errors "+q.errs.slice(0,3));await q.ctx.close();
  console.log(sz,"done");}
 await env.close();console.log(bad?"SEATED E2E FAIL "+bad+" / "+n:"SEATED E2E OK "+n+" checks");process.exit(bad?1:0);})();
