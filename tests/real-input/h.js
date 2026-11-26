// Shared harness: static server for DIST + playwright chromium.
const fs=require("fs"),http=require("http"),path=require("path");
const {chromium}=require("/workspace/tools/node_modules/playwright-core");
const MIME={".html":"text/html; charset=utf-8",".webp":"image/webp",".png":"image/png",".woff2":"font/woff2",".jpg":"image/jpeg",".ttf":"font/ttf"};
const DRIVER=fs.readFileSync("/workspace/ld-src/tests/era-driver.js","utf8");
exports.sleep=ms=>new Promise(r=>setTimeout(r,ms));
exports.start=async function(dist){
  dist=dist||process.env.DIST||"/workspace/ld-src/dist";
  let origin=process.env.LIVE;
  let server=null;
  if(!origin){server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split("?")[0]);if(u==="/")u="/index.html";let f=path.join(dist,u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{"Content-Type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});
  await new Promise(r=>server.listen(0,"127.0.0.1",r)); origin="http://127.0.0.1:"+server.address().port+"/";}
  const browser=await chromium.launch({executablePath:"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage"]});
  return {origin,browser,close:async()=>{await browser.close(); if(server)server.close();}};
};
exports.page=async function(env,w,h){
  const touch=w<1100||h>w;
  const ctx=await env.browser.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:w<700,deviceScaleFactor:+(process.env.DPR||1)});
  const page=await ctx.newPage(); page.errs=[]; page.setDefaultTimeout(8000);
  page.on("console",m=>{if(m.type()==="error")page.errs.push("console: "+m.text())});
  page.on("pageerror",e=>page.errs.push("pageerror: "+e));
  page.on("requestfailed",r=>page.errs.push("reqfail: "+r.url()));
  page.on("response",r=>{if(r.status()>=400)page.errs.push("http "+r.status()+" "+r.url())});
  page.ctx=ctx; return page;
};
// Shortcut to a mid-run state (named in reports): drive headless to stop, store as midRun, reload, Continue.
exports.seedRun=async function(page,origin,o,pennyMeta){
  await page.goto(origin); await page.waitForTimeout(300);
  const ok=await page.evaluate(([DRIVER,o,pm])=>{localStorage.clear();const LD=window.LD;const st=new Function("module",DRIVER+"; return eraDrive;")(undefined)(LD,o);if(!st)return false;
    if(o.patch) new Function("st","LD",o.patch)(st,LD);
    localStorage.setItem("lastDividend.v1",JSON.stringify(Object.assign({penny:pm||{offered:true,done:true,tipsOff:true,tips:{}},audioOff:true,seenTutorial:true,coachDone:true,midRun:st},o.meta||{})));return true;},[DRIVER,o,pennyMeta]);
  if(!ok) return false;
  await page.goto(origin); await page.waitForTimeout(600);
  await page.click("#btn-continue"); await page.waitForSelector(".desk",{timeout:15000}); await page.waitForTimeout(1200);
  // dismiss boss intro if any
  for(let i=0;i<3;i++){const b=await page.$("#fy-boss-ok"); if(b && await b.isVisible()){await b.click(); await page.waitForTimeout(700);} }
  return true;
};
exports.vis=async function(page){return page.evaluate(()=>{const o={};o.scroll=[document.scrollingElement.scrollHeight,innerHeight,document.scrollingElement.scrollWidth,innerWidth];return o;});};
exports.SIZES=[[390,844],[375,667],[360,740],[768,1024],[1024,768],[1024,1366],[1366,1024],[1280,720],[1920,1080]];
