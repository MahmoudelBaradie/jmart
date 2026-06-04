'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buyersApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StatusBadge from '@/components/shared/StatusBadge';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import Modal from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import { Search, Users, CheckCircle, XCircle } from 'lucide-react';

const KYC_STATUSES = [
  { value: '', label: 'All KYC' },
  { value: 'PENDING', label: 'Pending Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function BuyersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [kycStatus, setKycStatus] = useState('');
  const [selected, setSelected] = useState<{ id: string; businessName: string } | null>(null);
  const [kycNotes, setKycNotes] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['buyers', page, search, kycStatus],
    queryFn: () =>
      buyersApi.list({ page, limit, search: search || undefined, kycStatus: kycStatus || undefined })
        .then((r) => r.data),
  });

  const buyers = data?.data || [];
  const meta = data?.meta;

  const kycMutation = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      buyersApi.kycReview(selected!.id, status, kycNotes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buyers'] });
      setSelected(null);
      setKycNotes('');
    },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Input
          placeholder="Search buyer name or phone…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          leftIcon={<Search size={14} />}
          className="max-w-xs"
        />
        <Select
          options={KYC_STATUSES}
          value={kycStatus}
          onChange={(e) => { setKycStatus(e.target.value); setPage(1); }}
          className="w-44"
        />
      </div>

      <Card noPadding>
        {isLoading ? (
          <PageSpinner />
        ) : buyers.length === 0 ? (
          <EmptyState icon={Users} title="No buyers found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Business Name</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Contact</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Phone</th>
                    <th className="px-4 py-3 font-medium text-gray-600">KYC Status</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Joined</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {buyers.map((b: {
                    id: string;
                    businessName: string;
                    contactPersonName: string;
                    contactPhone: string;
                    kycStatus: string;
                    status: string;
                    createdAt: string;
                  }) => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{b.businessName}</td>
                      <td className="px-4 py-3 text-gray-600">{b.contactPersonName}</td>
                      <td className="px-4 py-3 text-gray-500">{b.contactPhone}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.kycStatus} /></td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(b.createdAt)}</td>
                      <td className="px-4 py-3">
                        {b.kycStatus === 'PENDING' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelected({ id: b.id, businessName: b.businessName })}
                          >
                            KYC Review
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

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`KYC Review: ${selected?.businessName}`}
      >
        <div className="space-y-4">
          <Input
            label="Notes (optional)"
            value={kycNotes}
            onChange={(e) => setKycNotes(e.target.value)}
            placeholder="Review notes or rejection reason"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => kycMutation.mutate({ status: 'REJECTED' })}
              loading={kycMutation.isPending}
            >
              <XCircle size={14} /> Reject
            </Button>
            <Button
              variant="success"
              onClick={() => kycMutation.mutate({ status: 'APPROVED' })}
              loading={kycMutation.isPending}
            >
              <CheckCircle size={14} /> Approve
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
