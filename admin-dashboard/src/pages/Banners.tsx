import { AlertTriangle, ArrowDown, ArrowUp, ImagePlus, Images, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, uploadImage } from '../api/client';
import { onRealtimeEvent } from '../api/realtime';
import type { AppSettings, Course, HomeBanner } from '../api/types';
import { Button, Card, CardHeader, EmptyState, Field, Input, LoadingBlock, Select, Textarea, Toggle, useToast } from '../components/ui';

/** Poster slider at the top of the app's home screen. Up to MAX_BANNERS; the first active ones show first. */
const MAX_BANNERS = 5;
const EMPTY_BANNER: HomeBanner = { imageUrl: '', title: '', subtitle: '', courseSlug: '', active: true };

/** A banner needs something to show: a picture, a title, or a course to open. */
const bannerProblem = (b: HomeBanner) =>
  !b.imageUrl && !b.title.trim() && !b.courseSlug ? 'Add a picture, a title or a course' : null;

export default function Banners() {
  const toast = useToast();
  const [saved, setSaved] = useState<HomeBanner[] | null>(null);
  const [draft, setDraft] = useState<HomeBanner[] | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const load = useCallback(() => {
    api
      .getSettings()
      .then((s) => {
        setSettings(s);
        setSaved(s.homeBanners ?? []);
        setDraft(s.homeBanners ?? []);
      })
      .catch((e) => toast('error', e instanceof Error ? e.message : 'Failed to load banners'));
  }, [toast]);

  useEffect(() => {
    load();
    api.listCourses({}).then(setCourses).catch(() => setCourses([]));
  }, [load]);

  const dirty = useMemo(
    () => (saved && draft ? JSON.stringify(saved) !== JSON.stringify(draft) : false),
    [saved, draft]
  );

  // Another admin's save lands here live — refresh unless this page has unsaved edits.
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty || saving;
  useEffect(() => {
    const off = onRealtimeEvent('settings.updated', () => {
      if (!dirtyRef.current) load();
    });
    return () => off();
  }, [load]);

  if (!saved || !draft || !settings) return <Card><LoadingBlock label="Loading banners…" /></Card>;

  const invalid = draft.some((b) => bannerProblem(b) !== null);
  const activeCount = draft.filter((b) => b.active).length;
  const courseBySlug = new Map(courses.map((c) => [c.slug, c]));

  const update = (i: number, patch: Partial<HomeBanner>) =>
    setDraft((list) => (list ? list.map((b, n) => (n === i ? { ...b, ...patch } : b)) : list));
  const move = (i: number, dir: -1 | 1) =>
    setDraft((list) => {
      if (!list) return list;
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const remove = (i: number) => setDraft((list) => (list ? list.filter((_, n) => n !== i) : list));

  async function upload(i: number, file: File) {
    setUploadingIdx(i);
    try {
      const { url } = await uploadImage(file, 'banners');
      update(i, { imageUrl: url });
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploadingIdx(null);
    }
  }

  async function save() {
    if (!draft || invalid) return;
    setSaving(true);
    try {
      const updated = await api.updateSettings({ homeBanners: draft.map((b) => ({ ...b, title: b.title.trim(), subtitle: b.subtitle.trim() })) } as Partial<AppSettings>);
      setSettings(updated);
      setSaved(updated.homeBanners ?? []);
      setDraft(updated.homeBanners ?? []);
      toast('success', 'Banners saved — the app updates now');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft">
            <Images size={16} className="text-brand-ink" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {activeCount} of {draft.length} showing in the app
            </p>
            <p className="text-[13px] text-muted">Up to {MAX_BANNERS} banners. Order here is the order in the app.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-[13px] font-medium text-brand-ink">Unsaved changes</span>}
          {dirty && (
            <Button variant="ghost" icon={RotateCcw} onClick={() => setDraft(saved)}>
              Discard
            </Button>
          )}
          <Button icon={Save} onClick={save} loading={saving} disabled={!dirty || invalid}>
            Save banners
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        {/* ---------- editors ---------- */}
        <Card>
          <CardHeader
            title="Banners"
            subtitle="Each banner is a poster. Without a picture it uses the linked course's cover."
            action={
              <Button
                size="sm"
                variant="outline"
                icon={Plus}
                onClick={() => setDraft([...draft, { ...EMPTY_BANNER }])}
                disabled={draft.length >= MAX_BANNERS}>
                Add banner
              </Button>
            }
          />
          {draft.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Images}
                title="No banners"
                message="The app shows the featured courses until you add one."
              />
            </div>
          ) : (
            <div className="divide-y divide-line-soft">
              {draft.map((banner, i) => {
                const problem = bannerProblem(banner);
                const linked = banner.courseSlug ? courseBySlug.get(banner.courseSlug) : undefined;
                return (
                  <div key={i} className="grid gap-4 p-5 md:grid-cols-[200px_1fr]">
                    <div>
                      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-line-soft bg-surface-alt">
                        {banner.imageUrl ? (
                          <img src={banner.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : linked?.coverUrl ? (
                          <img src={linked.coverUrl} alt="" className="h-full w-full object-cover opacity-90" />
                        ) : (
                          <span className="px-2 text-center text-xs text-subtle">No picture yet</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-brand-ink hover:underline">
                          <ImagePlus size={14} />
                          {uploadingIdx === i ? 'Uploading…' : banner.imageUrl ? 'Replace picture' : 'Upload picture'}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            disabled={uploadingIdx !== null}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void upload(i, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        {banner.imageUrl && (
                          <button
                            onClick={() => update(i, { imageUrl: '' })}
                            className="text-[13px] font-semibold text-muted hover:text-error">
                            Remove picture
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Title" hint="Leave empty to use the course title.">
                          <Input value={banner.title} maxLength={80} onChange={(e) => update(i, { title: e.target.value })} />
                        </Field>
                        <Field label="Opens course">
                          <Select value={banner.courseSlug} onChange={(e) => update(i, { courseSlug: e.target.value })}>
                            <option value="">None (info only)</option>
                            {courses.map((c) => (
                              <option key={c._id} value={c.slug}>
                                {c.title}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                      <Field label="Subtitle">
                        <Textarea rows={2} value={banner.subtitle} maxLength={160} onChange={(e) => update(i, { subtitle: e.target.value })} />
                      </Field>

                      {problem && (
                        <p className="flex items-center gap-1.5 text-[13px] font-medium text-error">
                          <AlertTriangle size={14} /> {problem}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3">
                        <div className="flex items-center gap-2">
                          <Toggle checked={banner.active} onChange={(v) => update(i, { active: v })} label={`Banner ${i + 1} active`} />
                          <span className="text-[13px] text-muted">{banner.active ? 'Showing in the app' : 'Hidden'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink disabled:opacity-30">
                            <ArrowUp size={15} />
                          </button>
                          <button aria-label="Move down" disabled={i === draft.length - 1} onClick={() => move(i, 1)} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink disabled:opacity-30">
                            <ArrowDown size={15} />
                          </button>
                          <button aria-label="Remove banner" onClick={() => remove(i)} className="rounded-md p-1.5 text-muted hover:bg-error-soft hover:text-error">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ---------- live preview ---------- */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader title="In the app" subtitle="The home slider, in order" />
            <div className="space-y-3 p-4">
              {draft.filter((b) => b.active).length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted">
                  No active banners. The app shows the featured courses.
                </p>
              ) : (
                draft
                  .filter((b) => b.active)
                  .map((b, n) => {
                    const linked = b.courseSlug ? courseBySlug.get(b.courseSlug) : undefined;
                    const image = b.imageUrl || linked?.coverUrl || '';
                    const title = b.title.trim() || linked?.title || 'Untitled banner';
                    return (
                      <div key={n} className="relative aspect-[16/10] overflow-hidden rounded-xl bg-ink">
                        {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                          <p className="line-clamp-1 text-[15px] font-bold">{title}</p>
                          {b.subtitle.trim() && <p className="line-clamp-2 text-[12px] opacity-85">{b.subtitle}</p>}
                        </div>
                      </div>
                    );
                  })
              )}
              <p className="text-center text-[12px] text-subtle">Preview is approximate; the app sizes it to the screen.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
