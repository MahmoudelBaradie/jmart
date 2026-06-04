'use client';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Phone, Truck, Hash, ShieldCheck, LogOut, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const driver = (user as any).driver ?? {};
  const isApproved = driver.status === 'ACTIVE';

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-amber-400 text-emerald-900 text-3xl font-black flex items-center justify-center">
            {driver.fullName?.[0] ?? '🚚'}
          </div>
          <div>
            <p className="text-xs text-emerald-200">سائق شحن</p>
            <h1 className="text-lg font-black">{driver.fullName ?? (user as any).email}</h1>
            <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isApproved ? 'bg-green-500/30 text-green-100' : 'bg-amber-500/30 text-amber-100'}`}>
              {isApproved ? '✓ معتمد' : '⏳ قيد المراجعة'}
            </span>
          </div>
        </div>
      </div>

      {!driver.id && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-700">ملف السائق قيد الإعداد</p>
            <p className="text-xs text-amber-600 mt-1 leading-relaxed">
              يحتاج فريق جمارت لتزويدك ببيانات الرخصة والسيارة لإكمال تفعيل حسابك. سنتواصل معك قريباً.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="font-bold text-gray-800 text-sm">معلومات الحساب</h2>
        <InfoRow icon={Mail}  label="البريد الإلكتروني" value={(user as any).email} />
        <InfoRow icon={Phone} label="رقم الجوال" value={(user as any).phone} />
      </div>

      {driver.id && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-gray-800 text-sm">المركبة والترخيص</h2>
          <InfoRow icon={Truck} label="نوع السيارة" value={driver.vehicleType} />
          <InfoRow icon={Hash}  label="رقم اللوحة" value={driver.vehiclePlate} />
          <InfoRow icon={ShieldCheck} label="حمولة قصوى" value={driver.vehicleCapacityKg ? `${driver.vehicleCapacityKg} كجم` : undefined} />
        </div>
      )}

      <button
        onClick={logout}
        className="w-full bg-white border-2 border-red-200 hover:bg-red-50 text-red-600 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut size={16} />
        تسجيل الخروج
      </button>

      <p className="text-center text-[10px] text-gray-400">جمارت — الإصدار 1.0.0</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Icon size={13} className="text-gray-400" />
        {label}
      </div>
      <p className="text-sm font-bold text-gray-800">{value ?? '—'}</p>
    </div>
  );
}
