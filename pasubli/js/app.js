/* ─────────────────────────────────────────────────────────
   PASUBLI — app.js
   Handles: PHP/MySQL API CRUD, search/filter, modals, toasts
───────────────────────────────────────────────────────── */
const API_URL = "php/products.php";

/* ── State ─────────────────────────────────────────────── */
let listings = [];
let editingId = null;
let deletingId = null;

/* ── DOM refs ──────────────────────────────────────────── */
const tableBody = document.getElementById("tableBody");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const addBtn = document.getElementById("addBtn");
const saveBtn = document.getElementById("saveBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

const statTotal = document.getElementById("statTotal");
const statCategories = document.getElementById("statCategories");
const statStock = document.getElementById("statStock");
const listingCount = document.getElementById("listingCount");
const searchMeta = document.getElementById("searchMeta");
const clearSearchBtn = document.getElementById("clearSearchBtn");

const formModal = document.getElementById("formModal");
const confirmModal = document.getElementById("confirmModal");
const formAlert = document.getElementById("formAlert");
const confirmName = document.getElementById("confirmName");
const formModalTitle = document.getElementById("formModalTitle");

const fields = {
  product_id: document.getElementById("product_id"),
  product_name: document.getElementById("product_name"),
  category: document.getElementById("category"),
  rental_price: document.getElementById("rental_price"),
  stock_qty: document.getElementById("stock_qty"),
};

const errors = {
  product_id: document.getElementById("err_product_id"),
  product_name: document.getElementById("err_product_name"),
  category: document.getElementById("err_category"),
  rental_price: document.getElementById("err_rental_price"),
  stock_qty: document.getElementById("err_stock_qty"),
};

/* ── Topbar date ───────────────────────────────────────── */
const topbarDate = document.getElementById("topbarDate");
if (topbarDate) {
  const now = new Date();
  topbarDate.textContent = now.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ── API helpers ───────────────────────────────────────── */
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) {
      const msg =
        data.error || (data.errors ? data.errors.join(" ") : "Server error");
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    throw err;
  }
}

/* ── Load listings from DB ─────────────────────────────── */
async function loadListings() {
  setTableLoading();
  try {
    const params = new URLSearchParams();
    const q = searchInput.value.trim();
    const cat = categoryFilter.value;
    if (q) params.set("search", q);
    if (cat) params.set("category", cat);

    listings = await apiFetch(`${API_URL}?${params.toString()}`);
    renderTable();
    updateSearchMeta(q, cat);
  } catch (err) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-state-icon">◈</div>
            <p>Could not load listings</p>
            <p>${escHtml(err.message)}</p>
          </div>
        </td>
      </tr>`;
    showToast("Failed to load listings: " + err.message, "error");
  }
}

/* ── Search meta bar ───────────────────────────────────── */
function updateSearchMeta(q, cat) {
  if (!searchMeta) return;
  const isFiltered = q || cat;
  if (!isFiltered) {
    searchMeta.style.display = "none";
    return;
  }
  searchMeta.style.display = "flex";
  const parts = [];
  if (q) parts.push(`"${escHtml(q)}"`);
  if (cat) parts.push(`<span class="badge-cat">${escHtml(cat)}</span>`);
  searchMeta.querySelector(".search-meta-text").innerHTML =
    `${listings.length} result${listings.length !== 1 ? "s" : ""} for ${parts.join(" in ")}`;
}

/* ── Stats ─────────────────────────────────────────────── */
function updateStats() {
  statTotal.textContent = listings.length;
  statCategories.textContent = new Set(listings.map((l) => l.category)).size;
  statStock.textContent = listings
    .reduce((s, l) => s + Number(l.stock_qty), 0)
    .toLocaleString();
  if (listingCount) listingCount.textContent = listings.length;
}

/* ── Highlight matching text ───────────────────────────── */
function highlight(text, query) {
  if (!query) return escHtml(text);
  const escaped = escHtml(text);
  const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped.replace(
    new RegExp(`(${escapedQ})`, "gi"),
    '<mark class="hl">$1</mark>',
  );
}

/* ── Render table ──────────────────────────────────────── */
function setTableLoading() {
  tableBody.innerHTML = `<tr><td colspan="6" class="td-loading">Loading…</td></tr>`;
}

function renderTable() {
  updateStats();
  const q = searchInput.value.trim();

  if (!listings.length) {
    const isFiltered = q || categoryFilter.value;
    const msg = isFiltered
      ? "Try a different search term or clear the filters."
      : 'Click <strong style="color:#7aa0ff">+ New Listing</strong> to get started.';
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-state-icon">◈</div>
            <p>${isFiltered ? "No results found" : "Nothing here yet"}</p>
            <p>${msg}</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tableBody.innerHTML = listings
    .map(
      (l) => `
    <tr>
      <td>#${highlight(String(l.product_id), q)}</td>
      <td>${highlight(l.product_name, q)}</td>
      <td><span class="badge-cat">${highlight(l.category, q)}</span></td>
      <td class="price-cell">₱${Number(l.rental_price).toFixed(2)}</td>
      <td>${Number(l.stock_qty).toLocaleString()}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-edit"   onclick="openEdit('${escHtml(String(l.product_id))}')">Edit</button>
          <button class="btn btn-delete" onclick="openConfirm('${escHtml(String(l.product_id))}', '${escHtml(l.product_name)}')">Delete</button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
}

/* ── Validation ────────────────────────────────────────── */
function clearErrors() {
  formAlert.textContent = "";
  Object.values(errors).forEach((el) => {
    el.textContent = "";
  });
  Object.values(fields).forEach((el) => el.classList.remove("input-error"));
}

function setError(field, msg) {
  if (errors[field]) errors[field].textContent = msg;
  if (fields[field]) fields[field].classList.add("input-error");
}

function validateForm() {
  clearErrors();
  let valid = true;

  const pid = fields.product_id.value.trim();
  const name = fields.product_name.value.trim();
  const cat = fields.category.value;
  const price = fields.rental_price.value;
  const qty = fields.stock_qty.value;

  if (!editingId) {
    if (!pid) {
      setError("product_id", "Product ID is required.");
      valid = false;
    } else if (!/^\d{5}$/.test(pid)) {
      setError("product_id", "Must be exactly 5 digits.");
      valid = false;
    }
  }

  if (!name) {
    setError("product_name", "Product name is required.");
    valid = false;
  }

  if (!cat) {
    setError("category", "Please select a category.");
    valid = false;
  }

  if (!price || isNaN(price) || Number(price) <= 0) {
    setError("rental_price", "Enter a valid price greater than 0.");
    valid = false;
  }

  if (qty === "" || isNaN(qty) || Number(qty) < 0) {
    setError("stock_qty", "Enter a valid quantity (0 or more).");
    valid = false;
  }

  return valid;
}

/* ── Add modal ─────────────────────────────────────────── */
function openAdd() {
  editingId = null;
  clearErrors();
  formModalTitle.textContent = "Add New Listing";
  Object.values(fields).forEach((f) => {
    f.value = "";
    f.disabled = false;
  });
  openModal(formModal);
}

/* ── Edit modal ────────────────────────────────────────── */
async function openEdit(id) {
  try {
    const listing = await apiFetch(`${API_URL}?id=${encodeURIComponent(id)}`);
    if (listing.error) {
      showToast(listing.error, "error");
      return;
    }

    editingId = String(listing.product_id);
    clearErrors();
    formModalTitle.textContent = "Edit Listing";

    fields.product_id.value = listing.product_id;
    fields.product_id.disabled = true;
    fields.product_name.value = listing.product_name;
    fields.category.value = listing.category;
    fields.rental_price.value = listing.rental_price;
    fields.stock_qty.value = listing.stock_qty;

    openModal(formModal);
  } catch (err) {
    showToast("Could not load product: " + err.message, "error");
  }
}

function closeFormModal() {
  closeModal(formModal);
  editingId = null;
  clearErrors();
  Object.values(fields).forEach((f) => {
    f.disabled = false;
  });
}

/* ── Save (POST / PUT) ─────────────────────────────────── */
async function handleSave() {
  if (!validateForm()) return;

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  const payload = {
    product_id: editingId || fields.product_id.value.trim(),
    product_name: fields.product_name.value.trim(),
    category: fields.category.value,
    rental_price: parseFloat(fields.rental_price.value),
    stock_qty: parseInt(fields.stock_qty.value, 10),
  };

  try {
    if (editingId) {
      await apiFetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      showToast("Listing updated successfully.", "success");
    } else {
      await apiFetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      showToast("New listing added.", "success");
    }
    closeFormModal();
    await loadListings();
  } catch (err) {
    formAlert.textContent = err.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Listing";
  }
}

/* ── Delete modal ──────────────────────────────────────── */
function openConfirm(id, name) {
  deletingId = id;
  confirmName.textContent = name ? `"${name}"` : `Product #${id}`;
  openModal(confirmModal);
}

function closeConfirmModal() {
  closeModal(confirmModal);
  deletingId = null;
}

async function handleDelete() {
  if (!deletingId) return;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = "Deleting…";

  try {
    await apiFetch(`${API_URL}?id=${encodeURIComponent(deletingId)}`, {
      method: "DELETE",
    });
    showToast("Listing deleted.", "error");
    closeConfirmModal();
    await loadListings();
  } catch (err) {
    showToast("Delete failed: " + err.message, "error");
    closeConfirmModal();
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = "Delete";
  }
}

/* ── Clear search ──────────────────────────────────────── */
function clearSearch() {
  searchInput.value = "";
  categoryFilter.value = "";
  loadListings();
}

/* ── Modal helpers ─────────────────────────────────────── */
function openModal(el) {
  el.classList.add("open");
}
function closeModal(el) {
  el.classList.remove("open");
}

/* ── Toast ─────────────────────────────────────────────── */
function showToast(msg, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3000);
}

/* ── Utility ───────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ── Overlay / Escape close ────────────────────────────── */
formModal.addEventListener("click", (e) => {
  if (e.target === formModal) closeFormModal();
});
confirmModal.addEventListener("click", (e) => {
  if (e.target === confirmModal) closeConfirmModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (formModal.classList.contains("open")) closeFormModal();
    if (confirmModal.classList.contains("open")) closeConfirmModal();
  }
});

/* ── Event listeners ───────────────────────────────────── */
addBtn.addEventListener("click", openAdd);
saveBtn.addEventListener("click", handleSave);
confirmDeleteBtn.addEventListener("click", handleDelete);
if (clearSearchBtn) clearSearchBtn.addEventListener("click", clearSearch);

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadListings, 300);
});
categoryFilter.addEventListener("change", loadListings);

/* Keyboard shortcut: Ctrl/Cmd+K focuses search */
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
});

Object.values(fields).forEach((f) => {
  f.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSave();
  });
});

/* ─────────────────────────────────────────────────────────
   SIDEBAR — nav interaction
───────────────────────────────────────────────────────── */
const navTooltip = document.getElementById("navTooltip");
const notImplModal = document.getElementById("notImplModal");
const notImplTitle = document.getElementById("notImplTitle");

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.module === "products") {
      document
        .querySelectorAll(".nav-item")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      return;
    }
    notImplTitle.textContent = btn.dataset.label || "This module";
    openModal(notImplModal);
  });
});

function closeNotImpl() {
  closeModal(notImplModal);
}
notImplModal.addEventListener("click", (e) => {
  if (e.target === notImplModal) closeNotImpl();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && notImplModal.classList.contains("open"))
    closeNotImpl();
});

/* ── Init ──────────────────────────────────────────────── */
loadListings();
