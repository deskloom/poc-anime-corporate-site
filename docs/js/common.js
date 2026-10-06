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

  function star(cx, cy, R, r) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R;
      pts.push((cx + rad * Math.cos(a)).toFixed(1) + ',' + (cy + rad * Math.sin(a)).toFixed(1));
    }
    return pts.join(' ');
  }

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

  HS.initChrome = chrome;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', chrome); else chrome();
})();
