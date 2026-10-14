// Reuse real font responses across isolated contexts and bound external waits.
const fontResponses = new Map();
export async function boundFontRequests(context) {
  await context.route(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, async route => {
    const key = `${route.request().url()}::${route.request().headers()['user-agent']}`;
    if (!fontResponses.has(key)) fontResponses.set(key, (async () => {
      const response = await route.fetch({ timeout: 8000 });
      if (!response.ok()) throw new Error('Font request unavailable');
      return { status: response.status(), body: await response.body(), headers: {
        'content-type': response.headers()['content-type'] || 'application/octet-stream',
        'access-control-allow-origin': '*',
      } };
    })());
    try { await route.fulfill(await fontResponses.get(key)); }
    catch { fontResponses.delete(key); await route.abort('timedout'); }
  });
}
