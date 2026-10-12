var Wb = Object.create, pg = Object.defineProperty, Kb = Object.getOwnPropertyDescriptor, Jb = Object.getOwnPropertyNames, e_ = Object.getPrototypeOf, t_ = Object.prototype.hasOwnProperty, Ht = (t, a) => () => (a || t((a = { exports: {} }).exports, a), a.exports), n_ = (t, a, r, o) => {
  if (a && typeof a == "object" || typeof a == "function")
    for (var u = Jb(a), f = 0, d = u.length, h; f < d; f++)
      h = u[f], !t_.call(t, h) && h !== r && pg(t, h, {
        get: ((p) => a[p]).bind(null, h),
        enumerable: !(o = Kb(a, h)) || o.enumerable
      });
  return t;
}, Sf = (t, a, r) => (r = t != null ? Wb(e_(t)) : {}, n_(a || !t || !t.__esModule ? pg(r, "default", {
  value: t,
  enumerable: !0
}) : r, t));
function a_(t) {
  return /(?:^|\s)CodexBrowser(?:\/|\s|$)/i.test(t ?? "");
}
function gg(t) {
  return /iPad|iPhone|iPod/.test(t);
}
function i_(t) {
  return /Android/.test(t);
}
function r_(t) {
  return gg(t) && t.includes("CriOS");
}
function l_(t) {
  return gg(t) || i_(t) || r_(t);
}
var o_ = [
  "; wv",
  "webview",
  "fbav",
  "fb_iab",
  "fban",
  "instagram",
  "line/",
  "kakaotalk",
  "snapchat",
  "tiktok"
];
function u_(t) {
  const a = t.trim();
  if (!a) return !1;
  const r = /iPhone|iPad|iPod/.test(a), o = /Android/.test(a), u = r && !/Safari/.test(a), f = o && /Version\/\d+\.\d+/.test(a), d = o_.some((h) => a.toLowerCase().includes(h));
  return u || f || d;
}
function c_(t) {
  return a_(t) || u_(t ?? "");
}
function yg(t) {
  var a, r, o = "";
  if (typeof t == "string" || typeof t == "number") o += t;
  else if (typeof t == "object") if (Array.isArray(t)) {
    var u = t.length;
    for (a = 0; a < u; a++) t[a] && (r = yg(t[a])) && (o && (o += " "), o += r);
  } else for (r in t) t[r] && (o && (o += " "), o += r);
  return o;
}
function an() {
  for (var t, a, r = 0, o = "", u = arguments.length; r < u; r++) (t = arguments[r]) && (a = yg(t)) && (o && (o += " "), o += a);
  return o;
}
var s_ = /* @__PURE__ */ Ht(((t) => {
  var a = /* @__PURE__ */ Symbol.for("react.transitional.element"), r = /* @__PURE__ */ Symbol.for("react.portal"), o = /* @__PURE__ */ Symbol.for("react.fragment"), u = /* @__PURE__ */ Symbol.for("react.strict_mode"), f = /* @__PURE__ */ Symbol.for("react.profiler"), d = /* @__PURE__ */ Symbol.for("react.consumer"), h = /* @__PURE__ */ Symbol.for("react.context"), p = /* @__PURE__ */ Symbol.for("react.forward_ref"), g = /* @__PURE__ */ Symbol.for("react.suspense"), v = /* @__PURE__ */ Symbol.for("react.memo"), b = /* @__PURE__ */ Symbol.for("react.lazy"), E = /* @__PURE__ */ Symbol.for("react.activity"), S = Symbol.iterator;
  function O(C) {
    return C === null || typeof C != "object" ? null : (C = S && C[S] || C["@@iterator"], typeof C == "function" ? C : null);
  }
  var T = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, R = Object.assign, L = {};
  function j(C, Y, W) {
    this.props = C, this.context = Y, this.refs = L, this.updater = W || T;
  }
  j.prototype.isReactComponent = {}, j.prototype.setState = function(C, Y) {
    if (typeof C != "object" && typeof C != "function" && C != null) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, C, Y, "setState");
  }, j.prototype.forceUpdate = function(C) {
    this.updater.enqueueForceUpdate(this, C, "forceUpdate");
  };
  function G() {
  }
  G.prototype = j.prototype;
  function N(C, Y, W) {
    this.props = C, this.context = Y, this.refs = L, this.updater = W || T;
  }
  var X = N.prototype = new G();
  X.constructor = N, R(X, j.prototype), X.isPureReactComponent = !0;
  var B = Array.isArray;
  function I() {
  }
  var H = {
    H: null,
    A: null,
    T: null,
    S: null
  }, K = Object.prototype.hasOwnProperty;
  function ne(C, Y, W) {
    var ae = W.ref;
    return {
      $$typeof: a,
      type: C,
      key: Y,
      ref: ae !== void 0 ? ae : null,
      props: W
    };
  }
  function J(C, Y) {
    return ne(C.type, Y, C.props);
  }
  function ee(C) {
    return typeof C == "object" && C !== null && C.$$typeof === a;
  }
  function he(C) {
    var Y = {
      "=": "=0",
      ":": "=2"
    };
    return "$" + C.replace(/[=:]/g, function(W) {
      return Y[W];
    });
  }
  var de = /\/+/g;
  function ge(C, Y) {
    return typeof C == "object" && C !== null && C.key != null ? he("" + C.key) : Y.toString(36);
  }
  function Q(C) {
    switch (C.status) {
      case "fulfilled":
        return C.value;
      case "rejected":
        throw C.reason;
      default:
        switch (typeof C.status == "string" ? C.then(I, I) : (C.status = "pending", C.then(function(Y) {
          C.status === "pending" && (C.status = "fulfilled", C.value = Y);
        }, function(Y) {
          C.status === "pending" && (C.status = "rejected", C.reason = Y);
        })), C.status) {
          case "fulfilled":
            return C.value;
          case "rejected":
            throw C.reason;
        }
    }
    throw C;
  }
  function k(C, Y, W, ae, ve) {
    var fe = typeof C;
    (fe === "undefined" || fe === "boolean") && (C = null);
    var we = !1;
    if (C === null) we = !0;
    else switch (fe) {
      case "bigint":
      case "string":
      case "number":
        we = !0;
        break;
      case "object":
        switch (C.$$typeof) {
          case a:
          case r:
            we = !0;
            break;
          case b:
            return we = C._init, k(we(C._payload), Y, W, ae, ve);
        }
    }
    if (we) return ve = ve(C), we = ae === "" ? "." + ge(C, 0) : ae, B(ve) ? (W = "", we != null && (W = we.replace(de, "$&/") + "/"), k(ve, Y, W, "", function(St) {
      return St;
    })) : ve != null && (ee(ve) && (ve = J(ve, W + (ve.key == null || C && C.key === ve.key ? "" : ("" + ve.key).replace(de, "$&/") + "/") + we)), Y.push(ve)), 1;
    we = 0;
    var tt = ae === "" ? "." : ae + ":";
    if (B(C)) for (var re = 0; re < C.length; re++) ae = C[re], fe = tt + ge(ae, re), we += k(ae, Y, W, fe, ve);
    else if (re = O(C), typeof re == "function") for (C = re.call(C), re = 0; !(ae = C.next()).done; ) ae = ae.value, fe = tt + ge(ae, re++), we += k(ae, Y, W, fe, ve);
    else if (fe === "object") {
      if (typeof C.then == "function") return k(Q(C), Y, W, ae, ve);
      throw Y = String(C), Error("Objects are not valid as a React child (found: " + (Y === "[object Object]" ? "object with keys {" + Object.keys(C).join(", ") + "}" : Y) + "). If you meant to render a collection of children, use an array instead.");
    }
    return we;
  }
  function $(C, Y, W) {
    if (C == null) return C;
    var ae = [], ve = 0;
    return k(C, ae, "", "", function(fe) {
      return Y.call(W, fe, ve++);
    }), ae;
  }
  function ce(C) {
    if (C._status === -1) {
      var Y = C._result;
      Y = Y(), Y.then(function(W) {
        (C._status === 0 || C._status === -1) && (C._status = 1, C._result = W);
      }, function(W) {
        (C._status === 0 || C._status === -1) && (C._status = 2, C._result = W);
      }), C._status === -1 && (C._status = 0, C._result = Y);
    }
    if (C._status === 1) return C._result.default;
    throw C._result;
  }
  var ye = typeof reportError == "function" ? reportError : function(C) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var Y = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof C == "object" && C !== null && typeof C.message == "string" ? String(C.message) : String(C),
        error: C
      });
      if (!window.dispatchEvent(Y)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", C);
      return;
    }
    console.error(C);
  }, et = {
    map: $,
    forEach: function(C, Y, W) {
      $(C, function() {
        Y.apply(this, arguments);
      }, W);
    },
    count: function(C) {
      var Y = 0;
      return $(C, function() {
        Y++;
      }), Y;
    },
    toArray: function(C) {
      return $(C, function(Y) {
        return Y;
      }) || [];
    },
    only: function(C) {
      if (!ee(C)) throw Error("React.Children.only expected to receive a single React element child.");
      return C;
    }
  };
  t.Activity = E, t.Children = et, t.Component = j, t.Fragment = o, t.Profiler = f, t.PureComponent = N, t.StrictMode = u, t.Suspense = g, t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = H, t.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(C) {
      return H.H.useMemoCache(C);
    }
  }, t.cache = function(C) {
    return function() {
      return C.apply(null, arguments);
    };
  }, t.cacheSignal = function() {
    return null;
  }, t.cloneElement = function(C, Y, W) {
    if (C == null) throw Error("The argument must be a React element, but you passed " + C + ".");
    var ae = R({}, C.props), ve = C.key;
    if (Y != null) for (fe in Y.key !== void 0 && (ve = "" + Y.key), Y) !K.call(Y, fe) || fe === "key" || fe === "__self" || fe === "__source" || fe === "ref" && Y.ref === void 0 || (ae[fe] = Y[fe]);
    var fe = arguments.length - 2;
    if (fe === 1) ae.children = W;
    else if (1 < fe) {
      for (var we = Array(fe), tt = 0; tt < fe; tt++) we[tt] = arguments[tt + 2];
      ae.children = we;
    }
    return ne(C.type, ve, ae);
  }, t.createContext = function(C) {
    return C = {
      $$typeof: h,
      _currentValue: C,
      _currentValue2: C,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, C.Provider = C, C.Consumer = {
      $$typeof: d,
      _context: C
    }, C;
  }, t.createElement = function(C, Y, W) {
    var ae, ve = {}, fe = null;
    if (Y != null) for (ae in Y.key !== void 0 && (fe = "" + Y.key), Y) K.call(Y, ae) && ae !== "key" && ae !== "__self" && ae !== "__source" && (ve[ae] = Y[ae]);
    var we = arguments.length - 2;
    if (we === 1) ve.children = W;
    else if (1 < we) {
      for (var tt = Array(we), re = 0; re < we; re++) tt[re] = arguments[re + 2];
      ve.children = tt;
    }
    if (C && C.defaultProps) for (ae in we = C.defaultProps, we) ve[ae] === void 0 && (ve[ae] = we[ae]);
    return ne(C, fe, ve);
  }, t.createRef = function() {
    return { current: null };
  }, t.forwardRef = function(C) {
    return {
      $$typeof: p,
      render: C
    };
  }, t.isValidElement = ee, t.lazy = function(C) {
    return {
      $$typeof: b,
      _payload: {
        _status: -1,
        _result: C
      },
      _init: ce
    };
  }, t.memo = function(C, Y) {
    return {
      $$typeof: v,
      type: C,
      compare: Y === void 0 ? null : Y
    };
  }, t.startTransition = function(C) {
    var Y = H.T, W = {};
    H.T = W;
    try {
      var ae = C(), ve = H.S;
      ve !== null && ve(W, ae), typeof ae == "object" && ae !== null && typeof ae.then == "function" && ae.then(I, ye);
    } catch (fe) {
      ye(fe);
    } finally {
      Y !== null && W.types !== null && (Y.types = W.types), H.T = Y;
    }
  }, t.unstable_useCacheRefresh = function() {
    return H.H.useCacheRefresh();
  }, t.use = function(C) {
    return H.H.use(C);
  }, t.useActionState = function(C, Y, W) {
    return H.H.useActionState(C, Y, W);
  }, t.useCallback = function(C, Y) {
    return H.H.useCallback(C, Y);
  }, t.useContext = function(C) {
    return H.H.useContext(C);
  }, t.useDebugValue = function() {
  }, t.useDeferredValue = function(C, Y) {
    return H.H.useDeferredValue(C, Y);
  }, t.useEffect = function(C, Y) {
    return H.H.useEffect(C, Y);
  }, t.useEffectEvent = function(C) {
    return H.H.useEffectEvent(C);
  }, t.useId = function() {
    return H.H.useId();
  }, t.useImperativeHandle = function(C, Y, W) {
    return H.H.useImperativeHandle(C, Y, W);
  }, t.useInsertionEffect = function(C, Y) {
    return H.H.useInsertionEffect(C, Y);
  }, t.useLayoutEffect = function(C, Y) {
    return H.H.useLayoutEffect(C, Y);
  }, t.useMemo = function(C, Y) {
    return H.H.useMemo(C, Y);
  }, t.useOptimistic = function(C, Y) {
    return H.H.useOptimistic(C, Y);
  }, t.useReducer = function(C, Y, W) {
    return H.H.useReducer(C, Y, W);
  }, t.useRef = function(C) {
    return H.H.useRef(C);
  }, t.useState = function(C) {
    return H.H.useState(C);
  }, t.useSyncExternalStore = function(C, Y, W) {
    return H.H.useSyncExternalStore(C, Y, W);
  }, t.useTransition = function() {
    return H.H.useTransition();
  }, t.version = "19.2.8";
})), Tf = /* @__PURE__ */ Ht(((t, a) => {
  a.exports = s_();
})), _ = /* @__PURE__ */ Sf(Tf()), Qs = function(t, a) {
  return Qs = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(r, o) {
    r.__proto__ = o;
  } || function(r, o) {
    for (var u in o) Object.prototype.hasOwnProperty.call(o, u) && (r[u] = o[u]);
  }, Qs(t, a);
};
function $t(t, a) {
  if (typeof a != "function" && a !== null) throw new TypeError("Class extends value " + String(a) + " is not a constructor or null");
  Qs(t, a);
  function r() {
    this.constructor = t;
  }
  t.prototype = a === null ? Object.create(a) : (r.prototype = a.prototype, new r());
}
var te = function() {
  return te = Object.assign || function(a) {
    for (var r, o = 1, u = arguments.length; o < u; o++) {
      r = arguments[o];
      for (var f in r) Object.prototype.hasOwnProperty.call(r, f) && (a[f] = r[f]);
    }
    return a;
  }, te.apply(this, arguments);
};
function Pn(t, a) {
  var r = {};
  for (var o in t) Object.prototype.hasOwnProperty.call(t, o) && a.indexOf(o) < 0 && (r[o] = t[o]);
  if (t != null && typeof Object.getOwnPropertySymbols == "function")
    for (var u = 0, o = Object.getOwnPropertySymbols(t); u < o.length; u++) a.indexOf(o[u]) < 0 && Object.prototype.propertyIsEnumerable.call(t, o[u]) && (r[o[u]] = t[o[u]]);
  return r;
}
function nn(t, a, r) {
  if (r || arguments.length === 2)
    for (var o = 0, u = a.length, f; o < u; o++) (f || !(o in a)) && (f || (f = Array.prototype.slice.call(a, 0, o)), f[o] = a[o]);
  return t.concat(f || Array.prototype.slice.call(a));
}
function dn(t, a) {
  var r = a && a.cache ? a.cache : g_, o = a && a.serializer ? a.serializer : v_;
  return (a && a.strategy ? a.strategy : d_)(t, {
    cache: r,
    serializer: o
  });
}
function f_(t) {
  return t == null || typeof t == "number" || typeof t == "boolean";
}
function bg(t, a, r, o) {
  var u = f_(o) ? o : r(o), f = a.get(u);
  return typeof f > "u" && (f = t.call(this, o), a.set(u, f)), f;
}
function _g(t, a, r) {
  var o = Array.prototype.slice.call(arguments, 3), u = r(o), f = a.get(u);
  return typeof f > "u" && (f = t.apply(this, o), a.set(u, f)), f;
}
function Af(t, a, r, o, u) {
  return r.bind(a, t, o, u);
}
function d_(t, a) {
  var r = t.length === 1 ? bg : _g;
  return Af(t, this, r, a.cache.create(), a.serializer);
}
function h_(t, a) {
  return Af(t, this, _g, a.cache.create(), a.serializer);
}
function m_(t, a) {
  return Af(t, this, bg, a.cache.create(), a.serializer);
}
var v_ = function() {
  return JSON.stringify(arguments);
}, p_ = (function() {
  function t() {
    this.cache = /* @__PURE__ */ Object.create(null);
  }
  return t.prototype.get = function(a) {
    return this.cache[a];
  }, t.prototype.set = function(a, r) {
    this.cache[a] = r;
  }, t;
})(), g_ = { create: function() {
  return new p_();
} }, hn = {
  variadic: h_,
  monadic: m_
}, Ae;
(function(t) {
  t[t.EXPECT_ARGUMENT_CLOSING_BRACE = 1] = "EXPECT_ARGUMENT_CLOSING_BRACE", t[t.EMPTY_ARGUMENT = 2] = "EMPTY_ARGUMENT", t[t.MALFORMED_ARGUMENT = 3] = "MALFORMED_ARGUMENT", t[t.EXPECT_ARGUMENT_TYPE = 4] = "EXPECT_ARGUMENT_TYPE", t[t.INVALID_ARGUMENT_TYPE = 5] = "INVALID_ARGUMENT_TYPE", t[t.EXPECT_ARGUMENT_STYLE = 6] = "EXPECT_ARGUMENT_STYLE", t[t.INVALID_NUMBER_SKELETON = 7] = "INVALID_NUMBER_SKELETON", t[t.INVALID_DATE_TIME_SKELETON = 8] = "INVALID_DATE_TIME_SKELETON", t[t.EXPECT_NUMBER_SKELETON = 9] = "EXPECT_NUMBER_SKELETON", t[t.EXPECT_DATE_TIME_SKELETON = 10] = "EXPECT_DATE_TIME_SKELETON", t[t.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE = 11] = "UNCLOSED_QUOTE_IN_ARGUMENT_STYLE", t[t.EXPECT_SELECT_ARGUMENT_OPTIONS = 12] = "EXPECT_SELECT_ARGUMENT_OPTIONS", t[t.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE = 13] = "EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE", t[t.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE = 14] = "INVALID_PLURAL_ARGUMENT_OFFSET_VALUE", t[t.EXPECT_SELECT_ARGUMENT_SELECTOR = 15] = "EXPECT_SELECT_ARGUMENT_SELECTOR", t[t.EXPECT_PLURAL_ARGUMENT_SELECTOR = 16] = "EXPECT_PLURAL_ARGUMENT_SELECTOR", t[t.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT = 17] = "EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT", t[t.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT = 18] = "EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT", t[t.INVALID_PLURAL_ARGUMENT_SELECTOR = 19] = "INVALID_PLURAL_ARGUMENT_SELECTOR", t[t.DUPLICATE_PLURAL_ARGUMENT_SELECTOR = 20] = "DUPLICATE_PLURAL_ARGUMENT_SELECTOR", t[t.DUPLICATE_SELECT_ARGUMENT_SELECTOR = 21] = "DUPLICATE_SELECT_ARGUMENT_SELECTOR", t[t.MISSING_OTHER_CLAUSE = 22] = "MISSING_OTHER_CLAUSE", t[t.INVALID_TAG = 23] = "INVALID_TAG", t[t.INVALID_TAG_NAME = 25] = "INVALID_TAG_NAME", t[t.UNMATCHED_CLOSING_TAG = 26] = "UNMATCHED_CLOSING_TAG", t[t.UNCLOSED_TAG = 27] = "UNCLOSED_TAG";
})(Ae || (Ae = {}));
var Ge;
(function(t) {
  t[t.literal = 0] = "literal", t[t.argument = 1] = "argument", t[t.number = 2] = "number", t[t.date = 3] = "date", t[t.time = 4] = "time", t[t.select = 5] = "select", t[t.plural = 6] = "plural", t[t.pound = 7] = "pound", t[t.tag = 8] = "tag";
})(Ge || (Ge = {}));
var Vi;
(function(t) {
  t[t.number = 0] = "number", t[t.dateTime = 1] = "dateTime";
})(Vi || (Vi = {}));
function Qv(t) {
  return t.type === Ge.literal;
}
function y_(t) {
  return t.type === Ge.argument;
}
function Eg(t) {
  return t.type === Ge.number;
}
function Sg(t) {
  return t.type === Ge.date;
}
function Tg(t) {
  return t.type === Ge.time;
}
function Ag(t) {
  return t.type === Ge.select;
}
function wg(t) {
  return t.type === Ge.plural;
}
function b_(t) {
  return t.type === Ge.pound;
}
function Cg(t) {
  return t.type === Ge.tag;
}
function Og(t) {
  return !!(t && typeof t == "object" && t.type === Vi.number);
}
function Ws(t) {
  return !!(t && typeof t == "object" && t.type === Vi.dateTime);
}
var Rg = /[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/, __ = /(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;
function E_(t) {
  var a = {};
  return t.replace(__, function(r) {
    var o = r.length;
    switch (r[0]) {
      case "G":
        a.era = o === 4 ? "long" : o === 5 ? "narrow" : "short";
        break;
      case "y":
        a.year = o === 2 ? "2-digit" : "numeric";
        break;
      case "Y":
      case "u":
      case "U":
      case "r":
        throw new RangeError("`Y/u/U/r` (year) patterns are not supported, use `y` instead");
      case "q":
      case "Q":
        throw new RangeError("`q/Q` (quarter) patterns are not supported");
      case "M":
      case "L":
        a.month = [
          "numeric",
          "2-digit",
          "short",
          "long",
          "narrow"
        ][o - 1];
        break;
      case "w":
      case "W":
        throw new RangeError("`w/W` (week) patterns are not supported");
      case "d":
        a.day = ["numeric", "2-digit"][o - 1];
        break;
      case "D":
      case "F":
      case "g":
        throw new RangeError("`D/F/g` (day) patterns are not supported, use `d` instead");
      case "E":
        a.weekday = o === 4 ? "long" : o === 5 ? "narrow" : "short";
        break;
      case "e":
        if (o < 4) throw new RangeError("`e..eee` (weekday) patterns are not supported");
        a.weekday = [
          "short",
          "long",
          "narrow",
          "short"
        ][o - 4];
        break;
      case "c":
        if (o < 4) throw new RangeError("`c..ccc` (weekday) patterns are not supported");
        a.weekday = [
          "short",
          "long",
          "narrow",
          "short"
        ][o - 4];
        break;
      case "a":
        a.hour12 = !0;
        break;
      case "b":
      case "B":
        throw new RangeError("`b/B` (period) patterns are not supported, use `a` instead");
      case "h":
        a.hourCycle = "h12", a.hour = ["numeric", "2-digit"][o - 1];
        break;
      case "H":
        a.hourCycle = "h23", a.hour = ["numeric", "2-digit"][o - 1];
        break;
      case "K":
        a.hourCycle = "h11", a.hour = ["numeric", "2-digit"][o - 1];
        break;
      case "k":
        a.hourCycle = "h24", a.hour = ["numeric", "2-digit"][o - 1];
        break;
      case "j":
      case "J":
      case "C":
        throw new RangeError("`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead");
      case "m":
        a.minute = ["numeric", "2-digit"][o - 1];
        break;
      case "s":
        a.second = ["numeric", "2-digit"][o - 1];
        break;
      case "S":
      case "A":
        throw new RangeError("`S/A` (second) patterns are not supported, use `s` instead");
      case "z":
        a.timeZoneName = o < 4 ? "short" : "long";
        break;
      case "Z":
      case "O":
      case "v":
      case "V":
      case "X":
      case "x":
        throw new RangeError("`Z/O/v/V/X/x` (timeZone) patterns are not supported, use `z` instead");
    }
    return "";
  }), a;
}
var S_ = /[\t-\r \x85\u200E\u200F\u2028\u2029]/i;
function T_(t) {
  if (t.length === 0) throw new Error("Number skeleton cannot be empty");
  for (var a = t.split(S_).filter(function(v) {
    return v.length > 0;
  }), r = [], o = 0, u = a; o < u.length; o++) {
    var f = u[o].split("/");
    if (f.length === 0) throw new Error("Invalid number skeleton");
    for (var d = f[0], h = f.slice(1), p = 0, g = h; p < g.length; p++) if (g[p].length === 0) throw new Error("Invalid number skeleton");
    r.push({
      stem: d,
      options: h
    });
  }
  return r;
}
function A_(t) {
  return t.replace(/^(.*?)-/, "");
}
var Wv = /^\.(?:(0+)(\*)?|(#+)|(0+)(#+))$/g, Mg = /^(@+)?(\+|#+)?[rs]?$/g, w_ = /(\*)(0+)|(#+)(0+)|(0+)/g, Dg = /^(0+)$/;
function Kv(t) {
  var a = {};
  return t[t.length - 1] === "r" ? a.roundingPriority = "morePrecision" : t[t.length - 1] === "s" && (a.roundingPriority = "lessPrecision"), t.replace(Mg, function(r, o, u) {
    return typeof u != "string" ? (a.minimumSignificantDigits = o.length, a.maximumSignificantDigits = o.length) : u === "+" ? a.minimumSignificantDigits = o.length : o[0] === "#" ? a.maximumSignificantDigits = o.length : (a.minimumSignificantDigits = o.length, a.maximumSignificantDigits = o.length + (typeof u == "string" ? u.length : 0)), "";
  }), a;
}
function Ng(t) {
  switch (t) {
    case "sign-auto":
      return { signDisplay: "auto" };
    case "sign-accounting":
    case "()":
      return { currencySign: "accounting" };
    case "sign-always":
    case "+!":
      return { signDisplay: "always" };
    case "sign-accounting-always":
    case "()!":
      return {
        signDisplay: "always",
        currencySign: "accounting"
      };
    case "sign-except-zero":
    case "+?":
      return { signDisplay: "exceptZero" };
    case "sign-accounting-except-zero":
    case "()?":
      return {
        signDisplay: "exceptZero",
        currencySign: "accounting"
      };
    case "sign-never":
    case "+_":
      return { signDisplay: "never" };
  }
}
function C_(t) {
  var a;
  if (t[0] === "E" && t[1] === "E" ? (a = { notation: "engineering" }, t = t.slice(2)) : t[0] === "E" && (a = { notation: "scientific" }, t = t.slice(1)), a) {
    var r = t.slice(0, 2);
    if (r === "+!" ? (a.signDisplay = "always", t = t.slice(2)) : r === "+?" && (a.signDisplay = "exceptZero", t = t.slice(2)), !Dg.test(t)) throw new Error("Malformed concise eng/scientific notation");
    a.minimumIntegerDigits = t.length;
  }
  return a;
}
function Jv(t) {
  var a = {}, r = Ng(t);
  return r || a;
}
function O_(t) {
  for (var a = {}, r = 0, o = t; r < o.length; r++) {
    var u = o[r];
    switch (u.stem) {
      case "percent":
      case "%":
        a.style = "percent";
        continue;
      case "%x100":
        a.style = "percent", a.scale = 100;
        continue;
      case "currency":
        a.style = "currency", a.currency = u.options[0];
        continue;
      case "group-off":
      case ",_":
        a.useGrouping = !1;
        continue;
      case "precision-integer":
      case ".":
        a.maximumFractionDigits = 0;
        continue;
      case "measure-unit":
      case "unit":
        a.style = "unit", a.unit = A_(u.options[0]);
        continue;
      case "compact-short":
      case "K":
        a.notation = "compact", a.compactDisplay = "short";
        continue;
      case "compact-long":
      case "KK":
        a.notation = "compact", a.compactDisplay = "long";
        continue;
      case "scientific":
        a = te(te(te({}, a), { notation: "scientific" }), u.options.reduce(function(p, g) {
          return te(te({}, p), Jv(g));
        }, {}));
        continue;
      case "engineering":
        a = te(te(te({}, a), { notation: "engineering" }), u.options.reduce(function(p, g) {
          return te(te({}, p), Jv(g));
        }, {}));
        continue;
      case "notation-simple":
        a.notation = "standard";
        continue;
      case "unit-width-narrow":
        a.currencyDisplay = "narrowSymbol", a.unitDisplay = "narrow";
        continue;
      case "unit-width-short":
        a.currencyDisplay = "code", a.unitDisplay = "short";
        continue;
      case "unit-width-full-name":
        a.currencyDisplay = "name", a.unitDisplay = "long";
        continue;
      case "unit-width-iso-code":
        a.currencyDisplay = "symbol";
        continue;
      case "scale":
        a.scale = parseFloat(u.options[0]);
        continue;
      case "rounding-mode-floor":
        a.roundingMode = "floor";
        continue;
      case "rounding-mode-ceiling":
        a.roundingMode = "ceil";
        continue;
      case "rounding-mode-down":
        a.roundingMode = "trunc";
        continue;
      case "rounding-mode-up":
        a.roundingMode = "expand";
        continue;
      case "rounding-mode-half-even":
        a.roundingMode = "halfEven";
        continue;
      case "rounding-mode-half-down":
        a.roundingMode = "halfTrunc";
        continue;
      case "rounding-mode-half-up":
        a.roundingMode = "halfExpand";
        continue;
      case "integer-width":
        if (u.options.length > 1) throw new RangeError("integer-width stems only accept a single optional option");
        u.options[0].replace(w_, function(p, g, v, b, E, S) {
          if (g) a.minimumIntegerDigits = v.length;
          else {
            if (b && E) throw new Error("We currently do not support maximum integer digits");
            if (S) throw new Error("We currently do not support exact integer digits");
          }
          return "";
        });
        continue;
    }
    if (Dg.test(u.stem)) {
      a.minimumIntegerDigits = u.stem.length;
      continue;
    }
    if (Wv.test(u.stem)) {
      if (u.options.length > 1) throw new RangeError("Fraction-precision stems only accept a single optional option");
      u.stem.replace(Wv, function(p, g, v, b, E, S) {
        return v === "*" ? a.minimumFractionDigits = g.length : b && b[0] === "#" ? a.maximumFractionDigits = b.length : E && S ? (a.minimumFractionDigits = E.length, a.maximumFractionDigits = E.length + S.length) : (a.minimumFractionDigits = g.length, a.maximumFractionDigits = g.length), "";
      });
      var f = u.options[0];
      f === "w" ? a = te(te({}, a), { trailingZeroDisplay: "stripIfInteger" }) : f && (a = te(te({}, a), Kv(f)));
      continue;
    }
    if (Mg.test(u.stem)) {
      a = te(te({}, a), Kv(u.stem));
      continue;
    }
    var d = Ng(u.stem);
    d && (a = te(te({}, a), d));
    var h = C_(u.stem);
    h && (a = te(te({}, a), h));
  }
  return a;
}
var wo = {
  "001": ["H", "h"],
  419: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  AC: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  AD: ["H", "hB"],
  AE: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  AF: [
    "H",
    "hb",
    "hB",
    "h"
  ],
  AG: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  AI: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  AL: [
    "h",
    "H",
    "hB"
  ],
  AM: ["H", "hB"],
  AO: ["H", "hB"],
  AR: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  AS: ["h", "H"],
  AT: ["H", "hB"],
  AU: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  AW: ["H", "hB"],
  AX: ["H"],
  AZ: [
    "H",
    "hB",
    "h"
  ],
  BA: [
    "H",
    "hB",
    "h"
  ],
  BB: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  BD: [
    "h",
    "hB",
    "H"
  ],
  BE: ["H", "hB"],
  BF: ["H", "hB"],
  BG: [
    "H",
    "hB",
    "h"
  ],
  BH: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  BI: ["H", "h"],
  BJ: ["H", "hB"],
  BL: ["H", "hB"],
  BM: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  BN: [
    "hb",
    "hB",
    "h",
    "H"
  ],
  BO: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  BQ: ["H"],
  BR: ["H", "hB"],
  BS: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  BT: ["h", "H"],
  BW: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  BY: ["H", "h"],
  BZ: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  CA: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  CC: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  CD: ["hB", "H"],
  CF: [
    "H",
    "h",
    "hB"
  ],
  CG: ["H", "hB"],
  CH: [
    "H",
    "hB",
    "h"
  ],
  CI: ["H", "hB"],
  CK: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  CL: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  CM: [
    "H",
    "h",
    "hB"
  ],
  CN: [
    "H",
    "hB",
    "hb",
    "h"
  ],
  CO: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  CP: ["H"],
  CR: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  CU: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  CV: ["H", "hB"],
  CW: ["H", "hB"],
  CX: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  CY: [
    "h",
    "H",
    "hb",
    "hB"
  ],
  CZ: ["H"],
  DE: ["H", "hB"],
  DG: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  DJ: ["h", "H"],
  DK: ["H"],
  DM: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  DO: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  DZ: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  EA: [
    "H",
    "h",
    "hB",
    "hb"
  ],
  EC: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  EE: ["H", "hB"],
  EG: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  EH: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  ER: ["h", "H"],
  ES: [
    "H",
    "hB",
    "h",
    "hb"
  ],
  ET: [
    "hB",
    "hb",
    "h",
    "H"
  ],
  FI: ["H"],
  FJ: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  FK: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  FM: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  FO: ["H", "h"],
  FR: ["H", "hB"],
  GA: ["H", "hB"],
  GB: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  GD: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  GE: [
    "H",
    "hB",
    "h"
  ],
  GF: ["H", "hB"],
  GG: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  GH: ["h", "H"],
  GI: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  GL: ["H", "h"],
  GM: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  GN: ["H", "hB"],
  GP: ["H", "hB"],
  GQ: [
    "H",
    "hB",
    "h",
    "hb"
  ],
  GR: [
    "h",
    "H",
    "hb",
    "hB"
  ],
  GT: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  GU: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  GW: ["H", "hB"],
  GY: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  HK: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  HN: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  HR: ["H", "hB"],
  HU: ["H", "h"],
  IC: [
    "H",
    "h",
    "hB",
    "hb"
  ],
  ID: ["H"],
  IE: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  IL: ["H", "hB"],
  IM: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  IN: ["h", "H"],
  IO: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  IQ: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  IR: ["hB", "H"],
  IS: ["H"],
  IT: ["H", "hB"],
  JE: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  JM: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  JO: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  JP: [
    "H",
    "K",
    "h"
  ],
  KE: [
    "hB",
    "hb",
    "H",
    "h"
  ],
  KG: [
    "H",
    "h",
    "hB",
    "hb"
  ],
  KH: [
    "hB",
    "h",
    "H",
    "hb"
  ],
  KI: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  KM: [
    "H",
    "h",
    "hB",
    "hb"
  ],
  KN: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  KP: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  KR: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  KW: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  KY: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  KZ: ["H", "hB"],
  LA: [
    "H",
    "hb",
    "hB",
    "h"
  ],
  LB: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  LC: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  LI: [
    "H",
    "hB",
    "h"
  ],
  LK: [
    "H",
    "h",
    "hB",
    "hb"
  ],
  LR: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  LS: ["h", "H"],
  LT: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  LU: [
    "H",
    "h",
    "hB"
  ],
  LV: [
    "H",
    "hB",
    "hb",
    "h"
  ],
  LY: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  MA: [
    "H",
    "h",
    "hB",
    "hb"
  ],
  MC: ["H", "hB"],
  MD: ["H", "hB"],
  ME: [
    "H",
    "hB",
    "h"
  ],
  MF: ["H", "hB"],
  MG: ["H", "h"],
  MH: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  MK: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  ML: ["H"],
  MM: [
    "hB",
    "hb",
    "H",
    "h"
  ],
  MN: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  MO: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  MP: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  MQ: ["H", "hB"],
  MR: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  MS: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  MT: ["H", "h"],
  MU: ["H", "h"],
  MV: ["H", "h"],
  MW: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  MX: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  MY: [
    "hb",
    "hB",
    "h",
    "H"
  ],
  MZ: ["H", "hB"],
  NA: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  NC: ["H", "hB"],
  NE: ["H"],
  NF: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  NG: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  NI: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  NL: ["H", "hB"],
  NO: ["H", "h"],
  NP: [
    "H",
    "h",
    "hB"
  ],
  NR: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  NU: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  NZ: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  OM: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  PA: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  PE: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  PF: [
    "H",
    "h",
    "hB"
  ],
  PG: ["h", "H"],
  PH: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  PK: [
    "h",
    "hB",
    "H"
  ],
  PL: ["H", "h"],
  PM: ["H", "hB"],
  PN: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  PR: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  PS: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  PT: ["H", "hB"],
  PW: ["h", "H"],
  PY: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  QA: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  RE: ["H", "hB"],
  RO: ["H", "hB"],
  RS: [
    "H",
    "hB",
    "h"
  ],
  RU: ["H"],
  RW: ["H", "h"],
  SA: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  SB: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  SC: [
    "H",
    "h",
    "hB"
  ],
  SD: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  SE: ["H"],
  SG: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  SH: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  SI: ["H", "hB"],
  SJ: ["H"],
  SK: ["H"],
  SL: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  SM: [
    "H",
    "h",
    "hB"
  ],
  SN: [
    "H",
    "h",
    "hB"
  ],
  SO: ["h", "H"],
  SR: ["H", "hB"],
  SS: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  ST: ["H", "hB"],
  SV: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  SX: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  SY: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  SZ: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  TA: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  TC: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  TD: [
    "h",
    "H",
    "hB"
  ],
  TF: [
    "H",
    "h",
    "hB"
  ],
  TG: ["H", "hB"],
  TH: ["H", "h"],
  TJ: ["H", "h"],
  TL: [
    "H",
    "hB",
    "hb",
    "h"
  ],
  TM: ["H", "h"],
  TN: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  TO: ["h", "H"],
  TR: ["H", "hB"],
  TT: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  TW: [
    "hB",
    "hb",
    "h",
    "H"
  ],
  TZ: [
    "hB",
    "hb",
    "H",
    "h"
  ],
  UA: [
    "H",
    "hB",
    "h"
  ],
  UG: [
    "hB",
    "hb",
    "H",
    "h"
  ],
  UM: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  US: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  UY: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  UZ: [
    "H",
    "hB",
    "h"
  ],
  VA: [
    "H",
    "h",
    "hB"
  ],
  VC: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  VE: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  VG: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  VI: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  VN: ["H", "h"],
  VU: ["h", "H"],
  WF: ["H", "hB"],
  WS: ["h", "H"],
  XK: [
    "H",
    "hB",
    "h"
  ],
  YE: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  YT: ["H", "hB"],
  ZA: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  ZM: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  ZW: ["H", "h"],
  "af-ZA": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "ar-001": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "ca-ES": [
    "H",
    "h",
    "hB"
  ],
  "en-001": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "en-HK": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "en-IL": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "en-MY": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "es-BR": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "es-ES": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "es-GQ": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "fr-CA": [
    "H",
    "h",
    "hB"
  ],
  "gl-ES": [
    "H",
    "h",
    "hB"
  ],
  "gu-IN": [
    "hB",
    "hb",
    "h",
    "H"
  ],
  "hi-IN": [
    "hB",
    "h",
    "H"
  ],
  "it-CH": [
    "H",
    "h",
    "hB"
  ],
  "it-IT": [
    "H",
    "h",
    "hB"
  ],
  "kn-IN": [
    "hB",
    "h",
    "H"
  ],
  "ml-IN": [
    "hB",
    "h",
    "H"
  ],
  "mr-IN": [
    "hB",
    "hb",
    "h",
    "H"
  ],
  "pa-IN": [
    "hB",
    "hb",
    "h",
    "H"
  ],
  "ta-IN": [
    "hB",
    "h",
    "hb",
    "H"
  ],
  "te-IN": [
    "hB",
    "h",
    "H"
  ],
  "zu-ZA": [
    "H",
    "hB",
    "hb",
    "h"
  ]
};
function R_(t, a) {
  for (var r = "", o = 0; o < t.length; o++) {
    var u = t.charAt(o);
    if (u === "j") {
      for (var f = 0; o + 1 < t.length && t.charAt(o + 1) === u; )
        f++, o++;
      var d = 1 + (f & 1), h = f < 2 ? 1 : 3 + (f >> 1), p = "a", g = M_(a);
      for ((g == "H" || g == "k") && (h = 0); h-- > 0; ) r += p;
      for (; d-- > 0; ) r = g + r;
    } else u === "J" ? r += "H" : r += u;
  }
  return r;
}
function M_(t) {
  var a = t.hourCycle;
  if (a === void 0 && t.hourCycles && t.hourCycles.length && (a = t.hourCycles[0]), a) switch (a) {
    case "h24":
      return "k";
    case "h23":
      return "H";
    case "h12":
      return "h";
    case "h11":
      return "K";
    default:
      throw new Error("Invalid hourCycle");
  }
  var r = t.language, o;
  return r !== "root" && (o = t.maximize().region), (wo[o || ""] || wo[r || ""] || wo["".concat(r, "-001")] || wo["001"])[0];
}
var Ds, D_ = new RegExp("^".concat(Rg.source, "*")), N_ = new RegExp("".concat(Rg.source, "*$"));
function Ce(t, a) {
  return {
    start: t,
    end: a
  };
}
var z_ = !!String.prototype.startsWith && "_a".startsWith("a", 1), x_ = !!String.fromCodePoint, H_ = !!Object.fromEntries, L_ = !!String.prototype.codePointAt, U_ = !!String.prototype.trimStart, B_ = !!String.prototype.trimEnd, j_ = Number.isSafeInteger ? Number.isSafeInteger : function(t) {
  return typeof t == "number" && isFinite(t) && Math.floor(t) === t && Math.abs(t) <= 9007199254740991;
}, Ks = !0;
try {
  Ks = ((Ds = xg("([^\\p{White_Space}\\p{Pattern_Syntax}]*)", "yu").exec("a")) === null || Ds === void 0 ? void 0 : Ds[0]) === "a";
} catch {
  Ks = !1;
}
var ep = z_ ? function(a, r, o) {
  return a.startsWith(r, o);
} : function(a, r, o) {
  return a.slice(o, o + r.length) === r;
}, Js = x_ ? String.fromCodePoint : function() {
  for (var a = [], r = 0; r < arguments.length; r++) a[r] = arguments[r];
  for (var o = "", u = a.length, f = 0, d; u > f; ) {
    if (d = a[f++], d > 1114111) throw RangeError(d + " is not a valid code point");
    o += d < 65536 ? String.fromCharCode(d) : String.fromCharCode(((d -= 65536) >> 10) + 55296, d % 1024 + 56320);
  }
  return o;
}, tp = H_ ? Object.fromEntries : function(a) {
  for (var r = {}, o = 0, u = a; o < u.length; o++) {
    var f = u[o], d = f[0];
    r[d] = f[1];
  }
  return r;
}, zg = L_ ? function(a, r) {
  return a.codePointAt(r);
} : function(a, r) {
  var o = a.length;
  if (!(r < 0 || r >= o)) {
    var u = a.charCodeAt(r), f;
    return u < 55296 || u > 56319 || r + 1 === o || (f = a.charCodeAt(r + 1)) < 56320 || f > 57343 ? u : (u - 55296 << 10) + (f - 56320) + 65536;
  }
}, Z_ = U_ ? function(a) {
  return a.trimStart();
} : function(a) {
  return a.replace(D_, "");
}, G_ = B_ ? function(a) {
  return a.trimEnd();
} : function(a) {
  return a.replace(N_, "");
};
function xg(t, a) {
  return new RegExp(t, a);
}
var ef;
if (Ks) {
  var np = xg("([^\\p{White_Space}\\p{Pattern_Syntax}]*)", "yu");
  ef = function(a, r) {
    var o;
    return np.lastIndex = r, (o = np.exec(a)[1]) !== null && o !== void 0 ? o : "";
  };
} else ef = function(a, r) {
  for (var o = []; ; ) {
    var u = zg(a, r);
    if (u === void 0 || Hg(u) || V_(u)) break;
    o.push(u), r += u >= 65536 ? 2 : 1;
  }
  return Js.apply(void 0, o);
};
var P_ = (function() {
  function t(a, r) {
    r === void 0 && (r = {}), this.message = a, this.position = {
      offset: 0,
      line: 1,
      column: 1
    }, this.ignoreTag = !!r.ignoreTag, this.locale = r.locale, this.requiresOtherClause = !!r.requiresOtherClause, this.shouldParseSkeletons = !!r.shouldParseSkeletons;
  }
  return t.prototype.parse = function() {
    if (this.offset() !== 0) throw Error("parser can only be used once");
    return this.parseMessage(0, "", !1);
  }, t.prototype.parseMessage = function(a, r, o) {
    for (var u = []; !this.isEOF(); ) {
      var f = this.char();
      if (f === 123) {
        var d = this.parseArgument(a, o);
        if (d.err) return d;
        u.push(d.val);
      } else {
        if (f === 125 && a > 0) break;
        if (f === 35 && (r === "plural" || r === "selectordinal")) {
          var h = this.clonePosition();
          this.bump(), u.push({
            type: Ge.pound,
            location: Ce(h, this.clonePosition())
          });
        } else if (f === 60 && !this.ignoreTag && this.peek() === 47) {
          if (o) break;
          return this.error(Ae.UNMATCHED_CLOSING_TAG, Ce(this.clonePosition(), this.clonePosition()));
        } else if (f === 60 && !this.ignoreTag && tf(this.peek() || 0)) {
          var d = this.parseTag(a, r);
          if (d.err) return d;
          u.push(d.val);
        } else {
          var d = this.parseLiteral(a, r);
          if (d.err) return d;
          u.push(d.val);
        }
      }
    }
    return {
      val: u,
      err: null
    };
  }, t.prototype.parseTag = function(a, r) {
    var o = this.clonePosition();
    this.bump();
    var u = this.parseTagName();
    if (this.bumpSpace(), this.bumpIf("/>")) return {
      val: {
        type: Ge.literal,
        value: "<".concat(u, "/>"),
        location: Ce(o, this.clonePosition())
      },
      err: null
    };
    if (this.bumpIf(">")) {
      var f = this.parseMessage(a + 1, r, !0);
      if (f.err) return f;
      var d = f.val, h = this.clonePosition();
      if (this.bumpIf("</")) {
        if (this.isEOF() || !tf(this.char())) return this.error(Ae.INVALID_TAG, Ce(h, this.clonePosition()));
        var p = this.clonePosition();
        return u !== this.parseTagName() ? this.error(Ae.UNMATCHED_CLOSING_TAG, Ce(p, this.clonePosition())) : (this.bumpSpace(), this.bumpIf(">") ? {
          val: {
            type: Ge.tag,
            value: u,
            children: d,
            location: Ce(o, this.clonePosition())
          },
          err: null
        } : this.error(Ae.INVALID_TAG, Ce(h, this.clonePosition())));
      } else return this.error(Ae.UNCLOSED_TAG, Ce(o, this.clonePosition()));
    } else return this.error(Ae.INVALID_TAG, Ce(o, this.clonePosition()));
  }, t.prototype.parseTagName = function() {
    var a = this.offset();
    for (this.bump(); !this.isEOF() && k_(this.char()); ) this.bump();
    return this.message.slice(a, this.offset());
  }, t.prototype.parseLiteral = function(a, r) {
    for (var o = this.clonePosition(), u = ""; ; ) {
      var f = this.tryParseQuote(r);
      if (f) {
        u += f;
        continue;
      }
      var d = this.tryParseUnquoted(a, r);
      if (d) {
        u += d;
        continue;
      }
      var h = this.tryParseLeftAngleBracket();
      if (h) {
        u += h;
        continue;
      }
      break;
    }
    var p = Ce(o, this.clonePosition());
    return {
      val: {
        type: Ge.literal,
        value: u,
        location: p
      },
      err: null
    };
  }, t.prototype.tryParseLeftAngleBracket = function() {
    return !this.isEOF() && this.char() === 60 && (this.ignoreTag || !X_(this.peek() || 0)) ? (this.bump(), "<") : null;
  }, t.prototype.tryParseQuote = function(a) {
    if (this.isEOF() || this.char() !== 39) return null;
    switch (this.peek()) {
      case 39:
        return this.bump(), this.bump(), "'";
      case 123:
      case 60:
      case 62:
      case 125:
        break;
      case 35:
        if (a === "plural" || a === "selectordinal") break;
        return null;
      default:
        return null;
    }
    this.bump();
    var r = [this.char()];
    for (this.bump(); !this.isEOF(); ) {
      var o = this.char();
      if (o === 39) if (this.peek() === 39)
        r.push(39), this.bump();
      else {
        this.bump();
        break;
      }
      else r.push(o);
      this.bump();
    }
    return Js.apply(void 0, r);
  }, t.prototype.tryParseUnquoted = function(a, r) {
    if (this.isEOF()) return null;
    var o = this.char();
    return o === 60 || o === 123 || o === 35 && (r === "plural" || r === "selectordinal") || o === 125 && a > 0 ? null : (this.bump(), Js(o));
  }, t.prototype.parseArgument = function(a, r) {
    var o = this.clonePosition();
    if (this.bump(), this.bumpSpace(), this.isEOF()) return this.error(Ae.EXPECT_ARGUMENT_CLOSING_BRACE, Ce(o, this.clonePosition()));
    if (this.char() === 125)
      return this.bump(), this.error(Ae.EMPTY_ARGUMENT, Ce(o, this.clonePosition()));
    var u = this.parseIdentifierIfPossible().value;
    if (!u) return this.error(Ae.MALFORMED_ARGUMENT, Ce(o, this.clonePosition()));
    if (this.bumpSpace(), this.isEOF()) return this.error(Ae.EXPECT_ARGUMENT_CLOSING_BRACE, Ce(o, this.clonePosition()));
    switch (this.char()) {
      case 125:
        return this.bump(), {
          val: {
            type: Ge.argument,
            value: u,
            location: Ce(o, this.clonePosition())
          },
          err: null
        };
      case 44:
        return this.bump(), this.bumpSpace(), this.isEOF() ? this.error(Ae.EXPECT_ARGUMENT_CLOSING_BRACE, Ce(o, this.clonePosition())) : this.parseArgumentOptions(a, r, u, o);
      default:
        return this.error(Ae.MALFORMED_ARGUMENT, Ce(o, this.clonePosition()));
    }
  }, t.prototype.parseIdentifierIfPossible = function() {
    var a = this.clonePosition(), r = this.offset(), o = ef(this.message, r), u = r + o.length;
    return this.bumpTo(u), {
      value: o,
      location: Ce(a, this.clonePosition())
    };
  }, t.prototype.parseArgumentOptions = function(a, r, o, u) {
    var f, d = this.clonePosition(), h = this.parseIdentifierIfPossible().value, p = this.clonePosition();
    switch (h) {
      case "":
        return this.error(Ae.EXPECT_ARGUMENT_TYPE, Ce(d, p));
      case "number":
      case "date":
      case "time":
        this.bumpSpace();
        var g = null;
        if (this.bumpIf(",")) {
          this.bumpSpace();
          var v = this.clonePosition(), b = this.parseSimpleArgStyleIfPossible();
          if (b.err) return b;
          var E = G_(b.val);
          if (E.length === 0) return this.error(Ae.EXPECT_ARGUMENT_STYLE, Ce(this.clonePosition(), this.clonePosition()));
          g = {
            style: E,
            styleLocation: Ce(v, this.clonePosition())
          };
        }
        var N = this.tryParseArgumentClose(u);
        if (N.err) return N;
        var S = Ce(u, this.clonePosition());
        if (g && ep(g?.style, "::", 0)) {
          var O = Z_(g.style.slice(2));
          if (h === "number") {
            var b = this.parseNumberSkeletonFromString(O, g.styleLocation);
            return b.err ? b : {
              val: {
                type: Ge.number,
                value: o,
                location: S,
                style: b.val
              },
              err: null
            };
          } else {
            if (O.length === 0) return this.error(Ae.EXPECT_DATE_TIME_SKELETON, S);
            var T = O;
            this.locale && (T = R_(O, this.locale));
            var E = {
              type: Vi.dateTime,
              pattern: T,
              location: g.styleLocation,
              parsedOptions: this.shouldParseSkeletons ? E_(T) : {}
            };
            return {
              val: {
                type: h === "date" ? Ge.date : Ge.time,
                value: o,
                location: S,
                style: E
              },
              err: null
            };
          }
        }
        return {
          val: {
            type: h === "number" ? Ge.number : h === "date" ? Ge.date : Ge.time,
            value: o,
            location: S,
            style: (f = g?.style) !== null && f !== void 0 ? f : null
          },
          err: null
        };
      case "plural":
      case "selectordinal":
      case "select":
        var R = this.clonePosition();
        if (this.bumpSpace(), !this.bumpIf(",")) return this.error(Ae.EXPECT_SELECT_ARGUMENT_OPTIONS, Ce(R, te({}, R)));
        this.bumpSpace();
        var L = this.parseIdentifierIfPossible(), j = 0;
        if (h !== "select" && L.value === "offset") {
          if (!this.bumpIf(":")) return this.error(Ae.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE, Ce(this.clonePosition(), this.clonePosition()));
          this.bumpSpace();
          var b = this.tryParseDecimalInteger(Ae.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE, Ae.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE);
          if (b.err) return b;
          this.bumpSpace(), L = this.parseIdentifierIfPossible(), j = b.val;
        }
        var G = this.tryParsePluralOrSelectOptions(a, h, r, L);
        if (G.err) return G;
        var N = this.tryParseArgumentClose(u);
        if (N.err) return N;
        var X = Ce(u, this.clonePosition());
        return h === "select" ? {
          val: {
            type: Ge.select,
            value: o,
            options: tp(G.val),
            location: X
          },
          err: null
        } : {
          val: {
            type: Ge.plural,
            value: o,
            options: tp(G.val),
            offset: j,
            pluralType: h === "plural" ? "cardinal" : "ordinal",
            location: X
          },
          err: null
        };
      default:
        return this.error(Ae.INVALID_ARGUMENT_TYPE, Ce(d, p));
    }
  }, t.prototype.tryParseArgumentClose = function(a) {
    return this.isEOF() || this.char() !== 125 ? this.error(Ae.EXPECT_ARGUMENT_CLOSING_BRACE, Ce(a, this.clonePosition())) : (this.bump(), {
      val: !0,
      err: null
    });
  }, t.prototype.parseSimpleArgStyleIfPossible = function() {
    for (var a = 0, r = this.clonePosition(); !this.isEOF(); ) switch (this.char()) {
      case 39:
        this.bump();
        var o = this.clonePosition();
        if (!this.bumpUntil("'")) return this.error(Ae.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE, Ce(o, this.clonePosition()));
        this.bump();
        break;
      case 123:
        a += 1, this.bump();
        break;
      case 125:
        if (a > 0) a -= 1;
        else return {
          val: this.message.slice(r.offset, this.offset()),
          err: null
        };
        break;
      default:
        this.bump();
        break;
    }
    return {
      val: this.message.slice(r.offset, this.offset()),
      err: null
    };
  }, t.prototype.parseNumberSkeletonFromString = function(a, r) {
    var o = [];
    try {
      o = T_(a);
    } catch {
      return this.error(Ae.INVALID_NUMBER_SKELETON, r);
    }
    return {
      val: {
        type: Vi.number,
        tokens: o,
        location: r,
        parsedOptions: this.shouldParseSkeletons ? O_(o) : {}
      },
      err: null
    };
  }, t.prototype.tryParsePluralOrSelectOptions = function(a, r, o, u) {
    for (var f, d = !1, h = [], p = /* @__PURE__ */ new Set(), g = u.value, v = u.location; ; ) {
      if (g.length === 0) {
        var b = this.clonePosition();
        if (r !== "select" && this.bumpIf("=")) {
          var E = this.tryParseDecimalInteger(Ae.EXPECT_PLURAL_ARGUMENT_SELECTOR, Ae.INVALID_PLURAL_ARGUMENT_SELECTOR);
          if (E.err) return E;
          v = Ce(b, this.clonePosition()), g = this.message.slice(b.offset, this.offset());
        } else break;
      }
      if (p.has(g)) return this.error(r === "select" ? Ae.DUPLICATE_SELECT_ARGUMENT_SELECTOR : Ae.DUPLICATE_PLURAL_ARGUMENT_SELECTOR, v);
      g === "other" && (d = !0), this.bumpSpace();
      var S = this.clonePosition();
      if (!this.bumpIf("{")) return this.error(r === "select" ? Ae.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT : Ae.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT, Ce(this.clonePosition(), this.clonePosition()));
      var O = this.parseMessage(a + 1, r, o);
      if (O.err) return O;
      var T = this.tryParseArgumentClose(S);
      if (T.err) return T;
      h.push([g, {
        value: O.val,
        location: Ce(S, this.clonePosition())
      }]), p.add(g), this.bumpSpace(), f = this.parseIdentifierIfPossible(), g = f.value, v = f.location;
    }
    return h.length === 0 ? this.error(r === "select" ? Ae.EXPECT_SELECT_ARGUMENT_SELECTOR : Ae.EXPECT_PLURAL_ARGUMENT_SELECTOR, Ce(this.clonePosition(), this.clonePosition())) : this.requiresOtherClause && !d ? this.error(Ae.MISSING_OTHER_CLAUSE, Ce(this.clonePosition(), this.clonePosition())) : {
      val: h,
      err: null
    };
  }, t.prototype.tryParseDecimalInteger = function(a, r) {
    var o = 1, u = this.clonePosition();
    this.bumpIf("+") || this.bumpIf("-") && (o = -1);
    for (var f = !1, d = 0; !this.isEOF(); ) {
      var h = this.char();
      if (h >= 48 && h <= 57)
        f = !0, d = d * 10 + (h - 48), this.bump();
      else break;
    }
    var p = Ce(u, this.clonePosition());
    return f ? (d *= o, j_(d) ? {
      val: d,
      err: null
    } : this.error(r, p)) : this.error(a, p);
  }, t.prototype.offset = function() {
    return this.position.offset;
  }, t.prototype.isEOF = function() {
    return this.offset() === this.message.length;
  }, t.prototype.clonePosition = function() {
    return {
      offset: this.position.offset,
      line: this.position.line,
      column: this.position.column
    };
  }, t.prototype.char = function() {
    var a = this.position.offset;
    if (a >= this.message.length) throw Error("out of bound");
    var r = zg(this.message, a);
    if (r === void 0) throw Error("Offset ".concat(a, " is at invalid UTF-16 code unit boundary"));
    return r;
  }, t.prototype.error = function(a, r) {
    return {
      val: null,
      err: {
        kind: a,
        message: this.message,
        location: r
      }
    };
  }, t.prototype.bump = function() {
    if (!this.isEOF()) {
      var a = this.char();
      a === 10 ? (this.position.line += 1, this.position.column = 1, this.position.offset += 1) : (this.position.column += 1, this.position.offset += a < 65536 ? 1 : 2);
    }
  }, t.prototype.bumpIf = function(a) {
    if (ep(this.message, a, this.offset())) {
      for (var r = 0; r < a.length; r++) this.bump();
      return !0;
    }
    return !1;
  }, t.prototype.bumpUntil = function(a) {
    var r = this.offset(), o = this.message.indexOf(a, r);
    return o >= 0 ? (this.bumpTo(o), !0) : (this.bumpTo(this.message.length), !1);
  }, t.prototype.bumpTo = function(a) {
    if (this.offset() > a) throw Error("targetOffset ".concat(a, " must be greater than or equal to the current offset ").concat(this.offset()));
    for (a = Math.min(a, this.message.length); ; ) {
      var r = this.offset();
      if (r === a) break;
      if (r > a) throw Error("targetOffset ".concat(a, " is at invalid UTF-16 code unit boundary"));
      if (this.bump(), this.isEOF()) break;
    }
  }, t.prototype.bumpSpace = function() {
    for (; !this.isEOF() && Hg(this.char()); ) this.bump();
  }, t.prototype.peek = function() {
    if (this.isEOF()) return null;
    var a = this.char(), r = this.offset(), o = this.message.charCodeAt(r + (a >= 65536 ? 2 : 1));
    return o ?? null;
  }, t;
})();
function tf(t) {
  return t >= 97 && t <= 122 || t >= 65 && t <= 90;
}
function X_(t) {
  return tf(t) || t === 47;
}
function k_(t) {
  return t === 45 || t === 46 || t >= 48 && t <= 57 || t === 95 || t >= 97 && t <= 122 || t >= 65 && t <= 90 || t == 183 || t >= 192 && t <= 214 || t >= 216 && t <= 246 || t >= 248 && t <= 893 || t >= 895 && t <= 8191 || t >= 8204 && t <= 8205 || t >= 8255 && t <= 8256 || t >= 8304 && t <= 8591 || t >= 11264 && t <= 12271 || t >= 12289 && t <= 55295 || t >= 63744 && t <= 64975 || t >= 65008 && t <= 65533 || t >= 65536 && t <= 983039;
}
function Hg(t) {
  return t >= 9 && t <= 13 || t === 32 || t === 133 || t >= 8206 && t <= 8207 || t === 8232 || t === 8233;
}
function V_(t) {
  return t >= 33 && t <= 35 || t === 36 || t >= 37 && t <= 39 || t === 40 || t === 41 || t === 42 || t === 43 || t === 44 || t === 45 || t >= 46 && t <= 47 || t >= 58 && t <= 59 || t >= 60 && t <= 62 || t >= 63 && t <= 64 || t === 91 || t === 92 || t === 93 || t === 94 || t === 96 || t === 123 || t === 124 || t === 125 || t === 126 || t === 161 || t >= 162 && t <= 165 || t === 166 || t === 167 || t === 169 || t === 171 || t === 172 || t === 174 || t === 176 || t === 177 || t === 182 || t === 187 || t === 191 || t === 215 || t === 247 || t >= 8208 && t <= 8213 || t >= 8214 && t <= 8215 || t === 8216 || t === 8217 || t === 8218 || t >= 8219 && t <= 8220 || t === 8221 || t === 8222 || t === 8223 || t >= 8224 && t <= 8231 || t >= 8240 && t <= 8248 || t === 8249 || t === 8250 || t >= 8251 && t <= 8254 || t >= 8257 && t <= 8259 || t === 8260 || t === 8261 || t === 8262 || t >= 8263 && t <= 8273 || t === 8274 || t === 8275 || t >= 8277 && t <= 8286 || t >= 8592 && t <= 8596 || t >= 8597 && t <= 8601 || t >= 8602 && t <= 8603 || t >= 8604 && t <= 8607 || t === 8608 || t >= 8609 && t <= 8610 || t === 8611 || t >= 8612 && t <= 8613 || t === 8614 || t >= 8615 && t <= 8621 || t === 8622 || t >= 8623 && t <= 8653 || t >= 8654 && t <= 8655 || t >= 8656 && t <= 8657 || t === 8658 || t === 8659 || t === 8660 || t >= 8661 && t <= 8691 || t >= 8692 && t <= 8959 || t >= 8960 && t <= 8967 || t === 8968 || t === 8969 || t === 8970 || t === 8971 || t >= 8972 && t <= 8991 || t >= 8992 && t <= 8993 || t >= 8994 && t <= 9e3 || t === 9001 || t === 9002 || t >= 9003 && t <= 9083 || t === 9084 || t >= 9085 && t <= 9114 || t >= 9115 && t <= 9139 || t >= 9140 && t <= 9179 || t >= 9180 && t <= 9185 || t >= 9186 && t <= 9254 || t >= 9255 && t <= 9279 || t >= 9280 && t <= 9290 || t >= 9291 && t <= 9311 || t >= 9472 && t <= 9654 || t === 9655 || t >= 9656 && t <= 9664 || t === 9665 || t >= 9666 && t <= 9719 || t >= 9720 && t <= 9727 || t >= 9728 && t <= 9838 || t === 9839 || t >= 9840 && t <= 10087 || t === 10088 || t === 10089 || t === 10090 || t === 10091 || t === 10092 || t === 10093 || t === 10094 || t === 10095 || t === 10096 || t === 10097 || t === 10098 || t === 10099 || t === 10100 || t === 10101 || t >= 10132 && t <= 10175 || t >= 10176 && t <= 10180 || t === 10181 || t === 10182 || t >= 10183 && t <= 10213 || t === 10214 || t === 10215 || t === 10216 || t === 10217 || t === 10218 || t === 10219 || t === 10220 || t === 10221 || t === 10222 || t === 10223 || t >= 10224 && t <= 10239 || t >= 10240 && t <= 10495 || t >= 10496 && t <= 10626 || t === 10627 || t === 10628 || t === 10629 || t === 10630 || t === 10631 || t === 10632 || t === 10633 || t === 10634 || t === 10635 || t === 10636 || t === 10637 || t === 10638 || t === 10639 || t === 10640 || t === 10641 || t === 10642 || t === 10643 || t === 10644 || t === 10645 || t === 10646 || t === 10647 || t === 10648 || t >= 10649 && t <= 10711 || t === 10712 || t === 10713 || t === 10714 || t === 10715 || t >= 10716 && t <= 10747 || t === 10748 || t === 10749 || t >= 10750 && t <= 11007 || t >= 11008 && t <= 11055 || t >= 11056 && t <= 11076 || t >= 11077 && t <= 11078 || t >= 11079 && t <= 11084 || t >= 11085 && t <= 11123 || t >= 11124 && t <= 11125 || t >= 11126 && t <= 11157 || t === 11158 || t >= 11159 && t <= 11263 || t >= 11776 && t <= 11777 || t === 11778 || t === 11779 || t === 11780 || t === 11781 || t >= 11782 && t <= 11784 || t === 11785 || t === 11786 || t === 11787 || t === 11788 || t === 11789 || t >= 11790 && t <= 11798 || t === 11799 || t >= 11800 && t <= 11801 || t === 11802 || t === 11803 || t === 11804 || t === 11805 || t >= 11806 && t <= 11807 || t === 11808 || t === 11809 || t === 11810 || t === 11811 || t === 11812 || t === 11813 || t === 11814 || t === 11815 || t === 11816 || t === 11817 || t >= 11818 && t <= 11822 || t === 11823 || t >= 11824 && t <= 11833 || t >= 11834 && t <= 11835 || t >= 11836 && t <= 11839 || t === 11840 || t === 11841 || t === 11842 || t >= 11843 && t <= 11855 || t >= 11856 && t <= 11857 || t === 11858 || t >= 11859 && t <= 11903 || t >= 12289 && t <= 12291 || t === 12296 || t === 12297 || t === 12298 || t === 12299 || t === 12300 || t === 12301 || t === 12302 || t === 12303 || t === 12304 || t === 12305 || t >= 12306 && t <= 12307 || t === 12308 || t === 12309 || t === 12310 || t === 12311 || t === 12312 || t === 12313 || t === 12314 || t === 12315 || t === 12316 || t === 12317 || t >= 12318 && t <= 12319 || t === 12320 || t === 12336 || t === 64830 || t === 64831 || t >= 65093 && t <= 65094;
}
function nf(t) {
  t.forEach(function(a) {
    if (delete a.location, Ag(a) || wg(a)) for (var r in a.options)
      delete a.options[r].location, nf(a.options[r].value);
    else Eg(a) && Og(a.style) || (Sg(a) || Tg(a)) && Ws(a.style) ? delete a.style.location : Cg(a) && nf(a.children);
  });
}
function Y_(t, a) {
  a === void 0 && (a = {}), a = te({
    shouldParseSkeletons: !0,
    requiresOtherClause: !0
  }, a);
  var r = new P_(t, a).parse();
  if (r.err) {
    var o = SyntaxError(Ae[r.err.kind]);
    throw o.location = r.err.location, o.originalMessage = r.err.message, o;
  }
  return a?.captureLocation || nf(r.val), r.val;
}
var pn;
(function(t) {
  t.MISSING_VALUE = "MISSING_VALUE", t.INVALID_VALUE = "INVALID_VALUE", t.MISSING_INTL_API = "MISSING_INTL_API";
})(pn || (pn = {}));
var ba = (function(t) {
  $t(a, t);
  function a(r, o, u) {
    var f = t.call(this, r) || this;
    return f.code = o, f.originalMessage = u, f;
  }
  return a.prototype.toString = function() {
    return "[formatjs Error: ".concat(this.code, "] ").concat(this.message);
  }, a;
})(Error), ap = (function(t) {
  $t(a, t);
  function a(r, o, u, f) {
    return t.call(this, 'Invalid values for "'.concat(r, '": "').concat(o, '". Options are "').concat(Object.keys(u).join('", "'), '"'), pn.INVALID_VALUE, f) || this;
  }
  return a;
})(ba), q_ = (function(t) {
  $t(a, t);
  function a(r, o, u) {
    return t.call(this, 'Value for "'.concat(r, '" must be of type ').concat(o), pn.INVALID_VALUE, u) || this;
  }
  return a;
})(ba), I_ = (function(t) {
  $t(a, t);
  function a(r, o) {
    return t.call(this, 'The intl string context variable "'.concat(r, '" was not provided to the string "').concat(o, '"'), pn.MISSING_VALUE, o) || this;
  }
  return a;
})(ba), ht;
(function(t) {
  t[t.literal = 0] = "literal", t[t.object = 1] = "object";
})(ht || (ht = {}));
function $_(t) {
  return t.length < 2 ? t : t.reduce(function(a, r) {
    var o = a[a.length - 1];
    return !o || o.type !== ht.literal || r.type !== ht.literal ? a.push(r) : o.value += r.value, a;
  }, []);
}
function Lg(t) {
  return typeof t == "function";
}
function Po(t, a, r, o, u, f, d) {
  if (t.length === 1 && Qv(t[0])) return [{
    type: ht.literal,
    value: t[0].value
  }];
  for (var h = [], p = 0, g = t; p < g.length; p++) {
    var v = g[p];
    if (Qv(v)) {
      h.push({
        type: ht.literal,
        value: v.value
      });
      continue;
    }
    if (b_(v)) {
      typeof f == "number" && h.push({
        type: ht.literal,
        value: r.getNumberFormat(a).format(f)
      });
      continue;
    }
    var b = v.value;
    if (!(u && b in u)) throw new I_(b, d);
    var E = u[b];
    if (y_(v)) {
      (!E || typeof E == "string" || typeof E == "number") && (E = typeof E == "string" || typeof E == "number" ? String(E) : ""), h.push({
        type: typeof E == "string" ? ht.literal : ht.object,
        value: E
      });
      continue;
    }
    if (Sg(v)) {
      var S = typeof v.style == "string" ? o.date[v.style] : Ws(v.style) ? v.style.parsedOptions : void 0;
      h.push({
        type: ht.literal,
        value: r.getDateTimeFormat(a, S).format(E)
      });
      continue;
    }
    if (Tg(v)) {
      var S = typeof v.style == "string" ? o.time[v.style] : Ws(v.style) ? v.style.parsedOptions : o.time.medium;
      h.push({
        type: ht.literal,
        value: r.getDateTimeFormat(a, S).format(E)
      });
      continue;
    }
    if (Eg(v)) {
      var S = typeof v.style == "string" ? o.number[v.style] : Og(v.style) ? v.style.parsedOptions : void 0;
      S && S.scale && (E = E * (S.scale || 1)), h.push({
        type: ht.literal,
        value: r.getNumberFormat(a, S).format(E)
      });
      continue;
    }
    if (Cg(v)) {
      var O = v.children, T = v.value, R = u[T];
      if (!Lg(R)) throw new q_(T, "function", d);
      var L = R(Po(O, a, r, o, u, f).map(function(N) {
        return N.value;
      }));
      Array.isArray(L) || (L = [L]), h.push.apply(h, L.map(function(N) {
        return {
          type: typeof N == "string" ? ht.literal : ht.object,
          value: N
        };
      }));
    }
    if (Ag(v)) {
      var j = v.options[E] || v.options.other;
      if (!j) throw new ap(v.value, E, Object.keys(v.options), d);
      h.push.apply(h, Po(j.value, a, r, o, u));
      continue;
    }
    if (wg(v)) {
      var j = v.options["=".concat(E)];
      if (!j) {
        if (!Intl.PluralRules) throw new ba(`Intl.PluralRules is not available in this environment.
Try polyfilling it using "@formatjs/intl-pluralrules"
`, pn.MISSING_INTL_API, d);
        var G = r.getPluralRules(a, { type: v.pluralType }).select(E - (v.offset || 0));
        j = v.options[G] || v.options.other;
      }
      if (!j) throw new ap(v.value, E, Object.keys(v.options), d);
      h.push.apply(h, Po(j.value, a, r, o, u, E - (v.offset || 0)));
      continue;
    }
  }
  return $_(h);
}
function F_(t, a) {
  return a ? te(te(te({}, t || {}), a || {}), Object.keys(t).reduce(function(r, o) {
    return r[o] = te(te({}, t[o]), a[o] || {}), r;
  }, {})) : t;
}
function Q_(t, a) {
  return a ? Object.keys(t).reduce(function(r, o) {
    return r[o] = F_(t[o], a[o]), r;
  }, te({}, t)) : t;
}
function Ns(t) {
  return { create: function() {
    return {
      get: function(a) {
        return t[a];
      },
      set: function(a, r) {
        t[a] = r;
      }
    };
  } };
}
function W_(t) {
  return t === void 0 && (t = {
    number: {},
    dateTime: {},
    pluralRules: {}
  }), {
    getNumberFormat: dn(function() {
      for (var a, r = [], o = 0; o < arguments.length; o++) r[o] = arguments[o];
      return new ((a = Intl.NumberFormat).bind.apply(a, nn([void 0], r, !1)))();
    }, {
      cache: Ns(t.number),
      strategy: hn.variadic
    }),
    getDateTimeFormat: dn(function() {
      for (var a, r = [], o = 0; o < arguments.length; o++) r[o] = arguments[o];
      return new ((a = Intl.DateTimeFormat).bind.apply(a, nn([void 0], r, !1)))();
    }, {
      cache: Ns(t.dateTime),
      strategy: hn.variadic
    }),
    getPluralRules: dn(function() {
      for (var a, r = [], o = 0; o < arguments.length; o++) r[o] = arguments[o];
      return new ((a = Intl.PluralRules).bind.apply(a, nn([void 0], r, !1)))();
    }, {
      cache: Ns(t.pluralRules),
      strategy: hn.variadic
    })
  };
}
var Ug = (function() {
  function t(a, r, o, u) {
    r === void 0 && (r = t.defaultLocale);
    var f = this;
    if (this.formatterCache = {
      number: {},
      dateTime: {},
      pluralRules: {}
    }, this.format = function(p) {
      var g = f.formatToParts(p);
      if (g.length === 1) return g[0].value;
      var v = g.reduce(function(b, E) {
        return !b.length || E.type !== ht.literal || typeof b[b.length - 1] != "string" ? b.push(E.value) : b[b.length - 1] += E.value, b;
      }, []);
      return v.length <= 1 ? v[0] || "" : v;
    }, this.formatToParts = function(p) {
      return Po(f.ast, f.locales, f.formatters, f.formats, p, void 0, f.message);
    }, this.resolvedOptions = function() {
      var p;
      return { locale: ((p = f.resolvedLocale) === null || p === void 0 ? void 0 : p.toString()) || Intl.NumberFormat.supportedLocalesOf(f.locales)[0] };
    }, this.getAst = function() {
      return f.ast;
    }, this.locales = r, this.resolvedLocale = t.resolveLocale(r), typeof a == "string") {
      if (this.message = a, !t.__parse) throw new TypeError("IntlMessageFormat.__parse must be set to process `message` of type `string`");
      var d = u || {};
      d.formatters;
      var h = Pn(d, ["formatters"]);
      this.ast = t.__parse(a, te(te({}, h), { locale: this.resolvedLocale }));
    } else this.ast = a;
    if (!Array.isArray(this.ast)) throw new TypeError("A message must be provided as a String or AST.");
    this.formats = Q_(t.formats, o), this.formatters = u && u.formatters || W_(this.formatterCache);
  }
  return Object.defineProperty(t, "defaultLocale", {
    get: function() {
      return t.memoizedDefaultLocale || (t.memoizedDefaultLocale = new Intl.NumberFormat().resolvedOptions().locale), t.memoizedDefaultLocale;
    },
    enumerable: !1,
    configurable: !0
  }), t.memoizedDefaultLocale = null, t.resolveLocale = function(a) {
    if (!(typeof Intl.Locale > "u")) {
      var r = Intl.NumberFormat.supportedLocalesOf(a);
      return r.length > 0 ? new Intl.Locale(r[0]) : new Intl.Locale(typeof a == "string" ? a : a[0]);
    }
  }, t.__parse = Y_, t.formats = {
    number: {
      integer: { maximumFractionDigits: 0 },
      currency: { style: "currency" },
      percent: { style: "percent" }
    },
    date: {
      short: {
        month: "numeric",
        day: "numeric",
        year: "2-digit"
      },
      medium: {
        month: "short",
        day: "numeric",
        year: "numeric"
      },
      long: {
        month: "long",
        day: "numeric",
        year: "numeric"
      },
      full: {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      }
    },
    time: {
      short: {
        hour: "numeric",
        minute: "numeric"
      },
      medium: {
        hour: "numeric",
        minute: "numeric",
        second: "numeric"
      },
      long: {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        timeZoneName: "short"
      },
      full: {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        timeZoneName: "short"
      }
    }
  }, t;
})(), Ya;
(function(t) {
  t.FORMAT_ERROR = "FORMAT_ERROR", t.UNSUPPORTED_FORMATTER = "UNSUPPORTED_FORMATTER", t.INVALID_CONFIG = "INVALID_CONFIG", t.MISSING_DATA = "MISSING_DATA", t.MISSING_TRANSLATION = "MISSING_TRANSLATION";
})(Ya || (Ya = {}));
var Wr = (function(t) {
  $t(a, t);
  function a(r, o, u) {
    var f = this, d = u ? u instanceof Error ? u : new Error(String(u)) : void 0;
    return f = t.call(this, "[@formatjs/intl Error ".concat(r, "] ").concat(o, `
`).concat(d ? `
`.concat(d.message, `
`).concat(d.stack) : "")) || this, f.code = r, typeof Error.captureStackTrace == "function" && Error.captureStackTrace(f, a), f;
  }
  return a;
})(Error), K_ = (function(t) {
  $t(a, t);
  function a(r, o) {
    return t.call(this, Ya.UNSUPPORTED_FORMATTER, r, o) || this;
  }
  return a;
})(Wr), J_ = (function(t) {
  $t(a, t);
  function a(r, o) {
    return t.call(this, Ya.INVALID_CONFIG, r, o) || this;
  }
  return a;
})(Wr), ip = (function(t) {
  $t(a, t);
  function a(r, o) {
    return t.call(this, Ya.MISSING_DATA, r, o) || this;
  }
  return a;
})(Wr), Ft = (function(t) {
  $t(a, t);
  function a(r, o, u) {
    var f = t.call(this, Ya.FORMAT_ERROR, "".concat(r, `
Locale: `).concat(o, `
`), u) || this;
    return f.locale = o, f;
  }
  return a;
})(Wr), zs = (function(t) {
  $t(a, t);
  function a(r, o, u, f) {
    var d = t.call(this, "".concat(r, `
MessageID: `).concat(u?.id, `
Default Message: `).concat(u?.defaultMessage, `
Description: `).concat(u?.description, `
`), o, f) || this;
    return d.descriptor = u, d.locale = o, d;
  }
  return a;
})(Ft), eE = (function(t) {
  $t(a, t);
  function a(r, o) {
    var u = t.call(this, Ya.MISSING_TRANSLATION, 'Missing message: "'.concat(r.id, '" for locale "').concat(o, '", using ').concat(r.defaultMessage ? "default message (".concat(typeof r.defaultMessage == "string" ? r.defaultMessage : r.defaultMessage.map(function(f) {
      var d;
      return (d = f.value) !== null && d !== void 0 ? d : JSON.stringify(f);
    }).join(), ")") : "id", " as fallback.")) || this;
    return u.descriptor = r, u;
  }
  return a;
})(Wr);
function tE(t, a, r) {
  if (r === void 0 && (r = Error), !t) throw new r(a);
}
function Fi(t, a, r) {
  return r === void 0 && (r = {}), a.reduce(function(o, u) {
    return u in t ? o[u] = t[u] : u in r && (o[u] = r[u]), o;
  }, {});
}
var nE = function(t) {
}, aE = function(t) {
}, Bg = {
  formats: {},
  messages: {},
  timeZone: void 0,
  defaultLocale: "en",
  defaultFormats: {},
  fallbackOnEmptyString: !0,
  onError: nE,
  onWarn: aE
};
function jg() {
  return {
    dateTime: {},
    number: {},
    message: {},
    relativeTime: {},
    pluralRules: {},
    list: {},
    displayNames: {}
  };
}
function ka(t) {
  return { create: function() {
    return {
      get: function(a) {
        return t[a];
      },
      set: function(a, r) {
        t[a] = r;
      }
    };
  } };
}
function iE(t) {
  t === void 0 && (t = jg());
  var a = Intl.RelativeTimeFormat, r = Intl.ListFormat, o = Intl.DisplayNames, u = dn(function() {
    for (var h, p = [], g = 0; g < arguments.length; g++) p[g] = arguments[g];
    return new ((h = Intl.DateTimeFormat).bind.apply(h, nn([void 0], p, !1)))();
  }, {
    cache: ka(t.dateTime),
    strategy: hn.variadic
  }), f = dn(function() {
    for (var h, p = [], g = 0; g < arguments.length; g++) p[g] = arguments[g];
    return new ((h = Intl.NumberFormat).bind.apply(h, nn([void 0], p, !1)))();
  }, {
    cache: ka(t.number),
    strategy: hn.variadic
  }), d = dn(function() {
    for (var h, p = [], g = 0; g < arguments.length; g++) p[g] = arguments[g];
    return new ((h = Intl.PluralRules).bind.apply(h, nn([void 0], p, !1)))();
  }, {
    cache: ka(t.pluralRules),
    strategy: hn.variadic
  });
  return {
    getDateTimeFormat: u,
    getNumberFormat: f,
    getMessageFormat: dn(function(h, p, g, v) {
      return new Ug(h, p, g, te({ formatters: {
        getNumberFormat: f,
        getDateTimeFormat: u,
        getPluralRules: d
      } }, v || {}));
    }, {
      cache: ka(t.message),
      strategy: hn.variadic
    }),
    getRelativeTimeFormat: dn(function() {
      for (var h = [], p = 0; p < arguments.length; p++) h[p] = arguments[p];
      return new (a.bind.apply(a, nn([void 0], h, !1)))();
    }, {
      cache: ka(t.relativeTime),
      strategy: hn.variadic
    }),
    getPluralRules: d,
    getListFormat: dn(function() {
      for (var h = [], p = 0; p < arguments.length; p++) h[p] = arguments[p];
      return new (r.bind.apply(r, nn([void 0], h, !1)))();
    }, {
      cache: ka(t.list),
      strategy: hn.variadic
    }),
    getDisplayNames: dn(function() {
      for (var h = [], p = 0; p < arguments.length; p++) h[p] = arguments[p];
      return new (o.bind.apply(o, nn([void 0], h, !1)))();
    }, {
      cache: ka(t.displayNames),
      strategy: hn.variadic
    })
  };
}
function wf(t, a, r, o) {
  var u = t && t[a], f;
  if (u && (f = u[r]), f) return f;
  o(new K_("No ".concat(a, " format named: ").concat(r)));
}
function Co(t, a) {
  return Object.keys(t).reduce(function(r, o) {
    return r[o] = te({ timeZone: a }, t[o]), r;
  }, {});
}
function rp(t, a) {
  return Object.keys(te(te({}, t), a)).reduce(function(r, o) {
    return r[o] = te(te({}, t[o] || {}), a[o] || {}), r;
  }, {});
}
function lp(t, a) {
  if (!a) return t;
  var r = Ug.formats;
  return te(te(te({}, r), t), {
    date: rp(Co(r.date, a), Co(t.date || {}, a)),
    time: rp(Co(r.time, a), Co(t.time || {}, a))
  });
}
var af = function(t, a, r, o, u) {
  var f = t.locale, d = t.formats, h = t.messages, p = t.defaultLocale, g = t.defaultFormats, v = t.fallbackOnEmptyString, b = t.onError, E = t.timeZone, S = t.defaultRichTextElements;
  r === void 0 && (r = { id: "" });
  var O = r.id, T = r.defaultMessage;
  tE(!!O, "[@formatjs/intl] An `id` must be provided to format a message. You can either:\n1. Configure your build toolchain with [babel-plugin-formatjs](https://formatjs.github.io/docs/tooling/babel-plugin)\nor [@formatjs/ts-transformer](https://formatjs.github.io/docs/tooling/ts-transformer) OR\n2. Configure your `eslint` config to include [eslint-plugin-formatjs](https://formatjs.github.io/docs/tooling/linter#enforce-id)\nto autofix this issue");
  var R = String(O), L = h && Object.prototype.hasOwnProperty.call(h, R) && h[R];
  if (Array.isArray(L) && L.length === 1 && L[0].type === Ge.literal) return L[0].value;
  if (!o && L && typeof L == "string" && !S) return L.replace(/'\{(.*?)\}'/gi, "{$1}");
  if (o = te(te({}, S), o || {}), d = lp(d, E), g = lp(g, E), !L) {
    if (v === !1 && L === "") return L;
    if ((!T || f && f.toLowerCase() !== p.toLowerCase()) && b(new eE(r, f)), T) try {
      var j = a.getMessageFormat(T, p, g, u);
      return j.format(o);
    } catch (G) {
      return b(new zs('Error formatting default message for: "'.concat(R, '", rendering default message verbatim'), f, r, G)), typeof T == "string" ? T : R;
    }
    return R;
  }
  try {
    var j = a.getMessageFormat(L, f, d, te({ formatters: a }, u || {}));
    return j.format(o);
  } catch (G) {
    b(new zs('Error formatting message: "'.concat(R, '", using ').concat(T ? "default message" : "id", " as fallback."), f, r, G));
  }
  if (T) try {
    var j = a.getMessageFormat(T, p, g, u);
    return j.format(o);
  } catch (G) {
    b(new zs('Error formatting the default message for: "'.concat(R, '", rendering message verbatim'), f, r, G));
  }
  return typeof L == "string" ? L : typeof T == "string" ? T : R;
}, rE = [
  "formatMatcher",
  "timeZone",
  "hour12",
  "weekday",
  "era",
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "second",
  "timeZoneName",
  "hourCycle",
  "dateStyle",
  "timeStyle",
  "calendar",
  "numberingSystem",
  "fractionalSecondDigits"
];
function Kr(t, a, r, o) {
  var u = t.locale, f = t.formats, d = t.onError, h = t.timeZone;
  o === void 0 && (o = {});
  var p = o.format, g = te(te({}, h && { timeZone: h }), p && wf(f, a, p, d)), v = Fi(o, rE, g);
  return a === "time" && !v.hour && !v.minute && !v.second && !v.timeStyle && !v.dateStyle && (v = te(te({}, v), {
    hour: "numeric",
    minute: "numeric"
  })), r(u, v);
}
function lE(t, a) {
  for (var r = [], o = 2; o < arguments.length; o++) r[o - 2] = arguments[o];
  var u = r[0], f = r[1], d = f === void 0 ? {} : f, h = typeof u == "string" ? new Date(u || 0) : u;
  try {
    return Kr(t, "date", a, d).format(h);
  } catch (p) {
    t.onError(new Ft("Error formatting date.", t.locale, p));
  }
  return String(h);
}
function oE(t, a) {
  for (var r = [], o = 2; o < arguments.length; o++) r[o - 2] = arguments[o];
  var u = r[0], f = r[1], d = f === void 0 ? {} : f, h = typeof u == "string" ? new Date(u || 0) : u;
  try {
    return Kr(t, "time", a, d).format(h);
  } catch (p) {
    t.onError(new Ft("Error formatting time.", t.locale, p));
  }
  return String(h);
}
function uE(t, a) {
  for (var r = [], o = 2; o < arguments.length; o++) r[o - 2] = arguments[o];
  var u = r[0], f = r[1], d = r[2], h = d === void 0 ? {} : d, p = typeof u == "string" ? new Date(u || 0) : u, g = typeof f == "string" ? new Date(f || 0) : f;
  try {
    return Kr(t, "dateTimeRange", a, h).formatRange(p, g);
  } catch (v) {
    t.onError(new Ft("Error formatting date time range.", t.locale, v));
  }
  return String(p);
}
function cE(t, a) {
  for (var r = [], o = 2; o < arguments.length; o++) r[o - 2] = arguments[o];
  var u = r[0], f = r[1], d = f === void 0 ? {} : f, h = typeof u == "string" ? new Date(u || 0) : u;
  try {
    return Kr(t, "date", a, d).formatToParts(h);
  } catch (p) {
    t.onError(new Ft("Error formatting date.", t.locale, p));
  }
  return [];
}
function sE(t, a) {
  for (var r = [], o = 2; o < arguments.length; o++) r[o - 2] = arguments[o];
  var u = r[0], f = r[1], d = f === void 0 ? {} : f, h = typeof u == "string" ? new Date(u || 0) : u;
  try {
    return Kr(t, "time", a, d).formatToParts(h);
  } catch (p) {
    t.onError(new Ft("Error formatting time.", t.locale, p));
  }
  return [];
}
var fE = [
  "style",
  "type",
  "fallback",
  "languageDisplay"
];
function dE(t, a, r, o) {
  var u = t.locale, f = t.onError;
  Intl.DisplayNames || f(new ba(`Intl.DisplayNames is not available in this environment.
Try polyfilling it using "@formatjs/intl-displaynames"
`, pn.MISSING_INTL_API));
  var d = Fi(o, fE);
  try {
    return a(u, d).of(r);
  } catch (h) {
    f(new Ft("Error formatting display name.", u, h));
  }
}
var hE = ["type", "style"], op = Date.now();
function mE(t) {
  return "".concat(op, "_").concat(t, "_").concat(op);
}
function vE(t, a, r, o) {
  o === void 0 && (o = {});
  var u = Zg(t, a, r, o).reduce(function(f, d) {
    var h = d.value;
    return typeof h != "string" ? f.push(h) : typeof f[f.length - 1] == "string" ? f[f.length - 1] += h : f.push(h), f;
  }, []);
  return u.length === 1 ? u[0] : u.length === 0 ? "" : u;
}
function Zg(t, a, r, o) {
  var u = t.locale, f = t.onError;
  o === void 0 && (o = {}), Intl.ListFormat || f(new ba(`Intl.ListFormat is not available in this environment.
Try polyfilling it using "@formatjs/intl-listformat"
`, pn.MISSING_INTL_API));
  var d = Fi(o, hE);
  try {
    var h = {}, p = r.map(function(g, v) {
      if (typeof g == "object") {
        var b = mE(v);
        return h[b] = g, b;
      }
      return String(g);
    });
    return a(u, d).formatToParts(p).map(function(g) {
      return g.type === "literal" ? g : te(te({}, g), { value: h[g.value] || g.value });
    });
  } catch (g) {
    f(new Ft("Error formatting list.", u, g));
  }
  return r;
}
var pE = ["type"];
function gE(t, a, r, o) {
  var u = t.locale, f = t.onError;
  o === void 0 && (o = {}), Intl.PluralRules || f(new ba(`Intl.PluralRules is not available in this environment.
Try polyfilling it using "@formatjs/intl-pluralrules"
`, pn.MISSING_INTL_API));
  var d = Fi(o, pE);
  try {
    return a(u, d).select(r);
  } catch (h) {
    f(new Ft("Error formatting plural.", u, h));
  }
  return "other";
}
var yE = ["numeric", "style"];
function bE(t, a, r) {
  var o = t.locale, u = t.formats, f = t.onError;
  r === void 0 && (r = {});
  var d = r.format, h = !!d && wf(u, "relative", d, f) || {};
  return a(o, Fi(r, yE, h));
}
function _E(t, a, r, o, u) {
  u === void 0 && (u = {}), o || (o = "second"), Intl.RelativeTimeFormat || t.onError(new ba(`Intl.RelativeTimeFormat is not available in this environment.
Try polyfilling it using "@formatjs/intl-relativetimeformat"
`, pn.MISSING_INTL_API));
  try {
    return bE(t, a, u).format(r, o);
  } catch (f) {
    t.onError(new Ft("Error formatting relative time.", t.locale, f));
  }
  return String(r);
}
var EE = [
  "style",
  "currency",
  "unit",
  "unitDisplay",
  "useGrouping",
  "minimumIntegerDigits",
  "minimumFractionDigits",
  "maximumFractionDigits",
  "minimumSignificantDigits",
  "maximumSignificantDigits",
  "compactDisplay",
  "currencyDisplay",
  "currencySign",
  "notation",
  "signDisplay",
  "unit",
  "unitDisplay",
  "numberingSystem",
  "trailingZeroDisplay",
  "roundingPriority",
  "roundingIncrement",
  "roundingMode"
];
function Gg(t, a, r) {
  var o = t.locale, u = t.formats, f = t.onError;
  r === void 0 && (r = {});
  var d = r.format, h = d && wf(u, "number", d, f) || {};
  return a(o, Fi(r, EE, h));
}
function SE(t, a, r, o) {
  o === void 0 && (o = {});
  try {
    return Gg(t, a, o).format(r);
  } catch (u) {
    t.onError(new Ft("Error formatting number.", t.locale, u));
  }
  return String(r);
}
function TE(t, a, r, o) {
  o === void 0 && (o = {});
  try {
    return Gg(t, a, o).formatToParts(r);
  } catch (u) {
    t.onError(new Ft("Error formatting number.", t.locale, u));
  }
  return [];
}
function AE(t) {
  return typeof (t ? t[Object.keys(t)[0]] : void 0) == "string";
}
function wE(t) {
  t.onWarn && t.defaultRichTextElements && AE(t.messages || {}) && t.onWarn(`[@formatjs/intl] "defaultRichTextElements" was specified but "message" was not pre-compiled. 
Please consider using "@formatjs/cli" to pre-compile your messages for performance.
For more details see https://formatjs.github.io/docs/getting-started/message-distribution`);
}
function CE(t, a) {
  var r = iE(a), o = te(te({}, Bg), t), u = o.locale, f = o.defaultLocale, d = o.onError;
  return u ? !Intl.NumberFormat.supportedLocalesOf(u).length && d ? d(new ip('Missing locale data for locale: "'.concat(u, '" in Intl.NumberFormat. Using default locale: "').concat(f, '" as fallback. See https://formatjs.github.io/docs/react-intl#runtime-requirements for more details'))) : !Intl.DateTimeFormat.supportedLocalesOf(u).length && d && d(new ip('Missing locale data for locale: "'.concat(u, '" in Intl.DateTimeFormat. Using default locale: "').concat(f, '" as fallback. See https://formatjs.github.io/docs/react-intl#runtime-requirements for more details'))) : (d && d(new J_('"locale" was not configured, using "'.concat(f, '" as fallback. See https://formatjs.github.io/docs/react-intl/api#intlshape for more details'))), o.locale = o.defaultLocale || "en"), wE(o), te(te({}, o), {
    formatters: r,
    formatNumber: SE.bind(null, o, r.getNumberFormat),
    formatNumberToParts: TE.bind(null, o, r.getNumberFormat),
    formatRelativeTime: _E.bind(null, o, r.getRelativeTimeFormat),
    formatDate: lE.bind(null, o, r.getDateTimeFormat),
    formatDateToParts: cE.bind(null, o, r.getDateTimeFormat),
    formatTime: oE.bind(null, o, r.getDateTimeFormat),
    formatDateTimeRange: uE.bind(null, o, r.getDateTimeFormat),
    formatTimeToParts: sE.bind(null, o, r.getDateTimeFormat),
    formatPlural: gE.bind(null, o, r.getPluralRules),
    formatMessage: af.bind(null, o, r),
    $t: af.bind(null, o, r),
    formatList: vE.bind(null, o, r.getListFormat),
    formatListToParts: Zg.bind(null, o, r.getListFormat),
    formatDisplayName: dE.bind(null, o, r.getDisplayNames)
  });
}
function OE(t, a, r) {
  if (r === void 0 && (r = Error), !t) throw new r(a);
}
function Pg(t) {
  OE(t, "[React Intl] Could not find required `intl` object. <IntlProvider> needs to exist in the component ancestry.");
}
var Xg = te(te({}, Bg), { textComponent: _.Fragment }), RE = { key: 42 }, ME = function(t) {
  return _.isValidElement(t) ? _.createElement(_.Fragment, RE, t) : t;
}, DE = function(t) {
  var a;
  return (a = _.Children.map(t, ME)) !== null && a !== void 0 ? a : [];
};
function NE(t) {
  return function(a) {
    return t(_.Children.toArray(a));
  };
}
function rf(t, a) {
  if (t === a) return !0;
  if (!t || !a) return !1;
  var r = Object.keys(t), o = Object.keys(a), u = r.length;
  if (o.length !== u) return !1;
  for (var f = 0; f < u; f++) {
    var d = r[f];
    if (t[d] !== a[d] || !Object.prototype.hasOwnProperty.call(a, d)) return !1;
  }
  return !0;
}
var zE = /* @__PURE__ */ Ht(((t) => {
  var a = typeof Symbol == "function" && Symbol.for, r = a ? /* @__PURE__ */ Symbol.for("react.element") : 60103, o = a ? /* @__PURE__ */ Symbol.for("react.portal") : 60106, u = a ? /* @__PURE__ */ Symbol.for("react.fragment") : 60107, f = a ? /* @__PURE__ */ Symbol.for("react.strict_mode") : 60108, d = a ? /* @__PURE__ */ Symbol.for("react.profiler") : 60114, h = a ? /* @__PURE__ */ Symbol.for("react.provider") : 60109, p = a ? /* @__PURE__ */ Symbol.for("react.context") : 60110, g = a ? /* @__PURE__ */ Symbol.for("react.async_mode") : 60111, v = a ? /* @__PURE__ */ Symbol.for("react.concurrent_mode") : 60111, b = a ? /* @__PURE__ */ Symbol.for("react.forward_ref") : 60112, E = a ? /* @__PURE__ */ Symbol.for("react.suspense") : 60113, S = a ? /* @__PURE__ */ Symbol.for("react.suspense_list") : 60120, O = a ? /* @__PURE__ */ Symbol.for("react.memo") : 60115, T = a ? /* @__PURE__ */ Symbol.for("react.lazy") : 60116, R = a ? /* @__PURE__ */ Symbol.for("react.block") : 60121, L = a ? /* @__PURE__ */ Symbol.for("react.fundamental") : 60117, j = a ? /* @__PURE__ */ Symbol.for("react.responder") : 60118, G = a ? /* @__PURE__ */ Symbol.for("react.scope") : 60119;
  function N(B) {
    if (typeof B == "object" && B !== null) {
      var I = B.$$typeof;
      switch (I) {
        case r:
          switch (B = B.type, B) {
            case g:
            case v:
            case u:
            case d:
            case f:
            case E:
              return B;
            default:
              switch (B = B && B.$$typeof, B) {
                case p:
                case b:
                case T:
                case O:
                case h:
                  return B;
                default:
                  return I;
              }
          }
        case o:
          return I;
      }
    }
  }
  function X(B) {
    return N(B) === v;
  }
  t.AsyncMode = g, t.ConcurrentMode = v, t.ContextConsumer = p, t.ContextProvider = h, t.Element = r, t.ForwardRef = b, t.Fragment = u, t.Lazy = T, t.Memo = O, t.Portal = o, t.Profiler = d, t.StrictMode = f, t.Suspense = E, t.isAsyncMode = function(B) {
    return X(B) || N(B) === g;
  }, t.isConcurrentMode = X, t.isContextConsumer = function(B) {
    return N(B) === p;
  }, t.isContextProvider = function(B) {
    return N(B) === h;
  }, t.isElement = function(B) {
    return typeof B == "object" && B !== null && B.$$typeof === r;
  }, t.isForwardRef = function(B) {
    return N(B) === b;
  }, t.isFragment = function(B) {
    return N(B) === u;
  }, t.isLazy = function(B) {
    return N(B) === T;
  }, t.isMemo = function(B) {
    return N(B) === O;
  }, t.isPortal = function(B) {
    return N(B) === o;
  }, t.isProfiler = function(B) {
    return N(B) === d;
  }, t.isStrictMode = function(B) {
    return N(B) === f;
  }, t.isSuspense = function(B) {
    return N(B) === E;
  }, t.isValidElementType = function(B) {
    return typeof B == "string" || typeof B == "function" || B === u || B === v || B === d || B === f || B === E || B === S || typeof B == "object" && B !== null && (B.$$typeof === T || B.$$typeof === O || B.$$typeof === h || B.$$typeof === p || B.$$typeof === b || B.$$typeof === L || B.$$typeof === j || B.$$typeof === G || B.$$typeof === R);
  }, t.typeOf = N;
})), xE = /* @__PURE__ */ Ht(((t, a) => {
  a.exports = zE();
})), HE = /* @__PURE__ */ Ht(((t, a) => {
  var r = xE(), o = {
    childContextTypes: !0,
    contextType: !0,
    contextTypes: !0,
    defaultProps: !0,
    displayName: !0,
    getDefaultProps: !0,
    getDerivedStateFromError: !0,
    getDerivedStateFromProps: !0,
    mixins: !0,
    propTypes: !0,
    type: !0
  }, u = {
    name: !0,
    length: !0,
    prototype: !0,
    caller: !0,
    callee: !0,
    arguments: !0,
    arity: !0
  }, f = {
    $$typeof: !0,
    render: !0,
    defaultProps: !0,
    displayName: !0,
    propTypes: !0
  }, d = {
    $$typeof: !0,
    compare: !0,
    defaultProps: !0,
    displayName: !0,
    propTypes: !0,
    type: !0
  }, h = {};
  h[r.ForwardRef] = f, h[r.Memo] = d;
  function p(R) {
    return r.isMemo(R) ? d : h[R.$$typeof] || o;
  }
  var g = Object.defineProperty, v = Object.getOwnPropertyNames, b = Object.getOwnPropertySymbols, E = Object.getOwnPropertyDescriptor, S = Object.getPrototypeOf, O = Object.prototype;
  function T(R, L, j) {
    if (typeof L != "string") {
      if (O) {
        var G = S(L);
        G && G !== O && T(R, G, j);
      }
      var N = v(L);
      b && (N = N.concat(b(L)));
      for (var X = p(R), B = p(L), I = 0; I < N.length; ++I) {
        var H = N[I];
        if (!u[H] && !(j && j[H]) && !(B && B[H]) && !(X && X[H])) {
          var K = E(L, H);
          try {
            g(R, H, K);
          } catch {
          }
        }
      }
    }
    return R;
  }
  a.exports = T;
})), kR = /* @__PURE__ */ Sf(HE()), Cf = _.createContext(null), VR = Cf.Consumer, LE = Cf.Provider, UE = LE, BE = Cf;
function Vn() {
  var t = _.useContext(BE);
  return Pg(t), t;
}
var lf;
(function(t) {
  t.formatDate = "FormattedDate", t.formatTime = "FormattedTime", t.formatNumber = "FormattedNumber", t.formatList = "FormattedList", t.formatDisplayName = "FormattedDisplayName";
})(lf || (lf = {}));
var of;
(function(t) {
  t.formatDate = "FormattedDateParts", t.formatTime = "FormattedTimeParts", t.formatNumber = "FormattedNumberParts", t.formatList = "FormattedListParts";
})(of || (of = {}));
var kg = function(t) {
  var a = Vn(), r = t.value, o = t.children, u = Pn(t, ["value", "children"]);
  return o(a.formatNumberToParts(r, u));
};
kg.displayName = "FormattedNumberParts";
kg.displayName = "FormattedNumberParts";
function Vg(t) {
  var a = function(r) {
    var o = Vn(), u = r.value, f = r.children, d = Pn(r, ["value", "children"]), h = typeof u == "string" ? new Date(u || 0) : u;
    return f(t === "formatDate" ? o.formatDateToParts(h, d) : o.formatTimeToParts(h, d));
  };
  return a.displayName = of[t], a;
}
function Jr(t) {
  var a = function(r) {
    var o = Vn(), u = r.value, f = r.children, d = Pn(r, ["value", "children"]), h = o[t](u, d);
    if (typeof f == "function") return f(h);
    var p = o.textComponent || _.Fragment;
    return _.createElement(p, null, h);
  };
  return a.displayName = lf[t], a;
}
function Yg(t) {
  return t && Object.keys(t).reduce(function(a, r) {
    var o = t[r];
    return a[r] = Lg(o) ? NE(o) : o, a;
  }, {});
}
var up = function(t, a, r, o) {
  for (var u = [], f = 4; f < arguments.length; f++) u[f - 4] = arguments[f];
  var d = Yg(o), h = af.apply(void 0, nn([
    t,
    a,
    r,
    d
  ], u, !1));
  return Array.isArray(h) ? DE(h) : h;
}, cp = function(t, a) {
  var r = t.defaultRichTextElements, o = Pn(t, ["defaultRichTextElements"]), u = Yg(r), f = CE(te(te(te({}, Xg), o), { defaultRichTextElements: u }), a), d = {
    locale: f.locale,
    timeZone: f.timeZone,
    fallbackOnEmptyString: f.fallbackOnEmptyString,
    formats: f.formats,
    defaultLocale: f.defaultLocale,
    defaultFormats: f.defaultFormats,
    messages: f.messages,
    onError: f.onError,
    defaultRichTextElements: u
  };
  return te(te({}, f), {
    formatMessage: up.bind(null, d, f.formatters),
    $t: up.bind(null, d, f.formatters)
  });
};
function jE(t, a) {
  var r = t.values, o = Pn(t, ["values"]), u = a.values, f = Pn(a, ["values"]);
  return rf(u, r) && rf(o, f);
}
function qg(t) {
  var a = Vn(), r = a.formatMessage, o = a.textComponent, u = o === void 0 ? _.Fragment : o, f = t.id, d = t.description, h = t.defaultMessage, p = t.values, g = t.children, v = t.tagName, b = v === void 0 ? u : v, E = t.ignoreTag, S = r({
    id: f,
    description: d,
    defaultMessage: h
  }, p, { ignoreTag: E });
  return typeof g == "function" ? g(Array.isArray(S) ? S : [S]) : b ? _.createElement(b, null, S) : _.createElement(_.Fragment, null, S);
}
qg.displayName = "FormattedMessage";
var Pi = _.memo(qg, jE);
Pi.displayName = "MemoizedFormattedMessage";
function xs(t) {
  return {
    locale: t.locale,
    timeZone: t.timeZone,
    fallbackOnEmptyString: t.fallbackOnEmptyString,
    formats: t.formats,
    textComponent: t.textComponent,
    messages: t.messages,
    defaultLocale: t.defaultLocale,
    defaultFormats: t.defaultFormats,
    onError: t.onError,
    onWarn: t.onWarn,
    wrapRichTextChunksInFragment: t.wrapRichTextChunksInFragment,
    defaultRichTextElements: t.defaultRichTextElements
  };
}
var ZE = (function(t) {
  $t(a, t);
  function a() {
    var r = t !== null && t.apply(this, arguments) || this;
    return r.cache = jg(), r.state = {
      cache: r.cache,
      intl: cp(xs(r.props), r.cache),
      prevConfig: xs(r.props)
    }, r;
  }
  return a.getDerivedStateFromProps = function(r, o) {
    var u = o.prevConfig, f = o.cache, d = xs(r);
    return rf(u, d) ? null : {
      intl: cp(d, f),
      prevConfig: d
    };
  }, a.prototype.render = function() {
    return Pg(this.state.intl), _.createElement(UE, { value: this.state.intl }, this.props.children);
  }, a.displayName = "IntlProvider", a.defaultProps = Xg, a;
})(_.PureComponent);
var YR = Jr("formatDate"), qR = Jr("formatTime"), IR = Jr("formatNumber"), $R = Jr("formatList"), FR = Jr("formatDisplayName"), QR = Vg("formatDate"), WR = Vg("formatTime"), sp = (t) => {
  let a;
  const r = /* @__PURE__ */ new Set(), o = (g, v) => {
    const b = typeof g == "function" ? g(a) : g;
    if (!Object.is(b, a)) {
      const E = a;
      a = v ?? (typeof b != "object" || b === null) ? b : Object.assign({}, a, b), r.forEach((S) => S(a, E));
    }
  }, u = () => a, h = {
    setState: o,
    getState: u,
    getInitialState: () => p,
    subscribe: (g) => (r.add(g), () => r.delete(g))
  }, p = a = t(o, u, h);
  return h;
}, GE = ((t) => t ? sp(t) : sp), PE = (t) => t;
function XE(t, a = PE) {
  const r = _.useSyncExternalStore(t.subscribe, _.useCallback(() => a(t.getState()), [t, a]), _.useCallback(() => a(t.getInitialState()), [t, a]));
  return _.useDebugValue(r), r;
}
var qr = "en-US", Ig = [
  "am",
  "ar",
  "bg-BG",
  "bn-BD",
  "bs-BA",
  "ca-ES",
  "cs-CZ",
  "da-DK",
  "de-DE",
  "el-GR",
  "es-419",
  "es-ES",
  "et-EE",
  "fa",
  "fi-FI",
  "fr-CA",
  "fr-FR",
  "gu-IN",
  "hi-IN",
  "hr-HR",
  "hu-HU",
  "hy-AM",
  "id-ID",
  "is-IS",
  "it-IT",
  "ja-JP",
  "ka-GE",
  "kk",
  "kn-IN",
  "ko-KR",
  "lt",
  "lv-LV",
  "mk-MK",
  "ml",
  "mn",
  "mr-IN",
  "ms-MY",
  "my-MM",
  "nb-NO",
  "nl-NL",
  "pa",
  "pl-PL",
  "pt-BR",
  "pt-PT",
  "ro-RO",
  "ru-RU",
  "sk-SK",
  "sl-SI",
  "so-SO",
  "sq-AL",
  "sr-RS",
  "sv-SE",
  "sw-TZ",
  "ta-IN",
  "te-IN",
  "th-TH",
  "tl",
  "tr-TR",
  "uk-UA",
  "ur",
  "vi-VN",
  "zh-CN",
  "zh-HK",
  "zh-TW"
], kE = new Map(Ig.map((t) => [t.toLowerCase(), t])), ft = new Map([[qr.toLowerCase(), qr], ...kE]);
for (const t of [qr, ...Ig]) {
  const a = new Intl.Locale(t).language.toLowerCase();
  ft.set(a, ft.get(a) ?? t);
}
ft.set("es", "es-ES");
ft.set("fr", "fr-FR");
ft.set("bn-in", "bn-BD");
ft.set("en-in", qr);
ft.set("ml-in", "ml");
ft.set("pa-guru", "pa");
ft.set("pa-guru-in", "pa");
for (const t of [
  "pt-ao",
  "pt-ch",
  "pt-cv",
  "pt-fr",
  "pt-gq",
  "pt-gw",
  "pt-lu",
  "pt-mo",
  "pt-mz",
  "pt-st",
  "pt-tl"
]) ft.set(t, "pt-PT");
ft.set("ur-in", "ur");
ft.set("zh-hant", "zh-TW");
ft.set("zh-hant-tw", "zh-TW");
ft.set("zh-hant-hk", "zh-HK");
function VE(t) {
  const a = t.trim().replaceAll("_", "-").toLowerCase();
  if (!a || a === "pa-arab" || a.startsWith("pa-arab-")) return;
  if (a.startsWith("es-") && a !== "es-es" && a !== "es-419") return "es-419";
  const r = ft.get(a);
  if (r) return r;
  const o = a.split("-");
  for (let u = o.length - 1; u >= 1; u -= 1) {
    const f = ft.get(o.slice(0, u).join("-"));
    if (f) return f;
  }
}
function el(t) {
  const a = t.split("-", 1)[0];
  return a && [
    "ar",
    "fa",
    "ur"
  ].includes(a) ? "rtl" : "ltr";
}
var Ze = {
  editorWidgetMobileMenu: {
    id: "sites.dispatch.widget.editor.mobile_menu",
    defaultMessage: "Site toolbar",
    description: "Accessible label for the draggable mobile Site toolbar and its actions popup."
  },
  editorWidgetMobileClose: {
    id: "sites.dispatch.widget.editor.mobile_close",
    defaultMessage: "Close",
    description: "Mobile Site toolbar action that closes the menu without hiding the toolbar or changing its saved preference."
  },
  editorWidgetHideHint: {
    id: "sites.dispatch.widget.editor.hide_hint",
    defaultMessage: "Hover over this corner to bring back the toolbar.",
    description: "Tooltip at the corner after first hiding the Site editor widget, and on sustained hover over the hidden widget corner. A restore keyboard shortcut is shown beside this text."
  },
  editorWidgetRestoreAction: {
    id: "sites.dispatch.widget.editor.restore_action",
    defaultMessage: "Bring back toolbar",
    description: "Action beside the keyboard shortcut that restores the tucked Site editor widget."
  },
  invitationBannerLabel: {
    id: "sites.dispatch.widget.invitation_banner.label",
    defaultMessage: "Site editing controls",
    description: "Accessible label for the banner inviting someone to edit a ChatGPT Site."
  },
  invitationBannerMessage: {
    id: "sites.dispatch.widget.invitation_banner.message",
    defaultMessage: "You have been invited to edit this site.",
    description: "Message shown to someone who has been invited to edit a ChatGPT Site when the owner's name is unavailable."
  },
  invitationBannerMessageWithOwner: {
    id: "sites.dispatch.widget.invitation_banner.message_with_owner",
    defaultMessage: "<strong>{ownerName}</strong> has invited you to edit this site.",
    description: "Message shown to someone invited to edit a ChatGPT Site. ownerName is the site owner's display name."
  },
  invitationBannerEditAction: {
    id: "sites.dispatch.widget.invitation_banner.edit_action",
    defaultMessage: "Edit in ChatGPT",
    description: "Link that opens ChatGPT so an invited editor can edit a ChatGPT Site."
  },
  editorWidgetDefaultEditPrompt: {
    id: "sites.dispatch.widget.editor.default_edit_prompt",
    defaultMessage: "{site} make these changes…",
    description: "Default editable prompt when the Site widget logo opens ChatGPT. Matches the desktop Site edit prompt. site is the complete Site reference and must remain a placeholder."
  },
  invitationBannerEditPrompt: {
    id: "sites.dispatch.widget.invitation_banner.edit_prompt",
    defaultMessage: "Make the following changes to {site}:",
    description: "Prompt prefilled in ChatGPT when an invited editor opens a Site. site is the complete Site reference and must remain a placeholder."
  },
  invitationBannerDismissAction: {
    id: "sites.dispatch.widget.invitation_banner.dismiss_action",
    defaultMessage: "Dismiss",
    description: "Accessible label for the button that dismisses a ChatGPT Site editing invitation banner."
  },
  editorWidgetLaunchAction: {
    id: "sites.dispatch.widget.editor.launch_action",
    defaultMessage: "Edit site",
    description: "Short button label in the floating editor-only widget on a hosted website. Opens a text composer for describing changes to that website. Site means a hosted website, not a physical location. No placeholders."
  },
  editorWidgetOpenAction: {
    id: "sites.dispatch.widget.editor.open_action",
    defaultMessage: "Edit site in ChatGPT",
    description: "Accessible label and tooltip for the ChatGPT logo link in the floating editor-only Site widget. Opens this website's full-screen editor in ChatGPT in a new tab. Short action label; no placeholders."
  },
  editorWidgetLaunchTooltip: {
    id: "sites.dispatch.widget.editor.launch_tooltip",
    defaultMessage: "Describe your changes to ChatGPT",
    description: "Tooltip on the Edit site button in the floating editor-only Site widget. The button opens a text composer for describing desired changes to this website. Short action phrase; no placeholders."
  },
  editorWidgetComposerLabel: {
    id: "sites.dispatch.widget.editor.composer_label",
    defaultMessage: "Describe your edits",
    description: "Screen-reader label for the plain-text composer in the floating editor-only widget on a hosted website. Asks the editor to describe changes they want ChatGPT to make to this website. No placeholders."
  },
  editorWidgetComposerPlaceholder: {
    id: "sites.dispatch.widget.editor.composer_placeholder",
    defaultMessage: "Describe your edits",
    description: "Short placeholder in the empty plain-text composer in the floating editor-only widget on a hosted website. Asks the editor to describe changes they want ChatGPT to make to this website. No placeholders."
  },
  editorWidgetSendAction: {
    id: "sites.dispatch.widget.editor.send_action",
    defaultMessage: "Send edits",
    description: "Accessible label for the button that sends requested Site edits to ChatGPT."
  },
  editorWidgetHideAction: {
    id: "sites.dispatch.widget.editor.hide_action",
    defaultMessage: "Hide toolbar",
    description: "Accessible label and tooltip for the X button in the floating editor-only widget on a hosted website. Hides this editing widget from the current page without changing the website or its access permissions. Short action label; no placeholders."
  }
}, KR = Object.freeze({ status: "aborted" });
function F(t, a, r) {
  function o(h, p) {
    var g;
    Object.defineProperty(h, "_zod", {
      value: h._zod ?? {},
      enumerable: !1
    }), (g = h._zod).traits ?? (g.traits = /* @__PURE__ */ new Set()), h._zod.traits.add(t), a(h, p);
    for (const v in d.prototype) v in h || Object.defineProperty(h, v, { value: d.prototype[v].bind(h) });
    h._zod.constr = d, h._zod.def = p;
  }
  const u = r?.Parent ?? Object;
  class f extends u {
  }
  Object.defineProperty(f, "name", { value: t });
  function d(h) {
    var p;
    const g = r?.Parent ? new f() : this;
    o(g, h), (p = g._zod).deferred ?? (p.deferred = []);
    for (const v of g._zod.deferred) v();
    return g;
  }
  return Object.defineProperty(d, "init", { value: o }), Object.defineProperty(d, Symbol.hasInstance, { value: (h) => r?.Parent && h instanceof r.Parent ? !0 : h?._zod?.traits?.has(t) }), Object.defineProperty(d, "name", { value: t }), d;
}
var Xi = class extends Error {
  constructor() {
    super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
  }
}, $g = class extends Error {
  constructor(t) {
    super(`Encountered unidirectional transform during encode: ${t}`), this.name = "ZodEncodeError";
  }
}, uf = {};
function qa(t) {
  return t && Object.assign(uf, t), uf;
}
function YE(t) {
  const a = Object.values(t).filter((r) => typeof r == "number");
  return Object.entries(t).filter(([r, o]) => a.indexOf(+r) === -1).map(([r, o]) => o);
}
function cf(t, a) {
  return typeof a == "bigint" ? a.toString() : a;
}
function Of(t) {
  return { get value() {
    {
      const a = t();
      return Object.defineProperty(this, "value", { value: a }), a;
    }
    throw new Error("cached value already set");
  } };
}
function Rf(t) {
  return t == null;
}
function Mf(t) {
  const a = t.startsWith("^") ? 1 : 0, r = t.endsWith("$") ? t.length - 1 : t.length;
  return t.slice(a, r);
}
var fp = /* @__PURE__ */ Symbol("evaluating");
function Ue(t, a, r) {
  let o;
  Object.defineProperty(t, a, {
    get() {
      if (o !== fp)
        return o === void 0 && (o = fp, o = r()), o;
    },
    set(u) {
      Object.defineProperty(t, a, { value: u });
    },
    configurable: !0
  });
}
function Qa(t, a, r) {
  Object.defineProperty(t, a, {
    value: r,
    writable: !0,
    enumerable: !0,
    configurable: !0
  });
}
function Wa(...t) {
  const a = {};
  for (const r of t) Object.assign(a, Object.getOwnPropertyDescriptors(r));
  return Object.defineProperties({}, a);
}
function dp(t) {
  return JSON.stringify(t);
}
var Fg = "captureStackTrace" in Error ? Error.captureStackTrace : (...t) => {
};
function Yo(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
var qE = Of(() => {
  if (typeof navigator < "u" && navigator?.userAgent?.includes("Cloudflare")) return !1;
  try {
    return new Function(""), !0;
  } catch {
    return !1;
  }
});
function Ir(t) {
  if (Yo(t) === !1) return !1;
  const a = t.constructor;
  if (a === void 0) return !0;
  const r = a.prototype;
  return !(Yo(r) === !1 || Object.prototype.hasOwnProperty.call(r, "isPrototypeOf") === !1);
}
function Qg(t) {
  return Ir(t) ? { ...t } : Array.isArray(t) ? [...t] : t;
}
var IE = /* @__PURE__ */ new Set([
  "string",
  "number",
  "symbol"
]);
function tu(t) {
  return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function _a(t, a, r) {
  const o = new t._zod.constr(a ?? t._zod.def);
  return (!a || r?.parent) && (o._zod.parent = t), o;
}
function se(t) {
  const a = t;
  if (!a) return {};
  if (typeof a == "string") return { error: () => a };
  if (a?.message !== void 0) {
    if (a?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
    a.error = a.message;
  }
  return delete a.message, typeof a.error == "string" ? {
    ...a,
    error: () => a.error
  } : a;
}
function $E(t) {
  return Object.keys(t).filter((a) => t[a]._zod.optin === "optional" && t[a]._zod.optout === "optional");
}
var JR = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function FE(t, a) {
  const r = t._zod.def;
  return _a(t, Wa(t._zod.def, {
    get shape() {
      const o = {};
      for (const u in a) {
        if (!(u in r.shape)) throw new Error(`Unrecognized key: "${u}"`);
        a[u] && (o[u] = r.shape[u]);
      }
      return Qa(this, "shape", o), o;
    },
    checks: []
  }));
}
function QE(t, a) {
  const r = t._zod.def;
  return _a(t, Wa(t._zod.def, {
    get shape() {
      const o = { ...t._zod.def.shape };
      for (const u in a) {
        if (!(u in r.shape)) throw new Error(`Unrecognized key: "${u}"`);
        a[u] && delete o[u];
      }
      return Qa(this, "shape", o), o;
    },
    checks: []
  }));
}
function WE(t, a) {
  if (!Ir(a)) throw new Error("Invalid input to extend: expected a plain object");
  const r = t._zod.def.checks;
  if (r && r.length > 0) throw new Error("Object schemas containing refinements cannot be extended. Use `.safeExtend()` instead.");
  return _a(t, Wa(t._zod.def, {
    get shape() {
      const o = {
        ...t._zod.def.shape,
        ...a
      };
      return Qa(this, "shape", o), o;
    },
    checks: []
  }));
}
function KE(t, a) {
  if (!Ir(a)) throw new Error("Invalid input to safeExtend: expected a plain object");
  return _a(t, {
    ...t._zod.def,
    get shape() {
      const r = {
        ...t._zod.def.shape,
        ...a
      };
      return Qa(this, "shape", r), r;
    },
    checks: t._zod.def.checks
  });
}
function JE(t, a) {
  return _a(t, Wa(t._zod.def, {
    get shape() {
      const r = {
        ...t._zod.def.shape,
        ...a._zod.def.shape
      };
      return Qa(this, "shape", r), r;
    },
    get catchall() {
      return a._zod.def.catchall;
    },
    checks: []
  }));
}
function eS(t, a, r) {
  return _a(a, Wa(a._zod.def, {
    get shape() {
      const o = a._zod.def.shape, u = { ...o };
      if (r) for (const f in r) {
        if (!(f in o)) throw new Error(`Unrecognized key: "${f}"`);
        r[f] && (u[f] = t ? new t({
          type: "optional",
          innerType: o[f]
        }) : o[f]);
      }
      else for (const f in o) u[f] = t ? new t({
        type: "optional",
        innerType: o[f]
      }) : o[f];
      return Qa(this, "shape", u), u;
    },
    checks: []
  }));
}
function tS(t, a, r) {
  return _a(a, Wa(a._zod.def, {
    get shape() {
      const o = a._zod.def.shape, u = { ...o };
      if (r) for (const f in r) {
        if (!(f in u)) throw new Error(`Unrecognized key: "${f}"`);
        r[f] && (u[f] = new t({
          type: "nonoptional",
          innerType: o[f]
        }));
      }
      else for (const f in o) u[f] = new t({
        type: "nonoptional",
        innerType: o[f]
      });
      return Qa(this, "shape", u), u;
    },
    checks: []
  }));
}
function Gi(t, a = 0) {
  if (t.aborted === !0) return !0;
  for (let r = a; r < t.issues.length; r++) if (t.issues[r]?.continue !== !0) return !0;
  return !1;
}
function Wg(t, a) {
  return a.map((r) => {
    var o;
    return (o = r).path ?? (o.path = []), r.path.unshift(t), r;
  });
}
function Oo(t) {
  return typeof t == "string" ? t : t?.message;
}
function Ia(t, a, r) {
  const o = {
    ...t,
    path: t.path ?? []
  };
  return t.message || (o.message = Oo(t.inst?._zod.def?.error?.(t)) ?? Oo(a?.error?.(t)) ?? Oo(r.customError?.(t)) ?? Oo(r.localeError?.(t)) ?? "Invalid input"), delete o.inst, delete o.continue, a?.reportInput || delete o.input, o;
}
function Df(t) {
  return Array.isArray(t) ? "array" : typeof t == "string" ? "string" : "unknown";
}
function $r(...t) {
  const [a, r, o] = t;
  return typeof a == "string" ? {
    message: a,
    code: "custom",
    input: r,
    inst: o
  } : { ...a };
}
var Kg = (t, a) => {
  t.name = "$ZodError", Object.defineProperty(t, "_zod", {
    value: t._zod,
    enumerable: !1
  }), Object.defineProperty(t, "issues", {
    value: a,
    enumerable: !1
  }), t.message = JSON.stringify(a, cf, 2), Object.defineProperty(t, "toString", {
    value: () => t.message,
    enumerable: !1
  });
}, Jg = F("$ZodError", Kg), e0 = F("$ZodError", Kg, { Parent: Error });
function nS(t, a = (r) => r.message) {
  const r = {}, o = [];
  for (const u of t.issues) u.path.length > 0 ? (r[u.path[0]] = r[u.path[0]] || [], r[u.path[0]].push(a(u))) : o.push(a(u));
  return {
    formErrors: o,
    fieldErrors: r
  };
}
function aS(t, a = (r) => r.message) {
  const r = { _errors: [] }, o = (u) => {
    for (const f of u.issues) if (f.code === "invalid_union" && f.errors.length) f.errors.map((d) => o({ issues: d }));
    else if (f.code === "invalid_key") o({ issues: f.issues });
    else if (f.code === "invalid_element") o({ issues: f.issues });
    else if (f.path.length === 0) r._errors.push(a(f));
    else {
      let d = r, h = 0;
      for (; h < f.path.length; ) {
        const p = f.path[h];
        h !== f.path.length - 1 ? d[p] = d[p] || { _errors: [] } : (d[p] = d[p] || { _errors: [] }, d[p]._errors.push(a(f))), d = d[p], h++;
      }
    }
  };
  return o(t), r;
}
var Nf = (t) => (a, r, o, u) => {
  const f = o ? Object.assign(o, { async: !1 }) : { async: !1 }, d = a._zod.run({
    value: r,
    issues: []
  }, f);
  if (d instanceof Promise) throw new Xi();
  if (d.issues.length) {
    const h = new (u?.Err ?? t)(d.issues.map((p) => Ia(p, f, qa())));
    throw Fg(h, u?.callee), h;
  }
  return d.value;
};
var zf = (t) => async (a, r, o, u) => {
  const f = o ? Object.assign(o, { async: !0 }) : { async: !0 };
  let d = a._zod.run({
    value: r,
    issues: []
  }, f);
  if (d instanceof Promise && (d = await d), d.issues.length) {
    const h = new (u?.Err ?? t)(d.issues.map((p) => Ia(p, f, qa())));
    throw Fg(h, u?.callee), h;
  }
  return d.value;
};
var nu = (t) => (a, r, o) => {
  const u = o ? {
    ...o,
    async: !1
  } : { async: !1 }, f = a._zod.run({
    value: r,
    issues: []
  }, u);
  if (f instanceof Promise) throw new Xi();
  return f.issues.length ? {
    success: !1,
    error: new (t ?? Jg)(f.issues.map((d) => Ia(d, u, qa())))
  } : {
    success: !0,
    data: f.value
  };
}, iS = /* @__PURE__ */ nu(e0), au = (t) => async (a, r, o) => {
  const u = o ? Object.assign(o, { async: !0 }) : { async: !0 };
  let f = a._zod.run({
    value: r,
    issues: []
  }, u);
  return f instanceof Promise && (f = await f), f.issues.length ? {
    success: !1,
    error: new t(f.issues.map((d) => Ia(d, u, qa())))
  } : {
    success: !0,
    data: f.value
  };
}, rS = /* @__PURE__ */ au(e0), lS = (t) => (a, r, o) => {
  const u = o ? Object.assign(o, { direction: "backward" }) : { direction: "backward" };
  return Nf(t)(a, r, u);
};
var oS = (t) => (a, r, o) => Nf(t)(a, r, o);
var uS = (t) => async (a, r, o) => {
  const u = o ? Object.assign(o, { direction: "backward" }) : { direction: "backward" };
  return zf(t)(a, r, u);
};
var cS = (t) => async (a, r, o) => zf(t)(a, r, o);
var sS = (t) => (a, r, o) => {
  const u = o ? Object.assign(o, { direction: "backward" }) : { direction: "backward" };
  return nu(t)(a, r, u);
};
var fS = (t) => (a, r, o) => nu(t)(a, r, o);
var dS = (t) => async (a, r, o) => {
  const u = o ? Object.assign(o, { direction: "backward" }) : { direction: "backward" };
  return au(t)(a, r, u);
};
var hS = (t) => async (a, r, o) => au(t)(a, r, o);
var mS = /^[cC][^\s-]{8,}$/, vS = /^[0-9a-z]+$/, pS = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/, gS = /^[0-9a-vA-V]{20}$/, yS = /^[A-Za-z0-9]{27}$/, bS = /^[a-zA-Z0-9_-]{21}$/, _S = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/, ES = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/, hp = (t) => t ? new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${t}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`) : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/, SS = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/, TS = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
function AS() {
  return new RegExp(TS, "u");
}
var wS = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, CS = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/, OS = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/, RS = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, MS = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/, t0 = /^[A-Za-z0-9_-]*$/, DS = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/, NS = /^\+(?:[0-9]){6,14}[0-9]$/, n0 = "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))", zS = /* @__PURE__ */ new RegExp(`^${n0}$`);
function a0(t) {
  const a = "(?:[01]\\d|2[0-3]):[0-5]\\d";
  return typeof t.precision == "number" ? t.precision === -1 ? `${a}` : t.precision === 0 ? `${a}:[0-5]\\d` : `${a}:[0-5]\\d\\.\\d{${t.precision}}` : `${a}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function xS(t) {
  return new RegExp(`^${a0(t)}$`);
}
function HS(t) {
  const a = a0({ precision: t.precision }), r = ["Z"];
  t.local && r.push(""), t.offset && r.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
  const o = `${a}(?:${r.join("|")})`;
  return new RegExp(`^${n0}T(?:${o})$`);
}
var LS = (t) => {
  const a = t ? `[\\s\\S]{${t?.minimum ?? 0},${t?.maximum ?? ""}}` : "[\\s\\S]*";
  return new RegExp(`^${a}$`);
}, US = /^(?:true|false)$/i, BS = /^[^A-Z]*$/, jS = /^[^a-z]*$/, yn = /* @__PURE__ */ F("$ZodCheck", (t, a) => {
  var r;
  t._zod ?? (t._zod = {}), t._zod.def = a, (r = t._zod).onattach ?? (r.onattach = []);
}), ZS = /* @__PURE__ */ F("$ZodCheckMaxLength", (t, a) => {
  var r;
  yn.init(t, a), (r = t._zod.def).when ?? (r.when = (o) => {
    const u = o.value;
    return !Rf(u) && u.length !== void 0;
  }), t._zod.onattach.push((o) => {
    const u = o._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    a.maximum < u && (o._zod.bag.maximum = a.maximum);
  }), t._zod.check = (o) => {
    const u = o.value;
    if (u.length <= a.maximum) return;
    const f = Df(u);
    o.issues.push({
      origin: f,
      code: "too_big",
      maximum: a.maximum,
      inclusive: !0,
      input: u,
      inst: t,
      continue: !a.abort
    });
  };
}), GS = /* @__PURE__ */ F("$ZodCheckMinLength", (t, a) => {
  var r;
  yn.init(t, a), (r = t._zod.def).when ?? (r.when = (o) => {
    const u = o.value;
    return !Rf(u) && u.length !== void 0;
  }), t._zod.onattach.push((o) => {
    const u = o._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    a.minimum > u && (o._zod.bag.minimum = a.minimum);
  }), t._zod.check = (o) => {
    const u = o.value;
    if (u.length >= a.minimum) return;
    const f = Df(u);
    o.issues.push({
      origin: f,
      code: "too_small",
      minimum: a.minimum,
      inclusive: !0,
      input: u,
      inst: t,
      continue: !a.abort
    });
  };
}), PS = /* @__PURE__ */ F("$ZodCheckLengthEquals", (t, a) => {
  var r;
  yn.init(t, a), (r = t._zod.def).when ?? (r.when = (o) => {
    const u = o.value;
    return !Rf(u) && u.length !== void 0;
  }), t._zod.onattach.push((o) => {
    const u = o._zod.bag;
    u.minimum = a.length, u.maximum = a.length, u.length = a.length;
  }), t._zod.check = (o) => {
    const u = o.value, f = u.length;
    if (f === a.length) return;
    const d = Df(u), h = f > a.length;
    o.issues.push({
      origin: d,
      ...h ? {
        code: "too_big",
        maximum: a.length
      } : {
        code: "too_small",
        minimum: a.length
      },
      inclusive: !0,
      exact: !0,
      input: o.value,
      inst: t,
      continue: !a.abort
    });
  };
}), iu = /* @__PURE__ */ F("$ZodCheckStringFormat", (t, a) => {
  var r, o;
  yn.init(t, a), t._zod.onattach.push((u) => {
    const f = u._zod.bag;
    f.format = a.format, a.pattern && (f.patterns ?? (f.patterns = /* @__PURE__ */ new Set()), f.patterns.add(a.pattern));
  }), a.pattern ? (r = t._zod).check ?? (r.check = (u) => {
    a.pattern.lastIndex = 0, !a.pattern.test(u.value) && u.issues.push({
      origin: "string",
      code: "invalid_format",
      format: a.format,
      input: u.value,
      ...a.pattern ? { pattern: a.pattern.toString() } : {},
      inst: t,
      continue: !a.abort
    });
  }) : (o = t._zod).check ?? (o.check = () => {
  });
}), XS = /* @__PURE__ */ F("$ZodCheckRegex", (t, a) => {
  iu.init(t, a), t._zod.check = (r) => {
    a.pattern.lastIndex = 0, !a.pattern.test(r.value) && r.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: r.value,
      pattern: a.pattern.toString(),
      inst: t,
      continue: !a.abort
    });
  };
}), kS = /* @__PURE__ */ F("$ZodCheckLowerCase", (t, a) => {
  a.pattern ?? (a.pattern = BS), iu.init(t, a);
}), VS = /* @__PURE__ */ F("$ZodCheckUpperCase", (t, a) => {
  a.pattern ?? (a.pattern = jS), iu.init(t, a);
}), YS = /* @__PURE__ */ F("$ZodCheckIncludes", (t, a) => {
  yn.init(t, a);
  const r = tu(a.includes), o = new RegExp(typeof a.position == "number" ? `^.{${a.position}}${r}` : r);
  a.pattern = o, t._zod.onattach.push((u) => {
    const f = u._zod.bag;
    f.patterns ?? (f.patterns = /* @__PURE__ */ new Set()), f.patterns.add(o);
  }), t._zod.check = (u) => {
    u.value.includes(a.includes, a.position) || u.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: a.includes,
      input: u.value,
      inst: t,
      continue: !a.abort
    });
  };
}), qS = /* @__PURE__ */ F("$ZodCheckStartsWith", (t, a) => {
  yn.init(t, a);
  const r = new RegExp(`^${tu(a.prefix)}.*`);
  a.pattern ?? (a.pattern = r), t._zod.onattach.push((o) => {
    const u = o._zod.bag;
    u.patterns ?? (u.patterns = /* @__PURE__ */ new Set()), u.patterns.add(r);
  }), t._zod.check = (o) => {
    o.value.startsWith(a.prefix) || o.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: a.prefix,
      input: o.value,
      inst: t,
      continue: !a.abort
    });
  };
}), IS = /* @__PURE__ */ F("$ZodCheckEndsWith", (t, a) => {
  yn.init(t, a);
  const r = new RegExp(`.*${tu(a.suffix)}$`);
  a.pattern ?? (a.pattern = r), t._zod.onattach.push((o) => {
    const u = o._zod.bag;
    u.patterns ?? (u.patterns = /* @__PURE__ */ new Set()), u.patterns.add(r);
  }), t._zod.check = (o) => {
    o.value.endsWith(a.suffix) || o.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: a.suffix,
      input: o.value,
      inst: t,
      continue: !a.abort
    });
  };
}), $S = /* @__PURE__ */ F("$ZodCheckOverwrite", (t, a) => {
  yn.init(t, a), t._zod.check = (r) => {
    r.value = a.tx(r.value);
  };
}), FS = class {
  constructor(t = []) {
    this.content = [], this.indent = 0, this && (this.args = t);
  }
  indented(t) {
    this.indent += 1, t(this), this.indent -= 1;
  }
  write(t) {
    if (typeof t == "function") {
      t(this, { execution: "sync" }), t(this, { execution: "async" });
      return;
    }
    const a = t.split(`
`).filter((u) => u), r = Math.min(...a.map((u) => u.length - u.trimStart().length)), o = a.map((u) => u.slice(r)).map((u) => " ".repeat(this.indent * 2) + u);
    for (const u of o) this.content.push(u);
  }
  compile() {
    const t = Function, a = this?.args, r = [...(this?.content ?? [""]).map((o) => `  ${o}`)];
    return new t(...a, r.join(`
`));
  }
}, QS = {
  major: 4,
  minor: 1,
  patch: 12
}, Je = /* @__PURE__ */ F("$ZodType", (t, a) => {
  var r;
  t ?? (t = {}), t._zod.def = a, t._zod.bag = t._zod.bag || {}, t._zod.version = QS;
  const o = [...t._zod.def.checks ?? []];
  t._zod.traits.has("$ZodCheck") && o.unshift(t);
  for (const u of o) for (const f of u._zod.onattach) f(t);
  if (o.length === 0)
    (r = t._zod).deferred ?? (r.deferred = []), t._zod.deferred?.push(() => {
      t._zod.run = t._zod.parse;
    });
  else {
    const u = (d, h, p) => {
      let g = Gi(d), v;
      for (const b of h) {
        if (b._zod.def.when) {
          if (!b._zod.def.when(d)) continue;
        } else if (g) continue;
        const E = d.issues.length, S = b._zod.check(d);
        if (S instanceof Promise && p?.async === !1) throw new Xi();
        if (v || S instanceof Promise) v = (v ?? Promise.resolve()).then(async () => {
          await S, d.issues.length !== E && (g || (g = Gi(d, E)));
        });
        else {
          if (d.issues.length === E) continue;
          g || (g = Gi(d, E));
        }
      }
      return v ? v.then(() => d) : d;
    }, f = (d, h, p) => {
      if (Gi(d))
        return d.aborted = !0, d;
      const g = u(h, o, p);
      if (g instanceof Promise) {
        if (p.async === !1) throw new Xi();
        return g.then((v) => t._zod.parse(v, p));
      }
      return t._zod.parse(g, p);
    };
    t._zod.run = (d, h) => {
      if (h.skipChecks) return t._zod.parse(d, h);
      if (h.direction === "backward") {
        const g = t._zod.parse({
          value: d.value,
          issues: []
        }, {
          ...h,
          skipChecks: !0
        });
        return g instanceof Promise ? g.then((v) => f(v, d, h)) : f(g, d, h);
      }
      const p = t._zod.parse(d, h);
      if (p instanceof Promise) {
        if (h.async === !1) throw new Xi();
        return p.then((g) => u(g, o, h));
      }
      return u(p, o, h);
    };
  }
  t["~standard"] = {
    validate: (u) => {
      try {
        const f = iS(t, u);
        return f.success ? { value: f.data } : { issues: f.error?.issues };
      } catch {
        return rS(t, u).then((d) => d.success ? { value: d.data } : { issues: d.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  };
}), xf = /* @__PURE__ */ F("$ZodString", (t, a) => {
  Je.init(t, a), t._zod.pattern = [...t?._zod.bag?.patterns ?? []].pop() ?? LS(t._zod.bag), t._zod.parse = (r, o) => {
    if (a.coerce) try {
      r.value = String(r.value);
    } catch {
    }
    return typeof r.value == "string" || r.issues.push({
      expected: "string",
      code: "invalid_type",
      input: r.value,
      inst: t
    }), r;
  };
}), Xe = /* @__PURE__ */ F("$ZodStringFormat", (t, a) => {
  iu.init(t, a), xf.init(t, a);
}), WS = /* @__PURE__ */ F("$ZodGUID", (t, a) => {
  a.pattern ?? (a.pattern = ES), Xe.init(t, a);
}), KS = /* @__PURE__ */ F("$ZodUUID", (t, a) => {
  if (a.version) {
    const r = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    }[a.version];
    if (r === void 0) throw new Error(`Invalid UUID version: "${a.version}"`);
    a.pattern ?? (a.pattern = hp(r));
  } else a.pattern ?? (a.pattern = hp());
  Xe.init(t, a);
}), JS = /* @__PURE__ */ F("$ZodEmail", (t, a) => {
  a.pattern ?? (a.pattern = SS), Xe.init(t, a);
}), e2 = /* @__PURE__ */ F("$ZodURL", (t, a) => {
  Xe.init(t, a), t._zod.check = (r) => {
    try {
      const o = r.value.trim(), u = new URL(o);
      a.hostname && (a.hostname.lastIndex = 0, a.hostname.test(u.hostname) || r.issues.push({
        code: "invalid_format",
        format: "url",
        note: "Invalid hostname",
        pattern: DS.source,
        input: r.value,
        inst: t,
        continue: !a.abort
      })), a.protocol && (a.protocol.lastIndex = 0, a.protocol.test(u.protocol.endsWith(":") ? u.protocol.slice(0, -1) : u.protocol) || r.issues.push({
        code: "invalid_format",
        format: "url",
        note: "Invalid protocol",
        pattern: a.protocol.source,
        input: r.value,
        inst: t,
        continue: !a.abort
      })), a.normalize ? r.value = u.href : r.value = o;
      return;
    } catch {
      r.issues.push({
        code: "invalid_format",
        format: "url",
        input: r.value,
        inst: t,
        continue: !a.abort
      });
    }
  };
}), t2 = /* @__PURE__ */ F("$ZodEmoji", (t, a) => {
  a.pattern ?? (a.pattern = AS()), Xe.init(t, a);
}), n2 = /* @__PURE__ */ F("$ZodNanoID", (t, a) => {
  a.pattern ?? (a.pattern = bS), Xe.init(t, a);
}), a2 = /* @__PURE__ */ F("$ZodCUID", (t, a) => {
  a.pattern ?? (a.pattern = mS), Xe.init(t, a);
}), i2 = /* @__PURE__ */ F("$ZodCUID2", (t, a) => {
  a.pattern ?? (a.pattern = vS), Xe.init(t, a);
}), r2 = /* @__PURE__ */ F("$ZodULID", (t, a) => {
  a.pattern ?? (a.pattern = pS), Xe.init(t, a);
}), l2 = /* @__PURE__ */ F("$ZodXID", (t, a) => {
  a.pattern ?? (a.pattern = gS), Xe.init(t, a);
}), o2 = /* @__PURE__ */ F("$ZodKSUID", (t, a) => {
  a.pattern ?? (a.pattern = yS), Xe.init(t, a);
}), u2 = /* @__PURE__ */ F("$ZodISODateTime", (t, a) => {
  a.pattern ?? (a.pattern = HS(a)), Xe.init(t, a);
}), c2 = /* @__PURE__ */ F("$ZodISODate", (t, a) => {
  a.pattern ?? (a.pattern = zS), Xe.init(t, a);
}), s2 = /* @__PURE__ */ F("$ZodISOTime", (t, a) => {
  a.pattern ?? (a.pattern = xS(a)), Xe.init(t, a);
}), f2 = /* @__PURE__ */ F("$ZodISODuration", (t, a) => {
  a.pattern ?? (a.pattern = _S), Xe.init(t, a);
}), d2 = /* @__PURE__ */ F("$ZodIPv4", (t, a) => {
  a.pattern ?? (a.pattern = wS), Xe.init(t, a), t._zod.onattach.push((r) => {
    const o = r._zod.bag;
    o.format = "ipv4";
  });
}), h2 = /* @__PURE__ */ F("$ZodIPv6", (t, a) => {
  a.pattern ?? (a.pattern = CS), Xe.init(t, a), t._zod.onattach.push((r) => {
    const o = r._zod.bag;
    o.format = "ipv6";
  }), t._zod.check = (r) => {
    try {
      new URL(`http://[${r.value}]`);
    } catch {
      r.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: r.value,
        inst: t,
        continue: !a.abort
      });
    }
  };
}), m2 = /* @__PURE__ */ F("$ZodCIDRv4", (t, a) => {
  a.pattern ?? (a.pattern = OS), Xe.init(t, a);
}), v2 = /* @__PURE__ */ F("$ZodCIDRv6", (t, a) => {
  a.pattern ?? (a.pattern = RS), Xe.init(t, a), t._zod.check = (r) => {
    const o = r.value.split("/");
    try {
      if (o.length !== 2) throw new Error();
      const [u, f] = o;
      if (!f) throw new Error();
      const d = Number(f);
      if (`${d}` !== f) throw new Error();
      if (d < 0 || d > 128) throw new Error();
      new URL(`http://[${u}]`);
    } catch {
      r.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: r.value,
        inst: t,
        continue: !a.abort
      });
    }
  };
});
function i0(t) {
  if (t === "") return !0;
  if (t.length % 4 !== 0) return !1;
  try {
    return atob(t), !0;
  } catch {
    return !1;
  }
}
var p2 = /* @__PURE__ */ F("$ZodBase64", (t, a) => {
  a.pattern ?? (a.pattern = MS), Xe.init(t, a), t._zod.onattach.push((r) => {
    r._zod.bag.contentEncoding = "base64";
  }), t._zod.check = (r) => {
    i0(r.value) || r.issues.push({
      code: "invalid_format",
      format: "base64",
      input: r.value,
      inst: t,
      continue: !a.abort
    });
  };
});
function g2(t) {
  if (!t0.test(t)) return !1;
  const a = t.replace(/[-_]/g, (r) => r === "-" ? "+" : "/");
  return i0(a.padEnd(Math.ceil(a.length / 4) * 4, "="));
}
var y2 = /* @__PURE__ */ F("$ZodBase64URL", (t, a) => {
  a.pattern ?? (a.pattern = t0), Xe.init(t, a), t._zod.onattach.push((r) => {
    r._zod.bag.contentEncoding = "base64url";
  }), t._zod.check = (r) => {
    g2(r.value) || r.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: r.value,
      inst: t,
      continue: !a.abort
    });
  };
}), b2 = /* @__PURE__ */ F("$ZodE164", (t, a) => {
  a.pattern ?? (a.pattern = NS), Xe.init(t, a);
});
function _2(t, a = null) {
  try {
    const r = t.split(".");
    if (r.length !== 3) return !1;
    const [o] = r;
    if (!o) return !1;
    const u = JSON.parse(atob(o));
    return !("typ" in u && u?.typ !== "JWT" || !u.alg || a && (!("alg" in u) || u.alg !== a));
  } catch {
    return !1;
  }
}
var E2 = /* @__PURE__ */ F("$ZodJWT", (t, a) => {
  Xe.init(t, a), t._zod.check = (r) => {
    _2(r.value, a.alg) || r.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: r.value,
      inst: t,
      continue: !a.abort
    });
  };
}), S2 = /* @__PURE__ */ F("$ZodBoolean", (t, a) => {
  Je.init(t, a), t._zod.pattern = US, t._zod.parse = (r, o) => {
    if (a.coerce) try {
      r.value = !!r.value;
    } catch {
    }
    const u = r.value;
    return typeof u == "boolean" || r.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input: u,
      inst: t
    }), r;
  };
}), T2 = /* @__PURE__ */ F("$ZodUnknown", (t, a) => {
  Je.init(t, a), t._zod.parse = (r) => r;
}), A2 = /* @__PURE__ */ F("$ZodNever", (t, a) => {
  Je.init(t, a), t._zod.parse = (r, o) => (r.issues.push({
    expected: "never",
    code: "invalid_type",
    input: r.value,
    inst: t
  }), r);
});
function mp(t, a, r) {
  t.issues.length && a.issues.push(...Wg(r, t.issues)), a.value[r] = t.value;
}
var w2 = /* @__PURE__ */ F("$ZodArray", (t, a) => {
  Je.init(t, a), t._zod.parse = (r, o) => {
    const u = r.value;
    if (!Array.isArray(u))
      return r.issues.push({
        expected: "array",
        code: "invalid_type",
        input: u,
        inst: t
      }), r;
    r.value = Array(u.length);
    const f = [];
    for (let d = 0; d < u.length; d++) {
      const h = u[d], p = a.element._zod.run({
        value: h,
        issues: []
      }, o);
      p instanceof Promise ? f.push(p.then((g) => mp(g, r, d))) : mp(p, r, d);
    }
    return f.length ? Promise.all(f).then(() => r) : r;
  };
});
function qo(t, a, r, o) {
  t.issues.length && a.issues.push(...Wg(r, t.issues)), t.value === void 0 ? r in o && (a.value[r] = void 0) : a.value[r] = t.value;
}
function r0(t) {
  const a = Object.keys(t.shape);
  for (const o of a) if (!t.shape?.[o]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${o}": expected a Zod schema`);
  const r = $E(t.shape);
  return {
    ...t,
    keys: a,
    keySet: new Set(a),
    numKeys: a.length,
    optionalKeys: new Set(r)
  };
}
function l0(t, a, r, o, u, f) {
  const d = [], h = u.keySet, p = u.catchall._zod, g = p.def.type;
  for (const v of Object.keys(a)) {
    if (h.has(v)) continue;
    if (g === "never") {
      d.push(v);
      continue;
    }
    const b = p.run({
      value: a[v],
      issues: []
    }, o);
    b instanceof Promise ? t.push(b.then((E) => qo(E, r, v, a))) : qo(b, r, v, a);
  }
  return d.length && r.issues.push({
    code: "unrecognized_keys",
    keys: d,
    input: a,
    inst: f
  }), t.length ? Promise.all(t).then(() => r) : r;
}
var C2 = /* @__PURE__ */ F("$ZodObject", (t, a) => {
  if (Je.init(t, a), !Object.getOwnPropertyDescriptor(a, "shape")?.get) {
    const d = a.shape;
    Object.defineProperty(a, "shape", { get: () => {
      const h = { ...d };
      return Object.defineProperty(a, "shape", { value: h }), h;
    } });
  }
  const r = Of(() => r0(a));
  Ue(t._zod, "propValues", () => {
    const d = a.shape, h = {};
    for (const p in d) {
      const g = d[p]._zod;
      if (g.values) {
        h[p] ?? (h[p] = /* @__PURE__ */ new Set());
        for (const v of g.values) h[p].add(v);
      }
    }
    return h;
  });
  const o = Yo, u = a.catchall;
  let f;
  t._zod.parse = (d, h) => {
    f ?? (f = r.value);
    const p = d.value;
    if (!o(p))
      return d.issues.push({
        expected: "object",
        code: "invalid_type",
        input: p,
        inst: t
      }), d;
    d.value = {};
    const g = [], v = f.shape;
    for (const b of f.keys) {
      const E = v[b]._zod.run({
        value: p[b],
        issues: []
      }, h);
      E instanceof Promise ? g.push(E.then((S) => qo(S, d, b, p))) : qo(E, d, b, p);
    }
    return u ? l0(g, p, d, h, r.value, t) : g.length ? Promise.all(g).then(() => d) : d;
  };
}), O2 = /* @__PURE__ */ F("$ZodObjectJIT", (t, a) => {
  C2.init(t, a);
  const r = t._zod.parse, o = Of(() => r0(a)), u = (E) => {
    const S = new FS([
      "shape",
      "payload",
      "ctx"
    ]), O = o.value, T = (G) => {
      const N = dp(G);
      return `shape[${N}]._zod.run({ value: input[${N}], issues: [] }, ctx)`;
    };
    S.write("const input = payload.value;");
    const R = /* @__PURE__ */ Object.create(null);
    let L = 0;
    for (const G of O.keys) R[G] = `key_${L++}`;
    S.write("const newResult = {};");
    for (const G of O.keys) {
      const N = R[G], X = dp(G);
      S.write(`const ${N} = ${T(G)};`), S.write(`
        if (${N}.issues.length) {
          payload.issues = payload.issues.concat(${N}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${X}, ...iss.path] : [${X}]
          })));
        }
        
        
        if (${N}.value === undefined) {
          if (${X} in input) {
            newResult[${X}] = undefined;
          }
        } else {
          newResult[${X}] = ${N}.value;
        }
        
      `);
    }
    S.write("payload.value = newResult;"), S.write("return payload;");
    const j = S.compile();
    return (G, N) => j(E, G, N);
  };
  let f;
  const d = Yo, h = !uf.jitless, g = h && qE.value, v = a.catchall;
  let b;
  t._zod.parse = (E, S) => {
    b ?? (b = o.value);
    const O = E.value;
    return d(O) ? h && g && S?.async === !1 && S.jitless !== !0 ? (f || (f = u(a.shape)), E = f(E, S), v ? l0([], O, E, S, b, t) : E) : r(E, S) : (E.issues.push({
      expected: "object",
      code: "invalid_type",
      input: O,
      inst: t
    }), E);
  };
});
function vp(t, a, r, o) {
  for (const f of t) if (f.issues.length === 0)
    return a.value = f.value, a;
  const u = t.filter((f) => !Gi(f));
  return u.length === 1 ? (a.value = u[0].value, u[0]) : (a.issues.push({
    code: "invalid_union",
    input: a.value,
    inst: r,
    errors: t.map((f) => f.issues.map((d) => Ia(d, o, qa())))
  }), a);
}
var R2 = /* @__PURE__ */ F("$ZodUnion", (t, a) => {
  Je.init(t, a), Ue(t._zod, "optin", () => a.options.some((u) => u._zod.optin === "optional") ? "optional" : void 0), Ue(t._zod, "optout", () => a.options.some((u) => u._zod.optout === "optional") ? "optional" : void 0), Ue(t._zod, "values", () => {
    if (a.options.every((u) => u._zod.values)) return new Set(a.options.flatMap((u) => Array.from(u._zod.values)));
  }), Ue(t._zod, "pattern", () => {
    if (a.options.every((u) => u._zod.pattern)) {
      const u = a.options.map((f) => f._zod.pattern);
      return new RegExp(`^(${u.map((f) => Mf(f.source)).join("|")})$`);
    }
  });
  const r = a.options.length === 1, o = a.options[0]._zod.run;
  t._zod.parse = (u, f) => {
    if (r) return o(u, f);
    let d = !1;
    const h = [];
    for (const p of a.options) {
      const g = p._zod.run({
        value: u.value,
        issues: []
      }, f);
      if (g instanceof Promise)
        h.push(g), d = !0;
      else {
        if (g.issues.length === 0) return g;
        h.push(g);
      }
    }
    return d ? Promise.all(h).then((p) => vp(p, u, t, f)) : vp(h, u, t, f);
  };
}), M2 = /* @__PURE__ */ F("$ZodIntersection", (t, a) => {
  Je.init(t, a), t._zod.parse = (r, o) => {
    const u = r.value, f = a.left._zod.run({
      value: u,
      issues: []
    }, o), d = a.right._zod.run({
      value: u,
      issues: []
    }, o);
    return f instanceof Promise || d instanceof Promise ? Promise.all([f, d]).then(([h, p]) => pp(r, h, p)) : pp(r, f, d);
  };
});
function sf(t, a) {
  if (t === a) return {
    valid: !0,
    data: t
  };
  if (t instanceof Date && a instanceof Date && +t == +a) return {
    valid: !0,
    data: t
  };
  if (Ir(t) && Ir(a)) {
    const r = Object.keys(a), o = Object.keys(t).filter((f) => r.indexOf(f) !== -1), u = {
      ...t,
      ...a
    };
    for (const f of o) {
      const d = sf(t[f], a[f]);
      if (!d.valid) return {
        valid: !1,
        mergeErrorPath: [f, ...d.mergeErrorPath]
      };
      u[f] = d.data;
    }
    return {
      valid: !0,
      data: u
    };
  }
  if (Array.isArray(t) && Array.isArray(a)) {
    if (t.length !== a.length) return {
      valid: !1,
      mergeErrorPath: []
    };
    const r = [];
    for (let o = 0; o < t.length; o++) {
      const u = t[o], f = a[o], d = sf(u, f);
      if (!d.valid) return {
        valid: !1,
        mergeErrorPath: [o, ...d.mergeErrorPath]
      };
      r.push(d.data);
    }
    return {
      valid: !0,
      data: r
    };
  }
  return {
    valid: !1,
    mergeErrorPath: []
  };
}
function pp(t, a, r) {
  if (a.issues.length && t.issues.push(...a.issues), r.issues.length && t.issues.push(...r.issues), Gi(t)) return t;
  const o = sf(a.value, r.value);
  if (!o.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(o.mergeErrorPath)}`);
  return t.value = o.data, t;
}
var D2 = /* @__PURE__ */ F("$ZodEnum", (t, a) => {
  Je.init(t, a);
  const r = YE(a.entries), o = new Set(r);
  t._zod.values = o, t._zod.pattern = new RegExp(`^(${r.filter((u) => IE.has(typeof u)).map((u) => typeof u == "string" ? tu(u) : u.toString()).join("|")})$`), t._zod.parse = (u, f) => {
    const d = u.value;
    return o.has(d) || u.issues.push({
      code: "invalid_value",
      values: r,
      input: d,
      inst: t
    }), u;
  };
}), N2 = /* @__PURE__ */ F("$ZodTransform", (t, a) => {
  Je.init(t, a), t._zod.parse = (r, o) => {
    if (o.direction === "backward") throw new $g(t.constructor.name);
    const u = a.transform(r.value, r);
    if (o.async) return (u instanceof Promise ? u : Promise.resolve(u)).then((f) => (r.value = f, r));
    if (u instanceof Promise) throw new Xi();
    return r.value = u, r;
  };
});
function gp(t, a) {
  return t.issues.length && a === void 0 ? {
    issues: [],
    value: void 0
  } : t;
}
var z2 = /* @__PURE__ */ F("$ZodOptional", (t, a) => {
  Je.init(t, a), t._zod.optin = "optional", t._zod.optout = "optional", Ue(t._zod, "values", () => a.innerType._zod.values ? /* @__PURE__ */ new Set([...a.innerType._zod.values, void 0]) : void 0), Ue(t._zod, "pattern", () => {
    const r = a.innerType._zod.pattern;
    return r ? new RegExp(`^(${Mf(r.source)})?$`) : void 0;
  }), t._zod.parse = (r, o) => {
    if (a.innerType._zod.optin === "optional") {
      const u = a.innerType._zod.run(r, o);
      return u instanceof Promise ? u.then((f) => gp(f, r.value)) : gp(u, r.value);
    }
    return r.value === void 0 ? r : a.innerType._zod.run(r, o);
  };
}), x2 = /* @__PURE__ */ F("$ZodNullable", (t, a) => {
  Je.init(t, a), Ue(t._zod, "optin", () => a.innerType._zod.optin), Ue(t._zod, "optout", () => a.innerType._zod.optout), Ue(t._zod, "pattern", () => {
    const r = a.innerType._zod.pattern;
    return r ? new RegExp(`^(${Mf(r.source)}|null)$`) : void 0;
  }), Ue(t._zod, "values", () => a.innerType._zod.values ? /* @__PURE__ */ new Set([...a.innerType._zod.values, null]) : void 0), t._zod.parse = (r, o) => r.value === null ? r : a.innerType._zod.run(r, o);
}), H2 = /* @__PURE__ */ F("$ZodDefault", (t, a) => {
  Je.init(t, a), t._zod.optin = "optional", Ue(t._zod, "values", () => a.innerType._zod.values), t._zod.parse = (r, o) => {
    if (o.direction === "backward") return a.innerType._zod.run(r, o);
    if (r.value === void 0)
      return r.value = a.defaultValue, r;
    const u = a.innerType._zod.run(r, o);
    return u instanceof Promise ? u.then((f) => yp(f, a)) : yp(u, a);
  };
});
function yp(t, a) {
  return t.value === void 0 && (t.value = a.defaultValue), t;
}
var L2 = /* @__PURE__ */ F("$ZodPrefault", (t, a) => {
  Je.init(t, a), t._zod.optin = "optional", Ue(t._zod, "values", () => a.innerType._zod.values), t._zod.parse = (r, o) => (o.direction === "backward" || r.value === void 0 && (r.value = a.defaultValue), a.innerType._zod.run(r, o));
}), U2 = /* @__PURE__ */ F("$ZodNonOptional", (t, a) => {
  Je.init(t, a), Ue(t._zod, "values", () => {
    const r = a.innerType._zod.values;
    return r ? new Set([...r].filter((o) => o !== void 0)) : void 0;
  }), t._zod.parse = (r, o) => {
    const u = a.innerType._zod.run(r, o);
    return u instanceof Promise ? u.then((f) => bp(f, t)) : bp(u, t);
  };
});
function bp(t, a) {
  return !t.issues.length && t.value === void 0 && t.issues.push({
    code: "invalid_type",
    expected: "nonoptional",
    input: t.value,
    inst: a
  }), t;
}
var B2 = /* @__PURE__ */ F("$ZodCatch", (t, a) => {
  Je.init(t, a), Ue(t._zod, "optin", () => a.innerType._zod.optin), Ue(t._zod, "optout", () => a.innerType._zod.optout), Ue(t._zod, "values", () => a.innerType._zod.values), t._zod.parse = (r, o) => {
    if (o.direction === "backward") return a.innerType._zod.run(r, o);
    const u = a.innerType._zod.run(r, o);
    return u instanceof Promise ? u.then((f) => (r.value = f.value, f.issues.length && (r.value = a.catchValue({
      ...r,
      error: { issues: f.issues.map((d) => Ia(d, o, qa())) },
      input: r.value
    }), r.issues = []), r)) : (r.value = u.value, u.issues.length && (r.value = a.catchValue({
      ...r,
      error: { issues: u.issues.map((f) => Ia(f, o, qa())) },
      input: r.value
    }), r.issues = []), r);
  };
}), j2 = /* @__PURE__ */ F("$ZodPipe", (t, a) => {
  Je.init(t, a), Ue(t._zod, "values", () => a.in._zod.values), Ue(t._zod, "optin", () => a.in._zod.optin), Ue(t._zod, "optout", () => a.out._zod.optout), Ue(t._zod, "propValues", () => a.in._zod.propValues), t._zod.parse = (r, o) => {
    if (o.direction === "backward") {
      const f = a.out._zod.run(r, o);
      return f instanceof Promise ? f.then((d) => Ro(d, a.in, o)) : Ro(f, a.in, o);
    }
    const u = a.in._zod.run(r, o);
    return u instanceof Promise ? u.then((f) => Ro(f, a.out, o)) : Ro(u, a.out, o);
  };
});
function Ro(t, a, r) {
  return t.issues.length ? (t.aborted = !0, t) : a._zod.run({
    value: t.value,
    issues: t.issues
  }, r);
}
var Z2 = /* @__PURE__ */ F("$ZodReadonly", (t, a) => {
  Je.init(t, a), Ue(t._zod, "propValues", () => a.innerType._zod.propValues), Ue(t._zod, "values", () => a.innerType._zod.values), Ue(t._zod, "optin", () => a.innerType._zod.optin), Ue(t._zod, "optout", () => a.innerType._zod.optout), t._zod.parse = (r, o) => {
    if (o.direction === "backward") return a.innerType._zod.run(r, o);
    const u = a.innerType._zod.run(r, o);
    return u instanceof Promise ? u.then(_p) : _p(u);
  };
});
function _p(t) {
  return t.value = Object.freeze(t.value), t;
}
var G2 = /* @__PURE__ */ F("$ZodCustom", (t, a) => {
  yn.init(t, a), Je.init(t, a), t._zod.parse = (r, o) => r, t._zod.check = (r) => {
    const o = r.value, u = a.fn(o);
    if (u instanceof Promise) return u.then((f) => Ep(f, r, o, t));
    Ep(u, r, o, t);
  };
});
function Ep(t, a, r, o) {
  if (!t) {
    const u = {
      code: "custom",
      input: r,
      inst: o,
      path: [...o._zod.def.path ?? []],
      continue: !o._zod.def.abort
    };
    o._zod.def.params && (u.params = o._zod.def.params), a.issues.push($r(u));
  }
}
var P2 = class {
  constructor() {
    this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map();
  }
  add(t, ...a) {
    const r = a[0];
    if (this._map.set(t, r), r && typeof r == "object" && "id" in r) {
      if (this._idmap.has(r.id)) throw new Error(`ID ${r.id} already exists in the registry`);
      this._idmap.set(r.id, t);
    }
    return this;
  }
  clear() {
    return this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map(), this;
  }
  remove(t) {
    const a = this._map.get(t);
    return a && typeof a == "object" && "id" in a && this._idmap.delete(a.id), this._map.delete(t), this;
  }
  get(t) {
    const a = t._zod.parent;
    if (a) {
      const r = { ...this.get(a) ?? {} };
      delete r.id;
      const o = {
        ...r,
        ...this._map.get(t)
      };
      return Object.keys(o).length ? o : void 0;
    }
    return this._map.get(t);
  }
  has(t) {
    return this._map.has(t);
  }
};
function X2() {
  return new P2();
}
var Mo = /* @__PURE__ */ X2();
function k2(t, a) {
  return new t({
    type: "string",
    ...se(a)
  });
}
function V2(t, a) {
  return new t({
    type: "string",
    format: "email",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function Sp(t, a) {
  return new t({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function Y2(t, a) {
  return new t({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function q2(t, a) {
  return new t({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v4",
    ...se(a)
  });
}
function I2(t, a) {
  return new t({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v6",
    ...se(a)
  });
}
function $2(t, a) {
  return new t({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v7",
    ...se(a)
  });
}
function F2(t, a) {
  return new t({
    type: "string",
    format: "url",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function Q2(t, a) {
  return new t({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function W2(t, a) {
  return new t({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function K2(t, a) {
  return new t({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function J2(t, a) {
  return new t({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function eT(t, a) {
  return new t({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function tT(t, a) {
  return new t({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function nT(t, a) {
  return new t({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function aT(t, a) {
  return new t({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function iT(t, a) {
  return new t({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function rT(t, a) {
  return new t({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function lT(t, a) {
  return new t({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function oT(t, a) {
  return new t({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function uT(t, a) {
  return new t({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function cT(t, a) {
  return new t({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function sT(t, a) {
  return new t({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: !1,
    ...se(a)
  });
}
function fT(t, a) {
  return new t({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: !1,
    local: !1,
    precision: null,
    ...se(a)
  });
}
function dT(t, a) {
  return new t({
    type: "string",
    format: "date",
    check: "string_format",
    ...se(a)
  });
}
function hT(t, a) {
  return new t({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...se(a)
  });
}
function mT(t, a) {
  return new t({
    type: "string",
    format: "duration",
    check: "string_format",
    ...se(a)
  });
}
function vT(t, a) {
  return new t({
    type: "boolean",
    ...se(a)
  });
}
function pT(t) {
  return new t({ type: "unknown" });
}
function gT(t, a) {
  return new t({
    type: "never",
    ...se(a)
  });
}
function o0(t, a) {
  return new ZS({
    check: "max_length",
    ...se(a),
    maximum: t
  });
}
function Io(t, a) {
  return new GS({
    check: "min_length",
    ...se(a),
    minimum: t
  });
}
function u0(t, a) {
  return new PS({
    check: "length_equals",
    ...se(a),
    length: t
  });
}
function yT(t, a) {
  return new XS({
    check: "string_format",
    format: "regex",
    ...se(a),
    pattern: t
  });
}
function bT(t) {
  return new kS({
    check: "string_format",
    format: "lowercase",
    ...se(t)
  });
}
function _T(t) {
  return new VS({
    check: "string_format",
    format: "uppercase",
    ...se(t)
  });
}
function ET(t, a) {
  return new YS({
    check: "string_format",
    format: "includes",
    ...se(a),
    includes: t
  });
}
function ST(t, a) {
  return new qS({
    check: "string_format",
    format: "starts_with",
    ...se(a),
    prefix: t
  });
}
function TT(t, a) {
  return new IS({
    check: "string_format",
    format: "ends_with",
    ...se(a),
    suffix: t
  });
}
function tl(t) {
  return new $S({
    check: "overwrite",
    tx: t
  });
}
function AT(t) {
  return tl((a) => a.normalize(t));
}
function wT() {
  return tl((t) => t.trim());
}
function CT() {
  return tl((t) => t.toLowerCase());
}
function OT() {
  return tl((t) => t.toUpperCase());
}
function RT(t, a, r) {
  return new t({
    type: "array",
    element: a,
    ...se(r)
  });
}
function MT(t, a, r) {
  return new t({
    type: "custom",
    check: "custom",
    fn: a,
    ...se(r)
  });
}
function DT(t) {
  const a = NT((r) => (r.addIssue = (o) => {
    if (typeof o == "string") r.issues.push($r(o, r.value, a._zod.def));
    else {
      const u = o;
      u.fatal && (u.continue = !1), u.code ?? (u.code = "custom"), u.input ?? (u.input = r.value), u.inst ?? (u.inst = a), u.continue ?? (u.continue = !a._zod.def.abort), r.issues.push($r(u));
    }
  }, t(r.value, r)));
  return a;
}
function NT(t, a) {
  const r = new yn({
    check: "custom",
    ...se(a)
  });
  return r._zod.check = t, r;
}
var zT = /* @__PURE__ */ F("ZodISODateTime", (t, a) => {
  u2.init(t, a), ke.init(t, a);
});
function xT(t) {
  return fT(zT, t);
}
var HT = /* @__PURE__ */ F("ZodISODate", (t, a) => {
  c2.init(t, a), ke.init(t, a);
});
function LT(t) {
  return dT(HT, t);
}
var UT = /* @__PURE__ */ F("ZodISOTime", (t, a) => {
  s2.init(t, a), ke.init(t, a);
});
function BT(t) {
  return hT(UT, t);
}
var jT = /* @__PURE__ */ F("ZodISODuration", (t, a) => {
  f2.init(t, a), ke.init(t, a);
});
function ZT(t) {
  return mT(jT, t);
}
var c0 = (t, a) => {
  Jg.init(t, a), t.name = "ZodError", Object.defineProperties(t, {
    format: { value: (r) => aS(t, r) },
    flatten: { value: (r) => nS(t, r) },
    addIssue: { value: (r) => {
      t.issues.push(r), t.message = JSON.stringify(t.issues, cf, 2);
    } },
    addIssues: { value: (r) => {
      t.issues.push(...r), t.message = JSON.stringify(t.issues, cf, 2);
    } },
    isEmpty: { get() {
      return t.issues.length === 0;
    } }
  });
}, eM = F("ZodError", c0), Qt = F("ZodError", c0, { Parent: Error }), GT = /* @__PURE__ */ Nf(Qt), PT = /* @__PURE__ */ zf(Qt), XT = /* @__PURE__ */ nu(Qt), kT = /* @__PURE__ */ au(Qt), VT = /* @__PURE__ */ lS(Qt), YT = /* @__PURE__ */ oS(Qt), qT = /* @__PURE__ */ uS(Qt), IT = /* @__PURE__ */ cS(Qt), $T = /* @__PURE__ */ sS(Qt), FT = /* @__PURE__ */ fS(Qt), QT = /* @__PURE__ */ dS(Qt), WT = /* @__PURE__ */ hS(Qt), at = /* @__PURE__ */ F("ZodType", (t, a) => (Je.init(t, a), t.def = a, t.type = a.type, Object.defineProperty(t, "_def", { value: a }), t.check = (...r) => t.clone(Wa(a, { checks: [...a.checks ?? [], ...r.map((o) => typeof o == "function" ? { _zod: {
  check: o,
  def: { check: "custom" },
  onattach: []
} } : o)] })), t.clone = (r, o) => _a(t, r, o), t.brand = () => t, t.register = ((r, o) => (r.add(t, o), t)), t.parse = (r, o) => GT(t, r, o, { callee: t.parse }), t.safeParse = (r, o) => XT(t, r, o), t.parseAsync = async (r, o) => PT(t, r, o, { callee: t.parseAsync }), t.safeParseAsync = async (r, o) => kT(t, r, o), t.spa = t.safeParseAsync, t.encode = (r, o) => VT(t, r, o), t.decode = (r, o) => YT(t, r, o), t.encodeAsync = async (r, o) => qT(t, r, o), t.decodeAsync = async (r, o) => IT(t, r, o), t.safeEncode = (r, o) => $T(t, r, o), t.safeDecode = (r, o) => FT(t, r, o), t.safeEncodeAsync = async (r, o) => QT(t, r, o), t.safeDecodeAsync = async (r, o) => WT(t, r, o), t.refine = (r, o) => t.check(kA(r, o)), t.superRefine = (r) => t.check(VA(r)), t.overwrite = (r) => t.check(tl(r)), t.optional = () => Op(t), t.nullable = () => Rp(t), t.nullish = () => Op(Rp(t)), t.nonoptional = (r) => UA(t, r), t.array = () => SA(t), t.or = (r) => wA([t, r]), t.and = (r) => OA(t, r), t.transform = (r) => Mp(t, DA(r)), t.default = (r) => xA(t, r), t.prefault = (r) => LA(t, r), t.catch = (r) => jA(t, r), t.pipe = (r) => Mp(t, r), t.readonly = () => PA(t), t.describe = (r) => {
  const o = t.clone();
  return Mo.add(o, { description: r }), o;
}, Object.defineProperty(t, "description", {
  get() {
    return Mo.get(t)?.description;
  },
  configurable: !0
}), t.meta = (...r) => {
  if (r.length === 0) return Mo.get(t);
  const o = t.clone();
  return Mo.add(o, r[0]), o;
}, t.isOptional = () => t.safeParse(void 0).success, t.isNullable = () => t.safeParse(null).success, t)), s0 = /* @__PURE__ */ F("_ZodString", (t, a) => {
  xf.init(t, a), at.init(t, a);
  const r = t._zod.bag;
  t.format = r.format ?? null, t.minLength = r.minimum ?? null, t.maxLength = r.maximum ?? null, t.regex = (...o) => t.check(yT(...o)), t.includes = (...o) => t.check(ET(...o)), t.startsWith = (...o) => t.check(ST(...o)), t.endsWith = (...o) => t.check(TT(...o)), t.min = (...o) => t.check(Io(...o)), t.max = (...o) => t.check(o0(...o)), t.length = (...o) => t.check(u0(...o)), t.nonempty = (...o) => t.check(Io(1, ...o)), t.lowercase = (o) => t.check(bT(o)), t.uppercase = (o) => t.check(_T(o)), t.trim = () => t.check(wT()), t.normalize = (...o) => t.check(AT(...o)), t.toLowerCase = () => t.check(CT()), t.toUpperCase = () => t.check(OT());
}), KT = /* @__PURE__ */ F("ZodString", (t, a) => {
  xf.init(t, a), s0.init(t, a), t.email = (r) => t.check(V2(JT, r)), t.url = (r) => t.check(F2(eA, r)), t.jwt = (r) => t.check(sT(vA, r)), t.emoji = (r) => t.check(Q2(tA, r)), t.guid = (r) => t.check(Sp(Ap, r)), t.uuid = (r) => t.check(Y2(Do, r)), t.uuidv4 = (r) => t.check(q2(Do, r)), t.uuidv6 = (r) => t.check(I2(Do, r)), t.uuidv7 = (r) => t.check($2(Do, r)), t.nanoid = (r) => t.check(W2(nA, r)), t.guid = (r) => t.check(Sp(Ap, r)), t.cuid = (r) => t.check(K2(aA, r)), t.cuid2 = (r) => t.check(J2(iA, r)), t.ulid = (r) => t.check(eT(rA, r)), t.base64 = (r) => t.check(oT(dA, r)), t.base64url = (r) => t.check(uT(hA, r)), t.xid = (r) => t.check(tT(lA, r)), t.ksuid = (r) => t.check(nT(oA, r)), t.ipv4 = (r) => t.check(aT(uA, r)), t.ipv6 = (r) => t.check(iT(cA, r)), t.cidrv4 = (r) => t.check(rT(sA, r)), t.cidrv6 = (r) => t.check(lT(fA, r)), t.e164 = (r) => t.check(cT(mA, r)), t.datetime = (r) => t.check(xT(r)), t.date = (r) => t.check(LT(r)), t.time = (r) => t.check(BT(r)), t.duration = (r) => t.check(ZT(r));
});
function Tp(t) {
  return k2(KT, t);
}
var ke = /* @__PURE__ */ F("ZodStringFormat", (t, a) => {
  Xe.init(t, a), s0.init(t, a);
}), JT = /* @__PURE__ */ F("ZodEmail", (t, a) => {
  JS.init(t, a), ke.init(t, a);
}), Ap = /* @__PURE__ */ F("ZodGUID", (t, a) => {
  WS.init(t, a), ke.init(t, a);
}), Do = /* @__PURE__ */ F("ZodUUID", (t, a) => {
  KS.init(t, a), ke.init(t, a);
}), eA = /* @__PURE__ */ F("ZodURL", (t, a) => {
  e2.init(t, a), ke.init(t, a);
}), tA = /* @__PURE__ */ F("ZodEmoji", (t, a) => {
  t2.init(t, a), ke.init(t, a);
}), nA = /* @__PURE__ */ F("ZodNanoID", (t, a) => {
  n2.init(t, a), ke.init(t, a);
}), aA = /* @__PURE__ */ F("ZodCUID", (t, a) => {
  a2.init(t, a), ke.init(t, a);
}), iA = /* @__PURE__ */ F("ZodCUID2", (t, a) => {
  i2.init(t, a), ke.init(t, a);
}), rA = /* @__PURE__ */ F("ZodULID", (t, a) => {
  r2.init(t, a), ke.init(t, a);
}), lA = /* @__PURE__ */ F("ZodXID", (t, a) => {
  l2.init(t, a), ke.init(t, a);
}), oA = /* @__PURE__ */ F("ZodKSUID", (t, a) => {
  o2.init(t, a), ke.init(t, a);
}), uA = /* @__PURE__ */ F("ZodIPv4", (t, a) => {
  d2.init(t, a), ke.init(t, a);
}), cA = /* @__PURE__ */ F("ZodIPv6", (t, a) => {
  h2.init(t, a), ke.init(t, a);
}), sA = /* @__PURE__ */ F("ZodCIDRv4", (t, a) => {
  m2.init(t, a), ke.init(t, a);
}), fA = /* @__PURE__ */ F("ZodCIDRv6", (t, a) => {
  v2.init(t, a), ke.init(t, a);
}), dA = /* @__PURE__ */ F("ZodBase64", (t, a) => {
  p2.init(t, a), ke.init(t, a);
}), hA = /* @__PURE__ */ F("ZodBase64URL", (t, a) => {
  y2.init(t, a), ke.init(t, a);
}), mA = /* @__PURE__ */ F("ZodE164", (t, a) => {
  b2.init(t, a), ke.init(t, a);
}), vA = /* @__PURE__ */ F("ZodJWT", (t, a) => {
  E2.init(t, a), ke.init(t, a);
}), pA = /* @__PURE__ */ F("ZodBoolean", (t, a) => {
  S2.init(t, a), at.init(t, a);
});
function gA(t) {
  return vT(pA, t);
}
var yA = /* @__PURE__ */ F("ZodUnknown", (t, a) => {
  T2.init(t, a), at.init(t, a);
});
function wp() {
  return pT(yA);
}
var bA = /* @__PURE__ */ F("ZodNever", (t, a) => {
  A2.init(t, a), at.init(t, a);
});
function _A(t) {
  return gT(bA, t);
}
var EA = /* @__PURE__ */ F("ZodArray", (t, a) => {
  w2.init(t, a), at.init(t, a), t.element = a.element, t.min = (r, o) => t.check(Io(r, o)), t.nonempty = (r) => t.check(Io(1, r)), t.max = (r, o) => t.check(o0(r, o)), t.length = (r, o) => t.check(u0(r, o)), t.unwrap = () => t.element;
});
function SA(t, a) {
  return RT(EA, t, a);
}
var TA = /* @__PURE__ */ F("ZodObject", (t, a) => {
  O2.init(t, a), at.init(t, a), Ue(t, "shape", () => a.shape), t.keyof = () => RA(Object.keys(t._zod.def.shape)), t.catchall = (r) => t.clone({
    ...t._zod.def,
    catchall: r
  }), t.passthrough = () => t.clone({
    ...t._zod.def,
    catchall: wp()
  }), t.loose = () => t.clone({
    ...t._zod.def,
    catchall: wp()
  }), t.strict = () => t.clone({
    ...t._zod.def,
    catchall: _A()
  }), t.strip = () => t.clone({
    ...t._zod.def,
    catchall: void 0
  }), t.extend = (r) => WE(t, r), t.safeExtend = (r) => KE(t, r), t.merge = (r) => JE(t, r), t.pick = (r) => FE(t, r), t.omit = (r) => QE(t, r), t.partial = (...r) => eS(f0, t, r[0]), t.required = (...r) => tS(d0, t, r[0]);
});
function Cp(t, a) {
  return new TA({
    type: "object",
    shape: t ?? {},
    ...se(a)
  });
}
var AA = /* @__PURE__ */ F("ZodUnion", (t, a) => {
  R2.init(t, a), at.init(t, a), t.options = a.options;
});
function wA(t, a) {
  return new AA({
    type: "union",
    options: t,
    ...se(a)
  });
}
var CA = /* @__PURE__ */ F("ZodIntersection", (t, a) => {
  M2.init(t, a), at.init(t, a);
});
function OA(t, a) {
  return new CA({
    type: "intersection",
    left: t,
    right: a
  });
}
var ff = /* @__PURE__ */ F("ZodEnum", (t, a) => {
  D2.init(t, a), at.init(t, a), t.enum = a.entries, t.options = Object.values(a.entries);
  const r = new Set(Object.keys(a.entries));
  t.extract = (o, u) => {
    const f = {};
    for (const d of o) if (r.has(d)) f[d] = a.entries[d];
    else throw new Error(`Key ${d} not found in enum`);
    return new ff({
      ...a,
      checks: [],
      ...se(u),
      entries: f
    });
  }, t.exclude = (o, u) => {
    const f = { ...a.entries };
    for (const d of o) if (r.has(d)) delete f[d];
    else throw new Error(`Key ${d} not found in enum`);
    return new ff({
      ...a,
      checks: [],
      ...se(u),
      entries: f
    });
  };
});
function RA(t, a) {
  return new ff({
    type: "enum",
    entries: Array.isArray(t) ? Object.fromEntries(t.map((r) => [r, r])) : t,
    ...se(a)
  });
}
var MA = /* @__PURE__ */ F("ZodTransform", (t, a) => {
  N2.init(t, a), at.init(t, a), t._zod.parse = (r, o) => {
    if (o.direction === "backward") throw new $g(t.constructor.name);
    r.addIssue = (f) => {
      if (typeof f == "string") r.issues.push($r(f, r.value, a));
      else {
        const d = f;
        d.fatal && (d.continue = !1), d.code ?? (d.code = "custom"), d.input ?? (d.input = r.value), d.inst ?? (d.inst = t), r.issues.push($r(d));
      }
    };
    const u = a.transform(r.value, r);
    return u instanceof Promise ? u.then((f) => (r.value = f, r)) : (r.value = u, r);
  };
});
function DA(t) {
  return new MA({
    type: "transform",
    transform: t
  });
}
var f0 = /* @__PURE__ */ F("ZodOptional", (t, a) => {
  z2.init(t, a), at.init(t, a), t.unwrap = () => t._zod.def.innerType;
});
function Op(t) {
  return new f0({
    type: "optional",
    innerType: t
  });
}
var NA = /* @__PURE__ */ F("ZodNullable", (t, a) => {
  x2.init(t, a), at.init(t, a), t.unwrap = () => t._zod.def.innerType;
});
function Rp(t) {
  return new NA({
    type: "nullable",
    innerType: t
  });
}
var zA = /* @__PURE__ */ F("ZodDefault", (t, a) => {
  H2.init(t, a), at.init(t, a), t.unwrap = () => t._zod.def.innerType, t.removeDefault = t.unwrap;
});
function xA(t, a) {
  return new zA({
    type: "default",
    innerType: t,
    get defaultValue() {
      return typeof a == "function" ? a() : Qg(a);
    }
  });
}
var HA = /* @__PURE__ */ F("ZodPrefault", (t, a) => {
  L2.init(t, a), at.init(t, a), t.unwrap = () => t._zod.def.innerType;
});
function LA(t, a) {
  return new HA({
    type: "prefault",
    innerType: t,
    get defaultValue() {
      return typeof a == "function" ? a() : Qg(a);
    }
  });
}
var d0 = /* @__PURE__ */ F("ZodNonOptional", (t, a) => {
  U2.init(t, a), at.init(t, a), t.unwrap = () => t._zod.def.innerType;
});
function UA(t, a) {
  return new d0({
    type: "nonoptional",
    innerType: t,
    ...se(a)
  });
}
var BA = /* @__PURE__ */ F("ZodCatch", (t, a) => {
  B2.init(t, a), at.init(t, a), t.unwrap = () => t._zod.def.innerType, t.removeCatch = t.unwrap;
});
function jA(t, a) {
  return new BA({
    type: "catch",
    innerType: t,
    catchValue: typeof a == "function" ? a : () => a
  });
}
var ZA = /* @__PURE__ */ F("ZodPipe", (t, a) => {
  j2.init(t, a), at.init(t, a), t.in = a.in, t.out = a.out;
});
function Mp(t, a) {
  return new ZA({
    type: "pipe",
    in: t,
    out: a
  });
}
var GA = /* @__PURE__ */ F("ZodReadonly", (t, a) => {
  Z2.init(t, a), at.init(t, a), t.unwrap = () => t._zod.def.innerType;
});
function PA(t) {
  return new GA({
    type: "readonly",
    innerType: t
  });
}
var XA = /* @__PURE__ */ F("ZodCustom", (t, a) => {
  G2.init(t, a), at.init(t, a);
});
function kA(t, a = {}) {
  return MT(XA, t, a);
}
function VA(t) {
  return DT(t);
}
var YA = Cp({
  hidden: gA(),
  edit_context: Cp({
    codex_thread_id: Tp().nullable(),
    chatgpt_conversation_id: Tp().nullable()
  })
}), qA = "/_sites/dispatch-assets/app-openai.svg", IA = "/_internal/sites_widget/log_event", $A = "/_internal/sites_widget/editor/config";
async function FA() {
  const t = await fetch($A, {
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(1e4)
  });
  if (!t.ok) throw new Error("Unable to load editor widget configuration");
  return YA.parse(await t.json());
}
function h0() {
  let t = Promise.resolve();
  return (a) => (t = t.then(async () => {
    if (!(await fetch("/_internal/sites_widget/editor/config", {
      method: "POST",
      credentials: "same-origin",
      redirect: "error",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: a }),
      keepalive: !0,
      signal: AbortSignal.timeout(1e4)
    })).ok) throw new Error("Unable to save editor widget preference");
  }).catch(() => {
    console.warn("Unable to save editor widget preference");
  }), t);
}
function qt(t) {
  fetch(IA, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ interaction_type: t }),
    keepalive: !0
  }).catch(() => {
  });
}
var QA = "_Button_guvzm_1", WA = "_ButtonInner_guvzm_107", $o = {
  Button: QA,
  ButtonInner: WA
}, KA = /* @__PURE__ */ Ht(((t) => {
  var a = /* @__PURE__ */ Symbol.for("react.transitional.element"), r = /* @__PURE__ */ Symbol.for("react.fragment");
  function o(u, f, d) {
    var h = null;
    if (d !== void 0 && (h = "" + d), f.key !== void 0 && (h = "" + f.key), "key" in f) {
      d = {};
      for (var p in f) p !== "key" && (d[p] = f[p]);
    } else d = f;
    return f = d.ref, {
      $$typeof: a,
      type: u,
      key: h,
      ref: f !== void 0 ? f : null,
      props: d
    };
  }
  t.Fragment = r, t.jsx = o, t.jsxs = o;
})), JA = /* @__PURE__ */ Ht(((t, a) => {
  a.exports = KA();
})), D = JA();
function m0(t) {
  const a = t.currentTarget.offsetWidth;
  let r = 0.985;
  a <= 80 ? r = 0.96 : a <= 150 ? r = 0.97 : a <= 220 ? r = 0.98 : a > 600 && (r = 0.995), t.currentTarget.style.setProperty("--button-press-scale", String(r));
}
function Dp({ type: t = "button", color: a = "primary", variant: r = "solid", pill: o = !1, uniform: u = !1, size: f = "md", iconSize: d, children: h, className: p, disabled: g, onClick: v, onPointerEnter: b, ...E }) {
  const S = (0, _.useCallback)((T) => {
    g || v?.(T);
  }, [g, v]), O = (0, _.useCallback)((T) => {
    m0(T), b?.(T);
  }, [b]);
  return /* @__PURE__ */ (0, D.jsx)("button", {
    ...E,
    type: t,
    className: an($o.Button, p),
    "data-color": a,
    "data-variant": r,
    "data-pill": o ? "" : void 0,
    "data-uniform": u ? "" : void 0,
    "data-size": f,
    "data-icon-size": d,
    "data-disabled": g ? "" : void 0,
    disabled: g,
    "aria-disabled": g || void 0,
    onClick: S,
    onPointerEnter: O,
    children: /* @__PURE__ */ (0, D.jsx)("span", {
      className: $o.ButtonInner,
      children: h
    })
  });
}
function ew({ color: t = "primary", variant: a = "solid", pill: r = !1, uniform: o = !1, size: u = "md", iconSize: f, children: d, className: h, onPointerEnter: p, ...g }) {
  return /* @__PURE__ */ (0, D.jsx)("a", {
    ...g,
    className: an($o.Button, h),
    "data-color": t,
    "data-variant": a,
    "data-pill": r ? "" : void 0,
    "data-uniform": o ? "" : void 0,
    "data-size": u,
    "data-icon-size": f,
    onPointerEnter: (v) => {
      m0(v), p?.(v);
    },
    children: /* @__PURE__ */ (0, D.jsx)("span", {
      className: $o.ButtonInner,
      children: d
    })
  });
}
function tw(t, a) {
  const r = (0, _.useRef)(0), o = (0, _.useRef)(null), u = (0, _.useCallback)((f, d = "") => {
    f.style.height = "0px";
    const { scrollHeight: h, offsetHeight: p, offsetWidth: g, clientHeight: v } = f, b = h + (p - v);
    f.style.height = `${b}px`, r.current < h && f.selectionEnd === d.length && (f.scrollTop = h), r.current = f.scrollHeight, o.current = g;
  }, []);
  (0, _.useLayoutEffect)(() => {
    const f = t.current;
    f !== null && u(f, a);
  }, [
    u,
    t,
    a
  ]), (0, _.useEffect)(() => {
    const f = t.current;
    if (f === null) return;
    const d = new ResizeObserver(() => {
      const h = f.offsetWidth;
      (o.current === null || h !== o.current) && u(f, f.value);
    });
    return d.observe(f), () => d.disconnect();
  }, [u, t]);
}
var nw = typeof navigator < "u", aw = nw ? navigator.userAgent ?? "" : "";
function Hf() {
  return l_(aw) || iw();
}
function iw() {
  return typeof navigator < "u" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
function rw() {
  return typeof navigator < "u" && /Mac|iPhone|iPad/.test(navigator.platform);
}
var lw = () => {
  const t = (0, _.useRef)(!1), a = (0, _.useRef)(null);
  (0, _.useEffect)(() => () => {
    a.current !== null && clearTimeout(a.current);
  }, []);
  const r = () => {
    a.current !== null && (clearTimeout(a.current), a.current = null);
  }, o = () => {
    r(), a.current = setTimeout(() => {
      t.current = !1, a.current = null;
    }, 0);
  };
  return {
    handleCompositionStart: () => {
      r(), t.current = !0;
    },
    handleCompositionEnd: () => {
      t.current = !0, o();
    },
    isComposing: (h) => {
      const p = "nativeEvent" in h ? h.nativeEvent : h;
      return p.isComposing || t.current || p.keyCode === 229;
    }
  };
};
function ow({ textareaRef: t, value: a, onChange: r, onKeyDown: o, onCompositionStart: u, onCompositionEnd: f, ...d }) {
  tw(t, a);
  const { handleCompositionStart: h, handleCompositionEnd: p, isComposing: g } = lw();
  return /* @__PURE__ */ (0, D.jsx)("textarea", {
    ...d,
    ref: t,
    rows: 1,
    value: a,
    onChange: r,
    onCompositionStart: (v) => {
      h(), u?.(v);
    },
    onCompositionEnd: (v) => {
      p(), f?.(v);
    },
    onKeyDown: (v) => {
      o?.(v), !(v.defaultPrevented || v.key !== "Enter" || v.shiftKey || g(v) || Hf()) && (v.preventDefault(), v.repeat || v.currentTarget.form?.requestSubmit());
    }
  });
}
var uw = "_Image_1l1xj_1", cw = { Image: uw }, Np = /* @__PURE__ */ new Set();
function v0({ src: t, className: a, draggable: r = !1, onLoad: o, onError: u, forceRenderAfterLoadFail: f = !1, ...d }) {
  const [h, p] = (0, _.useState)(() => t && Np.has(t)), [g, v] = (0, _.useState)(!1), b = h || g && f;
  return !t || !f && g ? null : /* @__PURE__ */ (0, D.jsx)("img", {
    ...d,
    src: t,
    className: an(cw.Image, a),
    onLoad: (E) => {
      p(!0), Np.add(t), o?.(E);
    },
    onError: (E) => {
      v(!0), u?.(E);
    },
    "data-loaded": b ? "" : void 0,
    draggable: r
  });
}
var sw = /* @__PURE__ */ Ht(((t) => {
  var a = Tf();
  function r(g) {
    var v = "https://react.dev/errors/" + g;
    if (1 < arguments.length) {
      v += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var b = 2; b < arguments.length; b++) v += "&args[]=" + encodeURIComponent(arguments[b]);
    }
    return "Minified React error #" + g + "; visit " + v + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function o() {
  }
  var u = {
    d: {
      f: o,
      r: function() {
        throw Error(r(522));
      },
      D: o,
      C: o,
      L: o,
      m: o,
      X: o,
      S: o,
      M: o
    },
    p: 0,
    findDOMNode: null
  }, f = /* @__PURE__ */ Symbol.for("react.portal");
  function d(g, v, b) {
    var E = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: f,
      key: E == null ? null : "" + E,
      children: g,
      containerInfo: v,
      implementation: b
    };
  }
  var h = a.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function p(g, v) {
    if (g === "font") return "";
    if (typeof v == "string") return v === "use-credentials" ? v : "";
  }
  t.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = u, t.createPortal = function(g, v) {
    var b = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!v || v.nodeType !== 1 && v.nodeType !== 9 && v.nodeType !== 11) throw Error(r(299));
    return d(g, v, null, b);
  }, t.flushSync = function(g) {
    var v = h.T, b = u.p;
    try {
      if (h.T = null, u.p = 2, g) return g();
    } finally {
      h.T = v, u.p = b, u.d.f();
    }
  }, t.preconnect = function(g, v) {
    typeof g == "string" && (v ? (v = v.crossOrigin, v = typeof v == "string" ? v === "use-credentials" ? v : "" : void 0) : v = null, u.d.C(g, v));
  }, t.prefetchDNS = function(g) {
    typeof g == "string" && u.d.D(g);
  }, t.preinit = function(g, v) {
    if (typeof g == "string" && v && typeof v.as == "string") {
      var b = v.as, E = p(b, v.crossOrigin), S = typeof v.integrity == "string" ? v.integrity : void 0, O = typeof v.fetchPriority == "string" ? v.fetchPriority : void 0;
      b === "style" ? u.d.S(g, typeof v.precedence == "string" ? v.precedence : void 0, {
        crossOrigin: E,
        integrity: S,
        fetchPriority: O
      }) : b === "script" && u.d.X(g, {
        crossOrigin: E,
        integrity: S,
        fetchPriority: O,
        nonce: typeof v.nonce == "string" ? v.nonce : void 0
      });
    }
  }, t.preinitModule = function(g, v) {
    if (typeof g == "string") if (typeof v == "object" && v !== null) {
      if (v.as == null || v.as === "script") {
        var b = p(v.as, v.crossOrigin);
        u.d.M(g, {
          crossOrigin: b,
          integrity: typeof v.integrity == "string" ? v.integrity : void 0,
          nonce: typeof v.nonce == "string" ? v.nonce : void 0
        });
      }
    } else v ?? u.d.M(g);
  }, t.preload = function(g, v) {
    if (typeof g == "string" && typeof v == "object" && v !== null && typeof v.as == "string") {
      var b = v.as, E = p(b, v.crossOrigin);
      u.d.L(g, b, {
        crossOrigin: E,
        integrity: typeof v.integrity == "string" ? v.integrity : void 0,
        nonce: typeof v.nonce == "string" ? v.nonce : void 0,
        type: typeof v.type == "string" ? v.type : void 0,
        fetchPriority: typeof v.fetchPriority == "string" ? v.fetchPriority : void 0,
        referrerPolicy: typeof v.referrerPolicy == "string" ? v.referrerPolicy : void 0,
        imageSrcSet: typeof v.imageSrcSet == "string" ? v.imageSrcSet : void 0,
        imageSizes: typeof v.imageSizes == "string" ? v.imageSizes : void 0,
        media: typeof v.media == "string" ? v.media : void 0
      });
    }
  }, t.preloadModule = function(g, v) {
    if (typeof g == "string") if (v) {
      var b = p(v.as, v.crossOrigin);
      u.d.m(g, {
        as: typeof v.as == "string" && v.as !== "script" ? v.as : void 0,
        crossOrigin: b,
        integrity: typeof v.integrity == "string" ? v.integrity : void 0
      });
    } else u.d.m(g);
  }, t.requestFormReset = function(g) {
    u.d.r(g);
  }, t.unstable_batchedUpdates = function(g, v) {
    return g(v);
  }, t.useFormState = function(g, v, b) {
    return h.H.useFormState(g, v, b);
  }, t.useFormStatus = function() {
    return h.H.useHostTransitionStatus();
  }, t.version = "19.2.8";
})), p0 = /* @__PURE__ */ Ht(((t, a) => {
  function r() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(r);
      } catch (o) {
        console.error(o);
      }
  }
  r(), a.exports = sw();
}));
function zp(t, a) {
  if (typeof t == "function") return t(a);
  t != null && (t.current = a);
}
function g0(...t) {
  return (a) => {
    let r = !1;
    const o = t.map((u) => {
      const f = zp(u, a);
      return !r && typeof f == "function" && (r = !0), f;
    });
    if (r) return () => {
      for (let u = 0; u < o.length; u++) {
        const f = o[u];
        typeof f == "function" ? f() : zp(t[u], null);
      }
    };
  };
}
function bn(...t) {
  return _.useCallback(g0(...t), t);
}
var Lf = _.forwardRef((t, a) => {
  const { children: r, ...o } = t, u = _.Children.toArray(r), f = u.find(fw);
  if (f) {
    const d = f.props.children, h = u.map((p) => p === f ? _.Children.count(d) > 1 ? _.Children.only(null) : _.isValidElement(d) ? d.props.children : null : p);
    return /* @__PURE__ */ (0, D.jsx)(df, {
      ...o,
      ref: a,
      children: _.isValidElement(d) ? _.cloneElement(d, void 0, h) : null
    });
  }
  return /* @__PURE__ */ (0, D.jsx)(df, {
    ...o,
    ref: a,
    children: r
  });
});
Lf.displayName = "Slot";
var df = _.forwardRef((t, a) => {
  const { children: r, ...o } = t;
  if (_.isValidElement(r)) {
    const u = hw(r), f = dw(o, r.props);
    return r.type !== _.Fragment && (f.ref = a ? g0(a, u) : u), _.cloneElement(r, f);
  }
  return _.Children.count(r) > 1 ? _.Children.only(null) : null;
});
df.displayName = "SlotClone";
var y0 = ({ children: t }) => /* @__PURE__ */ (0, D.jsx)(D.Fragment, { children: t });
function fw(t) {
  return _.isValidElement(t) && t.type === y0;
}
function dw(t, a) {
  const r = { ...a };
  for (const o in a) {
    const u = t[o], f = a[o];
    /^on[A-Z]/.test(o) ? u && f ? r[o] = (...d) => {
      f(...d), u(...d);
    } : u && (r[o] = u) : o === "style" ? r[o] = {
      ...u,
      ...f
    } : o === "className" && (r[o] = [u, f].filter(Boolean).join(" "));
  }
  return {
    ...t,
    ...r
  };
}
function hw(t) {
  let a = Object.getOwnPropertyDescriptor(t.props, "ref")?.get, r = a && "isReactWarning" in a && a.isReactWarning;
  return r ? t.ref : (a = Object.getOwnPropertyDescriptor(t, "ref")?.get, r = a && "isReactWarning" in a && a.isReactWarning, r ? t.props.ref : t.props.ref || t.ref);
}
var nl = /* @__PURE__ */ Sf(p0(), 1), on = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "span",
  "svg",
  "ul"
].reduce((t, a) => {
  const r = _.forwardRef((o, u) => {
    const { asChild: f, ...d } = o, h = f ? Lf : a;
    return typeof window < "u" && (window[/* @__PURE__ */ Symbol.for("radix-ui")] = !0), /* @__PURE__ */ (0, D.jsx)(h, {
      ...d,
      ref: u
    });
  });
  return r.displayName = `Primitive.${a}`, {
    ...t,
    [a]: r
  };
}, {});
function mw(t, a) {
  t && nl.flushSync(() => t.dispatchEvent(a));
}
var vw = "VisuallyHidden", b0 = _.forwardRef((t, a) => /* @__PURE__ */ (0, D.jsx)(on.span, {
  ...t,
  ref: a,
  style: {
    position: "absolute",
    border: 0,
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    wordWrap: "normal",
    ...t.style
  }
}));
b0.displayName = vw;
var pw = b0;
function Uf(t, a = []) {
  let r = [];
  function o(f, d) {
    const h = _.createContext(d), p = r.length;
    r = [...r, d];
    const g = (b) => {
      const { scope: E, children: S, ...O } = b, T = E?.[t]?.[p] || h, R = _.useMemo(() => O, Object.values(O));
      return /* @__PURE__ */ (0, D.jsx)(T.Provider, {
        value: R,
        children: S
      });
    };
    g.displayName = f + "Provider";
    function v(b, E) {
      const S = E?.[t]?.[p] || h, O = _.useContext(S);
      if (O) return O;
      if (d !== void 0) return d;
      throw new Error(`\`${b}\` must be used within \`${f}\``);
    }
    return [g, v];
  }
  const u = () => {
    const f = r.map((d) => _.createContext(d));
    return function(h) {
      const p = h?.[t] || f;
      return _.useMemo(() => ({ [`__scope${t}`]: {
        ...h,
        [t]: p
      } }), [h, p]);
    };
  };
  return u.scopeName = t, [o, gw(u, ...a)];
}
function gw(...t) {
  const a = t[0];
  if (t.length === 1) return a;
  const r = () => {
    const o = t.map((u) => ({
      useScope: u(),
      scopeName: u.scopeName
    }));
    return function(f) {
      const d = o.reduce((h, { useScope: p, scopeName: g }) => {
        const v = p(f)[`__scope${g}`];
        return {
          ...h,
          ...v
        };
      }, {});
      return _.useMemo(() => ({ [`__scope${a.scopeName}`]: d }), [d]);
    };
  };
  return r.scopeName = a.scopeName, r;
}
function Et(t, a, { checkForDefaultPrevented: r = !0 } = {}) {
  return function(u) {
    if (t?.(u), r === !1 || !u.defaultPrevented) return a?.(u);
  };
}
function pa(t) {
  const a = _.useRef(t);
  return _.useEffect(() => {
    a.current = t;
  }), _.useMemo(() => (...r) => a.current?.(...r), []);
}
function _0({ prop: t, defaultProp: a, onChange: r = () => {
} }) {
  const [o, u] = yw({
    defaultProp: a,
    onChange: r
  }), f = t !== void 0, d = f ? t : o, h = pa(r);
  return [d, _.useCallback((p) => {
    if (f) {
      const g = typeof p == "function" ? p(t) : p;
      g !== t && h(g);
    } else u(p);
  }, [
    f,
    t,
    u,
    h
  ])];
}
function yw({ defaultProp: t, onChange: a }) {
  const r = _.useState(t), [o] = r, u = _.useRef(o), f = pa(a);
  return _.useEffect(() => {
    u.current !== o && (f(o), u.current = o);
  }, [
    o,
    u,
    f
  ]), r;
}
var $a = globalThis?.document ? _.useLayoutEffect : () => {
};
function bw(t, a) {
  return _.useReducer((r, o) => a[r][o] ?? r, t);
}
var al = (t) => {
  const { present: a, children: r } = t, o = _w(a), u = typeof r == "function" ? r({ present: o.isPresent }) : _.Children.only(r), f = bn(o.ref, Ew(u));
  return typeof r == "function" || o.isPresent ? _.cloneElement(u, { ref: f }) : null;
};
al.displayName = "Presence";
function _w(t) {
  const [a, r] = _.useState(), o = _.useRef({}), u = _.useRef(t), f = _.useRef("none"), [d, h] = bw(t ? "mounted" : "unmounted", {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended"
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted"
    },
    unmounted: { MOUNT: "mounted" }
  });
  return _.useEffect(() => {
    const p = No(o.current);
    f.current = d === "mounted" ? p : "none";
  }, [d]), $a(() => {
    const p = o.current, g = u.current;
    if (g !== t) {
      const v = f.current, b = No(p);
      t ? h("MOUNT") : b === "none" || p?.display === "none" ? h("UNMOUNT") : h(g && v !== b ? "ANIMATION_OUT" : "UNMOUNT"), u.current = t;
    }
  }, [t, h]), $a(() => {
    if (a) {
      let p;
      const g = a.ownerDocument.defaultView ?? window, v = (E) => {
        const S = No(o.current).includes(E.animationName);
        if (E.target === a && S && (h("ANIMATION_END"), !u.current)) {
          const O = a.style.animationFillMode;
          a.style.animationFillMode = "forwards", p = g.setTimeout(() => {
            a.style.animationFillMode === "forwards" && (a.style.animationFillMode = O);
          });
        }
      }, b = (E) => {
        E.target === a && (f.current = No(o.current));
      };
      return a.addEventListener("animationstart", b), a.addEventListener("animationcancel", v), a.addEventListener("animationend", v), () => {
        g.clearTimeout(p), a.removeEventListener("animationstart", b), a.removeEventListener("animationcancel", v), a.removeEventListener("animationend", v);
      };
    } else h("ANIMATION_END");
  }, [a, h]), {
    isPresent: ["mounted", "unmountSuspended"].includes(d),
    ref: _.useCallback((p) => {
      p && (o.current = getComputedStyle(p)), r(p);
    }, [])
  };
}
function No(t) {
  return t?.animationName || "none";
}
function Ew(t) {
  let a = Object.getOwnPropertyDescriptor(t.props, "ref")?.get, r = a && "isReactWarning" in a && a.isReactWarning;
  return r ? t.ref : (a = Object.getOwnPropertyDescriptor(t, "ref")?.get, r = a && "isReactWarning" in a && a.isReactWarning, r ? t.props.ref : t.props.ref || t.ref);
}
var Sw = _.useId || (() => {
}), Tw = 0;
function E0(t) {
  const [a, r] = _.useState(Sw());
  return $a(() => {
    t || r((o) => o ?? String(Tw++));
  }, [t]), t || (a ? `radix-${a}` : "");
}
function Aw(t, a = globalThis?.document) {
  const r = pa(t);
  _.useEffect(() => {
    const o = (u) => {
      u.key === "Escape" && r(u);
    };
    return a.addEventListener("keydown", o, { capture: !0 }), () => a.removeEventListener("keydown", o, { capture: !0 });
  }, [r, a]);
}
var ww = "DismissableLayer", hf = "dismissableLayer.update", Cw = "dismissableLayer.pointerDownOutside", Ow = "dismissableLayer.focusOutside", xp, S0 = _.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set()
}), Bf = _.forwardRef((t, a) => {
  const { disableOutsidePointerEvents: r = !1, onEscapeKeyDown: o, onPointerDownOutside: u, onFocusOutside: f, onInteractOutside: d, onDismiss: h, ...p } = t, g = _.useContext(S0), [v, b] = _.useState(null), E = v?.ownerDocument ?? globalThis?.document, [, S] = _.useState({}), O = bn(a, (I) => b(I)), T = Array.from(g.layers), [R] = [...g.layersWithOutsidePointerEventsDisabled].slice(-1), L = T.indexOf(R), j = v ? T.indexOf(v) : -1, G = g.layersWithOutsidePointerEventsDisabled.size > 0, N = j >= L, X = Dw((I) => {
    const H = I.target, K = [...g.branches].some((ne) => ne.contains(H));
    !N || K || (u?.(I), d?.(I), I.defaultPrevented || h?.());
  }, E), B = Nw((I) => {
    const H = I.target;
    [...g.branches].some((K) => K.contains(H)) || (f?.(I), d?.(I), I.defaultPrevented || h?.());
  }, E);
  return Aw((I) => {
    j === g.layers.size - 1 && (o?.(I), !I.defaultPrevented && h && (I.preventDefault(), h()));
  }, E), _.useEffect(() => {
    if (v)
      return r && (g.layersWithOutsidePointerEventsDisabled.size === 0 && (xp = E.body.style.pointerEvents, E.body.style.pointerEvents = "none"), g.layersWithOutsidePointerEventsDisabled.add(v)), g.layers.add(v), Hp(), () => {
        r && g.layersWithOutsidePointerEventsDisabled.size === 1 && (E.body.style.pointerEvents = xp);
      };
  }, [
    v,
    E,
    r,
    g
  ]), _.useEffect(() => () => {
    v && (g.layers.delete(v), g.layersWithOutsidePointerEventsDisabled.delete(v), Hp());
  }, [v, g]), _.useEffect(() => {
    const I = () => S({});
    return document.addEventListener(hf, I), () => document.removeEventListener(hf, I);
  }, []), /* @__PURE__ */ (0, D.jsx)(on.div, {
    ...p,
    ref: O,
    style: {
      pointerEvents: G ? N ? "auto" : "none" : void 0,
      ...t.style
    },
    onFocusCapture: Et(t.onFocusCapture, B.onFocusCapture),
    onBlurCapture: Et(t.onBlurCapture, B.onBlurCapture),
    onPointerDownCapture: Et(t.onPointerDownCapture, X.onPointerDownCapture)
  });
});
Bf.displayName = ww;
var Rw = "DismissableLayerBranch", Mw = _.forwardRef((t, a) => {
  const r = _.useContext(S0), o = _.useRef(null), u = bn(a, o);
  return _.useEffect(() => {
    const f = o.current;
    if (f)
      return r.branches.add(f), () => {
        r.branches.delete(f);
      };
  }, [r.branches]), /* @__PURE__ */ (0, D.jsx)(on.div, {
    ...t,
    ref: u
  });
});
Mw.displayName = Rw;
function Dw(t, a = globalThis?.document) {
  const r = pa(t), o = _.useRef(!1), u = _.useRef(() => {
  });
  return _.useEffect(() => {
    const f = (h) => {
      if (h.target && !o.current) {
        let p = function() {
          T0(Cw, r, g, { discrete: !0 });
        };
        const g = { originalEvent: h };
        h.pointerType === "touch" ? (a.removeEventListener("click", u.current), u.current = p, a.addEventListener("click", u.current, { once: !0 })) : p();
      } else a.removeEventListener("click", u.current);
      o.current = !1;
    }, d = window.setTimeout(() => {
      a.addEventListener("pointerdown", f);
    }, 0);
    return () => {
      window.clearTimeout(d), a.removeEventListener("pointerdown", f), a.removeEventListener("click", u.current);
    };
  }, [a, r]), { onPointerDownCapture: () => o.current = !0 };
}
function Nw(t, a = globalThis?.document) {
  const r = pa(t), o = _.useRef(!1);
  return _.useEffect(() => {
    const u = (f) => {
      f.target && !o.current && T0(Ow, r, { originalEvent: f }, { discrete: !1 });
    };
    return a.addEventListener("focusin", u), () => a.removeEventListener("focusin", u);
  }, [a, r]), {
    onFocusCapture: () => o.current = !0,
    onBlurCapture: () => o.current = !1
  };
}
function Hp() {
  const t = new CustomEvent(hf);
  document.dispatchEvent(t);
}
function T0(t, a, r, { discrete: o }) {
  const u = r.originalEvent.target, f = new CustomEvent(t, {
    bubbles: !1,
    cancelable: !0,
    detail: r
  });
  a && u.addEventListener(t, a, { once: !0 }), o ? mw(u, f) : u.dispatchEvent(f);
}
var Hs = "focusScope.autoFocusOnMount", Ls = "focusScope.autoFocusOnUnmount", Lp = {
  bubbles: !1,
  cancelable: !0
}, zw = "FocusScope", A0 = _.forwardRef((t, a) => {
  const { loop: r = !1, trapped: o = !1, onMountAutoFocus: u, onUnmountAutoFocus: f, ...d } = t, [h, p] = _.useState(null), g = pa(u), v = pa(f), b = _.useRef(null), E = bn(a, (T) => p(T)), S = _.useRef({
    paused: !1,
    pause() {
      this.paused = !0;
    },
    resume() {
      this.paused = !1;
    }
  }).current;
  _.useEffect(() => {
    if (o) {
      let T = function(G) {
        if (S.paused || !h) return;
        const N = G.target;
        h.contains(N) ? b.current = N : va(b.current, { select: !0 });
      }, R = function(G) {
        if (S.paused || !h) return;
        const N = G.relatedTarget;
        N !== null && (h.contains(N) || va(b.current, { select: !0 }));
      }, L = function(G) {
        if (document.activeElement === document.body)
          for (const N of G) N.removedNodes.length > 0 && va(h);
      };
      document.addEventListener("focusin", T), document.addEventListener("focusout", R);
      const j = new MutationObserver(L);
      return h && j.observe(h, {
        childList: !0,
        subtree: !0
      }), () => {
        document.removeEventListener("focusin", T), document.removeEventListener("focusout", R), j.disconnect();
      };
    }
  }, [
    o,
    h,
    S.paused
  ]), _.useEffect(() => {
    if (h) {
      Bp.add(S);
      const T = document.activeElement;
      if (!h.contains(T)) {
        const R = new CustomEvent(Hs, Lp);
        h.addEventListener(Hs, g), h.dispatchEvent(R), R.defaultPrevented || (xw(jw(w0(h)), { select: !0 }), document.activeElement === T && va(h));
      }
      return () => {
        h.removeEventListener(Hs, g), setTimeout(() => {
          const R = new CustomEvent(Ls, Lp);
          h.addEventListener(Ls, v), h.dispatchEvent(R), R.defaultPrevented || va(T ?? document.body, { select: !0 }), h.removeEventListener(Ls, v), Bp.remove(S);
        }, 0);
      };
    }
  }, [
    h,
    g,
    v,
    S
  ]);
  const O = _.useCallback((T) => {
    if (!r && !o || S.paused) return;
    const R = T.key === "Tab" && !T.altKey && !T.ctrlKey && !T.metaKey, L = document.activeElement;
    if (R && L) {
      const j = T.currentTarget, [G, N] = Hw(j);
      G && N ? !T.shiftKey && L === N ? (T.preventDefault(), r && va(G, { select: !0 })) : T.shiftKey && L === G && (T.preventDefault(), r && va(N, { select: !0 })) : L === j && T.preventDefault();
    }
  }, [
    r,
    o,
    S.paused
  ]);
  return /* @__PURE__ */ (0, D.jsx)(on.div, {
    tabIndex: -1,
    ...d,
    ref: E,
    onKeyDown: O
  });
});
A0.displayName = zw;
function xw(t, { select: a = !1 } = {}) {
  const r = document.activeElement;
  for (const o of t)
    if (va(o, { select: a }), document.activeElement !== r) return;
}
function Hw(t) {
  const a = w0(t);
  return [Up(a, t), Up(a.reverse(), t)];
}
function w0(t) {
  const a = [], r = document.createTreeWalker(t, NodeFilter.SHOW_ELEMENT, { acceptNode: (o) => {
    const u = o.tagName === "INPUT" && o.type === "hidden";
    return o.disabled || o.hidden || u ? NodeFilter.FILTER_SKIP : o.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
  } });
  for (; r.nextNode(); ) a.push(r.currentNode);
  return a;
}
function Up(t, a) {
  for (const r of t) if (!Lw(r, { upTo: a })) return r;
}
function Lw(t, { upTo: a }) {
  if (getComputedStyle(t).visibility === "hidden") return !0;
  for (; t; ) {
    if (a !== void 0 && t === a) return !1;
    if (getComputedStyle(t).display === "none") return !0;
    t = t.parentElement;
  }
  return !1;
}
function Uw(t) {
  return t instanceof HTMLInputElement && "select" in t;
}
function va(t, { select: a = !1 } = {}) {
  if (t && t.focus) {
    const r = document.activeElement;
    t.focus({ preventScroll: !0 }), t !== r && Uw(t) && a && t.select();
  }
}
var Bp = Bw();
function Bw() {
  let t = [];
  return {
    add(a) {
      const r = t[0];
      a !== r && r?.pause(), t = jp(t, a), t.unshift(a);
    },
    remove(a) {
      t = jp(t, a), t[0]?.resume();
    }
  };
}
function jp(t, a) {
  const r = [...t], o = r.indexOf(a);
  return o !== -1 && r.splice(o, 1), r;
}
function jw(t) {
  return t.filter((a) => a.tagName !== "A");
}
var Zw = "Portal", jf = _.forwardRef((t, a) => {
  const { container: r, ...o } = t, [u, f] = _.useState(!1);
  $a(() => f(!0), []);
  const d = r || u && globalThis?.document?.body;
  return d ? nl.createPortal(/* @__PURE__ */ (0, D.jsx)(on.div, {
    ...o,
    ref: a
  }), d) : null;
});
jf.displayName = Zw;
var Us = 0;
function Gw() {
  _.useEffect(() => {
    const t = document.querySelectorAll("[data-radix-focus-guard]");
    return document.body.insertAdjacentElement("afterbegin", t[0] ?? Zp()), document.body.insertAdjacentElement("beforeend", t[1] ?? Zp()), Us++, () => {
      Us === 1 && document.querySelectorAll("[data-radix-focus-guard]").forEach((a) => a.remove()), Us--;
    };
  }, []);
}
function Zp() {
  const t = document.createElement("span");
  return t.setAttribute("data-radix-focus-guard", ""), t.tabIndex = 0, t.style.outline = "none", t.style.opacity = "0", t.style.position = "fixed", t.style.pointerEvents = "none", t;
}
var Xo = "right-scroll-bar-position", ko = "width-before-scroll-bar", Pw = "with-scroll-bars-hidden", Xw = "--removed-body-scroll-bar-size";
function Bs(t, a) {
  return typeof t == "function" ? t(a) : t && (t.current = a), t;
}
function kw(t, a) {
  var r = (0, _.useState)(function() {
    return {
      value: t,
      callback: a,
      facade: {
        get current() {
          return r.value;
        },
        set current(o) {
          var u = r.value;
          u !== o && (r.value = o, r.callback(o, u));
        }
      }
    };
  })[0];
  return r.callback = a, r.facade;
}
var Vw = typeof window < "u" ? _.useLayoutEffect : _.useEffect, Gp = /* @__PURE__ */ new WeakMap();
function Yw(t, a) {
  var r = kw(a || null, function(o) {
    return t.forEach(function(u) {
      return Bs(u, o);
    });
  });
  return Vw(function() {
    var o = Gp.get(r);
    if (o) {
      var u = new Set(o), f = new Set(t), d = r.current;
      u.forEach(function(h) {
        f.has(h) || Bs(h, null);
      }), f.forEach(function(h) {
        u.has(h) || Bs(h, d);
      });
    }
    Gp.set(r, t);
  }, [t]), r;
}
function qw(t) {
  return t;
}
function Iw(t, a) {
  a === void 0 && (a = qw);
  var r = [], o = !1;
  return {
    read: function() {
      if (o) throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
      return r.length ? r[r.length - 1] : t;
    },
    useMedium: function(u) {
      var f = a(u, o);
      return r.push(f), function() {
        r = r.filter(function(d) {
          return d !== f;
        });
      };
    },
    assignSyncMedium: function(u) {
      for (o = !0; r.length; ) {
        var f = r;
        r = [], f.forEach(u);
      }
      r = {
        push: function(d) {
          return u(d);
        },
        filter: function() {
          return r;
        }
      };
    },
    assignMedium: function(u) {
      o = !0;
      var f = [];
      if (r.length) {
        var d = r;
        r = [], d.forEach(u), f = r;
      }
      var h = function() {
        var g = f;
        f = [], g.forEach(u);
      }, p = function() {
        return Promise.resolve().then(h);
      };
      p(), r = {
        push: function(g) {
          f.push(g), p();
        },
        filter: function(g) {
          return f = f.filter(g), r;
        }
      };
    }
  };
}
function $w(t) {
  t === void 0 && (t = {});
  var a = Iw(null);
  return a.options = te({
    async: !0,
    ssr: !1
  }, t), a;
}
var C0 = function(t) {
  var a = t.sideCar, r = Pn(t, ["sideCar"]);
  if (!a) throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var o = a.read();
  if (!o) throw new Error("Sidecar medium not found");
  return _.createElement(o, te({}, r));
};
C0.isSideCarExport = !0;
function Fw(t, a) {
  return t.useMedium(a), C0;
}
var O0 = $w(), js = function() {
}, ru = _.forwardRef(function(t, a) {
  var r = _.useRef(null), o = _.useState({
    onScrollCapture: js,
    onWheelCapture: js,
    onTouchMoveCapture: js
  }), u = o[0], f = o[1], d = t.forwardProps, h = t.children, p = t.className, g = t.removeScrollBar, v = t.enabled, b = t.shards, E = t.sideCar, S = t.noIsolation, O = t.inert, T = t.allowPinchZoom, R = t.as, L = R === void 0 ? "div" : R, j = t.gapMode, G = Pn(t, [
    "forwardProps",
    "children",
    "className",
    "removeScrollBar",
    "enabled",
    "shards",
    "sideCar",
    "noIsolation",
    "inert",
    "allowPinchZoom",
    "as",
    "gapMode"
  ]), N = E, X = Yw([r, a]), B = te(te({}, G), u);
  return _.createElement(_.Fragment, null, v && _.createElement(N, {
    sideCar: O0,
    removeScrollBar: g,
    shards: b,
    noIsolation: S,
    inert: O,
    setCallbacks: f,
    allowPinchZoom: !!T,
    lockRef: r,
    gapMode: j
  }), d ? _.cloneElement(_.Children.only(h), te(te({}, B), { ref: X })) : _.createElement(L, te({}, B, {
    className: p,
    ref: X
  }), h));
});
ru.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
ru.classNames = {
  fullWidth: ko,
  zeroRight: Xo
};
var Pp, Qw = function() {
  if (Pp) return Pp;
  if (typeof __webpack_nonce__ < "u") return __webpack_nonce__;
};
function Ww() {
  if (!document) return null;
  var t = document.createElement("style");
  t.type = "text/css";
  var a = Qw();
  return a && t.setAttribute("nonce", a), t;
}
function Kw(t, a) {
  t.styleSheet ? t.styleSheet.cssText = a : t.appendChild(document.createTextNode(a));
}
function Jw(t) {
  (document.head || document.getElementsByTagName("head")[0]).appendChild(t);
}
var eC = function() {
  var t = 0, a = null;
  return {
    add: function(r) {
      t == 0 && (a = Ww()) && (Kw(a, r), Jw(a)), t++;
    },
    remove: function() {
      t--, !t && a && (a.parentNode && a.parentNode.removeChild(a), a = null);
    }
  };
}, tC = function() {
  var t = eC();
  return function(a, r) {
    _.useEffect(function() {
      return t.add(a), function() {
        t.remove();
      };
    }, [a && r]);
  };
}, R0 = function() {
  var t = tC(), a = function(r) {
    var o = r.styles, u = r.dynamic;
    return t(o, u), null;
  };
  return a;
}, nC = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, Zs = function(t) {
  return parseInt(t || "", 10) || 0;
}, aC = function(t) {
  var a = window.getComputedStyle(document.body), r = a[t === "padding" ? "paddingLeft" : "marginLeft"], o = a[t === "padding" ? "paddingTop" : "marginTop"], u = a[t === "padding" ? "paddingRight" : "marginRight"];
  return [
    Zs(r),
    Zs(o),
    Zs(u)
  ];
}, iC = function(t) {
  if (t === void 0 && (t = "margin"), typeof window > "u") return nC;
  var a = aC(t), r = document.documentElement.clientWidth, o = window.innerWidth;
  return {
    left: a[0],
    top: a[1],
    right: a[2],
    gap: Math.max(0, o - r + a[2] - a[0])
  };
}, rC = R0(), Yr = "data-scroll-locked", lC = function(t, a, r, o) {
  var u = t.left, f = t.top, d = t.right, h = t.gap;
  return r === void 0 && (r = "margin"), `
  .`.concat(Pw, ` {
   overflow: hidden `).concat(o, `;
   padding-right: `).concat(h, "px ").concat(o, `;
  }
  body[`).concat(Yr, `] {
    overflow: hidden `).concat(o, `;
    overscroll-behavior: contain;
    `).concat([
    a && "position: relative ".concat(o, ";"),
    r === "margin" && `
    padding-left: `.concat(u, `px;
    padding-top: `).concat(f, `px;
    padding-right: `).concat(d, `px;
    margin-left:0;
    margin-top:0;
    margin-right: `).concat(h, "px ").concat(o, `;
    `),
    r === "padding" && "padding-right: ".concat(h, "px ").concat(o, ";")
  ].filter(Boolean).join(""), `
  }
  
  .`).concat(Xo, ` {
    right: `).concat(h, "px ").concat(o, `;
  }
  
  .`).concat(ko, ` {
    margin-right: `).concat(h, "px ").concat(o, `;
  }
  
  .`).concat(Xo, " .").concat(Xo, ` {
    right: 0 `).concat(o, `;
  }
  
  .`).concat(ko, " .").concat(ko, ` {
    margin-right: 0 `).concat(o, `;
  }
  
  body[`).concat(Yr, `] {
    `).concat(Xw, ": ").concat(h, `px;
  }
`);
}, Xp = function() {
  var t = parseInt(document.body.getAttribute("data-scroll-locked") || "0", 10);
  return isFinite(t) ? t : 0;
}, oC = function() {
  _.useEffect(function() {
    return document.body.setAttribute(Yr, (Xp() + 1).toString()), function() {
      var t = Xp() - 1;
      t <= 0 ? document.body.removeAttribute(Yr) : document.body.setAttribute(Yr, t.toString());
    };
  }, []);
}, uC = function(t) {
  var a = t.noRelative, r = t.noImportant, o = t.gapMode, u = o === void 0 ? "margin" : o;
  oC();
  var f = _.useMemo(function() {
    return iC(u);
  }, [u]);
  return _.createElement(rC, { styles: lC(f, !a, u, r ? "" : "!important") });
}, mf = !1;
if (typeof window < "u") try {
  var zo = Object.defineProperty({}, "passive", { get: function() {
    return mf = !0, !0;
  } });
  window.addEventListener("test", zo, zo), window.removeEventListener("test", zo, zo);
} catch {
  mf = !1;
}
var Li = mf ? { passive: !1 } : !1, cC = function(t) {
  return t.tagName === "TEXTAREA";
}, M0 = function(t, a) {
  if (!(t instanceof Element)) return !1;
  var r = window.getComputedStyle(t);
  return r[a] !== "hidden" && !(r.overflowY === r.overflowX && !cC(t) && r[a] === "visible");
}, sC = function(t) {
  return M0(t, "overflowY");
}, fC = function(t) {
  return M0(t, "overflowX");
}, kp = function(t, a) {
  var r = a.ownerDocument, o = a;
  do {
    if (typeof ShadowRoot < "u" && o instanceof ShadowRoot && (o = o.host), D0(t, o)) {
      var u = N0(t, o);
      if (u[1] > u[2]) return !0;
    }
    o = o.parentNode;
  } while (o && o !== r.body);
  return !1;
}, dC = function(t) {
  return [
    t.scrollTop,
    t.scrollHeight,
    t.clientHeight
  ];
}, hC = function(t) {
  return [
    t.scrollLeft,
    t.scrollWidth,
    t.clientWidth
  ];
}, D0 = function(t, a) {
  return t === "v" ? sC(a) : fC(a);
}, N0 = function(t, a) {
  return t === "v" ? dC(a) : hC(a);
}, mC = function(t, a) {
  return t === "h" && a === "rtl" ? -1 : 1;
}, vC = function(t, a, r, o, u) {
  var f = mC(t, window.getComputedStyle(a).direction), d = f * o, h = r.target, p = a.contains(h), g = !1, v = d > 0, b = 0, E = 0;
  do {
    var S = N0(t, h), O = S[0], T = S[1] - S[2] - f * O;
    (O || T) && D0(t, h) && (b += T, E += O), h instanceof ShadowRoot ? h = h.host : h = h.parentNode;
  } while (!p && h !== document.body || p && (a.contains(h) || a === h));
  return (v && (u && Math.abs(b) < 1 || !u && d > b) || !v && (u && Math.abs(E) < 1 || !u && -d > E)) && (g = !0), g;
}, xo = function(t) {
  return "changedTouches" in t ? [t.changedTouches[0].clientX, t.changedTouches[0].clientY] : [0, 0];
}, Vp = function(t) {
  return [t.deltaX, t.deltaY];
}, Yp = function(t) {
  return t && "current" in t ? t.current : t;
}, pC = function(t, a) {
  return t[0] === a[0] && t[1] === a[1];
}, gC = function(t) {
  return `
  .block-interactivity-`.concat(t, ` {pointer-events: none;}
  .allow-interactivity-`).concat(t, ` {pointer-events: all;}
`);
}, yC = 0, Ui = [];
function bC(t) {
  var a = _.useRef([]), r = _.useRef([0, 0]), o = _.useRef(), u = _.useState(yC++)[0], f = _.useState(R0)[0], d = _.useRef(t);
  _.useEffect(function() {
    d.current = t;
  }, [t]), _.useEffect(function() {
    if (t.inert) {
      document.body.classList.add("block-interactivity-".concat(u));
      var T = nn([t.lockRef.current], (t.shards || []).map(Yp), !0).filter(Boolean);
      return T.forEach(function(R) {
        return R.classList.add("allow-interactivity-".concat(u));
      }), function() {
        document.body.classList.remove("block-interactivity-".concat(u)), T.forEach(function(R) {
          return R.classList.remove("allow-interactivity-".concat(u));
        });
      };
    }
  }, [
    t.inert,
    t.lockRef.current,
    t.shards
  ]);
  var h = _.useCallback(function(T, R) {
    if ("touches" in T && T.touches.length === 2 || T.type === "wheel" && T.ctrlKey) return !d.current.allowPinchZoom;
    var L = xo(T), j = r.current, G = "deltaX" in T ? T.deltaX : j[0] - L[0], N = "deltaY" in T ? T.deltaY : j[1] - L[1], X, B = T.target, I = Math.abs(G) > Math.abs(N) ? "h" : "v";
    if ("touches" in T && I === "h" && B.type === "range") return !1;
    var H = kp(I, B);
    if (!H) return !0;
    if (H ? X = I : (X = I === "v" ? "h" : "v", H = kp(I, B)), !H) return !1;
    if (!o.current && "changedTouches" in T && (G || N) && (o.current = X), !X) return !0;
    var K = o.current || X;
    return vC(K, R, T, K === "h" ? G : N, !0);
  }, []), p = _.useCallback(function(T) {
    var R = T;
    if (!(!Ui.length || Ui[Ui.length - 1] !== f)) {
      var L = "deltaY" in R ? Vp(R) : xo(R), j = a.current.filter(function(N) {
        return N.name === R.type && (N.target === R.target || R.target === N.shadowParent) && pC(N.delta, L);
      })[0];
      if (j && j.should) {
        R.cancelable && R.preventDefault();
        return;
      }
      if (!j) {
        var G = (d.current.shards || []).map(Yp).filter(Boolean).filter(function(N) {
          return N.contains(R.target);
        });
        (G.length > 0 ? h(R, G[0]) : !d.current.noIsolation) && R.cancelable && R.preventDefault();
      }
    }
  }, []), g = _.useCallback(function(T, R, L, j) {
    var G = {
      name: T,
      delta: R,
      target: L,
      should: j,
      shadowParent: _C(L)
    };
    a.current.push(G), setTimeout(function() {
      a.current = a.current.filter(function(N) {
        return N !== G;
      });
    }, 1);
  }, []), v = _.useCallback(function(T) {
    r.current = xo(T), o.current = void 0;
  }, []), b = _.useCallback(function(T) {
    g(T.type, Vp(T), T.target, h(T, t.lockRef.current));
  }, []), E = _.useCallback(function(T) {
    g(T.type, xo(T), T.target, h(T, t.lockRef.current));
  }, []);
  _.useEffect(function() {
    return Ui.push(f), t.setCallbacks({
      onScrollCapture: b,
      onWheelCapture: b,
      onTouchMoveCapture: E
    }), document.addEventListener("wheel", p, Li), document.addEventListener("touchmove", p, Li), document.addEventListener("touchstart", v, Li), function() {
      Ui = Ui.filter(function(T) {
        return T !== f;
      }), document.removeEventListener("wheel", p, Li), document.removeEventListener("touchmove", p, Li), document.removeEventListener("touchstart", v, Li);
    };
  }, []);
  var S = t.removeScrollBar, O = t.inert;
  return _.createElement(_.Fragment, null, O ? _.createElement(f, { styles: gC(u) }) : null, S ? _.createElement(uC, { gapMode: t.gapMode }) : null);
}
function _C(t) {
  for (var a = null; t !== null; )
    t instanceof ShadowRoot && (a = t.host, t = t.host), t = t.parentNode;
  return a;
}
var EC = Fw(O0, bC), z0 = _.forwardRef(function(t, a) {
  return _.createElement(ru, te({}, t, {
    ref: a,
    sideCar: EC
  }));
});
z0.classNames = ru.classNames;
var SC = function(t) {
  return typeof document > "u" ? null : (Array.isArray(t) ? t[0] : t).ownerDocument.body;
}, Bi = /* @__PURE__ */ new WeakMap(), Ho = /* @__PURE__ */ new WeakMap(), Lo = {}, Gs = 0, x0 = function(t) {
  return t && (t.host || x0(t.parentNode));
}, TC = function(t, a) {
  return a.map(function(r) {
    if (t.contains(r)) return r;
    var o = x0(r);
    return o && t.contains(o) ? o : (console.error("aria-hidden", r, "in not contained inside", t, ". Doing nothing"), null);
  }).filter(function(r) {
    return !!r;
  });
}, AC = function(t, a, r, o) {
  var u = TC(a, Array.isArray(t) ? t : [t]);
  Lo[r] || (Lo[r] = /* @__PURE__ */ new WeakMap());
  var f = Lo[r], d = [], h = /* @__PURE__ */ new Set(), p = new Set(u), g = function(b) {
    !b || h.has(b) || (h.add(b), g(b.parentNode));
  };
  u.forEach(g);
  var v = function(b) {
    !b || p.has(b) || Array.prototype.forEach.call(b.children, function(E) {
      if (h.has(E)) v(E);
      else try {
        var S = E.getAttribute(o), O = S !== null && S !== "false", T = (Bi.get(E) || 0) + 1, R = (f.get(E) || 0) + 1;
        Bi.set(E, T), f.set(E, R), d.push(E), T === 1 && O && Ho.set(E, !0), R === 1 && E.setAttribute(r, "true"), O || E.setAttribute(o, "true");
      } catch (L) {
        console.error("aria-hidden: cannot operate on ", E, L);
      }
    });
  };
  return v(a), h.clear(), Gs++, function() {
    d.forEach(function(b) {
      var E = Bi.get(b) - 1, S = f.get(b) - 1;
      Bi.set(b, E), f.set(b, S), E || (Ho.has(b) || b.removeAttribute(o), Ho.delete(b)), S || b.removeAttribute(r);
    }), Gs--, Gs || (Bi = /* @__PURE__ */ new WeakMap(), Bi = /* @__PURE__ */ new WeakMap(), Ho = /* @__PURE__ */ new WeakMap(), Lo = {});
  };
}, wC = function(t, a, r) {
  r === void 0 && (r = "data-aria-hidden");
  var o = Array.from(Array.isArray(t) ? t : [t]), u = a || SC(t);
  return u ? (o.push.apply(o, Array.from(u.querySelectorAll("[aria-live]"))), AC(o, u, r, "aria-hidden")) : function() {
    return null;
  };
};
function CC(t) {
  const [a, r] = _.useState(void 0);
  return $a(() => {
    if (t) {
      r({
        width: t.offsetWidth,
        height: t.offsetHeight
      });
      const o = new ResizeObserver((u) => {
        if (!Array.isArray(u) || !u.length) return;
        const f = u[0];
        let d, h;
        if ("borderBoxSize" in f) {
          const p = f.borderBoxSize, g = Array.isArray(p) ? p[0] : p;
          d = g.inlineSize, h = g.blockSize;
        } else
          d = t.offsetWidth, h = t.offsetHeight;
        r({
          width: d,
          height: h
        });
      });
      return o.observe(t, { box: "border-box" }), () => o.unobserve(t);
    } else r(void 0);
  }, [t]), a;
}
var OC = [
  "top",
  "right",
  "bottom",
  "left"
], ga = Math.min, zt = Math.max, Fo = Math.round, Uo = Math.floor, vn = (t) => ({
  x: t,
  y: t
}), RC = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
}, MC = {
  start: "end",
  end: "start"
};
function vf(t, a, r) {
  return zt(t, ga(a, r));
}
function Xn(t, a) {
  return typeof t == "function" ? t(a) : t;
}
function kn(t) {
  return t.split("-")[0];
}
function Qi(t) {
  return t.split("-")[1];
}
function Zf(t) {
  return t === "x" ? "y" : "x";
}
function Gf(t) {
  return t === "y" ? "height" : "width";
}
var DC = /* @__PURE__ */ new Set(["top", "bottom"]);
function mn(t) {
  return DC.has(kn(t)) ? "y" : "x";
}
function Pf(t) {
  return Zf(mn(t));
}
function NC(t, a, r) {
  r === void 0 && (r = !1);
  const o = Qi(t), u = Pf(t), f = Gf(u);
  let d = u === "x" ? o === (r ? "end" : "start") ? "right" : "left" : o === "start" ? "bottom" : "top";
  return a.reference[f] > a.floating[f] && (d = Qo(d)), [d, Qo(d)];
}
function zC(t) {
  const a = Qo(t);
  return [
    pf(t),
    a,
    pf(a)
  ];
}
function pf(t) {
  return t.replace(/start|end/g, (a) => MC[a]);
}
var qp = ["left", "right"], Ip = ["right", "left"], xC = ["top", "bottom"], HC = ["bottom", "top"];
function LC(t, a, r) {
  switch (t) {
    case "top":
    case "bottom":
      return r ? a ? Ip : qp : a ? qp : Ip;
    case "left":
    case "right":
      return a ? xC : HC;
    default:
      return [];
  }
}
function UC(t, a, r, o) {
  const u = Qi(t);
  let f = LC(kn(t), r === "start", o);
  return u && (f = f.map((d) => d + "-" + u), a && (f = f.concat(f.map(pf)))), f;
}
function Qo(t) {
  return t.replace(/left|right|bottom|top/g, (a) => RC[a]);
}
function BC(t) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...t
  };
}
function H0(t) {
  return typeof t != "number" ? BC(t) : {
    top: t,
    right: t,
    bottom: t,
    left: t
  };
}
function Wo(t) {
  const { x: a, y: r, width: o, height: u } = t;
  return {
    width: o,
    height: u,
    top: r,
    left: a,
    right: a + o,
    bottom: r + u,
    x: a,
    y: r
  };
}
function $p(t, a, r) {
  let { reference: o, floating: u } = t;
  const f = mn(a), d = Pf(a), h = Gf(d), p = kn(a), g = f === "y", v = o.x + o.width / 2 - u.width / 2, b = o.y + o.height / 2 - u.height / 2, E = o[h] / 2 - u[h] / 2;
  let S;
  switch (p) {
    case "top":
      S = {
        x: v,
        y: o.y - u.height
      };
      break;
    case "bottom":
      S = {
        x: v,
        y: o.y + o.height
      };
      break;
    case "right":
      S = {
        x: o.x + o.width,
        y: b
      };
      break;
    case "left":
      S = {
        x: o.x - u.width,
        y: b
      };
      break;
    default:
      S = {
        x: o.x,
        y: o.y
      };
  }
  switch (Qi(a)) {
    case "start":
      S[d] -= E * (r && g ? -1 : 1);
      break;
    case "end":
      S[d] += E * (r && g ? -1 : 1);
      break;
  }
  return S;
}
var jC = async (t, a, r) => {
  const { placement: o = "bottom", strategy: u = "absolute", middleware: f = [], platform: d } = r, h = f.filter(Boolean), p = await (d.isRTL == null ? void 0 : d.isRTL(a));
  let g = await d.getElementRects({
    reference: t,
    floating: a,
    strategy: u
  }), { x: v, y: b } = $p(g, o, p), E = o, S = {}, O = 0;
  for (let T = 0; T < h.length; T++) {
    const { name: R, fn: L } = h[T], { x: j, y: G, data: N, reset: X } = await L({
      x: v,
      y: b,
      initialPlacement: o,
      placement: E,
      strategy: u,
      middlewareData: S,
      rects: g,
      platform: d,
      elements: {
        reference: t,
        floating: a
      }
    });
    v = j ?? v, b = G ?? b, S = {
      ...S,
      [R]: {
        ...S[R],
        ...N
      }
    }, X && O <= 50 && (O++, typeof X == "object" && (X.placement && (E = X.placement), X.rects && (g = X.rects === !0 ? await d.getElementRects({
      reference: t,
      floating: a,
      strategy: u
    }) : X.rects), { x: v, y: b } = $p(g, E, p)), T = -1);
  }
  return {
    x: v,
    y: b,
    placement: E,
    strategy: u,
    middlewareData: S
  };
};
async function Fr(t, a) {
  var r;
  a === void 0 && (a = {});
  const { x: o, y: u, platform: f, rects: d, elements: h, strategy: p } = t, { boundary: g = "clippingAncestors", rootBoundary: v = "viewport", elementContext: b = "floating", altBoundary: E = !1, padding: S = 0 } = Xn(a, t), O = H0(S), T = h[E ? b === "floating" ? "reference" : "floating" : b], R = Wo(await f.getClippingRect({
    element: (r = await (f.isElement == null ? void 0 : f.isElement(T))) == null || r ? T : T.contextElement || await (f.getDocumentElement == null ? void 0 : f.getDocumentElement(h.floating)),
    boundary: g,
    rootBoundary: v,
    strategy: p
  })), L = b === "floating" ? {
    x: o,
    y: u,
    width: d.floating.width,
    height: d.floating.height
  } : d.reference, j = await (f.getOffsetParent == null ? void 0 : f.getOffsetParent(h.floating)), G = await (f.isElement == null ? void 0 : f.isElement(j)) ? await (f.getScale == null ? void 0 : f.getScale(j)) || {
    x: 1,
    y: 1
  } : {
    x: 1,
    y: 1
  }, N = Wo(f.convertOffsetParentRelativeRectToViewportRelativeRect ? await f.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements: h,
    rect: L,
    offsetParent: j,
    strategy: p
  }) : L);
  return {
    top: (R.top - N.top + O.top) / G.y,
    bottom: (N.bottom - R.bottom + O.bottom) / G.y,
    left: (R.left - N.left + O.left) / G.x,
    right: (N.right - R.right + O.right) / G.x
  };
}
var ZC = (t) => ({
  name: "arrow",
  options: t,
  async fn(a) {
    const { x: r, y: o, placement: u, rects: f, platform: d, elements: h, middlewareData: p } = a, { element: g, padding: v = 0 } = Xn(t, a) || {};
    if (g == null) return {};
    const b = H0(v), E = {
      x: r,
      y: o
    }, S = Pf(u), O = Gf(S), T = await d.getDimensions(g), R = S === "y", L = R ? "top" : "left", j = R ? "bottom" : "right", G = R ? "clientHeight" : "clientWidth", N = f.reference[O] + f.reference[S] - E[S] - f.floating[O], X = E[S] - f.reference[S], B = await (d.getOffsetParent == null ? void 0 : d.getOffsetParent(g));
    let I = B ? B[G] : 0;
    (!I || !await (d.isElement == null ? void 0 : d.isElement(B))) && (I = h.floating[G] || f.floating[O]);
    const H = N / 2 - X / 2, K = I / 2 - T[O] / 2 - 1, ne = ga(b[L], K), J = ga(b[j], K), ee = ne, he = I - T[O] - J, de = I / 2 - T[O] / 2 + H, ge = vf(ee, de, he), Q = !p.arrow && Qi(u) != null && de !== ge && f.reference[O] / 2 - (de < ee ? ne : J) - T[O] / 2 < 0, k = Q ? de < ee ? de - ee : de - he : 0;
    return {
      [S]: E[S] + k,
      data: {
        [S]: ge,
        centerOffset: de - ge - k,
        ...Q && { alignmentOffset: k }
      },
      reset: Q
    };
  }
}), GC = function(t) {
  return t === void 0 && (t = {}), {
    name: "flip",
    options: t,
    async fn(a) {
      var r, o;
      const { placement: u, middlewareData: f, rects: d, initialPlacement: h, platform: p, elements: g } = a, { mainAxis: v = !0, crossAxis: b = !0, fallbackPlacements: E, fallbackStrategy: S = "bestFit", fallbackAxisSideDirection: O = "none", flipAlignment: T = !0, ...R } = Xn(t, a);
      if ((r = f.arrow) != null && r.alignmentOffset) return {};
      const L = kn(u), j = mn(h), G = kn(h) === h, N = await (p.isRTL == null ? void 0 : p.isRTL(g.floating)), X = E || (G || !T ? [Qo(h)] : zC(h)), B = O !== "none";
      !E && B && X.push(...UC(h, T, O, N));
      const I = [h, ...X], H = await Fr(a, R), K = [];
      let ne = ((o = f.flip) == null ? void 0 : o.overflows) || [];
      if (v && K.push(H[L]), b) {
        const de = NC(u, d, N);
        K.push(H[de[0]], H[de[1]]);
      }
      if (ne = [...ne, {
        placement: u,
        overflows: K
      }], !K.every((de) => de <= 0)) {
        var J, ee;
        const de = (((J = f.flip) == null ? void 0 : J.index) || 0) + 1, ge = I[de];
        if (ge && (!(b === "alignment" && j !== mn(ge)) || ne.every((k) => mn(k.placement) === j ? k.overflows[0] > 0 : !0)))
          return {
            data: {
              index: de,
              overflows: ne
            },
            reset: { placement: ge }
          };
        let Q = (ee = ne.filter((k) => k.overflows[0] <= 0).sort((k, $) => k.overflows[1] - $.overflows[1])[0]) == null ? void 0 : ee.placement;
        if (!Q) switch (S) {
          case "bestFit": {
            var he;
            const k = (he = ne.filter(($) => {
              if (B) {
                const ce = mn($.placement);
                return ce === j || ce === "y";
              }
              return !0;
            }).map(($) => [$.placement, $.overflows.filter((ce) => ce > 0).reduce((ce, ye) => ce + ye, 0)]).sort(($, ce) => $[1] - ce[1])[0]) == null ? void 0 : he[0];
            k && (Q = k);
            break;
          }
          case "initialPlacement":
            Q = h;
            break;
        }
        if (u !== Q) return { reset: { placement: Q } };
      }
      return {};
    }
  };
};
function Fp(t, a) {
  return {
    top: t.top - a.height,
    right: t.right - a.width,
    bottom: t.bottom - a.height,
    left: t.left - a.width
  };
}
function Qp(t) {
  return OC.some((a) => t[a] >= 0);
}
var PC = function(t) {
  return t === void 0 && (t = {}), {
    name: "hide",
    options: t,
    async fn(a) {
      const { rects: r } = a, { strategy: o = "referenceHidden", ...u } = Xn(t, a);
      switch (o) {
        case "referenceHidden": {
          const f = Fp(await Fr(a, {
            ...u,
            elementContext: "reference"
          }), r.reference);
          return { data: {
            referenceHiddenOffsets: f,
            referenceHidden: Qp(f)
          } };
        }
        case "escaped": {
          const f = Fp(await Fr(a, {
            ...u,
            altBoundary: !0
          }), r.floating);
          return { data: {
            escapedOffsets: f,
            escaped: Qp(f)
          } };
        }
        default:
          return {};
      }
    }
  };
}, L0 = /* @__PURE__ */ new Set(["left", "top"]);
async function XC(t, a) {
  const { placement: r, platform: o, elements: u } = t, f = await (o.isRTL == null ? void 0 : o.isRTL(u.floating)), d = kn(r), h = Qi(r), p = mn(r) === "y", g = L0.has(d) ? -1 : 1, v = f && p ? -1 : 1, b = Xn(a, t);
  let { mainAxis: E, crossAxis: S, alignmentAxis: O } = typeof b == "number" ? {
    mainAxis: b,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: b.mainAxis || 0,
    crossAxis: b.crossAxis || 0,
    alignmentAxis: b.alignmentAxis
  };
  return h && typeof O == "number" && (S = h === "end" ? O * -1 : O), p ? {
    x: S * v,
    y: E * g
  } : {
    x: E * g,
    y: S * v
  };
}
var kC = function(t) {
  return t === void 0 && (t = 0), {
    name: "offset",
    options: t,
    async fn(a) {
      var r, o;
      const { x: u, y: f, placement: d, middlewareData: h } = a, p = await XC(a, t);
      return d === ((r = h.offset) == null ? void 0 : r.placement) && (o = h.arrow) != null && o.alignmentOffset ? {} : {
        x: u + p.x,
        y: f + p.y,
        data: {
          ...p,
          placement: d
        }
      };
    }
  };
}, VC = function(t) {
  return t === void 0 && (t = {}), {
    name: "shift",
    options: t,
    async fn(a) {
      const { x: r, y: o, placement: u } = a, { mainAxis: f = !0, crossAxis: d = !1, limiter: h = { fn: (R) => {
        let { x: L, y: j } = R;
        return {
          x: L,
          y: j
        };
      } }, ...p } = Xn(t, a), g = {
        x: r,
        y: o
      }, v = await Fr(a, p), b = mn(kn(u)), E = Zf(b);
      let S = g[E], O = g[b];
      if (f) {
        const R = E === "y" ? "top" : "left", L = E === "y" ? "bottom" : "right", j = S + v[R], G = S - v[L];
        S = vf(j, S, G);
      }
      if (d) {
        const R = b === "y" ? "top" : "left", L = b === "y" ? "bottom" : "right", j = O + v[R], G = O - v[L];
        O = vf(j, O, G);
      }
      const T = h.fn({
        ...a,
        [E]: S,
        [b]: O
      });
      return {
        ...T,
        data: {
          x: T.x - r,
          y: T.y - o,
          enabled: {
            [E]: f,
            [b]: d
          }
        }
      };
    }
  };
}, YC = function(t) {
  return t === void 0 && (t = {}), {
    options: t,
    fn(a) {
      const { x: r, y: o, placement: u, rects: f, middlewareData: d } = a, { offset: h = 0, mainAxis: p = !0, crossAxis: g = !0 } = Xn(t, a), v = {
        x: r,
        y: o
      }, b = mn(u), E = Zf(b);
      let S = v[E], O = v[b];
      const T = Xn(h, a), R = typeof T == "number" ? {
        mainAxis: T,
        crossAxis: 0
      } : {
        mainAxis: 0,
        crossAxis: 0,
        ...T
      };
      if (p) {
        const G = E === "y" ? "height" : "width", N = f.reference[E] - f.floating[G] + R.mainAxis, X = f.reference[E] + f.reference[G] - R.mainAxis;
        S < N ? S = N : S > X && (S = X);
      }
      if (g) {
        var L, j;
        const G = E === "y" ? "width" : "height", N = L0.has(kn(u)), X = f.reference[b] - f.floating[G] + (N && ((L = d.offset) == null ? void 0 : L[b]) || 0) + (N ? 0 : R.crossAxis), B = f.reference[b] + f.reference[G] + (N ? 0 : ((j = d.offset) == null ? void 0 : j[b]) || 0) - (N ? R.crossAxis : 0);
        O < X ? O = X : O > B && (O = B);
      }
      return {
        [E]: S,
        [b]: O
      };
    }
  };
}, qC = function(t) {
  return t === void 0 && (t = {}), {
    name: "size",
    options: t,
    async fn(a) {
      var r, o;
      const { placement: u, rects: f, platform: d, elements: h } = a, { apply: p = () => {
      }, ...g } = Xn(t, a), v = await Fr(a, g), b = kn(u), E = Qi(u), S = mn(u) === "y", { width: O, height: T } = f.floating;
      let R, L;
      b === "top" || b === "bottom" ? (R = b, L = E === (await (d.isRTL == null ? void 0 : d.isRTL(h.floating)) ? "start" : "end") ? "left" : "right") : (L = b, R = E === "end" ? "top" : "bottom");
      const j = T - v.top - v.bottom, G = O - v.left - v.right, N = ga(T - v[R], j), X = ga(O - v[L], G), B = !a.middlewareData.shift;
      let I = N, H = X;
      if ((r = a.middlewareData.shift) != null && r.enabled.x && (H = G), (o = a.middlewareData.shift) != null && o.enabled.y && (I = j), B && !E) {
        const ne = zt(v.left, 0), J = zt(v.right, 0), ee = zt(v.top, 0), he = zt(v.bottom, 0);
        S ? H = O - 2 * (ne !== 0 || J !== 0 ? ne + J : zt(v.left, v.right)) : I = T - 2 * (ee !== 0 || he !== 0 ? ee + he : zt(v.top, v.bottom));
      }
      await p({
        ...a,
        availableWidth: H,
        availableHeight: I
      });
      const K = await d.getDimensions(h.floating);
      return O !== K.width || T !== K.height ? { reset: { rects: !0 } } : {};
    }
  };
};
function lu() {
  return typeof window < "u";
}
function Wi(t) {
  return U0(t) ? (t.nodeName || "").toLowerCase() : "#document";
}
function xt(t) {
  var a;
  return (t == null || (a = t.ownerDocument) == null ? void 0 : a.defaultView) || window;
}
function _n(t) {
  var a;
  return (a = (U0(t) ? t.ownerDocument : t.document) || window.document) == null ? void 0 : a.documentElement;
}
function U0(t) {
  return lu() ? t instanceof Node || t instanceof xt(t).Node : !1;
}
function rn(t) {
  return lu() ? t instanceof Element || t instanceof xt(t).Element : !1;
}
function gn(t) {
  return lu() ? t instanceof HTMLElement || t instanceof xt(t).HTMLElement : !1;
}
function Wp(t) {
  return !lu() || typeof ShadowRoot > "u" ? !1 : t instanceof ShadowRoot || t instanceof xt(t).ShadowRoot;
}
var IC = /* @__PURE__ */ new Set(["inline", "contents"]);
function il(t) {
  const { overflow: a, overflowX: r, overflowY: o, display: u } = ln(t);
  return /auto|scroll|overlay|hidden|clip/.test(a + o + r) && !IC.has(u);
}
var $C = /* @__PURE__ */ new Set([
  "table",
  "td",
  "th"
]);
function FC(t) {
  return $C.has(Wi(t));
}
var QC = [":popover-open", ":modal"];
function ou(t) {
  return QC.some((a) => {
    try {
      return t.matches(a);
    } catch {
      return !1;
    }
  });
}
var WC = [
  "transform",
  "translate",
  "scale",
  "rotate",
  "perspective"
], KC = [
  "transform",
  "translate",
  "scale",
  "rotate",
  "perspective",
  "filter"
], JC = [
  "paint",
  "layout",
  "strict",
  "content"
];
function Xf(t) {
  const a = kf(), r = rn(t) ? ln(t) : t;
  return WC.some((o) => r[o] ? r[o] !== "none" : !1) || (r.containerType ? r.containerType !== "normal" : !1) || !a && (r.backdropFilter ? r.backdropFilter !== "none" : !1) || !a && (r.filter ? r.filter !== "none" : !1) || KC.some((o) => (r.willChange || "").includes(o)) || JC.some((o) => (r.contain || "").includes(o));
}
function eO(t) {
  let a = ya(t);
  for (; gn(a) && !Yi(a); ) {
    if (Xf(a)) return a;
    if (ou(a)) return null;
    a = ya(a);
  }
  return null;
}
function kf() {
  return typeof CSS > "u" || !CSS.supports ? !1 : CSS.supports("-webkit-backdrop-filter", "none");
}
var tO = /* @__PURE__ */ new Set([
  "html",
  "body",
  "#document"
]);
function Yi(t) {
  return tO.has(Wi(t));
}
function ln(t) {
  return xt(t).getComputedStyle(t);
}
function uu(t) {
  return rn(t) ? {
    scrollLeft: t.scrollLeft,
    scrollTop: t.scrollTop
  } : {
    scrollLeft: t.scrollX,
    scrollTop: t.scrollY
  };
}
function ya(t) {
  if (Wi(t) === "html") return t;
  const a = t.assignedSlot || t.parentNode || Wp(t) && t.host || _n(t);
  return Wp(a) ? a.host : a;
}
function B0(t) {
  const a = ya(t);
  return Yi(a) ? t.ownerDocument ? t.ownerDocument.body : t.body : gn(a) && il(a) ? a : B0(a);
}
function Qr(t, a, r) {
  var o;
  a === void 0 && (a = []), r === void 0 && (r = !0);
  const u = B0(t), f = u === ((o = t.ownerDocument) == null ? void 0 : o.body), d = xt(u);
  if (f) {
    const h = gf(d);
    return a.concat(d, d.visualViewport || [], il(u) ? u : [], h && r ? Qr(h) : []);
  }
  return a.concat(u, Qr(u, [], r));
}
function gf(t) {
  return t.parent && Object.getPrototypeOf(t.parent) ? t.frameElement : null;
}
function j0(t) {
  const a = ln(t);
  let r = parseFloat(a.width) || 0, o = parseFloat(a.height) || 0;
  const u = gn(t), f = u ? t.offsetWidth : r, d = u ? t.offsetHeight : o, h = Fo(r) !== f || Fo(o) !== d;
  return h && (r = f, o = d), {
    width: r,
    height: o,
    $: h
  };
}
function Vf(t) {
  return rn(t) ? t : t.contextElement;
}
function ki(t) {
  const a = Vf(t);
  if (!gn(a)) return vn(1);
  const r = a.getBoundingClientRect(), { width: o, height: u, $: f } = j0(a);
  let d = (f ? Fo(r.width) : r.width) / o, h = (f ? Fo(r.height) : r.height) / u;
  return (!d || !Number.isFinite(d)) && (d = 1), (!h || !Number.isFinite(h)) && (h = 1), {
    x: d,
    y: h
  };
}
var nO = /* @__PURE__ */ vn(0);
function Z0(t) {
  const a = xt(t);
  return !kf() || !a.visualViewport ? nO : {
    x: a.visualViewport.offsetLeft,
    y: a.visualViewport.offsetTop
  };
}
function aO(t, a, r) {
  return a === void 0 && (a = !1), !r || a && r !== xt(t) ? !1 : a;
}
function Fa(t, a, r, o) {
  a === void 0 && (a = !1), r === void 0 && (r = !1);
  const u = t.getBoundingClientRect(), f = Vf(t);
  let d = vn(1);
  a && (o ? rn(o) && (d = ki(o)) : d = ki(t));
  const h = aO(f, r, o) ? Z0(f) : vn(0);
  let p = (u.left + h.x) / d.x, g = (u.top + h.y) / d.y, v = u.width / d.x, b = u.height / d.y;
  if (f) {
    const E = xt(f), S = o && rn(o) ? xt(o) : o;
    let O = E, T = gf(O);
    for (; T && o && S !== O; ) {
      const R = ki(T), L = T.getBoundingClientRect(), j = ln(T), G = L.left + (T.clientLeft + parseFloat(j.paddingLeft)) * R.x, N = L.top + (T.clientTop + parseFloat(j.paddingTop)) * R.y;
      p *= R.x, g *= R.y, v *= R.x, b *= R.y, p += G, g += N, O = xt(T), T = gf(O);
    }
  }
  return Wo({
    width: v,
    height: b,
    x: p,
    y: g
  });
}
function cu(t, a) {
  const r = uu(t).scrollLeft;
  return a ? a.left + r : Fa(_n(t)).left + r;
}
function G0(t, a) {
  const r = t.getBoundingClientRect();
  return {
    x: r.left + a.scrollLeft - cu(t, r),
    y: r.top + a.scrollTop
  };
}
function iO(t) {
  let { elements: a, rect: r, offsetParent: o, strategy: u } = t;
  const f = u === "fixed", d = _n(o), h = a ? ou(a.floating) : !1;
  if (o === d || h && f) return r;
  let p = {
    scrollLeft: 0,
    scrollTop: 0
  }, g = vn(1);
  const v = vn(0), b = gn(o);
  if ((b || !b && !f) && ((Wi(o) !== "body" || il(d)) && (p = uu(o)), gn(o))) {
    const S = Fa(o);
    g = ki(o), v.x = S.x + o.clientLeft, v.y = S.y + o.clientTop;
  }
  const E = d && !b && !f ? G0(d, p) : vn(0);
  return {
    width: r.width * g.x,
    height: r.height * g.y,
    x: r.x * g.x - p.scrollLeft * g.x + v.x + E.x,
    y: r.y * g.y - p.scrollTop * g.y + v.y + E.y
  };
}
function rO(t) {
  return Array.from(t.getClientRects());
}
function lO(t) {
  const a = _n(t), r = uu(t), o = t.ownerDocument.body, u = zt(a.scrollWidth, a.clientWidth, o.scrollWidth, o.clientWidth), f = zt(a.scrollHeight, a.clientHeight, o.scrollHeight, o.clientHeight);
  let d = -r.scrollLeft + cu(t);
  const h = -r.scrollTop;
  return ln(o).direction === "rtl" && (d += zt(a.clientWidth, o.clientWidth) - u), {
    width: u,
    height: f,
    x: d,
    y: h
  };
}
var Kp = 25;
function oO(t, a) {
  const r = xt(t), o = _n(t), u = r.visualViewport;
  let f = o.clientWidth, d = o.clientHeight, h = 0, p = 0;
  if (u) {
    f = u.width, d = u.height;
    const v = kf();
    (!v || v && a === "fixed") && (h = u.offsetLeft, p = u.offsetTop);
  }
  const g = cu(o);
  if (g <= 0) {
    const v = o.ownerDocument, b = v.body, E = getComputedStyle(b), S = v.compatMode === "CSS1Compat" && parseFloat(E.marginLeft) + parseFloat(E.marginRight) || 0, O = Math.abs(o.clientWidth - b.clientWidth - S);
    O <= Kp && (f -= O);
  } else g <= Kp && (f += g);
  return {
    width: f,
    height: d,
    x: h,
    y: p
  };
}
var uO = /* @__PURE__ */ new Set(["absolute", "fixed"]);
function cO(t, a) {
  const r = Fa(t, !0, a === "fixed"), o = r.top + t.clientTop, u = r.left + t.clientLeft, f = gn(t) ? ki(t) : vn(1);
  return {
    width: t.clientWidth * f.x,
    height: t.clientHeight * f.y,
    x: u * f.x,
    y: o * f.y
  };
}
function Jp(t, a, r) {
  let o;
  if (a === "viewport") o = oO(t, r);
  else if (a === "document") o = lO(_n(t));
  else if (rn(a)) o = cO(a, r);
  else {
    const u = Z0(t);
    o = {
      x: a.x - u.x,
      y: a.y - u.y,
      width: a.width,
      height: a.height
    };
  }
  return Wo(o);
}
function P0(t, a) {
  const r = ya(t);
  return r === a || !rn(r) || Yi(r) ? !1 : ln(r).position === "fixed" || P0(r, a);
}
function sO(t, a) {
  const r = a.get(t);
  if (r) return r;
  let o = Qr(t, [], !1).filter((h) => rn(h) && Wi(h) !== "body"), u = null;
  const f = ln(t).position === "fixed";
  let d = f ? ya(t) : t;
  for (; rn(d) && !Yi(d); ) {
    const h = ln(d), p = Xf(d);
    !p && h.position === "fixed" && (u = null), (f ? !p && !u : !p && h.position === "static" && u && uO.has(u.position) || il(d) && !p && P0(t, d)) ? o = o.filter((g) => g !== d) : u = h, d = ya(d);
  }
  return a.set(t, o), o;
}
function fO(t) {
  let { element: a, boundary: r, rootBoundary: o, strategy: u } = t;
  const f = [...r === "clippingAncestors" ? ou(a) ? [] : sO(a, this._c) : [].concat(r), o], d = f[0], h = f.reduce((p, g) => {
    const v = Jp(a, g, u);
    return p.top = zt(v.top, p.top), p.right = ga(v.right, p.right), p.bottom = ga(v.bottom, p.bottom), p.left = zt(v.left, p.left), p;
  }, Jp(a, d, u));
  return {
    width: h.right - h.left,
    height: h.bottom - h.top,
    x: h.left,
    y: h.top
  };
}
function dO(t) {
  const { width: a, height: r } = j0(t);
  return {
    width: a,
    height: r
  };
}
function hO(t, a, r) {
  const o = gn(a), u = _n(a), f = r === "fixed", d = Fa(t, !0, f, a);
  let h = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const p = vn(0);
  function g() {
    p.x = cu(u);
  }
  if (o || !o && !f)
    if ((Wi(a) !== "body" || il(u)) && (h = uu(a)), o) {
      const b = Fa(a, !0, f, a);
      p.x = b.x + a.clientLeft, p.y = b.y + a.clientTop;
    } else u && g();
  f && !o && u && g();
  const v = u && !o && !f ? G0(u, h) : vn(0);
  return {
    x: d.left + h.scrollLeft - p.x - v.x,
    y: d.top + h.scrollTop - p.y - v.y,
    width: d.width,
    height: d.height
  };
}
function Ps(t) {
  return ln(t).position === "static";
}
function eg(t, a) {
  if (!gn(t) || ln(t).position === "fixed") return null;
  if (a) return a(t);
  let r = t.offsetParent;
  return _n(t) === r && (r = r.ownerDocument.body), r;
}
function X0(t, a) {
  const r = xt(t);
  if (ou(t)) return r;
  if (!gn(t)) {
    let u = ya(t);
    for (; u && !Yi(u); ) {
      if (rn(u) && !Ps(u)) return u;
      u = ya(u);
    }
    return r;
  }
  let o = eg(t, a);
  for (; o && FC(o) && Ps(o); ) o = eg(o, a);
  return o && Yi(o) && Ps(o) && !Xf(o) ? r : o || eO(t) || r;
}
var mO = async function(t) {
  const a = this.getOffsetParent || X0, r = this.getDimensions, o = await r(t.floating);
  return {
    reference: hO(t.reference, await a(t.floating), t.strategy),
    floating: {
      x: 0,
      y: 0,
      width: o.width,
      height: o.height
    }
  };
};
function vO(t) {
  return ln(t).direction === "rtl";
}
var pO = {
  convertOffsetParentRelativeRectToViewportRelativeRect: iO,
  getDocumentElement: _n,
  getClippingRect: fO,
  getOffsetParent: X0,
  getElementRects: mO,
  getClientRects: rO,
  getDimensions: dO,
  getScale: ki,
  isElement: rn,
  isRTL: vO
};
function k0(t, a) {
  return t.x === a.x && t.y === a.y && t.width === a.width && t.height === a.height;
}
function gO(t, a) {
  let r = null, o;
  const u = _n(t);
  function f() {
    var h;
    clearTimeout(o), (h = r) == null || h.disconnect(), r = null;
  }
  function d(h, p) {
    h === void 0 && (h = !1), p === void 0 && (p = 1), f();
    const g = t.getBoundingClientRect(), { left: v, top: b, width: E, height: S } = g;
    if (h || a(), !E || !S) return;
    const O = Uo(b), T = Uo(u.clientWidth - (v + E)), R = Uo(u.clientHeight - (b + S)), L = Uo(v), j = {
      rootMargin: -O + "px " + -T + "px " + -R + "px " + -L + "px",
      threshold: zt(0, ga(1, p)) || 1
    };
    let G = !0;
    function N(X) {
      const B = X[0].intersectionRatio;
      if (B !== p) {
        if (!G) return d();
        B ? d(!1, B) : o = setTimeout(() => {
          d(!1, 1e-7);
        }, 1e3);
      }
      B === 1 && !k0(g, t.getBoundingClientRect()) && d(), G = !1;
    }
    try {
      r = new IntersectionObserver(N, {
        ...j,
        root: u.ownerDocument
      });
    } catch {
      r = new IntersectionObserver(N, j);
    }
    r.observe(t);
  }
  return d(!0), f;
}
function yO(t, a, r, o) {
  o === void 0 && (o = {});
  const { ancestorScroll: u = !0, ancestorResize: f = !0, elementResize: d = typeof ResizeObserver == "function", layoutShift: h = typeof IntersectionObserver == "function", animationFrame: p = !1 } = o, g = Vf(t), v = u || f ? [...g ? Qr(g) : [], ...Qr(a)] : [];
  v.forEach((L) => {
    u && L.addEventListener("scroll", r, { passive: !0 }), f && L.addEventListener("resize", r);
  });
  const b = g && h ? gO(g, r) : null;
  let E = -1, S = null;
  d && (S = new ResizeObserver((L) => {
    let [j] = L;
    j && j.target === g && S && (S.unobserve(a), cancelAnimationFrame(E), E = requestAnimationFrame(() => {
      var G;
      (G = S) == null || G.observe(a);
    })), r();
  }), g && !p && S.observe(g), S.observe(a));
  let O, T = p ? Fa(t) : null;
  p && R();
  function R() {
    const L = Fa(t);
    T && !k0(T, L) && r(), T = L, O = requestAnimationFrame(R);
  }
  return r(), () => {
    var L;
    v.forEach((j) => {
      u && j.removeEventListener("scroll", r), f && j.removeEventListener("resize", r);
    }), b?.(), (L = S) == null || L.disconnect(), S = null, p && cancelAnimationFrame(O);
  };
}
var bO = kC, _O = VC, EO = GC, SO = qC, TO = PC, tg = ZC, AO = YC, wO = (t, a, r) => {
  const o = /* @__PURE__ */ new Map(), u = {
    platform: pO,
    ...r
  }, f = {
    ...u.platform,
    _c: o
  };
  return jC(t, a, {
    ...u,
    platform: f
  });
}, Vo = typeof document < "u" ? _.useLayoutEffect : function() {
};
function Ko(t, a) {
  if (t === a) return !0;
  if (typeof t != typeof a) return !1;
  if (typeof t == "function" && t.toString() === a.toString()) return !0;
  let r, o, u;
  if (t && a && typeof t == "object") {
    if (Array.isArray(t)) {
      if (r = t.length, r !== a.length) return !1;
      for (o = r; o-- !== 0; ) if (!Ko(t[o], a[o])) return !1;
      return !0;
    }
    if (u = Object.keys(t), r = u.length, r !== Object.keys(a).length) return !1;
    for (o = r; o-- !== 0; ) if (!{}.hasOwnProperty.call(a, u[o])) return !1;
    for (o = r; o-- !== 0; ) {
      const f = u[o];
      if (!(f === "_owner" && t.$$typeof) && !Ko(t[f], a[f]))
        return !1;
    }
    return !0;
  }
  return t !== t && a !== a;
}
function V0(t) {
  return typeof window > "u" ? 1 : (t.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function ng(t, a) {
  const r = V0(t);
  return Math.round(a * r) / r;
}
function Xs(t) {
  const a = _.useRef(t);
  return Vo(() => {
    a.current = t;
  }), a;
}
function CO(t) {
  t === void 0 && (t = {});
  const { placement: a = "bottom", strategy: r = "absolute", middleware: o = [], platform: u, elements: { reference: f, floating: d } = {}, transform: h = !0, whileElementsMounted: p, open: g } = t, [v, b] = _.useState({
    x: 0,
    y: 0,
    strategy: r,
    placement: a,
    middlewareData: {},
    isPositioned: !1
  }), [E, S] = _.useState(o);
  Ko(E, o) || S(o);
  const [O, T] = _.useState(null), [R, L] = _.useState(null), j = _.useCallback(($) => {
    $ !== B.current && (B.current = $, T($));
  }, []), G = _.useCallback(($) => {
    $ !== I.current && (I.current = $, L($));
  }, []), N = f || O, X = d || R, B = _.useRef(null), I = _.useRef(null), H = _.useRef(v), K = p != null, ne = Xs(p), J = Xs(u), ee = Xs(g), he = _.useCallback(() => {
    if (!B.current || !I.current) return;
    const $ = {
      placement: a,
      strategy: r,
      middleware: E
    };
    J.current && ($.platform = J.current), wO(B.current, I.current, $).then((ce) => {
      const ye = {
        ...ce,
        isPositioned: ee.current !== !1
      };
      de.current && !Ko(H.current, ye) && (H.current = ye, nl.flushSync(() => {
        b(ye);
      }));
    });
  }, [
    E,
    a,
    r,
    J,
    ee
  ]);
  Vo(() => {
    g === !1 && H.current.isPositioned && (H.current.isPositioned = !1, b(($) => ({
      ...$,
      isPositioned: !1
    })));
  }, [g]);
  const de = _.useRef(!1);
  Vo(() => (de.current = !0, () => {
    de.current = !1;
  }), []), Vo(() => {
    if (N && (B.current = N), X && (I.current = X), N && X) {
      if (ne.current) return ne.current(N, X, he);
      he();
    }
  }, [
    N,
    X,
    he,
    ne,
    K
  ]);
  const ge = _.useMemo(() => ({
    reference: B,
    floating: I,
    setReference: j,
    setFloating: G
  }), [j, G]), Q = _.useMemo(() => ({
    reference: N,
    floating: X
  }), [N, X]), k = _.useMemo(() => {
    const $ = {
      position: r,
      left: 0,
      top: 0
    };
    if (!Q.floating) return $;
    const ce = ng(Q.floating, v.x), ye = ng(Q.floating, v.y);
    return h ? {
      ...$,
      transform: "translate(" + ce + "px, " + ye + "px)",
      ...V0(Q.floating) >= 1.5 && { willChange: "transform" }
    } : {
      position: r,
      left: ce,
      top: ye
    };
  }, [
    r,
    h,
    Q.floating,
    v.x,
    v.y
  ]);
  return _.useMemo(() => ({
    ...v,
    update: he,
    refs: ge,
    elements: Q,
    floatingStyles: k
  }), [
    v,
    he,
    ge,
    Q,
    k
  ]);
}
var OO = (t) => {
  function a(r) {
    return {}.hasOwnProperty.call(r, "current");
  }
  return {
    name: "arrow",
    options: t,
    fn(r) {
      const { element: o, padding: u } = typeof t == "function" ? t(r) : t;
      return o && a(o) ? o.current != null ? tg({
        element: o.current,
        padding: u
      }).fn(r) : {} : o ? tg({
        element: o,
        padding: u
      }).fn(r) : {};
    }
  };
}, RO = (t, a) => ({
  ...bO(t),
  options: [t, a]
}), MO = (t, a) => ({
  ..._O(t),
  options: [t, a]
}), DO = (t, a) => ({
  ...AO(t),
  options: [t, a]
}), NO = (t, a) => ({
  ...EO(t),
  options: [t, a]
}), zO = (t, a) => ({
  ...SO(t),
  options: [t, a]
}), xO = (t, a) => ({
  ...TO(t),
  options: [t, a]
}), HO = (t, a) => ({
  ...OO(t),
  options: [t, a]
}), LO = "Arrow", Y0 = _.forwardRef((t, a) => {
  const { children: r, width: o = 10, height: u = 5, ...f } = t;
  return /* @__PURE__ */ (0, D.jsx)(on.svg, {
    ...f,
    ref: a,
    width: o,
    height: u,
    viewBox: "0 0 30 10",
    preserveAspectRatio: "none",
    children: t.asChild ? r : /* @__PURE__ */ (0, D.jsx)("polygon", { points: "0,0 30,0 15,10" })
  });
});
Y0.displayName = LO;
var UO = Y0, Yf = "Popper", [q0, su] = Uf(Yf), [BO, I0] = q0(Yf), $0 = (t) => {
  const { __scopePopper: a, children: r } = t, [o, u] = _.useState(null);
  return /* @__PURE__ */ (0, D.jsx)(BO, {
    scope: a,
    anchor: o,
    onAnchorChange: u,
    children: r
  });
};
$0.displayName = Yf;
var F0 = "PopperAnchor", Q0 = _.forwardRef((t, a) => {
  const { __scopePopper: r, virtualRef: o, ...u } = t, f = I0(F0, r), d = _.useRef(null), h = bn(a, d);
  return _.useEffect(() => {
    f.onAnchorChange(o?.current || d.current);
  }), o ? null : /* @__PURE__ */ (0, D.jsx)(on.div, {
    ...u,
    ref: h
  });
});
Q0.displayName = F0;
var qf = "PopperContent", [jO, ZO] = q0(qf), W0 = _.forwardRef((t, a) => {
  const { __scopePopper: r, side: o = "bottom", sideOffset: u = 0, align: f = "center", alignOffset: d = 0, arrowPadding: h = 0, avoidCollisions: p = !0, collisionBoundary: g = [], collisionPadding: v = 0, sticky: b = "partial", hideWhenDetached: E = !1, updatePositionStrategy: S = "optimized", onPlaced: O, ...T } = t, R = I0(qf, r), [L, j] = _.useState(null), G = bn(a, (fe) => j(fe)), [N, X] = _.useState(null), B = CC(N), I = B?.width ?? 0, H = B?.height ?? 0, K = o + (f !== "center" ? "-" + f : ""), ne = typeof v == "number" ? v : {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...v
  }, J = Array.isArray(g) ? g : [g], ee = J.length > 0, he = {
    padding: ne,
    boundary: J.filter(PO),
    altBoundary: ee
  }, { refs: de, floatingStyles: ge, placement: Q, isPositioned: k, middlewareData: $ } = CO({
    strategy: "fixed",
    placement: K,
    whileElementsMounted: (...fe) => yO(...fe, { animationFrame: S === "always" }),
    elements: { reference: R.anchor },
    middleware: [
      RO({
        mainAxis: u + H,
        alignmentAxis: d
      }),
      p && MO({
        mainAxis: !0,
        crossAxis: !1,
        limiter: b === "partial" ? DO() : void 0,
        ...he
      }),
      p && NO({ ...he }),
      zO({
        ...he,
        apply: ({ elements: fe, rects: we, availableWidth: tt, availableHeight: re }) => {
          const { width: St, height: Yn } = we.reference, Wt = fe.floating.style;
          Wt.setProperty("--radix-popper-available-width", `${tt}px`), Wt.setProperty("--radix-popper-available-height", `${re}px`), Wt.setProperty("--radix-popper-anchor-width", `${St}px`), Wt.setProperty("--radix-popper-anchor-height", `${Yn}px`);
        }
      }),
      N && HO({
        element: N,
        padding: h
      }),
      XO({
        arrowWidth: I,
        arrowHeight: H
      }),
      E && xO({
        strategy: "referenceHidden",
        ...he
      })
    ]
  }), [ce, ye] = ey(Q), et = pa(O);
  $a(() => {
    k && et?.();
  }, [k, et]);
  const C = $.arrow?.x, Y = $.arrow?.y, W = $.arrow?.centerOffset !== 0, [ae, ve] = _.useState();
  return $a(() => {
    L && ve(window.getComputedStyle(L).zIndex);
  }, [L]), /* @__PURE__ */ (0, D.jsx)("div", {
    ref: de.setFloating,
    "data-radix-popper-content-wrapper": "",
    style: {
      ...ge,
      transform: k ? ge.transform : "translate(0, -200%)",
      minWidth: "max-content",
      zIndex: ae,
      "--radix-popper-transform-origin": [$.transformOrigin?.x, $.transformOrigin?.y].join(" "),
      ...$.hide?.referenceHidden && {
        visibility: "hidden",
        pointerEvents: "none"
      }
    },
    dir: t.dir,
    children: /* @__PURE__ */ (0, D.jsx)(jO, {
      scope: r,
      placedSide: ce,
      onArrowChange: X,
      arrowX: C,
      arrowY: Y,
      shouldHideArrow: W,
      children: /* @__PURE__ */ (0, D.jsx)(on.div, {
        "data-side": ce,
        "data-align": ye,
        ...T,
        ref: G,
        style: {
          ...T.style,
          animation: k ? void 0 : "none"
        }
      })
    })
  });
});
W0.displayName = qf;
var K0 = "PopperArrow", GO = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right"
}, J0 = _.forwardRef(function(a, r) {
  const { __scopePopper: o, ...u } = a, f = ZO(K0, o), d = GO[f.placedSide];
  return /* @__PURE__ */ (0, D.jsx)("span", {
    ref: f.onArrowChange,
    style: {
      position: "absolute",
      left: f.arrowX,
      top: f.arrowY,
      [d]: 0,
      transformOrigin: {
        top: "",
        right: "0 0",
        bottom: "center 0",
        left: "100% 0"
      }[f.placedSide],
      transform: {
        top: "translateY(100%)",
        right: "translateY(50%) rotate(90deg) translateX(-50%)",
        bottom: "rotate(180deg)",
        left: "translateY(50%) rotate(-90deg) translateX(50%)"
      }[f.placedSide],
      visibility: f.shouldHideArrow ? "hidden" : void 0
    },
    children: /* @__PURE__ */ (0, D.jsx)(UO, {
      ...u,
      ref: r,
      style: {
        ...u.style,
        display: "block"
      }
    })
  });
});
J0.displayName = K0;
function PO(t) {
  return t !== null;
}
var XO = (t) => ({
  name: "transformOrigin",
  options: t,
  fn(a) {
    const { placement: r, rects: o, middlewareData: u } = a, f = u.arrow?.centerOffset !== 0, d = f ? 0 : t.arrowWidth, h = f ? 0 : t.arrowHeight, [p, g] = ey(r), v = {
      start: "0%",
      center: "50%",
      end: "100%"
    }[g], b = (u.arrow?.x ?? 0) + d / 2, E = (u.arrow?.y ?? 0) + h / 2;
    let S = "", O = "";
    return p === "bottom" ? (S = f ? v : `${b}px`, O = `${-h}px`) : p === "top" ? (S = f ? v : `${b}px`, O = `${o.floating.height + h}px`) : p === "right" ? (S = `${-h}px`, O = f ? v : `${E}px`) : p === "left" && (S = `${o.floating.width + h}px`, O = f ? v : `${E}px`), { data: {
      x: S,
      y: O
    } };
  }
});
function ey(t) {
  const [a, r = "center"] = t.split("-");
  return [a, r];
}
var ty = $0, If = Q0, ny = W0, ay = J0, $f = "Popover", [iy, tM] = Uf($f, [su]), rl = su(), [kO, Ea] = iy($f), ry = (t) => {
  const { __scopePopover: a, children: r, open: o, defaultOpen: u, onOpenChange: f, modal: d = !1 } = t, h = rl(a), p = _.useRef(null), [g, v] = _.useState(!1), [b = !1, E] = _0({
    prop: o,
    defaultProp: u,
    onChange: f
  });
  return /* @__PURE__ */ (0, D.jsx)(ty, {
    ...h,
    children: /* @__PURE__ */ (0, D.jsx)(kO, {
      scope: a,
      contentId: E0(),
      triggerRef: p,
      open: b,
      onOpenChange: E,
      onOpenToggle: _.useCallback(() => E((S) => !S), [E]),
      hasCustomAnchor: g,
      onCustomAnchorAdd: _.useCallback(() => v(!0), []),
      onCustomAnchorRemove: _.useCallback(() => v(!1), []),
      modal: d,
      children: r
    })
  });
};
ry.displayName = $f;
var ly = "PopoverAnchor", oy = _.forwardRef((t, a) => {
  const { __scopePopover: r, ...o } = t, u = Ea(ly, r), f = rl(r), { onCustomAnchorAdd: d, onCustomAnchorRemove: h } = u;
  return _.useEffect(() => (d(), () => h()), [d, h]), /* @__PURE__ */ (0, D.jsx)(If, {
    ...f,
    ...o,
    ref: a
  });
});
oy.displayName = ly;
var uy = "PopoverTrigger", cy = _.forwardRef((t, a) => {
  const { __scopePopover: r, ...o } = t, u = Ea(uy, r), f = rl(r), d = bn(a, u.triggerRef), h = /* @__PURE__ */ (0, D.jsx)(on.button, {
    type: "button",
    "aria-haspopup": "dialog",
    "aria-expanded": u.open,
    "aria-controls": u.contentId,
    "data-state": vy(u.open),
    ...o,
    ref: d,
    onClick: Et(t.onClick, u.onOpenToggle)
  });
  return u.hasCustomAnchor ? h : /* @__PURE__ */ (0, D.jsx)(If, {
    asChild: !0,
    ...f,
    children: h
  });
});
cy.displayName = uy;
var Ff = "PopoverPortal", [VO, YO] = iy(Ff, { forceMount: void 0 }), sy = (t) => {
  const { __scopePopover: a, forceMount: r, children: o, container: u } = t, f = Ea(Ff, a);
  return /* @__PURE__ */ (0, D.jsx)(VO, {
    scope: a,
    forceMount: r,
    children: /* @__PURE__ */ (0, D.jsx)(al, {
      present: r || f.open,
      children: /* @__PURE__ */ (0, D.jsx)(jf, {
        asChild: !0,
        container: u,
        children: o
      })
    })
  });
};
sy.displayName = Ff;
var qi = "PopoverContent", fy = _.forwardRef((t, a) => {
  const r = YO(qi, t.__scopePopover), { forceMount: o = r.forceMount, ...u } = t, f = Ea(qi, t.__scopePopover);
  return /* @__PURE__ */ (0, D.jsx)(al, {
    present: o || f.open,
    children: f.modal ? /* @__PURE__ */ (0, D.jsx)(qO, {
      ...u,
      ref: a
    }) : /* @__PURE__ */ (0, D.jsx)(IO, {
      ...u,
      ref: a
    })
  });
});
fy.displayName = qi;
var qO = _.forwardRef((t, a) => {
  const r = Ea(qi, t.__scopePopover), o = _.useRef(null), u = bn(a, o), f = _.useRef(!1);
  return _.useEffect(() => {
    const d = o.current;
    if (d) return wC(d);
  }, []), /* @__PURE__ */ (0, D.jsx)(z0, {
    as: Lf,
    allowPinchZoom: !0,
    children: /* @__PURE__ */ (0, D.jsx)(dy, {
      ...t,
      ref: u,
      trapFocus: r.open,
      disableOutsidePointerEvents: !0,
      onCloseAutoFocus: Et(t.onCloseAutoFocus, (d) => {
        d.preventDefault(), f.current || r.triggerRef.current?.focus();
      }),
      onPointerDownOutside: Et(t.onPointerDownOutside, (d) => {
        const h = d.detail.originalEvent, p = h.button === 0 && h.ctrlKey === !0;
        f.current = h.button === 2 || p;
      }, { checkForDefaultPrevented: !1 }),
      onFocusOutside: Et(t.onFocusOutside, (d) => d.preventDefault(), { checkForDefaultPrevented: !1 })
    })
  });
}), IO = _.forwardRef((t, a) => {
  const r = Ea(qi, t.__scopePopover), o = _.useRef(!1), u = _.useRef(!1);
  return /* @__PURE__ */ (0, D.jsx)(dy, {
    ...t,
    ref: a,
    trapFocus: !1,
    disableOutsidePointerEvents: !1,
    onCloseAutoFocus: (f) => {
      t.onCloseAutoFocus?.(f), f.defaultPrevented || (o.current || r.triggerRef.current?.focus(), f.preventDefault()), o.current = !1, u.current = !1;
    },
    onInteractOutside: (f) => {
      t.onInteractOutside?.(f), f.defaultPrevented || (o.current = !0, f.detail.originalEvent.type === "pointerdown" && (u.current = !0));
      const d = f.target;
      r.triggerRef.current?.contains(d) && f.preventDefault(), f.detail.originalEvent.type === "focusin" && u.current && f.preventDefault();
    }
  });
}), dy = _.forwardRef((t, a) => {
  const { __scopePopover: r, trapFocus: o, onOpenAutoFocus: u, onCloseAutoFocus: f, disableOutsidePointerEvents: d, onEscapeKeyDown: h, onPointerDownOutside: p, onFocusOutside: g, onInteractOutside: v, ...b } = t, E = Ea(qi, r), S = rl(r);
  return Gw(), /* @__PURE__ */ (0, D.jsx)(A0, {
    asChild: !0,
    loop: !0,
    trapped: o,
    onMountAutoFocus: u,
    onUnmountAutoFocus: f,
    children: /* @__PURE__ */ (0, D.jsx)(Bf, {
      asChild: !0,
      disableOutsidePointerEvents: d,
      onInteractOutside: v,
      onEscapeKeyDown: h,
      onPointerDownOutside: p,
      onFocusOutside: g,
      onDismiss: () => E.onOpenChange(!1),
      children: /* @__PURE__ */ (0, D.jsx)(ny, {
        "data-state": vy(E.open),
        role: "dialog",
        id: E.contentId,
        ...S,
        ...b,
        ref: a,
        style: {
          ...b.style,
          "--radix-popover-content-transform-origin": "var(--radix-popper-transform-origin)",
          "--radix-popover-content-available-width": "var(--radix-popper-available-width)",
          "--radix-popover-content-available-height": "var(--radix-popper-available-height)",
          "--radix-popover-trigger-width": "var(--radix-popper-anchor-width)",
          "--radix-popover-trigger-height": "var(--radix-popper-anchor-height)"
        }
      })
    })
  });
}), hy = "PopoverClose", my = _.forwardRef((t, a) => {
  const { __scopePopover: r, ...o } = t, u = Ea(hy, r);
  return /* @__PURE__ */ (0, D.jsx)(on.button, {
    type: "button",
    ...o,
    ref: a,
    onClick: Et(t.onClick, () => u.onOpenChange(!1))
  });
});
my.displayName = hy;
var $O = "PopoverArrow", FO = _.forwardRef((t, a) => {
  const { __scopePopover: r, ...o } = t, u = rl(r);
  return /* @__PURE__ */ (0, D.jsx)(ay, {
    ...u,
    ...o,
    ref: a
  });
});
FO.displayName = $O;
function vy(t) {
  return t ? "open" : "closed";
}
var QO = ry, WO = oy, KO = cy, JO = sy, e3 = fy, t3 = my, [fu, nM] = Uf("Tooltip", [su]), du = su(), py = "TooltipProvider", n3 = 700, yf = "tooltip.open", [a3, Qf] = fu(py), gy = (t) => {
  const { __scopeTooltip: a, delayDuration: r = n3, skipDelayDuration: o = 300, disableHoverableContent: u = !1, children: f } = t, [d, h] = _.useState(!0), p = _.useRef(!1), g = _.useRef(0);
  return _.useEffect(() => {
    const v = g.current;
    return () => window.clearTimeout(v);
  }, []), /* @__PURE__ */ (0, D.jsx)(a3, {
    scope: a,
    isOpenDelayed: d,
    delayDuration: r,
    onOpen: _.useCallback(() => {
      window.clearTimeout(g.current), h(!1);
    }, []),
    onClose: _.useCallback(() => {
      window.clearTimeout(g.current), g.current = window.setTimeout(() => h(!0), o);
    }, [o]),
    isPointerInTransitRef: p,
    onPointerInTransitChange: _.useCallback((v) => {
      p.current = v;
    }, []),
    disableHoverableContent: u,
    children: f
  });
};
gy.displayName = py;
var hu = "Tooltip", [i3, ll] = fu(hu), yy = (t) => {
  const { __scopeTooltip: a, children: r, open: o, defaultOpen: u = !1, onOpenChange: f, disableHoverableContent: d, delayDuration: h } = t, p = Qf(hu, t.__scopeTooltip), g = du(a), [v, b] = _.useState(null), E = E0(), S = _.useRef(0), O = d ?? p.disableHoverableContent, T = h ?? p.delayDuration, R = _.useRef(!1), [L = !1, j] = _0({
    prop: o,
    defaultProp: u,
    onChange: (I) => {
      I ? (p.onOpen(), document.dispatchEvent(new CustomEvent(yf))) : p.onClose(), f?.(I);
    }
  }), G = _.useMemo(() => L ? R.current ? "delayed-open" : "instant-open" : "closed", [L]), N = _.useCallback(() => {
    window.clearTimeout(S.current), S.current = 0, R.current = !1, j(!0);
  }, [j]), X = _.useCallback(() => {
    window.clearTimeout(S.current), S.current = 0, j(!1);
  }, [j]), B = _.useCallback(() => {
    window.clearTimeout(S.current), S.current = window.setTimeout(() => {
      R.current = !0, j(!0), S.current = 0;
    }, T);
  }, [T, j]);
  return _.useEffect(() => () => {
    S.current && (window.clearTimeout(S.current), S.current = 0);
  }, []), /* @__PURE__ */ (0, D.jsx)(ty, {
    ...g,
    children: /* @__PURE__ */ (0, D.jsx)(i3, {
      scope: a,
      contentId: E,
      open: L,
      stateAttribute: G,
      trigger: v,
      onTriggerChange: b,
      onTriggerEnter: _.useCallback(() => {
        p.isOpenDelayed ? B() : N();
      }, [
        p.isOpenDelayed,
        B,
        N
      ]),
      onTriggerLeave: _.useCallback(() => {
        O ? X() : (window.clearTimeout(S.current), S.current = 0);
      }, [X, O]),
      onOpen: N,
      onClose: X,
      disableHoverableContent: O,
      children: r
    })
  });
};
yy.displayName = hu;
var bf = "TooltipTrigger", by = _.forwardRef((t, a) => {
  const { __scopeTooltip: r, ...o } = t, u = ll(bf, r), f = Qf(bf, r), d = du(r), h = bn(a, _.useRef(null), u.onTriggerChange), p = _.useRef(!1), g = _.useRef(!1), v = _.useCallback(() => p.current = !1, []);
  return _.useEffect(() => () => document.removeEventListener("pointerup", v), [v]), /* @__PURE__ */ (0, D.jsx)(If, {
    asChild: !0,
    ...d,
    children: /* @__PURE__ */ (0, D.jsx)(on.button, {
      "aria-describedby": u.open ? u.contentId : void 0,
      "data-state": u.stateAttribute,
      ...o,
      ref: h,
      onPointerMove: Et(t.onPointerMove, (b) => {
        b.pointerType !== "touch" && !g.current && !f.isPointerInTransitRef.current && (u.onTriggerEnter(), g.current = !0);
      }),
      onPointerLeave: Et(t.onPointerLeave, () => {
        u.onTriggerLeave(), g.current = !1;
      }),
      onPointerDown: Et(t.onPointerDown, () => {
        p.current = !0, document.addEventListener("pointerup", v, { once: !0 });
      }),
      onFocus: Et(t.onFocus, () => {
        p.current || u.onOpen();
      }),
      onBlur: Et(t.onBlur, u.onClose),
      onClick: Et(t.onClick, u.onClose)
    })
  });
});
by.displayName = bf;
var Wf = "TooltipPortal", [r3, l3] = fu(Wf, { forceMount: void 0 }), _y = (t) => {
  const { __scopeTooltip: a, forceMount: r, children: o, container: u } = t, f = ll(Wf, a);
  return /* @__PURE__ */ (0, D.jsx)(r3, {
    scope: a,
    forceMount: r,
    children: /* @__PURE__ */ (0, D.jsx)(al, {
      present: r || f.open,
      children: /* @__PURE__ */ (0, D.jsx)(jf, {
        asChild: !0,
        container: u,
        children: o
      })
    })
  });
};
_y.displayName = Wf;
var Ii = "TooltipContent", Ey = _.forwardRef((t, a) => {
  const r = l3(Ii, t.__scopeTooltip), { forceMount: o = r.forceMount, side: u = "top", ...f } = t, d = ll(Ii, t.__scopeTooltip);
  return /* @__PURE__ */ (0, D.jsx)(al, {
    present: o || d.open,
    children: d.disableHoverableContent ? /* @__PURE__ */ (0, D.jsx)(Sy, {
      side: u,
      ...f,
      ref: a
    }) : /* @__PURE__ */ (0, D.jsx)(o3, {
      side: u,
      ...f,
      ref: a
    })
  });
}), o3 = _.forwardRef((t, a) => {
  const r = ll(Ii, t.__scopeTooltip), o = Qf(Ii, t.__scopeTooltip), u = _.useRef(null), f = bn(a, u), [d, h] = _.useState(null), { trigger: p, onClose: g } = r, v = u.current, { onPointerInTransitChange: b } = o, E = _.useCallback(() => {
    h(null), b(!1);
  }, [b]), S = _.useCallback((O, T) => {
    const R = O.currentTarget, L = {
      x: O.clientX,
      y: O.clientY
    }, j = d3(L, f3(L, R.getBoundingClientRect())), G = h3(T.getBoundingClientRect());
    h(v3([...j, ...G])), b(!0);
  }, [b]);
  return _.useEffect(() => () => E(), [E]), _.useEffect(() => {
    if (p && v) {
      const O = (R) => S(R, v), T = (R) => S(R, p);
      return p.addEventListener("pointerleave", O), v.addEventListener("pointerleave", T), () => {
        p.removeEventListener("pointerleave", O), v.removeEventListener("pointerleave", T);
      };
    }
  }, [
    p,
    v,
    S,
    E
  ]), _.useEffect(() => {
    if (d) {
      const O = (T) => {
        const R = T.target, L = {
          x: T.clientX,
          y: T.clientY
        }, j = p?.contains(R) || v?.contains(R), G = !m3(L, d);
        j ? E() : G && (E(), g());
      };
      return document.addEventListener("pointermove", O), () => document.removeEventListener("pointermove", O);
    }
  }, [
    p,
    v,
    d,
    g,
    E
  ]), /* @__PURE__ */ (0, D.jsx)(Sy, {
    ...t,
    ref: f
  });
}), [u3, c3] = fu(hu, { isInside: !1 }), Sy = _.forwardRef((t, a) => {
  const { __scopeTooltip: r, children: o, "aria-label": u, onEscapeKeyDown: f, onPointerDownOutside: d, ...h } = t, p = ll(Ii, r), g = du(r), { onClose: v } = p;
  return _.useEffect(() => (document.addEventListener(yf, v), () => document.removeEventListener(yf, v)), [v]), _.useEffect(() => {
    if (p.trigger) {
      const b = (E) => {
        E.target?.contains(p.trigger) && v();
      };
      return window.addEventListener("scroll", b, { capture: !0 }), () => window.removeEventListener("scroll", b, { capture: !0 });
    }
  }, [p.trigger, v]), /* @__PURE__ */ (0, D.jsx)(Bf, {
    asChild: !0,
    disableOutsidePointerEvents: !1,
    onEscapeKeyDown: f,
    onPointerDownOutside: d,
    onFocusOutside: (b) => b.preventDefault(),
    onDismiss: v,
    children: /* @__PURE__ */ (0, D.jsxs)(ny, {
      "data-state": p.stateAttribute,
      ...g,
      ...h,
      ref: a,
      style: {
        ...h.style,
        "--radix-tooltip-content-transform-origin": "var(--radix-popper-transform-origin)",
        "--radix-tooltip-content-available-width": "var(--radix-popper-available-width)",
        "--radix-tooltip-content-available-height": "var(--radix-popper-available-height)",
        "--radix-tooltip-trigger-width": "var(--radix-popper-anchor-width)",
        "--radix-tooltip-trigger-height": "var(--radix-popper-anchor-height)"
      },
      children: [/* @__PURE__ */ (0, D.jsx)(y0, { children: o }), /* @__PURE__ */ (0, D.jsx)(u3, {
        scope: r,
        isInside: !0,
        children: /* @__PURE__ */ (0, D.jsx)(pw, {
          id: p.contentId,
          role: "tooltip",
          children: u || o
        })
      })]
    })
  });
});
Ey.displayName = Ii;
var Ty = "TooltipArrow", s3 = _.forwardRef((t, a) => {
  const { __scopeTooltip: r, ...o } = t, u = du(r);
  return c3(Ty, r).isInside ? null : /* @__PURE__ */ (0, D.jsx)(ay, {
    ...u,
    ...o,
    ref: a
  });
});
s3.displayName = Ty;
function f3(t, a) {
  const r = Math.abs(a.top - t.y), o = Math.abs(a.bottom - t.y), u = Math.abs(a.right - t.x), f = Math.abs(a.left - t.x);
  switch (Math.min(r, o, u, f)) {
    case f:
      return "left";
    case u:
      return "right";
    case r:
      return "top";
    case o:
      return "bottom";
    default:
      throw new Error("unreachable");
  }
}
function d3(t, a, r = 5) {
  const o = [];
  switch (a) {
    case "top":
      o.push({
        x: t.x - r,
        y: t.y + r
      }, {
        x: t.x + r,
        y: t.y + r
      });
      break;
    case "bottom":
      o.push({
        x: t.x - r,
        y: t.y - r
      }, {
        x: t.x + r,
        y: t.y - r
      });
      break;
    case "left":
      o.push({
        x: t.x + r,
        y: t.y - r
      }, {
        x: t.x + r,
        y: t.y + r
      });
      break;
    case "right":
      o.push({
        x: t.x - r,
        y: t.y - r
      }, {
        x: t.x - r,
        y: t.y + r
      });
      break;
  }
  return o;
}
function h3(t) {
  const { top: a, right: r, bottom: o, left: u } = t;
  return [
    {
      x: u,
      y: a
    },
    {
      x: r,
      y: a
    },
    {
      x: r,
      y: o
    },
    {
      x: u,
      y: o
    }
  ];
}
function m3(t, a) {
  const { x: r, y: o } = t;
  let u = !1;
  for (let f = 0, d = a.length - 1; f < a.length; d = f++) {
    const h = a[f].x, p = a[f].y, g = a[d].x, v = a[d].y;
    p > o != v > o && r < (g - h) * (o - p) / (v - p) + h && (u = !u);
  }
  return u;
}
function v3(t) {
  const a = t.slice();
  return a.sort((r, o) => r.x < o.x ? -1 : r.x > o.x ? 1 : r.y < o.y ? -1 : r.y > o.y ? 1 : 0), p3(a);
}
function p3(t) {
  if (t.length <= 1) return t.slice();
  const a = [];
  for (let o = 0; o < t.length; o++) {
    const u = t[o];
    for (; a.length >= 2; ) {
      const f = a[a.length - 1], d = a[a.length - 2];
      if ((f.x - d.x) * (u.y - d.y) >= (f.y - d.y) * (u.x - d.x)) a.pop();
      else break;
    }
    a.push(u);
  }
  a.pop();
  const r = [];
  for (let o = t.length - 1; o >= 0; o--) {
    const u = t[o];
    for (; r.length >= 2; ) {
      const f = r[r.length - 1], d = r[r.length - 2];
      if ((f.x - d.x) * (u.y - d.y) >= (f.y - d.y) * (u.x - d.x)) r.pop();
      else break;
    }
    r.push(u);
  }
  return r.pop(), a.length === 1 && r.length === 1 && a[0].x === r[0].x && a[0].y === r[0].y ? a : a.concat(r);
}
var g3 = gy, y3 = yy, b3 = by, _3 = _y, E3 = Ey;
function S3(t) {
  const a = (0, _.useRef)(t);
  return a.current = t, a;
}
var $i = [], Bo = !1, ag = (t) => {
  if (t.key === "Escape") {
    const [a] = $i;
    a && (t.preventDefault(), a.callback.current?.());
  }
}, Ay = () => {
  $i.length > 0 && !Bo ? (document.body.addEventListener("keydown", ag), Bo = !0) : $i.length === 0 && Bo && (document.body.removeEventListener("keydown", ag), Bo = !1);
}, T3 = (t) => {
  $i.unshift(t), Ay();
}, A3 = ({ id: t }) => {
  $i = $i.filter((a) => a.id !== t), Ay();
}, w3 = (t, a) => {
  const r = (0, _.useId)(), o = S3(a);
  (0, _.useEffect)(() => {
    if (!t) return;
    const u = {
      id: r,
      callback: o
    };
    return T3(u), () => A3(u);
  }, [
    r,
    t,
    o
  ]);
}, C3 = (t) => {
  t.preventDefault();
}, wy = (0, _.createContext)(void 0);
function O3({ children: t, container: a }) {
  return /* @__PURE__ */ (0, D.jsx)(wy.Provider, {
    value: a,
    children: t
  });
}
function Cy() {
  return (0, _.useContext)(wy);
}
var R3 = "_Tooltip_1iulb_1", M3 = {
  Tooltip: R3,
  "scale-in": "_scale-in_1iulb_1",
  "scale-out": "_scale-out_1iulb_1"
}, D3 = 150, N3 = 300, z3 = 5, x3 = 15;
function jo({ children: t, content: a, forceOpen: r = a === null ? !1 : void 0, onDismiss: o, maxWidth: u = N3, interactive: f = !1, align: d, alignOffset: h = 0, side: p, sideOffset: g = z3, contentClassName: v, onContentPointerEnter: b, onContentPointerLeave: E }) {
  const [S, O] = (0, _.useState)(!1), T = r ?? S, R = Cy(), L = (j) => {
    typeof r != "boolean" && O(j);
  };
  return w3(T, () => {
    L(!1), o?.();
  }), /* @__PURE__ */ (0, D.jsx)(g3, { children: /* @__PURE__ */ (0, D.jsxs)(y3, {
    open: T,
    delayDuration: D3,
    onOpenChange: L,
    disableHoverableContent: !f,
    children: [/* @__PURE__ */ (0, D.jsx)(b3, {
      asChild: !0,
      children: t
    }), /* @__PURE__ */ (0, D.jsx)(_3, {
      container: R,
      children: /* @__PURE__ */ (0, D.jsx)(E3, {
        className: an(M3.Tooltip, v),
        align: d,
        alignOffset: h,
        side: p,
        sideOffset: g,
        collisionPadding: x3,
        hideWhenDetached: !0,
        style: { maxWidth: u },
        onPointerEnter: b,
        onPointerLeave: E,
        onEscapeKeyDown: C3,
        children: a
      })
    })]
  }) });
}
function Jo(t) {
  if (typeof window.requestAnimationFrame != "function" || document.visibilityState === "hidden") {
    const o = window.setTimeout(t);
    return () => window.clearTimeout(o);
  }
  let a = 2, r = window.requestAnimationFrame(function o() {
    a -= 1, a === 0 ? t() : r = window.requestAnimationFrame(o);
  });
  return () => window.cancelAnimationFrame(r);
}
function H3(t) {
  const a = {};
  for (const [r, o] of Object.entries(t))
    o !== void 0 && (a[r.startsWith("--") ? r : `--${r}`] = typeof o == "number" ? `${o}px` : o);
  return a;
}
var ks = (t) => String(t), fn = (t) => `${t}ms`;
function Vs(t) {
  return typeof t == "number" ? `${t}deg` : t;
}
function Ys({ x: t, y: a, scale: r, rotate: o, skewX: u, skewY: f } = {}) {
  const d = [
    t == null ? null : `translateX(${t}px)`,
    a == null ? null : `translateY(${a}px)`,
    r == null ? null : `scale(${r})`,
    o == null ? null : `rotate(${Vs(o)})`,
    u == null ? null : `skewX(${Vs(u)})`,
    f == null ? null : `skewY(${Vs(f)})`
  ].filter(Boolean);
  return d.length ? d.join(" ") : "none";
}
function qs({ blur: t } = {}) {
  return t == null ? "none" : `blur(${t}px)`;
}
function Zo(t) {
  const a = [];
  return _.Children.forEach(t, (r) => {
    r && typeof r == "object" && "key" in r && r.key && a.push(r);
  }), a;
}
var ji = () => {
};
function Zi(t) {
  const a = (0, _.useRef)(t);
  return a.current = t, (0, _.useCallback)((r) => a.current(r), []);
}
function L3(t, a, r, o) {
  const u = new Set(t.map((p) => p.key)), f = new Set(a.map((p) => p.component.key)), d = t.filter((p) => !f.has(p.key)).map(r), h = a.map((p) => ({
    ...p,
    component: t.find(({ key: g }) => g === p.component.key) ?? p.component,
    shouldRender: u.has(p.component.key)
  }));
  return o === "append" ? h.concat(d) : d.concat(h);
}
var U3 = "_TransitionGroupChild_1d6a5_1", B3 = { TransitionGroupChild: U3 }, Oy = {
  enter: !1,
  enterActive: !1,
  exit: !1,
  exitActive: !1,
  interrupted: !1
}, j3 = (t) => ({
  ...Oy,
  enter: !t
});
function Z3(t, a) {
  switch (a.type) {
    case "enter-before":
      return {
        enter: !0,
        enterActive: !1,
        exit: !1,
        exitActive: !1,
        interrupted: t.interrupted || t.exit
      };
    case "enter-active":
      return {
        enter: !0,
        enterActive: !0,
        exit: !1,
        exitActive: !1,
        interrupted: !1
      };
    case "exit-before":
      return {
        enter: !1,
        enterActive: !1,
        exit: !0,
        exitActive: !1,
        interrupted: t.interrupted || t.enter
      };
    case "exit-active":
      return {
        enter: !1,
        enterActive: !1,
        exit: !0,
        exitActive: !0,
        interrupted: !1
      };
    case "done":
      return Oy;
  }
}
function G3({ as: t, children: a, className: r, style: o, preventMountTransition: u, shouldRender: f, enterDuration: d, exitDuration: h, removeChild: p, onEnter: g, onEnterActive: v, onEnterComplete: b, onExit: E, onExitActive: S, onExitComplete: O }) {
  const [T, R] = (0, _.useReducer)(Z3, j3(u)), L = (0, _.useRef)(!1), j = (0, _.useRef)(null), G = (0, _.useRef)(d), N = (0, _.useRef)(h), X = (0, _.useRef)(null);
  G.current = d, N.current = h;
  const B = (0, _.useCallback)((I) => {
    const H = j.current;
    !H || I === X.current || (X.current = I, {
      enter: g,
      "enter-active": v,
      "enter-complete": b,
      exit: E,
      "exit-active": S,
      "exit-complete": O
    }[I](H));
  }, [
    g,
    v,
    b,
    E,
    S,
    O
  ]);
  return (0, _.useLayoutEffect)(() => {
    if (!f) {
      let K;
      R({ type: "exit-before" }), B("exit");
      const ne = Jo(() => {
        R({ type: "exit-active" }), B("exit-active"), K = window.setTimeout(() => {
          B("exit-complete"), p();
        }, N.current);
      });
      return () => {
        ne(), K !== void 0 && window.clearTimeout(K);
      };
    }
    if (u && !L.current) {
      L.current = !0;
      return;
    }
    let I;
    R({ type: "enter-before" }), B("enter");
    const H = Jo(() => {
      R({ type: "enter-active" }), B("enter-active"), I = window.setTimeout(() => {
        R({ type: "done" }), B("enter-complete");
      }, G.current);
    });
    return () => {
      H(), I !== void 0 && window.clearTimeout(I);
    };
  }, [
    u,
    p,
    f,
    B
  ]), (0, _.useEffect)(() => () => {
    L.current = !1;
  }, []), /* @__PURE__ */ (0, D.jsx)(t, {
    ref: j,
    className: an(r, B3.TransitionGroupChild),
    style: o,
    "data-entering": T.enter ? "" : void 0,
    "data-entering-active": T.enterActive ? "" : void 0,
    "data-exiting": T.exit ? "" : void 0,
    "data-exiting-active": T.exitActive ? "" : void 0,
    "data-interrupted": T.interrupted ? "" : void 0,
    children: a
  });
}
function P3(t) {
  const a = t.preventMountTransition ? void 0 : t.enterMountDelay, [r, o] = (0, _.useState)(a === void 0);
  return (0, _.useEffect)(() => {
    if (r) return;
    const u = window.setTimeout(() => o(!0), a);
    return () => window.clearTimeout(u);
  }, [a, r]), r ? /* @__PURE__ */ (0, D.jsx)(G3, { ...t }) : null;
}
function _f(t) {
  const { as: a = "span", children: r, className: o, style: u, enterDuration: f = 0, exitDuration: d = 0, enterMountDelay: h, preventInitialTransition: p = !0, insertMethod: g = "append", disableAnimations: v } = t, b = Zi(t.onEnter ?? ji), E = Zi(t.onEnterActive ?? ji), S = Zi(t.onEnterComplete ?? ji), O = Zi(t.onExit ?? ji), T = Zi(t.onExitActive ?? ji), R = Zi(t.onExitComplete ?? ji);
  _.Children.forEach(r, (X) => {
    if (X && typeof X == "object" && !("key" in X && X.key)) throw new Error("Child elements of <TransitionGroup /> must include a key");
  });
  const L = (0, _.useCallback)((X) => ({
    component: X,
    shouldRender: !0,
    preventMountTransition: !1,
    removeChild: () => {
      G((B) => B.filter(({ component: I }) => I.key !== X.key));
    },
    onEnter: b,
    onEnterActive: E,
    onEnterComplete: S,
    onExit: O,
    onExitActive: T,
    onExitComplete: R
  }), [
    b,
    E,
    S,
    O,
    T,
    R
  ]), [j, G] = (0, _.useState)(() => Zo(r).map((X) => ({
    ...L(X),
    preventMountTransition: p
  })));
  if ((0, _.useLayoutEffect)(() => {
    G((X) => L3(Zo(r), X, L, g));
  }, [
    r,
    L,
    g
  ]), v) return Zo(r).map((X) => /* @__PURE__ */ (0, D.jsx)(a, {
    className: o,
    style: u,
    children: X
  }, X.key));
  const N = new Map(Zo(r).map((X) => [X.key, X]));
  return j.map(({ component: X, ...B }) => {
    const I = N.get(X.key) ?? X;
    return /* @__PURE__ */ (0, D.jsx)(P3, {
      ...B,
      as: a,
      className: o,
      enterDuration: f,
      exitDuration: d,
      enterMountDelay: h,
      style: u,
      children: I
    }, I.key);
  });
}
var X3 = "_Layout_imkf6_1", k3 = "_TransitionItem_imkf6_34", ig = {
  Layout: X3,
  TransitionItem: k3
};
function V3(t) {
  const { as: a = "span", children: r, transitionClassName: o, insertMethod: u, className: f, hideOverflow: d = !1, preventInitialTransition: h = !0, disableAnimations: p, itemAnchor: g = "start", dimension: v = "height" } = t, b = (0, _.useRef)(null), E = (0, _.useRef)(null), S = (0, _.useRef)(null), { enterTotalDuration: O, exitTotalDuration: T, variables: R } = $3(t), L = (I) => {
    const H = b.current;
    if (!H) return;
    const K = S.current !== null && Date.now() - S.current < 50, ne = E.current !== null;
    E.current = I, H.dataset.direction = K || ne ? "move" : "in", K || (H.dataset.interrupted = String(!!H.style[v])), H.style[v] = `${H.getBoundingClientRect()[v]}px`;
  }, j = (I) => {
    const H = b.current;
    if (!H || E.current !== I) return;
    const K = v === "width" ? I.clientWidth : I.clientHeight;
    H.style[v] = `${K}px`;
  }, G = (I) => {
    const H = b.current;
    Jo(() => {
      H && E.current === I && (H.style[v] = "");
    });
  }, N = (I) => {
    const H = b.current, K = !E.current || E.current === I;
    !H || !K || (E.current = null, S.current = Date.now(), H.dataset.direction = "out", H.dataset.interrupted = String(!!H.style[v]), H.style[v] = `${H.getBoundingClientRect()[v]}px`);
  }, X = () => {
    const I = b.current;
    I && !E.current && (I.style[v] = "0");
  }, B = () => {
    Jo(() => {
      const I = b.current;
      I && !E.current && (I.style[v] = "");
    });
  };
  return /* @__PURE__ */ (0, D.jsx)(a, {
    ref: b,
    className: an(ig.Layout, f),
    style: R,
    "data-item-anchor": g,
    "data-clip": d,
    "data-dimension": v,
    children: /* @__PURE__ */ (0, D.jsx)(_f, {
      as: a,
      className: an(ig.TransitionItem, o),
      insertMethod: u,
      enterDuration: O,
      exitDuration: T,
      preventInitialTransition: h,
      disableAnimations: p,
      onEnter: L,
      onEnterActive: j,
      onEnterComplete: G,
      onExit: N,
      onExitActive: X,
      onExitComplete: B,
      children: r
    })
  });
}
var Is = 300, Y3 = 300, q3 = 100, I3 = 200;
function $3({ initial: t, enter: a, exit: r, forceCompositeLayer: o, layoutEnter: u, layoutExit: f, layoutMove: d }) {
  const h = Ys(t), p = Ys(a), g = Ys(r), v = [
    h,
    p,
    g
  ].some((B) => B !== "none"), b = a?.duration ?? Y3, E = r?.duration ?? I3, S = a?.delay ?? q3, O = r?.delay ?? 0, T = u?.duration ?? Is, R = f?.duration ?? Is, L = d?.duration ?? Is, j = u?.delay ?? 0, G = f?.delay ?? 0, N = d?.delay ?? 0, X = H3({
    "tg-will-change": o ? "transform, opacity" : "auto",
    "tg-enter-opacity": ks(a?.opacity ?? 1),
    "tg-enter-transform": p,
    "tg-enter-filter": qs(a),
    "tg-enter-duration": fn(b),
    "tg-enter-delay": fn(S),
    "tg-enter-timing-function": a?.timingFunction ?? (v ? "var(--cubic-enter)" : "ease"),
    "tg-exit-opacity": ks(r?.opacity ?? 0),
    "tg-exit-transform": g,
    "tg-exit-filter": qs(r),
    "tg-exit-duration": fn(E),
    "tg-exit-delay": fn(O),
    "tg-exit-timing-function": r?.timingFunction ?? (v ? "var(--cubic-exit)" : "ease"),
    "tg-initial-opacity": ks(t?.opacity ?? r?.opacity ?? 0),
    "tg-initial-transform": h === "none" ? g : h,
    "tg-initial-filter": qs(t ?? r),
    "tg-layout-enter-duration": fn(T),
    "tg-layout-enter-delay": fn(j),
    "tg-layout-enter-timing-function": u?.timingFunction ?? "var(--cubic-move)",
    "tg-layout-exit-duration": fn(R),
    "tg-layout-exit-delay": fn(G),
    "tg-layout-exit-timing-function": f?.timingFunction ?? "var(--cubic-move)",
    "tg-layout-move-duration": fn(L),
    "tg-layout-move-delay": fn(N),
    "tg-layout-move-timing-function": d?.timingFunction ?? "var(--cubic-move)"
  });
  return {
    enterTotalDuration: Math.max(S + b, j + T, N + L),
    exitTotalDuration: Math.max(O + E, G + R, N + L),
    variables: X
  };
}
var F3 = "_Theme_1s223_2", Q3 = "_Portal_1s223_18", W3 = "_Tooltip_1s223_24", K3 = "_HideHint_1s223_33", J3 = "_HideHintContent_1s223_43", e4 = "_HideHintText_1s223_49", t4 = "_Shortcut_1s223_54", tn = {
  Theme: F3,
  Portal: Q3,
  Tooltip: W3,
  HideHint: K3,
  HideHintContent: J3,
  HideHintText: e4,
  Shortcut: t4
}, n4 = "_Widget_13oam_1", a4 = "_LandingShadow_13oam_46", i4 = "_WidgetEntrance_13oam_56", r4 = "_WidgetExit_13oam_69", l4 = "_Shell_13oam_82", o4 = "_ShellControls_13oam_114", u4 = "_Launcher_13oam_124", c4 = "_LauncherRow_13oam_147", s4 = "_LauncherLabel_13oam_151", f4 = "_CornerTarget_13oam_161", d4 = "_Panel_13oam_191", h4 = "_LogoButton_13oam_191", m4 = "_ShellContent_13oam_231", v4 = "_ShellLayout_13oam_235", p4 = "_LauncherLogo_13oam_308", g4 = "_blossomEntrance_13oam_1", y4 = "_Composer_13oam_340", b4 = "_Textarea_13oam_352", _4 = "_ComposerFooter_13oam_390", E4 = "_SendButton_13oam_395", S4 = "_LauncherDismissButton_13oam_406", qe = {
  Widget: n4,
  LandingShadow: a4,
  WidgetEntrance: i4,
  WidgetExit: r4,
  Shell: l4,
  ShellControls: o4,
  Launcher: u4,
  LauncherRow: c4,
  LauncherLabel: s4,
  CornerTarget: f4,
  Panel: d4,
  LogoButton: h4,
  ShellContent: m4,
  ShellLayout: v4,
  LauncherLogo: p4,
  blossomEntrance: g4,
  Composer: y4,
  Textarea: b4,
  ComposerFooter: _4,
  SendButton: E4,
  LauncherDismissButton: S4
}, It = {
  editorWidgetCorner: "oai/sites-toolbar/corner",
  editorWidgetMobileAnchor: "oai/sites-toolbar/mobileAnchor",
  editorWidgetInteracted: "oai/sites-toolbar/interacted",
  editorWidgetHideHintSeen: "oai/sites-toolbar/hideHintSeen"
}, rg = {
  parse: (t) => t === "true",
  serialize: (t) => String(t)
}, lg = {
  [It.editorWidgetCorner]: {
    parse: (t) => t === "top-left" || t === "top-right" || t === "bottom-left" || t === "bottom-right" ? t : "bottom-right",
    serialize: (t) => t
  },
  [It.editorWidgetMobileAnchor]: {
    parse: (t) => t === "top-left" || t === "top-right" || t === "bottom-left" || t === "bottom-right" ? t : "bottom-center",
    serialize: (t) => t
  },
  [It.editorWidgetInteracted]: rg,
  [It.editorWidgetHideHintSeen]: rg
};
function T4() {
  try {
    return localStorage;
  } catch {
    return null;
  }
}
function Ry(t = T4()) {
  return {
    read: (a) => {
      let r = null;
      try {
        r = t?.getItem(a) ?? null;
      } catch {
      }
      return lg[a].parse(r);
    },
    write: (a, r) => {
      try {
        t?.setItem(a, lg[a].serialize(r));
      } catch {
      }
    }
  };
}
function A4({ storage: t, reducedMotion: a = !1, initiallyHidden: r = !1 } = {}) {
  const o = Ry(t);
  return GE()((u, f) => {
    const d = (h) => {
      u((p) => {
        const g = h(p.state);
        return g === p.state ? p : {
          state: g,
          showHideHint: (g.view === "hiding" || g.view === "hidden") && p.showHideHint,
          showLogoEntrance: g.view === "launcher" && p.showLogoEntrance
        };
      });
    };
    return {
      state: {
        view: r ? "hidden" : "launcher",
        draft: ""
      },
      corner: o.read(It.editorWidgetCorner),
      hasInteracted: o.read(It.editorWidgetInteracted),
      hasSeenHideHint: o.read(It.editorWidgetHideHintSeen),
      showHideHint: !1,
      showLogoEntrance: !r && !a,
      actions: {
        setCorner: (h) => {
          f().corner !== h && u({ corner: h }), o.write(It.editorWidgetCorner, h);
        },
        markInteracted: () => {
          f().hasInteracted || (u({ hasInteracted: !0 }), o.write(It.editorWidgetInteracted, !0));
        },
        markHideHintSeen: () => {
          const h = f();
          h.hasSeenHideHint || !h.showHideHint || h.state.view !== "hidden" || (u({ hasSeenHideHint: !0 }), o.write(It.editorWidgetHideHintSeen, !0));
        },
        finishLogoEntrance: () => {
          f().showLogoEntrance && u({ showLogoEntrance: !1 });
        },
        open: () => d((h) => h.view === "launcher" ? {
          ...h,
          view: "composer"
        } : h),
        collapse: () => d((h) => h.view === "composer" ? {
          ...h,
          view: "launcher"
        } : h),
        changeDraft: (h) => d((p) => p.view === "composer" ? {
          ...p,
          draft: h
        } : p),
        hide: () => u((h) => {
          const { state: p } = h;
          return p.view !== "launcher" && p.view !== "composer" ? h : {
            state: {
              ...p,
              view: "hiding"
            },
            showHideHint: !h.hasSeenHideHint,
            showLogoEntrance: !1
          };
        }),
        dismiss: () => d((h) => h.view === "launcher" || h.view === "composer" ? {
          ...h,
          view: "dismissed"
        } : h),
        finishHide: () => d((h) => h.view === "hiding" ? {
          ...h,
          view: "hidden"
        } : h),
        restoreHidden: () => d((h) => h.view === "hiding" || h.view === "hidden" ? {
          view: "launcher",
          draft: h.draft
        } : h),
        beginHandoff: () => {
          const { state: h } = f();
          return h.view !== "composer" || !h.draft.trim() ? null : (u({ state: {
            view: "handoff",
            request: h.draft
          } }), h.draft);
        },
        finishHandoff: () => d((h) => h.view === "handoff" ? {
          view: "launcher",
          draft: h.request
        } : h)
      }
    };
  });
}
var w4 = 1e3, og = 3e3, C4 = 480, O4 = 1500, R4 = 2e3, M4 = 150;
function D4(t, a, r, o = !1) {
  const [u, f] = (0, _.useState)(t && a ? "away" : "tucked"), [d, h] = (0, _.useState)(!1), [p, g] = (0, _.useState)(!1), [v, b] = (0, _.useState)(!1), [E, S] = (0, _.useState)(t && a), [O, T] = (0, _.useState)(!1), [R, L] = (0, _.useState)(!1), j = (0, _.useRef)(!0), G = (0, _.useRef)(t && a), N = d || v;
  return (0, _.useEffect)(() => {
    if (!t) {
      T(!1), L(!1);
      return;
    }
    if (R) return;
    if (O) {
      if (d || p) return;
      const B = window.setTimeout(() => T(!1), M4);
      return () => window.clearTimeout(B);
    }
    if (!d) return;
    const X = window.setTimeout(() => T(!0), R4);
    return () => window.clearTimeout(X);
  }, [
    t,
    d,
    p,
    O,
    R
  ]), (0, _.useEffect)(() => {
    if (!t) {
      j.current = !0, G.current = !1, f("tucked"), h(!1), g(!1), b(!1), S(!1);
      return;
    }
    if (N) {
      G.current = !1, j.current = !1, S(!0), f("expanded");
      return;
    }
    if (p || G.current || (f("tucked"), !a)) return;
    if (r) {
      if (j.current = !1, o) {
        const B = window.setTimeout(() => f("away"), og);
        return () => window.clearTimeout(B);
      }
      f("away");
      return;
    }
    const X = [];
    return j.current ? X.push(window.setTimeout(() => {
      j.current = !1, f("expanded"), X.push(window.setTimeout(() => f("away"), C4));
    }, o ? og : w4)) : X.push(window.setTimeout(() => f("away"), O4)), () => X.forEach((B) => window.clearTimeout(B));
  }, [
    t,
    a,
    N,
    p,
    r,
    o
  ]), {
    phase: u,
    quiet: E,
    hoverHintVisible: O,
    hintDismissed: R,
    dismissHint: () => {
      L(!0), T(!1), g(!1);
    },
    hintHandlers: {
      onContentPointerEnter: (X) => {
        X.pointerType !== "touch" && g(!0);
      },
      onContentPointerLeave: () => g(!1)
    },
    targetHandlers: {
      onPointerEnter: (X) => {
        X.pointerType !== "touch" && (L(!1), h(!0));
      },
      onPointerLeave: () => h(!1),
      onFocus: () => b(!0),
      onBlur: () => b(!1)
    }
  };
}
var N4 = 5, z4 = 520, x4 = 16, H4 = 24, L4 = 137, U4 = 36, Go = 32, ug = 280, B4 = 20;
function cg(t, a, r, o) {
  return `${a < o / 2 ? "top" : "bottom"}-${t < r / 2 ? "left" : "right"}`;
}
function j4({ corner: t, onCornerChange: a, onInteract: r }) {
  const [o, u] = (0, _.useState)(null), [f, d] = (0, _.useState)(null), [h, p] = (0, _.useState)(null), [g, v] = (0, _.useState)(!1), [b, E] = (0, _.useState)({
    width: L4,
    height: U4,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  }), S = (0, _.useRef)(null), O = (0, _.useRef)(null), T = (0, _.useRef)(!1), R = b.viewportWidth <= z4 ? x4 : H4;
  (0, _.useLayoutEffect)(() => {
    function J() {
      const he = f?.getBoundingClientRect();
      E((de) => {
        const ge = {
          width: he?.width ?? de.width,
          height: he?.height ?? de.height,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight
        };
        return ge.width === de.width && ge.height === de.height && ge.viewportWidth === de.viewportWidth && ge.viewportHeight === de.viewportHeight ? de : ge;
      });
    }
    J();
    const ee = new ResizeObserver(() => (0, nl.flushSync)(J));
    return f && ee.observe(f), window.addEventListener("resize", J), () => {
      ee.disconnect(), window.removeEventListener("resize", J);
    };
  }, [f]), (0, _.useLayoutEffect)(() => () => {
    O.current !== null && window.clearTimeout(O.current);
  }, []);
  function L() {
    O.current !== null && window.clearTimeout(O.current), v(!0), O.current = window.setTimeout(() => {
      O.current = null, v(!1);
    }, ug + B4);
  }
  function j(J) {
    return {
      x: J.endsWith("left") ? R : Math.max(R, b.viewportWidth - b.width - R),
      y: J.startsWith("top") ? R : Math.max(R, b.viewportHeight - b.height - R)
    };
  }
  function G(J) {
    if (J.pointerType === "touch" || J.button !== 0 || !J.isPrimary || S.current) return;
    const ee = o?.getBoundingClientRect();
    ee && (T.current = !1, O.current !== null && window.clearTimeout(O.current), O.current = null, v(!1), S.current = {
      pointerId: J.pointerId,
      x: J.clientX,
      y: J.clientY,
      start: {
        x: ee.x,
        y: ee.y
      },
      moved: !1,
      candidate: t
    }, J.currentTarget.setPointerCapture(J.pointerId));
  }
  function N(J) {
    const ee = S.current;
    if (!ee || ee.pointerId !== J.pointerId) return;
    const he = J.clientX - ee.x, de = J.clientY - ee.y;
    if (!ee.moved && Math.hypot(he, de) < N4) return;
    ee.moved || r(), ee.moved = !0;
    const ge = {
      x: Math.max(0, Math.min(ee.start.x + he, b.viewportWidth - b.width)),
      y: Math.max(0, Math.min(ee.start.y + de, b.viewportHeight - b.height))
    };
    ee.candidate = cg(ge.x + b.width / 2, ge.y + b.height / 2, b.viewportWidth, b.viewportHeight), p(ge);
  }
  function X(J) {
    const ee = S.current;
    !ee || ee.pointerId !== J.pointerId || (S.current = null, T.current = ee.moved, ee.moved && (a(ee.candidate), L(), p(null)), J.currentTarget.hasPointerCapture(J.pointerId) && J.currentTarget.releasePointerCapture(J.pointerId));
  }
  function B(J) {
    !S.current || S.current.pointerId !== J.pointerId || (T.current = S.current.moved, S.current = null, L(), p(null), J.currentTarget.hasPointerCapture(J.pointerId) && J.currentTarget.releasePointerCapture(J.pointerId));
  }
  function I(J) {
    T.current && J.detail !== 0 && (J.preventDefault(), J.stopPropagation()), T.current = !1;
  }
  function H(J) {
    if (J.altKey || J.ctrlKey || J.metaKey || J.shiftKey || S.current) return;
    let ee;
    switch (J.key) {
      case "ArrowLeft":
        ee = t.startsWith("top") ? "top-left" : "bottom-left";
        break;
      case "ArrowRight":
        ee = t.startsWith("top") ? "top-right" : "bottom-right";
        break;
      case "ArrowUp":
        ee = t.endsWith("left") ? "top-left" : "top-right";
        break;
      case "ArrowDown":
        ee = t.endsWith("left") ? "bottom-left" : "bottom-right";
        break;
      default:
        return;
    }
    J.preventDefault(), r(), a(ee), L();
  }
  const K = h ?? j(t), ne = j(h ? cg(h.x + b.width / 2, h.y + b.height / 2, b.viewportWidth, b.viewportHeight) : t);
  return {
    widgetRef: u,
    contentRef: d,
    snapping: g,
    dragging: h !== null,
    style: {
      left: K.x,
      top: K.y,
      "--widget-snap-duration": `${ug}ms`,
      "--widget-surface-width": `${b.width}px`,
      "--widget-surface-height": `${b.height}px`,
      "--corner-x-direction": t.endsWith("left") ? -1 : 1,
      "--corner-y-direction": t.startsWith("top") ? -1 : 1,
      "--tuck-x": `${(t.endsWith("left") ? -Go : b.viewportWidth - Go) - K.x}px`,
      "--tuck-y": `${(t.startsWith("top") ? -Go : b.viewportHeight - Go) - K.y}px`
    },
    shadowStyle: {
      left: ne.x,
      top: ne.y,
      width: b.width,
      height: b.height
    },
    dragHandlers: {
      onPointerDown: G,
      onPointerMove: N,
      onPointerUp: X,
      onPointerCancel: B,
      onLostPointerCapture: B,
      onClickCapture: I,
      onKeyDown: H
    }
  };
}
var My = "(prefers-reduced-motion: reduce)";
function Z4(t) {
  const a = window.matchMedia(My);
  return a.addEventListener("change", t), () => a.removeEventListener("change", t);
}
function G4() {
  return window.matchMedia(My).matches;
}
function P4() {
  return (0, _.useSyncExternalStore)(Z4, G4);
}
var Dy = "(hover: hover) and (pointer: fine)";
function X4(t) {
  const a = window.matchMedia(Dy);
  return a.addEventListener("change", t), () => a.removeEventListener("change", t);
}
function k4() {
  return window.matchMedia(Dy).matches;
}
function V4() {
  return (0, _.useSyncExternalStore)(X4, k4);
}
function Y4(t) {
  return /* @__PURE__ */ (0, D.jsx)("svg", {
    width: "1em",
    height: "1em",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    ...t,
    children: /* @__PURE__ */ (0, D.jsx)("path", { d: "M12 3C12.2652 3 12.5196 3.10536 12.7071 3.29289L19.7071 10.2929C20.0976 10.6834 20.0976 11.3166 19.7071 11.7071C19.3166 12.0976 18.6834 12.0976 18.2929 11.7071L13 6.41421V20C13 20.5523 12.5523 21 12 21C11.4477 21 11 20.5523 11 20V6.41422L5.70711 11.7071C5.31658 12.0976 4.68342 12.0976 4.29289 11.7071C3.90237 11.3166 3.90237 10.6834 4.29289 10.2929L11.2929 3.29289C11.4804 3.10536 11.7348 3 12 3Z" })
  });
}
function Kf(t) {
  return /* @__PURE__ */ (0, D.jsx)("svg", {
    width: "1em",
    height: "1em",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    ...t,
    children: /* @__PURE__ */ (0, D.jsx)("path", {
      fillRule: "evenodd",
      d: "M5.636 5.636a1 1 0 0 1 1.414 0l4.95 4.95 4.95-4.95a1 1 0 0 1 1.414 1.414L13.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414L12 13.414l-4.95 4.95a1 1 0 0 1-1.414-1.414l4.95-4.95-4.95-4.95a1 1 0 0 1 0-1.414Z",
      clipRule: "evenodd"
    })
  });
}
function q4({ accountId: t, chatgptOrigin: a, projectId: r }) {
  const o = new URL(r ? `/sites/${encodeURIComponent(r)}/edit` : "/sites", a);
  return r && t && o.searchParams.set("account_id", t), o;
}
function eu(t, a) {
  return a === null ? t : `[${t.replaceAll(`\r
`, " ").replaceAll("\r", " ").replaceAll(`
`, " ").replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("](", "]\\(").replaceAll("]", "\\]")}](sites-project://${encodeURIComponent(a)})`;
}
function I4({ accountId: t, chatgptOrigin: a, query: r, editContext: o }) {
  const u = new URL("/", a);
  return t && u.searchParams.set("account_id", t), o?.chatgpt_conversation_id && u.searchParams.set("resume_conversation_id", o.chatgpt_conversation_id), u.searchParams.set("surface", "work"), u.searchParams.set("prompt", r), u.searchParams.set("promptSource", "codex-app"), u;
}
function Ef({ accountId: t, browserUrl: a, chatgptOrigin: r, query: o, isDefaultPrompt: u = !1, projectId: f, editContext: d }) {
  if (f) {
    const p = q4({
      accountId: t,
      chatgptOrigin: r,
      projectId: f
    });
    return d?.chatgpt_conversation_id && p.searchParams.set("conversation_id", d.chatgpt_conversation_id), d?.codex_thread_id && p.searchParams.set("codex_thread_id", d.codex_thread_id), u || p.searchParams.set("prompt", o), p.searchParams.set("browser_url", a), p;
  }
  const h = new URL("/codex/open-app", r);
  return h.searchParams.set("app_brand", "chatgpt"), h.searchParams.set("fallback", "work"), t && h.searchParams.set("account_id", t), d?.codex_thread_id && h.searchParams.set("codex_thread_id", d.codex_thread_id), d?.chatgpt_conversation_id && h.searchParams.set("chatgpt_conversation_id", d.chatgpt_conversation_id), h.searchParams.set("q", o), h.searchParams.set("browserUrl", a), h;
}
function $4(t) {
  const [a, r] = (0, _.useState)(null);
  return (0, _.useLayoutEffect)(() => {
    if (!a) return;
    let o = 0;
    const u = () => {
      cancelAnimationFrame(o), o = requestAnimationFrame(() => {
        const d = t.current?.getBoundingClientRect();
        if (!d) return;
        const h = a.getBoundingClientRect();
        a.style.setProperty("--closed-top", `${d.top - h.top}px`), a.style.setProperty("--closed-left", `${d.left - h.left}px`), a.style.setProperty("--closed-right", `${h.right - d.right}px`), a.style.setProperty("--closed-bottom", `${h.bottom - d.bottom}px`), a.hasAttribute("data-mobile-widget-positioned") || (getComputedStyle(a, "::before").inset, a.dataset.mobileWidgetPositioned = "");
      });
    }, f = new ResizeObserver(u);
    return f.observe(a), t.current && f.observe(t.current), u(), window.addEventListener("resize", u), window.visualViewport?.addEventListener("resize", u), window.visualViewport?.addEventListener("scroll", u), () => {
      cancelAnimationFrame(o), f.disconnect(), window.removeEventListener("resize", u), window.visualViewport?.removeEventListener("resize", u), window.visualViewport?.removeEventListener("scroll", u);
    };
  }, [a, t]), {
    menuRef: r,
    menuMounted: a !== null
  };
}
var F4 = [
  "bottom-center",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right"
], Q4 = 1.25;
function Ny(t, a) {
  return {
    x: t === "bottom-center" ? (a.left + a.right) / 2 : t.endsWith("left") ? a.left : a.right,
    y: t.startsWith("top") ? a.top : a.bottom
  };
}
function W4(t, a) {
  let r = "bottom-center", o = 1 / 0;
  for (const u of F4) {
    const f = Ny(u, a), d = u === "bottom-center" ? Q4 : 1, h = Math.hypot(t.x - f.x, t.y - f.y) / d;
    h < o && (r = u, o = h);
  }
  return r;
}
var sg = 52, Vr = 16, K4 = 5, fg = 280;
function J4(t, a) {
  const r = (0, _.useRef)(null), [o] = (0, _.useState)(Ry), [u, f] = (0, _.useState)(() => o.read(It.editorWidgetMobileAnchor)), [d, h] = (0, _.useState)(null), [p, g] = (0, _.useState)(!1), v = (0, _.useRef)(null), [b, E] = (0, _.useState)({
    left: Vr,
    top: Vr,
    right: window.innerWidth - Vr,
    bottom: window.innerHeight - sg - Vr
  }), [S, O] = (0, _.useState)(!1), [T, R] = (0, _.useState)(!1), L = (0, _.useRef)(null), j = (0, _.useRef)(!1), G = (0, _.useRef)(!1);
  (0, _.useLayoutEffect)(() => () => {
    v.current !== null && window.clearTimeout(v.current);
  }, []);
  function N() {
    v.current !== null && window.clearTimeout(v.current), g(!0), v.current = window.setTimeout(() => {
      v.current = null, g(!1);
    }, fg + 20);
  }
  (0, _.useLayoutEffect)(() => {
    function H() {
      const ne = window.visualViewport, J = r.current ? getComputedStyle(r.current) : null, ee = (k) => Math.max(Vr, parseFloat(J?.getPropertyValue(`--safe-${k}`) ?? "0") || 0), he = (ne?.offsetLeft ?? 0) + ee("left"), de = (ne?.offsetTop ?? 0) + ee("top"), ge = r.current?.offsetWidth ?? 0, Q = r.current?.offsetHeight ?? sg;
      E({
        left: he,
        top: de,
        right: Math.max(he, (ne?.offsetLeft ?? 0) + (ne?.width ?? window.innerWidth) - ge - ee("right")),
        bottom: Math.max(de, (ne?.offsetTop ?? 0) + (ne?.height ?? window.innerHeight) - Q - ee("bottom"))
      });
    }
    H();
    const K = new ResizeObserver(H);
    return r.current && K.observe(r.current), window.addEventListener("resize", H), window.visualViewport?.addEventListener("resize", H), window.visualViewport?.addEventListener("scroll", H), () => {
      K.disconnect(), window.removeEventListener("resize", H), window.visualViewport?.removeEventListener("resize", H), window.visualViewport?.removeEventListener("scroll", H);
    };
  }, []);
  function X(H) {
    return {
      x: Math.max(b.left, Math.min(H.x, b.right)),
      y: Math.max(b.top, Math.min(H.y, b.bottom))
    };
  }
  const B = X(d ?? Ny(u, b));
  function I(H, K = !1) {
    const ne = L.current;
    if (!(!ne || ne.id !== H.pointerId)) {
      if (L.current = null, G.current = !K && !ne.moved && H.pointerType === "touch", j.current = K || ne.moved || G.current, !K && ne.moved) {
        const J = W4(X({
          x: ne.start.x + H.clientX - ne.pointer.x,
          y: ne.start.y + H.clientY - ne.pointer.y
        }), b);
        f(J), o.write(It.editorWidgetMobileAnchor, J);
      }
      N(), h(null), O(!1), R(!1), H.currentTarget.hasPointerCapture(H.pointerId) && H.currentTarget.releasePointerCapture(H.pointerId);
    }
  }
  return {
    ref: r,
    anchor: u,
    style: {
      left: B.x,
      top: B.y,
      "--widget-snap-duration": `${fg}ms`
    },
    dragging: S,
    pressed: T,
    snapping: p,
    dragHandlers: {
      onPointerDown(H) {
        if (!H.isPrimary || H.button !== 0 || L.current) return;
        const K = r.current?.getBoundingClientRect(), ne = K ? {
          x: K.x,
          y: K.y
        } : B;
        v.current !== null && window.clearTimeout(v.current), v.current = null, g(!1), R(!0), h(ne), j.current = !1, G.current = !1, L.current = {
          id: H.pointerId,
          pointer: {
            x: H.clientX,
            y: H.clientY
          },
          start: ne,
          moved: !1
        }, H.target instanceof Element && H.target.setPointerCapture(H.pointerId);
      },
      onPointerMove(H) {
        const K = L.current;
        if (!K || K.id !== H.pointerId) return;
        const ne = H.clientX - K.pointer.x, J = H.clientY - K.pointer.y;
        !K.moved && Math.hypot(ne, J) < K4 || (K.moved || (H.currentTarget.setPointerCapture(H.pointerId), t()), K.moved = !0, O(!0), h(X({
          x: K.start.x + ne,
          y: K.start.y + J
        })));
      },
      onPointerUp: (H) => I(H),
      onPointerCancel: (H) => I(H, !0),
      onLostPointerCapture(H) {
        H.target === H.currentTarget && I(H, !0);
      },
      onTouchEnd(H) {
        H.cancelable && H.preventDefault(), G.current && (G.current = !1, a(H));
      },
      onClickCapture(H) {
        j.current && H.detail !== 0 && (H.preventDefault(), H.stopPropagation()), j.current = !1;
      }
    }
  };
}
function eR(t) {
  return /* @__PURE__ */ (0, D.jsx)("svg", {
    width: "1em",
    height: "1em",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    ...t,
    children: /* @__PURE__ */ (0, D.jsx)("path", { d: "M3 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm7 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm7 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" })
  });
}
function tR(t) {
  return /* @__PURE__ */ (0, D.jsxs)("svg", {
    width: "1em",
    height: "1em",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    ...t,
    children: [/* @__PURE__ */ (0, D.jsx)("path", {
      fillRule: "evenodd",
      clipRule: "evenodd",
      d: "M2.29285 2.29289C2.68337 1.90237 3.31654 1.90237 3.70706 2.29289L21.7071 20.2929C22.0976 20.6834 22.0976 21.3166 21.7071 21.7071C21.3165 22.0976 20.6834 22.0976 20.2928 21.7071L17.7784 19.1927C16.2039 20.2404 14.274 21 12 21C8.84578 21 6.36056 19.541 4.55854 17.8792C2.76156 16.222 1.58474 14.312 1.01229 13.2562C0.585014 12.4681 0.585717 11.5305 1.01263 10.7432C1.59034 9.67778 2.79199 7.72646 4.63582 6.05008L2.29285 3.70711C1.90232 3.31658 1.90232 2.68342 2.29285 2.29289ZM6.05186 7.46612C4.40718 8.93862 3.30712 10.7074 2.77079 11.6965C2.66592 11.8899 2.66602 12.1102 2.77049 12.3029C3.28862 13.2585 4.34187 14.9588 5.9144 16.4089C7.48191 17.8545 9.50568 19 12 19C13.6494 19 15.0899 18.5001 16.3303 17.7445L14.396 15.8102C12.6574 16.9057 10.3323 16.6963 8.81797 15.182C7.30363 13.6676 7.09422 11.3425 8.18971 9.60397L6.05186 7.46612ZM9.67217 11.0864L12.9135 14.3278C12.0164 14.6793 10.9571 14.4927 10.2322 13.7678C9.50728 13.0429 9.32061 11.9836 9.67217 11.0864Z"
    }), /* @__PURE__ */ (0, D.jsx)("path", { d: "M10.2233 5.19987C10.7835 5.07151 11.3752 5 12 5C14.4942 5 16.518 6.1455 18.0855 7.59105C19.6581 9.04124 20.7113 10.7415 21.2294 11.6971C21.3334 11.8889 21.3338 12.1105 21.2284 12.3047C20.9449 12.8276 20.496 13.5829 19.8836 14.4005C19.5525 14.8426 19.6425 15.4693 20.0845 15.8004C20.5265 16.1315 21.1533 16.0415 21.4844 15.5995C22.1677 14.6872 22.6678 13.8459 22.9865 13.2582C23.4131 12.4717 23.4154 11.5327 22.9876 10.7438C22.4152 9.68799 21.2384 7.77798 19.4414 6.1208C17.6394 4.45899 15.1541 3 12 3C11.221 3 10.4794 3.08934 9.77657 3.25041C9.23825 3.37379 8.90186 3.9102 9.02523 4.44853C9.1486 4.98686 9.68502 5.32325 10.2233 5.19987Z" })]
  });
}
function zy(t) {
  return /* @__PURE__ */ (0, D.jsx)("svg", {
    width: "1em",
    height: "1em",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    ...t,
    children: /* @__PURE__ */ (0, D.jsx)("path", {
      fillRule: "evenodd",
      clipRule: "evenodd",
      d: "M13.2929 4.29291C15.0641 2.52167 17.9359 2.52167 19.7071 4.2929C21.4784 6.06414 21.4784 8.93588 19.7071 10.7071L18.7073 11.7069L11.6135 18.8007C10.8766 19.5376 9.92793 20.0258 8.89999 20.1971L4.16441 20.9864C3.84585 21.0395 3.52127 20.9355 3.29291 20.7071C3.06454 20.4788 2.96053 20.1542 3.01362 19.8356L3.80288 15.1C3.9742 14.0721 4.46243 13.1234 5.19932 12.3865L13.2929 4.29291ZM13 7.41422L6.61353 13.8007C6.1714 14.2428 5.87846 14.8121 5.77567 15.4288L5.21656 18.7835L8.57119 18.2244C9.18795 18.1216 9.75719 17.8286 10.1993 17.3865L16.5858 11L13 7.41422ZM18 9.5858L14.4142 6.00001L14.7071 5.70712C15.6973 4.71693 17.3027 4.71693 18.2929 5.70712C19.2831 6.69731 19.2831 8.30272 18.2929 9.29291L18 9.5858Z"
    })
  });
}
var nR = "_Widget_1lfcb_1", aR = "_Launcher_1lfcb_27", iR = "_Action_1lfcb_28", rR = "_EditAction_1lfcb_29", lR = "_MoreAction_1lfcb_30", oR = "_Menu_1lfcb_39", uR = "_Actions_1lfcb_204", Gn = {
  Widget: nR,
  Launcher: aR,
  Action: iR,
  EditAction: rR,
  MoreAction: lR,
  Menu: oR,
  "menu-exit": "_menu-exit_1lfcb_1",
  Actions: uR
};
function cR({ accountId: t, config: a, chatgptOrigin: r, projectId: o, siteTitle: u }) {
  const f = Cy(), [d, h] = (0, _.useState)(!1), [p, g] = (0, _.useState)(a.hidden), [v] = (0, _.useState)(h0), b = (0, _.useRef)(!1), E = (0, _.useRef)(!1), S = J4(() => h(!1), (L) => {
    L.target instanceof Element && L.target.closest("button, a")?.click();
  }), { menuRef: O, menuMounted: T } = $4(S.ref);
  if ((0, _.useEffect)(() => {
    p || b.current || (b.current = !0, qt("editor_widget_shown"));
  }, [p]), p) return null;
  const R = I4({
    accountId: t,
    chatgptOrigin: r,
    editContext: a.edit_context,
    query: `${eu(u, o)} `
  }).toString();
  return /* @__PURE__ */ (0, D.jsxs)(QO, {
    open: d,
    onOpenChange: h,
    children: [(0, nl.createPortal)(/* @__PURE__ */ (0, D.jsx)(sR, {
      position: S,
      open: d,
      menuMounted: T,
      openedByPointer: E,
      editUrl: R
    }), f ?? document.body), /* @__PURE__ */ (0, D.jsx)(JO, {
      container: f,
      children: /* @__PURE__ */ (0, D.jsx)(fR, {
        ref: O,
        anchor: S.anchor,
        open: d,
        openedByPointer: E,
        editUrl: R,
        onEdit: () => h(!1),
        onHide: () => {
          h(!1), g(!0), v(!0), qt("editor_widget_hidden");
        }
      })
    })]
  });
}
function sR({ position: t, open: a, menuMounted: r, openedByPointer: o, editUrl: u }) {
  const f = Vn(), d = f.formatMessage(Ze.editorWidgetMobileMenu);
  return /* @__PURE__ */ (0, D.jsx)(WO, {
    asChild: !0,
    children: /* @__PURE__ */ (0, D.jsx)("div", {
      ref: t.ref,
      className: an(qe.Widget, Gn.Widget),
      style: t.style,
      "data-mobile-widget-dragging": t.dragging ? "" : void 0,
      "data-mobile-widget-pressed": t.pressed ? "" : void 0,
      "data-mobile-widget-snapping": t.snapping ? "" : void 0,
      "data-mobile-widget-menu-open": a ? "" : void 0,
      "data-mobile-widget-menu-mounted": r ? "" : void 0,
      dir: el(f.locale),
      lang: f.locale,
      children: /* @__PURE__ */ (0, D.jsxs)("div", {
        className: Gn.Launcher,
        role: "group",
        "aria-label": d,
        inert: a,
        onPointerDownCapture: () => {
          o.current = !0;
        },
        onKeyDown: () => {
          o.current = !1;
        },
        ...t.dragHandlers,
        children: [
          /* @__PURE__ */ (0, D.jsx)(v0, {
            src: qA,
            alt: "",
            width: 24,
            height: 24
          }),
          /* @__PURE__ */ (0, D.jsx)(xy, {
            className: Gn.EditAction,
            href: u
          }),
          /* @__PURE__ */ (0, D.jsx)(KO, {
            asChild: !0,
            children: /* @__PURE__ */ (0, D.jsx)("button", {
              type: "button",
              className: Gn.MoreAction,
              "aria-label": d,
              title: d,
              children: /* @__PURE__ */ (0, D.jsx)(eR, {
                "aria-hidden": "true",
                focusable: "false"
              })
            })
          })
        ]
      })
    })
  });
}
function fR({ ref: t, anchor: a, open: r, openedByPointer: o, editUrl: u, onEdit: f, onHide: d }) {
  const h = Vn(), p = el(h.locale);
  return /* @__PURE__ */ (0, D.jsx)(e3, {
    ref: t,
    className: an(qe.Widget, Gn.Menu),
    side: a.startsWith("top") ? "bottom" : "top",
    align: a === "bottom-center" ? "center" : a.endsWith("left") !== (p === "rtl") ? "start" : "end",
    sideOffset: -52,
    collisionPadding: 16,
    updatePositionStrategy: "always",
    inert: !r,
    onOpenAutoFocus: (g) => {
      g.preventDefault(), g.target instanceof HTMLElement && (o.current ? g.target : g.target.querySelector("a, button") ?? g.target).focus({ preventScroll: !0 }), o.current = !1;
    },
    "aria-label": h.formatMessage(Ze.editorWidgetMobileMenu),
    dir: p,
    lang: h.locale,
    children: /* @__PURE__ */ (0, D.jsxs)("div", {
      className: Gn.Actions,
      children: [
        /* @__PURE__ */ (0, D.jsx)(xy, {
          className: Gn.Action,
          href: u,
          onClick: f,
          showIcon: !0
        }),
        /* @__PURE__ */ (0, D.jsxs)("button", {
          type: "button",
          className: Gn.Action,
          onClick: d,
          children: [/* @__PURE__ */ (0, D.jsx)(tR, {
            "aria-hidden": "true",
            focusable: "false"
          }), h.formatMessage(Ze.editorWidgetHideAction)]
        }),
        /* @__PURE__ */ (0, D.jsx)(t3, {
          asChild: !0,
          children: /* @__PURE__ */ (0, D.jsxs)("button", {
            type: "button",
            className: Gn.Action,
            children: [/* @__PURE__ */ (0, D.jsx)(Kf, {
              "aria-hidden": "true",
              focusable: "false"
            }), h.formatMessage(Ze.editorWidgetMobileClose)]
          })
        })
      ]
    })
  });
}
function xy({ className: t, href: a, onClick: r, showIcon: o = !1 }) {
  const u = Vn();
  return /* @__PURE__ */ (0, D.jsxs)("a", {
    className: t,
    href: a,
    target: "_blank",
    rel: "noopener noreferrer",
    draggable: !1,
    onClick: () => {
      r?.(), qt("editor_widget_open_in_chatgpt_clicked");
    },
    children: [o && /* @__PURE__ */ (0, D.jsx)(zy, {
      "aria-hidden": "true",
      focusable: "false"
    }), u.formatMessage(Ze.editorWidgetLaunchAction)]
  });
}
var $s = "cubic-bezier(0.2, 1.25, 0.3, 1)", dg = 360, hg = 280, dR = 1e3, hR = 180, mR = 100, vR = 200, pR = 80, gR = 140, yR = 120, Fs = 290, Hy = 12, mg = Hy + 4, bR = 280, _R = 52, ER = -8, SR = -12;
function TR(t) {
  return !(t.defaultPrevented || t.repeat || t.isComposing || t.code !== "KeyM" || !t.altKey || t.ctrlKey || t.metaKey || t.shiftKey || t.getModifierState("AltGraph") || document.designMode === "on" || t.composedPath().some((a) => a instanceof HTMLElement && (a.isContentEditable || a.matches('input, textarea, select, [role="textbox"], [role="searchbox"], [role="combobox"], [role="spinbutton"]'))));
}
function AR(t) {
  return Hf() ? /* @__PURE__ */ (0, D.jsx)(cR, { ...t }) : /* @__PURE__ */ (0, D.jsx)(wR, { ...t });
}
function wR({ config: t, accountId: a, chatgptOrigin: r, projectId: o, siteTitle: u }) {
  const f = Vn(), d = (0, _.useRef)(null), h = (0, _.useRef)(null), p = (0, _.useRef)(!1), g = (0, _.useRef)(!1), v = P4(), b = V4(), [E] = (0, _.useState)(() => A4({
    reducedMotion: v,
    initiallyHidden: t.hidden
  })), [S] = (0, _.useState)(h0), { state: O, actions: T, corner: R, hasInteracted: L, showHideHint: j, showLogoEntrance: G } = XE(E), N = O.view === "composer", X = N ? mR : 0, B = N ? dg : hg, I = O.view === "hiding", H = I || O.view === "hidden", K = O.view !== "handoff" && O.view !== "dismissed" && (b || !H), ne = b && H, J = !b || L, ee = D4(ne, O.view === "hidden", v, j), he = ne && O.view === "hidden" && !ee.hintDismissed && (ee.hoverHintVisible || j && !ee.quiet && ee.phase !== "away"), { widgetRef: de, contentRef: ge, style: Q, dragging: k, dragHandlers: $, snapping: ce, shadowStyle: ye } = j4({
    corner: R,
    onCornerChange: T.setCorner,
    onInteract: T.markInteracted
  }), et = O.view === "handoff" ? "" : O.draft, C = Ef({
    accountId: a,
    projectId: o,
    browserUrl: window.location.href,
    chatgptOrigin: r,
    query: f.formatMessage(Ze.editorWidgetDefaultEditPrompt, { site: eu(u, o) }),
    isDefaultPrompt: !0,
    editContext: t.edit_context
  });
  (0, _.useEffect)(() => {
    he && T.markHideHintSeen();
  }, [he, T]), (0, _.useEffect)(() => {
    !K || H || g.current || (g.current = !0, qt("editor_widget_shown"));
  }, [K, H]), (0, _.useEffect)(() => {
    if (O.view !== "handoff") return;
    const re = window.setTimeout(T.finishHandoff, dR);
    return () => window.clearTimeout(re);
  }, [O.view, T]);
  const Y = (0, _.useCallback)(() => {
    const re = h.current;
    !p.current || !re || re.closest("[inert]") || (p.current = !1, re.focus({ preventScroll: !0 }));
  }, []), W = (0, _.useCallback)((re) => {
    h.current = re, Y();
  }, [Y]);
  (0, _.useLayoutEffect)(() => {
    v && (I && T.finishHide(), T.finishLogoEntrance());
  }, [
    I,
    v,
    T
  ]), (0, _.useEffect)(() => {
    O.view === "launcher" && Y();
  }, [O.view, Y]);
  const ae = (0, _.useCallback)(() => {
    p.current = !0, T.restoreHidden(), S(!1), qt("editor_widget_restored");
  }, [T, S]);
  (0, _.useEffect)(() => {
    if (!ne) return;
    function re(St) {
      TR(St) && (St.preventDefault(), ae());
    }
    return window.addEventListener("keydown", re), () => window.removeEventListener("keydown", re);
  }, [ne, ae]);
  function ve(re) {
    re.relatedTarget instanceof Node && re.currentTarget.contains(re.relatedTarget) || T.collapse();
  }
  function fe(re) {
    N && re.key === "Escape" && !re.defaultPrevented && !re.nativeEvent.isComposing && re.nativeEvent.keyCode !== 229 && (re.preventDefault(), p.current = !0, T.collapse());
  }
  function we() {
    S(!0), b ? T.hide() : T.dismiss(), qt("editor_widget_hidden");
  }
  function tt(re) {
    re.preventDefault();
    const St = T.beginHandoff();
    if (St === null) return;
    qt("editor_widget_edit_request_submitted");
    const Yn = f.formatMessage(Ze.invitationBannerEditPrompt, { site: eu(u, o) }), Wt = Ef({
      accountId: a,
      projectId: o,
      browserUrl: window.location.href,
      chatgptOrigin: r,
      query: `${Yn}

${St.trim()}`,
      editContext: t.edit_context
    });
    Wt.searchParams.set("site_edit_source", "widget");
    try {
      window.open(Wt.toString(), "_blank", "noopener,noreferrer");
    } catch {
    }
  }
  return /* @__PURE__ */ (0, D.jsxs)(D.Fragment, { children: [k && /* @__PURE__ */ (0, D.jsx)("div", {
    className: qe.LandingShadow,
    style: ye,
    "aria-hidden": "true"
  }), /* @__PURE__ */ (0, D.jsx)(_f, {
    as: "div",
    className: qe.WidgetExit,
    disableAnimations: v,
    exitDuration: 0,
    onExit: (re) => {
      re.inert = !0;
    },
    onEnter: (re) => {
      re.inert = !1, Y();
    },
    children: K && /* @__PURE__ */ (0, D.jsxs)("div", {
      ref: de,
      className: qe.Widget,
      style: Q,
      "data-dragging": k ? "" : void 0,
      "data-snapping": ce ? "" : void 0,
      "data-corner": R,
      "data-tucked": H ? "" : void 0,
      "data-peek-phase": H ? ee.phase : void 0,
      "data-quiet-tuck": ee.quiet ? "" : void 0,
      dir: el(f.locale),
      lang: f.locale,
      onBlur: ve,
      onClickCapture: T.markInteracted,
      onKeyDown: fe,
      children: [/* @__PURE__ */ (0, D.jsx)(_f, {
        as: "div",
        className: qe.WidgetEntrance,
        disableAnimations: v,
        enterDuration: hR,
        preventInitialTransition: H,
        children: /* @__PURE__ */ (0, D.jsx)("div", {
          className: qe.Panel,
          "data-expanded": N ? "" : void 0,
          children: /* @__PURE__ */ (0, D.jsx)("div", {
            className: qe.Shell,
            onTransitionEnd: (re) => {
              re.target === re.currentTarget && re.propertyName === "transform" && !re.pseudoElement && T.finishHide();
            },
            children: /* @__PURE__ */ (0, D.jsxs)("div", {
              ref: ge,
              className: qe.ShellControls,
              inert: H,
              children: [/* @__PURE__ */ (0, D.jsx)(V3, {
                as: "div",
                className: qe.ShellLayout,
                disableAnimations: v,
                transitionClassName: qe.ShellContent,
                dimension: "width",
                itemAnchor: R.endsWith("left") ? "start" : "end",
                hideOverflow: !0,
                initial: { opacity: 0 },
                enter: {
                  opacity: 1,
                  delay: N ? vR : pR,
                  duration: gR
                },
                exit: {
                  opacity: 0,
                  duration: yR
                },
                layoutEnter: {
                  delay: X,
                  duration: dg,
                  timingFunction: $s
                },
                layoutExit: {
                  duration: hg,
                  timingFunction: $s
                },
                layoutMove: {
                  delay: X,
                  duration: B,
                  timingFunction: $s
                },
                children: N ? /* @__PURE__ */ (0, D.jsxs)("form", {
                  className: qe.Composer,
                  onSubmit: tt,
                  children: [/* @__PURE__ */ (0, D.jsx)(ow, {
                    textareaRef: d,
                    className: qe.Textarea,
                    autoFocus: !0,
                    "aria-label": f.formatMessage(Ze.editorWidgetComposerLabel),
                    placeholder: f.formatMessage(Ze.editorWidgetComposerPlaceholder),
                    value: et,
                    onKeyDown: (re) => {
                      re.stopPropagation(), fe(re);
                    },
                    onKeyUp: (re) => re.stopPropagation(),
                    onKeyPress: (re) => re.stopPropagation(),
                    onChange: (re) => T.changeDraft(re.target.value)
                  }), /* @__PURE__ */ (0, D.jsx)("div", {
                    className: qe.ComposerFooter,
                    children: /* @__PURE__ */ (0, D.jsx)(Dp, {
                      className: qe.SendButton,
                      color: "primary",
                      variant: "solid",
                      size: "lg",
                      iconSize: "lg",
                      pill: !0,
                      uniform: !0,
                      type: "submit",
                      "aria-label": f.formatMessage(Ze.editorWidgetSendAction),
                      disabled: !et.trim(),
                      children: /* @__PURE__ */ (0, D.jsx)(Y4, {
                        "aria-hidden": "true",
                        focusable: "false"
                      })
                    })
                  })]
                }, "composer") : /* @__PURE__ */ (0, D.jsxs)("div", {
                  className: qe.LauncherRow,
                  children: [/* @__PURE__ */ (0, D.jsx)(jo, {
                    contentClassName: tn.Tooltip,
                    maxWidth: Fs,
                    content: J ? null : f.formatMessage(Ze.editorWidgetOpenAction),
                    sideOffset: mg,
                    children: /* @__PURE__ */ (0, D.jsx)(ew, {
                      className: qe.LogoButton,
                      href: C.toString(),
                      target: "_blank",
                      rel: "noopener noreferrer",
                      onClick: () => qt("editor_widget_open_in_chatgpt_clicked"),
                      variant: "ghost",
                      size: "lg",
                      pill: !0,
                      uniform: !0,
                      "aria-label": f.formatMessage(Ze.editorWidgetOpenAction),
                      children: /* @__PURE__ */ (0, D.jsx)("span", {
                        className: qe.LauncherLogo,
                        "data-entering": G ? "" : void 0,
                        "aria-hidden": "true",
                        children: /* @__PURE__ */ (0, D.jsx)(v0, {
                          src: "/_sites/dispatch-assets/app-openai.svg",
                          alt: "",
                          width: 18,
                          height: 18,
                          onAnimationEnd: T.finishLogoEntrance
                        })
                      })
                    })
                  }), /* @__PURE__ */ (0, D.jsx)(jo, {
                    contentClassName: tn.Tooltip,
                    maxWidth: Fs,
                    content: J || k ? null : f.formatMessage(Ze.editorWidgetLaunchTooltip),
                    sideOffset: Hy,
                    children: /* @__PURE__ */ (0, D.jsx)("button", {
                      ref: W,
                      className: qe.Launcher,
                      type: "button",
                      "aria-expanded": "false",
                      "aria-keyshortcuts": b ? "ArrowUp ArrowDown ArrowLeft ArrowRight" : void 0,
                      ...b ? $ : {},
                      "aria-label": f.formatMessage(Ze.editorWidgetLaunchAction),
                      onClick: () => {
                        T.open(), qt("editor_widget_composer_opened");
                      },
                      children: /* @__PURE__ */ (0, D.jsx)("span", {
                        className: qe.LauncherLabel,
                        children: /* @__PURE__ */ (0, D.jsx)(Pi, { ...Ze.editorWidgetLaunchAction })
                      })
                    })
                  })]
                }, "launcher")
              }), /* @__PURE__ */ (0, D.jsx)(jo, {
                contentClassName: tn.Tooltip,
                maxWidth: Fs,
                content: N || J ? null : f.formatMessage(Ze.editorWidgetHideAction),
                sideOffset: mg,
                children: /* @__PURE__ */ (0, D.jsx)(Dp, {
                  className: qe.LauncherDismissButton,
                  variant: "ghost",
                  size: "lg",
                  pill: !0,
                  uniform: !0,
                  "aria-hidden": N,
                  tabIndex: N ? -1 : 0,
                  "aria-label": f.formatMessage(Ze.editorWidgetHideAction),
                  onClick: we,
                  children: /* @__PURE__ */ (0, D.jsx)(Kf, {
                    "aria-hidden": "true",
                    focusable: "false"
                  })
                })
              })]
            })
          })
        }, "panel")
      }), ne && /* @__PURE__ */ (0, D.jsx)(jo, {
        contentClassName: an(tn.Tooltip, tn.HideHint),
        forceOpen: he,
        onDismiss: ee.dismissHint,
        interactive: !0,
        ...ee.hintHandlers,
        side: R.startsWith("top") ? "bottom" : "top",
        align: R.endsWith("left") ? "start" : "end",
        alignOffset: _R,
        sideOffset: R.startsWith("top") ? ER : SR,
        maxWidth: bR,
        content: /* @__PURE__ */ (0, D.jsxs)("span", {
          className: tn.HideHintContent,
          children: [/* @__PURE__ */ (0, D.jsx)("span", {
            className: tn.HideHintText,
            children: /* @__PURE__ */ (0, D.jsx)(Pi, { ...Ze.editorWidgetHideHint })
          }), /* @__PURE__ */ (0, D.jsxs)("span", {
            className: tn.Shortcut,
            children: [/* @__PURE__ */ (0, D.jsx)("kbd", { children: rw() ? "⌥" : "Alt" }), /* @__PURE__ */ (0, D.jsx)("kbd", { children: "M" })]
          })]
        }),
        children: /* @__PURE__ */ (0, D.jsx)("button", {
          className: qe.CornerTarget,
          type: "button",
          "aria-label": f.formatMessage(Ze.editorWidgetRestoreAction),
          "aria-keyshortcuts": "Alt+M",
          ...ee.targetHandlers,
          onClick: ae
        })
      })]
    }, "widget")
  })] });
}
var CR = "_Banner_1iivt_1", OR = "_Content_1iivt_34", RR = "_Message_1iivt_42", MR = "_OwnerName_1iivt_50", DR = "_Actions_1iivt_54", NR = "_EditLink_1iivt_62", zR = "_DismissButton_1iivt_63", Va = {
  Banner: CR,
  Content: OR,
  Message: RR,
  OwnerName: MR,
  Actions: DR,
  EditLink: NR,
  DismissButton: zR
}, xR = "/_internal/sites_widget/invitation-banner/dismiss";
function vg(t) {
  const a = t.currentTarget, r = a.offsetWidth;
  let o = 0.985;
  r <= 80 ? o = 0.96 : r <= 150 ? o = 0.97 : r <= 220 ? o = 0.98 : r > 600 && (o = 0.995), a.style.setProperty("--scale", o.toString());
}
function HR({ editContext: t, accountId: a, chatgptOrigin: r, ownerName: o, projectId: u, siteTitle: f, onDismiss: d }) {
  const h = Vn();
  (0, _.useEffect)(() => {
    qt("editor_invite_banner_shown");
  }, []);
  const p = Ef({
    editContext: t,
    accountId: a,
    projectId: u,
    browserUrl: window.location.href,
    chatgptOrigin: r,
    query: h.formatMessage(Ze.invitationBannerEditPrompt, { site: eu(f, u) }),
    isDefaultPrompt: !0
  });
  function g() {
    qt("editor_invite_banner_dismissed"), d(), fetch(xR, {
      method: "POST",
      credentials: "same-origin"
    }).catch(() => {
    });
  }
  function v(b) {
    qt("editor_invite_banner_edit_with_chat_clicked");
    const E = new URL(b.currentTarget.href);
    E.searchParams.has("browser_url") && E.searchParams.set("browser_url", window.location.href), b.currentTarget.href = E.toString();
  }
  return /* @__PURE__ */ (0, D.jsx)("aside", {
    className: Va.Banner,
    "aria-label": h.formatMessage(Ze.invitationBannerLabel),
    dir: el(h.locale),
    lang: h.locale,
    children: /* @__PURE__ */ (0, D.jsxs)("div", {
      className: Va.Content,
      children: [/* @__PURE__ */ (0, D.jsx)("div", {
        className: Va.Message,
        children: o ? /* @__PURE__ */ (0, D.jsx)(Pi, {
          ...Ze.invitationBannerMessageWithOwner,
          values: {
            ownerName: o,
            strong: (b) => /* @__PURE__ */ (0, D.jsx)("strong", {
              className: Va.OwnerName,
              children: b
            })
          }
        }) : /* @__PURE__ */ (0, D.jsx)(Pi, { ...Ze.invitationBannerMessage })
      }), /* @__PURE__ */ (0, D.jsxs)("div", {
        className: Va.Actions,
        children: [/* @__PURE__ */ (0, D.jsxs)("a", {
          className: Va.EditLink,
          href: p.toString(),
          target: "_blank",
          rel: "noopener noreferrer",
          onClick: v,
          onPointerEnter: vg,
          children: [/* @__PURE__ */ (0, D.jsx)(zy, {
            "aria-hidden": "true",
            focusable: "false"
          }), /* @__PURE__ */ (0, D.jsx)(Pi, { ...Ze.invitationBannerEditAction })]
        }), /* @__PURE__ */ (0, D.jsx)("button", {
          className: Va.DismissButton,
          type: "button",
          "aria-label": h.formatMessage(Ze.invitationBannerDismissAction),
          onPointerEnter: vg,
          onClick: g,
          children: /* @__PURE__ */ (0, D.jsx)(Kf, {
            "aria-hidden": "true",
            focusable: "false"
          })
        })]
      })]
    })
  });
}
var LR = /* @__PURE__ */ Ht(((t) => {
  function a(Q, k) {
    var $ = Q.length;
    Q.push(k);
    e: for (; 0 < $; ) {
      var ce = $ - 1 >>> 1, ye = Q[ce];
      if (0 < u(ye, k)) Q[ce] = k, Q[$] = ye, $ = ce;
      else break e;
    }
  }
  function r(Q) {
    return Q.length === 0 ? null : Q[0];
  }
  function o(Q) {
    if (Q.length === 0) return null;
    var k = Q[0], $ = Q.pop();
    if ($ !== k) {
      Q[0] = $;
      e: for (var ce = 0, ye = Q.length, et = ye >>> 1; ce < et; ) {
        var C = 2 * (ce + 1) - 1, Y = Q[C], W = C + 1, ae = Q[W];
        if (0 > u(Y, $)) W < ye && 0 > u(ae, Y) ? (Q[ce] = ae, Q[W] = $, ce = W) : (Q[ce] = Y, Q[C] = $, ce = C);
        else if (W < ye && 0 > u(ae, $)) Q[ce] = ae, Q[W] = $, ce = W;
        else break e;
      }
    }
    return k;
  }
  function u(Q, k) {
    var $ = Q.sortIndex - k.sortIndex;
    return $ !== 0 ? $ : Q.id - k.id;
  }
  if (t.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
    var f = performance;
    t.unstable_now = function() {
      return f.now();
    };
  } else {
    var d = Date, h = d.now();
    t.unstable_now = function() {
      return d.now() - h;
    };
  }
  var p = [], g = [], v = 1, b = null, E = 3, S = !1, O = !1, T = !1, R = !1, L = typeof setTimeout == "function" ? setTimeout : null, j = typeof clearTimeout == "function" ? clearTimeout : null, G = typeof setImmediate < "u" ? setImmediate : null;
  function N(Q) {
    for (var k = r(g); k !== null; ) {
      if (k.callback === null) o(g);
      else if (k.startTime <= Q) o(g), k.sortIndex = k.expirationTime, a(p, k);
      else break;
      k = r(g);
    }
  }
  function X(Q) {
    if (T = !1, N(Q), !O) if (r(p) !== null) O = !0, B || (B = !0, ee());
    else {
      var k = r(g);
      k !== null && ge(X, k.startTime - Q);
    }
  }
  var B = !1, I = -1, H = 5, K = -1;
  function ne() {
    return R ? !0 : !(t.unstable_now() - K < H);
  }
  function J() {
    if (R = !1, B) {
      var Q = t.unstable_now();
      K = Q;
      var k = !0;
      try {
        e: {
          O = !1, T && (T = !1, j(I), I = -1), S = !0;
          var $ = E;
          try {
            t: {
              for (N(Q), b = r(p); b !== null && !(b.expirationTime > Q && ne()); ) {
                var ce = b.callback;
                if (typeof ce == "function") {
                  b.callback = null, E = b.priorityLevel;
                  var ye = ce(b.expirationTime <= Q);
                  if (Q = t.unstable_now(), typeof ye == "function") {
                    b.callback = ye, N(Q), k = !0;
                    break t;
                  }
                  b === r(p) && o(p), N(Q);
                } else o(p);
                b = r(p);
              }
              if (b !== null) k = !0;
              else {
                var et = r(g);
                et !== null && ge(X, et.startTime - Q), k = !1;
              }
            }
            break e;
          } finally {
            b = null, E = $, S = !1;
          }
          k = void 0;
        }
      } finally {
        k ? ee() : B = !1;
      }
    }
  }
  var ee;
  if (typeof G == "function") ee = function() {
    G(J);
  };
  else if (typeof MessageChannel < "u") {
    var he = new MessageChannel(), de = he.port2;
    he.port1.onmessage = J, ee = function() {
      de.postMessage(null);
    };
  } else ee = function() {
    L(J, 0);
  };
  function ge(Q, k) {
    I = L(function() {
      Q(t.unstable_now());
    }, k);
  }
  t.unstable_IdlePriority = 5, t.unstable_ImmediatePriority = 1, t.unstable_LowPriority = 4, t.unstable_NormalPriority = 3, t.unstable_Profiling = null, t.unstable_UserBlockingPriority = 2, t.unstable_cancelCallback = function(Q) {
    Q.callback = null;
  }, t.unstable_forceFrameRate = function(Q) {
    0 > Q || 125 < Q ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : H = 0 < Q ? Math.floor(1e3 / Q) : 5;
  }, t.unstable_getCurrentPriorityLevel = function() {
    return E;
  }, t.unstable_next = function(Q) {
    switch (E) {
      case 1:
      case 2:
      case 3:
        var k = 3;
        break;
      default:
        k = E;
    }
    var $ = E;
    E = k;
    try {
      return Q();
    } finally {
      E = $;
    }
  }, t.unstable_requestPaint = function() {
    R = !0;
  }, t.unstable_runWithPriority = function(Q, k) {
    switch (Q) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        Q = 3;
    }
    var $ = E;
    E = Q;
    try {
      return k();
    } finally {
      E = $;
    }
  }, t.unstable_scheduleCallback = function(Q, k, $) {
    var ce = t.unstable_now();
    switch (typeof $ == "object" && $ !== null ? ($ = $.delay, $ = typeof $ == "number" && 0 < $ ? ce + $ : ce) : $ = ce, Q) {
      case 1:
        var ye = -1;
        break;
      case 2:
        ye = 250;
        break;
      case 5:
        ye = 1073741823;
        break;
      case 4:
        ye = 1e4;
        break;
      default:
        ye = 5e3;
    }
    return ye = $ + ye, Q = {
      id: v++,
      callback: k,
      priorityLevel: Q,
      startTime: $,
      expirationTime: ye,
      sortIndex: -1
    }, $ > ce ? (Q.sortIndex = $, a(g, Q), r(p) === null && Q === r(g) && (T ? (j(I), I = -1) : T = !0, ge(X, $ - ce))) : (Q.sortIndex = ye, a(p, Q), O || S || (O = !0, B || (B = !0, ee()))), Q;
  }, t.unstable_shouldYield = ne, t.unstable_wrapCallback = function(Q) {
    var k = E;
    return function() {
      var $ = E;
      E = k;
      try {
        return Q.apply(this, arguments);
      } finally {
        E = $;
      }
    };
  };
})), UR = /* @__PURE__ */ Ht(((t, a) => {
  a.exports = LR();
})), BR = /* @__PURE__ */ Ht(((t) => {
  var a = UR(), r = Tf(), o = p0();
  function u(e) {
    var n = "https://react.dev/errors/" + e;
    if (1 < arguments.length) {
      n += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var i = 2; i < arguments.length; i++) n += "&args[]=" + encodeURIComponent(arguments[i]);
    }
    return "Minified React error #" + e + "; visit " + n + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function f(e) {
    return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
  }
  function d(e) {
    var n = e, i = e;
    if (e.alternate) for (; n.return; ) n = n.return;
    else {
      e = n;
      do
        n = e, (n.flags & 4098) !== 0 && (i = n.return), e = n.return;
      while (e);
    }
    return n.tag === 3 ? i : null;
  }
  function h(e) {
    if (e.tag === 13) {
      var n = e.memoizedState;
      if (n === null && (e = e.alternate, e !== null && (n = e.memoizedState)), n !== null) return n.dehydrated;
    }
    return null;
  }
  function p(e) {
    if (e.tag === 31) {
      var n = e.memoizedState;
      if (n === null && (e = e.alternate, e !== null && (n = e.memoizedState)), n !== null) return n.dehydrated;
    }
    return null;
  }
  function g(e) {
    if (d(e) !== e) throw Error(u(188));
  }
  function v(e) {
    var n = e.alternate;
    if (!n) {
      if (n = d(e), n === null) throw Error(u(188));
      return n !== e ? null : e;
    }
    for (var i = e, l = n; ; ) {
      var c = i.return;
      if (c === null) break;
      var s = c.alternate;
      if (s === null) {
        if (l = c.return, l !== null) {
          i = l;
          continue;
        }
        break;
      }
      if (c.child === s.child) {
        for (s = c.child; s; ) {
          if (s === i) return g(c), e;
          if (s === l) return g(c), n;
          s = s.sibling;
        }
        throw Error(u(188));
      }
      if (i.return !== l.return) i = c, l = s;
      else {
        for (var m = !1, y = c.child; y; ) {
          if (y === i) {
            m = !0, i = c, l = s;
            break;
          }
          if (y === l) {
            m = !0, l = c, i = s;
            break;
          }
          y = y.sibling;
        }
        if (!m) {
          for (y = s.child; y; ) {
            if (y === i) {
              m = !0, i = s, l = c;
              break;
            }
            if (y === l) {
              m = !0, l = s, i = c;
              break;
            }
            y = y.sibling;
          }
          if (!m) throw Error(u(189));
        }
      }
      if (i.alternate !== l) throw Error(u(190));
    }
    if (i.tag !== 3) throw Error(u(188));
    return i.stateNode.current === i ? e : n;
  }
  function b(e) {
    var n = e.tag;
    if (n === 5 || n === 26 || n === 27 || n === 6) return e;
    for (e = e.child; e !== null; ) {
      if (n = b(e), n !== null) return n;
      e = e.sibling;
    }
    return null;
  }
  var E = Object.assign, S = /* @__PURE__ */ Symbol.for("react.element"), O = /* @__PURE__ */ Symbol.for("react.transitional.element"), T = /* @__PURE__ */ Symbol.for("react.portal"), R = /* @__PURE__ */ Symbol.for("react.fragment"), L = /* @__PURE__ */ Symbol.for("react.strict_mode"), j = /* @__PURE__ */ Symbol.for("react.profiler"), G = /* @__PURE__ */ Symbol.for("react.consumer"), N = /* @__PURE__ */ Symbol.for("react.context"), X = /* @__PURE__ */ Symbol.for("react.forward_ref"), B = /* @__PURE__ */ Symbol.for("react.suspense"), I = /* @__PURE__ */ Symbol.for("react.suspense_list"), H = /* @__PURE__ */ Symbol.for("react.memo"), K = /* @__PURE__ */ Symbol.for("react.lazy"), ne = /* @__PURE__ */ Symbol.for("react.activity"), J = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel"), ee = Symbol.iterator;
  function he(e) {
    return e === null || typeof e != "object" ? null : (e = ee && e[ee] || e["@@iterator"], typeof e == "function" ? e : null);
  }
  var de = /* @__PURE__ */ Symbol.for("react.client.reference");
  function ge(e) {
    if (e == null) return null;
    if (typeof e == "function") return e.$$typeof === de ? null : e.displayName || e.name || null;
    if (typeof e == "string") return e;
    switch (e) {
      case R:
        return "Fragment";
      case j:
        return "Profiler";
      case L:
        return "StrictMode";
      case B:
        return "Suspense";
      case I:
        return "SuspenseList";
      case ne:
        return "Activity";
    }
    if (typeof e == "object") switch (e.$$typeof) {
      case T:
        return "Portal";
      case N:
        return e.displayName || "Context";
      case G:
        return (e._context.displayName || "Context") + ".Consumer";
      case X:
        var n = e.render;
        return e = e.displayName, e || (e = n.displayName || n.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
      case H:
        return n = e.displayName || null, n !== null ? n : ge(e.type) || "Memo";
      case K:
        n = e._payload, e = e._init;
        try {
          return ge(e(n));
        } catch {
        }
    }
    return null;
  }
  var Q = Array.isArray, k = r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, $ = o.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, ce = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, ye = [], et = -1;
  function C(e) {
    return { current: e };
  }
  function Y(e) {
    0 > et || (e.current = ye[et], ye[et] = null, et--);
  }
  function W(e, n) {
    et++, ye[et] = e.current, e.current = n;
  }
  var ae = C(null), ve = C(null), fe = C(null), we = C(null);
  function tt(e, n) {
    switch (W(fe, n), W(ve, e), W(ae, null), n.nodeType) {
      case 9:
      case 11:
        e = (e = n.documentElement) && (e = e.namespaceURI) ? Sv(e) : 0;
        break;
      default:
        if (e = n.tagName, n = n.namespaceURI) n = Sv(n), e = Tv(n, e);
        else switch (e) {
          case "svg":
            e = 1;
            break;
          case "math":
            e = 2;
            break;
          default:
            e = 0;
        }
    }
    Y(ae), W(ae, e);
  }
  function re() {
    Y(ae), Y(ve), Y(fe);
  }
  function St(e) {
    e.memoizedState !== null && W(we, e);
    var n = ae.current, i = Tv(n, e.type);
    n !== i && (W(ve, e), W(ae, i));
  }
  function Yn(e) {
    ve.current === e && (Y(ae), Y(ve)), we.current === e && (Y(we), Gr._currentValue = ce);
  }
  var Wt, Jf;
  function Sa(e) {
    if (Wt === void 0) try {
      throw Error();
    } catch (i) {
      var n = i.stack.trim().match(/\n( *(at )?)/);
      Wt = n && n[1] || "", Jf = -1 < i.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < i.stack.indexOf("@") ? "@unknown:0:0" : "";
    }
    return `
` + Wt + e + Jf;
  }
  var mu = !1;
  function vu(e, n) {
    if (!e || mu) return "";
    mu = !0;
    var i = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var l = { DetermineComponentFrameRoot: function() {
        try {
          if (n) {
            var q = function() {
              throw Error();
            };
            if (Object.defineProperty(q.prototype, "props", { set: function() {
              throw Error();
            } }), typeof Reflect == "object" && Reflect.construct) {
              try {
                Reflect.construct(q, []);
              } catch (Z) {
                var U = Z;
              }
              Reflect.construct(e, [], q);
            } else {
              try {
                q.call();
              } catch (Z) {
                U = Z;
              }
              e.call(q.prototype);
            }
          } else {
            try {
              throw Error();
            } catch (Z) {
              U = Z;
            }
            (q = e()) && typeof q.catch == "function" && q.catch(function() {
            });
          }
        } catch (Z) {
          if (Z && U && typeof Z.stack == "string") return [Z.stack, U.stack];
        }
        return [null, null];
      } };
      l.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var c = Object.getOwnPropertyDescriptor(l.DetermineComponentFrameRoot, "name");
      c && c.configurable && Object.defineProperty(l.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
      var s = l.DetermineComponentFrameRoot(), m = s[0], y = s[1];
      if (m && y) {
        var A = m.split(`
`), x = y.split(`
`);
        for (c = l = 0; l < A.length && !A[l].includes("DetermineComponentFrameRoot"); ) l++;
        for (; c < x.length && !x[c].includes("DetermineComponentFrameRoot"); ) c++;
        if (l === A.length || c === x.length) for (l = A.length - 1, c = x.length - 1; 1 <= l && 0 <= c && A[l] !== x[c]; ) c--;
        for (; 1 <= l && 0 <= c; l--, c--) if (A[l] !== x[c]) {
          if (l !== 1 || c !== 1) do
            if (l--, c--, 0 > c || A[l] !== x[c]) {
              var P = `
` + A[l].replace(" at new ", " at ");
              return e.displayName && P.includes("<anonymous>") && (P = P.replace("<anonymous>", e.displayName)), P;
            }
          while (1 <= l && 0 <= c);
          break;
        }
      }
    } finally {
      mu = !1, Error.prepareStackTrace = i;
    }
    return (i = e ? e.displayName || e.name : "") ? Sa(i) : "";
  }
  function Ly(e, n) {
    switch (e.tag) {
      case 26:
      case 27:
      case 5:
        return Sa(e.type);
      case 16:
        return Sa("Lazy");
      case 13:
        return e.child !== n && n !== null ? Sa("Suspense Fallback") : Sa("Suspense");
      case 19:
        return Sa("SuspenseList");
      case 0:
      case 15:
        return vu(e.type, !1);
      case 11:
        return vu(e.type.render, !1);
      case 1:
        return vu(e.type, !0);
      case 31:
        return Sa("Activity");
      default:
        return "";
    }
  }
  function ed(e) {
    try {
      var n = "", i = null;
      do
        n += Ly(e, i), i = e, e = e.return;
      while (e);
      return n;
    } catch (l) {
      return `
Error generating stack: ` + l.message + `
` + l.stack;
    }
  }
  var pu = Object.prototype.hasOwnProperty, gu = a.unstable_scheduleCallback, yu = a.unstable_cancelCallback, Uy = a.unstable_shouldYield, By = a.unstable_requestPaint, Tt = a.unstable_now, jy = a.unstable_getCurrentPriorityLevel, td = a.unstable_ImmediatePriority, nd = a.unstable_UserBlockingPriority, ol = a.unstable_NormalPriority, Zy = a.unstable_LowPriority, ad = a.unstable_IdlePriority, Gy = a.log, Py = a.unstable_setDisableYieldValue, Ki = null, At = null;
  function qn(e) {
    if (typeof Gy == "function" && Py(e), At && typeof At.setStrictMode == "function") try {
      At.setStrictMode(Ki, e);
    } catch {
    }
  }
  var wt = Math.clz32 ? Math.clz32 : Vy, Xy = Math.log, ky = Math.LN2;
  function Vy(e) {
    return e >>>= 0, e === 0 ? 32 : 31 - (Xy(e) / ky | 0) | 0;
  }
  var ul = 256, cl = 262144, sl = 4194304;
  function Ta(e) {
    var n = e & 42;
    if (n !== 0) return n;
    switch (e & -e) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
        return 128;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
        return e & 261888;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return e & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return e & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return e;
    }
  }
  function fl(e, n, i) {
    var l = e.pendingLanes;
    if (l === 0) return 0;
    var c = 0, s = e.suspendedLanes, m = e.pingedLanes;
    e = e.warmLanes;
    var y = l & 134217727;
    return y !== 0 ? (l = y & ~s, l !== 0 ? c = Ta(l) : (m &= y, m !== 0 ? c = Ta(m) : i || (i = y & ~e, i !== 0 && (c = Ta(i))))) : (y = l & ~s, y !== 0 ? c = Ta(y) : m !== 0 ? c = Ta(m) : i || (i = l & ~e, i !== 0 && (c = Ta(i)))), c === 0 ? 0 : n !== 0 && n !== c && (n & s) === 0 && (s = c & -c, i = n & -n, s >= i || s === 32 && (i & 4194048) !== 0) ? n : c;
  }
  function Ji(e, n) {
    return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & n) === 0;
  }
  function Yy(e, n) {
    switch (e) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return n + 250;
      case 16:
      case 32:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return n + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function id() {
    var e = sl;
    return sl <<= 1, (sl & 62914560) === 0 && (sl = 4194304), e;
  }
  function bu(e) {
    for (var n = [], i = 0; 31 > i; i++) n.push(e);
    return n;
  }
  function dl(e, n) {
    e.pendingLanes |= n, n !== 268435456 && (e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0);
  }
  function qy(e, n, i, l, c, s) {
    var m = e.pendingLanes;
    e.pendingLanes = i, e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0, e.expiredLanes &= i, e.entangledLanes &= i, e.errorRecoveryDisabledLanes &= i, e.shellSuspendCounter = 0;
    var y = e.entanglements, A = e.expirationTimes, x = e.hiddenUpdates;
    for (i = m & ~i; 0 < i; ) {
      var P = 31 - wt(i), q = 1 << P;
      y[P] = 0, A[P] = -1;
      var U = x[P];
      if (U !== null) for (x[P] = null, P = 0; P < U.length; P++) {
        var Z = U[P];
        Z !== null && (Z.lane &= -536870913);
      }
      i &= ~q;
    }
    l !== 0 && rd(e, l, 0), s !== 0 && c === 0 && e.tag !== 0 && (e.suspendedLanes |= s & ~(m & ~n));
  }
  function rd(e, n, i) {
    e.pendingLanes |= n, e.suspendedLanes &= ~n;
    var l = 31 - wt(n);
    e.entangledLanes |= n, e.entanglements[l] = e.entanglements[l] | 1073741824 | i & 261930;
  }
  function ld(e, n) {
    var i = e.entangledLanes |= n;
    for (e = e.entanglements; i; ) {
      var l = 31 - wt(i), c = 1 << l;
      c & n | e[l] & n && (e[l] |= n), i &= ~c;
    }
  }
  function od(e, n) {
    var i = n & -n;
    return i = (i & 42) !== 0 ? 1 : ud(i), (i & (e.suspendedLanes | n)) !== 0 ? 0 : i;
  }
  function ud(e) {
    switch (e) {
      case 2:
        e = 1;
        break;
      case 8:
        e = 4;
        break;
      case 32:
        e = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        e = 128;
        break;
      case 268435456:
        e = 134217728;
        break;
      default:
        e = 0;
    }
    return e;
  }
  function _u(e) {
    return e &= -e, 2 < e ? 8 < e ? (e & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function cd() {
    var e = $.p;
    return e !== 0 ? e : (e = window.event, e === void 0 ? 32 : Vv(e.type));
  }
  function sd(e, n) {
    var i = $.p;
    try {
      return $.p = e, n();
    } finally {
      $.p = i;
    }
  }
  var In = Math.random().toString(36).slice(2), lt = "__reactFiber$" + In, mt = "__reactProps$" + In, er = "__reactContainer$" + In, Eu = "__reactEvents$" + In, Iy = "__reactListeners$" + In, $y = "__reactHandles$" + In, fd = "__reactResources$" + In, tr = "__reactMarker$" + In;
  function Su(e) {
    delete e[lt], delete e[mt], delete e[Eu], delete e[Iy], delete e[$y];
  }
  function Ka(e) {
    var n = e[lt];
    if (n) return n;
    for (var i = e.parentNode; i; ) {
      if (n = i[er] || i[lt]) {
        if (i = n.alternate, n.child !== null || i !== null && i.child !== null) for (e = Dv(e); e !== null; ) {
          if (i = e[lt]) return i;
          e = Dv(e);
        }
        return n;
      }
      e = i, i = e.parentNode;
    }
    return null;
  }
  function Ja(e) {
    if (e = e[lt] || e[er]) {
      var n = e.tag;
      if (n === 5 || n === 6 || n === 13 || n === 31 || n === 26 || n === 27 || n === 3) return e;
    }
    return null;
  }
  function nr(e) {
    var n = e.tag;
    if (n === 5 || n === 26 || n === 27 || n === 6) return e.stateNode;
    throw Error(u(33));
  }
  function ei(e) {
    var n = e[fd];
    return n || (n = e[fd] = {
      hoistableStyles: /* @__PURE__ */ new Map(),
      hoistableScripts: /* @__PURE__ */ new Map()
    }), n;
  }
  function it(e) {
    e[tr] = !0;
  }
  var dd = /* @__PURE__ */ new Set(), hd = {};
  function Aa(e, n) {
    ti(e, n), ti(e + "Capture", n);
  }
  function ti(e, n) {
    for (hd[e] = n, e = 0; e < n.length; e++) dd.add(n[e]);
  }
  var Fy = RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"), md = {}, vd = {};
  function Qy(e) {
    return pu.call(vd, e) ? !0 : pu.call(md, e) ? !1 : Fy.test(e) ? vd[e] = !0 : (md[e] = !0, !1);
  }
  function hl(e, n, i) {
    if (Qy(n)) if (i === null) e.removeAttribute(n);
    else {
      switch (typeof i) {
        case "undefined":
        case "function":
        case "symbol":
          e.removeAttribute(n);
          return;
        case "boolean":
          var l = n.toLowerCase().slice(0, 5);
          if (l !== "data-" && l !== "aria-") {
            e.removeAttribute(n);
            return;
          }
      }
      e.setAttribute(n, "" + i);
    }
  }
  function ml(e, n, i) {
    if (i === null) e.removeAttribute(n);
    else {
      switch (typeof i) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          e.removeAttribute(n);
          return;
      }
      e.setAttribute(n, "" + i);
    }
  }
  function En(e, n, i, l) {
    if (l === null) e.removeAttribute(i);
    else {
      switch (typeof l) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          e.removeAttribute(i);
          return;
      }
      e.setAttributeNS(n, i, "" + l);
    }
  }
  function Lt(e) {
    switch (typeof e) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return e;
      case "object":
        return e;
      default:
        return "";
    }
  }
  function pd(e) {
    var n = e.type;
    return (e = e.nodeName) && e.toLowerCase() === "input" && (n === "checkbox" || n === "radio");
  }
  function Wy(e, n, i) {
    var l = Object.getOwnPropertyDescriptor(e.constructor.prototype, n);
    if (!e.hasOwnProperty(n) && typeof l < "u" && typeof l.get == "function" && typeof l.set == "function") {
      var c = l.get, s = l.set;
      return Object.defineProperty(e, n, {
        configurable: !0,
        get: function() {
          return c.call(this);
        },
        set: function(m) {
          i = "" + m, s.call(this, m);
        }
      }), Object.defineProperty(e, n, { enumerable: l.enumerable }), {
        getValue: function() {
          return i;
        },
        setValue: function(m) {
          i = "" + m;
        },
        stopTracking: function() {
          e._valueTracker = null, delete e[n];
        }
      };
    }
  }
  function Tu(e) {
    if (!e._valueTracker) {
      var n = pd(e) ? "checked" : "value";
      e._valueTracker = Wy(e, n, "" + e[n]);
    }
  }
  function gd(e) {
    if (!e) return !1;
    var n = e._valueTracker;
    if (!n) return !0;
    var i = n.getValue(), l = "";
    return e && (l = pd(e) ? e.checked ? "true" : "false" : e.value), e = l, e !== i ? (n.setValue(e), !0) : !1;
  }
  function vl(e) {
    if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
    try {
      return e.activeElement || e.body;
    } catch {
      return e.body;
    }
  }
  var Ky = /[\n"\\]/g;
  function Ut(e) {
    return e.replace(Ky, function(n) {
      return "\\" + n.charCodeAt(0).toString(16) + " ";
    });
  }
  function Au(e, n, i, l, c, s, m, y) {
    e.name = "", m != null && typeof m != "function" && typeof m != "symbol" && typeof m != "boolean" ? e.type = m : e.removeAttribute("type"), n != null ? m === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + Lt(n)) : e.value !== "" + Lt(n) && (e.value = "" + Lt(n)) : m !== "submit" && m !== "reset" || e.removeAttribute("value"), n != null ? wu(e, m, Lt(n)) : i != null ? wu(e, m, Lt(i)) : l != null && e.removeAttribute("value"), c == null && s != null && (e.defaultChecked = !!s), c != null && (e.checked = c && typeof c != "function" && typeof c != "symbol"), y != null && typeof y != "function" && typeof y != "symbol" && typeof y != "boolean" ? e.name = "" + Lt(y) : e.removeAttribute("name");
  }
  function yd(e, n, i, l, c, s, m, y) {
    if (s != null && typeof s != "function" && typeof s != "symbol" && typeof s != "boolean" && (e.type = s), n != null || i != null) {
      if (!(s !== "submit" && s !== "reset" || n != null)) {
        Tu(e);
        return;
      }
      i = i != null ? "" + Lt(i) : "", n = n != null ? "" + Lt(n) : i, y || n === e.value || (e.value = n), e.defaultValue = n;
    }
    l = l ?? c, l = typeof l != "function" && typeof l != "symbol" && !!l, e.checked = y ? e.checked : !!l, e.defaultChecked = !!l, m != null && typeof m != "function" && typeof m != "symbol" && typeof m != "boolean" && (e.name = m), Tu(e);
  }
  function wu(e, n, i) {
    n === "number" && vl(e.ownerDocument) === e || e.defaultValue === "" + i || (e.defaultValue = "" + i);
  }
  function ni(e, n, i, l) {
    if (e = e.options, n) {
      n = {};
      for (var c = 0; c < i.length; c++) n["$" + i[c]] = !0;
      for (i = 0; i < e.length; i++) c = n.hasOwnProperty("$" + e[i].value), e[i].selected !== c && (e[i].selected = c), c && l && (e[i].defaultSelected = !0);
    } else {
      for (i = "" + Lt(i), n = null, c = 0; c < e.length; c++) {
        if (e[c].value === i) {
          e[c].selected = !0, l && (e[c].defaultSelected = !0);
          return;
        }
        n !== null || e[c].disabled || (n = e[c]);
      }
      n !== null && (n.selected = !0);
    }
  }
  function bd(e, n, i) {
    if (n != null && (n = "" + Lt(n), n !== e.value && (e.value = n), i == null)) {
      e.defaultValue !== n && (e.defaultValue = n);
      return;
    }
    e.defaultValue = i != null ? "" + Lt(i) : "";
  }
  function _d(e, n, i, l) {
    if (n == null) {
      if (l != null) {
        if (i != null) throw Error(u(92));
        if (Q(l)) {
          if (1 < l.length) throw Error(u(93));
          l = l[0];
        }
        i = l;
      }
      i ??= "", n = i;
    }
    i = Lt(n), e.defaultValue = i, l = e.textContent, l === i && l !== "" && l !== null && (e.value = l), Tu(e);
  }
  function ai(e, n) {
    if (n) {
      var i = e.firstChild;
      if (i && i === e.lastChild && i.nodeType === 3) {
        i.nodeValue = n;
        return;
      }
    }
    e.textContent = n;
  }
  var Jy = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));
  function Ed(e, n, i) {
    var l = n.indexOf("--") === 0;
    i == null || typeof i == "boolean" || i === "" ? l ? e.setProperty(n, "") : n === "float" ? e.cssFloat = "" : e[n] = "" : l ? e.setProperty(n, i) : typeof i != "number" || i === 0 || Jy.has(n) ? n === "float" ? e.cssFloat = i : e[n] = ("" + i).trim() : e[n] = i + "px";
  }
  function Sd(e, n, i) {
    if (n != null && typeof n != "object") throw Error(u(62));
    if (e = e.style, i != null) {
      for (var l in i) !i.hasOwnProperty(l) || n != null && n.hasOwnProperty(l) || (l.indexOf("--") === 0 ? e.setProperty(l, "") : l === "float" ? e.cssFloat = "" : e[l] = "");
      for (var c in n) l = n[c], n.hasOwnProperty(c) && i[c] !== l && Ed(e, c, l);
    } else for (var s in n) n.hasOwnProperty(s) && Ed(e, s, n[s]);
  }
  function Cu(e) {
    if (e.indexOf("-") === -1) return !1;
    switch (e) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  var e1 = /* @__PURE__ */ new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]), t1 = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function pl(e) {
    return t1.test("" + e) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : e;
  }
  function Sn() {
  }
  var Ou = null;
  function Ru(e) {
    return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
  }
  var ii = null, ri = null;
  function Td(e) {
    var n = Ja(e);
    if (n && (e = n.stateNode)) {
      var i = e[mt] || null;
      e: switch (e = n.stateNode, n.type) {
        case "input":
          if (Au(e, i.value, i.defaultValue, i.defaultValue, i.checked, i.defaultChecked, i.type, i.name), n = i.name, i.type === "radio" && n != null) {
            for (i = e; i.parentNode; ) i = i.parentNode;
            for (i = i.querySelectorAll('input[name="' + Ut("" + n) + '"][type="radio"]'), n = 0; n < i.length; n++) {
              var l = i[n];
              if (l !== e && l.form === e.form) {
                var c = l[mt] || null;
                if (!c) throw Error(u(90));
                Au(l, c.value, c.defaultValue, c.defaultValue, c.checked, c.defaultChecked, c.type, c.name);
              }
            }
            for (n = 0; n < i.length; n++) l = i[n], l.form === e.form && gd(l);
          }
          break e;
        case "textarea":
          bd(e, i.value, i.defaultValue);
          break e;
        case "select":
          n = i.value, n != null && ni(e, !!i.multiple, n, !1);
      }
    }
  }
  var Mu = !1;
  function Ad(e, n, i) {
    if (Mu) return e(n, i);
    Mu = !0;
    try {
      return e(n);
    } finally {
      if (Mu = !1, (ii !== null || ri !== null) && (ao(), ii && (n = ii, e = ri, ri = ii = null, Td(n), e)))
        for (n = 0; n < e.length; n++) Td(e[n]);
    }
  }
  function ar(e, n) {
    var i = e.stateNode;
    if (i === null) return null;
    var l = i[mt] || null;
    if (l === null) return null;
    i = l[n];
    e: switch (n) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (l = !l.disabled) || (e = e.type, l = !(e === "button" || e === "input" || e === "select" || e === "textarea")), e = !l;
        break e;
      default:
        e = !1;
    }
    if (e) return null;
    if (i && typeof i != "function") throw Error(u(231, n, typeof i));
    return i;
  }
  var Tn = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), Du = !1;
  if (Tn) try {
    var ir = {};
    Object.defineProperty(ir, "passive", { get: function() {
      Du = !0;
    } }), window.addEventListener("test", ir, ir), window.removeEventListener("test", ir, ir);
  } catch {
    Du = !1;
  }
  var $n = null, Nu = null, gl = null;
  function wd() {
    if (gl) return gl;
    var e, n = Nu, i = n.length, l, c = "value" in $n ? $n.value : $n.textContent, s = c.length;
    for (e = 0; e < i && n[e] === c[e]; e++) ;
    var m = i - e;
    for (l = 1; l <= m && n[i - l] === c[s - l]; l++) ;
    return gl = c.slice(e, 1 < l ? 1 - l : void 0);
  }
  function yl(e) {
    var n = e.keyCode;
    return "charCode" in e ? (e = e.charCode, e === 0 && n === 13 && (e = 13)) : e = n, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
  }
  function bl() {
    return !0;
  }
  function Cd() {
    return !1;
  }
  function vt(e) {
    function n(i, l, c, s, m) {
      this._reactName = i, this._targetInst = c, this.type = l, this.nativeEvent = s, this.target = m, this.currentTarget = null;
      for (var y in e) e.hasOwnProperty(y) && (i = e[y], this[y] = i ? i(s) : s[y]);
      return this.isDefaultPrevented = (s.defaultPrevented != null ? s.defaultPrevented : s.returnValue === !1) ? bl : Cd, this.isPropagationStopped = Cd, this;
    }
    return E(n.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var i = this.nativeEvent;
        i && (i.preventDefault ? i.preventDefault() : typeof i.returnValue != "unknown" && (i.returnValue = !1), this.isDefaultPrevented = bl);
      },
      stopPropagation: function() {
        var i = this.nativeEvent;
        i && (i.stopPropagation ? i.stopPropagation() : typeof i.cancelBubble != "unknown" && (i.cancelBubble = !0), this.isPropagationStopped = bl);
      },
      persist: function() {
      },
      isPersistent: bl
    }), n;
  }
  var wa = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(e) {
      return e.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, _l = vt(wa), rr = E({}, wa, {
    view: 0,
    detail: 0
  }), n1 = vt(rr), zu, xu, lr, El = E({}, rr, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: Lu,
    button: 0,
    buttons: 0,
    relatedTarget: function(e) {
      return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
    },
    movementX: function(e) {
      return "movementX" in e ? e.movementX : (e !== lr && (lr && e.type === "mousemove" ? (zu = e.screenX - lr.screenX, xu = e.screenY - lr.screenY) : xu = zu = 0, lr = e), zu);
    },
    movementY: function(e) {
      return "movementY" in e ? e.movementY : xu;
    }
  }), Od = vt(El), a1 = vt(E({}, El, { dataTransfer: 0 })), Hu = vt(E({}, rr, { relatedTarget: 0 })), i1 = vt(E({}, wa, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  })), r1 = vt(E({}, wa, { clipboardData: function(e) {
    return "clipboardData" in e ? e.clipboardData : window.clipboardData;
  } })), Rd = vt(E({}, wa, { data: 0 })), l1 = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, o1 = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, u1 = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function c1(e) {
    var n = this.nativeEvent;
    return n.getModifierState ? n.getModifierState(e) : (e = u1[e]) ? !!n[e] : !1;
  }
  function Lu() {
    return c1;
  }
  var s1 = vt(E({}, rr, {
    key: function(e) {
      if (e.key) {
        var n = l1[e.key] || e.key;
        if (n !== "Unidentified") return n;
      }
      return e.type === "keypress" ? (e = yl(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? o1[e.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: Lu,
    charCode: function(e) {
      return e.type === "keypress" ? yl(e) : 0;
    },
    keyCode: function(e) {
      return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
    },
    which: function(e) {
      return e.type === "keypress" ? yl(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
    }
  })), Md = vt(E({}, El, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  })), f1 = vt(E({}, rr, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: Lu
  })), d1 = vt(E({}, wa, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  })), h1 = vt(E({}, El, {
    deltaX: function(e) {
      return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
    },
    deltaY: function(e) {
      return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  })), m1 = vt(E({}, wa, {
    newState: 0,
    oldState: 0
  })), v1 = [
    9,
    13,
    27,
    32
  ], Uu = Tn && "CompositionEvent" in window, or = null;
  Tn && "documentMode" in document && (or = document.documentMode);
  var p1 = Tn && "TextEvent" in window && !or, Dd = Tn && (!Uu || or && 8 < or && 11 >= or), Nd = " ", zd = !1;
  function xd(e, n) {
    switch (e) {
      case "keyup":
        return v1.indexOf(n.keyCode) !== -1;
      case "keydown":
        return n.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function Hd(e) {
    return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
  }
  var li = !1;
  function g1(e, n) {
    switch (e) {
      case "compositionend":
        return Hd(n);
      case "keypress":
        return n.which !== 32 ? null : (zd = !0, Nd);
      case "textInput":
        return e = n.data, e === Nd && zd ? null : e;
      default:
        return null;
    }
  }
  function y1(e, n) {
    if (li) return e === "compositionend" || !Uu && xd(e, n) ? (e = wd(), gl = Nu = $n = null, li = !1, e) : null;
    switch (e) {
      case "paste":
        return null;
      case "keypress":
        if (!(n.ctrlKey || n.altKey || n.metaKey) || n.ctrlKey && n.altKey) {
          if (n.char && 1 < n.char.length) return n.char;
          if (n.which) return String.fromCharCode(n.which);
        }
        return null;
      case "compositionend":
        return Dd && n.locale !== "ko" ? null : n.data;
      default:
        return null;
    }
  }
  var b1 = {
    color: !0,
    date: !0,
    datetime: !0,
    "datetime-local": !0,
    email: !0,
    month: !0,
    number: !0,
    password: !0,
    range: !0,
    search: !0,
    tel: !0,
    text: !0,
    time: !0,
    url: !0,
    week: !0
  };
  function Ld(e) {
    var n = e && e.nodeName && e.nodeName.toLowerCase();
    return n === "input" ? !!b1[e.type] : n === "textarea";
  }
  function Ud(e, n, i, l) {
    ii ? ri ? ri.push(l) : ri = [l] : ii = l, n = so(n, "onChange"), 0 < n.length && (i = new _l("onChange", "change", null, i, l), e.push({
      event: i,
      listeners: n
    }));
  }
  var ur = null, cr = null;
  function _1(e) {
    vv(e, 0);
  }
  function Sl(e) {
    if (gd(nr(e))) return e;
  }
  function Bd(e, n) {
    if (e === "change") return n;
  }
  var jd = !1;
  if (Tn) {
    var Bu;
    if (Tn) {
      var ju = "oninput" in document;
      if (!ju) {
        var Zd = document.createElement("div");
        Zd.setAttribute("oninput", "return;"), ju = typeof Zd.oninput == "function";
      }
      Bu = ju;
    } else Bu = !1;
    jd = Bu && (!document.documentMode || 9 < document.documentMode);
  }
  function Gd() {
    ur && (ur.detachEvent("onpropertychange", Pd), cr = ur = null);
  }
  function Pd(e) {
    if (e.propertyName === "value" && Sl(cr)) {
      var n = [];
      Ud(n, cr, e, Ru(e)), Ad(_1, n);
    }
  }
  function E1(e, n, i) {
    e === "focusin" ? (Gd(), ur = n, cr = i, ur.attachEvent("onpropertychange", Pd)) : e === "focusout" && Gd();
  }
  function S1(e) {
    if (e === "selectionchange" || e === "keyup" || e === "keydown") return Sl(cr);
  }
  function T1(e, n) {
    if (e === "click") return Sl(n);
  }
  function A1(e, n) {
    if (e === "input" || e === "change") return Sl(n);
  }
  function w1(e, n) {
    return e === n && (e !== 0 || 1 / e === 1 / n) || e !== e && n !== n;
  }
  var Ct = typeof Object.is == "function" ? Object.is : w1;
  function sr(e, n) {
    if (Ct(e, n)) return !0;
    if (typeof e != "object" || e === null || typeof n != "object" || n === null) return !1;
    var i = Object.keys(e), l = Object.keys(n);
    if (i.length !== l.length) return !1;
    for (l = 0; l < i.length; l++) {
      var c = i[l];
      if (!pu.call(n, c) || !Ct(e[c], n[c])) return !1;
    }
    return !0;
  }
  function Xd(e) {
    for (; e && e.firstChild; ) e = e.firstChild;
    return e;
  }
  function kd(e, n) {
    var i = Xd(e);
    e = 0;
    for (var l; i; ) {
      if (i.nodeType === 3) {
        if (l = e + i.textContent.length, e <= n && l >= n) return {
          node: i,
          offset: n - e
        };
        e = l;
      }
      e: {
        for (; i; ) {
          if (i.nextSibling) {
            i = i.nextSibling;
            break e;
          }
          i = i.parentNode;
        }
        i = void 0;
      }
      i = Xd(i);
    }
  }
  function Vd(e, n) {
    return e && n ? e === n ? !0 : e && e.nodeType === 3 ? !1 : n && n.nodeType === 3 ? Vd(e, n.parentNode) : "contains" in e ? e.contains(n) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(n) & 16) : !1 : !1;
  }
  function Yd(e) {
    e = e != null && e.ownerDocument != null && e.ownerDocument.defaultView != null ? e.ownerDocument.defaultView : window;
    for (var n = vl(e.document); n instanceof e.HTMLIFrameElement; ) {
      try {
        var i = typeof n.contentWindow.location.href == "string";
      } catch {
        i = !1;
      }
      if (i) e = n.contentWindow;
      else break;
      n = vl(e.document);
    }
    return n;
  }
  function Zu(e) {
    var n = e && e.nodeName && e.nodeName.toLowerCase();
    return n && (n === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || n === "textarea" || e.contentEditable === "true");
  }
  var C1 = Tn && "documentMode" in document && 11 >= document.documentMode, oi = null, Gu = null, fr = null, Pu = !1;
  function qd(e, n, i) {
    var l = i.window === i ? i.document : i.nodeType === 9 ? i : i.ownerDocument;
    Pu || oi == null || oi !== vl(l) || (l = oi, "selectionStart" in l && Zu(l) ? l = {
      start: l.selectionStart,
      end: l.selectionEnd
    } : (l = (l.ownerDocument && l.ownerDocument.defaultView || window).getSelection(), l = {
      anchorNode: l.anchorNode,
      anchorOffset: l.anchorOffset,
      focusNode: l.focusNode,
      focusOffset: l.focusOffset
    }), fr && sr(fr, l) || (fr = l, l = so(Gu, "onSelect"), 0 < l.length && (n = new _l("onSelect", "select", null, n, i), e.push({
      event: n,
      listeners: l
    }), n.target = oi)));
  }
  function Ca(e, n) {
    var i = {};
    return i[e.toLowerCase()] = n.toLowerCase(), i["Webkit" + e] = "webkit" + n, i["Moz" + e] = "moz" + n, i;
  }
  var ui = {
    animationend: Ca("Animation", "AnimationEnd"),
    animationiteration: Ca("Animation", "AnimationIteration"),
    animationstart: Ca("Animation", "AnimationStart"),
    transitionrun: Ca("Transition", "TransitionRun"),
    transitionstart: Ca("Transition", "TransitionStart"),
    transitioncancel: Ca("Transition", "TransitionCancel"),
    transitionend: Ca("Transition", "TransitionEnd")
  }, Xu = {}, Id = {};
  Tn && (Id = document.createElement("div").style, "AnimationEvent" in window || (delete ui.animationend.animation, delete ui.animationiteration.animation, delete ui.animationstart.animation), "TransitionEvent" in window || delete ui.transitionend.transition);
  function Oa(e) {
    if (Xu[e]) return Xu[e];
    if (!ui[e]) return e;
    var n = ui[e], i;
    for (i in n) if (n.hasOwnProperty(i) && i in Id) return Xu[e] = n[i];
    return e;
  }
  var $d = Oa("animationend"), Fd = Oa("animationiteration"), Qd = Oa("animationstart"), O1 = Oa("transitionrun"), R1 = Oa("transitionstart"), M1 = Oa("transitioncancel"), Wd = Oa("transitionend"), Kd = /* @__PURE__ */ new Map(), ku = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  ku.push("scrollEnd");
  function Kt(e, n) {
    Kd.set(e, n), Aa(n, [e]);
  }
  var Tl = typeof reportError == "function" ? reportError : function(e) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var n = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof e == "object" && e !== null && typeof e.message == "string" ? String(e.message) : String(e),
        error: e
      });
      if (!window.dispatchEvent(n)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", e);
      return;
    }
    console.error(e);
  }, Bt = [], ci = 0, Vu = 0;
  function Al() {
    for (var e = ci, n = Vu = ci = 0; n < e; ) {
      var i = Bt[n];
      Bt[n++] = null;
      var l = Bt[n];
      Bt[n++] = null;
      var c = Bt[n];
      Bt[n++] = null;
      var s = Bt[n];
      if (Bt[n++] = null, l !== null && c !== null) {
        var m = l.pending;
        m === null ? c.next = c : (c.next = m.next, m.next = c), l.pending = c;
      }
      s !== 0 && Jd(i, c, s);
    }
  }
  function wl(e, n, i, l) {
    Bt[ci++] = e, Bt[ci++] = n, Bt[ci++] = i, Bt[ci++] = l, Vu |= l, e.lanes |= l, e = e.alternate, e !== null && (e.lanes |= l);
  }
  function Yu(e, n, i, l) {
    return wl(e, n, i, l), Cl(e);
  }
  function Ra(e, n) {
    return wl(e, null, null, n), Cl(e);
  }
  function Jd(e, n, i) {
    e.lanes |= i;
    var l = e.alternate;
    l !== null && (l.lanes |= i);
    for (var c = !1, s = e.return; s !== null; ) s.childLanes |= i, l = s.alternate, l !== null && (l.childLanes |= i), s.tag === 22 && (e = s.stateNode, e === null || e._visibility & 1 || (c = !0)), e = s, s = s.return;
    return e.tag === 3 ? (s = e.stateNode, c && n !== null && (c = 31 - wt(i), e = s.hiddenUpdates, l = e[c], l === null ? e[c] = [n] : l.push(n), n.lane = i | 536870912), s) : null;
  }
  function Cl(e) {
    if (50 < xr) throw xr = 0, es = null, Error(u(185));
    for (var n = e.return; n !== null; ) e = n, n = e.return;
    return e.tag === 3 ? e.stateNode : null;
  }
  var si = {};
  function D1(e, n, i, l) {
    this.tag = e, this.key = i, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = n, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = l, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function Ot(e, n, i, l) {
    return new D1(e, n, i, l);
  }
  function qu(e) {
    return e = e.prototype, !(!e || !e.isReactComponent);
  }
  function An(e, n) {
    var i = e.alternate;
    return i === null ? (i = Ot(e.tag, n, e.key, e.mode), i.elementType = e.elementType, i.type = e.type, i.stateNode = e.stateNode, i.alternate = e, e.alternate = i) : (i.pendingProps = n, i.type = e.type, i.flags = 0, i.subtreeFlags = 0, i.deletions = null), i.flags = e.flags & 65011712, i.childLanes = e.childLanes, i.lanes = e.lanes, i.child = e.child, i.memoizedProps = e.memoizedProps, i.memoizedState = e.memoizedState, i.updateQueue = e.updateQueue, n = e.dependencies, i.dependencies = n === null ? null : {
      lanes: n.lanes,
      firstContext: n.firstContext
    }, i.sibling = e.sibling, i.index = e.index, i.ref = e.ref, i.refCleanup = e.refCleanup, i;
  }
  function eh(e, n) {
    e.flags &= 65011714;
    var i = e.alternate;
    return i === null ? (e.childLanes = 0, e.lanes = n, e.child = null, e.subtreeFlags = 0, e.memoizedProps = null, e.memoizedState = null, e.updateQueue = null, e.dependencies = null, e.stateNode = null) : (e.childLanes = i.childLanes, e.lanes = i.lanes, e.child = i.child, e.subtreeFlags = 0, e.deletions = null, e.memoizedProps = i.memoizedProps, e.memoizedState = i.memoizedState, e.updateQueue = i.updateQueue, e.type = i.type, n = i.dependencies, e.dependencies = n === null ? null : {
      lanes: n.lanes,
      firstContext: n.firstContext
    }), e;
  }
  function Ol(e, n, i, l, c, s) {
    var m = 0;
    if (l = e, typeof e == "function") qu(e) && (m = 1);
    else if (typeof e == "string") m = Ub(e, i, ae.current) ? 26 : e === "html" || e === "head" || e === "body" ? 27 : 5;
    else e: switch (e) {
      case ne:
        return e = Ot(31, i, n, c), e.elementType = ne, e.lanes = s, e;
      case R:
        return Ma(i.children, c, s, n);
      case L:
        m = 8, c |= 24;
        break;
      case j:
        return e = Ot(12, i, n, c | 2), e.elementType = j, e.lanes = s, e;
      case B:
        return e = Ot(13, i, n, c), e.elementType = B, e.lanes = s, e;
      case I:
        return e = Ot(19, i, n, c), e.elementType = I, e.lanes = s, e;
      default:
        if (typeof e == "object" && e !== null) switch (e.$$typeof) {
          case N:
            m = 10;
            break e;
          case G:
            m = 9;
            break e;
          case X:
            m = 11;
            break e;
          case H:
            m = 14;
            break e;
          case K:
            m = 16, l = null;
            break e;
        }
        m = 29, i = Error(u(130, e === null ? "null" : typeof e, "")), l = null;
    }
    return n = Ot(m, i, n, c), n.elementType = e, n.type = l, n.lanes = s, n;
  }
  function Ma(e, n, i, l) {
    return e = Ot(7, e, l, n), e.lanes = i, e;
  }
  function Iu(e, n, i) {
    return e = Ot(6, e, null, n), e.lanes = i, e;
  }
  function th(e) {
    var n = Ot(18, null, null, 0);
    return n.stateNode = e, n;
  }
  function $u(e, n, i) {
    return n = Ot(4, e.children !== null ? e.children : [], e.key, n), n.lanes = i, n.stateNode = {
      containerInfo: e.containerInfo,
      pendingChildren: null,
      implementation: e.implementation
    }, n;
  }
  var nh = /* @__PURE__ */ new WeakMap();
  function jt(e, n) {
    if (typeof e == "object" && e !== null) {
      var i = nh.get(e);
      return i !== void 0 ? i : (n = {
        value: e,
        source: n,
        stack: ed(n)
      }, nh.set(e, n), n);
    }
    return {
      value: e,
      source: n,
      stack: ed(n)
    };
  }
  var fi = [], di = 0, Rl = null, dr = 0, Zt = [], Gt = 0, Fn = null, un = 1, cn = "";
  function wn(e, n) {
    fi[di++] = dr, fi[di++] = Rl, Rl = e, dr = n;
  }
  function ah(e, n, i) {
    Zt[Gt++] = un, Zt[Gt++] = cn, Zt[Gt++] = Fn, Fn = e;
    var l = un;
    e = cn;
    var c = 32 - wt(l) - 1;
    l &= ~(1 << c), i += 1;
    var s = 32 - wt(n) + c;
    if (30 < s) {
      var m = c - c % 5;
      s = (l & (1 << m) - 1).toString(32), l >>= m, c -= m, un = 1 << 32 - wt(n) + c | i << c | l, cn = s + e;
    } else un = 1 << s | i << c | l, cn = e;
  }
  function Fu(e) {
    e.return !== null && (wn(e, 1), ah(e, 1, 0));
  }
  function Qu(e) {
    for (; e === Rl; ) Rl = fi[--di], fi[di] = null, dr = fi[--di], fi[di] = null;
    for (; e === Fn; ) Fn = Zt[--Gt], Zt[Gt] = null, cn = Zt[--Gt], Zt[Gt] = null, un = Zt[--Gt], Zt[Gt] = null;
  }
  function ih(e, n) {
    Zt[Gt++] = un, Zt[Gt++] = cn, Zt[Gt++] = Fn, un = n.id, cn = n.overflow, Fn = e;
  }
  var ot = null, Be = null, Te = !1, Qn = null, Pt = !1, Wu = Error(u(519));
  function Wn(e) {
    throw hr(jt(Error(u(418, 1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML", "")), e)), Wu;
  }
  function rh(e) {
    var n = e.stateNode, i = e.type, l = e.memoizedProps;
    switch (n[lt] = e, n[mt] = l, i) {
      case "dialog":
        _e("cancel", n), _e("close", n);
        break;
      case "iframe":
      case "object":
      case "embed":
        _e("load", n);
        break;
      case "video":
      case "audio":
        for (i = 0; i < Lr.length; i++) _e(Lr[i], n);
        break;
      case "source":
        _e("error", n);
        break;
      case "img":
      case "image":
      case "link":
        _e("error", n), _e("load", n);
        break;
      case "details":
        _e("toggle", n);
        break;
      case "input":
        _e("invalid", n), yd(n, l.value, l.defaultValue, l.checked, l.defaultChecked, l.type, l.name, !0);
        break;
      case "select":
        _e("invalid", n);
        break;
      case "textarea":
        _e("invalid", n), _d(n, l.value, l.defaultValue, l.children);
    }
    i = l.children, typeof i != "string" && typeof i != "number" && typeof i != "bigint" || n.textContent === "" + i || l.suppressHydrationWarning === !0 || _v(n.textContent, i) ? (l.popover != null && (_e("beforetoggle", n), _e("toggle", n)), l.onScroll != null && _e("scroll", n), l.onScrollEnd != null && _e("scrollend", n), l.onClick != null && (n.onclick = Sn), n = !0) : n = !1, n || Wn(e, !0);
  }
  function lh(e) {
    for (ot = e.return; ot; ) switch (ot.tag) {
      case 5:
      case 31:
      case 13:
        Pt = !1;
        return;
      case 27:
      case 3:
        Pt = !0;
        return;
      default:
        ot = ot.return;
    }
  }
  function hi(e) {
    if (e !== ot) return !1;
    if (!Te) return lh(e), Te = !0, !1;
    var n = e.tag, i;
    if ((i = n !== 3 && n !== 27) && ((i = n === 5) && (i = e.type, i = !(i !== "form" && i !== "button") || ms(e.type, e.memoizedProps)), i = !i), i && Be && Wn(e), lh(e), n === 13) {
      if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(u(317));
      Be = Mv(e);
    } else if (n === 31) {
      if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(u(317));
      Be = Mv(e);
    } else n === 27 ? (n = Be, ca(e.type) ? (e = bs, bs = null, Be = e) : Be = n) : Be = ot ? Vt(e.stateNode.nextSibling) : null;
    return !0;
  }
  function Da() {
    Be = ot = null, Te = !1;
  }
  function Ku() {
    var e = Qn;
    return e !== null && (bt === null ? bt = e : bt.push.apply(bt, e), Qn = null), e;
  }
  function hr(e) {
    Qn === null ? Qn = [e] : Qn.push(e);
  }
  var Ju = C(null), Na = null, Cn = null;
  function Kn(e, n, i) {
    W(Ju, n._currentValue), n._currentValue = i;
  }
  function On(e) {
    e._currentValue = Ju.current, Y(Ju);
  }
  function ec(e, n, i) {
    for (; e !== null; ) {
      var l = e.alternate;
      if ((e.childLanes & n) !== n ? (e.childLanes |= n, l !== null && (l.childLanes |= n)) : l !== null && (l.childLanes & n) !== n && (l.childLanes |= n), e === i) break;
      e = e.return;
    }
  }
  function tc(e, n, i, l) {
    var c = e.child;
    for (c !== null && (c.return = e); c !== null; ) {
      var s = c.dependencies;
      if (s !== null) {
        var m = c.child;
        s = s.firstContext;
        e: for (; s !== null; ) {
          var y = s;
          s = c;
          for (var A = 0; A < n.length; A++) if (y.context === n[A]) {
            s.lanes |= i, y = s.alternate, y !== null && (y.lanes |= i), ec(s.return, i, e), l || (m = null);
            break e;
          }
          s = y.next;
        }
      } else if (c.tag === 18) {
        if (m = c.return, m === null) throw Error(u(341));
        m.lanes |= i, s = m.alternate, s !== null && (s.lanes |= i), ec(m, i, e), m = null;
      } else m = c.child;
      if (m !== null) m.return = c;
      else for (m = c; m !== null; ) {
        if (m === e) {
          m = null;
          break;
        }
        if (c = m.sibling, c !== null) {
          c.return = m.return, m = c;
          break;
        }
        m = m.return;
      }
      c = m;
    }
  }
  function mi(e, n, i, l) {
    e = null;
    for (var c = n, s = !1; c !== null; ) {
      if (!s) {
        if ((c.flags & 524288) !== 0) s = !0;
        else if ((c.flags & 262144) !== 0) break;
      }
      if (c.tag === 10) {
        var m = c.alternate;
        if (m === null) throw Error(u(387));
        if (m = m.memoizedProps, m !== null) {
          var y = c.type;
          Ct(c.pendingProps.value, m.value) || (e !== null ? e.push(y) : e = [y]);
        }
      } else if (c === we.current) {
        if (m = c.alternate, m === null) throw Error(u(387));
        m.memoizedState.memoizedState !== c.memoizedState.memoizedState && (e !== null ? e.push(Gr) : e = [Gr]);
      }
      c = c.return;
    }
    e !== null && tc(n, e, i, l), n.flags |= 262144;
  }
  function Ml(e) {
    for (e = e.firstContext; e !== null; ) {
      if (!Ct(e.context._currentValue, e.memoizedValue)) return !0;
      e = e.next;
    }
    return !1;
  }
  function za(e) {
    Na = e, Cn = null, e = e.dependencies, e !== null && (e.firstContext = null);
  }
  function ut(e) {
    return oh(Na, e);
  }
  function Dl(e, n) {
    return Na === null && za(e), oh(e, n);
  }
  function oh(e, n) {
    var i = n._currentValue;
    if (n = {
      context: n,
      memoizedValue: i,
      next: null
    }, Cn === null) {
      if (e === null) throw Error(u(308));
      Cn = n, e.dependencies = {
        lanes: 0,
        firstContext: n
      }, e.flags |= 524288;
    } else Cn = Cn.next = n;
    return i;
  }
  var N1 = typeof AbortController < "u" ? AbortController : function() {
    var e = [], n = this.signal = {
      aborted: !1,
      addEventListener: function(i, l) {
        e.push(l);
      }
    };
    this.abort = function() {
      n.aborted = !0, e.forEach(function(i) {
        return i();
      });
    };
  }, z1 = a.unstable_scheduleCallback, x1 = a.unstable_NormalPriority, Fe = {
    $$typeof: N,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function nc() {
    return {
      controller: new N1(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function mr(e) {
    e.refCount--, e.refCount === 0 && z1(x1, function() {
      e.controller.abort();
    });
  }
  var vr = null, ac = 0, vi = 0, pi = null;
  function H1(e, n) {
    if (vr === null) {
      var i = vr = [];
      ac = 0, vi = ls(), pi = {
        status: "pending",
        value: void 0,
        then: function(l) {
          i.push(l);
        }
      };
    }
    return ac++, n.then(uh, uh), n;
  }
  function uh() {
    if (--ac === 0 && vr !== null) {
      pi !== null && (pi.status = "fulfilled");
      var e = vr;
      vr = null, vi = 0, pi = null;
      for (var n = 0; n < e.length; n++) (0, e[n])();
    }
  }
  function L1(e, n) {
    var i = [], l = {
      status: "pending",
      value: null,
      reason: null,
      then: function(c) {
        i.push(c);
      }
    };
    return e.then(function() {
      l.status = "fulfilled", l.value = n;
      for (var c = 0; c < i.length; c++) (0, i[c])(n);
    }, function(c) {
      for (l.status = "rejected", l.reason = c, c = 0; c < i.length; c++) (0, i[c])(void 0);
    }), l;
  }
  var ch = k.S;
  k.S = function(e, n) {
    km = Tt(), typeof n == "object" && n !== null && typeof n.then == "function" && H1(e, n), ch !== null && ch(e, n);
  };
  var xa = C(null);
  function ic() {
    var e = xa.current;
    return e !== null ? e : Le.pooledCache;
  }
  function Nl(e, n) {
    n === null ? W(xa, xa.current) : W(xa, n.pool);
  }
  function sh() {
    var e = ic();
    return e === null ? null : {
      parent: Fe._currentValue,
      pool: e
    };
  }
  var gi = Error(u(460)), rc = Error(u(474)), zl = Error(u(542)), xl = { then: function() {
  } };
  function fh(e) {
    return e = e.status, e === "fulfilled" || e === "rejected";
  }
  function dh(e, n, i) {
    switch (i = e[i], i === void 0 ? e.push(n) : i !== n && (n.then(Sn, Sn), n = i), n.status) {
      case "fulfilled":
        return n.value;
      case "rejected":
        throw e = n.reason, mh(e), e;
      default:
        if (typeof n.status == "string") n.then(Sn, Sn);
        else {
          if (e = Le, e !== null && 100 < e.shellSuspendCounter) throw Error(u(482));
          e = n, e.status = "pending", e.then(function(l) {
            if (n.status === "pending") {
              var c = n;
              c.status = "fulfilled", c.value = l;
            }
          }, function(l) {
            if (n.status === "pending") {
              var c = n;
              c.status = "rejected", c.reason = l;
            }
          });
        }
        switch (n.status) {
          case "fulfilled":
            return n.value;
          case "rejected":
            throw e = n.reason, mh(e), e;
        }
        throw La = n, gi;
    }
  }
  function Ha(e) {
    try {
      var n = e._init;
      return n(e._payload);
    } catch (i) {
      throw i !== null && typeof i == "object" && typeof i.then == "function" ? (La = i, gi) : i;
    }
  }
  var La = null;
  function hh() {
    if (La === null) throw Error(u(459));
    var e = La;
    return La = null, e;
  }
  function mh(e) {
    if (e === gi || e === zl) throw Error(u(483));
  }
  var yi = null, pr = 0;
  function Hl(e) {
    var n = pr;
    return pr += 1, yi === null && (yi = []), dh(yi, e, n);
  }
  function gr(e, n) {
    n = n.props.ref, e.ref = n !== void 0 ? n : null;
  }
  function Ll(e, n) {
    throw n.$$typeof === S ? Error(u(525)) : (e = Object.prototype.toString.call(n), Error(u(31, e === "[object Object]" ? "object with keys {" + Object.keys(n).join(", ") + "}" : e)));
  }
  function vh(e) {
    function n(M, w) {
      if (e) {
        var z = M.deletions;
        z === null ? (M.deletions = [w], M.flags |= 16) : z.push(w);
      }
    }
    function i(M, w) {
      if (!e) return null;
      for (; w !== null; ) n(M, w), w = w.sibling;
      return null;
    }
    function l(M) {
      for (var w = /* @__PURE__ */ new Map(); M !== null; ) M.key !== null ? w.set(M.key, M) : w.set(M.index, M), M = M.sibling;
      return w;
    }
    function c(M, w) {
      return M = An(M, w), M.index = 0, M.sibling = null, M;
    }
    function s(M, w, z) {
      return M.index = z, e ? (z = M.alternate, z !== null ? (z = z.index, z < w ? (M.flags |= 67108866, w) : z) : (M.flags |= 67108866, w)) : (M.flags |= 1048576, w);
    }
    function m(M) {
      return e && M.alternate === null && (M.flags |= 67108866), M;
    }
    function y(M, w, z, V) {
      return w === null || w.tag !== 6 ? (w = Iu(z, M.mode, V), w.return = M, w) : (w = c(w, z), w.return = M, w);
    }
    function A(M, w, z, V) {
      var oe = z.type;
      return oe === R ? P(M, w, z.props.children, V, z.key) : w !== null && (w.elementType === oe || typeof oe == "object" && oe !== null && oe.$$typeof === K && Ha(oe) === w.type) ? (w = c(w, z.props), gr(w, z), w.return = M, w) : (w = Ol(z.type, z.key, z.props, null, M.mode, V), gr(w, z), w.return = M, w);
    }
    function x(M, w, z, V) {
      return w === null || w.tag !== 4 || w.stateNode.containerInfo !== z.containerInfo || w.stateNode.implementation !== z.implementation ? (w = $u(z, M.mode, V), w.return = M, w) : (w = c(w, z.children || []), w.return = M, w);
    }
    function P(M, w, z, V, oe) {
      return w === null || w.tag !== 7 ? (w = Ma(z, M.mode, V, oe), w.return = M, w) : (w = c(w, z), w.return = M, w);
    }
    function q(M, w, z) {
      if (typeof w == "string" && w !== "" || typeof w == "number" || typeof w == "bigint") return w = Iu("" + w, M.mode, z), w.return = M, w;
      if (typeof w == "object" && w !== null) {
        switch (w.$$typeof) {
          case O:
            return z = Ol(w.type, w.key, w.props, null, M.mode, z), gr(z, w), z.return = M, z;
          case T:
            return w = $u(w, M.mode, z), w.return = M, w;
          case K:
            return w = Ha(w), q(M, w, z);
        }
        if (Q(w) || he(w)) return w = Ma(w, M.mode, z, null), w.return = M, w;
        if (typeof w.then == "function") return q(M, Hl(w), z);
        if (w.$$typeof === N) return q(M, Dl(M, w), z);
        Ll(M, w);
      }
      return null;
    }
    function U(M, w, z, V) {
      var oe = w !== null ? w.key : null;
      if (typeof z == "string" && z !== "" || typeof z == "number" || typeof z == "bigint") return oe !== null ? null : y(M, w, "" + z, V);
      if (typeof z == "object" && z !== null) {
        switch (z.$$typeof) {
          case O:
            return z.key === oe ? A(M, w, z, V) : null;
          case T:
            return z.key === oe ? x(M, w, z, V) : null;
          case K:
            return z = Ha(z), U(M, w, z, V);
        }
        if (Q(z) || he(z)) return oe !== null ? null : P(M, w, z, V, null);
        if (typeof z.then == "function") return U(M, w, Hl(z), V);
        if (z.$$typeof === N) return U(M, w, Dl(M, z), V);
        Ll(M, z);
      }
      return null;
    }
    function Z(M, w, z, V, oe) {
      if (typeof V == "string" && V !== "" || typeof V == "number" || typeof V == "bigint") return M = M.get(z) || null, y(w, M, "" + V, oe);
      if (typeof V == "object" && V !== null) {
        switch (V.$$typeof) {
          case O:
            return M = M.get(V.key === null ? z : V.key) || null, A(w, M, V, oe);
          case T:
            return M = M.get(V.key === null ? z : V.key) || null, x(w, M, V, oe);
          case K:
            return V = Ha(V), Z(M, w, z, V, oe);
        }
        if (Q(V) || he(V)) return M = M.get(z) || null, P(w, M, V, oe, null);
        if (typeof V.then == "function") return Z(M, w, z, Hl(V), oe);
        if (V.$$typeof === N) return Z(M, w, z, Dl(w, V), oe);
        Ll(w, V);
      }
      return null;
    }
    function ie(M, w, z, V) {
      for (var oe = null, Oe = null, le = w, pe = w = 0, Se = null; le !== null && pe < z.length; pe++) {
        le.index > pe ? (Se = le, le = null) : Se = le.sibling;
        var Re = U(M, le, z[pe], V);
        if (Re === null) {
          le === null && (le = Se);
          break;
        }
        e && le && Re.alternate === null && n(M, le), w = s(Re, w, pe), Oe === null ? oe = Re : Oe.sibling = Re, Oe = Re, le = Se;
      }
      if (pe === z.length) return i(M, le), Te && wn(M, pe), oe;
      if (le === null) {
        for (; pe < z.length; pe++) le = q(M, z[pe], V), le !== null && (w = s(le, w, pe), Oe === null ? oe = le : Oe.sibling = le, Oe = le);
        return Te && wn(M, pe), oe;
      }
      for (le = l(le); pe < z.length; pe++) Se = Z(le, M, pe, z[pe], V), Se !== null && (e && Se.alternate !== null && le.delete(Se.key === null ? pe : Se.key), w = s(Se, w, pe), Oe === null ? oe = Se : Oe.sibling = Se, Oe = Se);
      return e && le.forEach(function(ma) {
        return n(M, ma);
      }), Te && wn(M, pe), oe;
    }
    function ue(M, w, z, V) {
      if (z == null) throw Error(u(151));
      for (var oe = null, Oe = null, le = w, pe = w = 0, Se = null, Re = z.next(); le !== null && !Re.done; pe++, Re = z.next()) {
        le.index > pe ? (Se = le, le = null) : Se = le.sibling;
        var ma = U(M, le, Re.value, V);
        if (ma === null) {
          le === null && (le = Se);
          break;
        }
        e && le && ma.alternate === null && n(M, le), w = s(ma, w, pe), Oe === null ? oe = ma : Oe.sibling = ma, Oe = ma, le = Se;
      }
      if (Re.done) return i(M, le), Te && wn(M, pe), oe;
      if (le === null) {
        for (; !Re.done; pe++, Re = z.next()) Re = q(M, Re.value, V), Re !== null && (w = s(Re, w, pe), Oe === null ? oe = Re : Oe.sibling = Re, Oe = Re);
        return Te && wn(M, pe), oe;
      }
      for (le = l(le); !Re.done; pe++, Re = z.next()) Re = Z(le, M, pe, Re.value, V), Re !== null && (e && Re.alternate !== null && le.delete(Re.key === null ? pe : Re.key), w = s(Re, w, pe), Oe === null ? oe = Re : Oe.sibling = Re, Oe = Re);
      return e && le.forEach(function(Qb) {
        return n(M, Qb);
      }), Te && wn(M, pe), oe;
    }
    function He(M, w, z, V) {
      if (typeof z == "object" && z !== null && z.type === R && z.key === null && (z = z.props.children), typeof z == "object" && z !== null) {
        switch (z.$$typeof) {
          case O:
            e: {
              for (var oe = z.key; w !== null; ) {
                if (w.key === oe) {
                  if (oe = z.type, oe === R) {
                    if (w.tag === 7) {
                      i(M, w.sibling), V = c(w, z.props.children), V.return = M, M = V;
                      break e;
                    }
                  } else if (w.elementType === oe || typeof oe == "object" && oe !== null && oe.$$typeof === K && Ha(oe) === w.type) {
                    i(M, w.sibling), V = c(w, z.props), gr(V, z), V.return = M, M = V;
                    break e;
                  }
                  i(M, w);
                  break;
                } else n(M, w);
                w = w.sibling;
              }
              z.type === R ? (V = Ma(z.props.children, M.mode, V, z.key), V.return = M, M = V) : (V = Ol(z.type, z.key, z.props, null, M.mode, V), gr(V, z), V.return = M, M = V);
            }
            return m(M);
          case T:
            e: {
              for (oe = z.key; w !== null; ) {
                if (w.key === oe) if (w.tag === 4 && w.stateNode.containerInfo === z.containerInfo && w.stateNode.implementation === z.implementation) {
                  i(M, w.sibling), V = c(w, z.children || []), V.return = M, M = V;
                  break e;
                } else {
                  i(M, w);
                  break;
                }
                else n(M, w);
                w = w.sibling;
              }
              V = $u(z, M.mode, V), V.return = M, M = V;
            }
            return m(M);
          case K:
            return z = Ha(z), He(M, w, z, V);
        }
        if (Q(z)) return ie(M, w, z, V);
        if (he(z)) {
          if (oe = he(z), typeof oe != "function") throw Error(u(150));
          return z = oe.call(z), ue(M, w, z, V);
        }
        if (typeof z.then == "function") return He(M, w, Hl(z), V);
        if (z.$$typeof === N) return He(M, w, Dl(M, z), V);
        Ll(M, z);
      }
      return typeof z == "string" && z !== "" || typeof z == "number" || typeof z == "bigint" ? (z = "" + z, w !== null && w.tag === 6 ? (i(M, w.sibling), V = c(w, z), V.return = M, M = V) : (i(M, w), V = Iu(z, M.mode, V), V.return = M, M = V), m(M)) : i(M, w);
    }
    return function(M, w, z, V) {
      try {
        pr = 0;
        var oe = He(M, w, z, V);
        return yi = null, oe;
      } catch (le) {
        if (le === gi || le === zl) throw le;
        var Oe = Ot(29, le, null, M.mode);
        return Oe.lanes = V, Oe.return = M, Oe;
      }
    };
  }
  var Ua = vh(!0), ph = vh(!1), Jn = !1;
  function lc(e) {
    e.updateQueue = {
      baseState: e.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: {
        pending: null,
        lanes: 0,
        hiddenCallbacks: null
      },
      callbacks: null
    };
  }
  function oc(e, n) {
    e = e.updateQueue, n.updateQueue === e && (n.updateQueue = {
      baseState: e.baseState,
      firstBaseUpdate: e.firstBaseUpdate,
      lastBaseUpdate: e.lastBaseUpdate,
      shared: e.shared,
      callbacks: null
    });
  }
  function Ba(e) {
    return {
      lane: e,
      tag: 0,
      payload: null,
      callback: null,
      next: null
    };
  }
  function ja(e, n, i) {
    var l = e.updateQueue;
    if (l === null) return null;
    if (l = l.shared, (Me & 2) !== 0) {
      var c = l.pending;
      return c === null ? n.next = n : (n.next = c.next, c.next = n), l.pending = n, n = Cl(e), Jd(e, null, i), n;
    }
    return wl(e, l, n, i), Cl(e);
  }
  function yr(e, n, i) {
    if (n = n.updateQueue, n !== null && (n = n.shared, (i & 4194048) !== 0)) {
      var l = n.lanes;
      l &= e.pendingLanes, i |= l, n.lanes = i, ld(e, i);
    }
  }
  function uc(e, n) {
    var i = e.updateQueue, l = e.alternate;
    if (l !== null && (l = l.updateQueue, i === l)) {
      var c = null, s = null;
      if (i = i.firstBaseUpdate, i !== null) {
        do {
          var m = {
            lane: i.lane,
            tag: i.tag,
            payload: i.payload,
            callback: null,
            next: null
          };
          s === null ? c = s = m : s = s.next = m, i = i.next;
        } while (i !== null);
        s === null ? c = s = n : s = s.next = n;
      } else c = s = n;
      i = {
        baseState: l.baseState,
        firstBaseUpdate: c,
        lastBaseUpdate: s,
        shared: l.shared,
        callbacks: l.callbacks
      }, e.updateQueue = i;
      return;
    }
    e = i.lastBaseUpdate, e === null ? i.firstBaseUpdate = n : e.next = n, i.lastBaseUpdate = n;
  }
  var cc = !1;
  function br() {
    if (cc) {
      var e = pi;
      if (e !== null) throw e;
    }
  }
  function _r(e, n, i, l) {
    cc = !1;
    var c = e.updateQueue;
    Jn = !1;
    var s = c.firstBaseUpdate, m = c.lastBaseUpdate, y = c.shared.pending;
    if (y !== null) {
      c.shared.pending = null;
      var A = y, x = A.next;
      A.next = null, m === null ? s = x : m.next = x, m = A;
      var P = e.alternate;
      P !== null && (P = P.updateQueue, y = P.lastBaseUpdate, y !== m && (y === null ? P.firstBaseUpdate = x : y.next = x, P.lastBaseUpdate = A));
    }
    if (s !== null) {
      var q = c.baseState;
      m = 0, P = x = A = null, y = s;
      do {
        var U = y.lane & -536870913, Z = U !== y.lane;
        if (Z ? (Ee & U) === U : (l & U) === U) {
          U !== 0 && U === vi && (cc = !0), P !== null && (P = P.next = {
            lane: 0,
            tag: y.tag,
            payload: y.payload,
            callback: null,
            next: null
          });
          e: {
            var ie = e, ue = y;
            U = n;
            var He = i;
            switch (ue.tag) {
              case 1:
                if (ie = ue.payload, typeof ie == "function") {
                  q = ie.call(He, q, U);
                  break e;
                }
                q = ie;
                break e;
              case 3:
                ie.flags = ie.flags & -65537 | 128;
              case 0:
                if (ie = ue.payload, U = typeof ie == "function" ? ie.call(He, q, U) : ie, U == null) break e;
                q = E({}, q, U);
                break e;
              case 2:
                Jn = !0;
            }
          }
          U = y.callback, U !== null && (e.flags |= 64, Z && (e.flags |= 8192), Z = c.callbacks, Z === null ? c.callbacks = [U] : Z.push(U));
        } else Z = {
          lane: U,
          tag: y.tag,
          payload: y.payload,
          callback: y.callback,
          next: null
        }, P === null ? (x = P = Z, A = q) : P = P.next = Z, m |= U;
        if (y = y.next, y === null) {
          if (y = c.shared.pending, y === null) break;
          Z = y, y = Z.next, Z.next = null, c.lastBaseUpdate = Z, c.shared.pending = null;
        }
      } while (!0);
      P === null && (A = q), c.baseState = A, c.firstBaseUpdate = x, c.lastBaseUpdate = P, s === null && (c.shared.lanes = 0), ia |= m, e.lanes = m, e.memoizedState = q;
    }
  }
  function gh(e, n) {
    if (typeof e != "function") throw Error(u(191, e));
    e.call(n);
  }
  function yh(e, n) {
    var i = e.callbacks;
    if (i !== null) for (e.callbacks = null, e = 0; e < i.length; e++) gh(i[e], n);
  }
  var bi = C(null), Ul = C(0);
  function bh(e, n) {
    e = Un, W(Ul, e), W(bi, n), Un = e | n.baseLanes;
  }
  function sc() {
    W(Ul, Un), W(bi, bi.current);
  }
  function fc() {
    Un = Ul.current, Y(bi), Y(Ul);
  }
  var Rt = C(null), Xt = null;
  function ea(e) {
    var n = e.alternate;
    W(Ie, Ie.current & 1), W(Rt, e), Xt === null && (n === null || bi.current !== null || n.memoizedState !== null) && (Xt = e);
  }
  function dc(e) {
    W(Ie, Ie.current), W(Rt, e), Xt === null && (Xt = e);
  }
  function _h(e) {
    e.tag === 22 ? (W(Ie, Ie.current), W(Rt, e), Xt === null && (Xt = e)) : ta(e);
  }
  function ta() {
    W(Ie, Ie.current), W(Rt, Rt.current);
  }
  function Mt(e) {
    Y(Rt), Xt === e && (Xt = null), Y(Ie);
  }
  var Ie = C(0);
  function Bl(e) {
    for (var n = e; n !== null; ) {
      if (n.tag === 13) {
        var i = n.memoizedState;
        if (i !== null && (i = i.dehydrated, i === null || gs(i) || ys(i))) return n;
      } else if (n.tag === 19 && (n.memoizedProps.revealOrder === "forwards" || n.memoizedProps.revealOrder === "backwards" || n.memoizedProps.revealOrder === "unstable_legacy-backwards" || n.memoizedProps.revealOrder === "together")) {
        if ((n.flags & 128) !== 0) return n;
      } else if (n.child !== null) {
        n.child.return = n, n = n.child;
        continue;
      }
      if (n === e) break;
      for (; n.sibling === null; ) {
        if (n.return === null || n.return === e) return null;
        n = n.return;
      }
      n.sibling.return = n.return, n = n.sibling;
    }
    return null;
  }
  var Rn = 0, me = null, ze = null, Qe = null, jl = !1, _i = !1, Za = !1, Zl = 0, Er = 0, Ei = null, U1 = 0;
  function Ve() {
    throw Error(u(321));
  }
  function hc(e, n) {
    if (n === null) return !1;
    for (var i = 0; i < n.length && i < e.length; i++) if (!Ct(e[i], n[i])) return !1;
    return !0;
  }
  function mc(e, n, i, l, c, s) {
    return Rn = s, me = n, n.memoizedState = null, n.updateQueue = null, n.lanes = 0, k.H = e === null || e.memoizedState === null ? am : Mc, Za = !1, s = i(l, c), Za = !1, _i && (s = Sh(n, i, l, c)), Eh(e), s;
  }
  function Eh(e) {
    k.H = Ar;
    var n = ze !== null && ze.next !== null;
    if (Rn = 0, Qe = ze = me = null, jl = !1, Er = 0, Ei = null, n) throw Error(u(300));
    e === null || We || (e = e.dependencies, e !== null && Ml(e) && (We = !0));
  }
  function Sh(e, n, i, l) {
    me = e;
    var c = 0;
    do {
      if (_i && (Ei = null), Er = 0, _i = !1, 25 <= c) throw Error(u(301));
      if (c += 1, Qe = ze = null, e.updateQueue != null) {
        var s = e.updateQueue;
        s.lastEffect = null, s.events = null, s.stores = null, s.memoCache != null && (s.memoCache.index = 0);
      }
      k.H = im, s = n(i, l);
    } while (_i);
    return s;
  }
  function B1() {
    var e = k.H, n = e.useState()[0];
    return n = typeof n.then == "function" ? Sr(n) : n, e = e.useState()[0], (ze !== null ? ze.memoizedState : null) !== e && (me.flags |= 1024), n;
  }
  function vc() {
    var e = Zl !== 0;
    return Zl = 0, e;
  }
  function pc(e, n, i) {
    n.updateQueue = e.updateQueue, n.flags &= -2053, e.lanes &= ~i;
  }
  function gc(e) {
    if (jl) {
      for (e = e.memoizedState; e !== null; ) {
        var n = e.queue;
        n !== null && (n.pending = null), e = e.next;
      }
      jl = !1;
    }
    Rn = 0, Qe = ze = me = null, _i = !1, Er = Zl = 0, Ei = null;
  }
  function dt() {
    var e = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return Qe === null ? me.memoizedState = Qe = e : Qe = Qe.next = e, Qe;
  }
  function $e() {
    if (ze === null) {
      var e = me.alternate;
      e = e !== null ? e.memoizedState : null;
    } else e = ze.next;
    var n = Qe === null ? me.memoizedState : Qe.next;
    if (n !== null) Qe = n, ze = e;
    else {
      if (e === null)
        throw me.alternate === null ? Error(u(467)) : Error(u(310));
      ze = e, e = {
        memoizedState: ze.memoizedState,
        baseState: ze.baseState,
        baseQueue: ze.baseQueue,
        queue: ze.queue,
        next: null
      }, Qe === null ? me.memoizedState = Qe = e : Qe = Qe.next = e;
    }
    return Qe;
  }
  function Gl() {
    return {
      lastEffect: null,
      events: null,
      stores: null,
      memoCache: null
    };
  }
  function Sr(e) {
    var n = Er;
    return Er += 1, Ei === null && (Ei = []), e = dh(Ei, e, n), n = me, (Qe === null ? n.memoizedState : Qe.next) === null && (n = n.alternate, k.H = n === null || n.memoizedState === null ? am : Mc), e;
  }
  function Pl(e) {
    if (e !== null && typeof e == "object") {
      if (typeof e.then == "function") return Sr(e);
      if (e.$$typeof === N) return ut(e);
    }
    throw Error(u(438, String(e)));
  }
  function yc(e) {
    var n = null, i = me.updateQueue;
    if (i !== null && (n = i.memoCache), n == null) {
      var l = me.alternate;
      l !== null && (l = l.updateQueue, l !== null && (l = l.memoCache, l != null && (n = {
        data: l.data.map(function(c) {
          return c.slice();
        }),
        index: 0
      })));
    }
    if (n ??= {
      data: [],
      index: 0
    }, i === null && (i = Gl(), me.updateQueue = i), i.memoCache = n, i = n.data[n.index], i === void 0) for (i = n.data[n.index] = Array(e), l = 0; l < e; l++) i[l] = J;
    return n.index++, i;
  }
  function Mn(e, n) {
    return typeof n == "function" ? n(e) : n;
  }
  function Xl(e) {
    return bc($e(), ze, e);
  }
  function bc(e, n, i) {
    var l = e.queue;
    if (l === null) throw Error(u(311));
    l.lastRenderedReducer = i;
    var c = e.baseQueue, s = l.pending;
    if (s !== null) {
      if (c !== null) {
        var m = c.next;
        c.next = s.next, s.next = m;
      }
      n.baseQueue = c = s, l.pending = null;
    }
    if (s = e.baseState, c === null) e.memoizedState = s;
    else {
      n = c.next;
      var y = m = null, A = null, x = n, P = !1;
      do {
        var q = x.lane & -536870913;
        if (q !== x.lane ? (Ee & q) === q : (Rn & q) === q) {
          var U = x.revertLane;
          if (U === 0) A !== null && (A = A.next = {
            lane: 0,
            revertLane: 0,
            gesture: null,
            action: x.action,
            hasEagerState: x.hasEagerState,
            eagerState: x.eagerState,
            next: null
          }), q === vi && (P = !0);
          else if ((Rn & U) === U) {
            x = x.next, U === vi && (P = !0);
            continue;
          } else q = {
            lane: 0,
            revertLane: x.revertLane,
            gesture: null,
            action: x.action,
            hasEagerState: x.hasEagerState,
            eagerState: x.eagerState,
            next: null
          }, A === null ? (y = A = q, m = s) : A = A.next = q, me.lanes |= U, ia |= U;
          q = x.action, Za && i(s, q), s = x.hasEagerState ? x.eagerState : i(s, q);
        } else U = {
          lane: q,
          revertLane: x.revertLane,
          gesture: x.gesture,
          action: x.action,
          hasEagerState: x.hasEagerState,
          eagerState: x.eagerState,
          next: null
        }, A === null ? (y = A = U, m = s) : A = A.next = U, me.lanes |= q, ia |= q;
        x = x.next;
      } while (x !== null && x !== n);
      if (A === null ? m = s : A.next = y, !Ct(s, e.memoizedState) && (We = !0, P && (i = pi, i !== null))) throw i;
      e.memoizedState = s, e.baseState = m, e.baseQueue = A, l.lastRenderedState = s;
    }
    return c === null && (l.lanes = 0), [e.memoizedState, l.dispatch];
  }
  function _c(e) {
    var n = $e(), i = n.queue;
    if (i === null) throw Error(u(311));
    i.lastRenderedReducer = e;
    var l = i.dispatch, c = i.pending, s = n.memoizedState;
    if (c !== null) {
      i.pending = null;
      var m = c = c.next;
      do
        s = e(s, m.action), m = m.next;
      while (m !== c);
      Ct(s, n.memoizedState) || (We = !0), n.memoizedState = s, n.baseQueue === null && (n.baseState = s), i.lastRenderedState = s;
    }
    return [s, l];
  }
  function Th(e, n, i) {
    var l = me, c = $e(), s = Te;
    if (s) {
      if (i === void 0) throw Error(u(407));
      i = i();
    } else i = n();
    var m = !Ct((ze || c).memoizedState, i);
    if (m && (c.memoizedState = i, We = !0), c = c.queue, Tc(Ch.bind(null, l, c, e), [e]), c.getSnapshot !== n || m || Qe !== null && Qe.memoizedState.tag & 1) {
      if (l.flags |= 2048, Si(9, { destroy: void 0 }, wh.bind(null, l, c, i, n), null), Le === null) throw Error(u(349));
      s || (Rn & 127) !== 0 || Ah(l, n, i);
    }
    return i;
  }
  function Ah(e, n, i) {
    e.flags |= 16384, e = {
      getSnapshot: n,
      value: i
    }, n = me.updateQueue, n === null ? (n = Gl(), me.updateQueue = n, n.stores = [e]) : (i = n.stores, i === null ? n.stores = [e] : i.push(e));
  }
  function wh(e, n, i, l) {
    n.value = i, n.getSnapshot = l, Oh(n) && Rh(e);
  }
  function Ch(e, n, i) {
    return i(function() {
      Oh(n) && Rh(e);
    });
  }
  function Oh(e) {
    var n = e.getSnapshot;
    e = e.value;
    try {
      var i = n();
      return !Ct(e, i);
    } catch {
      return !0;
    }
  }
  function Rh(e) {
    var n = Ra(e, 2);
    n !== null && _t(n, e, 2);
  }
  function Ec(e) {
    var n = dt();
    if (typeof e == "function") {
      var i = e;
      if (e = i(), Za) {
        qn(!0);
        try {
          i();
        } finally {
          qn(!1);
        }
      }
    }
    return n.memoizedState = n.baseState = e, n.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Mn,
      lastRenderedState: e
    }, n;
  }
  function Mh(e, n, i, l) {
    return e.baseState = i, bc(e, ze, typeof l == "function" ? l : Mn);
  }
  function j1(e, n, i, l, c) {
    if (Yl(e)) throw Error(u(485));
    if (e = n.action, e !== null) {
      var s = {
        payload: c,
        action: e,
        next: null,
        isTransition: !0,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function(m) {
          s.listeners.push(m);
        }
      };
      k.T !== null ? i(!0) : s.isTransition = !1, l(s), i = n.pending, i === null ? (s.next = n.pending = s, Dh(n, s)) : (s.next = i.next, n.pending = i.next = s);
    }
  }
  function Dh(e, n) {
    var i = n.action, l = n.payload, c = e.state;
    if (n.isTransition) {
      var s = k.T, m = {};
      k.T = m;
      try {
        var y = i(c, l), A = k.S;
        A !== null && A(m, y), Nh(e, n, y);
      } catch (x) {
        Sc(e, n, x);
      } finally {
        s !== null && m.types !== null && (s.types = m.types), k.T = s;
      }
    } else try {
      s = i(c, l), Nh(e, n, s);
    } catch (x) {
      Sc(e, n, x);
    }
  }
  function Nh(e, n, i) {
    i !== null && typeof i == "object" && typeof i.then == "function" ? i.then(function(l) {
      zh(e, n, l);
    }, function(l) {
      return Sc(e, n, l);
    }) : zh(e, n, i);
  }
  function zh(e, n, i) {
    n.status = "fulfilled", n.value = i, xh(n), e.state = i, n = e.pending, n !== null && (i = n.next, i === n ? e.pending = null : (i = i.next, n.next = i, Dh(e, i)));
  }
  function Sc(e, n, i) {
    var l = e.pending;
    if (e.pending = null, l !== null) {
      l = l.next;
      do
        n.status = "rejected", n.reason = i, xh(n), n = n.next;
      while (n !== l);
    }
    e.action = null;
  }
  function xh(e) {
    e = e.listeners;
    for (var n = 0; n < e.length; n++) (0, e[n])();
  }
  function Hh(e, n) {
    return n;
  }
  function Lh(e, n) {
    if (Te) {
      var i = Le.formState;
      if (i !== null) {
        e: {
          var l = me;
          if (Te) {
            if (Be) {
              t: {
                for (var c = Be, s = Pt; c.nodeType !== 8; ) {
                  if (!s) {
                    c = null;
                    break t;
                  }
                  if (c = Vt(c.nextSibling), c === null) {
                    c = null;
                    break t;
                  }
                }
                s = c.data, c = s === "F!" || s === "F" ? c : null;
              }
              if (c) {
                Be = Vt(c.nextSibling), l = c.data === "F!";
                break e;
              }
            }
            Wn(l);
          }
          l = !1;
        }
        l && (n = i[0]);
      }
    }
    return i = dt(), i.memoizedState = i.baseState = n, l = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Hh,
      lastRenderedState: n
    }, i.queue = l, i = em.bind(null, me, l), l.dispatch = i, l = Ec(!1), s = Rc.bind(null, me, !1, l.queue), l = dt(), c = {
      state: n,
      dispatch: null,
      action: e,
      pending: null
    }, l.queue = c, i = j1.bind(null, me, c, s, i), c.dispatch = i, l.memoizedState = e, [
      n,
      i,
      !1
    ];
  }
  function Uh(e) {
    return Bh($e(), ze, e);
  }
  function Bh(e, n, i) {
    if (n = bc(e, n, Hh)[0], e = Xl(Mn)[0], typeof n == "object" && n !== null && typeof n.then == "function") try {
      var l = Sr(n);
    } catch (m) {
      throw m === gi ? zl : m;
    }
    else l = n;
    n = $e();
    var c = n.queue, s = c.dispatch;
    return i !== n.memoizedState && (me.flags |= 2048, Si(9, { destroy: void 0 }, Z1.bind(null, c, i), null)), [
      l,
      s,
      e
    ];
  }
  function Z1(e, n) {
    e.action = n;
  }
  function jh(e) {
    var n = $e(), i = ze;
    if (i !== null) return Bh(n, i, e);
    $e(), n = n.memoizedState, i = $e();
    var l = i.queue.dispatch;
    return i.memoizedState = e, [
      n,
      l,
      !1
    ];
  }
  function Si(e, n, i, l) {
    return e = {
      tag: e,
      create: i,
      deps: l,
      inst: n,
      next: null
    }, n = me.updateQueue, n === null && (n = Gl(), me.updateQueue = n), i = n.lastEffect, i === null ? n.lastEffect = e.next = e : (l = i.next, i.next = e, e.next = l, n.lastEffect = e), e;
  }
  function Zh() {
    return $e().memoizedState;
  }
  function kl(e, n, i, l) {
    var c = dt();
    me.flags |= e, c.memoizedState = Si(1 | n, { destroy: void 0 }, i, l === void 0 ? null : l);
  }
  function Vl(e, n, i, l) {
    var c = $e();
    l = l === void 0 ? null : l;
    var s = c.memoizedState.inst;
    ze !== null && l !== null && hc(l, ze.memoizedState.deps) ? c.memoizedState = Si(n, s, i, l) : (me.flags |= e, c.memoizedState = Si(1 | n, s, i, l));
  }
  function Gh(e, n) {
    kl(8390656, 8, e, n);
  }
  function Tc(e, n) {
    Vl(2048, 8, e, n);
  }
  function G1(e) {
    me.flags |= 4;
    var n = me.updateQueue;
    if (n === null) n = Gl(), me.updateQueue = n, n.events = [e];
    else {
      var i = n.events;
      i === null ? n.events = [e] : i.push(e);
    }
  }
  function Ph(e) {
    var n = $e().memoizedState;
    return G1({
      ref: n,
      nextImpl: e
    }), function() {
      if ((Me & 2) !== 0) throw Error(u(440));
      return n.impl.apply(void 0, arguments);
    };
  }
  function Xh(e, n) {
    return Vl(4, 2, e, n);
  }
  function kh(e, n) {
    return Vl(4, 4, e, n);
  }
  function Vh(e, n) {
    if (typeof n == "function") {
      e = e();
      var i = n(e);
      return function() {
        typeof i == "function" ? i() : n(null);
      };
    }
    if (n != null) return e = e(), n.current = e, function() {
      n.current = null;
    };
  }
  function Yh(e, n, i) {
    i = i != null ? i.concat([e]) : null, Vl(4, 4, Vh.bind(null, n, e), i);
  }
  function Ac() {
  }
  function qh(e, n) {
    var i = $e();
    n = n === void 0 ? null : n;
    var l = i.memoizedState;
    return n !== null && hc(n, l[1]) ? l[0] : (i.memoizedState = [e, n], e);
  }
  function Ih(e, n) {
    var i = $e();
    n = n === void 0 ? null : n;
    var l = i.memoizedState;
    if (n !== null && hc(n, l[1])) return l[0];
    if (l = e(), Za) {
      qn(!0);
      try {
        e();
      } finally {
        qn(!1);
      }
    }
    return i.memoizedState = [l, n], l;
  }
  function wc(e, n, i) {
    return i === void 0 || (Rn & 1073741824) !== 0 && (Ee & 261930) === 0 ? e.memoizedState = n : (e.memoizedState = i, e = Ym(), me.lanes |= e, ia |= e, i);
  }
  function $h(e, n, i, l) {
    return Ct(i, n) ? i : bi.current !== null ? (e = wc(e, i, l), Ct(e, n) || (We = !0), e) : (Rn & 42) === 0 || (Rn & 1073741824) !== 0 && (Ee & 261930) === 0 ? (We = !0, e.memoizedState = i) : (e = Ym(), me.lanes |= e, ia |= e, n);
  }
  function Fh(e, n, i, l, c) {
    var s = $.p;
    $.p = s !== 0 && 8 > s ? s : 8;
    var m = k.T, y = {};
    k.T = y, Rc(e, !1, n, i);
    try {
      var A = c(), x = k.S;
      x !== null && x(y, A), A !== null && typeof A == "object" && typeof A.then == "function" ? Tr(e, n, L1(A, l), kt(e)) : Tr(e, n, l, kt(e));
    } catch (P) {
      Tr(e, n, {
        then: function() {
        },
        status: "rejected",
        reason: P
      }, kt());
    } finally {
      $.p = s, m !== null && y.types !== null && (m.types = y.types), k.T = m;
    }
  }
  function P1() {
  }
  function Cc(e, n, i, l) {
    if (e.tag !== 5) throw Error(u(476));
    var c = Qh(e).queue;
    Fh(e, c, n, ce, i === null ? P1 : function() {
      return Wh(e), i(l);
    });
  }
  function Qh(e) {
    var n = e.memoizedState;
    if (n !== null) return n;
    n = {
      memoizedState: ce,
      baseState: ce,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Mn,
        lastRenderedState: ce
      },
      next: null
    };
    var i = {};
    return n.next = {
      memoizedState: i,
      baseState: i,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Mn,
        lastRenderedState: i
      },
      next: null
    }, e.memoizedState = n, e = e.alternate, e !== null && (e.memoizedState = n), n;
  }
  function Wh(e) {
    var n = Qh(e);
    n.next === null && (n = e.alternate.memoizedState), Tr(e, n.next.queue, {}, kt());
  }
  function Oc() {
    return ut(Gr);
  }
  function Kh() {
    return $e().memoizedState;
  }
  function Jh() {
    return $e().memoizedState;
  }
  function X1(e) {
    for (var n = e.return; n !== null; ) {
      switch (n.tag) {
        case 24:
        case 3:
          var i = kt();
          e = Ba(i);
          var l = ja(n, e, i);
          l !== null && (_t(l, n, i), yr(l, n, i)), n = { cache: nc() }, e.payload = n;
          return;
      }
      n = n.return;
    }
  }
  function k1(e, n, i) {
    var l = kt();
    i = {
      lane: l,
      revertLane: 0,
      gesture: null,
      action: i,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, Yl(e) ? tm(n, i) : (i = Yu(e, n, i, l), i !== null && (_t(i, e, l), nm(i, n, l)));
  }
  function em(e, n, i) {
    Tr(e, n, i, kt());
  }
  function Tr(e, n, i, l) {
    var c = {
      lane: l,
      revertLane: 0,
      gesture: null,
      action: i,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (Yl(e)) tm(n, c);
    else {
      var s = e.alternate;
      if (e.lanes === 0 && (s === null || s.lanes === 0) && (s = n.lastRenderedReducer, s !== null)) try {
        var m = n.lastRenderedState, y = s(m, i);
        if (c.hasEagerState = !0, c.eagerState = y, Ct(y, m)) return wl(e, n, c, 0), Le === null && Al(), !1;
      } catch {
      }
      if (i = Yu(e, n, c, l), i !== null) return _t(i, e, l), nm(i, n, l), !0;
    }
    return !1;
  }
  function Rc(e, n, i, l) {
    if (l = {
      lane: 2,
      revertLane: ls(),
      gesture: null,
      action: l,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, Yl(e)) {
      if (n) throw Error(u(479));
    } else n = Yu(e, i, l, 2), n !== null && _t(n, e, 2);
  }
  function Yl(e) {
    var n = e.alternate;
    return e === me || n !== null && n === me;
  }
  function tm(e, n) {
    _i = jl = !0;
    var i = e.pending;
    i === null ? n.next = n : (n.next = i.next, i.next = n), e.pending = n;
  }
  function nm(e, n, i) {
    if ((i & 4194048) !== 0) {
      var l = n.lanes;
      l &= e.pendingLanes, i |= l, n.lanes = i, ld(e, i);
    }
  }
  var Ar = {
    readContext: ut,
    use: Pl,
    useCallback: Ve,
    useContext: Ve,
    useEffect: Ve,
    useImperativeHandle: Ve,
    useLayoutEffect: Ve,
    useInsertionEffect: Ve,
    useMemo: Ve,
    useReducer: Ve,
    useRef: Ve,
    useState: Ve,
    useDebugValue: Ve,
    useDeferredValue: Ve,
    useTransition: Ve,
    useSyncExternalStore: Ve,
    useId: Ve,
    useHostTransitionStatus: Ve,
    useFormState: Ve,
    useActionState: Ve,
    useOptimistic: Ve,
    useMemoCache: Ve,
    useCacheRefresh: Ve
  };
  Ar.useEffectEvent = Ve;
  var am = {
    readContext: ut,
    use: Pl,
    useCallback: function(e, n) {
      return dt().memoizedState = [e, n === void 0 ? null : n], e;
    },
    useContext: ut,
    useEffect: Gh,
    useImperativeHandle: function(e, n, i) {
      i = i != null ? i.concat([e]) : null, kl(4194308, 4, Vh.bind(null, n, e), i);
    },
    useLayoutEffect: function(e, n) {
      return kl(4194308, 4, e, n);
    },
    useInsertionEffect: function(e, n) {
      kl(4, 2, e, n);
    },
    useMemo: function(e, n) {
      var i = dt();
      n = n === void 0 ? null : n;
      var l = e();
      if (Za) {
        qn(!0);
        try {
          e();
        } finally {
          qn(!1);
        }
      }
      return i.memoizedState = [l, n], l;
    },
    useReducer: function(e, n, i) {
      var l = dt();
      if (i !== void 0) {
        var c = i(n);
        if (Za) {
          qn(!0);
          try {
            i(n);
          } finally {
            qn(!1);
          }
        }
      } else c = n;
      return l.memoizedState = l.baseState = c, e = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: e,
        lastRenderedState: c
      }, l.queue = e, e = e.dispatch = k1.bind(null, me, e), [l.memoizedState, e];
    },
    useRef: function(e) {
      var n = dt();
      return e = { current: e }, n.memoizedState = e;
    },
    useState: function(e) {
      e = Ec(e);
      var n = e.queue, i = em.bind(null, me, n);
      return n.dispatch = i, [e.memoizedState, i];
    },
    useDebugValue: Ac,
    useDeferredValue: function(e, n) {
      return wc(dt(), e, n);
    },
    useTransition: function() {
      var e = Ec(!1);
      return e = Fh.bind(null, me, e.queue, !0, !1), dt().memoizedState = e, [!1, e];
    },
    useSyncExternalStore: function(e, n, i) {
      var l = me, c = dt();
      if (Te) {
        if (i === void 0) throw Error(u(407));
        i = i();
      } else {
        if (i = n(), Le === null) throw Error(u(349));
        (Ee & 127) !== 0 || Ah(l, n, i);
      }
      c.memoizedState = i;
      var s = {
        value: i,
        getSnapshot: n
      };
      return c.queue = s, Gh(Ch.bind(null, l, s, e), [e]), l.flags |= 2048, Si(9, { destroy: void 0 }, wh.bind(null, l, s, i, n), null), i;
    },
    useId: function() {
      var e = dt(), n = Le.identifierPrefix;
      if (Te) {
        var i = cn, l = un;
        i = (l & ~(1 << 32 - wt(l) - 1)).toString(32) + i, n = "_" + n + "R_" + i, i = Zl++, 0 < i && (n += "H" + i.toString(32)), n += "_";
      } else i = U1++, n = "_" + n + "r_" + i.toString(32) + "_";
      return e.memoizedState = n;
    },
    useHostTransitionStatus: Oc,
    useFormState: Lh,
    useActionState: Lh,
    useOptimistic: function(e) {
      var n = dt();
      n.memoizedState = n.baseState = e;
      var i = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return n.queue = i, n = Rc.bind(null, me, !0, i), i.dispatch = n, [e, n];
    },
    useMemoCache: yc,
    useCacheRefresh: function() {
      return dt().memoizedState = X1.bind(null, me);
    },
    useEffectEvent: function(e) {
      var n = dt(), i = { impl: e };
      return n.memoizedState = i, function() {
        if ((Me & 2) !== 0) throw Error(u(440));
        return i.impl.apply(void 0, arguments);
      };
    }
  }, Mc = {
    readContext: ut,
    use: Pl,
    useCallback: qh,
    useContext: ut,
    useEffect: Tc,
    useImperativeHandle: Yh,
    useInsertionEffect: Xh,
    useLayoutEffect: kh,
    useMemo: Ih,
    useReducer: Xl,
    useRef: Zh,
    useState: function() {
      return Xl(Mn);
    },
    useDebugValue: Ac,
    useDeferredValue: function(e, n) {
      return $h($e(), ze.memoizedState, e, n);
    },
    useTransition: function() {
      var e = Xl(Mn)[0], n = $e().memoizedState;
      return [typeof e == "boolean" ? e : Sr(e), n];
    },
    useSyncExternalStore: Th,
    useId: Kh,
    useHostTransitionStatus: Oc,
    useFormState: Uh,
    useActionState: Uh,
    useOptimistic: function(e, n) {
      return Mh($e(), ze, e, n);
    },
    useMemoCache: yc,
    useCacheRefresh: Jh
  };
  Mc.useEffectEvent = Ph;
  var im = {
    readContext: ut,
    use: Pl,
    useCallback: qh,
    useContext: ut,
    useEffect: Tc,
    useImperativeHandle: Yh,
    useInsertionEffect: Xh,
    useLayoutEffect: kh,
    useMemo: Ih,
    useReducer: _c,
    useRef: Zh,
    useState: function() {
      return _c(Mn);
    },
    useDebugValue: Ac,
    useDeferredValue: function(e, n) {
      var i = $e();
      return ze === null ? wc(i, e, n) : $h(i, ze.memoizedState, e, n);
    },
    useTransition: function() {
      var e = _c(Mn)[0], n = $e().memoizedState;
      return [typeof e == "boolean" ? e : Sr(e), n];
    },
    useSyncExternalStore: Th,
    useId: Kh,
    useHostTransitionStatus: Oc,
    useFormState: jh,
    useActionState: jh,
    useOptimistic: function(e, n) {
      var i = $e();
      return ze !== null ? Mh(i, ze, e, n) : (i.baseState = e, [e, i.queue.dispatch]);
    },
    useMemoCache: yc,
    useCacheRefresh: Jh
  };
  im.useEffectEvent = Ph;
  function Dc(e, n, i, l) {
    n = e.memoizedState, i = i(l, n), i = i == null ? n : E({}, n, i), e.memoizedState = i, e.lanes === 0 && (e.updateQueue.baseState = i);
  }
  var Nc = {
    enqueueSetState: function(e, n, i) {
      e = e._reactInternals;
      var l = kt(), c = Ba(l);
      c.payload = n, i != null && (c.callback = i), n = ja(e, c, l), n !== null && (_t(n, e, l), yr(n, e, l));
    },
    enqueueReplaceState: function(e, n, i) {
      e = e._reactInternals;
      var l = kt(), c = Ba(l);
      c.tag = 1, c.payload = n, i != null && (c.callback = i), n = ja(e, c, l), n !== null && (_t(n, e, l), yr(n, e, l));
    },
    enqueueForceUpdate: function(e, n) {
      e = e._reactInternals;
      var i = kt(), l = Ba(i);
      l.tag = 2, n != null && (l.callback = n), n = ja(e, l, i), n !== null && (_t(n, e, i), yr(n, e, i));
    }
  };
  function rm(e, n, i, l, c, s, m) {
    return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(l, s, m) : n.prototype && n.prototype.isPureReactComponent ? !sr(i, l) || !sr(c, s) : !0;
  }
  function lm(e, n, i, l) {
    e = n.state, typeof n.componentWillReceiveProps == "function" && n.componentWillReceiveProps(i, l), typeof n.UNSAFE_componentWillReceiveProps == "function" && n.UNSAFE_componentWillReceiveProps(i, l), n.state !== e && Nc.enqueueReplaceState(n, n.state, null);
  }
  function Ga(e, n) {
    var i = n;
    if ("ref" in n) {
      i = {};
      for (var l in n) l !== "ref" && (i[l] = n[l]);
    }
    if (e = e.defaultProps) {
      i === n && (i = E({}, i));
      for (var c in e) i[c] === void 0 && (i[c] = e[c]);
    }
    return i;
  }
  function V1(e) {
    Tl(e);
  }
  function Y1(e) {
    console.error(e);
  }
  function q1(e) {
    Tl(e);
  }
  function ql(e, n) {
    try {
      var i = e.onUncaughtError;
      i(n.value, { componentStack: n.stack });
    } catch (l) {
      setTimeout(function() {
        throw l;
      });
    }
  }
  function om(e, n, i) {
    try {
      var l = e.onCaughtError;
      l(i.value, {
        componentStack: i.stack,
        errorBoundary: n.tag === 1 ? n.stateNode : null
      });
    } catch (c) {
      setTimeout(function() {
        throw c;
      });
    }
  }
  function zc(e, n, i) {
    return i = Ba(i), i.tag = 3, i.payload = { element: null }, i.callback = function() {
      ql(e, n);
    }, i;
  }
  function um(e) {
    return e = Ba(e), e.tag = 3, e;
  }
  function cm(e, n, i, l) {
    var c = i.type.getDerivedStateFromError;
    if (typeof c == "function") {
      var s = l.value;
      e.payload = function() {
        return c(s);
      }, e.callback = function() {
        om(n, i, l);
      };
    }
    var m = i.stateNode;
    m !== null && typeof m.componentDidCatch == "function" && (e.callback = function() {
      om(n, i, l), typeof c != "function" && (ra === null ? ra = /* @__PURE__ */ new Set([this]) : ra.add(this));
      var y = l.stack;
      this.componentDidCatch(l.value, { componentStack: y !== null ? y : "" });
    });
  }
  function I1(e, n, i, l, c) {
    if (i.flags |= 32768, l !== null && typeof l == "object" && typeof l.then == "function") {
      if (n = i.alternate, n !== null && mi(n, i, c, !0), i = Rt.current, i !== null) {
        switch (i.tag) {
          case 31:
          case 13:
            return Xt === null ? io() : i.alternate === null && Ye === 0 && (Ye = 3), i.flags &= -257, i.flags |= 65536, i.lanes = c, l === xl ? i.flags |= 16384 : (n = i.updateQueue, n === null ? i.updateQueue = /* @__PURE__ */ new Set([l]) : n.add(l), as(e, l, c)), !1;
          case 22:
            return i.flags |= 65536, l === xl ? i.flags |= 16384 : (n = i.updateQueue, n === null ? (n = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([l])
            }, i.updateQueue = n) : (i = n.retryQueue, i === null ? n.retryQueue = /* @__PURE__ */ new Set([l]) : i.add(l)), as(e, l, c)), !1;
        }
        throw Error(u(435, i.tag));
      }
      return as(e, l, c), io(), !1;
    }
    if (Te) return n = Rt.current, n !== null ? ((n.flags & 65536) === 0 && (n.flags |= 256), n.flags |= 65536, n.lanes = c, l !== Wu && (e = Error(u(422), { cause: l }), hr(jt(e, i)))) : (l !== Wu && (n = Error(u(423), { cause: l }), hr(jt(n, i))), e = e.current.alternate, e.flags |= 65536, c &= -c, e.lanes |= c, l = jt(l, i), c = zc(e.stateNode, l, c), uc(e, c), Ye !== 4 && (Ye = 2)), !1;
    var s = Error(u(520), { cause: l });
    if (s = jt(s, i), zr === null ? zr = [s] : zr.push(s), Ye !== 4 && (Ye = 2), n === null) return !0;
    l = jt(l, i), i = n;
    do {
      switch (i.tag) {
        case 3:
          return i.flags |= 65536, e = c & -c, i.lanes |= e, e = zc(i.stateNode, l, e), uc(i, e), !1;
        case 1:
          if (n = i.type, s = i.stateNode, (i.flags & 128) === 0 && (typeof n.getDerivedStateFromError == "function" || s !== null && typeof s.componentDidCatch == "function" && (ra === null || !ra.has(s)))) return i.flags |= 65536, c &= -c, i.lanes |= c, c = um(c), cm(c, e, i, l), uc(i, c), !1;
      }
      i = i.return;
    } while (i !== null);
    return !1;
  }
  var xc = Error(u(461)), We = !1;
  function ct(e, n, i, l) {
    n.child = e === null ? ph(n, null, i, l) : Ua(n, e.child, i, l);
  }
  function sm(e, n, i, l, c) {
    i = i.render;
    var s = n.ref;
    if ("ref" in l) {
      var m = {};
      for (var y in l) y !== "ref" && (m[y] = l[y]);
    } else m = l;
    return za(n), l = mc(e, n, i, m, s, c), y = vc(), e !== null && !We ? (pc(e, n, c), Dn(e, n, c)) : (Te && y && Fu(n), n.flags |= 1, ct(e, n, l, c), n.child);
  }
  function fm(e, n, i, l, c) {
    if (e === null) {
      var s = i.type;
      return typeof s == "function" && !qu(s) && s.defaultProps === void 0 && i.compare === null ? (n.tag = 15, n.type = s, dm(e, n, s, l, c)) : (e = Ol(i.type, null, l, n, n.mode, c), e.ref = n.ref, e.return = n, n.child = e);
    }
    if (s = e.child, !Pc(e, c)) {
      var m = s.memoizedProps;
      if (i = i.compare, i = i !== null ? i : sr, i(m, l) && e.ref === n.ref) return Dn(e, n, c);
    }
    return n.flags |= 1, e = An(s, l), e.ref = n.ref, e.return = n, n.child = e;
  }
  function dm(e, n, i, l, c) {
    if (e !== null) {
      var s = e.memoizedProps;
      if (sr(s, l) && e.ref === n.ref) if (We = !1, n.pendingProps = l = s, Pc(e, c)) (e.flags & 131072) !== 0 && (We = !0);
      else return n.lanes = e.lanes, Dn(e, n, c);
    }
    return Hc(e, n, i, l, c);
  }
  function hm(e, n, i, l) {
    var c = l.children, s = e !== null ? e.memoizedState : null;
    if (e === null && n.stateNode === null && (n.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), l.mode === "hidden") {
      if ((n.flags & 128) !== 0) {
        if (s = s !== null ? s.baseLanes | i : i, e !== null) {
          for (l = n.child = e.child, c = 0; l !== null; ) c = c | l.lanes | l.childLanes, l = l.sibling;
          l = c & ~s;
        } else l = 0, n.child = null;
        return mm(e, n, s, i, l);
      }
      if ((i & 536870912) !== 0) n.memoizedState = {
        baseLanes: 0,
        cachePool: null
      }, e !== null && Nl(n, s !== null ? s.cachePool : null), s !== null ? bh(n, s) : sc(), _h(n);
      else return l = n.lanes = 536870912, mm(e, n, s !== null ? s.baseLanes | i : i, i, l);
    } else s !== null ? (Nl(n, s.cachePool), bh(n, s), ta(n), n.memoizedState = null) : (e !== null && Nl(n, null), sc(), ta(n));
    return ct(e, n, c, i), n.child;
  }
  function wr(e, n) {
    return e !== null && e.tag === 22 || n.stateNode !== null || (n.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), n.sibling;
  }
  function mm(e, n, i, l, c) {
    var s = ic();
    return s = s === null ? null : {
      parent: Fe._currentValue,
      pool: s
    }, n.memoizedState = {
      baseLanes: i,
      cachePool: s
    }, e !== null && Nl(n, null), sc(), _h(n), e !== null && mi(e, n, l, !0), n.childLanes = c, null;
  }
  function Il(e, n) {
    return n = Fl({
      mode: n.mode,
      children: n.children
    }, e.mode), n.ref = e.ref, e.child = n, n.return = e, n;
  }
  function vm(e, n, i) {
    return Ua(n, e.child, null, i), e = Il(n, n.pendingProps), e.flags |= 2, Mt(n), n.memoizedState = null, e;
  }
  function $1(e, n, i) {
    var l = n.pendingProps, c = (n.flags & 128) !== 0;
    if (n.flags &= -129, e === null) {
      if (Te) {
        if (l.mode === "hidden") return e = Il(n, l), n.lanes = 536870912, wr(null, e);
        if (dc(n), (e = Be) ? (e = Rv(e, Pt), e = e !== null && e.data === "&" ? e : null, e !== null && (n.memoizedState = {
          dehydrated: e,
          treeContext: Fn !== null ? {
            id: un,
            overflow: cn
          } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, i = th(e), i.return = n, n.child = i, ot = n, Be = null)) : e = null, e === null) throw Wn(n);
        return n.lanes = 536870912, null;
      }
      return Il(n, l);
    }
    var s = e.memoizedState;
    if (s !== null) {
      var m = s.dehydrated;
      if (dc(n), c) if (n.flags & 256) n.flags &= -257, n = vm(e, n, i);
      else if (n.memoizedState !== null) n.child = e.child, n.flags |= 128, n = null;
      else throw Error(u(558));
      else if (We || mi(e, n, i, !1), c = (i & e.childLanes) !== 0, We || c) {
        if (l = Le, l !== null && (m = od(l, i), m !== 0 && m !== s.retryLane)) throw s.retryLane = m, Ra(e, m), _t(l, e, m), xc;
        io(), n = vm(e, n, i);
      } else e = s.treeContext, Be = Vt(m.nextSibling), ot = n, Te = !0, Qn = null, Pt = !1, e !== null && ih(n, e), n = Il(n, l), n.flags |= 4096;
      return n;
    }
    return e = An(e.child, {
      mode: l.mode,
      children: l.children
    }), e.ref = n.ref, n.child = e, e.return = n, e;
  }
  function $l(e, n) {
    var i = n.ref;
    if (i === null) e !== null && e.ref !== null && (n.flags |= 4194816);
    else {
      if (typeof i != "function" && typeof i != "object") throw Error(u(284));
      (e === null || e.ref !== i) && (n.flags |= 4194816);
    }
  }
  function Hc(e, n, i, l, c) {
    return za(n), i = mc(e, n, i, l, void 0, c), l = vc(), e !== null && !We ? (pc(e, n, c), Dn(e, n, c)) : (Te && l && Fu(n), n.flags |= 1, ct(e, n, i, c), n.child);
  }
  function pm(e, n, i, l, c, s) {
    return za(n), n.updateQueue = null, i = Sh(n, l, i, c), Eh(e), l = vc(), e !== null && !We ? (pc(e, n, s), Dn(e, n, s)) : (Te && l && Fu(n), n.flags |= 1, ct(e, n, i, s), n.child);
  }
  function gm(e, n, i, l, c) {
    if (za(n), n.stateNode === null) {
      var s = si, m = i.contextType;
      typeof m == "object" && m !== null && (s = ut(m)), s = new i(l, s), n.memoizedState = s.state !== null && s.state !== void 0 ? s.state : null, s.updater = Nc, n.stateNode = s, s._reactInternals = n, s = n.stateNode, s.props = l, s.state = n.memoizedState, s.refs = {}, lc(n), m = i.contextType, s.context = typeof m == "object" && m !== null ? ut(m) : si, s.state = n.memoizedState, m = i.getDerivedStateFromProps, typeof m == "function" && (Dc(n, i, m, l), s.state = n.memoizedState), typeof i.getDerivedStateFromProps == "function" || typeof s.getSnapshotBeforeUpdate == "function" || typeof s.UNSAFE_componentWillMount != "function" && typeof s.componentWillMount != "function" || (m = s.state, typeof s.componentWillMount == "function" && s.componentWillMount(), typeof s.UNSAFE_componentWillMount == "function" && s.UNSAFE_componentWillMount(), m !== s.state && Nc.enqueueReplaceState(s, s.state, null), _r(n, l, s, c), br(), s.state = n.memoizedState), typeof s.componentDidMount == "function" && (n.flags |= 4194308), l = !0;
    } else if (e === null) {
      s = n.stateNode;
      var y = n.memoizedProps, A = Ga(i, y);
      s.props = A;
      var x = s.context, P = i.contextType;
      m = si, typeof P == "object" && P !== null && (m = ut(P));
      var q = i.getDerivedStateFromProps;
      P = typeof q == "function" || typeof s.getSnapshotBeforeUpdate == "function", y = n.pendingProps !== y, P || typeof s.UNSAFE_componentWillReceiveProps != "function" && typeof s.componentWillReceiveProps != "function" || (y || x !== m) && lm(n, s, l, m), Jn = !1;
      var U = n.memoizedState;
      s.state = U, _r(n, l, s, c), br(), x = n.memoizedState, y || U !== x || Jn ? (typeof q == "function" && (Dc(n, i, q, l), x = n.memoizedState), (A = Jn || rm(n, i, A, l, U, x, m)) ? (P || typeof s.UNSAFE_componentWillMount != "function" && typeof s.componentWillMount != "function" || (typeof s.componentWillMount == "function" && s.componentWillMount(), typeof s.UNSAFE_componentWillMount == "function" && s.UNSAFE_componentWillMount()), typeof s.componentDidMount == "function" && (n.flags |= 4194308)) : (typeof s.componentDidMount == "function" && (n.flags |= 4194308), n.memoizedProps = l, n.memoizedState = x), s.props = l, s.state = x, s.context = m, l = A) : (typeof s.componentDidMount == "function" && (n.flags |= 4194308), l = !1);
    } else {
      s = n.stateNode, oc(e, n), m = n.memoizedProps, P = Ga(i, m), s.props = P, q = n.pendingProps, U = s.context, x = i.contextType, A = si, typeof x == "object" && x !== null && (A = ut(x)), y = i.getDerivedStateFromProps, (x = typeof y == "function" || typeof s.getSnapshotBeforeUpdate == "function") || typeof s.UNSAFE_componentWillReceiveProps != "function" && typeof s.componentWillReceiveProps != "function" || (m !== q || U !== A) && lm(n, s, l, A), Jn = !1, U = n.memoizedState, s.state = U, _r(n, l, s, c), br();
      var Z = n.memoizedState;
      m !== q || U !== Z || Jn || e !== null && e.dependencies !== null && Ml(e.dependencies) ? (typeof y == "function" && (Dc(n, i, y, l), Z = n.memoizedState), (P = Jn || rm(n, i, P, l, U, Z, A) || e !== null && e.dependencies !== null && Ml(e.dependencies)) ? (x || typeof s.UNSAFE_componentWillUpdate != "function" && typeof s.componentWillUpdate != "function" || (typeof s.componentWillUpdate == "function" && s.componentWillUpdate(l, Z, A), typeof s.UNSAFE_componentWillUpdate == "function" && s.UNSAFE_componentWillUpdate(l, Z, A)), typeof s.componentDidUpdate == "function" && (n.flags |= 4), typeof s.getSnapshotBeforeUpdate == "function" && (n.flags |= 1024)) : (typeof s.componentDidUpdate != "function" || m === e.memoizedProps && U === e.memoizedState || (n.flags |= 4), typeof s.getSnapshotBeforeUpdate != "function" || m === e.memoizedProps && U === e.memoizedState || (n.flags |= 1024), n.memoizedProps = l, n.memoizedState = Z), s.props = l, s.state = Z, s.context = A, l = P) : (typeof s.componentDidUpdate != "function" || m === e.memoizedProps && U === e.memoizedState || (n.flags |= 4), typeof s.getSnapshotBeforeUpdate != "function" || m === e.memoizedProps && U === e.memoizedState || (n.flags |= 1024), l = !1);
    }
    return s = l, $l(e, n), l = (n.flags & 128) !== 0, s || l ? (s = n.stateNode, i = l && typeof i.getDerivedStateFromError != "function" ? null : s.render(), n.flags |= 1, e !== null && l ? (n.child = Ua(n, e.child, null, c), n.child = Ua(n, null, i, c)) : ct(e, n, i, c), n.memoizedState = s.state, e = n.child) : e = Dn(e, n, c), e;
  }
  function ym(e, n, i, l) {
    return Da(), n.flags |= 256, ct(e, n, i, l), n.child;
  }
  var Lc = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function Uc(e) {
    return {
      baseLanes: e,
      cachePool: sh()
    };
  }
  function Bc(e, n, i) {
    return e = e !== null ? e.childLanes & ~i : 0, n && (e |= Nt), e;
  }
  function bm(e, n, i) {
    var l = n.pendingProps, c = !1, s = (n.flags & 128) !== 0, m;
    if ((m = s) || (m = e !== null && e.memoizedState === null ? !1 : (Ie.current & 2) !== 0), m && (c = !0, n.flags &= -129), m = (n.flags & 32) !== 0, n.flags &= -33, e === null) {
      if (Te) {
        if (c ? ea(n) : ta(n), (e = Be) ? (e = Rv(e, Pt), e = e !== null && e.data !== "&" ? e : null, e !== null && (n.memoizedState = {
          dehydrated: e,
          treeContext: Fn !== null ? {
            id: un,
            overflow: cn
          } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, i = th(e), i.return = n, n.child = i, ot = n, Be = null)) : e = null, e === null) throw Wn(n);
        return ys(e) ? n.lanes = 32 : n.lanes = 536870912, null;
      }
      var y = l.children;
      return l = l.fallback, c ? (ta(n), c = n.mode, y = Fl({
        mode: "hidden",
        children: y
      }, c), l = Ma(l, c, i, null), y.return = n, l.return = n, y.sibling = l, n.child = y, l = n.child, l.memoizedState = Uc(i), l.childLanes = Bc(e, m, i), n.memoizedState = Lc, wr(null, l)) : (ea(n), jc(n, y));
    }
    var A = e.memoizedState;
    if (A !== null && (y = A.dehydrated, y !== null)) {
      if (s) n.flags & 256 ? (ea(n), n.flags &= -257, n = Zc(e, n, i)) : n.memoizedState !== null ? (ta(n), n.child = e.child, n.flags |= 128, n = null) : (ta(n), y = l.fallback, c = n.mode, l = Fl({
        mode: "visible",
        children: l.children
      }, c), y = Ma(y, c, i, null), y.flags |= 2, l.return = n, y.return = n, l.sibling = y, n.child = l, Ua(n, e.child, null, i), l = n.child, l.memoizedState = Uc(i), l.childLanes = Bc(e, m, i), n.memoizedState = Lc, n = wr(null, l));
      else if (ea(n), ys(y)) {
        if (m = y.nextSibling && y.nextSibling.dataset, m) var x = m.dgst;
        m = x, l = Error(u(419)), l.stack = "", l.digest = m, hr({
          value: l,
          source: null,
          stack: null
        }), n = Zc(e, n, i);
      } else if (We || mi(e, n, i, !1), m = (i & e.childLanes) !== 0, We || m) {
        if (m = Le, m !== null && (l = od(m, i), l !== 0 && l !== A.retryLane)) throw A.retryLane = l, Ra(e, l), _t(m, e, l), xc;
        gs(y) || io(), n = Zc(e, n, i);
      } else gs(y) ? (n.flags |= 192, n.child = e.child, n = null) : (e = A.treeContext, Be = Vt(y.nextSibling), ot = n, Te = !0, Qn = null, Pt = !1, e !== null && ih(n, e), n = jc(n, l.children), n.flags |= 4096);
      return n;
    }
    return c ? (ta(n), y = l.fallback, c = n.mode, A = e.child, x = A.sibling, l = An(A, {
      mode: "hidden",
      children: l.children
    }), l.subtreeFlags = A.subtreeFlags & 65011712, x !== null ? y = An(x, y) : (y = Ma(y, c, i, null), y.flags |= 2), y.return = n, l.return = n, l.sibling = y, n.child = l, wr(null, l), l = n.child, y = e.child.memoizedState, y === null ? y = Uc(i) : (c = y.cachePool, c !== null ? (A = Fe._currentValue, c = c.parent !== A ? {
      parent: A,
      pool: A
    } : c) : c = sh(), y = {
      baseLanes: y.baseLanes | i,
      cachePool: c
    }), l.memoizedState = y, l.childLanes = Bc(e, m, i), n.memoizedState = Lc, wr(e.child, l)) : (ea(n), i = e.child, e = i.sibling, i = An(i, {
      mode: "visible",
      children: l.children
    }), i.return = n, i.sibling = null, e !== null && (m = n.deletions, m === null ? (n.deletions = [e], n.flags |= 16) : m.push(e)), n.child = i, n.memoizedState = null, i);
  }
  function jc(e, n) {
    return n = Fl({
      mode: "visible",
      children: n
    }, e.mode), n.return = e, e.child = n;
  }
  function Fl(e, n) {
    return e = Ot(22, e, null, n), e.lanes = 0, e;
  }
  function Zc(e, n, i) {
    return Ua(n, e.child, null, i), e = jc(n, n.pendingProps.children), e.flags |= 2, n.memoizedState = null, e;
  }
  function _m(e, n, i) {
    e.lanes |= n;
    var l = e.alternate;
    l !== null && (l.lanes |= n), ec(e.return, n, i);
  }
  function Gc(e, n, i, l, c, s) {
    var m = e.memoizedState;
    m === null ? e.memoizedState = {
      isBackwards: n,
      rendering: null,
      renderingStartTime: 0,
      last: l,
      tail: i,
      tailMode: c,
      treeForkCount: s
    } : (m.isBackwards = n, m.rendering = null, m.renderingStartTime = 0, m.last = l, m.tail = i, m.tailMode = c, m.treeForkCount = s);
  }
  function Em(e, n, i) {
    var l = n.pendingProps, c = l.revealOrder, s = l.tail;
    l = l.children;
    var m = Ie.current, y = (m & 2) !== 0;
    if (y ? (m = m & 1 | 2, n.flags |= 128) : m &= 1, W(Ie, m), ct(e, n, l, i), l = Te ? dr : 0, !y && e !== null && (e.flags & 128) !== 0) e: for (e = n.child; e !== null; ) {
      if (e.tag === 13) e.memoizedState !== null && _m(e, i, n);
      else if (e.tag === 19) _m(e, i, n);
      else if (e.child !== null) {
        e.child.return = e, e = e.child;
        continue;
      }
      if (e === n) break e;
      for (; e.sibling === null; ) {
        if (e.return === null || e.return === n) break e;
        e = e.return;
      }
      e.sibling.return = e.return, e = e.sibling;
    }
    switch (c) {
      case "forwards":
        for (i = n.child, c = null; i !== null; ) e = i.alternate, e !== null && Bl(e) === null && (c = i), i = i.sibling;
        i = c, i === null ? (c = n.child, n.child = null) : (c = i.sibling, i.sibling = null), Gc(n, !1, c, i, s, l);
        break;
      case "backwards":
      case "unstable_legacy-backwards":
        for (i = null, c = n.child, n.child = null; c !== null; ) {
          if (e = c.alternate, e !== null && Bl(e) === null) {
            n.child = c;
            break;
          }
          e = c.sibling, c.sibling = i, i = c, c = e;
        }
        Gc(n, !0, i, null, s, l);
        break;
      case "together":
        Gc(n, !1, null, null, void 0, l);
        break;
      default:
        n.memoizedState = null;
    }
    return n.child;
  }
  function Dn(e, n, i) {
    if (e !== null && (n.dependencies = e.dependencies), ia |= n.lanes, (i & n.childLanes) === 0) if (e !== null) {
      if (mi(e, n, i, !1), (i & n.childLanes) === 0) return null;
    } else return null;
    if (e !== null && n.child !== e.child) throw Error(u(153));
    if (n.child !== null) {
      for (e = n.child, i = An(e, e.pendingProps), n.child = i, i.return = n; e.sibling !== null; ) e = e.sibling, i = i.sibling = An(e, e.pendingProps), i.return = n;
      i.sibling = null;
    }
    return n.child;
  }
  function Pc(e, n) {
    return (e.lanes & n) !== 0 ? !0 : (e = e.dependencies, !!(e !== null && Ml(e)));
  }
  function F1(e, n, i) {
    switch (n.tag) {
      case 3:
        tt(n, n.stateNode.containerInfo), Kn(n, Fe, e.memoizedState.cache), Da();
        break;
      case 27:
      case 5:
        St(n);
        break;
      case 4:
        tt(n, n.stateNode.containerInfo);
        break;
      case 10:
        Kn(n, n.type, n.memoizedProps.value);
        break;
      case 31:
        if (n.memoizedState !== null) return n.flags |= 128, dc(n), null;
        break;
      case 13:
        var l = n.memoizedState;
        if (l !== null)
          return l.dehydrated !== null ? (ea(n), n.flags |= 128, null) : (i & n.child.childLanes) !== 0 ? bm(e, n, i) : (ea(n), e = Dn(e, n, i), e !== null ? e.sibling : null);
        ea(n);
        break;
      case 19:
        var c = (e.flags & 128) !== 0;
        if (l = (i & n.childLanes) !== 0, l || (mi(e, n, i, !1), l = (i & n.childLanes) !== 0), c) {
          if (l) return Em(e, n, i);
          n.flags |= 128;
        }
        if (c = n.memoizedState, c !== null && (c.rendering = null, c.tail = null, c.lastEffect = null), W(Ie, Ie.current), l) break;
        return null;
      case 22:
        return n.lanes = 0, hm(e, n, i, n.pendingProps);
      case 24:
        Kn(n, Fe, e.memoizedState.cache);
    }
    return Dn(e, n, i);
  }
  function Sm(e, n, i) {
    if (e !== null) if (e.memoizedProps !== n.pendingProps) We = !0;
    else {
      if (!Pc(e, i) && (n.flags & 128) === 0) return We = !1, F1(e, n, i);
      We = (e.flags & 131072) !== 0;
    }
    else We = !1, Te && (n.flags & 1048576) !== 0 && ah(n, dr, n.index);
    switch (n.lanes = 0, n.tag) {
      case 16:
        e: {
          var l = n.pendingProps;
          if (e = Ha(n.elementType), n.type = e, typeof e == "function") qu(e) ? (l = Ga(e, l), n.tag = 1, n = gm(null, n, e, l, i)) : (n.tag = 0, n = Hc(null, n, e, l, i));
          else {
            if (e != null) {
              var c = e.$$typeof;
              if (c === X) {
                n.tag = 11, n = sm(null, n, e, l, i);
                break e;
              } else if (c === H) {
                n.tag = 14, n = fm(null, n, e, l, i);
                break e;
              }
            }
            throw n = ge(e) || e, Error(u(306, n, ""));
          }
        }
        return n;
      case 0:
        return Hc(e, n, n.type, n.pendingProps, i);
      case 1:
        return l = n.type, c = Ga(l, n.pendingProps), gm(e, n, l, c, i);
      case 3:
        e: {
          if (tt(n, n.stateNode.containerInfo), e === null) throw Error(u(387));
          l = n.pendingProps;
          var s = n.memoizedState;
          c = s.element, oc(e, n), _r(n, l, null, i);
          var m = n.memoizedState;
          if (l = m.cache, Kn(n, Fe, l), l !== s.cache && tc(n, [Fe], i, !0), br(), l = m.element, s.isDehydrated) if (s = {
            element: l,
            isDehydrated: !1,
            cache: m.cache
          }, n.updateQueue.baseState = s, n.memoizedState = s, n.flags & 256) {
            n = ym(e, n, l, i);
            break e;
          } else if (l !== c) {
            c = jt(Error(u(424)), n), hr(c), n = ym(e, n, l, i);
            break e;
          } else
            for (e = n.stateNode.containerInfo, e.nodeType === 9 ? e = e.body : e = e.nodeName === "HTML" ? e.ownerDocument.body : e, Be = Vt(e.firstChild), ot = n, Te = !0, Qn = null, Pt = !0, i = ph(n, null, l, i), n.child = i; i; ) i.flags = i.flags & -3 | 4096, i = i.sibling;
          else {
            if (Da(), l === c) {
              n = Dn(e, n, i);
              break e;
            }
            ct(e, n, l, i);
          }
          n = n.child;
        }
        return n;
      case 26:
        return $l(e, n), e === null ? (i = Hv(n.type, null, n.pendingProps, null)) ? n.memoizedState = i : Te || (i = n.type, e = n.pendingProps, l = fo(fe.current).createElement(i), l[lt] = n, l[mt] = e, st(l, i, e), it(l), n.stateNode = l) : n.memoizedState = Hv(n.type, e.memoizedProps, n.pendingProps, e.memoizedState), null;
      case 27:
        return St(n), e === null && Te && (l = n.stateNode = Nv(n.type, n.pendingProps, fe.current), ot = n, Pt = !0, c = Be, ca(n.type) ? (bs = c, Be = Vt(l.firstChild)) : Be = c), ct(e, n, n.pendingProps.children, i), $l(e, n), e === null && (n.flags |= 4194304), n.child;
      case 5:
        return e === null && Te && ((c = l = Be) && (l = Tb(l, n.type, n.pendingProps, Pt), l !== null ? (n.stateNode = l, ot = n, Be = Vt(l.firstChild), Pt = !1, c = !0) : c = !1), c || Wn(n)), St(n), c = n.type, s = n.pendingProps, m = e !== null ? e.memoizedProps : null, l = s.children, ms(c, s) ? l = null : m !== null && ms(c, m) && (n.flags |= 32), n.memoizedState !== null && (c = mc(e, n, B1, null, null, i), Gr._currentValue = c), $l(e, n), ct(e, n, l, i), n.child;
      case 6:
        return e === null && Te && ((e = i = Be) && (i = Ab(i, n.pendingProps, Pt), i !== null ? (n.stateNode = i, ot = n, Be = null, e = !0) : e = !1), e || Wn(n)), null;
      case 13:
        return bm(e, n, i);
      case 4:
        return tt(n, n.stateNode.containerInfo), l = n.pendingProps, e === null ? n.child = Ua(n, null, l, i) : ct(e, n, l, i), n.child;
      case 11:
        return sm(e, n, n.type, n.pendingProps, i);
      case 7:
        return ct(e, n, n.pendingProps, i), n.child;
      case 8:
        return ct(e, n, n.pendingProps.children, i), n.child;
      case 12:
        return ct(e, n, n.pendingProps.children, i), n.child;
      case 10:
        return l = n.pendingProps, Kn(n, n.type, l.value), ct(e, n, l.children, i), n.child;
      case 9:
        return c = n.type._context, l = n.pendingProps.children, za(n), c = ut(c), l = l(c), n.flags |= 1, ct(e, n, l, i), n.child;
      case 14:
        return fm(e, n, n.type, n.pendingProps, i);
      case 15:
        return dm(e, n, n.type, n.pendingProps, i);
      case 19:
        return Em(e, n, i);
      case 31:
        return $1(e, n, i);
      case 22:
        return hm(e, n, i, n.pendingProps);
      case 24:
        return za(n), l = ut(Fe), e === null ? (c = ic(), c === null && (c = Le, s = nc(), c.pooledCache = s, s.refCount++, s !== null && (c.pooledCacheLanes |= i), c = s), n.memoizedState = {
          parent: l,
          cache: c
        }, lc(n), Kn(n, Fe, c)) : ((e.lanes & i) !== 0 && (oc(e, n), _r(n, null, null, i), br()), c = e.memoizedState, s = n.memoizedState, c.parent !== l ? (c = {
          parent: l,
          cache: l
        }, n.memoizedState = c, n.lanes === 0 && (n.memoizedState = n.updateQueue.baseState = c), Kn(n, Fe, l)) : (l = s.cache, Kn(n, Fe, l), l !== c.cache && tc(n, [Fe], i, !0))), ct(e, n, n.pendingProps.children, i), n.child;
      case 29:
        throw n.pendingProps;
    }
    throw Error(u(156, n.tag));
  }
  function Nn(e) {
    e.flags |= 4;
  }
  function Xc(e, n, i, l, c) {
    if ((n = (e.mode & 32) !== 0) && (n = !1), n) {
      if (e.flags |= 16777216, (c & 335544128) === c) if (e.stateNode.complete) e.flags |= 8192;
      else if (Fm()) e.flags |= 8192;
      else throw La = xl, rc;
    } else e.flags &= -16777217;
  }
  function Tm(e, n) {
    if (n.type !== "stylesheet" || (n.state.loading & 4) !== 0) e.flags &= -16777217;
    else if (e.flags |= 16777216, !Zv(n)) if (Fm()) e.flags |= 8192;
    else throw La = xl, rc;
  }
  function Ql(e, n) {
    n !== null && (e.flags |= 4), e.flags & 16384 && (n = e.tag !== 22 ? id() : 536870912, e.lanes |= n, Ci |= n);
  }
  function Cr(e, n) {
    if (!Te) switch (e.tailMode) {
      case "hidden":
        n = e.tail;
        for (var i = null; n !== null; ) n.alternate !== null && (i = n), n = n.sibling;
        i === null ? e.tail = null : i.sibling = null;
        break;
      case "collapsed":
        i = e.tail;
        for (var l = null; i !== null; ) i.alternate !== null && (l = i), i = i.sibling;
        l === null ? n || e.tail === null ? e.tail = null : e.tail.sibling = null : l.sibling = null;
    }
  }
  function je(e) {
    var n = e.alternate !== null && e.alternate.child === e.child, i = 0, l = 0;
    if (n) for (var c = e.child; c !== null; ) i |= c.lanes | c.childLanes, l |= c.subtreeFlags & 65011712, l |= c.flags & 65011712, c.return = e, c = c.sibling;
    else for (c = e.child; c !== null; ) i |= c.lanes | c.childLanes, l |= c.subtreeFlags, l |= c.flags, c.return = e, c = c.sibling;
    return e.subtreeFlags |= l, e.childLanes = i, n;
  }
  function Q1(e, n, i) {
    var l = n.pendingProps;
    switch (Qu(n), n.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return je(n), null;
      case 1:
        return je(n), null;
      case 3:
        return i = n.stateNode, l = null, e !== null && (l = e.memoizedState.cache), n.memoizedState.cache !== l && (n.flags |= 2048), On(Fe), re(), i.pendingContext && (i.context = i.pendingContext, i.pendingContext = null), (e === null || e.child === null) && (hi(n) ? Nn(n) : e === null || e.memoizedState.isDehydrated && (n.flags & 256) === 0 || (n.flags |= 1024, Ku())), je(n), null;
      case 26:
        var c = n.type, s = n.memoizedState;
        return e === null ? (Nn(n), s !== null ? (je(n), Tm(n, s)) : (je(n), Xc(n, c, null, l, i))) : s ? s !== e.memoizedState ? (Nn(n), je(n), Tm(n, s)) : (je(n), n.flags &= -16777217) : (e = e.memoizedProps, e !== l && Nn(n), je(n), Xc(n, c, e, l, i)), null;
      case 27:
        if (Yn(n), i = fe.current, c = n.type, e !== null && n.stateNode != null) e.memoizedProps !== l && Nn(n);
        else {
          if (!l) {
            if (n.stateNode === null) throw Error(u(166));
            return je(n), null;
          }
          e = ae.current, hi(n) ? rh(n, e) : (e = Nv(c, l, i), n.stateNode = e, Nn(n));
        }
        return je(n), null;
      case 5:
        if (Yn(n), c = n.type, e !== null && n.stateNode != null) e.memoizedProps !== l && Nn(n);
        else {
          if (!l) {
            if (n.stateNode === null) throw Error(u(166));
            return je(n), null;
          }
          if (s = ae.current, hi(n)) rh(n, s);
          else {
            var m = fo(fe.current);
            switch (s) {
              case 1:
                s = m.createElementNS("http://www.w3.org/2000/svg", c);
                break;
              case 2:
                s = m.createElementNS("http://www.w3.org/1998/Math/MathML", c);
                break;
              default:
                switch (c) {
                  case "svg":
                    s = m.createElementNS("http://www.w3.org/2000/svg", c);
                    break;
                  case "math":
                    s = m.createElementNS("http://www.w3.org/1998/Math/MathML", c);
                    break;
                  case "script":
                    s = m.createElement("div"), s.innerHTML = "<script><\/script>", s = s.removeChild(s.firstChild);
                    break;
                  case "select":
                    s = typeof l.is == "string" ? m.createElement("select", { is: l.is }) : m.createElement("select"), l.multiple ? s.multiple = !0 : l.size && (s.size = l.size);
                    break;
                  default:
                    s = typeof l.is == "string" ? m.createElement(c, { is: l.is }) : m.createElement(c);
                }
            }
            s[lt] = n, s[mt] = l;
            e: for (m = n.child; m !== null; ) {
              if (m.tag === 5 || m.tag === 6) s.appendChild(m.stateNode);
              else if (m.tag !== 4 && m.tag !== 27 && m.child !== null) {
                m.child.return = m, m = m.child;
                continue;
              }
              if (m === n) break e;
              for (; m.sibling === null; ) {
                if (m.return === null || m.return === n) break e;
                m = m.return;
              }
              m.sibling.return = m.return, m = m.sibling;
            }
            n.stateNode = s;
            e: switch (st(s, c, l), c) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                l = !!l.autoFocus;
                break e;
              case "img":
                l = !0;
                break e;
              default:
                l = !1;
            }
            l && Nn(n);
          }
        }
        return je(n), Xc(n, n.type, e === null ? null : e.memoizedProps, n.pendingProps, i), null;
      case 6:
        if (e && n.stateNode != null) e.memoizedProps !== l && Nn(n);
        else {
          if (typeof l != "string" && n.stateNode === null) throw Error(u(166));
          if (e = fe.current, hi(n)) {
            if (e = n.stateNode, i = n.memoizedProps, l = null, c = ot, c !== null) switch (c.tag) {
              case 27:
              case 5:
                l = c.memoizedProps;
            }
            e[lt] = n, e = !!(e.nodeValue === i || l !== null && l.suppressHydrationWarning === !0 || _v(e.nodeValue, i)), e || Wn(n, !0);
          } else e = fo(e).createTextNode(l), e[lt] = n, n.stateNode = e;
        }
        return je(n), null;
      case 31:
        if (i = n.memoizedState, e === null || e.memoizedState !== null) {
          if (l = hi(n), i !== null) {
            if (e === null) {
              if (!l) throw Error(u(318));
              if (e = n.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(u(557));
              e[lt] = n;
            } else Da(), (n.flags & 128) === 0 && (n.memoizedState = null), n.flags |= 4;
            je(n), e = !1;
          } else i = Ku(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = i), e = !0;
          if (!e)
            return n.flags & 256 ? (Mt(n), n) : (Mt(n), null);
          if ((n.flags & 128) !== 0) throw Error(u(558));
        }
        return je(n), null;
      case 13:
        if (l = n.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
          if (c = hi(n), l !== null && l.dehydrated !== null) {
            if (e === null) {
              if (!c) throw Error(u(318));
              if (c = n.memoizedState, c = c !== null ? c.dehydrated : null, !c) throw Error(u(317));
              c[lt] = n;
            } else Da(), (n.flags & 128) === 0 && (n.memoizedState = null), n.flags |= 4;
            je(n), c = !1;
          } else c = Ku(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = c), c = !0;
          if (!c)
            return n.flags & 256 ? (Mt(n), n) : (Mt(n), null);
        }
        return Mt(n), (n.flags & 128) !== 0 ? (n.lanes = i, n) : (i = l !== null, e = e !== null && e.memoizedState !== null, i && (l = n.child, c = null, l.alternate !== null && l.alternate.memoizedState !== null && l.alternate.memoizedState.cachePool !== null && (c = l.alternate.memoizedState.cachePool.pool), s = null, l.memoizedState !== null && l.memoizedState.cachePool !== null && (s = l.memoizedState.cachePool.pool), s !== c && (l.flags |= 2048)), i !== e && i && (n.child.flags |= 8192), Ql(n, n.updateQueue), je(n), null);
      case 4:
        return re(), e === null && pv(n.stateNode.containerInfo), je(n), null;
      case 10:
        return On(n.type), je(n), null;
      case 19:
        if (Y(Ie), l = n.memoizedState, l === null) return je(n), null;
        if (c = (n.flags & 128) !== 0, s = l.rendering, s === null) if (c) Cr(l, !1);
        else {
          if (Ye !== 0 || e !== null && (e.flags & 128) !== 0) for (e = n.child; e !== null; ) {
            if (s = Bl(e), s !== null) {
              for (n.flags |= 128, Cr(l, !1), e = s.updateQueue, n.updateQueue = e, Ql(n, e), n.subtreeFlags = 0, e = i, i = n.child; i !== null; ) eh(i, e), i = i.sibling;
              return W(Ie, Ie.current & 1 | 2), Te && wn(n, l.treeForkCount), n.child;
            }
            e = e.sibling;
          }
          l.tail !== null && Tt() > to && (n.flags |= 128, c = !0, Cr(l, !1), n.lanes = 4194304);
        }
        else {
          if (!c) if (e = Bl(s), e !== null) {
            if (n.flags |= 128, c = !0, e = e.updateQueue, n.updateQueue = e, Ql(n, e), Cr(l, !0), l.tail === null && l.tailMode === "hidden" && !s.alternate && !Te) return je(n), null;
          } else 2 * Tt() - l.renderingStartTime > to && i !== 536870912 && (n.flags |= 128, c = !0, Cr(l, !1), n.lanes = 4194304);
          l.isBackwards ? (s.sibling = n.child, n.child = s) : (e = l.last, e !== null ? e.sibling = s : n.child = s, l.last = s);
        }
        return l.tail !== null ? (e = l.tail, l.rendering = e, l.tail = e.sibling, l.renderingStartTime = Tt(), e.sibling = null, i = Ie.current, W(Ie, c ? i & 1 | 2 : i & 1), Te && wn(n, l.treeForkCount), e) : (je(n), null);
      case 22:
      case 23:
        return Mt(n), fc(), l = n.memoizedState !== null, e !== null ? e.memoizedState !== null !== l && (n.flags |= 8192) : l && (n.flags |= 8192), l ? (i & 536870912) !== 0 && (n.flags & 128) === 0 && (je(n), n.subtreeFlags & 6 && (n.flags |= 8192)) : je(n), i = n.updateQueue, i !== null && Ql(n, i.retryQueue), i = null, e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (i = e.memoizedState.cachePool.pool), l = null, n.memoizedState !== null && n.memoizedState.cachePool !== null && (l = n.memoizedState.cachePool.pool), l !== i && (n.flags |= 2048), e !== null && Y(xa), null;
      case 24:
        return i = null, e !== null && (i = e.memoizedState.cache), n.memoizedState.cache !== i && (n.flags |= 2048), On(Fe), je(n), null;
      case 25:
        return null;
      case 30:
        return null;
    }
    throw Error(u(156, n.tag));
  }
  function W1(e, n) {
    switch (Qu(n), n.tag) {
      case 1:
        return e = n.flags, e & 65536 ? (n.flags = e & -65537 | 128, n) : null;
      case 3:
        return On(Fe), re(), e = n.flags, (e & 65536) !== 0 && (e & 128) === 0 ? (n.flags = e & -65537 | 128, n) : null;
      case 26:
      case 27:
      case 5:
        return Yn(n), null;
      case 31:
        if (n.memoizedState !== null) {
          if (Mt(n), n.alternate === null) throw Error(u(340));
          Da();
        }
        return e = n.flags, e & 65536 ? (n.flags = e & -65537 | 128, n) : null;
      case 13:
        if (Mt(n), e = n.memoizedState, e !== null && e.dehydrated !== null) {
          if (n.alternate === null) throw Error(u(340));
          Da();
        }
        return e = n.flags, e & 65536 ? (n.flags = e & -65537 | 128, n) : null;
      case 19:
        return Y(Ie), null;
      case 4:
        return re(), null;
      case 10:
        return On(n.type), null;
      case 22:
      case 23:
        return Mt(n), fc(), e !== null && Y(xa), e = n.flags, e & 65536 ? (n.flags = e & -65537 | 128, n) : null;
      case 24:
        return On(Fe), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function Am(e, n) {
    switch (Qu(n), n.tag) {
      case 3:
        On(Fe), re();
        break;
      case 26:
      case 27:
      case 5:
        Yn(n);
        break;
      case 4:
        re();
        break;
      case 31:
        n.memoizedState !== null && Mt(n);
        break;
      case 13:
        Mt(n);
        break;
      case 19:
        Y(Ie);
        break;
      case 10:
        On(n.type);
        break;
      case 22:
      case 23:
        Mt(n), fc(), e !== null && Y(xa);
        break;
      case 24:
        On(Fe);
    }
  }
  function Or(e, n) {
    try {
      var i = n.updateQueue, l = i !== null ? i.lastEffect : null;
      if (l !== null) {
        var c = l.next;
        i = c;
        do {
          if ((i.tag & e) === e) {
            l = void 0;
            var s = i.create, m = i.inst;
            l = s(), m.destroy = l;
          }
          i = i.next;
        } while (i !== c);
      }
    } catch (y) {
      Ne(n, n.return, y);
    }
  }
  function na(e, n, i) {
    try {
      var l = n.updateQueue, c = l !== null ? l.lastEffect : null;
      if (c !== null) {
        var s = c.next;
        l = s;
        do {
          if ((l.tag & e) === e) {
            var m = l.inst, y = m.destroy;
            if (y !== void 0) {
              m.destroy = void 0, c = n;
              var A = i, x = y;
              try {
                x();
              } catch (P) {
                Ne(c, A, P);
              }
            }
          }
          l = l.next;
        } while (l !== s);
      }
    } catch (P) {
      Ne(n, n.return, P);
    }
  }
  function wm(e) {
    var n = e.updateQueue;
    if (n !== null) {
      var i = e.stateNode;
      try {
        yh(n, i);
      } catch (l) {
        Ne(e, e.return, l);
      }
    }
  }
  function Cm(e, n, i) {
    i.props = Ga(e.type, e.memoizedProps), i.state = e.memoizedState;
    try {
      i.componentWillUnmount();
    } catch (l) {
      Ne(e, n, l);
    }
  }
  function Rr(e, n) {
    try {
      var i = e.ref;
      if (i !== null) {
        switch (e.tag) {
          case 26:
          case 27:
          case 5:
            var l = e.stateNode;
            break;
          case 30:
            l = e.stateNode;
            break;
          default:
            l = e.stateNode;
        }
        typeof i == "function" ? e.refCleanup = i(l) : i.current = l;
      }
    } catch (c) {
      Ne(e, n, c);
    }
  }
  function sn(e, n) {
    var i = e.ref, l = e.refCleanup;
    if (i !== null) if (typeof l == "function") try {
      l();
    } catch (c) {
      Ne(e, n, c);
    } finally {
      e.refCleanup = null, e = e.alternate, e != null && (e.refCleanup = null);
    }
    else if (typeof i == "function") try {
      i(null);
    } catch (c) {
      Ne(e, n, c);
    }
    else i.current = null;
  }
  function Om(e) {
    var n = e.type, i = e.memoizedProps, l = e.stateNode;
    try {
      e: switch (n) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          i.autoFocus && l.focus();
          break e;
        case "img":
          i.src ? l.src = i.src : i.srcSet && (l.srcset = i.srcSet);
      }
    } catch (c) {
      Ne(e, e.return, c);
    }
  }
  function kc(e, n, i) {
    try {
      var l = e.stateNode;
      gb(l, e.type, i, n), l[mt] = n;
    } catch (c) {
      Ne(e, e.return, c);
    }
  }
  function Rm(e) {
    return e.tag === 5 || e.tag === 3 || e.tag === 26 || e.tag === 27 && ca(e.type) || e.tag === 4;
  }
  function Vc(e) {
    e: for (; ; ) {
      for (; e.sibling === null; ) {
        if (e.return === null || Rm(e.return)) return null;
        e = e.return;
      }
      for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
        if (e.tag === 27 && ca(e.type) || e.flags & 2 || e.child === null || e.tag === 4) continue e;
        e.child.return = e, e = e.child;
      }
      if (!(e.flags & 2)) return e.stateNode;
    }
  }
  function Yc(e, n, i) {
    var l = e.tag;
    if (l === 5 || l === 6) e = e.stateNode, n ? (i.nodeType === 9 ? i.body : i.nodeName === "HTML" ? i.ownerDocument.body : i).insertBefore(e, n) : (n = i.nodeType === 9 ? i.body : i.nodeName === "HTML" ? i.ownerDocument.body : i, n.appendChild(e), i = i._reactRootContainer, i != null || n.onclick !== null || (n.onclick = Sn));
    else if (l !== 4 && (l === 27 && ca(e.type) && (i = e.stateNode, n = null), e = e.child, e !== null)) for (Yc(e, n, i), e = e.sibling; e !== null; ) Yc(e, n, i), e = e.sibling;
  }
  function Wl(e, n, i) {
    var l = e.tag;
    if (l === 5 || l === 6) e = e.stateNode, n ? i.insertBefore(e, n) : i.appendChild(e);
    else if (l !== 4 && (l === 27 && ca(e.type) && (i = e.stateNode), e = e.child, e !== null)) for (Wl(e, n, i), e = e.sibling; e !== null; ) Wl(e, n, i), e = e.sibling;
  }
  function Mm(e) {
    var n = e.stateNode, i = e.memoizedProps;
    try {
      for (var l = e.type, c = n.attributes; c.length; ) n.removeAttributeNode(c[0]);
      st(n, l, i), n[lt] = e, n[mt] = i;
    } catch (s) {
      Ne(e, e.return, s);
    }
  }
  var zn = !1, Ke = !1, qc = !1, Dm = typeof WeakSet == "function" ? WeakSet : Set, rt = null;
  function K1(e, n) {
    if (e = e.containerInfo, ds = bo, e = Yd(e), Zu(e)) {
      if ("selectionStart" in e) var i = {
        start: e.selectionStart,
        end: e.selectionEnd
      };
      else e: {
        i = (i = e.ownerDocument) && i.defaultView || window;
        var l = i.getSelection && i.getSelection();
        if (l && l.rangeCount !== 0) {
          i = l.anchorNode;
          var c = l.anchorOffset, s = l.focusNode;
          l = l.focusOffset;
          try {
            i.nodeType, s.nodeType;
          } catch {
            i = null;
            break e;
          }
          var m = 0, y = -1, A = -1, x = 0, P = 0, q = e, U = null;
          t: for (; ; ) {
            for (var Z; q !== i || c !== 0 && q.nodeType !== 3 || (y = m + c), q !== s || l !== 0 && q.nodeType !== 3 || (A = m + l), q.nodeType === 3 && (m += q.nodeValue.length), (Z = q.firstChild) !== null; )
              U = q, q = Z;
            for (; ; ) {
              if (q === e) break t;
              if (U === i && ++x === c && (y = m), U === s && ++P === l && (A = m), (Z = q.nextSibling) !== null) break;
              q = U, U = q.parentNode;
            }
            q = Z;
          }
          i = y === -1 || A === -1 ? null : {
            start: y,
            end: A
          };
        } else i = null;
      }
      i = i || {
        start: 0,
        end: 0
      };
    } else i = null;
    for (hs = {
      focusedElem: e,
      selectionRange: i
    }, bo = !1, rt = n; rt !== null; ) if (n = rt, e = n.child, (n.subtreeFlags & 1028) !== 0 && e !== null) e.return = n, rt = e;
    else for (; rt !== null; ) {
      switch (n = rt, s = n.alternate, e = n.flags, n.tag) {
        case 0:
          if ((e & 4) !== 0 && (e = n.updateQueue, e = e !== null ? e.events : null, e !== null)) for (i = 0; i < e.length; i++) c = e[i], c.ref.impl = c.nextImpl;
          break;
        case 11:
        case 15:
          break;
        case 1:
          if ((e & 1024) !== 0 && s !== null) {
            e = void 0, i = n, c = s.memoizedProps, s = s.memoizedState, l = i.stateNode;
            try {
              var ie = Ga(i.type, c);
              e = l.getSnapshotBeforeUpdate(ie, s), l.__reactInternalSnapshotBeforeUpdate = e;
            } catch (ue) {
              Ne(i, i.return, ue);
            }
          }
          break;
        case 3:
          if ((e & 1024) !== 0) {
            if (e = n.stateNode.containerInfo, i = e.nodeType, i === 9) ps(e);
            else if (i === 1) switch (e.nodeName) {
              case "HEAD":
              case "HTML":
              case "BODY":
                ps(e);
                break;
              default:
                e.textContent = "";
            }
          }
          break;
        case 5:
        case 26:
        case 27:
        case 6:
        case 4:
        case 17:
          break;
        default:
          if ((e & 1024) !== 0) throw Error(u(163));
      }
      if (e = n.sibling, e !== null) {
        e.return = n.return, rt = e;
        break;
      }
      rt = n.return;
    }
  }
  function Nm(e, n, i) {
    var l = i.flags;
    switch (i.tag) {
      case 0:
      case 11:
      case 15:
        Hn(e, i), l & 4 && Or(5, i);
        break;
      case 1:
        if (Hn(e, i), l & 4) if (e = i.stateNode, n === null) try {
          e.componentDidMount();
        } catch (m) {
          Ne(i, i.return, m);
        }
        else {
          var c = Ga(i.type, n.memoizedProps);
          n = n.memoizedState;
          try {
            e.componentDidUpdate(c, n, e.__reactInternalSnapshotBeforeUpdate);
          } catch (m) {
            Ne(i, i.return, m);
          }
        }
        l & 64 && wm(i), l & 512 && Rr(i, i.return);
        break;
      case 3:
        if (Hn(e, i), l & 64 && (e = i.updateQueue, e !== null)) {
          if (n = null, i.child !== null) switch (i.child.tag) {
            case 27:
            case 5:
              n = i.child.stateNode;
              break;
            case 1:
              n = i.child.stateNode;
          }
          try {
            yh(e, n);
          } catch (m) {
            Ne(i, i.return, m);
          }
        }
        break;
      case 27:
        n === null && l & 4 && Mm(i);
      case 26:
      case 5:
        Hn(e, i), n === null && l & 4 && Om(i), l & 512 && Rr(i, i.return);
        break;
      case 12:
        Hn(e, i);
        break;
      case 31:
        Hn(e, i), l & 4 && Hm(e, i);
        break;
      case 13:
        Hn(e, i), l & 4 && Lm(e, i), l & 64 && (e = i.memoizedState, e !== null && (e = e.dehydrated, e !== null && (i = ob.bind(null, i), wb(e, i))));
        break;
      case 22:
        if (l = i.memoizedState !== null || zn, !l) {
          n = n !== null && n.memoizedState !== null || Ke, c = zn;
          var s = Ke;
          zn = l, (Ke = n) && !s ? Ln(e, i, (i.subtreeFlags & 8772) !== 0) : Hn(e, i), zn = c, Ke = s;
        }
        break;
      case 30:
        break;
      default:
        Hn(e, i);
    }
  }
  function zm(e) {
    var n = e.alternate;
    n !== null && (e.alternate = null, zm(n)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (n = e.stateNode, n !== null && Su(n)), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
  }
  var Pe = null, pt = !1;
  function xn(e, n, i) {
    for (i = i.child; i !== null; ) xm(e, n, i), i = i.sibling;
  }
  function xm(e, n, i) {
    if (At && typeof At.onCommitFiberUnmount == "function") try {
      At.onCommitFiberUnmount(Ki, i);
    } catch {
    }
    switch (i.tag) {
      case 26:
        Ke || sn(i, n), xn(e, n, i), i.memoizedState ? i.memoizedState.count-- : i.stateNode && (i = i.stateNode, i.parentNode.removeChild(i));
        break;
      case 27:
        Ke || sn(i, n);
        var l = Pe, c = pt;
        ca(i.type) && (Pe = i.stateNode, pt = !1), xn(e, n, i), Br(i.stateNode), Pe = l, pt = c;
        break;
      case 5:
        Ke || sn(i, n);
      case 6:
        if (l = Pe, c = pt, Pe = null, xn(e, n, i), Pe = l, pt = c, Pe !== null) if (pt) try {
          (Pe.nodeType === 9 ? Pe.body : Pe.nodeName === "HTML" ? Pe.ownerDocument.body : Pe).removeChild(i.stateNode);
        } catch (s) {
          Ne(i, n, s);
        }
        else try {
          Pe.removeChild(i.stateNode);
        } catch (s) {
          Ne(i, n, s);
        }
        break;
      case 18:
        Pe !== null && (pt ? (e = Pe, Cv(e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e, i.stateNode), Hi(e)) : Cv(Pe, i.stateNode));
        break;
      case 4:
        l = Pe, c = pt, Pe = i.stateNode.containerInfo, pt = !0, xn(e, n, i), Pe = l, pt = c;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        na(2, i, n), Ke || na(4, i, n), xn(e, n, i);
        break;
      case 1:
        Ke || (sn(i, n), l = i.stateNode, typeof l.componentWillUnmount == "function" && Cm(i, n, l)), xn(e, n, i);
        break;
      case 21:
        xn(e, n, i);
        break;
      case 22:
        Ke = (l = Ke) || i.memoizedState !== null, xn(e, n, i), Ke = l;
        break;
      default:
        xn(e, n, i);
    }
  }
  function Hm(e, n) {
    if (n.memoizedState === null && (e = n.alternate, e !== null && (e = e.memoizedState, e !== null))) {
      e = e.dehydrated;
      try {
        Hi(e);
      } catch (i) {
        Ne(n, n.return, i);
      }
    }
  }
  function Lm(e, n) {
    if (n.memoizedState === null && (e = n.alternate, e !== null && (e = e.memoizedState, e !== null && (e = e.dehydrated, e !== null)))) try {
      Hi(e);
    } catch (i) {
      Ne(n, n.return, i);
    }
  }
  function J1(e) {
    switch (e.tag) {
      case 31:
      case 13:
      case 19:
        var n = e.stateNode;
        return n === null && (n = e.stateNode = new Dm()), n;
      case 22:
        return e = e.stateNode, n = e._retryCache, n === null && (n = e._retryCache = new Dm()), n;
      default:
        throw Error(u(435, e.tag));
    }
  }
  function Kl(e, n) {
    var i = J1(e);
    n.forEach(function(l) {
      if (!i.has(l)) {
        i.add(l);
        var c = ub.bind(null, e, l);
        l.then(c, c);
      }
    });
  }
  function gt(e, n) {
    var i = n.deletions;
    if (i !== null) for (var l = 0; l < i.length; l++) {
      var c = i[l], s = e, m = n, y = m;
      e: for (; y !== null; ) {
        switch (y.tag) {
          case 27:
            if (ca(y.type)) {
              Pe = y.stateNode, pt = !1;
              break e;
            }
            break;
          case 5:
            Pe = y.stateNode, pt = !1;
            break e;
          case 3:
          case 4:
            Pe = y.stateNode.containerInfo, pt = !0;
            break e;
        }
        y = y.return;
      }
      if (Pe === null) throw Error(u(160));
      xm(s, m, c), Pe = null, pt = !1, s = c.alternate, s !== null && (s.return = null), c.return = null;
    }
    if (n.subtreeFlags & 13886) for (n = n.child; n !== null; ) Um(n, e), n = n.sibling;
  }
  var Jt = null;
  function Um(e, n) {
    var i = e.alternate, l = e.flags;
    switch (e.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        gt(n, e), yt(e), l & 4 && (na(3, e, e.return), Or(3, e), na(5, e, e.return));
        break;
      case 1:
        gt(n, e), yt(e), l & 512 && (Ke || i === null || sn(i, i.return)), l & 64 && zn && (e = e.updateQueue, e !== null && (l = e.callbacks, l !== null && (i = e.shared.hiddenCallbacks, e.shared.hiddenCallbacks = i === null ? l : i.concat(l))));
        break;
      case 26:
        var c = Jt;
        if (gt(n, e), yt(e), l & 512 && (Ke || i === null || sn(i, i.return)), l & 4) {
          var s = i !== null ? i.memoizedState : null;
          if (l = e.memoizedState, i === null) if (l === null) if (e.stateNode === null) {
            e: {
              l = e.type, i = e.memoizedProps, c = c.ownerDocument || c;
              t: switch (l) {
                case "title":
                  s = c.getElementsByTagName("title")[0], (!s || s[tr] || s[lt] || s.namespaceURI === "http://www.w3.org/2000/svg" || s.hasAttribute("itemprop")) && (s = c.createElement(l), c.head.insertBefore(s, c.querySelector("head > title"))), st(s, l, i), s[lt] = e, it(s), l = s;
                  break e;
                case "link":
                  var m = Bv("link", "href", c).get(l + (i.href || ""));
                  if (m) {
                    for (var y = 0; y < m.length; y++) if (s = m[y], s.getAttribute("href") === (i.href == null || i.href === "" ? null : i.href) && s.getAttribute("rel") === (i.rel == null ? null : i.rel) && s.getAttribute("title") === (i.title == null ? null : i.title) && s.getAttribute("crossorigin") === (i.crossOrigin == null ? null : i.crossOrigin)) {
                      m.splice(y, 1);
                      break t;
                    }
                  }
                  s = c.createElement(l), st(s, l, i), c.head.appendChild(s);
                  break;
                case "meta":
                  if (m = Bv("meta", "content", c).get(l + (i.content || ""))) {
                    for (y = 0; y < m.length; y++) if (s = m[y], s.getAttribute("content") === (i.content == null ? null : "" + i.content) && s.getAttribute("name") === (i.name == null ? null : i.name) && s.getAttribute("property") === (i.property == null ? null : i.property) && s.getAttribute("http-equiv") === (i.httpEquiv == null ? null : i.httpEquiv) && s.getAttribute("charset") === (i.charSet == null ? null : i.charSet)) {
                      m.splice(y, 1);
                      break t;
                    }
                  }
                  s = c.createElement(l), st(s, l, i), c.head.appendChild(s);
                  break;
                default:
                  throw Error(u(468, l));
              }
              s[lt] = e, it(s), l = s;
            }
            e.stateNode = l;
          } else jv(c, e.type, e.stateNode);
          else e.stateNode = Uv(c, l, e.memoizedProps);
          else s !== l ? (s === null ? i.stateNode !== null && (i = i.stateNode, i.parentNode.removeChild(i)) : s.count--, l === null ? jv(c, e.type, e.stateNode) : Uv(c, l, e.memoizedProps)) : l === null && e.stateNode !== null && kc(e, e.memoizedProps, i.memoizedProps);
        }
        break;
      case 27:
        gt(n, e), yt(e), l & 512 && (Ke || i === null || sn(i, i.return)), i !== null && l & 4 && kc(e, e.memoizedProps, i.memoizedProps);
        break;
      case 5:
        if (gt(n, e), yt(e), l & 512 && (Ke || i === null || sn(i, i.return)), e.flags & 32) {
          c = e.stateNode;
          try {
            ai(c, "");
          } catch (ie) {
            Ne(e, e.return, ie);
          }
        }
        l & 4 && e.stateNode != null && (c = e.memoizedProps, kc(e, c, i !== null ? i.memoizedProps : c)), l & 1024 && (qc = !0);
        break;
      case 6:
        if (gt(n, e), yt(e), l & 4) {
          if (e.stateNode === null) throw Error(u(162));
          l = e.memoizedProps, i = e.stateNode;
          try {
            i.nodeValue = l;
          } catch (ie) {
            Ne(e, e.return, ie);
          }
        }
        break;
      case 3:
        if (vo = null, c = Jt, Jt = ho(n.containerInfo), gt(n, e), Jt = c, yt(e), l & 4 && i !== null && i.memoizedState.isDehydrated) try {
          Hi(n.containerInfo);
        } catch (ie) {
          Ne(e, e.return, ie);
        }
        qc && (qc = !1, Bm(e));
        break;
      case 4:
        l = Jt, Jt = ho(e.stateNode.containerInfo), gt(n, e), yt(e), Jt = l;
        break;
      case 12:
        gt(n, e), yt(e);
        break;
      case 31:
        gt(n, e), yt(e), l & 4 && (l = e.updateQueue, l !== null && (e.updateQueue = null, Kl(e, l)));
        break;
      case 13:
        gt(n, e), yt(e), e.child.flags & 8192 && e.memoizedState !== null != (i !== null && i.memoizedState !== null) && (eo = Tt()), l & 4 && (l = e.updateQueue, l !== null && (e.updateQueue = null, Kl(e, l)));
        break;
      case 22:
        c = e.memoizedState !== null;
        var A = i !== null && i.memoizedState !== null, x = zn, P = Ke;
        if (zn = x || c, Ke = P || A, gt(n, e), Ke = P, zn = x, yt(e), l & 8192) e: for (n = e.stateNode, n._visibility = c ? n._visibility & -2 : n._visibility | 1, c && (i === null || A || zn || Ke || Pa(e)), i = null, n = e; ; ) {
          if (n.tag === 5 || n.tag === 26) {
            if (i === null) {
              A = i = n;
              try {
                if (s = A.stateNode, c) m = s.style, typeof m.setProperty == "function" ? m.setProperty("display", "none", "important") : m.display = "none";
                else {
                  y = A.stateNode;
                  var q = A.memoizedProps.style, U = q != null && q.hasOwnProperty("display") ? q.display : null;
                  y.style.display = U == null || typeof U == "boolean" ? "" : ("" + U).trim();
                }
              } catch (ie) {
                Ne(A, A.return, ie);
              }
            }
          } else if (n.tag === 6) {
            if (i === null) {
              A = n;
              try {
                A.stateNode.nodeValue = c ? "" : A.memoizedProps;
              } catch (ie) {
                Ne(A, A.return, ie);
              }
            }
          } else if (n.tag === 18) {
            if (i === null) {
              A = n;
              try {
                var Z = A.stateNode;
                c ? Ov(Z, !0) : Ov(A.stateNode, !1);
              } catch (ie) {
                Ne(A, A.return, ie);
              }
            }
          } else if ((n.tag !== 22 && n.tag !== 23 || n.memoizedState === null || n === e) && n.child !== null) {
            n.child.return = n, n = n.child;
            continue;
          }
          if (n === e) break e;
          for (; n.sibling === null; ) {
            if (n.return === null || n.return === e) break e;
            i === n && (i = null), n = n.return;
          }
          i === n && (i = null), n.sibling.return = n.return, n = n.sibling;
        }
        l & 4 && (l = e.updateQueue, l !== null && (i = l.retryQueue, i !== null && (l.retryQueue = null, Kl(e, i))));
        break;
      case 19:
        gt(n, e), yt(e), l & 4 && (l = e.updateQueue, l !== null && (e.updateQueue = null, Kl(e, l)));
        break;
      case 30:
        break;
      case 21:
        break;
      default:
        gt(n, e), yt(e);
    }
  }
  function yt(e) {
    var n = e.flags;
    if (n & 2) {
      try {
        for (var i, l = e.return; l !== null; ) {
          if (Rm(l)) {
            i = l;
            break;
          }
          l = l.return;
        }
        if (i == null) throw Error(u(160));
        switch (i.tag) {
          case 27:
            var c = i.stateNode;
            Wl(e, Vc(e), c);
            break;
          case 5:
            var s = i.stateNode;
            i.flags & 32 && (ai(s, ""), i.flags &= -33), Wl(e, Vc(e), s);
            break;
          case 3:
          case 4:
            var m = i.stateNode.containerInfo;
            Yc(e, Vc(e), m);
            break;
          default:
            throw Error(u(161));
        }
      } catch (y) {
        Ne(e, e.return, y);
      }
      e.flags &= -3;
    }
    n & 4096 && (e.flags &= -4097);
  }
  function Bm(e) {
    if (e.subtreeFlags & 1024) for (e = e.child; e !== null; ) {
      var n = e;
      Bm(n), n.tag === 5 && n.flags & 1024 && n.stateNode.reset(), e = e.sibling;
    }
  }
  function Hn(e, n) {
    if (n.subtreeFlags & 8772) for (n = n.child; n !== null; ) Nm(e, n.alternate, n), n = n.sibling;
  }
  function Pa(e) {
    for (e = e.child; e !== null; ) {
      var n = e;
      switch (n.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          na(4, n, n.return), Pa(n);
          break;
        case 1:
          sn(n, n.return);
          var i = n.stateNode;
          typeof i.componentWillUnmount == "function" && Cm(n, n.return, i), Pa(n);
          break;
        case 27:
          Br(n.stateNode);
        case 26:
        case 5:
          sn(n, n.return), Pa(n);
          break;
        case 22:
          n.memoizedState === null && Pa(n);
          break;
        case 30:
          Pa(n);
          break;
        default:
          Pa(n);
      }
      e = e.sibling;
    }
  }
  function Ln(e, n, i) {
    for (i = i && (n.subtreeFlags & 8772) !== 0, n = n.child; n !== null; ) {
      var l = n.alternate, c = e, s = n, m = s.flags;
      switch (s.tag) {
        case 0:
        case 11:
        case 15:
          Ln(c, s, i), Or(4, s);
          break;
        case 1:
          if (Ln(c, s, i), l = s, c = l.stateNode, typeof c.componentDidMount == "function") try {
            c.componentDidMount();
          } catch (x) {
            Ne(l, l.return, x);
          }
          if (l = s, c = l.updateQueue, c !== null) {
            var y = l.stateNode;
            try {
              var A = c.shared.hiddenCallbacks;
              if (A !== null) for (c.shared.hiddenCallbacks = null, c = 0; c < A.length; c++) gh(A[c], y);
            } catch (x) {
              Ne(l, l.return, x);
            }
          }
          i && m & 64 && wm(s), Rr(s, s.return);
          break;
        case 27:
          Mm(s);
        case 26:
        case 5:
          Ln(c, s, i), i && l === null && m & 4 && Om(s), Rr(s, s.return);
          break;
        case 12:
          Ln(c, s, i);
          break;
        case 31:
          Ln(c, s, i), i && m & 4 && Hm(c, s);
          break;
        case 13:
          Ln(c, s, i), i && m & 4 && Lm(c, s);
          break;
        case 22:
          s.memoizedState === null && Ln(c, s, i), Rr(s, s.return);
          break;
        case 30:
          break;
        default:
          Ln(c, s, i);
      }
      n = n.sibling;
    }
  }
  function Ic(e, n) {
    var i = null;
    e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (i = e.memoizedState.cachePool.pool), e = null, n.memoizedState !== null && n.memoizedState.cachePool !== null && (e = n.memoizedState.cachePool.pool), e !== i && (e != null && e.refCount++, i != null && mr(i));
  }
  function $c(e, n) {
    e = null, n.alternate !== null && (e = n.alternate.memoizedState.cache), n = n.memoizedState.cache, n !== e && (n.refCount++, e != null && mr(e));
  }
  function en(e, n, i, l) {
    if (n.subtreeFlags & 10256) for (n = n.child; n !== null; ) jm(e, n, i, l), n = n.sibling;
  }
  function jm(e, n, i, l) {
    var c = n.flags;
    switch (n.tag) {
      case 0:
      case 11:
      case 15:
        en(e, n, i, l), c & 2048 && Or(9, n);
        break;
      case 1:
        en(e, n, i, l);
        break;
      case 3:
        en(e, n, i, l), c & 2048 && (e = null, n.alternate !== null && (e = n.alternate.memoizedState.cache), n = n.memoizedState.cache, n !== e && (n.refCount++, e != null && mr(e)));
        break;
      case 12:
        if (c & 2048) {
          en(e, n, i, l), e = n.stateNode;
          try {
            var s = n.memoizedProps, m = s.id, y = s.onPostCommit;
            typeof y == "function" && y(m, n.alternate === null ? "mount" : "update", e.passiveEffectDuration, -0);
          } catch (A) {
            Ne(n, n.return, A);
          }
        } else en(e, n, i, l);
        break;
      case 31:
        en(e, n, i, l);
        break;
      case 13:
        en(e, n, i, l);
        break;
      case 23:
        break;
      case 22:
        s = n.stateNode, m = n.alternate, n.memoizedState !== null ? s._visibility & 2 ? en(e, n, i, l) : Mr(e, n) : s._visibility & 2 ? en(e, n, i, l) : (s._visibility |= 2, Ti(e, n, i, l, (n.subtreeFlags & 10256) !== 0 || !1)), c & 2048 && Ic(m, n);
        break;
      case 24:
        en(e, n, i, l), c & 2048 && $c(n.alternate, n);
        break;
      default:
        en(e, n, i, l);
    }
  }
  function Ti(e, n, i, l, c) {
    for (c = c && ((n.subtreeFlags & 10256) !== 0 || !1), n = n.child; n !== null; ) {
      var s = e, m = n, y = i, A = l, x = m.flags;
      switch (m.tag) {
        case 0:
        case 11:
        case 15:
          Ti(s, m, y, A, c), Or(8, m);
          break;
        case 23:
          break;
        case 22:
          var P = m.stateNode;
          m.memoizedState !== null ? P._visibility & 2 ? Ti(s, m, y, A, c) : Mr(s, m) : (P._visibility |= 2, Ti(s, m, y, A, c)), c && x & 2048 && Ic(m.alternate, m);
          break;
        case 24:
          Ti(s, m, y, A, c), c && x & 2048 && $c(m.alternate, m);
          break;
        default:
          Ti(s, m, y, A, c);
      }
      n = n.sibling;
    }
  }
  function Mr(e, n) {
    if (n.subtreeFlags & 10256) for (n = n.child; n !== null; ) {
      var i = e, l = n, c = l.flags;
      switch (l.tag) {
        case 22:
          Mr(i, l), c & 2048 && Ic(l.alternate, l);
          break;
        case 24:
          Mr(i, l), c & 2048 && $c(l.alternate, l);
          break;
        default:
          Mr(i, l);
      }
      n = n.sibling;
    }
  }
  var Dr = 8192;
  function Ai(e, n, i) {
    if (e.subtreeFlags & Dr) for (e = e.child; e !== null; ) Zm(e, n, i), e = e.sibling;
  }
  function Zm(e, n, i) {
    switch (e.tag) {
      case 26:
        Ai(e, n, i), e.flags & Dr && e.memoizedState !== null && Bb(i, Jt, e.memoizedState, e.memoizedProps);
        break;
      case 5:
        Ai(e, n, i);
        break;
      case 3:
      case 4:
        var l = Jt;
        Jt = ho(e.stateNode.containerInfo), Ai(e, n, i), Jt = l;
        break;
      case 22:
        e.memoizedState === null && (l = e.alternate, l !== null && l.memoizedState !== null ? (l = Dr, Dr = 16777216, Ai(e, n, i), Dr = l) : Ai(e, n, i));
        break;
      default:
        Ai(e, n, i);
    }
  }
  function Gm(e) {
    var n = e.alternate;
    if (n !== null && (e = n.child, e !== null)) {
      n.child = null;
      do
        n = e.sibling, e.sibling = null, e = n;
      while (e !== null);
    }
  }
  function Nr(e) {
    var n = e.deletions;
    if ((e.flags & 16) !== 0) {
      if (n !== null) for (var i = 0; i < n.length; i++) {
        var l = n[i];
        rt = l, Xm(l, e);
      }
      Gm(e);
    }
    if (e.subtreeFlags & 10256) for (e = e.child; e !== null; ) Pm(e), e = e.sibling;
  }
  function Pm(e) {
    switch (e.tag) {
      case 0:
      case 11:
      case 15:
        Nr(e), e.flags & 2048 && na(9, e, e.return);
        break;
      case 3:
        Nr(e);
        break;
      case 12:
        Nr(e);
        break;
      case 22:
        var n = e.stateNode;
        e.memoizedState !== null && n._visibility & 2 && (e.return === null || e.return.tag !== 13) ? (n._visibility &= -3, Jl(e)) : Nr(e);
        break;
      default:
        Nr(e);
    }
  }
  function Jl(e) {
    var n = e.deletions;
    if ((e.flags & 16) !== 0) {
      if (n !== null) for (var i = 0; i < n.length; i++) {
        var l = n[i];
        rt = l, Xm(l, e);
      }
      Gm(e);
    }
    for (e = e.child; e !== null; ) {
      switch (n = e, n.tag) {
        case 0:
        case 11:
        case 15:
          na(8, n, n.return), Jl(n);
          break;
        case 22:
          i = n.stateNode, i._visibility & 2 && (i._visibility &= -3, Jl(n));
          break;
        default:
          Jl(n);
      }
      e = e.sibling;
    }
  }
  function Xm(e, n) {
    for (; rt !== null; ) {
      var i = rt;
      switch (i.tag) {
        case 0:
        case 11:
        case 15:
          na(8, i, n);
          break;
        case 23:
        case 22:
          if (i.memoizedState !== null && i.memoizedState.cachePool !== null) {
            var l = i.memoizedState.cachePool.pool;
            l != null && l.refCount++;
          }
          break;
        case 24:
          mr(i.memoizedState.cache);
      }
      if (l = i.child, l !== null) l.return = i, rt = l;
      else e: for (i = e; rt !== null; ) {
        l = rt;
        var c = l.sibling, s = l.return;
        if (zm(l), l === i) {
          rt = null;
          break e;
        }
        if (c !== null) {
          c.return = s, rt = c;
          break e;
        }
        rt = s;
      }
    }
  }
  var eb = {
    getCacheForType: function(e) {
      var n = ut(Fe), i = n.data.get(e);
      return i === void 0 && (i = e(), n.data.set(e, i)), i;
    },
    cacheSignal: function() {
      return ut(Fe).controller.signal;
    }
  }, tb = typeof WeakMap == "function" ? WeakMap : Map, Me = 0, Le = null, be = null, Ee = 0, De = 0, Dt = null, aa = !1, wi = !1, Fc = !1, Un = 0, Ye = 0, ia = 0, Xa = 0, Qc = 0, Nt = 0, Ci = 0, zr = null, bt = null, Wc = !1, eo = 0, km = 0, to = 1 / 0, no = null, ra = null, nt = 0, la = null, Oi = null, Bn = 0, Kc = 0, Jc = null, Vm = null, xr = 0, es = null;
  function kt() {
    return (Me & 2) !== 0 && Ee !== 0 ? Ee & -Ee : k.T !== null ? ls() : cd();
  }
  function Ym() {
    if (Nt === 0) if ((Ee & 536870912) === 0 || Te) {
      var e = cl;
      cl <<= 1, (cl & 3932160) === 0 && (cl = 262144), Nt = e;
    } else Nt = 536870912;
    return e = Rt.current, e !== null && (e.flags |= 32), Nt;
  }
  function _t(e, n, i) {
    (e === Le && (De === 2 || De === 9) || e.cancelPendingCommit !== null) && (Ri(e, 0), oa(e, Ee, Nt, !1)), dl(e, i), ((Me & 2) === 0 || e !== Le) && (e === Le && ((Me & 2) === 0 && (Xa |= i), Ye === 4 && oa(e, Ee, Nt, !1)), jn(e));
  }
  function qm(e, n, i) {
    if ((Me & 6) !== 0) throw Error(u(327));
    var l = !i && (n & 127) === 0 && (n & e.expiredLanes) === 0 || Ji(e, n), c = l ? ib(e, n) : ns(e, n, !0), s = l;
    do {
      if (c === 0) {
        wi && !l && oa(e, n, 0, !1);
        break;
      } else {
        if (i = e.current.alternate, s && !nb(i)) {
          c = ns(e, n, !1), s = !1;
          continue;
        }
        if (c === 2) {
          if (s = n, e.errorRecoveryDisabledLanes & s) var m = 0;
          else m = e.pendingLanes & -536870913, m = m !== 0 ? m : m & 536870912 ? 536870912 : 0;
          if (m !== 0) {
            n = m;
            e: {
              var y = e;
              c = zr;
              var A = y.current.memoizedState.isDehydrated;
              if (A && (Ri(y, m).flags |= 256), m = ns(y, m, !1), m !== 2) {
                if (Fc && !A) {
                  y.errorRecoveryDisabledLanes |= s, Xa |= s, c = 4;
                  break e;
                }
                s = bt, bt = c, s !== null && (bt === null ? bt = s : bt.push.apply(bt, s));
              }
              c = m;
            }
            if (s = !1, c !== 2) continue;
          }
        }
        if (c === 1) {
          Ri(e, 0), oa(e, n, 0, !0);
          break;
        }
        e: {
          switch (l = e, s = c, s) {
            case 0:
            case 1:
              throw Error(u(345));
            case 4:
              if ((n & 4194048) !== n) break;
            case 6:
              oa(l, n, Nt, !aa);
              break e;
            case 2:
              bt = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(u(329));
          }
          if ((n & 62914560) === n && (c = eo + 300 - Tt(), 10 < c)) {
            if (oa(l, n, Nt, !aa), fl(l, 0, !0) !== 0) break e;
            Bn = n, l.timeoutHandle = Av(Im.bind(null, l, i, bt, no, Wc, n, Nt, Xa, Ci, aa, s, "Throttled", -0, 0), c);
            break e;
          }
          Im(l, i, bt, no, Wc, n, Nt, Xa, Ci, aa, s, null, -0, 0);
        }
      }
      break;
    } while (!0);
    jn(e);
  }
  function Im(e, n, i, l, c, s, m, y, A, x, P, q, U, Z) {
    if (e.timeoutHandle = -1, q = n.subtreeFlags, q & 8192 || (q & 16785408) === 16785408) {
      q = {
        stylesheets: null,
        count: 0,
        imgCount: 0,
        imgBytes: 0,
        suspenseyImages: [],
        waitingForImages: !0,
        waitingForViewTransition: !1,
        unsuspend: Sn
      }, Zm(n, s, q);
      var ie = (s & 62914560) === s ? eo - Tt() : (s & 4194048) === s ? km - Tt() : 0;
      if (ie = jb(q, ie), ie !== null) {
        Bn = s, e.cancelPendingCommit = ie(tv.bind(null, e, n, s, i, l, c, m, y, A, P, q, null, U, Z)), oa(e, s, m, !x);
        return;
      }
    }
    tv(e, n, s, i, l, c, m, y, A);
  }
  function nb(e) {
    for (var n = e; ; ) {
      var i = n.tag;
      if ((i === 0 || i === 11 || i === 15) && n.flags & 16384 && (i = n.updateQueue, i !== null && (i = i.stores, i !== null))) for (var l = 0; l < i.length; l++) {
        var c = i[l], s = c.getSnapshot;
        c = c.value;
        try {
          if (!Ct(s(), c)) return !1;
        } catch {
          return !1;
        }
      }
      if (i = n.child, n.subtreeFlags & 16384 && i !== null) i.return = n, n = i;
      else {
        if (n === e) break;
        for (; n.sibling === null; ) {
          if (n.return === null || n.return === e) return !0;
          n = n.return;
        }
        n.sibling.return = n.return, n = n.sibling;
      }
    }
    return !0;
  }
  function oa(e, n, i, l) {
    n &= ~Qc, n &= ~Xa, e.suspendedLanes |= n, e.pingedLanes &= ~n, l && (e.warmLanes |= n), l = e.expirationTimes;
    for (var c = n; 0 < c; ) {
      var s = 31 - wt(c), m = 1 << s;
      l[s] = -1, c &= ~m;
    }
    i !== 0 && rd(e, i, n);
  }
  function ao() {
    return (Me & 6) === 0 ? (Hr(0, !1), !1) : !0;
  }
  function ts() {
    if (be !== null) {
      if (De === 0) var e = be.return;
      else e = be, Cn = Na = null, gc(e), yi = null, pr = 0, e = be;
      for (; e !== null; ) Am(e.alternate, e), e = e.return;
      be = null;
    }
  }
  function Ri(e, n) {
    var i = e.timeoutHandle;
    i !== -1 && (e.timeoutHandle = -1, _b(i)), i = e.cancelPendingCommit, i !== null && (e.cancelPendingCommit = null, i()), Bn = 0, ts(), Le = e, be = i = An(e.current, null), Ee = n, De = 0, Dt = null, aa = !1, wi = Ji(e, n), Fc = !1, Ci = Nt = Qc = Xa = ia = Ye = 0, bt = zr = null, Wc = !1, (n & 8) !== 0 && (n |= n & 32);
    var l = e.entangledLanes;
    if (l !== 0) for (e = e.entanglements, l &= n; 0 < l; ) {
      var c = 31 - wt(l), s = 1 << c;
      n |= e[c], l &= ~s;
    }
    return Un = n, Al(), i;
  }
  function $m(e, n) {
    me = null, k.H = Ar, n === gi || n === zl ? (n = hh(), De = 3) : n === rc ? (n = hh(), De = 4) : De = n === xc ? 8 : n !== null && typeof n == "object" && typeof n.then == "function" ? 6 : 1, Dt = n, be === null && (Ye = 1, ql(e, jt(n, e.current)));
  }
  function Fm() {
    var e = Rt.current;
    return e === null ? !0 : (Ee & 4194048) === Ee ? Xt === null : (Ee & 62914560) === Ee || (Ee & 536870912) !== 0 ? e === Xt : !1;
  }
  function Qm() {
    var e = k.H;
    return k.H = Ar, e === null ? Ar : e;
  }
  function Wm() {
    var e = k.A;
    return k.A = eb, e;
  }
  function io() {
    Ye = 4, aa || (Ee & 4194048) !== Ee && Rt.current !== null || (wi = !0), (ia & 134217727) === 0 && (Xa & 134217727) === 0 || Le === null || oa(Le, Ee, Nt, !1);
  }
  function ns(e, n, i) {
    var l = Me;
    Me |= 2;
    var c = Qm(), s = Wm();
    (Le !== e || Ee !== n) && (no = null, Ri(e, n)), n = !1;
    var m = Ye;
    e: do
      try {
        if (De !== 0 && be !== null) {
          var y = be, A = Dt;
          switch (De) {
            case 8:
              ts(), m = 6;
              break e;
            case 3:
            case 2:
            case 9:
            case 6:
              Rt.current === null && (n = !0);
              var x = De;
              if (De = 0, Dt = null, Mi(e, y, A, x), i && wi) {
                m = 0;
                break e;
              }
              break;
            default:
              x = De, De = 0, Dt = null, Mi(e, y, A, x);
          }
        }
        ab(), m = Ye;
        break;
      } catch (P) {
        $m(e, P);
      }
    while (!0);
    return n && e.shellSuspendCounter++, Cn = Na = null, Me = l, k.H = c, k.A = s, be === null && (Le = null, Ee = 0, Al()), m;
  }
  function ab() {
    for (; be !== null; ) Km(be);
  }
  function ib(e, n) {
    var i = Me;
    Me |= 2;
    var l = Qm(), c = Wm();
    Le !== e || Ee !== n ? (no = null, to = Tt() + 500, Ri(e, n)) : wi = Ji(e, n);
    e: do
      try {
        if (De !== 0 && be !== null) {
          n = be;
          var s = Dt;
          t: switch (De) {
            case 1:
              De = 0, Dt = null, Mi(e, n, s, 1);
              break;
            case 2:
            case 9:
              if (fh(s)) {
                De = 0, Dt = null, Jm(n);
                break;
              }
              n = function() {
                De !== 2 && De !== 9 || Le !== e || (De = 7), jn(e);
              }, s.then(n, n);
              break e;
            case 3:
              De = 7;
              break e;
            case 4:
              De = 5;
              break e;
            case 7:
              fh(s) ? (De = 0, Dt = null, Jm(n)) : (De = 0, Dt = null, Mi(e, n, s, 7));
              break;
            case 5:
              var m = null;
              switch (be.tag) {
                case 26:
                  m = be.memoizedState;
                case 5:
                case 27:
                  var y = be;
                  if (m ? Zv(m) : y.stateNode.complete) {
                    De = 0, Dt = null;
                    var A = y.sibling;
                    if (A !== null) be = A;
                    else {
                      var x = y.return;
                      x !== null ? (be = x, ro(x)) : be = null;
                    }
                    break t;
                  }
              }
              De = 0, Dt = null, Mi(e, n, s, 5);
              break;
            case 6:
              De = 0, Dt = null, Mi(e, n, s, 6);
              break;
            case 8:
              ts(), Ye = 6;
              break e;
            default:
              throw Error(u(462));
          }
        }
        rb();
        break;
      } catch (P) {
        $m(e, P);
      }
    while (!0);
    return Cn = Na = null, k.H = l, k.A = c, Me = i, be !== null ? 0 : (Le = null, Ee = 0, Al(), Ye);
  }
  function rb() {
    for (; be !== null && !Uy(); ) Km(be);
  }
  function Km(e) {
    var n = Sm(e.alternate, e, Un);
    e.memoizedProps = e.pendingProps, n === null ? ro(e) : be = n;
  }
  function Jm(e) {
    var n = e, i = n.alternate;
    switch (n.tag) {
      case 15:
      case 0:
        n = pm(i, n, n.pendingProps, n.type, void 0, Ee);
        break;
      case 11:
        n = pm(i, n, n.pendingProps, n.type.render, n.ref, Ee);
        break;
      case 5:
        gc(n);
      default:
        Am(i, n), n = be = eh(n, Un), n = Sm(i, n, Un);
    }
    e.memoizedProps = e.pendingProps, n === null ? ro(e) : be = n;
  }
  function Mi(e, n, i, l) {
    Cn = Na = null, gc(n), yi = null, pr = 0;
    var c = n.return;
    try {
      if (I1(e, c, n, i, Ee)) {
        Ye = 1, ql(e, jt(i, e.current)), be = null;
        return;
      }
    } catch (s) {
      if (c !== null) throw be = c, s;
      Ye = 1, ql(e, jt(i, e.current)), be = null;
      return;
    }
    n.flags & 32768 ? (Te || l === 1 ? e = !0 : wi || (Ee & 536870912) !== 0 ? e = !1 : (aa = e = !0, (l === 2 || l === 9 || l === 3 || l === 6) && (l = Rt.current, l !== null && l.tag === 13 && (l.flags |= 16384))), ev(n, e)) : ro(n);
  }
  function ro(e) {
    var n = e;
    do {
      if ((n.flags & 32768) !== 0) {
        ev(n, aa);
        return;
      }
      e = n.return;
      var i = Q1(n.alternate, n, Un);
      if (i !== null) {
        be = i;
        return;
      }
      if (n = n.sibling, n !== null) {
        be = n;
        return;
      }
      be = n = e;
    } while (n !== null);
    Ye === 0 && (Ye = 5);
  }
  function ev(e, n) {
    do {
      var i = W1(e.alternate, e);
      if (i !== null) {
        i.flags &= 32767, be = i;
        return;
      }
      if (i = e.return, i !== null && (i.flags |= 32768, i.subtreeFlags = 0, i.deletions = null), !n && (e = e.sibling, e !== null)) {
        be = e;
        return;
      }
      be = e = i;
    } while (e !== null);
    Ye = 6, be = null;
  }
  function tv(e, n, i, l, c, s, m, y, A) {
    e.cancelPendingCommit = null;
    do
      lo();
    while (nt !== 0);
    if ((Me & 6) !== 0) throw Error(u(327));
    if (n !== null) {
      if (n === e.current) throw Error(u(177));
      if (s = n.lanes | n.childLanes, s |= Vu, qy(e, i, s, m, y, A), e === Le && (be = Le = null, Ee = 0), Oi = n, la = e, Bn = i, Kc = s, Jc = c, Vm = l, (n.subtreeFlags & 10256) !== 0 || (n.flags & 10256) !== 0 ? (e.callbackNode = null, e.callbackPriority = 0, cb(ol, function() {
        return lv(), null;
      })) : (e.callbackNode = null, e.callbackPriority = 0), l = (n.flags & 13878) !== 0, (n.subtreeFlags & 13878) !== 0 || l) {
        l = k.T, k.T = null, c = $.p, $.p = 2, m = Me, Me |= 4;
        try {
          K1(e, n, i);
        } finally {
          Me = m, $.p = c, k.T = l;
        }
      }
      nt = 1, nv(), av(), iv();
    }
  }
  function nv() {
    if (nt === 1) {
      nt = 0;
      var e = la, n = Oi, i = (n.flags & 13878) !== 0;
      if ((n.subtreeFlags & 13878) !== 0 || i) {
        i = k.T, k.T = null;
        var l = $.p;
        $.p = 2;
        var c = Me;
        Me |= 4;
        try {
          Um(n, e);
          var s = hs, m = Yd(e.containerInfo), y = s.focusedElem, A = s.selectionRange;
          if (m !== y && y && y.ownerDocument && Vd(y.ownerDocument.documentElement, y)) {
            if (A !== null && Zu(y)) {
              var x = A.start, P = A.end;
              if (P === void 0 && (P = x), "selectionStart" in y) y.selectionStart = x, y.selectionEnd = Math.min(P, y.value.length);
              else {
                var q = y.ownerDocument || document, U = q && q.defaultView || window;
                if (U.getSelection) {
                  var Z = U.getSelection(), ie = y.textContent.length, ue = Math.min(A.start, ie), He = A.end === void 0 ? ue : Math.min(A.end, ie);
                  !Z.extend && ue > He && (m = He, He = ue, ue = m);
                  var M = kd(y, ue), w = kd(y, He);
                  if (M && w && (Z.rangeCount !== 1 || Z.anchorNode !== M.node || Z.anchorOffset !== M.offset || Z.focusNode !== w.node || Z.focusOffset !== w.offset)) {
                    var z = q.createRange();
                    z.setStart(M.node, M.offset), Z.removeAllRanges(), ue > He ? (Z.addRange(z), Z.extend(w.node, w.offset)) : (z.setEnd(w.node, w.offset), Z.addRange(z));
                  }
                }
              }
            }
            for (q = [], Z = y; Z = Z.parentNode; ) Z.nodeType === 1 && q.push({
              element: Z,
              left: Z.scrollLeft,
              top: Z.scrollTop
            });
            for (typeof y.focus == "function" && y.focus(), y = 0; y < q.length; y++) {
              var V = q[y];
              V.element.scrollLeft = V.left, V.element.scrollTop = V.top;
            }
          }
          bo = !!ds, hs = ds = null;
        } finally {
          Me = c, $.p = l, k.T = i;
        }
      }
      e.current = n, nt = 2;
    }
  }
  function av() {
    if (nt === 2) {
      nt = 0;
      var e = la, n = Oi, i = (n.flags & 8772) !== 0;
      if ((n.subtreeFlags & 8772) !== 0 || i) {
        i = k.T, k.T = null;
        var l = $.p;
        $.p = 2;
        var c = Me;
        Me |= 4;
        try {
          Nm(e, n.alternate, n);
        } finally {
          Me = c, $.p = l, k.T = i;
        }
      }
      nt = 3;
    }
  }
  function iv() {
    if (nt === 4 || nt === 3) {
      nt = 0, By();
      var e = la, n = Oi, i = Bn, l = Vm;
      (n.subtreeFlags & 10256) !== 0 || (n.flags & 10256) !== 0 ? nt = 5 : (nt = 0, Oi = la = null, rv(e, e.pendingLanes));
      var c = e.pendingLanes;
      if (c === 0 && (ra = null), _u(i), n = n.stateNode, At && typeof At.onCommitFiberRoot == "function") try {
        At.onCommitFiberRoot(Ki, n, void 0, (n.current.flags & 128) === 128);
      } catch {
      }
      if (l !== null) {
        n = k.T, c = $.p, $.p = 2, k.T = null;
        try {
          for (var s = e.onRecoverableError, m = 0; m < l.length; m++) {
            var y = l[m];
            s(y.value, { componentStack: y.stack });
          }
        } finally {
          k.T = n, $.p = c;
        }
      }
      (Bn & 3) !== 0 && lo(), jn(e), c = e.pendingLanes, (i & 261930) !== 0 && (c & 42) !== 0 ? e === es ? xr++ : (xr = 0, es = e) : xr = 0, Hr(0, !1);
    }
  }
  function rv(e, n) {
    (e.pooledCacheLanes &= n) === 0 && (n = e.pooledCache, n != null && (e.pooledCache = null, mr(n)));
  }
  function lo() {
    return nv(), av(), iv(), lv();
  }
  function lv() {
    if (nt !== 5) return !1;
    var e = la, n = Kc;
    Kc = 0;
    var i = _u(Bn), l = k.T, c = $.p;
    try {
      $.p = 32 > i ? 32 : i, k.T = null, i = Jc, Jc = null;
      var s = la, m = Bn;
      if (nt = 0, Oi = la = null, Bn = 0, (Me & 6) !== 0) throw Error(u(331));
      var y = Me;
      if (Me |= 4, Pm(s.current), jm(s, s.current, m, i), Me = y, Hr(0, !1), At && typeof At.onPostCommitFiberRoot == "function") try {
        At.onPostCommitFiberRoot(Ki, s);
      } catch {
      }
      return !0;
    } finally {
      $.p = c, k.T = l, rv(e, n);
    }
  }
  function ov(e, n, i) {
    n = jt(i, n), n = zc(e.stateNode, n, 2), e = ja(e, n, 2), e !== null && (dl(e, 2), jn(e));
  }
  function Ne(e, n, i) {
    if (e.tag === 3) ov(e, e, i);
    else for (; n !== null; ) {
      if (n.tag === 3) {
        ov(n, e, i);
        break;
      } else if (n.tag === 1) {
        var l = n.stateNode;
        if (typeof n.type.getDerivedStateFromError == "function" || typeof l.componentDidCatch == "function" && (ra === null || !ra.has(l))) {
          e = jt(i, e), i = um(2), l = ja(n, i, 2), l !== null && (cm(i, l, n, e), dl(l, 2), jn(l));
          break;
        }
      }
      n = n.return;
    }
  }
  function as(e, n, i) {
    var l = e.pingCache;
    if (l === null) {
      l = e.pingCache = new tb();
      var c = /* @__PURE__ */ new Set();
      l.set(n, c);
    } else c = l.get(n), c === void 0 && (c = /* @__PURE__ */ new Set(), l.set(n, c));
    c.has(i) || (Fc = !0, c.add(i), e = lb.bind(null, e, n, i), n.then(e, e));
  }
  function lb(e, n, i) {
    var l = e.pingCache;
    l !== null && l.delete(n), e.pingedLanes |= e.suspendedLanes & i, e.warmLanes &= ~i, Le === e && (Ee & i) === i && (Ye === 4 || Ye === 3 && (Ee & 62914560) === Ee && 300 > Tt() - eo ? (Me & 2) === 0 && Ri(e, 0) : Qc |= i, Ci === Ee && (Ci = 0)), jn(e);
  }
  function uv(e, n) {
    n === 0 && (n = id()), e = Ra(e, n), e !== null && (dl(e, n), jn(e));
  }
  function ob(e) {
    var n = e.memoizedState, i = 0;
    n !== null && (i = n.retryLane), uv(e, i);
  }
  function ub(e, n) {
    var i = 0;
    switch (e.tag) {
      case 31:
      case 13:
        var l = e.stateNode, c = e.memoizedState;
        c !== null && (i = c.retryLane);
        break;
      case 19:
        l = e.stateNode;
        break;
      case 22:
        l = e.stateNode._retryCache;
        break;
      default:
        throw Error(u(314));
    }
    l !== null && l.delete(n), uv(e, i);
  }
  function cb(e, n) {
    return gu(e, n);
  }
  var oo = null, Di = null, is = !1, uo = !1, rs = !1, ua = 0;
  function jn(e) {
    e !== Di && e.next === null && (Di === null ? oo = Di = e : Di = Di.next = e), uo = !0, is || (is = !0, fb());
  }
  function Hr(e, n) {
    if (!rs && uo) {
      rs = !0;
      do
        for (var i = !1, l = oo; l !== null; ) {
          if (!n) if (e !== 0) {
            var c = l.pendingLanes;
            if (c === 0) var s = 0;
            else {
              var m = l.suspendedLanes, y = l.pingedLanes;
              s = (1 << 31 - wt(42 | e) + 1) - 1, s &= c & ~(m & ~y), s = s & 201326741 ? s & 201326741 | 1 : s ? s | 2 : 0;
            }
            s !== 0 && (i = !0, dv(l, s));
          } else s = Ee, s = fl(l, l === Le ? s : 0, l.cancelPendingCommit !== null || l.timeoutHandle !== -1), (s & 3) === 0 || Ji(l, s) || (i = !0, dv(l, s));
          l = l.next;
        }
      while (i);
      rs = !1;
    }
  }
  function sb() {
    cv();
  }
  function cv() {
    uo = is = !1;
    var e = 0;
    ua !== 0 && bb() && (e = ua);
    for (var n = Tt(), i = null, l = oo; l !== null; ) {
      var c = l.next, s = sv(l, n);
      s === 0 ? (l.next = null, i === null ? oo = c : i.next = c, c === null && (Di = i)) : (i = l, (e !== 0 || (s & 3) !== 0) && (uo = !0)), l = c;
    }
    nt !== 0 && nt !== 5 || Hr(e, !1), ua !== 0 && (ua = 0);
  }
  function sv(e, n) {
    for (var i = e.suspendedLanes, l = e.pingedLanes, c = e.expirationTimes, s = e.pendingLanes & -62914561; 0 < s; ) {
      var m = 31 - wt(s), y = 1 << m, A = c[m];
      A === -1 ? ((y & i) === 0 || (y & l) !== 0) && (c[m] = Yy(y, n)) : A <= n && (e.expiredLanes |= y), s &= ~y;
    }
    if (n = Le, i = Ee, i = fl(e, e === n ? i : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), l = e.callbackNode, i === 0 || e === n && (De === 2 || De === 9) || e.cancelPendingCommit !== null) return l !== null && l !== null && yu(l), e.callbackNode = null, e.callbackPriority = 0;
    if ((i & 3) === 0 || Ji(e, i)) {
      if (n = i & -i, n === e.callbackPriority) return n;
      switch (l !== null && yu(l), _u(i)) {
        case 2:
        case 8:
          i = nd;
          break;
        case 32:
          i = ol;
          break;
        case 268435456:
          i = ad;
          break;
        default:
          i = ol;
      }
      return l = fv.bind(null, e), i = gu(i, l), e.callbackPriority = n, e.callbackNode = i, n;
    }
    return l !== null && l !== null && yu(l), e.callbackPriority = 2, e.callbackNode = null, 2;
  }
  function fv(e, n) {
    if (nt !== 0 && nt !== 5) return e.callbackNode = null, e.callbackPriority = 0, null;
    var i = e.callbackNode;
    if (lo() && e.callbackNode !== i) return null;
    var l = Ee;
    return l = fl(e, e === Le ? l : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), l === 0 ? null : (qm(e, l, n), sv(e, Tt()), e.callbackNode != null && e.callbackNode === i ? fv.bind(null, e) : null);
  }
  function dv(e, n) {
    if (lo()) return null;
    qm(e, n, !0);
  }
  function fb() {
    Eb(function() {
      (Me & 6) !== 0 ? gu(td, sb) : cv();
    });
  }
  function ls() {
    if (ua === 0) {
      var e = vi;
      e === 0 && (e = ul, ul <<= 1, (ul & 261888) === 0 && (ul = 256)), ua = e;
    }
    return ua;
  }
  function hv(e) {
    return e == null || typeof e == "symbol" || typeof e == "boolean" ? null : typeof e == "function" ? e : pl("" + e);
  }
  function mv(e, n) {
    var i = n.ownerDocument.createElement("input");
    return i.name = n.name, i.value = n.value, e.id && i.setAttribute("form", e.id), n.parentNode.insertBefore(i, n), e = new FormData(e), i.parentNode.removeChild(i), e;
  }
  function db(e, n, i, l, c) {
    if (n === "submit" && i && i.stateNode === c) {
      var s = hv((c[mt] || null).action), m = l.submitter;
      m && (n = (n = m[mt] || null) ? hv(n.formAction) : m.getAttribute("formAction"), n !== null && (s = n, m = null));
      var y = new _l("action", "action", null, l, c);
      e.push({
        event: y,
        listeners: [{
          instance: null,
          listener: function() {
            if (l.defaultPrevented) {
              if (ua !== 0) {
                var A = m ? mv(c, m) : new FormData(c);
                Cc(i, {
                  pending: !0,
                  data: A,
                  method: c.method,
                  action: s
                }, null, A);
              }
            } else typeof s == "function" && (y.preventDefault(), A = m ? mv(c, m) : new FormData(c), Cc(i, {
              pending: !0,
              data: A,
              method: c.method,
              action: s
            }, s, A));
          },
          currentTarget: c
        }]
      });
    }
  }
  for (var os = 0; os < ku.length; os++) {
    var us = ku[os];
    Kt(us.toLowerCase(), "on" + (us[0].toUpperCase() + us.slice(1)));
  }
  Kt($d, "onAnimationEnd"), Kt(Fd, "onAnimationIteration"), Kt(Qd, "onAnimationStart"), Kt("dblclick", "onDoubleClick"), Kt("focusin", "onFocus"), Kt("focusout", "onBlur"), Kt(O1, "onTransitionRun"), Kt(R1, "onTransitionStart"), Kt(M1, "onTransitionCancel"), Kt(Wd, "onTransitionEnd"), ti("onMouseEnter", ["mouseout", "mouseover"]), ti("onMouseLeave", ["mouseout", "mouseover"]), ti("onPointerEnter", ["pointerout", "pointerover"]), ti("onPointerLeave", ["pointerout", "pointerover"]), Aa("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), Aa("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), Aa("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), Aa("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), Aa("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), Aa("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var Lr = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), hb = new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Lr));
  function vv(e, n) {
    n = (n & 4) !== 0;
    for (var i = 0; i < e.length; i++) {
      var l = e[i], c = l.event;
      l = l.listeners;
      e: {
        var s = void 0;
        if (n) for (var m = l.length - 1; 0 <= m; m--) {
          var y = l[m], A = y.instance, x = y.currentTarget;
          if (y = y.listener, A !== s && c.isPropagationStopped()) break e;
          s = y, c.currentTarget = x;
          try {
            s(c);
          } catch (P) {
            Tl(P);
          }
          c.currentTarget = null, s = A;
        }
        else for (m = 0; m < l.length; m++) {
          if (y = l[m], A = y.instance, x = y.currentTarget, y = y.listener, A !== s && c.isPropagationStopped()) break e;
          s = y, c.currentTarget = x;
          try {
            s(c);
          } catch (P) {
            Tl(P);
          }
          c.currentTarget = null, s = A;
        }
      }
    }
  }
  function _e(e, n) {
    var i = n[Eu];
    i === void 0 && (i = n[Eu] = /* @__PURE__ */ new Set());
    var l = e + "__bubble";
    i.has(l) || (gv(n, e, 2, !1), i.add(l));
  }
  function cs(e, n, i) {
    var l = 0;
    n && (l |= 4), gv(i, e, l, n);
  }
  var co = "_reactListening" + Math.random().toString(36).slice(2);
  function pv(e) {
    if (!e[co]) {
      e[co] = !0, dd.forEach(function(i) {
        i !== "selectionchange" && (hb.has(i) || cs(i, !1, e), cs(i, !0, e));
      });
      var n = e.nodeType === 9 ? e : e.ownerDocument;
      n === null || n[co] || (n[co] = !0, cs("selectionchange", !1, n));
    }
  }
  function gv(e, n, i, l) {
    switch (Vv(n)) {
      case 2:
        var c = kb;
        break;
      case 8:
        c = Vb;
        break;
      default:
        c = As;
    }
    i = c.bind(null, n, i, e), c = void 0, !Du || n !== "touchstart" && n !== "touchmove" && n !== "wheel" || (c = !0), l ? c !== void 0 ? e.addEventListener(n, i, {
      capture: !0,
      passive: c
    }) : e.addEventListener(n, i, !0) : c !== void 0 ? e.addEventListener(n, i, { passive: c }) : e.addEventListener(n, i, !1);
  }
  function ss(e, n, i, l, c) {
    var s = l;
    if ((n & 1) === 0 && (n & 2) === 0 && l !== null) e: for (; ; ) {
      if (l === null) return;
      var m = l.tag;
      if (m === 3 || m === 4) {
        var y = l.stateNode.containerInfo;
        if (y === c) break;
        if (m === 4) for (m = l.return; m !== null; ) {
          var A = m.tag;
          if ((A === 3 || A === 4) && m.stateNode.containerInfo === c) return;
          m = m.return;
        }
        for (; y !== null; ) {
          if (m = Ka(y), m === null) return;
          if (A = m.tag, A === 5 || A === 6 || A === 26 || A === 27) {
            l = s = m;
            continue e;
          }
          y = y.parentNode;
        }
      }
      l = l.return;
    }
    Ad(function() {
      var x = s, P = Ru(i), q = [];
      e: {
        var U = Kd.get(e);
        if (U !== void 0) {
          var Z = _l, ie = e;
          switch (e) {
            case "keypress":
              if (yl(i) === 0) break e;
            case "keydown":
            case "keyup":
              Z = s1;
              break;
            case "focusin":
              ie = "focus", Z = Hu;
              break;
            case "focusout":
              ie = "blur", Z = Hu;
              break;
            case "beforeblur":
            case "afterblur":
              Z = Hu;
              break;
            case "click":
              if (i.button === 2) break e;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              Z = Od;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              Z = a1;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              Z = f1;
              break;
            case $d:
            case Fd:
            case Qd:
              Z = i1;
              break;
            case Wd:
              Z = d1;
              break;
            case "scroll":
            case "scrollend":
              Z = n1;
              break;
            case "wheel":
              Z = h1;
              break;
            case "copy":
            case "cut":
            case "paste":
              Z = r1;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              Z = Md;
              break;
            case "toggle":
            case "beforetoggle":
              Z = m1;
          }
          var ue = (n & 4) !== 0, He = !ue && (e === "scroll" || e === "scrollend"), M = ue ? U !== null ? U + "Capture" : null : U;
          ue = [];
          for (var w = x, z; w !== null; ) {
            var V = w;
            if (z = V.stateNode, V = V.tag, V !== 5 && V !== 26 && V !== 27 || z === null || M === null || (V = ar(w, M), V != null && ue.push(Ur(w, V, z))), He) break;
            w = w.return;
          }
          0 < ue.length && (U = new Z(U, ie, null, i, P), q.push({
            event: U,
            listeners: ue
          }));
        }
      }
      if ((n & 7) === 0) {
        e: {
          if (U = e === "mouseover" || e === "pointerover", Z = e === "mouseout" || e === "pointerout", U && i !== Ou && (ie = i.relatedTarget || i.fromElement) && (Ka(ie) || ie[er])) break e;
          if ((Z || U) && (U = P.window === P ? P : (U = P.ownerDocument) ? U.defaultView || U.parentWindow : window, Z ? (ie = i.relatedTarget || i.toElement, Z = x, ie = ie ? Ka(ie) : null, ie !== null && (He = d(ie), ue = ie.tag, ie !== He || ue !== 5 && ue !== 27 && ue !== 6) && (ie = null)) : (Z = null, ie = x), Z !== ie)) {
            if (ue = Od, V = "onMouseLeave", M = "onMouseEnter", w = "mouse", (e === "pointerout" || e === "pointerover") && (ue = Md, V = "onPointerLeave", M = "onPointerEnter", w = "pointer"), He = Z == null ? U : nr(Z), z = ie == null ? U : nr(ie), U = new ue(V, w + "leave", Z, i, P), U.target = He, U.relatedTarget = z, V = null, Ka(P) === x && (ue = new ue(M, w + "enter", ie, i, P), ue.target = z, ue.relatedTarget = He, V = ue), He = V, Z && ie) t: {
              for (ue = mb, M = Z, w = ie, z = 0, V = M; V; V = ue(V)) z++;
              V = 0;
              for (var oe = w; oe; oe = ue(oe)) V++;
              for (; 0 < z - V; ) M = ue(M), z--;
              for (; 0 < V - z; ) w = ue(w), V--;
              for (; z--; ) {
                if (M === w || w !== null && M === w.alternate) {
                  ue = M;
                  break t;
                }
                M = ue(M), w = ue(w);
              }
              ue = null;
            }
            else ue = null;
            Z !== null && yv(q, U, Z, ue, !1), ie !== null && He !== null && yv(q, He, ie, ue, !0);
          }
        }
        e: {
          if (U = x ? nr(x) : window, Z = U.nodeName && U.nodeName.toLowerCase(), Z === "select" || Z === "input" && U.type === "file") var Oe = Bd;
          else if (Ld(U)) if (jd) Oe = A1;
          else {
            Oe = S1;
            var le = E1;
          }
          else Z = U.nodeName, !Z || Z.toLowerCase() !== "input" || U.type !== "checkbox" && U.type !== "radio" ? x && Cu(x.elementType) && (Oe = Bd) : Oe = T1;
          if (Oe && (Oe = Oe(e, x))) {
            Ud(q, Oe, i, P);
            break e;
          }
          le && le(e, U, x), e === "focusout" && x && U.type === "number" && x.memoizedProps.value != null && wu(U, "number", U.value);
        }
        switch (le = x ? nr(x) : window, e) {
          case "focusin":
            (Ld(le) || le.contentEditable === "true") && (oi = le, Gu = x, fr = null);
            break;
          case "focusout":
            fr = Gu = oi = null;
            break;
          case "mousedown":
            Pu = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Pu = !1, qd(q, i, P);
            break;
          case "selectionchange":
            if (C1) break;
          case "keydown":
          case "keyup":
            qd(q, i, P);
        }
        var pe;
        if (Uu) e: {
          switch (e) {
            case "compositionstart":
              var Se = "onCompositionStart";
              break e;
            case "compositionend":
              Se = "onCompositionEnd";
              break e;
            case "compositionupdate":
              Se = "onCompositionUpdate";
              break e;
          }
          Se = void 0;
        }
        else li ? xd(e, i) && (Se = "onCompositionEnd") : e === "keydown" && i.keyCode === 229 && (Se = "onCompositionStart");
        Se && (Dd && i.locale !== "ko" && (li || Se !== "onCompositionStart" ? Se === "onCompositionEnd" && li && (pe = wd()) : ($n = P, Nu = "value" in $n ? $n.value : $n.textContent, li = !0)), le = so(x, Se), 0 < le.length && (Se = new Rd(Se, e, null, i, P), q.push({
          event: Se,
          listeners: le
        }), pe ? Se.data = pe : (pe = Hd(i), pe !== null && (Se.data = pe)))), (pe = p1 ? g1(e, i) : y1(e, i)) && (Se = so(x, "onBeforeInput"), 0 < Se.length && (le = new Rd("onBeforeInput", "beforeinput", null, i, P), q.push({
          event: le,
          listeners: Se
        }), le.data = pe)), db(q, e, x, i, P);
      }
      vv(q, n);
    });
  }
  function Ur(e, n, i) {
    return {
      instance: e,
      listener: n,
      currentTarget: i
    };
  }
  function so(e, n) {
    for (var i = n + "Capture", l = []; e !== null; ) {
      var c = e, s = c.stateNode;
      if (c = c.tag, c !== 5 && c !== 26 && c !== 27 || s === null || (c = ar(e, i), c != null && l.unshift(Ur(e, c, s)), c = ar(e, n), c != null && l.push(Ur(e, c, s))), e.tag === 3) return l;
      e = e.return;
    }
    return [];
  }
  function mb(e) {
    if (e === null) return null;
    do
      e = e.return;
    while (e && e.tag !== 5 && e.tag !== 27);
    return e || null;
  }
  function yv(e, n, i, l, c) {
    for (var s = n._reactName, m = []; i !== null && i !== l; ) {
      var y = i, A = y.alternate, x = y.stateNode;
      if (y = y.tag, A !== null && A === l) break;
      y !== 5 && y !== 26 && y !== 27 || x === null || (A = x, c ? (x = ar(i, s), x != null && m.unshift(Ur(i, x, A))) : c || (x = ar(i, s), x != null && m.push(Ur(i, x, A)))), i = i.return;
    }
    m.length !== 0 && e.push({
      event: n,
      listeners: m
    });
  }
  var vb = /\r\n?/g, pb = /\u0000|\uFFFD/g;
  function bv(e) {
    return (typeof e == "string" ? e : "" + e).replace(vb, `
`).replace(pb, "");
  }
  function _v(e, n) {
    return n = bv(n), bv(e) === n;
  }
  function xe(e, n, i, l, c, s) {
    switch (i) {
      case "children":
        typeof l == "string" ? n === "body" || n === "textarea" && l === "" || ai(e, l) : (typeof l == "number" || typeof l == "bigint") && n !== "body" && ai(e, "" + l);
        break;
      case "className":
        ml(e, "class", l);
        break;
      case "tabIndex":
        ml(e, "tabindex", l);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        ml(e, i, l);
        break;
      case "style":
        Sd(e, l, s);
        break;
      case "data":
        if (n !== "object") {
          ml(e, "data", l);
          break;
        }
      case "src":
      case "href":
        if (l === "" && (n !== "a" || i !== "href")) {
          e.removeAttribute(i);
          break;
        }
        if (l == null || typeof l == "function" || typeof l == "symbol" || typeof l == "boolean") {
          e.removeAttribute(i);
          break;
        }
        l = pl("" + l), e.setAttribute(i, l);
        break;
      case "action":
      case "formAction":
        if (typeof l == "function") {
          e.setAttribute(i, "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");
          break;
        } else typeof s == "function" && (i === "formAction" ? (n !== "input" && xe(e, n, "name", c.name, c, null), xe(e, n, "formEncType", c.formEncType, c, null), xe(e, n, "formMethod", c.formMethod, c, null), xe(e, n, "formTarget", c.formTarget, c, null)) : (xe(e, n, "encType", c.encType, c, null), xe(e, n, "method", c.method, c, null), xe(e, n, "target", c.target, c, null)));
        if (l == null || typeof l == "symbol" || typeof l == "boolean") {
          e.removeAttribute(i);
          break;
        }
        l = pl("" + l), e.setAttribute(i, l);
        break;
      case "onClick":
        l != null && (e.onclick = Sn);
        break;
      case "onScroll":
        l != null && _e("scroll", e);
        break;
      case "onScrollEnd":
        l != null && _e("scrollend", e);
        break;
      case "dangerouslySetInnerHTML":
        if (l != null) {
          if (typeof l != "object" || !("__html" in l)) throw Error(u(61));
          if (i = l.__html, i != null) {
            if (c.children != null) throw Error(u(60));
            e.innerHTML = i;
          }
        }
        break;
      case "multiple":
        e.multiple = l && typeof l != "function" && typeof l != "symbol";
        break;
      case "muted":
        e.muted = l && typeof l != "function" && typeof l != "symbol";
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        break;
      case "autoFocus":
        break;
      case "xlinkHref":
        if (l == null || typeof l == "function" || typeof l == "boolean" || typeof l == "symbol") {
          e.removeAttribute("xlink:href");
          break;
        }
        i = pl("" + l), e.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", i);
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        l != null && typeof l != "function" && typeof l != "symbol" ? e.setAttribute(i, "" + l) : e.removeAttribute(i);
        break;
      case "inert":
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        l && typeof l != "function" && typeof l != "symbol" ? e.setAttribute(i, "") : e.removeAttribute(i);
        break;
      case "capture":
      case "download":
        l === !0 ? e.setAttribute(i, "") : l !== !1 && l != null && typeof l != "function" && typeof l != "symbol" ? e.setAttribute(i, l) : e.removeAttribute(i);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        l != null && typeof l != "function" && typeof l != "symbol" && !isNaN(l) && 1 <= l ? e.setAttribute(i, l) : e.removeAttribute(i);
        break;
      case "rowSpan":
      case "start":
        l == null || typeof l == "function" || typeof l == "symbol" || isNaN(l) ? e.removeAttribute(i) : e.setAttribute(i, l);
        break;
      case "popover":
        _e("beforetoggle", e), _e("toggle", e), hl(e, "popover", l);
        break;
      case "xlinkActuate":
        En(e, "http://www.w3.org/1999/xlink", "xlink:actuate", l);
        break;
      case "xlinkArcrole":
        En(e, "http://www.w3.org/1999/xlink", "xlink:arcrole", l);
        break;
      case "xlinkRole":
        En(e, "http://www.w3.org/1999/xlink", "xlink:role", l);
        break;
      case "xlinkShow":
        En(e, "http://www.w3.org/1999/xlink", "xlink:show", l);
        break;
      case "xlinkTitle":
        En(e, "http://www.w3.org/1999/xlink", "xlink:title", l);
        break;
      case "xlinkType":
        En(e, "http://www.w3.org/1999/xlink", "xlink:type", l);
        break;
      case "xmlBase":
        En(e, "http://www.w3.org/XML/1998/namespace", "xml:base", l);
        break;
      case "xmlLang":
        En(e, "http://www.w3.org/XML/1998/namespace", "xml:lang", l);
        break;
      case "xmlSpace":
        En(e, "http://www.w3.org/XML/1998/namespace", "xml:space", l);
        break;
      case "is":
        hl(e, "is", l);
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        (!(2 < i.length) || i[0] !== "o" && i[0] !== "O" || i[1] !== "n" && i[1] !== "N") && (i = e1.get(i) || i, hl(e, i, l));
    }
  }
  function fs(e, n, i, l, c, s) {
    switch (i) {
      case "style":
        Sd(e, l, s);
        break;
      case "dangerouslySetInnerHTML":
        if (l != null) {
          if (typeof l != "object" || !("__html" in l)) throw Error(u(61));
          if (i = l.__html, i != null) {
            if (c.children != null) throw Error(u(60));
            e.innerHTML = i;
          }
        }
        break;
      case "children":
        typeof l == "string" ? ai(e, l) : (typeof l == "number" || typeof l == "bigint") && ai(e, "" + l);
        break;
      case "onScroll":
        l != null && _e("scroll", e);
        break;
      case "onScrollEnd":
        l != null && _e("scrollend", e);
        break;
      case "onClick":
        l != null && (e.onclick = Sn);
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "innerHTML":
      case "ref":
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        if (!hd.hasOwnProperty(i)) e: {
          if (i[0] === "o" && i[1] === "n" && (c = i.endsWith("Capture"), n = i.slice(2, c ? i.length - 7 : void 0), s = e[mt] || null, s = s != null ? s[i] : null, typeof s == "function" && e.removeEventListener(n, s, c), typeof l == "function")) {
            typeof s != "function" && s !== null && (i in e ? e[i] = null : e.hasAttribute(i) && e.removeAttribute(i)), e.addEventListener(n, l, c);
            break e;
          }
          i in e ? e[i] = l : l === !0 ? e.setAttribute(i, "") : hl(e, i, l);
        }
    }
  }
  function st(e, n, i) {
    switch (n) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "img":
        _e("error", e), _e("load", e);
        var l = !1, c = !1, s;
        for (s in i) if (i.hasOwnProperty(s)) {
          var m = i[s];
          if (m != null) switch (s) {
            case "src":
              l = !0;
              break;
            case "srcSet":
              c = !0;
              break;
            case "children":
            case "dangerouslySetInnerHTML":
              throw Error(u(137, n));
            default:
              xe(e, n, s, m, i, null);
          }
        }
        c && xe(e, n, "srcSet", i.srcSet, i, null), l && xe(e, n, "src", i.src, i, null);
        return;
      case "input":
        _e("invalid", e);
        var y = s = m = c = null, A = null, x = null;
        for (l in i) if (i.hasOwnProperty(l)) {
          var P = i[l];
          if (P != null) switch (l) {
            case "name":
              c = P;
              break;
            case "type":
              m = P;
              break;
            case "checked":
              A = P;
              break;
            case "defaultChecked":
              x = P;
              break;
            case "value":
              s = P;
              break;
            case "defaultValue":
              y = P;
              break;
            case "children":
            case "dangerouslySetInnerHTML":
              if (P != null) throw Error(u(137, n));
              break;
            default:
              xe(e, n, l, P, i, null);
          }
        }
        yd(e, s, y, A, x, m, c, !1);
        return;
      case "select":
        _e("invalid", e), l = m = s = null;
        for (c in i) if (i.hasOwnProperty(c) && (y = i[c], y != null)) switch (c) {
          case "value":
            s = y;
            break;
          case "defaultValue":
            m = y;
            break;
          case "multiple":
            l = y;
          default:
            xe(e, n, c, y, i, null);
        }
        n = s, i = m, e.multiple = !!l, n != null ? ni(e, !!l, n, !1) : i != null && ni(e, !!l, i, !0);
        return;
      case "textarea":
        _e("invalid", e), s = c = l = null;
        for (m in i) if (i.hasOwnProperty(m) && (y = i[m], y != null)) switch (m) {
          case "value":
            l = y;
            break;
          case "defaultValue":
            c = y;
            break;
          case "children":
            s = y;
            break;
          case "dangerouslySetInnerHTML":
            if (y != null) throw Error(u(91));
            break;
          default:
            xe(e, n, m, y, i, null);
        }
        _d(e, l, c, s);
        return;
      case "option":
        for (A in i) i.hasOwnProperty(A) && (l = i[A], l != null) && (A === "selected" ? e.selected = l && typeof l != "function" && typeof l != "symbol" : xe(e, n, A, l, i, null));
        return;
      case "dialog":
        _e("beforetoggle", e), _e("toggle", e), _e("cancel", e), _e("close", e);
        break;
      case "iframe":
      case "object":
        _e("load", e);
        break;
      case "video":
      case "audio":
        for (l = 0; l < Lr.length; l++) _e(Lr[l], e);
        break;
      case "image":
        _e("error", e), _e("load", e);
        break;
      case "details":
        _e("toggle", e);
        break;
      case "embed":
      case "source":
      case "link":
        _e("error", e), _e("load", e);
      case "area":
      case "base":
      case "br":
      case "col":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "track":
      case "wbr":
      case "menuitem":
        for (x in i) if (i.hasOwnProperty(x) && (l = i[x], l != null)) switch (x) {
          case "children":
          case "dangerouslySetInnerHTML":
            throw Error(u(137, n));
          default:
            xe(e, n, x, l, i, null);
        }
        return;
      default:
        if (Cu(n)) {
          for (P in i) i.hasOwnProperty(P) && (l = i[P], l !== void 0 && fs(e, n, P, l, i, void 0));
          return;
        }
    }
    for (y in i) i.hasOwnProperty(y) && (l = i[y], l != null && xe(e, n, y, l, i, null));
  }
  function gb(e, n, i, l) {
    switch (n) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "input":
        var c = null, s = null, m = null, y = null, A = null, x = null, P = null;
        for (Z in i) {
          var q = i[Z];
          if (i.hasOwnProperty(Z) && q != null) switch (Z) {
            case "checked":
              break;
            case "value":
              break;
            case "defaultValue":
              A = q;
            default:
              l.hasOwnProperty(Z) || xe(e, n, Z, null, l, q);
          }
        }
        for (var U in l) {
          var Z = l[U];
          if (q = i[U], l.hasOwnProperty(U) && (Z != null || q != null)) switch (U) {
            case "type":
              s = Z;
              break;
            case "name":
              c = Z;
              break;
            case "checked":
              x = Z;
              break;
            case "defaultChecked":
              P = Z;
              break;
            case "value":
              m = Z;
              break;
            case "defaultValue":
              y = Z;
              break;
            case "children":
            case "dangerouslySetInnerHTML":
              if (Z != null) throw Error(u(137, n));
              break;
            default:
              Z !== q && xe(e, n, U, Z, l, q);
          }
        }
        Au(e, m, y, A, x, P, s, c);
        return;
      case "select":
        Z = m = y = U = null;
        for (s in i) if (A = i[s], i.hasOwnProperty(s) && A != null) switch (s) {
          case "value":
            break;
          case "multiple":
            Z = A;
          default:
            l.hasOwnProperty(s) || xe(e, n, s, null, l, A);
        }
        for (c in l) if (s = l[c], A = i[c], l.hasOwnProperty(c) && (s != null || A != null)) switch (c) {
          case "value":
            U = s;
            break;
          case "defaultValue":
            y = s;
            break;
          case "multiple":
            m = s;
          default:
            s !== A && xe(e, n, c, s, l, A);
        }
        n = y, i = m, l = Z, U != null ? ni(e, !!i, U, !1) : !!l != !!i && (n != null ? ni(e, !!i, n, !0) : ni(e, !!i, i ? [] : "", !1));
        return;
      case "textarea":
        Z = U = null;
        for (y in i) if (c = i[y], i.hasOwnProperty(y) && c != null && !l.hasOwnProperty(y)) switch (y) {
          case "value":
            break;
          case "children":
            break;
          default:
            xe(e, n, y, null, l, c);
        }
        for (m in l) if (c = l[m], s = i[m], l.hasOwnProperty(m) && (c != null || s != null)) switch (m) {
          case "value":
            U = c;
            break;
          case "defaultValue":
            Z = c;
            break;
          case "children":
            break;
          case "dangerouslySetInnerHTML":
            if (c != null) throw Error(u(91));
            break;
          default:
            c !== s && xe(e, n, m, c, l, s);
        }
        bd(e, U, Z);
        return;
      case "option":
        for (var ie in i) U = i[ie], i.hasOwnProperty(ie) && U != null && !l.hasOwnProperty(ie) && (ie === "selected" ? e.selected = !1 : xe(e, n, ie, null, l, U));
        for (A in l) U = l[A], Z = i[A], l.hasOwnProperty(A) && U !== Z && (U != null || Z != null) && (A === "selected" ? e.selected = U && typeof U != "function" && typeof U != "symbol" : xe(e, n, A, U, l, Z));
        return;
      case "img":
      case "link":
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr":
      case "menuitem":
        for (var ue in i) U = i[ue], i.hasOwnProperty(ue) && U != null && !l.hasOwnProperty(ue) && xe(e, n, ue, null, l, U);
        for (x in l) if (U = l[x], Z = i[x], l.hasOwnProperty(x) && U !== Z && (U != null || Z != null)) switch (x) {
          case "children":
          case "dangerouslySetInnerHTML":
            if (U != null) throw Error(u(137, n));
            break;
          default:
            xe(e, n, x, U, l, Z);
        }
        return;
      default:
        if (Cu(n)) {
          for (var He in i) U = i[He], i.hasOwnProperty(He) && U !== void 0 && !l.hasOwnProperty(He) && fs(e, n, He, void 0, l, U);
          for (P in l) U = l[P], Z = i[P], !l.hasOwnProperty(P) || U === Z || U === void 0 && Z === void 0 || fs(e, n, P, U, l, Z);
          return;
        }
    }
    for (var M in i) U = i[M], i.hasOwnProperty(M) && U != null && !l.hasOwnProperty(M) && xe(e, n, M, null, l, U);
    for (q in l) U = l[q], Z = i[q], !l.hasOwnProperty(q) || U === Z || U == null && Z == null || xe(e, n, q, U, l, Z);
  }
  function Ev(e) {
    switch (e) {
      case "css":
      case "script":
      case "font":
      case "img":
      case "image":
      case "input":
      case "link":
        return !0;
      default:
        return !1;
    }
  }
  function yb() {
    if (typeof performance.getEntriesByType == "function") {
      for (var e = 0, n = 0, i = performance.getEntriesByType("resource"), l = 0; l < i.length; l++) {
        var c = i[l], s = c.transferSize, m = c.initiatorType, y = c.duration;
        if (s && y && Ev(m)) {
          for (m = 0, y = c.responseEnd, l += 1; l < i.length; l++) {
            var A = i[l], x = A.startTime;
            if (x > y) break;
            var P = A.transferSize, q = A.initiatorType;
            P && Ev(q) && (A = A.responseEnd, m += P * (A < y ? 1 : (y - x) / (A - x)));
          }
          if (--l, n += 8 * (s + m) / (c.duration / 1e3), e++, 10 < e) break;
        }
      }
      if (0 < e) return n / e / 1e6;
    }
    return navigator.connection && (e = navigator.connection.downlink, typeof e == "number") ? e : 5;
  }
  var ds = null, hs = null;
  function fo(e) {
    return e.nodeType === 9 ? e : e.ownerDocument;
  }
  function Sv(e) {
    switch (e) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function Tv(e, n) {
    if (e === 0) switch (n) {
      case "svg":
        return 1;
      case "math":
        return 2;
      default:
        return 0;
    }
    return e === 1 && n === "foreignObject" ? 0 : e;
  }
  function ms(e, n) {
    return e === "textarea" || e === "noscript" || typeof n.children == "string" || typeof n.children == "number" || typeof n.children == "bigint" || typeof n.dangerouslySetInnerHTML == "object" && n.dangerouslySetInnerHTML !== null && n.dangerouslySetInnerHTML.__html != null;
  }
  var vs = null;
  function bb() {
    var e = window.event;
    return e && e.type === "popstate" ? e === vs ? !1 : (vs = e, !0) : (vs = null, !1);
  }
  var Av = typeof setTimeout == "function" ? setTimeout : void 0, _b = typeof clearTimeout == "function" ? clearTimeout : void 0, wv = typeof Promise == "function" ? Promise : void 0, Eb = typeof queueMicrotask == "function" ? queueMicrotask : typeof wv < "u" ? function(e) {
    return wv.resolve(null).then(e).catch(Sb);
  } : Av;
  function Sb(e) {
    setTimeout(function() {
      throw e;
    });
  }
  function ca(e) {
    return e === "head";
  }
  function Cv(e, n) {
    var i = n, l = 0;
    do {
      var c = i.nextSibling;
      if (e.removeChild(i), c && c.nodeType === 8) if (i = c.data, i === "/$" || i === "/&") {
        if (l === 0) {
          e.removeChild(c), Hi(n);
          return;
        }
        l--;
      } else if (i === "$" || i === "$?" || i === "$~" || i === "$!" || i === "&") l++;
      else if (i === "html") Br(e.ownerDocument.documentElement);
      else if (i === "head") {
        i = e.ownerDocument.head, Br(i);
        for (var s = i.firstChild; s; ) {
          var m = s.nextSibling, y = s.nodeName;
          s[tr] || y === "SCRIPT" || y === "STYLE" || y === "LINK" && s.rel.toLowerCase() === "stylesheet" || i.removeChild(s), s = m;
        }
      } else i === "body" && Br(e.ownerDocument.body);
      i = c;
    } while (i);
    Hi(n);
  }
  function Ov(e, n) {
    var i = e;
    e = 0;
    do {
      var l = i.nextSibling;
      if (i.nodeType === 1 ? n ? (i._stashedDisplay = i.style.display, i.style.display = "none") : (i.style.display = i._stashedDisplay || "", i.getAttribute("style") === "" && i.removeAttribute("style")) : i.nodeType === 3 && (n ? (i._stashedText = i.nodeValue, i.nodeValue = "") : i.nodeValue = i._stashedText || ""), l && l.nodeType === 8) if (i = l.data, i === "/$") {
        if (e === 0) break;
        e--;
      } else i !== "$" && i !== "$?" && i !== "$~" && i !== "$!" || e++;
      i = l;
    } while (i);
  }
  function ps(e) {
    var n = e.firstChild;
    for (n && n.nodeType === 10 && (n = n.nextSibling); n; ) {
      var i = n;
      switch (n = n.nextSibling, i.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          ps(i), Su(i);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if (i.rel.toLowerCase() === "stylesheet") continue;
      }
      e.removeChild(i);
    }
  }
  function Tb(e, n, i, l) {
    for (; e.nodeType === 1; ) {
      var c = i;
      if (e.nodeName.toLowerCase() !== n.toLowerCase()) {
        if (!l && (e.nodeName !== "INPUT" || e.type !== "hidden")) break;
      } else if (l) {
        if (!e[tr]) switch (n) {
          case "meta":
            if (!e.hasAttribute("itemprop")) break;
            return e;
          case "link":
            if (s = e.getAttribute("rel"), s === "stylesheet" && e.hasAttribute("data-precedence")) break;
            if (s !== c.rel || e.getAttribute("href") !== (c.href == null || c.href === "" ? null : c.href) || e.getAttribute("crossorigin") !== (c.crossOrigin == null ? null : c.crossOrigin) || e.getAttribute("title") !== (c.title == null ? null : c.title)) break;
            return e;
          case "style":
            if (e.hasAttribute("data-precedence")) break;
            return e;
          case "script":
            if (s = e.getAttribute("src"), (s !== (c.src == null ? null : c.src) || e.getAttribute("type") !== (c.type == null ? null : c.type) || e.getAttribute("crossorigin") !== (c.crossOrigin == null ? null : c.crossOrigin)) && s && e.hasAttribute("async") && !e.hasAttribute("itemprop")) break;
            return e;
          default:
            return e;
        }
      } else if (n === "input" && e.type === "hidden") {
        var s = c.name == null ? null : "" + c.name;
        if (c.type === "hidden" && e.getAttribute("name") === s) return e;
      } else return e;
      if (e = Vt(e.nextSibling), e === null) break;
    }
    return null;
  }
  function Ab(e, n, i) {
    if (n === "") return null;
    for (; e.nodeType !== 3; )
      if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !i || (e = Vt(e.nextSibling), e === null)) return null;
    return e;
  }
  function Rv(e, n) {
    for (; e.nodeType !== 8; )
      if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !n || (e = Vt(e.nextSibling), e === null)) return null;
    return e;
  }
  function gs(e) {
    return e.data === "$?" || e.data === "$~";
  }
  function ys(e) {
    return e.data === "$!" || e.data === "$?" && e.ownerDocument.readyState !== "loading";
  }
  function wb(e, n) {
    var i = e.ownerDocument;
    if (e.data === "$~") e._reactRetry = n;
    else if (e.data !== "$?" || i.readyState !== "loading") n();
    else {
      var l = function() {
        n(), i.removeEventListener("DOMContentLoaded", l);
      };
      i.addEventListener("DOMContentLoaded", l), e._reactRetry = l;
    }
  }
  function Vt(e) {
    for (; e != null; e = e.nextSibling) {
      var n = e.nodeType;
      if (n === 1 || n === 3) break;
      if (n === 8) {
        if (n = e.data, n === "$" || n === "$!" || n === "$?" || n === "$~" || n === "&" || n === "F!" || n === "F") break;
        if (n === "/$" || n === "/&") return null;
      }
    }
    return e;
  }
  var bs = null;
  function Mv(e) {
    e = e.nextSibling;
    for (var n = 0; e; ) {
      if (e.nodeType === 8) {
        var i = e.data;
        if (i === "/$" || i === "/&") {
          if (n === 0) return Vt(e.nextSibling);
          n--;
        } else i !== "$" && i !== "$!" && i !== "$?" && i !== "$~" && i !== "&" || n++;
      }
      e = e.nextSibling;
    }
    return null;
  }
  function Dv(e) {
    e = e.previousSibling;
    for (var n = 0; e; ) {
      if (e.nodeType === 8) {
        var i = e.data;
        if (i === "$" || i === "$!" || i === "$?" || i === "$~" || i === "&") {
          if (n === 0) return e;
          n--;
        } else i !== "/$" && i !== "/&" || n++;
      }
      e = e.previousSibling;
    }
    return null;
  }
  function Nv(e, n, i) {
    switch (n = fo(i), e) {
      case "html":
        if (e = n.documentElement, !e) throw Error(u(452));
        return e;
      case "head":
        if (e = n.head, !e) throw Error(u(453));
        return e;
      case "body":
        if (e = n.body, !e) throw Error(u(454));
        return e;
      default:
        throw Error(u(451));
    }
  }
  function Br(e) {
    for (var n = e.attributes; n.length; ) e.removeAttributeNode(n[0]);
    Su(e);
  }
  var Yt = /* @__PURE__ */ new Map(), zv = /* @__PURE__ */ new Set();
  function ho(e) {
    return typeof e.getRootNode == "function" ? e.getRootNode() : e.nodeType === 9 ? e : e.ownerDocument;
  }
  var Zn = $.d;
  $.d = {
    f: Cb,
    r: Ob,
    D: Rb,
    C: Mb,
    L: Db,
    m: Nb,
    X: xb,
    S: zb,
    M: Hb
  };
  function Cb() {
    var e = Zn.f(), n = ao();
    return e || n;
  }
  function Ob(e) {
    var n = Ja(e);
    n !== null && n.tag === 5 && n.type === "form" ? Wh(n) : Zn.r(e);
  }
  var Ni = typeof document > "u" ? null : document;
  function xv(e, n, i) {
    var l = Ni;
    if (l && typeof n == "string" && n) {
      var c = Ut(n);
      c = 'link[rel="' + e + '"][href="' + c + '"]', typeof i == "string" && (c += '[crossorigin="' + i + '"]'), zv.has(c) || (zv.add(c), e = {
        rel: e,
        crossOrigin: i,
        href: n
      }, l.querySelector(c) === null && (n = l.createElement("link"), st(n, "link", e), it(n), l.head.appendChild(n)));
    }
  }
  function Rb(e) {
    Zn.D(e), xv("dns-prefetch", e, null);
  }
  function Mb(e, n) {
    Zn.C(e, n), xv("preconnect", e, n);
  }
  function Db(e, n, i) {
    Zn.L(e, n, i);
    var l = Ni;
    if (l && e && n) {
      var c = 'link[rel="preload"][as="' + Ut(n) + '"]';
      n === "image" && i && i.imageSrcSet ? (c += '[imagesrcset="' + Ut(i.imageSrcSet) + '"]', typeof i.imageSizes == "string" && (c += '[imagesizes="' + Ut(i.imageSizes) + '"]')) : c += '[href="' + Ut(e) + '"]';
      var s = c;
      switch (n) {
        case "style":
          s = zi(e);
          break;
        case "script":
          s = xi(e);
      }
      Yt.has(s) || (e = E({
        rel: "preload",
        href: n === "image" && i && i.imageSrcSet ? void 0 : e,
        as: n
      }, i), Yt.set(s, e), l.querySelector(c) !== null || n === "style" && l.querySelector(jr(s)) || n === "script" && l.querySelector(Zr(s)) || (n = l.createElement("link"), st(n, "link", e), it(n), l.head.appendChild(n)));
    }
  }
  function Nb(e, n) {
    Zn.m(e, n);
    var i = Ni;
    if (i && e) {
      var l = n && typeof n.as == "string" ? n.as : "script", c = 'link[rel="modulepreload"][as="' + Ut(l) + '"][href="' + Ut(e) + '"]', s = c;
      switch (l) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          s = xi(e);
      }
      if (!Yt.has(s) && (e = E({
        rel: "modulepreload",
        href: e
      }, n), Yt.set(s, e), i.querySelector(c) === null)) {
        switch (l) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (i.querySelector(Zr(s))) return;
        }
        l = i.createElement("link"), st(l, "link", e), it(l), i.head.appendChild(l);
      }
    }
  }
  function zb(e, n, i) {
    Zn.S(e, n, i);
    var l = Ni;
    if (l && e) {
      var c = ei(l).hoistableStyles, s = zi(e);
      n = n || "default";
      var m = c.get(s);
      if (!m) {
        var y = {
          loading: 0,
          preload: null
        };
        if (m = l.querySelector(jr(s))) y.loading = 5;
        else {
          e = E({
            rel: "stylesheet",
            href: e,
            "data-precedence": n
          }, i), (i = Yt.get(s)) && _s(e, i);
          var A = m = l.createElement("link");
          it(A), st(A, "link", e), A._p = new Promise(function(x, P) {
            A.onload = x, A.onerror = P;
          }), A.addEventListener("load", function() {
            y.loading |= 1;
          }), A.addEventListener("error", function() {
            y.loading |= 2;
          }), y.loading |= 4, mo(m, n, l);
        }
        m = {
          type: "stylesheet",
          instance: m,
          count: 1,
          state: y
        }, c.set(s, m);
      }
    }
  }
  function xb(e, n) {
    Zn.X(e, n);
    var i = Ni;
    if (i && e) {
      var l = ei(i).hoistableScripts, c = xi(e), s = l.get(c);
      s || (s = i.querySelector(Zr(c)), s || (e = E({
        src: e,
        async: !0
      }, n), (n = Yt.get(c)) && Es(e, n), s = i.createElement("script"), it(s), st(s, "link", e), i.head.appendChild(s)), s = {
        type: "script",
        instance: s,
        count: 1,
        state: null
      }, l.set(c, s));
    }
  }
  function Hb(e, n) {
    Zn.M(e, n);
    var i = Ni;
    if (i && e) {
      var l = ei(i).hoistableScripts, c = xi(e), s = l.get(c);
      s || (s = i.querySelector(Zr(c)), s || (e = E({
        src: e,
        async: !0,
        type: "module"
      }, n), (n = Yt.get(c)) && Es(e, n), s = i.createElement("script"), it(s), st(s, "link", e), i.head.appendChild(s)), s = {
        type: "script",
        instance: s,
        count: 1,
        state: null
      }, l.set(c, s));
    }
  }
  function Hv(e, n, i, l) {
    var c = (c = fe.current) ? ho(c) : null;
    if (!c) throw Error(u(446));
    switch (e) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof i.precedence == "string" && typeof i.href == "string" ? (n = zi(i.href), i = ei(c).hoistableStyles, l = i.get(n), l || (l = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, i.set(n, l)), l) : {
          type: "void",
          instance: null,
          count: 0,
          state: null
        };
      case "link":
        if (i.rel === "stylesheet" && typeof i.href == "string" && typeof i.precedence == "string") {
          e = zi(i.href);
          var s = ei(c).hoistableStyles, m = s.get(e);
          if (m || (c = c.ownerDocument || c, m = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: {
              loading: 0,
              preload: null
            }
          }, s.set(e, m), (s = c.querySelector(jr(e))) && !s._p && (m.instance = s, m.state.loading = 5), Yt.has(e) || (i = {
            rel: "preload",
            as: "style",
            href: i.href,
            crossOrigin: i.crossOrigin,
            integrity: i.integrity,
            media: i.media,
            hrefLang: i.hrefLang,
            referrerPolicy: i.referrerPolicy
          }, Yt.set(e, i), s || Lb(c, e, i, m.state))), n && l === null) throw Error(u(528, ""));
          return m;
        }
        if (n && l !== null) throw Error(u(529, ""));
        return null;
      case "script":
        return n = i.async, i = i.src, typeof i == "string" && n && typeof n != "function" && typeof n != "symbol" ? (n = xi(i), i = ei(c).hoistableScripts, l = i.get(n), l || (l = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, i.set(n, l)), l) : {
          type: "void",
          instance: null,
          count: 0,
          state: null
        };
      default:
        throw Error(u(444, e));
    }
  }
  function zi(e) {
    return 'href="' + Ut(e) + '"';
  }
  function jr(e) {
    return 'link[rel="stylesheet"][' + e + "]";
  }
  function Lv(e) {
    return E({}, e, {
      "data-precedence": e.precedence,
      precedence: null
    });
  }
  function Lb(e, n, i, l) {
    e.querySelector('link[rel="preload"][as="style"][' + n + "]") ? l.loading = 1 : (n = e.createElement("link"), l.preload = n, n.addEventListener("load", function() {
      return l.loading |= 1;
    }), n.addEventListener("error", function() {
      return l.loading |= 2;
    }), st(n, "link", i), it(n), e.head.appendChild(n));
  }
  function xi(e) {
    return '[src="' + Ut(e) + '"]';
  }
  function Zr(e) {
    return "script[async]" + e;
  }
  function Uv(e, n, i) {
    if (n.count++, n.instance === null) switch (n.type) {
      case "style":
        var l = e.querySelector('style[data-href~="' + Ut(i.href) + '"]');
        if (l) return n.instance = l, it(l), l;
        var c = E({}, i, {
          "data-href": i.href,
          "data-precedence": i.precedence,
          href: null,
          precedence: null
        });
        return l = (e.ownerDocument || e).createElement("style"), it(l), st(l, "style", c), mo(l, i.precedence, e), n.instance = l;
      case "stylesheet":
        c = zi(i.href);
        var s = e.querySelector(jr(c));
        if (s) return n.state.loading |= 4, n.instance = s, it(s), s;
        l = Lv(i), (c = Yt.get(c)) && _s(l, c), s = (e.ownerDocument || e).createElement("link"), it(s);
        var m = s;
        return m._p = new Promise(function(y, A) {
          m.onload = y, m.onerror = A;
        }), st(s, "link", l), n.state.loading |= 4, mo(s, i.precedence, e), n.instance = s;
      case "script":
        return s = xi(i.src), (c = e.querySelector(Zr(s))) ? (n.instance = c, it(c), c) : (l = i, (c = Yt.get(s)) && (l = E({}, i), Es(l, c)), e = e.ownerDocument || e, c = e.createElement("script"), it(c), st(c, "link", l), e.head.appendChild(c), n.instance = c);
      case "void":
        return null;
      default:
        throw Error(u(443, n.type));
    }
    else n.type === "stylesheet" && (n.state.loading & 4) === 0 && (l = n.instance, n.state.loading |= 4, mo(l, i.precedence, e));
    return n.instance;
  }
  function mo(e, n, i) {
    for (var l = i.querySelectorAll('link[rel="stylesheet"][data-precedence],style[data-precedence]'), c = l.length ? l[l.length - 1] : null, s = c, m = 0; m < l.length; m++) {
      var y = l[m];
      if (y.dataset.precedence === n) s = y;
      else if (s !== c) break;
    }
    s ? s.parentNode.insertBefore(e, s.nextSibling) : (n = i.nodeType === 9 ? i.head : i, n.insertBefore(e, n.firstChild));
  }
  function _s(e, n) {
    e.crossOrigin ??= n.crossOrigin, e.referrerPolicy ??= n.referrerPolicy, e.title ??= n.title;
  }
  function Es(e, n) {
    e.crossOrigin ??= n.crossOrigin, e.referrerPolicy ??= n.referrerPolicy, e.integrity ??= n.integrity;
  }
  var vo = null;
  function Bv(e, n, i) {
    if (vo === null) {
      var l = /* @__PURE__ */ new Map(), c = vo = /* @__PURE__ */ new Map();
      c.set(i, l);
    } else c = vo, l = c.get(i), l || (l = /* @__PURE__ */ new Map(), c.set(i, l));
    if (l.has(e)) return l;
    for (l.set(e, null), i = i.getElementsByTagName(e), c = 0; c < i.length; c++) {
      var s = i[c];
      if (!(s[tr] || s[lt] || e === "link" && s.getAttribute("rel") === "stylesheet") && s.namespaceURI !== "http://www.w3.org/2000/svg") {
        var m = s.getAttribute(n) || "";
        m = e + m;
        var y = l.get(m);
        y ? y.push(s) : l.set(m, [s]);
      }
    }
    return l;
  }
  function jv(e, n, i) {
    e = e.ownerDocument || e, e.head.insertBefore(i, n === "title" ? e.querySelector("head > title") : null);
  }
  function Ub(e, n, i) {
    if (i === 1 || n.itemProp != null) return !1;
    switch (e) {
      case "meta":
      case "title":
        return !0;
      case "style":
        if (typeof n.precedence != "string" || typeof n.href != "string" || n.href === "") break;
        return !0;
      case "link":
        if (typeof n.rel != "string" || typeof n.href != "string" || n.href === "" || n.onLoad || n.onError) break;
        return n.rel === "stylesheet" ? (e = n.disabled, typeof n.precedence == "string" && e == null) : !0;
      case "script":
        if (n.async && typeof n.async != "function" && typeof n.async != "symbol" && !n.onLoad && !n.onError && n.src && typeof n.src == "string") return !0;
    }
    return !1;
  }
  function Zv(e) {
    return !(e.type === "stylesheet" && (e.state.loading & 3) === 0);
  }
  function Bb(e, n, i, l) {
    if (i.type === "stylesheet" && (typeof l.media != "string" || matchMedia(l.media).matches !== !1) && (i.state.loading & 4) === 0) {
      if (i.instance === null) {
        var c = zi(l.href), s = n.querySelector(jr(c));
        if (s) {
          n = s._p, n !== null && typeof n == "object" && typeof n.then == "function" && (e.count++, e = po.bind(e), n.then(e, e)), i.state.loading |= 4, i.instance = s, it(s);
          return;
        }
        s = n.ownerDocument || n, l = Lv(l), (c = Yt.get(c)) && _s(l, c), s = s.createElement("link"), it(s);
        var m = s;
        m._p = new Promise(function(y, A) {
          m.onload = y, m.onerror = A;
        }), st(s, "link", l), i.instance = s;
      }
      e.stylesheets === null && (e.stylesheets = /* @__PURE__ */ new Map()), e.stylesheets.set(i, n), (n = i.state.preload) && (i.state.loading & 3) === 0 && (e.count++, i = po.bind(e), n.addEventListener("load", i), n.addEventListener("error", i));
    }
  }
  var Ss = 0;
  function jb(e, n) {
    return e.stylesheets && e.count === 0 && yo(e, e.stylesheets), 0 < e.count || 0 < e.imgCount ? function(i) {
      var l = setTimeout(function() {
        if (e.stylesheets && yo(e, e.stylesheets), e.unsuspend) {
          var s = e.unsuspend;
          e.unsuspend = null, s();
        }
      }, 6e4 + n);
      0 < e.imgBytes && Ss === 0 && (Ss = 62500 * yb());
      var c = setTimeout(function() {
        if (e.waitingForImages = !1, e.count === 0 && (e.stylesheets && yo(e, e.stylesheets), e.unsuspend)) {
          var s = e.unsuspend;
          e.unsuspend = null, s();
        }
      }, (e.imgBytes > Ss ? 50 : 800) + n);
      return e.unsuspend = i, function() {
        e.unsuspend = null, clearTimeout(l), clearTimeout(c);
      };
    } : null;
  }
  function po() {
    if (this.count--, this.count === 0 && (this.imgCount === 0 || !this.waitingForImages)) {
      if (this.stylesheets) yo(this, this.stylesheets);
      else if (this.unsuspend) {
        var e = this.unsuspend;
        this.unsuspend = null, e();
      }
    }
  }
  var go = null;
  function yo(e, n) {
    e.stylesheets = null, e.unsuspend !== null && (e.count++, go = /* @__PURE__ */ new Map(), n.forEach(Zb, e), go = null, po.call(e));
  }
  function Zb(e, n) {
    if (!(n.state.loading & 4)) {
      var i = go.get(e);
      if (i) var l = i.get(null);
      else {
        i = /* @__PURE__ */ new Map(), go.set(e, i);
        for (var c = e.querySelectorAll("link[data-precedence],style[data-precedence]"), s = 0; s < c.length; s++) {
          var m = c[s];
          (m.nodeName === "LINK" || m.getAttribute("media") !== "not all") && (i.set(m.dataset.precedence, m), l = m);
        }
        l && i.set(null, l);
      }
      c = n.instance, m = c.getAttribute("data-precedence"), s = i.get(m) || l, s === l && i.set(null, c), i.set(m, c), this.count++, l = po.bind(this), c.addEventListener("load", l), c.addEventListener("error", l), s ? s.parentNode.insertBefore(c, s.nextSibling) : (e = e.nodeType === 9 ? e.head : e, e.insertBefore(c, e.firstChild)), n.state.loading |= 4;
    }
  }
  var Gr = {
    $$typeof: N,
    Provider: null,
    Consumer: null,
    _currentValue: ce,
    _currentValue2: ce,
    _threadCount: 0
  };
  function Gb(e, n, i, l, c, s, m, y, A) {
    this.tag = 1, this.containerInfo = e, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = bu(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = bu(0), this.hiddenUpdates = bu(null), this.identifierPrefix = l, this.onUncaughtError = c, this.onCaughtError = s, this.onRecoverableError = m, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = A, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Pb(e, n, i, l, c, s, m, y, A, x, P, q) {
    return e = new Gb(e, n, i, m, A, x, P, q, y), n = 1, s === !0 && (n |= 24), s = Ot(3, null, null, n), e.current = s, s.stateNode = e, n = nc(), n.refCount++, e.pooledCache = n, n.refCount++, s.memoizedState = {
      element: l,
      isDehydrated: i,
      cache: n
    }, lc(s), e;
  }
  function Xb(e) {
    return e ? (e = si, e) : si;
  }
  function Gv(e, n, i, l, c, s) {
    c = Xb(c), l.context === null ? l.context = c : l.pendingContext = c, l = Ba(n), l.payload = { element: i }, s = s === void 0 ? null : s, s !== null && (l.callback = s), i = ja(e, l, n), i !== null && (_t(i, e, n), yr(i, e, n));
  }
  function Pv(e, n) {
    if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
      var i = e.retryLane;
      e.retryLane = i !== 0 && i < n ? i : n;
    }
  }
  function Ts(e, n) {
    Pv(e, n), (e = e.alternate) && Pv(e, n);
  }
  function Xv(e) {
    if (e.tag === 13 || e.tag === 31) {
      var n = Ra(e, 67108864);
      n !== null && _t(n, e, 67108864), Ts(e, 67108864);
    }
  }
  function kv(e) {
    if (e.tag === 13 || e.tag === 31) {
      var n = kt();
      n = ud(n);
      var i = Ra(e, n);
      i !== null && _t(i, e, n), Ts(e, n);
    }
  }
  var bo = !0;
  function kb(e, n, i, l) {
    var c = k.T;
    k.T = null;
    var s = $.p;
    try {
      $.p = 2, As(e, n, i, l);
    } finally {
      $.p = s, k.T = c;
    }
  }
  function Vb(e, n, i, l) {
    var c = k.T;
    k.T = null;
    var s = $.p;
    try {
      $.p = 8, As(e, n, i, l);
    } finally {
      $.p = s, k.T = c;
    }
  }
  function As(e, n, i, l) {
    if (bo) {
      var c = ws(l);
      if (c === null) ss(e, n, l, _o, i), Yv(e, l);
      else if (qb(c, e, n, i, l)) l.stopPropagation();
      else if (Yv(e, l), n & 4 && -1 < Yb.indexOf(e)) {
        for (; c !== null; ) {
          var s = Ja(c);
          if (s !== null) switch (s.tag) {
            case 3:
              if (s = s.stateNode, s.current.memoizedState.isDehydrated) {
                var m = Ta(s.pendingLanes);
                if (m !== 0) {
                  var y = s;
                  for (y.pendingLanes |= 2, y.entangledLanes |= 2; m; ) {
                    var A = 1 << 31 - wt(m);
                    y.entanglements[1] |= A, m &= ~A;
                  }
                  jn(s), (Me & 6) === 0 && (to = Tt() + 500, Hr(0, !1));
                }
              }
              break;
            case 31:
            case 13:
              y = Ra(s, 2), y !== null && _t(y, s, 2), ao(), Ts(s, 2);
          }
          if (s = ws(l), s === null && ss(e, n, l, _o, i), s === c) break;
          c = s;
        }
        c !== null && l.stopPropagation();
      } else ss(e, n, l, null, i);
    }
  }
  function ws(e) {
    return e = Ru(e), Cs(e);
  }
  var _o = null;
  function Cs(e) {
    if (_o = null, e = Ka(e), e !== null) {
      var n = d(e);
      if (n === null) e = null;
      else {
        var i = n.tag;
        if (i === 13) {
          if (e = h(n), e !== null) return e;
          e = null;
        } else if (i === 31) {
          if (e = p(n), e !== null) return e;
          e = null;
        } else if (i === 3) {
          if (n.stateNode.current.memoizedState.isDehydrated) return n.tag === 3 ? n.stateNode.containerInfo : null;
          e = null;
        } else n !== e && (e = null);
      }
    }
    return _o = e, null;
  }
  function Vv(e) {
    switch (e) {
      case "beforetoggle":
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "toggle":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 2;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 8;
      case "message":
        switch (jy()) {
          case td:
            return 2;
          case nd:
            return 8;
          case ol:
          case Zy:
            return 32;
          case ad:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var Os = !1, sa = null, fa = null, da = null, Pr = /* @__PURE__ */ new Map(), Xr = /* @__PURE__ */ new Map(), ha = [], Yb = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");
  function Yv(e, n) {
    switch (e) {
      case "focusin":
      case "focusout":
        sa = null;
        break;
      case "dragenter":
      case "dragleave":
        fa = null;
        break;
      case "mouseover":
      case "mouseout":
        da = null;
        break;
      case "pointerover":
      case "pointerout":
        Pr.delete(n.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Xr.delete(n.pointerId);
    }
  }
  function kr(e, n, i, l, c, s) {
    return e === null || e.nativeEvent !== s ? (e = {
      blockedOn: n,
      domEventName: i,
      eventSystemFlags: l,
      nativeEvent: s,
      targetContainers: [c]
    }, n !== null && (n = Ja(n), n !== null && Xv(n)), e) : (e.eventSystemFlags |= l, n = e.targetContainers, c !== null && n.indexOf(c) === -1 && n.push(c), e);
  }
  function qb(e, n, i, l, c) {
    switch (n) {
      case "focusin":
        return sa = kr(sa, e, n, i, l, c), !0;
      case "dragenter":
        return fa = kr(fa, e, n, i, l, c), !0;
      case "mouseover":
        return da = kr(da, e, n, i, l, c), !0;
      case "pointerover":
        var s = c.pointerId;
        return Pr.set(s, kr(Pr.get(s) || null, e, n, i, l, c)), !0;
      case "gotpointercapture":
        return s = c.pointerId, Xr.set(s, kr(Xr.get(s) || null, e, n, i, l, c)), !0;
    }
    return !1;
  }
  function qv(e) {
    var n = Ka(e.target);
    if (n !== null) {
      var i = d(n);
      if (i !== null) {
        if (n = i.tag, n === 13) {
          if (n = h(i), n !== null) {
            e.blockedOn = n, sd(e.priority, function() {
              kv(i);
            });
            return;
          }
        } else if (n === 31) {
          if (n = p(i), n !== null) {
            e.blockedOn = n, sd(e.priority, function() {
              kv(i);
            });
            return;
          }
        } else if (n === 3 && i.stateNode.current.memoizedState.isDehydrated) {
          e.blockedOn = i.tag === 3 ? i.stateNode.containerInfo : null;
          return;
        }
      }
    }
    e.blockedOn = null;
  }
  function Eo(e) {
    if (e.blockedOn !== null) return !1;
    for (var n = e.targetContainers; 0 < n.length; ) {
      var i = ws(e.nativeEvent);
      if (i === null) {
        i = e.nativeEvent;
        var l = new i.constructor(i.type, i);
        Ou = l, i.target.dispatchEvent(l), Ou = null;
      } else return n = Ja(i), n !== null && Xv(n), e.blockedOn = i, !1;
      n.shift();
    }
    return !0;
  }
  function Iv(e, n, i) {
    Eo(e) && i.delete(n);
  }
  function Ib() {
    Os = !1, sa !== null && Eo(sa) && (sa = null), fa !== null && Eo(fa) && (fa = null), da !== null && Eo(da) && (da = null), Pr.forEach(Iv), Xr.forEach(Iv);
  }
  function So(e, n) {
    e.blockedOn === n && (e.blockedOn = null, Os || (Os = !0, a.unstable_scheduleCallback(a.unstable_NormalPriority, Ib)));
  }
  var To = null;
  function $v(e) {
    To !== e && (To = e, a.unstable_scheduleCallback(a.unstable_NormalPriority, function() {
      To === e && (To = null);
      for (var n = 0; n < e.length; n += 3) {
        var i = e[n], l = e[n + 1], c = e[n + 2];
        if (typeof l != "function") {
          if (Cs(l || i) === null) continue;
          break;
        }
        var s = Ja(i);
        s !== null && (e.splice(n, 3), n -= 3, Cc(s, {
          pending: !0,
          data: c,
          method: i.method,
          action: l
        }, l, c));
      }
    }));
  }
  function Hi(e) {
    function n(A) {
      return So(A, e);
    }
    sa !== null && So(sa, e), fa !== null && So(fa, e), da !== null && So(da, e), Pr.forEach(n), Xr.forEach(n);
    for (var i = 0; i < ha.length; i++) {
      var l = ha[i];
      l.blockedOn === e && (l.blockedOn = null);
    }
    for (; 0 < ha.length && (i = ha[0], i.blockedOn === null); ) qv(i), i.blockedOn === null && ha.shift();
    if (i = (e.ownerDocument || e).$$reactFormReplay, i != null) for (l = 0; l < i.length; l += 3) {
      var c = i[l], s = i[l + 1], m = c[mt] || null;
      if (typeof s == "function") m || $v(i);
      else if (m) {
        var y = null;
        if (s && s.hasAttribute("formAction")) {
          if (c = s, m = s[mt] || null) y = m.formAction;
          else if (Cs(c) !== null) continue;
        } else y = m.action;
        typeof y == "function" ? i[l + 1] = y : (i.splice(l, 3), l -= 3), $v(i);
      }
    }
  }
  function $b() {
    function e(s) {
      s.canIntercept && s.info === "react-transition" && s.intercept({
        handler: function() {
          return new Promise(function(m) {
            return c = m;
          });
        },
        focusReset: "manual",
        scroll: "manual"
      });
    }
    function n() {
      c !== null && (c(), c = null), l || setTimeout(i, 20);
    }
    function i() {
      if (!l && !navigation.transition) {
        var s = navigation.currentEntry;
        s && s.url != null && navigation.navigate(s.url, {
          state: s.getState(),
          info: "react-transition",
          history: "replace"
        });
      }
    }
    if (typeof navigation == "object") {
      var l = !1, c = null;
      return navigation.addEventListener("navigate", e), navigation.addEventListener("navigatesuccess", n), navigation.addEventListener("navigateerror", n), setTimeout(i, 100), function() {
        l = !0, navigation.removeEventListener("navigate", e), navigation.removeEventListener("navigatesuccess", n), navigation.removeEventListener("navigateerror", n), c !== null && (c(), c = null);
      };
    }
  }
  function Rs(e) {
    this._internalRoot = e;
  }
  Ms.prototype.render = Rs.prototype.render = function(e) {
    var n = this._internalRoot;
    if (n === null) throw Error(u(409));
    var i = n.current;
    Gv(i, kt(), e, n, null, null);
  }, Ms.prototype.unmount = Rs.prototype.unmount = function() {
    var e = this._internalRoot;
    if (e !== null) {
      this._internalRoot = null;
      var n = e.containerInfo;
      Gv(e.current, 2, null, e, null, null), ao(), n[er] = null;
    }
  };
  function Ms(e) {
    this._internalRoot = e;
  }
  Ms.prototype.unstable_scheduleHydration = function(e) {
    if (e) {
      var n = cd();
      e = {
        blockedOn: null,
        target: e,
        priority: n
      };
      for (var i = 0; i < ha.length && n !== 0 && n < ha[i].priority; i++) ;
      ha.splice(i, 0, e), i === 0 && qv(e);
    }
  };
  var Fv = r.version;
  if (Fv !== "19.2.8") throw Error(u(527, Fv, "19.2.8"));
  $.findDOMNode = function(e) {
    var n = e._reactInternals;
    if (n === void 0)
      throw typeof e.render == "function" ? Error(u(188)) : (e = Object.keys(e).join(","), Error(u(268, e)));
    return e = v(n), e = e !== null ? b(e) : null, e = e === null ? null : e.stateNode, e;
  };
  var Fb = {
    bundleType: 0,
    version: "19.2.8",
    rendererPackageName: "react-dom",
    currentDispatcherRef: k,
    reconcilerVersion: "19.2.8"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Ao = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Ao.isDisabled && Ao.supportsFiber) try {
      Ki = Ao.inject(Fb), At = Ao;
    } catch {
    }
  }
  t.createRoot = function(e, n) {
    if (!f(e)) throw Error(u(299));
    var i = !1, l = "", c = V1, s = Y1, m = q1;
    return n != null && (n.unstable_strictMode === !0 && (i = !0), n.identifierPrefix !== void 0 && (l = n.identifierPrefix), n.onUncaughtError !== void 0 && (c = n.onUncaughtError), n.onCaughtError !== void 0 && (s = n.onCaughtError), n.onRecoverableError !== void 0 && (m = n.onRecoverableError)), n = Pb(e, 1, !1, null, null, i, l, null, c, s, m, $b), e[er] = n.current, pv(e), new Rs(n);
  };
})), jR = /* @__PURE__ */ Ht(((t, a) => {
  function r() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(r);
      } catch (o) {
        console.error(o);
      }
  }
  r(), a.exports = BR();
})), ZR = jR();
async function GR(t) {
  if (t === "en-US") return {};
  try {
    const a = await fetch(`/_sites/dispatch-assets/sites-widget-locales/${encodeURIComponent(t)}.json`);
    if (!a.ok) return {};
    const r = await a.json();
    return r === null || typeof r != "object" || Array.isArray(r) ? {} : Object.fromEntries(Object.entries(r).filter(([o, u]) => o.startsWith("sites.dispatch.widget.") && Array.isArray(u)));
  } catch {
    return {};
  }
}
function PR({ onMount: t }) {
  return (0, _.useLayoutEffect)(t, [t]), null;
}
function XR(t, a) {
  const r = document.createElement("div");
  r.dataset.sitesWidget = t.kind, document.body.append(r);
  let o;
  const u = () => {
    o?.unmount(), r.remove();
  };
  return {
    ready: (async () => {
      const f = VE(t.locale ?? "") ?? "en-US", d = r.attachShadow({ mode: "open" }), h = document.createElement("style");
      h.textContent = `
      :host {
        all: initial !important;
        display: block !important;
        inset: 0 !important;
        pointer-events: none !important;
        position: fixed !important;
        z-index: 2147483647 !important;
      }
    `;
      const p = document.createElement("style");
      p.textContent = "._Button_guvzm_1{--button-press-scale:.96;--button-size:32px;--button-icon-size:18px;all:initial;box-sizing:border-box;color:var(--button-text-color);cursor:pointer;font:inherit;height:var(--button-size);-webkit-user-select:none;user-select:none;white-space:nowrap;flex-shrink:0;padding:0 12px;display:inline-block;position:relative}._Button_guvzm_1:before,._Button_guvzm_1:after{border-radius:inherit;content:\"\";pointer-events:none;will-change:transform;transition:background-color .15s,box-shadow .15s,transform .15s;position:absolute;inset:0}._Button_guvzm_1:before{background:var(--button-background-color)}._Button_guvzm_1:focus{outline:0}._Button_guvzm_1:focus-visible:after{outline:2px solid var(--button-ring-color,currentColor);outline-offset:var(--button-ring-offset,2px)}._Button_guvzm_1[data-size=lg]{--button-size:36px}._Button_guvzm_1[data-icon-size=lg]{--button-icon-size:20px}._Button_guvzm_1[data-pill]{border-radius:9999px}._Button_guvzm_1[data-uniform]{width:var(--button-size);padding:0}._Button_guvzm_1[data-variant=solid][data-color=primary]{--button-background-color:#171717;--button-background-color-hover:#303030;--button-background-color-active:#444;--button-text-color:#fff}._Button_guvzm_1[data-variant=solid][data-color=secondary]{--button-background-color:#fff;--button-background-color-hover:#f7f7f7;--button-background-color-active:#ededed;--button-text-color:#171717}._Button_guvzm_1[data-variant=ghost]{--button-background-color:transparent;--button-background-color-hover:#f2f2f2;--button-background-color-active:#e8e8e8}._Button_guvzm_1:not(:disabled):hover:before{background:var(--button-background-color-hover)}._Button_guvzm_1:not(:disabled):active:before{background:var(--button-background-color-active);transform:scale(var(--button-press-scale))}._Button_guvzm_1:not(:disabled):active:after{transform:scale(var(--button-press-scale))}._Button_guvzm_1:disabled{cursor:default;opacity:.32}._Button_guvzm_1 svg:not([data-no-autosize]){height:var(--button-icon-size);width:var(--button-icon-size)}._ButtonInner_guvzm_107{align-items:center;gap:inherit;justify-content:center;width:100%;height:100%;display:flex;position:relative}@media (prefers-reduced-motion:reduce){._Button_guvzm_1:before,._Button_guvzm_1:after{transition:none}}._Image_1l1xj_1{opacity:0;transition:opacity .3s var(--transition-ease-basic,ease);display:block}._Image_1l1xj_1[data-loaded]{opacity:1}@media (prefers-reduced-motion:reduce){._Image_1l1xj_1{transition:none}}._Tooltip_1iulb_1{border-radius:var(--tooltip-border-radius);max-width:300px;animation-name:_scale-in_1iulb_1;animation-duration:.25s;animation-timing-function:var(--cubic-enter);background:var(--tooltip-background-color);box-shadow:var(--tooltip-box-shadow);color:var(--tooltip-text-color);font-size:var(--tooltip-font-size);font-weight:var(--tooltip-font-weight);line-height:var(--tooltip-line-height);transform-origin:var(--radix-tooltip-content-transform-origin);transition:background-color .15s}._Tooltip_1iulb_1[data-state=closed]{animation:_scale-out_1iulb_1 .25s var(--cubic-enter)}._Tooltip_1iulb_1{padding:var(--tooltip-padding-md)}@keyframes _scale-in_1iulb_1{0%{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}@keyframes _scale-out_1iulb_1{0%{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.97)}}._TransitionGroupChild_1d6a5_1{display:block}._Layout_imkf6_1{flex-shrink:0;transition-property:height,width;display:block;position:relative}._Layout_imkf6_1[data-clip=true]{overflow:hidden}._Layout_imkf6_1[data-direction=in]{transition-delay:var(--tg-layout-enter-delay);transition-duration:var(--tg-layout-enter-duration);transition-timing-function:var(--tg-layout-enter-timing-function)}._Layout_imkf6_1[data-direction=out]{transition-delay:var(--tg-layout-exit-delay);transition-duration:var(--tg-layout-exit-duration);transition-timing-function:var(--tg-layout-exit-timing-function)}._Layout_imkf6_1[data-direction=move]{transition-delay:var(--tg-layout-move-delay);transition-duration:var(--tg-layout-move-duration);transition-timing-function:var(--tg-layout-move-timing-function)}._Layout_imkf6_1[data-interrupted=true]{transition-delay:0s}._TransitionItem_imkf6_34{will-change:var(--tg-will-change,auto);flex-shrink:0}._TransitionItem_imkf6_34[data-entering],._TransitionItem_imkf6_34[data-exiting]{width:100%;position:absolute;top:0;left:0}._Layout_imkf6_1[data-dimension=width]>._TransitionItem_imkf6_34[data-entering],._Layout_imkf6_1[data-dimension=width]>._TransitionItem_imkf6_34[data-exiting]{width:auto}._Layout_imkf6_1[data-item-anchor=end]>._TransitionItem_imkf6_34[data-entering],._Layout_imkf6_1[data-item-anchor=end]>._TransitionItem_imkf6_34[data-exiting]{bottom:0;top:initial}._Layout_imkf6_1[data-item-anchor=end][data-dimension=width]>._TransitionItem_imkf6_34[data-entering],._Layout_imkf6_1[data-item-anchor=end][data-dimension=width]>._TransitionItem_imkf6_34[data-exiting]{left:initial;right:0}._TransitionItem_imkf6_34[data-entering]{filter:var(--tg-initial-filter);opacity:var(--tg-initial-opacity);transform:var(--tg-initial-transform)}._TransitionItem_imkf6_34[data-exiting]{filter:var(--tg-enter-filter);opacity:var(--tg-enter-opacity);transform:var(--tg-enter-transform)}._TransitionItem_imkf6_34[data-entering-active],._TransitionItem_imkf6_34[data-entering][data-interrupted]{filter:var(--tg-enter-filter);opacity:var(--tg-enter-opacity);transform:var(--tg-enter-transform);transition:opacity var(--tg-enter-duration) var(--tg-enter-timing-function) var(--tg-enter-delay), transform var(--tg-enter-duration) var(--tg-enter-timing-function) var(--tg-enter-delay), filter var(--tg-enter-duration) var(--tg-enter-timing-function) var(--tg-enter-delay)}._TransitionItem_imkf6_34[data-exiting-active],._TransitionItem_imkf6_34[data-exiting][data-interrupted]{filter:var(--tg-exit-filter);opacity:var(--tg-exit-opacity);transform:var(--tg-exit-transform);transition:opacity var(--tg-exit-duration) var(--tg-exit-timing-function) var(--tg-exit-delay), transform var(--tg-exit-duration) var(--tg-exit-timing-function) var(--tg-exit-delay), filter var(--tg-exit-duration) var(--tg-exit-timing-function) var(--tg-exit-delay)}._Theme_1s223_2{--cubic-enter:cubic-bezier(.19, 1, .22, 1);--cubic-exit:cubic-bezier(.8, 0, .4, 1);--tooltip-border-radius:9999px;--tooltip-background-color:#1d1d1d;--tooltip-text-color:#fff;--tooltip-box-shadow:0 4px 12px #0000001f;--tooltip-font-size:14px;--tooltip-font-weight:500;--tooltip-line-height:20px;--tooltip-padding-md:5px 12px;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}._Portal_1s223_18{pointer-events:none;z-index:2147483647;position:relative}._Tooltip_1s223_24{box-sizing:border-box;cursor:default;letter-spacing:0;pointer-events:auto;text-align:center;border:1px solid #ffffff1f}._HideHint_1s223_33{--tooltip-border-radius:14px;--tooltip-padding-md:10px 12px;pointer-events:auto;text-align:left;border:0;width:280px}._HideHintContent_1s223_43{align-items:center;gap:12px;display:flex}._HideHintText_1s223_49{flex:1;min-width:0}._Shortcut_1s223_54{flex-shrink:0;gap:4px;display:inline-flex}._Shortcut_1s223_54 kbd{box-sizing:border-box;font:inherit;background:#ffffff17;border:1px solid #ffffff24;border-radius:5px;justify-content:center;align-items:center;min-width:22px;height:22px;padding:0 4px;font-size:12px;display:inline-flex;box-shadow:0 1px 1px #ffffff1f}@media (prefers-reduced-motion:reduce){._Portal_1s223_18 ._Tooltip_1s223_24[data-state]{animation:none}}._Widget_13oam_1,._Widget_13oam_1 *,._Widget_13oam_1 :before,._Widget_13oam_1 :after{box-sizing:border-box}._Widget_13oam_1{--button-ring-color:#171717;--button-ring-offset:3px;--widget-surface:#ffffffc7;--widget-surface-highlight:#ffffffc7;--widget-text:#171717;--widget-text-secondary:#444;--widget-text-tertiary:#8f8f8f;--widget-placeholder:#777;--widget-border:#0d0d0d1f;--widget-border-highlight:#0d0d0d2e;--widget-control-hover:#0d0d0d0f;--widget-control-active:#0d0d0d1a;--widget-shadow:#00000024;all:initial;box-sizing:border-box;color:var(--widget-text);--lightningcss-light:initial;--lightningcss-dark: ;color-scheme:light dark;pointer-events:auto;z-index:2147483647;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;position:fixed}@media (prefers-color-scheme:dark){._Widget_13oam_1{--lightningcss-light: ;--lightningcss-dark:initial}}._Widget_13oam_1{pointer-events:none;bottom:auto;right:auto}._Widget_13oam_1[data-snapping]{transition:left var(--widget-snap-duration) cubic-bezier(.2, .8, .2, 1), top var(--widget-snap-duration) cubic-bezier(.2, .8, .2, 1)}._LandingShadow_13oam_46{box-sizing:border-box;pointer-events:none;z-index:2147483646;background:#64748b29;border-radius:18px;position:fixed;box-shadow:0 4px 20px #00000014}._WidgetEntrance_13oam_56[data-entering]{opacity:0;transform:translateY(4px)}._WidgetEntrance_13oam_56[data-entering-active]{opacity:1;transition:opacity .18s cubic-bezier(.19,1,.22,1),transform .18s cubic-bezier(.19,1,.22,1);transform:translateY(0)}._WidgetExit_13oam_69[data-exiting]{opacity:0}._WidgetExit_13oam_69{contain:paint;pointer-events:none;z-index:2147483647;position:fixed;inset:0}._Widget_13oam_1[data-tucked] ._Shell_13oam_82{width:64px;height:64px;transform:translate(var(--tuck-x), var(--tuck-y));border-radius:32px}._Widget_13oam_1[data-peek-phase=expanded] ._Shell_13oam_82{width:88px;height:88px;transform:translate(calc(var(--tuck-x) - 12px), calc(var(--tuck-y) - 12px));--widget-morph-easing:cubic-bezier(.2, 1.4, .4, 1);border-radius:32px}._Widget_13oam_1[data-quiet-tuck] ._Shell_13oam_82{--widget-morph-duration:.22s;--widget-morph-easing:ease}._Widget_13oam_1[data-peek-phase=away] ._Shell_13oam_82{transform:translate(calc(var(--tuck-x) + var(--corner-x-direction) * 80px), calc(var(--tuck-y) + var(--corner-y-direction) * 80px));--widget-morph-duration:.36s;--widget-morph-easing:cubic-bezier(.55, 0, .85, .4)}._ShellControls_13oam_114{width:max-content;transition:opacity .12s .14s}._Widget_13oam_1[data-tucked] ._ShellControls_13oam_114{opacity:0;transition:opacity .1s}._Launcher_13oam_124{cursor:pointer;font:inherit;color:var(--widget-text);white-space:nowrap;-webkit-user-select:none;user-select:none;z-index:1;background:0 0;border:0;justify-content:center;align-items:center;gap:12px;min-width:137px;height:36px;padding:0 40px;font-size:13px;font-weight:400;display:inline-flex}._LauncherRow_13oam_147{position:relative}._LauncherLabel_13oam_151{line-height:20px;display:inline-block}._Widget_13oam_1[data-dragging] ._Launcher_13oam_124{cursor:grabbing}._CornerTarget_13oam_161{cursor:pointer;pointer-events:auto;touch-action:none;z-index:2147483647;background:0 0;border:0;width:44px;height:44px;padding:0;position:fixed}._CornerTarget_13oam_161:hover,._CornerTarget_13oam_161:focus-visible{width:52px;height:52px}._CornerTarget_13oam_161:focus-visible{outline:2px solid var(--button-ring-color);outline-offset:-3px}._Widget_13oam_1[data-corner=top-left] ._CornerTarget_13oam_161{border-radius:0 0 32px;top:0;left:0}._Widget_13oam_1[data-corner=top-right] ._CornerTarget_13oam_161{border-radius:0 0 0 32px;top:0;right:0}._Widget_13oam_1[data-corner=bottom-left] ._CornerTarget_13oam_161{border-radius:0 32px 0 0;bottom:0;left:0}._Widget_13oam_1[data-corner=bottom-right] ._CornerTarget_13oam_161{border-radius:32px 0 0;bottom:0;right:0}._Panel_13oam_191 ._LogoButton_13oam_191[data-variant][data-color]{--button-background-color-hover:var(--widget-control-hover);--button-background-color-active:var(--widget-control-active);--button-text-color:var(--widget-text);--button-size:28px;z-index:2;position:absolute;top:4px;left:4px}._LogoButton_13oam_191:focus-visible:before{background:var(--button-background-color-hover)}._Shell_13oam_82{--widget-morph-duration:.42s;--widget-morph-easing:cubic-bezier(.4, 0, .2, 1);pointer-events:auto;width:var(--widget-surface-width,137px);height:var(--widget-surface-height,36px);transition:transform var(--widget-morph-duration) var(--widget-morph-easing), width var(--widget-morph-duration) var(--widget-morph-easing), height var(--widget-morph-duration) var(--widget-morph-easing), border-radius var(--widget-morph-duration) var(--widget-morph-easing), opacity .15s ease;border-radius:18px;position:relative;transform:translate(0)}._Panel_13oam_191[data-expanded] ._Shell_13oam_82{transition:none}._Widget_13oam_1:not([data-tucked]) ._Shell_13oam_82:has(._ShellContent_13oam_231[data-entering],._ShellContent_13oam_231[data-exiting]){transition-property:transform,border-radius,opacity}._ShellLayout_13oam_235{border-radius:inherit;width:max-content;min-height:36px;transition-property:width}._ShellContent_13oam_231{z-index:1;min-height:36px;position:relative}._Widget_13oam_1[data-corner^=top] ._ShellContent_13oam_231:is([data-entering],[data-exiting]){top:0;bottom:auto}._Widget_13oam_1[data-corner^=bottom] ._ShellContent_13oam_231:is([data-entering],[data-exiting]){top:auto;bottom:0}._ShellContent_13oam_231[data-exiting],._ShellContent_13oam_231[data-exiting] *{pointer-events:none}._Shell_13oam_82:before{-webkit-backdrop-filter:blur(18px)saturate(1.25);backdrop-filter:blur(18px)saturate(1.25);background:var(--widget-surface);border-radius:inherit;box-shadow:0 0 0 1px var(--widget-border), 0 10px 30px var(--widget-shadow), 0 2px 6px #00000014;content:\"\";pointer-events:none;will-change:transform;transition:background-color .15s,box-shadow .15s,transform .15s;position:absolute;inset:0}._Shell_13oam_82:hover:before,._Shell_13oam_82:focus-within:before{background:var(--widget-surface-highlight)}._Shell_13oam_82:after{border-radius:inherit;content:\"\";pointer-events:none;transition:transform .15s;position:absolute;inset:0}._Panel_13oam_191:not([data-expanded]) ._Shell_13oam_82:has(._Launcher_13oam_124:focus-visible):after{outline:2px solid var(--button-ring-color);outline-offset:var(--button-ring-offset)}._Shell_13oam_82:has(._Launcher_13oam_124:active):before{transform:scale(.98)}._Shell_13oam_82:has(._Launcher_13oam_124:active):after{transform:scale(.98)}._LauncherLogo_13oam_308{flex:none;width:18px;height:18px;display:block}._LauncherLogo_13oam_308[data-entering] img[data-loaded]{transform-origin:50%;animation:.7s cubic-bezier(.22,1,.36,1) both _blossomEntrance_13oam_1}@keyframes _blossomEntrance_13oam_1{0%{transform:rotate(-60deg)scale(.9)}to{transform:rotate(0)scale(1)}}._Panel_13oam_191{--widget-panel-width:min(360px, calc(100vw - 48px));width:var(--widget-panel-width);flex-direction:column;align-items:flex-start;display:flex;position:relative}._Panel_13oam_191:is(:lang(ae),:lang(ar),:lang(arc),:lang(bcc),:lang(bqi),:lang(ckb),:lang(dv),:lang(fa),:lang(glk),:lang(he),:lang(ku),:lang(mzn),:lang(nqo),:lang(pnb),:lang(ps),:lang(sd),:lang(ug),:lang(ur),:lang(yi)){align-items:flex-end}._Composer_13oam_340{min-height:36px;width:var(--widget-panel-width);background:0 0;grid-template-columns:minmax(0,1fr) 24px;align-items:end;gap:8px;padding:6px;display:grid;overflow:hidden}._Textarea_13oam_352{all:initial;box-sizing:border-box;color:var(--widget-text);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;resize:none;align-self:center;width:calc(100% - 12px);height:24px;min-height:24px;max-height:180px;margin-left:12px;padding:3px 0;font-family:inherit;font-size:14px;font-weight:400;line-height:18px;transition:none;display:block;overflow-y:auto}._Textarea_13oam_352::placeholder{color:var(--widget-placeholder);opacity:1}._Textarea_13oam_352:placeholder-shown{white-space:pre;overflow-x:hidden}._Textarea_13oam_352:focus{outline:0}._ComposerFooter_13oam_390{justify-content:flex-end;display:flex}._Panel_13oam_191 ._SendButton_13oam_395[data-variant][data-color]{--button-size:24px;--button-icon-size:16px;align-self:end}._Launcher_13oam_124:focus{outline:0}._Panel_13oam_191 ._LauncherDismissButton_13oam_406[data-variant][data-color]{--button-background-color-hover:var(--widget-control-hover);--button-background-color-active:var(--widget-control-active);--button-text-color:var(--widget-text-tertiary);--button-size:28px;--button-icon-size:16px;opacity:0;pointer-events:none;z-index:2;transition:opacity 80ms;position:absolute;bottom:4px;right:4px}._LauncherDismissButton_13oam_406:focus-visible:before{background:var(--button-background-color-hover)}._Panel_13oam_191:not([data-expanded]) ._LauncherDismissButton_13oam_406[data-variant][data-color]{opacity:1;pointer-events:auto}._Panel_13oam_191:not([data-expanded]) ._Shell_13oam_82:has(._ShellContent_13oam_231[data-entering]) ._LauncherDismissButton_13oam_406[data-variant][data-color]{opacity:0;pointer-events:none}@media (prefers-reduced-motion:reduce){._WidgetEntrance_13oam_56[data-entering]{opacity:1;transition:none;transform:none}._Widget_13oam_1[data-snapping],._LauncherLogo_13oam_308[data-entering] img[data-loaded],._Widget_13oam_1[data-tucked] ._Shell_13oam_82,._Widget_13oam_1[data-peek-phase] ._Shell_13oam_82,._Widget_13oam_1[data-quiet-tuck] ._Shell_13oam_82,._ShellControls_13oam_114,._Widget_13oam_1[data-tucked] ._ShellControls_13oam_114,._Composer_13oam_340,._Launcher_13oam_124,._Launcher_13oam_124:before,._Shell_13oam_82,._ShellLayout_13oam_235,._Shell_13oam_82:before,._Shell_13oam_82:after,._Panel_13oam_191 ._LauncherDismissButton_13oam_406[data-variant][data-color],._Textarea_13oam_352{transition:none;animation:none}}@media (hover:hover){._Shell_13oam_82:hover{--widget-border:var(--widget-border-highlight)}}@media (prefers-color-scheme:dark){._Widget_13oam_1{--button-ring-color:#fff;--widget-surface:#282828c2;--widget-surface-highlight:#383838c2;--widget-text:#f5f5f5;--widget-text-secondary:#d0d0d0;--widget-placeholder:#aaa;--widget-border:#ffffff24;--widget-border-highlight:#ffffff38;--widget-control-hover:#ffffff1a;--widget-control-active:#ffffff29;--widget-shadow:#0000004d}._LauncherLogo_13oam_308{filter:invert()}}@media (max-width:520px){._Textarea_13oam_352{font-size:16px}._Panel_13oam_191{--widget-panel-width:calc(100vw - 32px)}}._Widget_1lfcb_1{--safe-top:env(safe-area-inset-top,0px);--safe-right:env(safe-area-inset-right,0px);--safe-bottom:env(safe-area-inset-bottom,0px);--safe-left:env(safe-area-inset-left,0px);pointer-events:auto;width:max-content;max-width:calc(100vw - 32px);height:52px}._Widget_1lfcb_1[data-mobile-widget-menu-open]{pointer-events:none}._Widget_1lfcb_1[data-mobile-widget-snapping]{transition:left var(--widget-snap-duration) cubic-bezier(.2, .8, .2, 1), top var(--widget-snap-duration) cubic-bezier(.2, .8, .2, 1)}@media (prefers-reduced-motion:reduce){._Widget_1lfcb_1[data-mobile-widget-snapping]{transition:none}}._Launcher_1lfcb_27,._Action_1lfcb_28,._EditAction_1lfcb_29,._MoreAction_1lfcb_30{-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}._Launcher_1lfcb_27:before,._Menu_1lfcb_39:before{border:1px solid var(--widget-border);-webkit-backdrop-filter:blur(18px)saturate(1.25);backdrop-filter:blur(18px)saturate(1.25);background:var(--widget-surface);box-shadow:0 4px 20px var(--widget-shadow);color:var(--widget-text)}._Launcher_1lfcb_27{cursor:grab;isolation:isolate;touch-action:none;border-radius:26px;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;height:52px;padding:4px;transition:opacity .14s .11s;display:grid;position:relative}._Launcher_1lfcb_27:before{z-index:-1;border-radius:inherit;content:\"\";pointer-events:none;transition:transform var(--press-duration,.24s) ease-out;position:absolute;inset:0}:where(._Widget_1lfcb_1[data-mobile-widget-pressed]) ._Launcher_1lfcb_27:before{--press-duration:.1s;transform:scale(.96)}:where(._Widget_1lfcb_1[data-mobile-widget-menu-open]) ._Launcher_1lfcb_27{opacity:0;pointer-events:none;transition-duration:80ms;transition-delay:0s}:where(._Widget_1lfcb_1[data-mobile-widget-menu-mounted]) ._Launcher_1lfcb_27:before{visibility:hidden}._Launcher_1lfcb_27 img{pointer-events:none;justify-self:center}@media (prefers-color-scheme:dark){._Launcher_1lfcb_27 img{filter:invert()}}:where(._Widget_1lfcb_1[data-mobile-widget-dragging]) ._Launcher_1lfcb_27{cursor:grabbing}@media (prefers-reduced-motion:reduce){._Launcher_1lfcb_27,._Launcher_1lfcb_27:before{transition:none}}._EditAction_1lfcb_29,._MoreAction_1lfcb_30{min-width:44px;height:44px;color:inherit;cursor:pointer;font:inherit;background:0 0;border:0;border-radius:22px;justify-content:center;align-items:center;padding:0;font-size:16px;line-height:20px;text-decoration:none;display:flex}._EditAction_1lfcb_29{overflow-wrap:anywhere;text-align:center;min-width:0;padding:0 8px}._MoreAction_1lfcb_30{color:var(--widget-text-tertiary)}._MoreAction_1lfcb_30 svg{width:24px;height:24px}._Menu_1lfcb_39{--surface-easing:cubic-bezier(.2, .8, .2, 1);--surface-duration:.25s;--surface-inset:var(--closed-top) var(--closed-right) var(--closed-bottom) var(--closed-left);--surface-radius:26px;z-index:2147483646;opacity:0;pointer-events:none;border-radius:24px;width:min(200px,100vw - 32px);max-width:calc(100vw - 32px);padding:0;display:block;position:relative}._Menu_1lfcb_39:focus{outline:none}._Menu_1lfcb_39:before{inset:var(--surface-inset);border-radius:var(--surface-radius);content:\"\";pointer-events:none;transition:inset var(--surface-duration) var(--surface-easing), border-radius var(--surface-duration) var(--surface-easing);position:absolute}._Menu_1lfcb_39[data-mobile-widget-positioned]{opacity:1;pointer-events:auto}._Menu_1lfcb_39[data-mobile-widget-positioned][data-state=open]{--surface-duration:.38s;--surface-inset:0px;--surface-radius:24px}._Menu_1lfcb_39[data-state=closed]{animation:_menu-exit_1lfcb_1 var(--surface-duration) both;pointer-events:none}@media (prefers-reduced-motion:reduce){._Menu_1lfcb_39[data-state=closed],._Menu_1lfcb_39:before{transition:none;animation:none}}._Actions_1lfcb_204{clip-path:inset(var(--surface-inset) round var(--surface-radius));opacity:0;transition:clip-path var(--surface-duration) var(--surface-easing), opacity 60ms ease;flex-direction:column;padding:8px;display:flex;position:relative}:where(._Menu_1lfcb_39[data-mobile-widget-positioned][data-state=open]) ._Actions_1lfcb_204{opacity:1;transition:clip-path var(--surface-duration) var(--surface-easing), opacity .18s ease 80ms}@media (prefers-reduced-motion:reduce){._Actions_1lfcb_204{transition:none}}@keyframes _menu-exit_1lfcb_1{0%,to{visibility:visible}}._Action_1lfcb_28{min-height:48px;color:inherit;cursor:pointer;font:inherit;overflow-wrap:anywhere;text-align:start;background:0 0;border:0;border-radius:20px;align-items:center;gap:12px;padding:10px 12px;font-size:16px;text-decoration:none;display:flex}._Action_1lfcb_28 svg{flex:none;width:20px;height:20px}._Action_1lfcb_28:active{background:var(--widget-control-active)}@media (hover:hover){._Action_1lfcb_28:hover{background:var(--widget-control-hover)}}._Action_1lfcb_28:focus-visible,._EditAction_1lfcb_29:focus-visible,._MoreAction_1lfcb_30:focus-visible{outline:2px solid var(--button-ring-color);outline-offset:2px}._Banner_1iivt_1,._Banner_1iivt_1 *,._Banner_1iivt_1 :before,._Banner_1iivt_1 :after{box-sizing:border-box}._Banner_1iivt_1{all:initial;box-sizing:border-box;color:#171717;--lightningcss-light:initial;--lightningcss-dark: ;color-scheme:light;pointer-events:auto;z-index:2147483647;background:#fff;border-radius:24px;align-items:center;width:min(640px,100vw - 48px);min-height:68px;padding:12px 14px 12px 20px;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;display:flex;position:fixed;top:24px;left:50%;transform:translate(-50%);box-shadow:0 0 0 1px #0d0d0d1a,0 10px 15px -3px #0000001a,0 4px 6px -4px #0000001a}._Content_1iivt_34{flex:1;justify-content:space-between;align-items:center;min-width:0;display:flex}._Message_1iivt_42{overflow-wrap:break-word;flex:1;min-width:0;font-size:14px;line-height:1.5}._OwnerName_1iivt_50{font-weight:600}._Actions_1iivt_54{flex:none;align-items:center;gap:8px;margin-left:16px;display:flex}._EditLink_1iivt_62,._DismissButton_1iivt_63{--scale:.985;font:inherit;isolation:isolate;border:0;justify-content:center;align-items:center;transition:color .15s;display:inline-flex;position:relative}._EditLink_1iivt_62:before,._DismissButton_1iivt_63:before{border-radius:inherit;content:\"\";will-change:transform;z-index:-1;transition:background-color .15s,opacity .15s,transform .15s;position:absolute;inset:0}._EditLink_1iivt_62{color:#fff;white-space:nowrap;background:0 0;border-radius:9999px;flex:none;gap:6px;min-height:36px;padding:0 16px;font-size:13px;font-weight:400;text-decoration:none}._EditLink_1iivt_62 svg{width:18px;height:18px}._EditLink_1iivt_62:before{background:#171717}._EditLink_1iivt_62:hover:before{background:#2f2f2f}._EditLink_1iivt_62:active:before{transform:scale(var(--scale));background:#3a3a3a}._EditLink_1iivt_62:focus-visible,._DismissButton_1iivt_63:focus-visible{outline-offset:2px;outline:2px solid #0d6efd}._DismissButton_1iivt_63{color:#5f5f5f;cursor:pointer;background:0 0;border-radius:9999px;flex:none;width:36px;height:36px;padding:0;font-size:20px}._DismissButton_1iivt_63:before{opacity:0;transform:scale(var(--scale));background:#f2f2f2}._DismissButton_1iivt_63:hover{color:#171717}._DismissButton_1iivt_63:hover:before{opacity:1;transform:scale(1)}._DismissButton_1iivt_63:active:before{opacity:1;transform:scale(var(--scale));background:#e8e8e8}@media (prefers-reduced-motion:reduce){._EditLink_1iivt_62,._EditLink_1iivt_62:before,._DismissButton_1iivt_63,._DismissButton_1iivt_63:before{transition:none}}@media (max-width:520px){._Banner_1iivt_1{width:calc(100vw - 24px);padding:14px 16px 16px 20px;top:12px}._Content_1iivt_34{flex-wrap:wrap;gap:12px}._Message_1iivt_42{flex-basis:calc(100% - 48px)}._Actions_1iivt_54{display:contents}._EditLink_1iivt_62{order:2}._DismissButton_1iivt_63{order:1;align-self:flex-start}}\n/*$vite$:1*/";
      const g = document.createElement("div");
      g.className = tn.Theme;
      const v = document.createElement("div");
      v.className = an(tn.Theme, tn.Portal), v.lang = f, v.dir = el(f), d.append(h, p, g, v);
      const b = await GR(f);
      if (r.isConnected) {
        if (typeof r.showPopover == "function") {
          r.popover = "manual";
          try {
            r.showPopover(), r.matches(":popover-open") || r.removeAttribute("popover");
          } catch {
            r.removeAttribute("popover");
          }
        }
        await new Promise((E, S) => {
          o = (0, ZR.createRoot)(g, { onUncaughtError: S }), o.render(/* @__PURE__ */ (0, D.jsx)(ZE, {
            locale: f,
            defaultLocale: qr,
            messages: b,
            onError: (O) => {
              if (O.code !== "MISSING_TRANSLATION") throw O;
            },
            children: /* @__PURE__ */ (0, D.jsxs)(O3, {
              container: v,
              children: [a({
                shadowHost: r,
                onDismiss: u
              }), /* @__PURE__ */ (0, D.jsx)(PR, { onMount: E })]
            })
          }));
        });
      }
    })(),
    dispose: u
  };
}
function aM(t) {
  if (t.kind === "preview-annotations") return;
  try {
    if (window.self !== window.top) return;
  } catch {
    return;
  }
  if (c_(navigator.userAgent)) return;
  if (Hf()) {
    if (t.mobileEnabled !== !0) return;
    t = {
      ...t,
      kind: "editor-composer"
    };
  }
  const a = t.projectTitle?.trim() || document.title.trim() || window.location.hostname;
  FA().then((r) => {
    const o = XR(t, ({ onDismiss: u }) => t.kind === "editor-composer" ? /* @__PURE__ */ (0, D.jsx)(AR, {
      accountId: t.accountId,
      chatgptOrigin: t.chatgptOrigin,
      projectId: t.projectId,
      siteTitle: a,
      config: r
    }) : /* @__PURE__ */ (0, D.jsx)(HR, {
      accountId: t.accountId,
      chatgptOrigin: t.chatgptOrigin,
      ownerName: t.ownerName,
      projectId: t.projectId,
      siteTitle: a,
      editContext: r.edit_context,
      onDismiss: u
    }));
    o.ready.catch(o.dispose);
  }).catch(() => {
  });
}
export {
  aM as mountSiteWidget
};
