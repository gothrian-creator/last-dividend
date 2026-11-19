const H=require("./h.js");
(async()=>{
  const oldEnv=await H.start("/tmp/oldld"), newEnv=await H.start(process.env.DIST||"/workspace/ld-src/dist");
  const out=[];
  for(const [o,label] of [[{seed:11,stop:"deal:3"},"q3"],[{seed:12,stop:"deal:6",exec:"reid"},"q6"],[{seed:13,stop:"deal:10",exec:"cassius"},"q10"]]){
    const p=await H.page(oldEnv,390,844);
    await H.seedRun(p,oldEnv.origin,o,{offered:true,done:false,tips:{fight:1}});
    // play a little in old build: open + close phone/ end quarter not needed; grab save
    const save=await p.evaluate(()=>localStorage.getItem("lastDividend.v1"));
    const oldErr=p.errs.slice(); await p.ctx.close();
    for(const [w,h] of [[390,844],[1366,1024]]){
      const q=await H.page(newEnv,w,h);
      await q.goto(newEnv.origin); await q.evaluate(s=>{localStorage.clear();localStorage.setItem("lastDividend.v1",s)},save);
      await q.goto(newEnv.origin); await q.waitForTimeout(600); await q.click("#btn-continue"); await q.waitForSelector(".desk",{timeout:15000}); await q.waitForTimeout(1500);

      for(let i=0;i<3;i++){const b=await q.$("#fy-boss-ok"); if(b && await b.isVisible()){await b.click(); await q.waitForTimeout(700);} }
      const info=await q.evaluate(()=>({rail:!!document.querySelector("#side-rail"),scroll:[document.scrollingElement.scrollHeight,innerHeight],icon:(document.querySelector("#bunker-card img")||{}).currentSrc||null,turn:document.querySelector(".q-chip, #q-chip")?.textContent?.trim()}));
      const pen=await q.evaluate(()=>{const p=document.getElementById("penny");return !!(p&&!p.hidden)}); await q.screenshot({path:`/workspace/ld-current/t/old-${label}-${w}-hub.png`}); let clickErr=null; try{await q.click("#bunker-card",{timeout:3000}); await q.waitForTimeout(800);}catch(e){clickErr=String(e).slice(0,200)}
      const bk=await q.evaluate(()=>!!document.querySelector(".bunker-view, #bunker-view, .bk-view"));
      await q.screenshot({path:`/workspace/ld-current/t/old-${label}-${w}.png`});
      out.push({label,w,h,oldErr,info,pen,clickErr,bk,errs:q.errs}); await q.ctx.close();
    }
  }
  console.log(JSON.stringify(out,null,1)); await oldEnv.close(); await newEnv.close();
})();
