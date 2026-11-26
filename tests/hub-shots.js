#!/usr/bin/env node
"use strict";
/* Hub (desk) shots at the 4 viewports after a few quarters, for layout checks. DIST and SHOT_DIR pick the build and folder. */
const fs = require("fs"), http = require("http"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const DIST = process.env.DIST || path.join(ROOT, "dist");
const OUT = process.env.SHOT_DIR || "/workspace/last-dividend/test-output/hub-shots";
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const MIME = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg" };
const DRIVER = fs.readFileSync(path.join(__dirname, "era-driver.js"), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const Q = +(process.env.Q || 7);
(async () => {
  const server = http.createServer((req, res) => {
    let url = decodeURIComponent((req.url || "/").split("?")[0]); if (url === "/") url = "/index.html";
    let file = path.normalize(path.join(DIST, url));
    if (!fs.existsSync(file) && url.startsWith("/assets/")) file = path.join("/workspace/last-dividend-pages", url);
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(data); });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
  const page = await browser.newPage(); const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror " + e.message));
  fs.mkdirSync(OUT, { recursive: true });
  for (const [vw, vh] of [[360, 800], [412, 915], [800, 1280], [1280, 800]]) {
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    await page.goto(origin, { waitUntil: "networkidle0" });
    const ok = await page.evaluate((DRIVER, Q) => {
      localStorage.clear();
      const LD = window.LD, st = new Function("module", DRIVER + "; return eraDrive;")(undefined)(LD, { seed: "hub-7", exec: "julian", style: "any", stop: "deal:" + Q, build: true });
      if (!st) return false; st.rating = 9;
      localStorage.setItem("lastDividend.v1", JSON.stringify({ penny: { offered: true, done: true, tipsOff: true, tips: {} }, audioOff: true, seenTutorial: true, coachDone: true, midRun: st }));
      return true;
    }, DRIVER, Q);
    if (!ok) { errors.push("no state"); continue; }
    await page.goto(origin, { waitUntil: "networkidle0" });
    await page.evaluate(() => { const b = document.getElementById("btn-continue"); if (b) b.click(); });
    await page.waitForSelector(".desk", { timeout: 15000 }).catch(() => errors.push("no desk " + vw));
    await sleep(1500);
    await page.evaluate(() => { const p = document.getElementById("penny"); if (p) p.hidden = true; });
    const modal = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Understood$/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); return !!b; });
    if (modal) { await page.screenshot({ path: path.join(OUT, "boss-preview-" + vw + "x" + vh + ".png") });
      await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Understood$/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); b.click(); }); await sleep(900); }
    await page.screenshot({ path: path.join(OUT, "hub-" + vw + "x" + vh + ".png") });
    const info = await page.evaluate(() => ({ rivals: !!document.querySelector(".desk .rivals"), rivalRegions: document.querySelectorAll(".region.rival").length, sealMarks: [...document.querySelectorAll(".rm")].map((e) => e.textContent).filter((t) => /seals\?/.test(t)), overflowX: document.documentElement.scrollWidth > innerWidth }));
    console.log(vw + "x" + vh, JSON.stringify(info));
  }
  await browser.close(); server.close();
  if (errors.length) { console.error("ERRORS\n" + errors.join("\n")); process.exit(1); }
  console.log("HUB SHOTS OK");
})();
