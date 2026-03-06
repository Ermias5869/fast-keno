# SyntaxKeno - Enterprise Keno Betting Platform

<p align="center">
  <strong>🎰 Casino-Grade Keno Betting Platform with Telegram WebApp Integration</strong>
</p>

## Overview

SyntaxKeno is a production-ready, enterprise-level Keno-style betting platform featuring:

- **Provably Fair** random number generation
- **Casino-Grade Risk Engine** with real-time exposure tracking
- **Telegram WebApp** authentication & integration
- **3D Ball Animation** using Three.js
- **Real-time Updates** via Socket.io
- **Mobile-First Design** optimized for Telegram

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, TypeScript, TailwindCSS |
| State | Zustand, React Query |
| 3D | Three.js |
| Backend | Next.js API Routes, Node.js |
| Database | PostgreSQL (Prisma ORM) |
| Cache | Redis |
| Auth | JWT, @twa-dev/sdk (Telegram) |
| Real-time | Socket.io |
| Container | Docker |

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production (Docker)

```bash
# Build and start all services
docker-compose up -d

# Run database migrations
npx prisma migrate deploy
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── game/          # Game endpoints (round, bet, history)
│   │   └── wallet/        # Wallet endpoints
│   ├── components/        # React Components
│   │   ├── BallDraw3D.tsx # Three.js 3D ball animation
│   │   ├── BetControls.tsx
│   │   ├── GameHeader.tsx
│   │   ├── KenoGame.tsx   # Main game assembly
│   │   ├── NumberGrid.tsx # 8×10 number grid
│   │   ├── TabNavigation.tsx
│   │   └── tabs/          # Tab panel components
│   ├── store/             # Zustand state management
│   └── globals.css        # Theme & design system
├── services/              # Backend services
│   ├── auth-service/      # Telegram auth, JWT
│   ├── game-service/      # Keno engine, round lifecycle
│   ├── risk-service/      # Exposure engine, bankroll protection
│   └── wallet-service/    # Balance operations, transactions
├── shared/                # Shared code
│   ├── types/             # TypeScript interfaces
│   ├── constants/         # Payout table, game config
│   ├── errors/            # Custom error classes
│   └── utils/             # Helpers (seeds, hashing, masking)
├── infra/                 # Infrastructure
│   ├── redis.ts           # Redis client (in-memory fallback)
│   ├── socket.ts          # Socket.io manager
│   └── logger.ts          # Structured logger
├── workers/               # Background workers
│   ├── risk.worker.ts     # Risk monitoring
│   └── settlement.worker.ts
└── prisma/
    └── schema.prisma      # Database schema
```

## Key Features

### Keno Game
- Numbers 1–80, draw 20 per round
- Select 1–10 numbers
- Payout based on matches

### Risk Engine
- Real-time exposure tracking
- Max payout per round enforcement
- Dynamic house edge adjustment
- Bankroll protection
- Outcome risk mapping

### Provably Fair
- Server seed hashed before round
- Client seed accepted
- HMAC-SHA256 number generation
- Server seed revealed after round

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## License

Proprietary - All Rights Reserved
