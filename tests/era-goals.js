#!/usr/bin/env node
"use strict";
/* Era goals: data, upgrades, goals at Q4/Q8, carry-over caps, v1 -> v2 migration, classic runs untouched. */
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
let n = 0, bad = 0;
function ok(c, m) { n++; if (!c) { bad++; console.log("FAIL " + m); } }
const clone = (x) => JSON.parse(JSON.stringify(x));
function run(exec) { return LD.createRun({ seed: "era-t", executiveId: exec || "mara", rating: 0, perks: [], packs: [], ruleset: "house" }); }
function toBunker(s) { s = clone(s); s.phase = "bunker"; s.dealPickedThisTurn = true; return s; }
function close(s) { s = clone(s); if (s.fy) { s.fy.fight = null; s.fy.reward = null; s.fy.memo = null; s.fy.draft = null; } s.phase = "bunker"; s.dealPickedThisTurn = true; const r = LD.closeQuarter(s, { bossChoice: "pay" }); return r.state; }

/* fresh run */
let s = run();
ok(s.house.era && s.house.era.v === LD.ERA_SAVE_V, "fresh house run has era block v" + LD.ERA_SAVE_V);
ok(LD.eraAct(s) === 1, "Q1 is era 1");
ok(s.house.era.company.power.lv === 1 && ["water", "air", "food"].every((k) => s.house.era.company[k].lv === 0) && LD.ERA_SLOTS.every((k) => s.house.era.island[k].lv === 0), "HQ opens at Lv 1, the rest at Lv 0");
ok(LD.eraSlotName(s, 1, "water") === "The Works" && LD.eraSlotName(run("reid"), 1, "water") === "The Refinery", "Works name per exec");
/* guards */
ok(/deal/i.test(LD.eraUpgrade(s, "power").error), "needs a deal first");
s = toBunker(s); s.cash = 100;
let r = LD.eraUpgrade(s, "power");
ok(r.ok && r.state.house.era.company.power.build === 2 && r.state.cash === 82, "HQ Lv2 order costs $18M, building");
ok(!LD.eraUpgrade(r.state, "water").ok, "one holdings order a quarter");
ok(r.state.bunkerActedThisTurn === s.bunkerActedThisTurn, "holdings order does not spend the house act");
/* builds land at close */
let t = close(r.state);
ok(t.house.era.company.power.lv === 2 && t.house.era.company.power.build === 0, "build finishes at close");
/* full company, goal met at Q4 */
s = run(); s.cash = 400;
const order = ["water", "air", "food", "water"];
for (let q = 1; q <= 4; q++) { s = toBunker(s); const u = LD.eraUpgrade(s, order[q - 1]); ok(u.ok, "Q" + q + " order " + order[q - 1]); s = close(u.state); s.cash = Math.max(s.cash, 300); s.unrest = 10; s.collapse = 20; }
ok(s.turn === 5 && s.house.era.goals[1] === "met", "1978 goal met at Q4 -> Q5");
ok(s.house.era.island.water.lv === 1 && ["power", "air", "food"].every((k) => s.house.era.island[k].lv === 0), "only the Lv 2 facility opens its island site");
/* Lv2 facility opens its site at Lv1 (cap 1), Lv3 gives a discount */
s = run(); s.house.era.company.water.lv = 3; s.house.era.company.power.lv = 2; s.house.era.company.air.lv = 1; s.house.era.company.food.lv = 1; s.turn = 4; s.house.era.bank = 20;
s = close(s);
ok(s.house.era.island.water.lv === 1 && s.house.era.island.power.lv === 1 && s.house.era.island.air.lv === 0, "Lv2+ opens island site at Lv1 only");
ok(s.house.era.discount.water && !s.house.era.discount.power, "Lv3 facility gives a site discount");
ok(s.house.era.bank === 30, "Offshore bank (20 + 4 banked at Q4) +25% into 2008: " + s.house.era.bank);
const bank0 = s.house.era.bank;
s = toBunker(s); s.cash = 0;
const c = LD.eraUpgradeCost(s, "water");
ok(c === Math.round(22 * 0.75), "discounted Desal Lv2 cost " + c);
r = LD.eraUpgrade(s, "water");
ok(r.ok && r.state.house.era.bank === bank0 - c && r.state.cash === 0, "island build paid from Offshore first");
/* missed goal */
s = run(); s.turn = 4; s = close(s);
ok(s.house.era.goals[1] === "missed", "1978 goal missed with nothing built");
/* inheritance at Q8 -> Q9 with caps */
s = run(); s.turn = 8; s.cash = 200;
LD.ERA_SLOTS.forEach((k) => { s.house.era.island[k].lv = 3; s.house.rooms[k] = { on: false, by: null, base: null, quality: "sound" }; });
s.house.era.bank = 100; s.house.era.goals[1] = "met"; const st0 = s.house.stores;
s = close(s);
ok(s.house.era.goals[2] === "met", "2008 goal met");
const on = LD.ERA_SLOTS.filter((k) => s.house.rooms[k].on);
ok(on.length === LD.ERA_INHERIT_ROOMS_CAP, "inheritance switches on at most " + LD.ERA_INHERIT_ROOMS_CAP + " rooms (got " + on.length + ")");
ok(on.every((k) => s.house.rooms[k].quality === "sound" && s.house.rooms[k].base === "island"), "Lv3 sites give sound rooms");
const inh = s.house.era.inherited;
ok(inh && inh.stores === LD.ERA_BANK_STORES_CAP + 3, "stores = capped bank stores + villa lv");
ok(s.house.era.bank === 0, "bank emptied into the bunker");
ok(s.bunker[on[0]].level === LD.WIN_LEVEL, "bunker synced from inherited room");
/* Lv1 site recertifies a cheap room, does not switch one on */
s = run(); s.turn = 8; s.house.era.island.power.lv = 1; s.house.rooms.power = { on: true, by: "spoil", base: "spoil", quality: "cheap" }; s.house.rooms.water = { on: false, by: null, base: null, quality: "sound" }; s.house.era.island.water.lv = 1;
s = close(s);
ok(s.house.rooms.power.quality === "sound" && !s.house.rooms.water.on, "Lv1 site: recertify only");
/* era 3: no more orders */
s = toBunker(s); s.cash = 999;
ok(/bunker/i.test(LD.eraUpgrade(s, "power").error), "no holdings orders in era 3");
/* migration: v1 save (no era block) */
const v1 = run(); delete v1.house.era; v1.turn = 6;
const m = LD.adoptRun(clone(v1));
ok(m.house.era && m.house.era.v === 2 && m.house.era.goals[1] === "legacy" && m.house.era.goals[2] == null, "v1 save at Q6: era added, 1978 marked legacy");
const v1b = run(); delete v1b.house.era; v1b.turn = 10;
const m2 = LD.adoptRun(clone(v1b));
ok(m2.house.era.goals[2] === "legacy" && m2.house.era.inherited && m2.house.era.inherited.legacy, "v1 save at Q10: no late inheritance");
const m2c = close(m2);
ok(LD.ERA_SLOTS.every((k) => m2c.house.rooms[k].on === m2.house.rooms[k].on), "legacy run rooms untouched by era code");
const v1c = run(); delete v1c.house.era; v1c.turn = 1;
ok(LD.adoptRun(clone(v1c)).house.era.legacy === 0, "v1 save at Q1 plays era goals normally");
/* shop runs untouched */
const shop = LD.createRun({ seed: "era-shop", executiveId: "mara", rating: 0, perks: [], packs: [], ruleset: "shop" });
ok(!shop.house, "shop run has no house/era");
ok(!LD.eraUpgrade(toBunker(shop), "power").ok, "shop run cannot order holdings");
/* every exec */
["mara", "reid", "imani", "julian", "soren", "cassius"].forEach((ex) => { const q = run(ex); ok(q.house.era && LD.eraSlotName(q, 1, "water"), ex + " has era block"); });
console.log((bad ? "FAILED " + bad + " of " : "OK ") + n + " era checks");
process.exit(bad ? 1 : 0);
