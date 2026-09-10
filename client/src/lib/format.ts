import type { KV } from '@/types';

/** Pretty-print a JSON string; return it unchanged when it isn't valid JSON. */
export function beautifyMaybeJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** Status badge modifier, matching the original workspace/history colour logic. */
export function statusClass(code: number): string {
  if (code >= 200 && code < 300) return 'status-ok';
  if (code >= 400) return 'status-err';
  if (code >= 300 && code < 400) return 'status-warn';
  return 'status-default';
}

export function sizeText(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`;
}

/** Rows with a non-empty key, trimmed — the original only ever sent those. */
export function nonEmptyPairs(pairs: KV[]): KV[] {
  return pairs
    .filter((p) => p.key.trim() !== '')
    .map((p) => ({ key: p.key.trim(), value: p.value.trim() }));
}

/**
 * Rebuild the URL query string from the Params grid (one-way params -> URL),
 * exactly like updateUrlFromParams() in the original script.
 */
export function urlFromParams(currentUrl: string, params: KV[]): string {
  const base = currentUrl.split('?')[0];
  const parts = params
    .filter((p) => p.key.trim() !== '')
    .map((p) => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value.trim())}`);
  return parts.length > 0 ? `${base}?${parts.join('&')}` : base;
}

export function isLocalUrl(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes('localhost') || u.includes('127.0.0.1');
}

export function safeParsePairs(json: string): KV[] {
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.key === 'string')
      .map((x) => ({ key: String(x.key), value: String(x.value ?? '') }));
  } catch {
    return [];
  }
}
