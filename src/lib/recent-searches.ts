/**
 * Recent searches, kept on device.
 *
 * Search runs against the bundled catalog, so this is only a convenience list: five terms, most
 * recent first, deduped case-insensitively. All reads and writes go through @/lib/storage, which
 * is timeout-bounded and never rejects — a blocked localStorage degrades to an empty list.
 */

import { storage } from '@/lib/storage';

const KEY = 'ydu.recent-searches';
const LIMIT = 5;

export async function readRecentSearches(): Promise<string[]> {
  const raw = await storage.get(KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0).slice(0, LIMIT);
  } catch {
    return [];
  }
}

export async function rememberSearch(term: string): Promise<string[]> {
  const trimmed = term.trim();
  if (!trimmed) return readRecentSearches();
  const previous = await readRecentSearches();
  const next = [trimmed, ...previous.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())].slice(0, LIMIT);
  await storage.set(KEY, JSON.stringify(next));
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  await storage.remove(KEY);
}
