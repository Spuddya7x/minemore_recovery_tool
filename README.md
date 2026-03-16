# MineMore Recovery CLI

Standalone, open-source CLI tool for recovering funds (SOL & ORE) from MineMore subaccounts.

**If MineMore is ever unavailable, this tool lets you recover all your funds using only your Privy wallet private key and a Solana RPC connection.**

## Security

- Your private key **never leaves your machine** — it is only used to sign transactions locally
- No network calls are made except to the Solana RPC endpoint you specify
- This tool is fully open source — read the code yourself before using
- Minimal dependencies: only `@solana/web3.js` and `bs58`

## Requirements

- Node.js 18 or later
- Your Privy wallet private key (base58 format, exported from Privy settings)
- SOL in your wallet for transaction fees (~0.005 SOL per transaction)

## Installation

```bash
git clone https://github.com/minemore/minemore-recovery-cli.git
cd minemore-recovery-cli
npm install
```

## Quick Start (Recommended)

1. Copy the example environment file:
```bash
# Linux / macOS
cp .env.example .env

# Windows (CMD)
copy .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

2. Edit `.env` with your private key and RPC endpoint:
```env
PRIVATE_KEY=<your-base58-private-key>
RPC_URL=https://your-rpc-endpoint.com
```

3. Run the tool:
```bash
node src/index.js
```

> **Never commit your `.env` file to git.** It is already in `.gitignore`.

### Alternative Usage

```bash
# Interactive prompt — enter private key with masked input
node src/index.js --rpc https://your-rpc-endpoint.com

# Inline environment variable
PRIVATE_KEY=<your-base58-key> node src/index.js --rpc https://your-rpc.com
```

### Options

| Flag | Description |
|------|-------------|
| `--rpc, -r <url>` | Solana RPC endpoint (overrides `RPC_URL` in `.env`) |
| `--legacy` | Scan legacy auth IDs 0-9 (default: only auth ID 0) |
| `--help, -h` | Show help |

### Menu Options

Once your accounts are loaded, you'll see an interactive menu:

```
[1] Refresh balances
[2] Claim SOL rewards (select account)
[3] Claim ORE rewards (select account)
[4] Withdraw autodeploy balance (select account)
[5] RECOVER ALL (claim + withdraw everything)
[0] Exit
```

**Option 5 (RECOVER ALL)** is the recommended path — it will:
1. Checkpoint any uncheckpointed mining rounds
2. Claim all pending SOL rewards
3. Claim all pending ORE rewards
4. Withdraw all autodeploy balances

## How It Works

MineMore uses a smart contract (https://solscan.io/account/8jaLKWLJAj5jVCZbxpe3zRUvLB3LD48MRtaQ2AjfCfxa) on Solana to manage mining subaccounts. Each subaccount consists of:

1. **Manager account** — stores your wallet as the `authority` (owner)
2. **ManagedMinerAuth PDA** — holds your autodeploy SOL balance
3. **ORE Miner PDA** — holds your mining rewards (SOL & ORE)

This tool:
1. Scans the smart contract on-chain for all Manager accounts where **you** are the authority
2. Derives the associated PDA addresses
3. Fetches balances from each PDA
4. Builds and signs recovery transactions locally using your private key

## FAQ

**Q: How do I get my Privy private key?**
A: In the MineMore app, go to your wallet settings (or Privy settings) and export your private key. It will be a base58-encoded string.

**Q: No accounts were found — what do I do?**
A: Try the `--legacy` flag to scan additional auth IDs. Also verify you're using the correct private key and RPC endpoint.

**Q: What is the rent reserve?**
A: Solana accounts require a minimum balance (rent-exempt minimum) to stay alive. The ManagedMinerAuth PDA has a rent reserve of 0.000891 SOL that cannot be withdrawn. The displayed "withdrawable" balance already accounts for this.

**Q: Do I need SOL in my wallet?**
A: Yes, a small amount (~0.005 SOL) is needed to pay Solana transaction fees.

**Q: Is this safe?**
A: This tool is open source with only 2 dependencies (`@solana/web3.js` and `bs58`). Your private key is used exclusively to sign transactions on your local machine. No data is sent to any server except the Solana RPC endpoint. We encourage you to read the source code before use.

## License

MIT
