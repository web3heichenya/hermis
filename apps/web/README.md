# Hermis - Web

The Next.js frontend web application for the Hermis Protocol.

## 🚀 Tech Stack

- **Framework**: Next.js 15 App Router with React 19.
- **Language**: TypeScript with strict ESLint 9 and Prettier 3 enforcement.
- **Styling**: Tailwind CSS v4, design tokens, and custom Three.js background effects.
- **State Management**: Zustand stores with persistent filters and session data.
- **Data Layer**: TanStack Query (React Query) and Hermis subgraph client utilities.
- **Web3 Toolkit**: RainbowKit, Wagmi, Viem, and WalletConnect project configuration for Base Sepolia.

## 📦 Setup & Development

Dependencies and build scripts are managed by the Turborepo root. To start the development server:

```bash
# Must be executed from the monorepo root
pnpm turbo dev --filter=@hermis/web
```

### Environment Variables

Copy the `.env.example` to `.env.local` and configure:

| Variable                                                 | Description                                           |
| -------------------------------------------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_DATA_PROVIDER`                              | Select `real` (subgraph) or `mock` for offline demos. |
| `NEXT_PUBLIC_CHAIN_ID` / `NEXT_PUBLIC_REQUIRED_CHAIN_ID` | Expected network (Base Sepolia 84532).                |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`                   | WalletConnect ID for RainbowKit.                      |
| `NEXT_PUBLIC_SUBGRAPH_URL`                               | Hermis subgraph endpoint.                             |
| `NEXT_PUBLIC_...` addresses                              | Smart contract addresses (see root README).           |

## 🏗️ Project Structure

```
src/
├── abi/                 # Contract ABIs for Base Sepolia deployments
├── app/                 # Next.js App Router pages and layouts
├── components/          # React components grouped by domain
│   ├── dashboard/       # Analytics widgets
│   ├── missions/        # Mission and submission modules
│   ├── review/          # Reviewer tooling and guard summaries
│   ├── arbitration/     # Dispute resolution views
│   ├── ui/              # Reusable UI primitives
│   └── wallet/          # Wallet connection components
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries (i18n, chains, formatting)
├── providers/           # App-level providers (wallet, theme, language)
├── services/            # Subgraph client and data mappers
├── store/               # Zustand store configuration
├── styles/              # Global styles and tailwind layers
└── types/               # TypeScript type definitions
```

## 🌐 Internationalization

The app supports multiple languages using `react-i18next`. Language resources live in `public/locales`.

Supported languages:

- English (en)
- Simplified Chinese (zh)

## 💡 Troubleshooting

### Common Issues

1. **Wallet Connection Issues**
   - Ensure your wallet is on Base Sepolia
   - Confirm the WalletConnect project ID matches your `.env.local`
   - Clear browser cache or reconnect if the modal stalls

2. **Empty Dashboards**
   - Verify `NEXT_PUBLIC_SUBGRAPH_URL` points to a live Hermis subgraph
   - Ensure the data provider mode is set to `real`

3. **Guard Validation Failures**
   - Confirm the connected wallet meets staking, SBT, and allowlist requirements
   - Review contract addresses in `.env.local`
