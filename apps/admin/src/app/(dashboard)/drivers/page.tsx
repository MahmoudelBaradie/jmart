'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { driversApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import StatusBadge from '@/components/shared/StatusBadge';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import { Search, Truck } from 'lucide-react';

export default function DriversPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', page, search],
    queryFn: () =>
      driversApi.list({ page, limit, search: search || undefined }).then((r) => r.data),
  });

  const drivers = data?.data || [];
  const meta = data?.meta;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Input
          placeholder="Search driver name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          leftIcon={<Search size={14} />}
          className="max-w-xs"
        />
      </div>

      <Card noPadding>
        {isLoading ? (
          <PageSpinner />
        ) : drivers.length === 0 ? (
          <EmptyState icon={Truck} title="No drivers found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Full Name</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Vehicle Type</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Plate</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Capacity (kg)</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {drivers.map((d: {
                    id: string;
                    fullName: string;
                    vehicleType: string;
                    vehiclePlate?: string;
                    vehicleCapacityKg?: number;
                    status: string;
                    createdAt: string;
                  }) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/drivers/${d.id}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{d.fullName}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{d.vehicleType?.toLowerCase()}</td>
                      <td className="px-4 py-3 text-gray-500">{d.vehiclePlate || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{d.vehicleCapacityKg ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(d.createdAt)}</td>
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
