'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { warehousesApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import StatusBadge from '@/components/shared/StatusBadge';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { Search, Warehouse } from 'lucide-react';

export default function WarehousesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', page, search],
    queryFn: () =>
      warehousesApi.list({ page, limit, search: search || undefined }).then((r) => r.data),
  });

  const warehouses = data?.data || [];
  const meta = data?.meta;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Input
          placeholder="Search warehouse…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          leftIcon={<Search size={14} />}
          className="max-w-xs"
        />
      </div>

      <Card noPadding>
        {isLoading ? (
          <PageSpinner />
        ) : warehouses.length === 0 ? (
          <EmptyState icon={Warehouse} title="No warehouses found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Code</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="px-4 py-3 font-medium text-gray-600">City</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Capacity (m³)</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Manager</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Schema fields are warehouseName / warehouseCode /
                      totalCapacityM3 / geoZone / status — earlier the UI
                      tried to read `name`, `city`, `capacityCubicMeters`
                      and every row collapsed to em-dashes. */}
                  {warehouses.map((w: {
                    id: string;
                    warehouseName?: string;
                    warehouseCode?: string;
                    totalCapacityM3?: number | string;
                    manager?: { fullName: string };
                    geoZone?: { zoneName?: string; zoneNameAr?: string };
                    status?: string;
                  }) => (
                    <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{w.warehouseName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{w.warehouseCode || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">—</td>
                      <td className="px-4 py-3 text-gray-600">{w.geoZone?.zoneNameAr ?? w.geoZone?.zoneName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{w.totalCapacityM3 != null ? `${Number(w.totalCapacityM3)} m³` : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{w.manager?.fullName || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={w.status ?? 'INACTIVE'} />
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
    </div>
  );
}
