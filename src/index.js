#!/usr/bin/env node

// Suppress Node.js punycode deprecation warning from @solana/web3.js dependency
const _origEmit = process.emit;
process.emit = function (event, error) {
  if (event === 'warning' && error?.name === 'DeprecationWarning' && error?.message?.includes('punycode')) {
    return false;
  }
  return _origEmit.apply(process, arguments);
};

// Suppress @solana/web3.js internal 429 retry spam (it logs to console.error)
const _origConsoleError = console.error;
console.error = function (...args) {
  const msg = args[0];
  if (typeof msg === 'string' && msg.includes('Retrying after') && msg.includes('429')) {
    return; // swallow the @solana/web3.js internal retry message
  }
  return _origConsoleError.apply(console, args);
};

import readline from 'readline/promises';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { loadKeypairFromBase58 } from './wallet.js';
import { scanForSubaccounts } from './scanner.js';
import { claimSol, claimOre, recoverAll } from './transactions.js';
import { shortenPubkey, formatSol, formatOre } from './accounts.js';
import { displayWelcome, displayAccounts, displayMenu } from './display.js';
import { RpcManager } from './rpc.js';

// =============================================================================
// .env File Loader (no dotenv dependency needed)
// =============================================================================

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Don't overwrite existing env vars
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

// =============================================================================
// CLI Argument Parsing
// =============================================================================

const args = process.argv.slice(2);
let rpcUrl = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
let includeLegacy = false;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--rpc' || args[i] === '-r') && args[i + 1]) {
    rpcUrl = args[++i];
  } else if (args[i] === '--legacy') {
    includeLegacy = true;
  } else if (args[i] === '--help' || args[i] === '-h') {
    showHelp();
    process.exit(0);
  }
}

function showHelp() {
  console.log(`
MineMore Recovery CLI — Recover funds from your MineMore subaccounts

Usage:
  node src/index.js [options]

Options:
  --rpc, -r <url>   Solana RPC endpoint (overrides RPC_URL in .env)
  --legacy          Scan legacy auth IDs 0-9 (default: only 0)
  --help, -h        Show this help

Setup (recommended):
  1. Copy .env.example to .env
  2. Add your private key and RPC URL to .env
  3. Run: node src/index.js

  .env file format:
    PRIVATE_KEY=<your-base58-private-key>
    RPC_URL=https://your-rpc-endpoint.com

Alternative private key input:
  Interactive:   prompted on startup (masked input)
  Inline env:    PRIVATE_KEY=<base58> node src/index.js

Security:
  Your private key never leaves this machine. It is used only
  to sign transactions locally. Verify this by reading the source.
  IMPORTANT: Never commit your .env file to git.
`);
}

// =============================================================================
// Private Key Input
// =============================================================================

async function getPrivateKey(rl) {
  // Check environment variable first (loaded from .env or shell env)
  if (process.env.PRIVATE_KEY) {
    console.log('Private key loaded from environment.');
    return process.env.PRIVATE_KEY.trim();
  }

  // Check if stdin is piped
  if (!process.stdin.isTTY) {
    return new Promise((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => { data += chunk; });
      process.stdin.on('end', () => {
        const key = data.trim();
        if (!key) reject(new Error('No private key provided via stdin'));
        resolve(key);
      });
      process.stdin.on('error', reject);
    });
  }

  // Interactive prompt with masking
  return new Promise((resolve) => {
    process.stdout.write('Enter your Privy wallet private key (base58): ');

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let input = '';

    const onData = (char) => {
      // Ctrl+C
      if (char === '\u0003') {
        stdin.setRawMode(wasRaw);
        console.log('\nAborted.');
        process.exit(1);
      }
      // Enter
      if (char === '\r' || char === '\n') {
        stdin.setRawMode(wasRaw);
        stdin.removeListener('data', onData);
        stdin.pause();
        console.log('');
        resolve(input.trim());
        return;
      }
      // Backspace
      if (char === '\u007F' || char === '\b') {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      // Regular character
      input += char;
      process.stdout.write('*');
    };

    stdin.on('data', onData);
  });
}

// =============================================================================
// Account Selection Helper
// =============================================================================

async function selectAccount(rl, accounts, prompt) {
  if (accounts.length === 1) {
    return accounts[0];
  }

  console.log('');
  for (let i = 0; i < accounts.length; i++) {
    console.log(`  [${i + 1}] ${shortenPubkey(accounts[i].managedMinerAuth)}`);
  }
  console.log(`  [a] All accounts`);
  console.log('');

  const answer = await rl.question(`${prompt}: `);
  const trimmed = answer.trim().toLowerCase();

  if (trimmed === 'a' || trimmed === 'all') {
    return 'all';
  }

  const idx = parseInt(trimmed, 10);
  if (isNaN(idx) || idx < 1 || idx > accounts.length) {
    console.log('Invalid selection.');
    return null;
  }

  return accounts[idx - 1];
}

// =============================================================================
// Confirmation Helper
// =============================================================================

async function confirm(rl, message) {
  const answer = await rl.question(`${message} (y/n): `);
  return answer.trim().toLowerCase() === 'y';
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  displayWelcome();

  // Step 0: Initialize RPC manager
  const rpc = new RpcManager(rpcUrl);
  rpc.printStatus();
  if (includeLegacy) console.log('Legacy mode: scanning auth IDs 0-9');
  console.log('');

  // Create readline interface for menu (NOT for private key — that uses raw mode)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Step 1: Get private key
    // Close rl temporarily for raw mode input
    rl.close();
    const tempRl = null; // unused, just for clarity
    const privateKeyBase58 = await getPrivateKey(null);

    // Re-create rl for menu
    const menuRl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Step 2: Load keypair
    let keypair;
    try {
      keypair = loadKeypairFromBase58(privateKeyBase58);
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      menuRl.close();
      process.exit(1);
    }

    const walletPubkey = keypair.publicKey;
    console.log(`\nWallet: ${walletPubkey.toBase58()}`);
    console.log(`        (${shortenPubkey(walletPubkey)})`);
    console.log('');

    // Step 3: Check wallet SOL balance for tx fees
    const walletBalance = await rpc.call(conn => conn.getBalance(walletPubkey));
    console.log(`Wallet SOL balance: ${formatSol(BigInt(walletBalance))} SOL`);
    if (walletBalance < 5000) {
      console.log('WARNING: Your wallet has very low SOL. You need SOL to pay transaction fees.');
    }
    console.log('');

    // Step 4: Initial scan
    let accounts = await scanForSubaccounts(rpc, walletPubkey, includeLegacy);
    displayAccounts(accounts);

    if (accounts.length === 0) {
      menuRl.close();
      process.exit(0);
    }

    // Step 5: Menu loop
    let running = true;
    while (running) {
      displayMenu();
      const choice = await menuRl.question('Select: ');

      switch (choice.trim()) {
        case '0': {
          running = false;
          break;
        }

        case '1': {
          // Refresh
          console.log('');
          accounts = await scanForSubaccounts(rpc, walletPubkey, includeLegacy);
          displayAccounts(accounts);
          break;
        }

        case '2': {
          // Claim SOL
          const selected = await selectAccount(menuRl, accounts, 'Select account to claim SOL from');
          if (!selected) break;

          if (selected === 'all') {
            if (!(await confirm(menuRl, 'Claim SOL from all accounts?'))) break;
            for (const account of accounts) {
              console.log(`\n  Account: ${shortenPubkey(account.managedMinerAuth)}`);
              try {
                await claimSol(rpc, keypair, account);
              } catch (err) {
                console.error(`  Error: ${err.message}`);
              }
            }
          } else {
            if (!(await confirm(menuRl, `Claim SOL from ${shortenPubkey(selected.managedMinerAuth)}?`))) break;
            try {
              await claimSol(rpc, keypair, selected);
            } catch (err) {
              console.error(`  Error: ${err.message}`);
            }
          }
          console.log('');
          break;
        }

        case '3': {
          // Claim ORE
          const selected = await selectAccount(menuRl, accounts, 'Select account to claim ORE from');
          if (!selected) break;

          if (selected === 'all') {
            if (!(await confirm(menuRl, 'Claim ORE from all accounts?'))) break;
            for (const account of accounts) {
              console.log(`\n  Account: ${shortenPubkey(account.managedMinerAuth)}`);
              try {
                await claimOre(rpc, keypair, account);
              } catch (err) {
                console.error(`  Error: ${err.message}`);
              }
            }
          } else {
            if (!(await confirm(menuRl, `Claim ORE from ${shortenPubkey(selected.managedMinerAuth)}?`))) break;
            try {
              await claimOre(rpc, keypair, selected);
            } catch (err) {
              console.error(`  Error: ${err.message}`);
            }
          }
          console.log('');
          break;
        }

        case '4': {
          // RECOVER ALL
          console.log('');
          console.log('  RECOVER ALL will:');
          console.log('    1. Checkpoint any uncheckpointed rounds');
          console.log('    2. Claim all SOL (rewards + entire autodeploy balance)');
          console.log('    3. Claim all ORE rewards');
          console.log('');

          if (!(await confirm(menuRl, 'Proceed with full recovery?'))) break;

          for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            console.log(`\n  === Account #${i + 1}: ${shortenPubkey(account.managedMinerAuth)} ===`);

            try {
              const results = await recoverAll(rpc, keypair, account);
              if (results.length === 0) {
                console.log('  Nothing to recover from this account.');
              } else {
                for (const r of results) {
                  console.log(`  ${r.type}: ${r.signature}`);
                }
              }
            } catch (err) {
              console.error(`  Error: ${err.message}`);
            }
          }

          // Refresh balances after recovery
          console.log('\n  Refreshing balances...');
          accounts = await scanForSubaccounts(rpc, walletPubkey, includeLegacy);
          displayAccounts(accounts);

          const newWalletBalance = await rpc.call(conn => conn.getBalance(walletPubkey));
          console.log(`  Wallet SOL balance: ${formatSol(BigInt(newWalletBalance))} SOL`);
          console.log('');
          break;
        }

        default:
          console.log('  Invalid selection. Try again.\n');
      }
    }

    console.log('\nGoodbye!');
    menuRl.close();
  } catch (err) {
    console.error(`\nFatal error: ${err.message}`);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`\nFatal error: ${err.message}`);
  process.exit(1);
});
