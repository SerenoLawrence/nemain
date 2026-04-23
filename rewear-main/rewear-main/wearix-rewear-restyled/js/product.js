// ============================================================
// product.js — Product detail page logic
// Used on: product.html
// ============================================================

const productDetailContent = document.getElementById('productDetailContent');
if (!productDetailContent) throw new Error('product.js loaded on wrong page');

const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

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

// ---- RENDER DETAIL ----
function renderDetail(p) {
  const sizes = p.sizes || ['S', 'M', 'L'];
  document.title = `${p.name} - REWEAR`;
  const breadcrumb = document.getElementById('breadcrumbName');
  if (breadcrumb) breadcrumb.textContent = p.name;

  productDetailContent.innerHTML = `
    <div class="pd-image-wrap">
      <img src="${p.image_url}" alt="${p.name}" class="pd-image">
      <button class="wishlist-btn pd-wishlist" aria-label="Wishlist">♡</button>
    </div>
    <div class="pd-info">
      <span class="pd-category">${p.category}</span>
      <h1 class="pd-name">${p.name}</h1>
      <div class="pd-rating">${starsFromRating(p.rating)} <span class="pd-rating-num">(${p.rating})</span></div>
      <div class="pd-price-row">
        <span class="pd-price">${formatPrice(p.price)}</span>
        ${p.suggested_price ? `<span class="pd-suggested">Suggested: ${formatPrice(p.suggested_price)}</span>` : ''}
      </div>
      ${p.description ? `<p class="pd-description">${p.description}</p>` : ''}
      <div class="pd-size-section">
        <p class="pd-size-label">Select Size</p>
        <div class="pd-sizes">
          ${sizes.map((s, i) => `<button class="pd-size-btn${i === 0 ? ' active' : ''}" data-size="${s}">${s}</button>`).join('')}
        </div>
      </div>
      <div class="pd-actions">
        <button class="btn-primary-large pd-buy-btn" id="pdBuyBtn">Buy Now</button>
        <button class="btn-secondary-large pd-cart-btn" id="pdCartBtn">Add to Cart</button>
      </div>
      <div class="pd-meta">
        <span class="${p.in_stock ? 'pd-instock' : 'pd-outstock'}">${p.in_stock ? '✓ In Stock' : '✕ Out of Stock'}</span>
      </div>
    </div>`;

  // Size selector
  let selectedSize = sizes[0];
  productDetailContent.querySelectorAll('.pd-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      productDetailContent.querySelectorAll('.pd-size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = btn.dataset.size;
    });
  });

  // Wishlist
  initWishlistBtn(productDetailContent.querySelector('.pd-wishlist'), p.name);

  // Buy Now
  document.getElementById('pdBuyBtn').addEventListener('click', () => {
    showModal({
      type: 'success',
      title: 'Confirm Your Order',
      message: `<strong>${p.name}</strong> — Size: ${selectedSize}<br>Total: <strong>${formatPrice(p.price)}</strong>`,
      btnText: 'Place Order',
      onClose: async () => {
        const email = prompt('Enter your email:');
        if (!email) return;
        const name = prompt('Your full name:');
        if (!name) return;
        showLoadingModal('Placing Order…', 'Confirming your purchase.');
        const { error } = await db.from('orders').insert({
          product_id: p.id,
          buyer_name: name,
          buyer_email: email,
          size_selected: selectedSize,
          quantity: 1,
          total_price: p.price,
          status: 'pending'
        });
        hideLoadingModal();
        if (error) {
          showError('Order Failed', 'Could not place order. Please try again.');
          console.error('[product.js] placeOrder:', error.message);
        } else {
          showSuccess('Order Placed!', `Thanks ${name}! Your order is confirmed. We'll email ${email} with updates.`, 'Got it, Thanks!');
        }
      }
    });
  });

  // Add to Cart
  document.getElementById('pdCartBtn').addEventListener('click', () => {
    let cart = JSON.parse(localStorage.getItem('wearix-cart') || '[]');
    cart.push({ id: p.id, name: p.name, price: p.price, size: selectedSize, image: p.image_url });
    localStorage.setItem('wearix-cart', JSON.stringify(cart));
    showSuccess('Added to Cart', `${p.name} (${selectedSize}) added to your cart.`, 'Got it');
  });
}

// ---- RELATED PRODUCTS ----
async function loadRelated(category, excludeId) {
  const relatedGrid = document.getElementById('relatedGrid');
  if (!relatedGrid) return;
  const { data, error } = await db.from('products').select('*').eq('category', category).eq('in_stock', true).neq('id', excludeId).limit(4);
  if (error || !data.length) { relatedGrid.innerHTML = '<p class="dash-empty">No related products.</p>'; return; }
  relatedGrid.innerHTML = data.map(p => `
    <div class="product-card" data-id="${p.id}">
      <div class="product-image"><img src="${p.image_url}" alt="${p.name}" loading="lazy"><button class="wishlist-btn">♡</button></div>
      <div class="product-info">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-price">${formatPrice(p.price)}</p>
        <div class="product-sizes">${(p.sizes || []).map(s => `<span class="size-tag">${s}</span>`).join('')}</div>
        <div class="product-rating">${starsFromRating(p.rating)}</div>
      </div>
    </div>`).join('');
  relatedGrid.querySelectorAll('.product-card').forEach(card => {
    initWishlistBtn(card.querySelector('.wishlist-btn'), card.querySelector('.product-name').textContent.trim());
    card.addEventListener('click', e => {
      if (e.target.classList.contains('wishlist-btn')) return;
      window.location.href = `product.html?id=${card.dataset.id}`;
    });
  });
}

// ---- LOAD ----
async function loadProductDetail() {
  if (!productId) { productDetailContent.innerHTML = '<p class="dash-empty">Product not found.</p>'; return; }
  const { data: p, error } = await db.from('products').select('*').eq('id', productId).single();
  if (error || !p) {
    productDetailContent.innerHTML = '<p class="dash-empty">Product not found.</p>';
    console.error('[product.js] loadProductDetail:', error?.message);
    return;
  }
  renderDetail(p);
  loadRelated(p.category, p.id);
}

loadProductDetail();
