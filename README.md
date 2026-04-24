# Real-Time AI Customer Support

A full-stack customer support platform where customers chat with an AI assistant and get automatically escalated to a human agent when one is available. Built to explore real-time systems, structured LLM outputs, and multi-role workflows end-to-end.

> **Live demo:** _add URL after deploying_
> **Demo video / GIF:** _add after recording_

---

## Features

**Customer**
- Start a chat → immediate AI reply when no agent is online
- Live takeover when an agent comes online (AI handoff with a system message)
- Conversation history with read-only access to past threads
- Typing indicators, message timestamps

**Agent**
- Auto-claim of open tickets on login (capacity-limited: max 3 active chats)
- Unread badges + browser tab flash for messages on unopened tickets
- AI-generated reply suggestions (GPT-4o-mini, JSON-mode)
- Per-message sentiment badges on customer messages (POSITIVE / NEUTRAL / FRUSTRATED / ANGRY)
- One-click ticket resolution

**Admin**
- Live ticket/user/agent stats
- Per-agent online status and active-chat load
- Audit log of assignments, logins, resolutions, closures

**Platform**
- JWT auth with role-based access (CUSTOMER, AGENT, ADMIN)
- Socket.IO rooms per conversation + presence tracking
- Rate limiting on `send_message` (20/10s) and AI suggestions (5/60s) to cap OpenAI spend
- Audit logging for sensitive events
- Participant-scoped authorization on conversation reads

---

## Architecture

```
┌────────────┐       REST       ┌────────────────────┐
│  Next.js   │ ───────────────► │  NestJS API        │
│  frontend  │ ◄─────────────── │  (JWT, Guards)     │
│            │    Socket.IO     │                    │
│            │ ◄──────────────► │  ChatGateway       │
└────────────┘                  └─────────┬──────────┘
                                          │
                         ┌────────────────┼────────────────┐
                         ▼                ▼                ▼
                   ┌──────────┐    ┌────────────┐   ┌───────────┐
                   │ Postgres │    │ OpenAI API │   │ AuditLog  │
                   │ (Prisma) │    │ gpt-4o-    │   │ (Postgres)│
                   │          │    │ mini, JSON │   │           │
                   └──────────┘    └────────────┘   └───────────┘
```

**Key design choices**
- **In-memory rate limiter** instead of Redis — simpler, fine for a single-instance deploy. Would need Redis for horizontal scaling.
- **Structured OpenAI output** (`response_format: json_object`) for suggestions and sentiment — avoids fragile string parsing.
- **Gateway-level sentiment classification** before broadcast so clients get the badge in the same event as the message (no flicker).
- **Per-user socket rooms via `join_conversation`** — the agent dashboard joins every assigned ticket's room on mount to track unread across conversations.
- **Audit log is write-and-forget** — failures are logged but never block the main flow.

---

## Tech Stack

| Layer        | Tech                                                     |
| ------------ | -------------------------------------------------------- |
| Frontend     | Next.js 16 (App Router), React 19, TypeScript, Tailwind  |
| Realtime     | Socket.IO client                                         |
| Backend      | NestJS, TypeScript                                       |
| Realtime API | `@nestjs/websockets` + Socket.IO                         |
| Auth         | `@nestjs/passport` + `@nestjs/jwt`                       |
| DB / ORM     | PostgreSQL + Prisma                                      |
| AI           | OpenAI (`gpt-4o-mini`)                                   |
| Infra (dev)  | Docker Compose (Postgres)                                |

---

## Running locally

### Prerequisites
- Node.js 20+
- Docker Desktop (for Postgres)
- An OpenAI API key

### 1. Start Postgres

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # then fill in the values below
npm install
npx prisma migrate dev
npm run seed
npm run start:dev
```

`.env` keys:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/support_db
JWT_SECRET=<any-long-random-string>
OPENAI_API_KEY=<your-key>
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # default points at http://localhost:3000
npm install
npm run dev
```

Visit `http://localhost:3001`.

### Seeded demo accounts

All passwords are `password`.

| Role     | Email                    |
| -------- | ------------------------ |
| Admin    | admin@demo.local         |
| Agent 1  | agent1@demo.local        |
| Agent 2  | agent2@demo.local        |
| Customer | customer1@demo.local     |
| Customer | customer2@demo.local     |

---

## Project layout

```
backend/
  src/
    admin/          # admin stats, agent list, audit feed
    ai/             # OpenAI wrapper (replies, suggestions, sentiment)
    audit/          # global AuditService
    auth/           # JWT strategy, guards, roles decorator
    chat/           # Socket.IO gateway (the heart of the app)
    common/         # PrismaService, RateLimiter
    conversations/  # REST endpoints for conversation CRUD
    tickets/        # assignment, resolve, close, auto-claim
    users/
  prisma/
    schema.prisma
    seed.ts

frontend/
  app/
    admin/          # admin dashboard
    agent/          # agent dashboard (unread tracking lives here)
    customer/       # customer chat + history
    login/
  components/
    AppShell.tsx
    ChatWindow.tsx  # the main chat UI
    ConfirmDialog.tsx
    ToastProvider.tsx
  hooks/useAuth.ts
  lib/api.ts
```

---

## Roadmap

- [ ] Unit + e2e test coverage
- [ ] CI (GitHub Actions)
- [ ] Deployment (Vercel + Railway)
- [ ] Structured logging + Sentry
- [ ] File/image attachments
- [ ] Redis-backed rate limiter for multi-instance deploys
