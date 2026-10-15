import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Copy,
  Download,
  ExternalLink,
  Globe,
  RotateCcw,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { AppSettings, ContentDefaults, LegalDocKey, ServerSetupStatus } from '../api/types';
import { Badge, Button, Card, CardHeader, FormSkeleton, useToast } from '../components/ui';
import { PUBLIC_PATHS, contentDefaultsOrBuiltIn, publicBaseUrl, resolveDoc, slugify } from '../lib/legal';

/**
 * Everything the academy needs to fill in Google Play Console (and Razorpay's website check), in one
 * place: the public page links to paste, a checklist of details still missing, and suggested answers
 * for the App content forms — all worked out from what the app and server actually do.
 */

/** Sample values the server starts with; they must be replaced before going live. */
const SAMPLE_EMAIL = 'support@ydu.academy';
const SAMPLE_PHONE = '+91 98765 43210';

type LinkRow = { label: string; path: string; where: string; doc?: LegalDocKey; required?: boolean };

const LINKS: LinkRow[] = [
  {
    label: 'Privacy policy',
    path: PUBLIC_PATHS.privacy,
    doc: 'privacy',
    required: true,
    where: 'Play Console → Policy and programs → App content → Privacy policy. Also Store listing → Privacy policy.',
  },
  {
    label: 'Delete account',
    path: PUBLIC_PATHS.deletion,
    doc: 'deletion',
    required: true,
    where: 'App content → Data safety → Data deletion → “Delete account URL”.',
  },
  {
    label: 'Website',
    path: PUBLIC_PATHS.about,
    doc: 'about',
    where: 'Grow users → Store presence → Store settings → Store listing contact details → Website.',
  },
  { label: 'Terms and conditions', path: PUBLIC_PATHS.terms, doc: 'terms', where: 'Razorpay website review; linked from the app.' },
  { label: 'Refund and cancellation', path: PUBLIC_PATHS.refund, doc: 'refund', where: 'Razorpay website review; linked from the app.' },
  { label: 'Shipping and delivery', path: PUBLIC_PATHS.delivery, doc: 'delivery', where: 'Razorpay website review (digital delivery).' },
  { label: 'Contact us', path: PUBLIC_PATHS.contact, where: 'Razorpay website review; grievance contact.' },
  { label: 'Courses and pricing', path: PUBLIC_PATHS.pricing, where: 'Razorpay website review (products and prices).' },
  { label: 'All policies', path: PUBLIC_PATHS.hub, where: 'One link to share with anyone who asks.' },
];

/** Play Console → Data safety, worked out from the code (see server/src/data/defaultContent.js → privacy). */
const DATA_TYPES: { category: string; type: string; required: boolean; purposes: string; note: string }[] = [
  { category: 'Personal info', type: 'Phone number', required: true, purposes: 'Account management, App functionality, Fraud prevention & security', note: 'Sign-in with a one-time SMS code.' },
  { category: 'Personal info', type: 'Name', required: false, purposes: 'Account management, App functionality', note: 'Profile; shown with reviews.' },
  { category: 'Personal info', type: 'Email address', required: false, purposes: 'Account management, App functionality', note: 'Optional profile field; pre-fills Razorpay checkout.' },
  { category: 'Personal info', type: 'User IDs', required: true, purposes: 'Account management, Analytics', note: 'The account ID linked to orders, progress and usage events.' },
  { category: 'Location', type: 'Approximate location', required: false, purposes: 'Account management', note: 'Only the city the learner types in Profile. No GPS.' },
  { category: 'Financial info', type: 'Purchase history', required: false, purposes: 'App functionality, Account management', note: 'Courses bought, amounts, coupons, Razorpay references.' },
  { category: 'Financial info', type: 'User payment info', required: false, purposes: 'App functionality', note: 'Entered in Razorpay’s checkout (an SDK in the app); never reaches your server.' },
  { category: 'Photos and videos', type: 'Photos', required: false, purposes: 'Account management, App functionality', note: 'Optional profile photo from the gallery.' },
  { category: 'App activity', type: 'App interactions', required: true, purposes: 'Analytics, App functionality', note: 'App opens, course views, lessons started/finished, checkout started.' },
  { category: 'App activity', type: 'In-app search history', required: true, purposes: 'Analytics', note: 'Search words, to improve the catalog.' },
  { category: 'App activity', type: 'Other user-generated content', required: false, purposes: 'App functionality', note: 'Course ratings and reviews.' },
  { category: 'Device or other IDs', type: 'Device or other IDs', required: false, purposes: 'App functionality', note: 'Push notification token (Expo / Firebase Cloud Messaging).' },
];

const NOT_COLLECTED =
  'Precise location, contacts, messages (SMS/email), audio, files and documents, calendar, health and fitness, web browsing history, crash logs and diagnostics, other device data.';

/** Listing graphics that ship with the dashboard (public/play-store), ready for Play Console. */
const GRAPHICS_BASE = `${import.meta.env.BASE_URL}play-store/`;
const SCREENSHOTS: { file: string; label: string }[] = [
  { file: 'phone-1-welcome.jpg', label: 'Welcome' },
  { file: 'phone-2-good-milk.jpg', label: 'Good milk' },
  { file: 'phone-3-home.jpg', label: 'Home' },
  { file: 'phone-4-explore.jpg', label: 'Explore' },
  { file: 'phone-5-course.jpg', label: 'Course' },
  { file: 'phone-6-curriculum.jpg', label: 'Curriculum' },
  { file: 'phone-7-progress.jpg', label: 'Progress' },
  { file: 'phone-8-testing.jpg', label: 'Milk testing' },
];

function storeListing(appName: string) {
  const short = 'Learn dairy skills: milk, paneer, ghee, curd & cheese in easy video courses.';
  const full = `${appName} teaches the dairy trade through short, practical video courses — from receiving and testing milk to making paneer, ghee, curd and cheese, caring for animals and selling what you make.

WHAT YOU CAN LEARN
• Milk handling: reception, testing, hygiene and storage
• Paneer and chhana, ghee and butter, curd and fermented products
• Cheese making and frozen dairy desserts
• Farm and animal care for a healthy, productive herd
• The dairy business: pricing, compliance basics and selling

HOW IT WORKS
• Watch free preview lessons before you buy
• Buy a course once and pay securely with UPI, card, net banking or wallet (Razorpay)
• Step-by-step video lessons with batch sheets: quantities, timings and tips
• Your progress is saved to your account, so you can continue on any phone
• Lesson notes and saved courses for quick revision
• Use the app in English or Hindi

MADE FOR
Dairy farmers, milk collection and processing staff, home and small-scale producers, students and anyone planning a dairy business.

YOUR PRIVACY
Sign in with your mobile number. No ads, and we never sell your data. Delete your account at any time from the app or our website.

Lessons are for education only and are not food-safety, veterinary or licensing advice.`;
  return { title: `${appName}: Dairy Courses`.slice(0, 30), short, full };
}

/** One line of the "Before you submit" checklist. */
type Check = { ok: boolean; optional?: boolean; title: string; detail: string; fix?: React.ReactNode };

export default function PlayStore() {
  const toast = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [defaults, setDefaults] = useState<ContentDefaults | null>(null);
  const [server, setServer] = useState<ServerSetupStatus | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingSite, setSavingSite] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api
      .getSettingsWithDefaults()
      .then(({ settings: s, contentDefaults, server: setup }) => {
        setSettings(s ?? ({} as AppSettings));
        setDefaults(contentDefaultsOrBuiltIn(contentDefaults));
        setServer(setup ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load settings'));
    api
      .listDeletionRequests('pending')
      .then((res) => setPending(res.counts.pending))
      .catch(() => setPending(null));
  }, []);

  useEffect(load, [load]);

  const copy = (value: string, what = 'Copied') => {
    void navigator.clipboard
      ?.writeText(value)
      .then(() => toast('success', what))
      .catch(() => toast('error', 'Could not copy. Select the text and copy it instead.'));
  };

  if (error) {
    return (
      <Card>
        <div className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm font-semibold text-error">Could not load this page</p>
          <p className="text-[13px] text-muted">{error}</p>
          <Button variant="outline" icon={RotateCcw} onClick={load}>
            Try again
          </Button>
        </div>
      </Card>
    );
  }
  if (!settings || !defaults) return <FormSkeleton sections={3} fieldsPerSection={3} />;

  const base = publicBaseUrl(settings);
  const websiteSaved = Boolean(settings.business?.websiteUrl);
  const business = settings.business ?? {};
  const listing = storeListing(settings.appName || 'YDU Academy');

  async function useThisAddress() {
    setSavingSite(true);
    try {
      const updated = await api.updateSettings({ business: { websiteUrl: window.location.origin } });
      setSettings(updated);
      toast('success', 'Website address saved — the app and the policies now link here');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSavingSite(false);
    }
  }

  // Launch blockers only the API server can report (its environment variables, never the keys).
  // They are fixed where the server is hosted, not in Settings.
  const onServer = <Badge tone="neutral">API server env</Badge>;
  const serverChecks: Check[] = server
    ? [
        {
          ok: server.sms.configured,
          title: 'Sign-in SMS',
          fix: !server.sms.configured && onServer,
          detail: server.sms.configured
            ? `Sign-in codes go out through ${server.sms.label}.`
            : server.sms.provider
              ? `SMS_PROVIDER=${server.sms.provider} on the API server is missing ${server.sms.missing.join(', ')}.`
              : 'No SMS provider on the API server, so learners cannot sign in (only the Play review number can). Set SMS_PROVIDER and its keys — MSG91, 2Factor or Fast2SMS (server README → Phone sign-in).',
        },
        {
          ok: server.reviewLogin,
          title: 'Reviewer sign-in',
          fix: !server.reviewLogin && onServer,
          detail: server.reviewLogin
            ? 'PLAY_REVIEW_PHONE and PLAY_REVIEW_OTP are set on the API server.'
            : 'Not set on the API server, so Google’s reviewers cannot get past the sign-in screen. See “App access” below.',
        },
        {
          ok: server.payments,
          title: 'Payments',
          fix: !server.payments && onServer,
          detail: server.payments
            ? 'Razorpay keys are set on the API server.'
            : 'Razorpay keys are not set on the API server, so no course can be bought (server README → Payments).',
        },
      ]
    : [];

  const businessChecks: Check[] = [
    {
      ok: websiteSaved,
      title: 'Website address',
      detail: websiteSaved
        ? `Saved: ${business.websiteUrl}`
        : `Not saved. The app’s privacy policy uses it for the “delete your account on the web” link.`,
      fix: !websiteSaved && (
        <Button size="sm" variant="outline" icon={Globe} loading={savingSite} onClick={useThisAddress}>
          Use {window.location.host}
        </Button>
      ),
    },
    {
      ok: Boolean(settings.supportEmail) && settings.supportEmail !== SAMPLE_EMAIL,
      title: 'Support email',
      detail:
        settings.supportEmail === SAMPLE_EMAIL
          ? `Still the sample address (${SAMPLE_EMAIL}). Use an inbox you read — it is on every policy.`
          : settings.supportEmail || 'Missing.',
    },
    {
      ok: Boolean(settings.supportPhone) && settings.supportPhone !== SAMPLE_PHONE,
      title: 'Support phone',
      detail:
        settings.supportPhone === SAMPLE_PHONE ? `Still the sample number (${SAMPLE_PHONE}).` : settings.supportPhone || 'Missing.',
    },
    {
      ok: Boolean(business.address),
      title: 'Registered address',
      detail: business.address ? 'Shown on the Contact page and in the policies.' : 'Razorpay and the e-commerce rules expect it on the Contact page.',
    },
    {
      ok: Boolean(business.grievanceName),
      title: 'Grievance Officer',
      detail: business.grievanceName
        ? business.grievanceName
        : 'A named Grievance Officer is required by the IT Rules and the DPDP Act. Until then the pages say “Grievance Officer”.',
    },
    {
      ok: Boolean(business.legalName),
      optional: true,
      title: 'Business / legal name',
      detail: business.legalName || `Optional — the pages use “${settings.appName || 'YDU Academy'}” until you add the registered name.`,
    },
    {
      ok: Boolean(business.jurisdiction),
      optional: true,
      title: 'Courts for disputes',
      detail: business.jurisdiction || 'Optional — the city whose courts handle disputes (Terms → Governing law).',
    },
    {
      ok: pending === 0,
      title: 'Deletion requests',
      detail: pending === null ? 'Could not check.' : pending === 0 ? 'Nothing waiting.' : `${pending} request(s) waiting. The page promises 7 working days.`,
      fix: pending ? (
        <Link to="/deletion-requests" className="text-[13px] font-semibold text-brand-ink hover:underline">
          Open requests
        </Link>
      ) : undefined,
    },
  ];
  const checks = [...serverChecks, ...businessChecks];
  const missing = checks.filter((check) => !check.ok && !check.optional).length;

  return (
    <div className="max-w-5xl space-y-4">
      {/* ---------- intro ---------- */}
      <Card>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
              <Store size={20} />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold">Your public pages are live</h2>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                Anyone can open them without signing in — Google’s reviewers, Razorpay and your learners. They show the text
                from <Link to="/content" className="font-semibold text-brand-ink hover:underline">Content</Link> and the details
                from <Link to="/settings" className="font-semibold text-brand-ink hover:underline">Settings</Link>.
              </p>
              <p className="mt-2 break-all text-[13px] font-semibold text-ink">{base}</p>
            </div>
          </div>
          <a
            href={PUBLIC_PATHS.hub}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-pressed"
          >
            Open the website <ExternalLink size={15} />
          </a>
        </div>
      </Card>

      {/* ---------- links ---------- */}
      <Card>
        <CardHeader title="Links to paste" subtitle="Copy each link into the place shown under it." />
        <ul className="divide-y divide-line-soft">
          {LINKS.map((row) => {
            const url = `${base}${row.path}`;
            const custom = row.doc ? resolveDoc(row.doc, settings, defaults).custom : null;
            return (
              <li key={row.path} className="flex flex-col gap-2 px-5 py-3.5 md:flex-row md:items-center md:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold">{row.label}</p>
                    {row.required && <Badge tone="error">Required by Play</Badge>}
                    {custom !== null && <Badge tone={custom ? 'brand' : 'neutral'}>{custom ? 'Your text' : 'Built-in text'}</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-subtle">{row.where}</p>
                </div>
                <div className="flex min-w-0 items-center gap-1 md:w-[420px]">
                  <code className="min-w-0 flex-1 truncate rounded-md bg-canvas px-2 py-1.5 text-[12px] text-ink" title={url}>
                    {url}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(url, `${row.label} link copied`)}
                    aria-label={`Copy ${row.label} link`}
                    title="Copy"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-subtle hover:bg-ink/5 hover:text-ink"
                  >
                    <Copy size={15} />
                  </button>
                  <a
                    href={row.path}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${row.label}`}
                    title="Open"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-subtle hover:bg-ink/5 hover:text-ink"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ---------- checklist ---------- */}
      <Card>
        <CardHeader
          title="Before you submit"
          subtitle="Server items are environment variables on the API server; the rest are filled in Settings → Business and legal details."
          action={missing === 0 ? <Badge tone="success">All set</Badge> : <Badge tone="error">{missing} to fix</Badge>}
        />
        <ul className="divide-y divide-line-soft">
          {checks.map((check) => (
            <li key={check.title} className="flex items-start gap-3 px-5 py-3">
              {check.ok ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
              ) : check.optional ? (
                <CircleDashed size={18} className="mt-0.5 shrink-0 text-subtle" />
              ) : (
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-error" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">{check.title}</p>
                <p className="mt-0.5 break-words text-xs leading-relaxed text-muted">{check.detail}</p>
              </div>
              <div className="shrink-0">
                {check.fix ||
                  (!check.ok && (
                    <Link to="/settings" className="text-[13px] font-semibold text-brand-ink hover:underline">
                      Fix in Settings
                    </Link>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* ---------- app access ---------- */}
      <Card>
        <CardHeader title="App access (reviewer sign-in)" subtitle="App content → App access → “All or some functionality is restricted”" />
        <div className="space-y-3 p-5 text-[13px] leading-relaxed text-muted">
          <p>
            The app opens only after phone sign-in, so Google’s reviewers need a number and code that work without an SMS. Set
            two variables on the API server and redeploy:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-canvas p-3 text-[12px] text-ink">{`PLAY_REVIEW_PHONE=9XXXXXXXXX   # a number that is nobody's real account
PLAY_REVIEW_OTP=123456         # any 6 digits`}</pre>
          <p>Then paste these instructions into Play Console (with your number and code):</p>
          <InstructionBox
            onCopy={copy}
            text={`1. Open the app and tap through the welcome screens.\n2. Enter the mobile number 9XXXXXXXXX and tap Continue.\n3. Enter the code 123456 (no SMS is sent for this number).\n4. You are signed in as a learner. Free preview lessons can be played; buying a course opens Razorpay checkout.`}
          />
          <p>
            Paid lessons stay locked for this account (checkout needs a real payment). Open a free preview on at least one
            course — Courses → edit a course → a lesson’s preview length — so reviewers can watch a lesson.
          </p>
        </div>
      </Card>

      {/* ---------- data safety ---------- */}
      <Card>
        <CardHeader title="Data safety — suggested answers" subtitle="App content → Data safety. Worked out from what the app and server store." />
        <div className="space-y-4 p-5">
          <dl className="grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
            {[
              ['Does your app collect or share user data?', 'Yes — collects. Not shared: Razorpay, SMS, push, image and hosting companies are service providers, which Play does not count as sharing.'],
              ['Is all data encrypted in transit?', 'Yes — the app talks to the API over HTTPS (keep the production API URL on https://).'],
              ['Account creation method', 'Phone number with a one-time code (choose “Other” if no option fits, and describe it).'],
              ['Delete account URL', `${base}${PUBLIC_PATHS.deletion}`],
              [
                'Can users delete some data without deleting the account?',
                `Yes — profile fields and photo in the app, anything else by email: ${base}${PUBLIC_PATHS.deletion}#${slugify('Delete some data and keep your account')}`,
              ],
              ['Independent security review', 'No (unless you commission one).'],
            ].map(([q, a]) => (
              <div key={q} className="rounded-lg border border-line-soft p-3">
                <dt className="font-semibold text-ink">{q}</dt>
                <dd className="mt-1 break-words text-muted">{a}</dd>
              </div>
            ))}
          </dl>
          <div className="overflow-x-auto rounded-lg border border-line-soft">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="bg-canvas text-xs uppercase tracking-wide text-subtle">
                <tr>
                  <th className="px-3 py-2 font-semibold">Data type</th>
                  <th className="px-3 py-2 font-semibold">Collection</th>
                  <th className="px-3 py-2 font-semibold">Purposes</th>
                  <th className="px-3 py-2 font-semibold">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {DATA_TYPES.map((row) => (
                  <tr key={row.type} className="align-top">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-ink">{row.type}</p>
                      <p className="text-xs text-subtle">{row.category}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={row.required ? 'brand' : 'neutral'}>{row.required ? 'Required' : 'Optional'}</Badge>
                    </td>
                    <td className="px-3 py-2 text-muted">{row.purposes}</td>
                    <td className="px-3 py-2 text-muted">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            <span className="font-semibold text-ink">Not collected:</span> {NOT_COLLECTED} For every type above: not shared, not
            processed ephemerally (except payment info, which only Razorpay handles), and users can ask for deletion.
          </p>
        </div>
      </Card>

      {/* ---------- other declarations ---------- */}
      <Card>
        <CardHeader title="Other App content answers" />
        <dl className="grid grid-cols-1 gap-3 p-5 text-[13px] sm:grid-cols-2">
          {[
            ['Ads', 'No, the app does not contain ads.'],
            ['Advertising ID', 'No. The app does not use it (the build blocks the AD_ID permission).'],
            ['Target audience', '18 and over. The courses teach a trade and involve payments; the policies say the app is for adults.'],
            ['Content rating (IARC)', 'Category: Education/Reference. No violence, sexual content, profanity, drugs or gambling. Users can share content: yes — public course reviews. Digital purchases: yes.'],
            ['News, government, financial features, health', 'None of these apply. Selling courses is not a “financial feature”.'],
            ['Photo and video permissions', 'No declaration needed: the profile photo uses Android’s photo picker, and camera and microphone are blocked in the build.'],
            ['App category', 'Education. Tags: Online courses, Skill development, Vocational training.'],
            ['Contact details', `Email: ${settings.supportEmail || '—'} · Phone: ${settings.supportPhone || '—'} · Website: ${base}${PUBLIC_PATHS.about}`],
            ['App bundle to upload', 'Play takes an Android App Bundle (.aab), not the APK testers install. Build it with: cd app && bunx eas-cli build -p android --profile playstore. Every later upload needs a higher versionCode in app.json.'],
          ].map(([q, a]) => (
            <div key={q} className="rounded-lg border border-line-soft p-3">
              <dt className="flex items-center gap-1.5 font-semibold text-ink">
                <ShieldCheck size={14} className="text-brand-ink" /> {q}
              </dt>
              <dd className="mt-1 break-words text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* ---------- store listing ---------- */}
      <Card>
        <CardHeader title="Store listing — draft text" subtitle="Grow users → Store presence → Main store listing. Edit to taste." />
        <div className="space-y-4 p-5">
          <ListingField label="App name" limit={30} value={listing.title} onCopy={copy} />
          <ListingField label="Short description" limit={80} value={listing.short} onCopy={copy} />
          <ListingField label="Full description" limit={4000} value={listing.full} onCopy={copy} multiline />
        </div>
      </Card>

      {/* ---------- store graphics ---------- */}
      <Card>
        <CardHeader
          title="Store listing — graphics"
          subtitle="Main store listing → Graphics. Made from the app and its logo; download and upload them as they are."
        />
        <div className="space-y-6 p-5">
          <div className="grid gap-6 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
            <GraphicTile
              src={`${GRAPHICS_BASE}icon-512.png`}
              title="App icon"
              spec="512 × 512 PNG. Play rounds the corners itself."
              imageClassName="h-24 w-24 rounded-[22%]"
            />
            <GraphicTile
              src={`${GRAPHICS_BASE}feature-graphic-1024x500.png`}
              title="Feature graphic"
              spec="1024 × 500 PNG, no transparency."
              imageClassName="aspect-[1024/500] w-full rounded-lg"
              className="max-w-[440px]"
            />
          </div>
          <div>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-[13px] font-semibold">
                Phone screenshots <span className="font-normal text-subtle">· 8 × 1080 × 1920 JPEG · click one to download</span>
              </p>
              <p className="text-xs text-subtle">Play needs 2 to 8. Four or more at 1080 px make the app eligible for recommendations.</p>
            </div>
            <ul className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {SCREENSHOTS.map((shot, i) => (
                <li key={shot.file}>
                  <a href={`${GRAPHICS_BASE}${shot.file}`} download={shot.file} className="group block" title={`Download ${shot.file}`}>
                    <img
                      src={`${GRAPHICS_BASE}thumbs/${shot.file}`}
                      alt={`Screenshot ${i + 1}: ${shot.label}`}
                      width={270}
                      height={480}
                      loading="lazy"
                      className="aspect-[9/16] w-full rounded-lg border border-line-soft object-cover transition-opacity group-hover:opacity-80"
                    />
                    <span className="mt-1.5 flex items-center gap-1 text-[12px] text-muted group-hover:text-ink">
                      <Download size={12} className="shrink-0" />
                      <span className="truncate">
                        {i + 1}. {shot.label}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <p className="rounded-lg bg-canvas px-3 py-2.5 text-xs leading-relaxed text-muted">
            The screenshots come from the app running on the sample catalog, which has no course covers yet, so the courses show
            the logo. Play wants screenshots to show the real app: once your courses have their covers (Courses page), retake the
            course screens on a phone. Screenshots from tall 20:9 phones break Play&apos;s 2:1 limit, so crop them to 9:16 first.
          </p>
        </div>
      </Card>

      <p className="px-1 text-xs leading-relaxed text-subtle">
        The built-in policies follow Indian law (IT Act 2000, DPDP Act 2023, Consumer Protection (E-Commerce) Rules 2020) and
        describe what this app really does. Have them reviewed by your legal adviser, and edit them on the{' '}
        <Link to="/content" className="font-semibold text-brand-ink hover:underline">Content</Link> page. Terms, refund and
        privacy also appear inside the app.
      </p>
    </div>
  );
}

function GraphicTile({
  src,
  title,
  spec,
  imageClassName,
  className = '',
}: {
  src: string;
  title: string;
  spec: string;
  imageClassName: string;
  className?: string;
}) {
  const file = src.slice(src.lastIndexOf('/') + 1);
  return (
    <div className={`flex min-w-0 flex-col gap-3 ${className}`}>
      <img src={src} alt={title} loading="lazy" className={`border border-line-soft object-cover ${imageClassName}`} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{title}</p>
          <p className="text-xs text-subtle">{spec}</p>
        </div>
        <a
          href={src}
          download={file}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-alt md:h-8"
        >
          <Download size={14} /> Download
        </a>
      </div>
    </div>
  );
}

function InstructionBox({ text, onCopy }: { text: string; onCopy: (value: string, what?: string) => void }) {
  return (
    <div className="relative">
      <pre className="whitespace-pre-wrap rounded-lg border border-line-soft p-3 pr-12 font-sans text-[13px] text-ink">{text}</pre>
      <button
        type="button"
        onClick={() => onCopy(text, 'Instructions copied')}
        aria-label="Copy instructions"
        title="Copy"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-subtle hover:bg-ink/5 hover:text-ink"
      >
        <Copy size={14} />
      </button>
    </div>
  );
}

function ListingField({
  label,
  value,
  limit,
  multiline,
  onCopy,
}: {
  label: string;
  value: string;
  limit: number;
  multiline?: boolean;
  onCopy: (value: string, what?: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold">
          {label} <span className="font-normal text-subtle">· {value.length}/{limit}</span>
        </p>
        <Button size="sm" variant="ghost" icon={Copy} onClick={() => onCopy(value, `${label} copied`)}>
          Copy
        </Button>
      </div>
      {multiline ? (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-line-soft bg-canvas p-3 font-sans text-[13px] leading-relaxed text-ink">
          {value}
        </pre>
      ) : (
        <p className="rounded-lg border border-line-soft bg-canvas px-3 py-2 text-[13px] text-ink">{value}</p>
      )}
    </div>
  );
}
