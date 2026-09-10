import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Send } from 'lucide-react';
import { sendRequest } from '@/lib/send';
import { useTabs } from '@/store/tabsStore';
import type { HttpMethod, RequestTab } from '@/types';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function RequestBar({ tab }: { tab: RequestTab }) {
  const patchActive = useTabs((s) => s.patchActive);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  const selectMethod = (m: HttpMethod) => {
    patchActive({ method: m });
    setOpen(false);
  };

  return (
    <div className="reqbar">
      <div className={`method-select ${open ? 'open' : ''}`} ref={boxRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          <span className={`method-${tab.method.toLowerCase()}`}>{tab.method}</span>
          <ChevronDown className="chev" size={14} />
        </button>
        {open && (
          <div className="method-list">
            {METHODS.map((m) => (
              <button
                key={m}
                className={`method-${m.toLowerCase()}`}
                onClick={() => selectMethod(m)}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        className="req-url"
        placeholder="Enter request URL (e.g., https://api.example.com/v1/users)"
        value={tab.url}
        onChange={(e) => patchActive({ url: e.target.value })}
      />

      <button
        className="btn-send"
        disabled={tab.sending}
        onClick={() => {
          // commit any pending param->URL sync, then fire with fresh state
          const fresh = useTabs.getState().tabs.find((t) => t.id === tab.id)!;
          void sendRequest(fresh);
        }}
      >
        <Send size={15} /> {tab.sending ? 'Sending' : 'Send'}
      </button>
    </div>
  );
}
