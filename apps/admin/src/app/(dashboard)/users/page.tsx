'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StatusBadge from '@/components/shared/StatusBadge';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, getInitials } from '@/lib/utils';
import { Search, Users } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'SUPPORT', label: 'Support' },
  { value: 'INSPECTOR', label: 'Inspector' },
];

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, role],
    queryFn: () =>
      usersApi.list({ page, limit, search: search || undefined, role: role || undefined }).then((r) => r.data),
  });

  const users = data?.data || [];
  const meta = data?.meta;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          leftIcon={<Search size={14} />}
          className="max-w-xs"
        />
        <Select
          options={ROLE_OPTIONS}
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="w-44"
        />
      </div>

      <Card noPadding>
        {isLoading ? (
          <PageSpinner />
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">User</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Role</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Department</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u: {
                    id: string;
                    fullName: string;
                    username: string;
                    role: string;
                    department?: string;
                    isActive: boolean;
                    createdAt: string;
                  }) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-xs">
                            {getInitials(u.fullName)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{u.fullName}</div>
                            <div className="text-xs text-gray-500">{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.department || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
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
