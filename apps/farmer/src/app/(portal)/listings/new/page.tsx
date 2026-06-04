'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { listingsApi, categoriesApi, farmerApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { ChevronRight, CheckCircle, AlertCircle, Tag, MapPin } from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  productsCount: number;
}

interface Product {
  id: string;
  name: string;
  nameAr?: string;
  unitOfMeasure: string;
  category: { id: string; name: string; nameAr?: string };
}

interface Farm {
  id: string;
  farmName?: string;
  farmCode?: string;
  city?: string;
}

export default function NewListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const farmerId: string | undefined = user?.farmer?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [farmId, setFarmId] = useState('');

  const [form, setForm] = useState({
    productId: '',
    grade: 'A',
    packaging: '',
    totalWeightKg: '',
    pricePerKg: '',
    harvestDate: '',
    expiryDate: '',
    notes: '',
  });

  const GRADES = ['A', 'B', 'C', 'Premium', 'Super Extra'];
  const PACKAGING_OPTS = ['BULK', 'crate', 'sack', 'box', 'pallet', 'bag'];

  // ── جلب مزارع المستخدم (مطلوب لإنشاء العرض) ─────────────────
  const { data: farmsData } = useQuery({
    queryKey: ['my-farms', farmerId],
    queryFn: () => farmerApi.myFarms(farmerId!).then((r) => r.data),
    enabled: !!farmerId,
  });
  const farms: Farm[] = farmsData || [];

  // Auto-select if exactly one farm
  if (farms.length === 1 && !farmId) {
    setFarmId(farms[0].id);
  }

  // ── جلب الأصناف ──────────────────────────────────────────────
  const { data: catsData } = useQuery({
    queryKey: ['categories-flat'],
    queryFn: () => categoriesApi.flat().then((r) => r.data),
  });

  // ── جلب المنتجات (مفلترة بالصنف) ────────────────────────────
  const { data: productsData } = useQuery({
    queryKey: ['products', selectedCategory],
    queryFn: () =>
      categoriesApi
        .products({ categoryId: selectedCategory || undefined, isActive: true })
        .then((r) => r.data),
  });

  const categories: Category[] = (catsData || []).filter((c: Category) => c.productsCount > 0);
  const products: Product[] = productsData || [];
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setForm((p) => ({ ...p, productId: '' })); // reset product on category change
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!farmId) {
        throw new Error('يجب اختيار المزرعة قبل نشر العرض');
      }
      await listingsApi.create({
        farmId,
        productId: form.productId,
        grade: form.grade,
        packaging: form.packaging || 'BULK',
        totalWeightKg: parseFloat(form.totalWeightKg),
        pricePerKg: parseFloat(form.pricePerKg),
        harvestDate: form.harvestDate || undefined,
        expiryDate: form.expiryDate || undefined,
        notes: form.notes || undefined,
      });
      setSuccess(true);
      setTimeout(() => router.push('/listings'), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="sm:p-6 flex items-center justify-center min-h-64">
        <div className="text-center">
          <CheckCircle size={48} className="text-brand-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">تم نشر العرض بنجاح!</h2>
          <p className="text-gray-500 text-sm mt-1">سيتمكن المشترون من رؤيته قريباً</p>
        </div>
      </div>
    );
  }

  const selectedProduct = products.find((p) => p.id === form.productId);

  return (
    <div className="sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/listings" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronRight size={18} className="text-gray-500" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">نشر عرض جديد</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Farm selection — required by API */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <MapPin size={14} className="text-brand-500" />
            المزرعة *
          </h2>
          {farms.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
              <p className="text-amber-800 font-medium mb-1">لا توجد مزرعة مسجَّلة بعد</p>
              <p className="text-amber-700 text-xs mb-3">
                لا يمكنك نشر عرض دون ربطه بمزرعة. الرجاء إضافة مزرعة من صفحة الملف الشخصي أولاً.
              </p>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 underline"
              >
                الانتقال للملف الشخصي
              </Link>
            </div>
          ) : farms.length === 1 ? (
            <div className="text-sm text-gray-700 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <span className="font-medium">{farms[0].farmName || farms[0].farmCode || 'المزرعة'}</span>
              {farms[0].city && <span className="text-gray-500 mr-2">• {farms[0].city}</span>}
            </div>
          ) : (
            <select
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">اختر المزرعة</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.farmName || f.farmCode}
                  {f.city ? ` — ${f.city}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Product selection */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">معلومات المنتج</h2>

          {/* Step 1: Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Tag size={13} className="text-brand-500" />
              الصنف
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleCategoryChange('')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  !selectedCategory
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                }`}
              >
                الكل
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    selectedCategory === cat.id
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                  }`}
                >
                  {cat.nameAr || cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Product */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              نوع المنتج *
            </label>
            <select
              value={form.productId}
              onChange={(e) => set('productId', e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">
                {products.length === 0 ? 'لا توجد منتجات في هذا الصنف' : 'اختر المنتج'}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameAr || p.name} ({p.unitOfMeasure})
                </option>
              ))}
            </select>
            {selectedProduct && (
              <p className="mt-1 text-xs text-gray-400">
                وحدة القياس: <span className="font-medium text-gray-600">{selectedProduct.unitOfMeasure}</span>
              </p>
            )}
          </div>

          {/* Grade + Packaging */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الدرجة *</label>
              <select
                value={form.grade}
                onChange={(e) => set('grade', e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">التعبئة *</label>
              <select
                value={form.packaging}
                onChange={(e) => set('packaging', e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="">اختر نوع التعبئة</option>
                {PACKAGING_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Qty + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                الوزن الكلي (كغ) *
              </label>
              <input
                type="number"
                min="1"
                value={form.totalWeightKg}
                onChange={(e) => set('totalWeightKg', e.target.value)}
                required
                placeholder="مثال: 500"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                السعر (ر.س / كغ) *
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={form.pricePerKg}
                onChange={(e) => set('pricePerKg', e.target.value)}
                required
                placeholder="مثال: 4.5"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">التواريخ</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">تاريخ الحصاد</label>
              <input
                type="date"
                value={form.harvestDate}
                onChange={(e) => set('harvestDate', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">تاريخ الانتهاء</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => set('expiryDate', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات إضافية</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            placeholder="معلومات إضافية عن المنتج، طريقة التخزين، الشروط…"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !farmId || !form.productId || !form.packaging || !form.totalWeightKg || !form.pricePerKg}
          className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {loading ? 'جارٍ النشر…' : 'نشر العرض'}
        </button>
      </form>
    </div>
  );
}
