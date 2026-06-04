'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { qualityApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StatusBadge from '@/components/shared/StatusBadge';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import StatCard from '@/components/shared/StatCard';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Star, CheckCircle, XCircle, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';

const INSPECTION_RESULTS = [
  { value: '', label: 'All Results' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'PARTIAL_PASS', label: 'Partial Pass' },
];

const INSPECTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'INBOUND', label: 'Inbound' },
  { value: 'PRE_DISPATCH', label: 'Pre-Dispatch' },
  { value: 'ON_DELIVERY', label: 'On Delivery' },
  { value: 'SPOT_CHECK', label: 'Spot Check' },
];

export default function QualityPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState('');
  const [inspectionType, setInspectionType] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['quality', page, result, inspectionType],
    queryFn: () =>
      qualityApi.list({
        page,
        limit,
        result: result || undefined,
        inspectionType: inspectionType || undefined,
      }).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['quality-stats'],
    queryFn: () => qualityApi.stats().then((r) => r.data),
  });

  const inspections = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Reports" value={stats.total} icon={Star} color="blue" />
          <StatCard label="Accepted" value={stats.passed} icon={ThumbsUp} color="green" />
          <StatCard label="Rejected" value={stats.failed} icon={ThumbsDown} color="red" />
          <StatCard label="Partial" value={stats.partialPass} icon={CheckCircle} color="yellow" />
          <StatCard label="Pending Today" value={stats.pendingToday} icon={Clock} color="indigo" />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          options={INSPECTION_RESULTS}
          value={result}
          onChange={(e) => { setResult(e.target.value); setPage(1); }}
          className="w-44"
        />
        <Select
          options={INSPECTION_TYPES}
          value={inspectionType}
          onChange={(e) => { setInspectionType(e.target.value); setPage(1); }}
          className="w-44"
        />
      </div>

      <Card noPadding>
        {isLoading ? (
          <PageSpinner />
        ) : inspections.length === 0 ? (
          <EmptyState icon={Star} title="No inspections found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Inspection #</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Lot</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Inspector</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Result</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Created</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inspections.map((i: {
                    id: string;
                    inspectionNumber: string;
                    inspectionType: string;
                    lot?: { lotNumber: string };
                    inspector?: { fullName: string };
                    result: string;
                    createdAt: string;
                    completedAt?: string;
                  }) => (
                    <tr key={i.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/quality/${i.id}`}>
                      <td className="px-4 py-3 font-medium text-brand-700 hover:underline">{i.inspectionNumber}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize text-xs">
                        {i.inspectionType?.replace('_', ' ').toLowerCase()}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{i.lot?.lotNumber || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{i.inspector?.fullName || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={i.result} /></td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(i.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-500">{i.completedAt ? formatDate(i.completedAt) : '—'}</td>
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
