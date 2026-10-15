import { Eye, EyeOff, Star, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useRealtimeRefresh } from '../api/realtime';
import type { Review } from '../api/types';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ListSkeleton,
  Pagination,
  SearchInput,
  Stars,
  formatDate,
  usePagination,
  useToast,
} from '../components/ui';

const TABS = [
  { id: '', label: 'All reviews' },
  { id: 'true', label: 'Visible' },
  { id: 'false', label: 'Hidden' },
];

export default function Reviews() {
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [visibleFilter, setVisibleFilter] = useState('');
  const [deleting, setDeleting] = useState<Review | null>(null);
  const [search, setSearch] = useState('');

  const matches = useMemo(() => {
    if (!reviews) return null;
    const q = search.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((r) => {
      const course = typeof r.course === 'string' ? '' : r.course?.title || '';
      return [r.author, r.body, course, r.user?.email].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [reviews, search]);
  const pager = usePagination(matches, 10, `${visibleFilter}|${search}`);

  const load = useCallback(async () => {
    try {
      setReviews(await api.listReviews({ visible: visibleFilter || undefined }));
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to load reviews');
    }
  }, [visibleFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(['review.created'], load);


  async function toggleVisible(review: Review) {
    try {
      await api.updateReview(review._id, { visible: !review.visible });
      toast('success', review.visible ? 'Review hidden and rating recomputed' : 'Review visible again');
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not update review');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api.deleteReview(deleting._id);
      toast('success', 'Review deleted and rating recomputed');
      setDeleting(null);
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Delete failed');
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full overflow-x-auto rounded-lg border border-line bg-surface p-0.5 sm:w-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setVisibleFilter(tab.id)}
              className={`rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                visibleFilter === tab.id ? 'bg-brand text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search author, course or feedback…" className="w-full sm:w-72" />
      </div>
      <p className="text-[13px] text-muted">
        Hidden reviews stay stored but stop counting toward the course rating.
      </p>

      <Card>
        {reviews === null ? (
          <ListSkeleton rows={6} />
        ) : reviews.length === 0 ? (
          <EmptyState icon={Star} title="No reviews" message="Reviews written in the app will appear here for moderation." />
        ) : pager.total === 0 ? (
          <EmptyState icon={Star} title="No matching reviews" message="Try a different search or filter." />
        ) : (
          <div className="divide-y divide-line-soft">
            {pager.rows.map((review) => {
              const course = typeof review.course === 'string' ? null : review.course;
              return (
                <div key={review._id} className="flex flex-col items-start gap-3 px-4 py-4 sm:flex-row md:px-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-ink">
                    {review.author.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-[13px] font-semibold">{review.author}</p>
                      <Stars rating={review.rating} size={12} />
                      <Badge tone="outline">{course?.title || 'Deleted course'}</Badge>
                      {!review.visible && <Badge tone="error">Hidden</Badge>}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{review.body || <span className="italic text-subtle">No written feedback</span>}</p>
                    <p className="mt-1 text-xs text-subtle">{formatDate(review.createdAt)} · {review.user?.email || 'unknown user'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                    <Button size="sm" variant="outline" icon={review.visible ? EyeOff : Eye} onClick={() => toggleVisible(review)}>
                      {review.visible ? 'Hide' : 'Show'}
                    </Button>
                    <button title="Delete" onClick={() => setDeleting(review)} className="rounded-md p-2 text-muted hover:bg-error-soft hover:text-error">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {pager.total > 0 && (
          <Pagination page={pager.page} pageCount={pager.pageCount} pageSize={pager.pageSize} total={pager.total} onPage={pager.setPage} />
        )}
      </Card>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this review?"
        message="The review will be removed permanently and the course rating will be recomputed."
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
