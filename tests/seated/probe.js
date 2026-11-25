// Probe current house-mode desk + fight screens (before the seated-desk build).
const H=require("../real-input/h.js"),fs=require("fs");
const DRIVER=fs.readFileSync(__dirname+"/../era-driver.js","utf8");
const OUT=process.env.OUT||"/tmp/sd-probe";fs.mkdirSync(OUT,{recursive:true});
const SIZES=(process.env.SIZES||"412x915,1280x800").split(",");
async function seedHouse(page,origin,o){
  await page.goto(origin+"?house=1");await page.waitForTimeout(300);
  await page.evaluate(([DRIVER,o])=>{localStorage.clear();const LD=window.LD;LD.HOUSE_RULES=true;
    const st=new Function("module",DRIVER+"; return eraDrive;")(undefined)(LD,o);
    if(o.patch) new Function("st","LD",o.patch)(st,LD);
    localStorage.setItem(LD.HOUSE_SAVE_KEY,JSON.stringify({penny:{offered:true,done:true,tipsOff:true,tips:{}},audioOff:true,seenTutorial:true,coachDone:true,midRun:st}));},[DRIVER,o]);
  await page.goto(origin+"?house=1");await page.waitForTimeout(600);
  await page.click("#btn-continue");await page.waitForTimeout(1500);
  for(let i=0;i<3;i++){const b=await page.$("#fy-boss-ok");if(b&&await b.isVisible()){await b.click();await page.waitForTimeout(700);}}
}
exports.seedHouse=seedHouse;
if(require.main===module)(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");
 for(const sz of SIZES){const [w,h]=sz.split("x").map(Number);
  let p=await H.page(env,w,h);await seedHouse(p,env.origin,{seed:13,stop:"deal:5",exec:"mara",smart:true});
  await p.screenshot({path:`${OUT}/${sz}-desk.png`});
  const st=await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem(LD.HOUSE_SAVE_KEY)).midRun;return {rs:s.ruleset,phase:s.phase,turn:s.turn,off:s.offered};});
  console.log(sz,JSON.stringify(st));
  const pin=await p.$(".desk .map .pin");if(pin){const bb=await pin.boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(700);}
  await p.screenshot({path:`${OUT}/${sz}-dossier.png`});
  const sign=await p.$("#btn-sign:not([disabled])");if(sign){await sign.click();}else{const c=await p.$("#dossier .dz-choice:not([disabled])");if(c)await c.click();}
  await p.waitForTimeout(2500);
  await p.screenshot({path:`${OUT}/${sz}-after-sign.png`});
  console.log(sz,"errs",p.errs.slice(0,5));await p.ctx.close();}
 await env.close();})();
