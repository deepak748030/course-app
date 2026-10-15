/**
 * Help, policies and checkout copy. The admin dashboard edits these in the server settings; until an
 * admin saves a version, the built-in text in data/content.ts is what learners see.
 *
 * Policy text may carry placeholders — {{supportEmail}}, {{address}}, {{grievanceName}} … — which are
 * filled in here from the server settings, exactly like the public website does
 * (admin-dashboard/src/lib/legal.ts). A paragraph or point that uses a detail the academy has not
 * filled in yet is left out rather than shown with a gap.
 */

import { useMemo } from 'react';

import { faqs as builtinFaqs, legalDocs as builtinLegal, purchaseTerms as builtinTerms, type LegalDoc } from '@/data/content';
import type { ServerSettings } from '@/services/api';
import { useStore } from '@/store';

export type LegalKey = keyof typeof builtinLegal;
export type Faq = { id: string; question: string; answer: string };

export type AppContent = {
  faqs: readonly Faq[];
  legalDocs: Record<LegalKey, LegalDoc>;
  purchaseTerms: readonly string[];
};

type TemplateVars = Record<string, string>;

/** Values for the policy placeholders. Mirrors templateVars() in the admin dashboard. */
export function templateVars(settings: ServerSettings | null | undefined): TemplateVars {
  const business = settings?.business ?? {};
  const clean = (value?: string | null) => (value ?? '').trim();
  const appName = clean(settings?.appName) || 'YDU Academy';
  const supportEmail = clean(settings?.supportEmail);
  const supportPhone = clean(settings?.supportPhone);
  const website = clean(business.websiteUrl).replace(/\/+$/, '');
  return {
    appName,
    legalName: clean(business.legalName) || appName,
    supportEmail,
    supportPhone,
    supportHours: clean(business.supportHours),
    address: clean(business.address)
      .split('\n')
      .map((line) => line.trim().replace(/,$/, ''))
      .filter(Boolean)
      .join(', '),
    grievanceName: clean(business.grievanceName),
    grievanceEmail: clean(business.grievanceEmail) || supportEmail,
    grievancePhone: clean(business.grievancePhone) || supportPhone,
    jurisdiction: clean(business.jurisdiction),
    gstin: clean(business.gstin),
    website,
    deleteUrl: website ? `${website}/delete-account` : '',
  };
}

const TOKEN = /\{\{\s*(\w+)\s*\}\}/g;

/** Headings: placeholders filled; an unknown one stays as typed, so a typo is visible. */
function fillText(text: string, vars: TemplateVars): string {
  return text.replace(TOKEN, (match, name: string) => (name in vars ? vars[name] : match));
}

/** Paragraphs and points: null when a placeholder in them has no value yet, so the line is dropped. */
function fillLine(text: string, vars: TemplateVars): string | null {
  let missing = false;
  const filled = text.replace(TOKEN, (match, name: string) => {
    if (!(name in vars)) return match;
    if (!vars[name]) missing = true;
    return vars[name];
  });
  return missing ? null : filled;
}

export function fillLegalDoc(doc: LegalDoc, vars: TemplateVars): LegalDoc {
  const lines = (items?: readonly string[]) =>
    (items ?? []).map((line) => fillLine(line, vars)).filter((line): line is string => line !== null);
  return {
    ...doc,
    title: fillText(doc.title, vars),
    heading: fillText(doc.heading, vars),
    summary: fillText(doc.summary, vars),
    sections: doc.sections
      .map((section) => ({ heading: fillText(section.heading, vars), body: lines(section.body), points: lines(section.points) }))
      .filter((section) => section.heading && (section.body.length > 0 || section.points.length > 0)),
  };
}

export function resolveAppContent(settings: ServerSettings | null | undefined): AppContent {
  const serverFaqs = settings?.faqs ?? [];
  const faqs: readonly Faq[] = serverFaqs.length
    ? serverFaqs.map((faq, index) => ({ id: `faq-${index}`, question: faq.question, answer: faq.answer }))
    : builtinFaqs;

  const vars = templateVars(settings);
  const pick = (key: LegalKey): LegalDoc => {
    const doc = settings?.legalDocs?.[key];
    return fillLegalDoc(doc && doc.title ? doc : builtinLegal[key], vars);
  };

  const purchaseTerms = settings?.purchaseTerms?.length ? settings.purchaseTerms : builtinTerms;

  return {
    faqs,
    legalDocs: { terms: pick('terms'), refund: pick('refund'), privacy: pick('privacy') },
    purchaseTerms,
  };
}

export function useAppContent(): AppContent {
  const { settings } = useStore();
  return useMemo(() => resolveAppContent(settings), [settings]);
}
