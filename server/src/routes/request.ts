import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { config } from '../config.js';
import type { KeyValue, ProxyRequestBody, ProxyResponse } from '../types.js';
import { insertHistory } from './history.js';

export const requestRouter = Router();
requestRouter.use(requireAuth);

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function sizeText(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`;
}

function cleanPairs(pairs: KeyValue[] | undefined): KeyValue[] {
  if (!Array.isArray(pairs)) return [];
  return pairs.filter((p) => p && typeof p.key === 'string' && p.key.trim() !== '');
}

/**
 * POST /api/request - execute an outbound HTTP request on the user's behalf.
 * This is the "cloud" send path (non-localhost URLs); it replaces the
 * TNetHTTPClient logic in Main.pas -> MainHTMLAjaxEvent('ExecuteAPI').
 */
requestRouter.post('/', async (req, res) => {
  const b = req.body as ProxyRequestBody;
  const method = String(b.method ?? 'GET').toUpperCase();
  const url = String(b.url ?? '').trim();

  if (!METHODS.has(method)) {
    res.status(400).json({ error: `Unsupported method: ${method}` });
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('bad protocol');
  } catch {
    res.status(400).json({ error: 'Please enter a valid http(s) URL.' });
    return;
  }

  // --- headers ---
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  headers.set('User-Agent', 'Iposi/1.0 (+https://yusa.app/iposi)');

  // --- body ---
  let bodyInit: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    if (b.bodyType === 'raw') {
      const raw = String(b.body ?? '');
      if (raw.length > 0) {
        bodyInit = raw;
        headers.set('Content-Type', b.rawType || 'application/json');
      }
    } else if (b.bodyType === 'urlencoded') {
      const form = new URLSearchParams();
      for (const p of cleanPairs(b.urlencoded)) form.append(p.key.trim(), p.value ?? '');
      bodyInit = form.toString();
      headers.set('Content-Type', 'application/x-www-form-urlencoded');
    }
  }

  // custom headers win over the defaults above
  for (const h of cleanPairs(b.headers)) headers.set(h.key.trim(), h.value ?? '');

  // --- fire ---
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.proxy.timeoutMs);
  const started = Date.now();

  let out: ProxyResponse;
  try {
    const upstream = await fetch(parsed.toString(), {
      method,
      headers,
      body: bodyInit,
      redirect: 'follow',
      signal: controller.signal,
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    const capped = buf.byteLength > config.proxy.maxBytes ? buf.subarray(0, config.proxy.maxBytes) : buf;
    const text = capped.toString('utf8');

    const respHeaders: KeyValue[] = [];
    upstream.headers.forEach((value, key) => respHeaders.push({ key, value }));

    out = {
      statusCode: upstream.status,
      statusText: upstream.statusText || '',
      timeMs: Date.now() - started,
      sizeBytes: buf.byteLength,
      sizeText: sizeText(buf.byteLength),
      body: text,
      headers: respHeaders,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const aborted = err instanceof Error && err.name === 'AbortError';
    out = {
      statusCode: 0,
      statusText: aborted ? 'TIMEOUT' : 'ERROR',
      timeMs: Date.now() - started,
      sizeBytes: 0,
      sizeText: '0 B',
      body: JSON.stringify({ error: aborted ? 'Request timed out.' : message }),
      headers: [],
    };
  } finally {
    clearTimeout(timer);
  }

  // --- history (best-effort, never blocks the response) ---
  if (b.saveHistory) {
    try {
      await insertHistory(req.user!.id, {
        tabName: b.tabName ?? '',
        method,
        url,
        bodyType: b.bodyType,
        rawType: b.rawType,
        body: String(b.body ?? ''),
        params: b.params ?? [],
        headers: b.headers ?? [],
        urlencoded: b.urlencoded ?? [],
        statusCode: out.statusCode,
      });
    } catch (err) {
      console.error('[request] history insert failed', err);
    }
  }

  res.json(out);
});
