/* Last Dividend — house rules. Since the 2026-11-26 flip the seated house desk is the DEFAULT game (LD.HOUSE_RULES on).
   New runs stamp state.ruleset at createRun, so a saved run keeps the rules it started with: an old shop save resumes
   as the shop game until it ends, and every new run after that is a house run. */
(function () {
  LD.HOUSE_RULES = true;
  LD.HOUSE_SAVE_KEY = "lastDividend.house.v1";
  function devQuery() { try { return (typeof location !== "undefined" && location && location.search) ? String(location.search) : ""; } catch (e) { return ""; } }
  /* ?classic=1 (or ?house=0) = the old shop game for new runs: the fallback hatch, kept through the soak.
     ?house=1 = the old test link: house rules in its own save slot, so a tester's slot keeps working as before.
     The default (no query) uses the main save, lastDividend.v1. */
  LD.CLASSIC = false;
  LD.applyDevHouseFlag = function () {
    try {
      var q = devQuery();
      if (/[?&](?:classic=1|house=0)(?:&|$)/.test(q)) { LD.HOUSE_RULES = false; LD.CLASSIC = true; }
      else if (/[?&]house=1(?:&|$)/.test(q)) { LD.HOUSE_RULES = true; LD.SAVE_KEY = LD.HOUSE_SAVE_KEY; }
      else LD.HOUSE_RULES = true;
    } catch (e) {}
    return LD.HOUSE_RULES;
  };
  /* One-time, non-destructive: a player who was on the ?house=1 test slot keeps that run and those climbs in the main
     save the first time they open the default game. The test slot itself is left as it is. */
  LD.mergeHouseSlot = function () {
    try {
      if (typeof localStorage === "undefined" || LD.SAVE_KEY === LD.HOUSE_SAVE_KEY) return false;
      var hr = localStorage.getItem(LD.HOUSE_SAVE_KEY); if (!hr) return false;
      var mr = localStorage.getItem(LD.SAVE_KEY), m = mr ? JSON.parse(mr) : {};
      if (m.houseSlotMerged) return false;
      var h = JSON.parse(hr) || {}, did = false;
      if (!m.midRun && h.midRun && h.midRun.ruleset === "house") { m.midRun = h.midRun; did = true; }
      if (Array.isArray(h.history) && h.history.length) {
        m.history = (Array.isArray(m.history) ? m.history : []).concat(h.history);
        m.finished = (m.finished | 0) + (h.finished | 0); m.wins = (m.wins | 0) + (h.wins | 0); did = true;
      }
      if (!mr) ["penny", "seenTutorial", "coachDone", "audioOff"].forEach(function (k) { if (h[k] !== undefined) m[k] = h[k]; });
      m.houseSlotMerged = true;
      localStorage.setItem(LD.SAVE_KEY, JSON.stringify(m));
      return did;
    } catch (e) { return false; }
  };
  LD.devHouseVisible = function () { return /[?&]house=/.test(devQuery()); };
  LD.setDevHouseFlag = function (on) { LD.HOUSE_RULES = !!on; return LD.HOUSE_RULES; };
  if (typeof document !== "undefined") { LD.applyDevHouseFlag(); LD.mergeHouseSlot(); }

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function log(state, text) { (state.log = state.log || []).unshift({ turn: state.turn, text: text }); }
  function execOf(state) { return LD.execById ? LD.execById(state.executiveId) : null; }

  LD.isHouse = function (state) { return !!(state && state.ruleset === "house"); };
  /* Keep costs scale with the float so a rich quarter cannot shrug them off. */
  LD.houseKeepCash = function (state, base) {
    return Math.max(base | 0, Math.round((state && state.cash || 0) * 0.16));
  };
  LD.houseContractorTurn = function (state) {
    if (state && state.house && state.house.contractorFrom) return state.house.contractorFrom;
    return 6;
  };

  /* ---------- Roster ---------- */
  LD.HOUSE_RESIDENTS = [
    { id: "helen", name: "Helen Cho", room: "power", role: "engineer",
      blurb: "She keeps the cheap work holding. Once a fight, the lights stay on.",
      payoff: 8, payoffUnrest: 0 },
    { id: "tom", name: "Tom Alvarez", room: "water", role: "cistern",
      blurb: "He tends the cistern. Water deals land softer on the street.",
      payoff: 6, payoffUnrest: -4 },
    { id: "lila", name: "Lila Brenner", room: null, role: "reporter",
      blurb: "She is in the house, not on a system. The street is quieter. The notes are not.",
      payoff: 10, payoffUnrest: 0 },
    { id: "nia", name: "Nia Shah", room: "food", role: "cook",
      blurb: "She cooks. The stores stretch. Door fights start with a little more defence.",
      payoff: 4, payoffUnrest: 0 },
    { id: "eli", name: "Eli Navarro", room: "air", role: "technician",
      blurb: "A junior on the intake. Extractive work raises the street a little less.",
      payoff: 6, payoffUnrest: 0 }
  ];
  var RES_BY = {};
  LD.HOUSE_RESIDENTS.forEach(function (r) { RES_BY[r.id] = r; });
  LD.houseResident = function (id) { return RES_BY[id] || null; };

  /* Promises: specific, quiet, one optional Word per admission. Costs resolve at Keep. */
  LD.HOUSE_PROMISES = [
    { id: "helen-parts", residentId: "helen", dueIn: 2,
      text: "The generator gets its bearings by the due quarter. You pay for the crate.",
      keep: function (state) { return { cash: LD.houseKeepCash(state, 12) }; },
      brk: function () { return { unrest: 4, cheap: "power" }; } },
    { id: "helen-nights", residentId: "helen", dueIn: 2,
      text: "Helen has one quiet night a week. You pay the cover shift; the plant can wait.",
      keep: function (state) { return { cash: LD.houseKeepCash(state, 10) }; },
      brk: function () { return { unrest: 3 }; } },
    { id: "tom-sister", residentId: "tom", dueIn: 3,
      text: "When a bunk comes free, it is for Rosa, not a new hire. You put a ticket aside.",
      keep: function (state) { return { cash: LD.houseKeepCash(state, 8), reserve: true }; },
      brk: function () { return { unrest: 5 }; } },
    { id: "tom-well", residentId: "tom", dueIn: 2,
      text: "The next water contract leaves the town well alone. If you already drew from it, you buy it back.",
      keep: function (state, p) {
        return { cash: LD.houseKeepCash(state, waterExtractiveSince(state, p) ? 16 : 8) };
      },
      brk: function () { return { unrest: 4 }; } },
    { id: "nia-plate", residentId: "nia", dueIn: 2,
      text: "There is a plate for whoever is already in the house, even when the street is in the lobby.",
      keep: function () { return { stores: -3 }; },
      brk: function () { return { unrest: 4, blockBonus: true }; } },
    { id: "nia-door", residentId: "nia", dueIn: 2,
      text: "You do not ask her to turn people away at the kitchen door. The kitchen still has to be paid.",
      keep: function (state, p) {
        return turnedAwaySince(state, p) ? { blocked: true } : { stores: -1, cash: LD.houseKeepCash(state, 6) };
      },
      brk: function () { return { unrest: 6, blockBonus: true }; } },
    { id: "lila-notes", residentId: "lila", dueIn: 2,
      text: "What she sees in here stays in the house. You pay to keep it that way.",
      keep: function (state) { return { cash: LD.houseKeepCash(state, 14), hush: true }; },
      brk: function () { return { leak: true, unrest: 3 }; } },
    { id: "lila-file", residentId: "lila", dueIn: 3,
      text: "She files the story when you seal, not before. The hold costs.",
      keep: function (state) { return { cash: LD.houseKeepCash(state, 15) }; },
      brk: function () { return { leak: true, unrest: 5 }; } },
    { id: "eli-filter", residentId: "eli", dueIn: 2,
      text: "The intake gets a real filter before the next dirty job. You buy the part.",
      keep: function (state, p) {
        return { cash: LD.houseKeepCash(state, extractiveSince(state, p) ? 14 : 8) };
      },
      brk: function () { return { unrest: 3, cheap: "air" }; } },
    { id: "eli-hours", residentId: "eli", dueIn: 3,
      text: "He gets off the night shift before the doors close. You pay the cover.",
      keep: function (state) { return { cash: LD.houseKeepCash(state, 10) }; },
      brk: function () { return { unrest: 3 }; } }
  ];
  var PROM_BY = {};
  LD.HOUSE_PROMISES.forEach(function (p) { PROM_BY[p.id] = p; });
  LD.housePromiseDef = function (id) { return PROM_BY[id] || null; };

  function emptyHouse() {
    return {
      residents: [],
      stores: 4,
      contractorFrom: 6,
      rooms: {
        air: { on: false, by: null, base: null, quality: "sound" },
        water: { on: false, by: null, base: null, quality: "sound" },
        power: { on: false, by: null, base: null, quality: "sound" },
        food: { on: false, by: null, base: null, quality: "sound" }
      },
      arrivalsQ: 0,
      arrivalsTotal: 0,
      turnedAway: [],
      paidOff: [],
      askedToLeave: [],
      contractorUsed: false,
      promises: [],
      promiseSeq: 0,
      arrival: null,
      wordBroken: [],
      wordKept: [],
      niaBonusBlocked: false,
      hush: false,
      reserveNext: false,
      dealLog: [],
      leakRolls: 0,
      payOffMult: 1,
      contractorMult: 1
    };
  }

  function hasRes(state, id) {
    var h = state.house; if (!h) return false;
    return h.residents.some(function (r) { return r.id === id; });
  }
  function openPromises(state) {
    return (state.house.promises || []).filter(function (p) { return p.status === "open"; });
  }
  function duePromise(state) {
    var h = state.house; if (!h) return null;
    if (h.promiseDueThisQ) {
      var found = openPromises(state).filter(function (p) { return p.id === h.promiseDueThisQ; })[0];
      if (found) return found;
    }
    return openPromises(state).filter(function (p) { return p.dueQ <= state.turn; })[0] || null;
  }
  function tagsOf(deal) {
    if (!deal) return [];
    if (deal.tags) return deal.tags;
    var d = typeof deal === "string" ? (LD.dealById && LD.dealById(deal)) : deal;
    return (d && d.tags) || [];
  }
  function waterExtractiveSince(state, p) {
    return (state.house.dealLog || []).some(function (d) {
      return d.q >= p.sinceQ && d.tags && d.tags.indexOf("water") !== -1 && d.tags.indexOf("extractive") !== -1;
    });
  }
  function extractiveSince(state, p) {
    return (state.house.dealLog || []).some(function (d) {
      return d.q >= p.sinceQ && d.tags && d.tags.indexOf("extractive") !== -1;
    });
  }
  function turnedAwaySince(state, p) {
    var h = state.house;
    return (h.turnedAway || []).some(function (x) { return x.q >= p.sinceQ; }) ||
      (h.askedToLeave || []).some(function (x) { return x.q >= p.sinceQ; });
  }

  function applyHousePerks(state) {
    var h = state.house, exec = execOf(state);
    h.payOffMult = 1;
    h.contractorMult = 1;
    if (exec && exec.perks && exec.perks.privateWorks) h.contractorMult = Math.min(h.contractorMult, exec.perks.privateWorks);
    if (exec && exec.id === "cassius") h.payOffMult = Math.min(h.payOffMult, 0.8);
    if (state.perks && state.perks.indexOf("offshore") !== -1) {
      h.payOffMult = Math.min(h.payOffMult, 0.8);
      h.contractorMult = Math.min(h.contractorMult, 0.92);
    }
  }

  function syncBunker(state) {
    if (!state.house) return;
    LD.SYSTEMS.forEach(function (s) {
      var room = state.house.rooms[s.id];
      var b = state.bunker[s.id];
      if (!b) return;
      if (room.on) {
        b.level = LD.WIN_LEVEL;
        b.quality = room.quality || "sound";
      } else {
        b.level = 0;
      }
    });
    state.engineer = hasRes(state, "helen");
  }

  LD.houseSync = syncBunker;

  LD.houseInit = function (state) {
    if (!state || state.ruleset !== "house") return state;
    if (state.house) { applyHousePerks(state); syncBunker(state); return state; }
    var h = emptyHouse();
    state.house = h;
    LD.SYSTEMS.forEach(function (s) {
      var b = state.bunker[s.id];
      if (b && b.level > 0) {
        h.rooms[s.id] = { on: true, by: "start", base: "start", quality: b.quality || "sound" };
      }
    });
    if (h.rooms.water.on || h.rooms.food.on) h.stores += 2;
    var started = LD.SYSTEMS.some(function (sys) { return h.rooms[sys.id].base === "start"; });
    h.contractorFrom = started ? 6 : 5;
    applyHousePerks(state);
    syncBunker(state);
    return state;
  };

  LD.houseEnsure = function (state) {
    if (!state || state.ruleset !== "house") return state;
    if (!state.house) return LD.houseInit(state);
    applyHousePerks(state);
    syncBunker(state);
    return state;
  };

  /* Mid-run saves keep the ruleset they started with. Missing ruleset = shop. Never convert a shop run. */
  LD.adoptRun = function (state) {
    if (!state) return state;
    if (!state.ruleset) state.ruleset = "shop";
    if (state.ruleset === "house") LD.houseEnsure(state);
    return state;
  };

  function payOffCost(state, id) {
    var r = RES_BY[id]; if (!r) return 0;
    var m = (state.house && state.house.payOffMult) || 1;
    return Math.max(1, Math.round(r.payoff * m));
  }
  LD.housePayOffCost = payOffCost;

  LD.houseContractorCost = function (state) {
    var m = (state.house && state.house.contractorMult) || 1;
    return Math.max(1, Math.round(36 * m));
  };

  function projectedDrain(state, extra) {
    var n = state.house.residents.length + (extra || 0);
    if (n <= 0) return 0;
    if (hasRes(state, "nia") || (extra && arguments[2] === "nia")) {
      /* Nia counts in n; drain is floor(n/2). If we are about to add Nia, include her. */
    }
    var withNia = hasRes(state, "nia");
    if (extra) {
      /* extra is a count of new residents; caller passes niaIncoming separately via hasNia */
    }
    return drainFor(n, withNia);
  }
  function drainFor(n, withNia) {
    if (n <= 0) return 0;
    return withNia ? Math.floor(n / 2) : Math.floor((n + 1) / 2);
  }
  function incomeFor(state) {
    var inc = 0;
    if (hasRes(state, "tom")) inc += 1;
    if (hasRes(state, "nia")) inc += 1;
    return inc;
  }
  function rosterAfter(state, addId, removeId) {
    var ids = state.house.residents.map(function (r) { return r.id; }).filter(function (id) { return id !== removeId; });
    if (addId) ids.push(addId);
    return ids;
  }
  function wouldLastAfter(state, addId, removeId) {
    var ids = rosterAfter(state, addId, removeId);
    var withNia = ids.indexOf("nia") !== -1;
    var inc = (ids.indexOf("tom") !== -1 ? 1 : 0) + (ids.indexOf("nia") !== -1 ? 1 : 0);
    return state.house.stores + inc - drainFor(ids.length, withNia) >= 0;
  }
  function wouldLast(state, incomingId) {
    return wouldLastAfter(state, incomingId, null);
  }

  function houseGuard(state) {
    if (!LD.isHouse(state)) return "The house is not running this run.";
    if (state.ended) return "Run already ended.";
    if (state.phase !== "bunker") return "Choose a deal first.";
    if (state.bunkerActedThisTurn) return "Bunker action already taken this quarter.";
    if (state.ap < LD.BUNKER_AP) return "No action points remain.";
    if (duePromise(state)) return "A promise is due first.";
    return null;
  }
  function spendAct(state, action) {
    state.ap -= LD.BUNKER_AP;
    state.bunkerActedThisTurn = true;
    state.lastBunkerAction = action;
    if (LD.fyAfterBunker) LD.fyAfterBunker(state);
  }

  function occupy(state, res) {
    if (!res.room) return;
    var room = state.house.rooms[res.room];
    room.on = true;
    room.by = res.id;
    if (!room.base) room.base = res.id;
  }
  function vacate(state, res) {
    if (!res.room) return;
    var room = state.house.rooms[res.room];
    if (room.base && room.base !== res.id) {
      room.by = room.base;
      room.on = true;
    } else {
      room.by = null;
      room.base = null;
      room.on = false;
    }
  }

  function addResident(state, id) {
    if (hasRes(state, id)) return;
    state.house.residents.push({ id: id, sinceQ: state.turn });
    occupy(state, RES_BY[id]);
    syncBunker(state);
  }
  function removeResident(state, id) {
    var res = RES_BY[id];
    state.house.residents = state.house.residents.filter(function (r) { return r.id !== id; });
    if (res) vacate(state, res);
    if (id === "nia") state.house.niaBonusBlocked = true;
    syncBunker(state);
  }

  LD.houseCanAdmit = function (state, id) {
    if (!RES_BY[id]) return "Unknown resident.";
    if (hasRes(state, id)) return "They are already in the house.";
    if ((state.house.paidOff || []).some(function (x) { return x.id === id; })) return "You already paid them off.";
    if (!wouldLast(state, id)) return "The stores would not last the quarter.";
    var res = RES_BY[id];
    if (res.room) {
      var room = state.house.rooms[res.room];
      var occupant = room.by && RES_BY[room.by] ? room.by : null;
      /* A start/contractor/spoil "by" is not a person. */
      if (occupant) return "replace";
    }
    return null;
  };

  function attachPromise(state, residentId, promiseId) {
    if (!promiseId) return null;
    var def = PROM_BY[promiseId];
    if (!def || def.residentId !== residentId) return "That is not their word.";
    if (openPromises(state).length >= 2) return "Two promises are already open.";
    var dueQ = state.turn + (def.dueIn || 2);
    if (dueQ > 12) dueQ = 12;
    /* Stagger so two promises are never due the same quarter. */
    var taken = {};
    openPromises(state).forEach(function (p) { taken[p.dueQ] = true; });
    while (taken[dueQ] && dueQ < 12) dueQ += 1;
    if (taken[dueQ]) return "A promise is already due that quarter.";
    state.house.promiseSeq = (state.house.promiseSeq || 0) + 1;
    var rec = {
      id: "p" + state.house.promiseSeq,
      defId: def.id,
      residentId: residentId,
      text: def.text,
      sinceQ: state.turn,
      dueQ: dueQ,
      postponed: false,
      status: "open"
    };
    state.house.promises.push(rec);
    return rec;
  }

  LD.houseAdmit = function (state, opts) {
    opts = opts || {};
    state = clone(state);
    var err = houseGuard(state);
    if (err) return { ok: false, error: err, state: state };
    var id = opts.id;
    var can = LD.houseCanAdmit(state, id);
    if (can === "replace") return { ok: false, error: "That room is taken. Replace them.", state: state, needReplace: true };
    if (can) return { ok: false, error: can, state: state };
    var rec = null;
    if (opts.promiseId) {
      rec = attachPromise(state, id, opts.promiseId);
      if (typeof rec === "string") return { ok: false, error: rec, state: state };
    }
    addResident(state, id);
    if (state.house.arrival && state.house.arrival.id === id) state.house.arrival = null;
    spendAct(state, "admit:" + id + (rec ? ":" + rec.defId : ""));
    var who = RES_BY[id].name;
    log(state, "You admitted " + who + " to the house." + (rec ? " You gave your word: " + rec.text : ""));
    return { ok: true, state: state, admitted: id, promise: rec };
  };

  LD.houseReplace = function (state, opts) {
    opts = opts || {};
    state = clone(state);
    var err = houseGuard(state);
    if (err) return { ok: false, error: err, state: state };
    var id = opts.id, res = RES_BY[id];
    if (!res) return { ok: false, error: "Unknown resident.", state: state };
    if (!res.room) return { ok: false, error: "They do not take a room.", state: state };
    var room = state.house.rooms[res.room];
    var occupant = room.by && RES_BY[room.by] ? room.by : null;
    if (!occupant) return { ok: false, error: "The room is not taken.", state: state };
    if (hasRes(state, id)) return { ok: false, error: "They are already in the house.", state: state };
    if (!wouldLastAfter(state, id, occupant)) return { ok: false, error: "The stores would not last the quarter.", state: state };
    breakPromisesFor(state, occupant, "replaced");
    var gone = RES_BY[occupant].name;
    removeResident(state, occupant);
    state.house.askedToLeave.push({ id: occupant, q: state.turn, replaced: true });
    var rec = null;
    if (opts.promiseId) {
      rec = attachPromise(state, id, opts.promiseId);
      if (typeof rec === "string") return { ok: false, error: rec, state: state };
    }
    addResident(state, id);
    if (state.house.arrival && state.house.arrival.id === id) state.house.arrival = null;
    state.unrest = clamp(state.unrest + 3, 0, LD.MAX_UNREST);
    spendAct(state, "replace:" + occupant + ":" + id);
    log(state, "You replaced " + gone + " with " + res.name + ". Unrest +3." + (rec ? " You gave your word: " + rec.text : ""));
    return { ok: true, state: state, replaced: occupant, admitted: id, promise: rec };
  };

  LD.housePayOff = function (state, id) {
    state = clone(state);
    var err = houseGuard(state);
    if (err) return { ok: false, error: err, state: state };
    var res = RES_BY[id];
    if (!res) return { ok: false, error: "Unknown resident.", state: state };
    if (hasRes(state, id)) return { ok: false, error: "They are already in the house.", state: state };
    var cost = payOffCost(state, id);
    if (state.cash < cost) return { ok: false, error: "Not enough cash ($" + cost + "M required).", state: state };
    state.cash -= cost;
    var u = res.payoffUnrest || 0;
    if (u) state.unrest = clamp(state.unrest + u, 0, LD.MAX_UNREST);
    state.house.paidOff.push({ id: id, q: state.turn, cost: cost });
    if (state.house.arrival && state.house.arrival.id === id) state.house.arrival = null;
    spendAct(state, "payoff:" + id);
    log(state, "You paid " + res.name + " off ($" + cost + "M)." + (u ? " Unrest " + (u > 0 ? "+" : "") + u + "." : ""));
    return { ok: true, state: state, cost: cost };
  };

  LD.houseTurnAway = function (state, id) {
    state = clone(state);
    var err = houseGuard(state);
    if (err) return { ok: false, error: err, state: state };
    var res = RES_BY[id];
    if (!res) return { ok: false, error: "Unknown resident.", state: state };
    state.house.turnedAway.push({ id: id, q: state.turn });
    if (state.house.arrival && state.house.arrival.id === id) state.house.arrival = null;
    spendAct(state, "turnaway:" + id);
    log(state, "You turned " + res.name + " away.");
    return { ok: true, state: state };
  };

  LD.houseAskToLeave = function (state, id) {
    state = clone(state);
    var err = houseGuard(state);
    if (err) return { ok: false, error: err, state: state };
    if (!hasRes(state, id)) return { ok: false, error: "They are not in the house.", state: state };
    var res = RES_BY[id];
    var unrest = 4;
    if (id === "nia") unrest = 6;
    if (id === "lila") unrest = 2;
    breakPromisesFor(state, id, "asked-to-leave");
    removeResident(state, id);
    state.house.askedToLeave.push({ id: id, q: state.turn });
    state.unrest = clamp(state.unrest + unrest, 0, LD.MAX_UNREST);
    if (id === "lila") rollLeak(state, true);
    spendAct(state, "askleave:" + id);
    log(state, "You asked " + res.name + " to leave. Unrest +" + unrest + ".");
    return { ok: true, state: state, unrest: unrest };
  };

  /* Promise someone already inside (still one act, still the cap of two). */
  LD.housePromise = function (state, residentId, promiseId) {
    state = clone(state);
    var err = houseGuard(state);
    if (err) return { ok: false, error: err, state: state };
    if (!hasRes(state, residentId)) return { ok: false, error: "They are not in the house.", state: state };
    var rec = attachPromise(state, residentId, promiseId);
    if (typeof rec === "string") return { ok: false, error: rec, state: state };
    spendAct(state, "promise:" + rec.defId);
    log(state, "You gave your word to " + RES_BY[residentId].name + ": " + rec.text);
    return { ok: true, state: state, promise: rec };
  };

  LD.houseContractor = function (state, systemId) {
    state = clone(state);
    var err = houseGuard(state);
    if (err) return { ok: false, error: err, state: state };
    var fromQ = LD.houseContractorTurn(state);
    if (state.turn < fromQ) return { ok: false, error: "The late contractor is not available before Q" + fromQ + ".", state: state };
    if (state.house.contractorUsed) return { ok: false, error: "The late contractor already came once.", state: state };
    if (!state.house.rooms[systemId]) return { ok: false, error: "Unknown system.", state: state };
    if (state.house.rooms[systemId].on) return { ok: false, error: "That room is already running.", state: state };
    var cost = LD.houseContractorCost(state);
    if (state.cash < cost) return { ok: false, error: "Not enough cash ($" + cost + "M required).", state: state };
    state.cash -= cost;
    var room = state.house.rooms[systemId];
    room.on = true;
    room.by = "contractor";
    room.base = "contractor";
    room.quality = "sound";
    state.house.contractorUsed = true;
    syncBunker(state);
    spendAct(state, "contractor:" + systemId);
    log(state, "A late contractor switched the " + systemId + " room on ($" + cost + "M). Sound, no one lives there.");
    return { ok: true, state: state, cost: cost };
  };

  function wordGuard(state) {
    if (!LD.isHouse(state)) return "The house is not running this run.";
    if (state.ended) return "Run already ended.";
    if (state.phase !== "bunker") return "Choose a deal first.";
    if (state.bunkerActedThisTurn) return "Bunker action already taken this quarter.";
    if (state.ap < LD.BUNKER_AP) return "No action points remain.";
    if (!duePromise(state)) return "No promise is due this quarter.";
    return null;
  }

  function applyWordFx(state, fx, rec, kept) {
    fx = fx || {};
    if (fx.blocked) return "You cannot keep this word as things stand.";
    if (fx.cash) {
      if (state.cash < fx.cash) return "Not enough cash ($" + fx.cash + "M required).";
      state.cash -= fx.cash;
    }
    if (fx.stores) {
      if (state.house.stores + fx.stores < 0) return "The stores would not cover it.";
      state.house.stores += fx.stores;
    }
    if (fx.unrest) state.unrest = clamp(state.unrest + fx.unrest, 0, LD.MAX_UNREST);
    if (fx.cheap && state.house.rooms[fx.cheap] && state.house.rooms[fx.cheap].on) {
      state.house.rooms[fx.cheap].quality = "cheap";
      syncBunker(state);
    }
    if (fx.blockBonus) state.house.niaBonusBlocked = true;
    if (fx.hush) state.house.hush = true;
    if (fx.reserve) state.house.reserveNext = true;
    if (fx.leak) rollLeak(state, true);
    if (kept) state.house.wordKept.push({ id: rec.id, defId: rec.defId, residentId: rec.residentId, q: state.turn });
    else state.house.wordBroken.push({ id: rec.id, defId: rec.defId, residentId: rec.residentId, q: state.turn });
    return null;
  }

  LD.houseKeepPromise = function (state) {
    state = clone(state);
    var err = wordGuard(state);
    if (err) return { ok: false, error: err, state: state };
    var rec = duePromise(state);
    var def = PROM_BY[rec.defId];
    var fx = def.keep ? def.keep(state, rec) : {};
    var fail = applyWordFx(state, fx, rec, true);
    if (fail) return { ok: false, error: fail, state: state };
    rec.status = "kept";
    state.house.promiseDueThisQ = null;
    spendAct(state, "keep:" + rec.id);
    log(state, "You kept your word to " + RES_BY[rec.residentId].name + ".");
    return { ok: true, state: state, promise: rec };
  };

  LD.housePostponePromise = function (state) {
    state = clone(state);
    var err = wordGuard(state);
    if (err) return { ok: false, error: err, state: state };
    var rec = duePromise(state);
    if (rec.postponed) return { ok: false, error: "You already postponed this once.", state: state };
    rec.postponed = true;
    rec.dueQ = Math.min(12, rec.dueQ + 1);
    /* Avoid colliding with another open promise. */
    var taken = {};
    openPromises(state).forEach(function (p) { if (p.id !== rec.id) taken[p.dueQ] = true; });
    while (taken[rec.dueQ] && rec.dueQ < 12) rec.dueQ += 1;
    state.house.promiseDueThisQ = null;
    spendAct(state, "postpone:" + rec.id);
    log(state, "You postponed your word to " + RES_BY[rec.residentId].name + ". It comes due Q" + rec.dueQ + ".");
    return { ok: true, state: state, promise: rec };
  };

  LD.houseBreakPromise = function (state) {
    state = clone(state);
    var err = wordGuard(state);
    if (err) return { ok: false, error: err, state: state };
    var rec = duePromise(state);
    var def = PROM_BY[rec.defId];
    var fx = def.brk ? def.brk(state, rec) : { unrest: 4 };
    applyWordFx(state, fx, rec, false);
    rec.status = "broken";
    state.house.promiseDueThisQ = null;
    spendAct(state, "break:" + rec.id);
    log(state, "You broke your word to " + RES_BY[rec.residentId].name + ".");
    return { ok: true, state: state, promise: rec };
  };

  function breakPromisesFor(state, residentId, why) {
    openPromises(state).forEach(function (rec) {
      if (rec.residentId !== residentId) return;
      var def = PROM_BY[rec.defId];
      var fx = def && def.brk ? def.brk(state, rec) : { unrest: 4 };
      applyWordFx(state, fx, rec, false);
      rec.status = "broken";
      rec.brokeWhy = why;
      if (state.house.promiseDueThisQ === rec.id) state.house.promiseDueThisQ = null;
      log(state, "The word you gave " + RES_BY[residentId].name + " is broken.");
    });
  }

  function rollLeak(state, force) {
    if (!LD.isHouse(state)) return false;
    if (state.house.hush && !force) return false;
    if (!force && !hasRes(state, "lila")) return false;
    var rng = LD.createRng(LD.hashString("leak:" + state.seed + ":" + state.turn + ":" + (state.house.leakRolls || 0)));
    state.house.leakRolls = (state.house.leakRolls || 0) + 1;
    if (!force && rng() >= 0.15) return false;
    if (LD.fyAddCurse) LD.fyAddCurse(state, "c_leak", "a note from the house");
    else log(state, "A leak leaves the house.");
    return true;
  }

  LD.houseDuePromise = function (state) { return LD.isHouse(state) ? duePromise(state) : null; };
  LD.houseArrival = function (state) { return LD.isHouse(state) && state.house ? state.house.arrival : null; };


  function seenId(state, id) {
    var h = state.house;
    if (h.residents.some(function (r) { return r.id === id; })) return true;
    if ((h.paidOff || []).some(function (x) { return x.id === id; })) return true;
    if ((h.turnedAway || []).some(function (x) { return x.id === id; })) return true;
    if ((h.askedToLeave || []).some(function (x) { return x.id === id; })) return true;
    return false;
  }
  function systemPool(state) {
    return ["helen", "tom", "nia", "eli"].filter(function (id) { return !seenId(state, id); });
  }
  function maybeArrive(state) {
    var h = state.house;
    if (h.arrival) return;
    if (h.reserveNext) { h.reserveNext = false; log(state, "The free bunk stays for Rosa. No one else comes this quarter."); return; }
    if (state.turn < 2) return;
    var rng = LD.createRng(LD.hashString("house-arrive:" + state.seed + ":" + state.turn));
    var sys = systemPool(state);
    var lilaOk = !seenId(state, "lila") && state.turn >= 3;
    var id = null;
    /* System residents fill rooms and do not share the target with Lila. Pace: about one from Q2, all four by seal time. */
    if (sys.length) {
      var sysSeen = 4 - sys.length;
      var p = 0.78 + (state.unrest || 0) / 500;
      if (state.turn === 2) p = 1;
      if ((13 - state.turn) <= sys.length) p = 1;
      if (sysSeen < state.turn - 2) p = 1;
      if (rng() < p) id = rng.pick(sys);
    }
    /* Lila arrives on her own track, and only when the door is free. She is usually in by Q7. */
    if (!id && lilaOk) {
      var lp = 0.55 + (state.unrest || 0) / 400;
      if (state.turn >= 6) lp = 1;
      if (rng() < lp) id = "lila";
    }
    if (!id) return;
    h.arrival = { id: id, q: state.turn };
    h.arrivalsQ = state.turn;
    h.arrivalsTotal = (h.arrivalsTotal || 0) + 1;
    log(state, RES_BY[id].name + " is at the door.");
  }

  /* Stores and Lila at the close of the quarter that is ending. */
  LD.houseBeforeClose = function (state) {
    if (!LD.isHouse(state) || !state.house) return;
    var h = state.house;
    var inc = incomeFor(state);
    var drain = drainFor(h.residents.length, hasRes(state, "nia"));
    h.stores = h.stores + inc - drain;
    if (inc || drain) log(state, "Stores " + (inc ? "+" + inc : "") + (drain ? " −" + drain : "") + " (now " + Math.max(0, h.stores) + ").");
    if (h.stores < 0) {
      h.stores = 0;
      darkenRoom(state);
    }
    if (hasRes(state, "lila")) {
      state.unrest = clamp(state.unrest - 1, 0, LD.MAX_UNREST);
      log(state, "Lila keeps the street a little quieter. Unrest −1.");
    }
  };

  function darkenRoom(state) {
    var order = ["air", "water", "power", "food"];
    var pick = null;
    order.forEach(function (id) {
      var r = state.house.rooms[id];
      if (pick) return;
      if (r.on && (!r.by || !RES_BY[r.by])) pick = id;
    });
    if (!pick) {
      order.forEach(function (id) {
        var r = state.house.rooms[id];
        if (pick) return;
        if (r.on && r.quality === "sound") { r.quality = "cheap"; pick = id; log(state, "The stores ran out. The " + id + " room starts to crack."); }
      });
      if (pick) { syncBunker(state); return; }
    }
    if (!pick) {
      order.forEach(function (id) {
        if (pick) return;
        if (state.house.rooms[id].on) pick = id;
      });
    }
    if (!pick) return;
    var room = state.house.rooms[pick];
    if (room.by && RES_BY[room.by]) {
      /* Occupied: crack rather than evict. */
      if (room.quality === "sound") {
        room.quality = "cheap";
        log(state, "The stores ran out. The " + pick + " room starts to crack.");
        syncBunker(state);
        return;
      }
    }
    room.on = false;
    if (!room.by || !RES_BY[room.by]) { room.by = null; room.base = null; }
    log(state, "The stores ran out. The " + pick + " room goes dark.");
    syncBunker(state);
  }

  LD.houseAfterClose = function (state) {
    if (!LD.isHouse(state) || !state.house) return;
    /* A leftover arrival waits. A due promise can consume the act, so they must not be sent away for that. No second arrival while one is at the door. */
    var dues = openPromises(state).filter(function (p) { return p.dueQ <= state.turn; }).sort(function (a, b) { return a.dueQ - b.dueQ || a.id.localeCompare(b.id); });
    if (dues.length) {
      state.house.promiseDueThisQ = dues[0].id;
      log(state, "A promise comes due: " + dues[0].text);
    } else {
      state.house.promiseDueThisQ = null;
    }
    maybeArrive(state);
  };

  LD.houseNoteDeal = function (state, dealId) {
    if (!LD.isHouse(state) || !state.house) return;
    var d = LD.dealById && LD.dealById(dealId);
    state.house.dealLog.push({ q: state.turn, id: dealId, tags: (d && d.tags) || [] });
    if (state.house.dealLog.length > 40) state.house.dealLog = state.house.dealLog.slice(-40);
  };

  /* Tom: water-tagged unrest −3 (min 0). Eli: extractive unrest −1. Applied to positive unrest only. */
  LD.houseAdjustUnrest = function (state, amount, deal) {
    if (!LD.isHouse(state) || !amount) return amount;
    var tags = tagsOf(deal);
    var adj = amount;
    if (amount > 0 && hasRes(state, "tom") && tags.indexOf("water") !== -1) {
      adj = Math.max(0, adj - 3);
    }
    if (amount > 0 && hasRes(state, "eli") && tags.indexOf("extractive") !== -1) {
      adj = Math.max(0, adj - 1);
    }
    return adj;
  };

  LD.houseGrantSystem = function (state, grant, notes) {
    if (!LD.isHouse(state) || !grant || !state.house || !state.house.rooms[grant.id]) return false;
    notes = notes || [];
    var room = state.house.rooms[grant.id];
    if (grant.level >= LD.WIN_LEVEL) {
      if (!room.on) {
        room.on = true;
        room.base = "spoil";
        if (!room.by) room.by = "spoil";
        room.quality = grant.quality || "sound";
        notes.push(grant.id + " room comes on (" + (room.quality === "cheap" ? "cheap" : "sound") + ", no one lives there)");
        syncBunker(state);
        return true;
      }
      if (grant.quality === "sound" && room.quality === "cheap") {
        room.quality = "sound";
        notes.push(grant.id + " recertified sound");
        syncBunker(state);
        return true;
      }
      state.cash += 8;
      notes.push("Redundant " + grant.id + " component sold, +8 cash");
      return true;
    }
    if (!room.on) {
      notes.push(grant.id + " crates arrive; the room is not running yet");
      return true;
    }
    state.cash += 8;
    notes.push("Redundant " + grant.id + " component sold, +8 cash");
    return true;
  };

  LD.houseReliable = function (state, systemId) {
    if (!LD.isHouse(state) || !state.house) return null;
    var room = state.house.rooms[systemId];
    if (!room || !room.on) return false;
    if (room.quality === "sound") return true;
    if (hasRes(state, "helen")) return true;
    return false;
  };

  function wellStocked(state) {
    if (!LD.isHouse(state) || !state.house) return false;
    if (state.house.niaBonusBlocked) return false;
    if (!hasRes(state, "nia")) return false;
    if ((state.house.stores | 0) < 5) return false;
    return LD.SYSTEMS.every(function (s) {
      var room = state.house.rooms[s.id];
      return room.on && LD.systemReliable(state, s.id);
    });
  }
  LD.houseWellStocked = wellStocked;

  LD.houseSealBonus = function (state) {
    var full = wellStocked(state);
    var rooms = full ? LD.SYSTEMS.map(function (s) {
      return { id: s.id, name: s.name, title: s.name, line: "" };
    }) : [];
    return {
      rooms: rooms, n: full ? 4 : 0, full: full,
      div: full ? 20 : 0, xp: full ? 30 : 0,
      perRoom: 0, fullDiv: 20, house: true
    };
  };

  LD.houseEvacuation = function (state) {
    if (!LD.isHouse(state) || !state.house) return null;
    var missing = [], unreliable = [];
    LD.SYSTEMS.forEach(function (s) {
      var room = state.house.rooms[s.id];
      if (!room || !room.on) missing.push(s.name);
      else if (!LD.systemReliable(state, s.id)) unreliable.push(s.name);
    });
    if (missing.length) {
      return {
        kind: "lose",
        reason: "unfinished",
        title: "An unfinished hole in the ground",
        body: "The doors can close. They should not. Rooms still dark: " + missing.join(", ") + "."
      };
    }
    if (unreliable.length) {
      return {
        kind: "lose",
        reason: "failed-systems",
        title: "The cheapest filters failed first",
        body: "You sealed on time. The rushed work did not hold. Failed rooms: " + unreliable.join(", ") + "." + (hasRes(state, "helen") ? "" : " Helen would have made the discount work hold.")
      };
    }
    var faces = state.house.residents.length;
    var sb = LD.houseSealBonus(state);
    var flavor = [];
    if (hasFlagSafe(state, "clinicSold")) flavor.push("There is no surgeon. You did sell the clinic lot.");
    if (hasFlagSafe(state, "blackoutContracts")) flavor.push("The generator is yours. The grid you priced in the dark is not coming back.");
    if ((state.house.stores | 0) <= 0) flavor.push("The larder was empty when the doors closed.");
    if (state.house.wordKept.length) {
      flavor.push(wordLine(state, true));
    }
    if (state.house.wordBroken.length) {
      flavor.push(wordLine(state, false));
    }
    if (!faces) flavor.push("No one else came with you.");
    var title, body;
    if (sb.full) {
      title = "The doors close on a well-stocked house";
      body = "Four rooms on, Nia in the kitchen, stores enough to last. The last dividend is a set table.";
    } else if (!faces) {
      title = "The doors close on an empty house";
      body = "Air, water, power, and food all hold. The rooms hum. The chairs do not.";
    } else {
      title = "The doors close on time";
      body = "Air, water, power, and food all hold. The last dividend is silence, with company.";
    }
    if (flavor.length) body += " " + flavor.join(" ");
    return {
      kind: "win",
      reason: "evacuated",
      title: title,
      body: body,
      overbuilt: 0,
      fortress: !!sb.full,
      house: true,
      wellStocked: !!sb.full,
      wordKept: state.house.wordKept.length,
      wordBroken: state.house.wordBroken.length
    };
  };

  function wordLine(state, kept) {
    var list = kept ? state.house.wordKept : state.house.wordBroken;
    var names = [];
    list.forEach(function (w) {
      var n = RES_BY[w.residentId] ? RES_BY[w.residentId].name : w.residentId;
      if (names.indexOf(n) === -1) names.push(n);
    });
    if (!names.length) return "";
    if (kept) return "You kept your word to " + joinNames(names) + ".";
    return "The word you gave " + joinNames(names) + " did not travel with you.";
  }
  function joinNames(names) {
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + " and " + names[1];
    return names.slice(0, -1).join(", ") + ", and " + names[names.length - 1];
  }
  function hasFlagSafe(state, id) { return !!(state.flags && state.flags[id]); }

  LD.HOUSE_SHOP_CLOSED = "The house is not a shop. Rooms come on with people, or with a late contractor.";
  LD.HOUSE_ENGINEER_CLOSED = "Helen Cho is the engineer, if you let her in.";

  LD.houseFightStart = function (state, fg) {
    if (!LD.isHouse(state) || !fg) return;
    if (hasRes(state, "nia")) {
      fg.niaBlock = 3;
      fg.block = (fg.block || 0) + 3;
    }
  };

  LD.houseFightBeforeHit = function (state, fg) {
    if (!LD.isHouse(state) || !fg) return;
    if (fg.playedBlock) fg.helenUsed = true;
    if (fg.helenUsed || !hasRes(state, "helen")) return;
    fg.block = (fg.block || 0) + 4;
    fg.helenUsed = true;
    fg.helenBlock = 4;
  };

  LD.houseAfterFight = function (state, fg) {
    if (!LD.isHouse(state) || !fg) return;
    if (state.house.hush) return;
    if (!hasRes(state, "lila")) return;
    var loud = fg.enc === "journalist" || fg.enc === "protest" || !fg.done || (fg.done && !fg.done.win) || (fg.hits | 0) > 0;
    if (!loud) return;
    rollLeak(state, false);
  };

  /* ---------- Wraps that are safe once meta/fy have loaded ---------- */
  if (LD.selectDeal) {
    var _select = LD.selectDeal;
    LD.selectDeal = function (state, dealId, choiceId) {
      var r = _select(state, dealId, choiceId);
      if (r && r.ok && LD.isHouse(r.state)) LD.houseNoteDeal(r.state, dealId);
      return r;
    };
  }
  if (LD.sealBonus) {
    var _seal = LD.sealBonus;
    LD.sealBonus = function (state) {
      if (LD.isHouse(state)) return LD.houseSealBonus(state);
      return _seal(state);
    };
  }
  if (LD.mandateMet) {
    var _met = LD.mandateMet;
    LD.mandateMet = function (state) {
      if (LD.isHouse(state) && state.mandate === "public") {
        return !!(state.ending && state.ending.kind === "win" && state.house && !state.house.contractorUsed);
      }
      return _met(state);
    };
  }

})();
