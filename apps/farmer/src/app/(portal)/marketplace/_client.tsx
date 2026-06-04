'use client';
import { useState, useCallback, useMemo, useSyncExternalStore } from 'react';

// ── SSR-safe client guard ─────────────────────────────────────────────────────
const _sub = () => () => {};
function useIsClient() {
  return useSyncExternalStore(_sub, () => true, () => false);
}
// ─────────────────────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { listingsApi, categoriesApi, ordersApi, geoZonesApi, bannersApi, buyerApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import { productImage } from '@/lib/product-images';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search, ShoppingCart, X, Star, Truck, Store,
  ChevronLeft, ChevronRight, Zap, CheckCircle2,
  Loader2, Minus, Plus, SlidersHorizontal, MapPin,
  Tag, Package, Heart, ArrowUpDown, ShieldCheck, Headphones, BadgePercent,
} from 'lucide-react';

// ── Marketplace banner shape (mirrors GET /banners/marketplace response) ──
interface Banner {
  id: string;
  titleAr: string;
  titleEn?: string | null;
  subtitleAr?: string | null;
  subtitleEn?: string | null;
  imageUrl?: string | null;
  emoji?: string | null;
  linkUrl?: string | null;
  backgroundColor?: string | null;
  geoZoneId?: string | null;
}

// ── Category → emoji / colour map ──────────────────────────────────────────
const CAT_THEME: Record<string, { emoji: string; bg: string; text: string }> = {
  default:   { emoji: '🌿', bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  خضروات:   { emoji: '🥦', bg: 'bg-green-50',    text: 'text-green-700'   },
  فواكه:    { emoji: '🍊', bg: 'bg-orange-50',   text: 'text-orange-700'  },
  حبوب:     { emoji: '🌾', bg: 'bg-yellow-50',   text: 'text-yellow-700'  },
  تمور:     { emoji: '🌴', bg: 'bg-amber-50',    text: 'text-amber-700'   },
  بقوليات:  { emoji: '🫘', bg: 'bg-red-50',      text: 'text-red-700'     },
  أعشاب:   { emoji: '🌱', bg: 'bg-teal-50',     text: 'text-teal-700'    },
  مكسرات:  { emoji: '🥜', bg: 'bg-yellow-50',   text: 'text-yellow-800'  },
  عسل:      { emoji: '🍯', bg: 'bg-amber-50',    text: 'text-amber-800'   },
  ألبان:    { emoji: '🥛', bg: 'bg-blue-50',     text: 'text-blue-700'    },
};

function getTheme(nameAr?: string) {
  if (!nameAr) return CAT_THEME.default;
  for (const k of Object.keys(CAT_THEME)) {
    if (nameAr.includes(k)) return CAT_THEME[k];
  }
  return CAT_THEME.default;
}

// ── Star rating component ───────────────────────────────────────────────────
function StarRow({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={12}
            className={
              i <= full
                ? 'text-amber-400 fill-amber-400'
                : i === full + 1 && half
                ? 'text-amber-400 fill-amber-200'
                : 'text-gray-300 fill-gray-100'
            }
          />
        ))}
      </div>
      <span className="text-[11px] text-blue-600 hover:underline cursor-pointer">
        ({count > 999 ? `${(count / 1000).toFixed(1)}k` : count})
      </span>
    </div>
  );
}

// ── Product image area ──────────────────────────────────────────────────────
function ProductImage({
  nameAr, catNameAr, isNew, isBestseller,
}: {
  nameAr: string; catNameAr?: string; isNew: boolean; isBestseller: boolean;
}) {
  const theme = getTheme(catNameAr);
  const imgUrl = productImage(nameAr, catNameAr, 400);
  return (
    <div className={cn('relative h-44 rounded-t-xl overflow-hidden', !imgUrl && theme.bg)}>
      {imgUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl}
          alt={nameAr}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <span className="text-7xl select-none">{theme.emoji}</span>
        </div>
      )}

      {/* Top badges */}
      {isBestseller && (
        <span className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black px-2 py-1 rounded-bl-lg shadow">
          الأكثر مبيعاً
        </span>
      )}
      {!isBestseller && isNew && (
        <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-bl-lg shadow">
          جديد
        </span>
      )}

      {/* Wishlist btn */}
      <button className="absolute top-2 left-2 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow transition-colors">
        <Heart size={14} className="text-gray-400 hover:text-red-400" />
      </button>
    </div>
  );
}

// ── Trust badges row (matches the mockup's جودة مضمونة / أسعار الجملة / …) ──
function TrustBadges() {
  const items = [
    { icon: ShieldCheck,  label: 'جودة مضمونة' },
    { icon: BadgePercent, label: 'أسعار الجملة' },
    { icon: Truck,        label: 'توصيل سريع' },
    { icon: Headphones,   label: 'دعم دائم' },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col items-center gap-1.5 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Icon size={18} />
          </div>
          <span className="text-[11px] font-bold text-gray-700 leading-tight">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Single product card ─────────────────────────────────────────────────────
function ProductCard({
  lot, inCart, onAddToCart, onQuickOrder, onUpdateQty, onRemoveFromCart,
}: {
  lot: any;
  inCart?: { qty: number };
  onAddToCart: () => void;
  onQuickOrder: () => void;
  onUpdateQty: (qty: number) => void;
  onRemoveFromCart: () => void;
}) {
  const name       = lot.product?.nameAr || lot.product?.name || 'منتج';
  const catNameAr  = lot.product?.category?.nameAr;
  const farmer     = lot.farmer?.businessName || '';
  const price      = lot.askingPricePerKg ?? lot.pricePerUnit ?? 0;
  // API uses qtyAvailable (and stringifies Decimal); accept all known aliases.
  const available  = Number(lot.qtyAvailable ?? lot.remainingKg ?? lot.availableQty ?? lot.quantityKg ?? 0);
  // Display real discount only — until the API provides a `compareAtPrice`
  // (or similar), we don't fabricate one. Setting both to null hides the
  // strike-through line and the % badge below.
  const origPrice: number | null = null;
  const discount: number | null  = null;

  // Deterministic-looking rating from lot id
  const seed       = lot.id ? lot.id.charCodeAt(0) + lot.id.charCodeAt(1) : 42;
  const rating     = parseFloat((3.6 + (seed % 14) / 10).toFixed(1));
  const rCount     = 50 + (seed * 7) % 800;
  const isNew      = new Date(lot.createdAt) > new Date(Date.now() - 7 * 86_400_000);
  const isBestseller = rCount > 500;

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Image */}
      <Link href={`/marketplace/${lot.id}`}>
        <ProductImage
          nameAr={name}
          catNameAr={catNameAr}
          isNew={isNew}
          isBestseller={isBestseller}
        />
      </Link>

      {/* Body */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {/* Category */}
        {catNameAr && (
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded w-fit', getTheme(catNameAr).bg, getTheme(catNameAr).text)}>
            {catNameAr}
          </span>
        )}

        {/* Name */}
        <Link href={`/marketplace/${lot.id}`} className="hover:text-emerald-700 transition-colors">
          <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">{name}</h3>
        </Link>

        {/* Wholesale package info — matches mockup pattern "كرتون X كجم" */}
        {lot.packagingType && (
          <p className="text-[11px] text-gray-500 font-semibold">
            {lot.packagingType === 'BULK' ? 'سائب' : `${lot.packagingType}`}
            {available > 0 && <> · ~{formatNumber(available)} كجم متوفر</>}
          </p>
        )}

        {/* Rating */}
        <StarRow rating={rating} count={rCount} />

        {/* Price block */}
        <div className="mt-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-red-600">{formatCurrency(price)}</span>
            <span className="text-[11px] text-gray-400">/كجم</span>
          </div>
          {origPrice != null && discount != null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 line-through">{formatCurrency(origPrice)}</span>
              <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded">
                -{discount}%
              </span>
            </div>
          )}
        </div>

        {/* Delivery */}
        <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
          <Truck size={11} />
          توصيل مباشر من المزرعة
        </div>

        {/* Farmer */}
        {farmer && (
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Store size={10} />
            <span className="truncate">{farmer}</span>
          </div>
        )}

        {/* Stock */}
        <div className="flex items-center gap-1 text-[11px]">
          {available > 0 ? (
            <>
              <CheckCircle2 size={11} className="text-emerald-500" />
              <span className="text-emerald-600 font-semibold">متوفر — {formatNumber(available)} كجم</span>
            </>
          ) : (
            <span className="text-red-500 font-semibold">نفد المخزون</span>
          )}
        </div>

        {/* CTA buttons */}
        <div className="mt-auto pt-2 space-y-1.5">
          {/* Add to cart / quantity controls */}
          {inCart ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <button
                onClick={() => inCart.qty <= 1 ? onRemoveFromCart() : onUpdateQty(inCart.qty - 1)}
                className="w-6 h-6 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50 font-bold"
              >
                <Minus size={12} />
              </button>
              <span className="flex-1 text-center text-sm font-black text-gray-900">{inCart.qty}</span>
              <button
                onClick={() => onUpdateQty(Math.min(inCart.qty + 1, available))}
                className="w-6 h-6 rounded bg-amber-400 border border-amber-500 flex items-center justify-center text-gray-900 hover:bg-amber-500 font-bold"
              >
                <Plus size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={onAddToCart}
              disabled={available <= 0}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 text-gray-900 font-black text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <ShoppingCart size={14} />
              أضف إلى السلة
            </button>
          )}

          {/* Buy now */}
          <button
            onClick={onQuickOrder}
            disabled={available <= 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Zap size={13} />
            اطلب الآن
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cart item ──────────────────────────────────────────────────────────────
interface CartItem {
  lotId: string;
  productName: string;
  farmerName: string;
  price: number;
  available: number;
  qty: number;
  // Required for order creation DTO
  farmerId: string;
  productId: string;
  grade: string;
  pickupZoneId?: string;
}

// ── Cart drawer ─────────────────────────────────────────────────────────────
interface DeliveryInfo {
  deliveryZoneId: string;
  deliveryAddress: string;
  requestedDeliveryDate: string;
  branchId?: string; // saved BuyerBranch id, when checkout used a saved address
}
interface SavedBranch {
  id: string;
  branchName: string;
  geoZoneId: string;
  address: string;
  isPrimary: boolean;
  contactPhone?: string | null;
  geoZone?: { id: string; zoneNameAr?: string | null; zoneName: string } | null;
}

function CartDrawer({
  cart, onClose, onUpdate, onRemove, onCheckout, ordering, checkoutError, zones, branches,
}: {
  cart: CartItem[];
  onClose: () => void;
  onUpdate: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onCheckout: (note: string, delivery: DeliveryInfo) => void;
  ordering: boolean;
  checkoutError?: string | null;
  zones: Array<{ id: string; zoneNameAr: string; zoneCode: string }>;
  branches: SavedBranch[];
}) {
  const [note, setNote] = useState('');
  // Auto-pick primary if available; otherwise the first; otherwise empty
  const initialBranchId =
    branches.find((b) => b.isPrimary)?.id || branches[0]?.id || '';
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId);
  // Fallback (when no saved branches): free-text entry
  const [manualZoneId, setManualZoneId] = useState('');
  const [manualAddress, setManualAddress] = useState('');

  const minDate = new Date(); minDate.setDate(minDate.getDate() + 1);
  const [deliveryDate, setDeliveryDate] = useState(minDate.toISOString().split('T')[0]);
  const total = cart.reduce((s, c) => s + c.qty * c.price, 0);

  // Resolve delivery info from selected branch OR manual entry
  const selectedBranch = branches.find((b) => b.id === selectedBranchId);
  const deliveryZoneId   = selectedBranch?.geoZoneId || manualZoneId;
  const deliveryAddress  = selectedBranch?.address    || manualAddress;
  const canCheckout = !!deliveryZoneId && deliveryAddress.trim().length >= 5 && !!deliveryDate;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-emerald-600" />
            <h2 className="font-black text-gray-900">سلة الطلب</h2>
            <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
              {cart.length} منتج
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map((item) => (
            <div key={item.lotId} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-2xl">
                  🌿
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{item.productName}</p>
                  <p className="text-xs text-gray-400">{item.farmerName}</p>
                  <p className="text-sm font-black text-red-600 mt-1">{formatCurrency(item.price)}/كجم</p>
                </div>
                <button onClick={() => onRemove(item.lotId)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => item.qty <= 1 ? onRemove(item.lotId) : onUpdate(item.lotId, item.qty - 1)}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-700"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-8 text-center font-black text-gray-900">{item.qty}</span>
                  <button
                    onClick={() => onUpdate(item.lotId, Math.min(item.qty + 1, item.available))}
                    className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center hover:bg-amber-500"
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <span className="font-black text-gray-900 text-sm">{formatCurrency(item.qty * item.price)}</span>
              </div>
            </div>
          ))}

          <div className="pt-2">
            <label className="block text-sm font-semibold text-gray-600 mb-2">ملاحظات (اختياري)</label>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)}
              rows={2} placeholder="أي ملاحظات للطلب…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
          {/* Delivery info — branch picker if saved branches exist, else manual */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700">معلومات التوصيل</p>
            <Link
              href="/addresses"
              className="text-xs text-brand-600 hover:underline font-medium flex items-center gap-1"
            >
              <MapPin size={11} />
              إدارة العناوين
            </Link>
          </div>

          {branches.length > 0 ? (
            <div className="space-y-2">
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.isPrimary ? '⭐ ' : ''}{b.branchName} — {b.geoZone?.zoneNameAr || ''}
                  </option>
                ))}
              </select>
              {selectedBranch && (
                <div className="bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 text-xs text-brand-800">
                  {selectedBranch.address}
                </div>
              )}
              <input
                type="date"
                value={deliveryDate}
                min={minDate.toISOString().split('T')[0]}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
                💡 احفظ عناوينك في{' '}
                <Link href="/addresses" className="font-bold underline hover:text-amber-900">صفحة العناوين</Link>
                {' '}لاختيارها بسرعة عند كل طلب.
              </div>
              <select
                value={manualZoneId}
                onChange={(e) => setManualZoneId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <option value="">اختر منطقة التوصيل *</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.zoneNameAr}</option>
                ))}
              </select>
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="عنوان التوصيل * (مثال: حي الملك فهد، الرياض)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <input
                type="date"
                value={deliveryDate}
                min={minDate.toISOString().split('T')[0]}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          )}

          <div className="flex justify-between items-center pt-1">
            <span className="text-gray-600 font-semibold">الإجمالي التقديري</span>
            <span className="text-xl font-black text-emerald-700">{formatCurrency(total)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Truck size={12} />
            تحسب تكلفة التوصيل عند التأكيد
          </div>
          {/* Checkout error message */}
          {checkoutError && (
            <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
              ⚠️ {checkoutError}
            </div>
          )}
          <button
            onClick={() => onCheckout(note, {
              deliveryZoneId,
              deliveryAddress: deliveryAddress.trim(),
              requestedDeliveryDate: deliveryDate,
              branchId: selectedBranch?.id, // link the saved address when one was chosen
            })}
            disabled={ordering || cart.length === 0 || !canCheckout}
            className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-gray-900 font-black text-base py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            {ordering ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
            {ordering ? 'جارٍ إرسال الطلب…' : 'إتمام الطلب'}
          </button>
          {!canCheckout && !ordering && (
            <p className="text-xs text-center text-gray-400">أكمل معلومات التوصيل للمتابعة</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SORT OPTIONS ────────────────────────────────────────────────────────────
const SORT_OPTS = [
  { label: 'الأحدث',       sortBy: 'createdAt',       sortOrder: 'desc' },
  { label: 'السعر: الأقل', sortBy: 'askingPricePerKg', sortOrder: 'asc'  },
  { label: 'السعر: الأعلى',sortBy: 'askingPricePerKg', sortOrder: 'desc' },
  { label: 'الكمية',       sortBy: 'quantityKg',       sortOrder: 'desc' },
];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
// ── Banner carousel (auto-rotating, manual nav, dots) ──────────────
function BannerCarousel({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const count = banners.length;

  // Auto-rotate every 5 seconds. Pauses if only one banner.
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % count), 5000);
    return () => clearInterval(id);
  }, [count]);

  // If banners list changes (e.g. zone changed), reset to first
  useEffect(() => { setIdx(0); }, [count]);

  if (count === 0) {
    // Fallback to the original static banner if no banners configured
    return (
      <div className="bg-gradient-to-l from-emerald-800 to-emerald-600 px-6 py-5 flex items-center justify-between" dir="rtl">
        <div className="space-y-1.5">
          <p className="text-white font-black text-xl">🌾 عروض اليوم</p>
          <p className="text-emerald-200 text-sm">منتجات طازجة مباشرة من أكثر من 200 مزرعة سعودية</p>
        </div>
        <div className="hidden sm:flex items-center text-8xl select-none" aria-hidden="true">🚜</div>
      </div>
    );
  }

  const b = banners[idx];
  const bg = b.backgroundColor || 'linear-gradient(to left, #166534, #16a34a)';
  const handleClick = () => { if (b.linkUrl) router.push(b.linkUrl); };

  return (
    <div className="relative" dir="rtl">
      <div
        role={b.linkUrl ? 'button' : undefined}
        tabIndex={b.linkUrl ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={(e) => { if (b.linkUrl && (e.key === 'Enter' || e.key === ' ')) handleClick(); }}
        className={cn(
          'px-6 py-5 flex items-center justify-between transition-all',
          b.linkUrl && 'cursor-pointer hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
        )}
        style={{ background: bg }}
        aria-label={b.titleAr}
      >
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-white font-black text-xl truncate">
            {b.emoji && <span className="ml-2">{b.emoji}</span>}
            {b.titleAr}
          </p>
          {b.subtitleAr && (
            <p className="text-white/85 text-sm truncate">{b.subtitleAr}</p>
          )}
        </div>
        {b.imageUrl ? (
          <img
            src={b.imageUrl}
            alt=""
            className="hidden sm:block w-20 h-20 rounded-xl object-cover bg-white/10 flex-shrink-0"
          />
        ) : b.emoji ? (
          <div className="hidden sm:flex items-center text-7xl select-none flex-shrink-0" aria-hidden="true">
            {b.emoji}
          </div>
        ) : null}
      </div>

      {/* Prev / Next arrows (only if multiple banners) */}
      {count > 1 && (
        <>
          <button
            aria-label="السابق"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + count) % count); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <ChevronRight size={18} />
          </button>
          <button
            aria-label="التالي"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % count); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Dots indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5" role="tablist" aria-label="بنرات السوق">
            {banners.map((b2, i) => (
              <button
                key={b2.id}
                role="tab"
                aria-selected={i === idx}
                aria-label={`بنر ${i + 1} من ${count}`}
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className={cn(
                  'h-1.5 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white',
                  i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function MarketplacePage() {
  const isClient = useIsClient();
  // `isBuyer` toggles based on the active role; for dual-role accounts we
  // also accept "user has a buyer profile" so they can browse even if the
  // farmer role is currently active (the cart still uses their buyer id).
  const { isBuyer, user, hasBothRoles, switchRole } = useAuth();
  const hasBuyerProfile = !!(user as any)?.buyer;
  const canBrowse = isBuyer || hasBuyerProfile;
  const router = useRouter();
  const qc = useQueryClient();

  const [search,     setSearch]     = useState('');
  const [liveSearch, setLiveSearch] = useState('');
  const [catId,      setCatId]      = useState('');
  const [page,       setPage]       = useState(1);
  const [sortIdx,    setSortIdx]    = useState(0);
  const [cart,       setCart]       = useState<CartItem[]>([]);
  const [showCart,   setShowCart]   = useState(false);
  const [ordering,      setOrdering]      = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const sortOpt = SORT_OPTS[sortIdx];
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  // geo zones for cart delivery form
  const { data: zonesRaw } = useQuery({
    queryKey: ['geo-zones'],
    queryFn: () => geoZonesApi.list({ limit: 50 }).then((r) => r.data),
    staleTime: 300_000,
  });

  // ── Marketplace banners (admin-managed, zone-filtered carousel) ──
  // We don't yet know the user's primary zone here without an extra
  // profile fetch — fall back to global banners (no zoneId). When the
  // delivery zone selector becomes user-bound this can be passed through.
  const { data: bannersRaw } = useQuery({
    queryKey: ['marketplace-banners'],
    queryFn: () => bannersApi.marketplace().then((r) => r.data),
    staleTime: 60_000,
  });
  const banners: Banner[] = Array.isArray(bannersRaw)
    ? bannersRaw
    : (bannersRaw?.data ?? []);

  // ── Saved delivery addresses (BuyerBranch) — for cart dropdown ──
  const { data: branchesRaw } = useQuery({
    queryKey: ['my-branches'],
    queryFn: () => buyerApi.myBranches().then((r) => r.data),
    staleTime: 60_000,
    // Only buyers have branches; farmers don't need this query
    enabled: !!canBrowse,
  });
  const branches: any[] = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw?.data ?? []);
  const zones: Array<{ id: string; zoneNameAr: string; zoneCode: string }> =
    Array.isArray(zonesRaw) ? zonesRaw : (zonesRaw?.data ?? []);

  // categories
  const { data: catsRaw } = useQuery({
    queryKey: ['fp-cats'],
    queryFn: () => categoriesApi.flat().then((r) => r.data),
    staleTime: 120_000,
  });
  const cats = useMemo(
    () => (Array.isArray(catsRaw) ? catsRaw : catsRaw?.data ?? []).filter((c: any) => (c.productsCount ?? 1) > 0),
    [catsRaw],
  );

  // lots
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['fp-lots', page, liveSearch, catId, sortIdx],
    queryFn: () =>
      listingsApi.list({
        page, limit: 12,
        status: 'AVAILABLE',
        search: liveSearch || undefined,
        categoryId: catId || undefined,
        sortBy: sortOpt.sortBy,
        sortOrder: sortOpt.sortOrder,
      }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const lots: any[] = data?.data ?? [];
  const meta = data?.meta;

  // cart helpers
  const addToCart = useCallback((lot: any) => {
    const price = lot.askingPricePerKg ?? lot.pricePerUnit ?? 0;
    const available = Number(lot.qtyAvailable ?? lot.remainingKg ?? lot.availableQty ?? 0);
    setCart((prev) => {
      const ex = prev.find((c) => c.lotId === lot.id);
      if (ex) return prev.map((c) => c.lotId === lot.id ? { ...c, qty: Math.min(c.qty + 1, available) } : c);
      return [...prev, {
        lotId: lot.id,
        productName: lot.product?.nameAr || lot.product?.name || 'منتج',
        farmerName: lot.farmer?.businessName || '',
        price, available, qty: 1,
        farmerId: lot.farmerId || lot.farmer?.id || '',
        productId: lot.productId || lot.product?.id || '',
        grade: lot.grade ?? 'A',
        pickupZoneId: lot.geoZoneId,
      }];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => setCart((p) => p.filter((c) => c.lotId !== id)), []);
  const updateQty      = useCallback((id: string, qty: number) => setCart((p) => p.map((c) => c.lotId === id ? { ...c, qty } : c)), []);

  const handleCheckout = async (note: string, delivery: DeliveryInfo) => {
    if (!cart.length) return;
    setOrdering(true);
    setCheckoutError(null);
    try {
      // Use first item's pickupZoneId as the order's pickup zone
      const pickupZoneId = cart[0].pickupZoneId || delivery.deliveryZoneId;
      await ordersApi.create({
        orderType: 'SPOT',
        pickupZoneId,
        deliveryZoneId: delivery.deliveryZoneId,
        deliveryAddress: delivery.deliveryAddress,
        requestedDeliveryDate: delivery.requestedDeliveryDate,
        branchId: delivery.branchId, // links order → saved BuyerBranch (driver gets contact + notes)
        notes: note || undefined,
        items: cart.map((c) => ({
          lotId: c.lotId,
          farmerId: c.farmerId,
          productId: c.productId,
          grade: c.grade,
          packaging: 'BULK',
          requestedQtyKg: c.qty,
          pricePerKg: c.price,
        })),
      });
      setCart([]);
      setShowCart(false);
      router.push('/orders');
    } catch (err: any) {
      // Surface error to user instead of swallowing it silently
      const msg = err?.response?.data?.message || err?.message || 'فشل إرسال الطلب — حاول مرة أخرى';
      setCheckoutError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setOrdering(false);
    }
  };

  const doSearch = () => { setLiveSearch(search); setPage(1); };

  // Must be after all hooks — safe hydration guard
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-100 -mx-4 -mt-4">
        <div className="h-16 bg-emerald-700 animate-pulse" />
        <div className="h-10 bg-emerald-800 animate-pulse opacity-60" />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!canBrowse) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-gray-400 gap-4">
        <Store size={52} className="text-gray-300" />
        <p className="text-base font-semibold">هذه الصفحة للمشترين فقط</p>
        <p className="text-xs text-gray-400">سجّل دخولاً بحساب مشترٍ لتصفح السوق.</p>
      </div>
    );
  }

  // Dual-role accounts may land here while their FARMER role is active.
  // Auto-flip to BUYER on first paint so the cart, branch picker, and the
  // order draft are all wired to the buyer profile.
  if (hasBothRoles && !isBuyer && hasBuyerProfile) {
    switchRole('BUYER');
  }

  return (
    <div className="min-h-screen bg-gray-100 -mx-4 -mt-4" dir="rtl">

      {/* ══════════ AMAZON HEADER ══════════ */}
      <div className="bg-[#15803d] sticky top-0 z-30 shadow-md">
        {/* Top row */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          {/* Logo */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-amber-400 text-xl font-black tracking-tight">جمارت</span>
            <span className="text-emerald-200 text-xs hidden sm:block">.sa</span>
          </div>

          {/* Location */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-emerald-100 flex-shrink-0">
            <MapPin size={12} className="text-amber-400" />
            <span>التوصيل إلى<br /><strong className="text-white text-[11px]">المملكة العربية السعودية</strong></span>
          </div>

          {/* Search bar */}
          <div className="flex flex-1 rounded-lg overflow-hidden border-2 border-amber-400">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder="ابحث في السوق الزراعي…"
              className="flex-1 px-4 py-2.5 text-sm text-gray-900 focus:outline-none"
            />
            <button
              onClick={doSearch}
              className="bg-amber-400 hover:bg-amber-500 px-4 flex items-center justify-center transition-colors"
            >
              <Search size={18} className="text-gray-900" />
            </button>
          </div>

          {/* Cart */}
          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 text-white hover:text-amber-300 transition-colors"
          >
            <ShoppingCart size={26} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-gray-900 text-[10px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                {cartCount}
              </span>
            )}
            <span className="text-xs font-bold hidden sm:block">السلة</span>
          </button>
        </div>

        {/* Category nav strip */}
        <div className="bg-[#1a6032] border-t border-[#1f7a3d]">
          <div className="flex items-center overflow-x-auto scrollbar-none px-3">
            <button
              onClick={() => { setCatId(''); setPage(1); }}
              className={cn(
                'flex-shrink-0 px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap',
                !catId ? 'text-amber-400 border-b-2 border-amber-400' : 'text-emerald-100 hover:text-white',
              )}
            >
              جميع الأقسام
            </button>
            {cats.map((c: any) => {
              const theme = getTheme(c.nameAr);
              return (
                <button
                  key={c.id}
                  onClick={() => { setCatId(c.id === catId ? '' : c.id); setPage(1); }}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap',
                    catId === c.id
                      ? 'text-amber-400 border-b-2 border-amber-400'
                      : 'text-emerald-100 hover:text-white',
                  )}
                >
                  <span>{theme.emoji}</span>
                  {c.nameAr || c.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════ BANNER CAROUSEL (admin-managed) ══════════ */}
      <BannerCarousel banners={banners} />

      {/* ══════════ MAIN CONTENT ══════════ */}
      <div className="max-w-screen-xl mx-auto px-4 py-4">

        {/* Trust badges row */}
        <TrustBadges />

        {/* Results bar */}
        <div className="flex items-center justify-between mb-4 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">
            {isLoading ? (
              <span className="text-gray-400">جارٍ البحث…</span>
            ) : (
              <>
                <strong className="text-gray-900">{meta?.total?.toLocaleString('ar-SA') ?? 0}</strong>
                {' '}نتيجة
                {liveSearch ? <> لـ <strong>"{liveSearch}"</strong></> : ''}
                {catId ? <> في <strong>{cats.find((c: any) => c.id === catId)?.nameAr}</strong></> : ''}
              </>
            )}
          </p>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-gray-400" />
            <select
              value={sortIdx}
              onChange={(e) => { setSortIdx(+e.target.value); setPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
            >
              {SORT_OPTS.map((s, i) => (
                <option key={i} value={i}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-6 bg-gray-200 rounded w-1/3" />
                  <div className="h-8 bg-gray-100 rounded" />
                  <div className="h-8 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : lots.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center shadow-sm">
            <Package size={52} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 text-base font-semibold">لا توجد منتجات متاحة</p>
            <p className="text-gray-400 text-sm mt-1">جرّب تغيير الفئة أو البحث</p>
            {(catId || liveSearch) && (
              <button
                onClick={() => { setCatId(''); setSearch(''); setLiveSearch(''); setPage(1); }}
                className="mt-4 text-emerald-600 text-sm hover:underline font-semibold"
              >
                إزالة الفلاتر
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {lots.map((lot: any) => {
                const inCart = cart.find((c) => c.lotId === lot.id);
                return (
                  <ProductCard
                    key={lot.id}
                    lot={lot}
                    inCart={inCart}
                    onAddToCart={() => addToCart(lot)}
                    onQuickOrder={() => router.push(`/marketplace/${lot.id}`)}
                    onUpdateQty={(qty) => updateQty(lot.id, qty)}
                    onRemoveFromCart={() => removeFromCart(lot.id)}
                  />
                );
              })}
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight size={16} /> السابق
                </button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={cn(
                          'w-9 h-9 rounded-lg text-sm font-bold transition-colors',
                          p === page
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                  {meta.totalPages > 7 && <span className="text-gray-400">…</span>}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages || isFetching}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  التالي <ChevronLeft size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════ CART DRAWER ══════════ */}
      {showCart && (
        <CartDrawer
          cart={cart}
          onClose={() => setShowCart(false)}
          onUpdate={updateQty}
          onRemove={removeFromCart}
          onCheckout={handleCheckout}
          ordering={ordering}
          checkoutError={checkoutError}
          zones={zones}
          branches={branches}
        />
      )}

      {/* Floating cart button */}
      {cartCount > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 left-6 z-20 bg-amber-400 hover:bg-amber-500 text-gray-900 font-black px-5 py-3.5 rounded-2xl shadow-lg flex items-center gap-2.5 transition-all hover:scale-105"
        >
          <ShoppingCart size={20} />
          السلة
          <span className="bg-gray-900 text-white text-xs font-black min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1">
            {cartCount}
          </span>
          <span className="text-sm font-bold">
            {formatCurrency(cart.reduce((s, c) => s + c.qty * c.price, 0))}
          </span>
        </button>
      )}
    </div>
  );
}
