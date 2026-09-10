import { useState } from 'react';
import { Layers, Settings, Trash2 } from 'lucide-react';
import { ApiError, historyApi } from '@/lib/api';
import { useHistory } from '@/store/historyStore';
import { iposiAlert } from '@/store/popupStore';
import { useTabs } from '@/store/tabsStore';
import { useUi } from '@/store/uiStore';
import type { HistoryListItem } from '@/types';

function historyStatusClass(code: number): string {
  if (code >= 200 && code < 300) return 'status-ok';
  if (code >= 400) return 'status-err';
  if (code >= 300 && code < 400) return 'status-warn';
  if (code === 0) return 'status-err';
  return 'status-default';
}

export function Sidebar() {
  const { sidebar, setSidebar } = useUi();
  const { items, loaded, refresh, dropLocal } = useHistory();
  const openFromHistory = useTabs((s) => s.openFromHistory);
  const [popping, setPopping] = useState<Set<number>>(new Set());

  const openRecord = async (id: number) => {
    try {
      const { record } = await historyApi.get(id);
      openFromHistory(record);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'An error occurred.';
      iposiAlert('Load Error', msg, 'error');
    }
  };

  const del = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this history record?')) return;

    setPopping((s) => new Set(s).add(id));
    setTimeout(() => dropLocal(id), 250);
    try {
      await historyApi.remove(id);
      void refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Record could not be deleted.';
      iposiAlert('Delete Error', msg, 'error');
      void refresh();
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <h2>
          IPO<span>SI</span>
        </h2>
        <span className="gear" title="Settings">
          <Settings size={17} />
        </span>
      </div>

      <div className="sidebar-tabs">
        <button
          className={sidebar === 'history' ? 'active' : ''}
          onClick={() => setSidebar('history')}
        >
          History
        </button>
        <button
          className={sidebar === 'collections' ? 'active' : ''}
          onClick={() => setSidebar('collections')}
        >
          Collections
        </button>
      </div>

      <div className="sidebar-body">
        {sidebar === 'history' ? (
          !loaded ? (
            <div className="sidebar-empty">Loading…</div>
          ) : items.length === 0 ? (
            <div className="sidebar-empty">No history records found.</div>
          ) : (
            items.map((it: HistoryListItem) => (
              <div
                key={it.id}
                className={`history-card ${popping.has(it.id) ? 'popping' : ''}`}
                onClick={() => openRecord(it.id)}
              >
                <div className="history-card-top">
                  <div className="history-badges">
                    <span className={`method-badge method-${(it.method || 'get').toLowerCase()}`}>
                      {it.method}
                    </span>
                    <span
                      className={`status-badge ${historyStatusClass(it.status_code)}`}
                      style={{ fontSize: '0.65rem', padding: '2px 6px' }}
                    >
                      {it.status_code > 0 ? it.status_code : 'ERR'}
                    </span>
                  </div>
                  {it.tab_name && (
                    <span className="history-name" title={it.tab_name}>
                      {it.tab_name}
                    </span>
                  )}
                </div>
                <div className="history-url" title={it.url}>
                  {it.url}
                </div>
                <button className="history-del" title="Delete from History" onClick={(e) => del(e, it.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )
        ) : (
          <div className="collections-empty">
            <Layers size={30} />
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Collections
              <br />
              Coming soon.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
