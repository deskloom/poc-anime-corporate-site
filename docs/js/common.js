/* 共通：ヘッダー/フッター、ストレージ、データ読み込み、ともり(SVG)、サウンド、粒子 */
(function () {
  'use strict';
  var HS = (window.HS = {});
  var S = window.HSSearch;

  HS.reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  HS.ls = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 保存不可でも動作継続 */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* noop */ } }
  };
  HS.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  HS.yen = function (n) { return Number(n).toLocaleString('ja-JP') + ' 円'; };

  /* データ：同梱JSON。管理画面の localStorage があればそちらを優先 */
  HS.loadData = function () {
    function j(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
    return Promise.all([j('data/products.json'), j('data/news.json')]).then(function (a) {
      var po = HS.ls.get('hs_products_override', null);
      var no = HS.ls.get('hs_news_override', null);
      return {
        products: Array.isArray(po) ? po : a[0],
        news: Array.isArray(no) ? no : a[1],
        defaults: { products: a[0], news: a[1] },
        overridden: { products: Array.isArray(po), news: Array.isArray(no) }
      };
    });
  };
  HS.specRows = function (p) {
    var c = S.CATS[p.cat] || {};
    var rows = [
      ['品番', p.part], ['名称', p.name], ['種類', c.label || p.cat],
      ['用途', (p.uses || []).join('、')],
      ['寸法 W×H×D', p.w + ' × ' + p.h + ' × ' + p.d + ' mm'],
      [c.perfLabel || '性能', p.perf + ' ' + (c.unit || '')],
      ['使用温度', p.tmin + ' 〜 ' + p.tmax + ' ℃'],
      ['質量', p.weight + ' kg']
    ];
    (p.extra || []).forEach(function (e) { rows.push([e[0], e[1]]); });
    rows.push(['参考価格（税抜）', HS.yen(p.price)]);
    return rows;
  };
  HS.download = function (name, mime, text, bom) {
    var blob = new Blob([bom ? '﻿' + text : text], { type: mime + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* ともり：星のあかりの精霊（オリジナル）。表情は data-expr で切替 */
  function star(cx, cy, R, r) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R;
      pts.push((cx + rad * Math.cos(a)).toFixed(1) + ',' + (cy + rad * Math.sin(a)).toFixed(1));
    }
    return pts.join(' ');
  }
  var uid = 0;
  HS.tomori = function (expr) {
    var id = 'tg' + (uid++);
    return '<svg class="tomori" data-expr="' + (expr || 'normal') + '" viewBox="0 0 200 250" aria-hidden="true" focusable="false">' +
      '<defs><radialGradient id="' + id + 'h"><stop offset="0.3" style="stop-color:var(--halo)" stop-opacity="0.55"/><stop offset="0.65" style="stop-color:var(--halo)" stop-opacity="0.18"/><stop offset="1" style="stop-color:var(--halo)" stop-opacity="0"/></radialGradient><radialGradient id="' + id + 'b" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="#fffbe6"/><stop offset="0.75" stop-color="#ffd36b" stop-opacity="0.96"/><stop offset="1" stop-color="#ffc857" stop-opacity="0.62"/></radialGradient></defs>' +
      '<circle class="halo" cx="100" cy="135" r="128" fill="url(#' + id + 'h)"/>' +
      '<line x1="100" y1="58" x2="100" y2="76" stroke="#e6a92c" stroke-width="3"/>' +
      '<polygon points="' + star(100, 40, 26, 11) + '" fill="#ffe08a" stroke="#e6a92c" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<ellipse class="arm arm-l" cx="46" cy="140" rx="11" ry="26" fill="#ffd36b" stroke="#e6a92c" stroke-width="2"/>' +
      '<ellipse class="arm arm-r" cx="154" cy="140" rx="11" ry="26" fill="#ffd36b" stroke="#e6a92c" stroke-width="2"/>' +
      '<path d="M100 74 C150 74 160 120 156 150 C152 192 128 208 100 208 C72 208 48 192 44 150 C40 120 50 74 100 74Z" fill="url(#' + id + 'b)" stroke="#ffe08a" stroke-opacity="0.65" stroke-width="3"/>' +
      '<path d="M62 100 Q100 90 138 100 M54 135 Q100 125 146 135 M60 172 Q100 182 140 172" fill="none" stroke="#e6a92c" stroke-opacity=".45" stroke-width="2"/>' +
      '<ellipse cx="86" cy="214" rx="14" ry="7" fill="#e6a92c"/><ellipse cx="114" cy="214" rx="14" ry="7" fill="#e6a92c"/>' +
      '<g class="f-normal"><ellipse cx="80" cy="140" rx="7" ry="10" fill="#2a1f55"/><ellipse cx="120" cy="140" rx="7" ry="10" fill="#2a1f55"/><circle cx="82" cy="136" r="2.6" fill="#fff"/><circle cx="122" cy="136" r="2.6" fill="#fff"/><path d="M92 162 Q100 169 108 162" fill="none" stroke="#2a1f55" stroke-width="3" stroke-linecap="round"/></g>' +
      '<g class="f-smile"><path d="M72 142 Q80 130 88 142 M112 142 Q120 130 128 142" fill="none" stroke="#2a1f55" stroke-width="4" stroke-linecap="round"/><path d="M88 160 Q100 176 112 160Z" fill="#c2415a"/></g>' +
      '<g class="f-wow"><circle cx="80" cy="140" r="10" fill="#2a1f55"/><circle cx="120" cy="140" r="10" fill="#2a1f55"/><circle cx="83" cy="136" r="3.5" fill="#fff"/><circle cx="123" cy="136" r="3.5" fill="#fff"/><ellipse cx="100" cy="168" rx="6" ry="8" fill="#c2415a"/></g>' +
      '<circle cx="64" cy="158" r="8" fill="#ff9aa8" opacity=".55"/><circle cx="136" cy="158" r="8" fill="#ff9aa8" opacity=".55"/>' +
      '<g class="orbit o1"><circle cx="100" cy="13" r="4" fill="#fff6d6"/></g><g class="orbit o2"><circle cx="100" cy="270" r="3" fill="#fff6d6"/></g><g class="orbit o3"><circle cx="-6" cy="135" r="2.5" fill="#fff6d6"/></g>' +
      '</svg>';
  };
  HS.setExpr = function (el, expr) { var s = el && el.querySelector('.tomori'); if (s) s.setAttribute('data-expr', expr); };

  /* ヘッダー・フッター */
  var NAV = [
    ['はじめに', 'index.html#top', 'home'], ['事業', 'index.html#business', ''],
    ['製品を探す', 'products.html', 'products'], ['技術', 'index.html#tech', ''],
    ['資料', 'index.html#docs', ''], ['お問い合わせ', 'contact.html', 'contact']
  ];
  var LOGO = '<svg viewBox="0 0 40 40" aria-hidden="true"><polygon points="' + star(20, 20, 18, 7.5) + '" fill="#ffc857"/><circle cx="20" cy="20" r="4" fill="#0a0f2e"/></svg>';
  function chrome() {
    var page = document.body.getAttribute('data-page') || '';
    var skips = '<a class="skip" href="#main">本文へ移動</a><a class="skip" href="products.html" style="left:130px">製品検索へ移動</a>';
    var nav = NAV.map(function (n) {
      return '<li><a href="' + n[1] + '"' + (n[2] && n[2] === page ? ' aria-current="page"' : '') + '>' + n[0] + '</a></li>';
    }).join('');
    var hdr = '<header class="site-header"><div class="hdr-in">' +
      '<a class="logo" href="index.html" aria-label="ほしあかり精機 トップへ">' + LOGO + '<span>ほしあかり精機</span></a>' +
      '<nav id="gnav" class="gnav" aria-label="メインメニュー"><ul>' + nav + '</ul></nav>' +
      '<div class="hdr-actions"><a class="btn btn-gold btn-find" href="products.html">製品を探す</a>' +
      '<button type="button" class="icon-btn" id="soundBtn" aria-pressed="false" aria-label="サウンド（初期設定はオフ）">♪<span class="snd-t"> 音 OFF</span></button>' +
      '<button type="button" class="icon-btn menu-btn" id="menuBtn" aria-expanded="false" aria-controls="gnav">メニュー</button></div></div></header>';
    document.body.insertAdjacentHTML('afterbegin', skips + hdr);
    document.body.insertAdjacentHTML('beforeend',
      '<footer class="site-footer"><div class="wrap"><ul><li><a href="index.html">トップ</a></li><li><a href="products.html">製品を探す</a></li><li><a href="contact.html">お問い合わせ</a></li><li><a href="admin.html">社内更新デモ</a></li></ul>' +
      '<p class="demo-note">架空の企業・製品による自主制作のデモです</p><p class="demo-note">© 株式会社ほしあかり精機（架空）</p></div></footer>');
    var mb = document.getElementById('menuBtn'), gn = document.getElementById('gnav');
    mb.addEventListener('click', function () {
      var o = gn.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false');
    });
    gn.addEventListener('click', function (e) { if (e.target.tagName === 'A') { gn.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { gn.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); } });
    sound();
  }

  /* サウンド：Web Audio でやわらかいパッドを合成（音声ファイルなし・初期オフ） */
  var ac = null, master = null, playing = false;
  function build() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0;
    var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800; lp.Q.value = 0.6;
    var lfo = ac.createOscillator(), lg = ac.createGain();
    lfo.frequency.value = 0.07; lg.gain.value = 300; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    [110, 164.81, 220, 277.18, 329.63].forEach(function (f, i) {
      [-3, 3].forEach(function (det) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = det;
        g.gain.value = 0.05; o.connect(g); g.connect(lp); o.start();
      });
    });
    lp.connect(master); master.connect(ac.destination);
    return true;
  }
  function audio(on) {
    if (on) {
      if (!ac && !build()) return false;
      ac.resume();
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.setTargetAtTime(0.5, ac.currentTime, 1.2);
    } else if (ac) {
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.setTargetAtTime(0, ac.currentTime, 0.3);
      setTimeout(function () { if (!playing && ac) ac.suspend(); }, 1500);
    }
    return true;
  }
  function sound() {
    var b = document.getElementById('soundBtn');
    function paint() {
      b.setAttribute('aria-pressed', playing ? 'true' : 'false');
      b.querySelector('.snd-t').textContent = playing ? ' 音 ON' : ' 音 OFF';
    }
    var pref = HS.ls.get('hs_sound', false) === true;
    if (pref) {
      // ブラウザは操作前の自動再生を禁じるため、最初の操作で開始する
      playing = true; paint();
      var kick = function () { audio(true); removeEventListener('pointerdown', kick); removeEventListener('keydown', kick); };
      addEventListener('pointerdown', kick); addEventListener('keydown', kick);
    }
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      playing = !playing;
      if (!audio(playing)) playing = false;
      HS.ls.set('hs_sound', playing); paint();
    });
  }

  /* 粒子レイヤー（canvas）。スクロールで奥行き差のあるパララックス */
  HS.dust = function (canvas) {
    var ctx = canvas.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5), P = [], raf = 0, vis = true;
    function size() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function init() {
      size();
      var n = W < 600 ? 36 : 80; P = [];
      for (var i = 0; i < n; i++) P.push({ x: Math.random() * W, y: Math.random() * H, r: 0.6 + Math.random() * 2.2, d: 0.2 + Math.random() * 0.8, vx: (Math.random() - 0.5) * 0.15, vy: -0.05 - Math.random() * 0.25, t: Math.random() * 6 });
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      var sy = HS.reduced ? 0 : window.scrollY;
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        if (!HS.reduced) { p.x += p.vx * p.d; p.y += p.vy * p.d; if (p.y < -5) p.y = H + 5; if (p.x < -5) p.x = W + 5; if (p.x > W + 5) p.x = -5; }
        var y = p.y - sy * p.d * 0.25; y = ((y % (H + 10)) + (H + 10)) % (H + 10) - 5;
        var a = 0.35 + 0.35 * Math.sin((t || 0) / 900 + p.t);
        ctx.beginPath(); ctx.fillStyle = 'rgba(255,226,150,' + a.toFixed(2) + ')';
        ctx.arc(p.x, y, p.r * p.d + 0.4, 0, 6.283); ctx.fill();
      }
    }
    function loop(t) { if (vis && !document.hidden) draw(t); raf = requestAnimationFrame(loop); }
    init(); draw(0);
    addEventListener('resize', function () { init(); draw(0); });
    if (HS.reduced) return;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(canvas);
    raf = requestAnimationFrame(loop);
  };

  /* セリフを一文字ずつ表示（動きを減らす設定では即時表示） */
  HS.typeText = function (el, text) {
    clearInterval(el._ty);
    if (HS.reduced) { el.textContent = text; return; }
    var i = 0; el.textContent = '';
    el._ty = setInterval(function () { i++; el.textContent = text.slice(0, i); if (i >= text.length) clearInterval(el._ty); }, 45);
  };

  HS.initChrome = chrome;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', chrome); else chrome();
})();
