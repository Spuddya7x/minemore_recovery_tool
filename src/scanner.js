import { EVORE_PROGRAM_ID } from './constants.js';
import { getManagedMinerAuthPda, getOreMinerPda, getOreBoardPda, getDeployerPda } from './pda.js';
import { decodeManager, decodeOreMiner, decodeOreBoard } from './accounts.js';

/** Delay between RPC calls to avoid rate limits on free endpoints */
const REQUEST_DELAY_MS = 400;

/**
 * Scan the Evore program for all Manager accounts owned by a wallet.
 * Uses getProgramAccounts with a memcmp filter on the authority field.
 *
 * @param {RpcManager} rpc - RPC manager with automatic rotation
 * @param {PublicKey} walletPubkey - The user's wallet public key
 * @param {boolean} includeLegacy - If true, scan authIds 0-9 (for legacy accounts)
 * @returns {Array} Array of subaccount info objects
 */
export async function scanForSubaccounts(rpc, walletPubkey, includeLegacy = false) {
  console.log('Scanning on-chain for your subaccounts...');

  // Step 1: Find all Manager accounts where authority == walletPubkey
  const managerAccounts = await rpc.call(conn =>
    conn.getProgramAccounts(EVORE_PROGRAM_ID, {
      filters: [
        { dataSize: 40 }, // Manager = 8 discriminator + 32 authority
        {
          memcmp: {
            offset: 8, // authority field starts after 8-byte discriminator
            bytes: walletPubkey.toBase58(),
          },
        },
      ],
    })
  );

  if (managerAccounts.length === 0) {
    return [];
  }

  console.log(`Found ${managerAccounts.length} manager account(s). Fetching details...`);

  // Step 2: Determine which authIds to scan
  const authIds = includeLegacy
    ? [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n]
    : [0n];

  // Step 3: Fetch OreBoard to get current round
  const [oreBoardPda] = getOreBoardPda();
  const oreBoardInfo = await rpc.call(conn => conn.getAccountInfo(oreBoardPda));
  let currentRound = 0n;
  if (oreBoardInfo) {
    const board = decodeOreBoard(oreBoardInfo.data);
    currentRound = board.roundId;
  }

  // Step 4: For each manager × authId, derive PDAs and batch fetch
  const subaccounts = [];

  for (const { pubkey: managerPubkey, account: managerAccount } of managerAccounts) {
    const manager = decodeManager(managerAccount.data);

    // Verify authority matches (belt-and-suspenders with memcmp filter)
    if (manager.authority.toBase58() !== walletPubkey.toBase58()) {
      continue;
    }

    for (const authId of authIds) {
      const [managedMinerAuth] = getManagedMinerAuthPda(managerPubkey, authId);
      const [oreMinerPda] = getOreMinerPda(managedMinerAuth);
      const [deployerPda] = getDeployerPda(managerPubkey);

      // Throttle between requests to avoid rate limits
      if (subaccounts.length > 0) {
        await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
      }

      // Batch fetch MMA + OreMiner accounts
      const accountInfos = await rpc.call(conn =>
        conn.getMultipleAccountsInfo([managedMinerAuth, oreMinerPda])
      );

      const mmaInfo = accountInfos[0];
      const minerInfo = accountInfos[1];

      // Skip if MMA doesn't exist (this authId is unused)
      if (!mmaInfo) {
        continue;
      }

      // Full MMA balance — MMClaimSOL drains the entire account (no rent reserved)
      const mmaLamports = BigInt(mmaInfo.lamports);

      // Decode miner if it exists
      let minerData = null;
      let hasUncheckpointed = false;

      if (minerInfo && minerInfo.data.length >= 544) {
        minerData = decodeOreMiner(minerInfo.data);
        hasUncheckpointed = minerData.roundId > 0n && minerData.roundId < currentRound;
      }

      subaccounts.push({
        managerPubkey,
        authId,
        managedMinerAuth,
        oreMinerPda,
        deployerPda,
        mmaLamports,
        rewardsSol: minerData ? minerData.rewardsSol : 0n,
        rewardsOre: minerData ? minerData.rewardsOre : 0n,
        refinedOre: minerData ? minerData.refinedOre : 0n,
        minerRoundId: minerData ? minerData.roundId : 0n,
        currentRound,
        hasUncheckpointed,
        minerExists: !!minerData,
        lifetimeRewardsSol: minerData ? minerData.lifetimeRewardsSol : 0n,
        lifetimeRewardsOre: minerData ? minerData.lifetimeRewardsOre : 0n,
        lifetimeDeployed: minerData ? minerData.lifetimeDeployed : 0n,
      });
    }
  }

  return subaccounts;
}
