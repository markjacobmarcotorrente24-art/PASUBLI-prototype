const API_BASE = 'php/products.php';

let allProducts = [];
let editingId   = null;
let deletingId  = null;

const tableBody        = document.getElementById('tableBody');
const searchInput      = document.getElementById('searchInput');
const categoryFilter   = document.getElementById('categoryFilter');
const addBtn           = document.getElementById('addBtn');
const formModal        = document.getElementById('formModal');
const formModalTitle   = document.getElementById('formModalTitle');
const productForm      = document.getElementById('productForm');
const saveBtn          = document.getElementById('saveBtn');
const formAlert        = document.getElementById('formAlert');
const confirmModal     = document.getElementById('confirmModal');
const confirmName      = document.getElementById('confirmName');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const statTotal        = document.getElementById('statTotal');
const statCategories   = document.getElementById('statCategories');
const statStock        = document.getElementById('statStock');

document.addEventListener('DOMContentLoaded', function () {
    loadProducts();
    bindEvents();
});

function bindEvents() {
    addBtn.addEventListener('click', openAddModal);
    searchInput.addEventListener('input', filterTable);
    categoryFilter.addEventListener('change', filterTable);
    saveBtn.addEventListener('click', saveProduct);
    confirmDeleteBtn.addEventListener('click', confirmDelete);
    formModal.addEventListener('click', function (e) { if (e.target === formModal) closeFormModal(); });
    confirmModal.addEventListener('click', function (e) { if (e.target === confirmModal) closeConfirmModal(); });
}

function loadProducts() {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#64748b;">Loading...</td></tr>';
    fetch(API_BASE)
        .then(function (res) { return res.json(); })
        .then(function (data) {
            allProducts = data;
            updateStats(data);
            renderTable(data);
        })
        .catch(function () {
            tableBody.innerHTML = '<tr><td colspan="5"><div class="empty-state">⚠️<p>Failed to load products.</p></div></td></tr>';
        });
}

function updateStats(products) {
    statTotal.textContent = products.length;
    var cats = {}, totalStock = 0;
    products.forEach(function (p) {
        cats[p.category] = true;
        totalStock += parseInt(p.stock_qty) || 0;
    });
    statCategories.textContent = Object.keys(cats).length;
    statStock.textContent = totalStock;
}

function renderTable(products) {
    if (products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5"><div class="empty-state">📦<p>No listings found.</p></div></td></tr>';
        return;
    }
    tableBody.innerHTML = '';
    products.forEach(function (p) {
        var row = document.createElement('tr');
        row.innerHTML =
            '<td><strong>' + escapeHtml(p.product_id) + '</strong></td>' +
            '<td><span class="badge badge-blue">' + escapeHtml(p.category) + '</span></td>' +
            '<td>' + formatCurrency(p.rental_price) + '</td>' +
            '<td>' + getStockBadge(p.stock_qty) + '</td>' +
            '<td><div class="actions">' +
                '<button class="btn btn-primary btn-sm" onclick="openEditModal(\'' + escapeHtml(p.product_id) + '\')">Edit</button>' +
                '<button class="btn btn-danger btn-sm" onclick="openConfirmModal(\'' + escapeHtml(p.product_id) + '\', \'' + escapeHtml(p.category) + '\')">Delete</button>' +
            '</div></td>';
        tableBody.appendChild(row);
    });
}

function getStockBadge(stock) {
    stock = parseInt(stock) || 0;
    if (stock === 0) return '<span class="badge badge-red">'    + stock + ' (Out)</span>';
    if (stock <= 3)  return '<span class="badge badge-yellow">' + stock + ' (Low)</span>';
    return '<span class="badge badge-green">' + stock + '</span>';
}

function filterTable() {
    var search = searchInput.value.toLowerCase().trim();
    var cat    = categoryFilter.value;
    var filtered = allProducts.filter(function (p) {
        var matchSearch = !search || p.category.toLowerCase().includes(search);
        var matchCat    = !cat    || p.category === cat;
        return matchSearch && matchCat;
    });
    renderTable(filtered);
}

function openAddModal() {
    editingId = null;
    formModalTitle.textContent = 'Add New Listing';
    productForm.reset();
    document.getElementById('product_id').disabled = false;
    hideFormAlert();
    clearFieldErrors();
    formModal.classList.add('active');
    document.getElementById('product_id').focus();
}

function openEditModal(id) {
    editingId = id;
    formModalTitle.textContent = 'Edit Listing';
    hideFormAlert();
    clearFieldErrors();
    var product = allProducts.find(function (p) { return p.product_id === id; });
    if (!product) { showToast('Product not found.', 'error'); return; }
    document.getElementById('product_id').value    = product.product_id;
    document.getElementById('product_id').disabled = true;
    document.getElementById('category').value      = product.category;
    document.getElementById('rental_price').value  = product.rental_price;
    document.getElementById('stock_qty').value     = product.stock_qty;
    formModal.classList.add('active');
}

function saveProduct() {
    clearFieldErrors();
    hideFormAlert();
    var data = {
        product_id:   document.getElementById('product_id').value.trim(),
        category:     document.getElementById('category').value.trim(),
        rental_price: document.getElementById('rental_price').value,
        stock_qty:    document.getElementById('stock_qty').value
    };
    var valid = true;
    if (!editingId && (!data.product_id || data.product_id.length !== 5)) {
        showFieldError('err_product_id', 'Product ID must be exactly 5 characters.');
        valid = false;
    }
    if (!data.category) {
        showFieldError('err_category', 'Please select a category.');
        valid = false;
    }
    if (!data.rental_price || parseFloat(data.rental_price) <= 0) {
        showFieldError('err_rental_price', 'Price must be greater than 0.');
        valid = false;
    }
    if (data.stock_qty === '' || parseInt(data.stock_qty) < 0) {
        showFieldError('err_stock_qty', 'Stock must be 0 or more.');
        valid = false;
    }
    if (!valid) return;

    var method = editingId !== null ? 'PUT' : 'POST';
    if (editingId !== null) data.product_id = editingId;

    saveBtn.disabled    = true;
    saveBtn.textContent = 'Saving...';

    fetch(API_BASE, {
        method:  method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data)
    })
    .then(function (res) { return res.json(); })
    .then(function (result) {
        saveBtn.disabled    = false;
        saveBtn.textContent = 'Save Listing';
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
    .catch(function () {
        saveBtn.disabled    = false;
        saveBtn.textContent = 'Save Listing';
        showFormAlert('Network error. Please try again.');
    });
}

function openConfirmModal(id, label) {
    deletingId = id;
    confirmName.textContent = label + ' (' + id + ')';
    confirmModal.classList.add('active');
}

function confirmDelete() {
    if (!deletingId) return;
    confirmDeleteBtn.disabled    = true;
    confirmDeleteBtn.textContent = 'Deleting...';
    fetch(API_BASE + '?id=' + encodeURIComponent(deletingId), { method: 'DELETE' })
        .then(function (res) { return res.json(); })
        .then(function (result) {
            confirmDeleteBtn.disabled    = false;
            confirmDeleteBtn.textContent = 'Yes, Delete';
            closeConfirmModal();
            if (result.success) {
                loadProducts();
                showToast(result.message, 'success');
            } else {
                showToast(result.error || 'Delete failed.', 'error');
            }
        })
        .catch(function () {
            confirmDeleteBtn.disabled    = false;
            confirmDeleteBtn.textContent = 'Yes, Delete';
            showToast('Network error. Please try again.', 'error');
        });
}

function closeFormModal() {
    formModal.classList.remove('active');
    productForm.reset();
    document.getElementById('product_id').disabled = false;
    editingId = null;
}

function closeConfirmModal() {
    confirmModal.classList.remove('active');
    deletingId = null;
}

function showFormAlert(msg) { formAlert.innerHTML = msg; formAlert.classList.add('active'); }
function hideFormAlert()    { formAlert.classList.remove('active'); formAlert.textContent = ''; }
function showFieldError(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add('active'); }
}
function clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach(function (el) {
        el.classList.remove('active'); el.textContent = '';
    });
}

function showToast(msg, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer');
    var toast     = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = (type === 'success' ? '✓ ' : '✕ ') + msg;
    container.appendChild(toast);
    setTimeout(function () {
        toast.style.opacity    = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(function () { container.removeChild(toast); }, 300);
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatCurrency(val) {
    return '₱ ' + parseFloat(val).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}