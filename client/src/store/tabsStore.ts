import { create } from 'zustand';
import { safeParsePairs } from '@/lib/format';
import type { HistoryRecord, HttpMethod, RequestTab } from '@/types';

let counter = 0;
const nextId = () => `tab_${++counter}`;

export function makeTab(overrides: Partial<RequestTab> = {}): RequestTab {
  return {
    id: nextId(),
    customName: '',
    method: 'GET',
    url: '',
    bodyType: 'raw',
    rawType: 'application/json',
    reqBody: '{\n  "key": "value"\n}',
    reqParams: [],
    reqHeaders: [],
    reqUrlencoded: [],
    resBody: '',
    resStatus: '000 WAITING',
    resStatusClass: 'status-default',
    resTime: '0 ms',
    resSize: '0 B',
    resHeaders: [],
    sending: false,
    ...overrides,
  };
}

interface TabsState {
  tabs: RequestTab[];
  activeId: string;
  addTab: () => void;
  closeTab: (id: string) => 'closed' | 'last';
  setActive: (id: string) => void;
  rename: (id: string, name: string) => void;
  reorder: (fromId: string, toId: string) => void;
  patch: (id: string, partial: Partial<RequestTab>) => void;
  patchActive: (partial: Partial<RequestTab>) => void;
  openFromHistory: (rec: HistoryRecord) => void;
}

const first = makeTab();

export const useTabs = create<TabsState>((set, get) => ({
  tabs: [first],
  activeId: first.id,

  addTab: () => {
    const tab = makeTab();
    set((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id }));
  },

  closeTab: (id) => {
    const { tabs } = get();
    if (tabs.length === 1) return 'last';
    const idx = tabs.findIndex((t) => t.id === id);
    const remaining = tabs.filter((t) => t.id !== id);
    set((s) => ({
      tabs: remaining,
      activeId:
        s.activeId === id
          ? remaining[Math.min(idx, remaining.length - 1)].id
          : s.activeId,
    }));
    return 'closed';
  },

  setActive: (id) => set({ activeId: id }),

  rename: (id, name) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, customName: name.trim() } : t)),
    })),

  reorder: (fromId, toId) =>
    set((s) => {
      if (fromId === toId) return s;
      const from = s.tabs.findIndex((t) => t.id === fromId);
      const to = s.tabs.findIndex((t) => t.id === toId);
      if (from < 0 || to < 0) return s;
      const next = s.tabs.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { tabs: next };
    }),

  patch: (id, partial) =>
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...partial } : t)) })),

  patchActive: (partial) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === s.activeId ? { ...t, ...partial } : t)),
    })),

  /** Re-open a stored request in a brand-new tab; response is reset (loadHistoryIntoTab). */
  openFromHistory: (rec) => {
    const tab = makeTab({
      customName: rec.tab_name || '',
      method: (rec.method || 'GET') as HttpMethod,
      url: rec.url || '',
      bodyType: (rec.body_type || 'none') as RequestTab['bodyType'],
      rawType: rec.raw_type || 'application/json',
      reqBody: rec.req_body || '',
      reqParams: safeParsePairs(rec.req_params),
      reqHeaders: safeParsePairs(rec.req_headers),
      reqUrlencoded: safeParsePairs(rec.req_urlencoded),
    });
    set((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id }));
  },
}));
