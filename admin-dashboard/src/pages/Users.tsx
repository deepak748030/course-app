import { Ban, ShieldCheck, Trash2, Users as UsersIcon, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AdminUser } from '../api/types';
import {
  Badge,
  Card,
  ConfirmDialog,
  EmptyState,
  LoadingBlock,
  SearchInput,
  Select,
  formatDate,
  formatInr,
  initials,
  useToast,
} from '../components/ui';

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [blockedFilter, setBlockedFilter] = useState('');
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await api.listUsers({ search, role: roleFilter || undefined, blocked: blockedFilter || undefined }));
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to load learners');
    }
  }, [search, roleFilter, blockedFilter, toast]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function toggleBlocked(user: AdminUser) {
    setBusyId(user._id);
    try {
      await api.updateUser(user._id, { blocked: !user.blocked });
      toast('success', user.blocked ? `${user.name} unblocked` : `${user.name} blocked from the app`);
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not update user');
    } finally {
      setBusyId(null);
    }
  }

  async function promote(user: AdminUser) {
    setBusyId(user._id);
    try {
      await api.updateUser(user._id, { role: user.role === 'admin' ? 'user' : 'admin' });
      toast('success', user.role === 'admin' ? `${user.name} is now a learner` : `${user.name} is now an admin`);
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not change role');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api.deleteUser(deleting._id);
      toast('success', `${deleting.name} deleted`);
      setDeleting(null);
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Delete failed');
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or phone…" className="w-72" />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-36">
          <option value="">All roles</option>
          <option value="user">Learners</option>
          <option value="admin">Admins</option>
        </Select>
        <Select value={blockedFilter} onChange={(e) => setBlockedFilter(e.target.value)} className="w-36">
          <option value="">Any status</option>
          <option value="false">Active</option>
          <option value="true">Blocked</option>
        </Select>
      </div>

      <Card>
        {users === null ? (
          <LoadingBlock label="Loading learners…" />
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No learners found" message="Adjust the search or filters, or wait for new sign-ups from the app." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['Learner', 'Role', 'Status', 'Courses', 'Spent', 'Joined', ''].map((h, i) => (
                    <th key={i} className="whitespace-nowrap border-b border-line px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-subtle">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="group hover:bg-canvas/60">
                    <td className="border-b border-line-soft px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-ink text-white' : 'bg-brand-soft text-brand-ink'}`}>
                          {initials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold">{user.name}</p>
                          <p className="truncate text-xs text-subtle">{user.email}{user.phone ? ` · ${user.phone}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-line-soft px-4 py-3">
                      {user.role === 'admin' ? <Badge tone="info">Admin</Badge> : <Badge tone="outline">Learner</Badge>}
                    </td>
                    <td className="border-b border-line-soft px-4 py-3">
                      {user.blocked ? <Badge tone="error">Blocked</Badge> : <Badge tone="success">Active</Badge>}
                    </td>
                    <td className="border-b border-line-soft px-4 py-3 font-semibold">{user.enrollmentCount ?? 0}</td>
                    <td className="border-b border-line-soft px-4 py-3 font-semibold">{formatInr(user.totalSpentInr ?? 0)}</td>
                    <td className="border-b border-line-soft px-4 py-3 text-muted">{formatDate(user.createdAt)}</td>
                    <td className="border-b border-line-soft px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          title={user.role === 'admin' ? 'Make learner' : 'Make admin'}
                          disabled={busyId === user._id || user.role === 'admin'}
                          onClick={() => promote(user)}
                          className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink disabled:opacity-30"
                        >
                          <ShieldCheck size={15} />
                        </button>
                        <button
                          title={user.blocked ? 'Unblock' : 'Block'}
                          disabled={busyId === user._id || user.role === 'admin'}
                          onClick={() => toggleBlocked(user)}
                          className={`rounded-md p-1.5 text-muted hover:bg-ink/5 disabled:opacity-30 ${user.blocked ? 'hover:text-success' : 'hover:text-error'}`}
                        >
                          {user.blocked ? <XCircle size={15} /> : <Ban size={15} />}
                        </button>
                        <button
                          title="Delete"
                          disabled={user.role === 'admin'}
                          onClick={() => setDeleting(user)}
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
      </Card>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this learner?"
        message={`${deleting?.name} (${deleting?.email}) will be removed along with their orders, enrollments and reviews. This cannot be undone.`}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
