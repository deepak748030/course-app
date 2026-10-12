import { ArrowDown, ArrowUp, FileText, HelpCircle, Plus, RotateCcw, Save, ScrollText, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { AppSettings, FaqEntry, LegalDocEntry, LegalSectionEntry } from '../api/types';
import { Button, Card, CardHeader, Field, Input, LoadingBlock, Textarea, useToast } from '../components/ui';

/** What the app's Help, policy and checkout screens show. Saved to the server, so the app updates live. */

type DocKey = 'terms' | 'refund' | 'privacy';
const DOC_KEYS: DocKey[] = ['terms', 'refund', 'privacy'];
const DOC_LABELS: Record<DocKey, string> = { terms: 'Terms of use', refund: 'Refund policy', privacy: 'Privacy policy' };
const MAX_FAQS = 50;
const MAX_SECTIONS = 30;

type ContentState = {
  faqs: FaqEntry[];
  legalDocs: Record<DocKey, LegalDocEntry | null>;
  purchaseTerms: string[];
};

const fromSettings = (s: AppSettings): ContentState => ({
  faqs: s.faqs ?? [],
  legalDocs: {
    terms: s.legalDocs?.terms ?? null,
    refund: s.legalDocs?.refund ?? null,
    privacy: s.legalDocs?.privacy ?? null,
  },
  purchaseTerms: s.purchaseTerms ?? [],
});

/** Swap an item with its neighbour; returns the same list when the move is off the end. */
function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const cleanLines = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);

/** Textareas edit one entry per line; blank lines are kept while typing and dropped on save. */
const toLines = (items: string[]) => items.join('\n');
const fromLines = (text: string) => text.split('\n');

function blankDoc(key: DocKey): LegalDocEntry {
  return { title: DOC_LABELS[key], heading: '', summary: '', sections: [] };
}

function cleanDoc(key: DocKey, doc: LegalDocEntry | null): LegalDocEntry | null {
  if (!doc) return null;
  return {
    title: doc.title.trim() || DOC_LABELS[key],
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
  const [saved, setSaved] = useState<ContentState | null>(null);
  const [draft, setDraft] = useState<ContentState | null>(null);
  const [tab, setTab] = useState<DocKey>('terms');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .getSettings()
      .then((s) => {
        const next = fromSettings(s);
        setSaved(next);
        setDraft(next);
      })
      .catch((e) => toast('error', e instanceof Error ? e.message : 'Failed to load content'));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(
    () => (saved && draft ? JSON.stringify(saved) !== JSON.stringify(draft) : false),
    [saved, draft]
  );

  if (!saved || !draft) return <Card><LoadingBlock label="Loading content…" /></Card>;

  const faqsValid = draft.faqs.every((faq) => faq.question.trim().length > 0);

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const updated = await api.updateSettings({
        faqs: draft.faqs
          .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
          .filter((faq) => faq.question),
        legalDocs: {
          terms: cleanDoc('terms', draft.legalDocs.terms),
          refund: cleanDoc('refund', draft.legalDocs.refund),
          privacy: cleanDoc('privacy', draft.legalDocs.privacy),
        },
        purchaseTerms: cleanLines(draft.purchaseTerms),
      });
      const next = fromSettings(updated);
      setSaved(next);
      setDraft(next);
      toast('success', 'Saved — the app shows this content now');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ----- FAQ helpers
  const setFaqs = (faqs: FaqEntry[]) => setDraft((d) => (d ? { ...d, faqs } : d));
  const patchFaq = (i: number, patch: Partial<FaqEntry>) =>
    setFaqs(draft.faqs.map((faq, index) => (index === i ? { ...faq, ...patch } : faq)));

  // ----- policy helpers
  const doc = draft.legalDocs[tab];
  const setDoc = (next: LegalDocEntry | null) =>
    setDraft((d) => (d ? { ...d, legalDocs: { ...d.legalDocs, [tab]: next } } : d));
  const patchDoc = (patch: Partial<LegalDocEntry>) => doc && setDoc({ ...doc, ...patch });
  const setSections = (sections: LegalSectionEntry[]) => doc && setDoc({ ...doc, sections });
  const patchSection = (i: number, patch: Partial<LegalSectionEntry>) =>
    doc && setSections(doc.sections.map((section, index) => (index === i ? { ...section, ...patch } : section)));

  return (
    <div className="max-w-3xl space-y-4">
      {/* ---------- Help & FAQ ---------- */}
      <Card>
        <CardHeader
          title="Help & FAQ"
          subtitle="The questions on the app's Help screen, in this order. Empty = the built-in questions."
          action={
            <Button
              size="sm"
              variant="outline"
              icon={Plus}
              disabled={draft.faqs.length >= MAX_FAQS}
              onClick={() => setFaqs([...draft.faqs, { question: '', answer: '' }])}>
              Add question
            </Button>
          }
        />
        <div className="space-y-3 p-5">
          {draft.faqs.length === 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-line px-4 py-6 text-[13px] text-muted">
              <HelpCircle size={18} className="shrink-0 text-subtle" />
              The app is showing its built-in questions. Add one to replace them.
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
          {!faqsValid && <p className="text-[13px] font-medium text-error">Every question needs text, or it will be dropped on save.</p>}
        </div>
      </Card>

      {/* ---------- Policies ---------- */}
      <Card>
        <CardHeader
          title="Policies"
          subtitle="Terms, refund and privacy, shown from Profile → Policies in the app"
        />
        <div className="space-y-5 p-5">
          <div className="inline-flex rounded-lg border border-line bg-surface p-1">
            {DOC_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  tab === key ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:text-ink'
                }`}>
                {draft.legalDocs[key] ? <FileText size={13} /> : <ScrollText size={13} />}
                {DOC_LABELS[key]}
              </button>
            ))}
          </div>

          {!doc ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line px-4 py-6">
              <p className="text-[13px] text-muted">
                The app shows its built-in {DOC_LABELS[tab].toLowerCase()}. Write your own version here to replace it.
              </p>
              <Button size="sm" variant="outline" icon={Plus} onClick={() => setDoc(blankDoc(tab))}>
                Write my own
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Screen name" hint="Shown in the app's title bar and on Profile">
                  <Input value={doc.title} onChange={(e) => patchDoc({ title: e.target.value })} maxLength={60} />
                </Field>
                <Field label="Document heading">
                  <Input value={doc.heading} onChange={(e) => patchDoc({ heading: e.target.value })} maxLength={160} />
                </Field>
              </div>
              <Field label="Summary line" hint="One line under the heading, e.g. the date it applies from">
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

              <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-4">
                <p className="text-[13px] text-muted">Removing this version brings back the app's built-in text.</p>
                <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => setDoc(null)}>
                  Use built-in text
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* ---------- Checkout ---------- */}
      <Card>
        <CardHeader title="Checkout terms" subtitle="The bullet list shown on the checkout screen. One line each. Empty = the built-in list." />
        <div className="p-5">
          <Textarea
            rows={5}
            value={toLines(draft.purchaseTerms)}
            onChange={(e) => setDraft((d) => (d ? { ...d, purchaseTerms: fromLines(e.target.value) } : d))}
            placeholder="Access lasts for the life of the course"
          />
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
