(function () {
  'use strict';
  var HS = window.HS, S = window.HSSearch;
  var $ = function (s) { return document.querySelector(s); };
  var all = [], byId = {};
  var cmp = HS.ls.get('hs_compare', []), fav = HS.ls.get('hs_fav', []), hist = HS.ls.get('hs_hist', []);

  $('#cornerChar').innerHTML = HS.tomori('smile');

  function catSel() { return $('#fCat').value; }
  function readQuery() {
    var uses = Array.prototype.map.call(document.querySelectorAll('#fUses input:checked'), function (i) { return i.value; });
    var g = function (id) { return $(id).value; };
    return {
      cat: catSel(), uses: uses, keywords: g('#fKw'), part: g('#fPart'),
      w: { min: g('#wMin'), max: g('#wMax') }, h: { min: g('#hMin'), max: g('#hMax') }, d: { min: g('#dMin'), max: g('#dMax') },
      perf: { min: g('#pMin'), max: g('#pMax') }, needHigh: g('#tHigh'), needLow: g('#tLow')
    };
  }
  function perfStr(p) { var c = S.CATS[p.cat] || {}; return c.perfLabel + ' ' + p.perf + ' ' + c.unit; }

  function render() {
    var res = S.sortProducts(S.filterProducts(all, readQuery()), $('#sort').value);
    $('#count').textContent = res.length;
    $('#results').innerHTML = res.map(function (p) {
      var inC = cmp.indexOf(p.id) >= 0, inF = fav.indexOf(p.id) >= 0;
      return '<li class="pcard"><div>' +
        '<h3><a class="pn" href="product.html?id=' + encodeURIComponent(p.id) + '">' + HS.esc(p.part) + '</a>　' + HS.esc(p.name) + '</h3>' +
        '<p class="meta"><span class="tag">' + HS.esc((S.CATS[p.cat] || {}).label || p.cat) + '</span> ' + p.w + '×' + p.h + '×' + p.d + ' mm ／ ' + HS.esc(perfStr(p)) + ' ／ ' + p.tmin + '〜' + p.tmax + '℃</p>' +
        '<p class="meta">用途：' + HS.esc((p.uses || []).join('、')) + '　参考価格 ' + HS.esc(HS.yen(p.price)) + '</p></div>' +
        '<div class="acts"><button type="button" class="toggle" data-cmp="' + HS.esc(p.id) + '" aria-pressed="' + inC + '">' + (inC ? '比較中' : '比較に追加') + '</button>' +
        '<button type="button" class="toggle" data-fav="' + HS.esc(p.id) + '" aria-pressed="' + inF + '" aria-label="お気に入り ' + HS.esc(p.part) + '">' + (inF ? '★ 登録済み' : '☆ お気に入り') + '</button></div></li>';
    }).join('') || '<li class="card">条件に合う製品がありません。条件をゆるめてみてください。</li>';
  }

  function contactHref(ids) { return 'contact.html' + (ids.length ? '?parts=' + encodeURIComponent(ids.join(',')) : ''); }
  function partOf(id) { return byId[id] ? byId[id].part : id; }

  function renderDrawer() {
    var d = $('#drawer'); d.hidden = cmp.length === 0;
    document.body.style.paddingBottom = cmp.length ? '64px' : '';
    $('#cmpN').textContent = cmp.length;
    $('#cmpChips').innerHTML = cmp.map(function (id) {
      return '<span class="chip-x">' + HS.esc(partOf(id)) + '<button type="button" data-cmp="' + HS.esc(id) + '" aria-label="' + HS.esc(partOf(id)) + ' を比較から外す">×</button></span>';
    }).join('');
    $('#cmpContact').href = contactHref(cmp.map(partOf));
    if (cmp.length === 0) { $('#compare').hidden = true; $('#cmpShow').setAttribute('aria-expanded', 'false'); }
    else if (!$('#compare').hidden) renderCompare();
  }
  function renderCompare() {
    var ps = cmp.map(function (id) { return byId[id]; }).filter(Boolean);
    var rows = S.compareRows(ps);
    $('#compareTable').innerHTML = '<table><thead><tr><th scope="col">項目</th>' + ps.map(function (p) { return '<th scope="col"><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + HS.esc(p.part) + '</a></th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><th scope="row">' + HS.esc(r.label) + '</th>' + r.values.map(function (v) { return '<td>' + HS.esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }
  function renderPanels() {
    var li = function (id, key) {
      var p = byId[id]; if (!p) return '';
      return '<li><span><a href="product.html?id=' + encodeURIComponent(id) + '">' + HS.esc(p.part) + '</a> ' + HS.esc(p.name) + '</span>' + (key ? '<button type="button" class="mini" data-rm-' + key + '="' + HS.esc(id) + '" aria-label="' + HS.esc(p.part) + ' を外す">外す</button>' : '') + '</li>';
    };
    $('#favN').textContent = fav.filter(function (i) { return byId[i]; }).length;
    $('#favList').innerHTML = fav.map(function (i) { return li(i, 'fav'); }).join('') || '<li>まだありません。結果の「☆ お気に入り」で追加できます。</li>';
    $('#favContact').href = contactHref(fav.map(partOf));
    $('#favContact').hidden = fav.length === 0;
    $('#histList').innerHTML = hist.map(function (i) { return li(i, ''); }).join('') || '<li>まだありません。製品ページを開くと記録されます。</li>';
  }
  function save() { HS.ls.set('hs_compare', cmp); HS.ls.set('hs_fav', fav); HS.ls.set('hs_hist', hist); }
  function refreshAll() { render(); renderDrawer(); renderPanels(); }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-cmp],[data-fav],[data-rm-fav]');
    if (!t) return;
    if (t.hasAttribute('data-cmp')) {
      var r = S.toggleCompare(cmp, t.getAttribute('data-cmp'), 3);
      if (r.full) { alert('比較できるのは3件までです。どれかを外してから追加してください。'); return; }
      cmp = r.list;
    } else if (t.hasAttribute('data-fav')) fav = S.toggleFavorite(fav, t.getAttribute('data-fav'));
    else fav = S.removeId(fav, t.getAttribute('data-rm-fav'));
    save(); refreshAll();
  });
  $('#cmpShow').addEventListener('click', function () {
    var c = $('#compare'); c.hidden = !c.hidden;
    this.setAttribute('aria-expanded', c.hidden ? 'false' : 'true');
    if (!c.hidden) { renderCompare(); c.scrollIntoView({ block: 'nearest' }); }
  });
  $('#cmpClear').addEventListener('click', function () { cmp = []; save(); refreshAll(); });
  $('#histClear').addEventListener('click', function () { hist = []; save(); renderPanels(); });

  function setupPerf() {
    var c = S.CATS[catSel()];
    ['#pMin', '#pMax'].forEach(function (id) { $(id).disabled = !c; if (!c) $(id).value = ''; });
    $('#perfLegend').textContent = c ? '性能：' + c.perfLabel + ' (' + c.unit + ')' : '性能';
    $('#perfHint').hidden = !!c;
  }

  HS.loadData().then(function (d) {
    all = d.products; all.forEach(function (p) { byId[p.id] = p; });
    var cs = $('#fCat'); Object.keys(S.CATS).forEach(function (k) { cs.insertAdjacentHTML('beforeend', '<option value="' + k + '">' + S.CATS[k].label + '</option>'); });
    var uses = {}, tr = {};
    all.forEach(function (p) { (p.uses || []).forEach(function (u) { uses[u] = 1; }); (p.troubles || []).forEach(function (t) { tr[t] = (tr[t] || 0) + 1; }); });
    $('#fUses').innerHTML = Object.keys(uses).sort().map(function (u) { return '<label><input type="checkbox" value="' + HS.esc(u) + '"> ' + HS.esc(u) + '</label>'; }).join('');
    $('#fTroubles').innerHTML = Object.keys(tr).sort(function (a, b) { return tr[b] - tr[a]; }).slice(0, 10).map(function (t) { return '<button type="button" class="chip" aria-pressed="false" data-tr="' + HS.esc(t) + '">' + HS.esc(t) + '</button>'; }).join('');
    var cat = new URLSearchParams(location.search).get('cat');
    if (cat && S.CATS[cat]) cs.value = cat;
    setupPerf();
    cmp = cmp.filter(function (i) { return byId[i]; });
    refreshAll();
  }).catch(function () {
    $('#results').innerHTML = '<li class="card">製品データを読み込めませんでした。ローカルサーバー経由で開いてください。</li>';
  });

  var form = $('#filters');
  form.addEventListener('input', render);
  form.addEventListener('change', function (e) { if (e.target.id === 'fCat') setupPerf(); render(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  $('#sort').addEventListener('change', render);
  $('#fTroubles').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tr]'); if (!b) return;
    var kw = $('#fKw'), t = b.getAttribute('data-tr'), words = kw.value.split(/\s+/).filter(Boolean), i = words.indexOf(t);
    if (i >= 0) words.splice(i, 1); else words.push(t);
    kw.value = words.join(' ');
    b.setAttribute('aria-pressed', i < 0 ? 'true' : 'false'); render();
  });
  $('#reset').addEventListener('click', function () {
    form.reset(); setupPerf();
    Array.prototype.forEach.call(document.querySelectorAll('#fTroubles .chip'), function (c) { c.setAttribute('aria-pressed', 'false'); });
    render();
  });
})();
