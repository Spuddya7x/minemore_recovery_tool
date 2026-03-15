import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  EVORE_PROGRAM_ID,
  ORE_PROGRAM_ID,
  ORE_TREASURY_ADDRESS,
  ORE_MINT_ADDRESS,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  EvoreInstruction,
} from './constants.js';
import {
  getManagedMinerAuthPda,
  getOreMinerPda,
  getOreBoardPda,
  getOreRoundPda,
  getOreTreasuryPda,
  getOreTokenAddress,
  bigintToLeBytes,
} from './pda.js';

// =============================================================================
// MMCheckpoint — checkpoint miner to collect round winnings
// =============================================================================

/**
 * Creates an MMCheckpoint instruction
 * Must be called before claiming if the miner has uncheckpointed rewards
 */
export function mmCheckpointInstruction(signer, manager, roundId, authId = 0n) {
  const [managedMinerAuth, bump] = getManagedMinerAuthPda(manager, authId);
  const [oreMiner] = getOreMinerPda(managedMinerAuth);
  const [oreBoard] = getOreBoardPda();
  const [oreRound] = getOreRoundPda(roundId);

  const data = Buffer.alloc(10);
  data[0] = EvoreInstruction.MMCheckpoint;
  data.writeBigUInt64LE(authId, 1);
  data[9] = bump;

  return new TransactionInstruction({
    programId: EVORE_PROGRAM_ID,
    keys: [
      { pubkey: signer, isSigner: true, isWritable: true },
      { pubkey: manager, isSigner: false, isWritable: true },
      { pubkey: managedMinerAuth, isSigner: false, isWritable: true },
      { pubkey: oreMiner, isSigner: false, isWritable: true },
      { pubkey: ORE_TREASURY_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: oreBoard, isSigner: false, isWritable: true },
      { pubkey: oreRound, isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ORE_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// =============================================================================
// MMClaimSOL — claim SOL rewards from miner to user wallet
// =============================================================================

/**
 * Creates an MMClaimSOL instruction
 * Claims accumulated SOL rewards from the OreMiner account
 */
export function mmClaimSolInstruction(signer, manager, authId = 0n) {
  const [managedMinerAuth, bump] = getManagedMinerAuthPda(manager, authId);
  const [oreMiner] = getOreMinerPda(managedMinerAuth);

  const data = Buffer.alloc(10);
  data[0] = EvoreInstruction.MMClaimSOL;
  data.writeBigUInt64LE(authId, 1);
  data[9] = bump;

  return new TransactionInstruction({
    programId: EVORE_PROGRAM_ID,
    keys: [
      { pubkey: signer, isSigner: true, isWritable: true },
      { pubkey: manager, isSigner: false, isWritable: true },
      { pubkey: managedMinerAuth, isSigner: false, isWritable: true },
      { pubkey: oreMiner, isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ORE_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// =============================================================================
// MMClaimORE — claim ORE token rewards from miner to user wallet
// =============================================================================

/**
 * Creates an MMClaimORE instruction
 * Claims accumulated ORE token rewards via ATA transfers
 */
export function mmClaimOreInstruction(signer, manager, authId = 0n) {
  const [managedMinerAuth, bump] = getManagedMinerAuthPda(manager, authId);
  const [oreMiner] = getOreMinerPda(managedMinerAuth);
  const [treasury] = getOreTreasuryPda();
  const treasuryTokens = getOreTokenAddress(treasury);
  const recipientTokens = getOreTokenAddress(managedMinerAuth);
  const signerTokens = getOreTokenAddress(signer);

  const data = Buffer.alloc(10);
  data[0] = EvoreInstruction.MMClaimORE;
  data.writeBigUInt64LE(authId, 1);
  data[9] = bump;

  return new TransactionInstruction({
    programId: EVORE_PROGRAM_ID,
    keys: [
      { pubkey: signer, isSigner: true, isWritable: true },
      { pubkey: manager, isSigner: false, isWritable: true },
      { pubkey: managedMinerAuth, isSigner: false, isWritable: true },
      { pubkey: oreMiner, isSigner: false, isWritable: true },
      { pubkey: ORE_MINT_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: recipientTokens, isSigner: false, isWritable: true },
      { pubkey: signerTokens, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: treasuryTokens, isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ORE_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// Note: WithdrawAutodeployBalance instruction is NOT needed for recovery.
// The MMClaimSOL instruction drains the entire ManagedMinerAuth account
// (autodeploy balance + rent) in a single operation.
