/** Bound external font waits without replacing application data or suppressing runtime errors. */
export async function boundFontRequests(context) {
  await context.route(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, async route => {
    try { await route.fulfill({ response: await route.fetch({ timeout: 8000 }) }); }
    catch { await route.abort('timedout'); }
  });
}
