import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleCheck, Play } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Badge, Button, DataList, Screen } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { courseById, firstPlayableLesson } from '@/data/catalog';
import { useT } from '@/i18n';
import { useStore } from '@/store';
import { formatInr } from '@/lib/format';

export default function PurchaseSuccessScreen() {
  const t = useT();

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
      <Screen contentStyle={{ paddingBottom: insets.bottom + spacing.xl, paddingTop: spacing.xxl, gap: layout.gap }}>
        <View style={styles.markWrap}>
          <Text style={[type.title, { color: colors.text, textAlign: 'center' }]}>{t("Course not found")}</Text>
          <Text style={[type.body, { color: colors.textMuted, textAlign: 'center' }]}>{t("This confirmation link is out of date, so the purchase cannot be shown.")}</Text>
        </View>
        <View style={styles.pad}>
          <Button label={t("Back to My learning")} onPress={() => router.replace('/learning')} />
        </View>
      </Screen>
    );
  }

  const firstLesson = firstPlayableLesson(course);

  return (
    <Screen
      contentStyle={{
        paddingTop: spacing.xxl,
        paddingBottom: insets.bottom + spacing.xl,
        flexGrow: 1,
        gap: layout.sectionGap,
      }}>
      <View style={styles.markWrap}>
        <Animated.View style={[styles.mark, markStyle]}>
          <CircleCheck size={44} color={colors.success} strokeWidth={1.8} />
        </Animated.View>
        <Text style={[type.title, { color: colors.text, textAlign: 'center' }]}>You&apos;re in</Text>
        <Text style={[type.body, { color: colors.textMuted, textAlign: 'center' }]}>
          {course.title} is unlocked. All {course.lessonCount} lessons are ready whenever you are.
        </Text>
      </View>

      <DataList>
        <View style={styles.summaryRow}>
          <Text style={[type.label, { color: colors.textMuted }]}>{t("Course")}</Text>
          <Text style={[type.bodyStrong, styles.right]} numberOfLines={2}>
            {course.title}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[type.label, { color: colors.textMuted }]}>{t('Paid (demo)')}</Text>
          <AppText variant="bodyStrong" style={[tabularNums, styles.right]}>
            {enrollment ? formatInr(enrollment.priceInr) : '—'}
          </AppText>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[type.label, { color: colors.textMuted }]}>{t("Reference")}</Text>
          <Text style={[type.label, styles.right, { color: colors.textMuted }]}>local demo enrolment</Text>
        </View>
      </DataList>

      <View style={styles.pad}>
        <Badge label={t("Demo purchase \u2014 no payment was processed")} tone="gold" />
      </View>

      {!isEnrolled(course.id) ? (
        <Text style={[type.label, styles.pad, { color: colors.error }]}>{t("This enrolment is not on your account. Return to the course page to buy it again.")}</Text>
      ) : null}

      <View style={[styles.actions, { paddingBottom: 0 }]}>
        <Button
          label={t("Start the first lesson")}
          icon={Play}
          onPress={() =>
            router.replace({
              pathname: '/lesson/[courseId]/[lessonId]',
              params: { courseId: course.id, lessonId: firstLesson.id },
            })
          }
        />
        <Button label={t("Go to My learning")} variant="secondary" onPress={() => router.replace('/learning')} />
        <Button
          label={t("Back to course page")}
          variant="ghost"
          onPress={() => router.replace({ pathname: '/course/[id]', params: { id: course.id } })}
        />
      </View>
    </Screen>
  );
}

const styles = createStyles(() => StyleSheet.create({
  pad: { paddingHorizontal: layout.screen },
  markWrap: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: layout.section },
  mark: {
    width: 92,
    height: 92,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md },
  right: { flex: 1, textAlign: 'right' },
  actions: { gap: layout.gap, marginTop: 'auto', paddingHorizontal: layout.screen },
}));
