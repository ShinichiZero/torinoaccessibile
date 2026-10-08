import { expect, test } from '@playwright/test';
import { addVercelPreviewAuthentication, stubMapTiles } from './helpers.js';

const browserErrors = new WeakMap();

test.beforeEach(async ({ page }, testInfo) => {
  const errors = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(`Uncaught exception: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await addVercelPreviewAuthentication(page, testInfo.project.use.baseURL);
  await stubMapTiles(page);
  await page.goto('/');
  await expect(page.locator('.stats-section .stats-grid')).toBeVisible();
});

test('loads with no uncaught JavaScript or console errors', async ({ page }) => {
  await expect(page.locator('.stats-section .stat-card__value').first()).toHaveText(/7[.,]?054/);
  expect(browserErrors.get(page)).toEqual([]);
});

test('loads the dataset and keeps headline counts consistent', async ({ page }) => {
  await expect(page.locator('.stats-section .stat-card__value').first()).toHaveText(/7[.,]?054/);
  await expect(page.locator('.map-data-bar strong').first()).toHaveText(/3[.,]?797/);
  const headline = await page.locator('.stats-section .stat-card__value').allTextContents();
  const dataBar = await page.locator('.map-data-bar strong').allTextContents();
  expect(headline.map((value) => Number(value.replace(/\D/g, '')))).toEqual([7054, 3797, 5, 3252]);
  expect(dataBar.map((value) => Number(value.replace(/\D/g, '')))).toEqual([3797, 5, 3252, 0]);
  await expect(page.getByText(/Dati GTFS elaborati il/)).toBeVisible();
  await expect(page.getByText(/Versione dichiarata nel feed: 7 ottobre 2026/)).toBeVisible();
});

test('searches by name, filters status, shows details, and focuses the map', async ({ page }) => {
  const search = page.getByRole('searchbox', { name: 'Nome o codice fermata' });
  await search.fill('porta nuova');
  const result = page.getByRole('button', { name: 'Mostra dettagli di Fermata 252 - PORTA NUOVA' });
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.getByRole('heading', { name: 'Dettagli fermata' })).toBeFocused();
  await expect(page.locator('.selected-stop')).toContainText('Valore GTFS wheelchair_boarding: sì');
  await expect(page.locator('.selected-stop a')).toHaveAttribute('href', 'https://aperto.comune.torino.it/dataset/feed-gtfs-trasporti-gtt');

  await search.fill('Castello');
  await page.getByLabel('Accessibilità indicata nel feed').selectOption('yes');
  await expect(page.locator('.stop-search__count')).toHaveText('20 risultati');
  await expect(page.getByRole('button', { name: /Mostra dettagli di Fermata/ }).first()).toBeVisible();
});

test('explains empty results and searches by stop code', async ({ page }) => {
  const search = page.getByRole('searchbox', { name: 'Nome o codice fermata' });
  await search.fill('questa fermata non esiste');
  await expect(page.getByText(/Nessuna fermata corrisponde/)).toBeVisible();
  await expect(page.locator('.stop-search__count')).toHaveText('0 risultati');
  await search.fill('252');
  await expect(page.getByRole('button', { name: 'Mostra dettagli di Fermata 252 - PORTA NUOVA' })).toBeVisible();
});

test('loads mocked OSM data and identifies its source independently of GTFS', async ({ page }) => {
  let requested = 0;
  await page.route('https://overpass-api.de/api/interpreter', async (route) => {
    requested += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ elements: [{ type: 'node', id: 987, lat: 45.0703, lon: 7.6869, tags: { name: 'QA OSM ramp', wheelchair: 'yes' } }] }) });
  });
  await page.getByRole('button', { name: 'Carica dati OpenStreetMap' }).click();
  await expect(page.locator('.map-data-bar strong').nth(3)).toHaveText('1');
  await expect(page.locator('.osm-region-note')).toContainText('OSM caricati');
  await expect(page.locator('.map-data-bar strong').nth(3)).toHaveText('1');
  expect(requested).toBe(1);
  await expect(page.locator('.stats-section .stat-card__value').first()).toHaveText(/7[.,]?054/);
});

test('handles HTTP 429 respectfully while keeping GTFS search usable', async ({ page }) => {
  let requested = 0;
  await page.route('https://overpass-api.de/api/interpreter', async (route) => {
    requested += 1;
    await route.fulfill({ status: 429, body: 'rate limited' });
  });
  await page.getByRole('button', { name: 'Carica dati OpenStreetMap' }).click();
  await expect(page.getByText(/sta limitando temporaneamente le richieste/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Riprova tra/ })).toBeDisabled();
  await expect(page.getByRole('searchbox', { name: 'Nome o codice fermata' })).toBeEnabled();
  expect(requested).toBe(1);
});

test('fails over transient gateway errors and surfaces final service failure', async ({ page }) => {
  const requests = [];
  await page.route('https://overpass-api.de/api/interpreter', async (route) => {
    requests.push('primary');
    await route.fulfill({ status: 503, body: 'unavailable' });
  });
  await page.route('https://overpass.private.coffee/api/interpreter', async (route) => {
    requests.push('backup');
    await route.fulfill({ status: 504, body: 'unavailable' });
  });
  await page.getByRole('button', { name: 'Carica dati OpenStreetMap' }).click();
  await expect(page.getByText(/Overpass HTTP 504/)).toBeVisible();
  expect(requests).toEqual(['primary', 'backup']);
  await expect(page.locator('.stats-section .stat-card__value').first()).toHaveText(/7[.,]?054/);
});

test('supports a keyboard-only search, selection, source link, and return to results', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Vai al contenuto' })).toBeFocused();
  await page.keyboard.press('Enter');

  for (let index = 0; index < 24; index += 1) {
    if (await page.locator(':focus').getAttribute('id') === 'stop-search-input') break;
    await page.keyboard.press('Tab');
  }
  await expect(page.getByRole('searchbox', { name: 'Nome o codice fermata' })).toBeFocused();
  await page.keyboard.type('Duomo');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Mostra dettagli di Fermata 243 - DUOMO - MUSEI REALI' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Dettagli fermata' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Fonte: GTT/5T' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Dettagli fermata' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Mostra dettagli di Fermata 243/ })).toBeFocused();
});

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`reflows without horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await expect(page.getByRole('searchbox', { name: 'Nome o codice fermata' })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    await expect(page.locator('.leaflet-container')).toHaveCSS('height', /.+/);
  });
}
