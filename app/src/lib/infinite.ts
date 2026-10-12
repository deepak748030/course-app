import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Infinite scroll for a list that is already in memory. Shows the first page, and each
 * `loadMore` (called when the screen is scrolled near its end) reveals the next page.
 * `resetKey` starts the list over from the first page when it changes (e.g. new filters).
 */
export function useInfiniteList<T>(
  items: readonly T[],
  { pageSize = 10, resetKey = '' }: { pageSize?: number; resetKey?: string } = {}
) {
  const [count, setCount] = useState(pageSize);

  useEffect(() => {
    setCount(pageSize);
  }, [resetKey, pageSize]);

  const visible = useMemo(() => items.slice(0, count), [items, count]);
  const hasMore = count < items.length;
  const total = items.length;

  const loadMore = useCallback(() => {
    setCount((current) => (current < total ? current + pageSize : current));
  }, [total, pageSize]);

  return { visible, hasMore, loadMore };
}
