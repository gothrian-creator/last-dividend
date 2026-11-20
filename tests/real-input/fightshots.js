// Door scene + card fight per era (deal:2/6/10) and size, real taps. Env OUT, SIZES, EXEC.
const H=require("./h.js"),fs=require("fs");
const OUT=process.env.OUT||"/workspace/ld-current/t/fight";fs.mkdirSync(OUT,{recursive:true});
const SIZES=(process.env.SIZES||"390x844,1024x1366,1366x1024").split(",").map(s=>s.split("x").map(Number));const TURN={1:2,2:6,3:10};
async function vis(p,s){const h=await p.$(s);return h&&await h.isVisible().catch(()=>false)?h:null;}
async function tap(p,s){const h=await vis(p,s);if(!h)return false;const bb=await h.boundingBox();if(!bb)return false;await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);return true;}
(async()=>{const env=await H.start();const rep=[];let errs=[];
for(const [w,h] of SIZES)for(const e of [1,2,3])for(const sd of [7,31,57,83,101]){const tag=`${w}x${h}-e${e}`;const p=await H.page(env,w,h);
 await H.seedRun(p,env.origin,{seed:sd+e,stop:"deal:"+TURN[e],exec:process.env.EXEC||"julian"});await p.waitForTimeout(1200);
 const pin=await p.$(".desk .map .pin");if(!pin){rep.push(tag+" no pin");await p.ctx.close();continue;}
 const bb=await pin.boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(800);
 await tap(p,"#btn-sign:not([disabled])")||await tap(p,"#dossier .dz-choice:not([disabled])");
 let door=0,fight=false,hit=false,opp=null;const t0=Date.now();
 for(let i=0;i<120;i++){await p.waitForTimeout(250);
  const st=await p.evaluate(()=>{const o=document.querySelector(".o4-stage.o4-in .o4-opp img");return {o4in:!!o&&o.complete&&o.naturalWidth>0,src:o&&o.getAttribute("src"),door:!!document.querySelector("#door.on"),hand:!!document.querySelector("#door.on .df-hand .dc")}});
  if(st.o4in&&door<2){await p.waitForTimeout(door?900:500);await p.screenshot({path:`${OUT}/${tag}-door${door}.png`});opp=st.src;door++;continue;}
  if(st.hand&&!fight){fight=true;await p.waitForTimeout(700);await p.screenshot({path:`${OUT}/${tag}-fight.png`});
    opp=opp||await p.evaluate(()=>{const i=document.querySelector("#door .df-opp img, #door img[src*='opp-']");return i&&i.getAttribute("src")});
    if(await tap(p,"#door .df-hand .dc:not(.no)")){await p.waitForTimeout(450);await p.screenshot({path:`${OUT}/${tag}-fight-hit.png`});hit=true;}break;}
 }
 const sc=await H.vis(p);rep.push(tag+" "+JSON.stringify({door,fight,hit,opp,scroll:sc.scroll}));errs.push(...p.errs.map(x=>tag+" "+x));await p.ctx.close();if(door)break;}
console.log(rep.join("\n"));console.log("ERRS",errs.length,errs.slice(0,8).join("\n"));await env.close();})();
