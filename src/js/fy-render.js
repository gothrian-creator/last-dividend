
/* Last Dividend — Fiscal Year renderers: draft, Portfolio, boss cards, act chips. Pure string builders. Browser + Node. */
(function (root) {
  var LD = root.LD || (root.LD = {});
  function esc(s) { return LD.escapeHtml(s); }
  function money(n) { return (n < 0 ? "−$" : "$") + Math.abs(n) + "M"; }
  var RCLS = { C: "r-c", U: "r-u", R: "r-r", L: "r-l" };

  function setLine(state, arch, plus) {
    var a = LD.ARCHETYPES[arch];
    if (!a || !a.set) return "";
    var n = LD.fyArchCount(state, arch) + (plus || 0);
    return n >= a.set ? "✓ " + a.setName + ": " + a.setText : a.name + " " + Math.min(n, a.set) + "/" + a.set + " → " + a.setName;
  }

  function card(state, id, sel, rider, idx) {
    var c = LD.assetById(id);
    var h = '<button class="fy-card ' + RCLS[c.r] + (sel ? " sel" : "") + '" data-asset="' + id + '" aria-pressed="' + (sel ? "true" : "false") + '" style="--i:' + (idx | 0) + '">';
    h += '<span class="fy-ico" aria-hidden="true">' + c.icon + '</span><span class="fy-txt"><b>' + esc(c.name) + "</b>";
    h += '<em><i class="fy-gem" aria-hidden="true"></i>' + esc(LD.RARITY[c.r].name) + " · " + esc(LD.ARCHETYPES[c.arch].name) + "</em>";
    h += '<span class="fy-eff">' + esc(c.text) + "</span>";
    var sl = setLine(state, c.arch, 1);
    if (sl) h += '<span class="fy-set">' + esc(sl) + "</span>";
    h += "</span>";
    if (rider) h += '<span class="fy-stamp" aria-label="Liability rider">Rider</span>';
    return h + "</button>";
  }

  function renderDraft(state, ui) {
    ui = ui || {};
    var f = state.fy, d = f.draft;
    var used = LD.fySlotsUsed(state), full = used >= f.cap;
    var selC = ui.sel ? LD.assetById(ui.sel) : null;
    var h = '<div class="fy-draft' + (ui.replacing ? " replacing" : "") + (ui.reveal ? " reveal" : "") + '" role="dialog" aria-label="Quarterly Acquisitions">';
    h += '<div class="fy-head"><div class="dz-k">Q' + d.closed + " closed · Quarterly Acquisitions</div>";
    h += "<h2>" + (d.rare ? "Boss beaten: a rare draft" : "Choose one Asset") + "</h2>";
    h += '<div class="fy-chips"><button class="fx-chip own fy-pf" id="fy-pf">💼 Portfolio ' + used + "/" + f.cap + '</button><span class="fx-chip good">Cash ' + money(state.cash) + "</span>";
    if (d.rider) h += '<button class="fx-chip bad fy-explain" data-explain="liabilities">⚠ Rider: picking adds a random Liability ⓘ</button>';
    else h += '<span class="fx-chip meh">Free pick · skip pays $' + f.skipCash + "M</span>";
    h += "</div></div>";
    if (ui.replacing && selC) {
      h += '<div class="fy-replace"><p class="fy-rq">Portfolio full. Divest one to make room for <b>' + esc(selC.name) + "</b> (+$" + LD.FY.DIVEST_CASH + "M).</p><div class=\"fy-minis\">";
      f.hand.forEach(function (hd) {
        var c = LD.assetById(hd.id);
        if (!c || c.liability) return;
        h += '<button class="fy-mini ' + RCLS[c.r] + '" data-replace="' + hd.id + '"><span aria-hidden="true">' + c.icon + "</span><b>" + esc(c.name) + "</b><em>" + esc(c.text) + "</em></button>";
      });
      h += "</div></div>";
      h += '<div class="fy-foot"><button class="btn btn-ghost" id="fy-back">Back</button></div>';
    } else {
      h += '<div class="fy-cards" style="--n:' + Math.max(3, d.offer.length) + '">';
      d.offer.forEach(function (id, i) { h += card(state, id, ui.sel === id, d.rider, i); });
      if (!d.offer.length) h += '<p class="muted">Nothing left to buy. The market is yours.</p>';
      h += "</div>";
      h += '<div class="fy-foot"><button class="btn btn-ghost" id="fy-skip">Skip · +$' + f.skipCash + "M</button>";
      if (f.rerolls > 0) h += '<button class="btn" id="fy-reroll">↻ Reroll (' + f.rerolls + ")</button>";
      h += '<button class="btn btn-coral" id="fy-take"' + (selC ? "" : " disabled") + ">" + (selC ? (full ? "Acquire · divest one ▸" : "Acquire " + esc(selC.name) + " ▸") : "Tap an Asset") + "</button></div>";
    }
    return h + "</div>";
  }

  function itemTile(it, cls, attrs, inner) {
    return '<button class="bc-tile ' + cls + '" ' + attrs + '><span class="bc-ico" aria-hidden="true">' + it.icon + '</span><span class="bc-nm">' + esc(it.name) + "</span>" + (inner || "") + "</button>";
  }
  /* The briefcase (Portfolio Assets + Liabilities) and the desk drawer (office items). ui.sel = selected id. */
  function renderPortfolio(state, ui) {
    ui = ui || {};
    var f = state.fy;
    var assets = f.hand.filter(function (hd) { var c = LD.assetById(hd.id); return c && !c.liability; });
    var liab = f.hand.filter(function (hd) { var c = LD.assetById(hd.id); return c && c.liability; });
    var sel = ui.sel || (assets[0] && assets[0].id) || ((f.drawer || [])[0] && f.drawer[0].id) || null;
    var h = '<div class="fy-pfsheet bcase"><div class="fy-head"><div class="dz-k">Wall · ' + LD.fySlotsUsed(state) + "/" + f.cap + " · Briefcase " + (f.drawer || []).length + "/" + (f.dcap || 3) + "</div><h2>Trophy wall &amp; briefcase</h2></div>";
    var fc = LD.fyForecast(state);
    h += '<p class="fy-fc"><b>At quarter close:</b> ' + (fc.items.length ? fc.items.map(function (it) { return it.icon + " " + esc(it.text); }).join(" · ") : "nothing automatic.") + "</p>";
    h += '<div class="bc-grid" style="--n:' + f.cap + '">';
    for (var i = 0; i < f.cap; i++) {
      var hd = assets[i];
      if (!hd) { h += '<div class="bc-tile empty" aria-label="Empty slot"><span class="bc-ico">＋</span><span class="bc-nm">Empty</span></div>'; continue; }
      var c = LD.assetById(hd.id);
      h += itemTile(c, RCLS[c.r] + (sel === c.id ? " sel" : ""), 'data-bsel="' + c.id + '" aria-pressed="' + (sel === c.id) + '"');
    }
    h += "</div>";
    if (liab.length) h += '<div class="bc-liabs">' + liab.map(function (hd) { var c = LD.assetById(hd.id); return '<button class="bc-liab' + (sel === c.id ? " sel" : "") + '" data-bsel="' + c.id + '">' + c.icon + " " + esc(c.name) + "</button>"; }).join("") + "</div>";
    var sets = [];
    Object.keys(LD.ARCHETYPES).forEach(function (k) {
      var A = LD.ARCHETYPES[k], n = LD.fyArchCount(state, k); if (!A.set || !n) return;
      var on = n >= A.set;
      sets.push('<span class="bc-set' + (on ? " on" : "") + '" title="' + esc(A.setText) + '">' + (on ? "★ " : "") + esc(A.setName) + " " + Math.min(n, A.set) + "/" + A.set + (on ? " · " + esc(A.setText) : "") + "</span>");
    });

    h += '<div class="dz-k bc-dk">Briefcase · items</div><div class="bc-drawer" style="--n:' + (f.dcap || 3) + '">';
    for (var j = 0; j < (f.dcap || 3); j++) {
      var d = (f.drawer || [])[j];
      if (!d) { h += '<div class="bc-tile empty drawer"><span class="bc-ico">＋</span><span class="bc-nm">Empty</span></div>'; continue; }
      var it = LD.itemById(d.id), why = LD.itemBlock(state, d.id);
      var status = it.office ? '<span class="bc-st on">Always on</span>' : !LD.itemReady(state, d) ? '<span class="bc-st used">' + (it.per === "act" ? "Used this act" : "Used") + "</span>" : '<span class="bc-st ready">' + (it.per === "act" ? "Once per act" : "Once per run") + "</span>";
      h += '<div class="bc-dslot ' + RCLS[it.r] + (sel === it.id ? " sel" : "") + '">' + itemTile(it, "drawer", 'data-bsel="' + it.id + '"', status) +
        (it.office ? "" : '<button class="btn bc-use' + (why ? "" : " btn-coral") + '" data-use="' + it.id + '"' + (why ? ' aria-disabled="true"' : "") + ">" + (why ? "Use" : "Use ▸") + "</button>") + "</div>";
    }
    h += "</div>";
    /* Detail line for the selected tile */
    var dc = sel && (LD.assetById(sel) || LD.itemById(sel));
    if (dc) {
      var isItem = !!LD.itemById(sel) && !LD.assetById(sel);
      var w2 = isItem ? LD.itemBlock(state, sel) : null;
      var kind = isItem ? (dc.office ? "Office fixture" : dc.per === "act" ? "Active · once per act" : "Active · once per run") : dc.liability ? "Liability" : LD.RARITY[dc.r].name + " · " + LD.ARCHETYPES[dc.arch].name;
      h += '<p class="bc-detail"><b>' + dc.icon + " " + esc(dc.name) + "</b> <em>" + esc(kind) + "</em> " + esc(dc.text) + (isItem && w2 && !dc.office ? ' <span class="bc-why">' + esc(w2) + "</span>" : "") + "</p>";
    } else h += '<p class="bc-detail">Tap an Asset or item for details. Assets come from bosses, the Hearing, act openings and calls. Loot rides on fight rewards.</p>';
    return h + "</div>";
  }

  /* Loot reveal */
  LD.renderLoot = function (state, ui) {
    ui = ui || {};
    var f = state.fy, L = f.loot; if (!L) return "";
    var it = LD.itemById(L.id), full = f.drawer.length >= f.dcap;
    var src = { boss: "Boss beaten", memo: "A board memo sweetener", deal: "A deal perk" }[L.src] || "Loot";
    var h = '<div class="loot ' + RCLS[it.r] + (ui.reveal ? " reveal" : "") + '"><div class="dz-k">Loot · ' + esc(src) + "</div>";
    h += '<div class="loot-card"><div class="loot-rays" aria-hidden="true"></div><div class="loot-ico" aria-hidden="true">' + it.icon + "</div><b>" + esc(it.name) + '</b><em>' + esc(LD.RARITY[it.r].name) + " · " + (it.office ? "Office fixture" : it.per === "act" ? "Once per act" : "Once per run") + "</em><p>" + esc(it.text) + "</p></div>";
    if (full) {
      h += '<p class="fy-rq">Drawer full (' + f.drawer.length + "/" + f.dcap + "). Swap one out (sold for cash), or sell the new item.</p><div class=\"loot-swap\">";
      f.drawer.forEach(function (d) { var o = LD.itemById(d.id); h += '<button class="bc-tile ' + RCLS[o.r] + '" data-swap="' + o.id + '"><span class="bc-ico">' + o.icon + '</span><span class="bc-nm">Swap ' + esc(o.name) + " · +$" + LD.ITEM_SELL[o.r] + "M</span></button>"; });
      h += "</div>";
    }
    return h + "</div>";
  };

  /* Office explain sheet: what the room is telling you */
  LD.officeExplain = function (state) {
    var stage = LD.cityStage(state), door = LD.doorLevel(state), m = LD.mods(state), mood = LD.execMood(state);
    var h = '<div class="fy-pfsheet ex-sheet"><div class="fy-head"><div class="dz-k">Your office</div><h2>Reading the room</h2></div><ul class="fy-list ex-list">';
    h += '<li><span class="fy-ico">$</span><div><b>Cash ' + money(state.cash) + "</b><span>The desk ticker. Pays for bunker works, crisis pay-offs, bosses and some items.</span></div></li>";
    h += '<li><span class="fy-ico">✊</span><div><b>Unrest ' + state.unrest + " · " + esc(LD.doorQuiet(state) ? (LD.has(state, "soundproof") ? "Soundproofed" : "Quiet this quarter") : LD.DOOR_NAMES[door]) + "</b><span>The door. Knocks at 20, pounding at 40, the mob at 60. Crises likely from 48, unpayable from " + m.crisisNoPayAt + ", removed at " + LD.MAX_UNREST + ".</span></div></li>";
    h += '<li><span class="fy-ico">☢</span><div><b>Collapse ' + state.collapse + " · " + esc(LD.CITY_NAMES[stage]) + "</b><span>The window. Rises about +" + LD.collapseTickAmountPreview(state) + " a quarter; breach in ~" + LD.forecastQuarters(state) + "Q. Squeeze deals darken the mainland, Soothe deals relight it. From Smog alerts on, the mainland adds unrest each quarter (now +" + Math.max(0, stage - 1) + ").</span></div></li>";
    h += '<li><span class="fy-ico">🙂</span><div><b>Your executive: ' + ({ confident: "confident", nervous: "nervous", panic: "panicking" })[mood] + "</b><span>Nervous from unrest 35 or collapse 55; panicking from unrest 60 or collapse 78.</span></div></li>";
    return h + "</ul></div>";
  };

  /* Asset Prospectus: everything you have seen and found, across runs */
  LD.renderProspectus = function (meta, ui) {
    ui = ui || {};
    var cx = (meta && meta.codex) || { seen: {}, found: {} };
    var tab = ui.tab || "assets";
    var curses = LD.CARDS.filter(function (c) { return c.t === "Curse"; }).map(function (c) { return { id: c.id, icon: c.icon, name: c.name, text: LD.curseText(c.id) }; });
    var list = tab === "items" ? LD.ITEMS : tab === "liabs" ? curses : LD.FY_ASSETS;
    if (tab === "liabs") { cx = { seen: {}, found: {} }; curses.forEach(function (c) { cx.seen[c.id] = 1; }); }
    var found = list.filter(function (x) { return cx.found[x.id]; }).length, seen = list.filter(function (x) { return cx.seen[x.id] || cx.found[x.id]; }).length;
    var h = '<div class="fy-pfsheet prosp"><div class="fy-head"><div class="dz-k">Asset Prospectus · kept across runs</div><h2>The collection</h2></div>';
    h += '<div class="pr-tabs" role="tablist">' + [["assets", "Assets " + LD.FY_ASSETS.length], ["items", "Office items " + LD.ITEMS.length], ["liabs", "Curses 6"]].map(function (t) { return '<button class="lens-btn' + (tab === t[0] ? " on" : "") + '" role="tab" aria-selected="' + (tab === t[0]) + '" data-ptab="' + t[0] + '">' + t[1] + "</button>"; }).join("") + "</div>";
    h += '<p class="pr-count">Found <b>' + found + "</b> · seen <b>" + seen + "</b> of " + list.length + "</p>";
    h += '<div class="pr-grid">';
    list.forEach(function (x) {
      var st = cx.found[x.id] ? "found" : cx.seen[x.id] ? "seen" : "unseen";
      h += '<button class="pr-cell ' + st + " " + (x.r ? RCLS[x.r] : "liab") + (ui.sel === x.id ? " sel" : "") + '" data-psel="' + x.id + '" aria-label="' + esc(st === "unseen" ? "Unknown" : x.name) + '">' + (st === "unseen" ? "?" : x.icon) + "</button>";
    });
    h += "</div>";
    var dx = ui.sel && (LD.assetById(ui.sel) || LD.itemById(ui.sel) || curses.filter(function (c) { return c.id === ui.sel; })[0]);
    var dst = dx ? (cx.found[dx.id] ? "found" : cx.seen[dx.id] ? "seen" : "unseen") : null;
    h += '<p class="bc-detail">' + (dx ? (dst === "unseen" ? "<b>? Unknown</b> Not seen yet. Keep winning fights, beating bosses and answering calls." : "<b>" + dx.icon + " " + esc(dx.name) + "</b> <em>" + (dst === "found" ? "Found" : "Seen") + (dx.r ? " · " + esc(LD.RARITY[dx.r].name) : "") + "</em> " + esc(dx.text)) : "Tap a cell for details. Glowing cells are ones you have held.") + "</p>";
    return h + "</div>";
  };

  function fcText(fc) {
    var b = [];
    if (fc.cash) b.push((fc.cash > 0 ? "+$" : "−$") + Math.abs(fc.cash) + "M");
    if (fc.unrest) b.push((fc.unrest > 0 ? "+" : "−") + Math.abs(fc.unrest) + " unrest");
    if (fc.collapse) b.push((fc.collapse > 0 ? "+" : "−") + Math.abs(fc.collapse) + " collapse");
    return b.join(" · ");
  }
  function portfolioChip(state) {
    var f = state.fy; if (!f) return "";
    var icons = f.hand.map(function (hd) { var c = LD.assetById(hd.id); return c ? '<i class="' + (c.liability ? "liab" : "") + '">' + c.icon + "</i>" : ""; }).join("");
    var fc = LD.fyForecast(state), ft = fcText(fc);
    var rd = (f.drawer || []).filter(function (d) { return LD.itemReady(state, d); }).length;
    return '<button class="pf-chip" id="btn-portfolio" aria-label="Briefcase, ' + LD.fySlotsUsed(state) + " of " + f.cap + " slots" + (rd ? ", " + rd + " drawer item" + (rd > 1 ? "s" : "") + " ready" : "") + (ft ? ". At quarter close: " + ft : "") + '">💼 ' + LD.fySlotsUsed(state) + "/" + f.cap + (rd ? '<span class="pf-act">⚡' + rd + "</span>" : "") +
      (ft ? '<span class="pf-fc ' + (fc.cash - fc.unrest - 2 * fc.collapse >= 0 ? "up" : "down") + '" title="At quarter close: ' + esc(ft) + '">▸ ' + esc(ft.split(" · ")[0]) + (ft.indexOf(" · ") > 0 ? " +" : "") + "</span>" : '<span class="pf-icons">' + icons + "</span>") + "</button>";
  }
  LD.fyForecastText = function (state) { return fcText(LD.fyForecast(state)); };

  /* ---------- The office: executive, door (unrest), window on the mainland (collapse), desk (cash) ----------
     Layered markup with data-art slots so painted art can replace each layer later. */
  var EXEC_LOOK = {
    mara: { skin: "#e8b48f", hair: "#3a2416", suit: "#0f5a4c", style: "bob" },
    reid: { skin: "#f0c7a2", hair: "#c9a25a", suit: "#1d2f4a", style: "short" },
    imani: { skin: "#8a5a3c", hair: "#1b120c", suit: "#5a1f3a", style: "puff" },
    julian: { skin: "#f2cfb0", hair: "#6b4a2b", suit: "#2a2a2a", style: "side" },
    soren: { skin: "#f5d6bd", hair: "#e9e2cf", suit: "#24414f", style: "short" },
    cassius: { skin: "#b07a52", hair: "#2a1d14", suit: "#3b2f12", style: "bald" }
  };
  function hairSvg(look) {
    var c = look.hair;
    if (look.style === "bob") return '<path d="M30 40 Q30 18 50 17 Q70 18 70 40 L70 52 Q66 44 64 34 Q50 30 36 34 Q34 44 30 52Z" fill="' + c + '"/>';
    if (look.style === "puff") return '<circle cx="50" cy="24" r="17" fill="' + c + '"/><circle cx="35" cy="31" r="9" fill="' + c + '"/><circle cx="65" cy="31" r="9" fill="' + c + '"/>';
    if (look.style === "side") return '<path d="M32 36 Q34 18 52 18 Q68 19 69 34 Q58 26 44 30 Q38 31 32 36Z" fill="' + c + '"/>';
    if (look.style === "bald") return '<path d="M33 34 Q36 22 50 21 Q64 22 67 34 Q60 28 50 28 Q40 28 33 34Z" fill="' + c + '" opacity="0.55"/>';
    return '<path d="M33 35 Q34 19 50 19 Q66 19 67 35 Q60 27 50 27 Q40 27 33 35Z" fill="' + c + '"/>';
  }
  function execSvg(state) {
    var look = EXEC_LOOK[state.executiveId] || EXEC_LOOK.mara;
    var h = '<svg class="of-fig" viewBox="0 0 100 100" aria-hidden="true">';
    h += '<rect class="of-chair" x="22" y="34" width="56" height="66" rx="14"/>';
    h += '<path d="M24 100 Q24 66 50 64 Q76 66 76 100Z" fill="' + look.suit + '"/>';
    h += '<path d="M44 66 L50 80 L56 66Z" fill="#f4efe2"/><path d="M48.5 68 L50 84 L51.5 68Z" fill="#b8323a"/>';
    h += '<rect x="45" y="54" width="10" height="12" fill="' + look.skin + '"/>';
    h += '<ellipse cx="50" cy="40" rx="17" ry="19" fill="' + look.skin + '"/>';
    h += hairSvg(look);
    /* faces: one group per mood/reaction, CSS shows the right one */
    h += '<g class="fc fc-confident"><path d="M40 37 Q43 35 46 37 M54 37 Q57 35 60 37" stroke="#2a1a10" stroke-width="1.6" fill="none"/><circle cx="43" cy="41" r="1.7" fill="#1a110a"/><circle cx="57" cy="41" r="1.7" fill="#1a110a"/><path d="M42 49 Q50 55 58 49" stroke="#7a2a20" stroke-width="2" fill="none" stroke-linecap="round"/></g>';
    h += '<g class="fc fc-nervous"><path d="M40 35 L46 37 M60 35 L54 37" stroke="#2a1a10" stroke-width="1.6"/><circle cx="43" cy="41" r="1.7" fill="#1a110a"/><circle cx="57" cy="41" r="1.7" fill="#1a110a"/><path d="M43 51 Q46 49 50 51 Q54 53 57 51" stroke="#7a2a20" stroke-width="1.8" fill="none"/><path class="sweat" d="M66 32 Q68 37 66 39 Q64 37 66 32Z" fill="#9fe0ff"/></g>';
    h += '<g class="fc fc-panic"><path d="M39 36 L46 33 M61 36 L54 33" stroke="#2a1a10" stroke-width="1.8"/><circle cx="43" cy="41" r="2.6" fill="#fff" stroke="#1a110a" stroke-width="1"/><circle cx="57" cy="41" r="2.6" fill="#fff" stroke="#1a110a" stroke-width="1"/><circle cx="43" cy="41" r="1" fill="#1a110a"/><circle cx="57" cy="41" r="1" fill="#1a110a"/><ellipse cx="50" cy="51" rx="4" ry="5" fill="#4a1410"/><path class="sweat" d="M67 30 Q69 36 67 38 Q65 36 67 30Z M32 33 Q34 38 32 40 Q30 38 32 33Z" fill="#9fe0ff"/></g>';
    h += '<g class="fc fc-glee"><path d="M40 36 Q43 33 46 36 M54 36 Q57 33 60 36" stroke="#2a1a10" stroke-width="1.6" fill="none"/><path d="M40 41 Q43 38 46 41 M54 41 Q57 38 60 41" stroke="#1a110a" stroke-width="1.8" fill="none"/><path d="M41 48 Q50 58 59 48Z" fill="#5a1a14"/><text x="74" y="30" font-size="13" fill="#f3d98f">$</text></g>';
    h += '<g class="fc fc-shock"><path d="M39 34 Q43 31 46 34 M54 34 Q57 31 61 34" stroke="#2a1a10" stroke-width="1.6" fill="none"/><circle cx="43" cy="41" r="2.4" fill="#fff" stroke="#1a110a"/><circle cx="57" cy="41" r="2.4" fill="#fff" stroke="#1a110a"/><circle cx="43" cy="41" r="1" fill="#1a110a"/><circle cx="57" cy="41" r="1" fill="#1a110a"/><rect x="46" y="48" width="8" height="6" rx="3" fill="#4a1410"/></g>';
    return h + "</svg>";
  }
  function citySvg(stage, decay, holo, era) {
    var st = holo ? 0 : stage, dv = holo ? 0 : decay;
    var h = '<svg class="of-city" viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true">';
    h += '<rect class="sky" x="0" y="0" width="200" height="110"/>';
    h += '<circle class="sun" cx="160" cy="' + (22 + st * 4) + '" r="9"/>';
    var B = [[4, 48, 12], [17, 40, 9], [27, 54, 14], [42, 34, 8], [51, 46, 12], [64, 28, 10], [75, 44, 13], [89, 36, 9], [99, 52, 12], [112, 30, 11], [124, 42, 9], [134, 50, 13], [148, 38, 10], [159, 47, 12], [172, 33, 9], [182, 45, 14]];
    var darkN = Math.round(Math.max(0, Math.min(1, (dv - 12) / 80)) * B.length);
    var order = [5, 11, 2, 14, 8, 0, 12, 3, 9, 15, 6, 1, 13, 4, 10, 7];
    var dark = {}; for (var i = 0; i < darkN; i++) dark[order[i]] = 1;
    h += '<g class="skyline">';
    B.forEach(function (b, i) {
      var x = b[0], top = 80 - b[1], w = b[2];
      h += '<g class="bd' + (dark[i] ? " dark" : "") + '"><rect x="' + x + '" y="' + top + '" width="' + w + '" height="' + b[1] + '"/>';
      for (var yy = top + 4; yy < 76; yy += 6) for (var xx = x + 2; xx < x + w - 2; xx += 4) if ((xx * 7 + yy * 3 + i) % 5 !== 0) h += '<rect class="win" x="' + xx + '" y="' + yy + '" width="1.6" height="2.4"/>';
      h += "</g>";
    });
    h += "</g>";
    var fires = [0, 0, 1, 3, 5][st] + (st >= 2 && dv > 70 ? 1 : 0);
    var fx = [66, 136, 30, 101, 175, 53];
    for (var k = 0; k < Math.min(fires, fx.length); k++) h += '<g class="fire" style="--k:' + k + '"><path d="M' + fx[k] + ' 62 q3 -9 6 0 q-1 5 -3 6 q-2 -1 -3 -6Z"/><ellipse class="plume" cx="' + (fx[k] + 4) + '" cy="44" rx="10" ry="7"/></g>';
    /* Era props in the window: 1978 smokestacks and a strike banner; 2008 cranes and a jumbotron; now a sea wall and drones. */
    if (era === 1) h += '<g class="era-props e1"><rect class="stack" x="56" y="22" width="5" height="58"/><rect class="stack" x="66" y="30" width="4" height="50"/><rect class="stack" x="140" y="26" width="5" height="54"/>' +
      '<ellipse class="smoke" cx="60" cy="16" rx="9" ry="5"/><ellipse class="smoke" cx="70" cy="10" rx="12" ry="6"/><ellipse class="smoke" cx="146" cy="19" rx="10" ry="5"/>' +
      '<rect class="banner" x="96" y="58" width="30" height="8"/><text class="banner-t" x="111" y="64" text-anchor="middle">ON STRIKE</text></g>';
    if (era === 2) h += '<g class="era-props e2"><path class="crane" d="M36 80 V20 M30 22 H70 M66 22 V40 M36 20 L44 28" /><path class="crane" d="M150 80 V28 M146 30 H182 M178 30 V46"/>' +
      '<rect class="jumbo" x="104" y="40" width="26" height="14"/><text class="jumbo-t" x="117" y="49" text-anchor="middle">▼ 777</text>' +
      '<rect class="sign" x="82" y="70" width="14" height="6"/><text class="sign-t" x="89" y="74.6" text-anchor="middle">FORECLOSED</text></g>';
    if (era === 3) h += '<g class="era-props e3"><rect class="wall" x="0" y="76" width="200" height="5"/><path class="drone" d="M40 18 h8 M44 18 v2 M120 12 h8 M124 12 v2 M84 26 h6 M87 26 v2"/></g>';
    h += '<rect class="smog" x="0" y="0" width="200" height="82"/>';
    h += '<rect class="sea" x="0" y="80" width="200" height="30"/>';
    h += '<path class="flood" d="M0 80 Q25 76 50 80 T100 80 T150 80 T200 80 V84 H0Z"/>';
    h += '<path class="glint" d="M20 92 h18 M70 98 h24 M130 90 h16 M160 101 h22"/>';
    h += '<path class="isle" d="M0 110 V100 Q30 94 62 104 L70 110Z"/><path class="palm" d="M18 100 Q19 90 21 84 M21 84 q-8 -1 -12 3 M21 84 q7 -3 12 1 M21 84 q-3 -6 -8 -7 M21 84 q4 -6 9 -6"/>';
    if (holo) h += '<rect class="scan" x="0" y="0" width="200" height="110"/>';
    return h + "</svg>";
  }
  function doorSvg(lv, quiet, padded) {
    var h = '<svg class="of-doorsvg" viewBox="0 0 60 100" aria-hidden="true">';
    h += '<rect class="dframe" x="4" y="4" width="52" height="96" rx="3"/>';
    h += '<g class="dleaf"><rect class="dpanel" x="9" y="9" width="42" height="88" rx="2"/>';
    if (padded) { for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) h += '<circle class="stud" cx="' + (16 + c * 14) + '" cy="' + (20 + r * 20) + '" r="1.6"/>'; }
    h += '<rect class="glass" x="16" y="15" width="28" height="30" rx="2"/>';
    h += '<g class="sign"><rect x="21" y="18" width="18" height="11"/><rect x="29" y="29" width="2" height="16"/></g>';
    h += '<g class="heads"><circle cx="22" cy="40" r="5"/><circle cx="36" cy="38" r="6"/></g>';
    h += '<circle class="knob" cx="44" cy="58" r="2.6"/><rect class="plate" x="22" y="56" width="16" height="5" rx="1"/></g>';
    h += '<rect class="gap" x="9" y="96" width="42" height="3"/>';
    h += '<g class="feet"><rect x="16" y="96" width="7" height="3"/><rect x="34" y="96" width="8" height="3"/></g>';
    h += "</svg>";
    return h;
  }
  function ogauge(cls, icon, label, num, isMoney, sub, title) {
    var pct = isMoney ? Math.max(0, Math.min(100, num)) : Math.max(0, Math.min(100, num));
    var lvl = LD.resLevel ? LD.resLevel(cls, num) : "ok";
    return '<div class="meter of-g m-' + cls + " lvl-" + lvl + '" data-num="' + num + '"' + (isMoney ? ' data-money="1"' : "") + ' data-tip="' + esc(title || "") + '" tabindex="0" role="meter" aria-label="' + esc(label) + " " + (isMoney ? money(num) : num) + (isMoney ? "" : " of 100") + '" aria-valuenow="' + num + '" aria-valuemin="0" aria-valuemax="100">' +
      '<span class="m-lab">' + (LD.tok ? LD.tok(cls) : '<i aria-hidden="true">' + icon + "</i>") + '<span class="m-name">' + esc(label) + "</span></span>" +
      '<b class="m-val">' + (isMoney ? money(num) : num) + "</b>" +
      '<div class="m-bar"><span style="width:' + pct + '%"></span></div>' + (sub ? '<small class="m-sub">' + esc(sub) + "</small>" : "") + "</div>";
  }
  LD.renderOffice = function (state, o) {
    o = o || {};
    var f = state.fy || {};
    var mood = LD.execMood ? LD.execMood(state) : "confident";
    var door = LD.doorLevel ? LD.doorLevel(state) : 0;
    var stage = LD.cityStage ? LD.cityStage(state) : 0, decay = LD.cityDecay ? LD.cityDecay(state) : state.collapse;
    var holo = LD.hasItem && LD.has(state, "holo"), padded = LD.hasItem && LD.has(state, "soundproof");
    var quiet = LD.doorQuiet && LD.doorQuiet(state);
    var exec = LD.execById(state.executiveId);
    var m = LD.mods(state);
    var ring = !!(f.memo), ERA = LD.ERAS && LD.eraOf ? LD.ERAS[LD.eraOf(state)] : null;
    var cashG = ogauge("cash", "$", "Cash", state.cash, true, o.cashSub || "", "Cash " + money(state.cash) + ". Buys bunker works, crisis pay-offs and boss demands." + (state.cash < 5 ? " Running dry: you cannot cover most pay-offs." : ""));
    var h = '<div class="panel-k of-head"><span class="of-q">' + (LD.tok ? LD.tok("quarter") : "") + "Q" + state.turn + '<span class="of-ht"> · Office</span></span>' + cashG + '<span class="of-tools">' +
      (f.deck ? '<button class="of-deckbtn" id="btn-deck" aria-label="Deck, ' + f.deck.length + ' cards">🃏 ' + f.deck.length + "</button>" : "") +
      (ring ? '<button class="of-phone ringing" id="btn-phone" aria-label="' + esc(ERA ? ERA.phone : "The phone is ringing") + '">' + (ERA ? ERA.phoneIcon : "☎") + "</button>" : "") +
      (LD.portfolioChip ? LD.portfolioChip(state) : "") + "</span></div>";
    h += '<div class="of-room mood-' + mood + " door-" + door + " city-" + (holo ? 0 : stage) + (holo ? " holo" : "") + (quiet ? " quiet" : "") + (padded ? " padded" : "") + '" data-door="' + door + '" data-city="' + stage + '" data-mood="' + mood + '">';
    h += '<div class="of-layer of-wall" data-art="office-wall" aria-hidden="true"></div>';
    if (f.hand) { h += '<div class="of-wallart" aria-hidden="true">'; for (var wi = 0; wi < (f.cap || 5); wi++) { var wa = f.hand[wi] && LD.assetById(f.hand[wi].id); h += wa ? "<i>" + wa.icon + "</i>" : '<i class="empty"></i>'; } h += "</div>"; }
    /* Window */
    h += '<div class="of-window" data-art="office-window"><div class="of-glass">' + citySvg(stage, decay, holo, ERA ? ERA.act : 3) + '</div>' +
      (holo ? '<span class="of-tag holo-tag">HOLO-VIEW</span>' : "") +
      ogauge("collapse", "☢", "Collapse", state.collapse, false,
        (holo ? "Holo-View · real: " : "") + LD.CITY_NAMES[stage] + " · ~" + LD.forecastQuarters(state) + "Q to breach",
        "Collapse " + state.collapse + "/100 · rises about +" + LD.collapseTickAmountPreview(state) + " a quarter · breach in ~" + LD.forecastQuarters(state) + " quarters. Crisis deals likely from 55. The mainland: " + LD.CITY_NAMES[stage] + (stage >= 2 ? " (unrest +" + (stage - 1) + " a quarter)" : "") + ".") + "</div>";
    /* Executive */
    h += '<div class="of-exec" data-art="office-exec" aria-label="' + esc(exec.name) + ", " + ({ confident: "confident", nervous: "nervous", panic: "panicking" })[mood] + '">' + (function () { var fa = LD.execFrontArt(state.executiveId); return '<img class="of-portrait" src="' + fa.src + '" alt="" draggable="false" style="--ar:' + fa.ar + '"><span class="of-mood" aria-hidden="true"></span>'; })() + "</div>";
    /* Desk + cash */
    var bills = Math.max(0, Math.min(8, Math.round(state.cash / 8)));
    var stack = ""; for (var i = 0; i < bills; i++) stack += '<rect x="' + (6 + (i % 2) * 3) + '" y="' + (26 - i * 3.2) + '" width="26" height="3" rx="0.8"/>';
    h += '<div class="of-desk" data-art="office-desk"><svg class="of-desksvg" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true"><rect class="dtop" x="0" y="4" width="120" height="30" rx="2"/><g class="stack">' + stack + '</g><rect class="lamp" x="96" y="0" width="3" height="10"/><path class="lampshade" d="M90 2 h15 l-3 -6 h-9z"/></svg></div>';
    /* Door + unrest */
    var dn = quiet ? (padded ? "Soundproofed" : "Quiet (doorman paid)") : LD.DOOR_NAMES[door];
    h += '<div class="of-door" data-art="office-door">' + doorSvg(door, quiet, padded) + '<span class="of-knock" aria-hidden="true">' + (door >= 3 ? "BANG!" : door >= 2 ? "THUD" : "knock") + "</span>" +
      (door >= 3 && !quiet ? '<span class="of-voices" aria-hidden="true">“Open up!”</span>' : "") +
      ogauge("unrest", "✊", "Unrest", state.unrest, false, dn,
        "Unrest " + state.unrest + "/100 · " + dn + ". Crisis deals likely from 48; crises cannot be paid off from " + m.crisisNoPayAt + "; the board removes you at " + LD.MAX_UNREST + ".") + "</div>";
    h += "</div>";
    return h;
  };


  /* Board Memo card */
  function memoCard(state) {
    var f = state.fy, m = f && f.memo && LD.memoById(f.memo.id);
    if (!m) return "";
    var h = '<div class="fy-boss fy-memo"><div class="fy-boss-ico" aria-hidden="true">' + m.icon + "</div>";
    var ERA = LD.ERAS && LD.eraOf ? LD.ERAS[LD.eraOf(state)] : null;
    h += '<div class="dz-k">' + (ERA ? ERA.phoneIcon + " " + esc(ERA.phone) : m.call ? "Incoming call" : "Board call") + " · Q" + state.turn + "</div><h2>" + esc(m.title) + "</h2>";
    h += '<p class="fy-demand">' + esc(m.body) + "</p>";
    var mm = f.memo;
    if (m.id === "headhunter" && mm.offer) {
      h += '<div class="fy-outs">';
      mm.offer.forEach(function (fid, i) { var x = LD.fixerById(fid); if (!x) return;
        h += '<div class="fy-out good"><b>' + (i ? "Second" : "First") + ": " + x.icon + " " + esc(x.name) + "</b><span>" + esc(x.t + ", " + x.role + " · $" + x.pay + "M a quarter") + "</span><span>Cards: " + esc(x.cards.map(function (c) { return LD.cardDef(c).name; }).join(", ")) + "</span></div>"; });
      h += "</div>";
      if (f.fixers.length >= LD.DOOR.FIXER_CAP) h += '<p class="fy-note">Your roster is full (' + LD.DOOR.FIXER_CAP + "). Let someone go from the deck view first.</p>";
    }
    if (m.id === "distressed" && mm.asset) { var da = LD.assetById(mm.asset); if (da) h += '<p class="fy-note">On offer: <b>' + da.icon + " " + esc(da.name) + "</b> · " + esc(da.text) + "</p>"; }
    if (m.id === "oldfriend" && mm.card) { var dc0 = LD.cardDef(mm.card); if (dc0) h += '<p class="fy-note">The favour: <b>' + dc0.icon + " " + esc(dc0.name) + "</b> · " + esc(LD.cardText(mm.card, 0)) + "</p>"; }
    return h + "</div>";
  }
  function memoButtons(state) {
    var m = LD.memoById(state.fy.memo.id);
    function b(k, cls) {
      var o = m[k], ok = LD.memoAffordable(state, k);
      return '<button class="btn ' + cls + ' fy-mchoice" id="fy-m-' + k + '"' + (ok ? "" : " disabled") + "><b>" + esc(o.label) + "</b><small>" + esc(ok ? o.text : "Not enough cash · " + o.text) + "</small></button>";
    }
    if (m.id === "headhunter" && state.fy.memo.offer) {
      var off = state.fy.memo.offer, full = state.fy.fixers.length >= LD.DOOR.FIXER_CAP;
      return off.map(function (fid, i) { var x = LD.fixerById(fid); return '<button class="btn ' + (i ? "" : "btn-coral") + ' fy-mchoice" id="fy-m-' + (i ? "b" : "a") + '"' + (full ? " disabled" : "") + "><b>Hire " + esc(x.name.replace(/^Dr\. /, "").split(" ")[0]) + "</b><small>" + esc(x.cards.length + " cards · $" + x.pay + "M/Q") + "</small></button>"; }).join("") +
        '<button class="btn fy-mchoice" id="fy-m-c"><b>Not now</b><small>Let it go to voicemail</small></button>';
    }
    return b("a", "btn-coral") + b("b", "") + (m.c ? b("c", "") : "");
  }
  LD.renderMemo = memoCard;
  LD.renderMemoButtons = memoButtons;

  /* Tap-to-explain sheets */
  LD.explainHtml = function (kind, state) {
    var h = "";
    if (kind === "liabilities") {
      h += '<div class="fy-head"><div class="dz-k">Curses</div><h2>What clogs your deck</h2></div><ul class="fy-list ex-list">';
      LD.CARDS.filter(function (c) { return c.t === "Curse"; }).forEach(function (l) { h += '<li class="liab"><span class="fy-ico" aria-hidden="true">' + l.icon + "</span><div><b>" + esc(l.name) + "</b><span>" + esc(LD.curseText(l.id)) + "</span></div></li>"; });
      h += "</ul><p class=\"fy-note\">Curses come from audits, leaks, riders and calls. Shred them at a reward, or use Hush Money or Settle Quietly.</p>";
    } else if (kind === "ratings") {
      var cur = state && state.rating != null ? state.rating : null;
      h += '<div class="fy-head"><div class="dz-k">Credit ratings</div><h2>Every tier adds one rule</h2></div><ol class="ex-rules">';
      LD.RATINGS.forEach(function (r, i) { h += "<li" + (cur === i ? ' class="on"' : "") + "><b>" + esc(r.id) + '</b> <span>' + esc(r.text) + "</span> <em>×" + LD.ratingMultiplier(i).toFixed(1) + "</em></li>"; });
      h += '</ol><p class="fy-note">Rules stack: a tier keeps every rule above it. Exits pay ×(1 + 0.3 × tier) Dividends.</p>';
    } else if (kind === "bosses") {
      h += '<div class="fy-head"><div class="dz-k">Boss quarters</div><h2>Who can show up</h2></div><ul class="fy-list ex-list">';
      [["earnings", "shortseller"], ["strike", "bid", "crash"], ["reckoning", "heatdome", "seawall"]].forEach(function (grp, ai) {
        grp.forEach(function (id) { var b = LD.BOSSES[id], bo = LD.bossOpp && state && state.fy ? LD.oppById(LD.bossOpp(state, id)) : null, bo0 = !bo && LD.oppById ? LD.oppById({ earnings: "ashby_b", shortseller: "sorel_b", strike: "varga_b", bid: "crowe_b", crash: "ticker_b" }[id]) : null; bo = bo || bo0;
          h += '<li><span class="fy-ico" aria-hidden="true">' + b.icon + "</span><div><b>" + esc(b.name) + "</b> <em>Act " + LD.ACTS[ai].roman + " · " + esc(LD.ACTS[ai].year) + "</em>" + (bo ? "<span>" + esc(bo.who + " · " + bo.role) + "</span>" : "") + "</div></li>"; });
      });
      h += '</ul><p class="fy-note">Each act draws one boss from its row. The timeline shows yours from the start.</p>';
    }
    return '<div class="fy-pfsheet ex-sheet">' + h + "</div>";
  };

  /* End screen: picks that carried the run */
  LD.renderCarried = function (state) {
    var list = LD.fyRunSummary ? LD.fyRunSummary(state).filter(function (x) { return x.score > 0; }).slice(0, 3) : [];
    if (!list.length) return "";
    return '<div class="end-carried"><b>Carried by</b>' + list.map(function (x) { return '<span class="ec ' + RCLS[x.r] + '"><i aria-hidden="true">' + x.icon + "</i>" + esc(x.name) + "<small>" + esc(x.text) + "</small></span>"; }).join("") + "</div>";
  };

  function actChip(state) {
    var f = state.fy; if (!f) return "Quarter";
    return "Act " + LD.ACTS[f.act - 1].roman + " · " + LD.ACTS[f.act - 1].year;
  }

  function nextBossQ(state) {
    var qs = LD.bossQuarters(state);
    for (var i = 0; i < qs.length; i++) if (qs[i] >= state.turn) return qs[i];
    return null;
  }

  function bossCard(state, q, mode) {
    var info = LD.bossInfo(state, q);
    if (!info) return "";
    var act = LD.ACTS[LD.actOf(q) - 1];
    var h = '<div class="fy-boss b-' + info.id + '"><div class="fy-boss-ico" aria-hidden="true">' + info.icon + "</div>";
    var bopp = LD.bossOpp && !info.final ? LD.oppById(LD.bossOpp(state, info.id)) : null;
    h += '<div class="dz-k">' + (mode === "confirm" ? "Boss quarter · Q" + q : "Act " + act.roman + " · " + esc(act.name) + " (" + esc(act.year) + ") · boss at Q" + q) + ' · <button class="link-btn fy-whoboss fy-explain" data-explain="bosses">ⓘ All bosses</button></div>';
    h += "<h2>" + esc(info.name) + "</h2>";
    if (bopp) h += '<p class="fy-who">' + esc(bopp.who + " · " + bopp.role) + (state.fy && state.fy.strikeSwap && info.id === "strike" ? " · ★ a familiar face" : "") + "</p>";
    h += '<p class="fy-demand">' + esc(info.demand) + "</p>";
    h += '<div class="fy-outs"><div class="fy-out good"><b>Beat it</b><span>' + esc(info.beat) + ' · +10 ◈</span></div><div class="fy-out bad"><b>Miss it</b><span>' + esc(info.miss) + "</span></div></div>";
    if (mode === "confirm" && info.id === "strike") h += '<p class="fy-note">Unrest now ' + state.unrest + (state.unrest >= 40 ? " · the big hit applies" : " · under 40, the small hit applies") + ".</p>";
    if (mode === "confirm" && info.choice) h += '<p class="fy-note">Cash now ' + money(state.cash) + ". It resolves when you end the quarter.</p>";
    if (mode === "confirm" && info.id === "crash") h += '<p class="fy-note">Cash now ' + money(state.cash) + " · after the drop about " + money(state.cash - Math.round(state.cash * 0.3)) + (state.cash - Math.round(state.cash * 0.3) >= info.line ? " · you ride it out" : " · not enough to ride it out") + ".</p>";
    if (mode === "confirm" && info.id === "shortseller" && state.fy.hand.length) { var nw = null; state.fy.hand.forEach(function (hd) { var c0 = LD.assetById(hd.id); if (c0 && !c0.liability) nw = c0; }); if (nw) h += '<p class="fy-note">Your newest Asset: ' + nw.icon + " " + esc(nw.name) + ".</p>"; }
    if (mode === "confirm" && info.final) h += '<p class="fy-note">' + esc(LD.readinessSummary(state).tally) + ". " + (LD.readinessSummary(state).canWin ? "Your bunker would hold." : "Your bunker would not hold.") + "</p>";
    return h + "</div>";
  }

  /* Executive dossier block: act, next boss, sealing rule. */
  function fyDossier(state) {
    var f = state.fy; if (!f) return "";
    var q = nextBossQ(state), info = q ? LD.bossInfo(state, q) : null;
    var h = '<div class="target fy-target"><span>⚑</span><b>Act ' + LD.ACTS[f.act - 1].roman + " · " + esc(LD.ACTS[f.act - 1].name) + " · " + esc(LD.ACTS[f.act - 1].year) + "</b> Q" + state.turn + " of " + f.rules.finalQ;
    if (info) h += '<button class="fy-bosslink" data-boss-q="' + q + '">' + info.icon + " " + esc(info.name) + " · Q" + q + " ▸</button>";
    return h + "</div>";
  }

  /* ---------- Drop 1: the door fight, the reward, the deck (pure string builders) ---------- */
  var TYPE_CLS = { Shared: "t-shared", Lobbyist: "t-lob", Lawyer: "t-law", PR: "t-pr", Fellow: "t-fel", Curse: "t-curse", Room: "t-room", Private: "t-priv" };
  var METER_ICO = { cash: "$", unrest: "✊", collapse: "☢", heat: "🔥" };
  var METER_NAME = { cash: "Cash", unrest: "Unrest", collapse: "Collapse", heat: "Heat" };
  var CARD_ART = {};
  ["talking","nocomment","externalize","codb","synergy","golden","presence","backup","cutcorners","privsec","carveout","campaign",
   "zoning","stall","whisper","fasttrack","revolving","darkmoney","objection","buryit","billable","nda","discovery","injunction",
   "settle","countersue","astro","oped","spin","tnp","photoop","crisiscomms","study","funded","unsettled","longterm",
   "c_class","c_subpoena","c_whistle","c_leak","c_crack","c_stranded"].forEach(function (k) { CARD_ART[k] = "assets/cardart/card-" + k + ".webp"; });
  LD.CARD_ART = CARD_ART;
  var RAR_NAME = { S: "Starter", C: "Common", U: "Uncommon", R: "Rare", M: "Fixture", X: "Curse" };
  function cardFace(id, up, opts) {
    opts = opts || {};
    var o = LD.cardValues(id, up), d = LD.cardDef(id); if (!o || !d) return "";
    var tag = opts.tag || "button";
    var rr = String(d.r || "C").toLowerCase();
    var cls = "dc " + (TYPE_CLS[d.t] || "t-shared") + " r-" + rr + (up ? " up" : "") + (opts.cls ? " " + opts.cls : "") + (opts.why ? " no" : "");
    var attrs = (opts.attrs || "") + (tag === "button" ? ' type="button"' : "") + (opts.why && tag === "button" ? ' aria-disabled="true"' : "");
    var cost = o.unplay ? "—" : (o.cash ? "$" + o.cash + "M" + (opts.cost ? "+" + opts.cost + "◆" : "") : (opts.cost != null ? opts.cost : o.cost || 0) + "◆");
    var stats = "";
    if (opts.p || o.p) stats += '<i class="dc-p" title="Pressure"><small>P</small>' + (opts.p != null ? opts.p : o.p) + "</i>";
    if (opts.d || o.d) stats += '<i class="dc-d" title="Deniability"><small>D</small>' + (opts.d != null ? opts.d : o.d) + "</i>";
    var label = (d.name + (up ? "+" : "")) + ". " + cost + ". " + LD.cardText(id, up) + (opts.why ? " " + opts.why : "");
    var art = CARD_ART[id];
    return "<" + tag + ' class="' + cls + '"' + attrs + ' aria-label="' + esc(label) + '">' +
      '<span class="dc-cost' + (o.cash ? " cash" : "") + '"><em>' + esc(cost) + "</em></span>" +
      '<b class="dc-name">' + esc(d.name) + (up ? "<sup>+</sup>" : "") + "</b>" +
      '<span class="dc-art"' + (art ? ' style="background-image:url(' + art + ')"' : "") + '><span class="dc-ico" aria-hidden="true">' + d.icon + "</span>" +
      (stats ? '<span class="dc-stats">' + stats + "</span>" : "") + "</span>" +
      '<span class="dc-type">' + esc(d.t === "Curse" ? "Curse" : d.t) + (d.r && d.r !== "X" ? " · " + (RAR_NAME[d.r] || "") : "") + "</span>" +
      '<span class="dc-txt">' + esc(LD.cardText(id, up)) + "</span>" +
      (opts.why ? '<span class="dc-why">' + esc(opts.why) + "</span>" : "") +
      "</" + tag + ">";
  }
  LD.cardFace = cardFace;

  /* ---------- Fight scenes: one shared stage, a room and a face per faction ---------- */
  var FACTIONS = {
    regulator: { who: "Agnes Hale", role: "Federal Regulator", art: "hale", room: "regulator", place: "Her hearing room" },
    rival: { who: "Victor Crowe", role: "Crowe Terminals", art: "crowe", room: "rival", place: "Crowe Terminals, top floor" },
    bid: { who: "Victor Crowe", role: "Hostile takeover", art: "crowe", room: "rival", place: "Crowe Terminals, top floor" },
    protest: { who: "Rosa Lind", role: "The People", art: "rosa", room: "protest", place: "Your lobby glass" },
    journalist: { who: "Dev Okafor", role: "The Ledger", art: "okafor", room: "journalist", place: "The Ledger's front steps" },
    hearing: { who: "Sen. Walt Brennan", role: "Senate Committee", art: "brennan", room: "senate", place: "The Senate chamber" },
    earnings: { who: "Gail Ashby", role: "Lead Analyst", art: "ashby", room: "earnings", place: "The broadcast studio" },
    shortseller: { who: "Lena Sorel", role: "Nightjar Capital", art: "sorel", room: "garage", place: "Garage, level B3" },
    strike: { who: "Tomas Varga", role: "United Workers", art: "varga", room: "union", place: "The union hall" },
    crash: { who: "The Ticker", role: "The Market", art: "ticker", room: "crash", place: "The trading floor" }
  };
  var ART_AR = { ashby: 0.575, brennan: 0.69, crowe: 0.571, hale: 0.667, okafor: 0.485, dunn: 0.526, moretti: 0.522, june: 0.575, mickey: 0.534, odell: 0.583, delacroix: 0.521, harrow: 0.52, gray: 0.52, rosa: 0.63, sorel: 0.71, ticker: 0.606, varga: 0.854,
    "back-cassius": 0.817, "back-imani": 0.778, "back-julian": 0.817, "back-mara": 0.778, "back-reid": 0.778, "back-soren": 0.817,
    "front-cassius": 0.867, "front-imani": 0.764, "front-julian": 0.867, "front-mara": 0.764, "front-reid": 0.764, "front-soren": 0.867 };
  var POSES = ["idle", "attack", "hit", "block", "defeated"];
  LD.FACTIONS = FACTIONS;
  LD.factionFor = function (enc) { return FACTIONS[enc] || FACTIONS.regulator; };
  function execArt(id) { return ART_AR["back-" + id] ? id : "mara"; }
  LD.execFrontArt = function (id) { var k = execArt(id); return { src: "assets/fight/front-" + k + ".webp", ar: ART_AR["front-" + k] }; };
  /* The face at the door: the act cast (eras.js) or the old faction table for saves from before the eras. */
  LD.fightFace = function (fg) {
    var O = fg && fg.opp && LD.oppById ? LD.oppById(fg.opp) : null;
    if (O) return { who: O.who, short: O.short, role: O.role, art: O.art, room: O.room, place: O.place, ar: O.ar, paid: !!O.paid, opp: O };
    var F = LD.factionFor(fg ? fg.enc : "regulator");
    return { who: F.who, short: F.who.split(" ").slice(-1)[0], role: F.role, art: F.art, room: F.room, place: F.place, ar: ART_AR[F.art], paid: false, opp: null };
  };
  function homeRoom(fg) { var a = LD.actOf ? LD.actOf(Math.min(12, fg.q || 1)) : 3; return a < 3 ? "home-" + a : "home"; }
  /* What they say right now (speech bubble). */
  function bubbleText(state, fg, ui) {
    if (ui.say && ui.say.t) return ui.say;
    if (fg.done) return { t: LD.oppLine(fg, "end"), k: "end" };
    if (fg.round === 1 && !fg.played) return { t: LD.oppLine(fg, "open"), k: "open" };
    var I = fg.intent && LD.INTENTS[fg.intent.k];
    return { t: I && I.say ? I.say : "", k: "move" };
  }
  function sceneHtml(state, fg, ui) {
    var F = LD.fightFace(fg), venue = LD.fightVenue(fg);
    var room = venue === "home" ? homeRoom(fg) : F.room;
    var stage = LD.cityStage ? LD.cityStage(state) : 0;
    var how = fg.done ? fg.done.how || (fg.done.win ? "crushed" : fg.done.settled ? "paid" : "walked") : null;
    var base = !fg.done ? "idle" : how === "crushed" ? "defeated" : how === "paid" ? (F.paid ? "paid" : "idle") : "attack";
    var ex = execArt(state.executiveId);
    var h = '<div class="df-stage sc v-' + venue + " room-" + room + (ui.enter ? " enter" : "") + '" data-room="' + room + '" data-venue="' + venue + '" data-city="' + stage + '">';
    h += '<div class="sc-room" aria-hidden="true" style="background-image:url(assets/fight/room-' + room + '.webp)"></div><div class="sc-haze" aria-hidden="true"></div>';
    h += '<div class="sc-opp" id="sc-opp" data-base="' + base + '" data-pose="' + base + '" style="--ar:' + (F.ar || ART_AR[F.art] || 0.6) + '" aria-hidden="true">';
    POSES.concat(F.paid ? ["paid"] : []).forEach(function (p) { h += '<img class="p-' + p + '" src="assets/fight/opp-' + F.art + "-" + p + '.webp" alt="" draggable="false">'; });
    h += "</div>";
    var bt = F.opp ? bubbleText(state, fg, ui) : null;
    if (bt && bt.t) h += '<div class="sc-bubble k-' + bt.k + '" id="sc-bubble" role="status" aria-live="polite"><b>' + esc(F.short) + "</b>" + esc(bt.t) + "</div>";
    if (fg.cb && !fg.done && fg.round === 1 && !fg.played && !ui.cbHide) {
      var cb = fg.cb, img = cb.art ? "assets/fight/" + cb.art + ".webp" : "";
      h += '<div class="sc-cb' + (cb.inset ? " is-witness" : "") + '" id="sc-cb" role="note"><div class="sc-cb-k">★ A FAMILIAR FACE ★</div>' +
        (img ? '<img src="' + img + '" alt="" draggable="false">' : "") + '<div class="sc-cb-t"><b>' + esc(cb.who) + '</b><q>' + esc(cb.line) + "</q><em>" + esc(cb.effect) + '</em></div><button class="sc-cb-ok" id="sc-cb-ok">Face them ▸</button></div>';
    }
    h += '<div class="sc-you" id="sc-you" style="--ar:' + ART_AR["back-" + ex] + '" aria-hidden="true"><img src="assets/fight/back-' + ex + '.webp" alt="" draggable="false"></div>';
    h += '<div class="sc-place" aria-hidden="true">' + (venue === "home" ? "🚪 Your office · they came to you" : venue === "lobby" ? "🏢 Your lobby · through the glass" : "↩ Out the back door · " + esc(F.place)) + "</div>";
    if (fg.done) h += '<div class="sc-stamp ' + (how || "lost") + '" aria-hidden="true">' + (F.opp && LD.HOW_LABEL[how] ? LD.HOW_LABEL[how] : fg.done.win ? "Deal closed" : fg.done.settled ? "Settled" : "They got through") + "</div>";
    return h;
  }
  /* ---------- Fight intro: a 2-3 s comic beat before the fight screen ----------
     Visitors (home / lobby): your office door swings open, a silhouette steps in out of the hall light and its
     shadow falls across your floor. Away: you slip out the back door, down the stairwell, into their room. */
  var FI_LINES = {
    home: ["The door swings open. {s} doesn't knock twice.", "Nothing on the calendar. {s} walks in anyway.", "No invite, no ping. {s} is already in the room."],
    lobby: ["Down in the lobby, the crowd is pressed to the glass.", "The lobby glass is rattling. Somebody brought a camera.", "The lobby glass is shaking, and it's streaming live."],
    away: ["Out the back stairs, collar up. Next stop: {p}.", "Out the service exit before the press sees. {p}.", "Out the back, phone face-down. {p}."]
  };
  var FI_SIGN = { home: ["PRIVATE", "EXECUTIVE SUITE", "FOCUS ROOM"], lobby: ["LOBBY", "LOBBY", "LOBBY"] };
  var FI_EXIT = ["STAIRS", "SERVICE EXIT", "EXIT"];
  LD.fightIntroKey = function (state) { var fg = state && state.fy && state.fy.fight; return fg ? (fg.q || 0) + ":" + (fg.enc || "") + ":" + (fg.opp || "") : ""; };
  LD.renderFightIntro = function (state, opts) {
    opts = opts || {};
    var fg = state && state.fy && state.fy.fight; if (!fg) return "";
    var F = LD.fightFace(fg), venue = LD.fightVenue(fg);
    var era = Math.max(1, Math.min(3, LD.eraOf ? LD.eraOf(state) : 3));
    var ex = execArt(state.executiveId), exAr = ART_AR["back-" + ex] || 0.8;
    var kind = fg.boss ? "Boss" : fg.elite ? "Elite" : venue === "home" ? "Home turf" : venue === "lobby" ? "At the glass" : "Away";
    var place = venue === "home" ? "Your office" : venue === "lobby" ? "Your lobby" : (F.place || "Their turf");
    var line = (FI_LINES[venue] || FI_LINES.home)[era - 1].replace("{s}", F.short || F.who).replace("{p}", F.place || "their turf");
    var opp = "assets/fight/opp-" + F.art + "-idle.webp", oppAr = F.ar || ART_AR[F.art] || 0.6;
    var mode = venue === "away" ? "away" : "visit";
    var h = '<div class="fi fi-' + mode + " fi-v-" + venue + " fi-e" + era + (opts.reduced ? " fi-rm" : "") + (opts.short ? " fi-short" : "") + '" role="dialog" aria-live="polite" aria-label="' + esc(F.who + " — " + kind) + '">';
    function wall(cls) { return '<div class="fi-wall ' + (cls || "") + '"><span class="fi-rail"></span><span class="fi-frame" aria-hidden="true"><svg viewBox="0 0 60 40" preserveAspectRatio="none"><polyline points="4,32 14,26 22,29 32,15 42,19 56,6" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg></span></div><div class="fi-floor"></div>'; }
    var you = '<div class="fi-you" style="--ar:' + exAr + '"><img src="assets/fight/back-' + ex + '.webp" alt="" draggable="false"></div>';
    function silo(src) { return '<span class="fi-silo" style="-webkit-mask-image:url(' + src + ');mask-image:url(' + src + ')"></span>'; }
    var oppEl = '<div class="fi-opp" style="--ar:' + oppAr + '"><img src="' + opp + '" alt="" draggable="false">' + (venue === "away" ? "" : silo(opp)) + "</div>";
    if (mode === "visit") {
      var sign = FI_SIGN[venue === "lobby" ? "lobby" : "home"][era - 1];
      h += '<div class="fi-scene">' + wall() +
        '<div class="fi-light"></div><div class="fi-shade"></div>' +
        '<div class="fi-door"><div class="fi-beyond"><span class="fi-hall"></span></div>' + oppEl +
        '<div class="fi-leaf"><span class="fi-glass"><b>' + esc(sign) + '</b></span><span class="fi-panel"></span><span class="fi-knob"></span></div>' +
        '<span class="fi-knock" aria-hidden="true">' + (venue === "lobby" ? "BANG BANG" : era === 3 ? "tap tap" : "knock knock") + "</span></div>" +
        you + "</div>";
    } else {
      h += '<div class="fi-strip">' +
        '<div class="fi-pane fi-p1">' + wall("fi-wall-back") + '<div class="fi-door fi-exit"><div class="fi-beyond fi-dark"></div><div class="fi-leaf"><span class="fi-bar"></span></div><span class="fi-sign">' + esc(FI_EXIT[era - 1]) + "</span></div>" +
          '<div class="fi-walker" style="--ar:' + exAr + '"><img src="assets/fight/back-' + ex + '.webp" alt="" draggable="false"></div></div>' +
        '<div class="fi-pane fi-p2"><span class="fi-pipe"></span><span class="fi-pipe b"></span><svg class="fi-stairs" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,100 0,84 17,84 17,68 34,68 34,52 51,52 51,36 68,36 68,20 85,20 85,4 100,4 100,100" fill="#22304a" stroke="#0e1626" stroke-width="2" vector-effect="non-scaling-stroke"/><polyline points="4,62 21,46 38,30 55,14 72,-2" fill="none" stroke="#c9942a" stroke-width="4" vector-effect="non-scaling-stroke"/><line x1="8" y1="58" x2="8" y2="84" stroke="#c9942a" stroke-width="2" vector-effect="non-scaling-stroke" opacity=".7"/><line x1="25" y1="42" x2="25" y2="68" stroke="#c9942a" stroke-width="2" vector-effect="non-scaling-stroke" opacity=".7"/><line x1="42" y1="26" x2="42" y2="52" stroke="#c9942a" stroke-width="2" vector-effect="non-scaling-stroke" opacity=".7"/><line x1="59" y1="10" x2="59" y2="36" stroke="#c9942a" stroke-width="2" vector-effect="non-scaling-stroke" opacity=".7"/></svg><span class="fi-dframe"></span><span class="fi-lamp"></span><span class="fi-lamp b"></span><span class="fi-cone"></span><span class="fi-cone b"></span>' +
          '<span class="fi-sil" style="--ar:' + exAr + '">' + silo("assets/fight/back-" + ex + ".webp") + "</span></div>" +
        '<div class="fi-pane fi-p3"><div class="fi-room" style="background-image:url(assets/fight/room-' + F.room + '.webp)"></div>' + oppEl + you + "</div>" +
        "</div>";
    }
    h += '<div class="fi-plate"><span class="fi-kind">' + esc(kind) + " · " + esc(place) + '</span><b class="fi-who">' + esc(F.who) + '</b><span class="fi-role">' + esc(F.role || "") + "</span></div>" +
      '<div class="fi-cap"><span>' + esc(line) + "</span></div>" +
      '<span class="fi-skip">Tap to skip</span></div>';
    return h;
  };
  LD.fightIntroArt = function (state) {
    var fg = state && state.fy && state.fy.fight; if (!fg) return [];
    var F = LD.fightFace(fg), ex = execArt(state.executiveId), a = ["assets/fight/opp-" + F.art + "-idle.webp", "assets/fight/back-" + ex + ".webp"];
    if (LD.fightVenue(fg) === "away") a.push("assets/fight/room-" + F.room + ".webp");
    return a;
  };
  /* ---------- Office strip entrance (hub): the visitor walks in to the desk, or you leave by the back door
     and a car / plane pulls away in the window. Pure DOM sprites over the existing strip; CSS does the motion. ---------- */
  var OFX_FAR = { senate: 1, crash: 1 };
  var OFX_VEH = {
    car: [
      /* 1978 Checker-style cab */
      '<svg viewBox="0 0 64 26"><path d="M4 18 L6 11 L16 10 L22 3 H42 L49 10 L60 12 L61 19 Z" fill="#c9942a" stroke="#1f2e2f" stroke-width="1.6" stroke-linejoin="round"/><rect x="21" y="11" width="22" height="3" fill="#1f2e2f"/><path d="M24 5 H33 V10 H20 Z M35 5 H41 L46 10 H35 Z" fill="#cfd8c8" stroke="#1f2e2f" stroke-width="1.2"/><rect x="28" y="0.5" width="8" height="2.6" fill="#f8eedb" stroke="#1f2e2f" stroke-width="1"/><circle cx="16" cy="19" r="4.6" fill="#17233a" stroke="#1f2e2f" stroke-width="1.4"/><circle cx="49" cy="19" r="4.6" fill="#17233a" stroke="#1f2e2f" stroke-width="1.4"/><circle cx="16" cy="19" r="1.6" fill="#c9b07a"/><circle cx="49" cy="19" r="1.6" fill="#c9b07a"/></svg>',
      /* 2008 black town car */
      '<svg viewBox="0 0 70 24"><path d="M3 17 L5 11 L18 9 L25 3 H46 L54 9 L67 11 L68 18 Z" fill="#1f2e2f" stroke="#0e1626" stroke-width="1.6" stroke-linejoin="round"/><path d="M27 5 H36 V9 H22 Z M38 5 H45 L51 9 H38 Z" fill="#8fa3a4" stroke="#0e1626" stroke-width="1.1"/><path d="M6 13 H66" stroke="#c8cfcc" stroke-width="1"/><circle cx="17" cy="18" r="4.4" fill="#0e1626" stroke="#c8cfcc" stroke-width="1.2"/><circle cx="54" cy="18" r="4.4" fill="#0e1626" stroke="#c8cfcc" stroke-width="1.2"/></svg>',
      /* Today: matte electric coupe */
      '<svg viewBox="0 0 66 24"><path d="M3 18 C3 12 10 11 18 10 C24 4 40 3 48 9 C58 10 63 12 63 18 Z" fill="#1f5a5c" stroke="#1f2e2f" stroke-width="1.6" stroke-linejoin="round"/><path d="M22 9.5 C27 5 39 5 45 9.5 Z" fill="#cfd8c8" stroke="#1f2e2f" stroke-width="1.1"/><path d="M58 13 h4" stroke="#f3e6c8" stroke-width="1.6"/><circle cx="17" cy="18.5" r="4.4" fill="#17233a" stroke="#1f2e2f" stroke-width="1.3"/><circle cx="50" cy="18.5" r="4.4" fill="#17233a" stroke="#1f2e2f" stroke-width="1.3"/></svg>'
    ],
    air: [
      /* 1978 airship */
      '<svg viewBox="0 0 80 30"><ellipse cx="38" cy="12" rx="32" ry="10" fill="#e3d2a6" stroke="#1f2e2f" stroke-width="1.6"/><path d="M14 12 H64 M38 2.5 V21.5" stroke="#b8553a" stroke-width="1.2" opacity=".8"/><path d="M5 12 L-1 5 L1 12 L-1 19 Z" fill="#b8553a" stroke="#1f2e2f" stroke-width="1.2"/><rect x="30" y="21" width="15" height="6" rx="1.5" fill="#1f5a5c" stroke="#1f2e2f" stroke-width="1.2"/></svg>',
      /* 2008 airliner */
      '<svg viewBox="0 0 80 26"><path d="M4 13 C4 10 10 9 18 9 H66 C72 9 77 11 77 13 C77 15 72 16 66 16 H18 C10 16 4 15 4 13 Z" fill="#f3e6c8" stroke="#1f2e2f" stroke-width="1.5"/><path d="M8 9 L4 2 H11 L19 9 Z" fill="#1f5a5c" stroke="#1f2e2f" stroke-width="1.2"/><path d="M34 15 L46 25 H52 L46 15 Z" fill="#cfd8c8" stroke="#1f2e2f" stroke-width="1.2"/><path d="M20 12.5 H62" stroke="#1f5a5c" stroke-width="1.6" stroke-dasharray="2 2"/></svg>',
      /* Today private jet */
      '<svg viewBox="0 0 72 24"><path d="M6 13 C6 10 14 9.5 24 9.5 H58 C66 9.5 70 11.5 70 13 C70 14.5 66 15.5 58 15.5 H24 C14 15.5 6 15 6 13 Z" fill="#f8eedb" stroke="#1f2e2f" stroke-width="1.5"/><path d="M8 10 L5 3 H10 L18 10 Z" fill="#17233a" stroke="#1f2e2f" stroke-width="1.2"/><rect x="14" y="7" width="7" height="3.4" rx="1.5" fill="#17233a"/><path d="M32 15 L42 22 H47 L42 15 Z" fill="#c9942a" stroke="#1f2e2f" stroke-width="1.1"/><path d="M28 12 H56" stroke="#1f2e2f" stroke-width="1.4" stroke-dasharray="1.6 2.4"/></svg>'
    ]
  };
  LD.officeEntrance = function (state) {
    var fg = state && state.fy && state.fy.fight; if (!fg) return null;
    var F = LD.fightFace(fg), venue = LD.fightVenue(fg), era = Math.max(1, Math.min(3, LD.eraOf ? LD.eraOf(state) : 3));
    var away = venue === "away", air = away && !!OFX_FAR[F.room];
    return { away: away, air: air, era: era, who: F.who, place: F.place || "", opp: "assets/fight/opp-" + F.art + "-idle.webp", ar: F.ar || ART_AR[F.art] || 0.6,
      veh: away ? OFX_VEH[air ? "air" : "car"][era - 1] : "" };
  };
  LD.renderFight = function (state, ui) {
    ui = ui || {};
    var f = state.fy, fg = f.fight; if (!fg) return "";
    var it = fg.done ? null : LD.fightIntent(state);
    var F = LD.fightFace(fg), venue = LD.fightVenue(fg);
    var pct = fg.max ? Math.max(0, Math.round(100 * Math.max(0, fg.scrut) / fg.max)) : 0;
    var h = '<div class="door-in fight2' + (fg.boss ? " is-boss" : fg.elite ? " is-elite" : "") + (fg.done ? " is-done" : "") + '" data-enc="' + fg.enc + '">';
    var kind = fg.boss ? "Boss" : fg.elite ? "Elite" : venue === "home" ? "Home turf" : venue === "lobby" ? "At the glass" : "Away";
    h += '<header class="df-top"><div class="df-title"><small>' + kind + " · Q" + fg.q + " · " + esc(fg.dealTitle || "") + "</small><b>" + esc(F.who) + (fg.cb ? ' <i class="df-cbchip" title="A familiar face">★</i>' : "") + "</b><em>" + esc(F.opp ? F.role : F.role + " · " + (fg.encName || fg.name)) + "</em></div>" +
      '<div class="df-round" aria-label="Round ' + fg.round + " of " + fg.rounds + '"><small>Round</small>' + Math.min(fg.round, fg.rounds) + "<i>/" + fg.rounds + "</i></div>" +
      '<button class="icon-btn df-help" id="df-help" aria-label="How fights work">?</button></header>';
    h += sceneHtml(state, fg, ui);
    h += '<div class="df-scrut lvl-' + (LD.resLevel ? LD.resLevel("scrutiny", fg.max ? Math.max(0, fg.scrut) / fg.max : 0) : "ok") + '"><div class="df-k">' + (LD.tok ? LD.tok("scrutiny") : "") + 'Scrutiny <b id="df-scrut-n">' + Math.max(0, fg.scrut) + "</b>/" + fg.max + '</div><div class="df-bar" role="meter" aria-label="Scrutiny" aria-valuemin="0" aria-valuemax="' + fg.max + '" aria-valuenow="' + Math.max(0, fg.scrut) + '"><i style="width:' + pct + '%"></i></div>' +
      '<div class="df-goal">' + (fg.done ? "" : "Pressure to 0 to win · " + esc(LD.ENCOUNTERS[fg.enc].win)) + "</div></div>";
    if (it) {
      var thr = it.through, ico = METER_ICO[it.meter] || "!";
      h += '<div class="df-intent m-' + it.meter + (thr ? "" : " blocked") + '" id="df-intent" aria-live="polite"><div class="df-k">Next, ' + esc(F.short) + " will</div>" +
        '<div class="di-main"><span class="di-ico" aria-hidden="true">' + ico + '</span><b>' + esc(it.label) + " " + it.n + "</b></div>" +
        '<div class="di-math">Block <b>' + it.block + "</b> · through <b>" + thr + "</b> → " + esc(METER_NAME[it.meter] || it.meter) + (it.meter === "collapse" ? " (×½)" : "") + "</div>" +
        (it.rtext ? '<div class="di-rider' + (it.rider && it.at && thr >= it.at ? " live" : "") + '">' + esc(it.rtext) + "</div>" : "") +
        (it.notes.length ? '<div class="di-notes">' + esc(it.notes.join(" · ")) + "</div>" : "") + "</div>";
    }
    h += "</div>";
    if (fg.done) {
      var d = fg.done, L = d.leaks, bits = [];
      if (L.cash) bits.push("−$" + L.cash + "M"); if (L.unrest) bits.push("unrest +" + L.unrest); if (L.collapse) bits.push("collapse +" + L.collapse); if (L.heat) bits.push("Heat +" + L.heat);
      var bye = venue === "home" || venue === "lobby" ? "Show them out ▸" : "Back to the office ▸";
      var how2 = d.how, O2 = F.opp, remember = O2 && !O2.boss && O2.act < 3 && how2 !== "walked";
      var endLine = O2 ? '<div class="sc-ending h-' + how2 + '"><i class="sc-end-stamp">' + esc(LD.HOW_LABEL[how2] || "") + "</i>" +
        (remember ? "<em>They'll remember this.</em>" : how2 === "walked" ? "<em>" + esc(F.short) + " walks out with what they came for.</em>" : "") + "</div>" : "";
      h += '<div class="df-result ' + (d.win ? "win" : d.settled ? "settled" : "lost") + '" role="status">' + endLine + '<b>' + (d.win ? "You won the room" : d.settled ? "Settled for $" + d.cost + "M" : "They got through") + "</b>" +
        "<span>" + esc(d.win ? (d.notes.join(" · ") || "The deal closes.") : d.settled ? "No bonus, no more damage. " + (d.notes.join(" · ")) : "The deal still signs. " + (d.notes.join(" · ") || "")) + "</span>" +
        (bits.length ? '<span class="df-leaks">This fight cost you: ' + esc(bits.join(", ")) + "</span>" : "") +
        '<button class="btn btn-coral df-close" id="df-close">' + bye + "</button></div>";
    } else {
      h += '<div class="df-hud"><div class="df-inf" aria-label="Influence ' + fg.inf + '"><small>Influence</small>';
      for (var i = 0; i < Math.max(fg.inf, LD.DOOR.INF); i++) h += '<i class="' + (i < fg.inf ? "on" : "") + '"></i>';
      h += '<b>' + fg.inf + "◆</b></div>";
      h += '<div class="df-meters" aria-label="Cash $' + state.cash + "M, unrest " + state.unrest + ", collapse " + state.collapse + '">' +
        (LD.resPill ? LD.resPill("cash", state.cash, "Cash $" + state.cash + "M. Settling costs $" + LD.DOOR.SETTLE + "M per Scrutiny left; some cards cost cash.") + LD.resPill("unrest", state.unrest, "Unrest " + state.unrest + "/100. Grievance hits that get through raise it. Knocks at 20, pounding at 40.") + LD.resPill("collapse", state.collapse, "Collapse " + state.collapse + "/100. Hits aimed at collapse land at half strength. Crises likely from 55.")
          : "<b>$" + state.cash + "M</b><span>✊ " + state.unrest + "</span><span>☢ " + state.collapse + "</span>") + "</div>";
      h += '<div class="df-piles"><button class="df-pile" id="df-deck" aria-label="Deck view">Draw ' + fg.draw.length + "</button><span>Discard " + fg.disc.length + "</span></div></div>";
      h += '<div class="df-hand" role="group" aria-label="Your hand">';
      fg.hand.forEach(function (u) {
        var ci = LD.fightCardInfo(state, u); if (!ci) return;
        h += cardFace(ci.id, ci.up, { attrs: ' data-u="' + u + '"', why: ci.why, cost: ci.o.cash ? (ci.cost || null) : ci.cost, p: ci.p, d: ci.d, cls: ui.flashU === u ? "pop" : "" });
      });
      if (!fg.hand.length) h += '<p class="df-empty">No cards left. End the round.</p>';
      h += "</div>";
      var sc = LD.fightSettleCost(state);
      h += '<div class="df-actions"><button class="btn df-settle" id="df-settle"' + (state.cash < sc ? " disabled" : "") + '><b>Settle $' + sc + "M</b><small>" + (state.cash < sc ? "Not enough cash" : "Pay it off now") + "</small></button>" +
        '<button class="btn btn-coral df-end" id="df-end"><b>End round</b><small>' + (it ? (it.through ? esc(it.label) + " hits for " + it.through : "Fully blocked") : "") + (fg.round >= fg.rounds ? " · last round" : "") + "</small></button></div>";
    }
    h += '<div class="df-log" id="df-log" aria-live="polite">' + esc(ui.log || "") + "</div>";
    h += '<div class="fx" id="df-fx" aria-hidden="true"></div>';
    return h + "</div>";
  };
  LD.renderReward = function (state, ui) {
    ui = ui || {};
    var f = state.fy, r = f.reward; if (!r) return "";
    var lf = r.from || {}, E = LD.ENCOUNTERS[lf.enc] || { name: "The door" }, LO = lf.opp && LD.oppById ? LD.oppById(lf.opp) : null;
    var head = '<header class="rw-head"><small>' + (lf.how && LD.HOW_LABEL[lf.how] ? LD.HOW_LABEL[lf.how].charAt(0) + LD.HOW_LABEL[lf.how].slice(1).toLowerCase() + " · " : lf.win ? "Won · " : lf.settled ? "Settled · " : "Lost · ") + esc(LO ? LO.who : E.name) + " · Q" + (lf.q || state.turn) + "</small>";
    var h = '<div class="rw-in">';
    if (!r.itemDone && r.item) {
      var it = LD.itemById(r.item), full = f.drawer.length >= f.dcap;
      h += head + "<h2>Loot on the desk</h2></header>";
      h += '<div class="rw-item r-' + String(it.r).toLowerCase() + '"><span class="rw-ico" aria-hidden="true">' + it.icon + "</span><b>" + esc(it.name) + "</b><span>" + esc(it.text || "") + "</span><em>Briefcase " + f.drawer.length + "/" + f.dcap + "</em></div>";
      if (full && ui.replaceItem) {
        h += '<p class="rw-q">Briefcase full. Sell one to make room:</p><div class="rw-minis">';
        f.drawer.forEach(function (d) { var x = LD.itemById(d.id); h += '<button class="fy-mini" data-isell="' + d.id + '"><span>' + x.icon + "</span><b>" + esc(x.name) + "</b><em>Sell $" + LD.ITEM_SELL[x.r] + "M</em></button>"; });
        h += "</div>";
        h += '<div class="rw-foot"><button class="btn" id="rw-back">Back</button></div>';
      } else h += '<div class="rw-foot"><button class="btn" id="rw-sell">Sell for $' + LD.ITEM_SELL[it.r] + 'M</button><button class="btn btn-coral" id="rw-keep">' + (full ? "Keep (swap one)" : "Into the briefcase") + "</button></div>";
      return h + "</div>";
    }
    if (!r.assetDone && r.asset) {
      var wallFull = LD.fySlotsUsed(state) >= f.cap;
      h += head + "<h2>" + (r.why === "boss" ? "Boss beaten: frame an Asset" : r.why === "elite" ? "The Hearing is over: frame an Asset" : lf.q === 1 ? "Your first trophy: frame an Asset" : "A new act: frame an Asset") + "</h2><p class=\"rw-sub\">Wall " + LD.fySlotsUsed(state) + "/" + f.cap + (wallFull ? " · full: pick one to take down (+$" + LD.FY.DIVEST_CASH + "M)" : "") + "</p></header>";
      if (ui.replaceFor) {
        h += '<div class="rw-minis">';
        f.hand.forEach(function (c) { var a = LD.assetById(c.id); if (!a) return; h += '<button class="fy-mini" data-areplace="' + a.id + '"><span>' + a.icon + "</span><b>" + esc(a.name) + "</b><em>" + esc(a.text) + "</em></button>"; });
        h += '</div><div class="rw-foot"><button class="btn" id="rw-back">Back</button></div>';
        return h + "</div>";
      }
      h += '<div class="rw-assets">';
      r.asset.forEach(function (id) { var a = LD.assetById(id); if (!a) return;
        h += '<button class="fy-card rw-asset r-' + String(a.r).toLowerCase() + '" data-asset="' + id + '"><span class="fy-ico" aria-hidden="true">' + a.icon + '</span><span class="fy-txt"><b>' + esc(a.name) + "</b><em><i class=\"fy-gem\"></i>" + ({ C: "Common", U: "Uncommon", R: "Rare", L: "Legendary" })[a.r] + '</em><span class="fy-eff">' + esc(a.text) + "</span></span></button>"; });
      h += '</div><div class="rw-foot"><button class="btn" id="rw-apass">Pass</button></div>';
      return h + "</div>";
    }
    /* Cards */
    h += head + "<h2>" + (r.rare ? "A rare pick" : "Add a card") + '</h2><p class="rw-sub">Deck ' + f.deck.length + " cards" + (r.rider ? " · ⚠ activist rider: taking a card adds a curse" : "") + (lf.win || lf.settled ? "" : " · lost fights offer 2") + "</p></header>";
    if (ui.shredding) {
      h += '<p class="rw-q">Shred one card for $' + LD.shredCost(state) + 'M:</p><div class="rw-deck">';
      f.deck.forEach(function (c) { var why = LD.shredBlock(state, c.u); h += cardFace(c.id, c.up, { attrs: ' data-shred="' + c.u + '"', why: why, cls: "chip" }); });
      h += '</div><div class="rw-foot"><button class="btn" id="rw-back">Back</button></div>';
      return h + "</div>";
    }
    if (ui.upgrading) {
      h += '<p class="rw-q">Upgrade one card (once per card):</p><div class="rw-deck">';
      f.deck.forEach(function (c) { var why = LD.upgradeBlock(state, c.u); if (LD.isCurse(c.id)) return; h += cardFace(c.id, c.up, { attrs: ' data-upg="' + c.u + '"', why: why, cls: "chip" }); });
      h += '</div><div class="rw-foot"><button class="btn" id="rw-back">Back</button></div>';
      return h + "</div>";
    }
    h += '<div class="rw-cards">';
    r.cards.forEach(function (id) { h += cardFace(id, 0, { attrs: ' data-card="' + id + '"', cls: "big" + (ui.sel === id ? " sel" : "") }); });
    h += "</div>";
    var scost = LD.shredCost(state), canShred = state.cash >= scost && f.deck.length > 6;
    h += '<div class="rw-foot">' +
      (f.rerolls > 0 ? '<button class="btn" id="rw-reroll">Reroll (' + f.rerolls + ")</button>" : "") +
      (f.upTokens > 0 ? '<button class="btn" id="rw-upg">Upgrade (' + f.upTokens + ")</button>" : "") +
      '<button class="btn" id="rw-shred"' + (canShred ? "" : " disabled") + ">Shred a card $" + scost + "M</button>" +
      '<button class="btn" id="rw-skip">Skip +$' + (f.skipCash || LD.DOOR.SKIP) + "M</button>" +
      '<button class="btn btn-coral" id="rw-take"' + (ui.sel ? "" : " disabled") + ">" + (ui.sel ? "Take " + esc(LD.cardDef(ui.sel).name) : "Pick a card") + "</button></div>";
    return h + "</div>";
  };
  LD.renderDeck = function (state, ui) {
    ui = ui || {};
    var f = state.fy; if (!f || !f.deck) return "";
    var h = '<div class="dk-in"><header class="rw-head"><small>Your deck · ' + f.deck.length + " cards" + (f.upTokens ? " · " + f.upTokens + " upgrade" + (f.upTokens > 1 ? "s" : "") : "") + (f.freeShreds ? " · " + f.freeShreds + " free shred" + (f.freeShreds > 1 ? "s" : "") : "") + "</small><h2>Deck and fixers</h2></header>";
    h += '<div class="dk-fixers">';
    f.fixers.forEach(function (r) { var x = LD.fixerById(r.id); if (!x) return;
      h += '<div class="dk-fixer"><span class="dk-fi" aria-hidden="true">' + x.icon + "</span><div><b>" + esc(x.name) + "</b><em>" + esc(x.t + " · " + x.role + " · $" + x.pay + "M/Q") + '</em><span class="dk-heat">Heat ' + "🔥".repeat(r.heat || 0) + (r.heat ? "" : "0") + "/3" + (f.hearing === r.id ? " · Hearing due" : "") + "</span></div>" +
        (f.fixers.length > 1 ? '<button class="btn dk-fire" data-fire="' + r.id + '">Let go</button>' : "") + "</div>"; });
    h += "</div>";
    var mode = ui.mode || "";
    if (mode) h += '<p class="rw-q">' + (mode === "shred" ? "Tap a card to shred it (free)." : "Tap a card to upgrade it.") + "</p>";
    h += '<div class="dk-cards">';
    var order = f.deck.slice().sort(function (a, b) { var A = LD.cardDef(a.id), B = LD.cardDef(b.id); return (A.t === "Curse") - (B.t === "Curse") || A.name.localeCompare(B.name); });
    order.forEach(function (c) {
      var why = mode === "shred" ? LD.shredBlock(state, c.u) : mode === "upgrade" ? LD.upgradeBlock(state, c.u) : null;
      h += cardFace(c.id, c.up, { tag: mode ? "button" : "div", attrs: mode ? ' data-dk="' + c.u + '"' : "", why: why, cls: "mini" });
    });
    h += "</div></div>";
    return h;
  };
  LD.fightHelpHtml = function () {
    return '<div class="fy-explain"><h2>Door fights</h2><ul class="fy-list">' +
      '<li><span class="fy-ico">🎯</span><div><b>Win: Scrutiny to 0</b><span>Pressure cards lower Scrutiny. Hit 0 and they leave. Each encounter pays a bonus.</span></div></li>' +
      '<li><span class="fy-ico">🛡️</span><div><b>Block the intent</b><span>The badge shows what lands when you end the round, and on which meter. Deniability blocks it point for point.</span></div></li>' +
      '<li><span class="fy-ico">◆</span><div><b>3 Influence a round</b><span>Cards cost ◆ (some cost cash). 5 cards a round. Unplayed cards go to the discard.</span></div></li>' +
      '<li><span class="fy-ico">🤝</span><div><b>Settle or lose</b><span>Settle pays $' + LD.DOOR.SETTLE + 'M per Scrutiny left and ends it with no more damage. Losing still signs the deal, but the region takes stress.</span></div></li>' +
      '<li><span class="fy-ico">🃏</span><div><b>Then a reward</b><span>Pick a card, shred one, or skip for cash. Fixers bring their own cards. Curses clog your hand until shredded.</span></div></li></ul></div>';
  };

  LD.renderDraft = renderDraft;
  LD.renderPortfolio = renderPortfolio;
  LD.portfolioChip = portfolioChip;
  LD.actChip = actChip;
  LD.renderBossCard = bossCard;
  LD.fyDossier = fyDossier;
  LD.nextBossQ = nextBossQ;
  if (typeof module !== "undefined" && module.exports) module.exports = LD;
})(typeof globalThis !== "undefined" ? globalThis : this);

  
/* ---------- "What can I do now": one source of truth for highlights ----------
   LD.actionable(state, ctx) returns { ids, prio, dim, badges }.
   ids    : every action that is truly available right now (UI maps them to elements).
   prio   : ordered candidates for the single pointing-hand marker (UI shows the first that is on screen).
   dim    : things on screen you cannot act on yet.
   badges : map tabs that hold something new since you last looked (needs ctx.lensSeen). */
(function (root) {
  var LD = root.LD;
  function lensSig(state, lens) {
    var w = state.world || {}, regs = w.regions || {};
    if (lens === "mood") return Object.keys(regs).filter(function (id) { return (LD.willRevolt && LD.willRevolt(state, id)) || (regs[id].stress | 0) >= LD.STRESS_STRIKE; }).sort().join(",");
    if (lens === "networks") return (LD.SYSTEMS || []).map(function (s) { return s.id + ":" + LD.gridLabel(LD.gridLevel(state, s.id)); }).join(",");
    if (lens === "holdings") return Object.keys(regs).filter(function (id) { return regs[id].owned; }).sort().join(",");
    return "";
  }
  LD.LENSES = ["mood", "networks", "holdings"];
  LD.lensSig = lensSig;
  LD.actionable = function (state, ctx) {
    ctx = ctx || {};
    var out = { ids: [], prio: [], dim: [], badges: [] };
    if (!state || state.ended) return out;
    function add(id) { if (out.ids.indexOf(id) < 0) out.ids.push(id); }
    var f = state.fy || null;
    /* A fight in progress owns the screen. */
    if (f && f.fight) {
      var fg = f.fight;
      if (fg.done) { add("fightclose"); out.prio.push("fightclose"); return out; }
      add("door");
      var playable = (fg.hand || []).filter(function (u) { var ci = LD.fightCardInfo(state, u); return ci && !ci.why; });
      playable.forEach(function (u) { add("card:" + u); });
      if (!playable.length) { add("endround"); out.prio.push("endround"); }
      out.prio.push("door");
      return out;
    }
    if (f && f.reward) { add("reward"); out.prio.push("reward-take", "reward"); return out; }
    if (f && f.memo) {
      add("phone");
      ["a", "b", "c"].forEach(function (k) {
        if (k === "c") return; /* "Not now" is always there; never pushed */
        var m = LD.memoById(f.memo.id); if (!m) return;
        if (m.id === "headhunter") { if (f.memo.offer && f.memo.offer[k === "a" ? 0 : 1] && f.fixers.length < LD.DOOR.FIXER_CAP) add("memo:" + k); return; }
        if (m[k] && LD.memoAffordable(state, k)) add("memo:" + k);
      });
      out.prio.push("phone");
    }
    /* Office items in the briefcase that can be used right now. */
    var usable = ((f && f.drawer) || []).filter(function (d) { return LD.itemReady(state, d) && !LD.itemBlock(state, d.id); });
    usable.forEach(function (d) { add("item:" + d.id); });
    if (usable.length) add("briefcase");
    if (state.phase === "deal") {
      (state.offered || []).forEach(function (id) { add("deal:" + id); });
      out.dim.push("endq", "bunker");
    } else if (state.phase === "bunker") {
      var orders = [];
      if (!state.bunkerActedThisTurn) (LD.availableUpgrades(state) || []).forEach(function (u) {
        if (u.inbound) return;
        if (u.canSound) orders.push("order:" + u.systemId + ":sound");
        if (u.canCheap) orders.push("order:" + u.systemId + ":cheap");
        if (u.canSound || u.canCheap) add("room:" + u.systemId);
      });
      if (orders.length) {
        add("bunker"); orders.forEach(add);
        out.prio.push("order-sound", "room", "bunker");
        out.dim.push("endq-soft");
      } else {
        add("endq"); out.prio.push("endq");
      }
    }
    if (ctx.lensSeen) LD.LENSES.forEach(function (l) {
      if (ctx.lensSeen[l] != null && ctx.lensSeen[l] !== lensSig(state, l)) { out.badges.push("tab:" + l); }
    });
    return out;
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
