(function () {
  'use strict';
  var HS = window.HS, S = window.HSSearch;
  var $ = function (s) { return document.querySelector(s); };
  var id = new URLSearchParams(location.search).get('id');
  $('#printDate').textContent = new Date().toLocaleDateString('ja-JP');

  /* 簡易図面（SVG）をクライアント側で生成 */
  function drawing(p) {
    var W = 800, H = 540, sc = Math.min(300 / Math.max(p.w, 1), 190 / Math.max(p.h + p.d, 1));
    sc = Math.min(sc, 300 / Math.max(p.w, 1), 150 / Math.max(p.h, 1), 150 / Math.max(p.d, 1));
    var w = p.w * sc, h = p.h * sc, d = p.d * sc, x0 = 60, yTop = 70, yFront = yTop + d + 70;
    var t = function (x, y, s, a, sz) { return '<text x="' + x + '" y="' + y + '" font-size="' + (sz || 13) + '" text-anchor="' + (a || 'middle') + '" fill="#111" font-family="sans-serif">' + HS.esc(s) + '</text>'; };
    var dimH = function (x1, x2, y, label) { return '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="#c00" stroke-width="1" marker-start="url(#a)" marker-end="url(#a)"/>' + t((x1 + x2) / 2, y - 5, label); };
    var dimV = function (x, y1, y2, label) { return '<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '" stroke="#c00" stroke-width="1" marker-start="url(#a)" marker-end="url(#a)"/><text transform="translate(' + (x + 16) + ',' + ((y1 + y2) / 2) + ') rotate(90)" font-size="13" text-anchor="middle" fill="#111" font-family="sans-serif">' + HS.esc(label) + '</text>'; };
    var cx = x0 + 40;
    return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' +
      '<defs><marker id="a" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6Z" fill="#c00"/></marker></defs>' +
      '<rect width="100%" height="100%" fill="#fff"/><rect x="10" y="10" width="' + (W - 20) + '" height="' + (H - 20) + '" fill="none" stroke="#111" stroke-width="2"/>' +
      t(cx + w / 2, yTop - 24, '平面図（上から）', 'middle', 14) +
      '<rect x="' + cx + '" y="' + yTop + '" width="' + w + '" height="' + d + '" fill="#f4f4f4" stroke="#111" stroke-width="2"/>' + dimH(cx, cx + w, yTop + d + 22, 'W ' + p.w) + dimV(cx + w + 14, yTop, yTop + d, 'D ' + p.d) +
      t(cx + w / 2, yFront - 24, '正面図', 'middle', 14) +
      '<rect x="' + cx + '" y="' + yFront + '" width="' + w + '" height="' + h + '" fill="#f4f4f4" stroke="#111" stroke-width="2"/>' + dimH(cx, cx + w, yFront + h + 22, 'W ' + p.w) + dimV(cx + w + 14, yFront, yFront + h, 'H ' + p.h) +
      '<rect x="470" y="330" width="310" height="190" fill="none" stroke="#111"/>' +
      t(480, 356, '品番：' + p.part, 'start', 15) + t(480, 382, '名称：' + p.name, 'start', 13) + t(480, 408, '寸法：' + p.w + ' × ' + p.h + ' × ' + p.d + ' mm', 'start', 13) +
      t(480, 434, '質量：' + p.weight + ' kg　単位：mm', 'start', 13) + t(480, 470, '株式会社ほしあかり精機（架空）', 'start', 13) + t(480, 496, '架空の製品による自主制作デモ図面。', 'start', 12) +
      '</svg>';
  }
  function specCsv(p) {
    return ['項目,値'].concat(HS.specRows(p).map(function (r) { return '"' + r[0] + '","' + String(r[1]).replace(/"/g, '""') + '"'; })).concat(['"備考","架空の製品による自主制作デモの仕様書です"']).join('\r\n');
  }

  HS.loadData().then(function (d) {
    var p = d.products.filter(function (x) { return x.id === id; })[0];
    if (!p) { $('#detail').innerHTML = '<h1>製品が見つかりません</h1><p><a href="products.html">製品検索へ戻る</a></p>'; return; }
    document.title = p.part + ' ' + p.name + '｜株式会社ほしあかり精機（架空のデモ）';
    var hist = S.addHistory(HS.ls.get('hs_hist', []), p.id, 10); HS.ls.set('hs_hist', hist);
    var cmp = HS.ls.get('hs_compare', []), fav = HS.ls.get('hs_fav', []);
    var cat = S.CATS[p.cat] || {};
    var rel = d.products.filter(function (x) { return x.cat === p.cat && x.id !== p.id; })
      .sort(function (a, b) { return Math.abs(a.perf - p.perf) - Math.abs(b.perf - p.perf); }).slice(0, 3);
    $('#detail').innerHTML =
      '<p class="sub" style="color:var(--gold);margin:0"><span class="tag">' + HS.esc(cat.label || p.cat) + '</span></p>' +
      '<h1>' + HS.esc(p.part) + '　' + HS.esc(p.name) + '</h1><p>' + HS.esc(p.desc) + '</p>' +
      '<div class="actions">' +
      '<button type="button" class="btn btn-sm" id="dlDraw">図面ダウンロード（SVG）</button>' +
      '<button type="button" class="btn btn-sm" id="dlSpec">仕様書ダウンロード（CSV）</button>' +
      '<button type="button" class="btn btn-sm" id="doPrint">印刷・PDF保存</button>' +
      '<button type="button" class="toggle" id="tgCmp"></button><button type="button" class="toggle" id="tgFav"></button>' +
      '<a class="btn btn-sm btn-gold" href="contact.html?parts=' + encodeURIComponent(p.part) + '">この品番で問い合わせ</a></div>' +
      '<div class="table-wrap"><table class="spec"><caption class="sr-only">仕様表</caption><tbody>' +
      HS.specRows(p).map(function (r) { return '<tr><th scope="row">' + HS.esc(r[0]) + '</th><td>' + HS.esc(r[1]) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' +
      '<p class="drawing-note">※ 架空の製品です。図面・仕様書はこのページ上で生成した簡易版です。</p>' +
      '<section class="related no-print" style="margin-top:32px"><h2 style="font-size:20px">関連製品</h2><ul class="cards">' +
      rel.map(function (r) { return '<li class="pcard"><div><h3><a class="pn" href="product.html?id=' + encodeURIComponent(r.id) + '">' + HS.esc(r.part) + '</a>　' + HS.esc(r.name) + '</h3><p class="meta">' + r.w + '×' + r.h + '×' + r.d + ' mm ／ ' + HS.esc(cat.perfLabel) + ' ' + r.perf + ' ' + HS.esc(cat.unit) + '</p></div></li>'; }).join('') + '</ul></section>';

    function paint() {
      var c = $('#tgCmp'), f = $('#tgFav'), ic = cmp.indexOf(p.id) >= 0, iff = fav.indexOf(p.id) >= 0;
      c.setAttribute('aria-pressed', ic); c.textContent = ic ? '比較中（解除）' : '比較に追加';
      f.setAttribute('aria-pressed', iff); f.textContent = iff ? '★ 登録済み' : '☆ お気に入り';
    }
    paint();
    $('#tgCmp').addEventListener('click', function () {
      var r = S.toggleCompare(cmp, p.id, 3);
      if (r.full) { alert('比較は3件までです。製品を探す画面で外してください。'); return; }
      cmp = r.list; HS.ls.set('hs_compare', cmp); paint();
    });
    $('#tgFav').addEventListener('click', function () { fav = S.toggleFavorite(fav, p.id); HS.ls.set('hs_fav', fav); paint(); });
    $('#dlDraw').addEventListener('click', function () { HS.download(p.part + '_drawing.svg', 'image/svg+xml', drawing(p)); });
    $('#dlSpec').addEventListener('click', function () { HS.download(p.part + '_spec.csv', 'text/csv', specCsv(p), true); });
    $('#doPrint').addEventListener('click', function () { window.print(); });
  }).catch(function () { $('#detail').innerHTML = '<p>データを読み込めませんでした。ローカルサーバー経由で開いてください。</p>'; });
})();
