const fs = require('fs');
const path = require('path');
const { buildInitialState } = require('./data/seed');

// Vercel's serverless filesystem is read-only except for /tmp, and /tmp is
// wiped between cold starts / not shared across instances. This file-based
// store is great for local dev and for any persistent Node host (Render,
// Railway, Fly.io, a VPS). For multi-instance production on Vercel, point
// this module at a hosted database (Vercel Postgres, Turso, Supabase, etc.)
// instead - the rest of the app only talks to readDB()/writeDB()/withLock(),
// so swapping the storage backend does not require touching routes/controllers.
const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'king-of-the-board.db.json')
  : path.join(__dirname, 'data', 'db.json');

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(buildInitialState(), null, 2));
  }
}

function readDB() {
  ensureDB();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDB(data) {
  data.game.updatedAt = new Date().toISOString();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  return data;
}

// Simple in-process async mutex so concurrent bid requests can't interleave
// their read-modify-write cycles and clobber each other's writes.
let lockQueue = Promise.resolve();
function withLock(fn) {
  const run = lockQueue.then(() => fn());
  // Swallow errors here so one failed task doesn't wedge the queue forever;
  // the real error still propagates to the caller via `run`.
  lockQueue = run.catch(() => {});
  return run;
}

function resetDB() {
  const fresh = buildInitialState();
  writeDB(fresh);
  return fresh;
}

module.exports = { readDB, writeDB, withLock, resetDB, DB_PATH };
