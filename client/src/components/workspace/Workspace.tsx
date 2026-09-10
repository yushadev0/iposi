import { useEffect, useRef, useState } from 'react';
import { useHistory } from '@/store/historyStore';
import { useTabs } from '@/store/tabsStore';
import { RequestBar } from './RequestBar';
import { RequestPanel } from './RequestPanel';
import { RequestTabsBar } from './RequestTabsBar';
import { ResponsePanel } from './ResponsePanel';
import { Sidebar } from './Sidebar';

export function Workspace() {
  const tabs = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  const refreshHistory = useHistory((s) => s.refresh);
  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  // resizable split between the request and response panes
  const bodyRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef<HTMLDivElement>(null);
  const [reqHeight, setReqHeight] = useState<number | null>(null);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = reqRef.current?.getBoundingClientRect().height ?? 0;
    const total = bodyRef.current?.clientHeight ?? 0;
    document.body.style.userSelect = 'none';

    const move = (ev: MouseEvent) => {
      const next = startH + (ev.clientY - startY);
      if (next > 100 && next < total - 100) setReqHeight(next);
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  return (
    <div className="workspace">
      <Sidebar />
      <div className="main">
        <RequestTabsBar />
        <RequestBar tab={active} />
        <div className="body-split" ref={bodyRef}>
          {/* key={active.id} remounts the panels so no stale editor/scroll carries over */}
          <div
            ref={reqRef}
            className="pane-slot"
            style={reqHeight ? { flex: 'none', height: reqHeight } : undefined}
          >
            <RequestPanel key={active.id} tab={active} />
          </div>
          <div className="resizer" onMouseDown={startDrag} title="Resize" />
          <div className="pane-slot res">
            <ResponsePanel key={active.id} tab={active} />
          </div>
        </div>
      </div>
    </div>
  );
}
