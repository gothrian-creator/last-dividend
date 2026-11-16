
/* Last Dividend — meta layer: Credit Ratings, Perquisites, Board Mandates, Dividends, Boardroom shop.
   Pure (no DOM). Browser + Node. Reads and writes only plain objects. */
(function (root) {
  var LD = root.LD || (root.LD = {});
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- Credit Ratings (ascension ladder) ---------- */
  /* Each tier adds one modifier on top of every tier before it. */
  /* Fiscal Year ladder: every tier adds a rule (cumulative). Engine-side rules live in LD.fyRules. */
  LD.RATINGS = [
    { id: "AAA", text: "The Fiscal Year: 3 acts, 3 boss quarters, seal from Q9", apply: function () {} },
    { id: "AA+", text: "Guidance raised: bosses hit 6% harder (15% at D)", apply: function () {} },
    { id: "AA", text: "Activist money: 1 in 4 card rewards carries a curse rider", apply: function () {} },
    { id: "A", text: "Tight credit: bunker works +8%", apply: function (m) { m.upgradeMult *= 1.08; } },
    { id: "BBB", text: "Talent war: chief engineer +$6M", apply: function (m) { m.engineerCost += 6; } },
    { id: "BB", text: "Crisis season: every crisis +3 unrest, and Protests start louder (+2)", apply: function () {} },
    { id: "B", text: "Inherited lawsuit: start with a Class Action curse in your deck", apply: function () {} },
    { id: "CCC", text: "Paper trail: delayed fallout ×1.2, and curses can't be shredded in Act III", apply: function (m) { m.delayMult = 1.2; } },
    { id: "CC", text: "Building codes: Discount Lv 2 never holds (Sound or Lv 3 only); Cut Corners cracks half the time", apply: function () {} },
    { id: "C", text: "Credit crunch: start cash −$4M", apply: function (m) { m.startDelta.cash -= 4; } },
    { id: "D", text: "The Reckoning comes early: the final boss lands at Q11, collapse starts 5 higher, and boss fights get a 4th round", apply: function () {} }
  ];
  LD.PERK_CAP_RATING = 5; /* at BB and below only one Perquisite slot works */

  function ratingName(i) { var r = LD.RATINGS[i | 0]; return r ? r.id : "AAA"; }
  /* Base lines pay ×(1 + 0.1·tier); exit lines ×(1 + 0.3·tier). The chip shows the exit multiplier. */
  function ratingBaseMult(i) { return Math.round((1 + 0.1 * (i | 0)) * 10) / 10; }
  function ratingMultiplier(i) { return Math.round((1 + 0.3 * (i | 0)) * 10) / 10; }

  /* ---------- Perquisites (equippable, each with a drawback) ---------- */
  LD.PERKS = [
    { id: "golden", name: "Golden Handshake", price: 80, up: "Start cash +$10M", down: "Start unrest +5",
      apply: function (m) { m.startDelta.cash += 10; m.startDelta.unrest += 5; } },
    { id: "media", name: "Media Darling", price: 100, up: "Soothe deals: unrest −2 more", down: "Squeeze deals pay 10% less",
      apply: function (m) { m.calmBonus += 2; m.squeezeMult *= 0.9; } },
    { id: "regulator", name: "Friendly Regulator", price: 120, up: "First paid crisis response −$5M", down: "Start collapse +3",
      apply: function (m) { m.crisisDiscount = 5; m.startDelta.collapse += 3; } },
    { id: "permits", name: "Pre-Approved Permits", price: 120, up: "First bunker order ignores public-network surcharges and delays", down: "Discount rooms cost +$2M",
      apply: function (m) { m.permitWaivers += 1; m.cheapExtra += 2; } },
    { id: "offshore", name: "Offshore Account", price: 140, up: "Go private keeps 70% of deal cash", down: "Going private costs $10M paperwork",
      apply: function (m) { m.conversionRate = Math.max(m.conversionRate, 0.7); m.conversionFee += 10; } },
    { id: "retainer", name: "Retainer Engineer", price: 150, up: "Engineer costs $14M", down: "Cannot be hired before Q3",
      apply: function (m) { m.engineerCost = 14; m.engineerMinTurn = 3; } },
    { id: "legacy", name: "Legacy Holdings", price: 160, up: "Start owning one extra region", down: "That region starts at stress 2",
      apply: function (m) { m.extraRegion += 1; } }
  ];
  function perkById(id) { for (var i = 0; i < LD.PERKS.length; i++) if (LD.PERKS[i].id === id) return LD.PERKS[i]; return null; }

  /* Build the per-run modifier object. Deterministic per (exec, rating, perks). */
  function buildMods(exec, rating, perks) {
    var m = clone(LD.DEFAULT_MODS);
    m.startDelta = { cash: 0, unrest: 0, collapse: 0 };
    for (var i = 1; i <= rating && i < LD.RATINGS.length; i++) LD.RATINGS[i].apply(m);
    var slots = rating >= LD.PERK_CAP_RATING ? 1 : 2;
    (perks || []).slice(0, slots).forEach(function (id) { var p = perkById(id); if (p) p.apply(m); });
    m.upgradeMult = Math.round(m.upgradeMult * 1000) / 1000;
    return m;
  }

  /* Legacy Holdings: claim an extra, non-crisis region at stress 2. */
  function applyStartWorldMods(state) {
    var n = (state.mods && state.mods.extraRegion) || 0;
    if (!n || !state.world) return;
    var ids = LD.REGION_IDS.slice();
    var start = ids.indexOf(state.world.home);
    for (var k = 1; k < ids.length && n > 0; k++) {
      var id = ids[(start + k) % ids.length];
      var r = state.world.regions[id];
      if (r.owned || r.trait === "crisis") continue;
      r.owned = true;
      r.stress = Math.max(r.stress, 2);
      n -= 1;
      state.log.unshift({ turn: state.turn, text: "Legacy holdings: " + LD.REGION_NAMES[id] + " is already yours. The locals remember." });
    }
    if (LD.placePins) LD.placePins(state);
  }

  /* ---------- Board Mandates (one optional objective per run, +15 ◈) ---------- */
  LD.MANDATE_BONUS = 15;
  LD.MANDATES = [
    { id: "early", text: "Seal before Q7", check: function (s) { return s.turn <= 6; } },
    { id: "public", text: "Never Go private", check: function (s) { return !s.converting; } },
    { id: "empire", text: "Seal while owning 4+ regions", check: function (s) { return LD.ownedCount(s) >= 4; } },
    { id: "calm", text: "Finish with unrest under 30", check: function (s) { return s.unrest < 30; } },
    { id: "sound", text: "Win with every room Sound", check: function (s) { return LD.SYSTEMS.every(function (x) { return s.bunker[x.id].quality === "sound"; }); } },
    { id: "lean", text: "Win with no engineer", check: function (s) { return !s.engineer; } }
  ];
  function mandateById(id) { for (var i = 0; i < LD.MANDATES.length; i++) if (LD.MANDATES[i].id === id) return LD.MANDATES[i]; return null; }
  function pickMandate(seed, execId) {
    var h = LD.hashString("mandate:" + seed + ":" + execId);
    return LD.MANDATES[h % LD.MANDATES.length].id;
  }
  /* Mandates only pay on a successful exit. */
  function mandateMet(state) {
    var m = mandateById(state.mandate);
    if (!m || !state.ending || state.ending.kind !== "win") return false;
    return !!m.check(state);
  }

  /* ---------- Dividends (◈): the Shareholder Letter ---------- */
  function computeDividends(state) {
    var win = !!(state.ending && state.ending.kind === "win");
    var lines = [];
    function add(label, amount, note, kind) { lines.push({ label: label, amount: amount, note: note || "", kind: kind || "base" }); }
    add("Filing fee", 10, "Paid on every run");
    var q = Math.min(state.turn, 12);
    add("Tenure", (win ? 3 : 2) * q, q + " quarters × " + (win ? 3 : 2));
    var fac = 0;
    LD.SYSTEMS.forEach(function (s) {
      var b = state.bunker[s.id];
      if (b.level >= 2) fac += 5;
      if (b.level >= 3) fac += 3;
      if (b.level >= 2 && LD.systemReliable(state, s.id)) fac += 2;
    });
    add("Facilities", fac, "Rooms at Lv2+, Lv3, reliable");
    add("Retained earnings", Math.min(15, Math.floor(Math.max(0, state.cash) / 4)), "Cash ÷ 4, max 15");
    var bosses = state.fy ? state.fy.bosses : 0;
    add("Bosses beaten", 10 * bosses, bosses + " × 10");
    if (win && LD.fyHas && LD.fyHas(state, "penthouse")) {
      var l3 = LD.SYSTEMS.filter(function (s) { return state.bunker[s.id].level >= 3; }).length;
      if (l3) add("Penthouse Suite", 3 * l3, l3 + " Lv 3 room" + (l3 === 1 ? "" : "s") + " × 3", "win");
    }
    if (win) {
      add("Successful exit", 25, "The doors closed with you inside", "win");
      add("Headroom", Math.max(0, Math.floor((90 - state.collapse) / 2)), "Sealed at collapse " + state.collapse, "win");
    }
    var md = mandateById(state.mandate);
    var met = mandateMet(state);
    if (md) add("Board mandate", met ? LD.MANDATE_BONUS : 0, md.text + (met ? " · met" : win ? " · missed" : " · needs a win"), "win");
    var baseSub = 0, winSub = 0;
    lines.forEach(function (l) { if (l.kind === "win") winSub += l.amount; else baseSub += l.amount; });
    var rating = state.rating | 0;
    var bm = ratingBaseMult(rating), wm = ratingMultiplier(rating);
    var total = Math.round(baseSub * bm + winSub * wm);
    return { lines: lines, subtotal: baseSub + winSub, baseSubtotal: baseSub, winSubtotal: winSub, baseMult: bm, winMult: wm,
      rating: rating, multiplier: wm, total: total, win: win, mandateMet: met };
  }

  /* ---------- Save data ---------- */
  function migrateMeta(meta) {
    meta = meta || {};
    if (typeof meta.dividends !== "number" || !isFinite(meta.dividends)) meta.dividends = 0;
    if (typeof meta.spent !== "number") meta.spent = 0;
    if (!Array.isArray(meta.owned)) meta.owned = [];
    if (!meta.ratingByExec || typeof meta.ratingByExec !== "object") meta.ratingByExec = {};
    if (!Array.isArray(meta.mandatesDone)) meta.mandatesDone = [];
    if (!Array.isArray(meta.equipped)) meta.equipped = [];
    if (!Array.isArray(meta.packsOff)) meta.packsOff = [];
    if (!meta.cosmetics || typeof meta.cosmetics !== "object") meta.cosmetics = {};
    if (!meta.lifetime || typeof meta.lifetime !== "object") meta.lifetime = {};
    ["dividends", "runs", "wins", "quarters"].forEach(function (k) { if (typeof meta.lifetime[k] !== "number") meta.lifetime[k] = 0; });
    if (typeof meta.finished !== "number") meta.finished = 0;
    if (typeof meta.wins !== "number") meta.wins = 0;
    /* Fiscal Year: XP per executive and one-time first clears per executive × rating. Ratings carry over. */
    if (!meta.xp || typeof meta.xp !== "object") meta.xp = {};
    if (!Array.isArray(meta.fyClears)) meta.fyClears = [];
    /* Asset Prospectus: what you have seen and found, across runs. */
    if (!meta.codex || typeof meta.codex !== "object") meta.codex = {};
    if (!meta.codex.seen || typeof meta.codex.seen !== "object") meta.codex.seen = {};
    if (!meta.codex.found || typeof meta.codex.found !== "object") meta.codex.found = {};
    /* Executive seats earned under the old gates stay yours. */
    LD.EXECUTIVES.forEach(function (ex) {
      if (!ex.unlocked && ex.unlock !== "buy" && LD.isExecutiveUnlocked(ex.id, { finished: meta.finished, wins: meta.wins, owned: [] })) {
        if (meta.owned.indexOf("exec:" + ex.id) === -1) meta.owned.push("exec:" + ex.id);
      }
    });
    meta.equipped = meta.equipped.filter(function (id) { return meta.owned.indexOf("perk:" + id) !== -1; }).slice(0, perkSlots(meta));
    return meta;
  }

  function ratingUnlocked(meta, execId) { return Math.min(LD.RATINGS.length - 1, (meta.ratingByExec && meta.ratingByExec[execId]) | 0); }
  function perkSlots(meta, rating) {
    var s = meta && meta.owned && meta.owned.indexOf("slot:2") !== -1 ? 2 : 1;
    if (rating != null && rating >= LD.PERK_CAP_RATING) s = 1;
    return s;
  }

  /* Apply a finished run to the save. Returns { meta, payout, newRating }. Pure. */
  function applyRunEnd(meta, state) {
    meta = migrateMeta(clone(meta));
    var payout = computeDividends(state);
    meta.dividends += payout.total;
    meta.lifetime.dividends += payout.total;
    meta.lifetime.runs += 1;
    meta.lifetime.quarters += state.turn;
    var newRating = null;
    if (payout.win) {
      meta.lifetime.wins += 1;
      var r = state.rating | 0;
      var cur = ratingUnlocked(meta, state.executiveId);
      if (r >= cur && r < LD.RATINGS.length - 1) { meta.ratingByExec[state.executiveId] = r + 1; newRating = r + 1; }
      if (!meta.bestRating) meta.bestRating = {};
      meta.bestRating[state.executiveId] = Math.max(meta.bestRating[state.executiveId] == null ? -1 : meta.bestRating[state.executiveId], r);
    }
    if (payout.mandateMet && meta.mandatesDone.indexOf(state.mandate) === -1) meta.mandatesDone.push(state.mandate);
    /* First clear (one-time per executive × rating) and executive XP. */
    var tier = state.rating | 0, ex = state.executiveId;
    var xpGain = LD.runXp ? LD.runXp(state) : 0;
    payout.firstClear = null;
    if (payout.win) {
      var key = ex + ":" + tier;
      if (meta.fyClears.indexOf(key) === -1) {
        var fc = LD.FIRST_CLEAR(tier);
        meta.fyClears.push(key);
        payout.firstClear = fc;
        meta.dividends += fc.div;
        meta.lifetime.dividends += fc.div;
        payout.total += fc.div;
        xpGain += fc.xp;
      }
    }
    var before = LD.levelFromXp((meta.xp[ex] | 0));
    meta.xp[ex] = (meta.xp[ex] | 0) + xpGain;
    var after = LD.levelFromXp(meta.xp[ex]);
    var newPerks = LD.LEVEL_PERKS.filter(function (p) { return p.lv > before.level && p.lv <= after.level; });
    var xpInfo = { exec: ex, gain: xpGain, before: before, after: after, total: meta.xp[ex], newPerks: newPerks, levelUp: after.level > before.level };
    return { meta: meta, payout: payout, newRating: newRating, xp: xpInfo };
  }

  /* ---------- The Boardroom (shop) ---------- */
  function shopItems() {
    var items = [];
    LD.EXECUTIVES.forEach(function (ex) {
      if (ex.unlocked || !ex.price) return;
      items.push({ key: "exec:" + ex.id, wing: "seats", name: ex.name, firm: ex.firm, price: ex.price,
        text: ex.blurb, alt: ex.unlock === "win-run" ? "or evacuate once" : ex.unlock === "three-runs" ? "or finish three runs" : "" });
    });
    LD.PERKS.forEach(function (p) {
      items.push({ key: "perk:" + p.id, wing: "perks", name: p.name, price: p.price, up: p.up, down: p.down });
    });
    items.push({ key: "slot:2", wing: "perks", name: "Second Perquisite slot", price: 300, up: "Equip two Perquisites", down: "Only one works at BB and below" });
    (LD.PACKS || []).forEach(function (p) {
      items.push({ key: "pack:" + p.id, wing: "prospectus", name: p.name, price: p.price, text: p.text });
    });
    LD.COSMETICS.forEach(function (c) {
      if (c.free) return;
      items.push({ key: "cos:" + c.slot + ":" + c.id, wing: "portfolio", name: c.name, price: c.price, text: c.text, slot: c.slot, id: c.id });
    });
    items.push({ key: "annual:history", wing: "annual", name: "Expanded archive", price: 40, text: "Run history keeps 50 entries and shows your best rating per executive." });
    return items;
  }
  function itemOwned(meta, key) {
    if (key.indexOf("exec:") === 0) return LD.isExecutiveUnlocked(key.slice(5), meta);
    return meta.owned.indexOf(key) !== -1;
  }
  function buyItem(meta, key) {
    meta = migrateMeta(clone(meta));
    var item = null;
    shopItems().forEach(function (it) { if (it.key === key) item = it; });
    if (!item) return { ok: false, error: "Not for sale.", meta: meta };
    if (itemOwned(meta, key)) return { ok: false, error: "Already yours.", meta: meta };
    if (meta.dividends < item.price) return { ok: false, error: "The board wants " + item.price + " ◈. You have " + meta.dividends + ".", meta: meta };
    meta.dividends -= item.price;
    meta.spent += item.price;
    meta.owned.push(key);
    return { ok: true, meta: meta, item: item };
  }

  /* ---------- Property Portfolio (cosmetics, pure flavour) ---------- */
  LD.COSMETIC_SLOTS = [["light", "Island lighting"], ["rooms", "Room finish"], ["stamp", "Seal stamp"]];
  LD.COSMETICS = [
    { slot: "light", id: "sunrise", name: "Sunrise", free: true, text: "The default dawn." },
    { slot: "light", id: "golden", name: "Golden Hour", price: 50, text: "Everything looks like a prospectus." },
    { slot: "light", id: "neon", name: "Neon Night", price: 50, text: "Magenta skies, emerald glass." },
    { slot: "light", id: "storm", name: "Storm Season", price: 50, text: "Moody, honest, slightly flooded." },
    { slot: "rooms", id: "standard", name: "Standard fit-out", free: true, text: "Contractor beige." },
    { slot: "rooms", id: "gilded", name: "Gilded Vault", price: 60, text: "Gold leaf on the air scrubbers." },
    { slot: "rooms", id: "brutalist", name: "Brutalist Concrete", price: 60, text: "Raw, cold, award-winning." },
    { slot: "rooms", id: "yacht", name: "Yacht Lounge", price: 60, text: "Teak, brass and denial." },
    { slot: "rooms", id: "server", name: "Server Farm", price: 60, text: "Blue light, cool air, no windows." },
    { slot: "stamp", id: "gold", name: "Gold Leaf", free: true, text: "The classic SEALED stamp." },
    { slot: "stamp", id: "redink", name: "Red Ink", price: 40, text: "A notary's signature." },
    { slot: "stamp", id: "neonsign", name: "Neon Sign", price: 40, text: "SEALED, in lights." }
  ];
  function cosmeticOwned(meta, slot, id) {
    var c = LD.COSMETICS.filter(function (x) { return x.slot === slot && x.id === id; })[0];
    return !!c && (c.free || meta.owned.indexOf("cos:" + slot + ":" + id) !== -1);
  }
  function equippedCosmetics(meta) {
    var out = {};
    LD.COSMETIC_SLOTS.forEach(function (sl) {
      var want = meta.cosmetics && meta.cosmetics[sl[0]];
      var def = LD.COSMETICS.filter(function (c) { return c.slot === sl[0] && c.free; })[0].id;
      out[sl[0]] = want && cosmeticOwned(meta, sl[0], want) ? want : def;
    });
    return out;
  }
  function activePacks(meta) {
    return (LD.PACKS || []).filter(function (p) { return meta.owned.indexOf("pack:" + p.id) !== -1 && (meta.packsOff || []).indexOf(p.id) === -1; }).map(function (p) { return p.id; });
  }
  LD.cosmeticOwned = cosmeticOwned;
  LD.equippedCosmetics = equippedCosmetics;
  LD.activePacks = activePacks;

  /* Will this owned region revolt when the quarter closes (as things stand)? */
  function willRevolt(state, id) {
    var r = state.world && state.world.regions[id];
    if (!r || !r.owned) return false;
    var next = r.plant ? r.stress + LD.PLANT.stressPerQuarter : r.stress - 1;
    return next >= LD.STRESS_REVOLT;
  }

  LD.ratingName = ratingName;
  LD.ratingMultiplier = ratingMultiplier;
  LD.ratingBaseMult = ratingBaseMult;
  LD.perkById = perkById;
  LD.buildMods = buildMods;
  LD.applyStartWorldMods = applyStartWorldMods;
  LD.mandateById = mandateById;
  LD.pickMandate = pickMandate;
  LD.mandateMet = mandateMet;
  LD.computeDividends = computeDividends;
  LD.migrateMeta = migrateMeta;
  LD.ratingUnlocked = ratingUnlocked;
  LD.perkSlots = perkSlots;
  LD.applyRunEnd = applyRunEnd;
  LD.shopItems = shopItems;
  LD.itemOwned = itemOwned;
  LD.buyItem = buyItem;
  LD.willRevolt = willRevolt;

  if (typeof module !== "undefined" && module.exports) module.exports = LD;
})(typeof globalThis !== "undefined" ? globalThis : this);

  