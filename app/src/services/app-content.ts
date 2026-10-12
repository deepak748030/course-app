/**
 * Help, policies and checkout copy. The admin dashboard edits these in the server settings; until an
 * admin saves a version, the built-in text in data/content.ts is what learners see.
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

export function resolveAppContent(settings: ServerSettings | null | undefined): AppContent {
  const serverFaqs = settings?.faqs ?? [];
  const faqs: readonly Faq[] = serverFaqs.length
    ? serverFaqs.map((faq, index) => ({ id: `faq-${index}`, question: faq.question, answer: faq.answer }))
    : builtinFaqs;

  const pick = (key: LegalKey): LegalDoc => {
    const doc = settings?.legalDocs?.[key];
    return doc && doc.title ? doc : builtinLegal[key];
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
