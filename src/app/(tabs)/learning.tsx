import { useRouter } from 'expo-router';
import { BookOpen, CircleCheck, Clock, Play, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContinueCard } from '@/components/course-cards';
import { AppText, Badge, EmptyState, MetaItem, ProgressBar } from '@/components/ui';
import { colors, maxContentWidth, radius, screenPadding, shadow, spacing, type } from '@/constants/theme';
import { courses } from '@/data/catalog';
import { useStore } from '@/store';
import { formatDuration } from '@/lib/format';

type Segment = 'progress' | 'completed';

export default function MyLearningScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, courseProgressRatio, completedCount, resumeLesson } = useStore();
  const [segment, setSegment] = useState<Segment>('progress');

  const enrolled = useMemo(
    () => courses.filter((course) => state.enrollments[course.id]),
    [state.enrollments],
  );

  const inProgress = enrolled.filter((course) => courseProgressRatio(course) < 1);
  const completed = enrolled.filter((course) => courseProgressRatio(course) === 1);

  const stats = useMemo(() => {
    let lessons = 0;
    let minutes = 0;
    enrolled.forEach((course) => {
      course.lessons.forEach((lesson) => {
        if (state.progress[course.id]?.[lesson.id]?.completed) {
          lessons += 1;
          minutes += lesson.minutes;
        }
      });
    });
    return { lessons, minutes };
  }, [enrolled, state.progress]);

  const list = segment === 'progress' ? inProgress : completed;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxxl }]}
        showsVerticalScrollIndicator={false}>
        <AppText variant="title">My learning</AppText>

        <View style={styles.statsRow}>
          <StatTile icon={BookOpen} label="Courses" value={String(enrolled.length)} />
          <StatTile icon={CircleCheck} label="Lessons done" value={String(stats.lessons)} />
          <StatTile icon={Clock} label="Time learned" value={formatDuration(stats.minutes)} />
        </View>

        <View style={styles.segment}>
          <SegmentButton label={`In progress${inProgress.length ? ` (${inProgress.length})` : ''}`} active={segment === 'progress'} onPress={() => setSegment('progress')} />
          <SegmentButton label={`Completed${completed.length ? ` (${completed.length})` : ''}`} active={segment === 'completed'} onPress={() => setSegment('completed')} />
        </View>

        {list.length === 0 ? (
          segment === 'progress' ? (
            <EmptyState
              icon={BookOpen}
              title="Nothing in progress yet"
              body="Enrol in a course and it will appear here with your progress, next lesson and notes."
              actionLabel="Browse courses"
              onAction={() => router.push('/explore')}
            />
          ) : (
            <EmptyState
              icon={CircleCheck}
              title="No completed courses yet"
              body="Finish every lesson in a course and it moves here so you can revisit it anytime."
              actionLabel="Continue learning"
              onAction={() => setSegment('progress')}
            />
          )
        ) : (
          <View style={styles.list}>
            {list.map((course) => {
              const ratio = courseProgressRatio(course);
              const resume = resumeLesson(course);
              const nextLesson = resume?.lesson ?? course.lessons[0];

              if (segment === 'progress') {
                return (
                  <View key={course.id} style={styles.courseBlock}>
                    <ContinueCard
                      course={course}
                      lessonTitle={nextLesson.title}
                      progress={ratio}
                      onPress={() =>
                        router.push({
                          pathname: '/lesson/[courseId]/[lessonId]',
                          params: { courseId: course.id, lessonId: nextLesson.id },
                        })
                      }
                    />
                    <View style={styles.metaRow}>
                      <MetaItem icon={CircleCheck} label={`${completedCount(course)}/${course.lessonCount} lessons`} />
                      <Text style={[type.meta, { color: colors.textSecondary }]}>
                        {Math.round(ratio * 100)}% complete
                      </Text>
                    </View>
                  </View>
                );
              }

              return (
                <Pressable
                  key={course.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${course.title}, completed. Review lessons.`}
                  onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
                  style={({ pressed }) => [styles.completedCard, shadow.card, pressed && { opacity: 0.85 }]}>
                  <View style={styles.completedHeader}>
                    <View style={styles.flex}>
                      <Text style={[type.cardTitle, { color: colors.text }]} numberOfLines={2}>
                        {course.title}
                      </Text>
                      <Badge label="All lessons complete" tone="success" icon={CircleCheck} />
                    </View>
                    <View style={styles.replayIcon}>
                      <Play size={18} color={colors.primary} strokeWidth={2} fill={colors.primary} />
                    </View>
                  </View>
                  <ProgressBar value={1} accessibilityLabel={`${course.title} complete`} />
                  <Text style={[type.meta, { color: colors.textSecondary }]}>
                    {course.lessonCount} lessons · {formatDuration(course.hours * 60)} of material
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Find more courses"
          onPress={() => router.push('/explore')}
          style={({ pressed }) => [styles.exploreRow, pressed && { opacity: 0.8 }]}>
          <Search size={18} color={colors.primary} strokeWidth={2} />
          <Text style={[type.label, { color: colors.primary }]}>Find more courses</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MetaItem>['icon'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statTile}>
      <Icon size={17} color={colors.sage} strokeWidth={1.9} />
      <Text style={[type.cardTitle, { color: colors.text, fontSize: 17 }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[type.meta, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentButtonActive]}>
      <Text style={[type.label, { color: active ? colors.textInverse : colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.lg,
    paddingTop: spacing.sm,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  flex: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: spacing.xs },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    padding: spacing.sm,
    gap: spacing.xxs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceWarm,
    borderRadius: radius.pill,
    padding: spacing.xxs,
    gap: spacing.xxs,
  },
  segmentButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  segmentButtonActive: { backgroundColor: colors.primary },
  list: { gap: spacing.lg },
  courseBlock: { gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  completedCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md, gap: spacing.sm },
  completedHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  replayIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
  },
});
