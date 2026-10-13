import { Pencil, Plus, Shapes, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useRealtimeRefresh } from '../api/realtime';
import type { Category } from '../api/types';
import { CATEGORY_ICON_NAMES, CategoryIcon } from '../components/icons';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Pagination,
  SearchInput,
  Select,
  usePagination,
  useToast,
} from '../components/ui';

type FormState = { label: string; slug: string; icon: string; sortOrder: string };
const emptyForm: FormState = { label: '', slug: '', icon: 'Shapes', sortOrder: '0' };

export default function Categories() {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [search, setSearch] = useState('');

  const matches = useMemo(() => {
    if (!categories) return null;
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => `${c.label} ${c.slug}`.toLowerCase().includes(q));
  }, [categories, search]);
  const pager = usePagination(matches, 10, search);

  const load = useCallback(async () => {
    try {
      setCategories(await api.listCategories());
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to load categories');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(['catalog.changed'], load);


  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, sortOrder: String((categories?.length || 0) + 1) });
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({ label: category.label, slug: category.slug, icon: category.icon, sortOrder: String(category.sortOrder) });
    setModalOpen(true);
  }

  async function save() {
    if (!form.label.trim()) {
      toast('error', 'Label is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
        icon: form.icon,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        await api.updateCategory(editing._id, payload);
        toast('success', `“${payload.label}” updated`);
      } else {
        await api.createCategory(payload);
        toast('success', `“${payload.label}” created`);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api.deleteCategory(deleting._id);
      toast('success', `“${deleting.label}” deleted`);
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
        <p className="text-sm text-muted">
          Tracks learners can browse in the app. Deleting is blocked while courses still use a category.
        </p>
        <div className="flex w-full items-center gap-2.5 sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="Search categories…" className="min-w-0 flex-1 sm:w-64 sm:flex-none" />
          <Button icon={Plus} onClick={openCreate} className="shrink-0">New category</Button>
        </div>
      </div>

      <Card>
        {categories === null ? (
          <LoadingBlock label="Loading categories…" />
        ) : categories.length === 0 ? (
          <EmptyState icon={Shapes} title="No categories yet" message="Create the first track for the catalog." action={<Button icon={Plus} onClick={openCreate}>New category</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['', 'Category', 'Slug', 'Icon', 'Order', 'Courses', ''].map((h, i) => (
                    <th key={i} className={`whitespace-nowrap border-b border-line px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-subtle ${['Slug', 'Icon', 'Order'].includes(h) ? 'hidden md:table-cell' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pager.rows.map((category) => (
                  <tr key={category._id} className="group hover:bg-canvas/60">
                    <td className="w-12 border-b border-line-soft px-4 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft">
                        <CategoryIcon name={category.icon} size={17} className="text-brand-ink" />
                      </div>
                    </td>
                    <td className="border-b border-line-soft px-4 py-3 font-semibold">{category.label}</td>
                    <td className="hidden border-b border-line-soft px-4 py-3 font-mono text-[13px] text-muted md:table-cell">/{category.slug}</td>
                    <td className="hidden border-b border-line-soft px-4 py-3 text-muted md:table-cell">{category.icon}</td>
                    <td className="hidden border-b border-line-soft px-4 py-3 text-muted md:table-cell">{category.sortOrder}</td>
                    <td className="border-b border-line-soft px-4 py-3 font-semibold">{category.courseCount ?? 0}</td>
                    <td className="border-b border-line-soft px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        <button title="Edit" onClick={() => openEdit(category)} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink">
                          <Pencil size={15} />
                        </button>
                        <button
                          title={category.courseCount ? 'In use by courses' : 'Delete'}
                          disabled={Boolean(category.courseCount)}
                          onClick={() => setDeleting(category)}
                          className="rounded-md p-1.5 text-muted hover:bg-error-soft hover:text-error disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {categories && categories.length > 0 && pager.total === 0 && (
          <EmptyState icon={Shapes} title="No matching categories" message="Try a different search." />
        )}
        {pager.total > 0 && (
          <Pagination page={pager.page} pageCount={pager.pageCount} pageSize={pager.pageSize} total={pager.total} onPage={pager.setPage} />
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit category' : 'New category'}>
        <div className="space-y-4">
          <Field label="Label">
            <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Milk handling" />
          </Field>
          <Field label="Slug" hint="Leave empty to generate from the label.">
            <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="milk" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Icon">
              <Select value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}>
                {CATEGORY_ICON_NAMES.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Sort order">
              <Input type="number" min={0} value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            </Field>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-surface-alt px-4 py-3">
            <CategoryIcon name={form.icon} size={18} className="text-brand-ink" />
            <span className="text-[13px] font-semibold">{form.label || 'New category'}</span>
            <span className="text-xs text-subtle">— preview as shown in the app</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editing ? 'Save changes' : 'Create category'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this category?"
        message={`“${deleting?.label}” will be removed. This cannot be undone.`}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
