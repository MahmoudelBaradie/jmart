'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { geoZonesApi, warehousesApi, usersApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import {
  Map, Warehouse, Users, Settings, Plus, ChevronRight,
  Globe, Shield, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const TABS = [
  { id: 'zones',      label: 'المناطق الجغرافية', icon: Map },
  { id: 'warehouses', label: 'المستودعات',         icon: Warehouse },
  { id: 'users',      label: 'مستخدمو النظام',     icon: Users },
  { id: 'platform',   label: 'إعدادات المنصة',     icon: Globe },
] as const;

type Tab = (typeof TABS)[number]['id'];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:     'مدير عام',
  OPS_MANAGER:     'مدير عمليات',
  FINANCE_OFFICER: 'مسؤول مالي',
  SUPPORT:         'دعم فني',
  QUALITY_INSPECTOR: 'مفتش جودة',
  DRIVER_MANAGER:  'مدير سائقين',
  VIEWER:          'مشاهد',
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('zones');
  const [newUserModal, setNewUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', fullName: '', role: 'VIEWER', password: '' });
  const [newUserError, setNewUserError] = useState('');

  // ── Geo zones ──────────────────────────────────────────────────
  const { data: zonesData, isLoading: loadingZones } = useQuery({
    queryKey: ['geo-zones-settings'],
    queryFn: () => geoZonesApi.list({ limit: 100 }).then((r) => r.data),
    enabled: tab === 'zones',
  });

  // ── Warehouses ──────────────────────────────────────────────────
  const { data: warehousesData, isLoading: loadingWH } = useQuery({
    queryKey: ['warehouses-settings'],
    queryFn: () => warehousesApi.list({ limit: 100 }).then((r) => r.data),
    enabled: tab === 'warehouses',
  });

  // ── Users ──────────────────────────────────────────────────────
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-settings'],
    queryFn: () => usersApi.list({ limit: 100 }).then((r) => r.data),
    enabled: tab === 'users',
  });

  const createUserMutation = useMutation({
    mutationFn: () => usersApi.create(newUser),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users-settings'] });
      setNewUserModal(false);
      setNewUser({ email: '', fullName: '', role: 'VIEWER', password: '' });
    },
    onError: () => setNewUserError('فشل إنشاء المستخدم. تحقق من البيانات.'),
  });

  const zones = zonesData?.data ?? zonesData ?? [];
  const warehouses = warehousesData?.data ?? warehousesData ?? [];
  const users = usersData?.data ?? usersData ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Settings size={20} className="text-gray-500" />
        <h1 className="text-xl font-bold text-gray-900">إعدادات النظام</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Geo Zones */}
      {tab === 'zones' && (
        <Card noPadding>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Map size={16} className="text-blue-500" />
              المناطق الجغرافية ({zones.length})
            </h2>
            <Link href="/geo-zones" className="text-sm text-brand-600 hover:underline font-medium">
              إدارة المناطق ←
            </Link>
          </div>
          {loadingZones ? <PageSpinner /> : (
            <div className="divide-y divide-gray-50">
              {zones.slice(0, 20).map((z: any) => (
                <div key={z.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{z.zoneNameAr ?? z.zoneName}</p>
                    <p className="text-xs text-gray-400">{z.zoneCode} • {z.zoneType}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {z.isActive !== false && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">نشطة</span>
                    )}
                    <span className="text-xs text-gray-400">{z.baseDeliveryFee != null ? `${z.baseDeliveryFee} ر.س` : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Warehouses */}
      {tab === 'warehouses' && (
        <Card noPadding>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Warehouse size={16} className="text-purple-500" />
              المستودعات ({warehouses.length})
            </h2>
            <Link href="/warehouses" className="text-sm text-brand-600 hover:underline font-medium">
              إدارة المستودعات ←
            </Link>
          </div>
          {loadingWH ? <PageSpinner /> : (
            <div className="divide-y divide-gray-50">
              {warehouses.slice(0, 20).map((w: any) => (
                <div key={w.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{w.warehouseName}</p>
                    <p className="text-xs text-gray-400">{w.city} • {w.warehouseType}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      w.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500',
                    )}>
                      {w.isActive !== false ? 'نشط' : 'متوقف'}
                    </span>
                    {w.capacity && <span className="text-xs text-gray-400">{w.capacity} م²</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Internal Users */}
      {tab === 'users' && (
        <Card noPadding>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Users size={16} className="text-indigo-500" />
              مستخدمو النظام ({users.length})
            </h2>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setNewUserModal(true)}>
              مستخدم جديد
            </Button>
          </div>
          {loadingUsers ? <PageSpinner /> : (
            <div className="divide-y divide-gray-50">
              {users.map((u: any) => (
                <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {(u.fullName || u.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{u.fullName || '—'}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                    u.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600',
                  )}>
                    {u.isActive !== false ? 'نشط' : 'موقوف'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Platform settings */}
      {tab === 'platform' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: 'رابط تتبع الشحنات',
              desc: 'شارك هذا الرابط مع العملاء لتتبع شحناتهم',
              value: 'http://localhost:3003/track',
              icon: ChevronRight,
              color: 'blue',
            },
            {
              title: 'Swagger API Docs',
              desc: 'توثيق API الكامل للمطورين',
              value: 'http://localhost:3000/api/docs',
              icon: Globe,
              color: 'purple',
            },
            {
              title: 'بوابة المزارعين والمشترين',
              desc: 'رابط البوابة الرئيسية للمستخدمين',
              value: 'http://localhost:3003',
              icon: Globe,
              color: 'green',
            },
            {
              title: 'لوحة الأدمن',
              desc: 'رابط لوحة التحكم الإدارية',
              value: 'http://localhost:3002',
              icon: Shield,
              color: 'indigo',
            },
          ].map((item) => (
            <Card key={item.title}>
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                item.color === 'blue'   ? 'bg-blue-100 text-blue-600' :
                item.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                item.color === 'green'  ? 'bg-emerald-100 text-emerald-600' :
                'bg-indigo-100 text-indigo-600',
              )}>
                <Globe size={18} />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">{item.title}</h3>
              <p className="text-xs text-gray-500 mb-3">{item.desc}</p>
              <a
                href={item.value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-brand-600 hover:underline break-all"
              >
                {item.value}
              </a>
            </Card>
          ))}

          {/* Version info */}
          <Card className="sm:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              حالة المنصة
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'API Server', status: true, port: '3000' },
                { label: 'Admin Panel', status: true, port: '3002' },
                { label: 'User Portal', status: true, port: '3003' },
                { label: 'Database', status: true, port: '5432' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <div className={cn('w-2.5 h-2.5 rounded-full', s.status ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{s.label}</p>
                    <p className="text-[10px] text-gray-400">:{s.port}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* New User Modal */}
      <Modal open={newUserModal} onClose={() => setNewUserModal(false)} title="إنشاء مستخدم داخلي جديد">
        <div className="space-y-4">
          <Input
            label="الاسم الكامل"
            value={newUser.fullName}
            onChange={(e) => setNewUser((u) => ({ ...u, fullName: e.target.value }))}
          />
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
          />
          <Input
            label="كلمة المرور"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {newUserError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-600">
              <AlertCircle size={14} /> {newUserError}
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setNewUserModal(false)}>إلغاء</Button>
            <Button
              loading={createUserMutation.isPending}
              onClick={() => createUserMutation.mutate()}
              icon={<CheckCircle2 size={14} />}
            >
              إنشاء المستخدم
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
