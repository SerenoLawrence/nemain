// ============================================================
// shop.js — Shop page: product grid, filters, sort
// Used on: shop.html
// ============================================================

const productsGrid = document.getElementById('productsGrid');
if (!productsGrid) throw new Error('shop.js loaded on wrong page');

let allProducts = [];
let currentCategory = 'all';
let currentSort = 'default';

// ---- WISHLIST ----
let wishlist = JSON.parse(localStorage.getItem('wearix-wishlist') || '[]');
function saveWishlist() { localStorage.setItem('wearix-wishlist', JSON.stringify(wishlist)); }

function initWishlistBtn(btn, productName) {
  if (wishlist.includes(productName)) { btn.textContent = '♥'; btn.style.color = '#8e1f1f'; }
  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (btn.textContent === '♥') {
      btn.textContent = '♡'; btn.style.color = '';
      wishlist = wishlist.filter(i => i !== productName);
    } else {
      btn.textContent = '♥'; btn.style.color = '#8e1f1f';
      if (!wishlist.includes(productName)) wishlist.push(productName);
      showSuccess('Added to Wishlist', `${productName} saved to your wishlist.`, 'Got it');
    }
    saveWishlist();
  });
}

// ---- FILTER TABS ----
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentCategory = tab.getAttribute('data-category');
    applyFiltersAndSort();
  });
});

// ---- SORT ----
const sortSelect = document.getElementById('sortSelect');
if (sortSelect) sortSelect.addEventListener('change', e => { currentSort = e.target.value; applyFiltersAndSort(); });

// ---- APPLY FILTERS + SORT ----
function applyFiltersAndSort() {
  let filtered = currentCategory === 'all' ? [...allProducts] : allProducts.filter(p => p.category === currentCategory);
  if (currentSort === 'price_asc')  filtered.sort((a, b) => a.price - b.price);
  if (currentSort === 'price_desc') filtered.sort((a, b) => b.price - a.price);
  if (currentSort === 'rating')     filtered.sort((a, b) => b.rating - a.rating);
  const count = document.getElementById('resultsCount');
  if (count) count.textContent = `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;
  renderProducts(filtered);
}

// ---- RENDER ----
function renderProducts(products) {
  if (!products.length) { productsGrid.innerHTML = '<div class="products-loading">No products in this category.</div>'; return; }
  productsGrid.innerHTML = products.map(p => `
    <div class="product-card" data-category="${p.category}" data-id="${p.id}">
      <div class="product-image">
        <img src="${p.image_url}" alt="${p.name}" loading="lazy">
        <button class="wishlist-btn" aria-label="Add to wishlist">♡</button>
      </div>
      <div class="product-info">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-price">${formatPrice(p.price)}${p.suggested_price ? ` <span class="product-suggested">Suggested: ${formatPrice(p.suggested_price)}</span>` : ''}</p>
        <div class="product-sizes">${(p.sizes || []).map(s => `<span class="size-tag">${s}</span>`).join('')}</div>
        <div class="product-rating">${starsFromRating(p.rating)}</div>
      </div>
    </div>`).join('');

  productsGrid.querySelectorAll('.product-card').forEach(card => {
    initWishlistBtn(card.querySelector('.wishlist-btn'), card.querySelector('.product-name').textContent.trim());
    card.addEventListener('click', e => {
      if (e.target.classList.contains('wishlist-btn')) return;
      window.location.href = `product.html?id=${card.dataset.id}`;
    });
  });
}

// ---- LOAD FROM SUPABASE ----
async function loadProducts() {
  productsGrid.innerHTML = '<div class="products-loading">Loading products…</div>';
  const { data, error } = await db.from('products').select('*').eq('in_stock', true);
  if (error) {
    productsGrid.innerHTML = '<div class="products-loading">Could not load products.</div>';
    showError('Failed to Load', 'Could not load products. Please refresh.');
    console.error('[shop.js] loadProducts:', error.message);
    return;
  }
  allProducts = data;
  applyFiltersAndSort();
}

loadProducts();
