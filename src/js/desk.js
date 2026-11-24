
/* Last Dividend — executive desk + world map renderers. Pure string builders. Browser + Node. */
(function (root) {
  var LD = root.LD || (root.LD = {});

  function esc(s) { return LD.escapeHtml(s); }
  function money(n) { return (n < 0 ? "−$" : "$") + Math.abs(n) + "M"; }
  function signed(n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n); }

  var SYS_ICON = { air: "≋", water: "◖", power: "ϟ", food: "❀" };
  var KIND_ICON = { claim: "+", squeeze: "$", calm: "♥", crisis: "!", neutral: "•" };
  var KIND_LABEL = { claim: "Acquire", squeeze: "Squeeze", calm: "Soothe", crisis: "Crisis", neutral: "Deal" };

  /* Layout of map decorations around a region anchor (map units). */
  var OFF = { pin: [0, -30], flag: [24, 2], plant: [-26, 12], hazard: [10, 34], protest: [-14, 36] };
  /* Hand-tuned anchor nudges so props stay on land. */
  var NUDGE = { na: [0, 0], sam: [8, -8], eu: [-22, -10], af: [-4, -8], me: [4, 16], sa: [14, 10], ea: [22, -10], oc: [8, -4] };

  function anchor(id) {
    var a = LD.WORLD_MAP.anchors[id];
    var n = NUDGE[id] || [0, 0];
    return [a[0] + n[0], a[1] + n[1]];
  }
  function at(id, key) {
    var a = anchor(id), o = OFF[key];
    return [Math.round(a[0] + o[0]), Math.round(a[1] + o[1])];
  }

  function hazardIcon(kind) {
    if (kind === "fire") {
      return '<g class="hz fire"><path d="M0 -16 C8 -8 10 -2 6 6 C4 10 -4 10 -6 6 C-10 -2 -4 -6 -2 -12 C0 -6 2 -6 0 -16Z" fill="#ff8a3d"/><path d="M0 -6 C4 -2 4 2 2 5 C0 7 -2 7 -3 5 C-4 2 -2 0 0 -6Z" fill="#ffd36a"/></g>';
    }
    if (kind === "storm") {
      return '<g class="hz storm"><g class="spin"><path d="M0 0 m-14 0 a14 14 0 0 1 14 -14 a10 10 0 0 0 -6 10 M0 0 m14 0 a14 14 0 0 1 -14 14 a10 10 0 0 0 6 -10" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle r="4" fill="#fff"/></g></g>';
    }
    if (kind === "flood") {
      return '<g class="hz flood"><path d="M-16 0 q4 -6 8 0 t8 0 t8 0 t8 0 M-16 8 q4 -6 8 0 t8 0 t8 0 t8 0" fill="none" stroke="#2f7fd8" stroke-width="3.5" stroke-linecap="round"/></g>';
    }
    return '<g class="hz drought"><path d="M-14 -6 L-4 -2 L-8 6 L2 4 L6 12 M2 4 L12 -4" fill="none" stroke="#8a5a1c" stroke-width="3" stroke-linecap="round"/><circle cx="10" cy="-12" r="6" fill="#ffb12e"/></g>';
  }

  function protestIcon(level) {
    var h = '<g class="protest' + (level === "strike" ? " hot" : "") + '">';
    [-10, 0, 10].forEach(function (x, i) {
      h += '<g class="sign" style="animation-delay:' + (i * 0.25) + 's" transform="translate(' + x + ',0)"><rect x="-5" y="-16" width="10" height="7" rx="1" fill="#fff" stroke="#122c32" stroke-width="1"/><line x1="0" y1="-9" x2="0" y2="2" stroke="#122c32" stroke-width="1.4"/><circle cx="0" cy="5" r="2.6" fill="#122c32"/></g>';
    });
    return h + "</g>";
  }

  function plantIcon(r) {
    var off = r.stress >= LD.STRESS_STRIKE;
    return '<g class="plant' + (off ? " off" : "") + '"><rect x="-13" y="-8" width="26" height="14" rx="2" fill="#f5efe0" stroke="#0a464e" stroke-width="2"/>' +
      '<rect x="4" y="-20" width="6" height="12" fill="#f5efe0" stroke="#0a464e" stroke-width="2"/>' +
      '<circle cx="-5" cy="-1" r="3.5" fill="#2bb5c8"/><circle cx="5" cy="-1" r="3.5" fill="#2bb5c8"/>' +
      (off ? "" : '<circle class="steam" cx="7" cy="-24" r="4" fill="#fff"/>') + "</g>";
  }

  function flagIcon(hq) {
    return '<g class="flag"><line x1="0" y1="10" x2="0" y2="-18" stroke="#0a464e" stroke-width="2.4"/>' +
      '<path class="cloth" d="M0 -18 L18 -13 L0 -7Z" fill="#e05a48"/>' +
      (hq ? '<circle cx="0" cy="10" r="5" fill="#c99428" stroke="#fff" stroke-width="1.5"/>' : '<circle cx="0" cy="10" r="3.5" fill="#e05a48"/>') + "</g>";
  }

  /* ---- Projection: flat map (phone, title) or hologram globe (desk). ----
     The globe bends the whole flat map onto the front of a sphere so every region stays visible. */
  var GLOBE = { cx: 500, cy: 470, R: 455, lon: 76, lat: 62 };
  var projCache = {};
  function globePt(x, y) {
    var u = (x - 500) / 500, v = (y - 262) / 250;
    var lon = u * GLOBE.lon * Math.PI / 180, lat = v * GLOBE.lat * Math.PI / 180;
    return [GLOBE.cx + GLOBE.R * Math.cos(lat) * Math.sin(lon), GLOBE.cy + GLOBE.R * Math.sin(lat)];
  }
  function projector(globe) {
    if (!globe) return function (x, y) { return [x, y]; };
    return globePt;
  }
  function projPath(d, globe, key) {
    if (!globe) return d;
    if (key && projCache[key]) return projCache[key];
    var out = d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, function (m, a, b) {
      var p = globePt(+a, +b);
      return p[0].toFixed(1) + "," + p[1].toFixed(1);
    });
    if (key) projCache[key] = out;
    return out;
  }
  function anchorP(id, P) { var a = anchor(id); return P(a[0], a[1]).map(Math.round); }
  function atP(id, key, P) { var a = anchorP(id, P), o = OFF[key]; return [a[0] + o[0], a[1] + o[1]]; }

  function regionAria(state, id) {
    var r = state.world.regions[id];
    var bits = [LD.REGION_NAMES[id]];
    bits.push(r.owned ? (r.trait === "hq" ? "your headquarters" : "yours") : "unclaimed");
    bits.push("stress " + r.stress + " of " + LD.STRESS_MAX + ", " + ({ calm: "calm", tense: "protests", strike: "riots", revolt: "revolt" })[LD.stressLabel(r.stress)]);
    if (r.plant && r.owned) bits.push("plant " + (r.stress >= LD.STRESS_STRIKE ? "on strike" : "+$" + LD.plantIncome(state, id) + "M a quarter"));
    if (LD.willRevolt(state, id)) bits.push("will revolt next quarter");
    return bits.join(", ");
  }
  function pinAria(state, dealId) {
    var d = LD.dealById(dealId);
    var kind = LD.dealKind(d);
    var rid = state.world.pins[dealId];
    var eff = LD.dealRegionEffect(state, dealId);
    var bits = [KIND_LABEL[kind], d.title, LD.REGION_NAMES[rid], cardTag(state, d)];
    if (eff && eff.claim) bits.push("claims " + eff.regionName);
    if (eff && eff.stress) bits.push("stress " + signed(eff.stress));
    return bits.join(", ");
  }

  function pipsSvg(x, y, stress, cls) {
    var h = '<g class="spips ' + (cls || "") + ' s-' + LD.stressLabel(stress) + '" transform="translate(' + x + " " + y + ')">';
    for (var i = 0; i < LD.STRESS_MAX; i++) {
      h += '<rect x="' + (i * 14 - 34) + '" y="-5" width="11" height="10" rx="2" class="' + (i < stress ? "on" : "") + '"/>';
    }
    return h + "</g>";
  }

  /* Ghost preview of a deal (or crisis response) on the map. Updated in place on selection. */
  function renderMapPreview(state, dealId, choiceId, ui) {
    ui = ui || {};
    if (!dealId || !state.world || state.offered.indexOf(dealId) === -1) return "";
    var P = projector(ui.globe);
    var pre = ui.idPrefix || "m";
    var d = LD.dealById(dealId);
    var eff = LD.dealRegionEffect(state, dealId, choiceId);
    if (!eff) return "";
    var r = state.world.regions[eff.regionId];
    var a = anchorP(eff.regionId, P);
    var h = '<use class="pv-outline' + (eff.claim ? " claim" : eff.stress > 0 ? " heat" : eff.stress < 0 ? " cool" : "") + '" href="#' + pre + "rg-" + eff.regionId + '"/>';
    var next = Math.max(0, Math.min(LD.STRESS_MAX, r.stress + eff.stress));
    if (eff.stress) {
      h += '<g class="pv-pips" transform="translate(' + a[0] + " " + (a[1] + 72) + ')">';
      for (var i = 0; i < LD.STRESS_MAX; i++) {
        var was = i < r.stress, will = i < next;
        if (was !== will) h += '<rect x="' + (i * 14 - 34) + '" y="-5" width="11" height="10" rx="2" class="' + (will ? "add" : "rem") + '"/>';
      }
      h += "</g>";
    }
    var payload = d;
    if (d.choices) d.choices.forEach(function (c) { if (c.id === choiceId) payload = c; });
    var lines = [];
    var listed = LD.payloadCash(state, payload.immediate);
    if (listed) lines.push((listed > 0 ? "+" : "") + money(listed > 0 ? LD.dealCashAmount(state, listed, d) : listed));
    if (eff.claim) lines.push("claims " + eff.regionName);
    if (eff.stress) lines.push("stress " + signed(eff.stress) + (next >= LD.STRESS_REVOLT && r.owned ? " · REVOLT" : ""));
    if (d.choices && !choiceId) lines.push(d.choices.length + " responses");
    var sup = LD.defaultSupply(d, payload);
    if (sup.strain) Object.keys(sup.strain).forEach(function (g) { lines.push("public " + g + " → " + LD.gridLabel(Math.min(2, LD.gridLevel(state, g) + sup.strain[g]))); });
    if (sup.ease) Object.keys(sup.ease).forEach(function (g) { lines.push("public " + g + " eases"); });
    var txt = lines.join(" · ");
    var w = Math.round(txt.length * 10.5 + 30);
    h += '<g class="pv-plate" transform="translate(' + a[0] + " " + (a[1] + 100) + ')"><rect x="' + (-w / 2) + '" y="-15" width="' + w + '" height="30" rx="8"/><text y="6" text-anchor="middle">' + esc(txt) + "</text></g>";
    /* Network routes this deal would strain glow amber. */
    if (sup.strain || sup.ease) {
      LD.ROUTES.forEach(function (rt, k) {
        var net = LD.ROUTE_NET[k];
        if ((sup.strain && sup.strain[net]) || (sup.ease && sup.ease[net])) {
          h += '<path class="pv-net ' + (sup.strain && sup.strain[net] ? "strain" : "ease") + '" d="' + routeD(rt, P) + '"/>';
        }
      });
    }
    return h;
  }

  function routeD(rt, P) {
    var p = LD.WORLD_MAP.ports[rt[0]], q = LD.WORLD_MAP.ports[rt[1]];
    var mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    var dx = q[0] - p[0], dy = q[1] - p[1];
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var bend = Math.min(70, len * 0.22);
    var c = [mx + (dy / len) * bend, my - (dx / len) * bend];
    var A = P(p[0], p[1]), C = P(c[0], c[1]), B = P(q[0], q[1]);
    return "M" + A[0].toFixed(1) + " " + A[1].toFixed(1) + " Q" + C[0].toFixed(1) + " " + C[1].toFixed(1) + " " + B[0].toFixed(1) + " " + B[1].toFixed(1);
  }

  function renderMap(state, ui) {
    ui = ui || {};
    var M = LD.WORLD_MAP;
    var W = state.world;
    var globe = !!ui.globe;
    var P = projector(globe);
    var interactive = !!ui.interactive;
    var selDeal = ui.selDeal || null;
    var selRegion = ui.selRegion || null;
    var coachDeal = ui.coachDeal || null;
    var lens = ui.lens || "none";
    var col = Math.max(0, Math.min(100, state.collapse));
    var vb = globe ? "20 0 960 950" : ui.phone ? "10 30 980 470" : "0 10 " + M.w + " " + (M.h - 10);
    var h = '<svg class="map' + (globe ? " globe" : "") + " lens-" + lens + '" viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet" style="--collapse:' + (col / 100).toFixed(2) + '"' +
      (interactive ? ' role="group" aria-label="World map. Deal pins and regions are buttons; Tab to move, Enter to open."' : ' role="img" aria-label="World map of your holdings"') + ">";
    h += "<defs>" +
      '<radialGradient id="g-ocean" gradientUnits="userSpaceOnUse" cx="480" cy="' + (globe ? 380 : 200) + '" r="' + (globe ? 560 : 900) + '"><stop offset="0" stop-color="#16857a"/><stop offset="0.55" stop-color="#0b4f4a"/><stop offset="1" stop-color="#062824"/></radialGradient>' +
      '<radialGradient id="g-glare" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#9ff5e4" stop-opacity="0.45"/><stop offset="1" stop-color="#9ff5e4" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="g-sphere" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#bffff0" stop-opacity="0.28"/><stop offset="0.55" stop-color="#3fe0b8" stop-opacity="0.05"/><stop offset="0.92" stop-color="#3fe0b8" stop-opacity="0.18"/><stop offset="1" stop-color="#bffff0" stop-opacity="0.55"/></radialGradient>' +
      '<radialGradient id="g-haze" cx="50%" cy="55%" r="65%"><stop offset="0" stop-color="#7a5a3a" stop-opacity="0"/><stop offset="1" stop-color="#5a4030" stop-opacity="0.85"/></radialGradient>' +
      '<linearGradient id="g-land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d98f"/><stop offset="1" stop-color="#c4913a"/></linearGradient>' +
      '<linearGradient id="g-own" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4ff0c4"/><stop offset="1" stop-color="#0f8f72"/></linearGradient>' +
      '<linearGradient id="g-burn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f09a6a"/><stop offset="1" stop-color="#b4482f"/></linearGradient>' +
      '<pattern id="p-dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#3b2a08" fill-opacity="0.2"/></pattern>' +
      '<pattern id="p-waves" width="40" height="18" patternUnits="userSpaceOnUse"><path d="M2 9 q8 -6 16 0" fill="none" stroke="#7ff2dc" stroke-opacity="0.16" stroke-width="1.4" stroke-linecap="round"/></pattern>' +
      (globe ? '<clipPath id="c-sphere"><circle cx="' + GLOBE.cx + '" cy="' + GLOBE.cy + '" r="' + GLOBE.R + '"/></clipPath>' : "") +
      LD.REGION_IDS.map(function (id) { return '<path id="rg-' + id + '" d="' + projPath(M.regions[id].d, globe, "r" + id) + '"/>'; }).join("") +
      "</defs>";
    if (globe) {
      h += '<g class="sea-g" clip-path="url(#c-sphere)"><circle class="sea" cx="' + GLOBE.cx + '" cy="' + GLOBE.cy + '" r="' + GLOBE.R + '" fill="url(#g-ocean)"/>';
      h += '<rect class="waves" x="0" y="0" width="1000" height="950" fill="url(#p-waves)"/>';
      h += '<path class="grat" d="' + projPath(M.grat, true, "grat") + '"/></g>';
      h += '<ellipse class="orbit o1" cx="' + GLOBE.cx + '" cy="' + (GLOBE.cy + 40) + '" rx="' + (GLOBE.R + 60) + '" ry="70"/>';
    } else {
      h += '<rect class="sea" x="-700" y="-500" width="2400" height="1500" fill="url(#g-ocean)"/>';
      h += '<rect class="waves" x="-700" y="-500" width="2400" height="1500" fill="url(#p-waves)"/>';
      h += '<ellipse class="glare" cx="560" cy="150" rx="260" ry="120" fill="url(#g-glare)"/>';
      h += '<path class="grat" d="' + M.grat + '"/>';
    }

    /* Trade routes double as the four public networks (Networks lens). */
    h += '<g class="routes">';
    LD.ROUTES.forEach(function (rt, i) {
      var live = W.regions[rt[0]].owned || W.regions[rt[1]].owned;
      var net = LD.ROUTE_NET[i];
      var gl = LD.gridLabel(LD.gridLevel(state, net));
      h += '<path id="rt' + i + '" class="route net-' + net + " g-" + gl + (live ? " live" : "") + '" d="' + routeD(rt, P) + '"/>';
    });
    h += "</g>";

    /* Land */
    h += '<g class="lands">';
    LD.REGION_IDS.forEach(function (id) {
      var r = W.regions[id];
      var lvl = LD.stressLabel(r.stress);
      var warn = LD.willRevolt(state, id);
      var cls = "region r-" + id + (r.owned ? " owned" : "") + " s-" + lvl + (warn ? " warn" : "") + (selRegion === id ? " sel" : "") + (r.trait ? " t-" + r.trait : "");
      h += '<g class="' + cls + '" data-region="' + id + '"' + (interactive ? ' tabindex="0" role="button" aria-label="' + esc(regionAria(state, id)) + '"' : "") + ">";
      h += '<use class="side" href="#rg-' + id + '" transform="translate(0 7)"/>';
      h += '<use class="top" href="#rg-' + id + '"/>';
      h += '<use class="dots" href="#rg-' + id + '" fill="url(#p-dots)"/>';
      h += '<use class="rim" href="#rg-' + id + '"/>';
      h += "</g>";
    });
    h += '<path class="borders" d="' + projPath(M.mesh, globe, "mesh") + '"/>';
    h += "</g>";
    h += '<g class="preview"' + (interactive ? ' id="map-preview"' : "") + '>' + (interactive ? renderMapPreview(state, selDeal, null, ui) : "") + "</g>";

    /* Ships riding the routes. */
    h += '<g class="traffic">';
    LD.ROUTES.forEach(function (rt, i) {
      if (i % 2 && !(W.regions[rt[0]].owned || W.regions[rt[1]].owned)) return;
      var dur = 16 + (i * 3) % 9;
      h += '<g class="ship"><path d="M-9 -3 L9 -3 L6 4 L-6 4Z" fill="#fdf6e7" stroke="#0a464e" stroke-width="1.5"/><rect x="-4" y="-8" width="7" height="5" fill="#e05a48"/>' +
        '<animateMotion dur="' + dur + 's" repeatCount="indefinite" rotate="auto" begin="-' + (i * 2.3).toFixed(1) + 's"><mpath href="#rt' + i + '"/></animateMotion></g>';
    });
    h += "</g>";

    /* Collapse haze: the world greys and smogs as collapse rises. */
    if (col > 30) h += (globe ? '<circle class="haze" cx="' + GLOBE.cx + '" cy="' + GLOBE.cy + '" r="' + GLOBE.R + '"' : '<rect class="haze" x="-700" y="-500" width="2400" height="1500"') + ' fill="url(#g-haze)" style="opacity:' + Math.min(0.75, (col - 30) / 90).toFixed(2) + '"/>';

    /* Region props */
    h += '<g class="props">';
    LD.REGION_IDS.forEach(function (id) {
      var r = W.regions[id];
      var a = anchorP(id, P);
      var lvl = LD.stressLabel(r.stress);
      if (LD.hazardVisible(state, id)) {
        var hz = atP(id, "hazard", P);
        h += '<g class="prop-hz" transform="translate(' + hz[0] + " " + hz[1] + ') scale(1.6)">' + hazardIcon(r.hazard) + "</g>";
      }
      if (r.owned && (lvl === "tense" || lvl === "strike" || lvl === "revolt")) {
        var pr = atP(id, "protest", P);
        h += '<g transform="translate(' + pr[0] + " " + pr[1] + ') scale(1.4)">' + protestIcon(lvl === "tense" ? "tense" : "strike") + "</g>";
      }
      if (r.owned && r.plant) {
        var pl = atP(id, "plant", P);
        var strike = r.stress >= LD.STRESS_STRIKE;
        h += '<g class="plant-node" data-region="' + id + '" transform="translate(' + pl[0] + " " + pl[1] + ')"><g transform="scale(1.3)">' + plantIcon(r) + "</g>" +
          '<g class="yield' + (strike ? " off" : "") + '" transform="translate(0 -38)"><rect x="-38" y="-12" width="76" height="22" rx="11"/><text y="4" text-anchor="middle">' + (strike ? "STRIKE" : "+" + money(LD.plantIncome(state, id))) + "</text></g></g>";
      }
      if (r.owned) {
        var fl = atP(id, "flag", P);
        h += '<g transform="translate(' + fl[0] + " " + fl[1] + ')">' + flagIcon(r.trait === "hq") + "</g>";
      }
      h += '<circle class="anc" data-anc="' + id + '" cx="' + a[0] + '" cy="' + a[1] + '" r="1"/>';
      var lab = LD.REGION_NAMES[id].toUpperCase();
      var SHORT = { me: "MIDEAST", sa: "S. ASIA", ea: "E. ASIA" };
      h += '<text class="rlabel rl-' + id + (r.owned ? " own" : "") + '" x="' + a[0] + '" y="' + (a[1] + 58) + '" text-anchor="middle">' + (SHORT[id] ? '<tspan class="lf">' + esc(lab) + '</tspan><tspan class="ls">' + SHORT[id] + "</tspan>" : esc(lab)) + "</text>";
      h += pipsSvg(a[0], a[1] + 72, r.stress, r.owned ? "own" : "");
      if (r.trait === "boom") {
        h += '<text class="rtag boom" x="' + a[0] + '" y="' + (a[1] + 96) + '" text-anchor="middle">BOOMING</text>';
      }
      if (LD.willRevolt(state, id)) {
        h += '<g class="revolt-plate" transform="translate(' + a[0] + " " + (a[1] - 82) + ')"><rect x="-118" y="-16" width="236" height="32" rx="6"/><text y="6" text-anchor="middle">⚠ REVOLT NEXT QUARTER</text></g>';
      }
    });
    h += "</g>";

    /* Deal pins */
    h += '<g class="pins">';
    if (state.phase === "deal" && !state.ended && !ui.hidePins) {
      var pinXY = {};
      state.offered.forEach(function (dealId) {
        var rid = W.pins[dealId];
        if (rid) pinXY[dealId] = atP(rid, "pin", P);
      });
      (function spread(ids) {
        var min = 108, guard = 10;
        while (guard--) {
          var moved = false;
          for (var a = 0; a < ids.length; a++) {
            for (var b = a + 1; b < ids.length; b++) {
              var pa = pinXY[ids[a]], pb = pinXY[ids[b]];
              if (!pa || !pb) continue;
              var dx = pb[0] - pa[0], dy = pb[1] - pa[1], dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
              if (dist >= min) continue;
              var push = (min - dist) / 2, nx = dx / dist, ny = dy / dist;
              pa[0] -= nx * push; pa[1] -= ny * push;
              pb[0] += nx * push; pb[1] += ny * push;
              moved = true;
            }
          }
          if (!moved) break;
        }
      })(state.offered);
      var placed = [];
      state.offered.forEach(function (dealId) {
        var q = pinXY[dealId];
        if (q) placed.push([q[0] - 34, q[1] - 44, q[0] + 34, q[1] + 34]);
      });
      var tagDy = {};
      state.offered.forEach(function (dealId) {
        var rid1 = W.pins[dealId];
        if (!rid1) return;
        var d1 = LD.dealById(dealId);
        var q1 = pinXY[dealId] || atP(rid1, "pin", P);
        var t1 = KIND_LABEL[LD.dealKind(d1)].toUpperCase() + " " + cardTag(state, d1);
        var w1 = Math.round(t1.length * 12.5 + 26);
        var opts = [[0, 46], [0, -66], [0, 82], [w1 / 2 + 34, -8], [-w1 / 2 - 34, -8], [0, 118]];
        var pick = opts[0];
        for (var k = 0; k < opts.length; k++) {
          var bx = [q1[0] + opts[k][0] - w1 / 2, q1[1] + opts[k][1] - 15, q1[0] + opts[k][0] + w1 / 2, q1[1] + opts[k][1] + 15];
          var hit = placed.some(function (o) {
            var self = o[0] === q1[0] - 30 && o[1] === q1[1] - 40;
            return !self && bx[0] < o[2] && bx[2] > o[0] && bx[1] < o[3] && bx[3] > o[1];
          });
          if (!hit) { pick = opts[k]; placed.push(bx); break; }
        }
        tagDy[dealId] = pick;
      });
      state.offered.forEach(function (dealId, i) {
        var rid = W.pins[dealId];
        if (!rid) return;
        var d = LD.dealById(dealId);
        var kind = LD.dealKind(d);
        var p = pinXY[dealId] || atP(rid, "pin", P);
        var cls = "pin k-" + kind + (selDeal === dealId ? " sel" : "") + (coachDeal === dealId ? " coach" : "");
        h += '<g class="' + cls + '" data-deal="' + dealId + '" transform="translate(' + p[0] + " " + p[1] + ')" style="--i:' + i + '"' +
          (interactive ? ' tabindex="0" role="button" aria-label="' + esc(pinAria(state, dealId)) + '"' : "") + ">";
        var tag = KIND_LABEL[kind].toUpperCase() + " " + (d.choices ? d.choices.length + " RESPONSES" : cardTag(state, d));
        var tw = Math.round(tag.length * 12.5 + 26);
        h += '<g class="pin-body"><g class="pin-scale">';
        h += '<circle class="ring" r="22"/>';
        h += '<path class="drop" d="M0 22 C-6 12 -20 4 -20 -8 A20 20 0 1 1 20 -8 C20 4 6 12 0 22Z"/>';
        h += '<text class="glyph" y="0" text-anchor="middle">' + esc(KIND_ICON[kind]) + "</text>";
        h += "</g>";
        var off = tagDy[dealId] || [0, 46];
        h += '<g class="pin-tag" transform="translate(' + off[0] + " " + off[1] + ')"><g class="pin-tag-in"><rect x="' + (-tw / 2) + '" y="-15" width="' + tw + '" height="30" rx="15"/>' +
          '<text y="7" text-anchor="middle">' + esc(tag) + "</text></g></g>";
        h += "</g>";
        h += '<g class="pin-hit"><rect class="hit" x="-44" y="-56" width="88" height="96" rx="24"/></g>';
        h += "</g>";
      });
    } else if (state.phase === "bunker" && !state.ended && state.lastDealId && W.pins[state.lastDealId]) {
      var sp = atP(W.pins[state.lastDealId], "pin", P);
      h += '<g transform="translate(' + sp[0] + " " + (sp[1] - 40) + ')"><g class="signed-mark"><rect x="-62" y="-18" width="124" height="36" rx="18"/><text y="7" text-anchor="middle">SIGNED ✓</text></g></g>';
    }
    h += "</g>";
    if (globe) h += '<circle class="sphere-shine" cx="' + GLOBE.cx + '" cy="' + GLOBE.cy + '" r="' + GLOBE.R + '" fill="url(#g-sphere)"/>' +
      '<ellipse class="orbit o2" cx="' + GLOBE.cx + '" cy="' + (GLOBE.cy + 40) + '" rx="' + (GLOBE.R + 60) + '" ry="70"/>';
    h += "</svg>";
    var Px = ui.idPrefix || "m";
    return h.replace(/(id="|url\(#|href="#)(g-|p-|f-|c-|rg-|rt)/g, "$1" + Px + "$2");
  }

  function meter(cls, label, num, extra, isMoney, ticks) {
    var pct = Math.max(0, Math.min(100, num));
    var tk = (ticks || []).map(function (t) { return '<i class="m-tick" style="left:' + t[0] + '%" title="' + esc(t[1]) + '"></i>'; }).join("");
    return '<div class="meter m-' + cls + '" data-num="' + num + '"' + (isMoney ? ' data-money="1"' : "") + '><div class="m-lbl">' + label + '</div><div class="m-val">' + (isMoney ? money(num) : num) + "</div>" +
      '<div class="m-bar"><span style="width:' + pct + '%"></span>' + tk + "</div>" + (extra ? '<div class="m-sub">' + extra + "</div>" : "") + "</div>";
  }

  function sparkline(state) {
    var hist = (state.world && state.world.history) || [];
    var pts = hist.map(function (p) { return p.cash; });
    if (pts[pts.length - 1] !== state.cash) pts.push(state.cash);
    if (pts.length < 2) pts.unshift(pts[0] || 0);
    var max = Math.max.apply(null, pts.concat([10])), min = Math.min.apply(null, pts.concat([0]));
    var w = 220, hh = 54;
    var step = w / (pts.length - 1);
    var d = pts.map(function (v, i) {
      var y = hh - 6 - ((v - min) / ((max - min) || 1)) * (hh - 12);
      return (i ? "L" : "M") + (i * step).toFixed(1) + " " + y.toFixed(1);
    }).join(" ");
    var up = pts[pts.length - 1] >= pts[pts.length - 2];
    return '<svg class="spark" viewBox="0 0 ' + w + " " + hh + '" preserveAspectRatio="none" aria-hidden="true"><path class="area" d="' + d + " L" + w + " " + hh + " L0 " + hh + 'Z"/><path class="line' + (up ? " up" : " down") + '" d="' + d + '"/></svg>';
  }

  function bunkerTally(state) {
    var r = LD.readinessSummary(state);
    return r.ready + "/4 ready";
  }

  function regionInText(text) {
    var found = null;
    LD.REGION_IDS.forEach(function (id) { if (!found && text.indexOf(LD.REGION_NAMES[id]) !== -1) found = id; });
    return found;
  }

  function tickerItems(state) {
    var items = (state.log || []).slice(0, 6).map(function (l) { return { text: "Q" + l.turn + " · " + l.text, region: regionInText(l.text) }; });
    /* The era's own headlines run between yours (fiction: Port Calder, 1978 / 2008 / now). */
    var era = LD.eraOf ? LD.eraOf(state) : 0, news = era && LD.ERA_NEWS ? LD.ERA_NEWS[era] : null;
    if (news) {
      var k = (state.turn * 3) % news.length, out = [];
      items.forEach(function (it, i) { out.push(it); if (i % 2 === 1) out.push({ text: "📰 " + news[(k + i) % news.length], region: null, era: true }); });
      if (!items.length) out.push({ text: "📰 " + news[k], region: null, era: true }, { text: "📰 " + news[(k + 1) % news.length], region: null, era: true });
      items = out.slice(0, 9);
    }
    if (!items.length) items = [{ text: "Markets open.", region: null }];
    return items;
  }

  /* Quarter timeline rail: signed delayed effects stay visible until they land. */
  function railChips(state, item) {
    var out = [];
    if (item.install) out.push(["good", item.install.id + " Lv" + item.install.level + " arrives"]);
    if (item.unrest) out.push([item.unrest > 0 ? "bad" : "good", "Unrest " + signed(item.unrest)]);
    if (item.collapse) out.push([item.collapse > 0 ? "bad" : "good", "Collapse " + signed(item.collapse)]);
    if (item.cash) out.push([item.cash > 0 ? "good" : "cost", money(item.cash)]);
    if (item.effectsIf && item.effectsIf.collapse) out.push(["bad", "Collapse +" + item.effectsIf.collapse + "?"]);
    if (item.strain) Object.keys(item.strain).forEach(function (g) { out.push(["bad", "Public " + g + " strains"]); });
    if (item.ease) Object.keys(item.ease).forEach(function (g) { out.push(["good", "Public " + g + " eases"]); });
    if (item.grantSystem) out.push(["good", item.grantSystem.id + " Lv" + item.grantSystem.level]);
    return out;
  }
  function ghostItem(state, dealId, choiceId) {
    var d = LD.dealById(dealId);
    if (!d) return null;
    var payload = d;
    if (d.choices) { payload = null; d.choices.forEach(function (c) { if (c.id === choiceId) payload = c; }); }
    if (!payload || !payload.delay) return null;
    var dl = payload.delay;
    var exec = LD.execById(state.executiveId);
    var bonus = dl.noBonus ? 0 : ((exec.perks && exec.perks.delayBonus) || 0);
    var dm = LD.mods(state).delayMult;
    function f(n) { return n > 0 && dm !== 1 ? Math.round(n * dm) : (n || 0); }
    return { due: state.turn + dl.turns + bonus, unrest: f(dl.unrest), collapse: f(dl.collapse), cash: dl.cash || 0, effectsIf: dl.effectsIf, grantSystem: dl.grantSystem, ghost: true };
  }
  function renderRail(state, dealId, choiceId) {
    var cols = 5;
    var breach = state.turn + Math.max(0, LD.forecastQuarters(state) - 1);
    var items = (state.pending || []).slice();
    var g = dealId && state.phase === "deal" ? ghostItem(state, dealId, choiceId) : null;
    if (g) items.push(g);
    var h = '<div class="rail" id="rail" aria-label="Quarter timeline">';
    for (var i = 0; i < cols; i++) {
      var q = state.turn + i;
      var here = items.filter(function (it) {
        var due = it.install ? it.due - 1 : it.due;
        return i === cols - 1 ? due >= q : due === q;
      });
      var marks = [];
      if (q === LD.MIN_EVAC_TURN && state.turn <= q) marks.push('<em class="rm seal">Seal opens</em>');
      if (q >= LD.MIN_EVAC_TURN && i === 0 && state.turn >= LD.MIN_EVAC_TURN) marks.push('<em class="rm seal">Seal open</em>');
      if (q === breach) marks.push('<em class="rm breach">Breach ~</em>');
      var bq = LD.bossInfo && (i < cols - 1 || q === state.turn + cols - 1) ? LD.bossInfo(state, q) : null;
      if (!bq && i === cols - 1 && LD.nextBossQ) { var nb = LD.nextBossQ(state); if (nb && nb > q) bq = LD.bossInfo(state, nb); }
      if (bq) marks.push('<button class="rm boss" data-boss-q="' + bq.q + '">' + LD.iconArt(bq, "boss") + " " + esc(bq.name.replace(/^The /, "")) + (bq.q !== q ? " Q" + bq.q : "") + "</button>");
      h += '<div class="rq' + (i === 0 ? " now" : "") + (bq && bq.q === q ? " boss-q" : "") + '"><div class="rq-h">Q' + q + (i === 0 ? " <small>at close</small>" : i === cols - 1 ? "+" : "") + "</div>" + marks.join("");
      here.forEach(function (it) {
        railChips(state, it).forEach(function (c) {
          h += '<span class="fx-chip ' + c[0] + (it.ghost ? " ghost" : "") + '" title="' + esc(it.source || (it.ghost ? "If signed" : "")) + '">' + esc(c[1] + (it.ghost ? " if signed" : "")) + "</span>";
        });
      });
      h += "</div>";
    }
    return h + "</div>";
  }

  function networkStrip(state, ui) {
    var h = '<div class="net-strip" role="group" aria-label="Public networks">';
    LD.SYSTEMS.forEach(function (s) {
      var gl = LD.gridLabel(LD.gridLevel(state, s.id));
      h += '<button class="net-chip g-' + gl + (ui.selNet === s.id ? " sel" : "") + '" data-net="' + s.id + '" aria-label="Public ' + s.id + " network " + gl + '"><i>' + SYS_ICON[s.id] + "</i>" + esc(s.id) + "<b>" + esc(gl) + "</b></button>";
    });
    return h + "</div>";
  }

  function lensBar(ui) {
    var lens = ui.lens || "none";
    var h = '<div class="lens-bar" role="group" aria-label="Map overlays">';
    [["none", "Map"], ["mood", "Mood"], ["networks", "Networks"], ["holdings", "Holdings"]].forEach(function (l) {
      h += '<button class="lens-btn' + (lens === l[0] ? " on" : "") + '" data-lens="' + l[0] + '" aria-pressed="' + (lens === l[0]) + '">' + l[1] + "</button>";
    });
    return h + "</div>";
  }


  /* ---------- Side rail: the desk's menu buttons on the screen edge (menu, deck, briefcase, phone, bunker hatch) ---------- */
  var RAIL_SVG = {
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16"/></svg>',
    deck: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3.5" width="11" height="15" rx="1.6" transform="rotate(8 13.5 11)"/><rect x="5" y="5.5" width="11" height="15" rx="1.6" class="f"/><path d="M8.2 10.5l2.3-2.3 2.3 2.3-2.3 2.3z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9.5c0-2.4 3.8-4.2 8.5-4.2s8.5 1.8 8.5 4.2v1.2h-4.2V8.9c-1.2-.4-2.7-.6-4.3-.6s-3.1.2-4.3.6v1.8H3.5z" class="f"/><path d="M6.5 12.5h11l1.5 6.5H5z"/><circle cx="12" cy="15.7" r="1.7"/></svg>'
  };
  LD.BUNKER_ICON = { mara: "bunker-mara", reid: "bunker-reid", imani: "bunker-imani", julian: "bunker-julian", soren: "bunker-soren", cassius: "bunker-cassius" };
  /* The executive's own compound hatch (painted icon); unknown executives fall back to the shared bunker token. */
  /* The vault tab: a stepped Art Deco vault front with a sunburst wheel door, gold line on the rail navy.
     Tinted per executive (--vt). Big on purpose: it is the other half of the game. */
  var VAULT_TINT = { mara: "#2e7f73", reid: "#7a5a2a", julian: "#2b5d86", cassius: "#7c3b34", imani: "#5a6a2c", soren: "#5b4a7c" };
  LD.vaultIconSvg = function () {
    var cx = 32, cy = 75, rays = "";
    for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6, x1 = cx + Math.cos(a) * 6.8, y1 = cy + Math.sin(a) * 6.8, x2 = cx + Math.cos(a) * 13.6, y2 = cy + Math.sin(a) * 13.6; rays += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>'; }
    var tiers = "M27 15 H37 V25 H43 V35 H49 V45 H56 V102 H8 V45 H15 V35 H21 V25 H27 Z";
    return '<svg class="vt-svg" viewBox="0 0 64 108" aria-hidden="true">' +
      '<path class="vt-sky" d="M32 1 L35 15 L29 15 Z"/>' +
      '<path class="vt-body" d="' + tiers + '"/><path class="vt-line" d="' + tiers + '"/>' +
      '<path class="vt-thin" d="M15 45 H49 M21 35 H43 M27 25 H37 M32 17 V43 M24.5 27 V43 M39.5 27 V43 M12.5 50 V98 M51.5 50 V98"/>' +
      '<path class="vt-thin" d="M18 52 H46"/>' +
      '<circle class="vt-door" cx="' + cx + '" cy="' + cy + '" r="17.5"/><circle class="vt-line" cx="' + cx + '" cy="' + cy + '" r="17.5"/><circle class="vt-thin" cx="' + cx + '" cy="' + cy + '" r="14.8"/>' +
      '<g class="vt-rays">' + rays + '</g><circle class="vt-hub" cx="' + cx + '" cy="' + cy + '" r="4.6"/><circle class="vt-pin" cx="' + cx + '" cy="' + cy + '" r="1.7"/>' +
      '<path class="vt-base" d="M3 102 H61 V107 H3 Z"/></svg>';
  };
  LD.vaultLockSvg = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="9" width="12" height="9" rx="2"/><path d="M6.5 9 V6.5 a3.5 3.5 0 0 1 7 0 V9" fill="none"/></svg>';
  LD.vaultTint = function (state) { return VAULT_TINT[state && state.executiveId] || "#2e7f73"; };
  LD.bunkerIcon = function (state, cls) {
    if (!cls) return '<span class="sr-hatch sr-vault">' + LD.vaultIconSvg() + "</span>";
    var k = LD.BUNKER_ICON[state && state.executiveId];
    var tokFb = LD.tok ? LD.tok("bunker") : "⛫";
    if (!k) return '<span class="' + (cls || "sr-hatch") + ' sr-hatch-fb">' + tokFb + "</span>";
    return '<span class="' + (cls || "sr-hatch") + '"><img src="assets/icons/' + k + '.webp" alt="" draggable="false" onerror="this.parentNode.className+=\' sr-hatch-fb\'">' + tokFb + "</span>";
  };
  function sideRail(state, ui) {
    var f = state.fy || {};
    var dealPhase = state.phase === "deal";
    var ring = !!f.memo, ERA = LD.ERAS && LD.eraOf ? LD.ERAS[LD.eraOf(state)] : null;
    var r = LD.readinessSummary(state);
    var lv = 0; LD.SYSTEMS.forEach(function (s) { lv += Math.min(3, (state.bunker[s.id] && state.bunker[s.id].level) | 0); });
    var exec = LD.execById(state.executiveId) || {};
    var bunkerReady = !dealPhase && !state.bunkerActedThisTurn;
    var rd = (f.drawer || []).filter(function (d) { return LD.itemReady && LD.itemReady(state, d); }).length;
    var h = '<nav class="side-rail" id="side-rail" aria-label="Desk controls"><div class="sr-top">';
    h += '<button class="sr-btn sr-menu" id="btn-menu" aria-label="Menu"><span class="sr-ic">' + RAIL_SVG.menu + "</span><small>Menu</small></button>";
    if (f.deck) h += '<button class="sr-btn sr-deck" id="btn-deck" aria-label="Deck, ' + f.deck.length + ' cards"><span class="sr-ic">' + RAIL_SVG.deck + '</span><small>Deck</small><em class="sr-badge">' + f.deck.length + "</em></button>";
    if (state.fy) h += '<button class="sr-btn sr-case' + (rd ? " has-ready" : "") + '" id="btn-portfolio" aria-label="Briefcase, ' + LD.fySlotsUsed(state) + " of " + f.cap + " wall slots" + (rd ? ", " + rd + " drawer item" + (rd > 1 ? "s" : "") + " ready" : "") + '"><span class="sr-ic">' + (LD.tok ? LD.tok("case") : "💼") + '</span><small>Case</small><em class="sr-badge">' + (rd ? "⚡" + rd : LD.fySlotsUsed(state) + "/" + f.cap) + "</em></button>";
    h += '<button class="sr-btn sr-phone' + (ring ? " ringing" : " quiet") + '" id="btn-phone" aria-label="' + esc(ring ? (ERA ? ERA.phone : "The phone is ringing") : "Phone: no calls right now") + '"' + '><span class="sr-ic">' + RAIL_SVG.phone + "</span><small>" + (ring ? "Call!" : "Phone") + "</small>" + (ring ? '<em class="sr-badge sr-ring">1</em>' : "") + "</button>";
    h += '</div><span class="sr-gap" aria-hidden="true"></span>';
    if (!(LD.isHouse && LD.isHouse(state))) {
      var pips = ""; for (var pi = 0; pi < 4; pi++) pips += '<i class="' + (pi < r.ready ? "on" : "") + '"></i>';
      h += '<button class="sr-btn sr-bunker' + (bunkerReady ? " ready" : "") + (dealPhase ? " locked" : "") + (state.bunkerActedThisTurn ? " acted" : "") + (ui.coach === "bunker" ? " coach" : "") + '" id="bunker-card" style="--bp:' + Math.round(lv / 12 * 100) + "%;--vt:" + LD.vaultTint(state) + '" aria-label="Floor hatch to ' + esc(exec.compound || "the bunker") + ", " + r.ready + " of 4 rooms ready" + (dealPhase ? ". Opens after you sign a deal" : state.bunkerActedThisTurn ? ". Works ordered this quarter" : ". Tap to build") + '">' +
        LD.bunkerIcon(state) + '<span class="sr-pips" aria-hidden="true">' + pips + "</span><small>Bunker</small>" + (dealPhase ? '<em class="sr-lock" aria-hidden="true">' + LD.vaultLockSvg + "</em>" : "") + "</button>";
    }
    h += "</nav>";
    return h;
  }
  LD.renderSideRail = sideRail;

  /* The deck, face down, always on the run screen: the hand is dealt from it when a fight starts (the fight bay docks its own
     copy, counting the draw pile) and the cards go back to it after. Reward picks fly into it. Tap: the deck list. */
  function runDeck(state) {
    var f = state.fy; if (!f || !f.deck) return "";
    var n = f.deck.length;
    return '<button class="run-deck" id="run-deck" aria-label="Your deck, ' + n + ' cards. Open the deck list"><img src="assets/ui/card-back.webp" alt="" draggable="false"><i class="rd-stack" aria-hidden="true"></i><em class="rd-count">' + n + "</em></button>";
  }
  LD.runDeckHtml = runDeck;
  function renderDesk(state, ui) {
    ui = ui || {};
    var dealPhase = state.phase === "deal";
    var h = '<div class="desk ' + (dealPhase ? "phase-deal" : "phase-bunker") + (ui.selDeal || ui.selRegion || ui.selNet ? " has-sel" : "") + (ui.globe ? " is-globe" : "") + '">';
    h += '<div class="desk-light" aria-hidden="true"></div>';
    h += '<header class="desk-head"><div class="brand"><div class="wordmark">LAST DIVIDEND<span class="sun" aria-hidden="true"></span></div>' +
      '<div class="tag">' + (LD.ERAS && LD.eraOf && LD.ERAS[LD.eraOf(state)] ? esc("Port Calder, " + LD.ERAS[LD.eraOf(state)].year.replace("Now", "now") + " · " + LD.ERAS[LD.eraOf(state)].name) : "A Brighter Tomorrow, Privately Owned") + '</div></div>' +
      '<div class="head-right"><div class="rating-plate" aria-label="Credit rating ' + esc(LD.ratingName(state.rating)) + '"><small>Rating</small>' + esc(LD.ratingName(state.rating)) + '</div><div class="q-chip" aria-label="Quarter ' + state.turn + '"><small>' + (LD.actChip ? LD.actChip(state) : "Quarter") + '</small>Q' + state.turn + (state.fy ? "<i>/" + state.fy.rules.finalQ + "</i>" : "") + "</div>" +
      "</div></header>";
    h += sideRail(state, ui);

    h += '<aside class="dossier" id="dossier">' + renderDossier(state, ui) + "</aside>";

    h += '<main class="board">' + lensBar(ui) + networkStrip(state, ui);
    h += '<div class="board-tilt"><div class="board-slab"><div class="map-zoom" id="map-zoom">' + renderMap(state, ui) + "</div></div>" + (ui.globe ? '<div class="pedestal" aria-hidden="true"><i></i><i></i><i></i></div>' : "") + "</div>";
    var bossNow = LD.bossInfo ? LD.bossInfo(state, state.turn) : null;
    h += '<div class="phase-pill' + (bossNow && !ui.hidePins ? " boss" : "") + '">' + (bossNow && !ui.hidePins ? LD.iconArt(bossNow, "boss") + " Boss quarter · " + bossNow.name + " · " : "") + (ui.hidePins ? "The world reacts…" : dealPhase ? "Pick 1 of " + state.offered.length + " deals on the map" : (state.bunkerActedThisTurn ? "Ready to end the quarter" : "Deal signed · upgrade the bunker or end the quarter")) + "</div>";
    h += '<div id="rail-wrap">' + renderRail(state, ui.selDeal, null) + "</div>";
    if (ui.coach === "pin" && ui.coachText) h += '<div class="coach-bubble c-pin">' + esc(ui.coachText) + "</div>";
    if (dealPhase && !ui.hidePins) {
      h += '<div class="sr-only"><h2>Deals this quarter</h2><ul>';
      state.offered.forEach(function (id) { h += '<li><button class="sr-deal" data-deal="' + id + '">' + esc(pinAria(state, id)) + "</button></li>"; });
      h += "</ul></div>";
    }
    if (ui.globe) h += runDeck(state);
    h += '<div class="map-tip" id="map-tip" role="tooltip" hidden></div>';
    h += '<div class="fx" id="fx" aria-hidden="true"></div></main>';

    var hist = (state.world && state.world.history) || [];
    var prev = hist.length > 1 ? hist[hist.length - 2].cash : null;
    var last = hist.length ? hist[hist.length - 1].cash : state.cash;
    var delta = state.cash - (prev == null ? last : (state.turn === hist[hist.length - 1].turn ? prev : last));
    h += '<aside class="dash">';
    h += '<div class="panel dash-meters office">' + LD.renderOffice(state, { cashSub: delta ? (delta > 0 ? "▲ " : "▼ ") + money(Math.abs(delta)) + " this Q" : "steady" }) + "</div>";
    h += '<div class="panel ticker" aria-label="News"><div class="panel-k">News</div><div class="tick-wrap"><div class="tick-run">';
    var items = tickerItems(state);
    function tickItem(t, i) {
      var cls = "tick-msg" + (i === 0 ? " on" : "");
      return t.region
        ? '<button class="tick-item ' + cls + '" data-region="' + t.region + '"' + (i ? ' tabindex="-1"' : "") + ">" + esc(t.text) + "</button>"
        : '<span class="' + cls + '">' + esc(t.text) + "</span>";
    }
    h += items.map(function (t, i) { return tickItem(t, i); }).join("");
    h += "</div></div></div>";
    h += "</aside>";

    h += '<footer class="hand' + (!ui.globe && state.fy && state.fy.deck ? " has-deck" : "") + '">';
    if (!ui.globe) h += runDeck(state);
    var canEnd = !dealPhase;
    h += '<button class="end-q' + (canEnd ? " live" : "") + (ui.coach === "end" ? " coach" : "") + '" id="btn-endq">' +
      '<span class="eq-ico">✓</span><span class="eq-t">END QUARTER<small>' + (ui.hidePins ? "Dealing Q" + state.turn + " opportunities…" : canEnd ? "Ride the upside. Own the future." : "Pick 1 of " + state.offered.length + " deals on the map first") + "</small></span></button>";
    if (ui.coach === "end" && ui.coachText) h += '<div class="coach-bubble c-end">' + esc(ui.coachText) + "</div>";
    h += "</footer>";
    h += "</div>";
    return h;
  }

  function cardTag(state, d) {
    if (d.choices) return "Choose";
    var c = LD.payloadCash(state, d.immediate);
    if (c > 0) return "+" + money(LD.dealCashAmount(state, c, d));
    if (c < 0) return money(c);
    return "Free";
  }

  function chip(cls, text) { return '<span class="fx-chip ' + cls + '">' + esc(text) + "</span>"; }

  function payloadChips(state, deal, payload) {
    var now = [], later = [], world = [];
    var imm = payload.immediate || {};
    var listed = LD.payloadCash(state, imm);
    if (listed) {
      var cash = listed > 0 ? LD.dealCashAmount(state, listed, deal) : listed;
      now.push(chip(cash > 0 ? "good" : "cost", (cash > 0 ? "+" : "") + money(cash) + (state.converting && cash !== listed ? " (" + Math.round(LD.conversionRate(state) * 100) + "%)" : "")));
    }
    if (imm.unrest) now.push(chip(imm.unrest > 0 ? "bad" : "good", "Unrest " + signed(imm.unrest)));
    if (imm.collapse) now.push(chip(imm.collapse > 0 ? "bad" : "good", "Collapse " + signed(imm.collapse)));
    if (imm.special === "divertFilters") now.push(chip("good", state.bunker.air.level < 1 ? "Air Lv1 (discount)" : "+$12M resale"));
    var dl = payload.delay;
    if (dl) {
      var exec = LD.execById(state.executiveId);
      var due = state.turn + dl.turns + ((exec.perks && exec.perks.delayBonus) || 0);
      if (dl.cash) later.push(chip(dl.cash > 0 ? "good" : "cost", money(dl.cash)));
      if (dl.unrest) later.push(chip(dl.unrest > 0 ? "bad" : "good", "Unrest " + signed(dl.unrest)));
      if (dl.collapse) later.push(chip(dl.collapse > 0 ? "bad" : "good", "Collapse " + signed(dl.collapse)));
      if (dl.effectsIf && dl.effectsIf.collapse) later.push(chip("bad", "Collapse +" + dl.effectsIf.collapse + " unless filters funded"));
      if (dl.grantSystem) later.push(chip("good", dl.grantSystem.id + " Lv" + dl.grantSystem.level + " arrives"));
      if (later.length) later.unshift('<span class="when">Q' + due + "</span>");
    }
    var supply = LD.defaultSupply(deal, payload);
    if (supply.strain) Object.keys(supply.strain).forEach(function (g) {
      var next = Math.min(LD.GRID_DISRUPTED, LD.gridLevel(state, g) + supply.strain[g]);
      var lbl = LD.gridLabel(next);
      world.push(chip("bad", "Public " + g + " " + lbl + (lbl === "disrupted" ? " (+" + LD.mods(state).disruptSurcharge + ", 1Q late)" : lbl === "strained" ? " (+" + LD.mods(state).strainSurcharge + ")" : "")));
    });
    if (supply.ease) Object.keys(supply.ease).forEach(function (g) { world.push(chip("good", "Public " + g + " eases")); });
    return { now: now, later: later, world: world };
  }

  function regionChips(state, dealId, choiceId) {
    var eff = LD.dealRegionEffect(state, dealId, choiceId);
    if (!eff) return [];
    var out = [];
    if (eff.claim) out.push(chip("own", "Claims " + eff.regionName));
    var r = state.world.regions[eff.regionId];
    if (eff.stress > 0) out.push(chip(r.owned || eff.claim ? "bad" : "meh", eff.regionName + " stress +" + eff.stress));
    if (eff.stress < 0) out.push(chip("good", eff.regionName + " stress " + eff.stress));
    return out;
  }

  function chipRows(c, mapChips) {
    var h = "";
    if (c.now.length) h += '<div class="fx-row"><span class="row-k">Now</span>' + c.now.join("") + "</div>";
    if (c.later.length) h += '<div class="fx-row"><span class="row-k">Later</span>' + c.later.join("") + "</div>";
    var w = (mapChips || []).concat(c.world);
    if (w.length) h += '<div class="fx-row"><span class="row-k">Map</span>' + w.join("") + "</div>";
    return h;
  }

  function renderDealDossier(state, dealId) {
    var d = LD.dealById(dealId);
    var kind = LD.dealKind(d);
    var rid = state.world.pins[dealId];
    var h = '<div class="dz deal-dz k-' + kind + '">';
    h += '<button class="dz-x" id="dz-close" aria-label="Close">✕</button>';
    h += '<div class="dz-head">';
    var art = LD.dealArtKey(dealId);
    if (art) h += '<img class="dz-art" src="' + esc(LD.assetUrl(art)) + '" alt="">';
    h += '<div class="dz-copy">';
    h += '<div class="dz-k"><span class="dz-kind">' + esc(d.kicker) + "</span>" +
      (rid ? '<span class="dz-reg">' + esc(LD.REGION_NAMES[rid]) + "</span>" : "") +
      (d.pack ? '<span class="dz-reg">' + esc((LD.PACKS.filter(function (p) { return p.id === d.pack; })[0] || {}).name || "") + "</span>" : "") + "</div>";
    h += "<h3>" + esc(d.title) + "</h3>";
    h += "</div></div>";
    h += '<p class="dz-body">' + esc(d.body) + "</p>";
    if (state.fy && state.fy.deck && LD.encounterFor) {
      var en = LD.encounterFor(state, dealId), EN = LD.ENCOUNTERS[en];
      if (EN) h += '<div class="dz-enc"><span class="ic" aria-hidden="true">' + LD.encArt(EN, en) + "</span><span>Signing brings <b>" + esc(EN.name) + "</b> to your door · win: " + esc(EN.win) + "</span></div>";
    }
    if (d.choices) {
      h += '<div class="dz-choices">';
      d.choices.forEach(function (c) {
        var rebate = LD.crisisRebate(state, d, c);
        var blocked = LD.choiceBlocked(state, d, c);
        var poor = c.cost && state.cash < c.cost - rebate;
        h += '<button class="dz-choice" data-deal="' + dealId + '" data-choice="' + c.id + '"' + (poor || blocked ? " disabled" : "") + ">";
        h += "<b>" + esc(c.label) + (blocked ? " · " + esc(blocked) : poor ? " · need " + money(c.cost - rebate) : "") + "</b>";
        if (rebate && !blocked) h += '<div class="fx-row">' + chip("good", "Regulator rebate +" + money(rebate)) + "</div>";
        h += chipRows(payloadChips(state, d, c), regionChips(state, dealId, c.id)) + "</button>";
      });
      h += "</div>";
      h += '<p class="fine">Ignore it and it spreads to a neighbouring region at quarter close.</p>';
    } else {
      h += chipRows(payloadChips(state, d, d), regionChips(state, dealId));
      var poor = d.cost && state.cash < d.cost;
      h += '<button class="btn-sign" id="btn-sign" data-deal="' + dealId + '"' + (poor ? " disabled" : "") + ">" + (poor ? "Need " + money(d.cost) : "Sign the deal") + "</button>";
      h += '<p class="fine">Fine print: ' + esc(d.hint) + "</p>";
    }
    h += "</div>";
    return h;
  }

  function stressPips(r) {
    var h = '<span class="pips s-' + LD.stressLabel(r.stress) + '">';
    for (var i = 1; i <= LD.STRESS_MAX; i++) h += '<i class="' + (i <= r.stress ? "on" : "") + '"></i>';
    return h + "</span>";
  }

  var MOOD = { calm: "Calm", tense: "Protests (+1 unrest/Q)", strike: "Riots (+3 unrest/Q, plants strike)", revolt: "Revolt" };

  function renderRegionDossier(state, rid) {
    var r = state.world.regions[rid];
    var lvl = LD.stressLabel(r.stress);
    var h = '<div class="dz region-dz' + (r.owned ? " owned" : "") + '">';
    h += '<button class="dz-x" id="dz-close" aria-label="Close">✕</button>';
    var status = r.owned ? (r.trait === "hq" ? "Headquarters" : "Your territory") : "Not yours yet";
    h += '<div class="dz-k">' + esc(status) + (r.trait === "boom" ? " · Booming" : r.trait === "crisis" ? " · In crisis" : "") + "</div>";
    h += "<h3>" + esc(LD.REGION_NAMES[rid]) + "</h3>";
    h += '<div class="dz-stat"><span>Mood</span>' + stressPips(r) + "<b>" + esc(MOOD[lvl]) + "</b></div>";
    if (LD.willRevolt(state, rid)) h += '<p class="dz-warn">⚠ Revolts at quarter close: you lose it and take unrest +' + LD.REVOLT_UNREST + ". Calm it now.</p>";
    if (LD.hazardVisible(state, rid)) h += '<div class="dz-stat"><span>Hazard</span><b>' + esc(LD.HAZARD_NAMES[r.hazard]) + "</b></div>";
    else h += '<div class="dz-stat"><span>Hazard</span><b>' + esc(LD.HAZARD_NAMES[r.hazard]) + " at collapse " + r.hazardAt + "</b></div>";
    if (r.owned && r.plant) {
      var pay = LD.plantIncome(state, rid);
      h += '<div class="dz-stat"><span>Plant</span><b>' + (r.stress >= LD.STRESS_STRIKE ? "On strike · $0M" : "+" + money(pay) + " / quarter") + " · collapse +" + LD.PLANT.collapsePerQuarter + "/Q · stress +" + LD.PLANT.stressPerQuarter + "/Q</b></div>";
    }
    /* Aim this quarter's Soothe deal at a hot region. */
    var soothe = state.phase === "deal" ? state.offered.filter(function (id) { return LD.dealKind(LD.dealById(id)) === "calm" && state.world.pins[id] !== rid; })[0] : null;
    if (soothe && r.owned && r.stress >= LD.STRESS_TENSE) {
      h += '<button class="dz-act" id="btn-aim" data-deal="' + soothe + '" data-region="' + rid + '"><b>Aim “' + esc(LD.dealById(soothe).title) + "” here</b>" +
        '<span class="fx-row">' + chip("good", "Stress −2 here instead") + chip("meh", "Free · then sign it") + "</span></button>";
    }
    if (!r.owned) {
      h += '<p class="dz-body">Win it with an <b>Acquire</b> deal (＋ pin). Owned land can host a plant.</p>';
    }
    if (r.owned) {
      var acted = state.world.actedTurn === state.turn;
      var err = LD.regionGuard(state, rid);
      h += '<p class="dz-note">One regional order per quarter' + (acted ? " · used" : " · available") + ". At 5 stress it revolts and you lose it.</p>";
      if (!r.plant) {
        var inc = LD.PLANT.income + (r.trait === "boom" ? LD.PLANT.boomBonus : 0);
        h += '<button class="dz-act" id="btn-build" data-region="' + rid + '"' + (LD.canBuildPlant(state, rid) ? "" : " disabled") + ">" +
          "<b>Build a desalination plant · " + money(LD.PLANT.cost) + "</b>" +
          '<span class="fx-row">' + chip("good", "+" + money(inc) + "/Q") + chip("bad", "Stress +1/Q") + chip("bad", "Collapse +1/Q") + "</span></button>";
      }
      h += '<button class="dz-act" id="btn-calm" data-region="' + rid + '"' + (LD.canCalmRegion(state, rid) ? "" : " disabled") + ">" +
        "<b>Charm offensive · " + money(LD.PR_PUSH.cost) + "</b>" +
        '<span class="fx-row">' + chip("good", "Stress −" + LD.PR_PUSH.calm) + "</span></button>";
      if (err && !acted && err.indexOf("own") === -1) h += '<p class="dz-note">' + esc(err) + "</p>";
    }
    h += "</div>";
    return h;
  }

  var NET_FEEDS = { air: "Air", water: "Water", power: "Power", food: "Food" };
  function renderNetDossier(state, id) {
    var lvl = LD.gridLevel(state, id);
    var gl = LD.gridLabel(lvl);
    var m = LD.mods(state);
    var h = '<div class="dz net-dz">';
    h += '<button class="dz-x" id="dz-close" aria-label="Close">✕</button>';
    h += '<div class="dz-k">Public network</div><h3>' + SYS_ICON[id] + " " + esc(NET_FEEDS[id]) + " · " + esc(gl) + "</h3>";
    h += '<p class="dz-body">Your bunker still buys ' + esc(id) + " parts from the public network. Squeeze deals tagged " + esc(id) + " strain it at quarter close; Soothe deals ease it.</p>";
    h += '<div class="dz-stat"><span>Install surcharge</span><b>' + (state.converting ? "none (private supply)" : lvl >= 2 ? "+" + money(m.disruptSurcharge) + " and 1Q late" : lvl >= 1 ? "+" + money(m.strainSurcharge) : "none") + "</b></div>";
    var queued = LD.pendingStrainLines(state).filter(function (l) { return l.id === id; });
    if (queued.length) h += '<div class="dz-stat"><span>Queued</span><b>' + queued.map(function (l) { return "+" + l.amount + " at Q" + l.due; }).join(", ") + "</b></div>";
    h += "</div>";
    return h;
  }

  function renderExecDossier(state) {
    var exec = LD.execById(state.executiveId);
    var initials = exec.name.replace(/^Dr\. /, "").split(" ").map(function (p) { return p[0]; }).join("");
    var h = '<div class="dz exec-dz">';
    h += '<div class="dz-k">Executive dossier</div>';
    h += '<div class="exec-id"><div class="avatar" aria-hidden="true">' + esc(initials) + '</div><div><h3>' + esc(exec.name) + "</h3>" +
      '<div class="exec-t">' + esc(exec.title) + "<br>" + esc(exec.firm) + "</div></div></div>";
    h += '<div class="target"><span>◎</span><b>Goal</b> All 4 bunker systems at Lv 2+, then seal (from Q' + LD.MIN_EVAC_TURN + ").</div>";
    if (LD.fyDossier) h += LD.fyDossier(state);
    var md = LD.mandateById(state.mandate);
    if (md) h += '<div class="target mandate"><span>◈</span><b>Board mandate</b> ' + esc(md.text) + " · +" + LD.MANDATE_BONUS + " ◈ on a win</div>";
    h += '<div class="dz-stat"><span>Credit rating</span><b>' + esc(LD.ratingName(state.rating)) + " · exit ×" + LD.ratingMultiplier(state.rating).toFixed(1) + " ◈</b></div>";
    if (state.perks && state.perks.length) {
      var slots = LD.perkSlots({ owned: ["slot:2"] }, state.rating);
      h += '<div class="dz-stat"><span>Perquisites</span><b>' + state.perks.slice(0, slots).map(function (id) { return (LD.perkById(id) || {}).name; }).join(", ") + "</b></div>";
    }
    h += '<p class="quote">“' + esc(exec.blurb) + "”</p>";
    h += '<div class="dz-stat"><span>Seed</span><b>' + esc(String(state.seedLabel)) + "</b></div>";
    h += "</div>";
    return h;
  }

  function renderDossier(state, ui) {
    if (ui.hidePins) return renderExecDossier(state);
    if (ui.selDeal && state.phase === "deal" && state.offered.indexOf(ui.selDeal) !== -1) return renderDealDossier(state, ui.selDeal);
    if (ui.selRegion) return renderRegionDossier(state, ui.selRegion);
    if (ui.selNet) return renderNetDossier(state, ui.selNet);
    return renderExecDossier(state);
  }

  /* Short hover / long-press card for a region. */
  function regionTip(state, id) {
    var r = state.world.regions[id];
    var h = "<b>" + esc(LD.REGION_NAMES[id]) + "</b><span>" + esc(r.owned ? (r.trait === "hq" ? "Your HQ" : "Yours") : "Unclaimed") + (r.trait === "boom" ? " · Booming" : "") + "</span>";
    h += '<span class="tip-pips">' + stressPips(r) + " " + esc(MOOD[LD.stressLabel(r.stress)].split(" (")[0]) + "</span>";
    if (r.owned && r.plant) h += "<span>Plant " + (r.stress >= LD.STRESS_STRIKE ? "on strike" : "+" + money(LD.plantIncome(state, id)) + "/Q") + " · collapse +1/Q</span>";
    if (LD.willRevolt(state, id)) h += '<span class="tip-warn">Revolts next quarter</span>';
    if (r.owned) h += "<span>Tap for regional order (" + (state.world.actedTurn === state.turn ? "used" : "available") + ")</span>";
    return h;
  }

  function reportIcon(f) {
    if (f.fy === "boss") return (LD.BOSSES[f.boss] || {}).icon || "⚑";
    if (f.fy === "liability") return "⚠";
    if (f.fy) return "💼";
    var w = f.world;
    if (!w) return "✉";
    return { income: "$", strike: "✊", riot: "🔥", protest: "✊", revolt: "⚑", brine: "≈", spread: "!" }[w.kind] || "•";
  }

  function renderReport(prev, next, fired, tick) {
    var h = '<div class="report"><div class="dz-k">Quarterly report</div><h3>Q' + prev.turn + " closes</h3>";
    h += '<div class="rep-deltas">';
    [["Cash", prev.cash, next.cash, true], ["Unrest", prev.unrest, next.unrest, false], ["Collapse", prev.collapse, next.collapse, false]].forEach(function (x) {
      var d = x[2] - x[1];
      var good = x[3] ? d >= 0 : d <= 0;
      h += '<div class="rd ' + (d === 0 ? "flat" : good ? "good" : "bad") + '"><span>' + x[0] + "</span><b>" + (x[3] ? money(x[2]) : x[2]) + "</b><em>" + (d === 0 ? "±0" : signed(d)) + "</em></div>";
    });
    h += "</div><ul class=\"rep-list\">";
    (fired || []).slice(0, 10).forEach(function (f) {
      h += "<li" + (f.fy === "boss" ? ' class="rep-boss"' : "") + (f.world && f.world.regionId ? ' data-region="' + f.world.regionId + '"' : "") + "><i>" + reportIcon(f) + "</i>" + esc(f.text) + "</li>";
    });
    if (tick) h += "<li><i>↗</i>Collapse drifts +" + tick + (prev.turn >= LD.mods(next).lateAccelTurn ? " (the curve steepens)" : "") + ".</li>";
    h += "</ul></div>";
    return h;
  }

  LD.renderMap = renderMap;
  LD.renderMapPreview = renderMapPreview;
  LD.renderRail = renderRail;
  LD.regionTip = regionTip;
  LD.renderDesk = renderDesk;
  LD.renderReport = renderReport;
  LD.renderDossier = renderDossier;
  LD.payloadChips = payloadChips;
  LD.deskAnchor = anchor;
  LD.deskAt = at;
  LD.formatMoney = money;

  if (typeof module !== "undefined" && module.exports) module.exports = LD;
})(typeof globalThis !== "undefined" ? globalThis : this);

  