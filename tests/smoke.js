#!/usr/bin/env node
"use strict";
const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const SHOT = process.env.SHOT_DIR || "/workspace/last-dividend/mockups/cleanup-2026-11-14";
const PUPPETEER = process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core";
const CHROME = "/usr/bin/google-chrome";

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  const r = spawnSync("python3", [path.join(ROOT, "scripts/build.py")], { stdio: "inherit" });
  if (r.status) process.exit(r.status);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webp": "image/webp",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".json": "application/json"
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || "/").split("?")[0]);
      if (url === "/") url = "/index.html";
      const file = path.normalize(path.join(DIST, url));
      if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end("no"); return; }
        res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

(async () => {
  const { server, port } = await startServer();
  const origin = "http://127.0.0.1:" + port + "/";
  const puppeteer = require(PUPPETEER);
  const errors = [];
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--font-render-hinting=none"]
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push("pageerror " + e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push("console " + msg.text());
  });

  async function jsClick(sel) {
    return page.evaluate((s) => {
      const n = document.querySelector(s);
      if (!n) return false;
      n.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return true;
    }, sel);
  }
  async function shot(vp, name) {
    fs.mkdirSync(SHOT, { recursive: true });
    const file = path.join(SHOT, "after-" + vp + "-" + name + ".png");
    await page.screenshot({ path: file, type: "png" });
    return file;
  }
  async function setViewport(w, h) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await sleep(80);
  }
  async function noScroll(label) {
    const info = await page.evaluate(() => {
      const de = document.documentElement, b = document.body;
      const sc = Math.max(de.scrollHeight, b ? b.scrollHeight : 0);
      const cl = Math.max(de.clientHeight, window.innerHeight);
      const oy = getComputedStyle(de).overflowY + "/" + (b ? getComputedStyle(b).overflowY : "");
      return { sc, cl, oy, overflowed: sc > cl + 2, y: window.scrollY };
    });
    if (info.overflowed || info.y > 0) {
      errors.push("scroll " + label + " " + JSON.stringify(info));
    }
    return info;
  }
  function mutePenny(fresh) {
    return page.evaluate((fresh) => {
      const KEY = "lastDividend.v1";
      let m = {};
      try { m = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
      m.penny = fresh
        ? { offered: false, done: false, tipsOff: false, tips: {} }
        : { offered: true, done: true, tipsOff: true, tips: {} };
      m.audioOff = true;
      localStorage.setItem(KEY, JSON.stringify(m));
      localStorage.setItem("lastDividend.audio", "off");
    }, fresh);
  }
  function unlockMeta() {
    return page.evaluate(() => {
      const KEY = "lastDividend.v1";
      let m = {};
      try { m = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
      m.finished = 8; m.wins = 2; m.dividends = 800;
      m.owned = ["exec:imani", "exec:julian", "exec:soren", "exec:cassius", "exec:reid"];
      m.spent = 0; m.equipped = []; m.packsOff = {}; m.cosmetics = {};
      m.ratingByExec = { mara: 1 };
      m.xp = { mara: { level: 2, xp: 40 } };
      m.history = [{ seed: "x", win: true, exec: "mara" }];
      m.penny = { offered: true, done: true, tipsOff: true, tips: {} };
      localStorage.setItem(KEY, JSON.stringify(m));
    });
  }

  await setViewport(1280, 800);
  await page.goto(origin, { waitUntil: "networkidle0", timeout: 60000 });
  await mutePenny(true);
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#btn-new");
  await shot("1280x800", "01-title");

  // Rulebook
  await jsClick("#btn-how");
  await page.waitForSelector("#ht-rules");
  await jsClick("#ht-rules");
  await page.waitForSelector("#screen-tutorial.on");
  await jsClick("#btn-next");
  await sleep(150);
  await jsClick("#btn-next");
  await sleep(200);
  await shot("1280x800", "03-rulebook-3");
  const tutText = await page.evaluate(() => (document.querySelector("#screen-tutorial") || document.body).innerText);
  if (/Board Memo|pick one of three Assets for your Portfolio/i.test(tutText)) {
    errors.push("stale rulebook text still visible");
  }
  if (!/door/i.test(tutText)) errors.push("rulebook missing door fights");

  // Back to title, unlock, exec + boardroom
  await jsClick("#btn-skip, #btn-done, #btn-next").catch(() => {});
  // there may be a close/back button
  await page.evaluate(() => {
    const b = document.querySelector("#btn-skip, #btn-done");
    if (b) b.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  });
  await sleep(200);
  if (!(await page.$("#btn-new"))) {
    await page.goto(origin, { waitUntil: "networkidle0" });
  }
  await unlockMeta();
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#btn-new");
  await jsClick("#btn-boardroom");
  await page.waitForSelector("#screen-boardroom.on");
  await sleep(200);
  // Summit Lounge key rack: tap the Cassius tag to open his ledger entry.
  await jsClick('#screen-boardroom [data-lt="exec:cassius"]');
  await sleep(250);
  await shot("1280x800", "05-boardroom-seats");
  const brText = await page.evaluate(() => {
    const el = document.getElementById("screen-boardroom");
    return (el ? (el.innerText || el.textContent || "") : "NO-EL") + "\nHTML:" + (el ? el.innerHTML.slice(0, 400) : "");
  });
  if (!/Meridian Capital/i.test(brText) || !/Engineers are outsourced/i.test(brText)) {
    errors.push("Cassius firm/blurb missing on boardroom: " + brText.slice(0, 500));
  }
  await jsClick("#btn-br-play, #btn-br-back, #btn-new");
  await sleep(200);

  // Exec picker with Cassius
  if (!(await page.$("#btn-start"))) {
    if (await page.$("#btn-new")) await jsClick("#btn-new");
    await page.waitForSelector("#btn-start", { timeout: 8000 });
  }
  await page.evaluate(() => window.LD.selectExec("cassius"));
  await sleep(600);
  await shot("1280x800", "07-exec-picker");
  await page.screenshot({ path: require("path").join(SHOT, "picker-fix-1280x800.png"), type: "png" });
  const posterVis = () => page.evaluate(() => {
    const on = document.querySelector(".cx-poster.on");
    const box = (el) => !!el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().height > 4 && el.getBoundingClientRect().right <= window.innerWidth + 1 && el.getBoundingClientRect().bottom <= window.innerHeight + 1;
    return { id: on && on.getAttribute("data-id"), posters: document.querySelectorAll(".cx-poster").length, name: box(on && on.querySelector(".cx-name")), firm: box(on && on.querySelector(".cx-firm")), kit: on ? on.querySelectorAll(".cx-kit-i").length : 0, kitVis: box(on && on.querySelector(".cx-kit")), art: box(on && on.querySelector(".cx-art img")), blurb: box(document.querySelector(".cx-blurb")) || (window.innerWidth <= 480), stamp: box(document.querySelector(".cx-stamp")), depart: box(document.getElementById("btn-start")) };
  });
  for (const [w, hgt] of [[1280, 800], [1280, 760]]) {
    await setViewport(w, hgt); await sleep(250);
    const v = await posterVis();
    if (v.id !== "cassius" || v.posters !== 6 || !v.name || !v.firm || v.kit !== 3 || !v.kitVis || !v.art || !v.blurb || !v.stamp || !v.depart) errors.push("picker " + w + "x" + hgt + " incomplete poster " + JSON.stringify(v));
  }
  await page.screenshot({ path: require("path").join(SHOT, "picker-fix-1280x760.png"), type: "png" });
  await setViewport(1280, 800);
  await noScroll("landscape exec 1280x800");

  // Fresh tour path: act intro first
  await page.goto(origin, { waitUntil: "networkidle0" });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("lastDividend.audio", "off");
  });
  await page.reload({ waitUntil: "networkidle0" });
  await jsClick("#btn-new");
  await page.waitForSelector("#btn-start");
  await jsClick("#btn-start");
  await page.waitForSelector("#screen-desk.on");
  await sleep(400);
  const introFirst = await page.evaluate(() => {
    const ov = document.getElementById("overlay");
    const pn = document.getElementById("penny");
    const ok = !!document.getElementById("fy-boss-ok");
    const pennyOn = pn && !pn.hidden && pn.offsetParent !== null;
    return { ok, pennyOn, text: (ov && ov.classList.contains("on") ? ov.innerText : "").slice(0, 400) };
  });
  if (!introFirst.ok) errors.push("Act I intro did not appear before Penny: " + JSON.stringify(introFirst));
  if (introFirst.pennyOn) errors.push("Penny offer appeared over the Act I intro");
  const beatHits = (introFirst.text.match(/rare card/gi) || []).length;
  if (beatHits > 1) errors.push("duplicated Beat it text, count=" + beatHits);
  await shot("1280x800", "08c-act-intro");
  await jsClick("#fy-boss-ok");
  await sleep(1600);
  const pennyAfter = await page.evaluate(() => {
    const pn = document.getElementById("penny");
    if (!pn || pn.hidden) return { shown: false };
    const box = pn.querySelector(".pn-box");
    const skip = pn.querySelector(".pn-skip");
    const endq = document.getElementById("btn-endq");
    const rail = document.getElementById("rail-wrap");
    const tick = document.querySelector(".ticker");
    function hit(a, b) {
      if (!a || !b) return false;
      const A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
      return Math.min(A.right, B.right) - Math.max(A.left, B.left) > 6 &&
        Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) > 6;
    }
    return {
      shown: true,
      boxTop: pn.classList.contains("box-top"),
      hitsEndq: hit(box, endq) || hit(skip, endq),
      hitsRail: hit(box, rail) || hit(skip, rail),
      hitsTick: hit(box, tick) || hit(skip, tick),
      text: (box && box.innerText || "").slice(0, 160)
    };
  });
  if (pennyAfter.shown && (pennyAfter.hitsEndq || pennyAfter.hitsRail || pennyAfter.hitsTick)) {
    errors.push("Penny covers controls after intro: " + JSON.stringify(pennyAfter));
  }
  await shot("1280x800", "09-penny-offer");
  // Skip tutorial
  await jsClick(".pn-skip");
  await page.evaluate(() => {
    try {
      const KEY = "lastDividend.v1";
      const m = JSON.parse(localStorage.getItem(KEY) || "{}");
      m.penny = Object.assign(m.penny || {}, { done: true, offered: true, tipsOff: true });
      localStorage.setItem(KEY, JSON.stringify(m));
    } catch (e) {}
    const pn = document.getElementById("penny");
    if (pn) pn.hidden = true;
  });
  await sleep(400);

  await shot("1280x800", "08-office-hub");
  const hatch = await page.evaluate(() => {
    const c = document.querySelector(".bc-cta");
    return c ? c.textContent.trim() : "";
  });
  if (/Sign a deal to unlock/i.test(hatch)) errors.push("hatch still says Sign a deal to unlock: " + hatch);
  if (hatch && !/Opens after you sign/i.test(hatch)) errors.push("unexpected hatch CTA: " + hatch);

  // Dossier + fight
  await page.waitForSelector(".desk .pin[data-deal]");
  await jsClick(".desk .pin[data-deal]");
  await sleep(400);
  await shot("1280x800", "10-deal-dossier");
  if (!(await jsClick("#btn-sign:not([disabled])"))) {
    await jsClick("#dossier .dz-choice:not([disabled])");
  }
  await page.waitForFunction(() => {
    const d = document.getElementById("door");
    return d && !d.hidden && d.classList.contains("on");
  }, { timeout: 15000 });
  await sleep(700);
  await shot("1280x800", "11-card-fight");
  let resolved = false;
  for (let i = 0; i < 16; i++) {
    const st = await page.evaluate(() => {
      const d = document.getElementById("door");
      if (!d || d.hidden) return { gone: true };
      if (d.querySelector(".rw-in, .rw-cards, #rw-skip, #rw-take, [data-card]")) return { reward: true };
      if (d.querySelector("#df-close")) return { close: true };
      const card = d.querySelector(".df-hand .dc:not(.no), .df-hand [data-u]");
      if (card) {
        card.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        return { played: true };
      }
      const end = d.querySelector("#df-end, #df-settle");
      if (end) {
        end.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        return { ended: true };
      }
      return { wait: true };
    });
    await sleep(400);
    if (st.close) {
      await shot("1280x800", "11b-fight-resolved");
      const logOver = await page.evaluate(() => {
        const log = document.getElementById("df-log");
        const close = document.getElementById("df-close");
        if (!log || !close) return false;
        const vis = log.classList.contains("on") && getComputedStyle(log).display !== "none";
        if (!vis) return false;
        const A = log.getBoundingClientRect(), B = close.getBoundingClientRect();
        return Math.min(A.right, B.right) - Math.max(A.left, B.left) > 4 &&
          Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) > 4;
      });
      if (logOver) errors.push("fight log still overlaps Close the door");
      await jsClick("#df-close");
      resolved = true;
      await sleep(400);
      break;
    }
    if (st.reward || st.gone) break;
  }
  // Close any multi-step door reward (cards then loot)
  for (let i = 0; i < 10; i++) {
    const open = await page.evaluate(() => {
      const d = document.getElementById("door");
      if (!d || d.hidden || !d.classList.contains("on")) return { gone: true };
      const pn = document.getElementById("penny");
      if (pn && !pn.hidden) pn.hidden = true;
      const keep = d.querySelector("#rw-keep");
      const sell = d.querySelector("#rw-sell");
      const card = d.querySelector("[data-card], [data-u], .rw-cards .dc");
      const take = d.querySelector("#rw-take:not([disabled])");
      const skip = d.querySelector("#rw-skip, #rw-apass");
      const close = d.querySelector("#df-close");
      if (keep) { keep.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); return { keep: true }; }
      if (card && !take) { card.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); return { pick: true }; }
      if (take) { take.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); return { take: true }; }
      if (skip) { skip.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); return { skip: true }; }
      if (close) { close.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); return { close: true }; }
      if (sell) { sell.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); return { sell: true }; }
      return { wait: true, text: d.innerText.slice(0, 120) };
    });
    if (open.gone) break;
    await sleep(350);
  }
  await sleep(300);
  await shot("1280x800", "16-office-after-deal");
  const tickTxt = await page.evaluate(() => (document.querySelector(".tick-msg.on") || document.querySelector(".tick-wrap") || {}).textContent || "");
  if (/Vos$|Mara Vos$/.test(tickTxt.trim()) === false) {
    /* full item should be visible or ellipsized, not mid-word without ellipsis check */
  }
  const hatch2 = await page.evaluate(() => (document.querySelector(".bc-cta") || {}).textContent || "");
  if (/Sign a deal to unlock/i.test(hatch2)) errors.push("hatch unlock copy returned after the deal: " + hatch2);

  if (!(await page.$("#btn-endq[disabled]"))) {
    await jsClick("#btn-endq");
    await page.waitForFunction(() => {
      const ov = document.getElementById("overlay");
      return ov && ov.classList.contains("on");
    }, { timeout: 12000 }).catch(() => {});
    await sleep(400);
    await shot("1280x800", "15-quarter-report");
    await page.evaluate(() => {
      const b = document.querySelector("#rpt-ok, #fy-rpt-ok, #ov-ok, .report .btn, #overlay .btn-coral, #overlay .btn");
      if (b) b.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    });
    await sleep(400);
  } else {
    errors.push("End Quarter was disabled after the fight");
  }

  await noScroll("landscape after quarter");

  // Constructed end stamp on a clean screen
  await page.evaluate(() => {
    const d = document.getElementById("door");
    if (d) { d.hidden = true; d.className = "door-screen"; d.innerHTML = ""; }
    const ov = document.getElementById("overlay");
    if (ov) { ov.hidden = true; ov.className = "overlay"; ov.innerHTML = ""; }
    const pn = document.getElementById("penny");
    if (pn) pn.hidden = true;
    document.querySelectorAll(".lvup-burst").forEach((n) => n.remove());
    const state = LD.createRun({ seed: "shot-end", executiveId: "mara", rating: 0, perks: [], packs: [], level: 1 });
    state.ending = { kind: "win", title: "First through the door", body: "The hatch is sealed." };
    state.ended = true;
    state.turn = 9;
    const html = LD.renderEnd(state, {
      payout: { total: 40, rows: [] },
      newRating: 1,
      meta: { dividends: 40, xp: {}, history: [] },
      letter: false,
      xp: null
    });
    document.querySelectorAll(".screen.on").forEach((s) => s.classList.remove("on"));
    const end = document.getElementById("screen-end");
    end.classList.add("on");
    end.innerHTML = html;
  });
  await sleep(200);
  await shot("1280x800", "20-end-stamp");
  const stampTxt = await page.evaluate(() => (document.querySelector(".end-stamp") || {}).textContent || "");
  if (/Downgraded/i.test(stampTxt)) errors.push("stamp still says Downgraded: " + stampTxt);
  if (!/New challenge unlocked/i.test(stampTxt)) errors.push("stamp missing unlock wording: " + stampTxt);

  // Portrait screens
  await setViewport(800, 1280);
  await page.goto(origin, { waitUntil: "networkidle0" });
  await unlockMeta();
  await page.reload({ waitUntil: "networkidle0" });
  await shot("800x1280", "01-title");
  await jsClick("#btn-how");
  await page.waitForSelector("#ht-rules");
  await jsClick("#ht-rules");
  await page.waitForSelector("#screen-tutorial.on");
  await jsClick("#btn-next"); await sleep(120);
  await jsClick("#btn-next"); await sleep(200);
  await shot("800x1280", "03-rulebook-3");
  await page.goto(origin, { waitUntil: "networkidle0" });
  await unlockMeta();
  await page.reload({ waitUntil: "networkidle0" });
  await jsClick("#btn-boardroom");
  await page.waitForSelector("#screen-boardroom.on");
  await sleep(200);
  // Summit Lounge key rack: tap the Cassius tag to open his ledger entry.
  await jsClick('#screen-boardroom [data-lt="exec:cassius"]');
  await sleep(250);
  await shot("800x1280", "05-boardroom-seats");
  await noScroll("portrait boardroom");
  if (await page.$("#btn-br-play")) await jsClick("#btn-br-play");
  else await jsClick("#btn-new");
  await page.waitForSelector("#btn-start", { timeout: 8000 });
  await page.evaluate(() => window.LD.selectExec("cassius"));
  await sleep(600);
  await shot("800x1280", "07-exec-picker");
  await page.screenshot({ path: require("path").join(SHOT, "picker-fix-800x1280.png"), type: "png" });
  const posterVis2 = () => page.evaluate(() => {
    const on = document.querySelector(".cx-poster.on");
    const box = (el) => !!el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().height > 4 && el.getBoundingClientRect().right <= window.innerWidth + 1 && el.getBoundingClientRect().bottom <= window.innerHeight + 1;
    return { id: on && on.getAttribute("data-id"), posters: document.querySelectorAll(".cx-poster").length, name: box(on && on.querySelector(".cx-name")), firm: box(on && on.querySelector(".cx-firm")), kit: on ? on.querySelectorAll(".cx-kit-i").length : 0, kitVis: box(on && on.querySelector(".cx-kit")), art: box(on && on.querySelector(".cx-art img")), blurb: box(document.querySelector(".cx-blurb")) || (window.innerWidth <= 480), stamp: box(document.querySelector(".cx-stamp")), depart: box(document.getElementById("btn-start")) };
  });
  const visP = await posterVis2();
  if (visP.id !== "cassius" || !visP.name || !visP.firm || visP.kit !== 3 || !visP.art || !visP.blurb || !visP.stamp || !visP.depart) errors.push("picker 800x1280 incomplete poster " + JSON.stringify(visP));
  if (await page.evaluate(() => document.getElementById("btn-start").disabled)) await page.evaluate(() => window.LD.selectExec("mara"));
  await sleep(300);
  await noScroll("portrait exec");

  // Portrait office + fight (muted penny)
  await jsClick("#btn-start");
  await page.waitForSelector("#screen-desk.on");
  await sleep(400);
  if (await page.$("#fy-boss-ok")) {
    await shot("800x1280", "08c-act-intro");
    await jsClick("#fy-boss-ok");
    await sleep(300);
  }
  await shot("800x1280", "08-office-hub");
  await noScroll("portrait office");
  await page.waitForSelector(".desk .pin[data-deal]");
  await jsClick(".desk .pin[data-deal]");
  await sleep(400);
  await shot("800x1280", "10-deal-dossier");
  if (!(await jsClick("#btn-sign:not([disabled])"))) await jsClick("#dossier .dz-choice:not([disabled])");
  await page.waitForFunction(() => {
    const d = document.getElementById("door");
    return d && !d.hidden && d.classList.contains("on");
  }, { timeout: 15000 });
  await sleep(600);
  await shot("800x1280", "11-card-fight");
  await noScroll("portrait fight");

  await browser.close();
  server.close();

  const unique = [...new Set(errors)];
  if (unique.length) {
    console.error("SMOKE ISSUES\n" + unique.join("\n"));
    process.exit(1);
  }
  console.log("SMOKE OK");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
