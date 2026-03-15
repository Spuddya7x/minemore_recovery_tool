import { PublicKey } from '@solana/web3.js';
import {
  EVORE_PROGRAM_ID,
  ORE_PROGRAM_ID,
  MANAGED_MINER_AUTH_SEED,
  DEPLOYER_SEED,
  ORE_MINER_SEED,
  ORE_BOARD_SEED,
  ORE_ROUND_SEED,
  ORE_TREASURY_SEED,
  ORE_MINT_ADDRESS,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from './constants.js';

/**
 * Convert a bigint to 8-byte little-endian Buffer
 */
export function bigintToLeBytes(value) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
}

/**
 * Derives the managed miner auth PDA for a manager and auth_id
 * Seeds: ["managed-miner-auth", manager_pubkey, auth_id_le_8bytes]
 */
export function getManagedMinerAuthPda(manager, authId) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(MANAGED_MINER_AUTH_SEED),
      manager.toBuffer(),
      bigintToLeBytes(authId),
    ],
    EVORE_PROGRAM_ID
  );
}

/**
 * Derives the deployer PDA for a manager
 * Seeds: ["deployer", manager_pubkey]
 */
export function getDeployerPda(manager) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(DEPLOYER_SEED),
      manager.toBuffer(),
    ],
    EVORE_PROGRAM_ID
  );
}

/**
 * Derives the ORE miner PDA for an authority
 * Seeds: ["miner", authority_pubkey] under ORE program
 */
export function getOreMinerPda(authority) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(ORE_MINER_SEED),
      authority.toBuffer(),
    ],
    ORE_PROGRAM_ID
  );
}

/**
 * Derives the ORE board PDA (singleton)
 */
export function getOreBoardPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ORE_BOARD_SEED)],
    ORE_PROGRAM_ID
  );
}

/**
 * Derives the ORE round PDA for a round ID
 */
export function getOreRoundPda(roundId) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(ORE_ROUND_SEED),
      bigintToLeBytes(roundId),
    ],
    ORE_PROGRAM_ID
  );
}

/**
 * Derives the ORE treasury PDA (singleton)
 */
export function getOreTreasuryPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ORE_TREASURY_SEED)],
    ORE_PROGRAM_ID
  );
}

/**
 * Derives the associated token address for a wallet and mint
 */
export function getAssociatedTokenAddress(wallet, mint) {
  const [address] = PublicKey.findProgramAddressSync(
    [
      wallet.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}

/**
 * Derives the ORE token address for a wallet
 */
export function getOreTokenAddress(wallet) {
  return getAssociatedTokenAddress(wallet, ORE_MINT_ADDRESS);
}
