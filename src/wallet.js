import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Load a Solana Keypair from a base58-encoded private key
 * (as exported from Privy wallet settings)
 *
 * Handles two formats:
 * - 64 bytes: full Solana keypair (first 32 = secret, last 32 = public)
 * - 32 bytes: raw Ed25519 seed (derives the full keypair)
 */
export function loadKeypairFromBase58(base58PrivateKey) {
  let decoded;
  try {
    decoded = bs58.decode(base58PrivateKey.trim());
  } catch (err) {
    throw new Error(
      'Invalid base58 encoding. Make sure you copied the full private key from Privy.'
    );
  }

  if (decoded.length === 64) {
    return Keypair.fromSecretKey(decoded);
  } else if (decoded.length === 32) {
    return Keypair.fromSeed(decoded);
  } else {
    throw new Error(
      `Invalid private key length: ${decoded.length} bytes (expected 32 or 64). ` +
      'Make sure you exported the correct key from Privy.'
    );
  }
}
