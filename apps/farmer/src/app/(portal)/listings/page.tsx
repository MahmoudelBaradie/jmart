'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import {
  Package, Plus, Pencil, Check, X,
  TrendingUp, ShoppingBag, Star, ChevronDown, ChevronUp,
  Clock, Eye, EyeOff, AlertCircle, History, DollarSign, AlertTriangle, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Inventory lot shape (subset we render) ────────────────────────────────
interface InventoryLot {
  id: string;
  lotNumber: string;
  farmerId: string;
  grade: string;
  status: string;
  qtyAvailable: string | number;
  qtyTotal: string | number;
  pricePerKg?: number | string | null;
  expiryDate?: string | null;
  harvestDate?: string | null;
  createdAt: string;
  product?: { id: string; name: string; nameAr?: string; unitOfMeasure: string };
  farm?: { id: string; farmName?: string };
}

interface CatalogItem {
  id: string;
  productId: string;
  farmId: string;
  grade: string;
  packagingType?: string;
  pricePerUnit: number;
  availableQty: number;
  minOrderQty?: number;
  isListed: boolean;
  lastPriceUpdated?: string;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    sku: string;
    name: string;
    nameAr?: string;
    unitOfMeasure: string;
    priceFloor?: number | null;
    priceCeiling?: number | null;
    category?: { id: string; name: string };
  };
  farm?: { id: string; farmName: string };
  _count?: { priceHistory: number };
}

function PriceEditor({
  item,
  onSaved,
}: {
  item: CatalogItem;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [newPrice, setNewPrice] = useState(String(Number(item.pricePerUnit)));
  const [reason, setReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const updatePrice = useMutation({
    mutationFn: () => {
      const parsed = parseFloat(newPrice);
      if (isNaN(parsed) || parsed <= 0) throw new Error('سعر غير صالح');
      return listingsApi.updatePrice(item.id, parsed, reason || undefined);
    },
    onSuccess: () => { setOpen(false); setReason(''); onSaved(); },
  });

  const { data: historyData } = useQuery({
    queryKey: ['price-history', item.id],
    queryFn: () => listingsApi.priceHistory(item.id).then((r) => r.data),
    enabled: showHistory,
  });

  const floor = item.product?.priceFloor ? Number(item.product.priceFloor) : null;
  const ceiling = item.product?.priceCeiling ? Number(item.product.priceCeiling) : null;
  const currentPrice = Number(item.pricePerUnit);
  const isBelowFloor = floor != null && currentPrice < floor;
  const isAboveCeiling = ceiling != null && currentPrice > ceiling;
  const hasAlert = isBelowFloor || isAboveCeiling;

  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2">
      <p className="text-xs text-gray-400 mb-1">السعر / {item.product?.unitOfMeasure || 'وحدة'}</p>

      {!open ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className={cn('text-sm font-bold', hasAlert ? 'text-amber-600' : 'text-gray-900')}>
              {currentPrice.toLocaleString('ar-SA')} ر.س
            </span>
            {hasAlert && <AlertTriangle size={12} className="text-amber-500" />}
            <button
              onClick={() => { setNewPrice(String(currentPrice)); setOpen(true); }}
              className="text-gray-300 hover:text-brand-500 transition-colors"
            >
              <Pencil size={11} />
            </button>
          </div>

          {/* Range indicators */}
          {(floor != null || ceiling != null) && (
            <div className="text-xs text-gray-400 flex items-center gap-2">
              {floor != null && (
                <span className={cn('flex items-center gap-0.5', isBelowFloor ? 'text-red-500 font-medium' : '')}>
                  ⬆ {floor.toLocaleString('ar-SA')}
                </span>
              )}
              {ceiling != null && (
                <span className={cn('flex items-center gap-0.5', isAboveCeiling ? 'text-red-500 font-medium' : '')}>
                  ⬇ {ceiling.toLocaleString('ar-SA')}
                </span>
              )}
            </div>
          )}

          {hasAlert && (
            <p className="text-xs text-amber-600">
              {isBelowFloor ? 'أقل من الحد الأدنى المسموح' : 'أعلى من السقف المسموح'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-full border border-brand-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            autoFocus
          />
          {(floor != null || ceiling != null) && (
            <p className="text-xs text-gray-400">
              النطاق المسموح: {floor != null ? `${floor} ↑` : ''} {ceiling != null ? `↓ ${ceiling}` : ''}
            </p>
          )}
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="سبب تغيير السعر (اختياري)"
            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none"
          />
          <div className="flex gap-1">
            <button
              onClick={() => updatePrice.mutate()}
              disabled={updatePrice.isPending || !newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) <= 0}
              className="flex-1 bg-brand-600 text-white text-xs py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <Check size={12} /> حفظ
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-2 bg-gray-100 text-gray-600 text-xs py-1.5 rounded-lg hover:bg-gray-200"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* History toggle */}
      {(item._count?.priceHistory ?? 0) > 0 && !open && (
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-500 mt-1.5 transition-colors"
        >
          <History size={11} />
          {showHistory ? 'إخفاء' : 'سجل الأسعار'} ({item._count?.priceHistory})
        </button>
      )}

      {showHistory && historyData?.priceHistory && (
        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
          {historyData.priceHistory.map((h: any) => (
            <div key={h.id} className="flex items-center justify-between text-xs text-gray-500 bg-white rounded-lg px-2 py-1">
              <span>{Number(h.oldPrice || 0).toFixed(2)} → {Number(h.newPrice).toFixed(2)}</span>
              <span className="text-gray-400">{new Date(h.effectiveAt).toLocaleDateString('ar-SA')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditableField({
  value,
  onSave,
  type = 'number',
  suffix,
  loading,
}: {
  value: number;
  onSave: (v: number) => void;
  type?: string;
  suffix?: string;
  loading?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-20 text-sm border border-brand-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-300 text-gray-900"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') { onSave(parseFloat(draft)); setEditing(false); }
            if (e.key === 'Escape') setEditing(false);
          }}
        />
        {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
        <button
          onClick={() => { onSave(parseFloat(draft)); setEditing(false); }}
          className="text-emerald-600 hover:text-emerald-700"
        >
          <Check size={14} />
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      disabled={loading}
      className="flex items-center gap-1 group"
    >
      <span className="text-sm font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
        {value.toLocaleString('ar-SA')}
      </span>
      {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
      <Pencil size={11} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
    </button>
  );
}

function ListingCard({ item }: { item: CatalogItem }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const update = useMutation({
    mutationFn: (data: Record<string, unknown>) => listingsApi.updateListing(item.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-listings'] }),
  });

  const toggleListed = () => update.mutate({ isListed: !item.isListed });
  const saveQty = (v: number) => { if (!isNaN(v) && v >= 0) update.mutate({ availableQty: v }); };
  const saveMinOrder = (v: number) => { if (!isNaN(v) && v > 0) update.mutate({ minOrderQty: v }); };

  const isUpdating = update.isPending;

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200',
      item.isListed ? 'border-gray-100' : 'border-dashed border-gray-200 opacity-75',
    )}>
      {/* Main row */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Product info */}
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              item.isListed ? 'bg-brand-50' : 'bg-gray-100',
            )}>
              <Package size={18} className={item.isListed ? 'text-brand-600' : 'text-gray-400'} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900 text-sm leading-tight">
                  {item.product?.name || 'منتج'}
                </h3>
                {item.product?.nameAr && (
                  <span className="text-xs text-gray-400">{item.product.nameAr}</span>
                )}
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  درجة {item.grade}
                </span>
                {item.product?.category && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    {item.product.category.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">SKU: {item.product?.sku}</span>
                {item.farm && (
                  <span className="text-xs text-gray-400">• {item.farm.farmName}</span>
                )}
              </div>
            </div>
          </div>

          {/* Toggle + expand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isUpdating && (
              <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            )}
            <button
              onClick={toggleListed}
              disabled={isUpdating}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                item.isListed
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
              title={item.isListed ? 'إيقاف العرض' : 'تفعيل العرض'}
            >
              {item.isListed ? (
                <><Eye size={13} /> نشط</>
              ) : (
                <><EyeOff size={13} /> موقوف</>
              )}
            </button>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-50">
          {/* Price — now uses PriceEditor with history + range */}
          <PriceEditor
            item={item}
            onSaved={() => qc.invalidateQueries({ queryKey: ['my-listings'] })}
          />

          {/* Available qty */}
          <div className="bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-xs text-gray-400 mb-1">الكمية المتاحة</p>
            <EditableField
              value={Number(item.availableQty)}
              onSave={saveQty}
              suffix={item.product?.unitOfMeasure || 'وحدة'}
              loading={isUpdating}
            />
          </div>

          {/* Min order */}
          <div className="bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-xs text-gray-400 mb-1">أدنى طلب</p>
            <EditableField
              value={Number(item.minOrderQty ?? 1)}
              onSave={saveMinOrder}
              suffix={item.product?.unitOfMeasure || 'وحدة'}
              loading={isUpdating}
            />
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-50 bg-gray-50/50 px-4 py-3 space-y-2">
          {/* Stats row */}
          <div className="flex items-center gap-4 flex-wrap">
            {item._count && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <TrendingUp size={12} className="text-brand-500" />
                <span>{item._count.priceHistory} تغيير سعر</span>
              </div>
            )}
            {item.packagingType && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <ShoppingBag size={12} className="text-gray-400" />
                <span>تعبئة: {item.packagingType}</span>
              </div>
            )}
            {item.lastPriceUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Clock size={12} />
                <span>آخر تحديث سعر: {new Date(item.lastPriceUpdated).toLocaleDateString('ar-SA')}</span>
              </div>
            )}
          </div>

          {/* Status note */}
          {!item.isListed && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                هذا العرض موقوف حالياً — المشترون لا يمكنهم رؤيته في السوق. اضغط "تفعيل" لإظهاره.
              </p>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>تاريخ الإضافة: {new Date(item.createdAt).toLocaleDateString('ar-SA')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ListingsPage() {
  const [showInactive, setShowInactive] = useState(false);
  const { user } = useAuth();
  const farmerId = user?.farmer?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => listingsApi.myListings().then((r) => r.data),
  });

  // Inventory lots created by this farmer (these are the "physical batches"
  // produced by /listings/new — they live in InventoryLot, separate from the
  // FarmerCatalogItem above which holds pricing/listing toggles).
  const { data: lotsData } = useQuery({
    queryKey: ['my-lots', farmerId],
    queryFn: () => listingsApi.list({ limit: 50 }).then((r) => r.data),
    enabled: !!farmerId,
  });
  const allLots: InventoryLot[] = lotsData?.data || lotsData || [];
  const myLots = allLots.filter((l) => l.farmerId === farmerId);

  const listings: CatalogItem[] = data || [];
  const active = listings.filter((l) => l.isListed);
  const inactive = listings.filter((l) => !l.isListed);

  return (
    <div className="sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">عروضي</h1>
          {!isLoading && (
            <p className="text-xs text-gray-400 mt-0.5">
              {active.length} نشط • {inactive.length} موقوف
            </p>
          )}
        </div>
        <Link
          href="/listings/new"
          className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          عرض جديد
        </Link>
      </div>

      {/* ── Inventory lots (دفعات المخزون) ────────────────────────── */}
      {myLots.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Layers size={15} className="text-brand-500" />
              دفعات المخزون ({myLots.length})
            </h2>
            <span className="text-xs text-gray-400">آخر العروض المنشورة</span>
          </div>
          <div className="space-y-2">
            {myLots.slice(0, 8).map((lot) => {
              const qtyAvail = Number(lot.qtyAvailable ?? 0);
              const qtyTotal = Number(lot.qtyTotal ?? 0);
              const price = lot.pricePerKg != null ? Number(lot.pricePerKg) : null;
              const isAvailable = lot.status === 'AVAILABLE' && qtyAvail > 0;
              return (
                <div key={lot.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', isAvailable ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-400')}>
                      <Package size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {lot.product?.nameAr || lot.product?.name || 'منتج'}
                        </p>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold">
                          درجة {lot.grade}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {lot.lotNumber}
                        {lot.farm?.farmName && <span className="mr-2">• {lot.farm.farmName}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      {qtyAvail.toLocaleString('ar-SA')} / {qtyTotal.toLocaleString('ar-SA')} كجم
                    </p>
                    <p className={cn('text-xs', isAvailable ? 'text-emerald-600' : 'text-gray-400')}>
                      {price != null ? `${price.toLocaleString('ar-SA')} ر.س / كجم` : 'لم يُحدَّد السعر'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {myLots.length > 8 && (
            <p className="text-xs text-center text-gray-400 pt-1">+{myLots.length - 8} دفعات أخرى</p>
          )}
        </div>
      )}

      {/* Catalog management section header */}
      {!isLoading && listings.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <DollarSign size={15} className="text-brand-500" />
            إدارة الكتالوج والأسعار
          </h2>
        </div>
      )}

      {/* Stats summary */}
      {!isLoading && listings.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'إجمالي العروض',
              value: listings.length,
              icon: Package,
              color: 'text-brand-600',
              bg: 'bg-brand-50',
            },
            {
              label: 'نشطة',
              value: active.length,
              icon: Eye,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
            {
              label: 'موقوفة',
              value: inactive.length,
              icon: EyeOff,
              color: 'text-gray-500',
              bg: 'bg-gray-100',
            },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                <s.icon size={16} className={s.color} />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="py-16 text-center text-gray-400 text-sm">
          <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          جارٍ التحميل…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
          <AlertCircle size={24} className="text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600">حدث خطأ أثناء تحميل العروض</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && listings.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
          <Package size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-semibold">لم تنشر أي عروض بعد</p>
          <p className="text-gray-400 text-sm mt-1">ابدأ بنشر منتجاتك الزراعية ليتمكن المشترون من رؤيتها</p>
          <Link
            href="/listings/new"
            className="inline-flex items-center gap-2 mt-5 bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} />
            نشر أول عرض
          </Link>
        </div>
      )}

      {/* Listings */}
      {!isLoading && listings.length > 0 && (
        <div className="space-y-3">
          {/* Active listings */}
          {active.length > 0 && (
            <div className="space-y-2">
              {active.map((item) => <ListingCard key={item.id} item={item} />)}
            </div>
          )}

          {/* Inactive toggle */}
          {inactive.length > 0 && (
            <>
              <button
                onClick={() => setShowInactive((v) => !v)}
                className="w-full flex items-center gap-2 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <div className="flex-1 h-px bg-gray-100" />
                {showInactive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span>{inactive.length} عروض موقوفة</span>
                {showInactive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <div className="flex-1 h-px bg-gray-100" />
              </button>

              {showInactive && (
                <div className="space-y-2">
                  {inactive.map((item) => <ListingCard key={item.id} item={item} />)}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tip */}
      {!isLoading && listings.length > 0 && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
          <Star size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600">
            اضغط على السعر أو الكمية مباشرةً لتعديلها، ثم اضغط <strong>Enter</strong> للحفظ.
          </p>
        </div>
      )}
    </div>
  );
}
