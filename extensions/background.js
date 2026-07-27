// 1. Körs när tillägget installeras eller startas
chrome.runtime.onInstalled.addListener(() => {
  console.log("Tillägget är installerat! Hämtar befintliga bokmärken...");

  // Hämtar hela bokmärksträdet från Chrome
  chrome.bookmarks.getTree((tree) => {
    console.log("Hela bokmärksträdet:", tree);
  });
});

// 2. Lyssna på när användaren skapar ett nytt bokmärke i Chrome
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log("Nytt bokmärke skapat i Chrome:", bookmark);

  // Exempel på hur du senare skickar detta vidare till n8n:
  /*
  fetch('https://din-n8n-instans/webhook/bookmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      parentId: bookmark.parentId
    })
  });
  */
});