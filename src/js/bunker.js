
/* Last Dividend — dimensional bunker cutaway (desk mini card + zoomed interactive view).
   Pure string builders. Browser + Node. Uses existing engine rules only. */
(function (root) {
  var LD = root.LD || (root.LD = {});
  function esc(s) { return LD.escapeHtml(s); }
  function money(n) { return (n < 0 ? "−$" : "$") + Math.abs(n) + "M"; }

  var W = 640, H = 420;
  /* Deco island scene: the room cutaway (W x H local units) sits under a painted
     private-island backdrop. SW x SH is the full scene; OX/OY shift the cutaway. */
  var SW = 880, SH = 576, OX = 120, OY = 156;
  var ISLAND_ART = "assets/oasis-island.webp";
  /* One label-free backdrop per faction, same composition (villa left, compound centre, dock right). */
  LD.ISLAND_ART = { mara: "assets/island-mara.webp", reid: "assets/island-reid.webp", imani: "assets/island-imani.webp", julian: "assets/island-julian.webp", soren: "assets/island-soren.webp", cassius: "assets/island-cassius.webp" };
  function eraOf(state) { return LD.eraOf ? LD.eraOf(state) : 3; }
  /* The surface evolves per era: a 1978 HQ over a fallout shelter, a 2008 tower over a prepper vault, then the faction island. */
  function islandArt(state) { var e = eraOf(state); if (e === 1) return "assets/bunker-1.webp"; if (e === 2) return "assets/bunker-2.webp"; return (LD.ISLAND_ART && LD.ISLAND_ART[state.executiveId]) || ISLAND_ART; }
  var RW = 250, RH = 118;
  LD.BUNKER_ROOMS = {
    air: { x: 28, y: 146, name: "Air" },
    power: { x: 362, y: 146, name: "Power" },
    water: { x: 28, y: 284, name: "Water" },
    food: { x: 362, y: 284, name: "Food" }
  };
  var ICON = { air: "≋", water: "◖", power: "ϟ", food: "❀" };

  function roomStage(state, id) {
    var sys = state.bunker[id];
    var st = LD.systemStatus(state, id);
    var inbound = LD.pendingInstallFor(state, id);
    return {
      level: sys.level,
      quality: sys.quality,
      status: st,                         /* empty | incomplete | risk | ready */
      stage: sys.level <= 0 ? "empty" : sys.level < LD.WIN_LEVEL ? "building" : "done",
      cheap: sys.quality === "cheap" && sys.level > 0,
      inbound: inbound
    };
  }

  /* ---- tiny props ---- */
  function worker(x, y, kind, delay) {
    var arm = kind === "hammer"
      ? '<g class="bk-hammer" style="animation-delay:' + delay + 's"><line x1="0" y1="-12" x2="7" y2="-17" stroke="#3b2a1a" stroke-width="2.4" stroke-linecap="round"/><rect x="5" y="-21" width="6" height="4" fill="#5b6b6e"/></g>'
      : '<rect x="-12" y="-16" width="24" height="3" fill="#c99428"/>';
    return '<g class="bk-worker' + (kind === "carry" ? " walk" : "") + '" transform="translate(' + x + " " + y + ')" style="animation-delay:' + delay + 's">' +
      '<rect x="-3" y="-12" width="6" height="10" rx="2" fill="#e05a48"/>' +
      '<line x1="-2" y1="-2" x2="-3" y2="4" stroke="#0a464e" stroke-width="2.4"/><line x1="2" y1="-2" x2="3" y2="4" stroke="#0a464e" stroke-width="2.4"/>' +
      '<circle cx="0" cy="-16" r="3.4" fill="#f1c9a5"/><path d="M-4.5 -17 A4.5 4.5 0 0 1 4.5 -17Z" fill="#ffd36a"/>' + arm + "</g>";
  }

  function scaffold(x0, x1) {
    var h = '<g class="bk-scaffold">';
    for (var x = x0; x <= x1; x += 26) h += '<line x1="' + x + '" y1="24" x2="' + x + '" y2="94" stroke="#c99428" stroke-width="2.5"/>';
    [40, 66].forEach(function (y) { h += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="#c99428" stroke-width="3"/>'; });
    h += '<line x1="' + x0 + '" y1="94" x2="' + x1 + '" y2="40" stroke="#c99428" stroke-width="1.6" opacity="0.7"/>';
    return h + "</g>";
  }

  /* Era props: 1978 civil-defence surplus; 2008 prepper luxury (servers, wine wall, panic room). Act III keeps the techno-luxury set below. */
  function unitEra(id, i, gold, era) {
    var x = 40 + i * 62, s = gold ? "#c99428" : "#2a2018";
    if (era === 1) {
      if (id === "air") return '<g transform="translate(' + (x + 4) + ' 34)"><rect width="44" height="40" fill="#7d8a5a" stroke="' + s + '" stroke-width="2.5"/><rect x="6" y="6" width="32" height="14" fill="#4c5638"/>' +
        '<path d="M8 9 h28 M8 13 h28 M8 17 h28" stroke="#2a2f1e" stroke-width="1.4"/><circle cx="22" cy="31" r="7" fill="none" stroke="' + s + '" stroke-width="2.5"/><g><line x1="22" y1="31" x2="29" y2="26" stroke="' + s + '" stroke-width="2.5"/></g><rect x="18" y="-26" width="8" height="26" fill="#9aa08a" stroke="' + s + '" stroke-width="1.5"/><rect x="-2" y="40" width="48" height="18" fill="#6b5a3a"/></g>';
      if (id === "water") return '<g transform="translate(' + (x + 2) + ' 40)"><rect width="22" height="52" rx="3" fill="#3f6f8a" stroke="' + s + '" stroke-width="2.5"/><rect x="26" width="22" height="52" rx="3" fill="#3f6f8a" stroke="' + s + '" stroke-width="2.5"/>' +
        '<path d="M0 14 h22 M0 38 h22 M26 14 h22 M26 38 h22" stroke="#24485c" stroke-width="2"/><text x="11" y="30" text-anchor="middle" font-size="9" font-weight="700" fill="#f3e3bf">CD</text><text x="37" y="30" text-anchor="middle" font-size="9" font-weight="700" fill="#f3e3bf">H₂O</text></g>';
      if (id === "power") return '<g transform="translate(' + x + ' 48)"><rect width="54" height="40" rx="3" fill="#6b7a4a" stroke="' + s + '" stroke-width="2.5"/><rect x="6" y="8" width="20" height="12" fill="#2a2f1e"/><circle cx="40" cy="22" r="9" fill="#c9b27a" stroke="' + s + '" stroke-width="2"/>' +
        '<rect x="44" y="-26" width="5" height="26" fill="#3a3a32"/><ellipse class="bk-puff" cx="47" cy="-30" rx="6" ry="4" fill="#9a9488" opacity="0.7"/><rect x="0" y="40" width="54" height="5" fill="#3a3326"/></g>';
      var p = '<g transform="translate(' + x + ' 26)"><rect x="0" y="0" width="52" height="66" fill="#6b4f30" stroke="' + s + '" stroke-width="2.5"/>';
      [12, 34, 56].forEach(function (yy) { p += '<rect x="2" y="' + yy + '" width="48" height="3" fill="#3a2a18"/>'; for (var c = 0; c < 5; c++) p += '<rect x="' + (5 + c * 9) + '" y="' + (yy - 9) + '" width="7" height="9" rx="1" fill="' + (["#c9b27a", "#b84a2e", "#d9c79a", "#7d8a5a", "#c9b27a"][c]) + '" stroke="#2a2018" stroke-width="0.8"/>'; });
      return p + "</g>";
    }
    if (id === "air") return '<g transform="translate(' + (x + 2) + ' 36)"><rect width="50" height="44" rx="4" fill="#d6dbe0" stroke="' + s + '" stroke-width="2.5"/>' +
      '<g stroke="#8a96a0" stroke-width="2">' + [8, 14, 20, 26, 32, 38].map(function (yy) { return '<line x1="6" y1="' + yy + '" x2="44" y2="' + yy + '"/>'; }).join("") + '</g><circle cx="42" cy="6" r="2.4" fill="#2ecc71"/><rect x="-2" y="44" width="54" height="12" fill="#8a96a0"/></g>';
    if (id === "water") { var w = '<g transform="translate(' + x + ' 30)"><rect width="52" height="62" fill="#c9d2d8" stroke="' + s + '" stroke-width="2"/>';
      [[4, 6], [27, 6], [4, 34], [27, 34]].forEach(function (pt) { w += '<rect x="' + pt[0] + '" y="' + pt[1] + '" width="21" height="24" rx="6" fill="#7fc8e8" stroke="#3a7fa0" stroke-width="1.5"/><rect x="' + (pt[0] + 7) + '" y="' + (pt[1] - 3) + '" width="7" height="4" fill="#2a6f9a"/>'; });
      return w + "</g>"; }
    if (id === "power") { var sv = '<g transform="translate(' + (x + 6) + ' 22)"><rect width="40" height="70" rx="2" fill="#1d2228" stroke="' + s + '" stroke-width="2.5"/>';
      for (var r = 0; r < 6; r++) sv += '<rect x="4" y="' + (5 + r * 11) + '" width="32" height="8" fill="#2c333b"/><circle class="bk-led" style="animation-delay:' + (r * 0.23).toFixed(2) + 's" cx="31" cy="' + (9 + r * 11) + '" r="1.6" fill="' + (r % 3 ? "#2ecc71" : "#4aa8ff") + '"/>';
      return sv + "</g>"; }
    var wn = '<g transform="translate(' + x + ' 26)"><rect width="52" height="66" fill="#5a2a2a" stroke="' + s + '" stroke-width="2.5"/>';
    for (var ry = 0; ry < 6; ry++) for (var rx = 0; rx < 5; rx++) wn += '<circle cx="' + (6 + rx * 10) + '" cy="' + (7 + ry * 10.5) + '" r="3.4" fill="' + ((rx + ry) % 3 ? "#2a1414" : "#7a1e2e") + '" stroke="#c9a25a" stroke-width="0.6"/>';
    return wn + "</g>";
  }
  function unit(id, i, gold, era) {
    if (era === 1 || era === 2) return unitEra(id, i, gold, era);
    var x = 40 + i * 62, s = gold ? "#c99428" : "#0a464e";
    if (id === "air") {
      return '<g transform="translate(' + (x + 22) + ' 64)"><rect x="-6" y="-52" width="12" height="30" fill="#cfd8d6" stroke="' + s + '" stroke-width="1.5"/>' +
        '<circle r="22" fill="#eef4f2" stroke="' + s + '" stroke-width="3"/><g class="bk-spin">' +
        '<ellipse cx="0" cy="-10" rx="5" ry="11" fill="#19b3a6"/><ellipse cx="0" cy="-10" rx="5" ry="11" fill="#19b3a6" transform="rotate(120)"/><ellipse cx="0" cy="-10" rx="5" ry="11" fill="#19b3a6" transform="rotate(240)"/></g>' +
        '<circle r="4" fill="' + s + '"/><rect x="-20" y="24" width="40" height="6" rx="2" fill="#8fa5a2"/></g>';
    }
    if (id === "water") {
      return '<g transform="translate(' + (x + 4) + ' 30)"><rect width="38" height="62" rx="9" fill="#eaf7f7" stroke="' + s + '" stroke-width="3"/>' +
        '<rect x="3" y="26" width="32" height="33" rx="6" fill="#2bb5c8"/><path class="bk-wave" d="M3 28 q8 -5 16 0 t16 0 t16 0 v6 h-48z" fill="#7fe0ea"/>' +
        '<rect x="38" y="44" width="22" height="5" fill="#8fa5a2"/></g>';
    }
    if (id === "power") {
      return '<g transform="translate(' + (x + 2) + ' 48)"><rect width="50" height="44" rx="5" fill="#f5e6be" stroke="' + s + '" stroke-width="3"/>' +
        '<line x1="8" y1="10" x2="20" y2="10" stroke="' + s + '" stroke-width="2"/><line x1="8" y1="16" x2="20" y2="16" stroke="' + s + '" stroke-width="2"/>' +
        '<path class="bk-bolt" d="M33 6 L25 24 L32 24 L28 38 L40 18 L33 18 L37 6Z" fill="#ffb12e"/>' +
        '<g class="bk-charge"><rect x="8" y="26" width="5" height="12" fill="#19b3a6"/><rect x="15" y="26" width="5" height="12" fill="#19b3a6"/></g></g>';
    }
    /* food */
    var p = '<g transform="translate(' + x + ' 30)"><rect x="0" y="-4" width="50" height="5" rx="2" class="bk-grow" fill="#ff8a6a"/>' +
      '<rect x="0" y="22" width="50" height="4" fill="' + s + '"/><rect x="0" y="54" width="50" height="4" fill="' + s + '"/>' +
      '<line x1="2" y1="0" x2="2" y2="62" stroke="' + s + '" stroke-width="3"/><line x1="48" y1="0" x2="48" y2="62" stroke="' + s + '" stroke-width="3"/>';
    [8, 20, 32, 42].forEach(function (cx, k) {
      p += '<g class="bk-sway" style="animation-delay:' + (k * 0.3) + 's"><circle cx="' + cx + '" cy="16" r="6" fill="#56b85c"/><circle cx="' + cx + '" cy="48" r="6" fill="#7ccf62"/></g>';
    });
    return p + "</g>";
  }

  function blueprint(id) {
    return '<g class="bk-blueprint" opacity="0.6"><rect x="60" y="36" width="130" height="56" rx="8" fill="none" stroke="#7fe0ea" stroke-width="2" stroke-dasharray="6 5"/>' +
      '<text x="125" y="72" text-anchor="middle" font-size="26" font-weight="700" fill="#7fe0ea">' + ICON[id] + "</text></g>";
  }

  function room(state, id, opts) {
    var R = LD.BUNKER_ROOMS[id];
    var s = roomStage(state, id);
    var sealed = opts.sealed;
    var cls = "bk-room st-" + s.status + " sg-" + s.stage + (s.cheap ? " cheap" : "") + (opts.focus === id ? " sel" : "") + (opts.justBuilt === id ? " just" : "");
    var wall = s.stage === "empty" ? "#2c2620" : s.stage === "building" ? "#7c6a4e" : "#f3e3bf";
    var floor = s.stage === "empty" ? "#4a4038" : s.stage === "building" ? "#a8926c" : "#d8c59c";
    var h = '<g class="' + cls + '" data-room="' + id + '" transform="translate(' + R.x + " " + R.y + ')">';
    h += '<rect class="bk-shell" x="-6" y="-6" width="' + (RW + 12) + '" height="' + (RH + 12) + '" rx="8" fill="#2a2018" stroke="#d4af37" stroke-width="2.5"/>';
    h += '<rect class="bk-wall" x="14" y="12" width="222" height="82" fill="' + wall + '"/>';
    h += '<polygon points="0,0 250,0 236,12 14,12" fill="#5a4630"/>';
    h += '<polygon points="0,0 14,12 14,94 0,118" fill="#6b5338"/><polygon points="250,0 236,12 236,94 250,118" fill="#4c3b28"/>';
    h += '<path d="M0 0 L14 12 M250 0 L236 12 M0 118 L14 94 M250 118 L236 94" stroke="#d4af37" stroke-opacity="0.55" stroke-width="1.2"/>';
    h += '<polygon points="14,94 236,94 250,118 0,118" fill="' + floor + '"/>';
    if (s.stage === "done") {
      h += '<rect class="bk-light" x="60" y="12" width="130" height="5" rx="2" fill="#fff6c8"/>';
      h += '<rect x="14" y="12" width="222" height="82" fill="url(#bk-glow)" opacity="0.6"/>';
    }
    if (s.stage === "empty") {
      h += '<g class="bk-bulb"><line x1="125" y1="12" x2="125" y2="30" stroke="#222" stroke-width="1.5"/><circle cx="125" cy="33" r="4" fill="#ffe39a"/></g>';
      h += '<path d="M30 94 l14 -10 l12 6 l10 -8 l16 12z" fill="#7b6a58"/>';
      h += blueprint(id);
    } else {
      var n = Math.min(3, s.level);
      var units = s.stage === "building" ? 1 : n;
      var era = eraOf(state);
      for (var i = 0; i < units; i++) h += unit(id, i, s.level >= 3 && i === 2, era);
      /* 2008: the power room hides a panic room; now: the house AI watches every room. */
      if (era === 2 && id === "power" && s.stage === "done") h += '<g transform="translate(200 40)"><rect width="30" height="52" rx="3" fill="#8a96a0" stroke="#2a2018" stroke-width="2"/><circle cx="15" cy="24" r="9" fill="none" stroke="#2a2018" stroke-width="2.5"/><path d="M15 15 v18 M6 24 h18" stroke="#2a2018" stroke-width="1.6"/><text x="15" y="48" text-anchor="middle" font-size="6" font-weight="700" fill="#2a2018">PANIC</text></g>';
      if (era === 3 && s.stage === "done") h += '<g class="bk-ai" transform="translate(206 22)"><circle r="7" fill="#0a1a22" stroke="#7fe0ea" stroke-width="1.6"/><circle class="bk-led" r="2.6" fill="#ff5a6a"/></g>';
      if (s.stage === "building") {
        h += scaffold(110, 226);
        h += '<g class="bk-hook"><line x1="170" y1="12" x2="170" y2="34" stroke="#333" stroke-width="1.4"/><rect x="160" y="34" width="20" height="14" fill="#c99428" stroke="#6b4f12"/></g>';
        if (!sealed) {
          h += worker(132, 94, "hammer", 0);
          h += worker(196, 66, "carry", 0.6);
          h += worker(214, 94, "hammer", 0.3);
        }
      }
      if (s.level >= 3) h += '<path d="M14 12 h222" stroke="#e0b44a" stroke-width="4"/><text x="224" y="34" text-anchor="end" font-size="18" fill="#c99428">★</text>';
    }
    if (s.cheap) {
      h += '<path class="bk-crack" d="M40 14 l10 18 l-8 10 l14 16 M190 16 l-8 14 l12 8 l-6 18" fill="none" stroke="#2a211a" stroke-width="2"/>';
      h += '<rect x="0" y="100" width="250" height="9" fill="url(#bk-tape)" transform="skewX(-8)"/>';
    }
    if (s.status === "risk") {
      h += '<rect class="bk-risk" x="14" y="12" width="222" height="82" fill="#e05a48"/>';
      h += '<g class="bk-beacon"><circle cx="228" cy="22" r="7" fill="#ff4a3a"/><circle cx="228" cy="22" r="13" fill="#ff4a3a" opacity="0.3"/></g>';
    }
    if (s.inbound) {
      h += '<g transform="translate(125 52)"><rect x="-56" y="-14" width="112" height="28" rx="14" fill="#0a464e"/><text y="6" text-anchor="middle" font-size="16" font-weight="700" fill="#fff">Arrives Q' + s.inbound.due + "</text></g>";
    }
    /* plaque + status badge */
    var pc = s.status === "ready" ? "#19b3a6" : s.status === "risk" ? "#e05a48" : s.status === "incomplete" ? "#c99428" : "#5c5246";
    h += '<g transform="translate(20 18)"><rect width="96" height="26" rx="13" fill="' + pc + '"/>' +
      '<text x="14" y="18.5" font-size="17" font-weight="700" fill="#fff">' + ICON[id] + " " + esc(R.name) + "</text>" +
      '<text x="88" y="18.5" text-anchor="end" font-size="15" font-weight="700" fill="#fff">' + s.level + "</text></g>";
    for (var l = 0; l < 3; l++) h += '<rect x="' + (122 + l * 12) + '" y="26" width="9" height="9" rx="2" fill="' + (l < s.level ? pc : "rgba(255,255,255,0.35)") + '" stroke="rgba(0,0,0,0.2)"/>';
    var badge = s.status === "ready" ? "✓" : s.status === "risk" ? "!" : s.status === "incomplete" ? "⚒" : "+";
    if (!(s.status === "risk")) {
      h += '<g transform="translate(222 26)"><g class="bk-badge b-' + s.status + '"><circle r="13" fill="' + (s.status === "empty" ? "#19b3a6" : pc) + '" stroke="#fff" stroke-width="2.5"/>' +
        '<text y="6" text-anchor="middle" font-size="17" font-weight="700" fill="#fff">' + badge + "</text></g></g>";
    }
    if (opts.justBuilt === id) h += '<g class="bk-spark"><circle cx="125" cy="56" r="10" fill="none" stroke="#ffe39a" stroke-width="5"/></g>';
    if (opts.interactive) h += '<rect class="bk-hit" x="-6" y="-6" width="' + (RW + 12) + '" height="' + (RH + 12) + '" rx="10"/>';
    return h + "</g>";
  }

  function spotLabel(x, y, text, on) {
    var w = text.length * 9.4 + 30;
    return '<g class="bk-spotlbl' + (on ? " on" : "") + '" transform="translate(' + x + " " + y + ')"><rect x="' + (-w / 2) + '" y="-15" width="' + w + '" height="30" rx="15"/>' +
      '<rect class="bk-spotlbl-in" x="' + (-w / 2 + 3) + '" y="-12" width="' + (w - 6) + '" height="24" rx="12"/><text y="5.5" text-anchor="middle" font-size="16" font-weight="700">' + esc(text) + "</text></g>";
  }

  function feeds(state) {
    var h = "";
    LD.SYSTEMS.forEach(function (sys) {
      var R = LD.BUNKER_ROOMS[sys.id];
      var y = R.y + 64;
      var left = R.x < W / 2;
      var x0 = left ? -OX : W + (SW - W - OX), x1 = left ? R.x - 6 : R.x + RW + 6;
      if (state.converting) {
        h += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="#7d7266" stroke-width="7" stroke-linecap="round"/>' +
          '<text x="' + ((x0 + x1) / 2) + '" y="' + (y + 5) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#e05a48">✕</text>';
        return;
      }
      var gl = LD.gridLabel(LD.gridLevel(state, sys.id));
      var col = gl === "clear" ? "#19b3a6" : gl === "strained" ? "#e39a12" : "#e05a48";
      h += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="#4b433b" stroke-width="8"/>' +
        '<line class="bk-flow g-' + gl + '" x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="' + col + '" stroke-width="4" stroke-dasharray="' + (gl === "disrupted" ? "3 9" : "8 6") + '"/>';
    });
    return h;
  }

  /* Above ground: painted private island (Oasis Prime tower, villa, public
     pipeline to the mainland, private cargo dock). Scene coordinates (SW x SH). */
  function surface(state, opts) {
    var collapse = state.collapse;
    var priv = !!state.converting;
    var h = '<rect width="' + SW + '" height="' + (OY + 140) + '" fill="#e9b46a"/>';
    h += '<image class="bk-art" href="' + islandArt(state) + '" x="0" y="-30" width="' + SW + '" height="495" preserveAspectRatio="none"/>';
    /* mainland smog + fire grow with collapse */
    var fire = Math.min(1, Math.max(0.15, (collapse - 20) / 60));
    h += '<g class="bk-smoke" opacity="' + fire.toFixed(2) + '"><ellipse cx="46" cy="176" rx="70" ry="30" fill="#5f5a57" opacity="0.55"/><ellipse cx="88" cy="150" rx="48" ry="22" fill="#77706b" opacity="0.45"/>' +
      '<ellipse cx="20" cy="132" rx="40" ry="20" fill="#4d4744" opacity="0.5"/>' +
      '<path class="bk-fire" d="M30 214 q6 -16 10 -6 q4 -14 10 2 q6 -10 6 8z" fill="#ff8a3d"/><path class="bk-fire" d="M62 210 q4 -10 7 -4 q3 -9 7 1 q4 -6 4 5z" fill="#ffb347"/></g>';
    /* public pipeline + power cable: sparks while live, dark and cut once private */
    var pipe = "M0 222 L120 238 L250 258 L362 280";
    if (priv) {
      h += '<path d="' + pipe + '" fill="none" stroke="#141210" stroke-opacity="0.62" stroke-width="16" stroke-linecap="round"/>';
      h += '<path d="M0 186 L100 200 L190 218" fill="none" stroke="#141210" stroke-opacity="0.5" stroke-width="5"/>';
      h += '<g transform="translate(300 268)"><circle r="12" fill="#1a1512" stroke="#e05a48" stroke-width="3"/><path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke="#e05a48" stroke-width="3.4" stroke-linecap="round"/></g>';
    } else {
      h += '<path class="bk-pipeflow" d="' + pipe + '" fill="none" stroke="#ffd36a" stroke-opacity="0.55" stroke-width="2.4" stroke-dasharray="6 14"/>';
      [[186, 228], [219, 243], [258, 253], [104, 205]].forEach(function (pt, k) {
        h += '<g class="bk-zap" style="animation-delay:' + (k * 0.37).toFixed(2) + 's" transform="translate(' + pt[0] + " " + pt[1] + ')"><circle r="7" fill="#ffd36a" opacity="0.35"/><circle r="2.6" fill="#fff6c8"/>' +
          '<path d="M-7 -3 L-2 -1 L-5 3 L2 0 M3 -4 L7 -6" stroke="#fff1a8" stroke-width="1.4" fill="none"/></g>';
      });
    }
    /* site office = deco beach villa (engineer) */
    h += '<g class="bk-spot' + (opts.focus === "engineer" ? " sel" : "") + '" data-spot="engineer">';
    if (state.engineer) {
      h += '<g transform="translate(282 238)"><rect x="-4" y="-16" width="8" height="12" rx="2" fill="#19b3a6"/><circle cy="-20" r="4" fill="#f1c9a5"/><path d="M-5 -21 A5 5 0 0 1 5 -21Z" fill="#fff"/><rect x="4" y="-14" width="7" height="9" fill="#fff" stroke="#0a464e"/></g>';
    }
    if (opts.interactive) {
      h += spotLabel(206, 150, state.engineer ? "Engineer ✓" : "Hire engineer", state.engineer);
      h += '<rect class="bk-hit" x="148" y="132" width="150" height="104"/>';
    }
    h += "</g>";
    /* private cargo dock (Go private = own supply chain) */
    h += '<g class="bk-spot' + (opts.focus === "private" ? " sel" : "") + '" data-spot="private">';
    if (priv) {
      h += '<g class="bk-docklit"><ellipse cx="636" cy="250" rx="80" ry="22" fill="#ffe39a" opacity="0.28"/>' +
        '<ellipse cx="760" cy="212" rx="70" ry="40" fill="#7ff2c8" opacity="0.18"/>' +
        [[572, 246], [610, 250], [656, 252], [698, 252], [640, 186], [706, 160], [770, 166]].map(function (pt, k) {
          return '<circle class="bk-docklamp" style="animation-delay:' + (k * 0.2).toFixed(1) + 's" cx="' + pt[0] + '" cy="' + pt[1] + '" r="3.2" fill="#fff6c8"/>';
        }).join("") + "</g>";
      h += '<path class="bk-private" d="M560 266 L470 270 L460 288" fill="none" stroke="#3fe0b8" stroke-width="5" stroke-dasharray="8 6"/>';
    } else {
      h += '<rect x="548" y="238" width="170" height="26" fill="#0b1512" opacity="0.18"/>';
    }
    if (opts.interactive) {
      h += spotLabel(736, 84, priv ? "Private supply ✓" : "Go private", priv);
      h += '<rect class="bk-hit" x="508" y="64" width="360" height="226"/>';
    }
    h += "</g>";
    var era0 = eraOf(state), plaque = (era0 === 1 ? "Fallout Shelter · 1978" : era0 === 2 ? "Prepper Vault · 2008" : (LD.execById(state.executiveId).compound || "Oasis Prime")).toUpperCase();
    var pw = Math.round(plaque.length * 11.5 + 34);
    h += '<g class="bk-plaque" transform="translate(440 18)"><rect x="' + (-pw / 2) + '" y="-13" width="' + pw + '" height="26" rx="13"/><text y="5" text-anchor="middle" font-size="14" font-weight="700" letter-spacing="3">' + esc(plaque) + "</text></g>";
    return h;
  }

  function shaft(state, opts) {
    var h = '<rect x="284" y="128" width="72" height="278" fill="#1a1410" stroke="#d4af37" stroke-width="3"/>';
    h += '<rect x="292" y="128" width="56" height="278" fill="url(#bk-shaft)"/>';
    h += '<line x1="300" y1="130" x2="300" y2="404" stroke="#d4af37" stroke-opacity="0.7" stroke-width="2"/><line x1="340" y1="130" x2="340" y2="404" stroke="#d4af37" stroke-opacity="0.7" stroke-width="2"/>';
    for (var cy = 214; cy < 400; cy += 46) h += '<path d="M292 ' + cy + ' L320 ' + (cy - 12) + ' L348 ' + cy + '" fill="none" stroke="#d4af37" stroke-opacity="0.45" stroke-width="2"/>';
    h += '<g class="bk-elev' + (opts.sealed ? " still" : "") + '"><rect x="298" y="150" width="44" height="40" rx="4" fill="#2b231b" stroke="#e2bf63" stroke-width="2.5"/><rect x="306" y="158" width="28" height="18" fill="#7fe0d0" opacity="0.85"/><path d="M306 186 h28" stroke="#e2bf63" stroke-width="1.5"/><line x1="320" y1="130" x2="320" y2="150" stroke="#e2bf63"/></g>';
    var inbound = (state.pending || []).filter(function (p) { return !!p.install; })[0];
    if (inbound) h += '<g class="bk-crate"><line x1="368" y1="40" x2="368" y2="96" stroke="#222"/><rect x="354" y="96" width="28" height="20" fill="#c99428" stroke="#6b4f12" stroke-width="2"/><text x="368" y="111" text-anchor="middle" font-size="11" font-weight="700" fill="#3b2500">Q' + inbound.due + "</text></g>";
    /* blast door at the top of the shaft */
    h += '<g class="bk-spot bk-door' + (opts.sealed ? " sealed" : "") + (opts.focus === "seal" ? " sel" : "") + '" data-spot="seal">';
    if (opts.sealed) {
      h += '<ellipse cx="320" cy="128" rx="40" ry="11" fill="#9aa7a5" stroke="#0a464e" stroke-width="3"/><path d="M290 128 h60 M320 118 v20" stroke="#0a464e" stroke-width="2"/>' +
        '<ellipse class="bk-sealglow" cx="320" cy="128" rx="50" ry="16" fill="none" stroke="#19b3a6" stroke-width="4"/>';
    } else {
      h += '<ellipse cx="320" cy="128" rx="34" ry="8" fill="#1f1a16"/><g class="bk-doorleaf"><ellipse cx="368" cy="112" rx="10" ry="22" fill="#b8862c" stroke="#fff1c2" stroke-width="2"/><ellipse cx="368" cy="112" rx="5" ry="13" fill="none" stroke="#5a3d0c" stroke-width="1.5"/></g>';
    }
    if (opts.interactive) {
      var can = LD.canEvacuate(state);
      h += spotLabel(320, 96, opts.sealed ? "SEALED" : can ? "Seal the bunker" : "Blast door", can);
      h += '<rect class="bk-hit" x="250" y="80" width="140" height="60"/>';
    }
    h += "</g>";
    return h;
  }

  function renderBunkerScene(state, opts) {
    opts = opts || {};
    var P = opts.idPrefix || "bv";
    var cls = "bk-scene" + (opts.mini ? " mini" : "") + (opts.interactive ? " live" : "") + (opts.sealed ? " is-sealed" : "") + (state.converting ? " private" : "") + (state.engineer ? " engineer" : "");
    var h = '<svg class="' + cls + '" viewBox="0 0 ' + SW + " " + SH + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Private bunker cutaway">';
    h += "<defs>" +
      '<linearGradient id="bk-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe9f2"/><stop offset="1" stop-color="#fff1c9"/></linearGradient>' +
      '<linearGradient id="bk-soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1813" stop-opacity="0.12"/><stop offset="0.5" stop-color="#1e1813" stop-opacity="0.8"/><stop offset="0.62" stop-color="#1e1813"/><stop offset="1" stop-color="#120e0b"/></linearGradient>' +
      '<linearGradient id="bk-shaft" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2e2419"/><stop offset="0.5" stop-color="#4a3a26"/><stop offset="1" stop-color="#2e2419"/></linearGradient>' +
      '<linearGradient id="bk-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dff7f6"/><stop offset="0.5" stop-color="#9fdcdc"/><stop offset="1" stop-color="#5fb8bd"/></linearGradient>' +
      '<radialGradient id="bk-glow" cx="50%" cy="0%" r="90%"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>' +
      '<pattern id="bk-tape" width="18" height="9" patternUnits="userSpaceOnUse"><rect width="18" height="9" fill="#ffd23a"/><path d="M0 9 L9 0 H14 L5 9Z" fill="#1f1a16"/></pattern>' +
      '<pattern id="bk-dots" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#d4af37" fill-opacity="0.07"/></pattern>' +
      "</defs>";
    h += surface(state, opts);
    h += '<g class="bk-under" transform="translate(' + OX + " " + OY + ')">';
    h += '<rect x="' + (-OX) + '" y="132" width="' + SW + '" height="' + (SH - OY - 132) + '" fill="url(#bk-soil)"/>';
    h += '<rect x="' + (-OX) + '" y="132" width="' + SW + '" height="' + (SH - OY - 132) + '" fill="url(#bk-dots)"/>';
    h += '<path d="M' + (-OX) + ' 132 H' + (SW - OX) + '" stroke="#d4af37" stroke-width="3"/>';
    h += '<path d="M-120 250 q100 -10 200 4 t200 -2 t200 6 t280 -6 M-120 392 q110 8 220 -4 t240 6 t400 -4" stroke="#d4af37" stroke-opacity="0.16" stroke-width="2" fill="none"/>';
    h += feeds(state);
    h += shaft(state, opts);
    ["air", "power", "water", "food"].forEach(function (id) { h += room(state, id, opts); });
    if (opts.sealed) h += '<g class="bk-stamp"><rect x="190" y="240" width="260" height="64" rx="10" fill="rgba(255,250,240,0.9)" stroke="#e05a48" stroke-width="5" transform="rotate(-6 320 272)"/><text x="320" y="284" text-anchor="middle" font-size="40" font-weight="700" fill="#e05a48" transform="rotate(-6 320 272)">SEALED</text></g>';
    h += "</g></svg>";
    return h.replace(/(id="|url\(#)bk-/g, "$1" + P + "-");
  }

  /* ---- Zoomed view panel (HTML) ---- */
  function chip(cls, t) { return '<span class="fx-chip ' + cls + '">' + esc(t) + "</span>"; }

  function roomPanel(state, id, mode) {
    var sys = state.bunker[id];
    var s = roomStage(state, id);
    var locked = state.phase !== "bunker" || state.ended;
    var acted = state.bunkerActedThisTurn;
    var u = null;
    LD.availableUpgrades(state).forEach(function (x) { if (x.systemId === id) u = x; });
    var label = { empty: "Empty", incomplete: "Under construction", risk: "At risk", ready: "Ready" }[s.status];
    var h = '<div class="bp-head"><span class="bp-ico st-' + s.status + '">' + ICON[id] + "</span><div><h3>" + esc(LD.BUNKER_ROOMS[id].name) + " · Lv " + sys.level + "</h3>" +
      '<div class="bp-sub">' + esc(LD.systemDetail(state, id, true)) + "</div></div></div>";
    h += '<div class="fx-row">' + chip(s.status === "ready" ? "good" : s.status === "risk" ? "bad" : "meh", label);
    if (s.cheap) h += chip("bad", "Discount work");
    if (!state.converting) {
      var gl = LD.gridLabel(LD.gridLevel(state, id));
      h += chip(gl === "clear" ? "good" : "bad", "Public " + id + " " + gl + (gl === "strained" ? " +$" + LD.mods(state).strainSurcharge + "M" : gl === "disrupted" ? " +$" + LD.mods(state).disruptSurcharge + "M, 1Q late" : ""));
    } else h += chip("own", "Private supply");
    h += "</div>";
    if (!u) return h + '<p class="bp-note">Fully built. Lv 3 redundancy holds even if earlier work was discount.</p>';
    h += '<p class="bp-next">Next: <b>' + esc(u.name) + "</b> (Lv " + u.level + ")</p>";
    if (u.inbound) return h + '<p class="bp-note">Shipment in transit, arrives Q' + u.inbound.due + ". Sealing before then leaves this room unfinished.</p>";
    var convertMode = mode === "convert" && !state.converting && !locked && !acted;
    var cheapNote = u.level === 2 && !state.engineer ? "fails at evacuation without an engineer" : u.level >= 3 ? "Lv 3 holds anyway" : "cheaper, counts as discount";
    h += '<div class="bp-buy">';
    ["sound", "cheap"].forEach(function (q) {
      var cost, dis, attr;
      if (convertMode) {
        var clone = LD.deepClone(state); clone.converting = true;
        cost = LD.upgradeCost(clone, id, sys.level + 1, q);
        dis = state.cash < cost;
        attr = 'data-convert="' + id + '" data-q="' + q + '"';
      } else {
        cost = q === "sound" ? u.soundCost : u.cheapCost;
        dis = locked || acted || !(q === "sound" ? u.canSound : u.canCheap);
        attr = 'data-up="' + id + '" data-q="' + q + '"';
      }
      h += '<button class="bp-btn q-' + q + '" ' + attr + (dis ? " disabled" : "") + "><b>" + (convertMode ? "Go private + " : "") + (q === "sound" ? "Sound" : "Discount") + " · " + money(cost) + "</b><span>" + (q === "sound" ? "holds at evacuation" : cheapNote) + "</span></button>";
    });
    h += "</div>";
    if (!convertMode && !state.converting && u.delay > 0) h += '<p class="bp-warn">Public ' + id + " is disrupted: this shipment arrives next quarter.</p>";
    if (locked) h += '<p class="bp-note">Sign a deal on the map first. Then one bunker order per quarter.</p>';
    else if (acted) h += '<p class="bp-note">You already placed this quarter\'s bunker order.</p>';
    return h;
  }

  function spotPanel(state, spot, mode) {
    var locked = state.phase !== "bunker" || state.ended;
    var acted = state.bunkerActedThisTurn;
    var h = "";
    if (spot === "engineer") {
      h += '<div class="bp-head"><span class="bp-ico st-ready">⛑</span><div><h3>Chief engineer</h3><div class="bp-sub">Site office</div></div></div>';
      if (state.engineer) return h + '<p class="bp-note">On staff. Every Lv 2 discount room will hold at evacuation.</p>';
      var ec = LD.engineerCost(state);
      h += '<p class="bp-next">Makes every Lv 2 discount room hold at evacuation.</p>';
      h += '<button class="bp-btn q-sound" id="btn-engineer"' + (locked || acted || !LD.canHireEngineer(state) ? " disabled" : "") + "><b>Hire · " + money(ec) + "</b><span>uses this quarter's bunker order</span></button>";
      if (locked) h += '<p class="bp-note">Sign a deal on the map first.</p>';
      else if (LD.engineerBlocked(state)) h += '<p class="bp-note">' + esc(LD.engineerBlocked(state)) + "</p>";
      return h;
    }
    if (spot === "private") {
      h += '<div class="bp-head"><span class="bp-ico st-ready">⛽</span><div><h3>Private supply</h3><div class="bp-sub">Once per run</div></div></div>';
      if (state.converting) return h + '<p class="bp-note">Active. Deals pay ' + Math.round(LD.conversionRate(state) * 100) + '% cash. Installs ignore public damage and arrive this quarter.</p>';
      h += '<div class="fx-row">' + chip("bad", "Deals pay " + Math.round(LD.conversionRate(state) * 100) + "%") + (LD.mods(state).conversionFee ? chip("cost", "Paperwork $" + LD.mods(state).conversionFee + "M") : "") + chip("good", "Installs ignore network damage") + chip("good", "No delays") + "</div>";
      var can = !locked && !acted;
      h += '<div class="bp-buy"><button class="bp-btn q-sound" data-convert=""' + (can ? "" : " disabled") + "><b>Convert only · free</b><span>uses this quarter's bunker order</span></button>";
      h += '<button class="bp-btn q-cheap' + (mode === "convert" ? " on" : "") + '" id="bp-convert-secure"' + (can ? "" : " disabled") + "><b>" + (mode === "convert" ? "Now tap a room ▸" : "Convert + secure a room") + "</b><span>clear-rate install, this quarter</span></button></div>";
      if (locked) h += '<p class="bp-note">Sign a deal on the map first.</p>';
      return h;
    }
    if (spot === "seal") {
      var r = LD.readinessSummary(state);
      h += '<div class="bp-head"><span class="bp-ico st-' + (r.canWin ? "ready" : "risk") + '">⛨</span><div><h3>Blast door</h3><div class="bp-sub">' + r.ready + "/4 rooms ready" + (state.engineer ? " · engineer on staff" : "") + "</div></div></div>";
      h += '<div class="fx-row">';
      LD.SYSTEMS.forEach(function (sy) {
        var st = LD.systemStatus(state, sy.id);
        h += chip(st === "ready" ? "good" : "bad", ICON[sy.id] + " " + sy.name + " " + (st === "ready" ? "✓" : st === "risk" ? "at risk" : "not ready"));
      });
      h += "</div>";
      h += sealBonusNote(state);
      if (LD.canEvacuate(state)) h += '<button class="btn-seal" id="btn-seal">Seal the bunker</button>';
      else h += '<p class="bp-note">Sealing opens in quarter ' + LD.MIN_EVAC_TURN + (state.phase !== "bunker" ? ", after you sign a deal" : "") + ".</p>";
      return h;
    }
    return "";
  }

  function defaultPanel(state) {
    var r = LD.readinessSummary(state);
    var h = '<div class="bp-hint"><b>Tap a room to build</b><span class="bp-dot">·</span><span>' + r.ready + "/4 ready</span>" +
      '<span class="bp-dot">·</span><span>Goal: all 4 rooms Lv 2+, then seal from Q' + LD.MIN_EVAC_TURN + "</span></div>";
    h += '<div class="bp-hint-sub"><b>Discount</b> cracks at Lv 2 unless you hire an engineer or reach Lv 3. Office, lot and blast door are tappable too.</div>';
    h += sealBonusNote(state);
    return h;
  }

  /* Seal bonus preview: what Lv 3 rooms pay when the doors close with you inside. */
  function sealBonusNote(state) {
    if (!LD.sealBonus) return "";
    var sb = LD.sealBonus(state), B = LD.SEAL_BONUS;
    var h = '<div class="bp-seal-bonus' + (sb.full ? " full" : sb.n ? " some" : "") + '"><b>★ Lv 3 rooms: +' + B.room.div + " ◈ each at seal</b>";
    h += "<span>" + (sb.n ? sb.n + "/4 overbuilt · +" + sb.div + " ◈" + (sb.full ? " · Fortress seal" : "") : "none yet") + "</span>";
    h += "<span>" + (sb.full ? "Fortress seal: +" + B.full.div + " ◈ and the Gilded Vault fit-out" : "All 4 at Lv 3: Fortress seal +" + B.full.div + " ◈ and the Gilded Vault fit-out") + "</span></div>";
    return h;
  }
  LD.sealBonusNote = sealBonusNote;

  function renderBunkerPanel(state, focus, mode) {
    if (focus && LD.BUNKER_ROOMS[focus]) return roomPanel(state, focus, mode);
    if (focus) return spotPanel(state, focus, mode);
    return defaultPanel(state);
  }

  function renderBunkerView(state, ui) {
    ui = ui || {};
    var locked = state.phase !== "bunker";
    var acted = state.bunkerActedThisTurn;
    var r = LD.readinessSummary(state);
    var h = '<div class="bk-view' + (ui.mode === "convert" ? " convert-mode" : "") + '">';
    var ERA = LD.ERAS && LD.ERAS[eraOf(state)];
    h += '<div class="bk-top"><div><div class="dz-k">' + esc(ERA ? ERA.bunker + " · " + ERA.year : "Private bunker") + " · " + r.ready + "/4 ready" + (state.converting ? " · private supply" : "") + "</div>" +
      "<h3>" + (ui.sealed ? "Doors sealed" : locked ? "Sign a deal to order works" : acted ? "Order placed this quarter" : "One order this quarter") + "</h3></div>" +
      '<button class="dz-x" id="bs-close" aria-label="Close">✕</button></div>';
    h += '<div class="bk-stage">' + renderBunkerScene(state, { interactive: !ui.sealed, focus: ui.focus, justBuilt: ui.justBuilt, sealed: ui.sealed, idPrefix: "bv" }) + "</div>";
    h += '<div class="bk-panel" id="bk-panel">' + (ui.sealed ? '<div class="bp-head"><span class="bp-ico st-ready">✓</span><div><h3>Doors sealed</h3><div class="bp-sub">' + r.ready + '/4 systems ready</div></div></div><p class="bp-note">The world is now someone else\'s problem.</p>' : renderBunkerPanel(state, ui.focus, ui.mode)) + "</div>";
    h += "</div>";
    return h;
  }

  LD.renderBunkerScene = renderBunkerScene;
  LD.renderBunkerView = renderBunkerView;
  LD.renderBunkerPanel = renderBunkerPanel;
  LD.bunkerRoomStage = roomStage;
  /* Back-compat name used by earlier tests/UI. */
  LD.renderBunkerSheet = function (state, mode) { return renderBunkerView(state, { mode: mode }); };

  if (typeof module !== "undefined" && module.exports) module.exports = LD;
})(typeof globalThis !== "undefined" ? globalThis : this);

  