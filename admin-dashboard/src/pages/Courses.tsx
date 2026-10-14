import { BookOpen, Cloud, Eye, EyeOff, ExternalLink, ImagePlus, Link2, Loader2, Pencil, Plus, Trash2, Video, X, Youtube } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, uploadCourseVideo, uploadImage, uploadYouTubeVideo, youtubeUploadJobStatus, youtubeUploadStatus } from '../api/client';
import { useRealtimeRefresh } from '../api/realtime';
import type { Category, Course, Lesson, LessonVideo, VideoQuality, VideoSource } from '../api/types';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  PrefixInput,
  CourseCover,
  Drawer,
  EmptyState,
  Field,
  Input,
  TableSkeleton,
  Pagination,
  SearchInput,
  Select,
  Stars,
  Textarea,
  Toggle,
  formatInr,
  usePagination,
  useToast,
} from '../components/ui';

type FormState = {
  title: string;
  slug: string;
  promise: string;
  description: string;
  coverUrl: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  language: string;
  priceInr: string;
  listPriceInr: string;
  audience: string;
  outcomesText: string;
  equipmentText: string;
  published: boolean;
  isPopular: boolean;
  isBeginnerPick: boolean;
  lessons: Lesson[];
};

const emptyForm: FormState = {
  title: '',
  slug: '',
  promise: '',
  description: '',
  coverUrl: '',
  category: '',
  level: 'Beginner',
  language: 'English + Hindi',
  priceInr: '',
  listPriceInr: '',
  audience: '',
  outcomesText: '',
  equipmentText: '',
  published: false,
  isPopular: false,
  isBeginnerPick: false,
  lessons: [],
};

function formFromCourse(course: Course): FormState {
  return {
    title: course.title,
    slug: course.slug,
    promise: course.promise,
    description: course.description,
    coverUrl: course.coverUrl,
    category: typeof course.category === 'string' ? course.category : course.category._id,
    level: course.level,
    language: course.language,
    priceInr: String(course.priceInr),
    listPriceInr: course.listPriceInr ? String(course.listPriceInr) : '',
    audience: course.audience,
    outcomesText: course.outcomes.join('\n'),
    equipmentText: course.equipment.join('\n'),
    published: course.published,
    isPopular: course.isPopular,
    isBeginnerPick: course.isBeginnerPick,
    // Older free lessons were all-or-nothing, so they stay whole until the admin sets a length.
    lessons: course.lessons.map((lesson) => ({
      ...(JSON.parse(JSON.stringify(lesson)) as Lesson),
      previewSec: lesson.previewSec ?? (lesson.isPreview ? lesson.durationSec || 86400 : 0),
    })),
  };
}

function payloadFromForm(form: FormState) {
  return {
    title: form.title.trim(),
    ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
    promise: form.promise.trim(),
    description: form.description.trim(),
    coverUrl: form.coverUrl.trim(),
    category: form.category,
    level: form.level,
    language: form.language.trim(),
    priceInr: Number(form.priceInr),
    listPriceInr: form.listPriceInr.trim() ? Number(form.listPriceInr) : null,
    audience: form.audience.trim(),
    outcomes: form.outcomesText.split('\n').map((s) => s.trim()).filter(Boolean),
    equipment: form.equipmentText.split('\n').map((s) => s.trim()).filter(Boolean),
    published: form.published,
    isPopular: form.isPopular,
    isBeginnerPick: form.isBeginnerPick,
    lessons: form.lessons,
  };
}

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

/** Length of a video file in whole seconds, read in the browser before it is uploaded (0 if unknown). */
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    const done = (seconds: number) => {
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? Math.round(video.duration) : 0);
    video.onerror = () => done(0);
    video.src = url;
  });
}

/** Free-preview length for one lesson, typed in seconds or minutes and stored in seconds. 0 = locked. */
function PreviewLimit({
  value,
  durationSec,
  onChange,
}: {
  value: number;
  durationSec?: number;
  onChange: (seconds: number) => void;
}) {
  const [unit, setUnit] = useState<'sec' | 'min'>(value >= 60 && value % 60 === 0 ? 'min' : 'sec');
  const factor = unit === 'min' ? 60 : 1;
  const max = durationSec && durationSec > 0 ? durationSec : 86400;
  return (
    <div
      className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted"
      title="How much of this lesson anyone can watch without buying. 0 = locked."
    >
      <span>Free</span>
      <Input
        type="number"
        min={0}
        step={1}
        value={Number((value / factor).toFixed(1))}
        onChange={(e) => onChange(Math.min(max, Math.max(0, Math.round(Number(e.target.value) * factor))))}
        className="h-9 w-20"
      />
      <select
        value={unit}
        onChange={(e) => setUnit(e.target.value as 'sec' | 'min')}
        className="h-9 rounded-md border border-line bg-transparent px-1.5 text-xs"
      >
        <option value="sec">sec</option>
        <option value="min">min</option>
      </select>
      {durationSec ? (
        <button
          type="button"
          onClick={() => onChange(durationSec)}
          className="h-9 rounded-md border border-line px-2 hover:bg-brand-soft hover:text-brand-ink"
        >
          Whole
        </button>
      ) : null}
    </div>
  );
}

/** `4:05` style length taken from the video; the admin never types it. */
function formatLength(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Per-lesson video control: uploads to Backblaze B2 with progress, or shows the attached video. */
const VIDEO_QUALITIES: VideoQuality[] = ['360', '480', '720', '1080'];

/** One upload slot per quality. Each quality is its own file in the private bucket. */
function LessonVideos({
  courseId,
  value,
  onChange,
}: {
  courseId?: string;
  value: LessonVideo[];
  onChange: (videos: LessonVideo[], durationSec?: number) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<{ quality: VideoQuality; stage: 'sending' | 'storing'; percent: number } | null>(null);

  async function pick(quality: VideoQuality, file: File) {
    if (!VIDEO_TYPES.includes(file.type)) {
      toast('error', 'Use an MP4, WebM or MOV video.');
      return;
    }
    setBusy({ quality, stage: 'sending', percent: 0 });
    try {
      const durationSec = await readVideoDuration(file);
      const key = await uploadCourseVideo(file, courseId, quality, (progress) => setBusy({ quality, ...progress }));
      onChange([...value.filter((v) => v.quality !== quality), { quality, videoKey: key }], durationSec || undefined);
      toast('success', `${quality}p video uploaded. Click Save changes to publish it to the app.`);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Video upload failed');
    } finally {
      setBusy(null);
    }
  }

  const anyBusy = busy !== null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {VIDEO_QUALITIES.map((quality) => {
        const uploaded = value.some((v) => v.quality === quality);
        const uploading = busy?.quality === quality;
        return (
          <div
            key={quality}
            className={`inline-flex h-9 items-center gap-0.5 rounded-md border px-0.5 text-xs font-semibold ${
              uploaded ? 'border-success bg-success-soft text-success' : 'border-line text-muted'
            }`}
          >
            <label
              className={`inline-flex h-8 cursor-pointer items-center gap-1 whitespace-nowrap rounded px-2 ${
                anyBusy ? 'pointer-events-none opacity-60' : 'hover:bg-brand-soft hover:text-brand-ink'
              }`}
              title={
                uploading
                  ? busy?.stage === 'storing'
                    ? 'Server is copying the video to storage'
                    : 'Sending the video to the server'
                  : uploaded
                    ? `Replace the ${quality}p video`
                    : `Upload the ${quality}p video`
              }
            >
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                disabled={anyBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void pick(quality, file);
                }}
              />
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />}
              {uploading ? `${busy?.stage === 'storing' ? 'Saving' : 'Uploading'} ${busy?.percent ?? 0}%` : `${quality}p`}
            </label>
            {uploaded && !anyBusy && (
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v.quality !== quality))}
                className="rounded p-1 hover:bg-error-soft hover:text-error"
                title={`Remove the ${quality}p video`}
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Video ID from a pasted YouTube link (watch / youtu.be / shorts / live / embed) or a raw ID. */
function extractYouTubeVideoId(value: string): string {
  const input = value.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input.includes('://') ? input : `https://${input}`);
    const host = url.hostname.replace(/^(www\.|m\.)/, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] ?? '';
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
    }
    if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      const fromQuery = url.searchParams.get('v') ?? '';
      if (/^[A-Za-z0-9_-]{11}$/.test(fromQuery)) return fromQuery;
      const parts = url.pathname.split('/').filter(Boolean);
      const marker = parts.findIndex((p) => ['shorts', 'live', 'embed', 'v'].includes(p));
      const id = marker >= 0 ? parts[marker + 1] ?? '' : '';
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
    }
  } catch {
    /* not a URL */
  }
  return '';
}

type LessonPatch = (patch: Partial<Lesson>, durationSec?: number) => void;

/**
 * YouTube side of one lesson: paste an existing unlisted link, or upload the file
 * straight to the channel (unlisted) through the server. The app plays it via Piped.
 */
function LessonYouTube({ lesson, onChange }: { lesson: Lesson; onChange: LessonPatch }) {
  const toast = useToast();
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState<{ stage: 'sending' | 'processing'; percent: number } | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const videoId = lesson.youtubeVideoId ?? '';
  const requestId = lesson.youtubeUploadRequestId ?? '';

  useEffect(() => {
    let cancelled = false;
    youtubeUploadStatus()
      .then((r) => {
        if (!cancelled) setConfigured(r.configured);
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setLink(videoId ? `https://youtu.be/${videoId}` : '');
  }, [videoId]);

  // A background upload keeps being polled until YouTube hands back the video ID.
  useEffect(() => {
    if (!requestId || videoId) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const status = await youtubeUploadJobStatus(requestId);
        if (cancelled) return;
        if (status.status === 'completed' && status.videoId) {
          onChangeRef.current({ youtubeVideoId: status.videoId, youtubeUploadRequestId: '' });
          toast('success', 'YouTube upload complete. Click Save changes to publish it to the app.');
        }
      } catch (e) {
        if (cancelled) return;
        // A dropped connection just misses this poll; a real failure ends the job.
        if ((e as { status?: number })?.status === 0) return;
        clearInterval(timer);
        onChangeRef.current({ youtubeUploadRequestId: '' });
        toast('error', e instanceof Error ? e.message : 'YouTube upload failed');
      }
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [requestId, videoId, toast]);

  function attach() {
    const id = extractYouTubeVideoId(link);
    if (!id) {
      toast('error', 'Paste a valid YouTube link or video ID.');
      return;
    }
    onChange({ videoSource: 'youtube', youtubeVideoId: id, youtubeUploadRequestId: '' });
    toast('success', 'YouTube video linked. Click Save changes to publish it to the app.');
  }

  async function pick(file: File) {
    if (!VIDEO_TYPES.includes(file.type)) {
      toast('error', 'Use an MP4, WebM or MOV video.');
      return;
    }
    if (!lesson.title.trim()) {
      toast('error', 'Write the lesson title first — YouTube needs it for the upload.');
      return;
    }
    setBusy({ stage: 'sending', percent: 0 });
    try {
      const durationSec = await readVideoDuration(file);
      const result = await uploadYouTubeVideo(file, lesson.title.trim(), lesson.description || '', (progress) =>
        setBusy(progress)
      );
      if (result.status === 'completed') {
        onChange(
          { videoSource: 'youtube', youtubeVideoId: result.videoId, youtubeUploadRequestId: '' },
          durationSec || undefined
        );
        toast('success', 'Uploaded to YouTube (unlisted). Click Save changes to publish it to the app.');
      } else {
        onChange({ videoSource: 'youtube', youtubeUploadRequestId: result.requestId }, durationSec || undefined);
        toast('success', 'Video sent. YouTube is still processing it — the link will attach here automatically.');
      }
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'YouTube upload failed');
    } finally {
      setBusy(null);
    }
  }

  if (videoId) {
    return (
      <div className="inline-flex h-9 items-center gap-1 rounded-md border border-success bg-success-soft px-2 text-xs font-semibold text-success">
        <Youtube size={14} />
        <span>YouTube · {videoId}</span>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noreferrer"
          className="rounded p-1 hover:bg-ink/5"
          title="Open on YouTube"
        >
          <ExternalLink size={12} />
        </a>
        <button
          type="button"
          onClick={() => onChange({ youtubeVideoId: '', youtubeUploadRequestId: '' })}
          className="rounded p-1 hover:bg-error-soft hover:text-error"
          title="Remove the YouTube video"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  const processing = busy?.stage === 'processing' || Boolean(requestId);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Paste unlisted YouTube link or video ID"
        className="h-9 w-72"
      />
      <button
        type="button"
        onClick={attach}
        disabled={!link.trim() || busy !== null}
        className="inline-flex h-9 items-center gap-1 rounded-md border border-line px-2.5 text-xs font-semibold hover:bg-brand-soft hover:text-brand-ink disabled:opacity-50"
        title="Link this YouTube video to the lesson"
      >
        <Link2 size={13} /> Link
      </button>
      <label
        className={`inline-flex h-9 cursor-pointer items-center gap-1 rounded-md border border-line px-2.5 text-xs font-semibold ${
          busy || processing ? 'pointer-events-none opacity-60' : 'hover:bg-brand-soft hover:text-brand-ink'
        }`}
        title={
          configured === false
            ? 'YouTube upload is not set up on the server yet (UPLOAD_POST_* in server/.env). Pasting a link still works.'
            : 'Upload this file to the YouTube channel as unlisted'
        }
      >
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          disabled={busy !== null || processing}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void pick(file);
          }}
        />
        {busy || processing ? <Loader2 size={13} className="animate-spin" /> : <Youtube size={13} />}
        {busy
          ? busy.stage === 'sending'
            ? `Sending ${busy.percent}%`
            : 'YouTube processing…'
          : processing
            ? 'YouTube processing…'
            : 'Upload to YouTube'}
      </label>
      {configured === false ? (
        <span className="text-[11px] font-medium text-error">Upload not set up on server — link paste works</span>
      ) : null}
      <span className="basis-full text-[11px] text-subtle">
        Keep the video <b>Unlisted</b> with embedding ON in YouTube Studio. The upload button always uploads as unlisted;
        the app plays it through Piped with the YDU player (no YouTube logo).
      </span>
    </div>
  );
}

/** Per-lesson video source: the existing private cloud (B2), or YouTube. Playback follows the choice. */
function LessonVideoControl({
  courseId,
  lesson,
  onChange,
}: {
  courseId?: string;
  lesson: Lesson;
  onChange: LessonPatch;
}) {
  const source: VideoSource = lesson.videoSource ?? (lesson.youtubeVideoId ? 'youtube' : 'cloud');
  const tab = (value: VideoSource, label: string, Icon: typeof Cloud) => (
    <button
      type="button"
      onClick={() => onChange({ videoSource: value })}
      className={`inline-flex h-8 items-center gap-1 rounded px-2.5 text-xs font-semibold ${
        source === value ? 'bg-brand text-on-brand' : 'text-muted hover:bg-brand-soft hover:text-brand-ink'
      }`}
      title={value === 'cloud' ? 'Private cloud storage (Backblaze B2)' : 'YouTube channel (unlisted), played via Piped'}
    >
      <Icon size={13} /> {label}
    </button>
  );
  return (
    <div className="flex basis-full flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-0.5 rounded-md border border-line p-0.5">
        {tab('cloud', 'Cloud', Cloud)}
        {tab('youtube', 'YouTube', Youtube)}
      </div>
      {source === 'cloud' ? (
        <LessonVideos
          courseId={courseId}
          value={lesson.videos ?? []}
          onChange={(videos, durationSec) => onChange({ videoSource: 'cloud', videos, videoKey: '' }, durationSec)}
        />
      ) : (
        <LessonYouTube lesson={lesson} onChange={onChange} />
      )}
    </div>
  );
}

export default function Courses() {
  const toast = useToast();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Course | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const pager = usePagination(courses, 10, `${search}|${categoryFilter}|${statusFilter}`);

  const load = useCallback(async () => {
    try {
      const [list, cats] = await Promise.all([
        api.listCourses({ search, category: categoryFilter || undefined, published: statusFilter || undefined }),
        api.listCategories(),
      ]);
      setCourses(list);
      setCategories(cats);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to load courses');
    }
  }, [search, categoryFilter, statusFilter, toast]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useRealtimeRefresh(['catalog.changed'], load);


  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, category: categories[0]?._id || '' });
    setDrawerOpen(true);
  }

  function openEdit(course: Course) {
    setEditing(course);
    setForm(formFromCourse(course));
    setDrawerOpen(true);
  }

  async function save() {
    if (!form.title.trim() || !form.category || !form.priceInr) {
      toast('error', 'Title, category and price are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = payloadFromForm(form);
      if (editing) {
        await api.updateCourse(editing._id, payload);
        toast('success', `“${payload.title}” updated`);
      } else {
        await api.createCourse(payload);
        toast('success', `“${payload.title}” created`);
      }
      setDrawerOpen(false);
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(course: Course) {
    try {
      await api.publishCourse(course._id, !course.published);
      toast('success', course.published ? `“${course.title}” unpublished` : `“${course.title}” is now live in the app`);
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not update publish state');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api.deleteCourse(deleting._id);
      toast('success', `“${deleting.title}” deleted`);
      setDeleting(null);
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const lessonOps = useMemo(
    () => ({
      add: () =>
        set('lessons', [
          ...form.lessons,
          { title: '', description: '', minutes: 10, isPreview: false, previewSec: 0, videoSource: 'cloud' as const },
        ]),
      remove: (j: number) => set('lessons', form.lessons.filter((_, l) => l !== j)),
      patch: (j: number, patch: Partial<Lesson>) =>
        set('lessons', form.lessons.map((lesson, l) => (l === j ? { ...lesson, ...patch } : lesson))),
    }),
    [form.lessons]
  );

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search courses…" className="w-full sm:w-64" />
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full sm:w-48">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.label}</option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-36">
          <option value="">All statuses</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </Select>
        <div className="hidden flex-1 md:block" />
        <Button icon={Plus} onClick={openCreate} className="w-full sm:w-auto">New course</Button>
      </div>

      {/* table */}
      <Card>
        {courses === null ? (
          <TableSkeleton rows={7} />
        ) : courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses found"
            message="Try a different search or filter, or create the first course for the catalog."
            action={<Button icon={Plus} onClick={openCreate}>New course</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['Course', 'Category', 'Level', 'Price', 'Rating', 'Enrolled', 'Status', ''].map((h, i) => (
                    <th key={i} className={`whitespace-nowrap border-b border-line px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-subtle ${['Category', 'Level', 'Rating', 'Enrolled'].includes(h) ? 'hidden lg:table-cell' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pager.rows.map((course) => {
                  const category = typeof course.category === 'string' ? null : course.category;
                  return (
                    <tr key={course._id} className="group hover:bg-canvas/60">
                      <td className="border-b border-line-soft px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CourseCover title={course.title} coverUrl={course.coverUrl} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold">{course.title}</p>
                              {course.isPopular && <Badge tone="brand">Popular</Badge>}
                              {course.isBeginnerPick && <Badge tone="success">Beginner pick</Badge>}
                            </div>
                            <p className="truncate text-xs text-subtle">
                              /{course.slug} · {course.lessons.length} lessons · {course.language}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden border-b border-line-soft px-4 py-3 lg:table-cell">
                        <Badge tone="outline">{category?.label || '—'}</Badge>
                      </td>
                      <td className="hidden border-b border-line-soft px-4 py-3 text-muted lg:table-cell">{course.level}</td>
                      <td className="border-b border-line-soft px-4 py-3">
                        <p className="font-semibold">{formatInr(course.priceInr)}</p>
                        {course.listPriceInr != null && <p className="text-xs text-subtle line-through">{formatInr(course.listPriceInr)}</p>}
                      </td>
                      <td className="hidden border-b border-line-soft px-4 py-3 lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Stars rating={course.rating} />
                          <span className="text-xs text-subtle">({course.reviewCount})</span>
                        </div>
                      </td>
                      <td className="hidden border-b border-line-soft px-4 py-3 font-semibold lg:table-cell">{course.enrollmentCount ?? 0}</td>
                      <td className="border-b border-line-soft px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Toggle checked={course.published} onChange={() => togglePublish(course)} label={`Publish ${course.title}`} />
                          <span className={`text-xs font-semibold ${course.published ? 'text-success' : 'text-subtle'}`}>
                            {course.published ? 'Live' : 'Draft'}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-line-soft px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                          <button title={course.published ? 'Unpublish' : 'Publish'} onClick={() => togglePublish(course)} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink">
                            {course.published ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          <button title="Edit" onClick={() => openEdit(course)} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink">
                            <Pencil size={15} />
                          </button>
                          <button title="Delete" onClick={() => setDeleting(course)} className="rounded-md p-1.5 text-muted hover:bg-error-soft hover:text-error">
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
        {courses && courses.length > 0 && (
          <Pagination page={pager.page} pageCount={pager.pageCount} pageSize={pager.pageSize} total={pager.total} onPage={pager.setPage} />
        )}
      </Card>

      {/* editor drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? 'Edit course' : 'New course'}
        subtitle={editing ? editing.title : 'Everything the app shows on the course page'}
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editing ? 'Save changes' : 'Create course'}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="Title">
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Milk Foundations" />
          </Field>
          <Field label="Slug" hint="Used in deep links. Leave empty to generate from the title.">
            <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="milk-foundations" />
          </Field>
          <Field label="Promise" hint="One-line pitch under the title.">
            <Input value={form.promise} onChange={(e) => set('promise', e.target.value)} />
          </Field>
          <Field label="Description">
            <Textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="" disabled>Choose…</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Level">
              <Select value={form.level} onChange={(e) => set('level', e.target.value as FormState['level'])}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </Select>
            </Field>
            <Field label="Price">
              <PrefixInput prefix="₹" type="number" min={0} value={form.priceInr} onChange={(e) => set('priceInr', e.target.value)} />
            </Field>
            <Field label="List price" hint="Optional — shown struck through.">
              <PrefixInput prefix="₹" type="number" min={0} value={form.listPriceInr} onChange={(e) => set('listPriceInr', e.target.value)} />
            </Field>
            <Field label="Language">
              <Select value={form.language} onChange={(e) => set('language', e.target.value)}>
                <option>English</option>
                <option>Hindi</option>
                <option>English + Hindi</option>
              </Select>
            </Field>
            <Field label="Cover image" hint="Upload an image (stored on Cloudinary when configured) or paste a URL.">
              <div className="flex items-center gap-3">
                <CourseCover title={form.title || 'Cover'} coverUrl={form.coverUrl} className="h-14 w-20" />
                <div className="flex-1 space-y-2">
                  <Input value={form.coverUrl} onChange={(e) => set('coverUrl', e.target.value)} placeholder="https://…" />
                  <div className="flex items-center gap-2">
                    <input
                      id="cover-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        setCoverUploading(true);
                        try {
                          const { url } = await uploadImage(file, 'covers');
                          set('coverUrl', url);
                          toast('success', 'Cover image uploaded');
                        } catch (err) {
                          toast('error', err instanceof Error ? err.message : 'Upload failed');
                        } finally {
                          setCoverUploading(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={coverUploading}
                      onClick={() => document.getElementById('cover-upload')?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink/4 disabled:opacity-50"
                    >
                      {coverUploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                      {coverUploading ? 'Uploading…' : 'Upload image'}
                    </button>
                    {form.coverUrl ? (
                      <button
                        type="button"
                        onClick={() => set('coverUrl', '')}
                        className="rounded-lg px-2 py-1.5 text-xs font-semibold text-subtle hover:text-error"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-xl border border-line-soft bg-surface-alt p-4">
            <label className="flex items-center gap-2 text-[13px] font-semibold">
              <Toggle checked={form.published} onChange={(v) => set('published', v)} label="Published" /> Published
            </label>
            <label className="flex items-center gap-2 text-[13px] font-semibold">
              <Toggle checked={form.isPopular} onChange={(v) => set('isPopular', v)} label="Popular" /> Popular
            </label>
            <label className="flex items-center gap-2 text-[13px] font-semibold">
              <Toggle checked={form.isBeginnerPick} onChange={(v) => set('isBeginnerPick', v)} label="Beginner pick" /> Beginner pick
            </label>
          </div>

          <Field label="Who is this for">
            <Textarea rows={2} value={form.audience} onChange={(e) => set('audience', e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Outcomes" hint="One per line.">
              <Textarea rows={4} value={form.outcomesText} onChange={(e) => set('outcomesText', e.target.value)} />
            </Field>
            <Field label="Equipment needed" hint="One per line.">
              <Textarea rows={4} value={form.equipmentText} onChange={(e) => set('equipmentText', e.target.value)} />
            </Field>
          </div>

          {/* lessons */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Lessons</h4>
              <Button size="sm" variant="outline" icon={Plus} onClick={lessonOps.add}>Add lesson</Button>
            </div>
            <div className="space-y-2">
              {form.lessons.length === 0 && (
                <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-[13px] text-subtle">
                  No lessons yet — add lessons to build the course.
                </p>
              )}
                    {form.lessons.map((lesson, j) => (
                  <div key={j} className="flex flex-wrap items-center gap-2">
                        <Input
                          value={lesson.title}
                          onChange={(e) => lessonOps.patch(j, { title: e.target.value })}
                          placeholder="Lesson title"
                          className="h-9"
                        />
                        <span
                          title="Measured from the uploaded video"
                          className="flex h-9 w-24 shrink-0 items-center justify-center rounded-md border border-line bg-muted/40 px-2 text-xs font-semibold tabular-nums text-muted">
                          {lesson.durationSec
                            ? formatLength(lesson.durationSec)
                            : lesson.videoSource === 'youtube'
                              ? lesson.youtubeVideoId
                                ? 'YouTube'
                                : 'Add YouTube'
                              : (lesson.videos?.length ?? 0) > 0
                                ? 'Re-upload'
                                : 'Upload video'}
                        </span>
                        <LessonVideoControl
                          courseId={editing?._id}
                          lesson={lesson}
                          onChange={(patch, durationSec) =>
                            lessonOps.patch(j, {
                              ...patch,
                              // The real length replaces the typed minutes, so course totals match the video.
                              ...(durationSec ? { durationSec, minutes: Math.max(1, Math.ceil(durationSec / 60)) } : {}),
                            })
                          }
                        />
                        <PreviewLimit
                          value={lesson.previewSec ?? 0}
                          durationSec={lesson.durationSec}
                          onChange={(seconds) => lessonOps.patch(j, { previewSec: seconds, isPreview: seconds > 0 })}
                        />
                        <button onClick={() => lessonOps.remove(j)} className="rounded-md p-1.5 text-subtle hover:bg-error-soft hover:text-error">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
            </div>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this course?"
        message={`“${deleting?.title}” will be removed along with its reviews and enrollments. Order history keeps the course name. This cannot be undone.`}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
