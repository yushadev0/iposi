import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { getPool, sql } from '../db.js';
import type { KeyValue, SaveHistoryBody } from '../types.js';

export const historyRouter = Router();
historyRouter.use(requireAuth);

function jsonArray(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'string') return value || '[]';
  return '[]';
}

/** Shared INSERT used by both the cloud-send path and POST /api/history. */
export async function insertHistory(userId: number, r: {
  tabName: string;
  method: string;
  url: string;
  bodyType: string;
  rawType: string;
  body: string;
  params: KeyValue[] | string;
  headers: KeyValue[] | string;
  urlencoded: KeyValue[] | string;
  statusCode: number;
}): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('uid', sql.Int, userId)
    .input('tname', sql.NVarChar, r.tabName ?? '')
    .input('method', sql.NVarChar, r.method ?? '')
    .input('url', sql.NVarChar, r.url ?? '')
    .input('btype', sql.NVarChar, r.bodyType ?? '')
    .input('rtype', sql.NVarChar, r.rawType ?? '')
    .input('body', sql.NVarChar(sql.MAX), r.body ?? '')
    .input('params', sql.NVarChar(sql.MAX), jsonArray(r.params))
    .input('headers', sql.NVarChar(sql.MAX), jsonArray(r.headers))
    .input('urlenc', sql.NVarChar(sql.MAX), jsonArray(r.urlencoded))
    .input('scode', sql.Int, r.statusCode ?? 0)
    .query(
      `INSERT INTO api_history
         (user_id, tab_name, method, url, body_type, raw_type,
          req_body, req_params, req_headers, req_urlencoded, status_code)
       VALUES
         (@uid, @tname, @method, @url, @btype, @rtype,
          @body, @params, @headers, @urlenc, @scode)`,
    );
}

/** GET /api/history - list for the sidebar (mirrors LoadHistoryList). */
historyRouter.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('uid', sql.Int, req.user!.id)
      .query(
        `SELECT id, method, status_code, tab_name, url
         FROM api_history
         WHERE user_id = @uid
         ORDER BY created_at DESC`,
      );
    res.json({ items: result.recordset });
  } catch (err) {
    console.error('[history] list failed', err);
    res.status(500).json({ error: 'History could not be loaded.' });
  }
});

/** GET /api/history/:id - full record to re-open as a tab (mirrors LoadHistory). */
historyRouter.get('/:id', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid id.' });
    return;
  }
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('uid', sql.Int, req.user!.id)
      .query('SELECT * FROM api_history WHERE id = @id AND user_id = @uid');

    const row = result.recordset[0];
    if (!row) {
      res.status(404).json({ error: 'Record not found.' });
      return;
    }
    res.json({
      record: {
        tab_name: row.tab_name ?? '',
        method: row.method ?? 'GET',
        url: row.url ?? '',
        body_type: row.body_type ?? 'none',
        raw_type: row.raw_type ?? 'application/json',
        req_body: row.req_body ?? '',
        req_params: row.req_params ?? '[]',
        req_headers: row.req_headers ?? '[]',
        req_urlencoded: row.req_urlencoded ?? '[]',
      },
    });
  } catch (err) {
    console.error('[history] get failed', err);
    res.status(500).json({ error: 'Record could not be retrieved from the database.' });
  }
});

/** DELETE /api/history/:id - mirrors DeleteHistory. */
historyRouter.delete('/:id', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Could not get the ID of the record to be deleted.' });
    return;
  }
  try {
    const pool = await getPool();
    await pool
      .request()
      .input('id', sql.Int, id)
      .input('uid', sql.Int, req.user!.id)
      .query('DELETE FROM api_history WHERE id = @id AND user_id = @uid');
    res.json({ ok: true });
  } catch (err) {
    console.error('[history] delete failed', err);
    res.status(500).json({ error: 'Record could not be deleted from the database.' });
  }
});

/** POST /api/history - save a record after a Local Agent request (mirrors SaveAgentHistory). */
historyRouter.post('/', async (req, res) => {
  const b = req.body as SaveHistoryBody;
  try {
    await insertHistory(req.user!.id, {
      tabName: b.tabName ?? '',
      method: b.method,
      url: b.url,
      bodyType: b.bodyType,
      rawType: b.rawType,
      body: b.body,
      params: b.params,
      headers: b.headers,
      urlencoded: b.urlencoded,
      statusCode: Number(b.statusCode) || 0,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[history] save failed', err);
    res.status(500).json({ error: 'History record could not be saved.' });
  }
});
