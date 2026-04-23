// ============================================================
// WEARIX — script.js
// ============================================================

// ============================================================
// MODAL SYSTEM
// ============================================================
const CONFETTI_COLORS = ['#111111','#c8a96e','#e8d5b0','#6b6460','#d4a843','#8b7355','#f0e6d3'];

function spawnConfetti(container) {
  for (let i = 0; i < 38; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const size = Math.random() * 8 + 5;
    piece.style.cssText = `background:${color};width:${size}px;height:${size}px;left:${Math.random()*100}%;top:-10px;border-radius:${Math.random()>.5?'50%':'2px'};animation-duration:${Math.random()*1.2+1}s;animation-delay:${Math.random()*0.6}s;`;
    container.appendChild(piece);
  }
}

let activeModal = null;

function showModal({ type='success', title, message, btnText='Got it', onClose }) {
  if (activeModal) closeModal(activeModal, true);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const iconMap = { success:'✓', error:'✕', loading:'' };
  const iconClass = type==='success' ? 'success-icon' : type==='error' ? 'error-icon' : 'loading-icon';
  overlay.innerHTML = `<div class="modal-card"><div class="modal-confetti-area" id="modalConfettiArea"><div class="modal-icon-wrap ${iconClass}">${type==='loading'?'<div class="modal-spinner"></div>':`<span>${iconMap[type]}</span>`}</div></div><div class="modal-body"><h3 class="modal-title">${title}</h3><p class="modal-message">${message}</p></div>${type!=='loading'?`<div class="modal-footer"><button class="modal-btn btn-dark" id="modalBtn">${btnText}</button></div>`:''}</div>`;
  document.body.appendChild(overlay);
  activeModal = overlay;
  if (type==='success') spawnConfetti(overlay.querySelector('#modalConfettiArea'));
  const btn = overlay.querySelector('#modalBtn');
  if (btn) btn.addEventListener('click', () => { closeModal(overlay); if (onClose) onClose(); });
  if (type!=='loading') overlay.addEventListener('click', e => { if (e.target===overlay) { closeModal(overlay); if (onClose) onClose(); } });
  return overlay;
}

function closeModal(overlay, instant=false) {
  if (!overlay || !overlay.parentNode) return;
  if (instant) { overlay.remove(); if (activeModal===overlay) activeModal=null; return; }
  overlay.classList.add('modal-out');
  overlay.addEventListener('animationend', () => { overlay.remove(); if (activeModal===overlay) activeModal=null; }, { once:true });
}

function showSuccess(title, message, btnText='Got it, Thanks!') { return showModal({ type:'success', title, message, btnText }); }
function showError(title, message, btnText='Try Again') { return showModal({ type:'error', title, message, btnText }); }
function showLoadingModal(title='Loading…', message='Please wait.') { return showModal({ type:'loading', title, message }); }
function hideLoadingModal() { if (activeModal) closeModal(activeModal); }


// ============================================================
// MOBILE MENU
// ============================================================
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');
if (mobileMenuToggle && navMenu) {
  mobileMenuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('mobile-open');
    mobileMenuToggle.classList.toggle('is-active');
  });
}


// ============================================================
// HELPERS
// ============================================================
function starsFromRating(r) { const f=Math.round(r); return '★'.repeat(f)+'☆'.repeat(5-f); }
function formatPrice(p) { return '$'+parseFloat(p).toFixed(2); }
function formatDate(d) { return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
const blogCategoryLabels = { style:'Style Guide', trends:'Trends', stories:'Brand Stories', care:'Care Tips' };


// ============================================================
// WISHLIST
// ============================================================
let wishlist = JSON.parse(localStorage.getItem('wearix-wishlist')) || [];
function saveWishlist() { localStorage.setItem('wearix-wishlist', JSON.stringify(wishlist)); }

function initWishlistBtn(btn, productName) {
  if (wishlist.includes(productName)) { btn.textContent='♥'; btn.style.color='#8e1f1f'; }
  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (btn.textContent==='♥') {
      btn.textContent='♡'; btn.style.color='';
      wishlist = wishlist.filter(i => i!==productName);
    } else {
      btn.textContent='♥'; btn.style.color='#8e1f1f';
      if (!wishlist.includes(productName)) wishlist.push(productName);
      showSuccess('Added to Wishlist', `${productName} saved to your wishlist.`, 'Got it');
    }
    saveWishlist();
  });
}


// ============================================================
// FILTER TABS
// ============================================================
function initFilterTabs(onFilter) {
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      onFilter(tab.getAttribute('data-category'));
    });
  });
}


// ============================================================
// SHOP PAGE
// ============================================================
const productsGrid = document.getElementById('productsGrid');
if (productsGrid) {
  let allProducts = [];
  let currentCategory = 'all';
  let currentSort = 'default';

  async function loadProducts() {
    productsGrid.innerHTML = '<div class="products-loading">Loading products…</div>';
    const { data, error } = await db.from('products').select('*').eq('in_stock', true);
    if (error) {
      productsGrid.innerHTML = '<div class="products-loading">Could not load products.</div>';
      showError('Failed to Load', 'Could not load products. Please refresh.');
      return;
    }
    allProducts = data;
    applyFiltersAndSort();

    initFilterTabs(cat => { currentCategory = cat; applyFiltersAndSort(); });

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.addEventListener('change', e => { currentSort = e.target.value; applyFiltersAndSort(); });
  }

  function applyFiltersAndSort() {
    let filtered = currentCategory === 'all' ? [...allProducts] : allProducts.filter(p => p.category === currentCategory);
    if (currentSort === 'price_asc') filtered.sort((a,b) => a.price - b.price);
    else if (currentSort === 'price_desc') filtered.sort((a,b) => b.price - a.price);
    else if (currentSort === 'rating') filtered.sort((a,b) => b.rating - a.rating);
    const count = document.getElementById('resultsCount');
    if (count) count.textContent = `${filtered.length} product${filtered.length!==1?'s':''}`;
    renderProducts(filtered);
  }

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
          <div class="product-sizes">${(p.sizes||[]).map(s=>`<span class="size-tag">${s}</span>`).join('')}</div>
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

  loadProducts();
}


// ============================================================
// PRODUCT DETAIL PAGE
// ============================================================
const productDetailContent = document.getElementById('productDetailContent');
if (productDetailContent) {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  async function loadProductDetail() {
    if (!productId) { productDetailContent.innerHTML = '<p class="dash-empty">Product not found.</p>'; return; }
    const { data: p, error } = await db.from('products').select('*').eq('id', productId).single();
    if (error || !p) { productDetailContent.innerHTML = '<p class="dash-empty">Product not found.</p>'; return; }

    document.title = `${p.name} - REWEAR`;
    document.getElementById('breadcrumbName').textContent = p.name;

    const sizes = p.sizes || ['S','M','L'];
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
            ${sizes.map((s,i) => `<button class="pd-size-btn${i===0?' active':''}" data-size="${s}">${s}</button>`).join('')}
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
    document.getElementById('pdBuyBtn').addEventListener('click', async () => {
      showModal({
        type: 'success',
        title: 'Complete Your Order',
        message: `You're buying <strong>${p.name}</strong> (Size: ${selectedSize}) for <strong>${formatPrice(p.price)}</strong>.<br><br>Enter your email to confirm:`,
        btnText: 'Confirm Order',
        onClose: async () => {
          const email = prompt('Enter your email to confirm order:');
          if (!email) return;
          const name = prompt('Your full name:');
          if (!name) return;
          const loading = showLoadingModal('Placing Order…', 'Confirming your purchase.');
          const { error } = await db.from('orders').insert({
            product_id: p.id, buyer_name: name, buyer_email: email,
            size_selected: selectedSize, quantity: 1, total_price: p.price, status: 'pending'
          });
          hideLoadingModal();
          if (error) showError('Order Failed', 'Could not place order. Please try again.');
          else showSuccess('Order Placed!', `Thanks ${name}! Your order for ${p.name} is confirmed. We'll email ${email} with updates.`, 'Got it, Thanks!');
        }
      });
    });

    // Add to Cart (localStorage for now)
    document.getElementById('pdCartBtn').addEventListener('click', () => {
      let cart = JSON.parse(localStorage.getItem('wearix-cart') || '[]');
      cart.push({ id: p.id, name: p.name, price: p.price, size: selectedSize, image: p.image_url });
      localStorage.setItem('wearix-cart', JSON.stringify(cart));
      showSuccess('Added to Cart', `${p.name} (${selectedSize}) added to your cart.`, 'Got it');
    });

    // Load related products
    loadRelated(p.category, p.id);
  }

  async function loadRelated(category, excludeId) {
    const relatedGrid = document.getElementById('relatedGrid');
    if (!relatedGrid) return;
    const { data, error } = await db.from('products').select('*').eq('category', category).eq('in_stock', true).neq('id', excludeId).limit(4);
    if (error || !data.length) { relatedGrid.innerHTML = '<p class="dash-empty">No related products.</p>'; return; }
    relatedGrid.innerHTML = data.map(p => `
      <div class="product-card" data-id="${p.id}" style="cursor:pointer">
        <div class="product-image"><img src="${p.image_url}" alt="${p.name}" loading="lazy"><button class="wishlist-btn">♡</button></div>
        <div class="product-info">
          <h3 class="product-name">${p.name}</h3>
          <p class="product-price">${formatPrice(p.price)}</p>
          <div class="product-sizes">${(p.sizes||[]).map(s=>`<span class="size-tag">${s}</span>`).join('')}</div>
          <div class="product-rating">${starsFromRating(p.rating)}</div>
        </div>
      </div>`).join('');
    relatedGrid.querySelectorAll('.product-card').forEach(card => {
      initWishlistBtn(card.querySelector('.wishlist-btn'), card.querySelector('.product-name').textContent.trim());
      card.addEventListener('click', e => { if (e.target.classList.contains('wishlist-btn')) return; window.location.href = `product.html?id=${card.dataset.id}`; });
    });
  }

  loadProductDetail();
}


// ============================================================
// BLOG PAGE
// ============================================================
const blogGrid = document.getElementById('blogGrid');
if (blogGrid) {
  let allPosts = [];
  async function loadBlogPosts() {
    blogGrid.innerHTML = '<div class="products-loading">Loading articles…</div>';
    const { data, error } = await db.from('blog_posts').select('*').order('published_at', { ascending: false });
    if (error) { blogGrid.innerHTML = '<div class="products-loading">Could not load articles.</div>'; return; }
    allPosts = data;
    renderBlogPosts(allPosts);
    initFilterTabs(cat => renderBlogPosts(cat==='all' ? allPosts : allPosts.filter(p => p.category===cat)));
  }
  function renderBlogPosts(posts) {
    if (!posts.length) { blogGrid.innerHTML = '<div class="products-loading">No articles found.</div>'; return; }
    blogGrid.innerHTML = posts.map(p => `
      <div class="blog-card" data-category="${p.category}">
        <div class="blog-image"><img src="${p.image_url}" alt="${p.title}" loading="lazy"></div>
        <div class="blog-content">
          <div class="blog-meta"><span class="blog-category">${blogCategoryLabels[p.category]||p.category}</span><span class="blog-date">${formatDate(p.published_at)}</span><span class="blog-read">${p.read_time_minutes} min read</span></div>
          <h3 class="blog-title">${p.title}</h3>
          <p class="blog-excerpt">${p.excerpt}</p>
        </div>
      </div>`).join('');
  }
  loadBlogPosts();
}


// ============================================================
// NEWSLETTER
// ============================================================
document.querySelectorAll('.newsletter-form').forEach(formWrap => {
  const input = formWrap.querySelector('.newsletter-input');
  const button = formWrap.querySelector('button');
  if (!input || !button) return;
  const submit = async () => {
    const email = input.value.trim();
    if (!email) { input.focus(); showError('Email Required', 'Please enter your email address.'); return; }
    button.disabled = true;
    showLoadingModal('Subscribing…', 'Adding you to our newsletter.');
    const { error } = await db.from('newsletter_subscribers').insert({ email });
    hideLoadingModal(); button.disabled = false;
    if (error) { if (error.code==='23505') showError('Already Subscribed', `${email} is already on our list.`, 'Got it'); else showError('Something Went Wrong', 'Please try again.'); }
    else { showSuccess("You're Subscribed!", `Updates coming to ${email}.`); input.value = ''; }
  };
  button.addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key==='Enter') { e.preventDefault(); submit(); } });
});


// ============================================================
// CONTACT FORM
// ============================================================
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = contactForm.querySelector('[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Sending…';
    showLoadingModal('Sending Message…', 'Delivering your message to our team.');
    const payload = {
      first_name: document.getElementById('firstName').value.trim(),
      last_name: document.getElementById('lastName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone')?.value.trim() || null,
      subject: document.getElementById('subject').value.trim(),
      message: document.getElementById('message').value.trim()
    };
    const { error } = await db.from('contact_messages').insert(payload);
    hideLoadingModal(); submitBtn.disabled = false; submitBtn.textContent = 'Send Message';
    if (error) { showError('Message Not Sent', 'Something went wrong. Please try again.'); console.error(error.message); }
    else { showSuccess('Message Sent!', `Thanks ${payload.first_name}! We'll reply to ${payload.email} within 24 hours.`, 'Got it, Thanks!'); contactForm.reset(); }
  });
}


// ============================================================
// SELLER DASHBOARD
// ============================================================
const sellerDash = document.getElementById('tab-overview');
if (sellerDash && document.querySelector('.dash-sidebar')) {
  // Tab switching
  document.querySelectorAll('.dash-nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const tab = link.dataset.tab;
      document.querySelectorAll('.dash-nav-link').forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
      link.classList.add('active');
      const tabEl = document.getElementById(`tab-${tab}`);
      if (tabEl) tabEl.classList.add('active');
      const titleEl = document.getElementById('dashPageTitle');
      if (titleEl) titleEl.textContent = link.textContent.trim();
    });
  });

  // Add product btn shortcut
  const addBtn = document.getElementById('addProductBtn');
  if (addBtn) addBtn.addEventListener('click', () => {
    document.querySelector('[data-tab="add"]')?.click();
  });

  // Add product form
  const addProductForm = document.getElementById('addProductForm');
  if (addProductForm) {
    addProductForm.addEventListener('submit', async e => {
      e.preventDefault();
      const sizes = [...document.querySelectorAll('.size-checkboxes input:checked')].map(cb => cb.value);
      const payload = {
        name: document.getElementById('newName').value.trim(),
        price: parseFloat(document.getElementById('newPrice').value),
        category: document.getElementById('newCategory').value,
        suggested_price: parseFloat(document.getElementById('newSuggestedPrice').value) || null,
        image_url: document.getElementById('newImageUrl').value.trim(),
        description: document.getElementById('newDescription').value.trim(),
        sizes: sizes.length ? sizes : ['S','M','L'],
        in_stock: true
      };
      showLoadingModal('Publishing…', 'Adding your product to the store.');
      const { error } = await db.from('products').insert(payload);
      hideLoadingModal();
      if (error) showError('Failed to Publish', error.message);
      else { showSuccess('Listing Published!', `${payload.name} is now live in the shop.`, 'Got it'); addProductForm.reset(); }
    });
  }

  // Seller profile form
  const sellerProfileForm = document.getElementById('sellerProfileForm');
  if (sellerProfileForm) {
    sellerProfileForm.addEventListener('submit', async e => {
      e.preventDefault();
      const payload = {
        business_name: document.getElementById('bizName').value.trim(),
        email: document.getElementById('bizEmail').value.trim(),
        phone: document.getElementById('bizPhone').value.trim(),
        description: document.getElementById('bizDesc').value.trim()
      };
      showLoadingModal('Saving…', 'Updating your seller profile.');
      const { error } = await db.from('sellers').insert(payload);
      hideLoadingModal();
      if (error) { if (error.code==='23505') showError('Email Taken', 'This email is already registered as a seller.'); else showError('Save Failed', error.message); }
      else showSuccess('Profile Saved!', 'Your seller profile has been submitted for review.', 'Got it');
    });
  }
}


// ============================================================
// BUYER DASHBOARD
// ============================================================
const buyerDash = document.getElementById('tab-orders');
if (buyerDash && document.querySelector('[data-tab="wishlist"]')) {
  // Tab switching
  document.querySelectorAll('.dash-nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const tab = link.dataset.tab;
      document.querySelectorAll('.dash-nav-link').forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
      link.classList.add('active');
      const tabEl = document.getElementById(`tab-${tab}`);
      if (tabEl) tabEl.classList.add('active');
      const titleEl = document.getElementById('dashPageTitle');
      if (titleEl) titleEl.textContent = link.textContent.trim();
      if (tab === 'wishlist') renderWishlistDash();
    });
  });

  // Render wishlist from localStorage
  function renderWishlistDash() {
    const grid = document.getElementById('wishlistGrid');
    if (!grid) return;
    const saved = JSON.parse(localStorage.getItem('wearix-wishlist') || '[]');
    if (!saved.length) { grid.innerHTML = '<p class="dash-empty">Your wishlist is empty. <a href="shop.html">Browse products</a></p>'; return; }
    grid.innerHTML = saved.map(name => `<div class="dash-wishlist-item"><p class="product-name">${name}</p><a href="shop.html" class="dash-link">View in Shop</a></div>`).join('');
  }

  // Become seller form
  const becomeSellerForm = document.getElementById('becomeSellerForm');
  if (becomeSellerForm) {
    becomeSellerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const payload = {
        business_name: document.getElementById('applyBizName').value.trim(),
        email: document.getElementById('applyBizEmail').value.trim(),
        phone: document.getElementById('applyBizPhone').value.trim(),
        description: document.getElementById('applyBizDesc').value.trim()
      };
      showLoadingModal('Submitting…', 'Sending your seller application.');
      const { error } = await db.from('sellers').insert(payload);
      hideLoadingModal();
      if (error) { if (error.code==='23505') showError('Already Applied', 'This email already has a seller application.', 'Got it'); else showError('Submission Failed', error.message); }
      else showSuccess('Application Sent!', 'Our team will review your application within 1-3 business days.', 'Got it, Thanks!');
    });
  }
}


// ============================================================
// SMOOTH SCROLL
// ============================================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (!href || href==='#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior:'smooth', block:'start' });
  });
});


// ============================================================
// STATS COUNTER
// ============================================================
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting || entry.target.classList.contains('animated')) return;
    const statNumber = entry.target.querySelector('.stat-number');
    if (!statNumber) return;
    const original = statNumber.dataset.original || statNumber.textContent.trim();
    statNumber.dataset.original = original;
    const isK = original.includes('K'), isPercent = original.includes('%');
    let end = isK ? parseFloat(original)*1000 : parseInt(original,10);
    let startTs = null;
    const step = ts => {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts-startTs)/1600, 1);
      const value = Math.floor(progress*end);
      statNumber.textContent = isK ? `${(value/1000).toFixed(1)}K+` : isPercent ? `${value}%` : `${value}`;
      if (progress<1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    entry.target.classList.add('animated');
  });
}, { threshold:0.35 });
document.querySelectorAll('.stat-card').forEach(card => observer.observe(card));
