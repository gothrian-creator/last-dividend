/* Last Dividend — Phase 2 house view (1978 Mara shell). Render only; ui.js drives the turn.
   Behind LD.HOUSE_RULES / state.ruleset. Shop runs never call this. */
(function () {
  var BASE = "assets/house/1978/";
  LD.HOUSE_TURN_MS = 1000;
  LD.HOUSE_FRAMES = [
    { id: "turn-1-before", src: BASE + "turn-1-before.webp", at: 0 },
    { id: "turn-2-push", src: BASE + "turn-2-push.webp", at: 0.14 },
    { id: "turn-3-spin1", src: BASE + "turn-3-spin1.webp", at: 0.32 },
    { id: "turn-4-spin2", src: BASE + "turn-4-spin2.webp", at: 0.52 },
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
    helen: { name: "Helen", role: "Power", line: "A block can play itself" },
    tom: { name: "Tom", role: "Water", line: "Water deals raise less Unrest" },
    lila: { name: "Lila", role: "", line: "Unrest eases a little each quarter" },
    nia: { name: "Nia", role: "Food", line: "Stores last; a little more door defence" },
    eli: { name: "Eli", role: "Air", line: "Extractive deals raise less Unrest" }
  };
  var ROOM_EMPTY = {
    power: { name: "Power", line: "The generator is on, empty" },
    water: { name: "Water", line: "The cistern is on, empty" },
    air: { name: "Air", line: "The intake is on, empty" },
    food: { name: "Food", line: "The kitchen is on, empty" }
  };
  var ROOM_OF_RES = { helen: "power", tom: "water", nia: "food", eli: "air" };

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
    /* Lit rooms (occupied or empty-running start/contractor) can be tapped to ask a person to leave, if someone is in them. */
    var tap = occupied ? " data-leave=\"" + resId + "\"" : "";
    return '<button type="button" class="' + cls + '" data-feed="' + systemId + '"' + tap + ' aria-label="' + esc(label || systemId) + '">' +
      '<img src="' + src + '" alt="" draggable="false">' +
      (failing ? '<i class="hv-static" aria-hidden="true"></i>' : "") +
      (occupied && resId === "eli" ? '<em class="hv-pip"><b>Eli</b></em>' : "") +
      "</button>";
  }

  LD.renderHouseFeed = function (state) {
    var h = '<div class="hv-screen" aria-label="Bunker feed">';
    h += feedCell(state, "power", "helen");
    h += feedCell(state, "water", "tom");
    h += feedCell(state, "air", "eli");
    h += feedCell(state, "food", "nia");
    h += "</div>";
    if (hasRes(state, "lila")) {
      var lila = LD.houseResident("lila") || { name: "Lila Brenner" };
      h += '<button type="button" class="hv-lila is-on" data-leave="lila" aria-label="' + esc(lila.name) + '">' +
        '<img src="' + BASE + 'feed/lila.webp" alt="" draggable="false"><em class="hv-pip"><b>Lila</b></em></button>';
    }
    return h;
  };

  LD.renderHouseBand = function (state) {
    var items = LD.houseBandItems(state);
    if (!items.length) return '<aside class="hv-band is-empty" hidden></aside>';
    var stores = state.house && state.house.stores != null ? state.house.stores : 0;
    var h = '<aside class="hv-band" aria-label="This run">';
    h += '<p class="hv-band-k">This run</p>';
    h += '<ul class="hv-band-list">';
    items.forEach(function (it) {
      h += '<li class="hv-band-item hv-' + it.kind + '"><b>' + esc(it.name) + (it.role ? " · " + esc(it.role) : "") + "</b><span>" + esc(it.line) + "</span></li>";
    });
    h += "</ul>";
    h += '<p class="hv-stores">Stores <b>' + stores + "</b></p>";
    h += "</aside>";
    return h;
  };

  function promiseChoices(residentId, selected) {
    var list = (LD.HOUSE_PROMISES || []).filter(function (p) { return p.residentId === residentId; });
    if (!list.length) return "";
    var h = '<div class="hv-promises" role="group" aria-label="Give your word, optional">';
    h += '<p class="hv-prom-k">The Word <small>optional</small></p>';
    list.forEach(function (p) {
      var on = selected === p.id;
      h += '<label class="hv-prom' + (on ? " on" : "") + '"><input type="radio" name="hv-prom" value="' + esc(p.id) + '"' + (on ? " checked" : "") + ">" +
        "<span>" + esc(p.text) + "</span></label>";
    });
    h += '<label class="hv-prom' + (!selected ? " on" : "") + '"><input type="radio" name="hv-prom" value=""' + (!selected ? " checked" : "") + "><span>No promise</span></label>";
    h += "</div>";
    return h;
  }

  LD.renderHouseArrival = function (state, opts) {
    opts = opts || {};
    var arr = LD.houseArrival && LD.houseArrival(state);
    if (!arr) return "";
    var res = LD.houseResident(arr.id) || { id: arr.id, name: arr.id, blurb: "" };
    var can = LD.houseCanAdmit ? LD.houseCanAdmit(state, arr.id) : null;
    var replace = can === "replace";
    var blocked = can && can !== "replace";
    var cost = LD.housePayOffCost ? LD.housePayOffCost(state, arr.id) : 0;
    var occupant = null;
    if (replace && res.room && state.house.rooms[res.room]) {
      var by = state.house.rooms[res.room].by;
      occupant = LD.houseResident(by);
    }
    var h = '<article class="hv-card hv-arrival" role="dialog" aria-label="Someone at the door">';
    h += "<header><small>At the door</small><h2>" + esc(res.name) + "</h2>";
    if (res.role) h += "<p class=\"hv-role\">" + esc(res.role) + "</p>";
    h += "</header>";
    if (res.blurb) h += "<p class=\"hv-blurb\">" + esc(res.blurb) + "</p>";
    if (replace && occupant) h += "<p class=\"hv-note\">" + esc(occupant.name) + " leaves. Unrest +3.</p>";
    if (blocked) h += "<p class=\"hv-note\">" + esc(can) + "</p>";
    var openN = (state.house.promises || []).filter(function (p) { return p.status === "open"; }).length;
    if (openN < 2) h += promiseChoices(res.id, opts.promiseId || null);
    h += '<div class="hv-verbs">';
    if (replace) h += '<button type="button" class="btn btn-coral" id="hv-admit" data-verb="replace">Replace</button>';
    else h += '<button type="button" class="btn btn-coral" id="hv-admit" data-verb="admit"' + (blocked ? " disabled" : "") + ">Admit</button>";
    h += '<button type="button" class="btn" id="hv-payoff">Pay off $' + cost + "M</button>";
    h += '<button type="button" class="btn" id="hv-turnaway">Turn away</button>';
    h += "</div></article>";
    return h;
  };

  LD.renderHouseWord = function (state) {
    var rec = LD.houseDuePromise && LD.houseDuePromise(state);
    if (!rec) return "";
    var who = LD.houseResident(rec.residentId) || { name: "them" };
    var def = LD.housePromiseDef && LD.housePromiseDef(rec.defId);
    var fx = def && def.keep ? def.keep(state, rec) : {};
    var cost = [];
    if (fx.cash) cost.push("$" + fx.cash + "M");
    if (fx.stores) cost.push((fx.stores < 0 ? "spend " + (-fx.stores) : "+" + fx.stores) + " Stores");
    if (fx.reserve) cost.push("the next bunk is reserved");
    if (fx.blocked) cost.push("you cannot keep this as things stand");
    var h = '<article class="hv-card hv-word" role="dialog" aria-label="A promise comes due">';
    h += "<header><small>The Word</small><h2>A promise comes due</h2></header>";
    h += "<p class=\"hv-blurb\">" + esc(rec.text) + "</p>";
    h += "<p class=\"hv-note\">" + esc(who.name) + (cost.length ? " · Keep: " + cost.join(", ") : "") + "</p>";
    h += '<div class="hv-verbs">';
    h += '<button type="button" class="btn btn-coral" id="hv-keep"' + (fx.blocked ? " disabled" : "") + ">Keep</button>";
    h += '<button type="button" class="btn" id="hv-postpone"' + (rec.postponed ? " disabled" : "") + ">Postpone once</button>";
    h += '<button type="button" class="btn" id="hv-break">Break</button>';
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
     ui.card: "arrival" | "word" | null
     ui.leaveId: resident id or null
     ui.auto, ui.canEnd */
  LD.renderHouseStage = function (state, ui) {
    ui = ui || {};
    var mode = ui.mode || "after";
    var items = LD.houseBandItems(state);
    var cls = "hv-root is-" + mode + (ui.auto ? " is-auto" : "") + (ui.card ? " has-card" : "") + (ui.leaveId ? " has-sheet" : "");
    var frames = LD.HOUSE_FRAMES.map(function (f, i) {
      return '<img class="hv-plate" data-frame="' + i + '" src="' + f.src + '" alt="" draggable="false">';
    }).join("");
    var band = (items.length && (mode === "after" || mode === "turning")) ? LD.renderHouseBand(state) : "";
    var h = '<div class="' + cls + '" id="hv-stage" role="dialog" aria-label="The house">';
    h += LD.renderHouseHud(state);
    h += '<div class="hv-clip"><div class="hv-rig">';
    h += '<div class="hv-plates" aria-hidden="true">' + frames + "</div>";
    if (mode === "after" || mode === "turning") h += LD.renderHouseFeed(state);
    if (band) h += band.replace('class="hv-band"', 'class="hv-band hv-band-plate"');
    h += "</div></div>";
    if (band) h += band.replace('class="hv-band"', 'class="hv-band hv-band-side"');
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
