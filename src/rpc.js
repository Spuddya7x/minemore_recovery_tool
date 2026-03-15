import { Connection } from '@solana/web3.js';

/**
 * Free public Solana RPC endpoints.
 * Ordered by reliability. These have rate limits but by cycling through
 * them we can handle 36+ accounts without getting blocked.
 */
const FREE_RPCS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo',
];

/**
 * RPC Manager — cycles through multiple RPC endpoints on errors.
 * Automatically rotates on rate limits (429) and access errors (403/401).
 * Dead endpoints are removed from rotation so we don't keep hitting them.
 *
 * Usage:
 *   const rpc = new RpcManager('https://my-rpc.com');  // single RPC
 *   const rpc = new RpcManager();                       // cycle free RPCs
 *   const result = await rpc.call(conn => conn.getBalance(pubkey));
 */
export class RpcManager {
  constructor(userRpcUrl) {
    if (userRpcUrl && !FREE_RPCS.includes(userRpcUrl)) {
      // User provided a dedicated RPC — use it exclusively
      this.endpoints = [userRpcUrl];
      this.isCycling = false;
    } else if (userRpcUrl) {
      // User picked one of the free RPCs — put it first, add the rest
      this.endpoints = [userRpcUrl, ...FREE_RPCS.filter(r => r !== userRpcUrl)];
      this.isCycling = true;
    } else {
      // No RPC provided — cycle all free ones
      this.endpoints = [...FREE_RPCS];
      this.isCycling = true;
    }

    this.currentIndex = 0;
    this.connections = new Map();
    this.rateLimitCounts = new Map();
    this.deadEndpoints = new Set();
  }

  /** Get or create a Connection for the current endpoint */
  getConnection() {
    const url = this.endpoints[this.currentIndex];
    if (!this.connections.has(url)) {
      this.connections.set(url, new Connection(url, 'confirmed'));
    }
    return this.connections.get(url);
  }

  /** Get the current endpoint URL */
  getCurrentUrl() {
    return this.endpoints[this.currentIndex];
  }

  /** Remove a dead endpoint and rotate to the next one */
  removeAndRotate(reason) {
    const deadUrl = this.getCurrentUrl();
    this.deadEndpoints.add(deadUrl);

    const alive = this.endpoints.filter(u => !this.deadEndpoints.has(u));
    if (alive.length === 0) {
      return false; // All endpoints dead
    }

    console.log(`  RPC ${shortenUrl(deadUrl)} ${reason}, removing from rotation`);
    this.endpoints = alive;
    this.currentIndex = this.currentIndex % this.endpoints.length;
    console.log(`  Switching to: ${shortenUrl(this.getCurrentUrl())}`);
    return true;
  }

  /** Rotate to the next RPC endpoint (keeps it in rotation) */
  rotate(silent = false) {
    const oldIndex = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % this.endpoints.length;
    if (this.currentIndex !== oldIndex && !silent) {
      console.log(`  Switching RPC to ${shortenUrl(this.getCurrentUrl())}...`);
    }
    return this.getConnection();
  }

  /**
   * Execute an RPC call with automatic retry and rotation on errors.
   * - Rate limits (429): rotate to next endpoint
   * - Access errors (403/401): permanently remove endpoint, rotate
   * - Other errors: throw immediately
   */
  async call(fn) {
    const maxAttempts = (this.endpoints.length + this.deadEndpoints.size) * 3;
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (this.endpoints.length === 0) {
        break;
      }

      try {
        const connection = this.getConnection();
        return await fn(connection);
      } catch (err) {
        lastError = err;

        // Access denied — this endpoint is dead, remove it permanently
        if (isAccessError(err)) {
          if (this.isCycling && this.endpoints.length > 1) {
            if (this.removeAndRotate('access denied')) {
              await sleep(300);
              continue;
            }
          }
          // Single endpoint or all dead — throw
          throw err;
        }

        // Rate limited — rotate but keep in pool
        if (isRateLimitError(err)) {
          const url = this.getCurrentUrl();
          const count = (this.rateLimitCounts.get(url) || 0) + 1;
          this.rateLimitCounts.set(url, count);

          if (this.isCycling && this.endpoints.length > 1) {
            this.rotate();
            await sleep(1500);
            continue;
          } else {
            // Single RPC — backoff and retry
            const delay = Math.min(3000 * count, 15000);
            console.log(`  RPC busy, retrying in ${delay / 1000}s...`);
            await sleep(delay);
            continue;
          }
        }

        // Non-retryable error — throw immediately
        throw err;
      }
    }

    throw new Error(`All RPC endpoints exhausted: ${lastError?.message || 'unknown error'}`);
  }

  /** Print RPC status */
  printStatus() {
    if (this.isCycling) {
      console.log(`RPC: cycling ${this.endpoints.length} endpoints (starting with ${shortenUrl(this.getCurrentUrl())})`);
    } else {
      console.log(`RPC: ${this.getCurrentUrl()}`);
    }
  }
}

function isRateLimitError(err) {
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('throttl')
  );
}

function isAccessError(err) {
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('403') ||
    msg.includes('401') ||
    msg.includes('forbidden') ||
    msg.includes('unauthorized') ||
    msg.includes('not allowed') ||
    msg.includes('api key')
  );
}

function shortenUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return url;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
