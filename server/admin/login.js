const form = document.getElementById('login-form');
const statusEl = document.getElementById('login-status');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  statusEl.className = 'form-status';
  statusEl.textContent = 'Connexion...';

  const body = Object.fromEntries(new FormData(form).entries());
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    statusEl.className = 'form-status error';
    statusEl.textContent = data.error || 'Connexion refusee';
    return;
  }

  window.location.href = '/admin';
});
