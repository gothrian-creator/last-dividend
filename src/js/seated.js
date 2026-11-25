/* Last Dividend — house rules seated desk (B: first person at the 1978 desk). Render + framing maths only; ui.js drives it.
   Only for house runs with Mara (her 1978 turn set is the only one painted). Shop runs never call this. */
(function (root) {
  var LD = root.LD || (root.LD = {});
  var BASE = "assets/house/1978/";
  function esc(s) { return LD.escapeHtml ? LD.escapeHtml(s) : String(s == null ? "" : s); }

  /* Layers live in v6 plate space (720x1280): room-clean + mara-ots == turn frame 1. Boxes are [x, y, w, h]. */
  var SEAT = LD.SEAT = {
    W: 720, H: 1280, FP: [100, 40, 720, 1142],
    room: BASE + "sd-room.webp",
    table: { src: BASE + "sd-table.webp", box: [0, 545, 720, 597] },
    hands: { rest: { src: BASE + "sd-hands-rest-mara.webp", box: [100, 770, 614, 372] }, dip: { src: BASE + "sd-hands-dip-mara.webp", box: [100, 879, 620, 263] } },
    mara: { src: BASE + "sd-mara-ots.webp", box: [181, 389, 539, 891] },
    /* map pins on the painted table map. p: 1 = a painted brass pin sits there; 0 = we add one. */
    pins: { na: [257, 645, 1], sam: [294, 702, 1], eu: [380, 634, 1], me: [437, 651, 1], ea: [457, 651, 1], af: [381, 699, 0], sa: [452, 681, 0], oc: [507, 729, 0] },
    /* region hit areas on the painted map (ellipses cx, cy, rx, ry) */
    regions: { na: [252, 650, 40, 28], sam: [296, 716, 22, 34], eu: [378, 640, 24, 18], af: [384, 704, 24, 32], me: [424, 666, 14, 14], sa: [452, 684, 14, 16], ea: [470, 650, 34, 22], oc: [508, 732, 24, 16] },
    /* seated visitor: each opponent's idle sprite scaled so the waist lands under the table rim (scripts/seated_assets.py). [x, y, w, h] */
    opp: {"ashby":[205.3,254.1,283.4,492.9],"benny":[203.4,284.0,293.3,649.1],"brennan":[202.1,284.0,319.7,463.3],"crowe":[213.7,284.0,263.4,460.9],"dana":[191.0,284.0,303.5,671.9],"delacroix":[229.3,284.0,240.4,461.0],"dunn":[222.5,284.0,242.5,461.0],"gil":[220.2,280.5,270.0,648.8],"grace":[195.0,284.0,311.1,645.3],"gray":[228.4,284.0,240.5,462.7],"hale":[197.7,284.0,307.3,460.9],"harrow":[217.8,284.0,242.4,465.7],"honoria":[235.5,284.0,209.3,647.6],"june":[210.1,271.8,272.2,473.1],"mickey":[220.2,281.0,247.6,464.0],"mina":[190.2,284.0,311.4,483.6],"moretti":[214.6,278.1,244.3,467.9],"odell":[217.8,284.0,269.5,462.0],"okafor":[233.6,284.0,225.4,464.6],"pip":[202.5,284.0,297.4,643.0],"pops":[222.6,284.0,330.4,650.1],"rosa":[227.3,265.9,301.7,479.1],"sorel":[185.2,284.0,327.5,461.0],"theo":[203.5,284.0,284.9,651.2],"ticker":[201.5,284.0,279.5,461.0],"varga":[151.9,265.9,409.4,479.3]},
    table_card: [345, 772],
    bunkerAt: [632, 1000]
  };
  LD.seatedOn = function (state) { return !!(state && LD.isHouse && LD.isHouse(state) && state.executiveId === "mara"); };
  /* how many card kinds the fan shows before a +N: phones keep it to a hand you can read */
  LD.seatFanCap = function (W, H) { return W >= H * 1.2 ? 9 : W > 500 ? 10 : 6; };
  LD.seatLandscape = function (W, H) { return W >= H * 1.2; };
  /* First-person framing: the desk view. Portrait keeps both hands and the map near the centre; landscape stands the plate in the
     same 528px-tall column the live turn rig uses, so the pull-back lands on it exactly. */
  LD.seatFrame = function (W, H) {
    var x0 = SEAT.FP[0], y1 = SEAT.FP[3], s, tx, ty;
    if (LD.seatLandscape(W, H)) { s = H / (y1 - 203); tx = W / 2 - ((x0 + 720) / 2) * s; ty = H - y1 * s;
      /* keep a seated visitor's head (plate y ~260) clear of the 100px HUD */
      ty = Math.min(0, Math.max(ty, 124 - 260 * s)); return { s: s, tx: tx, ty: ty, land: true }; }
    s = Math.max(W / (720 - x0), H / (y1 - SEAT.FP[1]));
    tx = W / 2 - 410 * s; tx = Math.min(-x0 * s, Math.max(W - 720 * s, tx)); ty = H - y1 * s;
    return { s: s, tx: tx, ty: ty, land: false };
  };
  /* The live turn rig (ui.js sizeHouseRig) for the same viewport: the end of the pull-back. */
  LD.seatRigFrame = function (W, H) {
    var s, tx, ty;
    if (LD.seatLandscape(W, H)) { s = H / 1090; return { s: s, tx: (W - 720 * s) / 2, ty: -190 * s, land: true }; }
    s = Math.min(W / 658, Math.max(W / 720, H / 1280));
    tx = Math.max(W - 720 * s, Math.min(0, W - 713 * s)); ty = H - 1280 * s;
    return { s: s, tx: tx, ty: ty, land: false };
  };
  LD.seatLerpFrame = function (a, b, t) {
    return { s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * t), tx: a.tx + (b.tx - a.tx) * t, ty: a.ty + (b.ty - a.ty) * t, land: a.land };
  };
  LD.seatToScreen = function (f, x, y) { return [x * f.s + f.tx, y * f.s + f.ty]; };
  /* The column a landscape stage is clipped to (same as the rig's plate width). */
  LD.seatColumn = function (W, H) { var r = LD.seatRigFrame(W, H); return [r.tx, r.tx + 720 * r.s]; };
  /* Pull-back curves (t 0 = desk, 1 = turn frame 1). Mara rises in from below as a near object; the hands drop out. */
  LD.seatPullAt = function (t) {
    var e = t * t * (3 - 2 * t), ma = Math.max(0, Math.min(1, (t - 0.18) / 0.14)); ma = ma * ma * (3 - 2 * ma);
    var hu = Math.max(0, Math.min(1, (t - 0.12) / 0.2)); hu = hu * hu * (3 - 2 * hu);
    return { e: e, mara: { a: ma, k: 1 + 0.55 * Math.pow(1 - t, 2), dy: 760 * Math.pow(1 - t, 2.2), blur: 5 * Math.pow(1 - t, 2) },
      hands: { a: 1 - hu, dy: 1100 * Math.pow(t, 1.3), blur: 5 * Math.min(1, t * 4) } };
  };
  /* Pin tags: where each tag sits relative to its pin, in screen px at scale 1 (tag centre). */
  var TAG_AT = { na: [-62, -118], sam: [-58, 92], eu: [-6, -150], me: [58, -128], ea: [76, -96], af: [6, 104], sa: [74, 82], oc: [70, 106] };
  LD.seatTagAt = function (rid, k) { var o = TAG_AT[rid] || [0, -110]; return [o[0] * k, o[1] * k]; };

  /* ---------- MG-1 HUD (locked): cream stepped bar, cash, vials, network jewels, quarter ---------- */
  var ICON = {
    unrest: '<path d="M5 15v-4a2 2 0 0 1 4 0v4M11 15v-5a2 2 0 0 1 4 0v5M17 15v-4a2 2 0 0 1 4 0v4" /><circle cx="7" cy="6.5" r="1.7"/><circle cx="13" cy="5" r="1.7"/><circle cx="19" cy="6.5" r="1.7"/>',
    collapse: '<path d="M4 18h18M7 18V9l4-3v12M13 18V4l5 4v10" />',
    scrutiny: '<circle cx="11" cy="10" r="5.5"/><path d="M15 14l5 5"/>',
    air: '<path d="M4 9h11a3 3 0 1 0-3-3M4 13h15a3 3 0 1 1-3 3M4 17h7"/>',
    water: '<path d="M12 3c3 5 6 8 6 11a6 6 0 0 1-12 0c0-3 3-6 6-11z"/>',
    power: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
    food: '<path d="M12 21V9M12 9c0-4 3-6 6-6 0 4-3 6-6 6zM12 13c0-3-2-5-6-5 0 3 2 5 6 5z"/>'
  };
  function ico(k, cls) { return '<svg class="' + (cls || "sd-ic") + '" viewBox="0 0 24 24" aria-hidden="true">' + ICON[k] + "</svg>"; }
  function sunburst() {
    var h = '<svg class="sd-sun" viewBox="0 0 24 24" aria-hidden="true">';
    for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6; h += '<line x1="' + (12 + Math.cos(a) * 3.6).toFixed(2) + '" y1="' + (12 + Math.sin(a) * 3.6).toFixed(2) + '" x2="' + (12 + Math.cos(a) * 9.5).toFixed(2) + '" y2="' + (12 + Math.sin(a) * 9.5).toFixed(2) + '"/>'; }
    return h + '<circle cx="12" cy="12" r="2.8"/></svg>';
  }
  function vial(k, label, v, frac, tip) {
    return '<span class="sd-meter m-' + k + '" data-tip="' + esc(tip) + '" tabindex="0"><span class="sd-vial" style="--f:' + Math.max(0.06, Math.min(1, frac)).toFixed(3) + '"><i></i>' + ico(k) + "</span>" +
      '<span class="sd-mv"><b>' + v + "</b><small>" + label + "</small></span></span>";
  }
  var NET_NAME = { air: "Air", water: "Water", power: "Power", food: "Food" };
  LD.seatHud = function (state, o) {
    o = o || {};
    var fg = o.fight || null, era = LD.eraOf ? LD.eraOf(state) : 1, year = LD.ERAS && LD.ERAS[era] ? LD.ERAS[era].year : "";
    var fq = state.fy && state.fy.rules ? state.fy.rules.finalQ : 12;
    var h = '<header class="sd-hud' + (fg ? " is-fight" : "") + '" aria-label="Run meters">';
    h += '<button type="button" class="sd-menu"' + (o.menu === false ? "" : ' id="btn-menu"') + ' aria-label="Menu">' + sunburst() + "</button>";
    h += '<span class="sd-cash" data-tip="Cash on hand." tabindex="0"><small>Cash</small><b>' + (LD.formatMoney ? LD.formatMoney(state.cash) : "$" + state.cash + "M") + "</b></span>";
    h += '<span class="sd-meters">' + vial("unrest", "Unrest", state.unrest | 0, (state.unrest | 0) / 100, "Unrest " + (state.unrest | 0) + "/100. At 100 the street comes in.") +
      vial("collapse", "Collapse", state.collapse | 0, (state.collapse | 0) / 100, "Collapse " + (state.collapse | 0) + "/100. The world's clock.");
    if (fg) { var sc = Math.max(0, fg.scrut); h += vial("scrutiny", "Scrutiny", '<i id="df-scrut-n">' + sc + "</i>", fg.max ? sc / fg.max : 0, "Scrutiny " + sc + "/" + fg.max + ". Bring it to 0 to win."); }
    h += "</span>";
    h += '<span class="sd-nets">';
    ["air", "water", "power", "food"].forEach(function (id) {
      var lvl = LD.gridLevel ? LD.gridLevel(state, id) : 0, lab = LD.gridLabel ? LD.gridLabel(lvl) : "";
      h += '<button type="button" class="sd-net g' + lvl + '"' + (o.nets === false ? " disabled" : ' data-net="' + id + '"') + ' aria-label="Public ' + NET_NAME[id] + ": " + esc(lab) + '">' + ico(id) + "</button>";
    });
    h += "</span>";
    h += '<span class="sd-q" aria-label="Quarter ' + state.turn + " of " + fq + '"><b>Q' + state.turn + "<i>/" + fq + "</i></b><small>" + esc(year) + "</small></span>";
    return h + "</header>";
  };

  /* ---------- the stage: the room plate and its layers inside a 720x1280 rig ---------- */
  function img(cls, L, extra) {
    var b = L.box;
    return '<img class="' + cls + '" src="' + L.src + '" alt="" draggable="false" style="left:' + b[0] + "px;top:" + b[1] + "px;width:" + b[2] + "px;height:" + b[3] + 'px"' + (extra || "") + ">";
  }
  function oppHtml(art, base, poses, cls) {
    var p = SEAT.opp[art] || SEAT.opp.pip;
    var h = '<div class="sd-opp ' + (cls || "") + '" id="sc-opp" data-art="' + esc(art) + '" data-base="' + base + '" data-pose="' + base + '" style="left:' + p[0] + "px;top:" + p[1] + "px;width:" + p[2] + "px;height:" + p[3] + 'px" aria-hidden="true">';
    poses.forEach(function (q) { h += '<img class="p-' + q + '" src="assets/fight/opp-' + art + "-" + q + '.webp" alt="" draggable="false">'; });
    return h + "</div>";
  }
  LD.seatOppHtml = oppHtml;
  /* o: { opp: html, hands: "rest"|"dip", card: html, mara: bool } */
  LD.seatStage = function (o) {
    o = o || {};
    var h = '<div class="sd-clip"><div class="sd-rig" aria-hidden="true">';
    h += '<img class="sd-room" src="' + SEAT.room + '" alt="" draggable="false">';
    if (o.opp) h += o.opp;
    h += img("sd-table", SEAT.table);
    h += o.under || "";
    if (o.card) h += o.card;
    h += img("sd-mara", SEAT.mara);
    var you = o.youId ? ' id="' + o.youId + '"' : "";
    if (o.hands !== "dip") h += img("sd-hands sd-hands-rest", SEAT.hands.rest);
    if (o.hands !== "rest") h += img("sd-hands sd-hands-dip", SEAT.hands.dip).replace("<img ", "<img" + you + " ");
    return h + "</div></div>";
  };

  /* ---------- the desk ---------- */
  function pinHtml(state, info, i, sel) {
    var p = SEAT.pins[info.region] || SEAT.pins.eu;
    return '<button type="button" class="sd-pin k-' + info.kind + (p[2] ? "" : " add") + (sel === info.id ? " sel" : "") + '" data-deal="' + info.id + '" data-plate="' + p[0] + "," + p[1] + '" style="--i:' + i + '" aria-label="' + esc(info.aria) + '"><i></i></button>';
  }
  function tagHtml(info, i, sel) {
    return '<button type="button" class="sd-tag k-' + info.kind + (sel === info.id ? " sel" : "") + '" data-deal="' + info.id + '" data-rid="' + esc(info.region || "") + '" style="--i:' + i + '" aria-label="' + esc(info.aria) + '"><b>' + esc(info.label) + "</b><em>" + esc(info.tag) + "</em></button>";
  }
  function deckCards(state) {
    var f = state.fy; if (!f || !f.deck) return "";
    var h = "";
    f.deck.forEach(function (c, i) { h += LD.cardFace(c.id, c.up, { attrs: ' data-deck="' + i + '"', cls: "sd-fc" }); });
    return h;
  }
  function quarterList(state, infos, sel) {
    var deal = state.phase === "deal";
    var h = '<section class="sd-panel sd-quarter" aria-label="This quarter"><h4>' + (deal ? "This quarter · pick 1 of " + infos.length : "This quarter · deal signed") + "</h4>";
    if (deal) {
      h += '<ul class="sd-qlist">';
      infos.forEach(function (x) {
        h += '<li><button type="button" class="sd-qrow k-' + x.kind + (sel === x.id ? " sel" : "") + '" data-deal="' + x.id + '"><i class="sd-qpin"></i><span><b>' + esc(x.label) + "</b><small>" + esc(x.regionName ? x.regionName + " · " + x.title : x.title) + "</small></span><em>" + esc(x.tag) + "</em></button></li>";
      });
      h += "</ul>";
    } else if (state.lastDealId && LD.dealById(state.lastDealId)) {
      h += '<p class="sd-signed">Signed: <b>' + esc(LD.dealById(state.lastDealId).title) + "</b></p>";
    }
    var canEnd = state.phase === "bunker" && !(LD.fyBusy && LD.fyBusy(state));
    h += '<button type="button" class="sd-endq" id="btn-endq"' + (canEnd ? "" : " disabled") + "><b>End quarter</b><small>" + (canEnd ? "Close Q" + state.turn + " and read the report" : "Pick a deal on the map first") + "</small></button>";
    return h + "</section>";
  }
  /* ui: { sel: {deal, region, net}, fan: bool, land: bool, dossier: html, peek: bool, memo: bool } */
  LD.renderSeatedDesk = function (state, ui) {
    ui = ui || {};
    var sel = ui.sel || {}, deal = state.phase === "deal" && !state.ended;
    var infos = deal ? state.offered.map(function (id) { return LD.dealTagInfo(state, id); }).filter(Boolean) : [];
    var hasSel = !!(sel.deal || sel.region || sel.net);
    var h = '<div class="desk sd' + (ui.fan ? " is-fan" : "") + (hasSel ? " has-sel" : "") + (ui.land ? " is-land" : "") + (deal ? " is-deal" : " is-bunker") + (ui.closing ? " is-closing" : "") + '" data-phase="'  + state.phase + '">';
    h += '<div class="sd-bg" aria-hidden="true"></div>';
    h += LD.seatStage({ under: "" });
    /* screen-space layer: lines, pins, tags, region taps */
    h += '<div class="sd-ui">';
    h += '<svg class="sd-lines" aria-hidden="true"></svg>';
    Object.keys(SEAT.regions).forEach(function (rid) {
      var r = SEAT.regions[rid], st = state.world && state.world.regions ? state.world.regions[rid] : null;
      var lvl = st && LD.stressLabel ? LD.stressLabel(st.stress) : "calm";
      h += '<button type="button" class="sd-region s-' + lvl + (st && st.owned ? " owned" : "") + (sel.region === rid ? " sel" : "") + '" data-region="' + rid + '" data-plate="' + r[0] + "," + r[1] + '" data-r="' + r[2] + "," + r[3] + '" aria-label="' + esc(LD.REGION_NAMES[rid] + (st && st.owned ? ", yours" : "") + ", " + lvl) + '">' + (st && st.owned ? '<i class="sd-flag"></i>' : "") + "</button>";
    });
    infos.forEach(function (x, i) { h += pinHtml(state, x, i, sel.deal); });
    infos.forEach(function (x, i) { h += tagHtml(x, i, sel.deal); });
    h += "</div>";
    if (!ui.land) h += '<div class="sd-ribbon" role="status">' + (deal ? "Q" + state.turn + " · pick 1 of " + infos.length + " deals on the map" : state.ended ? "The run is over" : "Q" + state.turn + " · deal signed") + "</div>";
    h += LD.seatHud(state);
    /* landscape side panels: the dossier (left), this quarter (right) */
    if (ui.land) h += quarterList(state, infos, sel.deal);
    h += '<aside class="dossier sd-dossier' + (hasSel ? " on" : "") + '" id="dossier" aria-live="polite">' + (ui.dossier || "") + "</aside>";
    /* chair-arm buttons */
    var n = state.fy && state.fy.deck ? state.fy.deck.length : 0;
    var rd = state.fy ? (state.fy.drawer || []).filter(function (d) { return LD.itemReady && LD.itemReady(state, d); }).length : 0;
    h += '<div class="sd-left">';
    if (state.fy) h += '<button type="button" class="sd-brass sd-case" id="btn-portfolio" aria-label="Briefcase">' + '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="12" rx="1.5"/><path d="M9 7V5h6v2M3 12h18"/></svg><small>Case</small>' + (rd ? "<em>" + rd + "</em>" : "") + "</button>";
    if (state.fy) h += '<button type="button" class="sd-brass sd-phone' + (state.fy.memo ? " ringing" : "") + '" id="btn-phone" aria-label="Phone">' + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9c0-3 3-5 7-5s7 2 7 5l-3 1-1-2H9L8 10z"/><path d="M7 11h10l2 8H5z"/><circle cx="12" cy="15" r="2"/></svg><small>Phone</small></button>';
    if (!ui.land && state.phase === "bunker" && !state.ended) h += '<button type="button" class="sd-endq sd-endq-p" id="btn-endq"' + (LD.fyBusy && LD.fyBusy(state) ? " disabled" : "") + "><b>End quarter</b></button>";
    h += "</div>";
    h += '<button type="button" class="sd-bunker" id="house-peek" aria-label="Turn to the bunker"' + (ui.peek ? "" : " hidden") + '><span class="sd-swivel" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-2.05-4.95"/><path d="M19.5 3.5v5h-5"/></svg></span><small>Bunker</small>' + (ui.badge ? "<em>" + ui.badge + "</em>" : "") + "</button>";
    /* the hand: a closed tab (cards down) or the fan (cards up) */
    h += '<div class="fx sd-fx" id="fx" aria-hidden="true"></div>';
    h += '<div class="sd-hand" id="sd-hand">';
    h += '<button type="button" class="sd-tab" id="sd-tab" aria-expanded="' + (ui.fan ? "true" : "false") + '" aria-label="Your deck, ' + n + ' cards">' +
      '<span class="sd-backs" aria-hidden="true">' + [0, 1, 2, 3].map(function (i) { return '<img src="assets/ui/card-back.webp" alt="" draggable="false" style="--c:' + i + '">'; }).join("") + "</span>" +
      '<b class="sd-tabl">Deck · ' + n + ' <i aria-hidden="true">' + (ui.fan ? "▼" : "▲") + "</i></b></button>";
    h += '<div class="sd-fan" id="sd-fan" role="group" aria-label="Your deck">' + (ui.fan ? deckCards(state) : "") + "</div>";
    h += '<button type="button" class="sd-all" id="run-deck"' + (ui.fan ? "" : " hidden") + ">Deck list</button>";
    h += "</div>";
    return h + "</div>";
  };

})(typeof window !== "undefined" ? window : globalThis);
