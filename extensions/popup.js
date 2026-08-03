const N8N_SYNC_WEBHOOK_URL = 'https://jarllindquist.com/n8n/webhook-test/bookmarks-full-sync';

// Hjälpfunktion för att platta till det nästlade trädet
function flattenBookmarks(nodes, parentId = null) {
  let list = [];

  for (const node of nodes) {
    const item = {
      id: node.id,
      title: node.title,
      url: node.url || null,
      isFolder: !node.url,
      parentId: parentId || node.parentId || null
    };

    list.push(item);

    if (node.children && node.children.length > 0) {
      list = list.concat(flattenBookmarks(node.children, node.id));
    }
  }

  return list;
}

// Koppla klick-event till knappen
document.getElementById('syncBtn').addEventListener('click', () => {
  const statusEl = document.getElementById('status');
  statusEl.innerText = "Hämtar bokmärken...";

  // 1. Hämta hela trädet från Chrome
  chrome.bookmarks.getTree((tree) => {
    const flatBookmarks = flattenBookmarks(tree);
    statusEl.innerText = `Skickar ${flatBookmarks.length} objekt till n8n...`;

    // 2. Skicka hela arrayen till n8n
    fetch(N8N_SYNC_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        syncedAt: new Date().toISOString(),
        totalCount: flatBookmarks.length,
        bookmarks: flatBookmarks
      })
    })
      .then(resp => {
        if (resp.ok) {
          statusEl.innerText = "Full synk genomförd! 🎉";
        } else {
          statusEl.innerText = `Fel från n8n: ${resp.status}`;
        }
      })
      .catch(error => {
        console.error(error);
        statusEl.innerText = "Kunde inte nå n8n.";
      });
  });
});