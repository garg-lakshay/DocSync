# DocSync

A local-first collaborative document editor built for the House of EdTech full-stack assignment. It works offline, syncs automatically when you're back online, and keeps a full version history you can restore from without stepping on anyone else's edits.

**Live app**: [https://doc-sync-ashen.vercel.app/]
**WS server**: [docsync-production-204a.up.railway.app]

## What it does

- Open a document, lose your connection, keep typing — nothing blocks on the network. Edits are saved to IndexedDB the moment you make them.
- Get back online and it just merges. No "conflict" dialog, no picking a winner between your version and someone else's — both sets of changes end up in the document.
- Save a version snapshot any time. Restore an old one without wiping out what a collaborator is currently typing.
- Three roles per document — Owner, Editor, Viewer. Viewers are genuinely read-only, enforced on the server, not just hidden in the UI.
- AI-generated labels for your version history (so "3 hours ago" comes with something like "Restructured intro, added pricing section" instead of nothing).
- One-click AI summary of the current document.
- Invite people by email — if they don't have an account yet, they get a signup link that drops them straight into the document with the right role once they register.

## Why it's built this way

**Yjs instead of hand-rolling a CRDT.** The assignment specifically asks about deterministic conflict resolution and merging without data loss, and I thought about writing my own merge algorithm to show more of the "design" side of things. I decided against it. Yjs's guarantees come from operations being commutative, associative, and idempotent — which is what actually makes convergence deterministic, not clever logic I'd write myself. Reimplementing that badly under a tight deadline felt like a worse demonstration of understanding than using the right tool and being able to explain *why* it's correct. I'd rather be asked "why didn't you build your own CRDT" in an interview than ship one with a subtle merge bug.

**Metadata in Postgres, live content in Yjs.** The database doesn't store the "current" document text directly — it stores who has access to what, and binary snapshots of Yjs state at specific points in time (the version history). The live, editable content lives entirely in the Yjs document, synced over WebSocket. Trying to make Postgres the source of truth for live content would mean fighting Yjs's own persistence model instead of using it.

**Restore is just another sync-compatible edit.** When you restore an old version, the server doesn't overwrite the document. It loads the target snapshot into a temporary Yjs doc, computes the diff against the current live state, and applies that diff as a normal update — the same mechanism as any other edit. That's what makes it safe for other people currently in the document; it propagates through the same CRDT machinery instead of silently clobbering anyone's in-progress work.

**Role enforcement happens twice, not once.** The API checks role before any mutation, and the WebSocket server independently checks it again on room join, straight against Postgres. I didn't want to trust the client to self-report "I'm an Editor" — a Viewer's write messages get rejected server-side even if someone tampered with the frontend.

## Stack

Next.js 16 (App Router, TypeScript), Tailwind + shadcn/ui, Tiptap for the editor, Yjs + y-indexeddb for local-first storage, y-websocket protocol for sync, a standalone Node WebSocket server (deployed separately since Vercel serverless functions can't hold a persistent connection), PostgreSQL on Neon via Prisma, Auth.js for sessions, Redis for rate limiting, Groq (llama-3.3-70b-versatile) for the AI features, Nodemailer for invite emails.

## Security notes, since the assignment specifically asks about this

- Every sync payload is size-capped and rejected before it's parsed — this is the direct answer to "how do you stop a malformed payload from OOMing the server." A large payload gets dropped at the door, not partially processed.
- Rate limiting is enforced through Redis (`INCR` + `EXPIRE` per connection), not an in-memory counter, specifically because an in-memory limiter only works correctly on a single server instance — see the scaling note below.
- Document access is scoped through a single Prisma helper that checks the requesting user against `DocumentAccess` before any document read or write. I didn't do Postgres Row-Level Security for this — I went with application-level scoping instead, mainly because it was faster to get right under the time I had. RLS would be the natural next step for defense-in-depth (a policy like `document_access.user_id = current_setting('app.user_id')`), and I'd add it before this went anywhere near real production traffic.

## Things I know are gaps

I want to be upfront about these rather than pretend they're solved:

- **Document state growth.** Yjs accumulates update history over time, and I haven't implemented compaction/garbage collection for long-lived documents. For a demo-scale document this doesn't matter, but a document that's been actively edited for months would need periodic checkpointing — folding old updates into a single compacted state and trimming what's kept in memory/storage. I know the shape of the fix; I didn't have the runway to implement and properly test it against a live sync engine this close to the deadline, and I'd rather say that plainly than risk destabilizing the sync path with an untested change in the last few hours.
- **Horizontal scaling of the WebSocket server.** Right now it's a single instance holding all room state in memory. If this ran on more than one instance behind a load balancer, two people on the same document could get routed to different instances and stop seeing each other's edits in real time — each instance only knows about its own local connections. The fix is a Redis pub/sub layer between instances (each instance publishes updates to a channel, all instances subscribe), which I already use for rate limiting in this project, so extending it to room broadcast is the natural next step rather than a new pattern.
- **Testing coverage is deliberately narrow, not broad.** Instead of trying to cover everything, I wrote a handful of tests aimed specifically at the claims that matter most: two divergent offline documents merging without data loss, a Viewer's write attempt getting rejected at the WebSocket layer, oversized payloads getting rejected before parsing, and a restore not destroying a concurrently connected client's unsaved changes. I'd rather have four tests that prove something specific than twenty generic ones.

## Running it locally

Backend:
```
cd backend
npm install
npm run db:generate
npm run db:push
npm run dev
```

Frontend:
```
cd frontend
npm install
npm run dev
```

Env vars needed — `DATABASE_URL` (Neon), `AUTH_SECRET`, `NEXT_PUBLIC_WS_URL`, `GROQ_API_KEY`, `REDIS_URL`, and SMTP credentials if you want invite emails to actually send (the app falls back to a copyable invite link if SMTP isn't configured, so this isn't required to use it).

## If I had another few days

Compact Yjs history so document size doesn't grow unbounded. Wire the Redis pub/sub pattern into the WebSocket layer so this survives running more than one instance. Add Postgres RLS on top of the application-level scoping that's there now. Broaden test coverage into a couple of Playwright end-to-end runs — specifically an actual browser going offline, editing, and reconnecting, rather than just unit-level merge tests.

---

Built by Lakshay Garg — [GitHub](https://github.com/garg-lakshay) · [LinkedIn](https://www.linkedin.com/in/lakshay-garg-90327328a/)