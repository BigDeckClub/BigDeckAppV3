// ========== FETCH WITH RETRY ==========
export async function fetchRetry(url, options = {}, retries = 2) {
  try {
    const response = await fetch(url, {
      timeout: 10000,
      ...options
    });
    return response;
  } catch (err) {
    if (retries > 0) {
      return fetchRetry(url, options, retries - 1);
    }
    return null;
  }
}
