'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDateTime } from '@/lib/utils';
import { Search, FileText, ChevronDown, ChevronRight } from 'lucide-react';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REJECT', label: 'Reject' },
];

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, search, action],
    queryFn: () =>
      auditApi.list({ page, limit, search: search || undefined, action: action || undefined }).then((r) => r.data),
  });

  // API may return either a bare array (unwrapped envelope) or { data, meta }.
  const logs: any[] = Array.isArray(data) ? data : (data?.data ?? []);
  const meta = Array.isArray(data) ? undefined : data?.meta;

  const actionColor: Record<string, string> = {
    CREATE: 'bg-green-50 text-green-700',
    UPDATE: 'bg-blue-50 text-blue-700',
    DELETE: 'bg-red-50 text-red-700',
    LOGIN: 'bg-indigo-50 text-indigo-700',
    LOGOUT: 'bg-gray-100 text-gray-600',
    APPROVE: 'bg-emerald-50 text-emerald-700',
    REJECT: 'bg-orange-50 text-orange-700',
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Input
          placeholder="Search entity, user…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          leftIcon={<Search size={14} />}
          className="max-w-xs"
        />
        <Select
          options={ACTION_OPTIONS}
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="w-44"
        />
      </div>

      <Card noPadding>
        {isLoading ? (
          <PageSpinner />
        ) : logs.length === 0 ? (
          <EmptyState icon={FileText} title="No audit logs found" />
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {logs.map((log: any) => {
                // API ships `actionType` / `timestamp` / `newValue` / `oldValue` /
                // `actorType`. Older code expected `action` / `createdAt` /
                // `changes` / `actor`. Coalesce both so the page works either way.
                const action     = log.actionType   ?? log.action ?? '—';
                const when       = log.timestamp    ?? log.createdAt;
                const actorLabel = log.actor?.fullName
                                  ?? log.actor?.username
                                  ?? (log.actorType === 'SYSTEM' ? 'System' : log.actorId ? `User ${String(log.actorId).slice(0, 8)}…` : 'System');
                const hasDelta   = log.newValue || log.oldValue || log.changes || log.changeDelta;
                return (
                <div key={log.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      className="mt-0.5 text-gray-400 hover:text-gray-600"
                    >
                      {expanded === log.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColor[action] || 'bg-gray-100 text-gray-600'}`}>
                          {action}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{log.entityType}</span>
                        {log.entityId && (
                          <span className="text-xs text-gray-400 font-mono">{String(log.entityId).slice(0, 8)}…</span>
                        )}
                        {when && (
                          <span className="text-xs text-gray-400 ml-auto">{formatDateTime(when)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <span>{actorLabel}</span>
                        {log.actorType && <span className="text-gray-300">·</span>}
                        {log.actorType && <span>{log.actorType}</span>}
                        {log.ipAddress && <span className="text-gray-300">·</span>}
                        {log.ipAddress && <span className="font-mono">{log.ipAddress}</span>}
                      </div>
                    </div>
                  </div>
                  {expanded === log.id && hasDelta && (
                    <div className="mt-2 ml-7 p-3 bg-gray-50 rounded text-xs font-mono text-gray-600 overflow-x-auto">
                      <pre>{JSON.stringify({
                        oldValue: log.oldValue,
                        newValue: log.newValue ?? log.changes,
                        changeDelta: log.changeDelta,
                        reason: log.reason,
                      }, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );})}
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
