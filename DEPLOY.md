# Deployment guide

This project is structured as three deployable pieces: **Postgres**, **NestJS backend**, **Next.js frontend**. The combination below keeps everything on free tiers. Swap any piece if you already have infra.

| Piece     | Recommended host | Why                                                 |
| --------- | ---------------- | --------------------------------------------------- |
| Postgres  | Neon or Railway  | Managed, free tier, supports Prisma directly        |
| Backend   | Railway / Render | Long-lived process (Socket.IO needs this, not Vercel) |
| Frontend  | Vercel           | Zero-config Next.js deploys                         |

> ⚠️ Do **not** deploy the backend to Vercel — Vercel uses serverless functions, which cannot hold open WebSocket connections.

---

## 1. Postgres (Neon)

1. Create a project at https://neon.tech — note the connection string.
2. Locally, point your `.env` at it and run:
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```
    - migrate deploy applies all your existing migrations to the Neon database (create tables).                                               
    - seed inserts the admin/agents/customers/AI user.

3. Save the connection string (needed by backend).

---

## 2. Backend (Railway)

1. Create a new Railway project → "Deploy from GitHub repo" → pick this repo, set the root to `backend/`.
2. Set environment variables:
   ```
   DATABASE_URL=<Neon connection string>
   JWT_SECRET=<long random string>
   OPENAI_API_KEY=<your key>
   PORT=3000
   ```
3. Set the build and start commands:
   - Build: `npm install && npx prisma generate && npm run build`
   - Start: `npm run start`
4. Make sure CORS in `backend/src/chat/chat.gateway.ts` (`origin: "*"`) stays permissive, or tighten it to your Vercel URL once you have it.
5. Add a custom public domain or use the generated `*.up.railway.app` URL.

---

## 3. Frontend (Vercel)

1. Import the repo in Vercel → set the root directory to `frontend/`.
2. Environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://<your-railway-domain>
   ```
3. Deploy. That's it.

---

## After deploying

- Test the live site with the seeded accounts (`customer1@test.com` / `password`, `agent1@test.com`, `admin@test.com`).
- Record a short GIF of the core flow (customer message → AI reply → agent takeover → resolve) and link it in `README.md`.
- Consider tightening the Socket.IO CORS to your Vercel origin only.

## Cost ceiling

- Neon free tier: 0.5 GB storage, fine for a demo.
- Railway free tier: $5 of usage credit/month.
- Vercel free tier: unlimited for hobby projects.
- The real cost to watch is **OpenAI** — the rate limits in the app (`5 AI-suggestion requests / 60s per agent`, `20 messages / 10s per user`) cap the bill, but add a hard monthly limit in your OpenAI dashboard anyway.
