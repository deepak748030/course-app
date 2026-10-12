import { IndianRupee, ShoppingBag, Tag } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useRealtimeRefresh } from '../api/realtime';
import type { Order, OrderStatus } from '../api/types';
import { StatusMenu, type StatusOption } from '../components/StatusMenu';
import {
  Badge,
  Card,
  ConfirmDialog,
  EmptyState,
  LoadingBlock,
  Pagination,
  SearchInput,
  formatDateTime,
  formatInr,
  usePagination,
  useToast,
} from '../components/ui';

const STATUS_TABS: { id: string; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'pending', label: 'Pending' },
  { id: 'refunded', label: 'Refunded' },
];

const STATUS_OPTIONS: StatusOption<OrderStatus>[] = [
  { value: 'pending', label: 'Pending', tone: 'brand', hint: 'Payment not confirmed yet. The learner has no access.' },
  { value: 'paid', label: 'Paid', tone: 'success', hint: 'Payment received. The course is unlocked for the learner.' },
  { value: 'refunded', label: 'Refunded', tone: 'error', hint: 'Money returned. The learner loses access to the course.' },
];

export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [totals, setTotals] = useState({ count: 0, paid: 0, discounts: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<Order | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.listOrders({ status: statusFilter || undefined, search: search || undefined });
      setOrders(res.orders);
      setTotals(res.totals);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to load orders');
    }
  }, [statusFilter, search, toast]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useRealtimeRefresh(['order.created'], load);

  const pager = usePagination(orders, 10, `${statusFilter}|${search}`);

  async function changeStatus(order: Order, status: OrderStatus) {
    if (order.status === status) return;
    // A refund takes the course away from the learner, so it is confirmed first.
    if (status === 'refunded') {
      setRefundTarget(order);
      return;
    }
    await runStatusChange(order, status);
  }

  async function runStatusChange(order: Order, status: OrderStatus) {
    setBusyId(order._id);
    try {
      await api.updateOrder(order._id, status);
      toast('success', status === 'refunded' ? `Order refunded — enrollment removed` : `Order marked ${status}`);
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not update order');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* summary + filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex w-full overflow-x-auto rounded-lg border border-line bg-surface p-0.5 sm:w-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                statusFilter === tab.id ? 'bg-brand text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search course, learner or coupon…" className="w-full sm:w-72" />
        <div className="hidden flex-1 md:block" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <ShoppingBag size={14} /> {totals.count} orders
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-success">
            <IndianRupee size={14} /> {formatInr(totals.paid)} collected
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Tag size={14} /> {formatInr(totals.discounts)} discounted
          </span>
        </div>
      </div>

      <Card>
        {orders === null ? (
          <LoadingBlock label="Loading orders…" />
        ) : orders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No orders here" message="Try another status tab or a different search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['Order', 'Learner', 'Course', 'Coupon', 'Amount', 'Paid at', 'Status'].map((h) => (
                    <th key={h} className={`whitespace-nowrap border-b border-line px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-subtle ${h === 'Coupon' || h === 'Paid at' ? 'hidden md:table-cell' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pager.rows.map((order) => (
                  <tr key={order._id} className="hover:bg-canvas/60">
                    <td className="border-b border-line-soft px-4 py-3 font-mono text-xs text-subtle">
                      #{order._id.slice(-8)}
                      <p className="font-sans text-xs">{order.paymentMethod.toUpperCase()}</p>
                    </td>
                    <td className="border-b border-line-soft px-4 py-3">
                      <p className="font-semibold">{order.user?.name || 'Deleted learner'}</p>
                      <p className="truncate text-xs text-subtle">{order.user?.email || ''}</p>
                    </td>
                    <td className="border-b border-line-soft px-4 py-3 font-medium">{order.courseTitle}</td>
                    <td className="hidden border-b border-line-soft px-4 py-3 md:table-cell">
                      {order.couponCode ? (
                        <div>
                          <Badge tone="brand">{order.couponCode}</Badge>
                          {order.discountInr > 0 && <p className="mt-1 text-xs text-subtle">−{formatInr(order.discountInr)}</p>}
                        </div>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                    <td className="border-b border-line-soft px-4 py-3">
                      <p className="font-bold">{formatInr(order.amountInr)}</p>
                      {order.listAmountInr != null && order.listAmountInr !== order.amountInr && (
                        <p className="text-xs text-subtle line-through">{formatInr(order.listAmountInr)}</p>
                      )}
                    </td>
                    <td className="hidden border-b border-line-soft px-4 py-3 text-muted md:table-cell">{formatDateTime(order.createdAt)}</td>
                    <td className="border-b border-line-soft px-4 py-3">
                      <div>
                        <StatusMenu<OrderStatus>
                          label={`Status of order ${order._id}`}
                          value={order.status}
                          options={STATUS_OPTIONS}
                          disabled={busyId === order._id}
                          onChange={(next) => changeStatus(order, next)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {orders && orders.length > 0 && (
          <Pagination page={pager.page} pageCount={pager.pageCount} pageSize={pager.pageSize} total={pager.total} onPage={pager.setPage} />
        )}
      </Card>

      <ConfirmDialog
        open={refundTarget !== null}
        title="Refund this order?"
        message="The learner loses access to this course. Use this only after the money has gone back to the learner."
        confirmLabel="Refund order"
        onCancel={() => setRefundTarget(null)}
        onConfirm={() => {
          const order = refundTarget;
          setRefundTarget(null);
          if (order) void runStatusChange(order, 'refunded');
        }}
      />
    </div>
  );
}
