/* トップページの進行役：オープニング、スクロール→シェーダー、字幕、粒子、進行インジケーター */
(function () {
  'use strict';
  var HS = window.HS, S = window.HSSearch;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var html = document.documentElement, body = document.body, reduced = HS.reduced;
  body.classList.add('home');
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* --- 文字を1文字ずつに分ける（見出しは aria-label で通常どおり読まれる） --- */
  function split(el) {
    var label = el.textContent.replace(/\s+/g, ''), i = 0, out = document.createDocumentFragment();
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        Array.from(n.textContent).forEach(function (ch) {
          var s = document.createElement('span'); s.className = 'ch'; s.setAttribute('aria-hidden', 'true');
          s.style.setProperty('--i', i++); s.textContent = ch; out.appendChild(s);
        });
      } else out.appendChild(n.cloneNode(true));
    });
    el.textContent = ''; el.appendChild(out); el.setAttribute('aria-label', label);
  }
  $$('.split').forEach(split);
  $('#h1').style.setProperty('--sd', '250ms');

  /* --- フィルムグレイン（小さなノイズタイル。CSSで約12fps相当にずらす） --- */
  (function () {
    var c = document.createElement('canvas'); c.width = c.height = 160;
    var x = c.getContext('2d'), im = x.createImageData(160, 160), d = im.data, k;
    for (k = 0; k < d.length; k += 4) { var v = 90 + Math.random() * 130; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; }
    x.putImageData(im, 0, 0);
    $('.grain').style.backgroundImage = 'url(' + c.toDataURL('image/png') + ')';
  })();

  /* --- オープニング --- */
  var op = $('#opening'), readyDone = false;
  function ready() {
    if (readyDone) return; readyDone = true;
    body.classList.add('ready'); $('#h1').classList.add('on'); startSubtitles();
  }
  if (html.classList.contains('skip-open') || reduced || !op) {
    if (op) op.remove();
    try { sessionStorage.setItem('hs_seen', '1'); } catch (e) { /* noop */ }
    ready();
  } else {
    op.classList.add('play');
    var done = false, tR = setTimeout(ready, 1750), tE = setTimeout(function () { end(false); }, 2450);
    var end = function (fast) {
      if (done) return; done = true; clearTimeout(tE);
      try { sessionStorage.setItem('hs_seen', '1'); } catch (e) { /* noop */ }
      if (fast) { clearTimeout(tR); op.classList.add('out', 'fast'); setTimeout(function () { op.remove(); }, 350); ready(); }
      else op.remove();
    };
    op.addEventListener('click', function () { end(true); });
    addEventListener('keydown', function () { end(true); }, { once: true });
  }

  /* --- ヒーローの字幕（ともりの言葉。吹き出しではなく映画の字幕として） --- */
  var LINES = ['こんばんは。今日も、あかりを灯そう。', '風はね、音もなく熱を運んでくれるの。', 'ゆれても大丈夫。そっと受けとめるよ。'];
  var sub = $('#sub'), si = 0, subT = null;
  function showLine() {
    sub.innerHTML = '<small>TOMORI</small>' + HS.esc(LINES[si % LINES.length]);
    sub.classList.add('in');
    if (reduced) return;
    subT = setTimeout(function () { sub.classList.remove('in'); subT = setTimeout(function () { si++; showLine(); }, 1100); }, 5200);
  }
  function startSubtitles() { setTimeout(showLine, reduced ? 0 : 2300); }

  /* --- WebGL背景・前景FX --- */
  var glCanvas = $('#gl'), fxCanvas = $('#fx'), fb = $('#fallback');
  var gl = /[?&]nogl/.test(location.search) ? null : HS.createGL(glCanvas);
  if (!gl) html.classList.add('no-gl');
  var fx = HS.createFX(fxCanvas);
  var story = $('#story'), caps = $$('.cap'), progBtns = $$('.prog button');
  function resize() { if (gl) gl.resize(Math.min(window.devicePixelRatio || 1, 0.75)); fx.resize(); request(); }

  var fine = window.matchMedia && matchMedia('(pointer:fine)').matches;
  var ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  if (fine && !reduced) addEventListener('mousemove', function (e) { ptr.tx = e.clientX / innerWidth * 2 - 1; ptr.ty = -(e.clientY / innerHeight * 2 - 1); }, { passive: true });

  /* スクロール位置 → 場面の位置(pos)。0=ヒーロー 1..4=4つの場面。
     整数付近は“とどまる”区間、その間をディゾルブで移る。 */
  function scrollState() {
    var vh = innerHeight, r = story.getBoundingClientRect(), range = story.offsetHeight - vh;
    var enter = clamp((vh * 0.9 - r.top) / (vh * 0.85), 0, 1);
    var pos, s = 0, f = 0;
    if (r.top > vh * 0.05) pos = smooth(0, 1, enter);
    else {
      var q = clamp(-r.top / range, 0, 1), sf = q * 4; s = Math.min(3, Math.floor(sf)); f = sf - s;
      pos = 1 + s + (s < 3 ? smooth(0.68, 1, f) : 0);
    }
    return { target: pos, s: s, f: f, bottom: r.bottom, vh: vh, top: r.top };
  }

  var disp = 0, last = 0, wasPaused = false, needs = true, raf = 0, lookCur = { lr: 255, lg: 207, lb: 122, ar: 255, ag: 154, ab: 107 };
  function lerp(a, b, t) { return a + (b - a) * t; }
  function look(A, B, d) {
    var a = HS.SCENES[A], b = HS.SCENES[B], o = lookCur;
    o.lr = Math.round(lerp(a[12], b[12], d) * 255); o.lg = Math.round(lerp(a[13], b[13], d) * 255); o.lb = Math.round(lerp(a[14], b[14], d) * 255);
    o.ar = Math.round(lerp(a[20], b[20], d) * 255); o.ag = Math.round(lerp(a[21], b[21], d) * 255); o.ab = Math.round(lerp(a[22], b[22], d) * 255);
    return o;
  }
  function hex(c) { return 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')'; }
  var fbKey = '';
  function paintFallback(A, B, d) {
    var key = A + ':' + d.toFixed(2); if (key === fbKey) return; fbKey = key;
    var a = HS.SCENES[A], b = HS.SCENES[B], mix = function (i) { return lerp(a[i], b[i], d); };
    var top = [mix(0), mix(1), mix(2)], bot = [mix(4), mix(5), mix(6)], lc = [mix(12), mix(13), mix(14)];
    var hor = mix(7), lx = mix(16) * 100, ly = (1 - mix(17)) * 100;
    fb.style.background = 'radial-gradient(55% 45% at ' + lx.toFixed(0) + '% ' + ly.toFixed(0) + '%,' + hex(lc).replace('rgb', 'rgba').replace(')', ',.5)') + ',transparent 70%),linear-gradient(180deg,' + hex(top) + ' 0%,' + hex(bot) + ' ' + ((1 - hor) * 100 + 8).toFixed(0) + '%,#05061a 100%)';
  }

  var activeCap = -1, activeProg = -1;
  function ui(disp, ss) {
    var k, on = -1, i;
    for (k = 1; k <= 4; k++) if (Math.abs(disp - k) <= 0.14) on = k - 1;
    if (on !== activeCap) {
      activeCap = on;
      caps.forEach(function (c, n) { var h = $('.split', c); c.classList.toggle('on', n === on); if (h) h.classList.toggle('on', n === on); });
    }
    var cur = disp < 0.6 ? -1 : clamp(Math.round(disp) - 1, 0, 3);
    if (cur !== activeProg) { activeProg = cur; progBtns.forEach(function (b, n) { if (n === cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }); }
    var past = ss.bottom < ss.vh * 0.35;
    body.classList.toggle('past', past);
  }

  function frame(now) {
    raf = 0;
    var t = now / 1000, dt = Math.min(0.1, Math.max(0.001, t - last)); last = t;
    var ss = scrollState();
    if (reduced) disp = Math.round(ss.target); else disp += (ss.target - disp) * (1 - Math.exp(-dt * 5.5));
    if (Math.abs(ss.target - disp) < 0.0015) disp = ss.target;
    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    ui(disp, ss);
    var ended = ss.bottom < 0;
    if (ended || document.hidden) {
      if (!wasPaused) { fx.clear(); wasPaused = true; }
    } else {
      wasPaused = false;
      var A = clamp(Math.floor(disp), 0, 4), B = Math.min(A + 1, 4), d = A === 4 ? 0 : disp - A;
      /* 湖の波紋：場面3に入った直後は荒れ、スクロールとともに静まる */
      var calm = disp < 2.98 ? 0 : (ss.s === 2 ? clamp(ss.f / 0.6, 0, 1) : 1);
      var tm = reduced ? 8 : t;
      var p0 = performance.now();
      if (gl) gl.render(A, B, d, tm, ptr, 1 - calm, 0.58 * smooth(0.7, 1, disp)); else paintFallback(A, B, d);
      var p1 = performance.now();
      var lk = look(A, B, d), mobile = innerWidth < 760;
      /* ともりの居場所：ヒーロー → 物語。終盤はフェードアウト */
      var inStory = smooth(0, 1, disp), a = clamp((ss.bottom - ss.vh * 0.1) / (ss.vh * 0.6), 0, 1);
      var sx = mobile ? lerp(0.5, 0.74, inStory) : fx.poseX(disp), sy = mobile ? lerp(0.9, 0.27, inStory) : lerp(0.43, 0.46, inStory), sz = mobile ? lerp(0.13, 0.17, inStory) : lerp(0.32, 0.3, inStory);
      var p2 = performance.now();
      fx.draw({ t: tm, dt: dt, ptr: ptr, look: lk, pos: disp, scrollY: scrollY, still: reduced, spirit: { x: sx, y: sy, s: sz, a: a } });
      var pf = HS.perf || (HS.perf = { n: 0, gl: 0, fx: 0 }); pf.n++; pf.gl += p1 - p0; pf.fx += performance.now() - p2;
    }
    needs = false;
    if (!reduced || needs) raf = requestAnimationFrame(frame);
  }
  function request() { needs = true; if (!raf) raf = requestAnimationFrame(frame); }
  addEventListener('resize', resize);
  addEventListener('scroll', request, { passive: true });
  document.addEventListener('visibilitychange', request);
  if (gl) glCanvas.addEventListener('webglcontextlost', function () { request(); });
  resize();
  if (!reduced) raf = requestAnimationFrame(frame); else request();

  /* --- 進行インジケーター（クリックで場面へ）・キーボード対応 --- */
  function goScene(i, instant) {
    var range = story.offsetHeight - innerHeight, top = story.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + range * ((i + 0.32) / 4), behavior: (reduced || instant) ? 'auto' : 'smooth' });
  }
  progBtns.forEach(function (b) { b.addEventListener('click', function () { goScene(+b.getAttribute('data-go')); }); });
  caps.forEach(function (c, n) { c.addEventListener('focusin', function () { if (activeCap !== n) setTimeout(function () { goScene(n, true); }, 60); }); });

  /* --- お知らせ・資料 --- */
  HS.loadData().then(function (d) {
    var list = d.news.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 6);
    $('#newsList').innerHTML = list.map(function (n) {
      return '<li><details><summary><time datetime="' + HS.esc(n.date) + '">' + HS.esc(n.date.replace(/-/g, '.')) + '</time><span class="tag">' + HS.esc(n.tag) + '</span><span>' + HS.esc(n.title) + '</span></summary><p>' + HS.esc(n.body) + '</p></details></li>';
    }).join('') || '<li style="padding:14px 4px">お知らせはありません。</li>';
    $('#dlCatalog').addEventListener('click', function () {
      var lines = ['品番,名称,種類,W(mm),H(mm),D(mm),性能,単位,使用温度下限,使用温度上限,質量(kg),参考価格(税抜)'];
      d.products.forEach(function (p) {
        var c = S.CATS[p.cat] || {};
        lines.push([p.part, p.name, c.label, p.w, p.h, p.d, p.perf, c.unit, p.tmin, p.tmax, p.weight, p.price].map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(','));
      });
      HS.download('hoshiakari_catalog.csv', 'text/csv', lines.join('\r\n'), true);
    });
  }).catch(function () { $('#newsList').innerHTML = '<li style="padding:14px 4px">お知らせを読み込めませんでした（ローカルサーバー経由で開いてください）。</li>'; });
  $('#dlCompany').addEventListener('click', function () {
    HS.download('hoshiakari_company.txt', 'text/plain',
      '株式会社ほしあかり精機（架空）\r\n小さな部品に、大きなあかりを。\r\n\r\n取扱分野：照明・光源 / 冷却 / 防振 / 搬送\r\n\r\n※本資料は自主制作デモ用の架空の内容です。\r\n', true);
  });
})();
