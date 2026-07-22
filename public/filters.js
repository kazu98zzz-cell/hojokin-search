/**
 * filters.js — 検索・絞り込みの純粋ロジック（UI非依存・テスト可能）。
 * ブラウザ(app.js)と Node単体テスト(tests/)の両方から使う。
 * 依存ゼロ。CT-10。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Filters = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** 全角→半角、カナ差異吸収、小文字化して比較しやすくする。 */
  function normalizeText(s) {
    if (!s) return '';
    return String(s)
      .normalize('NFKC')       // 全角英数記号→半角、半角カナ→全角カナ 等
      .toLowerCase()
      .replace(/\s+/g, '');    // 空白除去でゆらぎ吸収
  }

  /** industry文字列を大分類トークンへ分割（区切りは「 / 」のみ。「、」は名称の一部）。 */
  function splitIndustry(industry) {
    return (industry || '')
      .split(/\s*\/\s*/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  /** 都道府県抽出用。areaは「全国」または都道府県名/自治体名を含む文字列。 */
  function areaMatches(itemArea, selectedPref) {
    if (!selectedPref) return true;                 // 未指定=全件
    const a = itemArea || '';
    if (a.includes('全国')) return true;            // 全国対象は常にヒット
    return a.includes(selectedPref);
  }

  /**
   * items をフィルタ条件で絞り込む。
   * state: { keyword, pref, industry, minAmount, openOnly, now }
   */
  function applyFilters(items, state) {
    const st = state || {};
    const kw = normalizeText(st.keyword);
    const industry = st.industry || '';
    const minAmount = typeof st.minAmount === 'number' ? st.minAmount : null;
    const openOnly = !!st.openOnly;
    const now = st.now ? new Date(st.now) : new Date();

    return (items || []).filter(function (it) {
      // キーワード: 名称/業種/目的/コードへの部分一致
      if (kw) {
        const hay = normalizeText(
          (it.title || '') + ' ' + (it.industry || '') + ' ' +
          (it.use_purpose || '') + ' ' + (it.code || '')
        );
        if (hay.indexOf(kw) === -1) return false;
      }
      // 地域
      if (!areaMatches(it.area, st.pref)) return false;
      // 業種：industryは日本標準産業分類の大分類を「 / 」で連結した文字列。
      // 「、」はカテゴリ名の一部（例「医療、福祉」）なので分割はスラッシュのみ。トークン完全一致で判定。
      if (industry) {
        if (splitIndustry(it.industry).indexOf(industry) === -1) return false;
      }
      // 金額（上限額の下限）。max_limit が null/0 の補助金は金額不明として、下限指定時は除外。
      if (minAmount !== null && minAmount > 0) {
        if (!it.max_limit || it.max_limit < minAmount) return false;
      }
      // 募集中のみ（締切が現在以降）
      if (openOnly) {
        if (!it.end) return false;
        if (new Date(it.end).getTime() < now.getTime()) return false;
      }
      return true;
    });
  }

  /** 業種の選択肢を items から抽出（大分類トークンに分割・ユニーク化）。 */
  function extractIndustries(items) {
    const set = new Set();
    (items || []).forEach(function (it) {
      splitIndustry(it.industry).forEach(function (t) { set.add(t); });
    });
    return Array.from(set).sort();
  }

  /** 都道府県の選択肢（固定47＋主要表記）。 */
  var PREFECTURES = [
    '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
    '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
    '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
    '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
    '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
    '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
    '熊本県','大分県','宮崎県','鹿児島県','沖縄県',
  ];

  return {
    normalizeText: normalizeText,
    areaMatches: areaMatches,
    applyFilters: applyFilters,
    extractIndustries: extractIndustries,
    splitIndustry: splitIndustry,
    PREFECTURES: PREFECTURES,
  };
});
