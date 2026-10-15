import { AlertTriangle, CheckCircle2, Copy, Loader2, Mail, Smartphone, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, publicApi } from '../api/client';
import { PUBLIC_PATHS, fillDoc, resolveDoc, templateVars } from '../lib/legal';
import { DocumentBody, DocumentSkeleton, PageHero } from './PublicPieces';
import { usePageMeta, usePublicContent } from './usePublicContent';

/**
 * /delete-account — the "Delete account URL" for Google Play's Data safety form.
 *
 * Google asks that this page names the app, puts the way to request deletion up front, and works for
 * someone who has uninstalled the app. So: the request form comes first, the in-app path sits next to
 * it, and the full explanation (what is deleted, what is kept and for how long) follows.
 */

const REASONS = [
  'I no longer use the app',
  'I have privacy concerns',
  'I made another account',
  'I get too many notifications',
  'Something else',
];

/** Same rules as the server: +91 98765 43210, 919876543210 and 09876543210 all mean 9876543210. */
function normalizeIndianPhone(input: string) {
  let digits = input.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}
const isIndianMobile = (digits: string) => /^[6-9]\d{9}$/.test(digits);

type Receipt = { reference: string; duplicate: boolean; phone: string };

export default function DeleteAccountPage() {
  const { status, settings, defaults } = usePublicContent();
  const vars = templateVars(settings, window.location.origin);
  const { doc, updatedAt } = resolveDoc('deletion', settings, defaults);
  const filled = fillDoc(doc, vars);

  usePageMeta(`Delete your account — ${vars.appName}`, filled.summary);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [company, setCompany] = useState(''); // honeypot
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copied, setCopied] = useState(false);

  const digits = normalizeIndianPhone(phone);
  const phoneError = !digits
    ? 'Enter the mobile number you sign in with.'
    : !isIndianMobile(digits)
      ? 'Enter a 10-digit Indian mobile number (starting with 6, 7, 8 or 9).'
      : null;
  const confirmError = confirmed ? null : 'Tick the box to confirm you understand the deletion is permanent.';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    setError(null);
    if (phoneError || confirmError) return;
    setSending(true);
    try {
      const result = await publicApi.requestDeletion({
        phone: digits,
        name: name.trim(),
        reason,
        details: details.trim(),
        confirm: true,
        company,
      });
      setReceipt({ reference: result.reference, duplicate: Boolean(result.duplicate), phone: digits });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError('Too many requests from this network. Please try again in an hour, or email us instead.');
      } else if (e instanceof ApiError && e.status === 400) {
        const fieldErrors = (e.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors ?? {};
        setError(Object.values(fieldErrors).flat()[0] || 'Please check the form and try again.');
      } else if (e instanceof ApiError && e.status === 0) {
        setError('We could not reach our server. Check your internet connection and try again, or email us instead.');
      } else {
        setError('Your request could not be sent right now. Please try again in a few minutes, or email us instead.');
      }
    } finally {
      setSending(false);
    }
  }

  // Non-breaking space: "+91" never wraps away from the number.
  const masked = receipt ? `+91\u00A0${'X'.repeat(6)}${receipt.phone.slice(-4)}` : '';

  return (
    <>
      <PageHero
        crumb={{ to: PUBLIC_PATHS.hub, label: 'Policies' }}
        title={filled.heading || `Delete your ${vars.appName} account`}
        summary={filled.summary}
        updatedAt={updatedAt}
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* ---------- the request form ---------- */}
        <section aria-labelledby="request-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
          {receipt ? (
            <div role="status" aria-live="polite">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                  <CheckCircle2 size={22} aria-hidden="true" />
                </span>
                <div>
                  <h2 id="request-title" className="text-xl font-bold">
                    {receipt.duplicate ? 'Your request is already with us' : 'Request received'}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {receipt.duplicate
                      ? `There is already an open deletion request for ${masked}. You do not need to send another one.`
                      : `We have received your request to delete the ${vars.appName} account for ${masked}.`}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-canvas p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Your reference number</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="text-2xl font-bold tracking-wider text-ink">{receipt.reference}</code>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(receipt.reference).then(() => {
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 2000);
                      });
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-muted hover:bg-ink/5 hover:text-ink"
                  >
                    <Copy size={14} aria-hidden="true" />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted">Keep it in case you contact us about this request.</p>
              </div>

              <h3 className="mt-6 text-[15px] font-semibold">What happens next</h3>
              <ol className="mt-3 space-y-3">
                {[
                  'We may call or message this number to confirm that the request came from you.',
                  'Once confirmed, we delete the account and the data linked to it within 7 working days.',
                  'Payment records that tax law requires us to keep are retained without your profile, as explained below.',
                ].map((step, i) => (
                  <li key={step} className="flex gap-3 text-sm leading-relaxed text-ink/90">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-ink">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="relative">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-error-soft text-error">
                  <Trash2 size={20} aria-hidden="true" />
                </span>
                <div>
                  <h2 id="request-title" className="text-xl font-bold">
                    Request account deletion
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    No need to install the app again. Use the mobile number registered on your {vars.appName} account.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label htmlFor="del-phone" className="mb-1.5 block text-[13px] font-semibold">
                    Registered mobile number <span className="text-error">*</span>
                  </label>
                  <div
                    className={`flex h-12 overflow-hidden rounded-lg border bg-surface focus-within:ring-2 focus-within:ring-brand-soft ${
                      touched && phoneError ? 'border-error' : 'border-line focus-within:border-brand'
                    }`}
                  >
                    <span className="flex items-center border-r border-line bg-canvas px-3 text-[15px] font-semibold text-muted">+91</span>
                    <input
                      id="del-phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={16}
                      aria-invalid={Boolean(touched && phoneError)}
                      aria-describedby="del-phone-help"
                      className="min-w-0 flex-1 bg-transparent px-3 text-[16px] text-ink placeholder:text-subtle focus:outline-none"
                    />
                  </div>
                  <p id="del-phone-help" className={`mt-1 text-xs ${touched && phoneError ? 'font-medium text-error' : 'text-subtle'}`}>
                    {touched && phoneError ? phoneError : 'The number you use to sign in with a one-time code.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="del-name" className="mb-1.5 block text-[13px] font-semibold">
                      Your name <span className="font-normal text-subtle">(optional)</span>
                    </label>
                    <input
                      id="del-name"
                      name="name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={80}
                      className="h-12 w-full rounded-lg border border-line bg-surface px-3 text-[16px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
                    />
                  </div>
                  <div>
                    <label htmlFor="del-reason" className="mb-1.5 block text-[13px] font-semibold">
                      Reason <span className="font-normal text-subtle">(optional)</span>
                    </label>
                    <select
                      id="del-reason"
                      name="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="h-12 w-full rounded-lg border border-line bg-surface px-3 text-[16px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
                    >
                      <option value="">Choose a reason</option>
                      {REASONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="del-details" className="mb-1.5 block text-[13px] font-semibold">
                    Anything else we should know? <span className="font-normal text-subtle">(optional)</span>
                  </label>
                  <textarea
                    id="del-details"
                    name="details"
                    rows={3}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    maxLength={1000}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-[16px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
                  />
                </div>

                {/* Honeypot: hidden from people and screen readers, so only bots fill it in. */}
                <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                  <label htmlFor="del-company">Company</label>
                  <input id="del-company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>

                <div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 hover:bg-canvas">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[#b42318]"
                      aria-invalid={Boolean(touched && confirmError)}
                    />
                    <span className="text-sm leading-relaxed text-ink/90">
                      I understand that deleting my account is <strong>permanent</strong>: I will lose access to the courses I
                      bought, and my progress cannot be recovered.
                    </span>
                  </label>
                  {touched && confirmError && <p className="mt-1 text-xs font-medium text-error">{confirmError}</p>}
                </div>

                {error && (
                  <div role="alert" className="flex items-start gap-2.5 rounded-lg bg-error-soft p-3 text-sm text-error">
                    <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-error px-5 text-[15px] font-semibold text-white transition-colors hover:bg-error/90 disabled:opacity-60 sm:w-auto"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Trash2 size={18} aria-hidden="true" />}
                  {sending ? 'Sending your request…' : 'Request account deletion'}
                </button>
                <p className="text-xs leading-relaxed text-subtle">
                  We use these details only to find and delete your account. See our{' '}
                  <Link to={PUBLIC_PATHS.privacy} className="font-semibold text-brand-ink underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </form>
          )}
        </section>

        {/* ---------- the other ways ---------- */}
        <div className="space-y-6">
          <section aria-labelledby="in-app-title" className="rounded-2xl bg-brand-soft p-5 sm:p-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-brand-ink">
              <Smartphone size={20} aria-hidden="true" />
            </span>
            <h2 id="in-app-title" className="mt-4 text-lg font-bold text-brand-ink">
              Still have the app? Delete it there
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">It is instant — no waiting for us.</p>
            <ol className="mt-4 space-y-2.5">
              {[`Open ${vars.appName} and sign in`, 'Go to Profile → Settings', 'Tap Delete account and confirm'].map((step, i) => (
                <li key={step} className="flex items-center gap-3 text-sm font-medium text-ink">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-brand-ink">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          {vars.supportEmail && (
            <section aria-labelledby="email-title" className="rounded-2xl border border-line p-5 sm:p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-muted">
                <Mail size={20} aria-hidden="true" />
              </span>
              <h2 id="email-title" className="mt-4 text-lg font-bold">
                Prefer email?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Write to us with the subject “Delete my account” and your registered mobile number.
              </p>
              <a
                href={`mailto:${vars.supportEmail}?subject=${encodeURIComponent('Delete my account')}&body=${encodeURIComponent(
                  'Please delete my account.\n\nRegistered mobile number: '
                )}`}
                className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-brand-ink hover:underline"
              >
                <Mail size={16} aria-hidden="true" />
                {vars.supportEmail}
              </a>
            </section>
          )}
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight">How account deletion works</h2>
        <p className="mt-1 text-sm text-muted">What we delete, what we have to keep, and for how long.</p>
      </div>
      {status === 'loading' ? <DocumentSkeleton /> : <DocumentBody doc={filled} />}
    </>
  );
}
