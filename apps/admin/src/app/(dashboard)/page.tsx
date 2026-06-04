'use client';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, ordersApi, logisticsApi, qualityApi } from '@/lib/api';
import StatCard from '@/components/shared/StatCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  ShoppingCart, DollarSign, AlertTriangle, Star,
  TrendingUp, Package, CheckSquare, Users,
} from 'lucide-react';

// Chart palette anchored on brand green (#16a34a). Distinct hues kept for
// pie-chart category distinction.
const PIE_COLORS = ['#16a34a', '#0891b2', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardApi.overview().then((r) => r.data),
  });

  const { data: trends } = useQuery({
    queryKey: ['order-trends'],
    queryFn: () => dashboardApi.orderTrends(30).then((r) => r.data),
  });

  const { data: orderStats } = useQuery({
    queryKey: ['order-stats'],
    queryFn: () => ordersApi.stats().then((r) => r.data),
  });

  const { data: logisticsStats } = useQuery({
    queryKey: ['logistics-stats'],
    queryFn: () => logisticsApi.stats().then((r) => r.data),
  });

  const { data: qualityStats } = useQuery({
    queryKey: ['quality-stats'],
    queryFn: () => qualityApi.stats().then((r) => r.data),
  });

  const { data: topFarmers } = useQuery({
    queryKey: ['top-farmers'],
    queryFn: () => dashboardApi.topFarmers(5).then((r) => r.data),
  });

  const { data: topBuyers } = useQuery({
    queryKey: ['top-buyers'],
    queryFn: () => dashboardApi.topBuyers(5).then((r) => r.data),
  });

  if (loadingOverview) return <PageSpinner />;

  const ov = overview || {};
  const orderStatusData = orderStats
    ? Object.entries(orderStats.byStatus || {})
        .filter(([, v]) => (v as number) > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Orders"
          value={ov.orders?.total ?? 0}
          sub="All time"
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          label="Revenue (MTD)"
          value={formatCurrency(ov.financial?.revenueThisMonth ?? 0)}
          sub="This month"
          icon={DollarSign}
          color="green"
        />
        <StatCard
          label="Active Disputes"
          value={ov.disputes?.open ?? 0}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          label="Pending Payouts"
          value={ov.financial?.pendingPayouts ?? 0}
          icon={CheckSquare}
          color="yellow"
        />
        <StatCard
          label="Farmers"
          value={ov.users?.farmers ?? 0}
          icon={Users}
          color="indigo"
        />
        <StatCard
          label="Buyers"
          value={ov.users?.buyers ?? 0}
          icon={Users}
          color="purple"
        />
        <StatCard
          label="Inspections Today"
          value={qualityStats?.pendingToday ?? 0}
          sub="Pending"
          icon={Star}
          color="yellow"
        />
        <StatCard
          label="Active Shipments"
          value={logisticsStats?.DRIVER_ASSIGNED ?? 0}
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Trends */}
        <Card className="lg:col-span-2" noPadding>
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Order Volume (30 days)</h3>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends || []}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#16a34a"
                  strokeWidth={2}
                  fill="url(#colorOrders)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Order Status Pie */}
        <Card noPadding>
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Orders by Status</h3>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                >
                  {orderStatusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Farmers */}
        <Card noPadding>
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Top Farmers by Revenue</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {(topFarmers || []).slice(0, 5).map((f: { farmer?: { businessName: string }; orderCount: number; totalRevenue: number }, i: number) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {f.farmer?.businessName || '—'}
                    </p>
                    <p className="text-xs text-gray-400">{f.orderCount} orders</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(f.totalRevenue)}
                </p>
              </div>
            ))}
            {(!topFarmers || topFarmers.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
            )}
          </div>
        </Card>

        {/* Top Buyers */}
        <Card noPadding>
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Top Buyers by Spend</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {(topBuyers || []).slice(0, 5).map((b: { buyer?: { businessName: string }; orderCount: number; totalSpent: number }, i: number) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {b.buyer?.businessName || '—'}
                    </p>
                    <p className="text-xs text-gray-400">{b.orderCount} orders</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(b.totalSpent)}
                </p>
              </div>
            ))}
            {(!topBuyers || topBuyers.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
