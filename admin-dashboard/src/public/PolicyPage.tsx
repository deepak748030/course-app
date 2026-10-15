import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LegalDocKey } from '../api/types';
import { DOC_PATHS, LEGAL_DOC_META, LEGAL_DOC_ORDER, PUBLIC_PATHS, fillDoc, resolveDoc, templateVars } from '../lib/legal';
import { DocumentBody, DocumentSkeleton, HelpCard, PageHero, PrintButton } from './PublicPieces';
import { usePageMeta, usePublicContent } from './usePublicContent';

/**
 * One policy (privacy, terms, refund, delivery) or the About page: the admin's own text from the
 * Content page when there is one, otherwise the built-in document — with the business details from
 * Settings filled in.
 */
export default function PolicyPage({ docKey }: { docKey: LegalDocKey }) {
  const { status, settings, defaults } = usePublicContent();
  const vars = templateVars(settings, window.location.origin);
  const { doc, updatedAt } = resolveDoc(docKey, settings, defaults);
  const filled = fillDoc(doc, vars);
  const meta = LEGAL_DOC_META[docKey];

  usePageMeta(`${meta.label} — ${vars.appName}`, filled.summary || meta.description);

  const related = LEGAL_DOC_ORDER.filter((key) => key !== docKey && key !== 'about').slice(0, 4);
  const isAbout = docKey === 'about';

  return (
    <>
      <PageHero
        crumb={isAbout ? undefined : { to: PUBLIC_PATHS.hub, label: 'Policies' }}
        title={filled.heading || meta.label}
        summary={filled.summary}
        updatedAt={isAbout ? undefined : updatedAt}
        actions={isAbout ? undefined : <PrintButton />}
      />

      {status === 'loading' ? <DocumentSkeleton /> : <DocumentBody doc={filled} />}

      {isAbout && (
        <div className="mx-auto mb-12 max-w-6xl px-4 sm:px-6">
          <Link
            to={PUBLIC_PATHS.pricing}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-line p-6 transition-colors hover:border-brand hover:bg-brand-soft/50"
          >
            <span>
              <span className="block text-lg font-bold">See our courses and prices</span>
              <span className="mt-1 block text-sm text-muted">Every course, its lessons and what it costs.</span>
            </span>
            <ArrowRight size={20} aria-hidden="true" className="shrink-0 text-brand-ink transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      )}

      <HelpCard vars={vars} title={isAbout ? 'Talk to us' : 'Questions about this policy?'} />

      {!isAbout && (
        <nav aria-label="Related policies" className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 print:hidden">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle">Related</p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((key) => (
              <li key={key}>
                <Link
                  to={DOC_PATHS[key]}
                  className="group flex h-full flex-col rounded-xl border border-line p-4 transition-colors hover:border-brand hover:bg-brand-soft/40"
                >
                  <span className="text-[15px] font-semibold">{LEGAL_DOC_META[key].label}</span>
                  <span className="mt-1 text-[13px] leading-snug text-muted">{LEGAL_DOC_META[key].description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
