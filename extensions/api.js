// Gemensamt för background.js, popup.js och options.js: alla anrop till n8n går härifrån.
// Nyckeln (X-Bookmark-Token) sparas i chrome.storage.local via inställningssidan, aldrig i koden.
const N8N_BASE_URL = 'https://jarllindquist.com/n8n/webhook';

const getBookmarkToken = () =>
  new Promise(resolve => chrome.storage.local.get(['bookmarkToken'], r => resolve(r.bookmarkToken || '')));

// Bara en dator synkar med n8n. Chromes egen synk (Google-kontot) sprider bokmärkena till de
// andra, och Chromes id:n är olika på varje dator, så två synkande datorer skulle blanda ihop dem.
const isSyncDevice = () =>
  new Promise(resolve => chrome.storage.local.get(['isSyncDevice'], r => resolve(r.isSyncDevice === true)));

// fetch mot en n8n-webhook med nyckeln som header. Utan nyckel, eller på en dator som inte
// synkar, skickas ingenting. checkDevice: false bara för inställningssidans test av nyckeln.
async function n8nFetch(path, options = {}, { checkDevice = true } = {}) {
  const token = await getBookmarkToken();
  if (!token) throw new Error('Ingen nyckel sparad. Öppna tilläggets inställningar.');
  if (checkDevice && !(await isSyncDevice())) throw new Error('Den här datorn synkar inte (se inställningarna).');

  return fetch(`${N8N_BASE_URL}/${path}`, {
    ...options,
    headers: { ...(options.headers || {}), 'X-Bookmark-Token': token }
  });
}
