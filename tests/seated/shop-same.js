#!/usr/bin/env node
// The default (shop) game must look the same as a baseline build: desk, dossier, fight, at the four sizes. DIST_A = baseline, DIST_B = new. FREEZE=1 stops CSS animations/transitions so only real layout/paint changes show (timing noise from the map, the tapping executive etc. is otherwise ~0.05%).
const H=require("../real-input/h.js"),fs=require("fs");const {execFileSync}=require("child_process");
const A=process.env.DIST_A,B=process.env.DIST_B||"/workspace/last-dividend-v3/dist",OUT=process.env.OUT||"/tmp/shop-same";fs.mkdirSync(OUT,{recursive:true});
const SIZES=(process.env.SIZES||"360x800,412x915,800x1280,1280x800").split(",");
async function shoot(dist,tag){const env=await H.start(dist);const errs={};
 for(const sz of SIZES){const [w,h]=sz.split("x").map(Number);const p=await H.page(env,w,h);await p.emulateMedia({reducedMotion:"reduce"});
  await H.seedRun(p,env.origin,{seed:13,stop:"deal:3",exec:"mara",smart:true});if(process.env.FREEZE)await p.addStyleTag({content:"*,*::before,*::after{animation:none!important;transition:none!important}"});await p.waitForTimeout(1200);
  await p.screenshot({path:`${OUT}/${tag}-${sz}-desk.png`});
  const pin=await p.$(".desk .map .pin");if(pin){const bb=await pin.boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(900);}
  await p.screenshot({path:`${OUT}/${tag}-${sz}-dossier.png`});
  const sign=await p.$("#btn-sign:not([disabled])");if(sign){await sign.click();await p.waitForTimeout(3000);}
  await p.screenshot({path:`${OUT}/${tag}-${sz}-fight.png`});
  errs[sz]=p.errs.slice(0,3);await p.ctx.close();}
 await env.close();return errs;}
(async()=>{const ea=await shoot(A,"a"),eb=await shoot(B,"b");
 const py=`
import sys
from PIL import Image, ImageChops
import numpy as np
bad=0
for sz in sys.argv[2].split(","):
  for k in ["desk","dossier","fight"]:
    a=np.asarray(Image.open(f"{sys.argv[1]}/a-{sz}-{k}.png").convert("RGB")).astype(int);b=np.asarray(Image.open(f"{sys.argv[1]}/b-{sz}-{k}.png").convert("RGB")).astype(int)
    if a.shape!=b.shape: print(sz,k,"SIZE",a.shape,b.shape); bad+=1; continue
    d=np.abs(a-b).max(2); frac=(d>24).mean()
    print(sz,k,"diff px %.4f%%"%(frac*100),"max",d.max()); bad+= frac>0.002
print("SHOP SAME FAIL" if bad else "SHOP SAME OK")`;
 const out=execFileSync("python3",["-c",py,OUT,SIZES.join(",")]).toString();console.log(out.trim());console.log("errs a",JSON.stringify(ea),"b",JSON.stringify(eb));
 process.exit(/FAIL/.test(out)?1:0);})();
