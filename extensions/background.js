const N8N_SYNC_WEBHOOK_URL = 'https://jarllindquist.com/n8n/webhook/bookmarks-event';
const N8N_GET_UPDATES_URL = 'https://jarllindquist.com/n8n/webhook/bookmarks-get-updates';

// Flagga för att undvika oändliga loopar när pollingen ändrar saker i Chrome
let isApplyingRemoteChanges = false;

// ==========================================
// 1. REALTIDSLYSSNARE (Chrome -> n8n)
// ==========================================

// Lyssna när ett bokmärke skapas
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  // Ignorera om det var pollingen som skapade bokmärket!
  if (isApplyingRemoteChanges) return;

  console.log("Nytt bokmärke skapat lokalt:", bookmark);

  const payload = {
    action: 'CREATE',
    data: {
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url || null,
      isFolder: !bookmark.url,
      parentId: bookmark.parentId,
      createdAt: new Date().toISOString()
    }
  };

  sendToN8n(payload);
});

// Lyssna när ett bokmärke raderas
chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  // Ignorera om det var pollingen som raderade bokmärket!
  if (isApplyingRemoteChanges) return;

  console.log(`Bokmärke med ID ${id} raderat lokalt.`);

  const payload = {
    action: 'DELETE',
    data: {
      id: id,
      parentId: removeInfo.parentId,
      removedAt: new Date().toISOString()
    }
  };

  sendToN8n(payload);
});

// Hjälpfunktion för att skicka händelser till n8n
function sendToN8n(payload) {
  fetch(N8N_SYNC_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
    .then(resp => {
      if (!resp.ok) console.error("Fel från n8n:", resp.status);
    })
    .catch(error => {
      console.error("Kunde inte nå n8n webhook:", error);
    });
}

// ==========================================
// 2. POLLING-LOGIK (n8n/Postgres -> Chrome)
// ==========================================

// Sätt upp timern när tillägget installeras eller startas
chrome.runtime.onInstalled.addListener(() => {
  console.log("Sätter upp polling-timer...");
  chrome.alarms.create("pollForUpdates", { periodInMinutes: 1 });
});

// Lyssna på alarm-timern (Rättat stavfel här: pollForUpdates)
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'pollForUpdates') {
    checkForUpdatesFromDashboard();
  }
});

// Funktion för att kontrollera ändringar från n8n
const checkForUpdatesFromDashboard = () => {
  chrome.storage.local.get(['lastSyncTimestamp'], result => {
    // Om inget finns sparat, börja från 1970
    const lastSync = result.lastSyncTimestamp || new Date(0).toISOString();

    console.log(`Polling: Kollar ändringar sedan ${lastSync}...`);

    fetch(`${N8N_GET_UPDATES_URL}?since=${encodeURIComponent(lastSync)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && data.changes && data.changes.length > 0) {

          console.log(`Hittade ${data.changes.length} nya ändringar från dashboard!`, data.changes);
          applyChangesToChrome(data.changes);

          // Uppdatera BARA tidsstämpeln om vi faktiskt tog emot nya ändringar
          chrome.storage.local.set({ lastSyncTimestamp: new Date().toISOString() });
        } else {
          console.log("Inga nya ändringar från dashboard!");
        }
      })
      .catch(err => console.error("Fel vid polling-anrop mot n8n:", err));
  });
};

// Hjälpfunktion för att verkställa ändringarna i Chrome
const applyChangesToChrome = changes => {
  isApplyingRemoteChanges = true;

  let completedCount = 0;

  const checkIfFinished = () => {
    completedCount++;
    if (completedCount >= changes.length) {
      // Återställ flaggan efter att alla ändringar applicerats
      setTimeout(() => {
        isApplyingRemoteChanges = false;
      }, 500);
    }
  };

  function updateIdInPostgres(tempId, realChromeId) {

    fetch('https://jarllindquist.com/n8n/webhook/bookmarks-update-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldId: tempId,
        newId: realChromeId
      })
    }).catch(err => console.error("Kunde inte uppdatera ID i Postgres:", err));
  }

  changes.forEach(change => {
    // 1. SKAPA BOKMÄRKE ELLER MAPP SOM KOM FRÅN DASHBOARD
    if (change.action === 'CREATE') {
      const createData = {
        title: change.title,
        parentId: change.parentId || '1'
      };

      if (!change.isFolder && change.url) {
        createData.url = change.url;
      }

      // Skapa i Chrome
      chrome.bookmarks.create(createData, (newBk) => {
        console.log("Skapade från remote i Chrome. Riktigt Chrome ID blev:", newBk.id);

        // Om objektet hade ett tillfälligt ID från dashboarden,
        // skicka ett snabbt anrop till n8n för att mappa om ID:t i Postgres!
        if (change.tempId && change.tempId !== newBk.id) updateIdInPostgres(change.tempId, newBk.id);


        checkIfFinished();
      });
    }

    // 2. TA BORT BOKMÄRKE ELLER MAPP
    else if (change.action === 'DELETE') {
      chrome.bookmarks.remove(change.id, () => {
        console.log(`Tog bort ID ${change.id} i Chrome via remote.`);
        checkIfFinished();
      });
    }

    // 3. FLYTTA BOKMÄRKE ELLER MAPP
    else if (change.action === 'MOVE') {
      chrome.bookmarks.move(change.id, { parentId: change.newParentId }, (movedBk) => {
        console.log(`Flyttade ID ${change.id} till ny parent ${change.newParentId}`);
        checkIfFinished();
      });
    } else {
      // Om en okänd action dyker upp, räkna ändå upp räknaren
      checkIfFinished();
    }
  });
};