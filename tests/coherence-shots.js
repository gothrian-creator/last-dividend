#!/usr/bin/env node
"use strict";
/* Coherence samples: a face, a mission and the fight text that ties them, at 412x915 and 1280x800.
   The driver plays to a real fight; the face and mission are then set so the same pairings can be compared across builds. */
const fs = require("fs"), http = require("http"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const DIST = process.env.DIST || path.join(ROOT, "dist");
const OUT = process.env.SHOT_DIR || "/workspace/last-dividend/mockups/coherence-2026-11-16/after";
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const MIME = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg" };
const DRIVER = fs.readFileSync(path.join(__dirname, "era-driver.js"), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SCENES = [
  ["dana-clinic-lot", { seed: "eras-0", exec: "mara", style: "any", stop: "fight:gray" }, { opp: "dana", deal: "rezoning-clinic" }],
  ["pops-safety-staff", { seed: "eras-0", exec: "mara", style: "any", stop: "fight:dunn" }, { opp: "pops", deal: "cut-safety" }],
  ["theo-aquifer", { seed: "eras-3", exec: "mara", style: "any", stop: "fight:theo" }, { opp: "theo", deal: "aquifer-tap" }]
];
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
  const text = {};
  for (const [vw, vh] of [[412, 915], [1280, 800]]) {
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    for (const [name, opts, force] of SCENES) {
      await page.goto(origin, { waitUntil: "networkidle0" });
      const ok = await page.evaluate((DRIVER, opts, force) => {
        localStorage.clear();
        const LD = window.LD, st = new Function("module", DRIVER + "; return eraDrive;")(undefined)(LD, opts);
        if (!st || !st.fy.fight) return false;
        const fg = st.fy.fight, O = LD.oppById(force.opp), D = LD.dealById(force.deal);
        fg.opp = force.opp; fg.name = O.who; fg.pattern = O.pattern.slice(); fg.intent.k = fg.pattern[0]; fg.intent.label = LD.INTENTS[fg.intent.k].label; fg.intent.meter = LD.INTENTS[fg.intent.k].meter; fg.cb = null; fg.cbAdd = 0;
        fg.venue = O.venue || fg.venue; fg.dealId = D.id; fg.dealTitle = D.title; fg.sub = O.role;
        localStorage.setItem("lastDividend.v1", JSON.stringify({ penny: { offered: true, done: true, tipsOff: true, tips: {} }, audioOff: true, seenTutorial: true, coachDone: true, midRun: st }));
        return true;
      }, DRIVER, opts, force);
      if (!ok) { errors.push("no state " + name); continue; }
      await page.goto(origin, { waitUntil: "networkidle0" });
      await page.evaluate(() => { const b = document.getElementById("btn-continue"); if (b) b.click(); });
      await page.waitForFunction(() => { const d = document.getElementById("door"); return d && d.classList.contains("on") && document.querySelector("#door .df-hand"); }, { timeout: 15000 }).catch(() => errors.push("no fight " + name));
      await page.evaluate(() => { const p = document.getElementById("penny"); if (p) p.hidden = true; });
      await sleep(1300);
      await page.screenshot({ path: path.join(OUT, vw + "x" + vh + "-" + name + ".png") });
      text[name] = await page.evaluate(() => ({ title: (document.querySelector("#door .df-title small") || {}).textContent, why: (document.querySelector("#sc-why span, .fi-cap span") || {}).textContent || "", bubble: (document.getElementById("sc-bubble") || {}).textContent || "", move: (document.querySelector("#door .df-intent, #door [class*=intent]") || {}).textContent || "" }));
      console.log(vw + "x" + vh, name, JSON.stringify(text[name]));
    }
  }
  fs.writeFileSync(path.join(OUT, "text.json"), JSON.stringify(text, null, 1));
  await browser.close(); server.close();
  if (errors.length) { console.error("ERRORS\n" + errors.join("\n")); process.exit(1); }
  console.log("COHERENCE SHOTS OK");
})().catch((e) => { console.error(e); process.exit(1); });
