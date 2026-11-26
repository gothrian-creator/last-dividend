#!/usr/bin/env node
"use strict";
/* Era tour: each act's hub, the bunker per era, an Act I fight with a speech bubble, an Act II fight, callback fights and endings.
   States are built by the shared driver inside the page (same build as players get), then resumed from the save slot. */
const fs = require("fs"), http = require("http"), path = require("path");
const ROOT = "/workspace/last-dividend-v3";
const DIST = process.env.DIST || path.join(ROOT, "dist");
const OUT = process.env.SHOT_DIR || "/workspace/last-dividend/test-output/icon-shots";
const LIVE = process.env.LIVE || "";
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const MIME = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg" };
const DRIVER = fs.readFileSync("/workspace/last-dividend-v3/tests/era-driver.js", "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ONLY = process.env.ONLY || "";
const OPPS = "__OPPS__";
const SCENES = [
  ["b1-desk", { seed: "eras-11", exec: "mara", style: "bribe", stop: "deal:9", build: true, takeCards: true }, "desk"],
  ["b1-briefcase", { seed: "eras-11", exec: "mara", style: "bribe", stop: "deal:9", build: true, takeCards: true }, "portfolio"],
  ["b1-fight-curse", { seed: "eras-11", exec: "mara", style: "bribe", stop: "fight:ashby_b", build: true, takeCards: true, curse: true }, "fight"],
  ["b2-boss", { seed: "eras-11", exec: "mara", style: "bribe", stop: "deal:4", build: true, takeCards: true }, "boss"],
  ["b2-memo", { seed: "eras-11", exec: "mara", style: "bribe", stop: "deal:9", build: true, takeCards: true, memo: "union" }, "memo"],
  ["b2-deal-encounter", { seed: "eras-11", exec: "mara", style: "bribe", stop: "deal:9", build: true, takeCards: true }, "deal"],
  ["b1-deck-fixers", { seed: "eras-11", exec: "mara", style: "bribe", stop: "fight:ashby_b", build: true, takeCards: true, curse: true }, "fight-deck"]
];
(async () => {
  let origin = LIVE, server = null;
  if (!LIVE) {
    server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || "/").split("?")[0]); if (url === "/") url = "/index.html";
      let file = path.normalize(path.join(DIST, url));
      if (!fs.existsSync(file) && url.startsWith("/assets/")) file = path.join("/workspace/last-dividend-pages", url);
      fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(data); });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    origin = "http://127.0.0.1:" + server.address().port + "/";
  }
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console " + m.text()); });
  page.on("requestfailed", (r) => errors.push("reqfail " + r.url()));
  page.on("response", (r) => { if (r.status() >= 400) errors.push("http " + r.status() + " " + r.url()); });
  fs.mkdirSync(OUT, { recursive: true });
  const click = (sel) => page.evaluate((s) => { const n = document.querySelector(s); if (!n) return false; n.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); return true; }, sel);
  const imagesReady = () => page.evaluate(() => Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; })))).then(() => sleep(150));
  const noScroll = async (label) => { const i = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, h: window.innerHeight, sw: document.documentElement.scrollWidth, w: window.innerWidth })); if (i.sh > i.h + 1 || i.sw > i.w + 1) errors.push("scroll " + label + " " + JSON.stringify(i)); };
  const report = [];
  for (const [vw, vh] of [[360, 800], [412, 915], [800, 1280], [1280, 800]]) {
    const vp = vw + "x" + vh;
    if (ONLY && ONLY !== vp) continue;
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    for (const [name, opts, mode] of SCENES) {
      if (process.env.SCENE && !name.startsWith(process.env.SCENE)) continue;
      await page.goto(origin, { waitUntil: "networkidle0" });
      const ok = await page.evaluate((DRIVER, opts) => {
        localStorage.clear();
        localStorage.setItem("lastDividend.audio", "off");
        const eraDrive = new Function("module", DRIVER + "; return eraDrive;")(undefined);
        const st = eraDrive(window.LD, opts);
        if (!st) return false;
        if (opts.memo) st.fy.memo = { id: opts.memo, q: st.turn };
        if (opts.curse && st.fy.fight) { st.fy.deck.push({ u: 900, id: "c_leak", up: 0, fx: null }); st.fy.fight.hand.push(900); }
        localStorage.setItem("lastDividend.v1", JSON.stringify({ penny: { offered: true, done: true, tipsOff: true, tips: {} }, audioOff: true, seenTutorial: true, coachDone: true, midRun: st }));
        return st.turn + " " + (st.fy.fight ? st.fy.fight.opp : "desk");
      }, DRIVER, opts);
      if (!ok) { errors.push("no state for " + name); continue; }
      await page.goto(origin, { waitUntil: "networkidle0" });
      await click("#btn-continue"); await sleep(700);
      if (mode !== "boss" && mode !== "memo" && await page.$("#fy-boss-ok")) { await click("#fy-boss-ok"); await sleep(400); }
      await page.evaluate(() => { const p = document.getElementById("penny"); if (p) p.hidden = true; });
      if (mode.startsWith("fight")) {
        await page.waitForFunction(() => { const d = document.getElementById("door"); return d && !d.hidden && d.classList.contains("on"); }, { timeout: 15000 });
        await sleep(900); await imagesReady();
        if (mode === "fight-hit") { await page.evaluate(() => { const c = [...document.querySelectorAll(".df-hand .dc:not(.no)")].find((x) => /dc-p/.test(x.innerHTML)) || document.querySelector(".df-hand .dc:not(.no)"); if (c) c.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); }); await sleep(700); }
        if (mode === "fight-attack") { await click("#df-end"); await sleep(260); }
        if (mode === "fight-deck") { await click("#df-deck"); await sleep(600); await imagesReady(); }
      } else if (mode === "bunker") {
        await page.waitForSelector("#screen-desk.on"); await click("#bunker-card"); await sleep(900); await imagesReady();
      } else if (mode === "boss" || mode === "memo") {
        await sleep(800); await imagesReady();
      } else if (mode === "deal") {
        await page.waitForSelector("#screen-desk.on"); await sleep(500); await click("[data-deal]"); await sleep(700); await imagesReady();
      } else if (mode === "portfolio") {
        await page.waitForSelector("#screen-desk.on"); await sleep(500); await click("#btn-portfolio"); await sleep(700); await imagesReady();
      } else { await page.waitForSelector("#screen-desk.on"); await sleep(600); await imagesReady(); }
      await page.evaluate(() => { const p = document.getElementById("penny"); if (p) p.hidden = true; });
      const f = path.join(OUT, vp + "-" + name + ".png");
      await page.screenshot({ path: f });
      await noScroll(vp + " " + name);
      report.push(f + "  [" + ok + "]");
      console.log("shot", f, ok);
      if (mode === "fight-attack") await sleep(600);
    }
  }
  await browser.close(); if (server) server.close();
  const u = [...new Set(errors)];
  if (u.length) { console.error("ISSUES\n" + u.join("\n")); process.exit(1); }
  console.log("ERA SHOTS OK");
})().catch((e) => { console.error(e); process.exit(1); });
