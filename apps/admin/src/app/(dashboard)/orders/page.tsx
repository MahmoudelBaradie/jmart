'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StatusBadge from '@/components/shared/StatusBadge';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

const ORDER_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'AWAITING_PICKUP', label: 'Awaiting Pickup' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, search, status],
    queryFn: () =>
      ordersApi.list({ page, limit, search: search || undefined, status: status || undefined })
        .then((r) => r.data),
  });

  const orders = data?.data || [];
  const meta = data?.meta;

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <Input
          placeholder="Search order number or address…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          leftIcon={<Search size={14} />}
          className="max-w-xs"
        />
        <Select
          options={ORDER_STATUSES}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-44"
        />
      </div>

      <Card noPadding>
        {isLoading ? (
          <PageSpinner />
        ) : orders.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Order #</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Buyer</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Items</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order: {
                    id: string;
                    orderNumber: string;
                    buyer?: { businessName: string };
                    orderType: string;
                    status: string;
                    _count?: { items: number };
                    totalAmount?: number;
                    createdAt: string;
                  }) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-brand-700">
                        {order.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {order.buyer?.businessName || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize text-xs">
                        {order.orderType?.toLowerCase()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {order._count?.items ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
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
