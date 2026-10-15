import { CalendarDays, ChevronRight, Link2, Mail, Phone, Printer } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { LegalDocEntry } from '../api/types';
import { PUBLIC_PATHS, formatLongDate, slugify, type TemplateVars } from '../lib/legal';

/** Breadcrumb, title, summary and the "Last updated" line at the top of every public page. */
export function PageHero({
  crumb,
  title,
  summary,
  updatedAt,
  actions,
}: {
  crumb?: { to: string; label: string };
  title: string;
  summary?: string;
  updatedAt?: string;
  actions?: React.ReactNode;
}) {
  const updated = formatLongDate(updatedAt);
  return (
    <section className="border-b border-line-soft bg-canvas">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-10">
        {crumb && (
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-[13px] font-medium text-muted print:hidden">
            <Link to={crumb.to} className="hover:text-ink hover:underline">
              {crumb.label}
            </Link>
            <ChevronRight size={14} aria-hidden="true" className="text-subtle" />
            <span aria-current="page" className="truncate text-ink">
              {title}
            </span>
          </nav>
        )}
        <h1 className="max-w-3xl text-[28px] font-bold leading-tight tracking-tight sm:text-[34px]">{title}</h1>
        {summary && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted sm:text-base">{summary}</p>}
        {(updated || actions) && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {updated && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted ring-1 ring-line">
                <CalendarDays size={13} aria-hidden="true" />
                Last updated {updated}
              </span>
            )}
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-muted ring-1 ring-line transition-colors hover:bg-surface hover:text-ink print:hidden"
    >
      <Printer size={13} aria-hidden="true" />
      Print or save as PDF
    </button>
  );
}

// ---------------------------------------------------------------- rich text
const DOC_PHRASES: Record<string, string> = {
  'Privacy Policy': PUBLIC_PATHS.privacy,
  'Terms and Conditions': PUBLIC_PATHS.terms,
  'Refund and Cancellation Policy': PUBLIC_PATHS.refund,
  'Shipping and Delivery Policy': PUBLIC_PATHS.delivery,
  'account deletion page': PUBLIC_PATHS.deletion,
};
const LINKABLE = new RegExp(
  [
    '([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})', // email
    '(https?:\\/\\/[^\\s<>"]+)', // web address
    `(${Object.keys(DOC_PHRASES).join('|')})`, // another policy, by name
  ].join('|'),
  'g'
);

/**
 * Policy text with its email addresses, web addresses and references to the other policies turned
 * into links (a link to the page you are on stays plain text).
 */
export function RichText({ text }: { text: string }) {
  const { pathname } = useLocation();
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LINKABLE)) {
    const index = match.index ?? 0;
    let value = match[0];
    let trailing = '';
    if (match[2]) {
      // "…at https://example.com/delete-account." — the full stop belongs to the sentence.
      const cut = value.match(/[.,;:)!?]+$/);
      if (cut) {
        trailing = cut[0];
        value = value.slice(0, -trailing.length);
      }
    }
    parts.push(text.slice(last, index));
    if (match[1]) {
      parts.push(
        <a key={index} href={`mailto:${value}`} className="font-medium text-brand-ink underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
          {value}
        </a>
      );
    } else if (match[2]) {
      const internal = value.startsWith(window.location.origin) ? value.slice(window.location.origin.length) || '/' : null;
      parts.push(
        internal ? (
          <Link key={index} to={internal} className="font-medium text-brand-ink underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
            {value}
          </Link>
        ) : (
          <a key={index} href={value} target="_blank" rel="noreferrer" className="font-medium text-brand-ink underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
            {value}
          </a>
        )
      );
    } else {
      const to = DOC_PHRASES[value];
      parts.push(
        to && to !== pathname ? (
          <Link key={index} to={to} className="font-medium text-brand-ink underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
            {value}
          </Link>
        ) : (
          value
        )
      );
    }
    if (trailing) parts.push(trailing);
    last = index + match[0].length;
  }
  parts.push(text.slice(last));
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- the document itself
type SectionWithId = LegalDocEntry['sections'][number] & { id: string };

function withIds(doc: LegalDocEntry): SectionWithId[] {
  const seen = new Map<string, number>();
  return doc.sections.map((section) => {
    const base = slugify(section.heading) || 'section';
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { ...section, id: count === 1 ? base : `${base}-${count}` };
  });
}

/**
 * A policy, laid out for reading: a contents list beside it on wide screens (folded on phones), each
 * section with its own anchor (#deleting-your-account) so other pages, Play Console and support
 * replies can link straight to a clause.
 */
export function DocumentBody({ doc, aside }: { doc: LegalDocEntry; aside?: React.ReactNode }) {
  const sections = useMemo(() => withIds(doc), [doc]);
  const location = useLocation();
  const [active, setActive] = useState<string>(sections[0]?.id ?? '');

  // Arriving with a #hash: the section exists only once the content has rendered, so scroll then.
  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) window.requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }, [location.hash, sections]);

  // Highlight the section being read in the contents list.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -65% 0px' }
    );
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-14">
      {sections.length > 2 && (
        <aside className="print:hidden">
          <details className="group rounded-xl border border-line bg-surface lg:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold">
              On this page
              <ChevronRight size={16} aria-hidden="true" className="text-subtle transition-transform group-open:rotate-90" />
            </summary>
            <TableOfContents sections={sections} active={active} />
          </details>
          <div className="sticky top-24 hidden lg:block">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-subtle">On this page</p>
            <TableOfContents sections={sections} active={active} />
            {aside}
          </div>
        </aside>
      )}

      <article className="min-w-0 max-w-3xl">
        {sections.map((section) => (
          <section key={section.id} className="border-b border-line-soft py-7 first:pt-0 last:border-b-0">
            <h2 id={section.id} className="group scroll-mt-24 text-xl font-bold leading-snug tracking-tight">
              {section.heading}
              <a
                href={`#${section.id}`}
                aria-label={`Link to “${section.heading}”`}
                className="ml-2 inline-flex align-middle text-subtle opacity-0 transition-opacity hover:text-brand-ink focus:opacity-100 group-hover:opacity-100 print:hidden"
              >
                <Link2 size={16} aria-hidden="true" />
              </a>
            </h2>
            {section.body.map((paragraph, i) => (
              <p key={i} className="mt-3 text-[15px] leading-7 text-ink/90">
                <RichText text={paragraph} />
              </p>
            ))}
            {section.points.length > 0 && (
              <ul className="mt-3 space-y-2">
                {section.points.map((point, i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-7 text-ink/90">
                    <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span className="min-w-0">
                      <RichText text={point} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>
    </div>
  );
}

function TableOfContents({ sections, active }: { sections: SectionWithId[]; active: string }) {
  return (
    <ol className="space-y-0.5 px-2 pb-3 lg:px-0 lg:pb-0">
      {sections.map((section) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className={`block rounded-md px-3 py-1.5 text-[13px] leading-snug transition-colors ${
              active === section.id ? 'bg-brand-soft font-semibold text-brand-ink' : 'text-muted hover:bg-ink/5 hover:text-ink'
            }`}
          >
            {section.heading}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** "Questions about this policy?" — support details from Settings, under every document. */
export function HelpCard({ vars, title = 'Questions about this policy?' }: { vars: TemplateVars; title?: string }) {
  if (!vars.supportEmail && !vars.supportPhone) return null;
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="flex flex-col gap-5 rounded-2xl bg-brand-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-lg font-bold text-brand-ink">{title}</h2>
          <p className="mt-1 text-sm text-muted">
            Our team answers within 2 working days. For anything about your personal data, see the{' '}
            <Link to={`${PUBLIC_PATHS.contact}#grievance-officer`} className="font-semibold text-brand-ink underline underline-offset-2">
              Grievance Officer
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {vars.supportEmail && (
            <a href={`mailto:${vars.supportEmail}`} className="inline-flex items-center gap-2 text-[15px] font-semibold text-brand-ink hover:underline">
              <Mail size={16} aria-hidden="true" />
              {vars.supportEmail}
            </a>
          )}
          {vars.supportPhone && (
            <a href={`tel:${vars.supportPhone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 text-[15px] font-semibold text-brand-ink hover:underline">
              <Phone size={16} aria-hidden="true" />
              {vars.supportPhone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/** Grey bars in the shape of a document, while the first request is in flight. */
export function DocumentSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-3xl space-y-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-56 max-w-full animate-pulse rounded bg-ink/8" />
            <div className="h-3.5 w-full animate-pulse rounded bg-ink/6" />
            <div className="h-3.5 w-[92%] animate-pulse rounded bg-ink/6" />
            <div className="h-3.5 w-[70%] animate-pulse rounded bg-ink/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
