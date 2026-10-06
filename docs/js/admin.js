(function () {
  'use strict';
  var HS = window.HS, S = window.HSSearch;
  var $ = function (s) { return document.querySelector(s); };
  var products = [], news = [], editP = null, editN = null, data = null;

  function msg(t) { $('#msg').textContent = t; }
  function persist() {
    HS.ls.set('hs_products_override', products); HS.ls.set('hs_news_override', news);
    $('#state').textContent = '現在：ブラウザ内の更新データを表示中';
  }
  function listP() {
    $('#listP').innerHTML = products.map(function (p, i) {
      return '<tr><td>' + HS.esc(p.part) + '</td><td>' + HS.esc(p.name) + '</td><td>' + HS.esc((S.CATS[p.cat] || {}).label || p.cat) + '</td><td class="row-acts"><button type="button" class="toggle" data-ep="' + i + '" aria-label="' + HS.esc(p.part) + ' を編集">編集</button><button type="button" class="toggle" data-dp="' + i + '" aria-label="' + HS.esc(p.part) + ' を削除">削除</button></td></tr>';
    }).join('');
  }
  function listN() {
    $('#listN').innerHTML = news.map(function (n, i) {
      return '<tr><td>' + HS.esc(n.date) + '</td><td>' + HS.esc(n.tag) + '</td><td>' + HS.esc(n.title) + '</td><td class="row-acts"><button type="button" class="toggle" data-en="' + i + '" aria-label="' + HS.esc(n.title) + ' を編集">編集</button><button type="button" class="toggle" data-dn="' + i + '" aria-label="' + HS.esc(n.title) + ' を削除">削除</button></td></tr>';
    }).join('');
  }
  function refresh() { listP(); listN(); }

  var NUM = ['w', 'h', 'd', 'perf', 'tmin', 'tmax', 'weight', 'price'];
  var split = function (s) { return String(s).split(/[、,，\n]/).map(function (x) { return x.trim(); }).filter(Boolean); };
  function openP(i) {
    editP = i; var p = i === null ? { cat: 'cool', uses: [], troubles: [], extra: [] } : products[i];
    $('#formPT').textContent = i === null ? '製品を追加' : '製品を編集：' + p.part;
    ['part', 'name', 'cat', 'desc'].forEach(function (k) { $('#p_' + k).value = p[k] || (k === 'cat' ? 'cool' : ''); });
    NUM.forEach(function (k) { $('#p_' + k).value = p[k] == null ? '' : p[k]; });
    $('#p_uses').value = (p.uses || []).join('、'); $('#p_troubles').value = (p.troubles || []).join('、');
    $('#p_extra').value = (p.extra || []).map(function (e) { return e[0] + ': ' + e[1]; }).join('\n');
    $('#p_err').textContent = ''; $('#formP').hidden = false; $('#p_part').focus();
  }
  $('#p_cat').innerHTML = Object.keys(S.CATS).map(function (k) { return '<option value="' + k + '">' + S.CATS[k].label + '</option>'; }).join('');

  $('#formP').addEventListener('submit', function (e) {
    e.preventDefault();
    var p = { part: $('#p_part').value.trim(), name: $('#p_name').value.trim(), cat: $('#p_cat').value, desc: $('#p_desc').value.trim(),
      uses: split($('#p_uses').value), troubles: split($('#p_troubles').value),
      extra: $('#p_extra').value.split('\n').map(function (l) { var m = l.split(/[:：]/); return m.length > 1 ? [m.shift().trim(), m.join(':').trim()] : null; }).filter(Boolean) };
    p.id = p.part;
    NUM.forEach(function (k) { var v = $('#p_' + k).value; p[k] = v === '' ? NaN : Number(v); });
    var errs = S.validateProduct(p);
    if (products.some(function (x, i) { return x.id === p.id && i !== editP; })) errs.push('同じ品番が既にあります');
    if (errs.length) { $('#p_err').textContent = errs.join(' ／ '); return; }
    if (editP === null) products.push(p); else products[editP] = p;
    persist(); refresh(); $('#formP').hidden = true; msg('製品を保存しました。製品検索ページに反映されます。');
  });
  $('#cancelP').addEventListener('click', function () { $('#formP').hidden = true; });
  $('#addP').addEventListener('click', function () { openP(null); });

  function openN(i) {
    editN = i; var n = i === null ? { date: new Date().toISOString().slice(0, 10), tag: 'お知らせ', title: '', body: '' } : news[i];
    ['date', 'tag', 'title', 'body'].forEach(function (k) { $('#n_' + k).value = n[k]; });
    $('#n_err').textContent = ''; $('#formN').hidden = false; $('#n_date').focus();
  }
  $('#formN').addEventListener('submit', function (e) {
    e.preventDefault();
    var n = { id: editN === null ? 'n' + Date.now() : news[editN].id, date: $('#n_date').value.trim(), tag: $('#n_tag').value.trim(), title: $('#n_title').value.trim(), body: $('#n_body').value.trim() };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date)) { $('#n_err').textContent = '日付は 2026-10-01 の形式で入力してください'; return; }
    if (!n.title) { $('#n_err').textContent = 'タイトルを入力してください'; return; }
    if (editN === null) news.push(n); else news[editN] = n;
    persist(); refresh(); $('#formN').hidden = true; msg('お知らせを保存しました。トップページに反映されます。');
  });
  $('#cancelN').addEventListener('click', function () { $('#formN').hidden = true; });
  $('#addN').addEventListener('click', function () { openN(null); });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ep],[data-dp],[data-en],[data-dn]'); if (!b) return;
    if (b.hasAttribute('data-ep')) openP(+b.getAttribute('data-ep'));
    else if (b.hasAttribute('data-en')) openN(+b.getAttribute('data-en'));
    else if (b.hasAttribute('data-dp')) { var p = products[+b.getAttribute('data-dp')]; if (confirm(p.part + ' を削除しますか？')) { products.splice(+b.getAttribute('data-dp'), 1); persist(); refresh(); msg('削除しました。'); } }
    else { var n = news[+b.getAttribute('data-dn')]; if (confirm('「' + n.title + '」を削除しますか？')) { news.splice(+b.getAttribute('data-dn'), 1); persist(); refresh(); msg('削除しました。'); } }
  });

  function tab(p) {
    $('#tabP').setAttribute('aria-pressed', p); $('#tabN').setAttribute('aria-pressed', !p);
    $('#secP').hidden = !p; $('#secN').hidden = p;
  }
  $('#tabP').addEventListener('click', function () { tab(true); });
  $('#tabN').addEventListener('click', function () { tab(false); });

  $('#reset').addEventListener('click', function () {
    if (!confirm('更新内容を破棄して、同梱の初期データに戻しますか？')) return;
    HS.ls.del('hs_products_override'); HS.ls.del('hs_news_override');
    products = JSON.parse(JSON.stringify(data.defaults.products)); news = JSON.parse(JSON.stringify(data.defaults.news));
    $('#state').textContent = '現在：同梱の初期データ'; refresh(); msg('初期状態に戻しました。');
  });
  $('#export').addEventListener('click', function () {
    HS.download('hoshiakari_data.json', 'application/json', JSON.stringify({ products: products, news: news }, null, 2));
  });
  $('#import').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return; var inp = this;
    var r = new FileReader();
    r.onload = function () {
      try {
        var j = JSON.parse(r.result);
        if (!j || !Array.isArray(j.products) || !Array.isArray(j.news)) throw new Error('products と news の配列が必要です');
        var bad = [];
        j.products.forEach(function (p, i) { var e = S.validateProduct(p); if (e.length) bad.push((i + 1) + '件目: ' + e[0]); });
        j.news.forEach(function (n, i) { if (!n || !n.title || !n.date) bad.push('お知らせ' + (i + 1) + '件目が不正'); });
        if (bad.length) throw new Error(bad.slice(0, 3).join(' ／ '));
        j.products.forEach(function (p) { p.id = p.part; p.uses = p.uses || []; p.troubles = p.troubles || []; p.extra = p.extra || []; p.desc = p.desc || ''; });
        products = j.products; news = j.news; persist(); refresh(); msg('インポートしました（製品' + products.length + '件・お知らせ' + news.length + '件）。');
      } catch (err) { msg('インポートできません：' + err.message); }
      inp.value = '';
    };
    r.readAsText(f);
  });

  HS.loadData().then(function (d) {
    data = d; products = JSON.parse(JSON.stringify(d.products)); news = JSON.parse(JSON.stringify(d.news));
    $('#state').textContent = d.overridden.products || d.overridden.news ? '現在：ブラウザ内の更新データを表示中' : '現在：同梱の初期データ';
    refresh();
  }).catch(function () { msg('データを読み込めませんでした。ローカルサーバー経由で開いてください。'); });
})();
