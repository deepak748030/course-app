import { BookOpen, IndianRupee, ShoppingBag, Star, TrendingDown, TrendingUp, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api/client';
import { useRealtimeRefresh } from '../api/realtime';
import type { Overview } from '../api/types';
import {
  Badge,
  Card,
  CardHeader,
  CourseCover,
  LoadingBlock,
  formatDateTime,
  formatInr,
} from '../components/ui';
import { ADMIN_THEMES, useAdminTheme } from '../theme/adminTheme';


function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        up ? 'bg-success-soft text-success' : 'bg-error-soft text-error'
      }`}
    >
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? '+' : ''}
      {value}%
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  note,
}: {
  icon: typeof IndianRupee;
  label: string;
  value: string;
  delta?: number;
  note?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft">
          <Icon size={18} className="text-brand-ink" />
        </div>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[13px] text-muted">
        {label}
        {note && <span className="text-subtle"> · {note}</span>}
      </p>
    </Card>
  );
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid rgba(16,35,26,0.12)',
  background: '#fff',
  fontSize: 12,
  fontFamily: "'DM Sans', sans-serif",
  boxShadow: 'none',
};

export default function Dashboard() {
  const [chartTheme] = useAdminTheme();
  const { brand: BRAND, gold: GOLD } = ADMIN_THEMES[chartTheme].chart;
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .overview()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load overview'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // New orders, signups and reviews move the KPIs — the server tells us when they land.
  useRealtimeRefresh(['order.created', 'user.registered', 'review.created'], load);

  if (error) return <Card className="p-6 text-sm text-error">{error}</Card>;
  if (!data) return <Card><LoadingBlock label="Crunching the numbers…" /></Card>;

  const { kpis } = data;
  const maxTopRevenue = Math.max(1, ...data.topCourses.map((c) => c.revenue30));
  const maxCategoryEnroll = Math.max(1, ...data.categoryBreakdown.map((c) => c.enrollments30));
  const totalRatings = data.ratingDistribution.reduce((s, r) => s + r.count, 0) || 1;
  const donutColors: Record<number, string> = {
    5: GOLD,
    4: BRAND,
    3: '#FFDF87',
    2: '#EFE8D2',
    1: '#DCD5C2',
  };

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={IndianRupee} label="Revenue · last 30 days" value={formatInr(kpis.revenue30)} delta={kpis.revenueDelta} />
        <KpiCard icon={ShoppingBag} label="Orders · last 30 days" value={String(kpis.orders30)} delta={kpis.ordersDelta} />
        <KpiCard icon={UserPlus} label="New learners · last 30 days" value={String(kpis.newUsers30)} delta={kpis.newUsersDelta} />
        <KpiCard icon={BookOpen} label="Enrollments · last 30 days" value={String(kpis.enrollments30)} delta={kpis.enrollmentsDelta} />
      </div>

      {/* secondary chips */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Badge tone="outline"><Users size={12} /> {kpis.totalUsers} total learners</Badge>
        <Badge tone="outline"><BookOpen size={12} /> {kpis.publishedCourses}/{kpis.totalCourses} courses published</Badge>
        <Badge tone="brand"><Star size={12} /> {kpis.avgRating} average rating</Badge>
      </div>

      {/* revenue + enrollments */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Revenue" subtitle="Paid orders per day, last 30 days" />
          <div className="px-2 py-4">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.revenueSeries} margin={{ top: 5, right: 20, left: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={BRAND} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(16,35,26,0.07)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} interval={4} />
                <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [formatInr(Number(value)), 'Revenue']}
                  labelStyle={{ fontWeight: 600, color: '#0F231A' }}
                />
                <Area type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={2} fill="url(#revFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Enrollments" subtitle="New learners per day, last 14 days" />
          <div className="px-2 py-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.enrollmentSeries} margin={{ top: 5, right: 16, left: -14, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(16,35,26,0.07)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} interval={1} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, 'Enrollments']} labelStyle={{ fontWeight: 600, color: '#0F231A' }} cursor={{ fill: 'rgba(16,35,26,0.04)' }} />
                <Bar dataKey="enrollments" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* top courses + rating distribution */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Top courses" subtitle="By revenue, last 30 days" />
          <div className="space-y-4 p-5">
            {data.topCourses.map((course, i) => (
              <div key={course.id} className="flex items-center gap-3">
                <span className="w-4 text-[13px] font-bold text-subtle">{i + 1}</span>
                <CourseCover title={course.title} coverUrl={course.coverUrl} className="h-9 w-12" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold">{course.title}</p>
                    <p className="shrink-0 text-[13px] font-bold">{formatInr(course.revenue30)}</p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/6">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(course.revenue30 / maxTopRevenue) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-subtle">
                    {course.enrollments30} enrollment{course.enrollments30 === 1 ? '' : 's'} · ★ {course.rating}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader title="Rating distribution" subtitle="All visible reviews" />
          <div className="flex items-center gap-4 p-5">
            <ResponsiveContainer width={168} height={168}>
              <PieChart>
                <Pie
                  data={data.ratingDistribution}
                  dataKey="count"
                  nameKey="stars"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.ratingDistribution.map((entry) => (
                    <Cell key={entry.stars} fill={donutColors[entry.stars]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value, `${name} star${Number(name) === 1 ? '' : 's'}`]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {data.ratingDistribution.map((entry) => (
                <div key={entry.stars} className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full" style={{ background: donutColors[entry.stars] }} />
                  <span className="w-12 text-[13px] font-medium">{entry.stars} star</span>
                  <span className="flex-1 text-right text-[13px] font-bold">{entry.count}</span>
                  <span className="w-10 text-right text-xs text-subtle">{Math.round((entry.count / totalRatings) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader title="Categories" subtitle="Enrollments by track, last 30 days" />
          <div className="space-y-3.5 p-5">
            {data.categoryBreakdown.map((cat) => (
              <div key={cat.label}>
                <div className="flex items-baseline justify-between">
                  <p className="text-[13px] font-semibold">{cat.label}</p>
                  <p className="text-[13px] font-bold">{cat.enrollments30}</p>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/6">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${(cat.enrollments30 / maxCategoryEnroll) * 100}%` }} />
                </div>
                <p className="mt-0.5 text-xs text-subtle">{cat.courses} course{cat.courses === 1 ? '' : 's'}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* recent activity */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Recent orders" subtitle="The latest purchases across the platform" />
          <div className="divide-y divide-line-soft">
            {data.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{order.user?.name || 'Deleted learner'}</p>
                  <p className="truncate text-xs text-subtle">{order.user?.email}</p>
                </div>
                <p className="hidden w-44 truncate text-[13px] text-muted sm:block">{order.courseTitle}</p>
                <Badge tone={order.status === 'paid' ? 'success' : order.status === 'refunded' ? 'error' : 'brand'}>
                  {order.status}
                </Badge>
                <p className="w-20 text-right text-[13px] font-bold">{formatInr(order.amountInr)}</p>
                <p className="hidden w-24 text-right text-xs text-subtle md:block">{formatDateTime(order.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="New learners" subtitle="Latest sign-ups" />
          <div className="divide-y divide-line-soft">
            {data.recentUsers.map((u) => (
              <div key={u._id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-ink">
                  {u.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{u.name}</p>
                  <p className="truncate text-xs text-subtle">{u.email}</p>
                </div>
                <p className="text-xs text-subtle">{formatDateTime(u.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
