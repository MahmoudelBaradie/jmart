'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Bell, CheckCheck, Package, ShoppingBag, DollarSign, AlertCircle, FileText, Info, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const NOTIF_ICONS: Record<string, React.ElementType> = {
  ORDER: ShoppingBag,
  PAYMENT: DollarSign,
  DISPUTE: AlertCircle,
  CONTRACT: FileText,
  KYC: Info,
  INVENTORY: Package,
  SYSTEM: Bell,
};

const NOTIF_COLORS: Record<string, string> = {
  ORDER:     'bg-blue-100 text-blue-600',
  PAYMENT:   'bg-amber-100 text-amber-600',
  DISPUTE:   'bg-red-100 text-red-600',
  CONTRACT:  'bg-purple-100 text-purple-600',
  KYC:       'bg-teal-100 text-teal-600',
  INVENTORY: 'bg-brand-100 text-brand-600',
  SYSTEM:    'bg-gray-100 text-gray-500',
};

// Derive icon key from notificationType (e.g. "ORDER_CREATED" → "ORDER")
function getTypeKey(type: string): string {
  const upper = type.toUpperCase();
  for (const key of Object.keys(NOTIF_ICONS)) {
    if (upper.startsWith(key)) return key;
  }
  return 'SYSTEM';
}

// Smart navigation based on notification type + data payload
function getNotifHref(n: { notificationType: string; data?: Record<string, unknown> | null }): string | null {
  const d = n.data ?? {};
  const key = getTypeKey(n.notificationType);
  switch (key) {
    case 'ORDER':
      return d.orderId ? `/orders/${d.orderId}` : '/orders';
    case 'CONTRACT':
      return d.contractId ? `/contracts/${d.contractId}` : '/contracts';
    case 'DISPUTE':
      return d.disputeId ? `/disputes/${d.disputeId}` : '/disputes';
    case 'PAYMENT':
      return '/payments';
    case 'KYC':
      return '/profile';
    case 'INVENTORY':
      return '/listings';
    default:
      return null;
  }
}

type NotifFilter = 'all' | 'unread';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [filter, setFilter] = useState<NotifFilter>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () =>
      notificationsApi.list({
        page: 1, limit: 50,
        ...(filter === 'unread' ? { isRead: false } : {}),
      }).then((r) => r.data),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['portal-unread-count'] });
    },
  });

  const notifications: {
    id: string;
    title: string;
    body: string;
    notificationType: string;
    isRead: boolean;
    createdAt: string;
    data?: Record<string, unknown> | null;
  }[] = data?.data || [];

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleTap = (n: (typeof notifications)[0]) => {
    // Mark as read silently
    if (!n.isRead) markRead.mutate(n.id);
    // Navigate
    const href = getNotifHref(n);
    if (href) router.push(href);
  };

  return (
    <div className="sm:p-6 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Bell size={20} className="text-gray-600" />
            الإشعارات
            {unreadCount > 0 && (
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium">
                {unreadCount}
              </span>
            )}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
          >
            <CheckCheck size={15} />
            قراءة الكل
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { value: 'all' as NotifFilter, label: 'الكل' },
          { value: 'unread' as NotifFilter, label: `غير مقروءة${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === tab.value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse h-20" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <Bell size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">لا توجد إشعارات</p>
          <p className="text-gray-400 text-sm mt-1">ستظهر هنا عند وجود تحديثات جديدة</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const typeKey = getTypeKey(n.notificationType);
            const Icon    = NOTIF_ICONS[typeKey] || Bell;
            const color   = NOTIF_COLORS[typeKey] || 'bg-gray-100 text-gray-500';
            const href    = getNotifHref(n);
            const isClickable = !!href || !n.isRead;

            return (
              <div
                key={n.id}
                onClick={() => handleTap(n)}
                className={`flex gap-3 bg-white rounded-2xl p-4 border transition-all ${
                  n.isRead
                    ? 'border-gray-100 shadow-sm opacity-80'
                    : 'border-brand-200 shadow-sm cursor-pointer hover:border-brand-300 hover:shadow-md'
                } ${href ? 'cursor-pointer' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color} ${n.isRead ? 'opacity-60' : ''}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${n.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!n.isRead && (
                        <div className="w-2 h-2 rounded-full bg-brand-500" />
                      )}
                      {href && <ChevronLeft size={13} className="text-gray-300" />}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                  <p className="text-xs text-gray-300 mt-1.5">{formatDate(n.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
