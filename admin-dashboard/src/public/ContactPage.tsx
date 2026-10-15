import { Building2, Clock, FileText, Mail, MapPin, Phone, ShieldCheck, Trash2, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PUBLIC_PATHS, templateVars } from '../lib/legal';
import { PageHero } from './PublicPieces';
import { usePageMeta, usePublicContent } from './usePublicContent';

/**
 * /contact — support details, the registered business details and the Grievance Officer, all from
 * Settings. Razorpay checks for this page; Indian e-commerce and IT rules ask for the grievance
 * contact. A detail the admin has not filled in is simply not shown.
 */
export default function ContactPage() {
  const { status, settings } = usePublicContent();
  const vars = templateVars(settings, window.location.origin);
  const address = (settings?.business?.address ?? '').trim();

  usePageMeta(`Contact us — ${vars.appName}`, `How to reach the ${vars.appName} team for help, refunds, account deletion and grievances.`);

  const loading = status === 'loading';
  const tel = (value: string) => `tel:${value.replace(/[^\d+]/g, '')}`;

  return (
    <>
      <PageHero
        title="Contact us"
        summary={`Questions about a course, a payment, a refund or your account? The ${vars.appName} team is here to help.`}
      />

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
        {loading ? (
          <div aria-busy="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-ink/6" />
            ))}
          </div>
        ) : (
          <section aria-labelledby="support-title">
            <h2 id="support-title" className="sr-only">
              Support
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vars.supportEmail && (
                <ContactCard icon={Mail} title="Email" hint="We reply within 2 working days.">
                  <a href={`mailto:${vars.supportEmail}`} className="break-all text-[15px] font-semibold text-brand-ink hover:underline">
                    {vars.supportEmail}
                  </a>
                </ContactCard>
              )}
              {vars.supportPhone && (
                <ContactCard icon={Phone} title="Phone" hint={vars.supportHours ? `Available ${vars.supportHours}.` : undefined}>
                  <a href={tel(vars.supportPhone)} className="text-[15px] font-semibold text-brand-ink hover:underline">
                    {vars.supportPhone}
                  </a>
                </ContactCard>
              )}
              {vars.supportHours && (
                <ContactCard icon={Clock} title="Support hours">
                  <p className="text-[15px] font-semibold">{vars.supportHours}</p>
                </ContactCard>
              )}
              {address && (
                <ContactCard icon={MapPin} title="Registered address">
                  <address className="whitespace-pre-line text-[15px] font-medium not-italic leading-relaxed">{address}</address>
                </ContactCard>
              )}
              <ContactCard icon={Building2} title="Business">
                <p className="text-[15px] font-semibold">{vars.legalName}</p>
                {vars.legalName !== vars.appName && <p className="text-sm text-muted">Operator of {vars.appName}</p>}
                {vars.gstin && <p className="mt-1 text-sm text-muted">GSTIN: {vars.gstin}</p>}
              </ContactCard>
            </div>
          </section>
        )}

        <section aria-labelledby="grievance-officer" className="rounded-2xl border border-line p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="grievance-officer" className="scroll-mt-24 text-xl font-bold">
                Grievance Officer
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
                For complaints about the service, a purchase, content or how we handle your personal data, under the
                Information Technology Act, 2000, the Consumer Protection (E-Commerce) Rules, 2020 and the Digital Personal
                Data Protection Act, 2023. We acknowledge every complaint within 24 hours and resolve it within 15 days.
              </p>
              <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Name</dt>
                  <dd className="mt-1 text-[15px] font-semibold">{vars.grievanceName || 'Grievance Officer'}</dd>
                </div>
                {vars.grievanceEmail && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Email</dt>
                    <dd className="mt-1">
                      <a href={`mailto:${vars.grievanceEmail}`} className="break-all text-[15px] font-semibold text-brand-ink hover:underline">
                        {vars.grievanceEmail}
                      </a>
                    </dd>
                  </div>
                )}
                {vars.grievancePhone && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Phone</dt>
                    <dd className="mt-1">
                      <a href={tel(vars.grievancePhone)} className="text-[15px] font-semibold text-brand-ink hover:underline">
                        {vars.grievancePhone}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </section>

        <section aria-labelledby="quick-title">
          <h2 id="quick-title" className="text-lg font-bold">
            Looking for something specific?
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <QuickLink
              to={PUBLIC_PATHS.refund}
              icon={Undo2}
              title="Refunds"
              text="Who can get a refund, and how to ask for one."
            />
            <QuickLink
              to={PUBLIC_PATHS.deletion}
              icon={Trash2}
              title="Delete your account"
              text="With the app or without it."
            />
            <QuickLink to={PUBLIC_PATHS.hub} icon={FileText} title="All policies" text="Privacy, terms, delivery and more." />
          </ul>
        </section>
      </div>
    </>
  );
}

function ContactCard({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof Mail;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
        <Icon size={18} aria-hidden="true" />
      </span>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-subtle">{title}</p>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, text }: { to: string; icon: typeof Mail; title: string; text: string }) {
  return (
    <li>
      <Link to={to} className="flex h-full items-start gap-3 rounded-xl border border-line p-4 transition-colors hover:border-brand hover:bg-brand-soft/40">
        <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-ink" />
        <span>
          <span className="block text-[15px] font-semibold">{title}</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-muted">{text}</span>
        </span>
      </Link>
    </li>
  );
}
