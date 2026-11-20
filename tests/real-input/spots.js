// Placement shots: exec at each spot (desk/door/window/hatch/p1/p2) per era and size. Env OUT, EXECS, SIZES.
const H=require("./h.js");const OUT=process.env.OUT||"/tmp/spots";require("fs").mkdirSync(OUT,{recursive:true});
const EXECS=(process.env.EXECS||"mara").split(",");const SIZES=(process.env.SIZES||"390x844,1024x1366,1366x1024,1920x1080").split(",").map(s=>s.split("x").map(Number));
const SP=[["desk","idle"],["door","idle"],["window","back"],["hatch","kneel"],["p1","panic"],["p2","nervous"]];const TURN={1:2,2:6,3:10};
(async()=>{const env=await H.start();let errs=[];
for(const [w,h] of SIZES)for(const ex of EXECS)for(const e of [1,2,3]){const p=await H.page(env,w,h);await H.seedRun(p,env.origin,{seed:7,stop:"deal:"+TURN[e],exec:ex});await p.waitForTimeout(1500);
 const r=await p.evaluate(()=>{const b=document.querySelector(".of-room").getBoundingClientRect();return [b.left,b.top,b.width,b.height]});
 for(const [s,pose] of SP){await p.evaluate(([s,pose])=>LD.O4.debugSpot(s,pose),[s,pose]);await p.waitForTimeout(120);
  await p.screenshot({path:`${OUT}/${w}x${h}-${ex}-e${e}-${s}.png`,clip:{x:r[0],y:r[1],width:r[2],height:r[3]}});}
 errs.push(...p.errs);await p.ctx.close();}
console.log("ERRS",errs.length,errs.slice(0,5));await env.close();})();
