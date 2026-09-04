# King of the Board API

Backend for a "Million Dollar Homepage"-style chess auction game: 32 real chess
pieces (16 white, 16 black) are up for grabs, companies bid to own them, and
whoever holds **The King** at the end wins the top spot on the board.

## Stack

- Node.js + Express
- JSON file storage (zero external DB to stand up) behind a small storage
  module (`src/db.js`) so it can be swapped for a hosted database later
- Stripe for payments

## Getting started

```bash
npm install
cp .env.example .env   # fill in STRIPE_SECRET_KEY if you want payments to work
npm run dev
```

Server runs at `http://localhost:3000`. Hit `GET /api` for a live list of
routes, or `npm run smoke-test` (with the server running) to exercise the
main flows end to end.

## Data model

- **Game**: id, name, status (`active`/`ended`), timestamps, and computed
  stats (total raised, pieces sold, etc).
- **Piece** (32 total): id, type (king/queen/rook/bishop/knight/pawn), side
  (white/black), label, basePrice, currentPrice, ownerId, paymentStatus, and
  a full bidHistory.
- **Company**: id, name, logo, website, contact.
- **Activity**: a flattened, newest-first log of every bid across all pieces.

Both chess kings exist as biddable pieces. `GET /api/game/current` also
resolves **"The King"** — the single most prestigious piece in the game,
computed as whichever king currently has the higher price (white breaks
ties).

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/game/current` | Current game state, stats, and The King |
| GET | `/api/pieces` | All 32 pieces + owners (filter: `?side=`, `?type=`, `?available=`) |
| GET | `/api/pieces/:id` | One piece with full bid history |
| POST | `/api/pieces/:id/bid` | Submit a bid (see below) |
| GET | `/api/leaderboard` | Top pieces by price (`?limit=`) |
| GET | `/api/leaderboard/stream` | Server-Sent Events leaderboard feed |
| GET | `/api/activity` | Recent bids (`?limit=`, `?pieceId=`, `?companyId=`) |
| GET | `/api/companies` | All bidding companies + spend |
| GET | `/api/companies/:id` | One company + pieces owned |
| POST | `/api/payment` | Create a Stripe PaymentIntent for a winning bid |
| GET | `/api/payment/:pieceId` | Payment status for a piece |
| POST | `/api/webhooks/stripe` | Stripe webhook (finalizes payment status) |

### Placing a bid

```bash
curl -X POST http://localhost:3000/api/pieces/white-king/bid \
  -H "Content-Type: application/json" \
  -d '{
        "amount": 505,
        "company": { "name": "Acme Corp", "logo": "https://acme.example.com/logo.png",
                      "website": "https://acme.example.com", "contact": "hi@acme.example.com" }
      }'
```

Or reuse an existing company: `{ "amount": 510, "companyId": "<uuid>" }`.

Every piece has a `$5` minimum bid increment over its `currentPrice`
(configurable via `BID_INCREMENT`). Bids below the minimum are rejected with
a `400` that includes the required minimum.

### Payments (Stripe)

1. `POST /api/payment` with `{ pieceId, companyId, amount }` where `amount`
   matches the piece's current winning bid. Returns a PaymentIntent
   `clientSecret`.
2. Confirm the PaymentIntent client-side with Stripe.js/Elements.
3. Stripe calls `POST /api/webhooks/stripe` on success/failure; that's what
   actually flips the piece's `paymentStatus` to `paid` (client-reported
   success is never trusted on its own).

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in your environment.
Without a key configured, payment endpoints respond `501 Stripe is not
configured` instead of crashing, so the rest of the API still works in dev.

## Real-time leaderboard

`GET /api/leaderboard/stream` is a Server-Sent Events endpoint that polls the
store every 2s and pushes a fresh snapshot whenever it changes — no extra
infrastructure needed for a single-instance deployment (e.g. Render,
Railway, Fly.io, a VPS, or `npm run dev`).

## Deploying to Vercel

```bash
vercel deploy
```

`vercel.json` routes all traffic to `api/index.js`, which just re-exports the
Express app — Vercel's Node runtime invokes it directly.

**Important caveat**: Vercel's serverless filesystem is read-only except for
`/tmp`, and `/tmp` is wiped on cold start and not shared across concurrent
instances. This project automatically stores its JSON data in `/tmp` when
`process.env.VERCEL` is set, so the API will run, but bid data **will not
persist reliably** across cold starts or scale past a single warm instance.

For a real production deployment on Vercel:

- Swap `src/db.js` for a hosted database (Vercel Postgres, Turso, Supabase,
  PlanetScale, etc.) — it's the only file that touches storage, so routes and
  controllers don't need to change.
- Swap the SSE leaderboard stream for a hosted pub/sub (Pusher, Ably) or a
  database with change notifications, since SSE polling only sees writes made
  on its own serverless instance.

The JSON-file version here is fully production-ready as-is on any host with a
persistent, writable filesystem and a single long-running process.

## Environment variables

See `.env.example`:

- `PORT` — local dev port (default 3000)
- `CORS_ORIGINS` — comma-separated allowed origins, or `*`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `BID_INCREMENT` — minimum bid increment in dollars (default 5)
