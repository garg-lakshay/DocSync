# DocSync

Local-first collaborative document editor — House of Edtech Assignment 2.

## Structure

```
EdTech_ass/
├── frontend/   # Next.js 16 (UI + REST API on Vercel)
├── backend/    # WebSocket server (y-websocket on Railway/Render)
└── spec.md
```

## Quick start

### 1. Database

Create a Neon PostgreSQL database and copy the connection string.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Set DATABASE_URL and AUTH_SECRET
npm install
npm run db:generate
npm run db:push
npm run dev
```

WS server runs on `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Set DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_WS_URL=ws://localhost:3001
npm install
npm run db:generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

- **Local-first**: `y-indexeddb` persists edits to IndexedDB before any network call.
- **Real-time sync**: `y-websocket` merges offline edits via Yjs CRDT guarantees (commutative, associative, idempotent updates).
- **Conflict resolution**: handled by Yjs — not custom merge logic.
- **Postgres**: stores document metadata, access roles, and version snapshots — not live content.
- **RBAC**: `OWNER | EDITOR | VIEWER` enforced on API routes and WS server (viewers cannot push sync updates).
- **Version restore**: loads snapshot into a temp doc, replaces the live ProseMirror fragment via Yjs transaction (propagates to all clients).

## Security tradeoffs (documented for evaluators)

- **OOM mitigation**: WS server rejects payloads > 1MB before parsing (`MAX_PAYLOAD_BYTES`).
- **Rate limiting**: in-memory token bucket per connection (scales with process count).
- **Tenant isolation**: all document queries go through `getDocumentForUser()` — app-level scoping; Postgres RLS would be defense-in-depth in production.

## Tests (§10)

```bash
cd backend && npm test    # Yjs merge, viewer RBAC, payload limits
cd frontend && npm test   # restore flow integration
```

## Deployment

| Service | Platform | Env vars |
|---|---|---|
| Frontend | Vercel | `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_WS_URL`, `GROQ_API_KEY` |
| WS server | Railway/Render | `DATABASE_URL`, `AUTH_SECRET`, `PORT` |

`AUTH_SECRET` must match on both services for WS token verification.

## Common issues

**`DATABASE_URL` not found during `db:push`**  
→ Ensure `backend/.env` exists and contains a valid `DATABASE_URL` before running `npm run db:push`.

**`y-websocket/bin/utils` import error**  
→ y-websocket v3 removed the server utils. This project uses a local `backend/src/ws-connection.ts` instead.

**Port 3001 already in use**  
→ Stop the old backend process, then restart: `npm run dev` in `backend/`.

Update `frontend/src/components/footer.tsx` with your GitHub and LinkedIn URLs before submission.
