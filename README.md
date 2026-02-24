# DOLinear

A Linear clone for project management, built with a modern TypeScript stack.

## Tech Stack

- **Frontend**: React + Vite + TypeScript + TanStack Router + TanStack Query + Tailwind CSS v4
- **Backend**: Hono + TypeScript + Node.js
- **Database**: PostgreSQL 15 + Drizzle ORM
- **Auth**: Better Auth (Email/Password)
- **Testing**: Vitest + Testcontainers
- **Infra**: Docker Compose, pnpm + Turborepo monorepo

## Project Structure

```
dolinear/
├── apps/
│   ├── web/        # React frontend (port 5173)
│   └── api/        # Hono API server (port 3001)
├── packages/
│   └── shared/     # Shared types and utilities
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## Local Development Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker & Docker Compose

### Getting Started

1. **Start the database**:
   ```bash
   docker compose up -d
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Push database schema**:
   ```bash
   pnpm --filter api db:push
   ```

4. **Start development servers**:
   ```bash
   pnpm dev
   ```

   This starts both the frontend (http://localhost:5173) and API (http://localhost:3001) concurrently via Turborepo.

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm db:up` | Start PostgreSQL via Docker Compose |
| `pnpm db:down` | Stop PostgreSQL |
| `pnpm --filter api db:push` | Push Drizzle schema to database |
| `pnpm --filter api db:generate` | Generate Drizzle migrations |
| `pnpm --filter api db:studio` | Open Drizzle Studio |
