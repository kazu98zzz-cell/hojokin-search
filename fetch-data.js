#!/usr/bin/env node
/**
 * fetch-data.js — jGrants 公開APIから募集中の補助金を全件取得し public/data/subsidies.json を生成する。
 *
 * 方針(SDD準拠):
 *  - 外部APIを叩く唯一の場所。公開サイト(public/)はこのJSONを読むだけ。
 *  - keyword必須のため広域キーワードを巡回し id で重複排除して全件相当を収集。
 *  - レート制限対策: リクエスト間隔 + 指数バックオフ。
 *  - 業種(industry)/目的(use_purpose)は詳細APIでエンリッチし data/detail-cache/ に増分キャッシュ。
 *
 * 使い方:
 *   node fetch-data.js                # 全件取得して public/data/subsidies.json を書き換え
 *   node fetch-data.js --dry-run      # 取得件数を表示するだけ(ファイル書換なし)
 *   node fetch-data.js --limit 50     # 動作確認用: 収集idを50件に制限
 *   node fetch-data.js --no-detail    # 業種エンリッチをskip(高速・業種は空)
 *   node fetch-data.js --keywords IT,ものづくり   # キーワードを上書き(検証用)
 *
 * 依存: なし(Node 18+ の標準 fetch のみ)。CT-10。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const BASE = 'https://api.jgrants-portal.go.jp/exp';
const LIST_URL = `${BASE}/v1/public/subsidies`;
const DETAIL_URL = (id) => `${BASE}/v2/public/subsidies/id/${id}`;
const PUBLIC_URL = (id) => `https://www.jgrants-portal.go.jp/subsidy/${id}`;

const OUT_FILE = path.join(__dirname, 'public', 'data', 'subsidies.json');
const CACHE_DIR = path.join(__dirname, 'data', 'detail-cache');
const CACHE_TTL_DAYS = 7;

// 募集中補助金を広く拾うための巡回キーワード(2文字以上)。ID重複排除するので重複ヒットは問題ない。
const DEFAULT_KEYWORDS = [
  '事業', '補助', '助成', '支援', '促進', '導入', '設備', '整備', '研究', '開発',
  '雇用', '創業', '起業', 'IT', 'デジタル', '省エネ', '環境', '脱炭素', '人材', '育成',
  '販路', '海外', '輸出', 'ものづくり', '製造', '観光', '農業', '林業', '漁業', '福祉',
  '介護', '医療', '教育', '子育て', '女性', '地域', '中小', '小規模', '感染症', '防災',
];

// ---- CLI引数 --------------------------------------------------------------
const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const getOpt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const DRY_RUN = hasFlag('--dry-run');
const NO_DETAIL = hasFlag('--no-detail');
const LIMIT = getOpt('--limit') ? parseInt(getOpt('--limit'), 10) : null;
const KEYWORDS = getOpt('--keywords') ? getOpt('--keywords').split(',').map(s => s.trim()).filter(Boolean) : DEFAULT_KEYWORDS;

const REQUEST_INTERVAL_MS = 300;   // CT-04: リクエスト間隔 >= 300ms
const BACKOFFS = [2000, 5000, 10000]; // 指数バックオフ(EV-JGRANTS-003)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** レート制限/一時エラーに強いGET-JSON。429/5xxはバックオフ再試行。 */
async function getJSON(url, label) {
  for (let attempt = 0; attempt <= BACKOFFS.length; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status === 429 || res.status >= 500) {
        if (attempt < BACKOFFS.length) {
          const wait = BACKOFFS[attempt];
          process.stderr.write(`  ! ${res.status} on ${label} — retry in ${wait}ms\n`);
          await sleep(wait);
          continue;
        }
        throw new Error(`HTTP ${res.status} after retries: ${label}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${label}`);
      return await res.json();
    } catch (e) {
      if (attempt < BACKOFFS.length) {
        const wait = BACKOFFS[attempt];
        process.stderr.write(`  ! ${e.message} — retry in ${wait}ms\n`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
}

/** 一覧APIをキーワード巡回し id で重複排除して収集。 */
async function collectList() {
  const map = new Map();
  for (const kw of KEYWORDS) {
    const url = `${LIST_URL}?keyword=${encodeURIComponent(kw)}&sort=created_date&order=DESC&acceptance=1`;
    let json;
    try {
      json = await getJSON(url, `list:${kw}`);
    } catch (e) {
      process.stderr.write(`  x list "${kw}" failed: ${e.message}\n`);
      continue;
    }
    const results = (json && json.result) || [];
    for (const r of results) {
      if (r && r.id && !map.has(r.id)) map.set(r.id, r);
    }
    process.stdout.write(`  + "${kw}": ${results.length} hits (unique total: ${map.size})\n`);
    await sleep(REQUEST_INTERVAL_MS);
  }
  return map;
}

function cachePathFor(id) { return path.join(CACHE_DIR, `${id}.json`); }

function readCache(id) {
  const p = cachePathFor(id);
  try {
    const st = fs.statSync(p);
    const ageDays = (Date.now() - st.mtimeMs) / 86400000;
    if (ageDays > CACHE_TTL_DAYS) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return null; }
}

function writeCache(id, obj) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePathFor(id), JSON.stringify(obj), 'utf8');
}

/** 詳細APIで industry/use_purpose を取得(増分キャッシュ)。 */
async function enrich(id) {
  const cached = readCache(id);
  if (cached) return cached;
  const json = await getJSON(DETAIL_URL(id), `detail:${id}`);
  const d = (json && json.result && json.result[0]) || {};
  const out = { industry: d.industry || '', use_purpose: d.use_purpose || '' };
  writeCache(id, out);
  await sleep(REQUEST_INTERVAL_MS);
  return out;
}

/** 一覧レコード + エンリッチ結果 を正規化。 */
function normalize(r, extra) {
  return {
    id: r.id,
    code: r.name || '',
    title: r.title || '',
    max_limit: typeof r.subsidy_max_limit === 'number' ? r.subsidy_max_limit : null,
    start: r.acceptance_start_datetime || null,
    end: r.acceptance_end_datetime || null,
    area: r.target_area_search || '',
    employees: r.target_number_of_employees || '',
    industry: (extra && extra.industry) || '',
    use_purpose: (extra && extra.use_purpose) || '',
    url: PUBLIC_URL(r.id),
  };
}

async function main() {
  process.stdout.write(`jGrants 取得開始 (keywords=${KEYWORDS.length}, dry-run=${DRY_RUN}, no-detail=${NO_DETAIL})\n`);
  const listMap = await collectList();

  let ids = Array.from(listMap.keys());
  if (LIMIT) ids = ids.slice(0, LIMIT);
  process.stdout.write(`収集ユニーク件数: ${listMap.size}${LIMIT ? ` (limit適用: ${ids.length})` : ''}\n`);

  const items = [];
  let done = 0;
  for (const id of ids) {
    let extra = { industry: '', use_purpose: '' };
    if (!NO_DETAIL) {
      try { extra = await enrich(id); }
      catch (e) { process.stderr.write(`  x detail ${id} failed: ${e.message}\n`); }
    }
    items.push(normalize(listMap.get(id), extra));
    if (++done % 50 === 0) process.stdout.write(`  ...enriched ${done}/${ids.length}\n`);
  }

  const payload = {
    fetched_at: new Date().toISOString().slice(0, 10),
    source: '出典: jGrants（デジタル庁） https://www.jgrants-portal.go.jp/',
    count: items.length,
    items,
  };

  if (DRY_RUN) {
    process.stdout.write(`\n[dry-run] 書換なし。生成予定: ${items.length}件\n`);
    return;
  }
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 0), 'utf8');
  process.stdout.write(`\n✔ 書き出し完了: ${OUT_FILE} (${items.length}件)\n`);
}

main().catch((e) => { process.stderr.write(`FATAL: ${e.stack || e}\n`); process.exit(1); });
