// Renders the link-preview card and the favicon PNGs into dashboard/public/.
// Needs Playwright (npm i -D playwright, or any project that has it): node tools/social-cards/render.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(here, '..', '..', 'dashboard', 'public');
const browser = await chromium.launch();

const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await card.goto(`file://${path.join(here, 'bookmarks.html')}`);
await card.screenshot({ path: path.join(pub, 'og-bookmarks.png') });
await card.close();

// The favicon as PNG for browsers and devices that do not take the SVG
for (const [file, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  // An SVG without width and height fills the window, so the page is the icon at this size
  await page.goto(`file://${path.join(pub, 'favicon.svg')}`);
  await page.screenshot({ path: path.join(pub, file), omitBackground: true });
  await page.close();
}

await browser.close();
