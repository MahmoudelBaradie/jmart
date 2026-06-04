'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StatusBadge from '@/components/shared/StatusBadge';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatNumber } from '@/lib/utils';
import { Search, Package, Layers } from 'lucide-react';

const TABS = ['Catalog', 'Lots'] as const;
type Tab = (typeof TABS)[number];

const LOT_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'QUARANTINED', label: 'Quarantined' },
  { value: 'EXPIRED', label: 'Expired' },
];

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('Catalog');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lotStatus, setLotStatus] = useState('');
  const limit = 20;

  const { data: catalogData, isLoading: loadingCatalog } = useQuery({
    queryKey: ['catalog', page, search],
    enabled: tab === 'Catalog',
    queryFn: () =>
      inventoryApi.catalog({ page, limit, search: search || undefined }).then((r) => r.data),
  });

  const { data: lotsData, isLoading: loadingLots } = useQuery({
    queryKey: ['lots', page, search, lotStatus],
    enabled: tab === 'Lots',
    queryFn: () =>
      inventoryApi.lots({ page, limit, search: search || undefined, status: lotStatus || undefined }).then((r) => r.data),
  });

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); setSearch(''); setLotStatus(''); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder={tab === 'Catalog' ? 'Search products…' : 'Search lot number…'}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          leftIcon={<Search size={14} />}
          className="max-w-xs"
        />
        {tab === 'Lots' && (
          <Select
            options={LOT_STATUSES}
            value={lotStatus}
            onChange={(e) => { setLotStatus(e.target.value); setPage(1); }}
            className="w-44"
          />
        )}
      </div>

      {tab === 'Catalog' && (
        <Card noPadding>
          {loadingCatalog ? (
            <PageSpinner />
          ) : (catalogData?.data || []).length === 0 ? (
            <EmptyState icon={Package} title="No products found" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left">
                      <th className="px-4 py-3 font-medium text-gray-600">Product</th>
                      <th className="px-4 py-3 font-medium text-gray-600">SKU</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Category</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Unit</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Base Price</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {catalogData?.data?.map((row: {
                      id: string;
                      pricePerUnit?: number | string;
                      availableQty?: number | string;
                      isListed?: boolean;
                      product?: {
                        name: string;
                        nameAr?: string;
                        sku?: string;
                        unitOfMeasure?: string;
                        category?: { name: string; nameAr?: string };
                      };
                    }) => {
                      // catalog rows are FarmerCatalogItem records — the
                      // product details are nested. Earlier the UI tried to
                      // read these as flat fields and every column came back
                      // empty.
                      const p = row.product ?? ({} as any);
                      return (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{p.nameAr ?? p.name ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{p.category?.nameAr ?? p.category?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{p.unitOfMeasure || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{row.pricePerUnit ? `SAR ${Number(row.pricePerUnit).toFixed(2)}` : '—'}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={row.isListed ? 'ACTIVE' : 'INACTIVE'} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {catalogData?.meta && (
                <Pagination
                  page={catalogData.meta.page}
                  totalPages={catalogData.meta.totalPages}
                  total={catalogData.meta.total}
                  limit={limit}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </Card>
      )}

      {tab === 'Lots' && (
        <Card noPadding>
          {loadingLots ? (
            <PageSpinner />
          ) : (lotsData?.data || []).length === 0 ? (
            <EmptyState icon={Layers} title="No lots found" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left">
                      <th className="px-4 py-3 font-medium text-gray-600">Lot #</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Product</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Farmer</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Qty (kg)</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Available</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Harvest Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lotsData?.data?.map((l: {
                      id: string;
                      lotNumber: string;
                      product?: { name: string };
                      farmer?: { businessName: string };
                      totalQty: number;
                      availableQty: number;
                      status: string;
                      harvestDate?: string;
                    }) => (
                      <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-brand-700">{l.lotNumber}</td>
                        <td className="px-4 py-3 text-gray-900">{l.product?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{l.farmer?.businessName || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{formatNumber(l.totalQty)}</td>
                        <td className="px-4 py-3 text-gray-600">{formatNumber(l.availableQty)}</td>
                        <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                        <td className="px-4 py-3 text-gray-500">{l.harvestDate ? formatDate(l.harvestDate) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lotsData?.meta && (
                <Pagination
                  page={lotsData.meta.page}
                  totalPages={lotsData.meta.totalPages}
                  total={lotsData.meta.total}
                  limit={limit}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
