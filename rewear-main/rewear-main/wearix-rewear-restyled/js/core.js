// ============================================================
// core.js — Shared utilities loaded on every page
// ============================================================

// ---- MODAL SYSTEM ----
const CONFETTI_COLORS = ['#111111','#c8a96e','#e8d5b0','#6b6460','#d4a843','#8b7355','#f0e6d3'];

function spawnConfetti(container) {
  for (let i = 0; i < 38; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const size = Math.random() * 8 + 5;
    piece.style.cssText = `
      background:${CONFETTI_COLORS[Math.floor(Math.random()*CONFETTI_COLORS.length)]};
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%; top:-10px;
      border-radius:${Math.random()>.5?'50%':'2px'};
      animation-duration:${Math.random()*1.2+1}s;
      animation-delay:${Math.random()*0.6}s;
    `;
    container.appendChild(piece);
  }
}

let activeModal = null;

function showModal({ type = 'success', title, message, btnText = 'Got it', onClose }) {
  if (activeModal) closeModal(activeModal, true);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const iconMap = { success: '✓', error: '✕', loading: '' };
  const iconClass = type === 'success' ? 'success-icon' : type === 'error' ? 'error-icon' : 'loading-icon';
  overlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-confetti-area" id="modalConfettiArea">
        <div class="modal-icon-wrap ${iconClass}">
          ${type === 'loading' ? '<div class="modal-spinner"></div>' : `<span>${iconMap[type]}</span>`}
        </div>
      </div>
      <div class="modal-body">
        <h3 class="modal-title">${title}</h3>
        <p class="modal-message">${message}</p>
      </div>
      ${type !== 'loading' ? `<div class="modal-footer"><button class="modal-btn btn-dark" id="modalBtn">${btnText}</button></div>` : ''}
    </div>`;
  document.body.appendChild(overlay);
  activeModal = overlay;
  if (type === 'success') spawnConfetti(overlay.querySelector('#modalConfettiArea'));
  const btn = overlay.querySelector('#modalBtn');
  if (btn) btn.addEventListener('click', () => { closeModal(overlay); if (onClose) onClose(); });
  if (type !== 'loading') overlay.addEventListener('click', e => { if (e.target === overlay) { closeModal(overlay); if (onClose) onClose(); } });
  return overlay;
}

function closeModal(overlay, instant = false) {
  if (!overlay || !overlay.parentNode) return;
  if (instant) { overlay.remove(); if (activeModal === overlay) activeModal = null; return; }
  overlay.classList.add('modal-out');
  overlay.addEventListener('animationend', () => { overlay.remove(); if (activeModal === overlay) activeModal = null; }, { once: true });
}

function showSuccess(title, message, btnText = 'Got it, Thanks!') { return showModal({ type: 'success', title, message, btnText }); }
function showError(title, message, btnText = 'Try Again') { return showModal({ type: 'error', title, message, btnText }); }
function showLoadingModal(title = 'Loading…', message = 'Please wait.') { return showModal({ type: 'loading', title, message }); }
function hideLoadingModal() { if (activeModal) closeModal(activeModal); }


// ---- HELPERS ----
function starsFromRating(r) { const f = Math.round(r); return '★'.repeat(f) + '☆'.repeat(5 - f); }
function formatPrice(p) { return '$' + parseFloat(p).toFixed(2); }
function formatPHP(amount) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount).replace(/^PHP\s?/, '₱');
}
function formatDate(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }


// ---- MOBILE MENU ----
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');
if (mobileMenuToggle && navMenu) {
  mobileMenuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('mobile-open');
    mobileMenuToggle.classList.toggle('is-active');
  });
}


// ---- SMOOTH SCROLL ----
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});


// ---- STATS COUNTER ----
const statObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting || entry.target.classList.contains('animated')) return;
    const el = entry.target.querySelector('.stat-number');
    if (!el) return;
    const original = el.dataset.original || el.textContent.trim();
    el.dataset.original = original;
    const isK = original.includes('K'), isPercent = original.includes('%');
    const end = isK ? parseFloat(original) * 1000 : parseInt(original, 10);
    let startTs = null;
    const step = ts => {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / 1600, 1);
      const value = Math.floor(progress * end);
      el.textContent = isK ? `${(value/1000).toFixed(1)}K+` : isPercent ? `${value}%` : `${value}`;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    entry.target.classList.add('animated');
  });
}, { threshold: 0.35 });
document.querySelectorAll('.stat-card').forEach(card => statObserver.observe(card));


// ---- NEWSLETTER ----
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
    if (error) {
      if (error.code === '23505') showError('Already Subscribed', `${email} is already on our list.`, 'Got it');
      else showError('Something Went Wrong', 'Please try again.');
    } else { showSuccess("You're Subscribed!", `Updates coming to ${email}.`); input.value = ''; }
  };
  button.addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
});
