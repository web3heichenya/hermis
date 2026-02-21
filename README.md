<div align="center">
  <img src="apps/web/public/logo.png" alt="Hermis Logo" width="120" />
</div>

# Hermis Protocol

*Web3 Crowdsourcing Coordination Layer*

Hermis Protocol decentralizes the crowdsourcing marketplace so task publishers, collaborators, and reviewers can coordinate without intermediaries. Smart contracts manage task lifecycles, escrow funds, and enforce programmable policies, while on-chain reputation and arbitration modules keep the ecosystem fair and transparent.

## 🎯 Overview

### Key Features

- **🤝 Decentralized Collaboration**: Direct interaction between publishers and contributors secured by smart contracts.
- **🏆 Reputation-Driven Matching**: Dynamic scoring system influences eligibility, rewards, and review priority.
- **🛡️ Policy Guards**: Composable guard modules enforce access, submission, and review rules per task.
- **⚖️ Transparent Arbitration**: Programmable dispute workflows finalize payouts and penalties on-chain.
- **💰 Token Incentives**: Treasury-backed payouts and configurable reward strategies align stakeholder interests.
- **🪪 Soulbound Identity**: Hermis SBT anchors participant identity, making reputation and penalties non-transferable.

## 🏗️ Architecture & Monorepo Structure

This project is structured as a **Turborepo** monorepo using **pnpm workspaces**. It consists of three main components:

- **[`apps/web`](apps/web)**: The Next.js 15 frontend web application. Powers the user interface, wallet integration, and dashboards.
- **[`apps/contracts`](apps/contracts)**: The Foundry-based smart contract suite. Contains the core logic, guards, strategies, and deployment scripts.
- **[`apps/subgraph`](apps/subgraph)**: The Graph Protocol indexing service. Indexes blockchain events and provides a GraphQL API for the frontend and analytics.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- pnpm (v9+)
- Foundry (for smart contract development)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/web3heichenya/hermis-monorepo.git
   cd hermis-monorepo
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

### Common Commands

This monorepo uses Turborepo to orchestrate tasks across all projects:

```bash
# Start the web development server
pnpm turbo dev --filter=@hermis/web

# Build all projects
pnpm turbo build

# Run smart contract tests
pnpm turbo test --filter=@hermis/contracts

# Run all linters
pnpm turbo lint

# Format code
pnpm turbo format
```

## 🤝 Contributing

We welcome community contributions! Please review the individual READMEs in each `apps/` directory for module-specific development workflows.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Verify changes pass tests and linting (`pnpm turbo build lint test`)
5. Push to the branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

## 📄 License

Hermis Protocol is experimental software. 
Contracts are licensed under MIT. See individual sub-project licenses for more details.
