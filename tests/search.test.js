const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const S = require('../docs/js/search.js');

const products = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'data', 'products.json'), 'utf8'));
const parts = (arr) => arr.map((p) => p.part);

test('データは24件・4カテゴリ・全件が検証を通る', () => {
  assert.strictEqual(products.length, 24);
  assert.strictEqual(new Set(products.map((p) => p.cat)).size, 4);
  products.forEach((p) => assert.deepStrictEqual(S.validateProduct(p), [], p.part));
  assert.strictEqual(new Set(products.map((p) => p.id)).size, 24);
});

test('条件なしなら全件', () => {
  assert.strictEqual(S.filterProducts(products, {}).length, 24);
});

test('用途（OR）で絞り込む', () => {
  const r = S.filterProducts(products, { uses: ['食品工場'] });
  assert.ok(r.length > 0);
  r.forEach((p) => assert.ok(p.uses.includes('食品工場')));
  const r2 = S.filterProducts(products, { uses: ['食品工場', '精密機器'] });
  assert.ok(r2.length > r.length);
});

test('種類＋寸法の範囲', () => {
  const r = S.filterProducts(products, { cat: 'cool', w: { max: 120 } });
  assert.deepStrictEqual(parts(S.sortProducts(r, 'part')), ['HS-FN-120A', 'HS-FN-120B', 'HS-FN-60S', 'HS-FN-80A']);
  const r2 = S.filterProducts(products, { cat: 'cool', w: { min: 100, max: 120 }, d: { max: 30 } });
  assert.deepStrictEqual(parts(r2), ['HS-FN-120A']);
});

test('性能の範囲（種類指定が必要）', () => {
  const r = S.filterProducts(products, { cat: 'cool', perf: { min: 3 } });
  assert.deepStrictEqual(parts(S.sortProducts(r, 'perfAsc')), ['HS-FN-120B', 'HS-FN-140A', 'HS-FN-172Z']);
  assert.strictEqual(S.filterProducts(products, { perf: { min: 3 } }).length, 0);
});

test('使用温度（上限・下限）', () => {
  const r = S.filterProducts(products, { needHigh: 80 });
  r.forEach((p) => assert.ok(p.tmax >= 80));
  const r2 = S.filterProducts(products, { needLow: -30 });
  r2.forEach((p) => assert.ok(p.tmin <= -30));
  assert.ok(r2.length > 0 && r2.length < 24);
});

test('品番は前方一致（大文字小文字・ハイフン無視）', () => {
  assert.strictEqual(S.filterProducts(products, { part: 'HS-FN-12' }).length, 2);
  assert.strictEqual(S.filterProducts(products, { part: 'hsfn12' }).length, 2);
  assert.strictEqual(S.filterProducts(products, { part: 'FN-12' }).length, 0);
  assert.strictEqual(S.filterProducts(products, { part: 'HS-DP' }).length, 6);
});

test('困りごとキーワード（AND）', () => {
  const r = S.filterProducts(products, { keywords: '熱がこもる 音がうるさい' });
  assert.deepStrictEqual(parts(S.sortProducts(r, 'part')), ['HS-FN-120A']);
  assert.ok(S.filterProducts(products, { keywords: '振動' }).length >= 5);
});

test('並び替え', () => {
  const r = S.sortProducts(S.filterProducts(products, { cat: 'damp' }), 'perfDesc');
  assert.strictEqual(r[0].part, 'HS-DP-W500');
  const p = S.sortProducts(products, 'priceAsc');
  assert.ok(p[0].price <= p[1].price);
  const orig = products.slice();
  S.sortProducts(products, 'part');
  assert.deepStrictEqual(products, orig, '元配列を壊さない');
});

test('比較は最大3件', () => {
  let s = S.toggleCompare([], 'A');
  s = S.toggleCompare(s.list, 'B');
  s = S.toggleCompare(s.list, 'C');
  assert.deepStrictEqual(s.list, ['A', 'B', 'C']);
  const full = S.toggleCompare(s.list, 'D');
  assert.strictEqual(full.full, true);
  assert.deepStrictEqual(full.list, ['A', 'B', 'C']);
  const removed = S.toggleCompare(s.list, 'B');
  assert.deepStrictEqual(removed.list, ['A', 'C']);
  assert.strictEqual(removed.added, false);
});

test('比較表の行', () => {
  const rows = S.compareRows(products.slice(0, 2));
  assert.ok(rows.length >= 6);
  rows.forEach((r) => assert.strictEqual(r.values.length, 2));
});

test('履歴は重複を除き先頭が最新・最大10件', () => {
  let h = [];
  for (let i = 1; i <= 12; i++) h = S.addHistory(h, 'P' + i);
  assert.strictEqual(h.length, 10);
  assert.strictEqual(h[0], 'P12');
  assert.strictEqual(h[9], 'P3');
  h = S.addHistory(h, 'P5');
  assert.strictEqual(h[0], 'P5');
  assert.strictEqual(h.filter((x) => x === 'P5').length, 1);
  assert.strictEqual(h.length, 10);
});

test('お気に入りの切り替え', () => {
  let f = S.toggleFavorite([], 'A');
  f = S.toggleFavorite(f, 'B');
  assert.deepStrictEqual(f, ['A', 'B']);
  f = S.toggleFavorite(f, 'A');
  assert.deepStrictEqual(f, ['B']);
});

test('validateProduct は不正データを検出する', () => {
  assert.ok(S.validateProduct({ part: 'X', name: 'n', cat: 'zzz' }).length > 0);
  assert.ok(S.validateProduct(null).length > 0);
});
