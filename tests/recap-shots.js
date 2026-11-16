#!/usr/bin/env node
"use strict";
/* End-of-run recap tour: mid-beat frames + final pages, Reid (3 eras) and the default passport. SHOT_DIR, ONLY=<vp>, QUICK=1 */
const fs = require("fs"), http = require("http"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), DIST = path.join(ROOT, "dist");
const OUT = process.env.SHOT_DIR || "/workspace/last-dividend/mockups/endrun-build-2026-11-15";
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const MIME = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".mp4": "video/mp4", ".woff2": "font/woff2" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const META = { penny: { offered: true, done: true, tipsOff: true, tips: {} }, seenTutorial: true, dividends: 120, finished: 2, wins: 0, owned: [], equipped: [], cosmetics: {}, lifetime: { dividends: 200, runs: 2, wins: 0, quarters: 14 }, history: [], xp: { reid: 40, mara: 40 } };
const CASES = [
  { id: "reid-1978-lose", q: "recap=reid&end=lose&era=1", mid: true },
  { id: "reid-2008-lose", q: "recap=reid&end=lose&era=2", mid: true },
  { id: "reid-today-lose", q: "recap=reid&end=lose&era=3&reason=failed-systems", mid: true },
  { id: "reid-today-win", q: "recap=reid&end=win&lvup=1", mid: true },
  { id: "pass-2008-lose", q: "recap=mara&end=lose&era=2", mid: true },
  { id: "pass-today-win", q: "recap=mara&end=win", mid: true },
  { id: "pass-1978-lose", q: "recap=imani&end=lose&era=1" }
];
const MID = [[900, "a-headline"], [3200, "b-climb"], [5300, "c-door"], [7200, "d-bunker"], [9300, "e-ledger"], [11900, "f-level"]];
(async () => {
  const server = http.createServer((req, res) => {
    let url = decodeURIComponent((req.url || "/").split("?")[0]); if (url === "/") url = "/index.html";
    const file = path.normalize(path.join(DIST, url));
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(data); });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console " + m.text()); });
  page.on("response", (r) => { if (r.status() >= 400) errors.push("http " + r.status() + " " + r.url()); });
  fs.mkdirSync(OUT, { recursive: true });
  const shot = async (name) => { const f = path.join(OUT, name + ".png"); await page.screenshot({ path: f }); console.log("shot", f); };
  await page.goto(origin, { waitUntil: "networkidle0" });
  await page.evaluate((m) => { localStorage.clear(); localStorage.setItem("lastDividend.audio", "off"); localStorage.setItem("lastDividend.v1", JSON.stringify(m)); }, META);
  const vps = [[800, 1280], [1280, 800], [360, 800], [412, 915]].filter(([w, h]) => !process.env.ONLY || process.env.ONLY === w + "x" + h);
  for (const [vw, vh] of vps) {
    const vp = vw + "x" + vh;
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    for (const c of CASES) {
      const doMid = c.mid && vp === "800x1280" && !process.env.QUICK;
      if (doMid) {
        await page.goto(origin + "?" + c.q, { waitUntil: "domcontentloaded" });
        const t0 = Date.now();
        for (const [t, nm] of MID) { const w = t - (Date.now() - t0); if (w > 0) await sleep(w); await shot(vp + "-" + c.id + "-" + nm); }
        await sleep(4200);
        const fin = await page.evaluate(() => !!document.querySelector("#rc.final"));
        if (!fin) errors.push(vp + " " + c.id + " did not reach final page by ~16s");
        await shot(vp + "-" + c.id + "-g-final-played");
      }
      await page.goto(origin + "?" + c.q + "&final=1", { waitUntil: "networkidle0" });
      await sleep(500);
      const info = await page.evaluate(() => {
        const rc = document.getElementById("rc"); const sc = document.getElementById("rc-scroll");
        return { tpl: rc && rc.getAttribute("data-tpl"), final: !!(rc && rc.classList.contains("final")), docScroll: document.documentElement.scrollHeight > innerHeight + 2 || document.documentElement.scrollWidth > innerWidth + 2,
          inner: sc ? sc.scrollHeight - sc.clientHeight : -1, tix: document.querySelectorAll(".rc-tix .lg-ticket").length, overflowX: sc ? sc.scrollWidth > sc.clientWidth + 2 : false };
      });
      if (!info.final) errors.push(vp + " " + c.id + " final=1 did not open the final page");
      if (info.docScroll) errors.push(vp + " " + c.id + " page scrolls");
      if (info.overflowX) errors.push(vp + " " + c.id + " horizontal overflow");
      console.log(vp, c.id, JSON.stringify(info));
      await shot(vp + "-" + c.id + "-final");
      if (info.inner > 4) { await page.evaluate(() => { const s = document.getElementById("rc-scroll"); s.style.scrollBehavior = "auto"; s.scrollTop = 99999; }); await sleep(150); await shot(vp + "-" + c.id + "-final-bottom"); }
    }
  }
  /* Behaviour: tap hurries, Skip jumps to the end, seen runs open on the final page. */
  await page.setViewport({ width: 800, height: 1280 });
  await page.goto(origin + "?recap=reid&end=lose&era=2", { waitUntil: "domcontentloaded" });
  await sleep(700);
  await page.mouse.click(400, 500); await sleep(100);
  const afterTap = await page.evaluate(() => LD._recap && LD._recap.state());
  if (!afterTap || afterTap.cur !== 0) errors.push("tap state " + JSON.stringify(afterTap));
  await sleep(500);
  const cur1 = await page.evaluate(() => LD._recap.state().cur);
  if (cur1 !== 1) errors.push("tap did not advance to beat 1: " + cur1);
  await page.evaluate(() => document.getElementById("rc-skip").click()); await sleep(200);
  if (!(await page.$("#rc.final"))) errors.push("Skip did not reach final");
  const typedOk = await page.evaluate(() => [...document.querySelectorAll(".rc-type")].every((n) => !n.classList.contains("typing")));
  if (!typedOk) errors.push("typing left mid-way after skip");
  const cnt = await page.evaluate(() => [...document.querySelectorAll(".rc-count")].map((n) => n.textContent + "/" + n.getAttribute("data-to")));
  if (cnt.some((x) => x.split("/")[0] !== x.split("/")[1])) errors.push("counter not settled " + cnt);
  await page.evaluate(() => document.getElementById("btn-letter").click()); await sleep(300);
  if (!(await page.$(".end-letter"))) errors.push("letter did not open");
  await page.evaluate(() => document.getElementById("btn-end-result").click()); await sleep(300);
  if (!(await page.$("#rc.final"))) errors.push("back from letter is not the final page");
  await page.evaluate(() => document.getElementById("btn-replay").click()); await sleep(300);
  if (await page.$("#rc.final")) errors.push("Replay did not restart");
  await shot("800x1280-replay-started");
  console.log(errors.length ? "ERRORS\n" + errors.join("\n") : "recap shots OK");
  await browser.close(); server.close();
  process.exit(errors.length ? 1 : 0);
})();
