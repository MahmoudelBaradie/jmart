'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import StatusBadge from '@/components/shared/StatusBadge';
import Pagination from '@/components/shared/Pagination';
import { formatDate } from '@/lib/utils';
import {
  ClipboardList, CheckSquare, XSquare, Clock, AlertTriangle, Plus,
  Loader2, Filter, CheckCircle2, User, Calendar, ArrowUp, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'tasks', label: 'المهام', icon: ClipboardList },
  { id: 'approvals', label: 'طلبات الموافقة', icon: CheckSquare },
] as const;
type Tab = (typeof TABS)[number]['id'];

const TASK_STATUS_AR: Record<string, string> = {
  PENDING: 'معلقة',
  IN_PROGRESS: 'جارية',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغية',
  ESCALATED: 'مُصعَّدة',
};

const TASK_PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-700 bg-red-50 border-red-200',
  HIGH: 'text-orange-700 bg-orange-50 border-orange-200',
  MEDIUM: 'text-amber-700 bg-amber-50 border-amber-200',
  LOW: 'text-gray-600 bg-gray-50 border-gray-200',
};

const TASK_PRIORITY_AR: Record<string, string> = {
  CRITICAL: 'حرج',
  HIGH: 'عالي',
  MEDIUM: 'متوسط',
  LOW: 'منخفض',
};

const TASK_TYPE_AR: Record<string, string> = {
  KYC_REVIEW: 'مراجعة KYC',
  ORDER_ISSUE: 'مشكلة طلب',
  DISPUTE_HANDLING: 'معالجة نزاع',
  QUALITY_CHECK: 'فحص جودة',
  PAYMENT_ISSUE: 'مشكلة دفع',
  LOGISTICS_ISSUE: 'مشكلة لوجستيك',
  CONTRACT_REVIEW: 'مراجعة عقد',
  REFUND_REQUEST: 'طلب استرداد',
  GENERAL: 'عام',
};

const APPROVAL_TYPE_AR: Record<string, string> = {
  KYC_APPROVAL: 'اعتماد KYC',
  REFUND_APPROVAL: 'اعتماد استرداد',
  CONTRACT_APPROVAL: 'اعتماد عقد',
  PAYOUT_APPROVAL: 'اعتماد مدفوعات',
  SUSPENSION: 'تعليق حساب',
  PRICE_OVERRIDE: 'تعديل سعر',
};

const TASK_STATUSES = [
  { value: '', label: 'جميع الحالات' },
  { value: 'PENDING', label: 'معلقة' },
  { value: 'IN_PROGRESS', label: 'جارية' },
  { value: 'COMPLETED', label: 'مكتملة' },
  { value: 'ESCALATED', label: 'مُصعَّدة' },
];

const APPROVAL_STATUSES = [
  { value: '', label: 'جميع الحالات' },
  { value: 'PENDING', label: 'بانتظار الموافقة' },
  { value: 'APPROVED', label: 'معتمدة' },
  { value: 'REJECTED', label: 'مرفوضة' },
];

const TASK_TYPES = [
  { value: '', label: 'جميع الأنواع' },
  { value: 'KYC_REVIEW', label: 'مراجعة KYC' },
  { value: 'ORDER_ISSUE', label: 'مشكلة طلب' },
  { value: 'DISPUTE_HANDLING', label: 'معالجة نزاع' },
  { value: 'QUALITY_CHECK', label: 'فحص جودة' },
  { value: 'PAYMENT_ISSUE', label: 'مشكلة دفع' },
  { value: 'GENERAL', label: 'عام' },
];

function SlaChip({ deadline }: { deadline?: string }) {
  if (!deadline) return <span className="text-gray-400 text-xs">—</span>;
  const diff = new Date(deadline).getTime() - Date.now();
  const hours = Math.floor(diff / 3_600_000);
  if (diff < 0) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
      <AlertTriangle size={11} /> متأخرة
    </span>
  );
  if (hours < 24) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
      <Clock size={11} /> {hours}س متبقية
    </span>
  );
  return <span className="text-xs text-gray-500">{formatDate(deadline)}</span>;
}

interface WorkflowTask {
  id: string;
  taskNumber: string;
  title: string;
  taskType: string;
  assignedTo?: { fullName: string };
  status: string;
  priority: string;
  slaDeadline?: string;
  description?: string;
}

interface Approval {
  id: string;
  approvalNumber: string;
  approvalType: string;
  requestedBy?: { fullName: string };
  status: string;
  createdAt: string;
  entityType?: string;
  notes?: string;
  decisionNotes?: string;
}

export default function WorkflowPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('tasks');
  const [page, setPage] = useState(1);
  const [taskStatus, setTaskStatus] = useState('');
  const [taskType, setTaskType] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [rejectModal, setRejectModal] = useState<Approval | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [updateModal, setUpdateModal] = useState<WorkflowTask | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState('');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    taskType: 'GENERAL',
    priority: 'MEDIUM',
    description: '',
  });
  const limit = 20;

  const { data: tasksData, isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks', page, taskStatus, taskType],
    enabled: tab === 'tasks',
    queryFn: () =>
      workflowApi.tasks({
        page, limit,
        status: taskStatus || undefined,
        taskType: taskType || undefined,
      }).then((r) => r.data),
  });

  const { data: approvalsData, isLoading: loadingApprovals } = useQuery({
    queryKey: ['approvals', page, approvalStatus],
    enabled: tab === 'approvals',
    queryFn: () =>
      workflowApi.approvals({ page, limit, status: approvalStatus || undefined }).then((r) => r.data),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      workflowApi.updateTask(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setUpdateModal(null);
      setNewTaskStatus('');
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: () => workflowApi.createTask(createForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setShowCreateTask(false);
      setCreateForm({ title: '', taskType: 'GENERAL', priority: 'MEDIUM', description: '' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => workflowApi.decideApproval(id, 'APPROVED', 'تمت الموافقة'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      workflowApi.decideApproval(id, 'REJECTED', notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      setRejectModal(null);
      setRejectNotes('');
    },
  });

  const tasks: WorkflowTask[] = tasksData?.data || [];
  const approvals: Approval[] = approvalsData?.data || [];
  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">سير العمل والموافقات</h1>
          <p className="text-sm text-gray-500 mt-0.5">إدارة المهام، SLA، وطلبات الموافقة متعددة المراحل</p>
        </div>
        {tab === 'tasks' && (
          <button
            onClick={() => setShowCreateTask(!showCreateTask)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-colors"
          >
            <Plus size={15} />
            مهمة جديدة
          </button>
        )}
      </div>

      {/* Create Task Form (collapsible) */}
      {showCreateTask && (
        <Card className="p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Plus size={14} className="text-brand-500" />
            إنشاء مهمة جديدة
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">عنوان المهمة *</label>
              <input
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="عنوان المهمة…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">النوع</label>
              <select
                value={createForm.taskType}
                onChange={(e) => setCreateForm({ ...createForm, taskType: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
              >
                {Object.entries(TASK_TYPE_AR).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">الأولوية</label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
              >
                {Object.entries(TASK_PRIORITY_AR).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">الوصف</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="وصف المهمة (اختياري)…"
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => createTaskMutation.mutate()}
              disabled={!createForm.title.trim() || createTaskMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl"
            >
              {createTaskMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              إنشاء
            </button>
            <button
              onClick={() => setShowCreateTask(false)}
              className="px-4 py-2.5 text-gray-500 hover:text-gray-700 font-semibold text-sm border border-gray-200 rounded-xl"
            >
              إلغاء
            </button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setPage(1); }}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all relative',
              tab === id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon size={14} />
            {label}
            {id === 'approvals' && pendingApprovals > 0 && (
              <span className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {pendingApprovals}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tasks Tab ── */}
      {tab === 'tasks' && (
        <Card noPadding>
          <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
            {/* Status filter */}
            <div className="relative">
              <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={taskStatus}
                onChange={(e) => { setTaskStatus(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-xl py-2 pr-8 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none bg-white"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            {/* Type filter */}
            <div className="relative">
              <select
                value={taskType}
                onChange={(e) => { setTaskType(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none bg-white"
              >
                {TASK_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loadingTasks ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={28} className="animate-spin text-brand-500" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
              <ClipboardList size={36} />
              <p className="text-sm">لا توجد مهام</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-right">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">المهمة</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">النوع</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">المُعيَّن إليه</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">الحالة</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">الأولوية</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">SLA</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tasks.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-brand-700 text-xs">{t.taskNumber}</p>
                          <p className="text-sm text-gray-800 mt-0.5">{t.title}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {TASK_TYPE_AR[t.taskType] || t.taskType}
                        </td>
                        <td className="px-4 py-3">
                          {t.assignedTo ? (
                            <span className="flex items-center gap-1 text-sm text-gray-700">
                              <User size={12} className="text-gray-400" />
                              {t.assignedTo.fullName}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">غير مُعيَّن</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-gray-600">
                            {TASK_STATUS_AR[t.status] || t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full border',
                            TASK_PRIORITY_COLOR[t.priority] || 'text-gray-600 bg-gray-50 border-gray-200'
                          )}>
                            {TASK_PRIORITY_AR[t.priority] || t.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <SlaChip deadline={t.slaDeadline} />
                        </td>
                        <td className="px-4 py-3">
                          {!['COMPLETED', 'CANCELLED'].includes(t.status) && (
                            <button
                              onClick={() => { setUpdateModal(t); setNewTaskStatus(t.status); }}
                              className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-semibold"
                            >
                              تحديث
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tasksData?.meta && (
                <div className="p-4 border-t border-gray-100">
                  <Pagination
                    page={tasksData.meta.page}
                    totalPages={tasksData.meta.totalPages}
                    total={tasksData.meta.total}
                    limit={limit}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* ── Approvals Tab ── */}
      {tab === 'approvals' && (
        <Card noPadding>
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className="relative">
              <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={approvalStatus}
                onChange={(e) => { setApprovalStatus(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-xl py-2 pr-8 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none bg-white"
              >
                {APPROVAL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loadingApprovals ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={28} className="animate-spin text-brand-500" />
            </div>
          ) : approvals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
              <CheckSquare size={36} />
              <p className="text-sm">لا توجد طلبات موافقة</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-right">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">رقم الطلب</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">النوع</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">مقدَّم من</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">الحالة</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">التاريخ</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {approvals.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-brand-700">{a.approvalNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {APPROVAL_TYPE_AR[a.approvalType] || a.approvalType}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {a.requestedBy?.fullName || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {a.status === 'PENDING' ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                              <Clock size={11} />
                              بانتظار الموافقة
                            </span>
                          ) : a.status === 'APPROVED' ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 size={11} />
                              معتمد
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                              <XSquare size={11} />
                              مرفوض
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(a.createdAt)}</td>
                        <td className="px-4 py-3">
                          {a.status === 'PENDING' && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => approveMutation.mutate(a.id)}
                                disabled={approveMutation.isPending}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg"
                              >
                                {approveMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                                موافقة
                              </button>
                              <button
                                onClick={() => setRejectModal(a)}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold rounded-lg"
                              >
                                <XSquare size={10} />
                                رفض
                              </button>
                            </div>
                          )}
                          {a.decisionNotes && (
                            <p className="text-xs text-gray-400 mt-0.5 max-w-[150px] truncate">{a.decisionNotes}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {approvalsData?.meta && (
                <div className="p-4 border-t border-gray-100">
                  <Pagination
                    page={approvalsData.meta.page}
                    totalPages={approvalsData.meta.totalPages}
                    total={approvalsData.meta.total}
                    limit={limit}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* ── Update Task Modal ── */}
      {updateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
          <Card className="w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">{updateModal.title}</h2>
            <p className="text-xs text-gray-400 mb-4">{updateModal.taskNumber}</p>
            <div className="space-y-3">
              {['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
                <button
                  key={s}
                  onClick={() => setNewTaskStatus(s)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                    newTaskStatus === s
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-100 hover:border-gray-200 text-gray-600'
                  )}
                >
                  {s === 'COMPLETED' ? <CheckCircle2 size={14} className="text-emerald-500" /> :
                   s === 'CANCELLED' ? <XSquare size={14} className="text-red-400" /> :
                   s === 'IN_PROGRESS' ? <Zap size={14} className="text-blue-500" /> :
                   <Clock size={14} className="text-amber-400" />}
                  {TASK_STATUS_AR[s]}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => updateTaskMutation.mutate({ id: updateModal.id, status: newTaskStatus })}
                disabled={updateTaskMutation.isPending || newTaskStatus === updateModal.status}
                className="flex-1 flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
              >
                {updateTaskMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                تحديث
              </button>
              <button
                onClick={() => { setUpdateModal(null); setNewTaskStatus(''); }}
                className="px-4 py-2.5 text-gray-500 font-semibold text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Reject Approval Modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
          <Card className="w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <XSquare size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">رفض الطلب</h2>
                <p className="text-xs text-gray-400">{rejectModal.approvalNumber}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">سبب الرفض *</label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="اكتب سبب الرفض…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => rejectMutation.mutate({ id: rejectModal.id, notes: rejectNotes })}
                  disabled={!rejectNotes.trim() || rejectMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
                >
                  {rejectMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <XSquare size={13} />}
                  تأكيد الرفض
                </button>
                <button
                  onClick={() => { setRejectModal(null); setRejectNotes(''); }}
                  className="px-4 py-2.5 text-gray-500 font-semibold text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
