# Hermis - Smart Contracts
The Foundry-based smart contract suite for the Hermis Protocol.

## 🏗️ Architecture

The Hermis smart contract suite is organized into modular layers for flexibility and upgradeability:

### Core Contracts
- **`TaskManager`** – Creates tasks, manages funding requirements, and tracks status transitions
- **`SubmissionManager`** – Records submissions, orchestrates reviewer assignments, and settles outcomes
- **`ReputationManager`** – Maintains contributor and reviewer scores that influence future participation

### Governance & Policy Modules
- **`AllowlistManager`** – Curates approved guards, strategies, and reward tokens for use across the protocol
- **Guards (`GlobalGuard`, `SubmissionGuard`, `ReviewGuard`)** – Enforce granular preconditions before task actions execute

### Strategy Layer & Extensions
- **Adoption Strategies** – Determine collaborator selection and slot allocation rules
- **Reward Strategies** – Split payouts between collaborators, reviewers, and the treasury based on task context

## 🚀 Development

### Prerequisites

- Foundry installed

### Local Development

Scripts can be run directly via `forge` or via `pnpm turbo` from the monorepo root:

```bash
# Compile contracts
pnpm turbo build --filter=@hermis/contracts
# Run tests
pnpm turbo test --filter=@hermis/contracts
# Format code
pnpm turbo format --filter=@hermis/contracts
```

Alternatively, direct `make` commands inside this directory are still supported:

```bash
make build             # Compile contracts
make test              # Run verbose test suite
make test-coverage     # Generate coverage report
make lint-all          # Run formatting, linting, and security checks
make lint-security     # Execute Slither analysis
```

### Testing Strategy

- **Unit Tests** – Validate individual guard, strategy, and core contract behaviors
- **Integration Tests** – Exercise end-to-end task publication, submission, and settlement flows
- **Security Tests** – Cover reentrancy, double-spend, and authorization edge cases
- **Economic Simulations** – Verify reward distribution and treasury accounting logic

## 🌐 Deployment

### Environment Variables

```bash
PRIVATE_KEY=              # Deployer private key
BASE_SEPOLIA_RPC_URL=     # Base Sepolia RPC endpoint
MAINNET_RPC_URL=          # Mainnet RPC endpoint (when applicable)
ETHERSCAN_API_KEY=        # Explorer API key for verification
```

### Deployment Process

1. Configure `.env` with RPC endpoints, deployer key, and explorer API token
2. Deploy contracts
   ```bash
   forge script script/DeployHermis.s.sol \
     --rpc-url $BASE_SEPOLIA_RPC_URL \
     --private-key $PRIVATE_KEY \
     --broadcast --verify
   ```

### Base Sepolia Contracts (Chain ID 84532)

| Module | Address | Explorer |
|--------|---------|----------|
| TaskManager | `0x5Fc6133a49Be7B8395e2A0978b6B06B1Ed72f424` | [View](https://sepolia.basescan.org/address/0x5Fc6133a49Be7B8395e2A0978b6B06B1Ed72f424) |
| SubmissionManager | `0xa770ffD8ce8f23D47b6E65E63280953Fd37dA3c2` | [View](https://sepolia.basescan.org/address/0xa770ffD8ce8f23D47b6E65E63280953Fd37dA3c2) |
| ReputationManager | `0x993966471695DfE32fD263D0C255D921FB9d02a6` | [View](https://sepolia.basescan.org/address/0x993966471695DfE32fD263D0C255D921FB9d02a6) |
| AllowlistManager | `0x3B3E3EE79BF8cE7fdd144D93f275E765aEb1BE48` | [View](https://sepolia.basescan.org/address/0x3B3E3EE79BF8cE7fdd144D93f275E765aEb1BE48) |
| ArbitrationManager | `0xDF2e26eE889Eb3b63BE42B36dD619fE306F70CB9` | [View](https://sepolia.basescan.org/address/0xDF2e26eE889Eb3b63BE42B36dD619fE306F70CB9) |
| Treasury | `0x1cc16662dAE018D4799689aBF15A974106EeE09b` | [View](https://sepolia.basescan.org/address/0x1cc16662dAE018D4799689aBF15A974106EeE09b) |
| HermisSBT | `0xD44d9D61C36f2FB0B0095dA91B9541BFEfD94749` | [View](https://sepolia.basescan.org/address/0xD44d9D61C36f2FB0B0095dA91B9541BFEfD94749) |
| GlobalGuard | `0x0150192A139d592cC50179291a6A40fD228EB4a5` | [View](https://sepolia.basescan.org/address/0x0150192A139d592cC50179291a6A40fD228EB4a5) |
| SubmissionGuard | `0x65DA79467f60cB4829183d50Bb4fA9A836DfcB07` | [View](https://sepolia.basescan.org/address/0x65DA79467f60cB4829183d50Bb4fA9A836DfcB07) |
| ReviewGuard | `0x3a0508bBf4ACD261Fe3FECb1267be0fbCCca6DbA` | [View](https://sepolia.basescan.org/address/0x3a0508bBf4ACD261Fe3FECb1267be0fbCCca6DbA) |
