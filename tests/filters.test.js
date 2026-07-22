/**
 * filters.test.js — 検索ロジックの単体テスト（Node標準 node:test / 依存ゼロ・API不要）。
 * 実行: node --test tests/
 */
const test = require('node:test');
const assert = require('node:assert');
const F = require('../public/filters.js');

// industryは日本標準産業分類の大分類を「 / 」で連結（「、」は名称の一部）。実データ準拠。
const fixtures = [
  { id: '1', code: 'S-1', title: 'ものづくり補助金', max_limit: 10000000, start: '2026-06-01T00:00:00Z', end: '2026-12-31T00:00:00Z', area: '全国', industry: '製造業', use_purpose: '設備投資を行いたい' },
  { id: '2', code: 'S-2', title: 'IT導入補助金', max_limit: 4500000, start: '2026-05-01T00:00:00Z', end: '2026-01-01T00:00:00Z', area: '全国', industry: '情報通信業', use_purpose: 'ITツールを導入したい' },
  { id: '3', code: 'S-3', title: '東京都 創業助成', max_limit: 3000000, start: '2026-04-01T00:00:00Z', end: '2026-11-30T00:00:00Z', area: '東京都', industry: '卸売業、小売業 / サービス業（他に分類されないもの）', use_purpose: '創業したい' },
  { id: '4', code: 'S-4', title: '大阪 観光振興補助', max_limit: 0, start: '2026-03-01T00:00:00Z', end: '2026-10-31T00:00:00Z', area: '大阪府', industry: '宿泊業、飲食サービス業', use_purpose: '販路拡大したい' },
];
const NOW = '2026-07-01T00:00:00Z';

test('キーワード: 名称部分一致', () => {
  const r = F.applyFilters(fixtures, { keyword: 'ものづくり', now: NOW });
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].id, '1');
});

test('キーワード: 全角半角/大小のゆらぎ吸収 (ＩＴ→IT)', () => {
  const r = F.applyFilters(fixtures, { keyword: 'ＩＴ', now: NOW });
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].id, '2');
});

test('キーワード: 目的(use_purpose)にもヒット', () => {
  const r = F.applyFilters(fixtures, { keyword: '創業', now: NOW });
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].id, '3');
});

test('地域: 東京都は全国＋東京都がヒット', () => {
  const r = F.applyFilters(fixtures, { pref: '東京都', now: NOW });
  const ids = r.map(x => x.id).sort();
  assert.deepStrictEqual(ids, ['1', '2', '3']); // 全国2件 + 東京都1件
});

test('地域: 大阪府は全国＋大阪府', () => {
  const r = F.applyFilters(fixtures, { pref: '大阪府', now: NOW });
  assert.deepStrictEqual(r.map(x => x.id).sort(), ['1', '2', '4']);
});

test('業種: 大分類トークン完全一致（/区切り）', () => {
  const r = F.applyFilters(fixtures, { industry: 'サービス業（他に分類されないもの）', now: NOW });
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].id, '3');
});

test('業種: 「、」を含む正式名称を壊さない（宿泊業、飲食サービス業は1カテゴリ）', () => {
  const r = F.applyFilters(fixtures, { industry: '宿泊業、飲食サービス業', now: NOW });
  assert.deepStrictEqual(r.map(x => x.id), ['4']);
  // 「飲食サービス業」単体では大分類名と一致しないのでヒットしない
  const none = F.applyFilters(fixtures, { industry: '飲食サービス業', now: NOW });
  assert.strictEqual(none.length, 0);
});

test('金額: 上限500万円以上で絞り込み(0/nullは除外)', () => {
  const r = F.applyFilters(fixtures, { minAmount: 5000000, now: NOW });
  assert.deepStrictEqual(r.map(x => x.id).sort(), ['1']); // 1000万のみ
});

test('募集中のみ: 締切超過(id=2)を除外', () => {
  const r = F.applyFilters(fixtures, { openOnly: true, now: NOW });
  const ids = r.map(x => x.id).sort();
  assert.ok(!ids.includes('2'), 'id=2 は締切超過なので除外される');
  assert.deepStrictEqual(ids, ['1', '3', '4']);
});

test('複合条件: 全国×製造業×募集中', () => {
  const r = F.applyFilters(fixtures, { pref: '東京都', industry: '製造業', openOnly: true, now: NOW });
  assert.deepStrictEqual(r.map(x => x.id), ['1']);
});

test('業種抽出: /区切りで大分類に分割・ユニーク化（、は保持）', () => {
  const inds = F.extractIndustries(fixtures);
  assert.ok(inds.includes('製造業'));
  assert.ok(inds.includes('情報通信業'));
  assert.ok(inds.includes('卸売業、小売業'), '「、」を含む正式名称を1トークンとして保持');
  assert.ok(inds.includes('サービス業（他に分類されないもの）'));
  assert.ok(!inds.includes('卸売業'), '「、」で誤分割していないこと');
});

test('都道府県リストは47件', () => {
  assert.strictEqual(F.PREFECTURES.length, 47);
});
