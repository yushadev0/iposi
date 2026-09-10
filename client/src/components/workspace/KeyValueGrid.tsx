import { Trash2 } from 'lucide-react';
import type { KV } from '@/types';

/**
 * Key/Value editor used by Params, Headers and x-www-form-urlencoded.
 * Mirrors the addKvRow / getKvData / checkEmptyState behaviour of the original.
 */
export function KeyValueGrid({
  rows,
  onChange,
  addLabel,
  emptyText,
}: {
  rows: KV[];
  onChange: (rows: KV[]) => void;
  addLabel: string;
  emptyText: string;
}) {
  const update = (i: number, patch: Partial<KV>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, { key: '', value: '' }]);

  return (
    <div className="kv">
      <div className="kv-head">
        <span className="c1">Key</span>
        <span className="c2">Value</span>
        <span className="c3" />
      </div>
      <div className="kv-list">
        {rows.length === 0 && <div className="kv-empty">{emptyText}</div>}
        {rows.map((row, i) => (
          <div className="kv-row" key={i}>
            <input
              className="kv-input"
              placeholder="Key"
              value={row.key}
              onChange={(e) => update(i, { key: e.target.value })}
            />
            <input
              className="kv-input"
              placeholder="Value"
              value={row.value}
              onChange={(e) => update(i, { value: e.target.value })}
            />
            <button className="kv-del" title="Delete" onClick={() => remove(i)}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <button className="kv-add" onClick={add}>
        {addLabel}
      </button>
    </div>
  );
}
