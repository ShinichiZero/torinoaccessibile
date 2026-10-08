export async function addVercelPreviewAuthentication(page, baseURL) {
  const token = process.env.VERCEL_OIDC_TOKEN;
  if (!token || !baseURL) return;

  const origin = new URL(baseURL).origin;
  if (!origin.endsWith('.vercel.app')) return;

  await page.route(`${origin}/**`, (route) => route.continue({
    headers: {
      ...route.request().headers(),
      'x-vercel-trusted-oidc-idp-token': token,
    },
  }));
}

export async function stubMapTiles(page) {
  const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPixel,
  }));
}
