'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, Clock, Loader2, RefreshCw, AlertCircle,
  Code2, Layout, Bell, CreditCard, FileText, Shield,
  Search, BarChart3, Zap, Warehouse, Star,
  ShoppingBag, Package, Activity, ChevronDown, ChevronUp,
  TrendingUp, Users, Truck, Globe, Database, Cpu, Filter,
  Calendar, Tag, Layers,
} from 'lucide-react';

interface Task {
  id: number;
  phase: string;
  subject: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'backend' | 'admin' | 'farmer' | 'buyer' | 'driver';
  estimate: string;
}

interface Phase {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  status: 'completed' | 'in_progress' | 'pending';
}

interface Project {
  name: string;
  version: string;
  startDate: string;
  targetDate: string;
}

interface TasksData {
  lastUpdated: string;
  project?: Project;
  phases?: Phase[];
  tasks: Task[];
}

const TASK_ICONS: Record<number, React.ElementType> = {
  1: Database, 2: Shield, 3: Tag, 4: Package, 5: Layout,
  6: ShoppingBag, 7: Bell, 8: CreditCard, 9: FileText, 10: Search,
  11: Warehouse, 12: Users, 13: FileText, 14: AlertCircle, 15: ShoppingBag,
  16: Activity, 17: Shield, 18: Users, 19: Users, 20: ShoppingBag,
  21: Truck, 22: CreditCard, 23: AlertCircle, 24: Zap,
  25: FileText, 26: Globe, 27: BarChart3, 28: Truck, 29: Bell, 30: Cpu,
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  backend: { label: 'Backend', color: 'text-purple-700', bg: 'bg-purple-50' },
  admin:   { label: 'أدمن', color: 'text-blue-700', bg: 'bg-blue-50' },
  farmer:  { label: 'مزارع', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  buyer:   { label: 'مشتري', color: 'text-amber-700', bg: 'bg-amber-50' },
  driver:  { label: 'سائق', color: 'text-orange-700', bg: 'bg-orange-50' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  critical: { label: 'حرجة', color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
  high:     { label: 'عالية', color: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  medium:   { label: 'متوسطة', color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  low:      { label: 'منخفضة', color: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-400' },
};

const STATUS_CONFIG = {
  pending: {
    label: 'بانتظار التنفيذ', icon: Clock,
    color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-300',
    badge: 'bg-gray-100 text-gray-600',
  },
  in_progress: {
    label: 'قيد التنفيذ', icon: Loader2,
    color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500 animate-pulse',
    badge: 'bg-blue-100 text-blue-700',
  },
  completed: {
    label: 'مكتملة', icon: CheckCircle2,
    color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
  },
};

const PHASE_STATUS_CONFIG = {
  completed:  { label: 'مكتملة', icon: CheckCircle2, color: 'text-emerald-600' },
  in_progress:{ label: 'جارية', icon: Loader2, color: 'text-blue-600' },
  pending:    { label: 'قادمة', icon: Clock, color: 'text-gray-400' },
};

const DEFAULT_PHASES: Phase[] = [
  { id: 'phase0', name: 'المرحلة 0 — البنية التحتية', nameEn: 'Phase 0 — Infrastructure', color: '#6366f1', status: 'completed' },
  { id: 'phase1', name: 'المرحلة 1 — اكتمال البوابات', nameEn: 'Phase 1 — Portal Completeness', color: '#f59e0b', status: 'in_progress' },
  { id: 'phase2', name: 'المرحلة 2 — عمليات الأدمن', nameEn: 'Phase 2 — Admin Operations', color: '#3b82f6', status: 'pending' },
  { id: 'phase3', name: 'المرحلة 3 — ميزات متقدمة', nameEn: 'Phase 3 — Advanced Features', color: '#10b981', status: 'pending' },
];

function PhaseProgressBar({ phase, tasks }: { phase: Phase; tasks: Task[] }) {
  const [expanded, setExpanded] = useState(phase.status === 'in_progress');
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const cfg = PHASE_STATUS_CONFIG[phase.status];
  const StatusIcon = cfg.icon;

  return (
    <Card className="overflow-hidden">
      {/* Phase header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-right p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Color dot */}
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: phase.color }} />

          {/* Phase name */}
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">{phase.name}</span>
              <span className={cn('text-xs font-medium flex items-center gap-1', cfg.color)}>
                <StatusIcon size={12} className={phase.status === 'in_progress' ? 'animate-spin' : ''} />
                {cfg.label}
              </span>
              {inProgress > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                  {inProgress} جاري
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{phase.nameEn}</p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <p className="text-lg font-black text-gray-900">{pct}%</p>
              <p className="text-xs text-gray-400">{completed}/{total} مهمة</p>
            </div>
            {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: phase.color }}
          />
        </div>
      </button>

      {/* Tasks list */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {tasks.map((task) => {
            const cfg = STATUS_CONFIG[task.status];
            const Icon = TASK_ICONS[task.id] || Code2;
            const StatusIcon = cfg.icon;
            const catCfg = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.backend;
            const priCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

            return (
              <div
                key={task.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 transition-all',
                  task.status === 'in_progress' && 'bg-blue-50/60',
                  task.status === 'completed' && 'opacity-60',
                )}
              >
                {/* Task number badge */}
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black',
                  task.status === 'completed' ? 'bg-emerald-500 text-white' :
                  task.status === 'in_progress' ? 'bg-blue-600 text-white' :
                  'bg-gray-100 text-gray-500'
                )}>
                  {task.status === 'completed' ? <CheckCircle2 size={14} /> : task.id}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        'text-sm font-semibold leading-snug',
                        task.status === 'completed' ? 'line-through text-gray-400' :
                        task.status === 'in_progress' ? 'text-blue-900' : 'text-gray-800'
                      )}>
                        {task.subject}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
                        {task.description}
                      </p>
                    </div>

                    {/* Status + time */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <div className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                        <span className={cn('text-xs font-medium', cfg.color)}>
                          {cfg.label}
                        </span>
                        <StatusIcon size={11} className={cn(cfg.color, task.status === 'in_progress' && 'animate-spin')} />
                      </div>
                      <span className="text-xs text-gray-300">{task.estimate}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-md font-medium', catCfg.bg, catCfg.color)}>
                      {catCfg.label}
                    </span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-md border font-medium', priCfg.color)}>
                      {priCfg.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default function AutoclaudePage() {
  const [data, setData] = useState<TasksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'phases' | 'flat'>('phases');

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefresh(new Date());
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-brand-600" />
      </div>
    );
  }

  const tasks = data?.tasks || [];
  const phases = data?.phases || DEFAULT_PHASES;
  const project = data?.project;

  // Counts
  const counts = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };
  const overallPct = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
  const activeTask = tasks.find((t) => t.status === 'in_progress');

  // Filtered tasks (flat view)
  const filtered = tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterPhase !== 'all' && t.phase !== filterPhase) return false;
    return true;
  });

  // Tasks per phase
  const tasksByPhase = (phaseId: string) => tasks.filter((t) => t.phase === phaseId);

  // Estimated days remaining
  const parseDays = (est: string) => parseFloat(est.replace('d', '')) || 0;
  const daysRemaining = tasks
    .filter((t) => t.status !== 'completed')
    .reduce((sum, t) => sum + parseDays(t.estimate), 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <Code2 size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-900">Autoclaude</h1>
                <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                  Project Manager
                </span>
              </div>
              {project && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {project.name} • v{project.version}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {project && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
              <Calendar size={12} />
              <span>الهدف: {new Date(project.targetDate).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          )}
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              autoRefresh ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'
            )}
          >
            <Activity size={12} />
            {autoRefresh ? 'حي' : 'موقوف'}
          </button>
          <button
            onClick={fetchTasks}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={12} />
          </button>
          <span className="text-xs text-gray-400">
            {lastRefresh.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* ── Active Task Banner ── */}
      {activeTask && (
        <div className="bg-gradient-to-l from-brand-700 to-brand-600 rounded-2xl p-5 text-white shadow-lg shadow-brand-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Loader2 size={22} className="animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-brand-200 font-semibold uppercase tracking-widest">
                  Claude يعمل الآن على
                </span>
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                  مهمة #{activeTask.id}
                </span>
              </div>
              <p className="font-black text-lg leading-tight">{activeTask.subject}</p>
              <p className="text-sm text-brand-200 mt-1 truncate">{activeTask.description}</p>
            </div>
            <div className="text-center flex-shrink-0 bg-white/10 rounded-xl px-4 py-2">
              <p className="text-3xl font-black">{overallPct}%</p>
              <p className="text-xs text-brand-200 mt-0.5">إجمالي التقدم</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Overview ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'إجمالي المهام', value: counts.total, icon: Layers, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'مكتملة', value: counts.completed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'جارية الآن', value: counts.in_progress, icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50', spin: true },
          { label: 'أيام متبقية ~', value: daysRemaining.toFixed(1), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                <s.icon size={18} className={cn(s.color, s.spin && 'animate-spin')} />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 leading-tight">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Overall Progress Bar ── */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-600" />
            <span className="text-sm font-bold text-gray-800">التقدم الكلي للمشروع</span>
          </div>
          <span className="text-lg font-black text-brand-600">{overallPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
          <div
            className="h-4 rounded-full bg-gradient-to-l from-brand-500 to-brand-700 transition-all duration-700 relative"
            style={{ width: `${overallPct}%` }}
          >
            {overallPct > 10 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">
                {overallPct}%
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{counts.completed} مكتملة</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />{counts.in_progress} جارية</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />{counts.pending} متبقية</span>
        </div>
      </Card>

      {/* ── View toggle & Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View mode */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'phases', label: 'حسب المرحلة', icon: Layers },
            { key: 'flat', label: 'قائمة', icon: Filter },
          ].map((v) => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key as 'phases' | 'flat')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                viewMode === v.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <v.icon size={13} />
              {v.label}
            </button>
          ))}
        </div>

        {viewMode === 'flat' && (
          <>
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="all">كل الحالات</option>
              <option value="pending">بانتظار التنفيذ</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="completed">مكتملة</option>
            </select>

            {/* Phase filter */}
            <select
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="all">كل المراحل</option>
              {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {/* Category filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="all">كل الفئات</option>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <span className="text-xs text-gray-400 mr-auto">{filtered.length} مهمة</span>
          </>
        )}
      </div>

      {/* ── Phases View ── */}
      {viewMode === 'phases' && (
        <div className="space-y-4">
          {phases.map((phase) => (
            <PhaseProgressBar key={phase.id} phase={phase} tasks={tasksByPhase(phase.id)} />
          ))}
        </div>
      )}

      {/* ── Flat List View ── */}
      {viewMode === 'flat' && (
        <div className="space-y-2">
          {filtered.map((task) => {
            const cfg = STATUS_CONFIG[task.status];
            const Icon = TASK_ICONS[task.id] || Code2;
            const StatusIcon = cfg.icon;
            const catCfg = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.backend;
            const priCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
            const phaseInfo = phases.find((p) => p.id === task.phase);

            return (
              <div
                key={task.id}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-xl border-2 transition-all bg-white',
                  task.status === 'in_progress' && 'border-blue-200 shadow-md shadow-blue-50',
                  task.status === 'completed' && 'border-emerald-100 opacity-70',
                  task.status === 'pending' && 'border-gray-100',
                )}
              >
                {/* Number */}
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black',
                  task.status === 'completed' ? 'bg-emerald-500 text-white' :
                  task.status === 'in_progress' ? 'bg-blue-600 text-white' :
                  'bg-gray-100 text-gray-500'
                )}>
                  {task.status === 'completed' ? <CheckCircle2 size={16} /> : task.id}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-bold text-sm',
                    task.status === 'completed' ? 'line-through text-gray-400' :
                    task.status === 'in_progress' ? 'text-blue-900' : 'text-gray-800'
                  )}>
                    {task.subject}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {phaseInfo && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-medium text-white"
                        style={{ backgroundColor: phaseInfo.color + 'cc' }}>
                        {phaseInfo.nameEn}
                      </span>
                    )}
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-md font-medium', catCfg.bg, catCfg.color)}>
                      {catCfg.label}
                    </span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-md border font-medium', priCfg.color)}>
                      {priCfg.label}
                    </span>
                    <span className="text-xs text-gray-300">{task.estimate}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                  <span className={cn('text-xs font-semibold', cfg.color)}>{cfg.label}</span>
                  <StatusIcon size={12} className={cn(cfg.color, task.status === 'in_progress' && 'animate-spin')} />
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Filter size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد مهام تطابق الفلتر المحدد</p>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="text-center py-3 text-xs text-gray-300 border-t border-gray-100">
        <p>يتحدث كل 5 ثوانٍ • آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA')}</p>
        {data?.lastUpdated && (
          <p className="mt-0.5">آخر تحديث للبيانات: {new Date(data.lastUpdated).toLocaleString('ar-SA')}</p>
        )}
      </div>
    </div>
  );
}
