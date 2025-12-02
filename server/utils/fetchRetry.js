// ========== FETCH WITH RETRY ==========
export async function fetchRetry(url, options = {}, retries = 2) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (retries > 0) {
      return fetchRetry(url, options, retries - 1);
    }
    return null;
  }
}
