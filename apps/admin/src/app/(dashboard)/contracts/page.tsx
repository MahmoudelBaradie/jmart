'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import StatusBadge from '@/components/shared/StatusBadge';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import Modal from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatCurrency } from '@/lib/utils';
import { FileText, PenLine, Plus } from 'lucide-react';
import Link from 'next/link';

const CONTRACT_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_SIGNATURES', label: 'Pending Signatures' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'EXPIRED', label: 'Expired' },
];

const SIGNER_TYPES = [
  { value: 'farmer', label: 'Farmer' },
  { value: 'buyer', label: 'Buyer' },
];

export default function ContractsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [signModal, setSignModal] = useState<{ id: string; contractNumber: string } | null>(null);
  const [signerType, setSignerType] = useState('farmer');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', page, status],
    queryFn: () =>
      contractsApi.list({ page, limit, status: status || undefined }).then((r) => r.data),
  });

  const contracts = data?.data || [];
  const meta = data?.meta;

  const signContract = useMutation({
    mutationFn: () => contractsApi.sign(signModal!.id, { signerType: signerType as 'farmer' | 'buyer' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      setSignModal(null);
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select
            options={CONTRACT_STATUSES}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-52"
          />
        </div>
        <Link
          href="/contracts/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          <Plus size={15} />
          إنشاء عقد جديد
        </Link>
      </div>

      <Card noPadding>
        {isLoading ? (
          <PageSpinner />
        ) : contracts.length === 0 ? (
          <EmptyState icon={FileText} title="No contracts found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Contract #</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Title</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Farmer</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Buyer</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Value</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Start</th>
                    <th className="px-4 py-3 font-medium text-gray-600">End</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contracts.map((c: {
                    id: string;
                    contractNumber: string;
                    title: string;
                    farmer?: { businessName: string };
                    buyer?: { businessName: string };
                    status: string;
                    totalValue?: number;
                    startDate?: string;
                    endDate?: string;
                  }) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/contracts/${c.id}`}>
                      <td className="px-4 py-3 font-medium text-brand-700 hover:underline">{c.contractNumber}</td>
                      <td className="px-4 py-3 text-gray-900">{c.title}</td>
                      <td className="px-4 py-3 text-gray-600">{c.farmer?.businessName || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.buyer?.businessName || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 font-medium">{c.totalValue ? formatCurrency(c.totalValue) : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{c.startDate ? formatDate(c.startDate) : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{c.endDate ? formatDate(c.endDate) : '—'}</td>
                      <td className="px-4 py-3">
                        {c.status === 'PENDING_SIGNATURES' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSignModal({ id: c.id, contractNumber: c.contractNumber })}
                          >
                            <PenLine size={12} /> Sign
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
        open={!!signModal}
        onClose={() => setSignModal(null)}
        title={`Sign Contract: ${signModal?.contractNumber}`}
      >
        <div className="space-y-4">
          <Select
            label="Signing As"
            options={SIGNER_TYPES}
            value={signerType}
            onChange={(e) => setSignerType(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setSignModal(null)}>Cancel</Button>
            <Button
              onClick={() => signContract.mutate()}
              loading={signContract.isPending}
            >
              Confirm Signature
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
