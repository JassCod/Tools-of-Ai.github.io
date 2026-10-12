const $ = (id) => document.getElementById(id);
const views = { login: $('loginView'), edit: $('editView'), loading: $('loadingView') };
const form = $('contentForm');

function show(name) {
  Object.entries(views).forEach(([k, v]) => (v.hidden = k !== name));
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function loadEditor() {
  const { data } = await api('/api/content');
  for (const [key, value] of Object.entries(data)) {
    if (form.elements[key]) form.elements[key].value = value || '';
  }
  show('edit');
}

async function init() {
  const { data } = await api('/api/session');
  if (data.owner) loadEditor();
  else { show('login'); $('password').focus(); }
}

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('loginMsg');
  msg.textContent = 'Signing in…';
  msg.className = 'msg';
  const { ok, data } = await api('/api/login', { method: 'POST', body: JSON.stringify({ password: $('password').value }) });
  if (ok) {
    $('password').value = '';
    msg.textContent = '';
    loadEditor();
  } else {
    msg.textContent = data.error || 'Sign-in failed';
    msg.className = 'msg msg--err';
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('saveMsg');
  const payload = Object.fromEntries(new FormData(form).entries());
  $('saveBtn').disabled = true;
  msg.textContent = 'Saving…';
  msg.className = 'msg';
  const { ok, status, data } = await api('/api/content', { method: 'PUT', body: JSON.stringify(payload) });
  $('saveBtn').disabled = false;
  if (ok) {
    for (const [key, value] of Object.entries(data.content)) {
      if (form.elements[key]) form.elements[key].value = value;
    }
    msg.textContent = 'Saved — the website is updated.';
    msg.className = 'msg msg--ok';
  } else if (status === 401) {
    msg.textContent = 'Your session expired. Please sign in again.';
    msg.className = 'msg msg--err';
    setTimeout(() => show('login'), 1200);
  } else {
    msg.textContent = data.error || 'Could not save.';
    msg.className = 'msg msg--err';
  }
});

$('logout').addEventListener('click', async () => {
  await api('/api/session', { method: 'DELETE' });
  show('login');
});

init();
