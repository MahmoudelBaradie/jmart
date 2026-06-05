'use client';
/**
 * Daily Pricing Board — replaces the old per-product modal UX.
 *
 * Spreadsheet-style. Loads every priced product in one row each:
 *   [☐] name+sku  | yesterday | today (editable) | Δ | 7-day sparkline | listings | range
 *
 * Edits are STAGED locally until the user clicks "Save N changes" — that lets
 * them queue several edits and see the running summary (e.g. "3 farmers will
 * be affected") before committing. Saves go through the same setCentralPrice
 * path used by the old modal, so out-of-range actions and price history still
 * apply.
 *
 * Why no auto-save:
 *   - The admin is making 5-15 small numeric edits in a row. Auto-saving
 *     every keystroke would spawn dozens of out-of-range cascades. Batching
 *     lets the admin verify and undo before farmers feel the change.
 *   - The "Save" button is sticky-bottom with the count, so commit feels
 *     deliberate not punitive.
 *
 * Keyboard:
 *   - ↑ / ↓     between rows (preserves focus on the price input)
 *   - Esc       revert this row's edit
 *   - Tab       moves to the next focusable cell as usual
 */
import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pricingApi, categoriesApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/shared/EmptyState';
import { DollarSign, Search, Copy, TrendingUp, TrendingDown, Minus, X, History, Check } from 'lucide-react';

interface BoardRow {
  id: string;
  sku: string;
  name: string;
  nameAr?: string;
  unitOfMeasure: string;
  category: { id: string; name: string; nameAr?: string };
  currentPrice: number | null;
  yesterdayPrice: number | null;
  sparkline: { day: string; price: number | null }[];
  floor: number | null;
  ceiling: number | null;
  flexibilityPct: number;
  mode: 'STRICT' | 'HYBRID' | 'REFERENCE';
  activeListings: number;
  priceUpdatedAt: string | null;
}

const fmt = (n: number | null | undefined, dash = '—') =>
  n === null || n === undefined ? dash : n.toFixed(2);

export default function PricingBoardPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastResult, setLastResult] = useState<{ succeeded: number; failed: number; summary: { suspended: number; snapped: number; warned: number } } | null>(null);
  const [historyFor, setHistoryFor] = useState<BoardRow | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pricing-board', categoryId],
    queryFn: () => pricingApi.board(categoryId || undefined).then((r: any) => r.data?.data ?? r.data),
  });

  const { data: cats } = useQuery({
    queryKey: ['categories-flat'],
    queryFn: () => categoriesApi.flat().then((r: any) => r.data?.data ?? r.data),
  });

  const rows: BoardRow[] = useMemo(() => {
    if (!Array.isArray(data)) return [];
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter((r: BoardRow) =>
      r.sku.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      (r.nameAr ?? '').includes(search.trim()),
    );
  }, [data, search]);

  // Group rows by category for visual breaks
  const grouped = useMemo(() => {
    const m = new Map<string, BoardRow[]>();
    for (const r of rows) {
      const key = r.category.nameAr || r.category.name;
      const arr = m.get(key) ?? [];
      arr.push(r);
      m.set(key, arr);
    }
    return Array.from(m.entries());
  }, [rows]);

  const stagedCount = Object.keys(edits).length;
  const affected = useMemo(() => {
    let total = 0;
    for (const [pid] of Object.entries(edits)) {
      const row = (data as BoardRow[] | undefined)?.find((r) => r.id === pid);
      if (row) total += row.activeListings;
    }
    return total;
  }, [edits, data]);

  const save = useMutation({
    mutationFn: () => {
      const changes = Object.entries(edits)
        .map(([productId, v]) => ({ productId, newPrice: parseFloat(v) }))
        .filter((c) => !isNaN(c.newPrice) && c.newPrice > 0);
      return pricingApi.bulkUpdate(changes).then((r: any) => r.data?.data ?? r.data);
    },
    onSuccess: (res: any) => {
      const summary = { suspended: 0, snapped: 0, warned: 0 };
      for (const r of res.results ?? []) {
        if (r.summary) {
          summary.suspended += r.summary.suspended;
          summary.snapped += r.summary.snapped;
          summary.warned += r.summary.warned;
        }
      }
      setLastResult({ succeeded: res.succeeded, failed: res.failed, summary });
      setEdits({});
      setSelected(new Set());
      refetch();
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const setEdit = (id: string, raw: string) => {
    setEdits((e) => {
      const next = { ...e };
      if (raw === '' || raw === undefined) delete next[id];
      else next[id] = raw;
      return next;
    });
  };
  const revertEdit = (id: string) => {
    setEdits((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });
  };

  const copyFromYesterday = () => {
    if (!data) return;
    const next: Record<string, string> = { ...edits };
    for (const r of data as BoardRow[]) {
      if (r.yesterdayPrice !== null && r.yesterdayPrice !== r.currentPrice) {
        next[r.id] = String(r.yesterdayPrice);
      }
    }
    setEdits(next);
  };

  const applyToSelected = (op: 'pct' | 'add', value: number) => {
    if (!data) return;
    const next: Record<string, string> = { ...edits };
    for (const r of data as BoardRow[]) {
      if (!selected.has(r.id)) continue;
      const base = edits[r.id] ? parseFloat(edits[r.id]) : r.currentPrice;
      if (base === null || base === undefined || isNaN(base as number)) continue;
      const v = op === 'pct' ? (base as number) * (1 + value / 100) : (base as number) + value;
      next[r.id] = (Math.round(v * 100) / 100).toString();
    }
    setEdits(next);
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-600" />
            تحديث أسعار اليوم
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}{rows.length} منتج
          </p>
        </div>
      </div>

      {lastResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
          <Check size={16} className="text-green-700 mt-0.5 shrink-0" />
          <div className="text-sm flex-1">
            <div className="font-bold text-green-900">تم حفظ {lastResult.succeeded} تغيير{lastResult.failed > 0 && ` · فشل ${lastResult.failed}`}</div>
            {(lastResult.summary.suspended + lastResult.summary.snapped + lastResult.summary.warned) > 0 && (
              <div className="text-xs text-green-800 mt-0.5">
                تأثير على عروض المزارعين:
                {lastResult.summary.suspended > 0 && ` · تعطيل ${lastResult.summary.suspended}`}
                {lastResult.summary.snapped > 0 && ` · تعديل تلقائي ${lastResult.summary.snapped}`}
                {lastResult.summary.warned > 0 && ` · تحذير ${lastResult.summary.warned}`}
              </div>
            )}
          </div>
          <button onClick={() => setLastResult(null)}><X size={14} className="text-green-700" /></button>
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو SKU…"
              className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">كل الفئات</option>
            {Array.isArray(cats) && cats.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nameAr || c.name}</option>
            ))}
          </select>
          <button
            onClick={copyFromYesterday}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <Copy size={14} /> نسخ أسعار أمس
          </button>

          {selected.size > 0 && (
            <>
              <span className="text-xs text-gray-500 mx-2">|</span>
              <span className="text-xs font-bold text-gray-700">{selected.size} محدّد:</span>
              <button onClick={() => applyToSelected('pct', 5)} className="px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded hover:bg-emerald-200 font-bold">+5%</button>
              <button onClick={() => applyToSelected('pct', -5)} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 font-bold">−5%</button>
              <button onClick={() => applyToSelected('add', 0.5)} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 font-bold">+0.50</button>
              <button onClick={() => applyToSelected('add', -0.5)} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 font-bold">−0.50</button>
              <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700">إلغاء التحديد</button>
            </>
          )}
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card><EmptyState icon={DollarSign} title="لا توجد منتجات" /></Card>
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-200 text-right">
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selected.size === rows.length}
                      onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                    />
                  </th>
                  <th className="px-3 py-2 font-bold text-gray-700">المنتج</th>
                  <th className="px-3 py-2 font-bold text-gray-700 text-center">أمس</th>
                  <th className="px-3 py-2 font-bold text-gray-700 text-center">السعر اليوم</th>
                  <th className="px-3 py-2 font-bold text-gray-700 text-center">التغيير</th>
                  <th className="px-3 py-2 font-bold text-gray-700 text-center">7 أيام</th>
                  <th className="px-3 py-2 font-bold text-gray-700 text-center">العروض</th>
                  <th className="px-3 py-2 font-bold text-gray-700 text-center">النطاق</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([catName, items]) => (
                  <RowGroup
                    key={catName}
                    catName={catName}
                    items={items}
                    edits={edits}
                    setEdit={setEdit}
                    revertEdit={revertEdit}
                    selected={selected}
                    toggleSelected={(id) => {
                      setSelected((s) => {
                        const n = new Set(s);
                        if (n.has(id)) n.delete(id); else n.add(id);
                        return n;
                      });
                    }}
                    onShowHistory={setHistoryFor}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {stagedCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:right-72 z-40">
          <div className="bg-white border-2 border-emerald-500 rounded-xl shadow-2xl p-3 flex items-center justify-between">
            <div className="text-sm">
              <span className="font-bold text-emerald-700">{stagedCount} تغيير</span>
              {affected > 0 && <span className="text-gray-600 mr-2">— ستؤثر على ~{affected} عرض</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEdits({})}>
                تراجع عن الكل
              </Button>
              <Button onClick={() => save.mutate()} loading={save.isPending}>
                💾 حفظ التغييرات ({stagedCount})
              </Button>
            </div>
          </div>
        </div>
      )}

      {historyFor && <HistoryModal row={historyFor} onClose={() => setHistoryFor(null)} />}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function RowGroup({
  catName, items, edits, setEdit, revertEdit, selected, toggleSelected, onShowHistory,
}: {
  catName: string; items: BoardRow[]; edits: Record<string, string>;
  setEdit: (id: string, v: string) => void; revertEdit: (id: string) => void;
  selected: Set<string>; toggleSelected: (id: string) => void;
  onShowHistory: (r: BoardRow) => void;
}) {
  return (
    <>
      <tr className="bg-gray-50/70 border-b border-gray-200">
        <td colSpan={9} className="px-3 py-1.5 text-xs font-bold text-gray-600">{catName}</td>
      </tr>
      {items.map((r) => (
        <PriceRow
          key={r.id}
          row={r}
          edit={edits[r.id]}
          setEdit={(v) => setEdit(r.id, v)}
          revert={() => revertEdit(r.id)}
          selected={selected.has(r.id)}
          toggleSelected={() => toggleSelected(r.id)}
          onShowHistory={() => onShowHistory(r)}
        />
      ))}
    </>
  );
}

function PriceRow({
  row, edit, setEdit, revert, selected, toggleSelected, onShowHistory,
}: {
  row: BoardRow; edit?: string;
  setEdit: (v: string) => void; revert: () => void;
  selected: boolean; toggleSelected: () => void;
  onShowHistory: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEdited = edit !== undefined;
  const stagedNum = isEdited ? parseFloat(edit ?? '') : null;
  const current = row.currentPrice ?? 0;
  const effective = isEdited && stagedNum !== null && !isNaN(stagedNum) ? stagedNum : current;

  const deltaPct =
    row.yesterdayPrice && effective > 0
      ? ((effective - row.yesterdayPrice) / row.yesterdayPrice) * 100
      : null;

  const stagedOutOfRange =
    isEdited && stagedNum !== null && !isNaN(stagedNum) && row.floor !== null && row.ceiling !== null
      ? (stagedNum < row.floor * 0.9 || stagedNum > row.ceiling * 1.1)
      : false;

  return (
    <tr className={`border-b border-gray-100 transition-colors ${isEdited ? 'bg-yellow-50' : 'hover:bg-gray-50/50'}`}>
      <td className="px-3 py-2">
        <input type="checkbox" checked={selected} onChange={toggleSelected} />
      </td>
      <td className="px-3 py-2">
        <div className="font-medium text-gray-900 leading-tight">{row.nameAr || row.name}</div>
        <div className="text-[10px] text-gray-400 font-mono">{row.sku}</div>
      </td>
      <td className="px-3 py-2 text-center text-gray-600 font-mono text-xs">
        {fmt(row.yesterdayPrice)}
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <input
            ref={inputRef}
            type="number"
            step="0.01"
            value={edit ?? (row.currentPrice ?? '')}
            onChange={(e) => setEdit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { revert(); inputRef.current?.blur(); }
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const inputs = document.querySelectorAll<HTMLInputElement>('input[type="number"][step="0.01"]');
                const arr = Array.from(inputs);
                const i = arr.indexOf(inputRef.current!);
                const next = arr[i + (e.key === 'ArrowDown' ? 1 : -1)];
                next?.focus();
                next?.select();
              }
            }}
            className={`w-20 text-center font-bold border rounded px-1.5 py-1 text-sm focus:outline-none ${
              isEdited ? 'border-amber-400 bg-yellow-100' : 'border-gray-200 bg-white hover:border-emerald-300 focus:border-emerald-500'
            }`}
          />
          {isEdited && (
            <button onClick={revert} title="تراجع" className="text-gray-400 hover:text-red-600">
              <X size={12} />
            </button>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-center">
        <DeltaCell pct={deltaPct} />
      </td>
      <td className="px-3 py-2 text-center">
        <Sparkline series={row.sparkline} highlight={effective} />
      </td>
      <td className="px-3 py-2 text-center">
        <span className={row.activeListings > 0 ? 'text-gray-900 font-bold' : 'text-gray-300'}>
          {row.activeListings}
        </span>
      </td>
      <td className="px-3 py-2 text-center text-xs font-mono text-gray-500">
        {row.floor !== null && row.ceiling !== null ? (
          <span className={stagedOutOfRange ? 'text-red-600 font-bold' : ''}>
            {fmt(row.floor)} — {fmt(row.ceiling)}
            {stagedOutOfRange && ' ⚠'}
          </span>
        ) : (
          <span className="text-amber-500">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <button onClick={onShowHistory} title="تاريخ السعر" className="text-gray-400 hover:text-emerald-600">
          <History size={14} />
        </button>
      </td>
    </tr>
  );
}

function DeltaCell({ pct }: { pct: number | null }) {
  if (pct === null || isNaN(pct)) return <span className="text-gray-300">—</span>;
  if (Math.abs(pct) < 0.05) return <span className="text-gray-500 flex items-center justify-center gap-0.5"><Minus size={11} /> 0%</span>;
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center justify-center gap-0.5 text-xs font-bold ${up ? 'text-amber-700' : 'text-emerald-700'}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

/**
 * Inline SVG sparkline (~60×24px). The last point is the live staged value
 * so the line animates as the admin types — gives an at-a-glance preview of
 * how today's edit fits the recent trend.
 */
function Sparkline({ series, highlight }: { series: { day: string; price: number | null }[]; highlight: number }) {
  const w = 60, h = 24, pad = 2;
  const prices = series.map((s) => s.price);
  if (prices.length) prices[prices.length - 1] = highlight || prices[prices.length - 1];
  const valid = prices.filter((p): p is number => p !== null && !isNaN(p));
  if (valid.length < 2) return <span className="text-gray-300 text-xs">—</span>;
  const min = Math.min(...valid), max = Math.max(...valid);
  const range = max - min || 1;
  const pts = prices.map((p, i) => {
    if (p === null) return null;
    const x = pad + (i * (w - 2 * pad)) / (prices.length - 1);
    const y = h - pad - ((p - min) / range) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).filter(Boolean).join(' ');
  const last = prices[prices.length - 1];
  const lastX = w - pad;
  const lastY = last !== null ? h - pad - ((last - min) / range) * (h - 2 * pad) : h / 2;
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={pts} fill="none" stroke="#16a34a" strokeWidth={1.5} />
      <circle cx={lastX} cy={lastY} r={2} fill="#16a34a" />
    </svg>
  );
}

function HistoryModal({ row, onClose }: { row: BoardRow; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['pricing-history', row.id],
    queryFn: () => pricingApi.history(row.id, 90).then((r: any) => r.data?.data ?? r.data),
  });
  const history: any[] = Array.isArray(data) ? data : [];
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-bold text-gray-900">تاريخ سعر: {row.nameAr || row.name}</h2>
            <p className="text-xs text-gray-500">آخر 90 يوم · {history.length} تغيير</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          {isLoading ? <PageSpinner /> : history.length === 0 ? (
            <EmptyState icon={History} title="لا تاريخ بعد" />
          ) : (
            <div className="space-y-1">
              {history.map((h: any) => {
                const oldP = h.oldPrice !== null ? Number(h.oldPrice) : null;
                const newP = Number(h.newPrice);
                const delta = oldP !== null ? ((newP - oldP) / oldP) * 100 : null;
                return (
                  <div key={h.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100">
                    <div>
                      <div className="font-bold text-gray-900">
                        {oldP !== null ? `${oldP.toFixed(2)} → ${newP.toFixed(2)} ر.س` : `${newP.toFixed(2)} ر.س`}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {new Date(h.changedAt).toLocaleString('ar-SA')}
                        {h.reason && ` · ${h.reason}`}
                      </div>
                    </div>
                    {delta !== null && <DeltaCell pct={delta} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
