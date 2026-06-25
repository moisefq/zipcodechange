/* ── Config ──────────────────────── */
const PAGE_SIZE = 25;

/* ── State ───────────────────────── */
let filtered  = [];
let currentPage = 1;
let sortCol   = 'zip';
let sortDir   = 'asc';

/* ── DOM ─────────────────────────── */
const searchInput   = document.getElementById('searchInput');
const clearBtn      = document.getElementById('clearBtn');
const sortSelect    = document.getElementById('sortSelect');
const priceFilter   = document.getElementById('priceFilter');
const tableBody     = document.getElementById('tableBody');
const emptyState    = document.getElementById('emptyState');
const pagination    = document.getElementById('pagination');
const resultCount   = document.getElementById('resultCount');
const avgPrice      = document.getElementById('avgPrice');
const minPrice      = document.getElementById('minPrice');
const maxPrice      = document.getElementById('maxPrice');
const totalCount    = document.getElementById('totalCount');
const spotlightCard = document.getElementById('spotlightCard');
const spotZip       = document.getElementById('spotZip');
const spotCity      = document.getElementById('spotCity');
const spotPrice     = document.getElementById('spotPrice');
const toast         = document.getElementById('toast');

/* ── Boot ────────────────────────── */
(function init() {
  totalCount.textContent = `${zipData.length.toLocaleString()} ZIPs loaded`;
  filtered = [...zipData];
  applySort();
  render();
  bindEvents();
})();

/* ── Bind ────────────────────────── */
function bindEvents() {
  searchInput.addEventListener('input', onSearch);
  clearBtn.addEventListener('click', clearSearch);
  sortSelect.addEventListener('change', onSortChange);
  priceFilter.addEventListener('change', onSearch);

  // Sortable column headers
  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (sortCol === col) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortCol = col;
        sortDir = 'asc';
      }
      applySort();
      render();
      updateHeaderArrows();
    });
  });
}

/* ── Search ──────────────────────── */
function onSearch() {
  const q = searchInput.value.trim().toLowerCase();
  clearBtn.classList.toggle('hidden', q.length === 0);

  const pf = priceFilter.value;

  filtered = zipData.filter(row => {
    const matchSearch = !q
      || row.zip.includes(q)
      || row.city.toLowerCase().includes(q);

    const p = parseFloat(row.price);
    const matchPrice =
      pf === 'all'      ? true :
      pf === 'under16'  ? p < 16 :
      pf === '16to17'   ? p >= 16 && p < 17 :
      pf === '17to18'   ? p >= 17 && p < 18 :
      pf === 'over18'   ? p >= 18 : true;

    return matchSearch && matchPrice;
  });

  // Exact ZIP match → spotlight
  const exact = zipData.find(r => r.zip === searchInput.value.trim());
  if (exact) showSpotlight(exact);
  else hideSpotlight();

  applySort();
  currentPage = 1;
  render();
}

function clearSearch() {
  searchInput.value = '';
  clearBtn.classList.add('hidden');
  hideSpotlight();
  filtered = [...zipData];
  applySort();
  currentPage = 1;
  render();
  searchInput.focus();
}

/* ── Sort ────────────────────────── */
function onSortChange() {
  const val = sortSelect.value;
  [sortCol, sortDir] = val.split('-');
  applySort();
  render();
}

function applySort() {
  filtered.sort((a, b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (sortCol === 'price') {
      av = parseFloat(av); bv = parseFloat(bv);
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

function updateHeaderArrows() {
  document.querySelectorAll('.sortable').forEach(th => {
    th.classList.remove('active');
    th.querySelector('.sort-arrow').textContent = '↕';
  });
  const active = document.querySelector(`.sortable[data-col="${sortCol}"]`);
  if (active) {
    active.classList.add('active');
    active.querySelector('.sort-arrow').textContent = sortDir

