// ============================================================
// dashboard-seller.js — Seller dashboard logic
// Used on: dashboard-seller.html
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
    if (tab === 'listings') loadSellerListings();
    if (tab === 'orders')   loadSellerOrders();
    if (tab === 'fees')     loadFeesTab();
    if (tab === 'earnings') loadEarningsTab();
    if (tab === 'payouts')  loadPayoutsTab();
  });
});

// Shortcut: Add Listing button
document.getElementById('addProductBtn')?.addEventListener('click', () => {
  document.querySelector('[data-tab="add"]')?.click();
});

// ---- OVERVIEW STATS ----
async function loadOverviewStats() {
  const { count: listingCount } = await db.from('products').select('*', { count: 'exact', head: true });
  const { count: orderCount }   = await db.from('orders').select('*', { count: 'exact', head: true });
  const { count: pendingCount } = await db.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending');

  const el = id => document.getElementById(id);
  if (el('statListings')) el('statListings').textContent = listingCount ?? 0;
  if (el('statOrders'))   el('statOrders').textContent   = orderCount ?? 0;
  if (el('statPending'))  el('statPending').textContent  = pendingCount ?? 0;

  // Recent orders preview
  const { data: recentOrders } = await db.from('orders').select('*').order('created_at', { ascending: false }).limit(5);
  const list = document.getElementById('recentOrdersList');
  if (list) {
    list.innerHTML = recentOrders?.length
      ? recentOrders.map(o => orderRowHTML(o)).join('')
      : '<p class="dash-empty">No orders yet.</p>';
  }
}

// ---- LISTINGS TAB ----
async function loadSellerListings() {
  const grid = document.getElementById('sellerListingsGrid');
  if (!grid) return;
  grid.innerHTML = '<p class="dash-empty">Loading…</p>';

  const sort = document.getElementById('listingSort')?.value || 'newest';
  let query = db.from('products').select('*');
  if (sort === 'price_asc')  query = query.order('price', { ascending: true });
  if (sort === 'price_desc') query = query.order('price', { ascending: false });
  if (sort === 'newest')     query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) { grid.innerHTML = '<p class="dash-empty">Could not load listings.</p>'; console.error('[seller] loadListings:', error.message); return; }

  const search = document.getElementById('listingSearch')?.value.toLowerCase() || '';
  const filtered = search ? data.filter(p => p.name.toLowerCase().includes(search)) : data;

  grid.innerHTML = filtered.length
    ? filtered.map(p => `
        <div class="product-card" style="cursor:default">
          <div class="product-image"><img src="${p.image_url}" alt="${p.name}" loading="lazy"></div>
          <div class="product-info">
            <h3 class="product-name">${p.name}</h3>
            <p class="product-price">$${parseFloat(p.price).toFixed(2)}</p>
            <div class="product-sizes">${(p.sizes||[]).map(s=>`<span class="size-tag">${s}</span>`).join('')}</div>
            <span class="${p.in_stock ? 'pd-instock' : 'pd-outstock'}">${p.in_stock ? '✓ In Stock' : '✕ Out of Stock'}</span>
          </div>
        </div>`).join('')
    : '<p class="dash-empty">No listings found.</p>';
}

document.getElementById('listingSearch')?.addEventListener('input', loadSellerListings);
document.getElementById('listingSort')?.addEventListener('change', loadSellerListings);

// ---- ORDERS TAB ----
function orderRowHTML(o) {
  return `
    <div class="dash-order-row">
      <div>
        <p class="dash-order-name">${o.buyer_name}</p>
        <p class="dash-order-meta">${o.buyer_email} · Size: ${o.size_selected || '—'} · $${parseFloat(o.total_price||0).toFixed(2)}</p>
        <p class="dash-order-meta">${new Date(o.created_at).toLocaleDateString()}</p>
      </div>
      <span class="dash-order-status status-${o.status}">${o.status}</span>
    </div>`;
}

async function loadSellerOrders() {
  const list = document.getElementById('sellerOrdersList');
  if (!list) return;
  list.innerHTML = '<p class="dash-empty">Loading…</p>';

  const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
  let query = db.from('orders').select('*').order('created_at', { ascending: false });
  if (statusFilter !== 'all') query = query.eq('status', statusFilter);

  const { data, error } = await query;
  if (error) { list.innerHTML = '<p class="dash-empty">Could not load orders.</p>'; console.error('[seller] loadOrders:', error.message); return; }
  list.innerHTML = data?.length ? data.map(o => orderRowHTML(o)).join('') : '<p class="dash-empty">No orders found.</p>';
}

document.getElementById('orderStatusFilter')?.addEventListener('change', loadSellerOrders);

// ============================================================
// LISTING FEE FUNCTIONS
// ============================================================

// ---- CHECK LISTING FEE AVAILABILITY ----
// Returns { available: true, fee } or { available: false, fee: null, reason: '...' }
async function checkListingFeeAvailability(seller_id) {
  // Query for an active fee that still has slots remaining
  const { data: fees, error } = await db
    .from('listing_fees')
    .select('*')
    .eq('seller_id', seller_id)
    .eq('status', 'active')
    .order('expires_at', { ascending: true });

  if (error) {
    console.error('[seller] checkListingFeeAvailability:', error.message);
    return { available: false, fee: null, reason: 'Could not check listing fee availability.' };
  }

  if (!fees || fees.length === 0) {
    return { available: false, fee: null, reason: 'No active listing fee found. Please purchase a listing tier.' };
  }

  const now = new Date();

  for (const fee of fees) {
    // Check expiry first
    if (fee.expires_at && new Date(fee.expires_at) < now) {
      // Mark as expired in DB
      await db.from('listing_fees').update({ status: 'expired' }).eq('id', fee.id);
      continue; // try next fee
    }

    // Check slots remaining
    if (fee.listings_used >= fee.max_listings) {
      continue; // exhausted, try next
    }

    // This fee is valid and has slots
    return { available: true, fee };
  }

  // All fees were either expired or exhausted
  return {
    available: false,
    fee: null,
    reason: 'Your listing fee has expired or all listing slots are exhausted. Please purchase a new tier.'
  };
}

// ---- RECORD LISTING FEE ----
// Records a listing fee payment for the given seller and tier.
// Returns { data: fee, error } matching the Supabase response pattern.
async function recordListingFee(seller_id, tier) {
  const tierConfig = {
    basic:    { amount_paid: 99,  max_listings: 3,  days: 30 },
    standard: { amount_paid: 249, max_listings: 10, days: 60 },
    premium:  { amount_paid: 499, max_listings: 25, days: 90 }
  };

  const config = tierConfig[tier];
  if (!config) {
    return { data: null, error: new Error(`Invalid tier: ${tier}. Must be basic, standard, or premium.`) };
  }

  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + config.days);

  // INSERT into listing_fees
  const { data: feeRows, error: feeError } = await db
    .from('listing_fees')
    .insert({
      seller_id,
      tier,
      amount_paid:   config.amount_paid,
      max_listings:  config.max_listings,
      listings_used: 0,
      status:        'active',
      expires_at:    expires_at.toISOString()
    })
    .select()
    .single();

  if (feeError) {
    console.error('[seller] recordListingFee (insert fee):', feeError.message);
    return { data: null, error: feeError };
  }

  const fee = feeRows;

  // INSERT into earnings
  const { error: earningsError } = await db
    .from('earnings')
    .insert({
      source:       'listing_fee',
      reference_id: fee.id,
      amount:       config.amount_paid
    });

  if (earningsError) {
    // Non-fatal: fee was recorded, earnings entry failed — log and continue
    console.error('[seller] recordListingFee (insert earnings):', earningsError.message);
  }

  return { data: fee, error: null };
}

// ---- SUBMIT LISTING ----
// Verifies seller and fee availability, then inserts the product.
// Returns { data: product, error } matching the Supabase response pattern.
async function submitListing(seller_id, productPayload) {
  // Guard: seller must be verified
  const { data: seller, error: sellerError } = await db
    .from('sellers')
    .select('verified')
    .eq('id', seller_id)
    .single();

  if (sellerError || !seller) {
    return { data: null, error: new Error('Could not verify seller account.') };
  }

  if (!seller.verified) {
    return { data: null, error: new Error('Seller not yet verified by admin.') };
  }

  // Guard: active listing fee with slots remaining
  const { available, fee, reason } = await checkListingFeeAvailability(seller_id);
  if (!available) {
    return { data: null, error: new Error(reason) };
  }

  // INSERT product
  const { data: productRows, error: productError } = await db
    .from('products')
    .insert({
      ...productPayload,
      seller_id,
      listing_fee_id: fee.id,
      status: 'pending'
    })
    .select()
    .single();

  if (productError) {
    console.error('[seller] submitListing (insert product):', productError.message);
    return { data: null, error: productError };
  }

  // UPDATE listing_fees: increment listings_used, set exhausted if at limit
  const newUsed = fee.listings_used + 1;
  const newStatus = newUsed >= fee.max_listings ? 'exhausted' : 'active';

  const { error: updateError } = await db
    .from('listing_fees')
    .update({ listings_used: newUsed, status: newStatus })
    .eq('id', fee.id);

  if (updateError) {
    // Non-fatal: product was inserted, counter update failed — log and continue
    console.error('[seller] submitListing (update listings_used):', updateError.message);
  }

  return { data: productRows, error: null };
}

// ---- LOAD SELLER EARNINGS ----
// Returns aggregated earnings data for the seller's transactions.
// { totalGross, totalCommission, totalPayout, orders: Transaction[] }
async function loadSellerEarnings(seller_id) {
  const { data: orders, error } = await db
    .from('transactions')
    .select('gross_amount, commission_amount, seller_payout, status, created_at')
    .eq('seller_id', seller_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[seller] loadSellerEarnings:', error.message);
    return { totalGross: 0, totalCommission: 0, totalPayout: 0, orders: [] };
  }

  const rows = orders || [];

  const totalGross      = rows.reduce((sum, t) => sum + parseFloat(t.gross_amount      || 0), 0);
  const totalCommission = rows.reduce((sum, t) => sum + parseFloat(t.commission_amount || 0), 0);
  const totalPayout     = rows
    .filter(t => t.status === 'released')
    .reduce((sum, t) => sum + parseFloat(t.seller_payout || 0), 0);

  return { totalGross, totalCommission, totalPayout, orders: rows };
}

// ============================================================
// FEES / EARNINGS / PAYOUTS TAB HANDLERS
// ============================================================

// ---- FEES TAB ----
async function loadFeesTab() {
  const currentSellerId = sessionStorage.getItem('rewear_seller_id');
  const statusEl = document.getElementById('currentFeeStatus');
  if (!statusEl) return;

  if (!currentSellerId) {
    statusEl.innerHTML = '<p class="dash-empty">Seller session not found. Please log in.</p>';
    return;
  }

  statusEl.innerHTML = '<p class="dash-empty">Loading fee status…</p>';

  const { available, fee, reason } = await checkListingFeeAvailability(currentSellerId);

  if (available && fee) {
    const remaining = fee.max_listings - fee.listings_used;
    const expiryText = fee.expires_at
      ? `Expires: ${formatDate(fee.expires_at)}`
      : 'No expiry';
    statusEl.innerHTML = `
      <div class="dash-verify-info">
        <div class="dash-verify-icon">✓</div>
        <div>
          <p class="dash-verify-title">Active — ${fee.tier.charAt(0).toUpperCase() + fee.tier.slice(1)} Tier</p>
          <p class="dash-verify-text">Listings used: ${fee.listings_used} / ${fee.max_listings} &nbsp;·&nbsp; ${remaining} slot${remaining !== 1 ? 's' : ''} remaining</p>
          <p class="dash-verify-text">${expiryText}</p>
        </div>
      </div>`;
  } else {
    statusEl.innerHTML = `
      <div class="dash-verify-info">
        <div class="dash-verify-icon" style="color:#c0392b;">✕</div>
        <div>
          <p class="dash-verify-title">No Active Listing Fee</p>
          <p class="dash-verify-text">${reason || 'Please purchase a listing tier to start listing products.'}</p>
        </div>
      </div>`;
  }
}

// ---- PURCHASE TIER BUTTON ----
document.getElementById('purchaseTierBtn')?.addEventListener('click', async () => {
  const tier = document.querySelector('input[name="feeTier"]:checked')?.value;
  if (!tier) {
    showError('No Tier Selected', 'Please select a listing tier before purchasing.');
    return;
  }

  const currentSellerId = sessionStorage.getItem('rewear_seller_id');
  if (!currentSellerId) {
    showError('Not Logged In', 'Seller session not found. Please log in again.');
    return;
  }

  const btn = document.getElementById('purchaseTierBtn');
  btn.disabled = true;
  btn.textContent = 'Processing…';

  showLoadingModal('Processing…', 'Recording your listing fee purchase.');
  const { data: fee, error } = await recordListingFee(currentSellerId, tier);
  hideLoadingModal();

  btn.disabled = false;
  btn.textContent = 'Purchase Tier';

  if (error) {
    showError('Purchase Failed', error.message);
    console.error('[seller] purchaseTier:', error.message);
  } else {
    showSuccess(
      'Tier Purchased!',
      `You can now list up to ${fee.max_listings} product${fee.max_listings !== 1 ? 's' : ''} with your ${fee.tier.charAt(0).toUpperCase() + fee.tier.slice(1)} tier.`,
      'Got it'
    );
    // Refresh fee status display
    await loadFeesTab();
  }
});

// ---- EARNINGS TAB ----
async function loadEarningsTab() {
  const currentSellerId = sessionStorage.getItem('rewear_seller_id');
  const listEl = document.getElementById('sellerEarningsList');

  const grossEl      = document.getElementById('earningsTotalGross');
  const commissionEl = document.getElementById('earningsTotalCommission');
  const payoutEl     = document.getElementById('earningsTotalPayout');

  if (!listEl) return;

  if (!currentSellerId) {
    listEl.innerHTML = '<p class="dash-empty">Seller session not found. Please log in.</p>';
    return;
  }

  listEl.innerHTML = '<p class="dash-empty">Loading earnings…</p>';

  const { totalGross, totalCommission, totalPayout, orders } = await loadSellerEarnings(currentSellerId);

  // Update summary cards
  if (grossEl)      grossEl.textContent      = formatPHP(totalGross);
  if (commissionEl) commissionEl.textContent = formatPHP(totalCommission);
  if (payoutEl)     payoutEl.textContent     = formatPHP(totalPayout);

  if (!orders || orders.length === 0) {
    listEl.innerHTML = '<p class="dash-empty">No earnings data yet.</p>';
    return;
  }

  listEl.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
      <thead>
        <tr style="border-bottom:2px solid #e8d5b0;text-align:left;">
          <th style="padding:8px 12px;">Date</th>
          <th style="padding:8px 12px;">Gross</th>
          <th style="padding:8px 12px;">Commission</th>
          <th style="padding:8px 12px;">Net Payout</th>
          <th style="padding:8px 12px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(t => `
          <tr style="border-bottom:1px solid #f0e6d3;">
            <td style="padding:8px 12px;">${formatDate(t.created_at)}</td>
            <td style="padding:8px 12px;">${formatPHP(t.gross_amount)}</td>
            <td style="padding:8px 12px;">${formatPHP(t.commission_amount)}</td>
            <td style="padding:8px 12px;">${formatPHP(t.seller_payout)}</td>
            <td style="padding:8px 12px;"><span class="dash-order-status status-${t.status}">${t.status}</span></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ---- PAYOUTS TAB ----
async function loadPayoutsTab() {
  const currentSellerId = sessionStorage.getItem('rewear_seller_id');
  const balanceEl = document.getElementById('pendingPayoutBalance');
  const historyEl = document.getElementById('payoutHistoryList');

  if (!balanceEl || !historyEl) return;

  if (!currentSellerId) {
    balanceEl.innerHTML = '<p class="dash-empty">Seller session not found. Please log in.</p>';
    historyEl.innerHTML = '';
    return;
  }

  balanceEl.innerHTML = '<p class="dash-empty">Loading…</p>';
  historyEl.innerHTML = '<p class="dash-empty">Loading…</p>';

  // Query released transactions (payout history)
  const { data: released, error: releasedError } = await db
    .from('transactions')
    .select('*')
    .eq('seller_id', currentSellerId)
    .eq('status', 'released')
    .order('released_at', { ascending: false });

  if (releasedError) {
    console.error('[seller] loadPayoutsTab (released):', releasedError.message);
    historyEl.innerHTML = '<p class="dash-empty">Could not load payout history.</p>';
  }

  // Query pending transactions to compute pending balance
  const { data: pending, error: pendingError } = await db
    .from('transactions')
    .select('seller_payout')
    .eq('seller_id', currentSellerId)
    .eq('status', 'pending');

  if (pendingError) {
    console.error('[seller] loadPayoutsTab (pending):', pendingError.message);
  }

  // Compute pending balance
  const pendingBalance = (pending || []).reduce((sum, t) => sum + parseFloat(t.seller_payout || 0), 0);

  // Render pending balance
  if (pendingBalance > 0) {
    balanceEl.innerHTML = `
      <div class="dash-verify-info">
        <div>
          <p class="dash-verify-title" style="font-size:1.5rem;">${formatPHP(pendingBalance)}</p>
          <p class="dash-verify-text">Awaiting release by admin after order delivery.</p>
        </div>
      </div>`;
  } else {
    balanceEl.innerHTML = '<p class="dash-empty">No pending payouts.</p>';
  }

  // Render payout history
  const releasedRows = released || [];
  if (releasedRows.length === 0) {
    historyEl.innerHTML = '<p class="dash-empty">No payout history yet.</p>';
    return;
  }

  historyEl.innerHTML = releasedRows.map(t => `
    <div class="dash-order-row">
      <div>
        <p class="dash-order-name">${formatPHP(t.seller_payout)} released</p>
        <p class="dash-order-meta">Gross: ${formatPHP(t.gross_amount)} &nbsp;·&nbsp; Commission: ${formatPHP(t.commission_amount)}</p>
        <p class="dash-order-meta">Released: ${t.released_at ? formatDate(t.released_at) : '—'}</p>
      </div>
      <span class="dash-order-status status-released">released</span>
    </div>`).join('');
}

// ---- ADD PRODUCT FORM ----
document.getElementById('addProductForm')?.addEventListener('submit', async e => {
  e.preventDefault();

  // Read seller ID from sessionStorage (established key: rewear_seller_id)
  const currentSellerId = sessionStorage.getItem('rewear_seller_id');
  if (!currentSellerId) {
    showError('Not Logged In', 'Could not find your seller session. Please log in again.');
    return;
  }

  const sizes = [...document.querySelectorAll('.size-checkboxes input:checked')].map(cb => cb.value);
  const payload = {
    name:             document.getElementById('newName').value.trim(),
    price:            parseFloat(document.getElementById('newPrice').value),
    category:         document.getElementById('newCategory').value,
    suggested_price:  parseFloat(document.getElementById('newSuggestedPrice').value) || null,
    image_url:        document.getElementById('newImageUrl').value.trim(),
    description:      document.getElementById('newDescription').value.trim(),
    sizes:            sizes.length ? sizes : ['S', 'M', 'L'],
    in_stock:         true
  };

  showLoadingModal('Submitting…', 'Sending your listing for admin review.');
  const { data: product, error } = await submitListing(currentSellerId, payload);
  hideLoadingModal();

  if (error) {
    const msg = error.message || '';
    console.error('[seller] addProduct:', msg);

    if (msg.toLowerCase().includes('not yet verified')) {
      // Error Scenario 5: seller not yet verified
      showError('Not Verified', 'Your seller account is pending admin approval.');
    } else if (msg.toLowerCase().includes('listing fee') || msg.toLowerCase().includes('no active')) {
      // Error Scenarios 1 & 2: no active fee or fee expired/exhausted
      showError('Cannot List', msg, 'Go to Fees');
      // Redirect to Fees tab
      document.querySelector('[data-tab="fees"]')?.click();
    } else {
      showError('Failed to Submit', msg);
    }
  } else {
    showSuccess('Listing Submitted!', 'Listing submitted for admin review.', 'Got it');
    document.getElementById('addProductForm').reset();
  }
});

// ---- SELLER PROFILE FORM ----
document.getElementById('sellerProfileForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    business_name: document.getElementById('bizName').value.trim(),
    email:         document.getElementById('bizEmail').value.trim(),
    phone:         document.getElementById('bizPhone').value.trim(),
    description:   document.getElementById('bizDesc').value.trim()
  };
  showLoadingModal('Saving…', 'Updating your seller profile.');
  const { error } = await db.from('sellers').insert(payload);
  hideLoadingModal();
  if (error) {
    if (error.code === '23505') showError('Email Taken', 'This email is already registered as a seller.');
    else showError('Save Failed', error.message);
    console.error('[seller] saveProfile:', error.message);
  } else {
    showSuccess('Profile Saved!', 'Your seller profile has been submitted for review.', 'Got it');
  }
});

// ---- INIT ----
loadOverviewStats();
