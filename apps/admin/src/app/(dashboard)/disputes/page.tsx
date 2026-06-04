'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disputesApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import StatusBadge from '@/components/shared/StatusBadge';
import StatCard from '@/components/shared/StatCard';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, truncate } from '@/lib/utils';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const DISPUTE_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'FILED', label: 'Filed' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

export default function DisputesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [closeModal, setCloseModal] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [outcome, setOutcome] = useState('RESOLVED');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['disputes', page, status],
    queryFn: () =>
      disputesApi.list({ page, limit, status: status || undefined }).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['dispute-stats'],
    queryFn: () => disputesApi.stats().then((r) => r.data),
  });

  const disputes = data?.data || [];
  const meta = data?.meta;

  const closeDispute = useMutation({
    mutationFn: () =>
      disputesApi.close(closeModal!, { resolution, outcome }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disputes'] });
      setCloseModal(null);
      setResolution('');
    },
  });

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total ?? 0} icon={AlertTriangle} color="blue" />
          <StatCard label="Filed" value={stats.filed ?? 0} icon={AlertTriangle} color="yellow" />
          <StatCard label="Under Review" value={stats.underReview ?? 0} icon={AlertTriangle} color="indigo" />
          <StatCard label="Resolved" value={stats.resolved ?? 0} icon={CheckCircle} color="green" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Select
          options={DISPUTE_STATUSES}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-44"
        />
      </div>

      <Card noPadding>
        {isLoading ? (
          <PageSpinner />
        ) : disputes.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No disputes found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Dispute #</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Category</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Description</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Filed</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {disputes.map((d: {
                    id: string;
                    disputeNumber: string;
                    disputeCategory: string;
                    description: string;
                    status: string;
                    createdAt: string;
                  }) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-brand-700">{d.disputeNumber}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs capitalize">
                        {d.disputeCategory?.replace('_', ' ').toLowerCase()}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{truncate(d.description, 50)}</td>
                      <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(d.createdAt)}</td>
                      <td className="px-4 py-3">
                        {['FILED', 'UNDER_REVIEW'].includes(d.status) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setCloseModal(d.id)}
                          >
                            Close
                          </Button>
                        )}
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

      <Modal open={!!closeModal} onClose={() => setCloseModal(null)} title="Close Dispute">
        <div className="space-y-4">
          <Select
            label="Outcome"
            options={[
              { value: 'RESOLVED', label: 'Resolved' },
              { value: 'DISMISSED', label: 'Dismissed' },
              { value: 'ESCALATED', label: 'Escalated' },
            ]}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          />
          <Input
            label="Resolution notes"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Describe the resolution"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setCloseModal(null)}>Cancel</Button>
            <Button
              onClick={() => closeDispute.mutate()}
              loading={closeDispute.isPending}
              disabled={!resolution.trim()}
            >
              Close Dispute
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
