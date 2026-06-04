'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { Bell, Check, CheckCheck } from 'lucide-react';

const READ_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'false', label: 'Unread' },
  { value: 'true', label: 'Read' },
];

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [isRead, setIsRead] = useState('false');
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page, isRead],
    queryFn: () =>
      notificationsApi.list({ page, limit, isRead: isRead === '' ? undefined : isRead === 'true' }).then((r) => r.data),
  });

  // The notifications endpoint returns a plain array (no `meta`), so the
  // global axios interceptor unwraps the envelope to `data = [...]` directly.
  // Other endpoints return `{ data, meta }`. Support both so we never show
  // "No notifications" while the API is actually returning rows.
  const notifications: any[] = Array.isArray(data) ? data : (data?.data ?? []);
  const meta = Array.isArray(data) ? undefined : data?.meta;

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">My Notifications</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Shows notifications addressed to <strong>you as the signed-in admin</strong> —
          not every event in the system. To view system-wide events use the
          Audit Logs page.
        </p>
      </div>
      <div className="flex items-center justify-between mb-5">
        <Select
          options={READ_OPTIONS}
          value={isRead}
          onChange={(e) => { setIsRead(e.target.value); setPage(1); }}
          className="w-36"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => markAllRead.mutate()}
          loading={markAllRead.isPending}
        >
          <CheckCheck size={14} /> Mark all read
        </Button>
      </div>

      <Card noPadding>
        {isLoading ? (
          <PageSpinner />
        ) : notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" />
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {notifications.map((n: {
                id: string;
                title: string;
                body: string;
                notificationType?: string;
                isRead: boolean;
                createdAt: string;
              }) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 flex items-start gap-3 transition-colors ${n.isRead ? 'hover:bg-gray-50' : 'bg-brand-50 hover:bg-brand-100/60'}`}
                >
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${n.isRead ? 'bg-gray-200' : 'bg-brand-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      {n.notificationType && (
                        <span className="text-xs text-gray-400 capitalize">
                          {n.notificationType.replace('_', ' ').toLowerCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1" title={formatDateTime(n.createdAt)}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => markRead.mutate(n.id)}
                      className="text-gray-400 hover:text-brand-600 transition-colors mt-0.5"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))}
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
