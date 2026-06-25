/* ── State ───────────────────────── */
const S = {
  data:      [],       // flat array built from priceMap
  filtered:  [],       // after search/sort/filter
  page:      1,
  perPage:   15,
  view:      'table',  // 'table' | 'card'
  sort:      'zip-asc',
  query:     '',
  minPrice:  null,
  maxPrice:  null,
};

/* ── Refs ────────────────────────── */
const g  = id => document.getElementById(id);
const searchInput = g('searchInput');
const clearBtn    = g('clearBtn');
const lookupBtn   = g('lookupBtn');
const resultInner = g('resultInner');
const tableBody   = g('tableBody');
const cardView    = g('cardView');
const tableView   = g('tableView');
const pagination  = g('pagination');
const tableCount  = g('tableCount');
const sortSelect  = g('sortSelect');
const minPrice    = g('minPrice');
const maxPrice    = g('maxPrice');
const toast       = g('toast');

/* ── Boot ────────────────────────── */
(function init() {
  // Build flat array from priceMap
  S.data = Object.entries(priceMap).map(([zip, d]) => ({
    zip,
    city:  d.city,
    price: parseFloat(d.price),
  }));

  computeStats();
  applyFilters();
  bindAll();
})();

/* ── Bind Events ─────────────────── */
function bindAll() {
  // Search input
  searchInput.addEventListener('input', () => {
    S.query = searchInput.value.trim();
    clearBtn.classList.toggle('visible', S.query.length > 0);
    S.page = 1;
    applyFilters();
  });

  // Clear
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    S.query = '';
    clearBtn.classList.remove('visible');
    S.page = 1;
    resultInner.className = '';
    resultInner.innerHTML = '';
    applyFilters();
    searchInput.focus();
  });

  // Lookup button (exact ZIP search)
  lookupBtn.addEventListener('click', doLookup);
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLookup();
  });

  // Sort
  sortSelect.addEventListener('change', () => {
    S.sort = sortSelect.value;
    S.page = 1;
    applyFilters();
  });

  // Price range
  minPrice.addEventListener('input', () => { S.minPrice = minPrice.value ? parseFloat(minPrice.value) : null; S.page = 1; applyFilters(); });
  maxPrice.addEventListener('input', () => { S.maxPrice = maxPrice.value ? parseFloat(maxPrice.value) : null; S.page = 1; applyFilters(); });

  // View toggle
  g('tableViewBtn').addEventListener('click', () => setView('table'));
  g('cardViewBtn').addEventListener('click',  () => setView('card'));

  // Table header sort
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      const cur = S.sort;
      if (cur === `${col}-asc`)  S.sort = `${col}-desc`;
      else                        S.sort = `${col}-asc`;
      sortSelect.value = S.sort;
      S.page = 1;
      applyFilters();
      updateSortHeaders();
    });
  });
}

/* ── Exact Lookup ────────────────── */
function doLookup() {
  const q   = searchInput.value.trim();
  const zip = q.replace(/\D/g, '');

  // Try exact ZIP first
  const byZip = priceMap[q] || priceMap[zip];
  if (byZip) {
    showResult({ zip: q || zip, ...byZip }, true);
    return;
  }

  // Try city match
  const cityMatch = S.data.find(d => d.city.toLowerCase() === q.toLowerCase());
  if (cityMatch) {
    showResult({ zip: cityMatch.zip, city: cityMatch.city, price: cityMatch.price.toFixed(2) }, true);
    return;
  }

  showResult(null, false, q);
}

function showResult(data, found, query = '') {
  if (found) {
    resultInner.className = 'success';
    resultInner.innerHTML = `
      <div class="result-row">
        <div class="result-badge ok">📍</div>
        <div class="result-info">
          <div class="result-city">${esc(data.city)}</div>
          <div class="result-zip">ZIP: ${esc(data.zip)}</div>
        </div>
      </div>
      <div class="result-price">$${parseFloat(data.price).toFixed(2)}</div>
    `;
  } else {
    resultInner.className = 'error';
    resultInner.innerHTML = `
      <div class="result-row">
        <div class="result-badge err">❌</div>
        <div class="result-err-msg">No results found for "<strong>${esc(query)}</strong>"</div>
      </div>
    `;
  }
}

/* ── Filter + Sort + Paginate ────── */
function applyFilters() {
  let list = [...S.data];

  // Text filter
  if (S.query) {
    const q = S.query.toLowerCase();
    list = list.filter(d => d.zip.includes(q) || d.city.toLowerCase().includes(q));
  }

  // Price range
  if (S.minPrice !== null) list = list.filter(d => d.price >= S.minPrice);
  if (S.maxPrice !== null) list = list.filter(d => d.price <= S.maxPrice);

  // Sort
  const [col, dir] = S.sort.split('-');
  list.sort((a, b) => {
    let va = a[col], vb = b[col];
    if (col === 'price') { va = parseFloat(va); vb = parseFloat(vb); }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  S.filtered = list;
  tableCount.textContent = `${list.length.toLocaleString()} result${list.length !== 1 ? 's' : ''}`;

  render();
}

/* ── Render ──────────────────────── */
function render() {
  const start = (S.page - 1) * S.perPage;
  const page  = S.filtered.slice(start, start + S.perPage);

  if (S.view === 'table') renderTable(page);
  else                    renderCards(page);

  renderPagination();
  updateSortHeaders();
}

function renderTable(rows) {
  if (!rows.length) {
    tableBody.innerHTML = `
      <tr><td colspan="4">
        <div class="empty-msg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          No locations match your filters.
        </div>
      </td></tr>`;
    return;
  }
  tableBody.innerHTML = rows.map(d => `
    <tr>
      <td class="td-zip">${highlight(d.zip, S.query)}</td>
      <td class="td-city">${highlight(d.city, S.query)}</td>
      <td class="td-price">$${d.price.toFixed(2)}</td>
      <td><button class="action-btn" onclick="doQuickLookup('${d.zip}')">View</button></td>
    </tr>
  `).join('');
}

function renderCards(items) {
  if (!items.length) {
    cardView.innerHTML = `<div class="empty-msg" style="grid-column:1/-1">No locations match your filters.</div>`;
    return;
  }
  cardView.innerHTML = items.map(d => `
    <div class="loc-card" onclick="doQuickLookup('${d.zip}')">
      <div class="lc-zip">${highlight(d.zip, S.query)}</div>
      <div class="lc-city">${highlight(d.city, S.query)}</div>
      <div class="lc-price">$${d.price.toFixed(2)}</div>
    </div>
  `).join('');
}

/* ── Pagination ──────────────────── */
function renderPagination() {
  const total = Math.ceil(S.filtered.length / S.perPage);
  if (total <= 1) { pagination.innerHTML = ''; return; }

  let html = '';
  // Prev
  html += `<button class="page-btn" ${S.page === 1 ? 'disabled' : ''} onclick="goPage(${S.page - 1})">‹</button>`;

  // Pages
  const pages = getPageRange(S.page, total);
  pages.forEach(p => {
    if (p === '…') html += `<span class="page-ellipsis">…</span>`;
    else html += `<button class="page-btn ${p === S.page ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
  });

  // Next
  html += `<button class="page-btn" ${S.page === total ? 'disabled' : ''} onclick="goPage(${S.page + 1})">›</button>`;
  pagination.innerHTML = html;
}

function getPageRange(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 4)   return [1, 2, 3, 4, 5, '…', total];
  if (cur >= total - 3) return [1, '…', total-4, total-3, total-2, total-1, total];
  return [1, '…', cur-1, cur, cur+1, '…', total];
}

function goPage(p) {
  S.page = p;
  render();
  window.scrollTo({ top: document.querySelector('.table-section').offsetTop - 80, behavior: 'smooth' });
}

/* ── View Toggle ─────────────────── */
function setView(v) {
  S.view = v;
  g('tableViewBtn').classList.toggle('active', v === 'table');
  g('cardViewBtn').classList.toggle('active',  v === 'card');
  tableView.classList.toggle('hidden', v !== 'table');
  cardView.classList.toggle('hidden',  v !== 'card');
  render();
}

/* ── Quick Lookup (from table/card) ─ */
function doQuickLookup(zip) {
  const d = priceMap[zip];
  if (!d) return;
  searchInput.value = zip;
  S.query = zip;
  clearBtn.classList.add('visible');
  showResult({ zip, ...d }, true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`Viewing ${d.city} — $${d.price}`);
}

/* ── Stats ───────────────────────── */
function computeStats() {
  const prices = S.data.map(d => d.price);
  const avg    = prices.reduce((a, b) => a + b, 0) / prices.length;
  const min    = Math.min(...prices);
  const max    = Math.max(...prices);

  g('statTotal').textContent = S.data.length.toLocaleString();
  g('statAvg').textContent   = `$${avg.toFixed(2)}`;
  g('statMin').textContent   = `$${min.toFixed(2)}`;
  g('statMax').textContent   = `$${max.toFixed(2)}`;
}

/* ── Sort Headers ────────────────── */
function updateSortHeaders() {
  const [col] = S.sort.split('-');
  document.querySelectorAll('th.sortable').forEach(th => {
    th.classList.toggle('sorted', th.dataset.col === col);
    const arrow = th.querySelector('.sort-arrow');
    if (th.dataset.col === col) {
      arrow.textContent = S.sort.endsWith('asc') ? '↑' : '↓';
      arrow.style.opacity = '1';
    } else {
      arrow.textContent = '↕';
      arrow.style.opacity = '0.5';
    }
  });
}

/* ── Toast ───────────────────────── */
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ── Utils ───────────────────────── */
function esc(s) {
  return String(s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>');
}

function highlight(text, query) {
  if (!query) return esc(text);
  const safe = esc(text);
  const q    = esc(query);
  return safe.replace(new RegExp(`(${q})`, 'gi'), '<mark>$1</mark>');
}
