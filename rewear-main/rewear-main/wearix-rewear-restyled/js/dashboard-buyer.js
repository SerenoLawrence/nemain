// ============================================================
// dashboard-buyer.js — Buyer dashboard logic
// Used on: dashboard-buyer.html
// ============================================================

// ---- TAB SWITCHING ----
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
    if (tab === 'orders')   loadBuyerOrders();
  });
});

// ---- ORDERS TAB ----
async function loadBuyerOrders() {
  const list = document.getElementById('buyerOrdersList');
  if (!list) return;
  list.innerHTML = '<p class="dash-empty">Loading…</p>';

  // For now, show all orders (no user auth yet)
  // Once auth is added, filter by buyer_email matching logged-in user
  const { data, error } = await db.from('orders').select('*').order('created_at', { ascending: false }).limit(20);
  if (error) {
    list.innerHTML = '<p class="dash-empty">Could not load orders.</p>';
    console.error('[buyer] loadOrders:', error.message);
    return;
  }

  list.innerHTML = data?.length
    ? data.map(o => `
        <div class="dash-order-row">
          <div>
            <p class="dash-order-name">Order #${o.id.slice(0, 8)}</p>
            <p class="dash-order-meta">Size: ${o.size_selected || '—'} · Total: $${parseFloat(o.total_price || 0).toFixed(2)}</p>
            <p class="dash-order-meta">${new Date(o.created_at).toLocaleDateString()}</p>
          </div>
          <span class="dash-order-status status-${o.status}">${o.status}</span>
        </div>`).join('')
    : '<p class="dash-empty">No orders yet. <a href="shop.html">Start shopping</a></p>';
}

// ---- WISHLIST TAB ----
function renderWishlistDash() {
  const grid = document.getElementById('wishlistGrid');
  if (!grid) return;
  const saved = JSON.parse(localStorage.getItem('wearix-wishlist') || '[]');
  if (!saved.length) {
    grid.innerHTML = '<p class="dash-empty">Your wishlist is empty. <a href="shop.html">Browse products</a></p>';
    return;
  }
  grid.innerHTML = saved.map(name => `
    <div class="dash-wishlist-item">
      <p class="product-name">${name}</p>
      <a href="shop.html" class="dash-link">View in Shop</a>
    </div>`).join('');
}

// ---- BUYER PROFILE FORM ----
document.getElementById('buyerProfileForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    first_name: document.getElementById('buyerFirstName').value.trim(),
    last_name:  document.getElementById('buyerLastName').value.trim(),
    email:      document.getElementById('buyerEmail').value.trim(),
    phone:      document.getElementById('buyerPhone').value.trim()
  };
  showSuccess('Profile Saved!', 'Your profile has been updated.', 'Got it');
  console.log('[buyer] saveProfile:', payload);
  // TODO: Save to Supabase users table once auth is implemented
});

// ---- BECOME SELLER FORM ----
document.getElementById('becomeSellerForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    business_name: document.getElementById('applyBizName').value.trim(),
    email:         document.getElementById('applyBizEmail').value.trim(),
    phone:         document.getElementById('applyBizPhone').value.trim(),
    description:   document.getElementById('applyBizDesc').value.trim()
  };
  showLoadingModal('Submitting…', 'Sending your seller application.');
  const { error } = await db.from('sellers').insert(payload);
  hideLoadingModal();
  if (error) {
    if (error.code === '23505') showError('Already Applied', 'This email already has a seller application.', 'Got it');
    else showError('Submission Failed', error.message);
    console.error('[buyer] becomeSellerForm:', error.message);
  } else {
    showSuccess('Application Sent!', 'Our team will review your application within 1-3 business days.', 'Got it, Thanks!');
  }
});

// ---- INIT ----
loadBuyerOrders();
