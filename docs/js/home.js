(function () {
  'use strict';
  var HS = window.HS, S = window.HSSearch;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ローディング：最長1.2秒・スキップ可・同一セッションの再訪では出さない */
  var loader = $('#loader');
  function hideLoader() {
    if (!loader || loader.classList.contains('hide')) return;
    loader.classList.add('hide');
    try { sessionStorage.setItem('hs_seen', '1'); } catch (e) { /* noop */ }
    setTimeout(function () { loader.style.display = 'none'; }, 450);
  }
  if (document.documentElement.classList.contains('js-skip-loader')) { /* 非表示済み */ }
  else { setTimeout(hideLoader, 1000); $('#loaderSkip').addEventListener('click', hideLoader); }

  /* キービジュアル */
  var KV = [
    { line: 'こんばんは。今日も、あかりを灯そう。', expr: 'smile', cap: '01　光' },
    { line: '風はね、音もなく熱を運んでくれるの。', expr: 'normal', cap: '02　風' },
    { line: 'ゆれても大丈夫。ぼくが受けとめるよ。', expr: 'wow', cap: '03　静けさ' }
  ];
  var kvChar = $('#kvTomori'); kvChar.innerHTML = HS.tomori('smile');
  var dots = $$('.kv-dot'), bgs = $$('.kv-bg'), cur = 0, timer = null, userPaused = false, hovering = false;
  function show(i) {
    cur = (i + KV.length) % KV.length;
    bgs.forEach(function (b, n) { b.classList.toggle('on', n === cur); });
    dots.forEach(function (d, n) { d.setAttribute('aria-pressed', n === cur ? 'true' : 'false'); });
    $('#kvBubble').textContent = KV[cur].line;
    $('#kvCap').textContent = KV[cur].cap;
    HS.setExpr(kvChar, KV[cur].expr);
  }
  dots.forEach(function (d, n) { d.addEventListener('click', function () { show(n); }); });
  show(0);
  var auto = $('#kvAuto');
  function schedule() {
    clearInterval(timer);
    if (HS.reduced || userPaused || hovering) return;
    timer = setInterval(function () { show(cur + 1); }, 7000);
  }
  if (HS.reduced) { auto.hidden = true; }
  else {
    auto.addEventListener('click', function () {
      userPaused = !userPaused;
      auto.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
      auto.textContent = userPaused ? '自動切替を再開' : '自動切替を停止';
      schedule();
    });
    var kv = $('#kv');
    kv.addEventListener('mouseenter', function () { hovering = true; schedule(); });
    kv.addEventListener('mouseleave', function () { hovering = false; schedule(); });
    kv.addEventListener('focusin', function () { hovering = true; schedule(); });
    kv.addEventListener('focusout', function () { hovering = false; schedule(); });
    schedule();
  }
  HS.dust($('#dust'));

  /* スクロールストーリー */
  var stage = $('#stage'), stChar = $('#stChar'), flash = $('#flash'), stBubble = $('#stBubble');
  stChar.innerHTML = HS.tomori('smile');
  var sbgs = $$('.st-bg', stage), scenes = $$('.scene'), active = -1;
  function setScene(i) {
    if (i === active) return;
    var first = active < 0; active = i;
    stage.setAttribute('data-scene', String(i));
    sbgs.forEach(function (b, n) { b.classList.toggle('on', n === i); });
    stBubble.textContent = scenes[i].getAttribute('data-line');
    HS.setExpr(stChar, scenes[i].getAttribute('data-expr'));
    if (!first && !HS.reduced) { flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); }
  }
  setScene(0);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) setScene(scenes.indexOf(e.target)); });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    scenes.forEach(function (s) { io.observe(s); });
  }

  /* お知らせ・資料 */
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
