/**
 * Catalog context — loads the live catalog once for the whole app and keeps it fresh.
 *
 * - Boots instantly from the on-device cache when one exists (the last good catalog),
 *   then refreshes in the background with an If-None-Match round-trip — a 304 means
 *   no payload at all crosses the wire.
 * - Screens gate on the status (loading / error-with-retry / ready).
 * - Subscribes to the realtime `catalog.changed` event, so a publish or edit in the admin
 *   dashboard reaches open apps within a couple of seconds (refetch is debounced).
 * - `refresh()` is exposed for pull-style retries from error states.
 */

import { WifiOff, CloudDownload } from 'lucide-react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { createStyles, colors, spacing, type } from '@/constants/theme';
import {
  readCatalogCache,
  refreshCatalog,
  writeCatalogCache,
  type CatalogData,
} from '@/services/catalogService';
import { onCatalogChanged } from '@/services/realtime';
import type { Category, Course } from '@/types';

type Status = 'loading' | 'ready' | 'error';

interface CatalogContextValue {
  status: Status;
  courses: Course[];
  categories: Category[];
  byId: (id: string | undefined) => Course | undefined;
  error: string | null;
  refresh: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<CatalogData>({ courses: [], categories: [] });
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const etagRef = useRef<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const refresh = useCallback(async () => {
    try {
      const result = await refreshCatalog(etagRef.current);
      if (result.notModified) {
        // Nothing moved on the server — except categories, which always arrive fresh.
        if (JSON.stringify(result.categories) !== JSON.stringify(dataRef.current.categories)) {
          setData((current) => ({ ...current, categories: result.categories }));
        }
        setStatus('ready');
        setError(null);
        return;
      }
      etagRef.current = result.etag;
      setData(result.data);
      writeCatalogCache({ etag: result.etag, savedAt: Date.now(), data: result.data });
      setStatus('ready');
      setError(null);
    } catch (err) {
      // Keep showing the last good catalog when one refresh fails mid-session; only an
      // initial load failure becomes a full error state.
      setError(err instanceof Error ? err.message : 'Could not reach the academy server.');
      setData((current) => {
        setStatus(current.courses.length > 0 ? 'ready' : 'error');
        return current;
      });
    }
  }, []);

  // Boot: hydrate from the on-device cache for an instant first paint, then refresh
  // in the background (304 when nothing changed, full payload when it did).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cache = await readCatalogCache();
      if (!cancelled && cache && cache.data.courses.length > 0) {
        etagRef.current = cache.etag;
        setData(cache.data);
        setStatus('ready');
      }
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Admin publishes/edits land here in realtime — debounce bursts (a course edit can fire
  // several events) into one refetch.
  useEffect(
    () =>
      onCatalogChanged(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => void refresh(), 800);
      }),
    [refresh],
  );

  const value = useMemo<CatalogContextValue>(
    () => ({
      status,
      courses: data.courses,
      categories: data.categories,
      byId: (id) => data.courses.find((course) => course.id === id),
      error,
      refresh,
    }),
    [status, data, error, refresh],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used inside CatalogProvider');
  return value;
}

/**
 * Renders children only once the catalog is ready. Before that: a warm loading block;
 * on failure: an honest offline state with retry. Keeps every catalog screen consistent.
 */
export function CatalogGate({ children }: { children: ReactNode }) {
  const { status, error, refresh } = useCatalog();

  if (status === 'ready') return <>{children}</>;

  return (
    <View style={styles.wrap}>
      {status === 'loading' ? (
        <View style={styles.center}>
          <CloudDownload size={30} color={colors.accentText} />
          <Text style={[type.subheading, styles.title]}>Loading the catalog…</Text>
          <Text style={[type.body, styles.body]}>Fetching the latest courses from the academy.</Text>
        </View>
      ) : (
        <View style={styles.center}>
          <WifiOff size={30} color={colors.accentText} />
          <Text style={[type.subheading, styles.title]}>Can’t reach the academy</Text>
          <Text style={[type.body, styles.body]}>{error ?? 'The course server is not responding.'}</Text>
          <Button label="Try again" onPress={() => void refresh()} fullWidth={false} />
        </View>
      )}
    </View>
  );
}

const styles = createStyles(() =>
  StyleSheet.create({
    wrap: { flex: 1 },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.xs,
      paddingBottom: 80,
    },
    title: { marginTop: spacing.sm, textAlign: 'center' },
    body: { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
  }),
);
