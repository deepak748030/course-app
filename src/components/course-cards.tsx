/**
 * Course, instructor, lesson and price components.
 * Cards own their navigation target (always the course screen) so screens stay declarative;
 * anything that needs a decision (paywall vs player) takes an onPress instead.
 */

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  BadgeCheck,
  Bookmark,
  ChartNoAxesColumnIncreasing,
  ChefHat,
  CircleCheck,
  Clapperboard,
  Clock,
  Lock,
  Play,
  Star,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText, Badge, IconButton, MetaItem, ProgressBar, RatingSummary, usePressScale } from '@/components/ui';
import { colors, radius, shadow, spacing, type } from '@/constants/theme';
import { instructorById } from '@/data/catalog';
import { useStore } from '@/store';
import type { Course, Instructor, Lesson, Review } from '@/types';
import { formatDuration, formatInr } from '@/lib/format';

function priceLabel(course: Course) {
  return course.priceInr === 0 ? 'Free' : formatInr(course.priceInr);
}

function instructorName(course: Course) {
  return instructorById(course.instructorId)?.name ?? 'Rasoi Studio instructor';
}

function courseMetaLabel(course: Course) {
  return `${course.title} by ${instructorName(course)}. ${course.level}, ${course.lessonCount} lessons, ${formatDuration(
    course.hours * 60,
  )}, ${priceLabel(course)}.`;
}

/* ------------------------------------------------------------------ *
 * Course cards
 * ------------------------------------------------------------------ */

export function CourseCardLarge({
  course,
  footer,
  style,
}: {
  course: Course;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const { isCourseSaved, toggleSavedCourse } = useStore();
  const saved = isCourseSaved(course.id);
  const press = usePressScale(0.985);
  const instructor = instructorName(course);

  return (
    <Animated.View style={[styles.card, shadow.card, press.style, style]}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={courseMetaLabel(course)}
        onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={styles.cardPressable}>
        <Image source={course.cover} style={styles.cardImage} contentFit="cover" transition={180} />
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <AppText variant="cardTitle" style={styles.flex} numberOfLines={2}>
              {course.title}
            </AppText>
          </View>
          <Text style={[type.supporting, { color: colors.textSecondary }]} numberOfLines={1}>
            {instructor}
          </Text>
          <View style={styles.metaRow}>
            <MetaItem icon={ChartNoAxesColumnIncreasing} label={course.level} />
            <MetaItem icon={Clapperboard} label={`${course.lessonCount} lessons`} />
            <MetaItem icon={Clock} label={formatDuration(course.hours * 60)} />
          </View>
          <View style={styles.priceRow}>
            <Text style={[type.cardTitle, { color: colors.text }]}>{priceLabel(course)}</Text>
            {course.listPriceInr ? (
              <Text style={[type.supporting, styles.strike, { color: colors.textSecondary }]}>
                {formatInr(course.listPriceInr)}
              </Text>
            ) : null}
            <View style={styles.flex} />
            <RatingSummary rating={course.rating} reviewCount={course.reviewCount} />
          </View>
          {footer}
        </View>
      </Pressable>
      <View style={styles.bookmarkSlot}>
        <IconButton
          icon={Bookmark}
          variant="onImage"
          active={saved}
          accessibilityLabel={saved ? `Remove ${course.title} from saved` : `Save ${course.title}`}
          onPress={() => toggleSavedCourse(course.id)}
        />
      </View>
    </Animated.View>
  );
}

export function CourseCardCompact({ course }: { course: Course }) {
  const router = useRouter();
  const { isCourseSaved, toggleSavedCourse } = useStore();
  const saved = isCourseSaved(course.id);
  const instructor = instructorName(course);

  return (
    <View style={[styles.compactCard, shadow.card]}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${course.title} by ${instructor}. ${course.level}, ${formatDuration(course.hours * 60)}, ${priceLabel(course)}.`}
        onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
        style={{ gap: spacing.sm }}>
        <Image source={course.cover} style={styles.compactImage} contentFit="cover" transition={180} />
        <View style={{ gap: spacing.xxs }}>
          <Text style={[type.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {course.title}
          </Text>
          <Text style={[type.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {instructor}
          </Text>
          <View style={styles.metaRow}>
            <MetaItem icon={Clapperboard} label={`${course.lessonCount}`} />
            <MetaItem icon={Clock} label={formatDuration(course.hours * 60)} />
          </View>
          <View style={styles.priceRow}>
            <Text style={[type.label, { color: colors.text }]}>{priceLabel(course)}</Text>
            <View style={styles.flex} />
            <RatingSummary rating={course.rating} size={12} />
          </View>
        </View>
      </Pressable>
      <View style={styles.compactBookmark}>
        <IconButton
          icon={Bookmark}
          variant="onImage"
          size={40}
          iconSize={18}
          active={saved}
          accessibilityLabel={saved ? `Remove ${course.title} from saved` : `Save ${course.title}`}
          onPress={() => toggleSavedCourse(course.id)}
        />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Instructor
 * ------------------------------------------------------------------ */

export function InstructorCard({
  instructor,
  variant = 'row',
}: {
  instructor: Instructor;
  variant?: 'row' | 'spotlight';
}) {
  const router = useRouter();
  const open = () => router.push({ pathname: '/instructor/[id]', params: { id: instructor.id } });

  if (variant === 'spotlight') {
    return (
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${instructor.name}, ${instructor.headline}`}
        onPress={open}
        style={({ pressed }) => [styles.spotlight, shadow.card, pressed && { opacity: 0.9 }]}>
        <Image source={instructor.portrait} style={styles.spotlightPortrait} contentFit="cover" transition={180} />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <Text style={[type.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {instructor.name}
            </Text>
            {instructor.verified ? <BadgeCheck size={16} color={colors.sage} strokeWidth={2} /> : null}
          </View>
          <Text style={[type.supporting, { color: colors.textSecondary }]} numberOfLines={2}>
            {instructor.headline}
          </Text>
          <View style={styles.metaRow}>
            <MetaItem icon={ChefHat} label={`${instructor.yearsTeaching} yrs teaching`} />
            <MetaItem icon={Clock} label={instructor.city} />
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${instructor.name}, ${instructor.headline}`}
      onPress={open}
      style={({ pressed }) => [styles.instructorRow, pressed && { opacity: 0.75 }]}>
      <Image source={instructor.portrait} style={styles.instructorAvatar} contentFit="cover" transition={150} />
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <Text style={[type.body, { color: colors.text, fontFamily: type.label.fontFamily }]} numberOfLines={1}>
            {instructor.name}
          </Text>
          {instructor.verified ? <BadgeCheck size={15} color={colors.sage} strokeWidth={2} /> : null}
        </View>
        <Text style={[type.supporting, { color: colors.textSecondary }]} numberOfLines={2}>
          {instructor.headline}
        </Text>
      </View>
      <Text style={[type.body, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ *
 * Lessons
 * ------------------------------------------------------------------ */

export type LessonRowState = 'completed' | 'current' | 'available' | 'locked';

export function LessonRow({
  lesson,
  state,
  index,
  onPress,
}: {
  lesson: Lesson;
  state: LessonRowState;
  index?: number;
  onPress: () => void;
}) {
  const locked = state === 'locked';
  const icon = locked ? Lock : state === 'completed' ? CircleCheck : Play;
  const Icon = icon;
  const iconColor = locked
    ? colors.textSecondary
    : state === 'completed'
      ? colors.success
      : state === 'current'
        ? colors.primary
        : colors.textSecondary;

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${lesson.title}, ${lesson.minutes} minutes${
        lesson.isPreview ? ', free preview' : locked ? ', locked' : ''
      }`}
      accessibilityState={{ disabled: false, selected: state === 'current' }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.lessonRow,
        state === 'current' && { backgroundColor: colors.primarySoft },
        pressed && { opacity: 0.75 },
      ]}>
      <View style={[styles.lessonIcon, state === 'current' && { backgroundColor: colors.surface }]}>
        <Icon size={18} color={iconColor} strokeWidth={1.9} />
      </View>
      <View style={styles.flex}>
        <Text
          style={[type.body, { color: locked ? colors.textSecondary : colors.text, fontSize: 15.5 }]}
          numberOfLines={2}>
          {index !== undefined ? `${index}. ` : ''}
          {lesson.title}
        </Text>
        <View style={styles.metaRow}>
          <MetaItem icon={Clock} label={`${lesson.minutes} min`} />
          {lesson.isPreview ? <Badge label="Free preview" tone="sage" /> : null}
          {state === 'completed' ? <Badge label="Completed" tone="success" /> : null}
        </View>
      </View>
      {locked ? <Lock size={15} color={colors.textSecondary} strokeWidth={1.9} /> : null}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ *
 * Price and reviews
 * ------------------------------------------------------------------ */

export function PriceSummary({
  course,
  couponPercent = 0,
  couponCode,
}: {
  course: Course;
  couponPercent?: number;
  couponCode?: string;
}) {
  const discountFromList = course.listPriceInr ? course.listPriceInr - course.priceInr : 0;
  const couponValue = Math.round((course.priceInr * couponPercent) / 100);
  const total = course.priceInr - couponValue;

  return (
    <View style={styles.priceSummary}>
      <Row label="Course price" value={formatInr(course.listPriceInr ?? course.priceInr)} />
      {discountFromList > 0 ? <Row label="Course discount" value={`− ${formatInr(discountFromList)}`} tone="success" /> : null}
      {couponValue > 0 ? (
        <Row label={`Coupon ${couponCode ?? ''}`.trim()} value={`− ${formatInr(couponValue)}`} tone="success" />
      ) : null}
      <View style={styles.summaryDivider} />
      <Row label="Total payable" value={formatInr(total)} strong />
      <Text style={[type.meta, { color: colors.textSecondary }]}>Inclusive of taxes. Demo checkout — no payment is processed.</Text>
    </View>
  );
}

function Row({
  label,
  value,
  tone = 'default',
  strong = false,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success';
  strong?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[strong ? type.cardTitle : type.body, { color: colors.text }]}>{label}</Text>
      <Text
        style={[
          strong ? type.cardTitle : type.body,
          { color: tone === 'success' ? colors.success : colors.text, fontFamily: strong ? type.button.fontFamily : type.body.fontFamily },
        ]}>
        {value}
      </Text>
    </View>
  );
}

export function ReviewCard({ review }: { review: Review }) {
  return (
    <View style={[styles.reviewCard, shadow.card]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <Text style={[type.label, { color: colors.sage }]}>{review.author.charAt(0)}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={[type.label, { color: colors.text }]}>{review.author}</Text>
          <Text style={[type.meta, { color: colors.textSecondary }]}>{review.context}</Text>
        </View>
        <View style={styles.reviewStars}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              size={12}
              color={colors.gold}
              strokeWidth={1.6}
              fill={index < review.rating ? colors.gold : 'none'}
            />
          ))}
        </View>
      </View>
      <Text style={[type.supporting, { color: colors.textSecondary }]}>{review.body}</Text>
    </View>
  );
}

/** Continue-learning card used on Home and My Learning. */
export function ContinueCard({
  course,
  lessonTitle,
  progress,
  onPress,
}: {
  course: Course;
  lessonTitle: string;
  progress: number;
  onPress: () => void;
}) {
  const press = usePressScale(0.99);
  return (
    <Animated.View style={[styles.continueCard, shadow.card, press.style]}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Continue ${course.title}. Next up: ${lessonTitle}. ${Math.round(progress * 100)} percent complete.`}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={styles.continueInner}>
        <Image source={course.cover} style={styles.continueImage} contentFit="cover" transition={150} />
        <View style={styles.flex}>
          <Text style={[type.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {course.title}
          </Text>
          <Text style={[type.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {lessonTitle}
          </Text>
          <ProgressBar value={progress} accessibilityLabel={`${course.title} progress`} />
          <Text style={[type.meta, { color: colors.textSecondary }]}>{Math.round(progress * 100)}% complete</Text>
        </View>
        <View style={styles.continuePlay}>
          <Play size={18} color={colors.textInverse} strokeWidth={2} fill={colors.textInverse} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' },
  cardPressable: {},
  cardImage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.surfaceWarm },
  cardBody: { padding: spacing.md, gap: spacing.xs },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  strike: { textDecorationLine: 'line-through' },
  bookmarkSlot: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  compactCard: {
    width: 252,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  compactImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.image, backgroundColor: colors.surfaceWarm },
  compactBookmark: { position: 'absolute', top: spacing.sm + spacing.xxs, right: spacing.sm + spacing.xxs },
  spotlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  spotlightPortrait: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.surfaceWarm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  instructorAvatar: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.surfaceWarm },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.input,
  },
  lessonIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceSummary: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.xxs },
  reviewCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md, gap: spacing.sm },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.sageSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewStars: { flexDirection: 'row', gap: 2 },
  continueCard: { backgroundColor: colors.surface, borderRadius: radius.card },
  continueInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm },
  continueImage: { width: 92, height: 92, borderRadius: radius.image, backgroundColor: colors.surfaceWarm },
  continuePlay: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
