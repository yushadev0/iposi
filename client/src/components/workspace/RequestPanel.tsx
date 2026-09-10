import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { urlFromParams } from '@/lib/format';
import { RAW_TYPES, templateForRawType } from '@/lib/rawTemplates';
import { iposiAlert } from '@/store/popupStore';
import { useTabs } from '@/store/tabsStore';
import { useUi } from '@/store/uiStore';
import type { BodyType, RequestTab } from '@/types';
import { CodeEditor } from './CodeEditor';
import { KeyValueGrid } from './KeyValueGrid';

type SubTab = 'params' | 'headers' | 'body';

export function RequestPanel({ tab }: { tab: RequestTab }) {
  const patchActive = useTabs((s) => s.patchActive);
  const { saveHistory, setSaveHistory } = useUi();
  const [sub, setSub] = useState<SubTab>('params');

  const setParams = (rows: RequestTab['reqParams']) =>
    patchActive({ reqParams: rows, url: urlFromParams(tab.url, rows) });

  const beautify = () => {
    if (tab.rawType !== 'application/json') {
      iposiAlert(
        'Information',
        'The auto-format (Beautify) feature is currently only supported for JSON format.',
        'warning',
      );
      return;
    }
    if (tab.reqBody.trim() === '') return;
    try {
      patchActive({ reqBody: JSON.stringify(JSON.parse(tab.reqBody), null, 2) });
    } catch {
      iposiAlert(
        'Format Error',
        'The text you entered is not a valid JSON. Please check for syntax errors (missing commas, quotes, etc.).',
        'error',
      );
    }
  };

  const changeBodyType = (t: BodyType) => patchActive({ bodyType: t });
  const changeRawType = (v: string) => {
    const tpl = templateForRawType(v, tab.reqBody);
    patchActive({ rawType: v, ...(tpl !== null ? { reqBody: tpl } : {}) });
  };

  return (
    <div className="pane req">
      <div className="panel-tabs">
        <button
          className={`ptab ${sub === 'params' ? 'active' : ''}`}
          onClick={() => setSub('params')}
        >
          Params
        </button>
        <button
          className={`ptab ${sub === 'headers' ? 'active' : ''}`}
          onClick={() => setSub('headers')}
        >
          Headers
        </button>
        <button className={`ptab ${sub === 'body' ? 'active' : ''}`} onClick={() => setSub('body')}>
          Body
        </button>
        <span className="grow" />
        <label className="save-toggle switch blue" title="İsteği geçmişe (History) kaydet">
          <span>Save To History</span>
          <input
            type="checkbox"
            checked={saveHistory}
            onChange={(e) => setSaveHistory(e.target.checked)}
          />
          <span className="track" />
        </label>
      </div>

      <div className={`panel-body ${sub === 'body' && tab.bodyType === 'raw' ? '' : 'scroll'}`}>
        {sub === 'params' && (
          <KeyValueGrid
            rows={tab.reqParams}
            onChange={setParams}
            addLabel="+ Add Parameter"
            emptyText="No query parameters yet. Click '+ Add Parameter' to set them."
          />
        )}

        {sub === 'headers' && (
          <KeyValueGrid
            rows={tab.reqHeaders}
            onChange={(rows) => patchActive({ reqHeaders: rows })}
            addLabel="+ Add Header"
            emptyText="No headers yet. Click '+ Add Header' to set them."
          />
        )}

        {sub === 'body' && (
          <>
            <div className="body-type">
              <button className="btn-beautify" onClick={beautify} title="Beautify">
                <Wand2 size={13} /> Beautify
              </button>
              <label>
                <input
                  type="radio"
                  name="bodyType"
                  checked={tab.bodyType === 'none'}
                  onChange={() => changeBodyType('none')}
                />{' '}
                None
              </label>
              <label>
                <input
                  type="radio"
                  name="bodyType"
                  checked={tab.bodyType === 'urlencoded'}
                  onChange={() => changeBodyType('urlencoded')}
                />{' '}
                x-www-form-urlencoded
              </label>
              <label>
                <input
                  type="radio"
                  name="bodyType"
                  checked={tab.bodyType === 'raw'}
                  onChange={() => changeBodyType('raw')}
                />{' '}
                Raw
              </label>
              {tab.bodyType === 'raw' && (
                <select
                  className="raw-type"
                  value={tab.rawType}
                  onChange={(e) => changeRawType(e.target.value)}
                >
                  {RAW_TYPES.map((rt) => (
                    <option key={rt.value} value={rt.value}>
                      {rt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {tab.bodyType === 'none' && (
              <div className="kv-empty" style={{ display: 'block' }}>
                This request does not have a body.
              </div>
            )}

            {tab.bodyType === 'urlencoded' && (
              <KeyValueGrid
                rows={tab.reqUrlencoded}
                onChange={(rows) => patchActive({ reqUrlencoded: rows })}
                addLabel="+ Add Parameter"
                emptyText="No urlencoded parameters yet. Click '+ Add Parameter' to set them."
              />
            )}

            {tab.bodyType === 'raw' && (
              <CodeEditor
                value={tab.reqBody}
                mode={tab.rawType}
                onChange={(v) => patchActive({ reqBody: v })}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
