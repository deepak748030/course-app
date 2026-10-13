import { Pencil, Plus, TicketPercent, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Coupon } from '../api/types';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  PrefixInput,
  EmptyState,
  Field,
  Input,
  TableSkeleton,
  Modal,
  Pagination,
  SearchInput,
  Select,
  Toggle,
  formatDate,
  usePagination,
  useToast,
} from '../components/ui';

type FormState = {
  code: string;
  description: string;
  type: 'percent' | 'flat';
  value: string;
  maxUses: string;
  expiresAt: string;
  active: boolean;
};
const emptyForm: FormState = { code: '', description: '', type: 'percent', value: '', maxUses: '0', expiresAt: '', active: true };

function isLive(coupon: Coupon) {
  if (!coupon.active) return false;
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return false;
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) return false;
  return true;
}

export default function Coupons() {
  const toast = useToast();
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [search, setSearch] = useState('');

  const matches = useMemo(() => {
    if (!coupons) return null;
    const q = search.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter((c) => `${c.code} ${c.description}`.toLowerCase().includes(q));
  }, [coupons, search]);
  const pager = usePagination(matches, 10, search);

  const load = useCallback(async () => {
    try {
      setCoupons(await api.listCoupons());
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to load coupons');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: String(coupon.value),
      maxUses: String(coupon.maxUses),
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
      active: coupon.active,
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.code.trim() || !form.value) {
      toast('error', 'Code and value are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        type: form.type,
        value: Number(form.value),
        maxUses: Number(form.maxUses) || 0,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        active: form.active,
      };
      if (editing) {
        await api.updateCoupon(editing._id, payload);
        toast('success', `${payload.code} updated`);
      } else {
        await api.createCoupon(payload);
        toast('success', `${payload.code} created`);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(coupon: Coupon) {
    try {
      await api.updateCoupon(coupon._id, { active: !coupon.active });
      toast('success', coupon.active ? `${coupon.code} deactivated` : `${coupon.code} activated`);
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not update coupon');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api.deleteCoupon(deleting._id);
      toast('success', `${deleting.code} deleted`);
      setDeleting(null);
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Delete failed');
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Codes learners can apply at checkout in the app.</p>
        <div className="flex w-full items-center gap-2.5 sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="Search code or description…" className="min-w-0 flex-1 sm:w-64 sm:flex-none" />
          <Button icon={Plus} onClick={openCreate} className="shrink-0">New coupon</Button>
        </div>
      </div>

      <Card>
        {coupons === null ? (
          <TableSkeleton rows={6} />
        ) : coupons.length === 0 ? (
          <EmptyState icon={TicketPercent} title="No coupons yet" message="Create a discount code to run a promotion." action={<Button icon={Plus} onClick={openCreate}>New coupon</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['Code', 'Discount', 'Usage', 'Expires', 'Status', ''].map((h) => (
                    <th key={h} className={`whitespace-nowrap border-b border-line px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-subtle ${h === 'Expires' ? 'hidden md:table-cell' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pager.rows.map((coupon) => {
                  const live = isLive(coupon);
                  return (
                    <tr key={coupon._id} className="group hover:bg-canvas/60">
                      <td className="border-b border-line-soft px-4 py-3">
                        <span className="rounded-md bg-brand-soft px-2 py-1 font-mono text-[13px] font-bold text-brand-ink">{coupon.code}</span>
                        {coupon.description && <p className="mt-1 text-xs text-subtle">{coupon.description}</p>}
                      </td>
                      <td className="border-b border-line-soft px-4 py-3 font-semibold">
                        {coupon.type === 'percent' ? `${coupon.value}% off` : `₹${coupon.value} off`}
                      </td>
                      <td className="border-b border-line-soft px-4 py-3">
                        <p className="font-semibold">{coupon.usedCount}{coupon.maxUses > 0 ? ` / ${coupon.maxUses}` : ' uses'}</p>
                        {coupon.maxUses > 0 && (
                          <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-ink/6">
                            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (coupon.usedCount / coupon.maxUses) * 100)}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="hidden border-b border-line-soft px-4 py-3 text-muted md:table-cell">{coupon.expiresAt ? formatDate(coupon.expiresAt) : 'Never'}</td>
                      <td className="border-b border-line-soft px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Toggle checked={coupon.active} onChange={() => toggleActive(coupon)} label={`${coupon.code} active`} />
                          <Badge tone={live ? 'success' : 'neutral'}>{live ? 'Live' : 'Inactive'}</Badge>
                        </div>
                      </td>
                      <td className="border-b border-line-soft px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                          <button title="Edit" onClick={() => openEdit(coupon)} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink">
                            <Pencil size={15} />
                          </button>
                          <button title="Delete" onClick={() => setDeleting(coupon)} className="rounded-md p-1.5 text-muted hover:bg-error-soft hover:text-error">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {coupons && coupons.length > 0 && pager.total === 0 && (
          <EmptyState icon={TicketPercent} title="No matching coupons" message="Try a different search." />
        )}
        {pager.total > 0 && (
          <Pagination page={pager.page} pageCount={pager.pageCount} pageSize={pager.pageSize} total={pager.total} onPage={pager.setPage} />
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.code}` : 'New coupon'}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Code" hint="Learners type this at checkout.">
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="DIWALI20" disabled={Boolean(editing)} />
            </Field>
            <Field label="Active">
              <div className="flex h-10 items-center">
                <Toggle checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="Active" />
                <span className="ml-2 text-sm font-semibold">{form.active ? 'Yes' : 'No'}</span>
              </div>
            </Field>
          </div>
          <Field label="Description">
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Shown to admins only" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FormState['type'] }))}>
                <option value="percent">Percent off</option>
                <option value="flat">Flat ₹ off</option>
              </Select>
            </Field>
            <Field label={form.type === 'percent' ? 'Percent (1–90)' : 'Amount'}>
              {form.type === 'percent' ? (
                <Input type="number" min={1} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
              ) : (
                <PrefixInput prefix="₹" type="number" min={1} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
              )}
            </Field>
            <Field label="Max uses" hint="0 = unlimited.">
              <Input type="number" min={0} value={form.maxUses} onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))} />
            </Field>
            <Field label="Expires" hint="Optional — empty means never.">
              <Input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editing ? 'Save changes' : 'Create coupon'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this coupon?"
        message={`${deleting?.code} will stop working immediately. Orders that used it keep their discount.`}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
