import { formatSol, formatOre, shortenPubkey } from './accounts.js';

export function displayWelcome() {
  console.log('');
  console.log('==============================================');
  console.log('  MineMore Recovery CLI v1.0.0');
  console.log('==============================================');
  console.log('  Recover SOL & ORE from your subaccounts');
  console.log('  Your private key NEVER leaves this machine.');
  console.log('==============================================');
  console.log('');
}

export function displayAccounts(accounts) {
  if (accounts.length === 0) {
    console.log('No MineMore subaccounts found for this wallet.');
    console.log('');
    console.log('Possible reasons:');
    console.log('  - This wallet has no MineMore subaccounts');
    console.log('  - Try --legacy flag to scan legacy auth IDs (0-9)');
    console.log('  - The RPC endpoint may be having issues');
    console.log('');
    return;
  }

  console.log(`\nFound ${accounts.length} subaccount(s) with claimable balances:\n`);

  for (let i = 0; i < accounts.length; i++) {
    const a = accounts[i];
    const idx = i + 1;

    console.log(`  #${idx}  ${shortenPubkey(a.managedMinerAuth)}`);
    console.log(`      Address: ${a.managedMinerAuth.toBase58()}`);
    console.log(`      Autodeploy Balance:     ${padLeft(formatSol(a.mmaLamports), 14)} SOL`);

    if (a.minerExists) {
      console.log(`      Pending SOL Rewards:    ${padLeft(formatSol(a.rewardsSol), 14)} SOL`);
      console.log(`      Pending ORE Rewards:    ${padLeft(formatOre(a.rewardsOre), 14)} ORE`);
      const totalSol = a.mmaLamports + a.rewardsSol;
      console.log(`      Total SOL Recoverable:  ${padLeft(formatSol(totalSol), 14)} SOL`);
      if (a.hasUncheckpointed) {
        console.log(`      Needs checkpoint:       Yes (round #${a.minerRoundId})`);
      }
    } else {
      console.log('      Miner: not created');
    }

    console.log('');
  }

  displayTotals(accounts);
}

export function displayTotals(accounts) {
  let totalMma = 0n;
  let totalSolRewards = 0n;
  let totalOre = 0n;

  for (const a of accounts) {
    totalMma += a.mmaLamports;
    totalSolRewards += a.rewardsSol;
    totalOre += a.rewardsOre;
  }

  const totalSol = totalMma + totalSolRewards;

  console.log('  ------------------------------------------------');
  console.log(`  TOTAL RECOVERABLE:`);
  console.log(`    SOL:  ${formatSol(totalSol)} SOL  (${formatSol(totalMma)} autodeploy + ${formatSol(totalSolRewards)} rewards)`);
  console.log(`    ORE:  ${formatOre(totalOre)} ORE`);
  console.log('  ------------------------------------------------');
  console.log('');
}

export function displayMenu() {
  console.log('  [1] Refresh balances');
  console.log('  [2] Claim all SOL (rewards + autodeploy balance)');
  console.log('  [3] Claim ORE rewards');
  console.log('  [4] RECOVER ALL (claim SOL + ORE from all accounts)');
  console.log('  [0] Exit');
  console.log('');
}

function padLeft(str, width) {
  while (str.length < width) str = ' ' + str;
  return str;
}
