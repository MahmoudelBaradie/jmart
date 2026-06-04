'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, inventoryApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Search, Edit2, X, Save, DollarSign, Package, ChevronDown, ChevronRight,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';

interface ProductPriceRow {
  id: string;
  sku: string;
  name: string;
  nameAr?: string;
  unitOfMeasure: string;
  priceFloor?: number | null;
  priceCeiling?: number | null;
  categoryName: string;
  categoryNameAr?: string;
  lotsCount: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  avgPrice?: number | null;
  belowFloorCount: number;
  aboveCeilingCount: number;
}

interface CatalogRow {
  id: string;
  grade: string;
  pricePerUnit: number;
  availableQty: number;
  isListed: boolean;
  lastPriceUpdated?: string;
  product: { id: string; name: string; nameAr?: string; unitOfMeasure: string };
  farmer: { id: string; businessName: string };
  _count?: { priceHistory: number };
}

const fmt = (n?: number | null, unit = '') =>
  n == null ? '—' : `${n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit ? ` ر.س/${unit}` : ' ر.س'}`;

export default function PricesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'ranges' | 'lots'>('ranges');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFloor, setEditFloor] = useState('');
  const [editCeiling, setEditCeiling] = useState('');
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editLotPrice, setEditLotPrice] = useState('');
  const [editLotReason, setEditLotReason] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // ── Data ──────────────────────────────────────────────────
  const { data: overview, isLoading: overviewLoading } = useQuery<ProductPriceRow[]>({
    queryKey: ['price-overview'],
    queryFn: () => productsApi.priceOverview().then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalog-manage-prices'],
    queryFn: () => inventoryApi.catalog({ limit: 200 }).then((r) => r.data),
    enabled: tab === 'lots',
  });

  const catalogs: CatalogRow[] = catalogData?.data || [];

  // ── Mutations ─────────────────────────────────────────────
  const rangesMutation = useMutation({
    mutationFn: ({ id, floor, ceiling }: { id: string; floor: number | null; ceiling: number | null }) =>
      productsApi.setPriceRange(id, floor, ceiling),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-overview'] });
      setEditingId(null);
    },
  });

  const catalogPriceMutation = useMutation({
    mutationFn: ({ id, price, reason }: { id: string; price: number; reason: string }) =>
      inventoryApi.updateCatalogPrice(id, price, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-manage-prices'] });
      qc.invalidateQueries({ queryKey: ['price-overview'] });
      setEditingLotId(null);
      setEditLotReason('');
    },
  });

  // ── Helpers ───────────────────────────────────────────────
  const openEditRange = (row: ProductPriceRow) => {
    setEditingId(row.id);
    setEditFloor(row.priceFloor != null ? String(row.priceFloor) : '');
    setEditCeiling(row.priceCeiling != null ? String(row.priceCeiling) : '');
  };

  const saveRange = (id: string) => {
    const floor = editFloor ? parseFloat(editFloor) : null;
    const ceiling = editCeiling ? parseFloat(editCeiling) : null;
    rangesMutation.mutate({ id, floor, ceiling });
  };

  const openEditLot = (item: CatalogRow) => {
    setEditingLotId(item.id);
    setEditLotPrice(String(Number(item.pricePerUnit)));
    setEditLotReason('');
  };

  const saveLotPrice = () => {
    if (!editingLotId || !editLotPrice) return;
    catalogPriceMutation.mutate({
      id: editingLotId,
      price: parseFloat(editLotPrice),
      reason: editLotReason || 'Admin price override',
    });
  };

  // Filter and group
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (overview || []).filter(
      (r) => !q || r.name.toLowerCase().includes(q) || (r.nameAr?.toLowerCase().includes(q)) || r.sku.toLowerCase().includes(q),
    );
  }, [overview, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, { category: string; categoryAr?: string; items: ProductPriceRow[] }>();
    filtered.forEach((r) => {
      const key = r.categoryName;
      if (!map.has(key)) map.set(key, { category: r.categoryName, categoryAr: r.categoryNameAr, items: [] });
      map.get(key)!.items.push(r);
    });
    return Array.from(map.values());
  }, [filtered]);

  const totalAlerts = (overview || []).reduce((s, r) => s + r.belowFloorCount + r.aboveCeilingCount, 0);

  const filteredCatalogs = useMemo(() => {
    const q = search.toLowerCase();
    return catalogs.filter((l) =>
      !q || l.product.name.toLowerCase().includes(q) || (l.product as any).nameAr?.toLowerCase().includes(q) || l.farmer.businessName.toLowerCase().includes(q),
    );
  }, [catalogs, search]);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">إدارة الأسعار</h1>
          <p className="text-sm text-gray-500 mt-0.5">تحديد نطاقات الأسعار ومراقبة عروض المزارعين</p>
        </div>
        {totalAlerts > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">{totalAlerts} عرض خارج النطاق</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="منتجات محددة النطاق"
            value={overview.filter((r) => r.priceFloor || r.priceCeiling).length}
            total={overview.length}
            color="blue"
            icon={<DollarSign size={16} />}
          />
          <StatCard
            label="منتجات لها عروض نشطة"
            value={overview.filter((r) => r.lotsCount > 0).length}
            total={overview.length}
            color="green"
            icon={<Package size={16} />}
          />
          <StatCard
            label="عروض تحت الحد الأدنى"
            value={(overview || []).reduce((s, r) => s + r.belowFloorCount, 0)}
            color="amber"
            icon={<TrendingDown size={16} />}
          />
          <StatCard
            label="عروض فوق السقف"
            value={(overview || []).reduce((s, r) => s + r.aboveCeilingCount, 0)}
            color="red"
            icon={<TrendingUp size={16} />}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['ranges', 'lots'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'ranges' ? 'نطاقات الأسعار' : 'عروض المزارعين'}
          </button>
        ))}
      </div>

      {/* Search */}
      <Input
        placeholder={tab === 'ranges' ? 'ابحث عن منتج…' : 'ابحث عن منتج أو مزارع أو رقم اللوت…'}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search size={14} />}
        className="max-w-sm"
      />

      {/* ── Tab: Price Ranges ── */}
      {tab === 'ranges' && (
        <div className="space-y-3">
          {overviewLoading ? (
            <PageSpinner />
          ) : grouped.length === 0 ? (
            <Card><p className="p-8 text-center text-gray-400">لا توجد منتجات</p></Card>
          ) : (
            grouped.map((g) => {
              const key = g.category;
              const isOpen = expandedCategory === null || expandedCategory === key;
              const hasAlerts = g.items.some((r) => r.belowFloorCount > 0 || r.aboveCeilingCount > 0);
              return (
                <div key={key} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Category header */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedCategory === key ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
                      <span className="font-semibold text-gray-800">{g.categoryAr || g.category}</span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{g.items.length} منتج</span>
                      {hasAlerts && <AlertTriangle size={14} className="text-amber-500" />}
                    </div>
                  </button>

                  {expandedCategory !== key && expandedCategory !== null ? null : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 text-left bg-white">
                            <th className="px-4 py-2 font-medium text-gray-500 text-xs">المنتج</th>
                            <th className="px-4 py-2 font-medium text-gray-500 text-xs">الحد الأدنى</th>
                            <th className="px-4 py-2 font-medium text-gray-500 text-xs">السقف</th>
                            <th className="px-4 py-2 font-medium text-gray-500 text-xs">أدنى سعر حالي</th>
                            <th className="px-4 py-2 font-medium text-gray-500 text-xs">متوسط</th>
                            <th className="px-4 py-2 font-medium text-gray-500 text-xs">أعلى سعر</th>
                            <th className="px-4 py-2 font-medium text-gray-500 text-xs">عروض</th>
                            <th className="px-4 py-2 font-medium text-gray-500 text-xs">حالة</th>
                            <th className="px-4 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {g.items.map((row) => {
                            const editing = editingId === row.id;
                            const saving = rangesMutation.isPending && rangesMutation.variables?.id === row.id;
                            const alertStatus = getAlertStatus(row);

                            return (
                              <tr key={row.id} className={`hover:bg-gray-50 ${editing ? 'bg-blue-50' : ''}`}>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-gray-900">{row.nameAr || row.name}</p>
                                  <p className="text-xs text-gray-400">{row.sku} · {row.unitOfMeasure}</p>
                                </td>

                                {editing ? (
                                  <>
                                    <td className="px-2 py-2">
                                      <input
                                        type="number"
                                        value={editFloor}
                                        onChange={(e) => setEditFloor(e.target.value)}
                                        placeholder="غير محدد"
                                        className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                      />
                                    </td>
                                    <td className="px-2 py-2">
                                      <input
                                        type="number"
                                        value={editCeiling}
                                        onChange={(e) => setEditCeiling(e.target.value)}
                                        placeholder="غير محدد"
                                        className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                      />
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-4 py-3">
                                      {row.priceFloor != null ? (
                                        <span className="text-emerald-700 font-semibold">{fmt(row.priceFloor)}</span>
                                      ) : (
                                        <span className="text-gray-300 text-xs">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      {row.priceCeiling != null ? (
                                        <span className="text-red-600 font-semibold">{fmt(row.priceCeiling)}</span>
                                      ) : (
                                        <span className="text-gray-300 text-xs">—</span>
                                      )}
                                    </td>
                                  </>
                                )}

                                <td className="px-4 py-3 text-sm text-gray-700">{fmt(row.minPrice)}</td>
                                <td className="px-4 py-3 text-sm text-gray-700 font-medium">{fmt(row.avgPrice)}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{fmt(row.maxPrice)}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`text-sm font-semibold ${row.lotsCount > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                                    {row.lotsCount}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <AlertBadge status={alertStatus} below={row.belowFloorCount} above={row.aboveCeilingCount} />
                                </td>
                                <td className="px-4 py-3">
                                  {editing ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => saveRange(row.id)}
                                        disabled={saving}
                                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                      >
                                        <Save size={13} />
                                      </button>
                                      <button
                                        onClick={() => setEditingId(null)}
                                        className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                      >
                                        <X size={13} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => openEditRange(row)}
                                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab: Farmer Catalog Prices ── */}
      {tab === 'lots' && (
        <Card noPadding>
          {catalogLoading ? (
            <PageSpinner />
          ) : filteredCatalogs.length === 0 ? (
            <p className="p-8 text-center text-gray-400">لا توجد عروض</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">المنتج</th>
                    <th className="px-4 py-3 font-medium text-gray-600">الدرجة</th>
                    <th className="px-4 py-3 font-medium text-gray-600">المزارع</th>
                    <th className="px-4 py-3 font-medium text-gray-600">الكمية المتاحة</th>
                    <th className="px-4 py-3 font-medium text-gray-600">السعر الحالي</th>
                    <th className="px-4 py-3 font-medium text-gray-600">الحالة</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCatalogs.map((item) => {
                    const editing = editingLotId === item.id;
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 ${editing ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">
                            {(item.product as any).nameAr || item.product.name}
                          </p>
                          <p className="text-xs text-gray-400">{item.product.unitOfMeasure}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {item.grade}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{item.farmer.businessName}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {Number(item.availableQty).toLocaleString()} {item.product.unitOfMeasure}
                        </td>
                        <td className="px-4 py-3">
                          {editing ? (
                            <div className="space-y-2">
                              <input
                                type="number"
                                value={editLotPrice}
                                onChange={(e) => setEditLotPrice(e.target.value)}
                                className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                              />
                              <input
                                type="text"
                                value={editLotReason}
                                onChange={(e) => setEditLotReason(e.target.value)}
                                placeholder="سبب التعديل…"
                                className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                              />
                            </div>
                          ) : (
                            <span className="font-semibold text-gray-900">
                              {fmt(Number(item.pricePerUnit), item.product.unitOfMeasure)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                            item.isListed ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isListed ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                            {item.isListed ? 'نشط' : 'موقوف'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {editing ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={saveLotPrice}
                                disabled={catalogPriceMutation.isPending}
                                className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                              >
                                <Save size={13} />
                              </button>
                              <button
                                onClick={() => setEditingLotId(null)}
                                className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => openEditLot(item)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Helper Components ──────────────────────────────────────────

function StatCard({
  label, value, total, color, icon,
}: {
  label: string; value: number; total?: number; color: 'blue' | 'green' | 'amber' | 'red'; icon: React.ReactNode;
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-black text-gray-900">
        {value}{total != null ? <span className="text-sm font-normal text-gray-400"> / {total}</span> : ''}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function getAlertStatus(row: ProductPriceRow): 'ok' | 'none' | 'below' | 'above' | 'both' {
  if (!row.priceFloor && !row.priceCeiling) return 'none';
  if (row.belowFloorCount > 0 && row.aboveCeilingCount > 0) return 'both';
  if (row.belowFloorCount > 0) return 'below';
  if (row.aboveCeilingCount > 0) return 'above';
  return 'ok';
}

function AlertBadge({ status, below, above }: { status: string; below: number; above: number }) {
  if (status === 'none') return <span className="text-xs text-gray-300">بدون نطاق</span>;
  if (status === 'ok') return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
      <CheckCircle2 size={11} /> ضمن النطاق
    </span>
  );
  return (
    <div className="flex flex-col gap-0.5">
      {below > 0 && (
        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
          <ArrowDownRight size={11} /> {below} تحت الحد
        </span>
      )}
      {above > 0 && (
        <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
          <ArrowUpRight size={11} /> {above} فوق السقف
        </span>
      )}
    </div>
  );
}
