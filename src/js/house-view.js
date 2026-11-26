/* Last Dividend — Phase 2 house view (1978 Mara shell). Render only; ui.js drives the turn.
   Behind LD.HOUSE_RULES / state.ruleset. Shop runs never call this. */
(function () {
  var BASE = "assets/house/1978/";
  LD.HOUSE_TURN_MS = 1000;
  LD.HOUSE_FRAMES = [
    { id: "turn-1-before", src: BASE + "turn-1-before-clean.webp", at: 0 }, /* brass pins painted out (turn-1-before.webp kept): matches the glass-pin desk */
    { id: "turn-2-push", src: BASE + "turn-2-push.webp", at: 0.14 },
    { id: "turn-3-spin1", src: BASE + "turn-3-spin1.webp", at: 0.32 },
    /* spin2b: a repaint at the same camera distance as 3 and 5 (the old turn-4-spin2 used a wider camera; the original is kept in art-src/house-originals) */
    { id: "turn-4-spin2b", src: BASE + "turn-4-spin2b.webp", at: 0.5 },
    { id: "turn-5-warm", src: BASE + "turn-5-warm.webp", at: 0.68 },
    { id: "turn-6-after", src: BASE + "turn-6-after.webp", at: 0.86 }
  ];

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function hasRes(state, id) {
    return !!(state && state.house && state.house.residents && state.house.residents.some(function (r) { return r.id === id; }));
  }
  function roomOf(state, id) { return state.house && state.house.rooms ? state.house.rooms[id] : null; }
  function fyBusy(state) {
    if (LD.fyBusy) return !!LD.fyBusy(state);
    var f = state && state.fy;
    return !!(f && (f.fight && !f.fight.done || f.reward || f.memo || f.draft));
  }
  function away(state) { return !!(state && state.fy && state.fy.fight && state.fy.fight.venue === "away"); }
  function visitorSeated(state) {
    var f = state && state.fy;
    return !!(f && f.fight && !f.fight.done);
  }

  /* At home, no visitor, no fight: you may peek at the house and still pick a deal. */
  LD.houseCanPeek = function (state) {
    if (!LD.isHouse(state) || !state || state.ended) return false;
    if (visitorSeated(state) || fyBusy(state) || away(state)) return false;
    return true;
  };
  /* Auto-turn once you are at home and out of table moves for the quarter. */
  LD.houseCanAutoTurn = function (state) {
    if (!LD.houseCanPeek(state)) return false;
    if (state.phase !== "bunker" || !state.dealPickedThisTurn) return false;
    return true;
  };

  var BAND = {
    helen: { name: "Helen", role: "Power", line: "Lights on once a fight. Unthanked." },
    tom: { name: "Tom", role: "Water", line: "Water deals soften. Tank \u201cis fine\u201d." },
    lila: { name: "Lila", role: "Press", line: "Eases the street. Writes it all down." },
    nia: { name: "Nia", role: "Food", line: "Stores stretch. Door starts guarded." },
    eli: { name: "Eli", role: "Air", line: "Dirty jobs sting less. Unpaid overtime." }
  };
  var ROOM_EMPTY = {
    power: { name: "Power", line: "Hums along. Nobody home." },
    water: { name: "Water", line: "Full tank. Nobody to blame." },
    air: { name: "Air", line: "Fans turning. Nobody home." },
    food: { name: "Food", line: "Pantry stocked. Nobody hungry." }
  };
  var ROOM_OF_RES = { helen: "power", tom: "water", nia: "food", eli: "air" };
  var DOOR_LINE = {
    helen: "Knows which fixes were cheap.",
    tom: "Says the cistern is fine.",
    lila: "Reporter. Brought a notebook.",
    nia: "Cook. Keeps the pantry honest.",
    eli: "Junior tech. Has read the dials."
  };
  var PROM_SHORT = {
    "helen-parts": "A crate for the generator",
    "helen-nights": "Cover her quiet night",
    "tom-sister": "A bunk saved for Rosa",
    "tom-well": "Leave the town well alone",
    "nia-plate": "A plate for whoever is in",
    "nia-door": "Nobody turned from her door",
    "lila-notes": "Her notes stay in the house",
    "lila-file": "She files at the seal, not before",
    "eli-filter": "A real filter for the intake",
    "eli-hours": "Off nights before the doors close"
  };
  LD.houseBreakCost = function (state, rec) {
    var def = LD.housePromiseDef && LD.housePromiseDef(rec.defId);
    var fx = def && def.brk ? def.brk(state, rec) : { unrest: 4 };
    var parts = [];
    if (fx.unrest) parts.push("Unrest +" + fx.unrest);
    if (fx.cheap) parts.push(cap(fx.cheap) + " cheap");
    if (fx.leak) parts.push("a leak");
    if (fx.blockBonus) parts.push("no house bonus");
    return parts.join(", ");
  };
  LD.houseKeepCost = function (state, rec) {
    var def = LD.housePromiseDef && LD.housePromiseDef(rec.defId);
    var fx = def && def.keep ? def.keep(state, rec) : {};
    var parts = [];
    if (fx.cash) parts.push("$" + fx.cash + "M");
    if (fx.stores) parts.push(fx.stores < 0 ? (-fx.stores) + " Stores" : "+" + fx.stores + " Stores");
    if (fx.reserve && !parts.length) parts.push("a bunk held");
    return { text: parts.join(" + "), blocked: !!fx.blocked };
  };

  LD.houseBandItems = function (state) {
    var items = [], seen = {};
    if (!state || !state.house) return items;
    (state.house.residents || []).forEach(function (r) {
      var b = BAND[r.id];
      if (!b) return;
      seen[ROOM_OF_RES[r.id] || r.id] = true;
      items.push({ id: r.id, name: b.name, role: b.role, line: b.line, kind: "person" });
    });
    ["power", "water", "air", "food"].forEach(function (id) {
      var room = roomOf(state, id);
      if (!room || !room.on || seen[id]) return;
      var e = ROOM_EMPTY[id];
      items.push({ id: id, name: e.name, role: "", line: e.line, kind: "room" });
    });
    return items;
  };

  function feedCell(state, systemId, resId) {
    var room = roomOf(state, systemId) || { on: false };
    var occupied = resId && hasRes(state, resId);
    var failing = !!(room.on && room.quality === "cheap" && !hasRes(state, "helen"));
    var kind = !room.on ? "dark" : occupied ? "on" : "empty";
    var src = BASE + "feed/" + systemId + "-" + kind + ".webp";
    var label = occupied ? (LD.houseResident(resId) || {}).name : room.on ? (ROOM_EMPTY[systemId] || {}).name : systemId;
    var cls = "hv-cell is-" + kind + (failing ? " is-failing" : "") + (room.on ? " is-lit" : "");
    var tap = occupied ? " data-leave=\"" + resId + "\"" : "";
    return '<button type="button" class="' + cls + '" data-feed="' + systemId + '"' + tap + ' aria-label="' + esc(label || systemId) + '">' +
      '<img src="' + src + '" alt="" draggable="false">' +
      (failing ? '<i class="hv-static" aria-hidden="true"></i>' : "") +
      "</button>";
  }

  /* Lila is not a system room: she gets a tall strip of the feed, inside the glass, only once she is in. */
  LD.renderHouseFeed = function (state) {
    var lila = hasRes(state, "lila");
    var h = '<div class="hv-screen' + (lila ? " has-lila" : "") + '" aria-label="Bunker feed">';
    h += feedCell(state, "power", "helen");
    h += feedCell(state, "water", "tom");
    h += feedCell(state, "air", "eli");
    h += feedCell(state, "food", "nia");
    if (lila) {
      var lr = LD.houseResident("lila") || { name: "Lila Brenner" };
      h += '<button type="button" class="hv-cell hv-lila is-on is-lit" data-leave="lila" aria-label="' + esc(lr.name) + '">' +
        '<img src="' + BASE + 'feed/lila.webp" alt="" draggable="false"></button>';
    }
    h += "</div>";
    return h;
  };

  LD.renderHouseBand = function (state) {
    var items = LD.houseBandItems(state);
    if (!items.length) return "";
    var stores = state.house && state.house.stores != null ? state.house.stores : 0;
    var mood = stores >= 6 ? "comfortable" : stores >= 4 ? "holding" : "tight";
    var h = '<aside class="hv-band" aria-label="This run">';
    h += '<p class="hv-band-k">This run</p>';
    h += '<ul class="hv-band-list">';
    items.forEach(function (it) {
      h += '<li class="hv-band-item hv-' + it.kind + '"><b>' + esc(it.name) + (it.role ? " \u00b7 " + esc(it.role) : "") + "</b><span>" + esc(it.line) + "</span></li>";
    });
    h += "</ul>";
    h += '<p class="hv-stores">Stores <b>' + stores + "</b> \u00b7 " + mood + "</p>";
    var inl = LD.eraInheritLine ? LD.eraInheritLine(state) : "";
    if (inl) h += '<p class="hv-inherit">' + esc(inl) + "</p>";
    h += "</aside>";
    return h;
  };

  function promiseChoices(state, residentId, selected) {
    var list = (LD.HOUSE_PROMISES || []).filter(function (p) { return p.residentId === residentId; });
    if (!list.length) return "";
    var h = '<div class="hv-promises" role="radiogroup" aria-label="Give your word, optional">';
    h += '<p class="hv-prom-k">Give your word <small>optional</small></p>';
    list.forEach(function (p) {
      var on = selected === p.id;
      var due = Math.min(12, (state.turn | 0) + (p.dueIn || 2));
      h += '<label class="hv-prom' + (on ? " on" : "") + '"><input type="radio" name="hv-prom" value="' + esc(p.id) + '"' + (on ? " checked" : "") + ">" +
        "<span>" + esc(PROM_SHORT[p.id] || p.text) + "<small> \u00b7 Q" + due + "</small></span></label>";
    });
    h += '<label class="hv-prom' + (!selected ? " on" : "") + '"><input type="radio" name="hv-prom" value=""' + (!selected ? " checked" : "") + "><span>No promise</span></label>";
    h += "</div>";
    return h;
  }

  LD.renderHouseArrival = function (state, opts) {
    opts = opts || {};
    var arr = LD.houseArrival && LD.houseArrival(state);
    if (!arr) return "";
    var res = LD.houseResident(arr.id) || { id: arr.id, name: arr.id };
    var can = LD.houseCanAdmit ? LD.houseCanAdmit(state, arr.id) : null;
    var replace = can === "replace";
    var blocked = can && can !== "replace";
    var cost = LD.housePayOffCost ? LD.housePayOffCost(state, arr.id) : 0;
    var occupant = null;
    if (replace && res.room && state.house.rooms[res.room]) occupant = LD.houseResident(state.house.rooms[res.room].by);
    var h = '<article class="hv-card hv-arrival" role="dialog" aria-label="Someone at the door">';
    h += "<header><small>At the door</small><h2>" + esc(res.name) + "</h2></header>";
    h += '<p class="hv-line">' + esc(DOOR_LINE[res.id] || "") + "</p>";
    if (replace && occupant) h += '<p class="hv-note">' + esc(occupant.name.split(" ")[0]) + " leaves. Unrest +3.</p>";
    if (blocked) h += '<p class="hv-note">' + esc(can) + "</p>";
    var openN = (state.house.promises || []).filter(function (p) { return p.status === "open"; }).length;
    if (openN < 2) h += promiseChoices(state, res.id, opts.promiseId || null);
    h += '<div class="hv-verbs v3">';
    if (replace) h += '<button type="button" class="btn btn-coral" id="hv-admit" data-verb="replace"><b>Replace</b></button>';
    else h += '<button type="button" class="btn btn-coral" id="hv-admit" data-verb="admit"' + (blocked ? " disabled" : "") + "><b>Admit</b></button>";
    h += '<button type="button" class="btn" id="hv-payoff"><b>Pay off</b><small>$' + cost + "M</small></button>";
    h += '<button type="button" class="btn" id="hv-turnaway"><b>Turn away</b></button>';
    h += "</div></article>";
    return h;
  };

  LD.renderHouseWord = function (state) {
    var rec = LD.houseDuePromise && LD.houseDuePromise(state);
    if (!rec) return "";
    var who = LD.houseResident(rec.residentId) || { name: "them" };
    var keep = LD.houseKeepCost(state, rec);
    var brk = LD.houseBreakCost(state, rec);
    var h = '<article class="hv-card hv-word" role="dialog" aria-label="A promise comes due">';
    h += "<header><small>The Word \u00b7 due</small><h2>" + esc(who.name) + "</h2></header>";
    h += '<p class="hv-line">' + esc(PROM_SHORT[rec.defId] || rec.text) + ".</p>";
    if (keep.blocked) h += '<p class="hv-note">You turned someone away. This one cannot be kept.</p>';
    h += '<div class="hv-verbs v3">';
    h += '<button type="button" class="btn btn-coral" id="hv-keep"' + (keep.blocked ? " disabled" : "") + "><b>Keep</b>" + (keep.text ? "<small>" + esc(keep.text) + "</small>" : "") + "</button>";
    h += '<button type="button" class="btn" id="hv-postpone"' + (rec.postponed ? " disabled" : "") + "><b>Postpone</b><small>" + (rec.postponed ? "used" : "once") + "</small></button>";
    h += '<button type="button" class="btn" id="hv-break"><b>Break</b><small>' + esc(brk) + "</small></button>";
    h += "</div></article>";
    return h;
  };

  LD.houseLeaveCopy = function (state, id) {
    var res = LD.houseResident(id);
    if (!res) return { title: "", line: "" };
    var unrest = 4;
    if (id === "nia") unrest = 6;
    if (id === "lila") unrest = 2;
    var room = res.room ? roomOf(state, res.room) : null;
    var stays = !!(room && room.base && room.base !== id);
    var line = "Ask " + res.name + " to leave?";
    if (res.room) line += stays ? " " + cap(res.room) + " stays on, empty." : " " + cap(res.room) + " goes dark.";
    line += " Unrest +" + unrest + ".";
    if (id === "nia") line += " The house bonus is off the table.";
    if (id === "lila") line += " One leak roll as she leaves.";
    return { title: "Ask " + res.name + " to leave?", line: line, unrest: unrest };
  };
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  LD.renderHouseLeave = function (state, id) {
    var c = LD.houseLeaveCopy(state, id);
    if (!c.title) return "";
    var h = '<div class="hv-sheet" role="dialog" aria-label="' + esc(c.title) + '">';
    h += "<p>" + esc(c.line) + "</p>";
    h += '<div class="hv-verbs">';
    h += '<button type="button" class="btn btn-coral" id="hv-leave-ok">Ask to leave</button>';
    h += '<button type="button" class="btn" id="hv-leave-no">Close</button>';
    h += "</div></div>";
    return h;
  };

  LD.renderHouseHud = function (state) {
    if (!state) return "";
    return '<div class="hv-hud" aria-label="Meters">' +
      '<span class="hv-m cash"><small>Cash</small><b>$' + (state.cash | 0) + "M</b></span>" +
      '<span class="hv-m unrest"><small>Unrest</small><b>' + (state.unrest | 0) + "</b></span>" +
      '<span class="hv-m collapse"><small>Collapse</small><b>' + (state.collapse | 0) + "</b></span>" +
      '<span class="hv-m q"><small>Quarter</small><b>Q' + (state.turn | 0) + "</b></span>" +
      "</div>";
  };


  /* ---------- Era goals view: 1978 holdings board, 2008 island model, Now bunker. Mara has the full plates; every other
     exec keeps their own TV and shows the same facility / site vignettes in its four cells. ---------- */
  var ERA_ART = "assets/house/era/";
  var ERA_YEAR = { 1: "1978", 2: "2008", 3: "Now" };
  var ERA_GOAL_LINE = { 1: "Act I goal \u00b7 all four facilities running by Q4", 2: "Act II goal \u00b7 build the island by Q8", 3: "Act III goal \u00b7 seal with all four rooms holding" };
  /* Mara's plates, % of the 720x1280 rig: the board's four glass panels, the island model's four sites (pin, chip). */
  var BOARD_PANELS = { power: [101, 307, 152, 134], water: [294, 315, 143, 129], air: [102, 497, 151, 133], food: [295, 497, 143, 128] };
  var ISLE_SITES = { water: { pin: [125, 545], chip: [158, 440] }, power: { pin: [360, 520], chip: [362, 396] }, food: { pin: [190, 690], chip: [172, 808] }, air: { pin: [430, 650], chip: [470, 790] } };
  var SLOT_ORDER = { 1: ["power", "water", "air", "food"], 2: ["water", "power", "food", "air"] };
  function pct(v, of) { return (100 * v / of).toFixed(2) + "%"; }
  LD.eraFullArt = function (state) { return !!(state && state.executiveId === "mara"); };
  LD.eraShows = function (state) { return !!(state && state.house && state.house.era && LD.eraAct && LD.eraAct(state) <= 2); };
  LD.eraPlate = function (state) {
    if (!LD.eraShows(state) || !LD.eraFullArt(state)) return null;
    return ERA_ART + "mara/" + (LD.eraAct(state) === 1 ? "board" : "island") + "-after.webp";
  };
  function slotState(state, era, k) {
    var s = LD.eraSlots(state, era)[k];
    if (s.build) return "building";
    if (s.lv >= 1) return "on";
    return LD.eraUpgradeCost(state, k, era) != null && LD.eraFunds(state, era) >= LD.eraUpgradeCost(state, k, era) ? "open" : "locked";
  }
  /* the chip's one-line effect: short enough for the narrowest phone (the full line is on the card) */
  function chipFx(era, k, lv) {
    if (era === 1) return { power: "+$" + 2 * lv + "M a deal", water: "+$" + 3 * lv + "M a qtr", air: "Unrest \u2212" + lv + " a qtr", food: "Banks $" + 4 * lv + "M a qtr" }[k];
    if (k === "food") return "+" + lv + " Stores" + (lv >= 2 ? ", room on" : "");
    return lv >= 3 ? "Starts on, sound" : lv >= 2 ? "Room starts on" : "Starts sound";
  }
  function slotSub(state, era, k) {
    var s = LD.eraSlots(state, era)[k], st = slotState(state, era, k);
    if (st === "building") return "Building \u00b7 ready Q" + (state.turn + 1);
    if (s.lv >= 1) return "Lv " + s.lv + " \u00b7 " + chipFx(era, k, s.lv);
    var c = LD.eraUpgradeCost(state, k, era);
    return (st === "open" ? "Not built \u00b7 $" : "Locked \u00b7 $") + c + "M";
  }
  function pips(lv, build) {
    var h = '<i class="hv-pips" aria-hidden="true">';
    for (var i = 1; i <= LD.ERA_MAX_LV; i++) h += '<i class="' + (i <= lv ? "on" : build && i === build ? "bd" : "") + '"></i>';
    return h + "</i>";
  }
  LD.eraPick = function (state, want) {
    var era = LD.eraAct(state), order = SLOT_ORDER[era] || LD.ERA_SLOTS;
    if (want && order.indexOf(want) !== -1) return want;
    var first = null, fresh = null;
    order.forEach(function (k) { if (!LD.eraCanUpgrade(state, k)) { if (!first) first = k; if (!fresh && !LD.eraSlots(state, era)[k].lv) fresh = k; } });
    if (!fresh) order.forEach(function (k) { var s = LD.eraSlots(state, era)[k]; if (!fresh && !s.lv && !s.build) fresh = k; });
    return fresh || first || order[0];
  };
  LD.renderEraScreen = function (state, ui) {
    var era = LD.eraAct(state), full = LD.eraFullArt(state), sel = LD.eraPick(state, ui && ui.eraSlot);
    var order = SLOT_ORDER[era];
    var kind = era === 1 ? "board" : "isle";
    var h = '<div class="hv-screen hv-era is-' + kind + (full ? " is-full" : " is-tv") + '" aria-label="' + esc(LD.ERA_DEFS[era].title) + '">';
    order.forEach(function (k) {
      var s = LD.eraSlots(state, era)[k], st = slotState(state, era, k), name = LD.eraSlotName(state, era, k);
      if (era === 1 && k === "air") name = "Capitol"; else if (era === 1 && k === "food") name = "Offshore";
      var cls = "hv-eslot is-" + st + (k === sel ? " is-sel" : "");
      var img = ERA_ART + (era === 1 ? "fac-" : "site-") + k + ".webp";
      var chip = '<span class="hv-echip">' + pips(s.lv, s.build) + "<b>" + esc(name) + "</b><small>" + esc(slotSub(state, era, k)) + "</small></span>";
      var lock = st === "locked" ? '<em class="hv-elock">Locked</em>' : "";
      if (full && era === 1) {
        var p = BOARD_PANELS[k];
        h += '<button type="button" class="' + cls + '" data-eslot="' + k + '" style="left:' + pct(p[0], 720) + ";top:" + pct(p[1], 1280) + ";width:" + pct(p[2], 720) + ";height:" + pct(p[3], 1280) + '">' +
          '<img src="' + img + '" alt="" draggable="false">' + lock + chip + "</button>";
      } else if (full) {
        var g = ISLE_SITES[k];
        h += '<button type="button" class="' + cls + ' is-site" data-eslot="' + k + '" style="left:' + pct(g.chip[0], 720) + ";top:" + pct(g.chip[1], 1280) + '">' + chip + "</button>" +
          '<i class="hv-epin is-' + st + (k === sel ? " is-sel" : "") + '" style="left:' + pct(g.pin[0], 720) + ";top:" + pct(g.pin[1], 1280) + '" aria-hidden="true"></i>' +
          (st === "locked" || st === "building" ? '<i class="hv-eveil is-' + st + '" style="left:' + pct(g.pin[0], 720) + ";top:" + pct(g.pin[1], 1280) + '" aria-hidden="true"></i>' : "");
      } else {
        h += '<button type="button" class="' + cls + ' hv-cell" data-eslot="' + k + '"><img src="' + img + '" alt="" draggable="false">' + lock + chip + "</button>";
      }
    });
    h += "</div>";
    return h;
  };
  function firmOf(state) { var ex = LD.execById ? LD.execById(state.executiveId) : null; return ex && ex.firm ? ex.firm : "The firm"; }
  function slotRow(state, era, k, compact) {
    var why = LD.eraCanUpgrade(state, k), c = LD.eraUpgradeCost(state, k, era), s = LD.eraSlots(state, era)[k];
    var name = LD.eraSlotName(state, era, k), def = LD.ERA_DEFS[era].slots[k];
    var nextLv = Math.max(s.lv, s.build) + 1;
    var line = c == null ? "Fully built." : s.build ? "Being built \u00b7 ready Q" + (state.turn + 1) + "." : "Lv " + nextLv + ": " + def.fx(nextLv) + ".";
    var verb = s.lv || s.build ? "Expand" : "Build";
    var btn = c == null || s.build ? "" : '<button type="button" class="btn' + (why ? "" : " btn-coral") + ' hv-era-up" data-eslot="' + k + '"' + (why ? ' aria-disabled="true" data-why="' + esc(why) + '"' : "") + "><b>" + verb + "</b><small>$" + c + "M</small></button>";
    return '<div class="hv-erow' + (compact ? " is-compact" : "") + '"><div class="hv-erow-t"><b>' + esc(name) + "</b><span>" + esc(line) + "</span></div>" + btn + "</div>";
  }
  LD.renderEraCard = function (state, ui) {
    var era = LD.eraAct(state), e = state.house.era, sel = LD.eraPick(state, ui && ui.eraSlot);
    var land = !!(ui && ui.land);
    var h = '<aside class="hv-band hv-ecard" aria-label="' + esc(LD.ERA_DEFS[era].title) + '">';
    h += '<p class="hv-band-k">' + esc(firmOf(state)) + " \u00b7 " + ERA_YEAR[era] + "</p>";
    h += '<h3 class="hv-etitle">' + esc(LD.ERA_DEFS[era].title) + "</h3>";
    if (land) {
      h += '<p class="hv-egoal">' + esc(LD.ERA_DEFS[era].goal) + "</p>";
      (SLOT_ORDER[era]).forEach(function (k) { h += slotRow(state, era, k, true); });
    } else {
      h += slotRow(state, era, sel, false);
    }
    var foot = [];
    if (era === 2 && e.bank) foot.push("Offshore $" + e.bank + "M");
    if (era === 1 && e.bank) foot.push("Offshore banked $" + e.bank + "M");
    if (e.actQ === state.turn) foot.push("Order placed this quarter");
    var staff = (state.house.residents || []).map(function (r) { var b = BAND[r.id]; return b ? '<button type="button" class="hv-estaff" data-leave="' + r.id + '">' + esc(b.name) + "</button>" : ""; }).join("");
    h += '<p class="hv-stores">' + (foot.length ? esc(foot.join(" \u00b7 ")) + " \u00b7 " : "") + "Stores <b>" + (state.house.stores | 0) + "</b></p>";
    if (staff) h += '<p class="hv-estaff-row"><small>Staff</small>' + staff + "</p>";
    h += "</aside>";
    return h;
  };
  LD.renderEraGoal = function (state) {
    var era = LD.eraAct ? LD.eraAct(state) : 3;
    return '<p class="hv-goal" aria-live="polite">' + esc(ERA_GOAL_LINE[era] || "") + "</p>";
  };
  LD.eraInheritLine = function (state) {
    var inh = state && state.house && state.house.era && state.house.era.inherited;
    if (!inh || inh.legacy) return "";
    var p = [];
    if (inh.rooms && inh.rooms.length) p.push(inh.rooms.map(cap).join(", ") + " on from the island");
    if (inh.sound && inh.sound.length) p.push(inh.sound.map(cap).join(", ") + " recertified");
    if (inh.stores) p.push("Stores +" + inh.stores + " from Offshore and the Villa");
    return p.length ? p.join(" \u00b7 ") : "The island left the bunker nothing.";
  };

  /* ui.mode: "before" | "turning" | "after" | "back"
     ui.card: "arrival" | "word" | null; ui.leaveId; ui.auto; ui.canEnd */
  LD.renderHouseStage = function (state, ui) {
    ui = ui || {};
    if (LD.seatUseExec) LD.seatUseExec(state && state.executiveId);
    var mode = ui.mode || "after";
    var cls = "hv-root is-" + mode + (LD.eraShows && LD.eraShows(state) ? " is-era is-era-" + LD.eraAct(state) + (LD.eraFullArt(state) ? " is-era-full" : "") : "") + (ui.auto ? " is-auto" : "") + (ui.card ? " has-card" : "") + (ui.leaveId ? " has-sheet" : "");
    var eraPlate = LD.eraPlate ? LD.eraPlate(state) : null, eraOn = LD.eraShows ? LD.eraShows(state) : false;
    var nF = LD.HOUSE_FRAMES.length;
    var frames = LD.HOUSE_FRAMES.map(function (f, i) {
      var src = eraPlate && i >= nF - 2 ? eraPlate : f.src;
      return '<img class="hv-plate" data-frame="' + i + '" src="' + src + '" alt="" draggable="false">';
    }).join("");
    var showSet = mode === "after" || mode === "turning";
    var h = '<div class="' + cls + '" id="hv-stage" role="dialog" aria-label="The house">';
    h += '<div class="hv-bg" aria-hidden="true"><img src="' + BASE + 'turn-bg.webp" alt="" draggable="false"><i class="e l"></i><i class="e r"></i></div>';
    h += ui.seated && LD.seatHud ? LD.seatHud(state, { menu: false, nets: false }).replace('class="sd-menu"', 'class="sd-menu" tabindex="-1" aria-hidden="true"') : LD.renderHouseHud(state);
    h += '<div class="hv-clip"><div class="hv-rig">';
    h += '<div class="hv-plates" aria-hidden="true">' + frames + "</div>";
    if (showSet) h += eraOn ? LD.renderEraScreen(state, ui) : LD.renderHouseFeed(state);
    h += "</div></div>";
    if (showSet && LD.isHouse(state) && state.house && state.house.era) h += LD.renderEraGoal(state);
    if (showSet) h += eraOn ? LD.renderEraCard(state, ui) : LD.renderHouseBand(state);
    if (mode === "turning") h += '<button type="button" class="hv-skip" id="hv-skip">Skip</button>';
    h += '<div class="hv-dock">';
    if (mode === "after") {
      h += '<button type="button" class="btn hv-back-btn" id="hv-back">Turn back</button>';
      if (ui.canEnd) h += '<button type="button" class="btn btn-coral" id="hv-endq">End quarter</button>';
    }
    h += "</div>";
    if (ui.card === "word") h += LD.renderHouseWord(state);
    else if (ui.card === "arrival") h += LD.renderHouseArrival(state, ui);
    if (ui.leaveId) h += LD.renderHouseLeave(state, ui.leaveId);
    h += "</div>";
    return h;
  };

})();
