import { BookOpen, Clock, RotateCcw, Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi, resolveAssetUrl, type PublicCourse } from '../api/client';
import { PUBLIC_PATHS, templateVars } from '../lib/legal';
import { PageHero } from './PublicPieces';
import { usePageMeta, usePublicContent } from './usePublicContent';

const inr = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

/** Same background the learner app paints behind the brand mark when a course has no image. */
const PLACEHOLDER_BG = '#FBF6E3';

/** The course image — or, like the app, the brand mark on cream when there is none or it fails to load. */
function CourseCover({ url }: { url?: string }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      <img
        src={resolveAssetUrl(url)}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-full items-center justify-center" style={{ background: PLACEHOLDER_BG }}>
      <img src="/brand-mark.png" alt="" aria-hidden="true" className="h-1/2 w-auto object-contain" />
    </div>
  );
}

/**
 * /pricing — the published catalog with prices. Payment gateways (Razorpay) check that a merchant's
 * website shows what is sold and at what price; learners like to see it before installing too.
 */
export default function PricingPage() {
  const { settings } = usePublicContent();
  const vars = templateVars(settings, window.location.origin);
  usePageMeta(`Courses and pricing — ${vars.appName}`, `Dairy courses on ${vars.appName} and what each one costs.`);

  const [courses, setCourses] = useState<PublicCourse[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    setCourses(null);
    publicApi
      .courses()
      .then(setCourses)
      .catch(() => setFailed(true));
  }, []);

  useEffect(load, [load]);

  return (
    <>
      <PageHero
        title="Courses and pricing"
        summary={`Practical dairy courses you buy once and learn at your own pace in the ${vars.appName} app. Prices are in Indian rupees and include applicable taxes.`}
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {failed ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-line p-6">
            <p className="text-[15px] font-semibold">The course list could not be loaded right now.</p>
            <p className="text-sm text-muted">Our server may be waking up. Please try again in a moment.</p>
            <button
              type="button"
              onClick={load}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-canvas"
            >
              <RotateCcw size={15} aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : courses === null ? (
          <ul aria-busy="true" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="overflow-hidden rounded-2xl border border-line">
                <div className="aspect-[16/9] animate-pulse bg-ink/6" />
                <div className="space-y-2 p-5">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-ink/8" />
                  <div className="h-3 w-full animate-pulse rounded bg-ink/6" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-ink/6" />
                </div>
              </li>
            ))}
          </ul>
        ) : courses.length === 0 ? (
          <p className="rounded-2xl border border-line p-6 text-[15px] text-muted">New courses are being prepared. Please check back soon.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const list = course.listPriceInr && course.listPriceInr > course.priceInr ? course.listPriceInr : null;
              return (
                <li key={course._id} className="flex flex-col overflow-hidden rounded-2xl border border-line">
                  <div className="aspect-[16/9]">
                    <CourseCover url={course.coverUrl} />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink">
                      {course.category?.label || 'Dairy'} · {course.level}
                    </p>
                    <h2 className="mt-1.5 text-[17px] font-bold leading-snug">{course.title}</h2>
                    {course.promise && <p className="mt-1.5 text-sm leading-relaxed text-muted">{course.promise}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen size={14} aria-hidden="true" />
                        {course.lessonCount} lessons
                      </span>
                      {course.hours ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} aria-hidden="true" />
                          {course.hours} h
                        </span>
                      ) : null}
                      {course.reviewCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Star size={14} aria-hidden="true" className="fill-current text-[#d9a400]" />
                          {course.rating.toFixed(1)} ({course.reviewCount})
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex items-baseline gap-2 pt-4">
                      <span className="text-2xl font-bold">{course.priceInr > 0 ? inr(course.priceInr) : 'Free'}</span>
                      {list && <span className="text-sm text-subtle line-through">{inr(list)}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-10 grid grid-cols-1 gap-4 rounded-2xl bg-canvas p-6 text-sm leading-relaxed text-muted sm:grid-cols-3">
          <p>
            <strong className="block text-ink">One-time payment</strong>
            Buy a course once in the app with UPI, card, net banking or a wallet through Razorpay. No subscription.
          </p>
          <p>
            <strong className="block text-ink">Instant access</strong>
            The course unlocks on your account as soon as the payment is confirmed. See the{' '}
            <Link to={PUBLIC_PATHS.delivery} className="font-semibold text-brand-ink underline underline-offset-2">
              Shipping and Delivery Policy
            </Link>
            .
          </p>
          <p>
            <strong className="block text-ink">Refunds</strong>
            Changed your mind soon after buying? See who can get a refund in the{' '}
            <Link to={PUBLIC_PATHS.refund} className="font-semibold text-brand-ink underline underline-offset-2">
              Refund and Cancellation Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
