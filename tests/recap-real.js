#!/usr/bin/env node
"use strict";
/* Real path: a saved Reid run at unrest 100 in Q6, Continue, End Quarter -> recap plays, saves, then opens on the final page on revisit. */
const fs = require("fs"), http = require("http"), path = require("path");
const DIST = path.resolve(__dirname, "..", "dist");
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const server = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split("?")[0]); if (u === "/") u = "/index.html"; fs.readFile(path.join(DIST, u), (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.end(d); }); });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port + "/";
  const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const p = await b.newPage(); const errors = [];
  p.on("pageerror", (e) => errors.push("pageerror " + e.message));
  await p.setViewport({ width: 800, height: 1280 });
  await p.goto(origin, { waitUntil: "networkidle0" });
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem("lastDividend.audio", "off");
    let s = LD.createRun({ seed: "real-recap", executiveId: "reid", rating: 0, perks: [], packs: [], level: 1 });
    s.turn = 6; s.phase = "bunker"; s.dealPickedThisTurn = true; s.unrest = 100; s.ap = 0;
    s.track.eraQ[2] = 5; s.track.deals.push({ q: 3, id: "x", title: "Blackout Insurance", cash: 22 });
    s.fy.fates = { dunn: { how: "paid", q: 2 }, mickey: { how: "crushed", q: 3 } }; s.fy.fight = null; s.fy.reward = null; s.fy.memo = null;
    localStorage.setItem("lastDividend.v1", JSON.stringify({ penny: { offered: true, done: true, tipsOff: true, tips: {} }, seenTutorial: true, dividends: 10, finished: 0, wins: 0, midRun: s }));
  });
  await p.reload({ waitUntil: "networkidle0" }); await sleep(400);
  await p.evaluate(() => document.getElementById("btn-continue").click()); await sleep(2500);
  await p.evaluate(() => { const ov = document.getElementById("overlay"); if (ov && !ov.hidden) { const bt = ov.querySelector(".btn"); if (bt) bt.click(); } });
  await p.evaluate(() => { const e = document.getElementById("btn-endq"); if (e) e.click(); }); await sleep(600);
  for (let i = 0; i < 12 && !(await p.$("#screen-end.on #rc")); i++) { await p.evaluate(() => { const ov = document.getElementById("overlay"); if (ov && !ov.hidden) { const bt = ov.querySelector("button"); if (bt) bt.click(); } }); await sleep(700); }
  const st = await p.evaluate(() => ({ rc: !!document.querySelector("#screen-end.on #rc"), tpl: (document.getElementById("rc") || {}).getAttribute && document.getElementById("rc").getAttribute("data-tpl"), final: !!document.querySelector("#rc.final"), meta: JSON.parse(localStorage.getItem("lastDividend.v1")), seen: localStorage.getItem("lastDividend.recapSeen") }));
  if (!st.rc) errors.push("recap did not open after the run ended");
  if (st.tpl !== "reid-2008") errors.push("template " + st.tpl);
  if (st.final) errors.push("first view should play, not open final");
  if (!st.meta || st.meta.finished !== 1 || !(st.meta.dividends > 10)) errors.push("reward logic changed: " + JSON.stringify(st.meta && { f: st.meta.finished, d: st.meta.dividends }));
  if (!st.seen) errors.push("recap not marked seen");
  await p.screenshot({ path: "/workspace/last-dividend/mockups/endrun-build-2026-11-15/real-run-recap-playing.png" });
  await sleep(16000);
  const tags = await p.evaluate(() => [...document.querySelectorAll(".rc-tags b")].map((n) => n.textContent));
  console.log("unlock tags", tags);
  if (!tags.includes("Reid Holtz") && !tags.length) errors.push("no unlock tags");
  /* Leave to the Lounge and come back: final page, no replay of the animation */
  await p.evaluate(() => document.getElementById("btn-end-board").click()); await sleep(500);
  await p.evaluate(() => document.getElementById("btn-br-back").click()); await sleep(500);
  const back = await p.evaluate(() => ({ rc: !!document.querySelector("#screen-end.on #rc.final") }));
  if (!back.rc) errors.push("back from Lounge did not open the final page");
  await p.screenshot({ path: "/workspace/last-dividend/mockups/endrun-build-2026-11-15/real-run-recap-final.png" });
  console.log(errors.length ? "ERRORS\n" + errors.join("\n") : "real recap OK");
  await b.close(); server.close(); process.exit(errors.length ? 1 : 0);
})();
