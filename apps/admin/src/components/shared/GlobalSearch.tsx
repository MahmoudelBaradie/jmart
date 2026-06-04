'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { farmersApi, buyersApi, ordersApi, contractsApi } from '@/lib/api';
import {
  Search, X, Sprout, ShoppingCart, ShoppingBag, FileText,
  ArrowLeft, Loader2,
} from 'lucide-react';

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  type: 'farmer' | 'buyer' | 'order' | 'contract';
}

const TYPE_META = {
  farmer: { icon: Sprout, color: 'text-brand-600 bg-brand-50', label: 'مزارع' },
  buyer: { icon: ShoppingCart, color: 'text-blue-600 bg-blue-50', label: 'مشتري' },
  order: { icon: ShoppingBag, color: 'text-amber-600 bg-amber-50', label: 'طلب' },
  contract: { icon: FileText, color: 'text-purple-600 bg-purple-50', label: 'عقد' },
};

function useGlobalSearch(query: string) {
  const enabled = query.trim().length >= 2;

  const { data: farmers, isFetching: f1 } = useQuery({
    queryKey: ['search-farmers', query],
    queryFn: () => farmersApi.list({ search: query, limit: 5 }).then((r) => r.data?.data || []),
    enabled,
    staleTime: 5000,
  });

  const { data: buyers, isFetching: f2 } = useQuery({
    queryKey: ['search-buyers', query],
    queryFn: () => buyersApi.list({ search: query, limit: 5 }).then((r) => r.data?.data || []),
    enabled,
    staleTime: 5000,
  });

  const { data: orders, isFetching: f3 } = useQuery({
    queryKey: ['search-orders', query],
    queryFn: () => ordersApi.list({ search: query, limit: 5 }).then((r) => r.data?.data || []),
    enabled,
    staleTime: 5000,
  });

  const { data: contracts, isFetching: f4 } = useQuery({
    queryKey: ['search-contracts', query],
    queryFn: () => contractsApi.list({ search: query, limit: 5 }).then((r) => r.data?.data || []),
    enabled,
    staleTime: 5000,
  });

  const results: SearchResult[] = [
    ...((farmers || []) as any[]).map((f: any) => ({
      id: f.id,
      label: f.businessName || f.contactPersonName,
      sublabel: f.contactPhone,
      href: `/farmers/${f.id}`,
      type: 'farmer' as const,
    })),
    ...((buyers || []) as any[]).map((b: any) => ({
      id: b.id,
      label: b.businessName || b.contactPersonName,
      sublabel: b.contactPhone,
      href: `/buyers/${b.id}`,
      type: 'buyer' as const,
    })),
    ...((orders || []) as any[]).map((o: any) => ({
      id: o.id,
      label: o.orderNumber,
      sublabel: `${o.farmer?.businessName || ''} → ${o.buyer?.businessName || ''}`,
      href: `/orders/${o.id}`,
      type: 'order' as const,
    })),
    ...((contracts || []) as any[]).map((c: any) => ({
      id: c.id,
      label: c.contractNumber,
      sublabel: `${c.farmer?.businessName || ''} & ${c.buyer?.businessName || ''}`,
      href: `/contracts/${c.id}`,
      type: 'contract' as const,
    })),
  ];

  return { results, isFetching: f1 || f2 || f3 || f4 };
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { results, isFetching } = useGlobalSearch(query);

  // Keyboard shortcut: Ctrl/Cmd + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery('');
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
    setQuery('');
  }, [router]);

  // Arrow key navigation + enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) navigate(results[selected].href);
  };

  return (
    <>
      {/* Trigger button in Header */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-400 hover:bg-gray-50 hover:border-gray-300 transition-colors min-w-40 group"
      >
        <Search size={14} />
        <span className="flex-1 text-left">بحث سريع…</span>
        <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-mono group-hover:bg-gray-200 transition-colors">
          ⌘K
        </span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200">
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              {isFetching
                ? <Loader2 size={18} className="text-gray-400 animate-spin flex-shrink-0" />
                : <Search size={18} className="text-gray-400 flex-shrink-0" />
              }
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ابحث عن مزارع، مشتري، طلب، عقد…"
                className="flex-1 text-sm outline-none text-gray-900 placeholder-gray-400"
                dir="rtl"
              />
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {query.trim().length < 2 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  اكتب حرفين على الأقل للبدء
                </div>
              ) : results.length === 0 && !isFetching ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  لا نتائج لـ &quot;{query}&quot;
                </div>
              ) : (
                <div className="py-1">
                  {results.map((r, i) => {
                    const meta = TYPE_META[r.type];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={r.id + r.type}
                        onClick={() => navigate(r.href)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${
                          i === selected ? 'bg-gray-50' : 'hover:bg-gray-50'
                        }`}
                        onMouseEnter={() => setSelected(i)}
                        dir="rtl"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                          <Icon size={15} />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                          {r.sublabel && (
                            <p className="text-xs text-gray-400 truncate">{r.sublabel}</p>
                          )}
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">
                          {meta.label}
                        </span>
                        <ArrowLeft size={14} className="text-gray-300 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
              <span><kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-xs">↑↓</kbd> للتنقل</span>
              <span><kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-xs">↵</kbd> للفتح</span>
              <span><kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-xs">Esc</kbd> للإغلاق</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
