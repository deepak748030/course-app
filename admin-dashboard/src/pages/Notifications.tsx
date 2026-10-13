import { Bell, Send, Smartphone, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { AdminNotification, AdminUser, Course, NotificationKind } from '../api/types';
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, Input, LoadingBlock, Select, Textarea, formatDateTime, useToast } from '../components/ui';

const KINDS: { value: NotificationKind; label: string }[] = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'course-update', label: 'Course update' },
  { value: 'learning-reminder', label: 'Learning reminder' },
  { value: 'product', label: 'Product news' },
];

const TITLE_MAX = 120;
const BODY_MAX = 500;

const PUSH_BADGE: Record<AdminNotification['pushStatus'], { label: string; tone: 'neutral' | 'brand' | 'success' | 'error' | 'info' }> = {
  queued: { label: 'Queued', tone: 'info' },
  sending: { label: 'Sending', tone: 'info' },
  sent: { label: 'Pushed', tone: 'success' },
  failed: { label: 'Push failed', tone: 'error' },
  'no-devices': { label: 'No devices yet', tone: 'neutral' },
};

/** Minimal phone-style preview, so the sender sees the notification the way a learner will. */
function Preview({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-line bg-canvas p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">Preview</p>
      <div className="flex gap-3 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-black/5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-on-brand">
          <Bell size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold text-subtle">YDU Academy</p>
            <p className="text-[11px] text-subtle">now</p>
          </div>
          <p className="truncate text-sm font-semibold text-ink">{title || 'Your title appears here'}</p>
          <p className="line-clamp-2 text-[13px] leading-snug text-muted">{body || 'The message body appears here.'}</p>
        </div>
      </div>
    </div>
  );
}

export default function Notifications() {
  const toast = useToast();
  const [audience, setAudience] = useState<'all' | 'user'>('all');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminUser[]>([]);
  const [learner, setLearner] = useState<AdminUser | null>(null);
  const [kind, setKind] = useState<NotificationKind>('announcement');
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<AdminNotification[] | null>(null);
  const [devices, setDevices] = useState<{ devices: number; learnersWithDevices: number } | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.listNotifications();
      setHistory(data.notifications);
      setDevices({ devices: data.devices, learnersWithDevices: data.learnersWithDevices });
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not load notifications');
      setHistory((current) => current ?? []);
    }
  }, [toast]);

  useEffect(() => {
    void loadHistory();
    api.listCourses({ published: 'true' }).then(setCourses).catch(() => setCourses([]));
  }, [loadHistory]);

  // Find a learner while typing (one learner audience only).
  useEffect(() => {
    if (audience !== 'user' || search.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      api
        .listUsers({ search: search.trim(), role: 'user' })
        .then((users) => setResults(users.slice(0, 6)))
        .catch(() => setResults([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [audience, search]);

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const audienceReady = audience === 'all' || Boolean(learner);
  const canSend = audienceReady && trimmedTitle.length > 0 && trimmedBody.length > 0 && !sending;

  const audienceLabel = useMemo(
    () => (audience === 'all' ? 'All learners' : learner ? `${learner.name} (${learner.email})` : 'One learner'),
    [audience, learner]
  );

  async function send() {
    setConfirming(false);
    setSending(true);
    try {
      await api.sendNotification({
        audience,
        userId: audience === 'user' ? learner?._id : undefined,
        title: trimmedTitle,
        body: trimmedBody,
        kind,
        courseId: courseId || undefined,
      });
      toast('success', audience === 'all' ? 'Sent to all learners' : `Sent to ${learner?.name}`);
      setTitle('');
      setBody('');
      setCourseId('');
      await loadHistory();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not send the notification');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Compose" subtitle="Saved to the in-app inbox and pushed to every device of the learners you choose" />
          <div className="space-y-5 p-5">
            <div>
              <p className="mb-2 text-sm font-semibold">Send to</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Audience">
                {[
                  { id: 'all' as const, label: 'All learners', hint: 'Every learner with the app installed' },
                  { id: 'user' as const, label: 'One learner', hint: 'Pick a learner by name, email or phone' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={audience === option.id}
                    onClick={() => setAudience(option.id)}
                    className={`flex min-h-[56px] items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      audience === option.id ? 'border-brand bg-brand-soft' : 'border-line hover:bg-surface-alt'
                    }`}
                  >
                    <Users size={17} className={audience === option.id ? 'mt-0.5 text-brand-ink' : 'mt-0.5 text-subtle'} />
                    <span>
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="block text-xs text-muted">{option.hint}</span>
                    </span>
                  </button>
                ))}
              </div>

              {audience === 'user' && (
                <div className="mt-3 space-y-2">
                  {learner ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-alt px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{learner.name}</p>
                        <p className="truncate text-xs text-muted">{learner.email || learner.phone}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setLearner(null)}>
                        Change
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Type a name, email or phone (at least 2 characters)"
                        aria-label="Search learners"
                      />
                      {results.length > 0 && (
                        <ul className="divide-y divide-line-soft overflow-hidden rounded-lg border border-line">
                          {results.map((user) => (
                            <li key={user._id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setLearner(user);
                                  setSearch('');
                                  setResults([]);
                                }}
                                className="flex min-h-[48px] w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface-alt"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold">{user.name}</span>
                                  <span className="block truncate text-xs text-muted">{user.email || user.phone}</span>
                                </span>
                                {user.blocked && <Badge tone="error">Blocked</Badge>}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Type">
                <Select value={kind} onChange={(e) => setKind(e.target.value as NotificationKind)}>
                  {KINDS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Open this course when tapped" hint="Optional">
                <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  <option value="">No course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Title" hint={`${title.length}/${TITLE_MAX}`}>
              <Input value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="New batch starts Monday" />
            </Field>
            <Field label="Message" hint={`${body.length}/${BODY_MAX}`}>
              <Textarea rows={4} maxLength={BODY_MAX} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write what the learner should know, in one or two short lines." />
            </Field>

            <Preview title={trimmedTitle} body={trimmedBody} />

            <div className="flex flex-col-reverse items-stretch gap-3 border-t border-line-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-subtle">Sending to: {audienceLabel}</p>
              <Button icon={Send} loading={sending} disabled={!canSend} onClick={() => setConfirming(true)}>
                Send notification
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Sent" subtitle="Newest first. Push status shows what happened on the devices." />
          {history === null ? (
            <LoadingBlock label="Loading notifications…" />
          ) : history.length === 0 ? (
            <EmptyState icon={Bell} title="Nothing sent yet" message="Messages you send appear here with their push result." />
          ) : (
            <ul className="divide-y divide-line-soft">
              {history.map((item) => {
                const badge = PUSH_BADGE[item.pushStatus];
                return (
                  <li key={item._id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <Badge tone="outline">{KINDS.find((k) => k.value === item.kind)?.label ?? item.kind}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[13px] text-muted">{item.body}</p>
                      <p className="mt-1 text-xs text-subtle">
                        {item.audience === 'all' ? 'All learners' : item.user ? `${item.user.name} (${item.user.email})` : 'Deleted learner'} ·{' '}
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                      {item.pushDevices > 0 && (
                        <p className="text-xs text-subtle">
                          {item.pushDevices} device{item.pushDevices === 1 ? '' : 's'}
                          {item.pushFailed > 0 ? ` · ${item.pushFailed} failed` : ''}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <aside className="space-y-6">
        <Card>
          <CardHeader title="Reachable devices" subtitle="Phones that have registered for push" />
          <div className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
                <Smartphone size={18} />
              </span>
              <div>
                <p className="text-2xl font-bold">{devices?.devices ?? '—'}</p>
                <p className="text-xs text-muted">devices · {devices?.learnersWithDevices ?? '—'} learners</p>
              </div>
            </div>
            <p className="text-[13px] leading-relaxed text-muted">
              A learner’s phone registers when they open the app signed in. Learners who have never opened the app
              (or uninstalled it) receive the inbox message only.
            </p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Before you send" />
          <ul className="list-disc space-y-2 p-5 pl-9 text-[13px] leading-relaxed text-muted">
            <li>Push reaches phones only in a store or development build, not Expo Go.</li>
            <li>Titles stay short: about 40 characters show fully on most phones.</li>
            <li>Every message stays in the learner’s inbox, even if the push is not delivered.</li>
          </ul>
        </Card>
      </aside>

      <ConfirmDialog
        open={confirming}
        title="Send this notification?"
        message={`“${trimmedTitle}” goes to ${audienceLabel.toLowerCase()} and cannot be recalled.`}
        confirmLabel="Send"
        onCancel={() => setConfirming(false)}
        onConfirm={() => void send()}
      />
    </div>
  );
}
