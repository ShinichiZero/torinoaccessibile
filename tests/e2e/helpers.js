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
