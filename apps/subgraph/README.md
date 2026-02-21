# Hermis - Subgraph

The Graph Protocol indexing service for the Hermis Protocol.

## 📊 Overview

This subgraph indexes the Hermis crowdsourcing platform smart contracts, providing comprehensive data access for tasks, submissions, reviews, users, and platform analytics.

### Core Entities
- **Task**: Work requests with rewards, deadlines, and criteria
- **Submission**: Work submissions with versioning and status tracking
- **Review**: Peer reviews of submissions with approve/reject decisions
- **User**: Platform participants with reputation and staking data

### Contract Integration
The subgraph indexes events from these contracts:
- `TaskManager`: Task lifecycle management
- `SubmissionManager`: Work submission and review system
- `ReputationManager`: User reputation and staking
- `ArbitrationManager`: Dispute resolution
- `HermisSBT`: Soul-bound reputation tokens

## ⌨️ Development

Dependencies and building are handled by the Turborepo root configuration.

1. **Update contract addresses** in `subgraph.yaml` if needed.

2. **Generate types** (run from root):
   ```bash
   pnpm --filter @hermis/subgraph run codegen
   ```

3. **Build subgraph** (run from root):
   ```bash
   pnpm turbo build --filter=@hermis/subgraph
   ```

4. **Deploy**:
   ```bash
   # From inside the apps/subgraph directory:
   
   # For The Graph Studio
   pnpm run deploy

   # For local Graph Node
   pnpm run deploy-local
   ```

*(Note: Ensure you update `subgraph.yaml` with the target network, start blocks, and contract addresses before deploying to a new environment.)*
