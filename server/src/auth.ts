import crypto from 'node:crypto';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { getPool, sql } from './db.js';
import type { SessionUser } from './types.js';

/**
 * Delphi's `System.Hash.THashSHA2.GetHashString` (default SHA256) produces a
 * lowercase hex digest with no salt. We must reproduce it exactly so existing
 * accounts in the `users` table keep working.
 */
export function sha256hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.auth.cookieSecure,
    sameSite: config.auth.cookieSameSite,
    path: '/',
  };
}

// ---------------------------------------------------------------------------
// Session cookie (short-lived, signed) - replaces the uniGUI server session.
// ---------------------------------------------------------------------------
export function issueSession(res: Response, user: SessionUser): void {
  const token = jwt.sign({ id: user.id, username: user.username }, config.auth.secret, {
    expiresIn: Math.floor(config.auth.sessionMaxAgeMs / 1000),
  });
  res.cookie(config.auth.sessionCookie, token, {
    ...baseCookieOptions(),
    maxAge: config.auth.sessionMaxAgeMs,
  });
}

export function clearSession(res: Response): void {
  res.clearCookie(config.auth.sessionCookie, baseCookieOptions());
}

function readSession(req: Request): SessionUser | null {
  const raw = req.cookies?.[config.auth.sessionCookie];
  if (!raw) return null;
  try {
    const payload = jwt.verify(raw, config.auth.secret) as { id: number; username: string };
    return { id: payload.id, username: payload.username };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// "Remember me" persistent token - selector:validator split, same as Delphi.
// ---------------------------------------------------------------------------
export async function createRememberToken(res: Response, userId: number): Promise<void> {
  const selector = sha256hex(crypto.randomUUID()).slice(0, 12);
  const validator = sha256hex(crypto.randomUUID());
  const tokenHash = sha256hex(validator);

  const pool = await getPool();
  await pool
    .request()
    .input('uid', sql.Int, userId)
    .input('sel', sql.VarChar(64), selector)
    .input('hash', sql.VarChar(128), tokenHash)
    .query(
      `INSERT INTO user_tokens (user_id, selector, token_hash, expiry_date)
       VALUES (@uid, @sel, @hash, DATEADD(DAY, 30, GETDATE()))`,
    );

  res.cookie(config.auth.rememberCookie, `${selector}:${validator}`, {
    ...baseCookieOptions(),
    maxAge: config.auth.rememberMaxAgeMs,
  });
}

export async function consumeRememberCookie(req: Request): Promise<SessionUser | null> {
  const raw = req.cookies?.[config.auth.rememberCookie];
  if (!raw || typeof raw !== 'string' || !raw.includes(':')) return null;

  const [selector, validator] = raw.split(':');
  if (!selector || !validator) return null;
  const tokenHash = sha256hex(validator);

  const pool = await getPool();
  const result = await pool
    .request()
    .input('sel', sql.VarChar(64), selector)
    .input('hash', sql.VarChar(128), tokenHash)
    .query(
      `SELECT TOP 1 t.user_id, u.username
       FROM user_tokens t
       JOIN users u ON t.user_id = u.id
       WHERE t.selector = @sel AND t.token_hash = @hash AND t.expiry_date > GETDATE()`,
    );

  const row = result.recordset[0];
  if (!row) return null;
  return { id: row.user_id, username: row.username };
}

export async function deleteRememberToken(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.[config.auth.rememberCookie];
  if (raw && typeof raw === 'string' && raw.includes(':')) {
    const selector = raw.split(':')[0];
    try {
      const pool = await getPool();
      await pool
        .request()
        .input('sel', sql.VarChar(64), selector)
        .query('DELETE FROM user_tokens WHERE selector = @sel');
    } catch {
      /* best-effort, matches Delphi */
    }
  }
  res.clearCookie(config.auth.rememberCookie, baseCookieOptions());
}

// ---------------------------------------------------------------------------
// Middleware: resolve req.user from session cookie, falling back to remember.
// ---------------------------------------------------------------------------
export async function attachUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = readSession(req);
  if (session) {
    req.user = session;
    return next();
  }
  try {
    const remembered = await consumeRememberCookie(req);
    if (remembered) {
      req.user = remembered;
      issueSession(res, remembered); // refresh the short-lived session
    }
  } catch (err) {
    console.error('[auth] remember-me lookup failed', err);
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }
  next();
}
