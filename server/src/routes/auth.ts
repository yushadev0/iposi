import { Router } from 'express';
import {
  clearSession,
  createRememberToken,
  deleteRememberToken,
  issueSession,
  requireAuth,
  sha256hex,
} from '../auth.js';
import { getPool, sql } from '../db.js';

export const authRouter = Router();

/** GET /api/auth/me - current user (session or remember cookie via attachUser). */
authRouter.get('/me', (req, res) => {
  if (!req.user) {
    res.json({ user: null });
    return;
  }
  res.json({ user: { id: req.user.id, username: req.user.username } });
});

/** POST /api/auth/register  { user, email, pass }  - mirrors AuthRegister. */
authRouter.post('/register', async (req, res) => {
  const username = String(req.body?.user ?? '').trim();
  const email = String(req.body?.email ?? '').trim();
  const pass = String(req.body?.pass ?? '');

  if (!username || !pass) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  try {
    const pool = await getPool();
    const existing = await pool
      .request()
      .input('usr', sql.NVarChar, username)
      .query('SELECT id FROM users WHERE username = @usr');

    if (existing.recordset.length > 0) {
      res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
      return;
    }

    await pool
      .request()
      .input('usr', sql.NVarChar, username)
      .input('eml', sql.NVarChar, email)
      .input('pwd', sql.NVarChar, sha256hex(pass))
      .query('INSERT INTO users (username, email, passwordHash) VALUES (@usr, @eml, @pwd)');

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] register failed', err);
    res.status(500).json({ error: 'Kayıt sırasında bir hata oluştu.' });
  }
});

/** POST /api/auth/login  { user, pass, remember }  - mirrors AuthLogin. */
authRouter.post('/login', async (req, res) => {
  const username = String(req.body?.user ?? '').trim();
  const pass = String(req.body?.pass ?? '');
  const remember = req.body?.remember === true || req.body?.remember === '1';

  if (!username || !pass) {
    res.status(400).json({ error: 'You must enter a username and password to proceed login.' });
    return;
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('usr', sql.NVarChar, username)
      .input('pwd', sql.NVarChar, sha256hex(pass))
      .query('SELECT id, username FROM users WHERE username = @usr AND passwordHash = @pwd');

    const row = result.recordset[0];
    if (!row) {
      res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
      return;
    }

    const user = { id: row.id as number, username: row.username as string };
    issueSession(res, user);
    if (remember) {
      await createRememberToken(res, user.id);
    }

    res.json({ user });
  } catch (err) {
    console.error('[auth] login failed', err);
    res.status(500).json({ error: 'Giriş sırasında bir hata oluştu.' });
  }
});

/** POST /api/auth/logout - mirrors AuthLogout. */
authRouter.post('/logout', requireAuth, async (req, res) => {
  await deleteRememberToken(req, res);
  clearSession(res);
  res.json({ ok: true });
});
