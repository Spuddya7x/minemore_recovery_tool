import { PublicKey } from '@solana/web3.js';
import { LAMPORTS_PER_SOL, ORE_DECIMALS } from './constants.js';

// =============================================================================
// Account Types & Decoders
// =============================================================================

/**
 * Decodes a Manager account from raw account data (40 bytes)
 * Layout: [8 discriminator][32 authority]
 */
export function decodeManager(data) {
  const authorityBytes = data.slice(8, 40);
  const authority = new PublicKey(authorityBytes);
  return { authority };
}

/**
 * Decodes an ORE Board account from raw account data
 * Layout: [8 disc][8 roundId][8 startSlot][8 endSlot][8 epochId]
 */
export function decodeOreBoard(data) {
  const buffer = Buffer.from(data);
  return {
    roundId: buffer.readBigUInt64LE(8),
    startSlot: buffer.readBigUInt64LE(16),
    endSlot: buffer.readBigUInt64LE(24),
    epochId: buffer.readBigUInt64LE(32),
  };
}

/**
 * Decodes an ORE Miner account from raw account data (544 bytes)
 * Layout:
 *   0-7:     discriminator (8)
 *   8-39:    authority (32)
 *   40-239:  deployed [u64; 25] (200)
 *   240-439: cumulative [u64; 25] (200)
 *   440-447: checkpoint_fee (8)
 *   448-455: checkpoint_id (8)
 *   456-463: last_claim_ore_at (8, signed)
 *   464-471: last_claim_sol_at (8, signed)
 *   472-487: rewards_factor (16, I80F48)
 *   488-495: rewards_sol (8)
 *   496-503: rewards_ore (8)
 *   504-511: refined_ore (8)
 *   512-519: round_id (8)
 *   520-527: lifetime_rewards_sol (8)
 *   528-535: lifetime_rewards_ore (8)
 *   536-543: lifetime_deployed (8)
 */
export function decodeOreMiner(data) {
  const buffer = Buffer.from(data);
  let offset = 8;

  const authority = new PublicKey(buffer.slice(offset, offset + 32));
  offset += 32;

  // deployed: [u64; 25]
  const deployed = [];
  for (let i = 0; i < 25; i++) {
    deployed.push(buffer.readBigUInt64LE(offset));
    offset += 8;
  }

  // cumulative: [u64; 25]
  const cumulative = [];
  for (let i = 0; i < 25; i++) {
    cumulative.push(buffer.readBigUInt64LE(offset));
    offset += 8;
  }

  const checkpointFee = buffer.readBigUInt64LE(offset); offset += 8;
  const checkpointId = buffer.readBigUInt64LE(offset); offset += 8;
  const lastClaimOreAt = buffer.readBigInt64LE(offset); offset += 8;
  const lastClaimSolAt = buffer.readBigInt64LE(offset); offset += 8;

  // rewards_factor: I80F48 (16 bytes) — skip for display purposes
  offset += 16;

  const rewardsSol = buffer.readBigUInt64LE(offset); offset += 8;
  const rewardsOre = buffer.readBigUInt64LE(offset); offset += 8;
  const refinedOre = buffer.readBigUInt64LE(offset); offset += 8;
  const roundId = buffer.readBigUInt64LE(offset); offset += 8;
  const lifetimeRewardsSol = buffer.readBigUInt64LE(offset); offset += 8;
  const lifetimeRewardsOre = buffer.readBigUInt64LE(offset); offset += 8;
  const lifetimeDeployed = buffer.readBigUInt64LE(offset);

  return {
    authority,
    deployed,
    cumulative,
    checkpointFee,
    checkpointId,
    lastClaimOreAt,
    lastClaimSolAt,
    rewardsSol,
    rewardsOre,
    refinedOre,
    roundId,
    lifetimeRewardsSol,
    lifetimeRewardsOre,
    lifetimeDeployed,
  };
}

// =============================================================================
// Formatting Utilities
// =============================================================================

export function formatSol(lamports, decimals = 6) {
  const sol = Number(lamports) / Number(LAMPORTS_PER_SOL);
  return sol.toFixed(decimals);
}

export function formatOre(amount, decimals = 4) {
  const ore = Number(amount) / ORE_DECIMALS;
  return ore.toFixed(decimals);
}

export function shortenPubkey(pubkey, chars = 4) {
  const str = pubkey.toString();
  return `${str.slice(0, chars)}...${str.slice(-chars)}`;
}
