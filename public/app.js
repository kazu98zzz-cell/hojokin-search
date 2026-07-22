/**
 * app.js — ブラウザ内検索UI。data/subsidies.json を読み、filters.js で絞り込み描画する。
 * 外部への通信は行わない（同梱JSONのみ）。CT-01 / NFR-COST-001。
 * XSS対策: DOM生成は createElement + textContent のみ（innerHTML直挿し禁止）。CT-06。
 */
(function () {
  'use strict';
  var F = window.Filters;

  var state = { keyword: '', pref: '', industry: '', minAmount: 0, openOnly: true, sort: 'end-asc' };
  var ALL = [];

  var $ = function (id) { return document.getElementById(id); };
  var els = {};

  function yen(n) {
    if (n == null || n === 0) return '—';
    return '¥' + n.toLocaleString('ja-JP');
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
  }
  function daysLeft(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86400000);
  }

  function sortItems(items) {
    var arr = items.slice();
    if (state.sort === 'end-asc') {
      arr.sort(function (a, b) { return (a.end || '9999').localeCompare(b.end || '9999'); });
    } else if (state.sort === 'amount-desc') {
      arr.sort(function (a, b) { return (b.max_limit || 0) - (a.max_limit || 0); });
    } else if (state.sort === 'start-desc') {
      arr.sort(function (a, b) { return (b.start || '').localeCompare(a.start || ''); });
    }
    return arr;
  }

  /** 1件のカードDOMを生成（textContentのみ使用）。 */
  function card(it) {
    var li = document.createElement('li');
    li.className = 'card';

    var h = document.createElement('h2');
    h.className = 'card-title';
    h.textContent = it.title || '(名称不明)';
    li.appendChild(h);

    var meta = document.createElement('div');
    meta.className = 'card-meta';
    var dl = daysLeft(it.end);
    var badges = [
      { k: '上限額', v: yen(it.max_limit) },
      { k: '締切', v: fmtDate(it.end) + (dl != null && dl >= 0 ? '（あと' + dl + '日）' : '') },
      { k: '地域', v: it.area || '—' },
    ];
    badges.forEach(function (b) {
      var span = document.createElement('span');
      span.className = 'badge';
      var k = document.createElement('span'); k.className = 'badge-k'; k.textContent = b.k;
      var v = document.createElement('span'); v.className = 'badge-v'; v.textContent = b.v;
      span.appendChild(k); span.appendChild(v);
      meta.appendChild(span);
    });
    li.appendChild(meta);

    if (it.industry || it.use_purpose) {
      var tags = document.createElement('div');
      tags.className = 'card-tags';
      [it.industry, it.use_purpose].forEach(function (t) {
        if (!t) return;
        var el = document.createElement('span');
        el.className = 'tag';
        el.textContent = t;
        tags.appendChild(el);
      });
      li.appendChild(tags);
    }

    var a = document.createElement('a');
    a.className = 'card-link';
    a.href = it.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = '公式詳細ページを見る →';
    li.appendChild(a);

    return li;
  }

  function render() {
    var filtered = F.applyFilters(ALL, {
      keyword: state.keyword, pref: state.pref, industry: state.industry,
      minAmount: state.minAmount, openOnly: state.openOnly,
    });
    var items = sortItems(filtered);

    els.count.textContent = '該当 ' + items.length.toLocaleString('ja-JP') + ' 件 / 全 ' + ALL.length.toLocaleString('ja-JP') + ' 件';
    els.list.textContent = '';
    els.empty.hidden = items.length !== 0;

    var frag = document.createDocumentFragment();
    // 描画上限（体感速度確保）。超過分はスクロール不要な範囲に留める。
    var MAX = 300;
    items.slice(0, MAX).forEach(function (it) { frag.appendChild(card(it)); });
    els.list.appendChild(frag);
    if (items.length > MAX) {
      var note = document.createElement('li');
      note.className = 'more-note';
      note.textContent = '上位 ' + MAX + ' 件を表示中です。条件を追加して絞り込んでください。';
      els.list.appendChild(note);
    }
  }

  function populateSelects() {
    F.PREFECTURES.forEach(function (p) {
      var o = document.createElement('option'); o.value = p; o.textContent = p; els.pref.appendChild(o);
    });
    F.extractIndustries(ALL).forEach(function (ind) {
      var o = document.createElement('option'); o.value = ind; o.textContent = ind; els.industry.appendChild(o);
    });
  }

  function bind() {
    els.keyword.addEventListener('input', function () { state.keyword = this.value; render(); });
    els.pref.addEventListener('change', function () { state.pref = this.value; render(); });
    els.industry.addEventListener('change', function () { state.industry = this.value; render(); });
    els.amount.addEventListener('change', function () { state.minAmount = parseInt(this.value, 10) || 0; render(); });
    els.open.addEventListener('change', function () { state.openOnly = this.checked; render(); });
    els.sort.addEventListener('change', function () { state.sort = this.value; render(); });
    els.reset.addEventListener('click', function () {
      state = { keyword: '', pref: '', industry: '', minAmount: 0, openOnly: true, sort: 'end-asc' };
      els.keyword.value = ''; els.pref.value = ''; els.industry.value = '';
      els.amount.value = '0'; els.open.checked = true; els.sort.value = 'end-asc';
      render();
    });
  }

  function init() {
    els = {
      keyword: $('f-keyword'), pref: $('f-pref'), industry: $('f-industry'),
      amount: $('f-amount'), open: $('f-open'), sort: $('f-sort'), reset: $('f-reset'),
      count: $('count'), list: $('list'), empty: $('empty'), source: $('source'),
    };
    bind();
    fetch('data/subsidies.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('データ読込失敗 (' + r.status + ')'); return r.json(); })
      .then(function (data) {
        ALL = (data && data.items) || [];
        els.source.textContent = (data.source || '出典: jGrants（デジタル庁）') + '（データ取得日: ' + (data.fetched_at || '不明') + '）';
        populateSelects();
        render();
      })
      .catch(function (e) {
        els.count.textContent = '';
        els.empty.hidden = false;
        els.empty.textContent = 'データを読み込めませんでした（' + e.message + '）。fetch-data.js を実行して data/subsidies.json を生成してください。';
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
