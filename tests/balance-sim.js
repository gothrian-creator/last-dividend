#!/usr/bin/env node
"use strict";
/* Whole-run balance: the shared driver plays complete runs (building the bunker) and tallies how they end. */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "tests/run-tests.js"), "utf8");
const JS_NAMES = JSON.parse(src.match(/const JS_NAMES = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
const elStub = { style: { setProperty() {}, getPropertyValue() { return ""; } }, setAttribute() {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, getBoundingClientRect() { return {}; } };
const ctx = { console, setTimeout, clearTimeout, module: { exports: {} }, exports: {}, addEventListener() {}, removeEventListener() {}, requestAnimationFrame() { return 0; }, innerWidth: 1280, innerHeight: 800, visualViewport: { addEventListener() {} }, matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; }, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} } };
ctx.globalThis = ctx; ctx.window = ctx;
ctx.document = { documentElement: elStub, body: elStub, getElementById: () => elStub, querySelector: () => elStub, querySelectorAll: () => [], createElement: () => elStub, addEventListener() {} };
vm.createContext(ctx);
for (const n of JS_NAMES) vm.runInContext(fs.readFileSync(path.join(ROOT, "src/js", n), "utf8"), ctx, { filename: n });
const LD = ctx.LD;
const eraDrive = new Function("module", fs.readFileSync(path.join(ROOT, "tests/era-driver.js"), "utf8") + "; return eraDrive;")(undefined);
const N = +(process.env.N || 20), EX = ["mara", "reid", "imani", "julian", "soren", "cassius"], ST = ["bribe", "crush", "any"];
const out = {}, all = { n: 0, win: 0, q: 0, collapse: 0, unrest: 0 };
for (const style of ST) for (let i = 0; i < N; i++) {
  const s = eraDrive(LD, { seed: "bal-" + i, exec: EX[i % 6], style, build: true, takeCards: true, full: true, smart: !!process.env.SMART });
  LD.applyEra(0);
  const o = out[style] = out[style] || { n: 0, win: 0, reasons: {}, q: 0 };
  o.n++; all.n++;
  if (!s) { o.reasons.stuck = (o.reasons.stuck || 0) + 1; continue; }
  const e = s.ending || {}, win = e.kind === "win";
  if (win) { o.win++; all.win++; }
  const k = (e.kind || "?") + ":" + (e.reason || ""); o.reasons[k] = (o.reasons[k] || 0) + 1; o.q += s.turn; all.q += s.turn; all.collapse += s.collapse | 0; all.unrest += s.unrest | 0;
}
Object.keys(out).forEach((k) => { const o = out[k]; console.log("STYLE", k, "win " + o.win + "/" + o.n, "avgQ " + (o.q / o.n).toFixed(1), JSON.stringify(o.reasons)); });
console.log("ALL win " + all.win + "/" + all.n + " (" + Math.round(100 * all.win / all.n) + "%) avgQ " + (all.q / all.n).toFixed(1) + " end collapse " + (all.collapse / all.n).toFixed(0) + " end unrest " + (all.unrest / all.n).toFixed(0));
