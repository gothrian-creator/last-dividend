#!/usr/bin/env node
// Reveal clips on the house desk: a shipped clip (briefcase, cheque, dossier) is fetched when the desk renders, plays over
// its closed still (the still steps aside only once the video shows), and hands over to the open still with the video gone;
// a prop with no clip, or a clip that fails to load, opens on the hard cut. Nothing animates a painting's opacity.
const H=require("../real-input/h.js");const {seedHouse}=require("./probe.js");
const SIZES=(process.env.SIZES||"412x915,800x1150").split(",");let bad=0,n=0;
function ok(c,m){n++;if(!c){bad++;console.log("FAIL",m);}else if(process.env.V)console.log("ok",m);}
async function tapDeal(p,id){const e=await p.$(`.sd-prop[data-deal='${id}']`);const b=await e.boundingBox();await p.touchscreen.tap(b.x+b.width/2,b.y+b.height*0.6);}
(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");
 for(const sz of SIZES){const [w,h]=sz.split("x").map(Number);
  // 1) clips load and play
  let p=await H.page(env,w,h);await seedHouse(p,env.origin,{seed:13,stop:"deal:3",exec:"mara",smart:true});
  await p.waitForFunction(()=>LD.seatClipState().ready.length>=2,null,{timeout:10000}).catch(()=>{});
  const cs=await p.evaluate(()=>LD.seatClipState());ok(cs.ok&&cs.ready.includes("briefcase")&&cs.ready.includes("cheque"),sz+" clips fetched for the props on the desk "+JSON.stringify(cs));
  await p.evaluate(()=>{window.__seen={vid:false,isVid:false,bothHidden:false};const t=()=>{const pk=document.querySelector("#sd-peek .pk");if(pk){const v=pk.querySelector(".pk-vid");if(v)window.__seen.vid=true;if(pk.classList.contains("is-vid"))window.__seen.isVid=true;
    const c=pk.querySelector(".pk-closed"),o=pk.querySelector(".pk-open");if(c&&o&&getComputedStyle(c).visibility==="hidden"&&getComputedStyle(o).visibility==="hidden"&&!(v&&v.readyState>=2))window.__seen.bothHidden=[!!v,v&&v.readyState,v&&v.currentTime,pk.className];}requestAnimationFrame(t);};t();});
  await tapDeal(p,"sell-reserves");await p.waitForTimeout(1400);
  const s1=await p.evaluate(()=>({seen:window.__seen,open:!!document.querySelector("#sd-peek .pk.is-open"),vid:!!document.querySelector("#sd-peek .pk-vid"),isVid:!!document.querySelector("#sd-peek .pk.is-vid"),slip:!!document.querySelector("#sd-peek .pk-slip #btn-sign")}));
  ok(s1.seen.vid&&s1.seen.isVid,sz+" the briefcase reveal played as video "+JSON.stringify(s1));
  ok(!s1.seen.bothHidden,sz+" no frame with neither still nor a decoded video frame up "+JSON.stringify(s1.seen.bothHidden));
  ok(s1.open&&!s1.vid&&!s1.isVid&&s1.slip,sz+" after the clip: open still, video removed, slip out");
  ok(!p.errs.length,sz+" no errors "+JSON.stringify(p.errs.slice(0,3)));await p.ctx.close();
  // 2) clip requests fail -> hard cut still opens
  p=await H.page(env,w,h);await p.route("**/props/clips/**",r=>r.abort());await seedHouse(p,env.origin,{seed:13,stop:"deal:3",exec:"mara",smart:true});await p.waitForTimeout(800);
  const cs2=await p.evaluate(()=>LD.seatClipState());ok(!cs2.ready.length,sz+" blocked clips are not marked ready");
  await tapDeal(p,"sell-reserves");await p.waitForTimeout(900);
  const s2=await p.evaluate(()=>({open:!!document.querySelector("#sd-peek .pk.is-open"),vid:!!document.querySelector("#sd-peek .pk-vid"),slip:!!document.querySelector("#sd-peek .pk-slip #btn-sign")}));
  ok(s2.open&&!s2.vid&&s2.slip,sz+" with the clip unavailable the prop opens on the hard cut "+JSON.stringify(s2));
  await p.ctx.close();
  // 3) a prop without a clip (policy) opens on the hard cut
  p=await H.page(env,w,h);await seedHouse(p,env.origin,{seed:13,stop:"deal:3",exec:"mara",smart:true});await p.waitForTimeout(800);
  await tapDeal(p,"blackout-insurance");await p.waitForTimeout(900);
  const s3=await p.evaluate(()=>({open:!!document.querySelector("#sd-peek .pk.is-open"),vid:!!document.querySelector("#sd-peek .pk-vid")}));
  ok(s3.open&&!s3.vid,sz+" policy (no clip) opens on the hard cut "+JSON.stringify(s3));await p.ctx.close();
 }
 await env.close();console.log(bad?"CLIPS FAIL "+bad+"/"+n:"CLIPS OK "+n);process.exit(bad?1:0);})();
