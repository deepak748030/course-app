import { useRouter } from 'expo-router';
import { BookOpen, CircleCheck, Clock, Play, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ContinueCard } from '@/components/course-cards';
import { AppText, Badge, Button, DataList, EmptyState, ProgressBar, Screen, Segmented } from '@/components/ui';
import { colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { courses } from '@/data/catalog';
import { formatDuration } from '@/lib/format';
import { useStore } from '@/store';

type Segment = 'progress' | 'completed';

export default function MyLearningScreen() {
  const router = useRouter();
  const { state, courseProgressRatio, completedCount, resumeLesson } = useStore();
  const [segment, setSegment] = useState<Segment>('progress');

  const enrolled = useMemo(() => courses.filter((course) => state.enrollments[course.id]), [state.enrollments]);
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
    <Screen contentStyle={styles.content}>
      <Text style={[type.display, styles.title, { color: colors.text }]}>My learning</Text>

      <View style={styles.pad}>
        <View style={styles.statsCard}>
          <Stat icon={BookOpen} label="Courses" value={String(enrolled.length)} />
          <View style={styles.statDivider} />
          <Stat icon={CircleCheck} label="Lessons done" value={String(stats.lessons)} />
          <View style={styles.statDivider} />
          <Stat icon={Clock} label="Time learned" value={formatDuration(stats.minutes)} />
        </View>
      </View>

      <Segmented<Segment>
        options={[
          { id: 'progress', label: `In progress${inProgress.length ? ` · ${inProgress.length}` : ''}` },
          { id: 'completed', label: `Completed${completed.length ? ` · ${completed.length}` : ''}` },
        ]}
        value={segment}
        onChange={setSegment}
      />

      {list.length === 0 ? (
        segment === 'progress' ? (
          <EmptyState
            icon={BookOpen}
            title="Nothing in progress yet"
            body="Enrol in a course and it appears here with your progress, the next lesson and your notes."
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
      ) : segment === 'progress' ? (
        <DataList>
          {list.map((course) => {
            const nextLesson = resumeLesson(course)?.lesson ?? course.lessons[0];
            return (
              <ContinueCard
                key={course.id}
                course={course}
                lessonTitle={nextLesson.title}
                progress={courseProgressRatio(course)}
                onPress={() =>
                  router.push({
                    pathname: '/lesson/[courseId]/[lessonId]',
                    params: { courseId: course.id, lessonId: nextLesson.id },
                  })
                }
              />
            );
          })}
        </DataList>
      ) : (
        <DataList>
          {list.map((course) => (
            <Pressable
              key={course.id}
              accessibilityRole="button"
              accessibilityLabel={`${course.title}, completed. Review lessons.`}
              onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
              style={({ pressed }) => [styles.completedRow, pressed && { opacity: 0.7 }]}>
              <View style={styles.flex}>
                <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
                  {course.title}
                </Text>
                <View style={styles.completedMeta}>
                  <Badge label="All lessons done" tone="success" icon={CircleCheck} />
                  <Text style={[type.label, tabularNums, { color: colors.textMuted }]}>
                    {completedCount(course)}/{course.lessonCount} · {formatDuration(course.hours * 60)}
                  </Text>
                </View>
                <ProgressBar value={1} accessibilityLabel={`${course.title} complete`} />
              </View>
              <View style={styles.replay}>
                <Play size={16} color={colors.accentText} strokeWidth={2} fill={colors.accentText} />
              </View>
            </Pressable>
          ))}
        </DataList>
      )}

      <View style={styles.pad}>
        <Button
          label="Find more courses"
          variant="secondary"
          icon={Search}
          onPress={() => router.push('/explore')}
        />
      </View>
    </Screen>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stat}>
      <Icon size={16} color={colors.sage} strokeWidth={1.75} />
      <AppText variant="subheading" style={tabularNums}>
        {value}
      </AppText>
      <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: layout.gap, paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  title: { paddingHorizontal: layout.section, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  pad: { paddingHorizontal: layout.screen },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statDivider: { width: 1, backgroundColor: colors.divider, marginVertical: spacing.xs },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: layout.screen, paddingVertical: spacing.md },
  completedMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.sm, flexWrap: 'wrap' },
  replay: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
