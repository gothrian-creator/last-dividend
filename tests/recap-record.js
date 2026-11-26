#!/usr/bin/env node
"use strict";
/* Record a full recap as mp4 via CDP screencast frames + ffmpeg. Q="recap=reid&end=lose&era=2" OUT=... W=800 H=1280 SECS=17 */
const fs = require("fs"), http = require("http"), path = require("path"), { execFileSync } = require("child_process");
const ROOT = path.resolve(__dirname, ".."), DIST = path.join(ROOT, "dist");
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const Q = process.env.Q || "recap=reid&end=lose&era=2", OUT = process.env.OUT || "/workspace/last-dividend/test-output/recap-record/reid-2008-recap.mp4";
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const W = +process.env.W || 800, H = +process.env.H || 1280, SECS = +process.env.SECS || 17;
const MIME = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".woff2": "font/woff2" };
(async () => {
  const server = http.createServer((req, res) => { let url = decodeURIComponent((req.url || "/").split("?")[0]); if (url === "/") url = "/index.html"; fs.readFile(path.join(DIST, url), (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(url)] || "application/octet-stream" }); res.end(d); }); });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto(origin, { waitUntil: "networkidle0" });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("lastDividend.audio", "off"); localStorage.setItem("lastDividend.v1", JSON.stringify({ penny: { offered: true, done: true, tipsOff: true, tips: {} }, dividends: 120, finished: 2, wins: 0, xp: { reid: 40 } })); });
  const dir = fs.mkdtempSync("/tmp/rcrec-"); const frames = [];
  const cdp = await page.target().createCDPSession();
  cdp.on("Page.screencastFrame", async (f) => { const n = path.join(dir, String(frames.length).padStart(5, "0") + ".jpg"); fs.writeFileSync(n, Buffer.from(f.data, "base64")); frames.push({ n, t: f.metadata.timestamp }); try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch (e) {} });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 85, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await page.goto(origin + "?" + Q, { waitUntil: "domcontentloaded" });
  /* trim the title-screen frames: start the clip once the recap backdrop is painted */
  await page.waitForFunction(() => { const r = document.getElementById("rc"); return r && r.getBoundingClientRect().height > 0; }, { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 250));
  const startAt = Date.now() / 1000;
  await new Promise((r) => setTimeout(r, SECS * 1000));
  await cdp.send("Page.stopScreencast");
  const keep = frames.filter((f) => f.t >= startAt - 0.05); if (keep.length > 10) { frames.length = 0; keep.forEach((f) => frames.push(f)); }
  await browser.close(); server.close();
  /* concat list with real frame durations, then a fixed 30fps output */
  let list = "";
  for (let i = 0; i < frames.length; i++) { const d = i + 1 < frames.length ? Math.max(0.001, frames[i + 1].t - frames[i].t) : 1.0; list += "file '" + frames[i].n + "'\nduration " + d.toFixed(4) + "\n"; }
  list += "file '" + frames[frames.length - 1].n + "'\n";
  fs.writeFileSync(path.join(dir, "list.txt"), list);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"), "-vf", "fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p", "-c:v", "libx264", "-crf", "22", "-movflags", "+faststart", OUT]);
  console.log("frames", frames.length, "->", OUT);
})();
