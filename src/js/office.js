/* Last Dividend — the office room (40s cartoon): a painted room per era and a full-body walking executive.
   Visual only: reads state, never writes it. Hooks are called from ui.js (deal, bunker, end quarter, fight entrance, reactions);
   everything else (era swap, city stage, door tier, mood) is noticed on each mount after a desk render. */
(function (root) {
  var LD = root.LD || (root.LD = {});
  if (typeof document === "undefined") return;
  var BASE = "assets/office40/";
  /* Plate geometry, in plate pixels. L = 1280x720 (wide boxes), P = 720x1280 (tall side panels). */
  /* The meters are painted into each plate (a wall gauge / panel by the door, a gauge / readout in the window frame, a ticker / terminal / glass on the desk).
     Painted faces in plate pixels: dial = [cx, cy, r] + counter window; quad = TL, TR, BR, BL of the screen. Code draws only the live needle, number and fill. */
  var FACES = {"e1-L":{"U":{"dial":[345.6,109.3,64.5],"win":[326.6,131.0,365.6,153.1]},"C":{"dial":[809.7,234.0,60.0],"win":[790.6,255.0,829.6,276.0]},"K":{"quad":[[697.2,345.0],[832.2,342.5],[832.2,392.5],[697.2,395.0]]}},"e1-P":{"U":{"dial":[219.4,172.4,44.6],"win":[204.0,186.0,232.0,203.0]},"C":{"dial":[621.8,205.2,36.0],"win":[611.0,220.0,638.0,234.0]},"K":{"quad":[[428.0,486.0],[511.0,485.0],[511.0,513.0],[428.0,514.0]]}},"e2-L":{"U":{"quad":[[318.6,72.3],[441.0,72.3],[441.0,147.9],[318.6,147.9]]},"C":{"quad":[[541.7,73.6],[777.0,73.6],[777.0,123.0],[541.7,123.0]]},"K":{"quad":[[677.9,285.4],[778.0,285.4],[778.0,347.8],[675.3,347.8]]}},"e2-P":{"U":{"quad":[[224.0,109.0],[317.0,109.0],[317.0,165.0],[224.0,165.0]]},"C":{"quad":[[360.0,99.0],[512.0,99.0],[512.0,146.0],[360.0,146.0]]},"K":{"quad":[[370.8,406.0],[459.2,406.0],[459.2,455.5],[370.8,455.5]]}},"e3-L":{"U":{"quad":[[289.9,69.5],[357.2,79.6],[360.2,195.0],[291.9,184.0]]},"C":{"quad":[[532.7,51.4],[785.2,53.5],[784.0,108.9],[534.4,103.7]]},"K":{"quad":[[704.9,313.2],[805.4,314.5],[788.9,368.8],[688.0,363.4]]}},"e3-P":{"U":{"quad":[[66.0,58.0],[155.0,84.0],[160.0,158.0],[67.0,131.0]]},"C":{"quad":[[302.4,113.5],[486.0,115.0],[485.0,169.0],[303.0,164.0]]},"K":{"quad":[[431.6,522.0],[498.4,528.0],[490.3,566.8],[421.5,560.7]]}}};
  var ROOMS = {
    "e1-L": { w: 1280, h: 720, hk: [0.72, 0], door: [81, 37, 188, 475], glass: [406, 181, 375, 181],
      occ: [[690, 372], [1280, 386], [1280, 650], [1120, 668], [950, 612], [700, 578]], deskY: 545, tick: [800, 445],
      mu: [335, 225], mc: [520, 362], pr: [1212, 402, 100], pl: [38, 92, 112, 72],
      S: { door: [330, 545], desk: [930, 538], deskEntry: [640, 525], window: [600, 495], hatch: [470, 600], hatchAp: [320, 612], p1: [380, 600], p2: [640, 612], opp: [178, 512], oppIn: [270, 540] } },
    "e2-L": { w: 1280, h: 720, hk: [0.745, 0], door: [50, 25, 244, 531], glass: [344, 56, 531, 388],
      occ: [[655, 336], [1000, 352], [1215, 400], [1215, 600], [1060, 640], [960, 645], [690, 550]], deskY: 560, tick: [830, 458],
      mu: [318, 250], mc: [500, 444], pr: [1168, 405, 80], pl: [40, 175, 165, 64],
      S: { door: [350, 590], desk: [850, 555], deskEntry: [600, 545], window: [560, 520], hatch: [455, 608], hatchAp: [300, 620], p1: [380, 612], p2: [640, 622], opp: [172, 556], oppIn: [260, 580] } },
    "e3-L": { w: 1280, h: 720, hk: [0.70, 0], door: [106, 50, 169, 431], glass: [369, 31, 493, 381],
      occ: [[675, 360], [1210, 385], [1210, 560], [1000, 590], [700, 480]], deskY: 520, tick: [850, 435],
      mu: [322, 230], mc: [500, 396], pr: [1160, 392, 84], pl: [30, 118, 110, 40],
      S: { door: [330, 515], desk: [900, 515], deskEntry: [620, 505], window: [600, 470], hatch: [455, 592], hatchAp: [310, 604], p1: [360, 590], p2: [640, 600], opp: [190, 481], oppIn: [270, 505] } },
    "e1-P": { w: 720, h: 1280, hk: [0.62, 10], door: [12, 106, 151, 506], glass: [244, 250, 325, 212],
      occ: [[412, 503], [720, 515], [720, 820], [650, 790], [480, 705], [420, 670]], deskY: 680, tick: [520, 585],
      mu: [190, 205], mc: [405, 252, 1], pr: [300, 484, 68], pl: [36, 88, 86, 62],
      S: { door: [235, 650], desk: [575, 675], deskEntry: [345, 700], window: [400, 650], hatch: [330, 950], hatchAp: [160, 960], p1: [210, 830], p2: [470, 900], opp: [88, 612], oppIn: [160, 660] } },
    "e2-P": { w: 720, h: 1280, hk: [0.66, 10], door: [25, 50, 163, 575], glass: [222, 87, 353, 425],
      occ: [[365, 478], [600, 470], [720, 490], [720, 700], [590, 728], [385, 622]], deskY: 640, tick: [480, 555],
      mu: [200, 170], mc: [380, 102, 0], pr: [268, 522, 62], pl: [30, 175, 112, 58],
      S: { door: [250, 670], desk: [560, 635], deskEntry: [330, 680], window: [400, 640], hatch: [330, 950], hatchAp: [160, 960], p1: [210, 830], p2: [470, 900], opp: [106, 625], oppIn: [180, 670] } },
    "e3-P": { w: 720, h: 1280, hk: [0.60, 10], door: [19, 144, 106, 531], glass: [187, 87, 388, 513],
      occ: [[398, 560], [720, 575], [720, 790], [620, 785], [410, 700]], deskY: 720, tick: [505, 615],
      mu: [150, 205], mc: [330, 150, 0], pr: [300, 602, 62], pl: [14, 122, 74, 30],
      S: { door: [205, 710], desk: [585, 715], deskEntry: [330, 745], window: [390, 700], hatch: [330, 960], hatchAp: [160, 970], p1: [210, 860], p2: [470, 930], opp: [72, 675], oppIn: [140, 720] } }
  };
  var IDS = ["mara", "reid", "julian", "cassius", "imani", "soren"];
  var SAY = {
    deal: ["Done. Wire it.", "Sign it before they read it.", "Put it on the tab.", "Pleasure doing business."],
    calm: ["Make it go away.", "Smooth it over."],
    door: ["Let's talk.", "Come in, come in!"], doorBad: ["Now's not great…", "Who let them up?"],
    window: ["That's… new.", "Is that smoke?"], panic: ["We're fine! Fine!", "Buy! Sell! Something!"]
  };
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function rm() { try { return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }
  function el(tag, cls, parent) { var n = document.createElement(tag); if (cls) n.className = cls; if (parent) parent.appendChild(n); return n; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var O = { stage: null, world: null, key: null, layout: null, exec: null, era: 0, A: null, st: { x: 0, y: 0, face: 1, pose: "idle", hidden: false },
    q: [], busy: false, snap: null, mood: "confident", lastAct: 0, token: 0, skip: false, loaded: {} };

  function exKey(id) { return IDS.indexOf(id) >= 0 ? id : "mara"; }
  function build() {
    var s = el("div", "o4-stage"); s.setAttribute("aria-hidden", "true");
    O.fillL = el("i", "o4-fill o4-fl", s); O.fillR = el("i", "o4-fill o4-fr", s);
    var w = O.world = el("div", "o4-world", s);
    O.plate = el("div", "o4-plate", w);
    O.glass = el("div", "o4-glass of-glass", w); el("i", "o4-sky", O.glass);
    O.door = el("div", "o4-door", w); O.hall = el("i", "o4-hall", O.door); O.opp = el("span", "o4-opp", O.door); O.oppImg = el("img", "", O.opp); O.oppImg.alt = ""; O.oppImg.draggable = false;
    O.leaf = el("i", "o4-leaf", O.door); O.gap = el("i", "o4-gap", O.door);
    /* the executive's name on the door: gold leaf (1978), brushed steel (2008), engraved gold (Today); it swings with the leaf */
    O.plaque = el("span", "o4-plaque", O.leaf); O.plN = el("b", "", O.plaque); O.plF = el("small", "", O.plaque);
    /* a firm keepsake on the desk, per executive and era */
    O.prop = el("img", "o4-prop", w); O.prop.alt = ""; O.prop.draggable = false;
    O.knock = el("span", "o4-knock", s);
    O.hatch = el("div", "o4-hatch", w); O.hglow = el("i", "o4-hglow", O.hatch);
    /* live faces on the painted fixtures: U (unrest) and C (collapse) on wall / window, so people pass in front; K (cash) on the desk */
    /* the painted housing is re-laid over the window glass (the city view is its own layer) so the glass never hides a fixture */
    O.patch = {}; ["U", "C", "K"].forEach(function (k) { O.patch[k] = el("div", "o4-occ o4-patch", w); });
    O.face = {}; ["U", "C", "K"].forEach(function (k) { var f = el("div", "o4-face o4-f" + k, w); f.setAttribute("aria-hidden", "true"); f.innerHTML = '<span class="o4-scr"><i class="o4-ndl"></i><b class="o4-num"></b><small class="o4-lab"></small><span class="o4-bar"><i></i></span></span>'; O.face[k] = f; });
    O.occ = el("div", "o4-occ", w);
    O.ex = el("div", "o4-ex", w); O.shadow = el("i", "o4-shadow", O.ex); O.body = el("div", "o4-body", O.ex); O.spr = el("i", "o4-spr", O.body);
    O.bub = el("span", "o4-bub", s);
    /* the stage is re-attached on every desk render, which would replay a finished knock: drop the class once it has played */
    O.knock.addEventListener("animationend", function () { O.knock.classList.remove("show"); });
    O.stage = s;
    if (root.ResizeObserver) { O.ro = new ResizeObserver(function () { layout(); }); }
    return s;
  }
  function heightAt(y) { var R = O.R; return R.hk[0] * y + R.hk[1]; }
  function setEra(era, exec, lay) {
    var key = exec + "-e" + era, rk = "e" + era + "-" + lay;
    if (O.key === key && O.rk === rk) return false;
    var first = !O.key, sameRoom = O.rk === rk;
    O.key = key; O.rk = rk; O.R = ROOMS[rk]; O.A = LD.O4_ATLAS && LD.O4_ATLAS[key]; O.era = era; O.exec = exec;
    var R = O.R, url = BASE + "room-e" + era + "-" + lay + ".webp";
    O.world.style.width = R.w + "px"; O.world.style.height = R.h + "px";
    O.plate.style.backgroundImage = "url(" + url + ")";
    O.fillL.style.backgroundImage = O.fillR.style.backgroundImage = "url(" + url + ")";
    function box(n, r) { n.style.left = r[0] + "px"; n.style.top = r[1] + "px"; n.style.width = r[2] + "px"; n.style.height = r[3] + "px"; }
    box(O.glass, R.glass); box(O.door, R.door);
    O.leaf.style.backgroundImage = "url(" + url + ")"; O.leaf.style.backgroundSize = R.w + "px " + R.h + "px"; O.leaf.style.backgroundPosition = (-R.door[0]) + "px " + (-R.door[1]) + "px";
    var hw = lay === "P" ? 300 : 240, hh = hw * 0.6;
    box(O.hatch, [R.S.hatch[0] - hw / 2, R.S.hatch[1] - hh / 2 - (lay === "P" ? 30 : 0), hw, hh]);
    O.hatch.style.backgroundImage = "url(" + BASE + "hatch-" + exec + ".webp)";
    O.prop.src = BASE + "props/" + exec + "-e" + era + ".webp";
    setFaces(FACES[rk] || {}, url);
    O.prop.style.left = R.pr[0] + "px"; O.prop.style.top = (R.pr[1] - R.pr[2]) + "px"; O.prop.style.height = R.pr[2] + "px";
    box(O.plaque, R.pl);
    var EX = LD.execById ? LD.execById(exec) : null;
    O.plN.textContent = EX ? EX.name.replace(/^Dr\. /, "Dr ") : ""; O.plF.textContent = EX ? EX.firm : "";
    O.occ.style.backgroundImage = "url(" + url + ")"; O.occ.style.clipPath = "polygon(" + R.occ.map(function (p) { return p[0] + "px " + p[1] + "px"; }).join(",") + ")";
    O.occ.style.width = R.w + "px"; O.occ.style.height = R.h + "px";
    if (O.A) O.spr.style.backgroundImage = "url(" + BASE + key + ".webp)";
    O.stage.dataset.era = era; O.stage.dataset.lay = lay; O.stage.dataset.exec = exec;
    if (first || !sameRoom) { var d = R.S.desk; O.st.x = d[0]; O.st.y = d[1]; O.st.face = 1; O.st.hidden = false; O.st.pose = poseFor(); }
    return !first;
  }
  /* Fit the plate to the room box: fit height; crop the sides a little on tall panels, extend the edge walls on wide strips. */
  function layout() {
    if (!O.stage || !O.stage.parentNode || !O.R) return;
    var room = O.stage.parentNode.closest ? O.stage.parentNode.closest(".of-room") : null; if (!room) return;
    var W = room.clientWidth, H = room.clientHeight; if (!W || !H) return;
    var lay = W / H < 1 ? "P" : "L";
    if (O.R && O.rk.slice(-1) !== lay) { setEra(O.era, O.exec, lay); }
    var R = O.R, s = H / R.h;
    /* very wide strips (tablet portrait): zoom in a little, trimming ceiling and floor edge but never the desk-height head or the hatch */
    if (lay === "L" && R.w * s < W) s = Math.min(W / R.w, H / (R.h * 0.74));
    /* wide side panels (desktop): fill the width and trim the empty floor at the bottom rather than show edge strips */
    if (lay === "P" && R.w * s < W) s = Math.min(W / R.w, H / (R.h * 0.8));
    var pw = R.w * s, ph = R.h * s, ox;
    if (pw > W) ox = lay === "P" ? -(pw - W) * 0.3 : -(pw - W) / 2; else ox = (W - pw) / 2;
    var oy = H - ph; oy = oy > 0 ? oy / 2 : oy * (lay === "P" ? 0.3 : 0.6);
    O.s = s; O.ox = ox; O.oy = oy;
    O.world.style.transform = "translate(" + ox.toFixed(1) + "px," + oy.toFixed(1) + "px) scale(" + s.toFixed(4) + ")";
    var fw = Math.max(0, ox);
    [O.fillL, O.fillR].forEach(function (f, i) {
      f.style.width = Math.ceil(fw + 1) + "px"; f.style.display = fw > 1 ? "block" : "none";
      /* stretch a 3% slice of the plate's edge wall across the gap */
      f.style.backgroundSize = Math.ceil((fw + 1) / 0.03) + "px " + ph + "px";
      f.style.backgroundPosition = (i ? "100%" : "0") + " " + oy + "px";
    });
    O.W = W; O.H = H;
    O.knock.style.left = Math.max(44, px(R.door[0] + R.door[2] * 0.5, "x")).toFixed(0) + "px"; O.knock.style.top = Math.max(H < 200 ? H * 0.5 : 14, px(R.door[1] + R.door[3] * 0.3, "y")).toFixed(0) + "px";
    placeMeters(room);
    draw();
  }
  function px(v, axis) { return axis === "x" ? O.ox + v * O.s : O.oy + v * O.s; }
  /* rect (0,0,w,h) -> quad as a CSS matrix3d, so a face's content lies in the painting's perspective */
  function quadMatrix(w, h, q) {
    var x0 = q[0][0], y0 = q[0][1], x1 = q[1][0], y1 = q[1][1], x2 = q[2][0], y2 = q[2][1], x3 = q[3][0], y3 = q[3][1];
    var dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    var g = 0, hh = 0, den = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(sx) > 1e-6 || Math.abs(sy) > 1e-6) { g = (sx * dy2 - dx2 * sy) / den; hh = (dx1 * sy - sx * dy1) / den; }
    var a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3;
    a /= w; d /= w; g /= w; b /= h; e /= h; hh /= h;
    return "matrix3d(" + [a, d, 0, g, b, e, 0, hh, 0, 0, 1, 0, x0, y0, 0, 1].map(function (v) { return +v.toFixed(6); }).join(",") + ")";
  }
  function setFaces(FS, url) {
    ["U", "C", "K"].forEach(function (k) {
      var f = O.face[k], g = FS[k], pt = O.patch[k]; pt.style.display = f.style.display = g ? "" : "none"; if (!g) return;
      pt.style.backgroundImage = "url(" + url + ")"; pt.style.width = O.R.w + "px"; pt.style.height = O.R.h + "px"; pt.style.zIndex = k === "K" ? 4 : 2;
      if (g.dial) pt.style.clipPath = "circle(" + (g.dial[2] * 1.3).toFixed(1) + "px at " + g.dial[0] + "px " + g.dial[1] + "px)";
      else { var cx = 0, cy = 0; g.quad.forEach(function (p) { cx += p[0] / 4; cy += p[1] / 4; });
        var bw = Math.max.apply(null, g.quad.map(function (p) { return p[0]; })) - Math.min.apply(null, g.quad.map(function (p) { return p[0]; })), bh = Math.max.apply(null, g.quad.map(function (p) { return p[1]; })) - Math.min.apply(null, g.quad.map(function (p) { return p[1]; }));
        var ex = 1 + 36 / bw, ey = 1 + 36 / bh;
        pt.style.clipPath = "polygon(" + g.quad.map(function (p) { return (cx + (p[0] - cx) * ex).toFixed(1) + "px " + (cy + (p[1] - cy) * ey).toFixed(1) + "px"; }).join(",") + ")"; }
      f.classList.toggle("dial", !!g.dial); f.classList.toggle("quad", !g.dial);
      if (g.dial) {
        f._wh = null; var r = g.dial[2]; f.style.width = f.style.height = (2 * r) + "px"; f.style.transform = "translate(" + (g.dial[0] - r) + "px," + (g.dial[1] - r) + "px)";
        f.style.setProperty("--r", r + "px");
      } else {
        var q = g.quad, w = Math.round(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1])), h = Math.round(Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1]));
        f.style.width = w + "px"; f.style.height = h + "px"; f.style.transform = quadMatrix(w, h, q); f.style.setProperty("--h", h + "px"); f.style.setProperty("--w", w + "px"); f._wh = [w, h];
      }
    });
  }
  function setFace(k, val, txt, lvl, label) {
    var f = O.face && O.face[k]; if (!f) return;
    var n = f.querySelector(".o4-num"); n.textContent = txt;
    /* quads: the figure takes as much of the painted screen as it can (phones), by its length */
    if (f.classList.contains("quad") && f._wh) { var w = f._wh[0], h = f._wh[1], len = Math.max(2, txt.length), sp = k === "C" ? [0.8, 0.5] : k === "K" ? [0.66, 0.92] : [0.6, 0.9];
      n.style.fontSize = Math.min(h * sp[0], w * sp[1] / (len * 0.62)).toFixed(1) + "px"; } else n.style.fontSize = ""; f.querySelector(".o4-lab").textContent = label || "";
    f.style.setProperty("--v", Math.max(0, Math.min(100, val)));
    f.classList.remove("lvl-ok", "lvl-warn", "lvl-danger"); f.classList.add("lvl-" + (lvl || "ok"));
  }
  /* the real meters stay in the DOM for taps, focus and screen readers: an invisible hit area over each painted face */
  function placeMeters(room) {
    room.dataset.o4sz = room.clientHeight < 200 ? "s" : room.clientHeight < 420 ? "m" : "l";
    if (O.era) room.dataset.o4era = O.era;
    var a = room.getBoundingClientRect();
    [[room.querySelector(".m-unrest"), "U"], [room.querySelector(".m-collapse"), "C"], [room.querySelector(".m-cash"), "K"]].forEach(function (p) {
      var m = p[0], f = O.face[p[1]]; if (!m || !f || f.style.display === "none") return;
      var b = f.getBoundingClientRect(), pad = 4;
      m.classList.add("o4-hit");
      m.style.setProperty("left", Math.round(b.left - a.left - pad) + "px", "important"); m.style.setProperty("top", Math.round(b.top - a.top - pad) + "px", "important");
      m.style.setProperty("width", Math.round(b.width + 2 * pad) + "px", "important"); m.style.setProperty("height", Math.round(b.height + 2 * pad) + "px", "important");
      m.style.setProperty("right", "auto", "important"); m.style.setProperty("bottom", "auto", "important"); m.style.setProperty("transform", "none", "important");
    });
  }
  function frame(p) { var F = O.A && O.A.f; if (!F) return null; return F[p] || F.idle; }
  function draw() {
    if (!O.A || !O.R) return;
    var st = O.st, f = frame(st.pose), r = f.r, h = heightAt(st.y), k = h / O.A.h;
    O.spr.style.width = (r[2] * k).toFixed(1) + "px"; O.spr.style.height = (r[3] * k).toFixed(1) + "px";
    O.spr.style.backgroundSize = (O.A.w * k).toFixed(1) + "px " + (O.A.ht * k).toFixed(1) + "px";
    O.spr.style.backgroundPosition = (-r[0] * k).toFixed(1) + "px " + (-r[1] * k).toFixed(1) + "px";
    var ax = (st.pose === "kneel" && f.hx != null ? f.hx : f.ax) * k;
    O.spr.style.left = (-ax).toFixed(1) + "px"; O.spr.style.transformOrigin = ax.toFixed(1) + "px 100%";
    O.spr.style.transform = st.face < 0 ? "scaleX(-1)" : "none";
    O.ex.style.transform = "translate(" + st.x.toFixed(1) + "px," + st.y.toFixed(1) + "px)";
    O.shadow.style.width = (h * 0.32).toFixed(0) + "px"; O.shadow.style.height = (h * 0.05).toFixed(0) + "px";
    var behind = st.y < O.R.deskY && st.x > O.R.S.deskEntry[0] - 10;
    O.ex.style.zIndex = behind ? 3 : 6; O.occ.style.zIndex = 4; O.prop.style.zIndex = 5; O.face.K.style.zIndex = 5;
    O.ex.style.opacity = st.hidden ? "0" : "";
    O.ex.dataset.pose = st.pose;
    if (O.bub.classList.contains("on")) placeBub();
  }
  function setPose(p) { O.st.pose = p; draw(); }
  function poseFor() { return O.mood === "panic" ? "panic" : O.mood === "nervous" ? "nervous" : "idle"; }
  function walkTo(pt, fast, maxMs) {
    var my = O.token;
    return new Promise(function (res) {
      var st = O.st, sx = st.x, sy = st.y, dx = pt[0] - sx, dy = pt[1] - sy, dist = Math.hypot(dx, dy * 1.4);
      if (dist < 3) { res(); return; }
      if (Math.abs(dx) > 4) st.face = dx < 0 ? -1 : 1;
      if (rm() || O.skip) { st.x = pt[0]; st.y = pt[1]; draw(); res(); return; }
      var sp = (O.R.w > 1000 ? 1 : 0.9) * (fast ? 520 : 300), dur = dist / sp * 1000; if (maxMs) dur = Math.min(dur, maxMs);
      var t0 = performance.now(), fps = fast ? 14 : 10;
      O.ex.classList.add("walking");
      function step(now) {
        if (my !== O.token) { O.ex.classList.remove("walking"); res(); return; }
        var t = Math.min(1, (now - t0) / dur);
        st.x = sx + dx * t; st.y = sy + dy * t;
        var ph = (now - t0) / 1000 * fps, fr = Math.floor(ph) % 6; st.pose = "walk" + (fr + 1);
        /* 40s squash and stretch: dip on the down beat, spring on the up beat, a little lean into the stride */
        var w = Math.sin(Math.PI * 2 * ph / 3), sq = 1 + 0.07 * w, bob = Math.max(0, w) * 0.035;
        O.body.style.transform = "translateY(" + (-bob * 100).toFixed(1) + "%) scale(" + (2 - sq).toFixed(3) + "," + sq.toFixed(3) + ") rotate(" + (st.face * (fast ? 4 : 1.5)).toFixed(1) + "deg)";
        draw();
        if (t < 1) requestAnimationFrame(step); else { O.body.style.transform = ""; O.ex.classList.remove("walking"); res(); }
      }
      requestAnimationFrame(step);
    });
  }
  function atDesk() { var d = O.R.S.desk; return Math.abs(O.st.x - d[0]) < 4 && Math.abs(O.st.y - d[1]) < 4; }
  async function go(spot, fast, maxMs) {
    var S = O.R.S, tgt = S[spot];
    if (spot !== "desk" && atDesk()) await walkTo(S.deskEntry, fast, maxMs && maxMs / 2);
    else if (spot === "desk" && !atDesk()) await walkTo(S.deskEntry, fast, maxMs && maxMs / 2);
    await walkTo(tgt, fast, maxMs && maxMs / 2);
  }
  function hold(p, face) { if (face) O.st.face = face; setPose(p); }
  function placeBub() {
    var st = O.st, top = px(st.y - heightAt(st.y), "y") - 4, bw = O.bub.offsetWidth || 80, bh = O.bub.offsetHeight || 20, x = px(st.x, "x"), W = O.W || 300;
    if ((O.H || 200) < 200) {
      /* short strip: the pills own the top edge, so the bubble sits beside the head */
      top = Math.max(40 + bh, top + bh + 6);
      var side = x + bw / 2 + 14 < W ? 1 : -1; x += side * (bw / 2 + 12);
    }
    x = Math.max(bw / 2 + 3, Math.min(W - bw / 2 - 3, x));
    O.bub.style.left = x.toFixed(0) + "px"; O.bub.style.top = Math.max((O.bub.offsetHeight || 20) + 2, top).toFixed(0) + "px";
  }
  function say(t, ms) { if (!t) return; O.bub.textContent = t; O.bub.classList.add("on"); placeBub(); clearTimeout(say.t); say.t = setTimeout(function () { O.bub.classList.remove("on"); }, ms || 1500); }
  function wait(ms) { return O.skip || rm() ? Promise.resolve() : sleep(ms); }
  function enqueue(name, fn) { O.q.push({ name: name, fn: fn }); pump(); }
  async function pump() {
    if (O.busy) return; O.busy = true;
    while (O.q.length) { var j = O.q.shift(); try { await j.fn(); } catch (e) { if (root.console) console.warn(e); } O.lastAct = Date.now(); }
    O.busy = false;
  }
  function home() { return go("desk").then(function () { hold(poseFor(), 1); }); }

  /* ---------- public hooks ---------- */
  var API = {};
  API.active = function () { return !!(O.stage && O.stage.isConnected && O.A); };
  API.mount = function (state) {
    var slot = document.querySelector(".desk .office .of-room.o4 .o4-slot");
    if (!slot || !state) return;
    if (!O.stage) build();
    var room = slot.parentNode;
    var era = Math.max(1, Math.min(3, LD.eraOf ? LD.eraOf(state) : 3)), exec = exKey(state.executiveId);
    var lay = room.clientWidth / Math.max(1, room.clientHeight) < 1 ? "P" : "L";
    O.mood = LD.execMood ? LD.execMood(state) : "confident";
    var swapped = setEra(era, exec, O.rk ? O.rk.slice(-1) === lay ? lay : lay : lay);
    slot.parentNode.replaceChild(O.stage, slot);
    if (O.ro) { try { O.ro.disconnect(); O.ro.observe(room); } catch (e) {} }
    O.ex.setAttribute("aria-hidden", "true");
    room.setAttribute("aria-label", (LD.execById ? LD.execById(state.executiveId).name : "") + ", " + ({ confident: "confident", nervous: "nervous", panic: "panicking" })[O.mood]);
    /* meters on props */
    var fm = LD.formatMoney || function (v) { return "$" + v + "M"; }, lv = LD.resLevel || function () { return "ok"; };
    setFace("U", state.unrest, String(state.unrest), lv("unrest", state.unrest), "UNREST");
    setFace("C", state.collapse, String(state.collapse), lv("collapse", state.collapse), "COLLAPSE");
    setFace("K", Math.min(100, state.cash), fm(state.cash), lv("cash", state.cash), "");
    room.dataset.o4era = era;
    var door = LD.doorLevel ? LD.doorLevel(state) : 0, city = LD.cityStage ? LD.cityStage(state) : 0;
    O.knock.textContent = door >= 3 ? "BANG BANG!" : door >= 2 ? "KNOCK KNOCK" : "tap tap";
    O.stage.className = "o4-stage door-" + door + " city-" + city + " mood-" + O.mood + (rm() ? " o4-rm" : "");
    layout();
    var prev = O.snap; O.snap = { turn: state.turn, door: door, city: city, era: era, exec: exec, mood: O.mood };
    if (O.st.hidden && !O.busy && !(state.fy && state.fy.fight)) { O.st.hidden = false; O.st.x = O.R.S.door[0]; O.st.y = O.R.S.door[1]; draw(); enqueue("back", home); }
    if (!prev || swapped) { if (!O.busy) { O.st.pose = poseFor(); draw(); } if (swapped && prev) enqueue("newera", async function () { hold("snap"); say(era === 2 ? "2008. Fresh suit." : era === 3 ? "Welcome to the top." : "", 1600); await wait(1400); hold(poseFor()); }); return; }
    if (city > prev.city && !(state.fy && state.fy.fight)) enqueue("city", async function () { await go("window"); hold("back", 1); await wait(1500); hold("nervous"); say(pick(SAY.window), 1200); await wait(900); await home(); });
    if (door > prev.door) enqueue("tier", async function () { API.knock(door); if (door >= 3) { hold("nervous", -1); say(pick(SAY.doorBad), 1200); await wait(1200); } hold(poseFor()); });
    if (O.mood !== prev.mood && !O.busy) { O.st.pose = O.st.pose.indexOf("walk") === 0 ? O.st.pose : poseFor(); draw(); }
  };
  API.knock = function (lv) {
    if (!O.stage) return; var k = O.knock; k.classList.remove("show"); void k.offsetWidth; k.classList.add("show"); clearTimeout(API.kt); API.kt = setTimeout(function () { k.classList.remove("show"); }, 1000);
    O.door.classList.remove("knocking"); void O.door.offsetWidth; O.door.classList.add("knocking"); setTimeout(function () { O.door.classList.remove("knocking"); }, 700);
  };
  API.on = function (kind, state) {
    if (!API.active()) return;
    if (kind === "deal") enqueue("deal", async function () { await go("desk", true, 900); hold("phone", 1); say(pick(SAY.deal), 1100); await wait(state && state.fy && state.fy.fight ? 500 : 1300); hold(poseFor()); });
    else if (kind === "bunker") enqueue("bunker", async function () {
      var S = O.R.S; await go("hatchAp", true, 1100); O.st.face = 1;
      var f = frame("kneel"), off = f && f.hx != null ? 0 : 0; await walkTo([S.hatch[0] - 10 + off, S.hatch[1] - 6], false, 500);
      hold("kneel", 1); O.hatch.classList.add("on"); await wait(1500); O.hatch.classList.remove("on"); await home(); });
    else if (kind === "endq") enqueue("endq", async function () { await go("window", true, 900); hold("back", 1); await wait(1400); });
  };
  API.react = function (kind) {
    if (!API.active() || O.busy) return;
    enqueue("react", async function () { hold(kind === "glee" ? "snap" : "panic"); O.ex.classList.add(kind === "glee" ? "o4-glee" : "o4-shock"); await wait(900); O.ex.classList.remove("o4-glee", "o4-shock"); hold(poseFor()); });
  };
  /* Fight entrance: knock, walk to the door, open it, the visitor steps in (or the executive leaves for an away fight). ~2.3 s. */
  API.entrance = function (E, done) {
    if (!API.active() || !E) { done(false); return null; }
    O.q.length = 0; O.token++; O.skip = false; var my = O.token, ended = false;
    var R = O.R, S = R.S;
    O.oppImg.src = E.opp || ""; var oh = heightAt(S.opp[1]) * 0.98; O.opp.style.height = oh + "px"; O.opp.style.width = (oh * (E.ar || 0.6)) + "px";
    O.opp.style.left = (S.opp[0] - R.door[0] - oh * (E.ar || 0.6) / 2) + "px"; O.opp.style.top = (S.opp[1] - R.door[1] - oh) + "px";
    O.stage.classList.add(E.away ? "o4-away" : "o4-visit");
    function finish(skipped) { if (ended) return; ended = true; O.skip = false;
      O.stage.classList.remove("o4-open", "o4-in", "o4-away", "o4-visit", "o4-out"); O.oppImg.removeAttribute("src");
      if (E.away) { O.st.hidden = true; } O.busy = false; done(true, skipped); }
    O.busy = true;
    (async function () {
      API.knock(LD.doorLevel ? 2 : 2);
      await go("door", true, 900); if (my !== O.token) return;
      hold("door", -1); await wait(250);
      O.stage.classList.add("o4-open"); await wait(350);
      if (!E.away) { O.stage.classList.add("o4-in"); await wait(300); hold(O.mood === "confident" ? "idle" : "nervous", -1); say(pick(O.mood === "confident" ? SAY.door : SAY.doorBad), 1000); await wait(800); }
      else { await walkTo([S.opp[0] + 20, S.opp[1] + 4], false, 450); O.stage.classList.add("o4-out"); await wait(700); }
      finish(false);
    })();
    return { skip: function () { O.skip = true; O.token++; finish(true); } };
  };
  /* test hook (real-input placement shots): stand at a named spot in a pose */
  API.debugSpot = function (spot, pose) { if (!O.R || !O.R.S[spot]) return false; O.frozen = true; O.token++; O.q.length = 0; O.st.hidden = false; O.st.x = O.R.S[spot][0]; O.st.y = O.R.S[spot][1]; O.st.pose = pose || "idle"; draw(); if (spot === "hatch") O.hatch.classList.add("on"); else O.hatch.classList.remove("on"); return true; };
  API.afterFight = function () { if (!O.stage) return; if (!O.st.hidden) enqueue("back", home); };
  /* idle life: small fidgets by mood; pacing in a panic */
  setInterval(function () {
    if (!API.active() || O.busy || O.q.length || document.hidden || rm() || O.frozen) return;
    var desk = document.querySelector(".desk"); if (!desk || desk.closest(".screen[hidden]")) return;
    var idle = Date.now() - O.lastAct;
    if (O.mood === "panic") { if (idle > 2500) enqueue("pace", async function () { await go(Math.random() < 0.5 ? "p1" : "p2", true); hold("panic"); say(Math.random() < 0.3 ? pick(SAY.panic) : "", 1100); await wait(1200); }); return; }
    if (idle < (O.mood === "nervous" ? 5000 : 8000)) return;
    var r = Math.random();
    if (O.mood === "nervous") enqueue("fid", async function () { hold(r < 0.5 ? "tap" : "watch"); await wait(1600); if (r > 0.8) { await go("window"); hold("back", 1); await wait(1200); await home(); } else hold("nervous"); });
    else enqueue("fid", async function () {
      if (r < 0.18) { await go("window"); hold("back", 1); await wait(1800); await home(); return; }
      if (r < 0.3) { await go("p2"); hold("watch"); await wait(1200); await home(); return; }
      hold(["snap", "watch", "tap", "phone"][Math.floor(Math.random() * 4)]); await wait(1700); hold("idle"); });
  }, 1500);
  LD.O4 = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
