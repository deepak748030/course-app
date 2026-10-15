/**
 * Shared helpers for the policy documents: where each one lives on the public website, how the
 * {{placeholders}} in the text are filled from Settings, and which version (the admin's or the
 * built-in one) is current. Used by the public pages and by the admin's Content / Play Store pages.
 *
 * The app fills placeholders the same way (app/src/services/app-content.ts) — keep the two in step.
 */
import type { AppSettings, ContentDefaults, LegalDocEntry, LegalDocKey } from '../api/types';
import { BUILT_IN_CONTENT } from '../data/builtInContent';

/** Every public route, in one place (App.tsx, the footer, the hub and the Play Store page read these). */
export const PUBLIC_PATHS = {
  hub: '/legal',
  privacy: '/privacy-policy',
  terms: '/terms',
  refund: '/refund-policy',
  delivery: '/shipping-policy',
  deletion: '/delete-account',
  about: '/about',
  contact: '/contact',
  pricing: '/pricing',
} as const;

/** Older or common spellings that should land on the right page instead of the admin login. */
export const PUBLIC_ALIASES: Record<string, string> = {
  '/privacy': PUBLIC_PATHS.privacy,
  '/privacy-policy.html': PUBLIC_PATHS.privacy,
  '/terms-and-conditions': PUBLIC_PATHS.terms,
  '/terms-of-use': PUBLIC_PATHS.terms,
  '/refund': PUBLIC_PATHS.refund,
  '/cancellation-and-refund-policy': PUBLIC_PATHS.refund,
  '/shipping-and-delivery': PUBLIC_PATHS.delivery,
  '/delivery-policy': PUBLIC_PATHS.delivery,
  '/account-deletion': PUBLIC_PATHS.deletion,
  '/data-deletion': PUBLIC_PATHS.deletion,
  '/contact-us': PUBLIC_PATHS.contact,
  '/about-us': PUBLIC_PATHS.about,
  '/policies': PUBLIC_PATHS.hub,
};

export const LEGAL_DOC_ORDER: LegalDocKey[] = ['privacy', 'terms', 'refund', 'delivery', 'deletion', 'about'];

/** Path of each document on the website. */
export const DOC_PATHS: Record<LegalDocKey, string> = {
  privacy: PUBLIC_PATHS.privacy,
  terms: PUBLIC_PATHS.terms,
  refund: PUBLIC_PATHS.refund,
  delivery: PUBLIC_PATHS.delivery,
  deletion: PUBLIC_PATHS.deletion,
  about: PUBLIC_PATHS.about,
};

/** How each document is named and described on the website and in the admin. */
export const LEGAL_DOC_META: Record<LegalDocKey, { label: string; short: string; description: string; inApp: boolean }> = {
  privacy: {
    label: 'Privacy Policy',
    short: 'Privacy',
    description: 'What we collect, why we collect it, who we share it with and your rights.',
    inApp: true,
  },
  terms: {
    label: 'Terms and Conditions',
    short: 'Terms',
    description: 'The rules for using the app and buying courses.',
    inApp: true,
  },
  refund: {
    label: 'Refund and Cancellation Policy',
    short: 'Refunds',
    description: 'When you can cancel or get a refund, and how long it takes.',
    inApp: true,
  },
  delivery: {
    label: 'Shipping and Delivery Policy',
    short: 'Delivery',
    description: 'How and when a course reaches your account after you pay.',
    inApp: false,
  },
  deletion: {
    label: 'Account deletion',
    short: 'Delete account',
    description: 'Delete your account and data — with the app or without it.',
    inApp: false,
  },
  about: {
    label: 'About us',
    short: 'About',
    description: 'Who we are and what we teach.',
    inApp: false,
  },
};

/** Defaults that ship with the server win; the bundled copy covers an unreachable or older server. */
export function contentDefaultsOrBuiltIn(defaults?: ContentDefaults | null): ContentDefaults {
  if (!defaults?.legalDocs) return BUILT_IN_CONTENT;
  return {
    ...BUILT_IN_CONTENT,
    ...defaults,
    legalDocs: { ...BUILT_IN_CONTENT.legalDocs, ...defaults.legalDocs },
  };
}

/** The version of a document readers see now: the admin's own text, or the built-in one. */
export function resolveDoc(
  key: LegalDocKey,
  settings: Partial<AppSettings> | null | undefined,
  defaults: ContentDefaults
): { doc: LegalDocEntry; custom: boolean; updatedAt?: string } {
  const stored = settings?.legalDocs?.[key];
  if (stored && stored.title) return { doc: stored, custom: true, updatedAt: stored.updatedAt };
  const builtIn = defaults.legalDocs[key] ?? BUILT_IN_CONTENT.legalDocs[key];
  return { doc: builtIn, custom: false, updatedAt: builtIn.updatedAt ?? defaults.updatedAt };
}

// ---------------------------------------------------------------- placeholders
export type TemplateVars = Record<string, string>;

/** The placeholders an admin can use in any document, with what each one is filled from. */
export const PLACEHOLDERS: { token: string; from: string }[] = [
  { token: 'appName', from: 'Settings → App name' },
  { token: 'legalName', from: 'Business name (falls back to the app name)' },
  { token: 'supportEmail', from: 'Settings → Support email' },
  { token: 'supportPhone', from: 'Settings → Support phone' },
  { token: 'supportHours', from: 'Business → Support hours' },
  { token: 'address', from: 'Business → Address' },
  { token: 'grievanceName', from: 'Business → Grievance Officer' },
  { token: 'grievanceEmail', from: 'Grievance email (falls back to support email)' },
  { token: 'grievancePhone', from: 'Grievance phone (falls back to support phone)' },
  { token: 'jurisdiction', from: 'Business → Courts at' },
  { token: 'gstin', from: 'Business → GSTIN' },
  { token: 'website', from: 'Business → Website address' },
  { token: 'deleteUrl', from: 'Website address + /delete-account' },
];

/** Values for the placeholders. `origin` stands in for the website address when it is not set. */
export function templateVars(settings: Partial<AppSettings> | null | undefined, origin = ''): TemplateVars {
  const business = settings?.business ?? {};
  const clean = (value?: string | null) => (value ?? '').trim();
  const appName = clean(settings?.appName) || 'YDU Academy';
  const supportEmail = clean(settings?.supportEmail);
  const supportPhone = clean(settings?.supportPhone);
  const website = (clean(business.websiteUrl) || origin).replace(/\/+$/, '');
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
    deleteUrl: website ? `${website}${PUBLIC_PATHS.deletion}` : '',
  };
}

const TOKEN = /\{\{\s*(\w+)\s*\}\}/g;

/** Headings and titles: placeholders are filled; an unknown one is left as typed, so a typo stays visible. */
export function fillText(text: string, vars: TemplateVars): string {
  return text.replace(TOKEN, (match, name: string) => (name in vars ? vars[name] : match));
}

/** A paragraph or bullet: null when it uses a detail that is empty, so the line is left out, not left blank. */
export function fillLine(text: string, vars: TemplateVars): string | null {
  let missing = false;
  const filled = text.replace(TOKEN, (match, name: string) => {
    if (!(name in vars)) return match;
    if (!vars[name]) missing = true;
    return vars[name];
  });
  return missing ? null : filled;
}

/** A whole document with every placeholder filled and the lines without a value dropped. */
export function fillDoc(doc: LegalDocEntry, vars: TemplateVars): LegalDocEntry {
  return {
    ...doc,
    title: fillText(doc.title, vars),
    heading: fillText(doc.heading, vars),
    summary: fillText(doc.summary, vars),
    sections: doc.sections
      .map((section) => ({
        heading: fillText(section.heading, vars),
        body: (section.body ?? []).map((line) => fillLine(line, vars)).filter((line): line is string => line !== null),
        points: (section.points ?? []).map((line) => fillLine(line, vars)).filter((line): line is string => line !== null),
      }))
      .filter((section) => section.heading && (section.body.length > 0 || section.points.length > 0)),
  };
}

/** Anchor id for a section heading: "Deleting your account" → "deleting-your-account". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** 15 October 2026 */
export function formatLongDate(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** The public address of the website: the one set in Settings, or the address this dashboard is open on. */
export function publicBaseUrl(settings?: Partial<AppSettings> | null): string {
  const configured = (settings?.business?.websiteUrl ?? '').trim().replace(/\/+$/, '');
  return configured || window.location.origin;
}
