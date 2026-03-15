import { PublicKey } from '@solana/web3.js';

// =============================================================================
// Evore Program
// =============================================================================

export const EVORE_PROGRAM_ID = new PublicKey('8jaLKWLJAj5jVCZbxpe3zRUvLB3LD48MRtaQ2AjfCfxa');
export const FEE_COLLECTOR = new PublicKey('56qSi79jWdM1zie17NKFvdsh213wPb15HHUqGUjmJ2Lr');

// Evore PDA seeds
export const MANAGED_MINER_AUTH_SEED = 'managed-miner-auth';
export const DEPLOYER_SEED = 'deployer';

// =============================================================================
// ORE Program (v3)
// =============================================================================

export const ORE_PROGRAM_ID = new PublicKey('oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv');
export const ORE_MINT_ADDRESS = new PublicKey('oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhxyK9jSybcp');
export const ORE_TREASURY_ADDRESS = new PublicKey('45db2FSR4mcXdSVVZbKbwojU6uYDpMyhpEi7cC8nHaWG');

// ORE PDA seeds
export const ORE_MINER_SEED = 'miner';
export const ORE_BOARD_SEED = 'board';
export const ORE_ROUND_SEED = 'round';
export const ORE_TREASURY_SEED = 'treasury';

// =============================================================================
// SPL Token Programs
// =============================================================================

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

// =============================================================================
// Instruction Discriminators
// =============================================================================

export const EvoreInstruction = {
  CreateManager: 0,
  MMDeploy: 1,
  MMCheckpoint: 2,
  MMClaimSOL: 3,
  MMClaimORE: 4,
  CreateDeployer: 5,
  UpdateDeployer: 6,
  MMAutodeploy: 7,
  DepositAutodeployBalance: 8,
  RecycleSol: 9,
  WithdrawAutodeployBalance: 10,
  MMAutocheckpoint: 11,
  MMFullAutodeploy: 12,
  TransferManager: 13,
  MMCreateMiner: 14,
};

// =============================================================================
// Rent & Formatting
// =============================================================================

/** Rent-exempt minimum for ManagedMinerAuth PDA (lamports) */
export const MMA_RENT = 890880n;

export const LAMPORTS_PER_SOL = 1_000_000_000n;
export const ORE_DECIMALS = 100_000_000_000; // 11 decimals
