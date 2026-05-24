// app.js - Product/Item CRUD Module Logic

// ---- Configuration ----
// Change this to match your server path
const API_BASE = 'php/products.php';
const LENDERS_API = 'php/lenders.php';

// ---- State ----
let allProducts = [];      // stores full list for client-side filter
let editingId = null;      // product_id being edited (null = adding new)
let deletingId = null;     // product_id to delete

// ---- DOM References ----
const tableBody       = document.getElementById('tableBody');
const searchInput     = document.getElementById('searchInput');
const categoryFilter  = document.getElementById('categoryFilter');
const addBtn          = document.getElementById('addBtn');

const formModal       = document.getElementById('formModal');
const formModalTitle  = document.getElementById('formModalTitle');
const productForm     = document.getElementById('productForm');
const saveBtn         = document.getElementById('saveBtn');
const formAlert       = document.getElementById('formAlert');

const confirmModal    = document.getElementById('confirmModal');
const confirmName     = document.getElementById('confirmName');
const confirmDeleteBtn= document.getElementById('confirmDeleteBtn');

const statTotal       = document.getElementById('statTotal');
const statCategories  = document.getElementById('statCategories');
const statStock       = document.getElementById('statStock');

// ---- Init ----
document.addEventListener('DOMContentLoaded', function() {
    loadLenders();
    loadProducts();
    bindEvents();
});

function bindEvents() {
    addBtn.addEventListener('click', openAddModal);
    searchInput.addEventListener('input', filterTable);
    categoryFilter.addEventListener('change', filterTable);
    saveBtn.addEventListener('click', saveProduct);
    confirmDeleteBtn.addEventListener('click', confirmDelete);

    // Close modals on overlay click
    formModal.addEventListener('click', function(e) {
        if (e.target === formModal) closeFormModal();
    });
    confirmModal.addEventListener('click', function(e) {
        if (e.target === confirmModal) closeConfirmModal();
    });
}

// ---- Load Lenders (for dropdown) ----
function loadLenders() {
    fetch(LENDERS_API)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var select = document.getElementById('lender_id');
            data.forEach(function(l) {
                var opt = document.createElement('option');
                opt.value = l.lender_id;
                opt.textContent = l.lender_name;
                select.appendChild(opt);
            });
        })
        .catch(function() {
            showToast('Could not load lenders list.', 'error');
        });
}

// ---- READ: Load Products ----
function loadProducts() {
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#64748b;">Loading...</td></tr>';

    fetch(API_BASE)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            allProducts = data;
            updateStats(data);
            renderTable(data);
        })
        .catch(function() {
            tableBody.innerHTML = '<tr><td colspan="8"><div class="empty-state">⚠️<p>Failed to load products. Check your server connection.</p></div></td></tr>';
        });
}

function updateStats(products) {
    statTotal.textContent = products.length;

    var cats = {};
    var totalStock = 0;
    products.forEach(function(p) {
        cats[p.category] = true;
        totalStock += parseInt(p.stock);
    });

    statCategories.textContent = Object.keys(cats).length;
    statStock.textContent = totalStock;
}

function renderTable(products) {
    if (products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8"><div class="empty-state">📦<p>No products found.</p></div></td></tr>';
        return;
    }

    tableBody.innerHTML = '';
    products.forEach(function(p) {
        var row = document.createElement('tr');
        row.innerHTML =
            '<td><strong>#' + p.product_id + '</strong></td>' +
            '<td>' + escapeHtml(p.product_name) + '</td>' +
            '<td><span class="badge badge-blue">' + escapeHtml(p.category) + '</span></td>' +
            '<td>' + escapeHtml(p.lender_name || '—') + '</td>' +
            '<td>' + formatCurrency(p.price) + '</td>' +
            '<td>' + getStockBadge(p.stock) + '</td>' +
            '<td style="font-size:12px;color:#64748b;">' + formatDate(p.created_at) + '</td>' +
            '<td>' +
                '<div class="actions">' +
                    '<button class="btn btn-primary btn-sm" onclick="openEditModal(' + p.product_id + ')">Edit</button>' +
                    '<button class="btn btn-danger  btn-sm" onclick="openConfirmModal(' + p.product_id + ', \'' + escapeHtml(p.product_name) + '\')">Delete</button>' +
                '</div>' +
            '</td>';
        tableBody.appendChild(row);
    });
}

function getStockBadge(stock) {
    stock = parseInt(stock);
    if (stock === 0)   return '<span class="badge badge-red">'    + stock + ' (Out)</span>';
    if (stock <= 3)    return '<span class="badge badge-yellow">'  + stock + ' (Low)</span>';
    return '<span class="badge badge-green">' + stock + '</span>';
}

// ---- Search / Filter (client-side) ----
function filterTable() {
    var search = searchInput.value.toLowerCase().trim();
    var cat    = categoryFilter.value;

    var filtered = allProducts.filter(function(p) {
        var matchSearch = !search ||
            p.product_name.toLowerCase().includes(search) ||
            (p.description && p.description.toLowerCase().includes(search)) ||
            (p.lender_name && p.lender_name.toLowerCase().includes(search));
        var matchCat = !cat || p.category === cat;
        return matchSearch && matchCat;
    });

    renderTable(filtered);
}

// ---- CREATE: Open Add Modal ----
function openAddModal() {
    editingId = null;
    formModalTitle.textContent = 'Add New Product';
    productForm.reset();
    hideFormAlert();
    clearFieldErrors();
    formModal.classList.add('active');
    document.getElementById('product_name').focus();
}

// ---- UPDATE: Open Edit Modal ----
function openEditModal(id) {
    editingId = id;
    formModalTitle.textContent = 'Edit Product';
    hideFormAlert();
    clearFieldErrors();

    // Find product from local list
    var product = allProducts.find(function(p) { return p.product_id == id; });
    if (!product) { showToast('Product not found.', 'error'); return; }

    // Populate form
    document.getElementById('product_name').value = product.product_name;
    document.getElementById('category').value      = product.category;
    document.getElementById('lender_id').value     = product.lender_id;
    document.getElementById('price').value         = product.price;
    document.getElementById('stock').value         = product.stock;
    document.getElementById('description').value   = product.description || '';

    formModal.classList.add('active');
}

// ---- SAVE (Create or Update) ----
function saveProduct() {
    clearFieldErrors();
    hideFormAlert();

    var data = {
        product_name: document.getElementById('product_name').value.trim(),
        category:     document.getElementById('category').value.trim(),
        lender_id:    document.getElementById('lender_id').value,
        price:        document.getElementById('price').value,
        stock:        document.getElementById('stock').value,
        description:  document.getElementById('description').value.trim()
    };

    // Client-side validation
    var valid = true;
    if (!data.product_name || data.product_name.length < 2) {
        showFieldError('err_name', 'Product name must be at least 2 characters.');
        valid = false;
    }
    if (!data.category) {
        showFieldError('err_category', 'Please select a category.');
        valid = false;
    }
    if (!data.lender_id) {
        showFieldError('err_lender', 'Please select a lender.');
        valid = false;
    }
    if (!data.price || parseFloat(data.price) <= 0) {
        showFieldError('err_price', 'Price must be greater than 0.');
        valid = false;
    }
    if (data.stock === '' || parseInt(data.stock) < 0) {
        showFieldError('err_stock', 'Stock must be 0 or more.');
        valid = false;
    }
    if (!valid) return;

    // Determine method and URL
    var method = 'POST';
    if (editingId !== null) {
        method = 'PUT';
        data.product_id = editingId;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span> Saving...';

    fetch(API_BASE, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(function(res) { return res.json(); })
    .then(function(result) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Product';

        if (result.success) {
            closeFormModal();
            loadProducts();
            showToast(result.message, 'success');
        } else if (result.errors) {
            showFormAlert(result.errors.join('<br>'));
        } else {
            showFormAlert(result.error || 'An error occurred.');
        }
    })
    .catch(function() {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Product';
        showFormAlert('Network error. Please try again.');
    });
}

// ---- DELETE ----
function openConfirmModal(id, name) {
    deletingId = id;
    confirmName.textContent = name;
    confirmModal.classList.add('active');
}

function confirmDelete() {
    if (!deletingId) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.innerHTML = '<span class="spinner"></span> Deleting...';

    fetch(API_BASE + '?id=' + deletingId, { method: 'DELETE' })
        .then(function(res) { return res.json(); })
        .then(function(result) {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = 'Yes, Delete';

            closeConfirmModal();
            if (result.success) {
                loadProducts();
                showToast(result.message, 'success');
            } else {
                showToast(result.error || 'Delete failed.', 'error');
            }
        })
        .catch(function() {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = 'Yes, Delete';
            showToast('Network error. Please try again.', 'error');
        });
}

// ---- Modal Helpers ----
function closeFormModal() {
    formModal.classList.remove('active');
    productForm.reset();
    editingId = null;
}

function closeConfirmModal() {
    confirmModal.classList.remove('active');
    deletingId = null;
}

// ---- Alert / Error Helpers ----
function showFormAlert(msg) {
    formAlert.innerHTML = msg;
    formAlert.classList.add('active');
}
function hideFormAlert() {
    formAlert.classList.remove('active');
    formAlert.textContent = '';
}
function showFieldError(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add('active'); }
}
function clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach(function(el) {
        el.classList.remove('active');
        el.textContent = '';
    });
}

// ---- Toast Notification ----
function showToast(msg, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = (type === 'success' ? '✓ ' : '✕ ') + msg;
    container.appendChild(toast);
    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(function() { container.removeChild(toast); }, 300);
    }, 3000);
}

// ---- Utility ----
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatCurrency(val) {
    return '₱ ' + parseFloat(val).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}
