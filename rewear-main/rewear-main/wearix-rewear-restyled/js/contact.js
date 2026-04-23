// ============================================================
// contact.js — Contact form submission
// Used on: contact.html
// ============================================================

const contactForm = document.getElementById('contactForm');
if (!contactForm) throw new Error('contact.js loaded on wrong page');

contactForm.addEventListener('submit', async e => {
  e.preventDefault();
  const submitBtn = contactForm.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';
  showLoadingModal('Sending Message…', 'Delivering your message to our team.');

  const payload = {
    first_name: document.getElementById('firstName').value.trim(),
    last_name:  document.getElementById('lastName').value.trim(),
    email:      document.getElementById('email').value.trim(),
    phone:      document.getElementById('phone')?.value.trim() || null,
    subject:    document.getElementById('subject').value.trim(),
    message:    document.getElementById('message').value.trim()
  };

  const { error } = await db.from('contact_messages').insert(payload);
  hideLoadingModal();
  submitBtn.disabled = false;
  submitBtn.textContent = 'Send Message';

  if (error) {
    showError('Message Not Sent', 'Something went wrong. Please try again.');
    console.error('[contact.js] submit:', error.message);
  } else {
    showSuccess('Message Sent!', `Thanks ${payload.first_name}! We'll reply to ${payload.email} within 24 hours.`, 'Got it, Thanks!');
    contactForm.reset();
  }
});
