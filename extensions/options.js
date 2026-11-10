const tokenInput = document.getElementById('token');
const statusEl = document.getElementById('status');

// Visa bara om en nyckel finns, aldrig själva nyckeln
getBookmarkToken().then(token => {
  statusEl.innerText = token ? 'En nyckel är sparad.' : 'Ingen nyckel sparad än.';
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const token = tokenInput.value.trim();
  if (!token) {
    statusEl.innerText = 'Klistra in nyckeln först.';
    return;
  }

  chrome.storage.local.set({ bookmarkToken: token }, async () => {
    tokenInput.value = '';
    statusEl.innerText = 'Sparad. Testar mot n8n...';

    // Ett ofarligt anrop som kräver nyckeln: hämta ändringar från nu och framåt
    try {
      const since = encodeURIComponent(new Date().toISOString());
      const resp = await n8nFetch(`bookmarks-get-updates?since=${since}`);
      statusEl.innerText = resp.ok ? 'Sparad och godkänd av n8n.' : `Sparad, men n8n svarade ${resp.status}.`;
    } catch (error) {
      statusEl.innerText = 'Sparad, men n8n gick inte att nå.';
    }
  });
});
