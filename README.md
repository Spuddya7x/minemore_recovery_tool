# MineMore Recovery CLI

**Language / 语言 / 언어:** [English](#english) | [中文](#中文) | [한국어](#한국어)

---

<a id="english"></a>

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

---

<a id="中文"></a>

# MineMore 资金恢复 CLI

**Language / 语言 / 언어:** [English](#english) | [中文](#中文) | [한국어](#한국어)

独立的开源 CLI 工具，用于从 MineMore 子账户中恢复资金（SOL 和 ORE）。

**如果 MineMore 不可用，此工具可让您仅使用 Privy 钱包私钥和 Solana RPC 连接即可恢复所有资金。**

## 安全性

- 您的私钥**绝不会离开您的机器** — 仅用于在本地签署交易
- 除了您指定的 Solana RPC 端点外，不会进行任何网络调用
- 此工具完全开源 — 使用前请自行审查代码
- 最少依赖：仅 `@solana/web3.js` 和 `bs58`

## 系统要求

- Node.js 18 或更高版本
- 您的 Privy 钱包私钥（base58 格式，从 Privy 设置中导出）
- 钱包中需有 SOL 用于支付交易费用（每笔交易约 0.005 SOL）

## 安装

```bash
git clone https://github.com/minemore/minemore-recovery-cli.git
cd minemore-recovery-cli
npm install
```

## 快速开始（推荐）

1. 复制示例环境文件：
```bash
# Linux / macOS
cp .env.example .env

# Windows (CMD)
copy .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

2. 编辑 `.env` 文件，填入您的私钥和 RPC 端点：
```env
PRIVATE_KEY=<your-base58-private-key>
RPC_URL=https://your-rpc-endpoint.com
```

3. 运行工具：
```bash
node src/index.js
```

> **请勿将 `.env` 文件提交到 git。** 该文件已包含在 `.gitignore` 中。

### 替代用法

```bash
# 交互式提示 — 以掩码输入方式输入私钥
node src/index.js --rpc https://your-rpc-endpoint.com

# 内联环境变量
PRIVATE_KEY=<your-base58-key> node src/index.js --rpc https://your-rpc.com
```

### 选项

| 参数 | 描述 |
|------|------|
| `--rpc, -r <url>` | Solana RPC 端点（覆盖 `.env` 中的 `RPC_URL`） |
| `--legacy` | 扫描旧版 auth ID 0-9（默认仅 auth ID 0） |
| `--help, -h` | 显示帮助 |

### 菜单选项

加载账户后，您将看到交互式菜单：

```
[1] 刷新余额
[2] 领取 SOL 奖励（选择账户）
[3] 领取 ORE 奖励（选择账户）
[4] 提取自动部署余额（选择账户）
[5] 恢复全部（领取 + 提取所有资金）
[0] 退出
```

**选项 5（恢复全部）** 是推荐路径 — 它将：
1. 检查点记录任何未检查点的挖矿轮次
2. 领取所有待领取的 SOL 奖励
3. 领取所有待领取的 ORE 奖励
4. 提取所有自动部署余额

## 工作原理

MineMore 使用 Solana 上的智能合约（https://solscan.io/account/8jaLKWLJAj5jVCZbxpe3zRUvLB3LD48MRtaQ2AjfCfxa）来管理挖矿子账户。每个子账户包括：

1. **Manager 账户** — 将您的钱包存储为 `authority`（所有者）
2. **ManagedMinerAuth PDA** — 持有您的自动部署 SOL 余额
3. **ORE Miner PDA** — 持有您的挖矿奖励（SOL 和 ORE）

此工具：
1. 扫描链上智能合约，查找所有以**您**为 authority 的 Manager 账户
2. 派生关联的 PDA 地址
3. 从每个 PDA 获取余额
4. 使用您的私钥在本地构建并签署恢复交易

## 常见问题

**问：如何获取我的 Privy 私钥？**
答：在 MineMore 应用中，进入钱包设置（或 Privy 设置）并导出私钥。它将是一个 base58 编码的字符串。

**问：未找到账户 — 该怎么办？**
答：尝试使用 `--legacy` 参数扫描其他 auth ID。同时确认您使用的是正确的私钥和 RPC 端点。

**问：什么是租金储备？**
答：Solana 账户需要最低余额（免租最低值）才能保持活跃。ManagedMinerAuth PDA 有 0.000891 SOL 的租金储备，无法提取。显示的"可提取"余额已扣除此金额。

**问：我的钱包需要 SOL 吗？**
答：是的，需要少量 SOL（约 0.005 SOL）来支付 Solana 交易费用。

**问：这安全吗？**
答：此工具是开源的，仅有 2 个依赖（`@solana/web3.js` 和 `bs58`）。您的私钥仅用于在本地机器上签署交易。除 Solana RPC 端点外，不会向任何服务器发送数据。我们建议您在使用前阅读源代码。

## 许可证

MIT

---

<a id="한국어"></a>

# MineMore 자금 복구 CLI

**Language / 语言 / 언어:** [English](#english) | [中文](#中文) | [한국어](#한국어)

MineMore 하위 계정에서 자금(SOL 및 ORE)을 복구하기 위한 독립형 오픈소스 CLI 도구입니다.

**MineMore를 사용할 수 없는 경우, 이 도구를 사용하면 Privy 지갑 개인 키와 Solana RPC 연결만으로 모든 자금을 복구할 수 있습니다.**

## 보안

- 개인 키는 **절대로 컴퓨터 밖으로 나가지 않습니다** — 로컬에서 트랜잭션 서명에만 사용됩니다
- 지정한 Solana RPC 엔드포인트 외에는 네트워크 호출이 이루어지지 않습니다
- 이 도구는 완전한 오픈소스입니다 — 사용 전 직접 코드를 확인하세요
- 최소 종속성: `@solana/web3.js` 및 `bs58`만 사용

## 요구 사항

- Node.js 18 이상
- Privy 지갑 개인 키 (base58 형식, Privy 설정에서 내보내기)
- 트랜잭션 수수료를 위한 지갑 내 SOL (트랜잭션당 약 0.005 SOL)

## 설치

```bash
git clone https://github.com/minemore/minemore-recovery-cli.git
cd minemore-recovery-cli
npm install
```

## 빠른 시작 (권장)

1. 예제 환경 파일 복사:
```bash
# Linux / macOS
cp .env.example .env

# Windows (CMD)
copy .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

2. `.env` 파일에 개인 키와 RPC 엔드포인트를 입력:
```env
PRIVATE_KEY=<your-base58-private-key>
RPC_URL=https://your-rpc-endpoint.com
```

3. 도구 실행:
```bash
node src/index.js
```

> **`.env` 파일을 git에 커밋하지 마세요.** 이미 `.gitignore`에 포함되어 있습니다.

### 대체 사용법

```bash
# 대화형 프롬프트 — 마스킹된 입력으로 개인 키 입력
node src/index.js --rpc https://your-rpc-endpoint.com

# 인라인 환경 변수
PRIVATE_KEY=<your-base58-key> node src/index.js --rpc https://your-rpc.com
```

### 옵션

| 플래그 | 설명 |
|--------|------|
| `--rpc, -r <url>` | Solana RPC 엔드포인트 (`.env`의 `RPC_URL` 덮어쓰기) |
| `--legacy` | 레거시 auth ID 0-9 스캔 (기본값: auth ID 0만) |
| `--help, -h` | 도움말 표시 |

### 메뉴 옵션

계정이 로드되면 대화형 메뉴가 표시됩니다:

```
[1] 잔액 새로고침
[2] SOL 보상 청구 (계정 선택)
[3] ORE 보상 청구 (계정 선택)
[4] 자동 배포 잔액 인출 (계정 선택)
[5] 전체 복구 (청구 + 모든 자금 인출)
[0] 종료
```

**옵션 5 (전체 복구)** 가 권장 경로입니다 — 다음을 수행합니다:
1. 체크포인트되지 않은 채굴 라운드 체크포인트
2. 대기 중인 모든 SOL 보상 청구
3. 대기 중인 모든 ORE 보상 청구
4. 모든 자동 배포 잔액 인출

## 작동 원리

MineMore는 Solana의 스마트 컨트랙트(https://solscan.io/account/8jaLKWLJAj5jVCZbxpe3zRUvLB3LD48MRtaQ2AjfCfxa)를 사용하여 채굴 하위 계정을 관리합니다. 각 하위 계정은 다음으로 구성됩니다:

1. **Manager 계정** — 지갑을 `authority`(소유자)로 저장
2. **ManagedMinerAuth PDA** — 자동 배포 SOL 잔액 보유
3. **ORE Miner PDA** — 채굴 보상 보유 (SOL 및 ORE)

이 도구는:
1. 온체인 스마트 컨트랙트에서 **본인**이 authority인 모든 Manager 계정을 스캔합니다
2. 연관된 PDA 주소를 도출합니다
3. 각 PDA에서 잔액을 조회합니다
4. 개인 키를 사용하여 로컬에서 복구 트랜잭션을 생성하고 서명합니다

## 자주 묻는 질문

**Q: Privy 개인 키는 어떻게 가져오나요?**
A: MineMore 앱에서 지갑 설정(또는 Privy 설정)으로 이동하여 개인 키를 내보내세요. base58로 인코딩된 문자열입니다.

**Q: 계정을 찾을 수 없습니다 — 어떻게 해야 하나요?**
A: `--legacy` 플래그를 사용하여 추가 auth ID를 스캔해 보세요. 또한 올바른 개인 키와 RPC 엔드포인트를 사용하고 있는지 확인하세요.

**Q: 임대료 예비금이란 무엇인가요?**
A: Solana 계정은 활성 상태를 유지하기 위해 최소 잔액(임대료 면제 최소값)이 필요합니다. ManagedMinerAuth PDA에는 인출할 수 없는 0.000891 SOL의 임대료 예비금이 있습니다. 표시되는 "인출 가능" 잔액은 이미 이 금액을 차감한 것입니다.

**Q: 지갑에 SOL이 필요한가요?**
A: 네, Solana 트랜잭션 수수료를 지불하기 위해 소량의 SOL(약 0.005 SOL)이 필요합니다.

**Q: 이것은 안전한가요?**
A: 이 도구는 2개의 종속성(`@solana/web3.js` 및 `bs58`)만 있는 오픈소스입니다. 개인 키는 로컬 머신에서 트랜잭션 서명에만 사용됩니다. Solana RPC 엔드포인트를 제외하고 어떤 서버로도 데이터가 전송되지 않습니다. 사용 전 소스 코드를 직접 확인하시기 바랍니다.

## 라이선스

MIT
