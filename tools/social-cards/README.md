# Link-preview card and favicon

The image that shows when a link to the dashboard is shared (Open Graph / Twitter card, 1200 × 630),
and the favicon's PNG sizes. They are drawn as HTML here and rendered to PNG:

- `bookmarks.html` → `dashboard/public/og-bookmarks.png`
- `dashboard/public/favicon.svg` → `favicon-32.png` and `apple-touch-icon.png`

Change the HTML, `card.css` or the SVG, then run `node tools/social-cards/render.mjs` with Playwright
installed. The tags that use them are in `dashboard/src/index.html`.
