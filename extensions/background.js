const n8n_webhook_url = 'https://jarllindquist.com/n8n/webhook-test/bookmarks'

// lyssna på när användaren skapar ett nytt bokmärke i Crome
crome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log("Nytt bokmärke skapats , skickar till n8n...", bookmark)

  // Bygger ett rent objekt att skicka
  const payload = {
    id: bookmark.id,
    title: bookmark.title,
    url: bookmark.url || null,
    isFolder: !bookmark.url,
    parentId: bookmark.parentId,
    createdAt: new Date().toISOString
  }

  // Skicka data till n8n via POST
  fetch(n8n_webhook_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }).then(resp => {
    if (resp.ok) console.log("Lyckades skicka bokmärket till n8n. ")
    else console.error("n8n svarade med felkod:", resp.status)
  }).catch(error => {
    console.error("kunde inte nå n8n webbhook:", error)
  })



})

// // 1. Körs när tillägget installeras eller startas
// chrome.runtime.onInstalled.addListener(() => {
//   console.log("Tillägget är installerat! Hämtar befintliga bokmärken...");

//   // Hämtar hela bokmärksträdet från Chrome
//   chrome.bookmarks.getTree((tree) => {
//     console.log("Hela bokmärksträdet:", tree);
//   });
// });

// // 2. Lyssna på när användaren skapar ett nytt bokmärke i Chrome
// chrome.bookmarks.onCreated.addListener((id, bookmark) => {
//   console.log("Nytt bokmärke skapat i Chrome:", bookmark);




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