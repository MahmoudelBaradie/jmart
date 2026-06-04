'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/shared/StatusBadge';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { Search, Plus, ShoppingBag, Pencil, PowerOff, Tag, DollarSign, X, Check } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  nameAr?: string;
  unitOfMeasure: string;
  minOrderQty: number;
  maxOrderQty?: number;
  gradeOptions: string[];
  isActive: boolean;
  categoryId: string;
  category: { id: string; name: string; nameAr?: string; code: string };
  listingsCount?: number;
  pricePerUnit?: number | string | null;
}

interface Category {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
}

const UNITS = [
  { value: 'KG', label: 'كيلوغرام (KG)' },
  { value: 'TON', label: 'طن (TON)' },
  { value: 'PIECE', label: 'قطعة (PIECE)' },
  { value: 'BOX', label: 'صندوق (BOX)' },
  { value: 'CRATE', label: 'صناديق (CRATE)' },
  { value: 'LITER', label: 'لتر (LITER)' },
];

interface FormState {
  categoryId: string;
  sku: string;
  name: string;
  nameAr: string;
  unitOfMeasure: string;
  minOrderQty: string;
  maxOrderQty: string;
  gradeOptions: string;
}

const emptyForm: FormState = {
  categoryId: '',
  sku: '',
  name: '',
  nameAr: '',
  unitOfMeasure: 'KG',
  minOrderQty: '1',
  maxOrderQty: '',
  gradeOptions: 'A,B',
};

export default function ProductsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [priceFor, setPriceFor] = useState<Product | null>(null);
  const limit = 25;

  // ── Data ──────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, catFilter, activeFilter],
    queryFn: () =>
      productsApi.list({
        page, limit,
        search: search || undefined,
        categoryId: catFilter || undefined,
        isActive: activeFilter !== '' ? activeFilter === 'true' : undefined,
      }).then((r) => r.data),
  });

  const { data: catsData } = useQuery({
    queryKey: ['categories-flat'],
    queryFn: () => categoriesApi.flat().then((r) => r.data),
  });

  const categories: Category[] = catsData || [];
  const catOptions = [
    { value: '', label: 'كل الأصناف' },
    ...categories.map((c) => ({ value: c.id, label: `${c.nameAr || c.name} (${c.code})` })),
  ];
  const catFormOptions = [
    { value: '', label: 'اختر الصنف *' },
    ...categories.map((c) => ({ value: c.id, label: `${c.nameAr || c.name} (${c.code})` })),
  ];

  // ── Mutations ─────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingId ? productsApi.update(editingId, payload) : productsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'خطأ في الحفظ');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      productsApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  // ── Helpers ───────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm);
    setFormError('');
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      categoryId: p.categoryId,
      sku: p.sku,
      name: p.name,
      nameAr: p.nameAr || '',
      unitOfMeasure: p.unitOfMeasure,
      minOrderQty: String(p.minOrderQty),
      maxOrderQty: p.maxOrderQty ? String(p.maxOrderQty) : '',
      gradeOptions: p.gradeOptions.join(','),
    });
    setFormError('');
    setEditingId(p.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormError('');
  };

  const setF = (f: keyof FormState, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const submitForm = () => {
    if (!form.categoryId || !form.sku || !form.name || !form.unitOfMeasure) {
      setFormError('الصنف، الكود، الاسم، ووحدة القياس مطلوبة');
      return;
    }
    const grades = form.gradeOptions.split(',').map((g) => g.trim()).filter(Boolean);
    saveMutation.mutate({
      categoryId: form.categoryId,
      sku: form.sku,
      name: form.name,
      nameAr: form.nameAr || undefined,
      unitOfMeasure: form.unitOfMeasure,
      minOrderQty: parseFloat(form.minOrderQty) || 1,
      maxOrderQty: form.maxOrderQty ? parseFloat(form.maxOrderQty) : undefined,
      gradeOptions: grades,
    });
  };

  const products: Product[] = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">المنتجات</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            إدارة قائمة المنتجات المتاحة في النظام
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus size={14} className="mr-1" />
          منتج جديد
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="بحث بالاسم أو SKU…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          leftIcon={<Search size={14} />}
          className="max-w-xs"
        />
        <Select
          options={catOptions}
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
          className="w-52"
        />
        <Select
          options={[
            { value: '', label: 'كل الحالات' },
            { value: 'true', label: 'نشط فقط' },
            { value: 'false', label: 'غير نشط فقط' },
          ]}
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
          className="w-36"
        />
        {meta && (
          <span className="text-sm text-gray-400">{meta.total} منتج</span>
        )}
      </div>

      {/* Table */}
      <Card noPadding>
        {isLoading ? (
          <PageSpinner />
        ) : products.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="لا توجد منتجات" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">المنتج</th>
                    <th className="px-4 py-3 font-medium text-gray-600">SKU</th>
                    <th className="px-4 py-3 font-medium text-gray-600">الصنف</th>
                    <th className="px-4 py-3 font-medium text-gray-600">الوحدة</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-center">السعر المركزي</th>
                    <th className="px-4 py-3 font-medium text-gray-600">الدرجات</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-center">العروض</th>
                    <th className="px-4 py-3 font-medium text-gray-600">الحالة</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.nameAr || p.name}</p>
                        {p.nameAr && <p className="text-xs text-gray-400">{p.name}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {p.sku}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Tag size={12} className="text-brand-500" />
                          <span className="text-gray-600 text-sm">
                            {p.category.nameAr || p.category.name}
                          </span>
                          <span className="text-xs text-gray-400">({p.category.code})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.unitOfMeasure}</td>
                      <td className="px-4 py-3 text-center">
                        {p.pricePerUnit ? (
                          <span className="text-brand-700 font-bold text-sm">
                            {Number(p.pricePerUnit).toFixed(2)} <span className="text-xs text-gray-400 font-normal">ر.س</span>
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">⚠ غير محدد</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {p.gradeOptions.map((g) => (
                            <span key={g} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                              {g}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-gray-600">
                          {p.listingsCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPriceFor(p)}
                            className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700"
                            title="تعديل السعر المركزي"
                          >
                            <DollarSign size={14} />
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                            title="تعديل"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => toggleMutation.mutate({ id: p.id, isActive: !p.isActive })}
                            className={`p-1.5 rounded text-gray-400 transition-colors ${
                              p.isActive ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-green-50 hover:text-green-600'
                            }`}
                            title={p.isActive ? 'تعطيل' : 'تفعيل'}
                          >
                            <PowerOff size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                limit={limit}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Card>

      {priceFor && (
        <SetPriceModal product={priceFor} onClose={() => setPriceFor(null)} />
      )}

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingId ? 'تعديل منتج' : 'إضافة منتج جديد'}
        size="md"
      >
        <div className="p-5 space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <Select
            label="الصنف *"
            options={catFormOptions}
            value={form.categoryId}
            onChange={(e) => setF('categoryId', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="كود المنتج (SKU) *"
              placeholder="مثال: VEG-TOM-003"
              value={form.sku}
              onChange={(e) => setF('sku', e.target.value.toUpperCase())}
              required
            />
            <Select
              label="وحدة القياس *"
              options={UNITS}
              value={form.unitOfMeasure}
              onChange={(e) => setF('unitOfMeasure', e.target.value)}
            />
          </div>

          <Input
            label="الاسم بالعربية"
            placeholder="مثال: طماطم"
            value={form.nameAr}
            onChange={(e) => setF('nameAr', e.target.value)}
          />

          <Input
            label="الاسم بالإنجليزية *"
            placeholder="مثال: Tomatoes"
            value={form.name}
            onChange={(e) => setF('name', e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="الحد الأدنى للطلب"
              type="number"
              min="0.1"
              step="0.1"
              value={form.minOrderQty}
              onChange={(e) => setF('minOrderQty', e.target.value)}
            />
            <Input
              label="الحد الأقصى (اختياري)"
              type="number"
              min="1"
              value={form.maxOrderQty}
              onChange={(e) => setF('maxOrderQty', e.target.value)}
            />
          </div>

          <Input
            label="درجات الجودة (مفصولة بفاصلة)"
            placeholder="A,B,C"
            value={form.gradeOptions}
            onChange={(e) => setF('gradeOptions', e.target.value)}
          />

          <div className="flex gap-3 pt-2">
            <Button
              onClick={submitForm}
              loading={saveMutation.isPending}
              className="flex-1"
            >
              {editingId ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </Button>
            <Button variant="secondary" onClick={closeModal}>
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Set central price (cascades to every farmer catalog item) ───────────────
function SetPriceModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const qc = useQueryClient();
  const [price, setPrice] = useState(
    product.pricePerUnit != null ? String(Number(product.pricePerUnit)) : '',
  );

  const mut = useMutation({
    mutationFn: () => productsApi.setCentralPrice(product.id, Number(price)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
  });

  const err = (mut.error as any)?.response?.data?.message;
  const valid = Number(price) > 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-600" />
            <h2 className="font-bold text-gray-900">السعر المركزي للمنتج</h2>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-bold text-gray-900">{product.nameAr ?? product.name}</p>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{product.sku}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 leading-relaxed">
            💡 السعر الذي تحدّده هنا هو <strong>السعر الرسمي</strong> للمنتج. لن يستطيع أي مزارع تغييره، وسيُطبَّق فوراً على جميع العروض النشطة وكل الطلبات الجديدة.
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
              {Array.isArray(err) ? err[0] : err}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">السعر (ر.س / {product.unitOfMeasure}) *</label>
            <input
              type="number" step="0.01" min="0.01"
              value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="مثلاً 15.50"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              autoFocus
            />
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-100">
            إلغاء
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!valid || mut.isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-1"
          >
            <Check size={14} /> {mut.isPending ? 'جارٍ الحفظ…' : 'حفظ وتطبيق'}
          </button>
        </div>
      </div>
    </div>
  );
}
