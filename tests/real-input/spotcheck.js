// Which stand points cover a painted meter face? Exec sprite rect (plate px) vs face rects, per era x layout. Env SIZES, EXECS.
const H=require("./h.js");
const SIZES=(process.env.SIZES||"390x844,1366x1024").split(",").map(s=>s.split("x").map(Number));const EXECS=(process.env.EXECS||"julian,mara,imani").split(",");
const SP=[["desk","idle"],["door","idle"],["window","back"],["hatch","kneel"],["hatchAp","idle"],["p1","panic"],["p2","nervous"],["deskEntry","idle"]];const TURN={1:2,2:6,3:10};
(async()=>{const env=await H.start();const out=[];let errs=[];
for(const [w,h] of SIZES)for(const ex of EXECS)for(const e of [1,2,3]){const p=await H.page(env,w,h);await H.seedRun(p,env.origin,{seed:7,stop:"deal:"+TURN[e],exec:ex});await p.waitForTimeout(1200);
 for(const [s,pose] of SP){const r=await p.evaluate(([s,pose])=>{if(!LD.O4.debugSpot(s,pose))return null;const W=document.querySelector(".o4-world").getBoundingClientRect(),sc=LD.O4._s?LD.O4._s():null;
   const m=document.querySelector(".o4-world").style.transform.match(/scale\(([\d.]+)\)/);const k=+m[1];const P=b=>[(b.left-W.left)/k,(b.top-W.top)/k,(b.right-W.left)/k,(b.bottom-W.top)/k];
   const sp=P(document.querySelector(".o4-spr").getBoundingClientRect());const res=[];
   document.querySelectorAll(".o4-face").forEach(f=>{if(f.style.display==="none")return;const b=P(f.getBoundingClientRect());const ix=Math.min(sp[2],b[2])-Math.max(sp[0],b[0]),iy=Math.min(sp[3],b[3])-Math.max(sp[1],b[1]);
     const behindK=f.classList.contains("o4-fK")&&+document.querySelector(".o4-ex").style.zIndex<5;
     if(ix>2&&iy>2&&!behindK)res.push(f.className.match(/o4-f([UCK])\b/)[1]+" "+Math.round(ix)+"x"+Math.round(iy));
     const gap=b[3]<sp[1]&&ix>0?Math.round(sp[1]-b[3]):null; if(gap!==null&&gap<24)res.push(f.className.match(/o4-f([UCK])\b/)[1]+" near(gap "+gap+")");});
   return {lay:document.querySelector(".o4-stage").dataset.lay,sp:sp.map(Math.round),res};},[s,pose]);
  if(r&&r.res.length)out.push(`${w}x${h} ${ex} e${e}-${r.lay} ${s}: ${r.res.join(", ")} spr ${r.sp}`);}
 errs.push(...p.errs);await p.ctx.close();}
console.log(out.join("\n")||"no overlaps");console.log("ERRS",errs.length);await env.close();})();
