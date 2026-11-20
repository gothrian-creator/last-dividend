// Office screenshots: exec x era (deal:2 / deal:6 / deal:10) x sizes. Room crop + full page. Env: OUT, EXECS, SIZES (e.g. 390x844,1366x1024), ERAS.
const H=require("./h.js");
const OUT=process.env.OUT||"/tmp/oshots"; require("fs").mkdirSync(OUT,{recursive:true});
const EXECS=(process.env.EXECS||"mara").split(",");
const SIZES=(process.env.SIZES||"390x844,375x667,1024x1366,1366x1024,1920x1080").split(",").map(s=>s.split("x").map(Number));
const ERAS=(process.env.ERAS||"1,2,3").split(",").map(Number); const TURN={1:2,2:6,3:10};
(async()=>{const env=await H.start();let errs=[],rep=[];
for(const [w,h] of SIZES)for(const ex of EXECS)for(const e of ERAS){
  const p=await H.page(env,w,h);
  const ok=await H.seedRun(p,env.origin,{seed:7,stop:"deal:"+TURN[e],exec:ex,patch:process.env.PATCH||""});
  if(!ok){rep.push(`${w}x${h} ${ex} e${e}: seed failed`);await p.ctx.close();continue;}
  await p.waitForTimeout(1800);
  const info=await p.evaluate(()=>{const r=document.querySelector(".of-room");const st=document.querySelector(".o4-stage");const b=r&&r.getBoundingClientRect();
    const m=[...document.querySelectorAll(".of-room .meter,.o4-tick")].map(n=>{const q=n.getBoundingClientRect();return [n.className.split(" ").slice(0,3).join("."),Math.round(q.left-b.left),Math.round(q.top-b.top),Math.round(q.width),Math.round(q.height)]});
    return {room:b&&[Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)],era:st&&st.dataset.era,lay:st&&st.dataset.lay,m,scroll:[document.scrollingElement.scrollHeight,innerHeight]};});
  const tag=`${w}x${h}-${ex}-e${e}`;
  if(info.room){await p.screenshot({path:`${OUT}/${tag}-room.png`,clip:{x:info.room[0],y:info.room[1],width:info.room[2],height:info.room[3]}});}
  await p.screenshot({path:`${OUT}/${tag}-full.png`});
  rep.push(tag+" "+JSON.stringify(info)); errs.push(...p.errs.map(x=>tag+" "+x)); await p.ctx.close();}
console.log(rep.join("\n"));console.log("ERRS",errs.length,errs.slice(0,10).join("\n"));await env.close();})();
