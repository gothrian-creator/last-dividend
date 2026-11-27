/* Last Dividend — house rules seated desk (B: first person at the 1978 desk). Render + framing maths only; ui.js drives it.
   House runs, every exec (Mara has the original 1978 set; the others have person-only repaints of it). Shop runs never call this. */
(function (root) {
  var LD = root.LD || (root.LD = {});
  var BASE = "assets/house/1978/";
  function esc(s) { return LD.escapeHtml ? LD.escapeHtml(s) : String(s == null ? "" : s); }

  /* Layers live in v6 plate space (720x1280): room-clean + mara-ots == turn frame 1. Boxes are [x, y, w, h]. */
  var SEAT = LD.SEAT = {
    W: 720, H: 1280, FP: [100, 40, 720, 1142],
    room: BASE + "sd-room.webp",
    /* the same room painted wider (outpainted from sd-room, lined up by feature match); plate x 0 sits at x0 */
    roomWide: { src: BASE + "sd-room-wide.webp", x0: 640, w: 2000 },
    table: { src: BASE + "sd-table-clean.webp", box: [0, 545, 720, 597] },
    /* sd-table.webp (painted brass pins) is kept in art-src/house-originals, not shipped; the house desk draws glass pins over sd-table-clean.webp */
    hands: { rest: { src: BASE + "sd-hands-rest-mara.webp", box: [100, 770, 614, 372] }, dip: { src: BASE + "sd-hands-dip-mara.webp", box: [100, 879, 620, 263] } },
    mara: { src: BASE + "sd-mara-ots.webp", box: [181, 389, 539, 891] },
    /* map pins on the painted table map. p: 1 = a painted brass pin sits there; 0 = we add one. */
    pins: { na: [257, 645, 1], sam: [294, 702, 1], eu: [380, 634, 1], me: [437, 651, 1], ea: [457, 651, 1], af: [381, 699, 0], sa: [452, 681, 0], oc: [507, 729, 0] },
    /* region hit areas on the painted map (ellipses cx, cy, rx, ry) */
    regions: { na: [252, 650, 40, 28], sam: [296, 716, 22, 34], eu: [378, 640, 24, 18], af: [384, 704, 24, 32], me: [424, 666, 14, 14], sa: [452, 684, 14, 16], ea: [470, 650, 34, 22], oc: [508, 732, 24, 16] },
    /* seated visitor: each opponent's idle sprite scaled so the waist lands under the table rim (scripts/seated_assets.py). [x, y, w, h] */
    opp: {"ashby":[205.3,254.1,283.4,492.9],"benny":[203.4,284.0,293.3,649.1],"brennan":[202.1,284.0,319.7,463.3],"crowe":[213.7,284.0,263.4,460.9],"dana":[191.0,284.0,303.5,671.9],"delacroix":[229.3,284.0,240.4,461.0],"dunn":[222.5,284.0,242.5,461.0],"gil":[220.2,280.5,270.0,648.8],"grace":[195.0,284.0,311.1,645.3],"gray":[228.4,284.0,240.5,462.7],"hale":[197.7,284.0,307.3,460.9],"harrow":[217.8,284.0,242.4,465.7],"honoria":[235.5,284.0,209.3,647.6],"june":[210.1,271.8,272.2,473.1],"mickey":[220.2,281.0,247.6,464.0],"mina":[190.2,284.0,311.4,483.6],"moretti":[214.6,278.1,244.3,467.9],"odell":[217.8,284.0,269.5,462.0],"okafor":[233.6,284.0,225.4,464.6],"pip":[202.5,284.0,297.4,643.0],"pops":[222.6,284.0,330.4,650.1],"rosa":[227.3,265.9,301.7,479.1],"sorel":[185.2,284.0,327.5,461.0],"theo":[203.5,284.0,284.9,651.2],"ticker":[201.5,284.0,279.5,461.0],"varga":[151.9,265.9,409.4,479.3],"mina-seat":[203.1,282.6,294.4,407.9],"pops-seat":[213.1,282.6,276.7,433.4]},
    table_card: [345, 772],
    bunkerAt: [632, 1000]
  };
  /* Every exec sits at the same 1978 desk. Mara's layers are the originals; the other five have their own set under exec/<id>/
     (their turn plates are Mara's plates with only the person repainted, so the room never moves between execs). */
  var EXEC_OTS = { reid: [180, 390, 540, 890], imani: [161, 301, 559, 979], julian: [170, 389, 550, 891], soren: [177, 386, 543, 894], cassius: [174, 387, 546, 893] };
  var MARA_SET = { mara: SEAT.mara, rest: SEAT.hands.rest.src, dip: SEAT.hands.dip.src }, curExec = "mara", plateSrc = null;
  LD.SEAT_EXECS = ["mara"].concat(Object.keys(EXEC_OTS));
  LD.seatUseExec = function (id) {
    if (!EXEC_OTS[id]) id = "mara";
    if (!plateSrc && LD.HOUSE_FRAMES) plateSrc = LD.HOUSE_FRAMES.map(function (f) { return f.src; });
    if (id === curExec && (plateSrc || !LD.HOUSE_FRAMES)) return id;
    curExec = id;
    var d = BASE + "exec/" + id + "/";
    SEAT.mara = id === "mara" ? MARA_SET.mara : { src: d + "sd-ots.webp", box: EXEC_OTS[id] };
    SEAT.hands.rest.src = id === "mara" ? MARA_SET.rest : d + "sd-hands-rest.webp";
    SEAT.hands.dip.src = id === "mara" ? MARA_SET.dip : d + "sd-hands-dip.webp";
    if (LD.HOUSE_FRAMES && plateSrc) LD.HOUSE_FRAMES.forEach(function (f, i) { f.src = id === "mara" ? plateSrc[i] : d + "turn-" + (i + 1) + (i === 0 ? "-clean" : "") + ".webp"; });
    return id;
  };
  LD.seatedOn = function (state) {
    var on = !!(state && LD.isHouse && LD.isHouse(state) && LD.SEAT_EXECS.indexOf(state.executiveId) >= 0);
    if (on) LD.seatUseExec(state.executiveId);
    return on;
  };
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
  /* Each visitor's head across their box: [left, right, top] as fractions of the box (measured off the idle art's alpha),
     so the Next-move column can stand clear of hair, hats and headscarves, not just the face. */
  SEAT.head = {"ashby":[0.241,0.773,0.061],"benny":[0.345,0.668,0.0],"brennan":[0.315,0.627,0.0],"crowe":[0.353,0.703,0.0],"dana":[0.364,0.684,0.0],"delacroix":[0.346,0.658,0.0],"dunn":[0.314,0.734,0.0],"gil":[0.323,0.634,0.005],"grace":[0.312,0.684,0.0],"gray":[0.352,0.663,0.0],"hale":[0.321,0.665,0.0],"harrow":[0.33,0.764,0.0],"honoria":[0.285,0.787,0.0],"june":[0.279,0.745,0.026],"mickey":[0.458,0.831,0.007],"mina":[0.291,0.615,0.003],"moretti":[0.414,0.775,0.013],"odell":[0.314,0.675,0.0],"okafor":[0.361,0.68,0.0],"pip":[0.352,0.648,0.0],"pops":[0.322,0.663,0.003],"rosa":[0.348,0.74,0.038],"sorel":[0.317,0.705,0.0],"theo":[0.345,0.716,0.0],"ticker":[0.261,0.798,0.0],"varga":[0.356,0.6,0.038],"mina-seat":[0.291,0.615,0.003],"pops-seat":[0.322,0.663,0.003]};
  /* The fight framing: the desk frame, nudged so a seated visitor's whole head (box top, plate px) stands below the name bar
     (screen y `top`). Bottom-anchored portrait plates lose their top on short tablets (a browser bar eats ~130px of an
     800x1280 tab): slide the plate down into its spare bottom first, then pull the camera back (never narrower than the plate). */
  LD.seatFightFrame = function (W, H, box, top) {
    var f = LD.seatFrame(W, H);
    if (f.land || !box || !(top > 0)) return f;
    var want = top + 10, need = want - (box[1] * f.s + f.ty);
    if (need <= 0) return f;
    var room = 1280 * f.s + f.ty - H;
    if (need <= room) return { s: f.s, tx: f.tx, ty: f.ty + need, land: false };
    var s = Math.max(W / 720, (H - want) / (1280 - box[1]));
    var tx = Math.min(0, Math.max(W - 720 * s, W / 2 - 410 * s));
    var ty = Math.max(H - 1280 * s, want - box[1] * s);
    return { s: s, tx: tx, ty: Math.min(0, ty), land: false };
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
    /* the hands never go see-through: they drop away opaque and are gone (below the frame) by t 0.42 */
    var hu = Math.max(0, Math.min(1, t / 0.42)); hu = hu * hu * (3 - 2 * hu);
    return { e: e, mara: { a: ma, k: 1 + 0.55 * Math.pow(1 - t, 2), dy: 760 * Math.pow(1 - t, 2.2), blur: 5 * Math.pow(1 - t, 2) },
      hands: { a: t < 0.42 ? 1 : 0, dy: 580 * hu, blur: 2.5 * Math.sin(Math.PI * hu) } };
  };
  /* Pin tags: where each tag sits relative to its pin, in screen px at scale 1 (tag centre). */


  /* ---------- Deal props (house desk): the deal lies on the table as a prop; tap to open it, drag it to your hands to sign ----------
     Closed props sit on the near rim (plate px). Each opens into a painted interior (no text in the art); the typed slip on it is
     live game text. Every move is one object tweened; the open is a video slot (CLIPS) with a hard-cut fallback. */
  var PROP_DIR = "assets/house/props/";
  var PSIZE = {"briefcase": [640, 341], "briefcase-oxblood": [640, 341], "briefcase-black": [640, 341], "policy": [542, 640], "deed": [640, 537], "dossier": [614, 640], "dossier-red": [614, 640], "ledger": [633, 640], "cheque": [640, 443], "cheque-blue": [640, 443], "telegram": [640, 467], "stamp": [543, 640], "pen": [364, 279], "briefcase-open": [851, 751], "briefcase-oxblood-open": [851, 751], "briefcase-black-open": [851, 751], "policy-open": [686, 817], "deed-open": [721, 616], "dossier-open": [898, 676], "dossier-red-open": [898, 676], "ledger-open": [878, 742], "cheque-open": [900, 663], "cheque-blue-open": [900, 663], "telegram-open": [754, 633]};
  var PROP_TYPES = {
    briefcase: ["Treasury", "Export", "Procurement", "Operations", "Disaster", "Diversion", "Talent", "Commodities"],
    policy: ["Products", "Services", "ESG"], deed: ["Acquisition", "Land", "Takeover", "Off-books"],
    dossier: ["Lobby", "Government", "Compliance", "Legal", "Communications"], ledger: ["Finance", "IR", "Tax", "Disclosure"],
    cheque: ["Concession", "Philanthropy", "People", "Logistics"]
  };
  /* Era re-skins (stage 4): same deal types, the era's object. Cut from the approved 2008 / Now desk paintings (closed only:
     they lift and the slip slides out on top; painted open interiors can replace "skin" geometry later). */
  var ERA_SKIN = { 2: { deed: "bb-folder", briefcase: "laptop", dossier: "report" }, 3: { deed: "folio", briefcase: "tablet", dossier: "phone-env" } };
  var SKIN_SIZE = { "bb-folder": [426, 376], laptop: [468, 204], report: [348, 372], folio: [396, 432], tablet: [466, 244], "phone-env": [354, 374] };
  var PROP_VAR = { briefcase: ["briefcase", "briefcase-oxblood", "briefcase-black"], dossier: ["dossier", "dossier-red"], cheque: ["cheque", "cheque-blue"] };
  /* rim width in plate px */
  var PROP_W = { briefcase: 200, policy: 128, deed: 168, dossier: 138, ledger: 150, cheque: 176, telegram: 166 };
  var RIM = [[262, 828, -6], [430, 850, 4], [592, 822, 7]];
  /* painted open states (laptop lid up, tablet lit); the folder, report, folio and phone keep the lift + slip slide-out */
  var SKIN_OPEN = { laptop: [772, 808], tablet: [822, 528] };
  Object.keys(SKIN_SIZE).forEach(function (k) { PSIZE[k] = SKIN_SIZE[k]; });
  Object.keys(SKIN_OPEN).forEach(function (k) { PSIZE[k + "-open"] = SKIN_OPEN[k]; });
  /* where the closed prop sits inside its open box ([x, y, w] as fractions of the open box): the clip's first frame */
  var CLOSED_IN = { briefcase: [0.01, 0.41, 0.98], policy: [0.02, 0.02, 0.96], deed: [0.06, 0.06, 0.88], dossier: [0.34, 0.05, 0.64],
    ledger: [0.36, 0.18, 0.62], cheque: [0.12, 0.2, 0.68], telegram: [0.03, 0.12, 0.94], skin: [0, 0, 1],
    "laptop-open": [0.02, 0.53, 0.96], "tablet-open": [0, 0.09, 1] };
  /* the typed slip on each open interior: x, y, w (fractions of the open box), rotate, skewX (deg), how it is held */
  var SLIP = { briefcase: { x: 0.15, y: 0.035, w: 0.68, r: -1.5, sk: -3, hold: "lid" }, dossier: { x: 0.03, y: 0.46, w: 0.46, r: -2, sk: 0, hold: "clip", min: 178 },
    deed: { x: 0.05, y: 0.05, w: 0.6, r: -4, sk: 2, hold: "pin" }, cheque: { x: 0.01, y: 0.56, w: 0.56, r: -3, sk: 0, hold: "pocket", min: 186 },
    policy: { x: 0.15, y: 0.15, w: 0.66, r: 1.2, sk: 0, hold: "rider" }, ledger: { x: 0.1, y: 0.52, w: 0.7, r: -3, sk: 0, hold: "page", wide: true },
    telegram: { x: 0.12, y: 0.27, w: 0.76, r: -1.5, sk: 0, hold: "strips" }, skin: { x: 0.1, y: 0.16, w: 0.8, r: -1.5, sk: 0, hold: "rider", min: 190 },
    "laptop-open": { x: 0.1, y: 0.07, w: 0.8, r: -1, sk: 0, hold: "rider", min: 190 }, "tablet-open": { x: 0.1, y: 0.14, w: 0.8, r: -1, sk: 0, hold: "rider", min: 190 } };
  /* finished reveal clips: set an art name true once assets/house/props/clips/<art>-open.webm is in (see the video-stills README) */
  /* shipped: briefcase (+oxblood, black), dossier (+red), cheque, ledger (green retake; cash kept solid + recoloured to the still). Hard cut by choice: policy (retake: the sheet flies off-frame, a see-through strip at the top), deed (retake: the seal goes dark and the map dissolves in through the paper), telegram (retake: the seal splits into two/three and a faded wax disc ghosts), cheque-blue (pages tint blue mid-clip), stamp (tween) */
  LD.PROP_CLIPS = { stamp: false, briefcase: true, "briefcase-oxblood": true, "briefcase-black": true, dossier: true, "dossier-red": true, cheque: true, ledger: true };
  LD.PROP_CLIP_DIR = PROP_DIR + "clips/";
  LD.SEAT_PROPS = { dir: PROP_DIR, size: PSIZE, w: PROP_W, rim: RIM, closedIn: CLOSED_IN, slip: SLIP };
  LD.propTypeOf = function (d) {
    if (!d) return "dossier";
    if (LD.dealKind(d) === "crisis") return "telegram";
    for (var t in PROP_TYPES) if (PROP_TYPES[t].indexOf(d.kicker) >= 0) return t;
    return "dossier";
  };
  LD.propSrc = function (art) { return PROP_DIR + art + ".webp"; };
  /* the props on the table this quarter, left to right in pin order (repeats of a kind get the next colourway) */
  LD.seatPropsFor = function (state) {
    if (!state || state.phase !== "deal" || state.ended || !state.offered) return [];
    var ids = state.offered.filter(function (id) { return LD.dealById(id); });
    ids.sort(function (a, b) { var pa = SEAT.pins[state.world.pins[a]] || SEAT.pins.eu, pb = SEAT.pins[state.world.pins[b]] || SEAT.pins.eu; return pa[0] - pb[0]; });
    var seen = {}, skin = ERA_SKIN[LD.eraAct ? LD.eraAct(state) : 1] || {};
    return ids.slice(0, 3).map(function (id, i) {
      var d = LD.dealById(id), t = LD.propTypeOf(d), n = seen[t] = (seen[t] || 0) + 1, v = PROP_VAR[t] || [t], art = skin[t] || v[(n - 1) % v.length];
      var nat = PSIZE[art], w = PROP_W[t], h = w * nat[1] / nat[0], slot = ids.length === 2 ? RIM[i === 0 ? 0 : 2] : ids.length === 1 ? RIM[1] : RIM[i];
      return { id: id, type: t, art: art, open: skin[t] ? (SKIN_OPEN[art] ? art + "-open" : art) : art + "-open", geo: skin[t] ? (SKIN_OPEN[art] ? art + "-open" : "skin") : t, x: slot[0], y: slot[1], rot: slot[2], w: w, h: h };
    });
  };
  /* Where the open prop stands: the biggest box (aspect r = h/w) in the free band that keeps the chosen deal's pin in sight.
     o: { r, pin: [x, y], top, bottom, left, right, maxW } in screen px. */
  LD.seatPeekBox = function (o) {
    var gap = o.gap || 24, best = null;
    function cand(x0, x1, y0, y1, side) {
      var aw = x1 - x0, ah = y1 - y0; if (aw < 60 || ah < 60) return;
      var w = Math.min(aw, o.maxW, ah / o.r), h = w * o.r;
      if (!best || w > best.w + 0.5) best = { w: w, h: h, x0: x0, x1: x1, y0: y0, y1: y1, side: side };
    }
    var px = o.pin ? o.pin[0] : -1e4, py = o.pin ? o.pin[1] : 1e4;
    cand(o.left, o.right, o.top, Math.min(o.bottom, py - gap), "above");
    if (o.pin) { cand(o.left, px - gap, o.top, o.bottom, "left"); cand(px + gap, o.right, o.top, o.bottom, "right"); }
    if (!best) return null;
    var cx = best.side === "above" ? (o.left + o.right) / 2 : (best.x0 + best.x1) / 2;
    cx = Math.max(best.x0 + best.w / 2, Math.min(best.x1 - best.w / 2, cx));
    var y = best.y0 + Math.max(0, best.y1 - best.y0 - best.h) * 0.25;
    return { x: cx - best.w / 2, y: y, w: best.w, h: best.h, side: best.side };
  };
  function slipRows(rows, cls) {
    return (rows || []).map(function (x) { return '<span class="' + (/good|own/.test(x.c) ? "ps-g" : /bad|cost/.test(x.c) ? "ps-x" : "ps-m") + (cls || "") + '">' + x.t + "</span>"; }).join(" · ");
  }
  /* the typed slip for one deal (live text). Crisis telegrams list every response with its cost. */
  LD.seatSlipHtml = function (state, id, type) {
    var o = LD.dealSlip(state, id); if (!o) return "";
    var g = SLIP[type] || SLIP.dossier;
    var h = '<div class="pk-slip t-' + type + " h-" + g.hold + (g.wide ? " is-wide" : "") + (o.choices ? " is-crisis" : "") + '" data-deal="' + esc(id) + '">';
    h += '<div class="ps-k">' + esc(o.kicker) + (o.region ? " · " + esc(o.region) : "") + "</div>";
    h += '<div class="ps-t">' + esc(o.title) + "</div>";
    var enc = o.enc ? '<div class="ps-r ps-enc"><i>Knocking</i><span><span class="ps-ic" aria-hidden="true">' + o.enc.art + "</span>" + esc(o.enc.name) + "</span></div>" : "";
    if (o.choices) {
      h += enc + '<div class="ps-chs">';
      o.choices.forEach(function (c, i) {
        var dis = c.blocked || c.poor;
        h += '<button type="button" class="dz-choice ps-ch" data-deal="' + esc(id) + '" data-choice="' + esc(c.id) + '"' + (dis ? " disabled" : "") + ">" +
          '<b><em>' + (i + 1) + ".</em> " + esc(c.label) + (c.blocked ? " · " + esc(c.blocked) : c.poor ? " · need " + c.poor : "") + "</b>" +
          '<span class="ps-cr">' + (c.rebate ? '<span class="ps-g">Rebate +' + c.rebate + "</span> · " : "") + (slipRows(c.now) || "Free") +
          (c.later.length ? " · <i>" + esc(c.when || "Later") + "</i> " + slipRows(c.later) : "") + (c.map.length ? " · " + slipRows(c.map) : "") + "</span></button>";
      });
      h += "</div>";
      h += '<div class="ps-more"><p class="ps-fine">Ignore it and it spreads to a neighbouring region at quarter close.</p></div>';
    } else {
      var now = o.now || [], money0 = now.length && /\$/.test(now[0].t) ? now[0] : null, rest = money0 ? now.slice(1) : now;
      h += '<div class="ps-r ps-pay"><i>Pays now</i><span><b class="' + (money0 && /^−|^-/.test(money0.t) ? "ps-x" : "") + '">' + esc(money0 ? money0.t : o.tag) + "</b>" + (rest.length ? " " + slipRows(rest) : "") + "</span></div>";
      h += enc;
      if (o.later.length) h += '<div class="ps-r"><i>Later ' + esc(o.when) + "</i><span>" + slipRows(o.later) + "</span></div>";
      h += '<div class="ps-more">' + (o.map.length ? '<div class="ps-r"><i>Map</i><span>' + slipRows(o.map) + "</span></div>" : "") +
        (o.enc ? '<p class="ps-fine">Win the meeting: ' + esc(o.enc.win) + "</p>" : "") + '<p class="ps-fine">Fine print: ' + esc(o.fine) + "</p></div>";
      h += '<button type="button" class="ps-sign" id="btn-sign" data-deal="' + esc(id) + '"' + (o.poor ? " disabled" : "") + "><i>" + (o.poor ? "Need " + o.poor : "Sign") + '</i><span class="ps-line"><svg viewBox="0 0 120 22" preserveAspectRatio="none" aria-hidden="true"><path d="M3,16 c8,-14 12,-4 9,4 s9,-16 16,-9 s3,12 11,-2 s9,-8 12,2 s7,3 14,-6 s5,8 12,1 s9,-5 20,-3 s10,2 16,-1" pathLength="100"/></svg></span></button>';
    }
    h += '<span class="ps-ink" aria-hidden="true">Approved</span>';
    return h + "</div>";
  };
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
  var CRACK = '<svg class="sd-crack" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 1l-2 6 3 3-4 5 2 3-3 5M11 7l-4 1M14 10l4-1M10 15l-4 2"/></svg>';
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
      var crack = !fg && lvl >= 1 && LD.eraAct && LD.eraAct(state) === 3;
      h += '<button type="button" class="sd-net g' + lvl + (crack ? " is-crack" : "") + '"' + (o.nets === false ? " disabled" : ' data-net="' + id + '"') + ' aria-label="Public ' + NET_NAME[id] + ": " + esc(lab) + '">' + ico(id) + (crack ? CRACK : "") + "</button>";
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
    /* a few standing cut-outs read badly behind the table; those have seated repaints (opp-<art>-seat-*), used here only */
    if (SEAT.opp[art + "-seat"]) art = art + "-seat";
    var p = SEAT.opp[art] || SEAT.opp.pip;
    var h = '<div class="sd-opp ' + (cls || "") + '" id="sc-opp" data-art="' + esc(art) + '" data-base="' + base + '" data-pose="' + base + '" style="left:' + p[0] + "px;top:" + p[1] + "px;width:" + p[2] + "px;height:" + p[3] + 'px" aria-hidden="true">';
    poses.forEach(function (q) { h += '<img class="p-' + q + '" src="assets/fight/opp-' + art + "-" + q + '.webp" alt="" draggable="false">'; });
    return h + "</div>";
  }
  LD.seatOppHtml = oppHtml;
  /* o: { opp: html, hands: "rest"|"dip", card: html, mara: bool } */
  /* Era desks (stage 4): per-era layer sets for the seated desk only (fights keep the 1978 room). null = not painted yet,
     so the 1978 set stands in. Shape: { room: src, roomWide: { src, x0, w }, table: { src, box } | null, hands: { rest: { src, box }, dip: { src, box } } } */
  var DESK = "assets/house/desk/";
  function eraSet(k, win, rest, dip) {
    return { room: DESK + k + "-room.webp", roomWide: { src: DESK + k + "-wide.webp", x0: 640, w: 2000 }, table: null, win: win,
      hands: { rest: { src: DESK + k + "-hands-rest.webp", box: [85, rest, 650, 366] }, dip: { src: DESK + k + "-hands-dip.webp", box: [85, dip, 650, 366] } } };
  }
  /* 2008: steel table, front edge ~y996; Now: stone table, ~y1004 (1978: ~880). Hands keep the 1978 Mara hands' size and sit the
     same distance from each era's table edge (rest fingertips ~106px onto the top, dip knuckles just below the edge). */
  LD.SEAT_ERA = { 2: eraSet("2008", [556, 0, 164, 482], 879, 958), 3: eraSet("now", [506, 0, 214, 470], 884, 961) };
  LD.seatEraSet = function (state) {
    var e = LD.eraAct ? LD.eraAct(state) : 1, s = LD.SEAT_ERA[e];
    return s && state && state.executiveId === "mara" ? s : null;
  };
  LD.seatStage = function (o) {
    o = o || {};
    var S = o.set || null;
    if (S) {
      var hh = '<div class="sd-clip"><div class="sd-rig" aria-hidden="true"><img class="sd-room" src="' + S.room + '" alt="" draggable="false">' + (o.room || "");
      if (S.table) hh += img("sd-table", S.table);
      hh += (o.under || "") + (o.card || "");
      var you2 = o.youId ? ' id="' + o.youId + '"' : "";
      hh += img("sd-hands sd-hands-rest", S.hands.rest) + img("sd-hands sd-hands-dip", S.hands.dip).replace("<img ", "<img" + you2 + " ");
      return hh + "</div></div>";
    }
    var h = '<div class="sd-clip"><div class="sd-rig" aria-hidden="true">';
    h += '<img class="sd-room" src="' + SEAT.room + '" alt="" draggable="false">';
    h += o.room || "";
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
    return '<button type="button" class="sd-pin k-' + info.kind + " add" + (sel === info.id ? " sel" : "") + '" data-deal="' + info.id + '" data-plate="' + p[0] + "," + p[1] + '" style="--i:' + i + '" aria-label="' + esc(info.aria) + '"><i></i></button>';
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
    h += '<button type="button" class="sd-endq" id="btn-endq"' + (canEnd ? "" : " disabled") + "><b>End quarter</b><small>" + (canEnd ? "Close Q" + state.turn + " and read the report" : "Sign a deal on your desk first") + "</small></button>";
    /* landscape has the room for words: the four public networks, by name and state (the HUD only has room for jewels) */
    h += '<div class="sd-nlist"><h5>Public networks</h5>';
    ["air", "water", "power", "food"].forEach(function (id) {
      var lvl = LD.gridLevel ? LD.gridLevel(state, id) : 0, lab = LD.gridLabel ? LD.gridLabel(lvl) : "";
      h += '<button type="button" class="sd-nrow g' + lvl + '" data-net="' + id + '"><i class="sd-net g' + lvl + '" aria-hidden="true">' + ico(id) + "</i><b>" + NET_NAME[id] + "</b><em>" + esc(lab) + "</em></button>";
    });
    h += "</div>";
    return h + "</section>";
  }
  /* The living map (plate space, inside the rig, under the props): each offered deal's region glows softly on the painted map,
     its pin pulses, and a thread runs from the pin and tucks under its prop. 1978 a red string with a cast shadow; 2008 a teal
     fibre-light line; Now a soft white projected line. Static geometry; only the glow and pulse breathe (CSS, off under reduced motion). */
  /* ---------- felt events (2026-11-27, sheet 3): marks that stay on the scene until their cause is gone ---------- */
  LD.FELT = { win: [500, 0, 220, 470], paper: [500, 548, 132, 124, 9], riotUnrest: 60 };
  LD.feltRiots = function (state) {
    var out = [];
    if (!state || !state.world || !state.world.regions) return out;
    Object.keys(SEAT.regions).forEach(function (id) {
      var r = state.world.regions[id];
      if (r && r.owned && r.stress >= LD.STRESS_TENSE) out.push({ id: id, lvl: r.stress >= LD.STRESS_STRIKE ? "riot" : "protest" });
    });
    return out;
  };
  LD.feltWindow = function (state) {
    return LD.feltRiots(state).some(function (x) { return x.lvl === "riot"; }) || (state.unrest | 0) >= LD.FELT.riotUnrest;
  };
  LD.feltPaper = function (state) {
    var p = state && state.felt && state.felt.paper;
    return p && state.turn <= p.until ? p : null;
  };
  /* the street outside the window: the riot painting for the 1978 room, plus a haze for the wider landscape glass */
  LD.feltRoom = function (state) {
    var S = LD.seatEraSet(state), w = (S && S.win) || LD.FELT.win, on = LD.feltWindow(state);
    /* era rooms have no riot painting: the street's smoke and fire glow tint their own glass instead */
    var pane = S && S.win ? '<i class="sd-fwin-glass" style="left:' + w[0] + "px;top:" + w[1] + "px;width:" + w[2] + "px;height:" + w[3] + 'px"></i>'
      : '<img src="' + BASE + 'sd-window-riot.webp" alt="" draggable="false" style="left:' + w[0] + "px;top:" + w[1] + "px;width:" + w[2] + "px;height:" + w[3] + 'px">';
    return '<div class="sd-fwin' + (on ? " on" : "") + '" aria-hidden="true">' +
      '<i class="sd-fwin-haze" style="left:' + (w[0] + w[2] - 12) + "px;top:0;width:200px;height:" + (w[3] - 70) + 'px"></i>' + pane +
      '<i class="sd-fwin-dark" style="left:' + (w[0] + 30) + "px;top:0;width:" + (w[2] + 180) + "px;height:" + (w[3] - 18) + 'px"></i></div>';
  };
  /* burning regions on the map, and the paper that landed on the table */
  LD.feltUnder = function (state) {
    var riots = {}, h = "";
    LD.feltRiots(state).forEach(function (x) { riots[x.id] = x.lvl; });
    h += '<svg class="sd-fburn" viewBox="0 0 720 1280" aria-hidden="true"><defs><radialGradient id="sdEmber"><stop offset="0" style="stop-color:#ffcf6a;stop-opacity:.95"/><stop offset=".45" style="stop-color:#e2501f;stop-opacity:.7"/><stop offset="1" style="stop-color:#5a0e06;stop-opacity:0"/></radialGradient></defs>';
    Object.keys(SEAT.regions).forEach(function (id) {
      var r = SEAT.regions[id], lv = riots[id] || "";
      h += '<g class="sd-burn' + (lv ? " on is-" + lv : "") + '" data-region="' + id + '">' +
        '<ellipse class="sd-burn-glow" cx="' + r[0] + '" cy="' + r[1] + '" rx="' + (r[2] * 0.9).toFixed(1) + '" ry="' + (r[3] * 0.9).toFixed(1) + '" fill="url(#sdEmber)"/>' +
        '<g class="sd-burn-smoke" transform="translate(' + r[0] + "," + (r[1] - 4) + ')"><circle class="s1" r="9" cx="-4"/><circle class="s2" r="11" cx="4"/><circle class="s3" r="8" cx="-1"/></g>' +
        '<g transform="translate(' + r[0] + "," + (r[1] + 2) + ') scale(1.5)"><path class="sd-burn-fl" d="M0 -16c4 6 7 9 6 14-1 4-4 6-6 6s-6-2-6-6c0-3 2-5 3-8 1 3 2 4 3 4-1-4 0-7 0-10z"/></g></g>';
    });
    h += "</svg>";
    var p = LD.feltPaper(state), b = LD.FELT.paper;
    h += '<div class="sd-paper' + (p ? " on" : "") + '" style="left:' + b[0] + "px;top:" + b[1] + "px;width:" + b[2] + "px;height:" + b[3] + "px;--rot:" + b[4] + 'deg" aria-hidden="true"><img src="assets/house/props/newspaper-2008.webp" alt="" draggable="false"></div>';
    return h;
  };
  LD.seatThreadsSvg = function (state, props, selId) {
    var era = LD.eraAct ? LD.eraAct(state) : 1, h = '<svg class="sd-map-live e' + era + '" viewBox="0 0 720 1280" aria-hidden="true">';
    h += '<defs><radialGradient id="sdGlow' + era + '"><stop offset="0" style="stop-color:var(--glow);stop-opacity:0.95"/><stop offset="0.55" style="stop-color:var(--glow);stop-opacity:0.42"/><stop offset="1" style="stop-color:var(--glow);stop-opacity:0"/></radialGradient>' +
      '<filter id="sdSoft' + era + '" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter>' +
      '<linearGradient id="sdLight' + era + '" x1="1" y1="0" x2="0" y2="0.4"><stop offset="0" style="stop-color:var(--light);stop-opacity:0.34"/><stop offset="0.55" style="stop-color:var(--light);stop-opacity:0.08"/><stop offset="1" style="stop-color:var(--light);stop-opacity:0"/></linearGradient></defs>';
    /* window-side light across the table top (the window is on the right in every era's room) */
    h += '<rect class="sd-tlight" x="0" y="560" width="720" height="420" fill="url(#sdLight' + era + ')"/>';
    props.forEach(function (pr, i) {
      var rid = state.world && state.world.pins ? state.world.pins[pr.id] : null, pin = SEAT.pins[rid] || SEAT.pins.eu, rg = SEAT.regions[rid];
      if (rg) h += '<ellipse class="sd-rglow" data-deal="' + pr.id + '" cx="' + rg[0] + '" cy="' + rg[1] + '" rx="' + (rg[2] * 1.35).toFixed(1) + '" ry="' + (rg[3] * 1.35).toFixed(1) + '" fill="url(#sdGlow' + era + ')" style="--i:' + i + '"/>';
      /* the thread ends under the prop's far edge, a little toward the map */
      var a = pr.rot * Math.PI / 180, lx = (pin[0] - pr.x) * 0.18, ly = -pr.h * 0.3;
      var ex = pr.x + lx * Math.cos(a) - ly * Math.sin(a), ey = pr.y + lx * Math.sin(a) + ly * Math.cos(a);
      var mx = (pin[0] + ex) / 2, my = Math.max(pin[1], ey) + 18;
      var d = "M" + pin[0] + "," + pin[1] + " Q" + mx.toFixed(1) + "," + my.toFixed(1) + " " + ex.toFixed(1) + "," + ey.toFixed(1);
      h += '<g class="sd-th' + (selId === pr.id ? " is-on" : "") + '" data-deal="' + pr.id + '">';
      if (era === 1) h += '<path class="sd-th-sh" d="' + d + '" transform="translate(-3,5)" filter="url(#sdSoft1)"/>';
      if (era === 3) h += '<path class="sd-th-halo" d="' + d + '" filter="url(#sdSoft3)"/>';
      if (era === 2) h += '<path class="sd-th-halo" d="' + d + '" filter="url(#sdSoft2)"/>';
      h += '<path class="sd-th-line" d="' + d + '"/>';
      h += '<circle class="sd-th-pulse" cx="' + pin[0] + '" cy="' + pin[1] + '" r="7" style="--i:' + i + '"/>';
      h += "</g>";
    });
    return h + "</svg>";
  };
  /* ui: { sel: {deal, region, net}, fan: bool, land: bool, dossier: html, peek: bool, memo: bool } */
  LD.renderSeatedDesk = function (state, ui) {
    ui = ui || {};
    var sel = ui.sel || {}, deal = state.phase === "deal" && !state.ended;
    var infos = deal ? state.offered.map(function (id) { return LD.dealTagInfo(state, id); }).filter(Boolean) : [];
    var hasSel = !!(sel.deal || sel.region || sel.net), props = LD.seatPropsFor(state);
    var era = LD.eraAct ? LD.eraAct(state) : 1;
    var h = '<div class="desk sd era-' + era + (ui.fan ? " is-fan" : "") + (hasSel ? " has-sel" : "") + (ui.land ? " is-land" : "") + (deal ? " is-deal" : " is-bunker") + (deal && props.length ? " has-props" : "") + (ui.closing ? " is-closing" : "") + '" data-phase="'  + state.phase + '">';
    h += '<div class="sd-bg" aria-hidden="true"></div>';
    var under = props.length ? LD.seatThreadsSvg(state, props, sel.deal) : "";
    props.forEach(function (pr) {
      /* a faint mirror of the prop in the polished walnut, squashed toward you and fading (static, never animated) */
      under += '<img class="sd-propref" data-deal="' + pr.id + '" src="' + LD.propSrc(pr.art) + '" alt="" draggable="false" style="left:' + (pr.x - pr.w / 2).toFixed(1) + "px;top:" + (pr.y - pr.h / 2).toFixed(1) + "px;width:" + pr.w.toFixed(1) + "px;height:" + pr.h.toFixed(1) + "px;transform:rotate(" + pr.rot + "deg) translateY(" + (pr.h * 0.64).toFixed(1) + 'px) scaleY(-0.34)">';
      under += '<img class="sd-propimg" data-deal="' + pr.id + '" src="' + LD.propSrc(pr.art) + '" alt="" draggable="false" style="left:' + (pr.x - pr.w / 2).toFixed(1) + "px;top:" + (pr.y - pr.h / 2).toFixed(1) + "px;width:" + pr.w.toFixed(1) + "px;height:" + pr.h.toFixed(1) + "px;transform:rotate(" + pr.rot + 'deg)">';
    });
    h += LD.seatStage({ under: LD.feltUnder(state) + under, room: LD.feltRoom(state), set: LD.seatEraSet(state) });
    /* screen-space layer: pins, props, region taps */
    h += '<div class="sd-ui">';
    Object.keys(SEAT.regions).forEach(function (rid) {
      var r = SEAT.regions[rid], st = state.world && state.world.regions ? state.world.regions[rid] : null;
      var lvl = st && LD.stressLabel ? LD.stressLabel(st.stress) : "calm";
      h += '<button type="button" class="sd-region s-' + lvl + (st && st.owned ? " owned" : "") + (sel.region === rid ? " sel" : "") + '" data-region="' + rid + '" data-plate="' + r[0] + "," + r[1] + '" data-r="' + r[2] + "," + r[3] + '" aria-label="' + esc(LD.REGION_NAMES[rid] + (st && st.owned ? ", yours" : "") + ", " + lvl) + '">' + (st && st.owned ? '<i class="sd-flag"></i>' : "") + "</button>";
    });
    infos.forEach(function (x, i) { h += pinHtml(state, x, i, sel.deal); });
    props.forEach(function (pr, i) {
      var x = infos.filter(function (n) { return n.id === pr.id; })[0], sd = LD.dealSlip(state, pr.id), neg = /^[−-]/.test(x.tag);
      h += '<button type="button" class="sd-prop k-' + x.kind + " t-" + pr.type + (sel.deal === pr.id ? " sel" : "") + '" data-deal="' + pr.id + '" data-plate="' + pr.x + "," + pr.y + '" data-pw="' + pr.w.toFixed(1) + "," + pr.h.toFixed(1) + '" style="--rot:' + pr.rot + "deg;--i:" + i + '" aria-label="' + esc(x.aria) + '">' +
        '<span class="sd-stk"><b>' + esc(sd.kicker) + "</b><em" + (neg ? ' class="neg"' : "") + ">" + esc(x.tag) + "</em></span></button>";
    });
    h += "</div>";
    if (!ui.land) h += '<div class="sd-ribbon" role="status">' + (deal ? "Q" + state.turn + " · pick 1 of " + infos.length + " deals on your desk" : state.ended ? "The run is over" : "Q" + state.turn + " · deal signed") + "</div>";
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
