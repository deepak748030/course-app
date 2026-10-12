import { useRouter } from '@/lib/router';
import { Bookmark, BookOpen, Clock } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CourseImage } from '@/components/course-image';
import { AppBar, Badge, DataList, EmptyState, MetaItem, Screen } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, type } from '@/constants/theme';
import { useCatalog } from '@/services/catalog-context';
import { useT } from '@/i18n';
import { useStore } from '@/store';
import type { Course } from '@/types';
import { formatDuration } from '@/lib/format';
import { useInfiniteList } from '@/lib/infinite';

export default function SavedScreen() {
  const t = useT();

  const router = useRouter();
  const { state } = useStore();
  const { byId } = useCatalog();

  const savedCourses = useMemo(
    () => state.savedCourseIds.map((id) => byId(id)).filter((course): course is Course => Boolean(course)),
    [state.savedCourseIds, byId],
  );

  const coursePages = useInfiniteList(savedCourses);

  return (
    <Screen
      onEndReached={coursePages.loadMore}
      header={<AppBar title={t('Saved')} />}
      contentStyle={{ paddingBottom: spacing.xxl, gap: layout.gap }}>
      {savedCourses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t('Nothing saved yet')}
          body={t('Tap the bookmark on any course card and it will be waiting here, even while you decide.')}
          actionLabel={t('Browse courses')}
          onAction={() => router.push('/explore')}
        />
      ) : (
        <DataList>
          {coursePages.visible.map((course) => (
            <Pressable
              key={course.id}
              accessibilityRole="button"
              accessibilityLabel={`${course.title}, saved. Open course.`}
              onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
              style={({ pressed }) => [styles.courseRow, pressed && { opacity: 0.75 }]}>
              <CourseImage source={course.cover} style={styles.thumb} transition={140} />
              <View style={styles.flex}>
                <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
                  {course.title}
                </Text>
                <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={1}>
                  {course.promise}
                </Text>
                <View style={styles.metaRow}>
                  <MetaItem icon={Clock} label={formatDuration(course.hours * 60)} />
                  <Badge label={t(course.level)} tone="neutral" />
                </View>
              </View>
            </Pressable>
          ))}
        </DataList>
      )}

      <View style={styles.footNote}>
        <Bookmark size={14} color={colors.textSubtle} strokeWidth={1.9} />
        <Text style={[type.label, { color: colors.textSubtle, flex: 1 }]}>
          {t('Saved items are stored on this device with your session.')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = createStyles(() => StyleSheet.create({
  flex: { flex: 1 },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' },
  footNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: layout.section, paddingTop: spacing.sm },
}));
