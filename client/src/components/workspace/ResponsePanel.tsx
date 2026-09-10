import { useState } from 'react';
import type { RequestTab } from '@/types';
import { CodeEditor } from './CodeEditor';

export function ResponsePanel({ tab }: { tab: RequestTab }) {
  const [sub, setSub] = useState<'body' | 'headers'>('body');

  return (
    <div className="pane res">
      <div className="res-meta">
        <div className="mi">
          <span>Status:</span>
          <div className={`status-badge ${tab.resStatusClass}`}>{tab.resStatus}</div>
        </div>
        <div className="mi">
          <span>Time:</span>
          <span className="mv" style={{ color: '#4facfe' }}>
            {tab.resTime}
          </span>
        </div>
        <div className="mi">
          <span>Size:</span>
          <span className="mv" style={{ color: '#818384' }}>
            {tab.resSize}
          </span>
        </div>
      </div>

      <div className="panel-tabs">
        <button className={`ptab ${sub === 'body' ? 'active' : ''}`} onClick={() => setSub('body')}>
          Body
        </button>
        <button
          className={`ptab ${sub === 'headers' ? 'active' : ''}`}
          onClick={() => setSub('headers')}
        >
          Headers
          {tab.resHeaders.length > 0 && (
            <span style={{ color: '#818384' }}> ({tab.resHeaders.length})</span>
          )}
        </button>
      </div>

      <div className={`panel-body ${sub === 'headers' ? 'scroll' : ''}`}>
        {sub === 'body' && (
          <CodeEditor value={tab.resBody} mode="application/json" readOnly />
        )}
        {sub === 'headers' &&
          (tab.resHeaders.length === 0 ? (
            <p style={{ color: '#818384', fontSize: '0.9rem', padding: '15px' }}>
              Response Headers will be listed here.
            </p>
          ) : (
            <div className="kv" style={{ height: 'auto' }}>
              <div className="kv-head">
                <span className="c1">Header</span>
                <span className="c2">Value</span>
                <span className="c3" />
              </div>
              <div className="kv-list">
                {tab.resHeaders.map((h, i) => (
                  <div className="kv-row" key={i}>
                    <input className="kv-input" readOnly value={h.key} />
                    <input className="kv-input" readOnly value={h.value} />
                    <span style={{ width: 34 }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
