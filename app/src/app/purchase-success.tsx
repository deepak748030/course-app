import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen, CircleCheck, Clock, Play, Receipt, Star } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseImage } from '@/components/course-image';
import { AppText, Badge, Button, DataList, Screen } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { useT } from '@/i18n';
import { firstPlayableLesson } from '@/lib/catalog';
import { formatDuration, formatInr } from '@/lib/format';
import { useCatalog } from '@/services/catalog-context';
import { useStore } from '@/store';

/** Particles leave the check mark in these directions (radians). */
const BURST_ANGLES = [0, 1.05, 2.1, 3.14, 4.19, 5.24];

function BurstDot({ angle, progress, color }: { angle: number; progress: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => {
    const distance = 58 * progress.value;
    return {
      opacity: 1 - progress.value * 0.7,
      transform: [
        { translateX: Math.cos(angle) * distance },
        { translateY: Math.sin(angle) * distance },
        { scale: 0.5 + 0.5 * progress.value },
      ],
    };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export default function PurchaseSuccessScreen() {
  const { byId } = useCatalog();
  const t = useT();

  const { courseId, orderId } = useLocalSearchParams<{ courseId: string; orderId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isEnrolled, state } = useStore();

  const course = useMemo(() => byId(courseId), [byId, courseId]);
  const reduced = useReducedMotion();

  // Ring pulse, check pop and the particle burst play once, in that order.
  const ripple = useSharedValue(reduced ? 1 : 0);
  const pop = useSharedValue(reduced ? 1 : 0);
  const burst = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    ripple.value = withDelay(120, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }));
    pop.value = withDelay(60, withSpring(1, { damping: 11, stiffness: 160, mass: 0.9 }));
    burst.value = withDelay(260, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [reduced, ripple, pop, burst]);

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: (1 - ripple.value) * 0.35,
    transform: [{ scale: 1 + ripple.value * 1.5 }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 2),
    transform: [{ scale: pop.value }],
  }));

  const enrollment = course ? state.enrollments[course.id] : undefined;

  if (!course) {
    return (
      <Screen contentStyle={{ paddingBottom: insets.bottom + spacing.xl, paddingTop: spacing.xxl, gap: layout.gap }}>
        <View style={styles.hero}>
          <Text style={[type.title, { color: colors.text, textAlign: 'center' }]}>{t("Course not found")}</Text>
          <Text style={[type.body, { color: colors.textMuted, textAlign: 'center' }]}>
            {t("This confirmation link is out of date, so the purchase cannot be shown.")}
          </Text>
        </View>
        <View style={styles.pad}>
          <Button label={t("Back to My learning")} onPress={() => router.replace('/learning')} />
        </View>
      </Screen>
    );
  }

  const firstLesson = firstPlayableLesson(course);
  const enrolled = isEnrolled(course.id);
  const lessonMinutes = course.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);

  return (
    <Screen
      contentStyle={{
        paddingTop: spacing.xl,
        paddingBottom: insets.bottom + spacing.lg,
        flexGrow: 1,
        gap: layout.sectionGap,
      }}>
      {/* Hero: the mark, a ring that pulses out of it and a short burst of particles. */}
      <View style={styles.hero}>
        <View style={styles.markWrap}>
          <Animated.View style={[styles.ring, rippleStyle]} />
          {BURST_ANGLES.map((angle, index) => (
            <BurstDot
              key={angle}
              angle={angle}
              progress={burst}
              color={index % 2 === 0 ? colors.success : colors.accentText}
            />
          ))}
          <Animated.View style={[styles.mark, markStyle]}>
            <CircleCheck size={46} color={colors.success} strokeWidth={1.8} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(reduced ? 0 : 280).duration(360)} style={styles.heroText}>
          <Text style={[type.title, { color: colors.text, textAlign: 'center' }]}>{t("You're in!")}</Text>
          <Text style={[type.body, { color: colors.textMuted, textAlign: 'center' }]}>
            {t('{course} is unlocked for your account.', { course: course.title })}
          </Text>
        </Animated.View>
      </View>

      {/* The course you bought, with what it holds. */}
      <Animated.View entering={FadeInDown.delay(reduced ? 0 : 380).duration(360)} style={styles.pad}>
        <View style={styles.courseCard}>
          <CourseImage source={course.cover} style={styles.cover} transition={160} />
          <View style={styles.flex}>
            <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
              {course.title}
            </Text>
            <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={1}>
              {course.level}
              {course.language ? ` · ${course.language}` : ''}
            </Text>
            <View style={styles.badgeRow}>
              {enrolled ? <Badge label={t('Unlocked')} tone="sage" /> : null}
              <Badge label={t("Demo purchase \u2014 no payment was processed")} tone="gold" />
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Three numbers that answer "how much is there": lessons, time and what was paid. */}
      <Animated.View entering={FadeInDown.delay(reduced ? 0 : 440).duration(360)} style={[styles.pad, styles.statsRow]}>
        <Stat icon={BookOpen} value={String(course.lessons.length)} label={t('Lessons')} />
        <Stat icon={Clock} value={formatDuration(lessonMinutes)} label={t('Duration')} />
        <Stat
          icon={Receipt}
          value={enrollment ? formatInr(enrollment.priceInr) : '—'}
          label={t('Paid')}
        />
      </Animated.View>

      {/* What to do next, in order. */}
      <Animated.View entering={FadeInDown.delay(reduced ? 0 : 500).duration(360)} style={styles.pad}>
        <Text style={[type.labelStrong, styles.heading, { color: colors.textMuted }]}>{t("What's next")}</Text>
        <View style={styles.steps}>
          <Step n={1} text={t('Open the first lesson. Your place is saved as you watch.')} />
          <Step n={2} text={t('Find this course anytime under My learning.')} />
          <Step n={3} text={t('Rate it when you finish, to help other learners.')} />
        </View>
      </Animated.View>

      {/* Receipt. */}
      <Animated.View entering={FadeInDown.delay(reduced ? 0 : 560).duration(360)} style={styles.pad}>
        <Text style={[type.labelStrong, styles.heading, { color: colors.textMuted }]}>{t('Receipt')}</Text>
        <DataList>
          <View style={styles.summaryRow}>
            <Text style={[type.label, { color: colors.textMuted }]}>{t("Course")}</Text>
            <Text style={[type.bodyStrong, styles.right]} numberOfLines={2}>
              {course.title}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[type.label, { color: colors.textMuted }]}>{t('Paid')}</Text>
            <AppText variant="bodyStrong" style={[tabularNums, styles.right]}>
              {enrollment ? formatInr(enrollment.priceInr) : '—'}
            </AppText>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[type.label, { color: colors.textMuted }]}>{t("Reference")}</Text>
            <Text style={[type.label, styles.right, { color: colors.textMuted }]} numberOfLines={1}>
              {orderId ? orderId : '—'}
            </Text>
          </View>
        </DataList>
      </Animated.View>

      {!enrolled ? (
        <Text style={[type.label, styles.pad, { color: colors.error }]}>
          {t("This enrolment is not on your account. Return to the course page to buy it again.")}
        </Text>
      ) : null}

      {/* Actions stay pinned to the bottom: one main action, two quieter ones beside it. */}
      <View style={styles.footer}>
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
        <View style={styles.footerRow}>
          <View style={styles.flex}>
            <Button label={t('My learning')} variant="secondary" onPress={() => router.replace('/learning')} />
          </View>
          <View style={styles.flex}>
            <Button
              label={t('Course page')}
              variant="secondary"
              onPress={() => router.replace({ pathname: '/course/[id]', params: { id: course.id } })}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Star; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Icon size={16} color={colors.accentText} strokeWidth={1.9} />
      <Text style={[type.title, tabularNums, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[type.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={[type.labelStrong, { color: colors.accentText }]}>{n}</Text>
      </View>
      <Text style={[type.body, styles.flex, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: layout.screen },
  hero: { alignItems: 'center', gap: spacing.md, paddingHorizontal: layout.section },
  heroText: { alignItems: 'center', gap: spacing.xs },
  markWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.success,
  },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: radius.pill },
  mark: {
    width: 92,
    height: 92,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cover: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  heading: { marginBottom: spacing.sm },
  steps: { gap: spacing.md },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md },
  right: { flex: 1, textAlign: 'right' },
  footer: {
    marginTop: 'auto',
    gap: spacing.sm,
    paddingHorizontal: layout.screen,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
}));
