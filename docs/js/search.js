/* 検索・比較・お気に入り・履歴の純粋関数（ブラウザ／Node 両対応 UMD） */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HSSearch = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CATS = {
    light: { label: '照明・光源', perfLabel: '光束', unit: 'lm' },
    cool: { label: '冷却', perfLabel: '風量', unit: 'm³/min' },
    damp: { label: '防振', perfLabel: '耐荷重', unit: 'kg' },
    move: { label: '搬送', perfLabel: '搬送荷重', unit: 'kg' }
  };

  function norm(s) {
    return String(s == null ? '' : s).toUpperCase().replace(/[\s\-_]/g, '');
  }
  function num(v) {
    if (v === '' || v === null || v === undefined) return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function inRange(val, r) {
    if (!r) return true;
    var min = num(r.min), max = num(r.max);
    if (min !== null && !(val >= min)) return false;
    if (max !== null && !(val <= max)) return false;
    return true;
  }

  /* q: {cat, uses[], keywords, part, w:{min,max}, h, d, perf:{min,max}, needHigh, needLow} */
  function filterProducts(products, q) {
    q = q || {};
    var tokens = String(q.keywords || '').toLowerCase().split(/[\s、,]+/).filter(Boolean);
    var part = norm(q.part);
    var uses = q.uses || [];
    var needHigh = num(q.needHigh), needLow = num(q.needLow);
    return (products || []).filter(function (p) {
      if (q.cat && p.cat !== q.cat) return false;
      if (uses.length && !(p.uses || []).some(function (u) { return uses.indexOf(u) >= 0; })) return false;
      if (part && norm(p.part).indexOf(part) !== 0) return false;
      if (tokens.length) {
        var hay = [p.part, p.name, p.desc, (p.troubles || []).join(' '), (p.uses || []).join(' ')].join(' ').toLowerCase();
        for (var i = 0; i < tokens.length; i++) if (hay.indexOf(tokens[i]) < 0) return false;
      }
      if (!inRange(p.w, q.w) || !inRange(p.h, q.h) || !inRange(p.d, q.d)) return false;
      if (q.perf && (num(q.perf.min) !== null || num(q.perf.max) !== null)) {
        if (!q.cat) return false;
        if (!inRange(p.perf, q.perf)) return false;
      }
      if (needHigh !== null && !(p.tmax >= needHigh)) return false;
      if (needLow !== null && !(p.tmin <= needLow)) return false;
      return true;
    });
  }

  function volume(p) { return p.w * p.h * p.d; }
  function sortProducts(products, key) {
    var arr = (products || []).slice();
    var cmp = {
      part: function (a, b) { return a.part < b.part ? -1 : a.part > b.part ? 1 : 0; },
      perfDesc: function (a, b) { return b.perf - a.perf || (a.part < b.part ? -1 : 1); },
      perfAsc: function (a, b) { return a.perf - b.perf || (a.part < b.part ? -1 : 1); },
      sizeAsc: function (a, b) { return volume(a) - volume(b) || (a.part < b.part ? -1 : 1); },
      priceAsc: function (a, b) { return a.price - b.price || (a.part < b.part ? -1 : 1); }
    }[key] || null;
    if (!cmp) cmp = function () { return 0; };
    return arr.sort(cmp);
  }

  /* 比較：最大 max 件。戻り値 {list, added, full} */
  function toggleCompare(list, id, max) {
    max = max || 3;
    list = (list || []).slice();
    var i = list.indexOf(id);
    if (i >= 0) { list.splice(i, 1); return { list: list, added: false, full: false }; }
    if (list.length >= max) return { list: list, added: false, full: true };
    list.push(id);
    return { list: list, added: true, full: false };
  }
  function compareRows(products) {
    var rows = [];
    function row(label, fn) { rows.push({ label: label, values: products.map(fn) }); }
    row('名称', function (p) { return p.name; });
    row('種類', function (p) { return (CATS[p.cat] || {}).label || p.cat; });
    row('寸法 W×H×D (mm)', function (p) { return p.w + ' × ' + p.h + ' × ' + p.d; });
    row('主な性能', function (p) { var c = CATS[p.cat] || {}; return (c.perfLabel || '性能') + ' ' + p.perf + ' ' + (c.unit || ''); });
    row('使用温度 (℃)', function (p) { return p.tmin + ' 〜 ' + p.tmax; });
    row('質量 (kg)', function (p) { return String(p.weight); });
    row('参考価格 (税抜)', function (p) { return p.price.toLocaleString ? p.price.toLocaleString('ja-JP') + ' 円' : p.price + ' 円'; });
    row('用途', function (p) { return (p.uses || []).join('、'); });
    return rows;
  }

  /* 閲覧履歴：先頭が最新・重複除去・最大 cap 件 */
  function addHistory(list, id, cap) {
    cap = cap || 10;
    var out = (list || []).filter(function (x) { return x !== id; });
    out.unshift(id);
    return out.slice(0, cap);
  }
  function toggleFavorite(list, id) {
    list = (list || []).slice();
    var i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    return list;
  }
  function removeId(list, id) {
    return (list || []).filter(function (x) { return x !== id; });
  }

  /* 管理画面・インポート用の検証。エラー文字列の配列を返す */
  function validateProduct(p) {
    var errs = [];
    if (!p || typeof p !== 'object') return ['データが不正です'];
    if (!p.part || typeof p.part !== 'string') errs.push('品番が必要です');
    if (!p.name) errs.push('名称が必要です');
    if (!CATS[p.cat]) errs.push('種類が不正です');
    ['w', 'h', 'd', 'perf', 'tmin', 'tmax', 'weight', 'price'].forEach(function (k) {
      if (typeof p[k] !== 'number' || !isFinite(p[k])) errs.push(k + ' は数値で入力してください');
    });
    return errs;
  }

  return {
    CATS: CATS, filterProducts: filterProducts, sortProducts: sortProducts,
    toggleCompare: toggleCompare, compareRows: compareRows,
    addHistory: addHistory, toggleFavorite: toggleFavorite, removeId: removeId,
    validateProduct: validateProduct, norm: norm
  };
});
