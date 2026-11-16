
/* Last Dividend — seeded PRNG (Mulberry32). Browser + Node. */
(function (root) {
  var LD = root.LD || (root.LD = {});

  function hashString(str) {
    var h = 2166136261 >>> 0;
    var s = String(str);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function normalizeSeed(seed) {
    if (seed == null || seed === "") {
      return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
    }
    if (typeof seed === "number" && isFinite(seed)) {
      return (seed >>> 0) || 1;
    }
    var s = String(seed).trim();
    /* The seed field in the UI is always a string. "1" must equal 1, not a hash. */
    if (/^[0-9]+$/.test(s)) {
      var parsed = parseInt(s, 10);
      if (parsed <= 0xFFFFFFFF) return (parsed >>> 0) || 1;
    }
    return hashString(s) || 1;
  }

  function createRng(seed) {
    var a = normalizeSeed(seed);
    function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    next.state = function () {
      return a;
    };
    next.int = function (n) {
      return Math.floor(next() * n);
    };
    next.pick = function (arr) {
      return arr[next.int(arr.length)];
    };
    next.shuffle = function (arr) {
      var a2 = arr.slice();
      for (var i = a2.length - 1; i > 0; i--) {
        var j = next.int(i + 1);
        var tmp = a2[i];
        a2[i] = a2[j];
        a2[j] = tmp;
      }
      return a2;
    };
    next.fork = function () {
      return createRng(next.int(0xffffffff) || 1);
    };
    return next;
  }

  LD.hashString = hashString;
  LD.normalizeSeed = normalizeSeed;
  LD.createRng = createRng;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { hashString: hashString, normalizeSeed: normalizeSeed, createRng: createRng };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);

  