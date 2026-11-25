/* Last Dividend — Phase 2 house view (1978 Mara shell). Render only; ui.js drives the turn.
   Behind LD.HOUSE_RULES / state.ruleset. Shop runs never call this. */
(function () {
  var BASE = "assets/house/1978/";
  LD.HOUSE_TURN_MS = 1000;
  LD.HOUSE_FRAMES = [
    { id: "turn-1-before", src: BASE + "turn-1-before.webp", at: 0 },
    { id: "turn-2-push", src: BASE + "turn-2-push.webp", at: 0.14 },
    { id: "turn-3-spin1", src: BASE + "turn-3-spin1.webp", at: 0.32 },
    /* spin2b: a repaint at the same camera distance as 3 and 5 (the old turn-4-spin2 used a wider camera and is kept, unused) */
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

  /* ui.mode: "before" | "turning" | "after" | "back"
     ui.card: "arrival" | "word" | null; ui.leaveId; ui.auto; ui.canEnd */
  LD.renderHouseStage = function (state, ui) {
    ui = ui || {};
    var mode = ui.mode || "after";
    var cls = "hv-root is-" + mode + (ui.auto ? " is-auto" : "") + (ui.card ? " has-card" : "") + (ui.leaveId ? " has-sheet" : "");
    var frames = LD.HOUSE_FRAMES.map(function (f, i) {
      return '<img class="hv-plate" data-frame="' + i + '" src="' + f.src + '" alt="" draggable="false">';
    }).join("");
    var showSet = mode === "after" || mode === "turning";
    var h = '<div class="' + cls + '" id="hv-stage" role="dialog" aria-label="The house">';
    h += '<div class="hv-bg" aria-hidden="true"><img src="' + BASE + 'turn-bg.webp" alt="" draggable="false"><i class="e l"></i><i class="e r"></i></div>';
    h += ui.seated && LD.seatHud ? LD.seatHud(state, { menu: false, nets: false }).replace('class="sd-menu"', 'class="sd-menu" tabindex="-1" aria-hidden="true"') : LD.renderHouseHud(state);
    h += '<div class="hv-clip"><div class="hv-rig">';
    h += '<div class="hv-plates" aria-hidden="true">' + frames + "</div>";
    if (showSet) h += LD.renderHouseFeed(state);
    h += "</div></div>";
    if (showSet) h += LD.renderHouseBand(state);
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

  LD.renderHousePeek = function (state) {
    if (!LD.houseCanPeek(state)) return "";
    return '<button type="button" class="house-peek" id="house-peek" aria-label="Look back at the house">Look back</button>';
  };
})();
