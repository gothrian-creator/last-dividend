#!/usr/bin/env node
// Seated fight: every visitor's real head (from the art's alpha, not a guessed box) is fully on screen and not covered by any UI,
// at phone, tablet (incl. browser-bar heights like 800x1200 / 800x1150) and landscape sizes. OUT dir for shots.
const H=require("../real-input/h.js"),fs=require("fs");const {seedHouse}=require("./probe.js");
const OUT=process.env.OUT||("/tmp/sd-face/"+Date.now().toString(36));fs.mkdirSync(OUT,{recursive:true});
const SIZES=(process.env.SIZES||"360x800,412x915,800x1280,800x1200,800x1150,800x1050,1280x800").split(",");let bad=0,n=0;function ok(c,m){n++;if(!c){bad++;console.log("FAIL",m);}}
(async()=>{const env=await H.start(process.env.DIST||"/workspace/last-dividend-v3/dist");
 for(const sz of SIZES){const [w,h]=sz.split("x").map(Number);
  const p=await H.page(env,w,h);await seedHouse(p,env.origin,{seed:13,stop:"deal:3",exec:process.env.EXEC||"mara",smart:true});await p.waitForTimeout(500);
  await (await p.$(".sd-prop")).click();await p.waitForTimeout(500);await p.click("#btn-sign");await p.waitForTimeout(2600);
  ok(await p.$("#door.sd-fight"),sz+" seated fight open");
  const arts=await p.evaluate(()=>Object.keys(LD.SEAT.opp));
  for(const art of (process.env.ARTS?process.env.ARTS.split(","):arts)){
   const r=await p.evaluate(async(art)=>{const old=document.getElementById("sc-opp");const tmp=document.createElement("div");tmp.innerHTML=LD.seatOppHtml(art,"idle",["idle","attack","hit","block","defeated"]);old.replaceWith(tmp.firstChild);
     window.dispatchEvent(new Event("resize"));const im=document.querySelector("#sc-opp img.p-idle");await new Promise(r=>{if(im.complete)r();else{im.onload=r;im.onerror=r;}});await new Promise(r=>setTimeout(r,300));
     if(!im.naturalWidth)return {err:"art did not load"};
     /* the head: from the first opaque row down 17% of the figure, between the opaque columns of that band */
     const c=document.createElement("canvas"),nw=im.naturalWidth,nh=im.naturalHeight;c.width=nw;c.height=nh;const g=c.getContext("2d");g.drawImage(im,0,0);const A=g.getImageData(0,0,nw,nh).data;
     const op=(x,y)=>A[(y*nw+x)*4+3]>128;let top=-1;for(let y=0;y<nh&&top<0;y++){let k=0;for(let x=0;x<nw;x+=2)if(op(x,y))k++;if(k>nw*0.02)top=y;}
     /* the head is the heaviest solid column run in the top band (a raised hand or a coin beside it is a lighter, separate run) */
     const B=Math.round(nh*0.22),mass=new Array(nw).fill(0);for(let y=top;y<Math.min(nh,top+B);y++)for(let x=0;x<nw;x++)if(op(x,y))mass[x]++;
     let best=null,cur=null;for(let x=0;x<=nw;x++){if(x<nw&&mass[x]>=B*0.3){if(!cur)cur={l:x,r:x,m:0};cur.r=x;cur.m+=mass[x];}else if(cur){if(!best||cur.m>best.m)best=cur;cur=null;}}
     let l=best.l,rr=best.r,ht=-1;for(let y=top;y<nh&&ht<0;y++)for(let x=l;x<=rr;x++)if(op(x,y)){ht=y;break;}
     top=ht;const bot=Math.min(nh-1,top+Math.round(nh*0.17));const pad=(rr-l)*0.04;l=Math.max(0,l-pad);rr=Math.min(nw-1,rr+pad);
     const b=im.getBoundingClientRect(),sx=b.width/nw,sy=b.height/nh;const head={l:b.left+l*sx,r:b.left+rr*sx,t:b.top+top*sy,b:b.top+bot*sy};
     const ov=(a,q)=>Math.min(a.r,q.right)-Math.max(a.l,q.left)>2&&Math.min(a.b,q.bottom)-Math.max(a.t,q.top)>2;
     const d=document.getElementById("door"),clip=d.querySelector(".sd-clip");const hits=[];
     d.querySelectorAll("*").forEach(e=>{if(clip.contains(e))return;const q=e.getBoundingClientRect();if(q.width<4||q.height<4||q.width*q.height>innerWidth*innerHeight*0.5)return;
       const cs=getComputedStyle(e);if(cs.visibility==="hidden"||cs.display==="none")return;let o=e,vis=1;while(o&&o!==document.body){vis*=+getComputedStyle(o).opacity;o=o.parentElement;}if(vis<0.05)return;
       const solid=cs.backgroundColor!=="rgba(0, 0, 0, 0)"||cs.backgroundImage!=="none"||cs.borderTopWidth!=="0px"||e.tagName==="IMG"||[...e.childNodes].some(t=>t.nodeType===3&&t.nodeValue.trim());
       if(solid&&ov(head,q))hits.push((e.id?"#"+e.id:"")+"."+[...e.classList].join(".")+" "+e.tagName);});
     /* the HUD is outside #door */
     document.querySelectorAll(".sd-hud").forEach(e=>{if(ov(head,e.getBoundingClientRect()))hits.push(".sd-hud");});
     const on=head.t>=0&&head.l>=0&&head.r<=innerWidth&&head.b<=innerHeight;
     return {head:[head.l,head.t,head.r,head.b].map(Math.round),hits:[...new Set(hits)].slice(0,6),on};},art);
   if(r.err){ok(false,sz+" "+art+" "+r.err);continue;}
   ok(r.on,sz+" "+art+" head on screen "+r.head);ok(!r.hits.length,sz+" "+art+" head clear of UI "+r.head+" "+JSON.stringify(r.hits));
   if(process.env.SHOTS||r.hits.length)await p.screenshot({path:`${OUT}/${sz}-${art}.png`});}
  ok(!p.errs.length,sz+" no page errors "+p.errs.slice(0,3));await p.ctx.close();}
 await env.close();console.log(bad?"FACE FAIL "+bad+" / "+n:"FACE OK "+n+" checks",OUT);process.exit(bad?1:0);})();
