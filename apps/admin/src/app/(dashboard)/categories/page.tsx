'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import {
  Search,
  Plus,
  Tag,
  Package,
  ChevronDown,
  ChevronRight,
  Pencil,
  PowerOff,
  Thermometer,
  Clock,
  DollarSign,
} from 'lucide-react';
import PricingOverrideEditor from '@/components/pricing/PricingOverrideEditor';

interface Category {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  storageType: string;
  tempMinC?: number;
  tempMaxC?: number;
  maxHoursTransit?: number;
  isActive: boolean;
  parentId?: string;
  parent?: { id: string; name: string; nameAr?: string };
  productsCount: number;
  childrenCount: number;
  createdAt: string;
}

interface CategoryDetail extends Category {
  children: { id: string; name: string; nameAr?: string; code: string; isActive: boolean }[];
  products: { id: string; sku: string; name: string; nameAr?: string; unitOfMeasure: string; isActive: boolean }[];
}

const STORAGE_TYPES = [
  { value: '', label: 'All Storage Types' },
  { value: 'AMBIENT', label: 'Ambient' },
  { value: 'REFRIGERATED', label: 'Refrigerated' },
  { value: 'FROZEN', label: 'Frozen' },
  { value: 'DRY', label: 'Dry' },
  { value: 'CONTROLLED', label: 'Controlled' },
];

const STORAGE_TYPES_FORM = STORAGE_TYPES.filter((s) => s.value !== '');

const storageColors: Record<string, string> = {
  AMBIENT: 'bg-yellow-100 text-yellow-800',
  REFRIGERATED: 'bg-blue-100 text-blue-800',
  FROZEN: 'bg-indigo-100 text-indigo-800',
  DRY: 'bg-amber-100 text-amber-800',
  CONTROLLED: 'bg-purple-100 text-purple-800',
};

const storageLabels: Record<string, string> = {
  AMBIENT: 'Ambient',
  REFRIGERATED: 'Refrigerated',
  FROZEN: 'Frozen',
  DRY: 'Dry',
  CONTROLLED: 'Controlled Atmosphere',
};

interface FormState {
  code: string;
  name: string;
  nameAr: string;
  storageType: string;
  parentId: string;
  tempMinC: string;
  tempMaxC: string;
  maxHoursTransit: string;
}

const emptyForm: FormState = {
  code: '',
  name: '',
  nameAr: '',
  storageType: 'AMBIENT',
  parentId: '',
  tempMinC: '',
  tempMaxC: '',
  maxHoursTransit: '',
};

export default function CategoriesPage() {
  const qc = useQueryClient();

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterStorage, setFilterStorage] = useState('');
  const [filterParent, setFilterParent] = useState('');

  // ── Detail panel ──────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Single piece of state for "which category's pricing-override modal is open".
  // null = closed. We carry the name so the modal title can show it.
  const [pricingFor, setPricingFor] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: listData, isLoading } = useQuery({
    queryKey: ['categories', search, filterStorage, filterParent],
    queryFn: () =>
      categoriesApi
        .list({
          search: search || undefined,
          limit: 100,
          parentId: filterParent || undefined,
        })
        .then((r) => r.data),
  });

  const { data: flatData } = useQuery({
    queryKey: ['categories-flat'],
    queryFn: () => categoriesApi.flat().then((r) => r.data),
  });

  const { data: selectedData, isLoading: loadingSelected } = useQuery<CategoryDetail>({
    queryKey: ['category', selectedId],
    enabled: !!selectedId,
    queryFn: () => categoriesApi.get(selectedId!).then((r) => r.data),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => categoriesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['categories-flat'] });
      setShowCreate(false);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Error creating category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      categoriesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['categories-flat'] });
      qc.invalidateQueries({ queryKey: ['category', editingId] });
      setEditingId(null);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Error updating category');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['category', selectedId] });
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const openEdit = (cat: Category) => {
    setForm({
      code: cat.code,
      name: cat.name,
      nameAr: cat.nameAr || '',
      storageType: cat.storageType,
      parentId: cat.parentId || '',
      tempMinC: cat.tempMinC?.toString() || '',
      tempMaxC: cat.tempMaxC?.toString() || '',
      maxHoursTransit: cat.maxHoursTransit?.toString() || '',
    });
    setFormError('');
    setEditingId(cat.id);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormError('');
    setShowCreate(true);
  };

  const submitForm = () => {
    if (!form.code || !form.name || !form.storageType) {
      setFormError('Code, name and storage type are required');
      return;
    }
    const payload: Record<string, unknown> = {
      code: form.code,
      name: form.name,
      nameAr: form.nameAr || undefined,
      storageType: form.storageType,
      parentId: form.parentId || undefined,
      tempMinC: form.tempMinC ? parseFloat(form.tempMinC) : undefined,
      tempMaxC: form.tempMaxC ? parseFloat(form.tempMaxC) : undefined,
      maxHoursTransit: form.maxHoursTransit ? parseInt(form.maxHoursTransit) : undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ── Filter categories ─────────────────────────────────────────────────────
  const categories: Category[] = listData?.data || [];
  const filtered = categories.filter((c) => {
    if (filterStorage && c.storageType !== filterStorage) return false;
    return true;
  });

  const parentOptions = [
    { value: '', label: 'No parent (root category)' },
    ...(flatData || [])
      .filter((c: Category) => c.id !== editingId)
      .map((c: Category) => ({ value: c.id, label: `${c.nameAr || c.name} (${c.code})` })),
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Product Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage product categories and their storage requirements
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus size={14} className="mr-1" />
          New Category
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name, code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={14} />}
          className="max-w-xs"
        />
        <Select
          options={STORAGE_TYPES}
          value={filterStorage}
          onChange={(e) => setFilterStorage(e.target.value)}
          className="w-48"
        />
        <Select
          options={[
            { value: '', label: 'All levels' },
            { value: 'null', label: 'Root categories only' },
          ]}
          value={filterParent}
          onChange={(e) => setFilterParent(e.target.value)}
          className="w-48"
        />
        <span className="text-sm text-gray-400">
          {filtered.length} categories
        </span>
      </div>

      {/* Main layout: list + detail */}
      <div className="flex gap-5 items-start">
        {/* Categories list */}
        <div className="flex-1 min-w-0">
          <Card noPadding>
            {isLoading ? (
              <PageSpinner />
            ) : filtered.length === 0 ? (
              <EmptyState icon={Tag} title="No categories found" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left">
                      <th className="px-4 py-3 font-medium text-gray-600">Category</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Code</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Storage</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Parent</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-center">Products</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-center">Sub</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((cat) => (
                      <tr
                        key={cat.id}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                          selectedId === cat.id ? 'bg-brand-50' : ''
                        }`}
                        onClick={() => setSelectedId(selectedId === cat.id ? null : cat.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{cat.nameAr || cat.name}</div>
                          {cat.nameAr && (
                            <div className="text-xs text-gray-400">{cat.name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {cat.code}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              storageColors[cat.storageType] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {storageLabels[cat.storageType] || cat.storageType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm">
                          {cat.parent ? cat.parent.nameAr || cat.parent.name : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-gray-600">
                            <Package size={12} />
                            {cat.productsCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">
                          {cat.childrenCount > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <Tag size={12} />
                              {cat.childrenCount}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={cat.isActive ? 'ACTIVE' : 'INACTIVE'} />
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => openEdit(cat)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setPricingFor({ id: cat.id, name: cat.nameAr || cat.name })}
                              className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600"
                              title="إعدادات التسعير"
                            >
                              <DollarSign size={14} />
                            </button>
                            {cat.isActive && (
                              <button
                                onClick={() => deactivateMutation.mutate(cat.id)}
                                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                                title="Deactivate"
                              >
                                <PowerOff size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Detail panel */}
        {selectedId && (
          <div className="w-80 flex-shrink-0">
            <Card className="p-4 space-y-4">
              {loadingSelected ? (
                <PageSpinner />
              ) : selectedData ? (
                <>
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {selectedData.nameAr || selectedData.name}
                        </h3>
                        {selectedData.nameAr && (
                          <p className="text-xs text-gray-400">{selectedData.name}</p>
                        )}
                      </div>
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {selectedData.code}
                      </span>
                    </div>
                  </div>

                  {/* Storage info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Thermometer size={14} />
                      <span>
                        {storageLabels[selectedData.storageType]}
                        {selectedData.tempMinC != null && selectedData.tempMaxC != null
                          ? ` (${selectedData.tempMinC}°C – ${selectedData.tempMaxC}°C)`
                          : ''}
                      </span>
                    </div>
                    {selectedData.maxHoursTransit && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock size={14} />
                        <span>Max {selectedData.maxHoursTransit}h transit</span>
                      </div>
                    )}
                  </div>

                  {/* Products */}
                  {selectedData.products && selectedData.products.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Products ({selectedData.productsCount})
                      </h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {selectedData.products.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between text-sm py-1 border-b border-gray-50"
                          >
                            <span className="text-gray-700">{p.nameAr || p.name}</span>
                            <span className="text-xs text-gray-400 font-mono">{p.unitOfMeasure}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-categories */}
                  {selectedData.children && selectedData.children.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Sub-categories ({selectedData.childrenCount})
                      </h4>
                      <div className="space-y-1">
                        {selectedData.children.map((ch) => (
                          <div key={ch.id} className="flex items-center gap-2 text-sm text-gray-600">
                            <ChevronRight size={12} className="text-gray-400" />
                            {ch.nameAr || ch.name}
                            {!ch.isActive && (
                              <span className="text-xs text-red-400">(inactive)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </Card>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={showCreate || !!editingId}
        onClose={() => {
          setShowCreate(false);
          setEditingId(null);
          setFormError('');
        }}
        title={editingId ? 'Edit Category' : 'New Category'}
        size="md"
      >
        <div className="p-5 space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code"
              placeholder="e.g. VEG"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              required
            />
            <Select
              label="Storage Type"
              options={STORAGE_TYPES_FORM}
              value={form.storageType}
              onChange={(e) => setForm((p) => ({ ...p, storageType: e.target.value }))}
            />
          </div>

          <Input
            label="Name (English)"
            placeholder="e.g. Vegetables"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />

          <Input
            label="Name (Arabic)"
            placeholder="e.g. خضروات"
            value={form.nameAr}
            onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
          />

          <Select
            label="Parent Category (optional)"
            options={parentOptions}
            value={form.parentId}
            onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Min Temp (°C)"
              type="number"
              placeholder="e.g. 2"
              value={form.tempMinC}
              onChange={(e) => setForm((p) => ({ ...p, tempMinC: e.target.value }))}
            />
            <Input
              label="Max Temp (°C)"
              type="number"
              placeholder="e.g. 8"
              value={form.tempMaxC}
              onChange={(e) => setForm((p) => ({ ...p, tempMaxC: e.target.value }))}
            />
            <Input
              label="Max Transit (hrs)"
              type="number"
              placeholder="e.g. 24"
              value={form.maxHoursTransit}
              onChange={(e) => setForm((p) => ({ ...p, maxHoursTransit: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={submitForm}
              loading={createMutation.isPending || updateMutation.isPending}
              className="flex-1"
            >
              {editingId ? 'Save Changes' : 'Create Category'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreate(false);
                setEditingId(null);
                setFormError('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {pricingFor && (
        <PricingOverrideEditor
          entityType="category"
          entityId={pricingFor.id}
          entityName={pricingFor.name}
          onClose={() => setPricingFor(null)}
        />
      )}
    </div>
  );
}
