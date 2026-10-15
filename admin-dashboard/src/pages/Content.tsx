import { ArrowDown, ArrowUp, Braces, ExternalLink, FileText, HelpCircle, Plus, RotateCcw, Save, Smartphone, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { AppSettings, ContentDefaults, FaqEntry, LegalDocEntry, LegalDocKey, LegalSectionEntry } from '../api/types';
import { Button, Card, CardHeader, Field, FormSkeleton, Input, Skeleton, Textarea, useToast } from '../components/ui';
import { BUILT_IN_CONTENT } from '../data/builtInContent';
import { DOC_PATHS, LEGAL_DOC_META, PLACEHOLDERS, contentDefaultsOrBuiltIn, formatLongDate, publicBaseUrl } from '../lib/legal';

/**
 * What the app's Help, policy and checkout screens — and the public website's policy pages — show.
 * Every field starts with the built-in text, so nothing is blank. Editing a field makes it "your text";
 * "Use built-in text" puts the default back. Saved to the server; the app and the website update live.
 */

type DocKey = LegalDocKey;
const DOC_KEYS: DocKey[] = ['terms', 'privacy', 'refund', 'delivery', 'deletion', 'about'];
const DOC_LABELS: Record<DocKey, string> = {
  terms: 'Terms',
  privacy: 'Privacy',
  refund: 'Refunds',
  delivery: 'Delivery',
  deletion: 'Account deletion',
  about: 'About us',
};
const MAX_FAQS = 50;
const MAX_SECTIONS = 30;

/** `builtIn` = this part is showing the built-in text (it is stored as "not set", so the app keeps its own copy). */
type ContentState = {
  faqs: FaqEntry[];
  legalDocs: Record<DocKey, LegalDocEntry>;
  purchaseTerms: string[];
  builtIn: { faqs: boolean; purchaseTerms: boolean } & Record<DocKey, boolean>;
};


const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Older or hand-written documents may leave out a section's body or points: always give the editor arrays. */
function normalizeDoc(doc: LegalDocEntry): LegalDocEntry {
  return {
    ...doc,
    title: doc.title ?? '',
    heading: doc.heading ?? '',
    summary: doc.summary ?? '',
    sections: (doc.sections ?? []).map((section) => ({
      heading: section.heading ?? '',
      body: section.body ?? [],
      points: section.points ?? [],
    })),
  };
}

/** Builds the editor state from what is stored, filling every empty part with the built-in text. */
function fromSettings(s: AppSettings, defaults: ContentDefaults): ContentState {
  const docBuiltIn = Object.fromEntries(DOC_KEYS.map((key) => [key, !s.legalDocs?.[key]])) as Record<DocKey, boolean>;
  const builtIn = {
    faqs: !(s.faqs && s.faqs.length > 0),
    purchaseTerms: !(s.purchaseTerms && s.purchaseTerms.length > 0),
    ...docBuiltIn,
  };
  return {
    faqs: copy(builtIn.faqs ? defaults.faqs : s.faqs ?? []),
    legalDocs: Object.fromEntries(
      DOC_KEYS.map((key) => [key, copy(builtIn[key] ? normalizeDoc(defaults.legalDocs[key]) : normalizeDoc(s.legalDocs![key]!))])
    ) as Record<DocKey, LegalDocEntry>,
    purchaseTerms: builtIn.purchaseTerms ? [...defaults.purchaseTerms] : [...(s.purchaseTerms ?? [])],
    builtIn,
  };
}

/** Swap an item with its neighbour; returns the same list when the move is off the end. */
function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const cleanLines = (items?: string[] | null) => (items ?? []).map((item) => item.trim()).filter(Boolean);

/** Textareas edit one entry per line; blank lines are kept while typing and dropped on save. */
const toLines = (items?: string[] | null) => (items ?? []).join('\n');
const fromLines = (text: string) => text.split('\n');

function cleanDoc(key: DocKey, doc: LegalDocEntry, defaults: ContentDefaults): LegalDocEntry {
  return {
    title: doc.title.trim() || defaults.legalDocs[key]?.title || LEGAL_DOC_META[key].label,
    heading: doc.heading.trim(),
    summary: doc.summary.trim(),
    sections: doc.sections
      .map((section) => ({
        heading: section.heading.trim(),
        body: cleanLines(section.body),
        points: cleanLines(section.points),
      }))
      .filter((section) => section.heading),
  };
}

export default function Content() {
  const toast = useToast();
  const [defaults, setDefaults] = useState<ContentDefaults>(BUILT_IN_CONTENT);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState<ContentState | null>(null);
  const [draft, setDraft] = useState<ContentState | null>(null);
  const [tab, setTab] = useState<DocKey>('terms');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    api
      .getSettingsWithDefaults()
      .then(({ settings, contentDefaults }) => {
        // An older server does not send contentDefaults (or only some documents): fill in from the bundled copy.
        const d = contentDefaultsOrBuiltIn(contentDefaults);
        setDefaults(d);
        setSettings(settings);
        const next = fromSettings(settings, d);
        setSaved(next);
        setDraft(next);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Could not load the content.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(
    () => (saved && draft ? JSON.stringify(saved) !== JSON.stringify(draft) : false),
    [saved, draft]
  );

  if (!saved || !draft) {
    if (loadError) {
      return (
        <Card>
          <div className="flex flex-col items-start gap-3 p-6">
            <p className="text-sm font-semibold text-error">Content could not be loaded</p>
            <p className="text-[13px] leading-relaxed text-muted">{loadError}</p>
            <Button variant="outline" icon={RotateCcw} onClick={load}>
              Try again
            </Button>
          </div>
        </Card>
      );
    }
    return (
      <div className="max-w-3xl space-y-4">
        <Card>
          <div className="border-b border-line-soft px-5 py-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-3 w-64 max-w-full" />
          </div>
          <div className="space-y-3 p-5" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-line-soft p-4">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="mt-3 h-20 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </Card>
        <FormSkeleton sections={2} fieldsPerSection={3} />
      </div>
    );
  }

  const faqsValid = draft.faqs.every((faq) => faq.question.trim().length > 0);

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      // A part that is still on built-in text is sent as "not set" so the app keeps using its own copy.
      const updated = await api.updateSettings({
        faqs: draft.builtIn.faqs
          ? []
          : draft.faqs
              .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
              .filter((faq) => faq.question),
        legalDocs: Object.fromEntries(
          DOC_KEYS.map((key) => [key, draft.builtIn[key] ? null : cleanDoc(key, draft.legalDocs[key], defaults)])
        ),
        purchaseTerms: draft.builtIn.purchaseTerms ? [] : cleanLines(draft.purchaseTerms),
      } as Partial<AppSettings>);
      const next = fromSettings(updated, defaults);
      setSettings(updated);
      setSaved(next);
      setDraft(next);
      toast('success', 'Saved — the app and the public pages show this content now');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ----- FAQ helpers (editing makes the list "your text")
  const setFaqs = (faqs: FaqEntry[]) =>
    setDraft((d) => (d ? { ...d, faqs, builtIn: { ...d.builtIn, faqs: false } } : d));
  const patchFaq = (i: number, patch: Partial<FaqEntry>) =>
    setFaqs(draft.faqs.map((faq, index) => (index === i ? { ...faq, ...patch } : faq)));
  const resetFaqs = () =>
    setDraft((d) => (d ? { ...d, faqs: copy(defaults.faqs), builtIn: { ...d.builtIn, faqs: true } } : d));

  // ----- policy helpers
  const doc = draft.legalDocs[tab];
  const setDoc = (next: LegalDocEntry) =>
    setDraft((d) =>
      d ? { ...d, legalDocs: { ...d.legalDocs, [tab]: next }, builtIn: { ...d.builtIn, [tab]: false } } : d
    );
  const patchDoc = (patch: Partial<LegalDocEntry>) => setDoc({ ...doc, ...patch });
  const setSections = (sections: LegalSectionEntry[]) => setDoc({ ...doc, sections });
  const patchSection = (i: number, patch: Partial<LegalSectionEntry>) =>
    setSections(doc.sections.map((section, index) => (index === i ? { ...section, ...patch } : section)));
  const resetDoc = () =>
    setDraft((d) =>
      d
        ? {
            ...d,
            legalDocs: { ...d.legalDocs, [tab]: copy(normalizeDoc(defaults.legalDocs[tab])) },
            builtIn: { ...d.builtIn, [tab]: true },
          }
        : d
    );

  // ----- checkout terms
  const setTerms = (purchaseTerms: string[]) =>
    setDraft((d) => (d ? { ...d, purchaseTerms, builtIn: { ...d.builtIn, purchaseTerms: false } } : d));
  const resetTerms = () =>
    setDraft((d) => (d ? { ...d, purchaseTerms: [...defaults.purchaseTerms], builtIn: { ...d.builtIn, purchaseTerms: true } } : d));

  const badge = (builtIn: boolean) => (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        builtIn ? 'bg-surface-alt text-muted' : 'bg-brand-soft text-brand-ink'
      }`}>
      {builtIn ? 'Built-in text' : 'Your text'}
    </span>
  );

  return (
    <div className="max-w-3xl space-y-4">
      {/* ---------- Help & FAQ ---------- */}
      <Card>
        <CardHeader
          title="Help & FAQ"
          subtitle="The questions on the app's Help screen, in this order"
          action={
            <div className="flex items-center gap-2">
              {badge(draft.builtIn.faqs)}
              <Button
                size="sm"
                variant="outline"
                icon={Plus}
                disabled={draft.faqs.length >= MAX_FAQS}
                onClick={() => setFaqs([...draft.faqs, { question: '', answer: '' }])}>
                Add question
              </Button>
            </div>
          }
        />
        <div className="space-y-3 p-5">
          {draft.faqs.length === 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-line px-4 py-6 text-[13px] text-muted">
              <HelpCircle size={18} className="shrink-0 text-subtle" />
              No questions. The app shows its built-in questions while this list is empty.
            </div>
          )}
          {draft.faqs.map((faq, i) => (
            <div key={i} className="rounded-lg border border-line-soft p-4">
              <div className="mb-3 flex items-start gap-2">
                <Input
                  value={faq.question}
                  onChange={(e) => patchFaq(i, { question: e.target.value })}
                  placeholder="Question"
                  maxLength={300}
                  className="flex-1"
                />
                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton label="Move up" disabled={i === 0} onClick={() => setFaqs(moveItem(draft.faqs, i, -1))}>
                    <ArrowUp size={14} />
                  </IconButton>
                  <IconButton
                    label="Move down"
                    disabled={i === draft.faqs.length - 1}
                    onClick={() => setFaqs(moveItem(draft.faqs, i, 1))}>
                    <ArrowDown size={14} />
                  </IconButton>
                  <IconButton label="Remove question" danger onClick={() => setFaqs(draft.faqs.filter((_, index) => index !== i))}>
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </div>
              <Textarea
                rows={3}
                value={faq.answer}
                onChange={(e) => patchFaq(i, { answer: e.target.value })}
                placeholder="Answer"
                maxLength={2000}
              />
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
            {!faqsValid ? (
              <p className="text-[13px] font-medium text-error">Every question needs text, or it will be dropped on save.</p>
            ) : (
              <span />
            )}
            {!draft.builtIn.faqs && (
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={resetFaqs}>
                Use built-in questions
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ---------- Policies ---------- */}
      <Card>
        <CardHeader
          title="Policies and pages"
          subtitle="Shown on the public website (no sign-in needed). Terms, privacy and refunds also appear in the app under Profile."
        />
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex max-w-full flex-wrap gap-1 rounded-lg border border-line bg-surface p-1">
              {DOC_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                    tab === key ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:text-ink'
                  }`}>
                  <FileText size={13} />
                  {DOC_LABELS[key]}
                </button>
              ))}
            </div>
            {badge(draft.builtIn[tab])}
          </div>

          <div className="flex flex-col gap-2 rounded-lg bg-canvas px-4 py-3 text-[13px] sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-muted">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-ink">{LEGAL_DOC_META[tab].label}</span>
                {LEGAL_DOC_META[tab].inApp ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink">
                    <Smartphone size={12} /> Also in the app
                  </span>
                ) : (
                  <span className="text-xs">Website only</span>
                )}
              </p>
              <p className="mt-0.5 truncate text-xs">
                {publicBaseUrl(settings)}
                {DOC_PATHS[tab]}
                {!draft.builtIn[tab] && saved.legalDocs[tab].updatedAt
                  ? ` · last updated ${formatLongDate(saved.legalDocs[tab].updatedAt)}`
                  : ''}
              </p>
            </div>
            <a
              href={DOC_PATHS[tab]}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-brand-ink hover:underline">
              View public page <ExternalLink size={13} />
            </a>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Short name" hint={LEGAL_DOC_META[tab].inApp ? "The app's title bar for this document" : 'Used in lists and the browser tab'}>
              <Input value={doc.title} onChange={(e) => patchDoc({ title: e.target.value })} maxLength={60} />
            </Field>
            <Field label="Document heading">
              <Input value={doc.heading} onChange={(e) => patchDoc({ heading: e.target.value })} maxLength={160} />
            </Field>
          </div>
          <Field label="Summary line" hint="One line under the heading. “Last updated” is added automatically when you save changes.">
            <Input value={doc.summary} onChange={(e) => patchDoc({ summary: e.target.value })} maxLength={200} />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold">Sections</p>
              <Button
                size="sm"
                variant="outline"
                icon={Plus}
                disabled={doc.sections.length >= MAX_SECTIONS}
                onClick={() => setSections([...doc.sections, { heading: '', body: [], points: [] }])}>
                Add section
              </Button>
            </div>
            {doc.sections.map((section, i) => (
              <div key={i} className="rounded-lg border border-line-soft p-4">
                <div className="mb-3 flex items-start gap-2">
                  <Input
                    value={section.heading}
                    onChange={(e) => patchSection(i, { heading: e.target.value })}
                    placeholder="Section heading"
                    maxLength={160}
                    className="flex-1"
                  />
                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconButton label="Move up" disabled={i === 0} onClick={() => setSections(moveItem(doc.sections, i, -1))}>
                      <ArrowUp size={14} />
                    </IconButton>
                    <IconButton
                      label="Move down"
                      disabled={i === doc.sections.length - 1}
                      onClick={() => setSections(moveItem(doc.sections, i, 1))}>
                      <ArrowDown size={14} />
                    </IconButton>
                    <IconButton label="Remove section" danger onClick={() => setSections(doc.sections.filter((_, index) => index !== i))}>
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Paragraphs" hint="One paragraph per line">
                    <Textarea
                      rows={5}
                      value={toLines(section.body)}
                      onChange={(e) => patchSection(i, { body: fromLines(e.target.value) })}
                    />
                  </Field>
                  <Field label="Bullet points" hint="One point per line">
                    <Textarea
                      rows={5}
                      value={toLines(section.points)}
                      onChange={(e) => patchSection(i, { points: fromLines(e.target.value) })}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          <details className="group rounded-lg border border-line-soft">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] font-semibold">
              <Braces size={14} className="text-brand-ink" />
              Placeholders you can use in any field
              <span className="ml-auto text-xs font-normal text-subtle group-open:hidden">Show</span>
            </summary>
            <div className="border-t border-line-soft px-4 py-3">
              <p className="mb-3 text-xs leading-relaxed text-muted">
                Write a placeholder like <code className="rounded bg-canvas px-1">{'{{supportEmail}}'}</code> and it is replaced with the
                value from Settings when the page is shown. A paragraph or point whose placeholder is still empty is hidden, so
                nothing shows a blank — fill the detail in Settings and the line appears.
              </p>
              <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {PLACEHOLDERS.map((item) => (
                  <li key={item.token} className="flex min-w-0 items-baseline gap-2 text-xs">
                    <code className="shrink-0 rounded bg-canvas px-1 text-ink">{`{{${item.token}}}`}</code>
                    <span className="truncate text-subtle">{item.from}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
            <p className="text-[13px] text-muted">Editing here makes this document your own text.</p>
            {!draft.builtIn[tab] && (
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={resetDoc}>
                Use built-in text
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ---------- Checkout ---------- */}
      <Card>
        <CardHeader
          title="Checkout terms"
          subtitle="The bullet list shown on the checkout screen. One line each."
          action={badge(draft.builtIn.purchaseTerms)}
        />
        <div className="space-y-3 p-5">
          <Textarea rows={5} value={toLines(draft.purchaseTerms)} onChange={(e) => setTerms(fromLines(e.target.value))} />
          {!draft.builtIn.purchaseTerms && (
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={resetTerms}>
                Use built-in terms
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {dirty && <p className="text-[13px] font-medium text-brand-ink">Unsaved changes</p>}
        <Button icon={Save} onClick={save} loading={saving} disabled={!dirty || !faqsValid}>
          Save content
        </Button>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md p-1.5 text-subtle transition-colors disabled:opacity-35 ${
        danger ? 'hover:bg-error-soft hover:text-error' : 'hover:bg-ink/5 hover:text-ink'
      }`}>
      {children}
    </button>
  );
}
