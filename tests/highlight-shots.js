#!/usr/bin/env node
"use strict";
/* "What can I do now" highlight tour. SHOT_DIR, ONLY=800x1280|1280x800 */
const fs = require("fs"), http = require("http"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), DIST = path.join(ROOT, "dist");
const OUT = process.env.SHOT_DIR || "/workspace/last-dividend/test-output/highlight-shots";
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const DRIVER = fs.readFileSync(path.join(__dirname, "era-driver.js"), "utf8");
const MIME = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".mp4": "video/mp4", ".js": "text/javascript", ".css": "text/css" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ONLY = process.env.ONLY || "";
/* name, how to shape the saved run, what to open, expectations */
const SCENES = [
  ["01-q1-deals", "q1", "desk", (h) => h.pins === 3 && !h.endqAct && h.endqDim && !h.bunkerAct && h.arrows <= 1],
  ["02-bunker-ready", "bunker", "desk", (h) => h.bunkerAct && !h.endqAct && h.arrowOn === "bunker-card" && h.pins === 0],
  ["03-bunker-orders", "bunker", "bunker", (h) => h.orders > 0 && h.arrows === 1],
  ["06-endq-last", "acted", "desk", (h) => h.endqAct && h.arrowOn === "btn-endq" && !h.bunkerAct]
];
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
  const click = (sel) => page.evaluate((s) => { const n = document.querySelector(s); if (!n) return false; n.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); return true; }, sel);
  const ready = () => page.evaluate(() => Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; })))).then(() => sleep(200));
  const noScroll = async (label) => { const i = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, h: window.innerHeight, sw: document.documentElement.scrollWidth, w: window.innerWidth })); if (i.sh > i.h + 1 || i.sw > i.w + 1) errors.push("scroll " + label + " " + JSON.stringify(i)); };
  for (const [vw, vh] of [[800, 1280], [1280, 800]]) {
    const vp = vw + "x" + vh;
    if (ONLY && ONLY !== vp) continue;
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    for (const [name, shape, open, expect] of SCENES) {
      await page.goto(origin, { waitUntil: "networkidle0" });
      const ok = await page.evaluate((DRIVER, shape) => {
        localStorage.clear(); localStorage.setItem("lastDividend.audio", "off");
        const LD = window.LD, eraDrive = new Function("module", DRIVER + "; return eraDrive;")(undefined);
        let st = eraDrive(LD, { seed: "hl-" + (shape === "q1" ? "1" : "2"), stop: shape === "q1" ? "deal:1" : "deal:2", build: true });
        if (!st) return false;
        if (shape !== "q1") {
          let r = null;
          for (const id of st.offered) { const d = LD.dealById(id), chs = d.choices || [{ id: null }]; for (const c of chs) { r = LD.selectDeal(st, id, c.id); if (r.ok) break; } if (r && r.ok) break; }
          if (!r || !r.ok) return false;
          st = r.state;
          if (shape.startsWith("fight")) { if (!st.fy.fight) return "nofight"; if (shape === "fight-broke") st.fy.fight.inf = 0; }
          else { st.fy.fight = null; st.fy.reward = null; st.fy.memo = null; st.fy.draft = null; st.fy.actIntro = null; st.cash = Math.max(st.cash, 40); st.phase = "bunker"; st.bunkerActedThisTurn = shape === "acted"; }
        }
        if (st.fy) { st.fy.memo = shape.startsWith("fight") ? st.fy.memo : null; st.fy.actIntro = null; st.fy.bannerQ = st.turn; }
        localStorage.setItem("lastDividend.v1", JSON.stringify({ penny: { offered: true, done: true, tipsOff: true, tips: {} }, audioOff: true, seenTutorial: true, coachDone: true, midRun: st }));
        return "Q" + st.turn + " " + st.phase + (st.fy.fight ? " vs " + st.fy.fight.opp : "");
      }, DRIVER, shape);
      if (!ok || ok === "nofight") { errors.push("no state for " + name + " " + ok); continue; }
      await page.goto(origin, { waitUntil: "networkidle0" });
      await click("#btn-continue"); await sleep(800);
      for (let k = 0; k < 3 && (await page.$("#fy-boss-ok")); k++) { await click("#fy-boss-ok"); await sleep(400); }
      await page.evaluate(() => { const p = document.getElementById("penny"); if (p) p.hidden = true; });
      if (open === "fight") await page.waitForFunction(() => { const d = document.getElementById("door"); return d && !d.hidden && d.classList.contains("on"); }, { timeout: 15000 }).catch(() => errors.push("no fight door " + name));
      else await page.waitForSelector("#screen-desk.on");
      if (open === "bunker") { await click("#bunker-card"); await sleep(900); const r = await page.$('.bk-view [data-room].ld-act'); if (r) { await click('.bk-view [data-room].ld-act'); await sleep(500); } }
      await ready(); await sleep(1900);
      const h = await page.evaluate(() => {
        const a = document.getElementById("ld-arrow"), on = document.querySelector(".ld-primary");
        return {
          pins: document.querySelectorAll(".desk .pin.ld-act").length,
          endqAct: !!document.querySelector("#btn-endq.ld-act"), endqDim: !!document.querySelector("#btn-endq.ld-dim"),
          bunkerAct: !!document.querySelector("#bunker-card.ld-act"),
          orders: document.querySelectorAll("#bk-panel .ld-act, .bk-view [data-room].ld-act").length,
          cards: document.querySelectorAll("#door .df-hand .dc.ld-act").length,
          endroundAct: !!document.querySelector("#df-end.ld-act"),
          arrows: document.querySelectorAll(".ld-arrow:not([hidden])").length,
          arrowOn: a && !a.hidden && on ? (on.id || on.getAttribute("data-deal") || on.className.baseVal || on.className) : null
        };
      });
      const f = path.join(OUT, vp + "-" + name + ".png");
      await page.screenshot({ path: f });
      await noScroll(vp + " " + name);
      const pass = expect(h);
      if (!pass) errors.push("expect " + vp + " " + name + " " + JSON.stringify(h));
      console.log(pass ? "ok  " : "BAD ", f, ok, JSON.stringify(h));
    }
  }
  /* Tab badge + reduced motion, on the last loaded desk (End Quarter state) */
  await page.setViewport({ width: 800, height: 1280, deviceScaleFactor: 1 });
  await page.reload({ waitUntil: "networkidle0" });
  await click("#btn-continue"); await sleep(900);
  await page.evaluate(() => { const p = document.getElementById("penny"); if (p) p.hidden = true; const H = window.LD.highlightDebug(); H.seen.holdings = "stale"; window.LD.applyHighlights(); });
  const badge = await page.evaluate(() => !!document.querySelector('.lens-btn[data-lens="holdings"].ld-new') && !document.querySelector('.lens-btn[data-lens="mood"].ld-new'));
  if (!badge) errors.push("holdings tab badge missing");
  await sleep(1500); await page.screenshot({ path: path.join(OUT, "800x1280-07-tab-badge.png") });
  await click('.lens-btn[data-lens="holdings"]'); await sleep(500);
  const cleared = await page.evaluate(() => { document.querySelector('.lens-btn[data-lens="none"]').click(); return true; });
  await sleep(400);
  if (await page.evaluate(() => !!document.querySelector('.lens-btn[data-lens="holdings"].ld-new'))) errors.push("holdings badge did not clear after viewing");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await sleep(300);
  const rm = await page.evaluate(() => { const n = document.querySelector("#btn-endq.ld-act"); if (!n) return "no target"; const cs = getComputedStyle(n); return cs.animationName + "|" + cs.outlineStyle; });
  if (!/^none\|dashed$/.test(rm)) errors.push("reduced motion still animates: " + rm);
  console.log("badge", badge, "reduced-motion", rm, "cleared", cleared);
  await browser.close(); server.close();
  const u = [...new Set(errors)];
  if (u.length) { console.error("ISSUES\n" + u.join("\n")); process.exit(1); }
  console.log("HIGHLIGHT SHOTS OK");
})().catch((e) => { console.error(e); process.exit(1); });
