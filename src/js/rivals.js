
/* Last Dividend — crisis spread, deal aiming, deal packs (Prospectus). Pure engine extension. Browser + Node. */
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
    { id: "hostile", name: "Hostile Takeover", price: 150, text: "Acquisitions: buy up regions, utilities and ports." }
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
    d({ id: "ht-desal", pack: "hostile", claims: true, hostile: true, title: "Buy the competitor's desalination plant", kicker: "Takeover", body: "Their plant, your logo, same brine.", hint: "+18 cash. Claims a region. In 2Q: unrest +8.", immediate: { cash: 18 }, delay: { turns: 2, unrest: 8, log: "The rebranded plant raises its prices on day one." }, tags: ["extractive", "water"], weight: 9 }),
    d({ id: "ht-poison", pack: "hostile", claims: true, hostile: true, title: "Poison-pill a shipping line's port", kicker: "Takeover", body: "Their board voted yes. Their board is now your board.", hint: "+12 cash. Claims a region. Unrest +4.", immediate: { cash: 12, unrest: 4 }, tags: ["extractive"], weight: 8 }),
    d({ id: "ht-greenmail", pack: "hostile", title: "Greenmail a regional utility", kicker: "Takeover", body: "Buy enough shares to be annoying. Sell them back at a premium.", hint: "+22 cash. In 2Q: collapse +5.", immediate: { cash: 22 }, delay: { turns: 2, collapse: 5, log: "The utility cuts maintenance to pay your premium." }, tags: ["extractive", "power"], weight: 8 }),
    d({ id: "ht-merge", pack: "hostile", claims: true, title: "Merge with a struggling grid", kicker: "Takeover", body: "Synergies. Mostly layoffs.", hint: "+14 cash. Claims a region. In 1Q: unrest +10.", immediate: { cash: 14 }, delay: { turns: 1, unrest: 10, log: "Synergies are announced in the break room." }, tags: ["extractive"], weight: 7 })
  );

  LD.spreadCrises = spreadCrises;
  LD.aimDeal = aimDeal;

  if (typeof module !== "undefined" && module.exports) module.exports = LD;
})(typeof globalThis !== "undefined" ? globalThis : this);

  