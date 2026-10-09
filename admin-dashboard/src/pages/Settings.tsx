import { ArrowDown, ArrowUp, ImagePlus, Plus, Save, Smartphone, Trash2, Wrench } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, uploadImage } from '../api/client';
import { onRealtimeEvent } from '../api/realtime';
import type { AppSettings, Course, HomeBanner } from '../api/types';
import { Button, Card, CardHeader, Field, Input, LoadingBlock, Select, Textarea, Toggle, useToast } from '../components/ui';

const MAX_BANNERS = 5;

/** Poster slider at the top of the app's home screen. */
function HomeBannersCard({
  banners,
  courses,
  onChange,
}: {
  banners: HomeBanner[];
  courses: Course[];
  onChange: (next: HomeBanner[]) => void;
}) {
  const toast = useToast();
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const update = (i: number, patch: Partial<HomeBanner>) =>
    onChange(banners.map((b, n) => (n === i ? { ...b, ...patch } : b)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= banners.length) return;
    const next = [...banners];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

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

  return (
    <Card>
      <CardHeader
        title="Home banners"
        subtitle={`The poster slider at the top of the app's home screen. Up to ${MAX_BANNERS}. No image = the linked course's cover.`}
        action={
          <Button
            size="sm"
            variant="outline"
            icon={Plus}
            onClick={() => onChange([...banners, { imageUrl: '', title: '', subtitle: '', courseSlug: '', active: true }])}
            disabled={banners.length >= MAX_BANNERS}
          >
            Add banner
          </Button>
        }
      />
      {banners.length === 0 ? (
        <p className="px-5 py-6 text-[13px] text-muted">No banners yet — the app shows the featured courses.</p>
      ) : (
        <div className="divide-y divide-line-soft">
          {banners.map((banner, i) => (
            <div key={i} className="grid gap-4 p-5 md:grid-cols-[180px_1fr]">
              <div>
                <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-line-soft bg-surface-alt">
                  {banner.imageUrl ? (
                    <img src={banner.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="px-2 text-center text-xs text-subtle">Uses course cover</span>
                  )}
                </div>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-brand-ink hover:underline">
                  <ImagePlus size={14} />
                  {uploadingIdx === i ? 'Uploading…' : banner.imageUrl ? 'Replace image' : 'Upload image'}
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
                    className="ml-3 text-[13px] font-semibold text-muted hover:text-error"
                  >
                    Remove image
                  </button>
                )}
              </div>

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
                <div className="sm:col-span-2">
                  <Field label="Subtitle">
                    <Input value={banner.subtitle} maxLength={160} onChange={(e) => update(i, { subtitle: e.target.value })} />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <Toggle checked={banner.active} onChange={(v) => update(i, { active: v })} label={`Banner ${i + 1} active`} />
                    <span className="text-[13px] text-muted">{banner.active ? 'Showing in the app' : 'Hidden'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink disabled:opacity-30">
                      <ArrowUp size={15} />
                    </button>
                    <button aria-label="Move down" disabled={i === banners.length - 1} onClick={() => move(i, 1)} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink disabled:opacity-30">
                      <ArrowDown size={15} />
                    </button>
                    <button aria-label="Remove banner" onClick={() => onChange(banners.filter((_, n) => n !== i))} className="rounded-md p-1.5 text-muted hover:bg-error-soft hover:text-error">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Settings() {
  const toast = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [form, setForm] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    api.listCourses({}).then(setCourses).catch(() => setCourses([]));
  }, []);

  const load = useCallback(() => {
    api
      .getSettings()
      .then((s) => {
        setSettings(s);
        setForm(s);
      })
      .catch((e) => toast('error', e instanceof Error ? e.message : 'Failed to load settings'));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = settings && form ? JSON.stringify(settings) !== JSON.stringify(form) : false;

  // Another admin's save lands here live — refresh unless this form has unsaved edits.
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty || saving;
  useEffect(() => {
    const off = onRealtimeEvent('settings.updated', () => {
      if (!dirtyRef.current) load();
    });
    return () => {
      off();
    };
  }, [load]);

  if (!settings || !form) return <Card><LoadingBlock label="Loading settings…" /></Card>;

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const updated = await api.updateSettings(form);
      setSettings(updated);
      setForm(updated);
      toast('success', form.maintenanceMode ? 'Saved — maintenance mode is ON for the app' : 'Settings saved');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader title="App identity" subtitle="Shown across the mobile app" />
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="App name">
              <Input value={form.appName} onChange={(e) => set('appName', e.target.value)} />
            </Field>
            <Field label="Currency">
              <Input value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} maxLength={3} />
            </Field>
          </div>
          <Field label="Tagline">
            <Textarea rows={2} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Support" subtitle="Where learners reach a human" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 p-5">
          <Field label="Support email">
            <Input type="email" value={form.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} />
          </Field>
          <Field label="Support phone">
            <Input value={form.supportPhone} onChange={(e) => set('supportPhone', e.target.value)} />
          </Field>
        </div>
      </Card>

 <HomeBannersCard
        banners={form.homeBanners ?? []}
        courses={courses}
        onChange={(next) => set('homeBanners', next)}
      />

      <Card>
        <CardHeader title="Platform controls" subtitle="Take effect the next time the app syncs" />
        <div className="divide-y divide-line-soft">
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-error-soft">
                <Wrench size={16} className="text-error" />
              </div>
              <div>
                <p className="text-sm font-semibold">Maintenance mode</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                  The app shows a maintenance screen and blocks new purchases while this is on.
                </p>
              </div>
            </div>
            <Toggle checked={form.maintenanceMode} onChange={(v) => set('maintenanceMode', v)} label="Maintenance mode" />
          </div>
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                <Smartphone size={16} className="text-brand-ink" />
              </div>
              <div>
                <p className="text-sm font-semibold">Minimum app version</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                  Older builds are asked to update. Leave empty for no gate (e.g. “1.2.0”).
                </p>
              </div>
            </div>
            <Input value={form.minAppVersion} onChange={(e) => set('minAppVersion', e.target.value)} placeholder="1.0.0" className="w-32" />
          </div>
        </div>
      </Card>

      {form.maintenanceMode && (
        <div className="rounded-lg border border-error/25 bg-error-soft px-4 py-3 text-[13px] font-medium text-error">
          Heads up: learners currently see the maintenance screen.
        </div>
      )}

      <div className="flex justify-end">
        <Button icon={Save} onClick={save} loading={saving} disabled={!dirty}>
          Save settings
        </Button>
      </div>
    </div>
  );
}
