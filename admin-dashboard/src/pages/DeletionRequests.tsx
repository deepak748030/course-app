import { CheckCircle2, Copy, ExternalLink, MessageCircle, Phone, Smartphone, Trash2, UserX, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useRealtimeRefresh } from '../api/realtime';
import type { DeletionRequest, DeletionRequestStatus } from '../api/types';
import { HoldToConfirm } from '../components/HoldToConfirm';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ListSkeleton,
  Modal,
  Pagination,
  Textarea,
  formatDate,
  formatDateTime,
  formatInr,
  initials,
  usePagination,
  useToast,
} from '../components/ui';
import { PUBLIC_PATHS } from '../lib/legal';

const TABS: { id: DeletionRequestStatus | 'all'; label: string }[] = [
  { id: 'pending', label: 'To do' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

/** The date 7 working days (Mon–Fri) after `iso` — the promise on the public page. */
function dueDate(iso: string) {
  const date = new Date(iso);
  let added = 0;
  while (added < 7) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return date;
}

const formatPhone = (digits: string) => (/^\d{10}$/.test(digits) ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : digits);

type Action = { request: DeletionRequest; kind: 'delete' | 'done' | 'reject' };

export default function DeletionRequests() {
  const toast = useToast();
  const [tab, setTab] = useState<DeletionRequestStatus | 'all'>('pending');
  const [requests, setRequests] = useState<DeletionRequest[] | null>(null);
  const [counts, setCounts] = useState<Record<DeletionRequestStatus, number>>({ pending: 0, completed: 0, rejected: 0 });
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const pager = usePagination(requests, 10, tab);

  const load = useCallback(async () => {
    try {
      const res = await api.listDeletionRequests(tab);
      setRequests(res.requests);
      setCounts(res.counts);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not load deletion requests');
      setRequests([]);
    }
  }, [tab, toast]);

  useEffect(() => {
    setRequests(null);
    void load();
  }, [load]);

  useRealtimeRefresh(['deletion.requested', 'deletion.updated'], load);

  function open(request: DeletionRequest, kind: Action['kind']) {
    setNote(kind === 'delete' ? 'Confirmed with the account holder.' : '');
    setAction({ request, kind });
  }

  async function close() {
    if (!action) return;
    setBusy(true);
    try {
      const { deleted } = await api.updateDeletionRequest(action.request._id, {
        status: action.kind === 'reject' ? 'rejected' : 'completed',
        deleteAccount: action.kind === 'delete',
        note: note.trim(),
      });
      if (action.kind === 'delete' && deleted) {
        const kept = deleted.keptOrders ? ` ${deleted.keptOrders} paid order(s) stay in the order book as "Deleted learner".` : '';
        toast('success', `Account deleted with ${deleted.enrollments} course(s) and ${deleted.reviews} review(s).${kept}`);
      } else {
        toast('success', action.kind === 'reject' ? 'Request rejected' : 'Request marked as done');
      }
      setAction(null);
      void load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not update the request');
    } finally {
      setBusy(false);
    }
  }

  const copy = (value: string) => {
    void navigator.clipboard
      ?.writeText(value)
      .then(() => toast('success', 'Copied'))
      .catch(() => toast('error', 'Could not copy'));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full overflow-x-auto rounded-lg border border-line bg-surface p-0.5 sm:w-auto">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                tab === item.id ? 'bg-brand text-on-brand' : 'text-muted hover:text-ink'
              }`}
            >
              {item.label}
              {item.id !== 'all' && counts[item.id] > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[11px] ${
                    tab === item.id ? 'bg-white/20' : item.id === 'pending' ? 'bg-error text-white' : 'bg-ink/8'
                  }`}
                >
                  {counts[item.id]}
                </span>
              )}
            </button>
          ))}
        </div>
        <a
          href={PUBLIC_PATHS.deletion}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-ink hover:underline"
        >
          Open the public Delete account page
          <ExternalLink size={13} />
        </a>
      </div>

      <p className="text-[13px] leading-relaxed text-muted">
        Requests sent from the public <strong className="text-ink">Delete account</strong> page, plus the record of learners who deleted
        their account in the app. Before deleting, call or message the number to confirm the request is genuine. The page promises
        completion within 7 working days.
      </p>

      <Card>
        {requests === null ? (
          <ListSkeleton rows={4} />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={UserX}
            title={tab === 'pending' ? 'Nothing to do' : 'No requests here'}
            message={
              tab === 'pending'
                ? 'New requests from the Delete account page will appear here, with a live alert.'
                : 'Closed requests are kept for 180 days with the number masked, then removed.'
            }
          />
        ) : (
          <div className="divide-y divide-line-soft">
            {pager.rows.map((request) => {
              const pending = request.status === 'pending';
              const due = dueDate(request.createdAt);
              const overdue = pending && due.getTime() < Date.now();
              const account = request.account;
              return (
                <div key={request._id} className="flex flex-col gap-4 px-4 py-4 md:px-5 lg:flex-row">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded bg-canvas px-1.5 py-0.5 text-[12px] font-semibold text-ink">{request.reference}</code>
                      <Badge tone={request.source === 'app' ? 'info' : 'outline'}>
                        {request.source === 'app' ? (
                          <>
                            <Smartphone size={11} /> In the app
                          </>
                        ) : (
                          'Website'
                        )}
                      </Badge>
                      {request.status === 'pending' && <Badge tone={overdue ? 'error' : 'brand'}>{overdue ? 'Overdue' : 'To do'}</Badge>}
                      {request.status === 'completed' && (
                        <Badge tone="success">{request.accountDeleted ? 'Account deleted' : 'Done'}</Badge>
                      )}
                      {request.status === 'rejected' && <Badge tone="error">Rejected</Badge>}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="text-[15px] font-semibold tabular-nums">{formatPhone(request.phone)}</p>
                      {pending && (
                        <div className="flex items-center gap-0.5">
                          <IconLink label="Copy number" onClick={() => copy(request.phone)}>
                            <Copy size={14} />
                          </IconLink>
                          <IconLink label="Call" href={`tel:+91${request.phone}`}>
                            <Phone size={14} />
                          </IconLink>
                          <IconLink label="WhatsApp" href={`https://wa.me/91${request.phone}`}>
                            <MessageCircle size={14} />
                          </IconLink>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-subtle">
                      Received {formatDateTime(request.createdAt)}
                      {pending && <> · due by {formatDate(due.toISOString())}</>}
                      {request.closedAt && (
                        <>
                          {' '}
                          · closed {formatDateTime(request.closedAt)}
                          {request.handledBy ? ` by ${request.handledBy.name}` : ''}
                        </>
                      )}
                    </p>

                    {(request.name || request.reason || request.details) && (
                      <div className="rounded-lg bg-canvas px-3 py-2 text-[13px] leading-relaxed text-muted">
                        {request.name && (
                          <p>
                            <span className="font-semibold text-ink">Name given:</span> {request.name}
                          </p>
                        )}
                        {request.reason && (
                          <p>
                            <span className="font-semibold text-ink">Reason:</span> {request.reason}
                          </p>
                        )}
                        {request.details && <p className="whitespace-pre-line">{request.details}</p>}
                      </div>
                    )}
                    {request.note && <p className="text-[13px] italic text-muted">Note: {request.note}</p>}
                  </div>

                  {pending && (
                    <div className="w-full shrink-0 space-y-3 lg:w-80">
                      {account ? (
                        <div className="rounded-lg border border-line p-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-ink">
                              {initials(account.name || 'L')}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold">
                                {account.name}
                                {account.role === 'admin' && <span className="ml-1.5 text-error">(admin)</span>}
                              </p>
                              <p className="text-xs text-subtle">
                                Joined {formatDate(account.createdAt)}
                                {account.lastLoginAt ? ` · last seen ${formatDate(account.lastLoginAt)}` : ''}
                              </p>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-muted">
                            {account.enrollmentCount} course(s) · {account.paidOrders} paid order(s) · {formatInr(account.totalPaidInr)} spent
                          </p>
                        </div>
                      ) : (
                        <p className="rounded-lg border border-dashed border-line px-3 py-2.5 text-[13px] text-muted">
                          No account uses this number. It may have been deleted already or typed wrongly.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {account && account.role !== 'admin' ? (
                          <Button size="sm" variant="danger" icon={Trash2} onClick={() => open(request, 'delete')}>
                            Delete account
                          </Button>
                        ) : (
                          <Button size="sm" variant="primary" icon={CheckCircle2} onClick={() => open(request, 'done')}>
                            Mark as done
                          </Button>
                        )}
                        <Button size="sm" variant="outline" icon={XCircle} onClick={() => open(request, 'reject')}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {requests && requests.length > 0 && (
          <Pagination page={pager.page} pageCount={pager.pageCount} pageSize={pager.pageSize} total={pager.total} onPage={pager.setPage} />
        )}
      </Card>

      <Modal
        open={action !== null}
        onClose={() => (busy ? undefined : setAction(null))}
        title={
          action?.kind === 'delete'
            ? 'Delete this account permanently?'
            : action?.kind === 'reject'
              ? 'Reject this request?'
              : 'Mark this request as done?'
        }
        width="max-w-md"
      >
        {action && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted">
              {action.kind === 'delete' ? (
                <>
                  <strong className="text-ink">{action.request.account?.name}</strong> ({formatPhone(action.request.phone)}) will be
                  removed with their profile, photo, course access, progress, reviews and notifications. Paid orders stay in the order
                  book as “Deleted learner” for your accounts. This cannot be undone.
                </>
              ) : action.kind === 'reject' ? (
                'Use this when the request could not be confirmed as coming from the account holder. Nothing is deleted.'
              ) : (
                'No account uses this number, so there is nothing to delete. The request is closed.'
              )}
            </p>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">Note {action.kind === 'reject' ? '(why)' : '(optional)'}</span>
              <Textarea rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
            </label>
            <p className="text-xs text-subtle">The mobile number is masked when the request closes, and the record is removed after 180 days.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAction(null)} disabled={busy}>
                Cancel
              </Button>
              {action.kind === 'delete' ? (
                <HoldToConfirm label="Hold to delete account" onConfirm={() => void close()} disabled={busy} />
              ) : (
                <Button variant={action.kind === 'reject' ? 'danger' : 'primary'} onClick={() => void close()} loading={busy}>
                  {action.kind === 'reject' ? 'Reject request' : 'Mark as done'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function IconLink({ label, href, onClick, children }: { label: string; href?: string; onClick?: () => void; children: React.ReactNode }) {
  const className = 'flex h-8 w-8 items-center justify-center rounded-md text-subtle hover:bg-ink/5 hover:text-ink';
  return href ? (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" title={label} aria-label={label} className={className}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={className}>
      {children}
    </button>
  );
}
