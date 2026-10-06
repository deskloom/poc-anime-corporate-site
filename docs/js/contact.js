(function () {
  'use strict';
  var HS = window.HS, S = window.HSSearch;
  var $ = function (s) { return document.querySelector(s); };
  var parts = [];

  // 品番：クエリ → なければ比較に選んでいた製品
  var q = new URLSearchParams(location.search).get('parts');
  if (q) parts = q.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  else {
    var ids = HS.ls.get('hs_compare', []);
    if (ids.length) parts = ids.slice();
  }
  function uniq() { parts = parts.filter(function (x, i) { return parts.indexOf(x) === i; }); }
  function chips() {
    uniq();
    $('#chips').innerHTML = parts.map(function (p) {
      return '<span class="chip-x">' + HS.esc(p) + '<button type="button" data-rm="' + HS.esc(p) + '" aria-label="' + HS.esc(p) + ' を削除">×</button></span>';
    }).join('') || '<span class="drawing-note">品番は未選択です（任意）。</span>';
  }
  chips();
  $('#chips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rm]'); if (!b) return;
    parts = S.removeId(parts, b.getAttribute('data-rm')); chips();
  });
  function add() {
    var v = $('#partIn').value.trim().toUpperCase();
    if (v) { parts.push(v); $('#partIn').value = ''; chips(); }
  }
  $('#addPart').addEventListener('click', add);
  $('#partIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } });

  function setErr(id, msg) {
    $('#e-' + id).textContent = msg || '';
    if (msg) $('#' + id).setAttribute('aria-invalid', 'true'); else $('#' + id).removeAttribute('aria-invalid');
    return !msg;
  }
  function validate() {
    var first = null;
    var checks = [
      ['company', !$('#company').value.trim() ? '会社名を入力してください' : ''],
      ['name', !$('#name').value.trim() ? 'お名前を入力してください' : ''],
      ['email', !$('#email').value.trim() ? 'メールアドレスを入力してください' : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('#email').value.trim()) ? '' : 'メールアドレスの形式が正しくありません')],
      ['message', $('#message').value.trim().length < 10 ? 'お問い合わせ内容は10文字以上で入力してください' : '']
    ];
    checks.forEach(function (c) { if (!setErr(c[0], c[1]) && !first) first = c[0]; });
    if (first) $('#' + first).focus();
    return !first;
  }
  $('#form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    var rows = [['会社名', $('#company').value], ['お名前', $('#name').value], ['メール', $('#email').value], ['品番', parts.join('、') || '（なし）'], ['内容', $('#message').value]];
    $('#summary').innerHTML = rows.map(function (r) { return '<dt>' + HS.esc(r[0]) + '</dt><dd style="white-space:pre-wrap">' + HS.esc(r[1]) + '</dd>'; }).join('');
    $('#form').hidden = true; $('#done').hidden = false; $('#done h2').setAttribute('tabindex', '-1'); $('#done h2').focus();
    window.scrollTo(0, 0);
  });
})();
