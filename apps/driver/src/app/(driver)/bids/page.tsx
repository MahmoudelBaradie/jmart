'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bidsApi } from '@/lib/api';
import { ListChecks, Truck, CheckCircle, Clock, X, Package, DollarSign, Trash2 } from 'lucide-react';

type Status = '' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED';

const FILTERS: { value: Status; label: string; color: string }[] = [
  { value: '',          label: 'الكل',     color: 'bg-gray-200 text-gray-700' },
  { value: 'PENDING',   label: 'قيد المراجعة', color: 'bg-amber-100 text-amber-700' },
  { value: 'ACCEPTED',  label: 'مقبول',    color: 'bg-green-100 text-green-700' },
  { value: 'REJECTED',  label: 'مرفوض',    color: 'bg-red-100 text-red-600' },
];

export default function MyBidsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>('');

  const { data, isLoading } = useQuery({
    queryKey: ['driver-my-bids', status],
    queryFn: () => bidsApi.mine(status || undefined).then((r) => r.data),
    refetchInterval: 30_000,
  });
  const withdraw = useMutation({
    mutationFn: (bidId: string) => bidsApi.withdraw(bidId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driver-my-bids'] }),
  });

  const bids: any[] = data?.data ?? data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <ListChecks size={20} className="text-emerald-600" />
          عروضي
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">إجمالي: {bids.length}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${status === f.value ? 'bg-emerald-600 text-white' : f.color}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-gray-400 py-10">جارٍ التحميل…</p>
      ) : bids.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <Clock size={32} className="text-gray-200 mx-auto mb-2" />
          <p className="font-bold text-gray-600">لا توجد عروض</p>
          <p className="text-xs text-gray-400 mt-1">قدّم عرضك على الشحنات المتاحة في تبويب "الفرص".</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bids.map((b) => (
            <BidRow key={b.id} bid={b} onWithdraw={() => {
              if (confirm('سحب هذا العرض؟')) withdraw.mutate(b.id);
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

function BidRow({ bid, onWithdraw }: { bid: any; onWithdraw: () => void }) {
  const statusColors: Record<string, { bg: string; text: string; label: string; icon: any }> = {
    PENDING:   { bg: 'bg-amber-50',  text: 'text-amber-700', label: '⏳ قيد المراجعة', icon: Clock },
    ACCEPTED:  { bg: 'bg-green-50',  text: 'text-green-700', label: '✓ مقبول',        icon: CheckCircle },
    REJECTED:  { bg: 'bg-red-50',    text: 'text-red-600',   label: '✗ مرفوض',         icon: X },
    WITHDRAWN: { bg: 'bg-gray-50',   text: 'text-gray-500',  label: 'مسحوب',          icon: Trash2 },
    EXPIRED:   { bg: 'bg-gray-50',   text: 'text-gray-500',  label: 'منتهٍ',          icon: X },
  };
  const s = statusColors[bid.status] ?? statusColors.PENDING;
  const StateIcon = s.icon;
  const ship = bid.shipment ?? {};

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-xs text-gray-500">شحنة</p>
          <p className="font-black text-gray-900 text-sm">{ship.shipmentNumber ?? '—'}</p>
          {ship.order?.orderNumber && (
            <p className="text-[10px] text-gray-400 mt-0.5">طلب: {ship.order.orderNumber}</p>
          )}
        </div>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${s.bg} ${s.text} flex items-center gap-1`}>
          <StateIcon size={10} />
          {s.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 my-3 text-xs">
        <Stat icon={DollarSign} label="عرضي"     value={`${Number(bid.quotedPrice).toFixed(2)} ر.س`} />
        <Stat icon={Package}    label="الحمولة"  value={`${Number(ship.declaredWeightKg ?? 0)} كجم`} />
        <Stat icon={Truck}      label="الحالة"   value={ship.status ?? '—'} />
      </div>

      {bid.status === 'PENDING' && (
        <button
          onClick={onWithdraw}
          className="w-full mt-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
        >
          <Trash2 size={12} />
          سحب العرض
        </button>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-2.5">
      <p className="text-[10px] text-gray-500 flex items-center gap-1">
        <Icon size={10} className="text-gray-400" />
        {label}
      </p>
      <p className="text-xs font-bold text-gray-800 truncate mt-0.5">{value}</p>
    </div>
  );
}
