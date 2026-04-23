// ============================================================
// admin.js — Admin dashboard logic
// Used on: admin.html
// PIN: 1234 (change in Supabase admin_sessions table)
// ============================================================

// ---- PIN GATE ----
const CORRECT_PIN = '1234'; // simple client check — real hash check via Supabase
const adminGate      = document.getElementById('adminGate');
const adminDashboard = document.getElementById('adminDashboard');
const pinDigits      = document.querySelectorAll('.pin-digit');
const pinError       = document.getElementById('pinError');
const pinSubmitBtn   = document.getElementById('pinSubmitBtn');

// Auto-advance PIN digits
pinDigits.forEach((input, i) => {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '');
    if (input.value && i < pinDigits.length - 1) pinDigits[i + 1].focus();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !input.value && i > 0) pinDigits[i - 1].focus();
  });
});

function getPin() { return [...pinDigits].map(d => d.value).join(''); }

function unlockAdmin() {
  adminGate.classList.add('hidden');
  adminDashboard.classList.remove('hidden');
  sessionStorage.setItem('rewear_admin', '1');
  loadOverviewStats();
  startClock();
}

// Check if already logged in this session
if (sessionStorage.getItem('rewear_admin') === '1') unlockAdmin();

pinSubmitBtn.addEventListener('click', checkPin);
document.addEventListener('keydown', e => { if (e.key === 'Enter') checkPin(); });

function checkPin() {
  const pin = getPin();
  if (pin === CORRECT_PIN) {
    unlockAdmin();
  } else {
    pinError.classList.remove('hidden');
    pinDigits.forEach(d => { d.value = ''; d.classList.add('pin-error-shake'); });
    setTimeout(() => pinDigits.forEach(d => d.classList.remove('pin-error-shake')), 500);
    pinDigits[0].focus();
  }
}

document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
  sessionStorage.removeItem('rewear_admin');
  adminDashboard.classList.add('hidden');
  adminGate.classList.remove('hidden');
  pinDigits.forEach(d => d.value = '');
  pinDigits[0].focus();
});

// ---- CLOCK ----
function startClock() {
  const el = document.getElementById('adminClock');
  if (!el) return;
  const tick = () => { el.textContent = new Date().toLocaleTimeString(); };
  tick(); setInterval(tick, 1000);
}

// ---- TAB SWITCHING ----
document.querySelectorAll('.dash-nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const tab = link.dataset.tab;
    document.querySelectorAll('.dash-nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
    link.classList.add('active');
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    document.getElementById('dashPageTitle').textContent = link.textContent.trim();
    if (tab === 'sellers')      loadSellers();
    if (tab === 'listings')     loadListings();
    if (tab === 'orders')       loadOrders();
    if (tab === 'fees')         loadListingFees();
    if (tab === 'transactions') loadTransactions();
    if (tab === 'earnings')     loadAdminEarnings();
  });
});

// ---- UTILITY FUNCTIONS ----

/**
 * Compute the commission rate for a transaction.
 * @param {number} gross_amount - The full sale price paid by the buyer (PHP).
 * @param {string} seller_tier  - The seller's listing fee tier: 'basic' | 'standard' | 'premium'.
 * @returns {number} Commission rate as a decimal, e.g. 0.10 for 10%.
 */
function computeCommissionRate(gross_amount, seller_tier) {
  const base_rate = seller_tier === 'premium' ? 0.08 : 0.10;

  if (gross_amount > 1000) {
    return Math.min(base_rate, 0.06);
  } else if (gross_amount > 500) {
    return Math.min(base_rate, 0.08);
  } else {
    return base_rate;
  }
}

// ---- OVERVIEW STATS ----
async function loadOverviewStats() {
  const [
    { count: pendingSellers },
    { count: pendingListings },
    { count: totalOrders },
    { count: totalProducts }
  ] = await Promise.all([
    db.from('sellers').select('*', { count: 'exact', head: true }).eq('verified', false),
    db.from('products').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('orders').select('*', { count: 'exact', head: true }),
    db.from('products').select('*', { count: 'exact', head: true })
  ]);

  document.getElementById('statPendingSellers').textContent  = pendingSellers ?? 0;
  document.getElementById('statPendingListings').textContent = pendingListings ?? 0;
  document.getElementById('statTotalOrders').textContent     = totalOrders ?? 0;
  document.getElementById('statTotalProducts').textContent   = totalProducts ?? 0;

  // Attention list
  const { data: pendingSellerList } = await db.from('sellers').select('*').eq('verified', false).limit(3);
  const { data: pendingListingList } = await db.from('products').select('*').eq('status', 'pending').limit(3);
  const attentionList = document.getElementById('attentionList');

  const items = [
    ...(pendingSellerList || []).map(s => `
      <div class="admin-attention-row">
        <span class="dash-badge dash-badge-pending">Seller</span>
        <span class="admin-attention-name">${s.business_name}</span>
        <span class="admin-attention-meta">${s.email}</span>
        <button class="admin-btn admin-btn-approve" onclick="verifySeller('${s.id}', true)">Approve</button>
        <button class="admin-btn admin-btn-reject"  onclick="promptRejectSeller('${s.id}')">Reject</button>
      </div>`),
    ...(pendingListingList || []).map(p => `
      <div class="admin-attention-row">
        <span class="dash-badge" style="background:rgba(17,17,17,0.1);color:#555">Listing</span>
        <span class="admin-attention-name">${p.name}</span>
        <span class="admin-attention-meta">$${parseFloat(p.price).toFixed(2)}</span>
        <button class="admin-btn admin-btn-approve" onclick="approveListing('${p.id}')">Approve</button>
        <button class="admin-btn admin-btn-reject"  onclick="promptRejectListing('${p.id}')">Reject</button>
      </div>`)
  ];

  attentionList.innerHTML = items.length ? items.join('') : '<p class="dash-empty">Nothing needs attention right now.</p>';
}

// ---- SELLERS TAB ----
async function loadSellers() {
  const list = document.getElementById('sellersList');
  list.innerHTML = '<p class="dash-empty">Loading…</p>';

  const statusFilter = document.getElementById('sellerStatusFilter')?.value || 'all';
  const search = document.getElementById('sellerSearch')?.value.toLowerCase() || '';

  let query = db.from('sellers').select('*').order('created_at', { ascending: false });
  if (statusFilter === 'verified') query = query.eq('verified', true);
  if (statusFilter === 'pending')  query = query.eq('verified', false);

  const { data, error } = await query;
  if (error) { list.innerHTML = '<p class="dash-empty">Could not load sellers.</p>'; console.error('[admin] loadSellers:', error.message); return; }

  const filtered = search ? data.filter(s => s.business_name?.toLowerCase().includes(search) || s.email?.toLowerCase().includes(search)) : data;

  list.innerHTML = filtered.length
    ? filtered.map(s => `
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <h3 class="admin-card-title">${s.business_name}</h3>
              <p class="admin-card-meta">${s.email}${s.phone ? ` · ${s.phone}` : ''}</p>
              <p class="admin-card-meta">Applied: ${formatDate(s.created_at)}</p>
              ${s.description ? `<p class="admin-card-desc">${s.description}</p>` : ''}
            </div>
            <span class="dash-badge ${s.verified ? 'dash-badge-verified' : 'dash-badge-pending'}">${s.verified ? 'Verified' : 'Pending'}</span>
          </div>
          ${s.rejection_reason ? `<p class="admin-rejection-note">Rejected: ${s.rejection_reason}</p>` : ''}
          <div class="admin-card-actions">
            ${!s.verified ? `
              <button class="admin-btn admin-btn-approve" onclick="verifySeller('${s.id}', true)">✓ Approve Seller</button>
              <button class="admin-btn admin-btn-reject"  onclick="promptRejectSeller('${s.id}')">✕ Reject</button>
            ` : `
              <button class="admin-btn admin-btn-reject" onclick="verifySeller('${s.id}', false)">Revoke Verification</button>
            `}
          </div>
        </div>`).join('')
    : '<p class="dash-empty">No sellers found.</p>';
}

document.getElementById('sellerStatusFilter')?.addEventListener('change', loadSellers);
document.getElementById('sellerSearch')?.addEventListener('input', loadSellers);

// ---- VERIFY / REJECT SELLER ----
async function verifySeller(id, approve) {
  showLoadingModal(approve ? 'Approving Seller…' : 'Revoking…', 'Updating seller status.');
  const { error } = await db.from('sellers').update({
    verified: approve,
    verified_at: approve ? new Date().toISOString() : null,
    rejection_reason: approve ? null : undefined
  }).eq('id', id);
  hideLoadingModal();
  if (error) { showError('Update Failed', error.message); console.error('[admin] verifySeller:', error.message); return; }
  showSuccess(approve ? 'Seller Approved!' : 'Verification Revoked', approve ? 'The seller can now list products.' : 'Seller access has been revoked.', 'Got it');
  loadSellers();
  loadOverviewStats();
}

async function promptRejectSeller(id) {
  const reason = prompt('Reason for rejection (will be shown to seller):');
  if (reason === null) return;
  showLoadingModal('Rejecting…', 'Updating seller status.');
  const { error } = await db.from('sellers').update({ verified: false, rejection_reason: reason || 'Application rejected.' }).eq('id', id);
  hideLoadingModal();
  if (error) { showError('Update Failed', error.message); return; }
  showSuccess('Seller Rejected', 'The seller has been notified.', 'Got it');
  loadSellers();
  loadOverviewStats();
}

// ---- LISTINGS TAB ----
async function loadListings() {
  const list = document.getElementById('listingsList');
  list.innerHTML = '<p class="dash-empty">Loading…</p>';

  const statusFilter = document.getElementById('listingStatusFilter')?.value || 'pending';
  const search = document.getElementById('listingSearch')?.value.toLowerCase() || '';

  let query = db.from('products').select('*').order('created_at', { ascending: false });
  if (statusFilter !== 'all') query = query.eq('status', statusFilter);

  const { data, error } = await query;
  if (error) { list.innerHTML = '<p class="dash-empty">Could not load listings.</p>'; console.error('[admin] loadListings:', error.message); return; }

  const filtered = search ? data.filter(p => p.name?.toLowerCase().includes(search)) : data;

  list.innerHTML = filtered.length
    ? filtered.map(p => `
        <div class="admin-card">
          <div class="admin-card-header">
            <div class="admin-card-img-wrap">
              <img src="${p.image_url}" alt="${p.name}" class="admin-card-img">
            </div>
            <div style="flex:1">
              <h3 class="admin-card-title">${p.name}</h3>
              <p class="admin-card-meta">$${parseFloat(p.price).toFixed(2)} · ${p.category} · Sizes: ${(p.sizes||[]).join(', ')}</p>
              <p class="admin-card-meta">Added: ${formatDate(p.created_at)}</p>
              ${p.description ? `<p class="admin-card-desc">${p.description}</p>` : ''}
            </div>
            <span class="dash-badge ${p.status === 'approved' ? 'dash-badge-verified' : p.status === 'rejected' ? 'dash-badge-rejected' : 'dash-badge-pending'}">${p.status}</span>
          </div>
          ${p.rejection_reason ? `<p class="admin-rejection-note">Rejected: ${p.rejection_reason}</p>` : ''}
          <div class="admin-card-actions">
            ${p.status !== 'approved' ? `<button class="admin-btn admin-btn-approve" onclick="approveListing('${p.id}')">✓ Approve Listing</button>` : ''}
            ${p.status !== 'rejected' ? `<button class="admin-btn admin-btn-reject"  onclick="promptRejectListing('${p.id}')">✕ Reject</button>` : ''}
            ${p.status === 'rejected' ? `<button class="admin-btn admin-btn-approve" onclick="approveListing('${p.id}')">↺ Re-approve</button>` : ''}
          </div>
        </div>`).join('')
    : '<p class="dash-empty">No listings found.</p>';
}

document.getElementById('listingStatusFilter')?.addEventListener('change', loadListings);
document.getElementById('listingSearch')?.addEventListener('input', loadListings);

// ---- APPROVE / REJECT LISTING ----
async function approveListing(id) {
  showLoadingModal('Approving…', 'Making listing live in the shop.');
  const { error } = await db.from('products').update({ status: 'approved', in_stock: true, rejection_reason: null }).eq('id', id);
  hideLoadingModal();
  if (error) { showError('Update Failed', error.message); console.error('[admin] approveListing:', error.message); return; }
  showSuccess('Listing Approved!', 'The product is now live in the shop.', 'Got it');
  loadListings();
  loadOverviewStats();
}

async function promptRejectListing(id) {
  const reason = prompt('Reason for rejection (will be shown to seller):');
  if (reason === null) return;
  showLoadingModal('Rejecting…', 'Updating listing status.');
  const { error } = await db.from('products').update({ status: 'rejected', in_stock: false, rejection_reason: reason || 'Listing rejected.' }).eq('id', id);
  hideLoadingModal();
  if (error) { showError('Update Failed', error.message); return; }
  showSuccess('Listing Rejected', 'The seller will see the rejection reason.', 'Got it');
  loadListings();
  loadOverviewStats();
}

// ---- ORDERS TAB ----
async function loadOrders() {
  const list = document.getElementById('adminOrdersList');
  list.innerHTML = '<p class="dash-empty">Loading…</p>';

  const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
  let query = db.from('orders').select('*').order('created_at', { ascending: false });
  if (statusFilter !== 'all') query = query.eq('status', statusFilter);

  const { data, error } = await query;
  if (error) { list.innerHTML = '<p class="dash-empty">Could not load orders.</p>'; console.error('[admin] loadOrders:', error.message); return; }

  list.innerHTML = data?.length
    ? data.map(o => `
        <div class="dash-order-row">
          <div>
            <p class="dash-order-name">${o.buyer_name}</p>
            <p class="dash-order-meta">${o.buyer_email} · Size: ${o.size_selected || '—'} · $${parseFloat(o.total_price || 0).toFixed(2)}</p>
            <p class="dash-order-meta">${formatDate(o.created_at)}</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="dash-order-status status-${o.status}">${o.status}</span>
            <select class="sort-select" style="padding:6px 12px;font-size:12px" onchange="updateOrderStatus('${o.id}', this.value)">
              <option value="">Update status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>`).join('')
    : '<p class="dash-empty">No orders found.</p>';
}

document.getElementById('orderStatusFilter')?.addEventListener('change', loadOrders);

async function updateOrderStatus(id, status) {
  if (!status) return;

  // Update the order status first
  const { error } = await db.from('orders').update({ status }).eq('id', id);
  if (error) { showError('Update Failed', error.message); return; }

  if (status === 'confirmed') {
    // Auto-create transaction on confirmation
    showLoadingModal('Creating Transaction…', 'Calculating commission and recording transaction.');
    const { error: txnErr } = await createTransaction(id);
    if (txnErr) {
      console.error('[admin] updateOrderStatus: createTransaction failed:', txnErr.message);
    }
    hideLoadingModal();
    showSuccess('Order Updated', `Status changed to ${status}.`, 'Got it');

  } else if (status === 'delivered') {
    // Auto-release payout on delivery
    showLoadingModal('Releasing Payout…', 'Recording commission earnings and releasing seller payout.');
    const { data: orderRow, error: fetchErr } = await db
      .from('orders')
      .select('transaction_id')
      .eq('id', id)
      .single();

    if (!fetchErr && orderRow?.transaction_id) {
      const { error: releaseErr } = await releaseTransaction(orderRow.transaction_id);
      if (releaseErr) {
        console.error('[admin] updateOrderStatus: releaseTransaction failed:', releaseErr.message);
      }
    }
    hideLoadingModal();
    showSuccess('Order Updated', `Status changed to ${status}.`, 'Got it');

  } else {
    // All other statuses — just show success
    showSuccess('Order Updated', `Status changed to ${status}.`, 'Got it');
  }

  loadOrders();
}

// ---- TRANSACTION MANAGEMENT ----

/**
 * Create a transaction record when an order is confirmed.
 * Idempotent: if the order already has a transaction_id, returns the existing transaction.
 *
 * @param {string} order_id - UUID of the confirmed order
 * @returns {{ data: object|null, error: Error|null }}
 */
async function createTransaction(order_id) {
  // Step 1: Check for existing transaction (idempotent guard)
  const { data: existingOrder, error: existingOrderErr } = await db
    .from('orders')
    .select('transaction_id')
    .eq('id', order_id)
    .single();

  if (existingOrderErr) {
    return { data: null, error: existingOrderErr };
  }

  if (existingOrder?.transaction_id) {
    const { data: existingTxn, error: existingTxnErr } = await db
      .from('transactions')
      .select('*')
      .eq('id', existingOrder.transaction_id)
      .single();
    return { data: existingTxn ?? null, error: existingTxnErr ?? null };
  }

  // Step 2: Fetch order with product join
  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('*, products(seller_id, price)')
    .eq('id', order_id)
    .single();

  if (orderErr || !order) {
    return { data: null, error: new Error('Order not found') };
  }

  // Step 3: Extract seller_id and gross amount
  const seller_id = order.products?.seller_id;
  const gross = parseFloat(order.total_price);

  // Step 4: Fetch seller's active listing fee tier (fallback to 'basic')
  const { data: feeRecord } = await db
    .from('listing_fees')
    .select('tier')
    .eq('seller_id', seller_id)
    .eq('status', 'active')
    .limit(1)
    .single();

  const tier = feeRecord?.tier ?? 'basic';

  // Step 5: Compute commission
  const rate = computeCommissionRate(gross, tier);
  const commission = Math.round(gross * rate * 100) / 100;
  const payout = gross - commission;

  // Step 6: INSERT transaction
  const { data: transaction, error: insertErr } = await db
    .from('transactions')
    .insert({
      order_id,
      seller_id,
      gross_amount: gross,
      commission_rate: rate,
      commission_amount: commission,
      seller_payout: payout,
      status: 'pending'
    })
    .select()
    .single();

  if (insertErr) {
    return { data: null, error: insertErr };
  }

  // Step 7: UPDATE orders with transaction_id
  const { error: updateErr } = await db
    .from('orders')
    .update({ transaction_id: transaction.id })
    .eq('id', order_id);

  if (updateErr) {
    console.error('[admin] createTransaction: failed to link transaction to order:', updateErr.message);
  }

  return { data: transaction, error: null };
}

/**
 * Release a pending transaction payout and record the commission as platform earnings.
 *
 * @param {string} transaction_id - UUID of the transaction to release
 * @returns {{ error: Error|null }}
 */
async function releaseTransaction(transaction_id) {
  // Step 1: Fetch the transaction
  const { data: txn, error: fetchErr } = await db
    .from('transactions')
    .select('*')
    .eq('id', transaction_id)
    .single();

  if (fetchErr || !txn) {
    return { error: fetchErr ?? new Error('Transaction not found') };
  }

  // Step 2: Guard — must be in pending state
  if (txn.status !== 'pending') {
    return { error: new Error('Transaction is not in pending state') };
  }

  // Step 3: UPDATE transaction to released
  const { error: updateErr } = await db
    .from('transactions')
    .update({
      status: 'released',
      released_at: new Date().toISOString()
    })
    .eq('id', transaction_id);

  if (updateErr) {
    return { error: updateErr };
  }

  // Step 4: INSERT commission earnings row
  const { error: earningsErr } = await db
    .from('earnings')
    .insert({
      source: 'commission',
      reference_id: transaction_id,
      amount: txn.commission_amount
    });

  if (earningsErr) {
    return { error: earningsErr };
  }

  return { error: null };
}

/**
 * Manually mark a listing fee as paid (for cash/GCash payments outside the platform).
 * Updates the fee status to 'active' and records the amount as platform earnings.
 *
 * @param {string} fee_id        - UUID of the listing fee to mark as paid
 * @param {string} payment_method - Payment method: 'gcash' | 'cash' | 'bank_transfer' | 'manual'
 * @param {string} payment_ref   - Reference number or note for the payment
 * @returns {{ error: Error|null }}
 */
async function markFeePaid(fee_id, payment_method, payment_ref) {
  // Step 1: Fetch the fee record
  const { data: fee, error: fetchErr } = await db
    .from('listing_fees')
    .select('*')
    .eq('id', fee_id)
    .single();

  if (fetchErr || !fee) {
    return { error: fetchErr ?? new Error('Listing fee not found') };
  }

  // Step 2: UPDATE fee to active with payment details
  const { error: updateErr } = await db
    .from('listing_fees')
    .update({
      status: 'active',
      payment_method,
      payment_ref
    })
    .eq('id', fee_id);

  if (updateErr) {
    return { error: updateErr };
  }

  // Step 3: INSERT listing fee earnings row
  const { error: earningsErr } = await db
    .from('earnings')
    .insert({
      source: 'listing_fee',
      reference_id: fee_id,
      amount: fee.amount_paid
    });

  if (earningsErr) {
    return { error: earningsErr };
  }

  return { error: null };
}

// ---- ADMIN LIST LOADERS ----

/**
 * Load all listing fee payments and render them to #feesList.
 */
async function loadListingFees() {
  const list = document.getElementById('feesList');
  list.innerHTML = '<p class="dash-empty">Loading…</p>';

  const { data, error } = await db
    .from('listing_fees')
    .select('*, sellers(business_name, email)')
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = '<p class="dash-empty">Could not load fees.</p>';
    console.error('[admin] loadListingFees:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = '<p class="dash-empty">No listing fees found.</p>';
    return;
  }

  list.innerHTML = data.map(fee => {
    const badgeClass = fee.status === 'active' ? 'dash-badge-verified' : 'dash-badge-pending';
    const tierLabel  = fee.tier ? fee.tier.charAt(0).toUpperCase() + fee.tier.slice(1) : '—';
    const markPaidBtn = fee.status !== 'active'
      ? `<button class="admin-btn admin-btn-approve" onclick="adminMarkFeePaid('${fee.id}')">Mark as Paid</button>`
      : '';
    return `
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3 class="admin-card-title">${fee.sellers?.business_name ?? '—'}</h3>
            <p class="admin-card-meta">${fee.sellers?.email ?? '—'}</p>
            <p class="admin-card-meta">Tier: ${tierLabel} · Amount: ${formatPHP(fee.amount_paid)} · Listings: ${fee.listings_used}/${fee.max_listings}</p>
            <p class="admin-card-meta">Paid: ${formatDate(fee.paid_at)}</p>
          </div>
          <span class="dash-badge ${badgeClass}">${fee.status}</span>
        </div>
        <div class="admin-card-actions">
          ${markPaidBtn}
        </div>
      </div>`;
  }).join('');
}

/**
 * Load all transactions and render them to #transactionsList.
 */
async function loadTransactions() {
  const list = document.getElementById('transactionsList');
  list.innerHTML = '<p class="dash-empty">Loading…</p>';

  const { data, error } = await db
    .from('transactions')
    .select('*, orders(buyer_name, total_price), sellers(business_name)')
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = '<p class="dash-empty">Could not load transactions.</p>';
    console.error('[admin] loadTransactions:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = '<p class="dash-empty">No transactions found.</p>';
    return;
  }

  list.innerHTML = data.map(txn => {
    const badgeClass = txn.status === 'released' ? 'dash-badge-verified' : 'dash-badge-pending';
    const ratePercent = txn.commission_rate != null
      ? `${Math.round(txn.commission_rate * 100)}%`
      : '—';
    const releaseBtn = txn.status === 'pending'
      ? `<button class="admin-btn admin-btn-approve" onclick="adminReleaseTransaction('${txn.id}')">Release Payout</button>`
      : '';
    return `
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3 class="admin-card-title">${txn.sellers?.business_name ?? '—'}</h3>
            <p class="admin-card-meta">Buyer: ${txn.orders?.buyer_name ?? '—'}</p>
            <p class="admin-card-meta">Gross: ${formatPHP(txn.gross_amount)} · Commission: ${formatPHP(txn.commission_amount)} (${ratePercent}) · Payout: ${formatPHP(txn.seller_payout)}</p>
            <p class="admin-card-meta">Created: ${formatDate(txn.created_at)}</p>
          </div>
          <span class="dash-badge ${badgeClass}">${txn.status}</span>
        </div>
        <div class="admin-card-actions">
          ${releaseBtn}
        </div>
      </div>`;
  }).join('');
}

/**
 * Load admin earnings summary and render to #earningsSummary.
 */
async function loadAdminEarnings() {
  const summary = document.getElementById('earningsSummary');
  summary.innerHTML = '<p class="dash-empty">Loading…</p>';

  const { data, error } = await db.from('earnings').select('source, amount');

  if (error) {
    summary.innerHTML = '<p class="dash-empty">Could not load earnings.</p>';
    console.error('[admin] loadAdminEarnings:', error.message);
    return;
  }

  const rows = data || [];
  const totalFees        = rows.filter(e => e.source === 'listing_fee').reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalCommissions = rows.filter(e => e.source === 'commission').reduce((s, e) => s + parseFloat(e.amount), 0);
  const grandTotal       = totalFees + totalCommissions;

  summary.innerHTML = `
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      <div class="admin-stat-card">
        <p class="admin-stat-label">Total Listing Fees</p>
        <p class="admin-stat-value">${formatPHP(totalFees)}</p>
      </div>
      <div class="admin-stat-card">
        <p class="admin-stat-label">Total Commissions</p>
        <p class="admin-stat-value">${formatPHP(totalCommissions)}</p>
      </div>
      <div class="admin-stat-card">
        <p class="admin-stat-label">Grand Total Revenue</p>
        <p class="admin-stat-value">${formatPHP(grandTotal)}</p>
      </div>
    </div>`;
}

// ---- INLINE ACTION WRAPPERS (called from onclick in rendered cards) ----

/**
 * Wrapper: mark a listing fee as paid, then refresh the fees list.
 */
async function adminMarkFeePaid(fee_id) {
  showLoadingModal('Marking as Paid…', 'Updating fee status.');
  const { error } = await markFeePaid(fee_id, 'manual', '');
  hideLoadingModal();
  if (error) { showError('Update Failed', error.message); console.error('[admin] adminMarkFeePaid:', error.message); return; }
  showSuccess('Fee Marked as Paid', 'The listing fee is now active.', 'Got it');
  loadListingFees();
}

/**
 * Wrapper: release a transaction payout, then refresh the transactions list.
 */
async function adminReleaseTransaction(transaction_id) {
  showLoadingModal('Releasing Payout…', 'Recording commission and releasing seller payout.');
  const { error } = await releaseTransaction(transaction_id);
  hideLoadingModal();
  if (error) { showError('Release Failed', error.message); console.error('[admin] adminReleaseTransaction:', error.message); return; }
  showSuccess('Payout Released', 'The seller payout has been released.', 'Got it');
  loadTransactions();
}

// Expose functions globally for inline onclick handlers
window.verifySeller           = verifySeller;
window.promptRejectSeller     = promptRejectSeller;
window.approveListing         = approveListing;
window.promptRejectListing    = promptRejectListing;
window.updateOrderStatus      = updateOrderStatus;
window.createTransaction      = createTransaction;
window.releaseTransaction     = releaseTransaction;
window.markFeePaid            = markFeePaid;
window.loadListingFees        = loadListingFees;
window.loadTransactions       = loadTransactions;
window.loadAdminEarnings      = loadAdminEarnings;
window.adminMarkFeePaid       = adminMarkFeePaid;
window.adminReleaseTransaction = adminReleaseTransaction;
