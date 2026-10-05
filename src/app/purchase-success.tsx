import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleCheck, Play } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, PrimaryButton, ScreenContainer } from '@/components/ui';
import { colors, radius, spacing, type } from '@/constants/theme';
import { courseById, firstPlayableLesson } from '@/data/catalog';
import { useStore } from '@/store';
import { formatInr } from '@/lib/format';

export default function PurchaseSuccessScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isEnrolled, state } = useStore();

  const course = useMemo(() => courseById(courseId), [courseId]);
  const reduced = useReducedMotion();
  const appear = useSharedValue(reduced ? 1 : 0);
  const ring = useSharedValue(reduced ? 1 : 0.6);

  useEffect(() => {
    appear.value = withTiming(1, { duration: 320 });
    ring.value = withSpring(1, { damping: 14, stiffness: 180, mass: 0.8 });
  }, [appear, ring]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: ring.value }],
  }));

  const enrollment = course ? state.enrollments[course.id] : undefined;

  if (!course) {
    return (
      <ScreenContainer contentStyle={{ paddingTop: insets.top + spacing.xxl, gap: spacing.lg }}>
        <Text style={[type.screenTitle, { color: colors.text }]}>Course not found</Text>
        <PrimaryButton label="Back to My learning" onPress={() => router.replace('/learning')} />
      </ScreenContainer>
    );
  }

  const firstLesson = firstPlayableLesson(course);

  return (
    <ScreenContainer
      contentStyle={{
        paddingTop: insets.top + spacing.xxxl,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.lg,
        flexGrow: 1,
      }}>
      <View style={styles.markWrap}>
        <Animated.View style={[styles.mark, markStyle]}>
          <CircleCheck size={46} color={colors.success} strokeWidth={1.8} />
        </Animated.View>
        <Text style={[type.screenTitle, { color: colors.text, textAlign: 'center' }]}>You&apos;re in</Text>
        <Text style={[type.body, { color: colors.textSecondary, textAlign: 'center' }]}>
          {course.title} is unlocked. All {course.lessonCount} lessons are ready whenever you are.
        </Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={[type.supporting, { color: colors.textSecondary }]}>Course</Text>
          <Text style={[type.label, { color: colors.text, flex: 1, textAlign: 'right' }]} numberOfLines={2}>
            {course.title}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[type.supporting, { color: colors.textSecondary }]}>Paid (demo)</Text>
          <Text style={[type.label, { color: colors.text }]}>
            {enrollment ? formatInr(enrollment.priceInr) : '—'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[type.supporting, { color: colors.textSecondary }]}>Reference</Text>
          <Text style={[type.meta, { color: colors.textSecondary }]}>local demo enrolment</Text>
        </View>
        <Badge label="Demo purchase — no payment was processed" tone="gold" />
      </View>

      {!isEnrolled(course.id) ? (
        <Text style={[type.meta, { color: colors.error }]}>
          This enrolment is not on your account. Return to the course page to buy it again.
        </Text>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton
          label="Start the first lesson"
          icon={Play}
          onPress={() =>
            router.replace({
              pathname: '/lesson/[courseId]/[lessonId]',
              params: { courseId: course.id, lessonId: firstLesson.id },
            })
          }
        />
        <PrimaryButton label="Go to My learning" variant="secondary" onPress={() => router.replace('/learning')} />
        <PrimaryButton label="Back to course page" variant="ghost" onPress={() => router.replace({ pathname: '/course/[id]', params: { id: course.id } })} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  markWrap: { alignItems: 'center', gap: spacing.sm },
  mark: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actions: { gap: spacing.xs, marginTop: 'auto' },
});
