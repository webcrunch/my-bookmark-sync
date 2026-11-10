// Gemensamt för background.js, popup.js och options.js: alla anrop till n8n går härifrån.
// Nyckeln (X-Bookmark-Token) sparas i chrome.storage.local via inställningssidan, aldrig i koden.
const N8N_BASE_URL = 'https://jarllindquist.com/n8n/webhook';

const getBookmarkToken = () =>
  new Promise(resolve => chrome.storage.local.get(['bookmarkToken'], r => resolve(r.bookmarkToken || '')));

// fetch mot en n8n-webhook med nyckeln som header. Utan nyckel skickas ingenting.
async function n8nFetch(path, options = {}) {
  const token = await getBookmarkToken();
  if (!token) throw new Error('Ingen nyckel sparad. Öppna tilläggets inställningar.');

  return fetch(`${N8N_BASE_URL}/${path}`, {
    ...options,
    headers: { ...(options.headers || {}), 'X-Bookmark-Token': token }
  });
}
