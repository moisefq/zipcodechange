const STORAGE_KEY = "zip-price-dashboard-data";
const PAGE_SIZE = 12;

const state = {
  data: [],
  filtered: [],
  page: 1,
  sort: "zip-asc",
  query: "",
  priceFilter: "all",
  editingIndex: null
};

const $ = (id) => document.getElementById(id);

const refs = {
  statTotal: $("statTotal"),
  statAvg: $("statAvg"),
  statMin: $("statMin"),
  statMax: $("statMax"),
  searchInput: $("searchInput"),
  clearSearch: $("clearSearch"),
  sortSelect: $("sortSelect"),
  priceFilter: $("priceFilter"),
  resultCount: $("resultCount"),
  tableBody: $("tableBody"),
  pagination: $("pagination"),
  modalOverlay: $("modalOverlay"),
  modalTitle: $("modalTitle"),
  modalSubtitle: $("modalSubtitle"),
  zipInput: $("zipInput"),
  cityInput: $("cityInput"),
  priceInput: $("priceInput"),
  saveModal: $("saveModal"),
  cancelModal: $("cancelModal"),
  closeModal: $("closeModal"),
  addBtn: $("addBtn"),
  exportBtn: $("exportBtn"),
  importBtn: $("importBtn"),
  importInput: $("importInput"),
  resetBtn: $("resetBtn"),
  toast: $("toast")
};

init();

function init() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      state.data = JSON.parse(stored).map(normalizeRow);
    } catch {
      state.data = window.initialZipData.map(normalizeRow);
    }
  } else {
    state.data = window.initialZipData.map(normalizeRow);
  }

  bindEvents();
  applyFilters();
  renderAll();
}

function bindEvents() {
  refs.searchInput.addEventListener("input", () => {
    state.query = refs.searchInput.value.trim().toLowerCase();
    refs.clearSearch.classList.toggle("visible", !!state.query);
    state.page = 1;
    applyFilters();
    renderAll();
  });

  refs.clearSearch.addEventListener("click", () => {
    refs.searchInput.value = "";
    state.query = "";
    refs.clearSearch.classList.remove("visible");
    state.page = 1;
    applyFilters();
    renderAll();
  });

  refs.sortSelect.addEventListener("change", () => {
    state.sort = refs.sortSelect.value;
    state.page = 1;
    applyFilters();
    renderAll();
  });

  refs.priceFilter.addEventListener("change", () => {
    state.priceFilter = refs.priceFilter.value;
    state.page = 1;
    applyFilters();
    renderAll();
  });

  refs.addBtn.addEventListener("click", () => openModal());
  refs.cancelModal.addEventListener("click", closeModal);
  refs.closeModal.addEventListener("click", closeModal);
  refs.modalOverlay.addEventListener("click", (e) => {
    if (e.target === refs.modalOverlay) closeModal();
  });

  refs.saveModal.addEventListener("click", saveModal);

  refs.exportBtn.addEventListener("click", exportData);
  refs.importBtn.addEventListener("click", () => refs.importInput.click());
  refs.importInput.addEventListener("change", importData);

  refs.resetBtn.addEventListener("click", resetData);

  refs.tableBody.addEventListener("click", handleTableActions);
  refs.tableBody.addEventListener("dblclick", handleQuickEdit);

  refs.tableBody.addEventListener("input", () => {
    // prevents accidental bubbling issues with controls
  });

  refs.tableBody.addEventListener("mousedown", (e) => {
    const priceCell = e.target.closest("[data-quick-edit]");
    if (priceCell) {
      e.preventDefault();
    }
  });
}

function normalizeRow(row) {
  return {
    zip: String(row.zip).trim(),
    city: String(row.city).trim(),
    price: Number.parseFloat(row.price)
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function applyFilters() {
  let list = [...state.data];

  if (state.query) {
    list = list.filter((row) =>
      row.zip.includes(state.query) ||
      row.city.toLowerCase().includes(state.query)
    );
  }

  list = list.filter((row) => {
    const p = Number(row.price);
    switch (state.priceFilter) {
      case "under16": return p < 16;
      case "16to17": return p >= 16 && p < 17;
      case "17to18": return p >= 17 && p < 18;
      case "over18": return p >= 18;
      default: return true;
    }
  });

  const [col, dir] = state.sort.split("-");
  list.sort((a, b) => {
    let av = a[col];
    let bv = b[col];

    if (col === "price") {
      av = Number(av);
      bv = Number(bv);
    } else {
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
    }

    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });

  state.filtered = list;
}

function renderAll() {
  renderStats();
  renderTable();
  renderPagination();
}

function renderStats() {
  const total = state.data.length;
  const prices = state.data.map((r) => Number(r.price)).filter((n) => !Number.isNaN(n));
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;

  refs.statTotal.textContent = total.toLocaleString();
  refs.statAvg.textContent = `$${avg.toFixed(2)}`;
  refs.statMin.textContent = `$${min.toFixed(2)}`;
  refs.statMax.textContent = `$${max.toFixed(2)}`;
  refs.resultCount.textContent = `${state.filtered.length.toLocaleString()} result${state.filtered.length === 1 ? "" : "s"}`;
}

function renderTable() {
  const start = (state.page - 1) * PAGE_SIZE;
  const rows = state.filtered.slice(start, start + PAGE_SIZE);

  if (!rows.length) {
    refs.tableBody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="empty-row">No ZIP records match your search or filters.</div>
        </td>
      </tr>
    `;
    return;
  }

  refs.tableBody.innerHTML = rows.map((row) => {
    const realIndex = state.data.findIndex((r) => r.zip === row.zip && r.city === row.city && Number(r.price) === Number(row.price));
    return `
      <tr data-index="${realIndex}">
        <td class="zip-cell">${escapeHtml(row.zip)}</td>
        <td class="city-cell">${escapeHtml(row.city)}</td>
        <td class="price-cell" data-quick-edit="1" title="Double-click to edit">$${Number(row.price).toFixed(2)}</td>
        <td>
          <div class="actions">
            <button class="btn btn-secondary" data-action="edit" data-index="${realIndex}">Edit</button>
            <button class="btn btn-secondary" data-action="delete" data-index="${realIndex}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
  if (totalPages === 1) {
    refs.pagination.innerHTML = "";
    return;
  }

  const pages = getPageRange(state.page, totalPages);
  let html = "";

  html += `<button class="page-btn" ${state.page === 1 ? "disabled" : ""} data-page="${state.page - 1}">‹</button>`;

  pages.forEach((p) => {
    if (p === "...") {
      html += `<span class="page-btn" style="pointer-events:none">…</span>`;
    } else {
      html += `<button class="page-btn ${p === state.page ? "active" : ""}" data-page="${p}">${p}</button>`;
    }
  });

  html += `<button class="page-btn" ${state.page === totalPages ? "disabled" : ""} data-page="${state.page + 1}">›</button>`;
  refs.pagination.innerHTML = html;

  refs.pagination.querySelectorAll(".page-btn[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = Number(btn.dataset.page);
      if (!Number.isNaN(next) && next >= 1 && next <= totalPages) {
        state.page = next;
        renderAll();
      }
    });
  });
}

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function handleTableActions(e) {
  const actionBtn = e.target.closest("[data-action]");
  if (!actionBtn) return;

  const index = Number(actionBtn.dataset.index);
  const action = actionBtn.dataset.action;
  const row = state.data[index];
  if (!row) return;

  if (action === "edit") {
    openModal(row, index);
  }

  if (action === "delete") {
    if (confirm(`Delete ${row.zip} — ${row.city}?`)) {
      state.data.splice(index, 1);
      persist();
      applyFilters();
      renderAll();
      toastMessage("ZIP deleted");
    }
  }
}

function handleQuickEdit(e) {
  const cell = e.target.closest("[data-quick-edit]");
  const rowEl = e.target.closest("tr[data-index]");
  if (!cell || !rowEl) return;

  const index = Number(rowEl.dataset.index);
  const row = state.data[index];
  if (row) openModal(row, index);
}

function openModal(row = null, index = null) {
  state.editingIndex = index;
  const isEdit = row !== null;

  refs.modalTitle.textContent = isEdit ? "Edit ZIP" : "Add ZIP";
  refs.modalSubtitle.textContent = isEdit
    ? "Update ZIP, city, or price"
    : "Create a new ZIP record";

  refs.zipInput.value = row ? row.zip : "";
  refs.cityInput.value = row ? row.city : "";
  refs.priceInput.value = row ? row.price : "";

  refs.modalOverlay.classList.add("open");
  refs.zipInput.focus();
}

function closeModal() {
  refs.modalOverlay.classList.remove("open");
  state.editingIndex = null;
}

function saveModal() {
  const zip = refs.zipInput.value.trim();
  const city = refs.cityInput.value.trim();
  const price = Number.parseFloat(refs.priceInput.value);

  if (!/
^
\d{5}
$
/.test(zip)) {
    toastMessage("ZIP must be exactly 5 digits");
    return;
  }

  if (!city) {
    toastMessage("City is required");
    return;
  }

  if (Number.isNaN(price) || price < 0) {
    toastMessage("Enter a valid price");
    return;
  }

  const payload = normalizeRow({ zip, city, price });

  const duplicateIndex = state.data.findIndex((r, i) => r.zip === payload.zip && i !== state.editingIndex);
  if (duplicateIndex !== -1) {
    toastMessage("That ZIP already exists");
    return;
  }

  if (state.editingIndex === null || state.editingIndex === undefined) {
    state.data.unshift(payload);
    toastMessage("ZIP added");
  } else {
    state.data[state.editingIndex] = payload;
    toastMessage("ZIP updated");
  }

  persist();
  closeModal();
  applyFilters();
  renderAll();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "zip-price-data.json";
  a.click();
  URL.revokeObjectURL(url);
  toastMessage("JSON exported");
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);

      const incoming = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.data)
          ? parsed.data
          : null;

      if (!incoming) throw new Error("Invalid JSON format");

      state.data = incoming.map(normalizeRow).filter((row) => /
^
\d{5}
$
/.test(row.zip) && row.city);
      persist();
      applyFilters();
      renderAll();
      toastMessage("JSON imported");
    } catch (err) {
      toastMessage("Import failed: invalid JSON");
    } finally {
      refs.importInput.value = "";
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm("Reset all changes and restore the original data?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state.data = window.initialZipData.map(normalizeRow);
  state.page = 1;
  state.sort = "zip-asc";
  state.query = "";
  state.priceFilter = "all";

  refs.searchInput.value = "";
  refs.sortSelect.value = "zip-asc";
  refs.priceFilter.value = "all";
  refs.clearSearch.classList.remove("visible");

  applyFilters();
  renderAll();
  toastMessage("Data reset");
}

function toastMessage(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => refs.toast.classList.remove("show"), 2200);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', "&quot;");
}
