import { Activity, Eye, IndianRupee, Search, ShoppingBag, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api/client';
import { useRealtimeRefresh } from '../api/realtime';
import type { AnalyticsOverview } from '../api/types';
import { Card, CardHeader, LoadingBlock, formatInr } from '../components/ui';

const GOLD = '#D9A400';
const BRAND = '#FFC629';
const INK = '#17150F';

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid rgba(23,21,15,0.12)',
  boxShadow: 'none',
  fontSize: 13,
};

const PERIODS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

function Kpi({ icon: Icon, label, value, note }: { icon: typeof Activity; label: string; value: string; note?: string }) {
  return (
    <Card className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft">
        <Icon size={18} className="text-brand-ink" />
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[13px] text-muted">{label}</p>
      {note ? <p className="mt-1 text-xs text-subtle">{note}</p> : null}
    </Card>
  );
}

function FunnelStep({ label, value, pct, tone }: { label: string; value: number; pct: number; tone: 'brand' | 'gold' | 'success' }) {
  const color = tone === 'brand' ? 'bg-brand' : tone === 'gold' ? 'bg-gold' : 'bg-success';
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-semibold">{label}</p>
        <p className="text-sm font-bold tabular-nums">{value.toLocaleString('en-IN')}</p>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink/6">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    api
      .analyticsOverview(days)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load analytics'));
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  // Orders and signups move these numbers live.
  useRealtimeRefresh(['order.created', 'user.registered'], load);

  if (error) return <Card className="p-6 text-sm text-error">{error}</Card>;
  if (!data) return <Card><LoadingBlock label="Crunching the numbers…" /></Card>;

  const { kpis, funnel } = data;
  const interval = data.daily.length > 40 ? 12 : data.daily.length > 14 ? 4 : 1;

  return (
    <div className="space-y-4">
      {/* period picker */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted">
          Requests, activity and conversions as the server records them — nothing here is estimated.
        </p>
        <div className="flex rounded-lg border border-line bg-surface p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                days === p.days ? 'bg-brand text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi icon={Activity} label="API requests" value={kpis.requests.total.toLocaleString('en-IN')} note={`${kpis.requests.today.toLocaleString('en-IN')} today`} />
        <Kpi icon={Users} label="Active users" value={kpis.activeUsers.dau.toLocaleString('en-IN')} note={`WAU ${kpis.activeUsers.wau.toLocaleString('en-IN')} · MAU ${kpis.activeUsers.mau.toLocaleString('en-IN')}`} />
        <Kpi icon={UserPlus} label="New signups" value={kpis.signups.total.toLocaleString('en-IN')} note={`${kpis.signups.today} today`} />
        <Kpi icon={ShoppingBag} label="Purchases" value={kpis.orders.count.toLocaleString('en-IN')} note={`${kpis.orders.today.count} today`} />
        <Kpi icon={IndianRupee} label="Revenue" value={formatInr(kpis.orders.revenueInr)} note={`${formatInr(kpis.orders.today.revenueInr)} today`} />
      </div>

      {/* traffic + uniques */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Traffic" subtitle="Server requests and unique learners per day" />
          <div className="px-2 py-4">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.daily} margin={{ top: 5, right: 20, left: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="reqFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={BRAND} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(23,21,15,0.07)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={interval} />
                <YAxis tickLine={false} axisLine={false} width={46} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600, color: INK }} />
                <Area type="monotone" dataKey="requests" name="Requests" stroke={GOLD} strokeWidth={2} fill="url(#reqFill)" />
                <Area type="monotone" dataKey="uniques" name="Unique learners" stroke={INK} strokeWidth={1.75} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Purchase funnel" subtitle={`View → checkout → paid, last ${data.periodDays} days`} />
          <div className="space-y-5 p-5">
            <FunnelStep label="Course views" value={funnel.courseViews} pct={100} tone="brand" />
            <FunnelStep
              label="Checkout started"
              value={funnel.checkoutStarted}
              pct={funnel.courseViews ? (funnel.checkoutStarted / funnel.courseViews) * 100 : 0}
              tone="gold"
            />
            <FunnelStep
              label="Paid orders"
              value={funnel.ordersPaid}
              pct={funnel.courseViews ? (funnel.ordersPaid / funnel.courseViews) * 100 : 0}
              tone="success"
            />
            <div className="rounded-lg bg-surface-alt p-3">
              <p className="text-2xl font-bold tracking-tight">{funnel.conversionPct}%</p>
              <p className="text-[13px] text-muted">of course views end in a purchase</p>
            </div>
          </div>
        </Card>
      </div>

      {/* peak hours + boards */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="When learners come" subtitle="Activity by hour, last 30 days" />
          <div className="px-2 py-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.peakHours} margin={{ top: 5, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(23,21,15,0.07)" />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} interval={3} tickFormatter={(h: number) => `${h}:00`} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(h) => `${h}:00 – ${Number(h) + 1}:00`}
                  formatter={(value) => [Number(value).toLocaleString('en-IN'), 'Events']}
                  cursor={{ fill: 'rgba(23,21,15,0.04)' }}
                />
                <Bar dataKey="count" fill={BRAND} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Most viewed" subtitle="Course pages opened" />
          <div className="space-y-4 p-5">
            {data.topViewed.length === 0 ? (
              <p className="text-[13px] text-subtle">No views recorded yet.</p>
            ) : (
              data.topViewed.map((course, i) => (
                <div key={course.id} className="flex items-center gap-3">
                  <span className="w-4 text-[13px] font-bold text-subtle">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{course.title}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/6">
                      <div
                        className="h-full rounded-full bg-gold"
                        style={{ width: `${(course.count / Math.max(data.topViewed[0].count, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-[13px] font-bold tabular-nums">
                    <Eye size={13} className="text-subtle" />
                    {course.count.toLocaleString('en-IN')}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Most purchased" subtitle="Paid orders per course" />
          <div className="space-y-4 p-5">
            {data.topPurchased.length === 0 ? (
              <p className="text-[13px] text-subtle">No purchases recorded yet.</p>
            ) : (
              data.topPurchased.map((course, i) => (
                <div key={course.id} className="flex items-center gap-3">
                  <span className="w-4 text-[13px] font-bold text-subtle">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold">{course.title}</p>
                      <p className="shrink-0 text-[13px] font-bold">{formatInr(course.revenueInr)}</p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/6">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(course.count / Math.max(data.topPurchased[0].count, 1)) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-subtle">
                      {course.count} order{course.count === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* searches */}
      <Card>
        <CardHeader title="What learners search for" subtitle="Terms typed into Explore — a gap here is a course waiting to be made" />
        <div className="flex flex-wrap gap-2 p-5">
          {data.topSearches.length === 0 ? (
            <p className="text-[13px] text-subtle">No searches recorded yet.</p>
          ) : (
            data.topSearches.map((term) => (
              <span
                key={term.query}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold"
              >
                <Search size={13} className="text-subtle" />
                {term.query}
                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-ink">
                  {term.count}
                </span>
              </span>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
