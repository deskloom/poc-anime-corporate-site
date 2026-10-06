/* 奥行きのあるシーン背景（すべて自作SVG）。遠景・中景・近景を別レイヤーにして速度差で動かす */
(function () {
  'use strict';
  var HS = window.HS;
  function rng(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function f(n) { return n.toFixed(0); }
  function svg(inner, par, defs) {
    return '<svg viewBox="0 0 1600 900" preserveAspectRatio="' + (par || 'xMidYMax slice') + '" aria-hidden="true" focusable="false">' + (defs ? '<defs>' + defs + '</defs>' : '') + inner + '</svg>';
  }
  function ridge(r, base, amp, n, fill, op) {
    var d = 'M-100 900 L-100 ' + f(base), st = 1800 / n;
    for (var i = 0; i <= n; i++) d += ' L' + f(-100 + i * st) + ' ' + f(base - r() * amp);
    return '<path d="' + d + ' L1700 900Z" fill="' + fill + '" opacity="' + (op || 1) + '"/>';
  }
  function dots(r, n, y0, y1, c, rmax) {
    var o = '';
    for (var i = 0; i < n; i++) o += '<circle cx="' + f(r() * 1600) + '" cy="' + f(y0 + r() * (y1 - y0)) + '" r="' + (0.8 + r() * rmax).toFixed(1) + '" fill="' + c + '" opacity="' + (0.4 + r() * 0.6).toFixed(2) + '"/>';
    return o;
  }
  function blades(r, n, h, fill, base) {
    var o = '';
    for (var i = 0; i < n; i++) {
      var x = r() * 1700 - 50, hh = h * (0.35 + r() * 0.65), w = 8 + r() * 12, l = (r() - 0.5) * 70, b = base || 900;
      o += 'M' + f(x) + ' ' + b + ' Q' + f(x + l * 0.4) + ' ' + f(b - hh * 0.6) + ' ' + f(x + l) + ' ' + f(b - hh) + ' Q' + f(x + l * 0.4 + w) + ' ' + f(b - hh * 0.5) + ' ' + f(x + w) + ' ' + b + 'Z';
    }
    return '<path d="' + o + '" fill="' + fill + '"/>';
  }
  function lantern(x, y, s, col, glow) {
    return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(s * 3.2) + '" fill="url(#' + glow + ')"/>' +
      '<line x1="' + f(x) + '" y1="' + f(y - s * 1.8) + '" x2="' + f(x) + '" y2="' + f(y - s) + '" stroke="' + col + '" stroke-width="1.5"/>' +
      '<rect x="' + f(x - s * 0.8) + '" y="' + f(y - s) + '" width="' + f(s * 1.6) + '" height="' + f(s * 2) + '" rx="' + f(s * 0.7) + '" fill="' + col + '"/>';
  }
  function glowDef(id, c) { return '<radialGradient id="' + id + '"><stop offset="0" stop-color="' + c + '" stop-opacity=".75"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></radialGradient>'; }

  /* ---- キービジュアル（共通の世界：遠くの灯りの街・浮島・草むら） ---- */
  var KV = [
    { s: 0.55, r: 0.0, svg: function () {
      var r = rng(7);
      return svg('<circle cx="1180" cy="330" r="150" fill="url(#kg0)"/>' + ridge(r, 600, 180, 30, 'rgba(24,18,70,.75)') + dots(r, 70, 520, 640, '#ffd98a', 1.8) + ridge(r, 700, 120, 36, 'rgba(14,10,48,.88)'), 'xMidYMax slice', glowDef('kg0', '#ffe9b0'));
    } },
    { s: 0.28, r: 0.0, svg: function () {
      var r = rng(21), o = '<polygon points="560,0 700,0 980,900 380,900" fill="url(#kg1)"/>';
      [[300, 360, 90], [900, 250, 120], [1250, 470, 70]].forEach(function (p) {
        o += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="' + p[2] + '" ry="' + f(p[2] * 0.2) + '" fill="#1b1648"/>' +
          '<path d="M' + (p[0] - p[2]) + ' ' + p[1] + ' Q' + p[0] + ' ' + (p[1] + p[2] * 1.1) + ' ' + (p[0] + p[2]) + ' ' + p[1] + 'Z" fill="#120e38"/>' +
          lantern(p[0] + p[2] * 0.3, p[1] + 50, 9, '#ffcf6b', 'kl');
      });
      for (var i = 0; i < 12; i++) o += lantern(r() * 1600, 150 + r() * 600, 5 + r() * 7, '#ffd98a', 'kl');
      return svg(o, 'xMidYMid slice', glowDef('kl', '#ffcf6b') + '<linearGradient id="kg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0c0" stop-opacity=".28"/><stop offset="1" stop-color="#fff0c0" stop-opacity="0"/></linearGradient>');
    } },
    { s: 0.0, r: -0.12, svg: function () {
      var r = rng(33);
      return svg(blades(r, 90, 230, '#07061c') + blades(r, 40, 330, '#05041a') +
        '<path d="M1600 120 Q1450 150 1330 250 M1450 170 Q1380 150 1330 120" stroke="#05041a" stroke-width="10" fill="none" stroke-linecap="round"/>');
    } }
  ];

  /* ---- ストーリー4場面 ---- */
  var ST = [
    /* 0 光をつくる：夕暮れのあかりの海 */
    [{ s: 0.04, v: 0.3, svg: function () {
      var r = rng(5);
      return svg('<circle cx="1000" cy="520" r="260" fill="url(#a0)"/>' + ridge(r, 590, 150, 34, '#3a2060') + dots(r, 90, 500, 620, '#ffd98a', 1.6) + ridge(r, 680, 90, 40, '#26164a'), 'xMidYMax slice', glowDef('a0', '#ffb070'));
    } }, { s: 0.1, v: 0.5, svg: function () {
      var r = rng(11), o = '';
      for (var i = 0; i < 34; i++) o += lantern(r() * 1600, 330 + r() * 480, 7 + r() * 16, i % 3 ? '#ffb45a' : '#ffe08a', 'a1');
      return svg(o, 'xMidYMax slice', glowDef('a1', '#ffb45a'));
    } }, { s: 0.2, v: 0.8, svg: function () {
      var r = rng(15); return svg(blades(r, 110, 200, '#0c0722') + blades(r, 40, 300, '#080519'));
    } }],
    /* 1 熱を逃がす：深い青の洞窟と冷たい風のリボン */
    [{ s: 0.04, v: 0.3, svg: function () {
      var r = rng(3), o = '';
      for (var i = 0; i < 26; i++) { var x = i * 64 + r() * 40, h = 90 + r() * 300; o += '<polygon points="' + f(x) + ',0 ' + f(x + 50 + r() * 30) + ',0 ' + f(x + 30) + ',' + f(h) + '" fill="#061330"/>'; }
      for (i = 0; i < 20; i++) { x = i * 84 + r() * 50; h = 60 + r() * 200; o += '<polygon points="' + f(x) + ',900 ' + f(x + 70) + ',900 ' + f(x + 35) + ',' + f(900 - h) + '" fill="#071a3a"/>'; }
      return svg(o, 'xMidYMid slice');
    } }, { s: 0.12, v: 0.5, svg: function () {
      var o = '<polygon points="300,0 420,0 760,900 420,900" fill="url(#b0)"/><polygon points="1000,0 1080,0 1300,900 1030,900" fill="url(#b0)"/>', i;
      for (i = 0; i < 7; i++) {
        var y = 760 - i * 90, a = 40 + (i % 3) * 25;
        o += '<path class="rib' + (i % 2 ? ' r2' : '') + '" d="M-50 ' + y + ' C300 ' + (y - a * 2) + ' 500 ' + (y + a) + ' 800 ' + (y - a) + ' S1300 ' + (y - a * 2.4) + ' 1700 ' + (y - a * 3) + '" fill="none" stroke="url(#b1)" stroke-width="' + (3 + (i % 4) * 2.5) + '" stroke-linecap="round" opacity="' + (0.35 + (i % 3) * 0.2) + '"/>';
      }
      return svg(o, 'xMidYMid slice', '<linearGradient id="b0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8f0ff" stop-opacity=".28"/><stop offset="1" stop-color="#a8f0ff" stop-opacity="0"/></linearGradient><linearGradient id="b1"><stop offset="0" stop-color="#7fe0d4" stop-opacity="0"/><stop offset=".5" stop-color="#d9fbff"/><stop offset="1" stop-color="#7fe0d4" stop-opacity="0"/></linearGradient>');
    } }, { s: 0.2, v: 0.8, svg: function () {
      return svg('<path d="M-50 900 L-50 420 Q120 380 200 520 Q300 700 420 900Z" fill="#030a1a"/><path d="M1650 900 L1650 360 Q1470 420 1380 560 Q1290 720 1180 900Z" fill="#030a1a"/><path d="M-50 0 L-50 200 Q150 160 260 0Z" fill="#030a1a"/><path d="M1650 0 L1650 160 Q1450 120 1350 0Z" fill="#030a1a"/>');
    } }],
    /* 2 揺れを鎮める：星を映す静かな湖（波紋はスクロールで収まる） */
    [{ s: 0.03, v: 0.2, svg: function () {
      var r = rng(9);
      return svg(dots(r, 110, 30, 540, '#fff', 1.7) + '<circle cx="1230" cy="200" r="120" fill="url(#c0)"/><circle cx="1230" cy="200" r="38" fill="#fdf2ff"/>' + ridge(r, 560, 170, 28, '#1d1348'), 'xMidYMax slice', glowDef('c0', '#f0c8ff'));
    } }, { s: 0.08, v: 0.35, svg: function () {
      var r = rng(9), o = '<rect x="-100" y="560" width="1800" height="400" fill="url(#c1)"/><g opacity=".5">', i;
      for (i = 0; i < 70; i++) o += '<circle cx="' + f(r() * 1600) + '" cy="' + f(570 + r() * 300) + '" r="' + (0.8 + r() * 1.6).toFixed(1) + '" fill="#fff"/>';
      o += '</g><g id="ripples" class="ripples" style="transform-box:fill-box;transform-origin:50% 50%">';
      for (i = 1; i <= 5; i++) o += '<ellipse cx="800" cy="740" rx="' + (i * 110) + '" ry="' + (i * 22) + '" fill="none" stroke="#f0e0ff" stroke-width="2" opacity="' + (0.6 - i * 0.08).toFixed(2) + '"/>';
      return svg(o + '</g>', 'xMidYMax slice', '<linearGradient id="c1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1c70"/><stop offset="1" stop-color="#120a38"/></linearGradient>');
    } }, { s: 0.2, v: 0.8, svg: function () {
      var r = rng(19); return svg(blades(r, 70, 380, '#08041c') + blades(r, 50, 200, '#060318'));
    } }],
    /* 3 届ける：地平線へ続く光の道 */
    [{ s: 0.03, v: 0.2, svg: function () {
      var r = rng(4), o = dots(r, 80, 20, 500, '#ffe7c8', 1.4) + '<ellipse cx="800" cy="560" rx="520" ry="150" fill="url(#d0)"/>';
      for (var i = 0; i < 40; i++) { var x = i * 42 + r() * 20, h = 20 + r() * 70; o += '<rect x="' + f(x) + '" y="' + f(560 - h) + '" width="' + f(18 + r() * 20) + '" height="' + f(h) + '" fill="#2a1646"/>'; if (r() > 0.5) o += '<rect x="' + f(x + 5) + '" y="' + f(560 - h + 8) + '" width="4" height="4" fill="#ffd98a"/>'; }
      return svg(o, 'xMidYMax slice', glowDef('d0', '#ff9a6b'));
    } }, { s: 0.1, v: 0.4, svg: function () {
      var o = '<rect x="-100" y="560" width="1800" height="400" fill="#150d34"/><polygon points="720,560 880,560 1560,900 40,900" fill="#241648"/><line class="road-dash" x1="800" y1="565" x2="800" y2="900" stroke="#ffd98a" stroke-width="5" opacity=".7"/>';
      for (var k = 1; k <= 13; k++) {
        var t = Math.pow(k / 13, 1.8), y = 560 + 340 * t, dx = 90 + 700 * t, rr = 2 + 9 * t;
        [-1, 1].forEach(function (sg) { o += '<circle cx="' + f(800 + sg * dx) + '" cy="' + f(y) + '" r="' + f(rr * 4) + '" fill="url(#d1)"/><circle cx="' + f(800 + sg * dx) + '" cy="' + f(y) + '" r="' + rr.toFixed(1) + '" fill="#fff0c0"/>'; });
      }
      return svg(o, 'xMidYMax slice', glowDef('d1', '#ffb070'));
    } }, { s: 0.2, v: 0.8, svg: function () {
      var o = '';
      [[90, 520], [1510, 470]].forEach(function (p) { o += '<rect x="' + (p[0] - 8) + '" y="' + p[1] + '" width="16" height="' + (900 - p[1]) + '" fill="#07031a"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="26" fill="#ffe3a8"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="90" fill="url(#d2)"/>'; });
      return svg(o, 'xMidYMax slice', glowDef('d2', '#ffcf8a'));
    } }]
  ];

  function mk(def, extra) {
    var d = document.createElement('div'); d.className = 'ly';
    d.dataset.s = def.s; d.dataset.v = def.v || 0;
    var pad = (def.s / 2 + 0.01) * 100;
    d.style.cssText = 'left:-' + pad + '%;right:-' + pad + '%;top:-6%;bottom:-6%;' + (extra || '');
    d.innerHTML = def.svg();
    return d;
  }
  function fog() { var d = document.createElement('div'); d.className = 'fog'; return d; }

  HS.buildWorlds = function (kvWorld, stageBgs) {
    KV.forEach(function (def, i) {
      var d = mk({ s: 0, v: 0, svg: def.svg });
      d.style.cssText = 'inset:0'; d.dataset.kv = def.s; d.dataset.up = def.r;
      kvWorld.appendChild(d);
      if (i === 1) kvWorld.appendChild(fog());
    });
    stageBgs.forEach(function (bg, i) {
      ST[i].forEach(function (def, j) { bg.appendChild(mk(def)); if (j === 1) bg.appendChild(fog()); });
    });
  };
})();
