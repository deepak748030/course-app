import { useRouter } from 'expo-router';
import { Bell, BellRing, Clapperboard, Sparkles } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppBar, Badge, DataList, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { ListSkeleton } from '@/components/skeletons';
import { createStyles, colors, layout, radius, spacing, type } from '@/constants/theme';
import { useT } from '@/i18n';
import { minutesAgoLabel } from '@/lib/format';
import { api, type InboxItem } from '@/services/api';
import { useStore } from '@/store';

const PAGE_SIZE = 20;

const kindIcon = {
  announcement: Bell,
  'course-update': Clapperboard,
  'learning-reminder': BellRing,
  product: Sparkles,
} as const;

export default function NotificationsScreen() {
  const t = useT();

  const router = useRouter();
  const { state, markNotificationsRead } = useStore();
  // Captured on mount: the badge says "Marked as read" only when this visit is the one that cleared it.
  const [wasUnread] = useState(() => !state.notificationsRead);

  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const page = await api.inbox({ limit: PAGE_SIZE });
      setItems(page.items);
      setHasMore(page.hasMore);
    } catch {
      setFailed(true);
      setItems((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Opening the screen is the read receipt — the badge on Home clears from here.
  useEffect(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  // Infinite scroll: the next page starts after the oldest message shown so far.
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !items || items.length === 0) return;
    const oldest = items[items.length - 1];
    setLoadingMore(true);
    try {
      const page = await api.inbox({ limit: PAGE_SIZE, before: oldest.createdAt });
      setItems((current) => {
        const seen = new Set((current ?? []).map((item) => item.id));
        return [...(current ?? []), ...page.items.filter((item) => !seen.has(item.id))];
      });
      setHasMore(page.hasMore);
    } catch {
      /* keep what is shown; scrolling down again retries */
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, items, loadingMore]);

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const today = (items ?? []).filter((item) => Date.parse(item.createdAt) >= dayAgo);
  const earlier = (items ?? []).filter((item) => Date.parse(item.createdAt) < dayAgo);
  const openCourse = (id: string) => router.push({ pathname: '/course/[id]', params: { id } });

  return (
    <Screen
      onEndReached={loadMore}
      header={<AppBar title={t("Notifications")} right={wasUnread ? <Badge label={t("Marked as read")} tone="sage" /> : undefined} />}
      contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}>
      {items === null ? (
        <ListSkeleton rows={4} />
      ) : failed && items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t("Can't reach the academy")}
          body={t("Check your connection and try again.")}
          actionLabel={t("Try again")}
          onAction={() => void load()}
        />
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title={t("Nothing new")} body={t("Course updates and learning reminders will appear here.")} />
      ) : (
        <>
          <Group title={t("Today")} items={today} onOpenCourse={openCourse} />
          <Group title={t("Earlier")} items={earlier} onOpenCourse={openCourse} />
          {loadingMore ? <ActivityIndicator color={colors.textSubtle} style={styles.more} /> : null}
        </>
      )}
    </Screen>
  );
}

function Group({
  title,
  items,
  onOpenCourse,
}: {
  title: string;
  items: InboxItem[];
  onOpenCourse: (courseId: string) => void;
}) {
  const t = useT();

  if (items.length === 0) return null;

  return (
    <View style={styles.group}>
      <SectionHeader title={title} />
      <DataList dividerInset={layout.screen + 40 + spacing.md}>
        {items.map((item) => {
          const Icon = kindIcon[item.kind] ?? Bell;
          const openable = Boolean(item.courseId);
          const minutesAgo = Math.max(0, Math.round((Date.now() - Date.parse(item.createdAt)) / 60000));
          return (
            <Pressable
              key={item.id}
              accessibilityRole={openable ? 'button' : 'text'}
              accessibilityLabel={`${item.title}. ${item.body}`}
              disabled={!openable}
              onPress={() => item.courseId && onOpenCourse(item.courseId)}
              style={({ pressed }) => [styles.row, pressed && openable && { opacity: 0.75 }]}>
              <View style={styles.icon}>
                <Icon size={18} color={colors.accentText} strokeWidth={1.9} />
              </View>
              <View style={styles.flex}>
                <View style={styles.rowHead}>
                  <Text style={[type.bodyStrong, { color: colors.text, flex: 1 }]}>{item.title}</Text>
                  <Text style={[type.label, { color: colors.textSubtle }]}>{minutesAgoLabel(minutesAgo)}</Text>
                </View>
                <Text style={[type.label, { color: colors.textMuted }]}>{item.body}</Text>
                {openable ? <Text style={[type.labelStrong, styles.openLink, { color: colors.accentText }]}>{t("Open course")}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </DataList>
    </View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: layout.gap },
  more: { paddingVertical: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, minHeight: layout.touchTarget },
  rowHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openLink: { marginTop: spacing.xs },
}));
