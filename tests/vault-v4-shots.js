#!/usr/bin/env node
"use strict";
/* Vault v4 shots: painted room plates in the live vault (mixed levels: Lv3 / Lv2 / building / empty) and the sealed view.
   ORIGIN=https://... shoots a deployed build instead of dist/. */
const fs = require("fs"), http = require("http"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const DIST = process.env.DIST || path.join(ROOT, "dist");
const OUT = process.env.SHOT_DIR || "/workspace/last-dividend/mockups/bunker-repaint-2026-11-16/live";
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const MIME = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const DRIVER = fs.readFileSync(path.join(__dirname, "era-driver.js"), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  let server = null, origin = process.env.ORIGIN;
  if (!origin) {
    server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || "/").split("?")[0]); if (url === "/") url = "/index.html";
      const file = path.normalize(path.join(DIST, url));
      fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(data); });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    origin = "http://127.0.0.1:" + server.address().port + "/";
  }
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
  const page = await browser.newPage(); const errors = [], missing = [];
  page.on("pageerror", (e) => errors.push("pageerror " + e.message));
  page.on("response", (r) => { if (r.status() >= 400 && /assets\//.test(r.url())) missing.push(r.status() + " " + r.url()); });
  fs.mkdirSync(OUT, { recursive: true });
  const SAVE = { penny: { offered: true, done: true, tipsOff: true, tips: {} }, audioOff: true, seenTutorial: true, coachDone: true };
  const CASES = [{ exec: "cassius", stop: "deal:6", tag: "2008-cassius" }, { exec: "mara", stop: "deal:2", tag: "1978-mara" }];
  for (const [vw, vh] of [[412, 915], [1280, 800]]) {
    const vp = vw + "x" + vh;
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    for (const C of CASES) {
      await page.goto(origin + (origin.includes("?") ? "&" : "?") + "cb=" + Date.now(), { waitUntil: "networkidle0" });
      const ok = await page.evaluate((DRIVER, SAVE, C) => {
        localStorage.clear();
        const LD = window.LD, st = new Function("module", DRIVER + "; return eraDrive;")(undefined)(LD, { seed: "v4-" + C.exec, exec: C.exec, style: "any", stop: C.stop, build: true, smart: true });
        if (!st) return false;
        const lv = { air: 3, water: 2, power: 1, food: 0 };
        LD.SYSTEMS.forEach((x) => { st.bunker[x.id].level = lv[x.id]; st.bunker[x.id].quality = lv[x.id] ? "sound" : st.bunker[x.id].quality; });
        st.phase = "bunker"; st.dealPickedThisTurn = true; st.lastDealId = st.offered[0];
        localStorage.setItem("lastDividend.v1", JSON.stringify(Object.assign({}, SAVE, { midRun: st })));
        return true;
      }, DRIVER, SAVE, C);
      if (!ok) { errors.push("no state " + C.tag); continue; }
      await page.goto(origin + (origin.includes("?") ? "&" : "?") + "cb=" + Date.now(), { waitUntil: "networkidle0" });
      await page.evaluate(() => { const b = document.getElementById("btn-continue"); if (b) b.click(); });
      await sleep(1200);
      await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Understood$/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); const p = document.getElementById("penny"); if (p) p.hidden = true; });
      await page.evaluate(() => document.getElementById("bunker-card").click()); await sleep(1500);
      await page.screenshot({ path: path.join(OUT, vp + "-vault-" + C.tag + ".png") });
      const m = await page.evaluate(() => {
        const st = document.querySelector(".bk-stage").getBoundingClientRect(), sc = document.querySelector(".bk-stage .bk-scene").getBoundingClientRect(), pn = document.getElementById("bk-panel").getBoundingClientRect();
        const lbl = document.querySelector(".bk-spotlbl text"); const lr = lbl ? lbl.getBoundingClientRect() : { height: 0 };
        return { stageH: Math.round(st.height), sceneH: Math.round(sc.height), gap: Math.round(pn.top - sc.bottom), labelPx: Math.round(lr.height), plates: [...document.querySelectorAll(".bk-plate")].map((i) => i.getAttribute("href").split("/").pop()) };
      });
      console.log(vp, C.tag, JSON.stringify(m));
      if (vw < 600 && m.gap > 24) errors.push("phone gap " + m.gap + " " + vp + " " + C.tag);
      /* sealed view (same render path as showSealed) */
      await page.evaluate(() => { const ov = document.getElementById("overlay"); ov.hidden = false; ov.className = "overlay on bunker-mode"; ov.innerHTML = window.LD.renderBunkerView(window.__ldState ? window.__ldState() : JSON.parse(localStorage.getItem("lastDividend.v1")).midRun, { sealed: true }); });
      await sleep(2400);
      await page.screenshot({ path: path.join(OUT, vp + "-sealed-" + C.tag + ".png") });
      const sp = await page.evaluate(() => [...document.querySelectorAll(".bk-plate")].map((i) => i.getAttribute("href").split("/").pop()));
      if (!sp.some((h) => /build-sealed/.test(h))) errors.push("sealed building room still uses the crew plate " + vp + " " + C.tag);
    }
  }
  await browser.close(); if (server) server.close();
  if (missing.length) errors.push.apply(errors, missing);
  if (errors.length) { console.log("VAULT V4 SHOTS FAIL\n" + errors.join("\n")); process.exit(1); }
  console.log("VAULT V4 SHOTS OK");
})();
