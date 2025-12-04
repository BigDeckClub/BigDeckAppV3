/**
 * Rate-limited queue for Scryfall API calls
 * Scryfall allows ~10 requests per second, we'll use 5/sec to be conservative
 */

class ScryfallQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.minDelay = 200; // 200ms between requests = 5 requests/second
    this.lastRequestTime = 0;
  }

  /**
   * Add a Scryfall API request to the queue
   * @param {Function} requestFn - Async function that returns the fetch response
   * @returns {Promise} - Resolves with the response or null on error
   */
  async enqueue(requestFn) {
    return new Promise((resolve) => {
      this.queue.push({ requestFn, resolve });
      this.processQueue();
    });
  }

  /**
   * Process the queue with rate limiting
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const { requestFn, resolve } = this.queue.shift();
      
      // Ensure minimum delay between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minDelay) {
        await new Promise(r => setTimeout(r, this.minDelay - timeSinceLastRequest));
      }

      try {
        const result = await requestFn();
        this.lastRequestTime = Date.now();
        resolve(result);
      } catch (err) {
        console.error('[SCRYFALL_QUEUE] Request failed:', err.message);
        resolve(null);
      }
    }

    this.processing = false;
  }
}

// Export singleton instance
export const scryfallQueue = new ScryfallQueue();
