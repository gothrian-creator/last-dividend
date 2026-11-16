
/* Last Dividend — rival executives, crisis spread, deal packs (Prospectus). Pure engine extension. Browser + Node. */
(function (root) {
  var LD = root.LD || (root.LD = {});
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /* Neighbouring regions (same graph as the trade routes on the map). */
  LD.ROUTES = [["na", "eu"], ["eu", "me"], ["me", "sa"], ["sa", "ea"], ["ea", "oc"], ["sam", "af"], ["af", "eu"], ["na", "sam"], ["af", "sa"]];
  LD.NEIGHBORS = {};
  LD.REGION_IDS.forEach(function (id) { LD.NEIGHBORS[id] = []; });
  LD.ROUTES.forEach(function (r) { LD.NEIGHBORS[r[0]].push(r[1]); LD.NEIGHBORS[r[1]].push(r[0]); });
  /* Which public network each trade route carries (Networks lens). */
  LD.ROUTE_NET = ["power", "water", "air", "food", "air", "food", "water", "power", "food"];

  /* ---------- Rivals ---------- */
  LD.RIVAL_COLORS = ["#b9a6ff", "#9fd8ff"];
  function rivalRng(state) {
    var r = LD.createRng(state.rivalRng != null ? state.rivalRng : LD.hashString("rivals:" + state.seed));
    return r;
  }
  function saveRng(state, r) { state.rivalRng = r.state(); }

  /* AAA: one passive rival. CCC and below: two. Aggression rises with the rating. */
  function initRivals(state) {
    var rating = state.rating | 0;
    var count = rating >= 7 ? 2 : 1;
    var aggr = Math.round(rating * 0.08 * 100) / 100; /* AAA 0 … D 0.8 */
    var r = LD.createRng(LD.hashString("rivals:" + state.seed + ":" + state.executiveId));
    var pool = LD.EXECUTIVES.filter(function (e) { return e.id !== state.executiveId; });
    pool = r.shuffle(pool);
    state.rivals = [];
    for (var i = 0; i < count && i < pool.length; i++) {
      var e = pool[i];
      state.rivals.push({
        id: e.id, name: e.name, firm: e.firm, idx: i, aggr: aggr,
        engineer: false, sealed: false, sealTurn: 13 - Math.round(aggr * 4) + r.int(3) + i, leaks: 0
      });
    }
    state.rivalRng = r.state();
    return state;
  }

  function rivalRegions(state, idx) {
    if (!state.world) return [];
    return LD.REGION_IDS.filter(function (id) { var g = state.world.regions[id]; return g.rival === idx && !g.owned; });
  }

  function rivalEngineerTax(state) {
    return (state.rivals || []).filter(function (rv) { return rv.engineer; }).length * 4;
  }

  /* Called by closeQuarter after the regional report. Returns world-style events. */
  function resolveRivals(state) {
    var events = [];
    if (!state.rivals || !state.rivals.length || !state.world) return events;
    var rng = rivalRng(state);
    var unrest = 0, collapse = 0;
    state.rivals.forEach(function (rv) {
      if (rv.sealed) return;
      var name = rv.firm;
      /* Buy a region. */
      if (rng() < 0.2 + 0.4 * rv.aggr) {
        var free = LD.REGION_IDS.filter(function (id) { var g = state.world.regions[id]; return !g.owned && g.rival == null; });
        var boom = free.filter(function (id) { return state.world.regions[id].trait === "boom"; });
        var pick = boom.length ? rng.pick(boom) : free.length ? rng.pick(free) : null;
        if (pick) {
          state.world.regions[pick].rival = rv.idx;
          events.push({ regionId: pick, kind: "rival-buy", rival: rv.idx, text: name + " buys up " + LD.REGION_NAMES[pick] + "." });
        }
      }
      /* Their plants and squeezes heat the planet and the street. */
      var n = rivalRegions(state, rv.idx).length;
      var c = Math.floor(n * 0.45 * rv.aggr);
      var u = rv.aggr >= 0.7 ? Math.floor(n * 0.5) : 0;
      if (c || u) {
        collapse += c; unrest += u;
        events.push({ regionId: null, kind: "rival-heat", rival: rv.idx, collapse: c, unrest: u, text: name + " squeezes its holdings" + (c ? ": collapse +" + c : "") + (u ? (c ? ", " : ": ") + "unrest +" + u : "") + "." });
      }
      /* Hiring the good engineers makes yours dearer. */
      if (!rv.engineer && state.turn >= 4 && rng() < 0.12 + 0.4 * rv.aggr) {
        rv.engineer = true;
        events.push({ regionId: null, kind: "rival-engineer", rival: rv.idx, text: name + " poaches a chief engineer. Yours now cost $4M more." });
      }
      /* Sealing first. */
      if (state.turn >= rv.sealTurn) {
        rv.sealed = true;
        var spike = 3 + Math.round(3 * rv.aggr);
        collapse += spike;
        events.push({ regionId: null, kind: "rival-seal", rival: rv.idx, collapse: spike, text: rv.name + " seals " + name + "'s bunker first: \u201cSee you never.\u201d Panic: collapse +" + spike + "." });
      }
    });
    saveRng(state, rng);
    if (collapse) state.collapse = clamp(state.collapse + collapse, 0, LD.MAX_COLLAPSE);
    if (unrest) state.unrest = clamp(state.unrest + unrest, 0, LD.MAX_UNREST);
    events.forEach(function (ev) { state.log.unshift({ turn: state.turn, text: ev.text }); });
    return events;
  }

  /* After new deals are drawn: an aggressive rival may snipe one of your pins. */
  function rivalsSnipe(state) {
    if (!state.rivals || !state.rivals.length) return null;
    var rng = rivalRng(state);
    var out = null;
    state.rivals.forEach(function (rv) {
      if (out || rv.sealed) return;
      var plain = state.offered.filter(function (id) { var d = LD.dealById(id); return d && !d.isCrisis; });
      if (plain.length < 3 || rng() >= 0.06 + 0.3 * rv.aggr) return;
      var gone = rng.pick(plain);
      state.offered = state.offered.filter(function (id) { return id !== gone; });
      out = { dealId: gone, rival: rv.idx, text: rv.firm + " sniped \u201c" + LD.dealById(gone).title + "\u201d before you could sign." };
      state.log.unshift({ turn: state.turn, text: out.text });
    });
    saveRng(state, rng);
    state.sniped = out;
    return out;
  }

  /* ---------- Player sabotage (uses the quarter's regional order, costs unrest) ---------- */
  LD.OUTBID = { cost: 12, unrest: 4 };
  LD.LEAK = { unrest: 5, delay: 2 };
  function sabotageGuard(state) {
    if (state.ended) return "Run already ended.";
    var busyS = LD.fyBusy ? LD.fyBusy(state) : null; if (busyS) return busyS;
    if (state.world.actedTurn === state.turn) return "One regional order per quarter.";
    return null;
  }
  function canOutbid(state, regionId) {
    var g = state.world.regions[regionId];
    return !sabotageGuard(state) && g && g.rival != null && !g.owned && state.cash >= LD.OUTBID.cost;
  }
  function outbidRegion(state, regionId) {
    state = LD.deepClone(state);
    var err = sabotageGuard(state);
    var g = state.world.regions[regionId];
    if (!err && (!g || g.rival == null)) err = "No rival holds that region.";
    if (!err && state.cash < LD.OUTBID.cost) err = "Not enough cash (" + LD.OUTBID.cost + " required).";
    if (err) return { ok: false, error: err, state: state };
    var rv = state.rivals[g.rival];
    state.cash -= LD.OUTBID.cost;
    state.unrest = clamp(state.unrest + LD.OUTBID.unrest, 0, LD.MAX_UNREST);
    g.rival = null; g.owned = true; g.stress = Math.max(g.stress, 2);
    state.world.actedTurn = state.turn;
    state.log.unshift({ turn: state.turn, text: "Outbid " + (rv ? rv.firm : "a rival") + " for " + LD.REGION_NAMES[regionId] + " (" + LD.OUTBID.cost + " cash, unrest +" + LD.OUTBID.unrest + ")." });
    return { ok: true, state: state };
  }
  function canLeak(state, idx) {
    var rv = state.rivals && state.rivals[idx];
    return !!rv && !rv.sealed && !sabotageGuard(state);
  }
  function leakRival(state, idx) {
    state = LD.deepClone(state);
    var err = sabotageGuard(state);
    var rv = state.rivals && state.rivals[idx];
    if (!err && (!rv || rv.sealed)) err = "That rival is out of reach.";
    if (err) return { ok: false, error: err, state: state };
    rv.sealTurn += LD.LEAK.delay;
    rv.leaks += 1;
    state.unrest = clamp(state.unrest + LD.LEAK.unrest, 0, LD.MAX_UNREST);
    state.world.actedTurn = state.turn;
    state.log.unshift({ turn: state.turn, text: "Leaked " + rv.firm + "'s bunker contracts. Their seal slips to Q" + rv.sealTurn + ". Unrest +" + LD.LEAK.unrest + "." });
    return { ok: true, state: state };
  }

  /* Aim this quarter's Soothe deal at one of your hot regions (swaps pins if needed). */
  function aimDeal(state, dealId, regionId) {
    state = LD.deepClone(state);
    if (state.phase !== "deal" || state.offered.indexOf(dealId) === -1) return { ok: false, error: "That deal is not on offer.", state: state };
    if (LD.dealKind(LD.dealById(dealId)) !== "calm") return { ok: false, error: "Only Soothe deals can be re-aimed.", state: state };
    var g = state.world.regions[regionId];
    if (!g || !g.owned) return { ok: false, error: "Aim it at one of your regions.", state: state };
    var from = state.world.pins[dealId];
    Object.keys(state.world.pins).forEach(function (id) { if (state.world.pins[id] === regionId) state.world.pins[id] = from; });
    state.world.pins[dealId] = regionId;
    return { ok: true, state: state };
  }

  /* ---------- Unanswered crises spread ---------- */
  function spreadCrises(state) {
    var events = [];
    if (!state.world) return events;
    (state.offered || []).forEach(function (id) {
      var d = LD.dealById(id);
      if (!d || !d.isCrisis || id === state.lastDealId) return;
      var from = state.world.pins[id];
      if (!from) return;
      var nb = (LD.NEIGHBORS[from] || []).slice().sort(function (a, b) {
        var ga = state.world.regions[a], gb = state.world.regions[b];
        return (gb.owned ? 1 : 0) - (ga.owned ? 1 : 0) || ga.stress - gb.stress;
      })[0];
      if (!nb) return;
      var g = state.world.regions[nb];
      g.stress = clamp(g.stress + 1, 0, LD.STRESS_MAX);
      if (!g.trait) g.trait = "crisis";
      var text = "Ignored: \u201c" + d.title + "\u201d spreads from " + LD.REGION_NAMES[from] + " to " + LD.REGION_NAMES[nb] + " (stress +1).";
      state.log.unshift({ turn: state.turn, text: text });
      events.push({ regionId: nb, kind: "spread", text: text });
    });
    return events;
  }

  /* ---------- Prospectus deal packs (bought in the Boardroom, toggled per run) ---------- */
  LD.PACKS = [
    { id: "esg", name: "ESG Report", price: 120, text: "Greenwashing: deals that look like Soothe now and bill collapse later." },
    { id: "disaster", name: "Disaster Capitalism", price: 120, text: "Squeezes that pay more the worse collapse gets, plus a new crisis." },
    { id: "hostile", name: "Hostile Takeover", price: 150, text: "Acquisitions aimed at rival holdings and your own." }
  ];
  function d(x) { return x; }
  LD.DEALS.push(
    d({ id: "esg-offset", pack: "esg", title: "Plant a carbon offset forest", kicker: "ESG", body: "A forest on paper. A press release on everyone's feed.", hint: "+10 cash, unrest −6. In 3Q: collapse +6.", immediate: { cash: 10, unrest: -6 }, delay: { turns: 3, collapse: 6, log: "The offset forest was a parking lot with good lighting." }, tags: ["restraint"], weight: 9 }),
    d({ id: "esg-water-pledge", pack: "esg", title: "Pledge net-zero water use", kicker: "ESG", body: "Net zero. Gross enormous.", hint: "+12 cash, unrest −5. Eases public water. In 2Q: collapse +5.", immediate: { cash: 12, unrest: -5 }, delay: { turns: 2, collapse: 5, log: "The pledge audit finds the water. Most of it was the town's." }, tags: ["restraint", "water"], weight: 8 }),
    d({ id: "esg-rewild", pack: "esg", title: "Rebrand the strip mine as rewilding", kicker: "ESG", body: "Nature is healing. Please do not look in the pit.", hint: "+16 cash, unrest −4. In 2Q: collapse +7.", immediate: { cash: 16, unrest: -4 }, delay: { turns: 2, collapse: 7, log: "Rewilding, it turns out, was mostly runoff." }, tags: ["restraint"], weight: 7 }),
    d({ id: "esg-solar-glass", pack: "esg", title: "Solar glass for the town hall", kicker: "ESG", body: "One gleaming panel for the cameras. The invoice covers forty.", hint: "+8 cash, unrest −7. Eases public power. In 3Q: collapse +4.", immediate: { cash: 8, unrest: -7 }, delay: { turns: 3, collapse: 4, log: "The other thirty-nine panels were never installed." }, tags: ["restraint", "power"], weight: 7 }),
    d({ id: "esg-badge", pack: "esg", title: "Buy a sustainability badge", kicker: "ESG", body: "The certifying body is also a subsidiary. Small world.", hint: "Unrest −8. In 2Q: unrest +6, collapse +3.", immediate: { unrest: -8 }, delay: { turns: 2, unrest: 6, collapse: 3, log: "A journalist checks who owns the certifier." }, tags: ["restraint"], weight: 6 }),
    d({ id: "dc-surge", pack: "disaster", title: "Surge-price the evacuation buses", kicker: "Disaster", body: "Demand is extremely inelastic today.", hint: "+14 cash, +3 per 10 collapse. Unrest +8.", immediate: { cash: 14, collapseScale: 3, unrest: 8 }, tags: ["extractive"], weight: 9 }),
    d({ id: "dc-rebuild", pack: "disaster", title: "Win the no-bid rebuild contract", kicker: "Disaster", body: "Rubble is a growth market.", hint: "+12 cash, +3 per 10 collapse. In 2Q: unrest +8.", immediate: { cash: 12, collapseScale: 3 }, delay: { turns: 2, unrest: 8, log: "The rebuilt bridge is a picture of a bridge." }, tags: ["extractive"], weight: 8 }),
    d({ id: "dc-insure", pack: "disaster", title: "Cancel the flood insurance pool", kicker: "Disaster", body: "Coverage ends exactly when it is needed. Elegant.", hint: "+10 cash, +4 per 10 collapse. Collapse +3.", immediate: { cash: 10, collapseScale: 4, collapse: 3 }, tags: ["extractive"], weight: 7 }),
    d({ id: "dc-ration", pack: "disaster", title: "Ration-card exclusivity deal", kicker: "Disaster", body: "Hunger, now with a loyalty programme.", hint: "+8 cash, +3 per 10 collapse. Public food strained. Unrest +6.", immediate: { cash: 8, collapseScale: 3, unrest: 6 }, tags: ["extractive", "food"], weight: 7 }),
    d({ id: "dc-heatwave", pack: "disaster", title: "Heat dome over the capital", kicker: "Crisis", body: "Forty-eight degrees. The air conditioners are yours.", hint: "Open cooling centres (12 cash, unrest −8), sell cooling (+24, unrest +14), or wait (collapse +6).", isCrisis: true, unique: true, minCollapse: 45,
      choices: [
        { id: "cool", label: "Open cooling centres", hint: "Costs 12. Unrest −8.", cost: 12, immediate: { cash: -12, unrest: -8 }, ease: { power: 1 } },
        { id: "sell", label: "Sell cooling by the hour", hint: "+24 cash, unrest +14. Strains power.", immediate: { cash: 24, unrest: 14 }, strain: { power: 1 } },
        { id: "wait", label: "Issue heat advice", hint: "Collapse +6.", immediate: { collapse: 6 } }
      ], weight: 14 }),
    d({ id: "ht-desal", pack: "hostile", claims: true, hostile: true, title: "Buy the competitor's desalination plant", kicker: "Takeover", body: "Their plant, your logo, same brine.", hint: "+18 cash. Claims a rival region if one is on the map. In 2Q: unrest +8.", immediate: { cash: 18 }, delay: { turns: 2, unrest: 8, log: "The rebranded plant raises its prices on day one." }, tags: ["extractive", "water"], weight: 9 }),
    d({ id: "ht-poison", pack: "hostile", claims: true, hostile: true, title: "Poison-pill a rival's port", kicker: "Takeover", body: "Their board voted yes. Their board is now your board.", hint: "+12 cash. Claims a rival region. Unrest +4.", immediate: { cash: 12, unrest: 4 }, tags: ["extractive"], weight: 8 }),
    d({ id: "ht-greenmail", pack: "hostile", title: "Greenmail a regional utility", kicker: "Takeover", body: "Buy enough shares to be annoying. Sell them back at a premium.", hint: "+22 cash. In 2Q: collapse +5.", immediate: { cash: 22 }, delay: { turns: 2, collapse: 5, log: "The utility cuts maintenance to pay your premium." }, tags: ["extractive", "power"], weight: 8 }),
    d({ id: "ht-merge", pack: "hostile", claims: true, title: "Merge with a struggling grid", kicker: "Takeover", body: "Synergies. Mostly layoffs.", hint: "+14 cash. Claims a region. In 1Q: unrest +10.", immediate: { cash: 14 }, delay: { turns: 1, unrest: 10, log: "Synergies are announced in the break room." }, tags: ["extractive"], weight: 7 })
  );

  LD.initRivals = initRivals;
  LD.rivalRegions = rivalRegions;
  LD.rivalEngineerTax = rivalEngineerTax;
  LD.resolveRivals = resolveRivals;
  LD.rivalsSnipe = rivalsSnipe;
  LD.canOutbid = canOutbid;
  LD.outbidRegion = outbidRegion;
  LD.canLeak = canLeak;
  LD.leakRival = leakRival;
  LD.spreadCrises = spreadCrises;
  LD.aimDeal = aimDeal;

  if (typeof module !== "undefined" && module.exports) module.exports = LD;
})(typeof globalThis !== "undefined" ? globalThis : this);

  