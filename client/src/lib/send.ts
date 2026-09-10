import { historyApi, requestApi } from '@/lib/api';
import { beautifyMaybeJson, isLocalUrl, nonEmptyPairs, statusClass } from '@/lib/format';
import { useHistory } from '@/store/historyStore';
import { iposiAlert } from '@/store/popupStore';
import { useTabs } from '@/store/tabsStore';
import { useUi } from '@/store/uiStore';
import type { KV, RequestTab } from '@/types';

const LOCAL_AGENT = 'http://127.0.0.1:19090/?target=';

function applyResponse(
  id: string,
  statusCode: number,
  statusText: string,
  timeStr: string,
  sizeStr: string,
  body: string,
  headers: KV[],
): void {
  useTabs.getState().patch(id, {
    sending: false,
    resStatus: `${statusCode} ${statusText}`,
    resStatusClass: statusClass(statusCode),
    resTime: timeStr,
    resSize: sizeStr,
    resBody: beautifyMaybeJson(body),
    resHeaders: headers,
  });
}

/**
 * Fire the active request. Mirrors sendAPIRequest() in the original script:
 *  - localhost / 127.0.0.1  -> browser fetch through the local IposiAgent (:19090)
 *  - everything else        -> server-side proxy (POST /api/request)
 */
export async function sendRequest(tab: RequestTab): Promise<void> {
  if (!tab.url.trim()) {
    iposiAlert('Warning', 'Please enter an URL.', 'warning');
    return;
  }

  const { patch } = useTabs.getState();
  const saveHistory = useUi.getState().saveHistory;
  const refreshHistory = useHistory.getState().refresh;

  patch(tab.id, {
    sending: true,
    resStatus: 'SENDING...',
    resStatusClass: 'status-warn',
    resTime: '...',
    resSize: '...',
    resBody: '// İstek gönderiliyor...\n// Lütfen bekleyiniz.',
    resHeaders: [],
  });

  const headers = nonEmptyPairs(tab.reqHeaders);
  const urlencoded = nonEmptyPairs(tab.reqUrlencoded);
  const params = nonEmptyPairs(tab.reqParams);
  const tabName = tab.customName || '';

  if (isLocalUrl(tab.url)) {
    // ---- Local Agent path (browser-side fetch, CORS-open agent) ----
    const fetchHeaders: Record<string, string> = {};
    for (const h of headers) fetchHeaders[h.key] = h.value;

    let fetchBody: string | undefined;
    if (tab.method !== 'GET') {
      if (tab.bodyType === 'raw') {
        fetchBody = tab.reqBody;
        fetchHeaders['Content-Type'] = tab.rawType;
      } else if (tab.bodyType === 'urlencoded') {
        const form = new URLSearchParams();
        for (const p of urlencoded) form.append(p.key, p.value);
        fetchBody = form.toString();
        fetchHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }

    const t0 = performance.now();
    try {
      const resp = await fetch(LOCAL_AGENT + encodeURIComponent(tab.url), {
        method: tab.method,
        headers: fetchHeaders,
        body: fetchBody,
      });
      const timeStr = `${Math.round(performance.now() - t0)} ms`;
      const text = await resp.text();
      const bytes = new Blob([text]).size;
      const sizeStr = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`;
      const respHeaders: KV[] = [];
      resp.headers.forEach((value, key) => respHeaders.push({ key, value }));

      applyResponse(tab.id, resp.status, resp.statusText, timeStr, sizeStr, text, respHeaders);

      if (saveHistory) {
        try {
          await historyApi.save({
            method: tab.method,
            url: tab.url,
            tabName,
            bodyType: tab.bodyType,
            rawType: tab.rawType,
            body: tab.reqBody,
            params,
            headers,
            urlencoded,
            statusCode: resp.status,
          });
          await refreshHistory();
        } catch {
          /* history failure must not hide the response */
        }
      }
    } catch (err) {
      applyResponse(
        tab.id,
        0,
        'AGENT ERROR',
        '0 ms',
        '0 B',
        `// Local Agent Connection Failed.\n// Please ensure IposiAgent is running in the background.\n\n${String(err)}`,
        [],
      );
    }
    return;
  }

  // ---- Cloud path (server-side proxy) ----
  try {
    const r = await requestApi.send({
      method: tab.method,
      url: tab.url,
      tabName,
      saveHistory,
      bodyType: tab.bodyType,
      rawType: tab.rawType,
      body: tab.reqBody,
      params,
      headers,
      urlencoded,
    });
    applyResponse(tab.id, r.statusCode, r.statusText, `${r.timeMs} ms`, r.sizeText, r.body, r.headers);
    if (saveHistory) await refreshHistory();
  } catch (err) {
    applyResponse(
      tab.id,
      0,
      'ERROR',
      '0 ms',
      '0 B',
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2),
      [],
    );
  }
}
