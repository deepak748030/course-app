import { Mail, Menu, Phone, X } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { applyAdminTheme, getAdminTheme } from '../theme/adminTheme';
import { LEGAL_DOC_META, PUBLIC_PATHS, templateVars } from '../lib/legal';
import { DocumentSkeleton } from './PublicPieces';
import { usePublicContent } from './usePublicContent';

/**
 * Frame of the public website: the pages Google Play, Razorpay and learners open without signing in
 * (privacy policy, terms, refunds, delivery, account deletion, about, contact, pricing).
 *
 * It always uses the academy's green look, whatever theme an admin picked for the dashboard on this
 * computer, and scrolls like a normal web page (the admin shell scrolls inside its own panel).
 */
const NAV = [
  { to: PUBLIC_PATHS.pricing, label: 'Courses' },
  { to: PUBLIC_PATHS.about, label: 'About' },
  { to: PUBLIC_PATHS.hub, label: 'Policies' },
  { to: PUBLIC_PATHS.contact, label: 'Contact' },
];

const POLICY_LINKS = [
  { to: PUBLIC_PATHS.privacy, label: LEGAL_DOC_META.privacy.label },
  { to: PUBLIC_PATHS.terms, label: LEGAL_DOC_META.terms.label },
  { to: PUBLIC_PATHS.refund, label: 'Refund and Cancellation' },
  { to: PUBLIC_PATHS.delivery, label: 'Shipping and Delivery' },
  { to: PUBLIC_PATHS.deletion, label: 'Delete your account' },
];

const COMPANY_LINKS = [
  { to: PUBLIC_PATHS.about, label: 'About us' },
  { to: PUBLIC_PATHS.pricing, label: 'Courses and pricing' },
  { to: PUBLIC_PATHS.contact, label: 'Contact us' },
  { to: PUBLIC_PATHS.hub, label: 'All policies' },
];

export default function PublicLayout() {
  const { settings } = usePublicContent();
  const vars = templateVars(settings);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // The public site is always green; the admin's own theme comes back when they return to the dashboard.
  useEffect(() => {
    applyAdminTheme('green');
    return () => applyAdminTheme(getAdminTheme());
  }, []);

  // New page → top of the page (or the section in the #hash), and the mobile menu closes.
  useEffect(() => {
    setMenuOpen(false);
    if (!location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-full flex-col bg-surface text-ink">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-on-brand focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      {/* ---------- header ---------- */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur print:static print:border-0">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to={PUBLIC_PATHS.about} className="flex min-w-0 items-center gap-2.5" aria-label={`${vars.appName} home`}>
            <img src="/brand-mark.png" alt="" width={36} height={36} className="h-9 w-9 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-[16px] font-bold leading-tight">{vars.appName}</span>
              <span className="block truncate text-[11px] font-semibold uppercase tracking-wider text-brand-ink">
                Dairy learning app
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex print:hidden">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-ink/5 hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="public-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink md:hidden print:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <nav id="public-menu" aria-label="Menu" className="border-t border-line-soft bg-surface px-4 pb-4 pt-2 md:hidden">
            <ul className="space-y-0.5">
              {[...NAV, ...POLICY_LINKS].map((item) => (
                <li key={item.to + item.label}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex min-h-11 items-center rounded-lg px-3 text-[15px] font-semibold ${
                        isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink hover:bg-ink/5'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Suspense fallback={<DocumentSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      {/* ---------- footer ---------- */}
      <footer className="mt-16 bg-brand text-white print:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                <img src="/brand-mark.png" alt="" width={30} height={30} className="h-[30px] w-[30px]" />
              </span>
              <span className="text-lg font-bold">{vars.appName}</span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/80">
              {settings?.tagline?.trim() || 'Learn the dairy trade, one batch at a time.'} Practical video courses on milk
              handling, paneer, ghee, curd, cheese, animal care and the dairy business.
            </p>
            <ul className="space-y-2 text-sm">
              {vars.supportEmail && (
                <li>
                  <a href={`mailto:${vars.supportEmail}`} className="inline-flex items-center gap-2 text-white/90 hover:text-white hover:underline">
                    <Mail size={15} aria-hidden="true" />
                    {vars.supportEmail}
                  </a>
                </li>
              )}
              {vars.supportPhone && (
                <li>
                  <a href={`tel:${vars.supportPhone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 text-white/90 hover:text-white hover:underline">
                    <Phone size={15} aria-hidden="true" />
                    {vars.supportPhone}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <FooterColumn title="Policies" links={POLICY_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
        </div>
        <div className="border-t border-white/15">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              © {year} {vars.legalName}. All rights reserved.
            </p>
            {vars.address && <p className="sm:text-right">{vars.address}</p>}
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/60">{title}</p>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.to + link.label}>
            <Link to={link.to} className="text-sm text-white/90 hover:text-white hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
