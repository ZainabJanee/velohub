# VeloHub Orchestrator

VeloHub Orchestrator is an open-source payment orchestration monorepo designed for marketplaces. It provides a Web2 balances ledger (available and reserved balance pools) backed by Airtm payment rails for top-ups/withdrawals and non-custodial escrows on the Stellar network (using Trustless Work).

## 🚀 Key Features

- **💰 Double-Balance Pools:** Keeps available and reserved balance metrics isolated.
- **⚡ Airtm Rails integration:** Handles deposits and withdrawals.
- **🤝 Non-custodial Escrows:** Interacts with Stellar to verify escrow states on-chain.
- **🔐 Enterprise Security:**
  - Database Transaction Lock isolation to prevent double withdrawals.
  - Redis-backed request idempotency middleware.
  - Audit logging of all database actions.
- **🛠️ Monorepo Workspaces:** Clean packaging splitting applications and modules.
- **💻 Live Dashboard Simulator:** An interactive React website simulating payment logs, top-ups, withdrawals, and escrow operations.

## 🏗️ Project Structure

```
├── apps/
│   ├── api/          # NestJS HTTP Server (port 4000)
│   └── worker/       # BullMQ Background Queue Worker
├── packages/
│   ├── shared/       # Shared TypeScript DTOs and types
│   ├── database/     # Prisma Schema and migrations
│   └── sdk/          # Client SDK for marketplaces integrating VeloHub
├── frontend/         # React-Vite Interactive Dashboard (GitHub Pages hosted)
├── docs/             # Technical specifications & API architecture
├── Makefile          # Clean developer shortcut commands
└── docker-compose.yml
```

## 🔗 Live Demo & Website

The interactive **VeloHub Dashboard & Escrow Simulator** is deployed and hosted on GitHub Pages:
👉 **[Live Website Link](https://ZainabJanee.github.io/velohub/)**

---

## 🏁 Getting Started

See [CONTRIBUTING.md](CONTRIBUTING.md) for step-by-step local developer setup instructions.

### Run Frontend Sandbox locally

Run the React website locally for development:
```bash
cd frontend
npm install
npm run dev
```
