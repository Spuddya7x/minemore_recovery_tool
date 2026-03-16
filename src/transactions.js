import { TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import {
  mmCheckpointInstruction,
  mmClaimSolInstruction,
  mmClaimOreInstruction,
} from './instructions.js';
import { formatSol, formatOre } from './accounts.js';
import { getOreTokenAddress } from './pda.js';
import { ATA_RENT } from './constants.js';

/**
 * Build, sign, send, and confirm a versioned transaction.
 * Uses the RPC manager for automatic endpoint rotation on rate limits.
 */
async function sendAndConfirm(rpc, keypair, instructions, description) {
  const { blockhash, lastValidBlockHeight } = await rpc.call(conn =>
    conn.getLatestBlockhash('confirmed')
  );

  const messageV0 = new TransactionMessage({
    payerKey: keypair.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([keypair]);

  const signature = await rpc.call(conn =>
    conn.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })
  );

  console.log(`  Tx sent: ${signature}`);
  console.log('  Waiting for confirmation...');

  await rpc.call(conn =>
    conn.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    )
  );

  console.log(`  Confirmed!`);
  return signature;
}

/**
 * Check if an error is a checkpoint-specific failure
 * (round account closed/missing, already checkpointed, etc.)
 */
function isCheckpointError(err) {
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('invalid account owner') ||
    msg.includes('process_checkpoint') ||
    msg.includes('account not found') ||
    msg.includes('instruction 0')
  );
}

// =============================================================================
// High-Level Recovery Operations
// =============================================================================

/**
 * Claim ALL SOL from a subaccount (rewards + entire MMA balance including rent).
 * The MMClaimSOL instruction drains the entire ManagedMinerAuth account.
 * If uncheckpointed rewards exist, attempts checkpoint first.
 * If checkpoint fails (e.g. round account closed), falls back to claim-only.
 */
export async function claimSol(rpc, keypair, account) {
  const { managerPubkey, authId, rewardsSol, mmaLamports, hasUncheckpointed, minerRoundId, minerExists } = account;

  if (!minerExists && mmaLamports === 0n) {
    console.log('  No miner account and no MMA balance — nothing to claim.');
    return null;
  }

  if (rewardsSol === 0n && !hasUncheckpointed && mmaLamports === 0n) {
    console.log('  No SOL to claim.');
    return null;
  }

  // Try with checkpoint first if needed
  if (hasUncheckpointed) {
    console.log(`  Checkpointing round ${minerRoundId}...`);
    try {
      const instructions = [
        mmCheckpointInstruction(keypair.publicKey, managerPubkey, minerRoundId, authId),
        mmClaimSolInstruction(keypair.publicKey, managerPubkey, authId),
      ];
      console.log(`  Claiming all SOL (${formatSol(rewardsSol)} rewards + ${formatSol(mmaLamports)} autodeploy)...`);
      return await sendAndConfirm(rpc, keypair, instructions, 'Checkpoint + Claim SOL');
    } catch (err) {
      if (isCheckpointError(err)) {
        console.log('  Checkpoint skipped (round account no longer exists). Claiming without checkpoint...');
      } else {
        throw err;
      }
    }
  }

  // Claim SOL without checkpoint (either not needed or checkpoint failed)
  const instructions = [
    mmClaimSolInstruction(keypair.publicKey, managerPubkey, authId),
  ];
  console.log(`  Claiming all SOL (${formatSol(rewardsSol)} rewards + ${formatSol(mmaLamports)} autodeploy)...`);
  return sendAndConfirm(rpc, keypair, instructions, 'Claim SOL');
}

// =============================================================================
// ORE ATA Rent Check
// =============================================================================

/**
 * Checks if the signer has an existing ORE token account (ATA).
 * If not, verifies wallet has enough SOL to cover ATA rent (~0.00204 SOL).
 * Returns true if safe to proceed, false if insufficient SOL.
 */
async function hasOreAtaOrSufficientRent(rpc, signerPubkey) {
  const ataAddress = getOreTokenAddress(signerPubkey);
  const ataInfo = await rpc.call(conn => conn.getAccountInfo(ataAddress));

  if (ataInfo !== null) {
    return true; // ATA already exists, no rent needed
  }

  // ATA doesn't exist — check wallet can cover rent
  const balance = await rpc.call(conn => conn.getBalance(signerPubkey));
  if (BigInt(balance) < ATA_RENT) {
    console.log(`  WARNING: No ORE token account exists. Creating one requires ~0.00204 SOL rent.`);
    console.log(`  Wallet balance: ${formatSol(BigInt(balance))} SOL — insufficient for ATA rent.`);
    return false;
  }

  console.log(`  Note: ORE token account will be created (~0.00204 SOL rent from wallet).`);
  return true;
}

// =============================================================================
// Claim ORE
// =============================================================================

/**
 * Claim ORE token rewards from a subaccount.
 * Checks ATA rent before proceeding.
 */
export async function claimOre(rpc, keypair, account) {
  const { managerPubkey, authId, rewardsOre, minerExists } = account;

  if (!minerExists) {
    console.log('  No miner account found — nothing to claim.');
    return null;
  }

  if (rewardsOre === 0n) {
    console.log('  No ORE rewards to claim.');
    return null;
  }

  // Ensure wallet can cover ATA rent if token account doesn't exist yet
  const canClaim = await hasOreAtaOrSufficientRent(rpc, keypair.publicKey);
  if (!canClaim) {
    console.log('  Skipping ORE claim — claim SOL first to fund token account rent.');
    return null;
  }

  const instructions = [
    mmClaimOreInstruction(keypair.publicKey, managerPubkey, authId),
  ];

  console.log(`  Claiming ORE rewards (${formatOre(rewardsOre)} ORE pending)...`);
  return sendAndConfirm(rpc, keypair, instructions, 'Claim ORE');
}

// =============================================================================
// Empty Account — claim SOL first, then ORE from a single subaccount
// =============================================================================

/**
 * Empty a single subaccount by claiming SOL first (to fund ATA rent), then ORE.
 * Returns array of { type, signature } for each successful claim.
 */
export async function emptyAccount(rpc, keypair, account) {
  const results = [];

  // Step 1: Claim SOL first (funds wallet for potential ATA rent)
  if (account.rewardsSol > 0n || account.hasUncheckpointed || account.mmaLamports > 0n) {
    const sig = await claimSol(rpc, keypair, account);
    if (sig) results.push({ type: 'Claim SOL', signature: sig });
  }

  // Step 2: Claim ORE (rent check happens inside claimOre)
  if (account.rewardsOre > 0n && account.minerExists) {
    const sig = await claimOre(rpc, keypair, account);
    if (sig) results.push({ type: 'Claim ORE', signature: sig });
  }

  return results;
}

