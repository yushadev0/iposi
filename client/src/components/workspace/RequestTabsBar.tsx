import { useState } from 'react';
import { LogOut, Plus, UserCircle2, X } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuth } from '@/store/authStore';
import { iposiAlert } from '@/store/popupStore';
import { useTabs } from '@/store/tabsStore';
import type { RequestTab } from '@/types';

function tabTitle(t: RequestTab): string {
  return t.customName || t.url || 'Untitled Request';
}

export function RequestTabsBar() {
  const { tabs, activeId, addTab, closeTab, setActive, rename, reorder } = useTabs();
  const user = useAuth((s) => s.user);
  const clearAuth = useAuth((s) => s.clear);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const onClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (closeTab(id) === 'last') {
      iposiAlert('Warning', 'You cannot close the last tab.', 'warning');
    }
  };

  const startRename = (t: RequestTab) => {
    setEditing(t.id);
    setDraft(tabTitle(t));
  };
  const commitRename = () => {
    if (editing) rename(editing, draft);
    setEditing(null);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* clear locally regardless */
    }
    clearAuth();
  };

  return (
    <div className="tabbar">
      <div className="tabbar-scroll">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`req-tab ${t.id === activeId ? 'active' : ''} ${
              overId === t.id && dragId !== t.id ? 'drag-over' : ''
            } ${dragId === t.id ? 'dragging' : ''}`}
            draggable
            onDragStart={() => setDragId(t.id)}
            onDragOver={(e) => {
              e.preventDefault();
              setOverId(t.id);
            }}
            onDragLeave={() => setOverId((o) => (o === t.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId && dragId !== t.id) reorder(dragId, t.id);
              setDragId(null);
              setOverId(null);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onClick={() => setActive(t.id)}
            onDoubleClick={() => startRename(t)}
            title="Double-click to rename"
          >
            <span className={`m method-${t.method.toLowerCase()}`}>{t.method}</span>
            {editing === t.id ? (
              <input
                className="rename"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setEditing(null);
                }}
                onBlur={commitRename}
              />
            ) : (
              <span className="t">{tabTitle(t)}</span>
            )}
            <span className="x" onClick={(e) => onClose(e, t.id)}>
              <X size={13} strokeWidth={3} />
            </span>
          </div>
        ))}
      </div>

      <button className="tab-add" title="New Request" onClick={addTab}>
        <Plus size={16} />
      </button>

      <div className="user-box">
        <span className="avatar">
          <UserCircle2 size={20} />
        </span>
        <span className="name">{user?.username ?? '...'}</span>
        <button className="logout" title="Log Out" onClick={logout}>
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
