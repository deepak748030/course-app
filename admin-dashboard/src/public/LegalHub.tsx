import { ArrowRight, FileText, Info, Mail, ReceiptText, ShieldCheck, Trash2, Truck, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LegalDocKey } from '../api/types';
import { DOC_PATHS, LEGAL_DOC_META, LEGAL_DOC_ORDER, PUBLIC_PATHS, formatLongDate, resolveDoc, templateVars } from '../lib/legal';
import { PageHero } from './PublicPieces';
import { usePageMeta, usePublicContent } from './usePublicContent';

const ICONS: Record<LegalDocKey, typeof FileText> = {
  privacy: ShieldCheck,
  terms: FileText,
  refund: Undo2,
  delivery: Truck,
  deletion: Trash2,
  about: Info,
};

/** /legal — every policy and information page in one place. A good "Website" link for store listings. */
export default function LegalHub() {
  const { settings, defaults } = usePublicContent();
  const vars = templateVars(settings, window.location.origin);
  usePageMeta(`Policies — ${vars.appName}`, `Privacy policy, terms, refunds, delivery and account deletion for ${vars.appName}.`);

  return (
    <>
      <PageHero
        title="Policies and information"
        summary={`Everything about how ${vars.appName} works: your privacy, the terms of use, refunds, how courses are delivered and how to delete your account.`}
      />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LEGAL_DOC_ORDER.map((key) => {
            const Icon = ICONS[key];
            const { updatedAt } = resolveDoc(key, settings, defaults);
            return (
              <li key={key}>
                <Link
                  to={DOC_PATHS[key]}
                  className="group flex h-full flex-col rounded-2xl border border-line p-5 transition-colors hover:border-brand hover:bg-brand-soft/40"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="mt-4 text-[17px] font-bold">{LEGAL_DOC_META[key].label}</span>
                  <span className="mt-1 flex-1 text-sm leading-relaxed text-muted">{LEGAL_DOC_META[key].description}</span>
                  <span className="mt-4 flex items-center justify-between text-[13px] font-semibold text-brand-ink">
                    {key !== 'about' && updatedAt ? `Updated ${formatLongDate(updatedAt)}` : 'Read'}
                    <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              to={PUBLIC_PATHS.pricing}
              className="group flex h-full flex-col rounded-2xl border border-line p-5 transition-colors hover:border-brand hover:bg-brand-soft/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                <ReceiptText size={18} aria-hidden="true" />
              </span>
              <span className="mt-4 text-[17px] font-bold">Courses and pricing</span>
              <span className="mt-1 flex-1 text-sm leading-relaxed text-muted">Every course we sell and what it costs.</span>
              <span className="mt-4 flex items-center justify-between text-[13px] font-semibold text-brand-ink">
                See prices
                <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
          <li>
            <Link
              to={PUBLIC_PATHS.contact}
              className="group flex h-full flex-col rounded-2xl border border-line p-5 transition-colors hover:border-brand hover:bg-brand-soft/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                <Mail size={18} aria-hidden="true" />
              </span>
              <span className="mt-4 text-[17px] font-bold">Contact us</span>
              <span className="mt-1 flex-1 text-sm leading-relaxed text-muted">Support, business details and our Grievance Officer.</span>
              <span className="mt-4 flex items-center justify-between text-[13px] font-semibold text-brand-ink">
                Get in touch
                <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}
