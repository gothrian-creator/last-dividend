// dev helper: seed a seated desk at SZ, run EVAL (page JS), optional ACTIONS (node js using p), screenshot to OUT file.
const H=require("../real-input/h.js");const {seedHouse}=require("./probe.js");
(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");
 const [w,h]=(process.env.SZ||"412x915").split("x").map(Number);const p=await H.page(env,w,h);
 await seedHouse(p,env.origin,{seed:+(process.env.SEED||13),stop:process.env.STOP||"deal:3",exec:"mara",smart:true});await p.waitForTimeout(500);
 if(process.env.ACT) await (new Function("p","return (async()=>{"+process.env.ACT+"})()"))(p);
 if(process.env.EVAL) console.log(JSON.stringify(await p.evaluate(process.env.EVAL),null,1));
 if(process.env.SHOT) await p.screenshot({path:process.env.SHOT});
 console.log("errs",p.errs.slice(0,6));await env.close();})();
