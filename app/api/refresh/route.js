import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════════════
// GLOBAL REFRESH COOLDOWN
// One person refreshing blocks everyone else for 12 hours.
// Stored in /tmp — Vercel's ephemeral filesystem.
// Combined with the existing 2-day Next.js cache, this means
// actual Asana API calls are protected on two layers.
// ═══════════════════════════════════════════════════════════

const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
const LOCK_FILE = path.join('/tmp', 'refresh-lock.json');

async function readLock() {
  try {
    const content = await fs.readFile(LOCK_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

async function writeLock(data) {
  await fs.writeFile(LOCK_FILE, JSON.stringify(data));
}

// GET: returns current cooldown state for the UI to show countdown
export async function GET() {
  const lock = await readLock();
  if (!lock || !lock.lastRefresh) {
    return NextResponse.json({ locked: false, lastRefresh: null, nextAvailable: null });
  }
  const now = Date.now();
  const elapsed = now - lock.lastRefresh;
  if (elapsed >= COOLDOWN_MS) {
    return NextResponse.json({ locked: false, lastRefresh: lock.lastRefresh, nextAvailable: null });
  }
  return NextResponse.json({
    locked: true,
    lastRefresh: lock.lastRefresh,
    nextAvailable: lock.lastRefresh + COOLDOWN_MS,
    lastRefreshedBy: lock.userName || null,
  });
}

// POST: trigger a refresh if cooldown allows
export async function POST(request) {
  const lock = await readLock();
  const now = Date.now();

  if (lock && lock.lastRefresh) {
    const elapsed = now - lock.lastRefresh;
    if (elapsed < COOLDOWN_MS) {
      return NextResponse.json({
        success: false,
        locked: true,
        lastRefresh: lock.lastRefresh,
        nextAvailable: lock.lastRefresh + COOLDOWN_MS,
        remainingMs: COOLDOWN_MS - elapsed,
        lastRefreshedBy: lock.userName || null,
      }, { status: 429 });
    }
  }

  let userName = null;
  try {
    const body = await request.json();
    userName = body?.userName || null;
  } catch (e) { /* no body is fine */ }

  await writeLock({ lastRefresh: now, userName });
  revalidatePath('/');

  return NextResponse.json({
    success: true,
    locked: true,
    lastRefresh: now,
    nextAvailable: now + COOLDOWN_MS,
  });
}
