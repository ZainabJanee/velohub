# Contributing to VeloHub Orchestrator

Thank you for contributing to VeloHub Orchestrator! We welcome your pull requests, issues, and documentation improvements.

## 1. Local Monorepo Setup

- Clone the repository:
  ```bash
  git clone <your-repo>
  cd <your-repo>
  ```
- Copy `.env.example` to `.env` and configure your Postgres/Redis URLs:
  ```bash
  cp .env.example .env
  ```
- Install dependencies:
  ```bash
  npm install
  ```
- Spin up PostgreSQL and Redis:
  ```bash
  make docker-up
  ```
- Run Prisma database migrations:
  ```bash
  make db-push
  ```
- Seed database with test users:
  ```bash
  make db-seed
  ```
- Run both API and worker concurrently in development watch mode:
  ```bash
  make dev
  ```

## 2. Coding Standards

- **NestJS:** Use standard controllers, services, and modules.
- **Idempotency:** Ensure mutations inside controllers check `Idempotency-Key` headers via our Redis middleware.
- **Database Safety:** Wrap balance calculations and deductions inside database transaction locks (`prisma.$transaction`).
- **Convention:** We follow semantic commits: `feat(...)`, `fix(...)`, `docs(...)`.
