/**
 * Course, instructor, lesson and price components.
 *
 * Rules honoured here:
 * - No shadows. Cards are built from a white surface + hairline border; artwork fills the
 *   top edge and is clipped by the card radius (edge-to-edge image, concentric corners).
 * - Dividers (not gaps) inside data lists; 8px gaps inside a rail.
 * - Prices, ratings and counters use tabular figures so columns never wobble.
 * - Every visible metric has a reason to be on the card; nothing is decorative.
 */

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  BadgeCheck,
  Bookmark,
  ChartNoAxesColumnIncreasing,
  CircleCheck,
  Clapperboard,
  Clock,
  Lock,
  Play,
  Star,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { Badge, IconButton, MetaItem, ProgressBar, usePressScale } from '@/components/ui';
import { colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { instructorById } from '@/data/catalog';
import { formatDuration, formatInr } from '@/lib/format';
import { useStore } from '@/store';
import type { Course, Instructor, Lesson, Review } from '@/types';

function priceLabel(course: Course) {
  return course.priceInr === 0 ? 'Free' : formatInr(course.priceInr);
}

function instructorName(course: Course) {
  return instructorById(course.instructorId)?.name ?? 'Rasoi Studio instructor';
}

function openCourse(router: ReturnType<typeof useRouter>, id: string) {
  router.push({ pathname: '/course/[id]', params: { id } });
}

/** Rail card: fixed width, 4:3 artwork, title, instructor, rating + price row. */
export function CourseCard({ course, style }: { course: Course; style?: StyleProp<ViewStyle> }) {
  const router = useRouter();
  const { isCourseSaved, toggleSavedCourse } = useStore();
  const saved = isCourseSaved(course.id);
  const press = usePressScale(0.985);

  return (
    <Animated.View style={[styles.card, press.style, style]}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${course.title} by ${instructorName(course)}. ${course.level}, ${course.lessonCount} lessons, ${formatDuration(
          course.hours * 60,
        )}, ${priceLabel(course)}.`}
        onPress={() => openCourse(router, course.id)}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}>
        <View style={styles.cardImageWrap}>
          <Image source={course.cover} style={styles.cardImage} contentFit="cover" transition={160} />
          <View style={styles.cardImageBadge}>
            <Badge label={course.level} tone="neutral" />
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
            {course.title}
          </Text>
          <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={1}>
            {instructorName(course)}
          </Text>

          <View style={styles.cardMeta}>
            <View style={styles.ratingRow}>
              <Star size={12} color={colors.gold} strokeWidth={0} fill={colors.gold} />
              <Text style={[type.labelStrong, tabularNums, { color: colors.text }]}>{course.rating.toFixed(1)}</Text>
              <Text style={[type.label, tabularNums, { color: colors.textSubtle }]}>
                ({course.reviewCount.toLocaleString('en-IN')})
              </Text>
            </View>
            <View style={styles.flex} />
            <Text style={[type.bodyStrong, tabularNums, { color: colors.text }]}>{priceLabel(course)}</Text>
          </View>

          <View style={styles.cardFooter}>
            <MetaItem icon={Clapperboard} label={`${course.lessonCount} lessons`} />
            <MetaItem icon={Clock} label={formatDuration(course.hours * 60)} />
          </View>
        </View>
      </Pressable>

      <View style={styles.cardBookmark}>
        <IconButton
          icon={Bookmark}
          size={32}
          iconSize={16}
          variant="onImage"
          active={saved}
          accessibilityLabel={saved ? `Remove ${course.title} from saved` : `Save ${course.title}`}
          onPress={() => toggleSavedCourse(course.id)}
        />
      </View>
    </Animated.View>
  );
}

/** List row used on Explore / Saved: 96px artwork, details, price. Dividers come from DataList. */
export function CourseRow({ course }: { course: Course }) {
  const router = useRouter();
  const { isCourseSaved, toggleSavedCourse } = useStore();
  const saved = isCourseSaved(course.id);

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${course.title} by ${instructorName(course)}. ${course.level}, ${formatDuration(
        course.hours * 60,
      )}, ${priceLabel(course)}.`}
      onPress={() => openCourse(router, course.id)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <Image source={course.cover} style={styles.rowImage} contentFit="cover" transition={140} />

      <View style={styles.flex}>
        <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
          {course.title}
        </Text>
        <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={1}>
          {instructorName(course)}
        </Text>
        <View style={styles.rowMeta}>
          <MetaItem icon={ChartNoAxesColumnIncreasing} label={course.level} />
          <MetaItem icon={Clock} label={formatDuration(course.hours * 60)} />
        </View>
        <View style={styles.rowPriceLine}>
          <Text style={[type.bodyStrong, tabularNums, { color: colors.text }]}>{priceLabel(course)}</Text>
          {course.listPriceInr ? (
            <Text style={[type.label, styles.strike, tabularNums, { color: colors.textSubtle }]}>
              {formatInr(course.listPriceInr)}
            </Text>
          ) : null}
          <View style={styles.flex} />
          <View style={styles.ratingRow}>
            <Star size={12} color={colors.gold} strokeWidth={0} fill={colors.gold} />
            <Text style={[type.labelStrong, tabularNums, { color: colors.text }]}>{course.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>

      <IconButton
        icon={Bookmark}
        size={32}
        iconSize={16}
        variant={saved ? 'soft' : 'plain'}
        active={saved}
        accessibilityLabel={saved ? `Remove ${course.title} from saved` : `Save ${course.title}`}
        onPress={() => toggleSavedCourse(course.id)}
      />
    </Pressable>
  );
}

/** Continue-learning row: thumbnail, next lesson, progress. */
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
    <Animated.View style={press.style}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Continue ${course.title}. Next up: ${lessonTitle}. ${Math.round(
          progress * 100,
        )} percent complete.`}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => [styles.continueRow, pressed && { opacity: 0.75 }]}>
        <Image source={course.cover} style={styles.continueImage} contentFit="cover" transition={140} />
        <View style={styles.flex}>
          <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={1}>
            {course.title}
          </Text>
          <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
            {lessonTitle}
          </Text>
          <View style={styles.continueProgress}>
            <ProgressBar value={progress} accessibilityLabel={`${course.title} progress`} />
            <Text style={[type.label, tabularNums, { color: colors.textMuted }]}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>
        <View style={styles.continuePlay}>
          <Play size={16} color={colors.textInverse} strokeWidth={2} fill={colors.textInverse} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function InstructorRow({ instructor, onPress }: { instructor: Instructor; onPress?: () => void }) {
  const router = useRouter();
  const open = onPress ?? (() => router.push({ pathname: '/instructor/[id]', params: { id: instructor.id } }));

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${instructor.name}, ${instructor.headline}. Open profile.`}
      onPress={open}
      style={({ pressed }) => [styles.instructorRow, pressed && { opacity: 0.7 }]}>
      <Image source={instructor.portrait} style={styles.instructorAvatar} contentFit="cover" transition={140} />
      <View style={styles.flex}>
        <View style={styles.instructorName}>
          <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={1}>
            {instructor.name}
          </Text>
          {instructor.verified ? <BadgeCheck size={14} color={colors.sage} strokeWidth={2} /> : null}
        </View>
        <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={2}>
          {instructor.headline}
        </Text>
        <View style={styles.rowMeta}>
          <MetaItem icon={Clapperboard} label={`${instructor.yearsTeaching} yrs teaching`} />
          <MetaItem icon={ChartNoAxesColumnIncreasing} label={instructor.city} />
        </View>
      </View>
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
  const Icon = locked ? Lock : state === 'completed' ? CircleCheck : Play;
  const iconColor = locked
    ? colors.textSubtle
    : state === 'completed'
      ? colors.success
      : state === 'current'
        ? colors.primary
        : colors.textMuted;

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Lesson ${index !== undefined ? `${index}. ` : ''}${lesson.title}, ${lesson.minutes} minutes${
        lesson.isPreview ? ', free preview' : locked ? ', locked until purchase' : ''
      }`}
      accessibilityState={{ selected: state === 'current' }}
      onPress={onPress}
      style={({ pressed }) => [styles.lessonRow, pressed && { opacity: 0.7 }]}>
      {index !== undefined ? (
        <Text style={[type.label, tabularNums, styles.lessonIndex, { color: colors.textSubtle }]}>
          {String(index).padStart(2, '0')}
        </Text>
      ) : null}
      <View style={styles.flex}>
        <Text style={[type.body, locked ? { color: colors.textMuted } : { color: colors.text }]} numberOfLines={2}>
          {lesson.title}
        </Text>
        <View style={styles.lessonMeta}>
          <Text style={[type.label, tabularNums, { color: colors.textSubtle }]}>{lesson.minutes} min</Text>
          {lesson.isPreview ? <Badge label="Free preview" tone="sage" /> : null}
          {state === 'completed' ? <Badge label="Completed" tone="success" /> : null}
          {state === 'current' ? <Badge label="Next up" tone="primary" /> : null}
        </View>
      </View>
      <Icon size={16} color={iconColor} strokeWidth={1.75} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ *
 * Price & reviews
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
    <View style={styles.summary}>
      <SummaryRow label="Course price" value={formatInr(course.listPriceInr ?? course.priceInr)} />
      {discountFromList > 0 ? (
        <SummaryRow label="Course discount" value={`− ${formatInr(discountFromList)}`} tone="success" />
      ) : null}
      {couponValue > 0 ? (
        <SummaryRow label={`Coupon ${couponCode ?? ''}`.trim()} value={`− ${formatInr(couponValue)}`} tone="success" />
      ) : null}
      <View style={styles.summaryDivider} />
      <SummaryRow label="Total payable" value={formatInr(total)} strong />
      <Text style={[type.label, { color: colors.textMuted }]}>
        Inclusive of taxes. Demo checkout — no payment is processed.
      </Text>
    </View>
  );
}

function SummaryRow({
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
      <Text style={[strong ? type.bodyStrong : type.body, { color: colors.text }]}>{label}</Text>
      <Text
        style={[
          strong ? type.bodyStrong : type.body,
          tabularNums,
          { color: tone === 'success' ? colors.success : colors.text },
        ]}>
        {value}
      </Text>
    </View>
  );
}

export function ReviewCard({ review }: { review: Review }) {
  return (
    <View style={styles.review}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <Text style={[type.labelStrong, { color: colors.sage }]}>{review.author.charAt(0)}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={[type.bodyStrong, { color: colors.text }]}>{review.author}</Text>
          <Text style={[type.label, { color: colors.textSubtle }]}>{review.context}</Text>
        </View>
        <View style={styles.reviewStars}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              size={12}
              color={colors.gold}
              strokeWidth={index < review.rating ? 0 : 1.5}
              fill={index < review.rating ? colors.gold : 'none'}
            />
          ))}
        </View>
      </View>
      <Text style={[type.body, { color: colors.textMuted }]}>{review.body}</Text>
    </View>
  );
}

/** Hero / course-detail purchase bar. Flush to the screen edges, safe area handled by caller. */
export function StickyBar({
  children,
  bottomInset,
}: {
  children: React.ReactNode;
  bottomInset: number;
}) {
  return (
    <View style={[styles.stickyBar, { paddingBottom: bottomInset + spacing.sm }]}>
      <View style={styles.stickyInner}>{children}</View>
    </View>
  );
}

export function RatingInline({ rating, reviewCount }: { rating: number; reviewCount?: number }) {
  return (
    <View style={styles.ratingRow}>
      <Star size={13} color={colors.gold} strokeWidth={0} fill={colors.gold} />
      <Text style={[type.labelStrong, tabularNums, { color: colors.text }]}>{rating.toFixed(1)}</Text>
      {reviewCount !== undefined ? (
        <Text style={[type.label, tabularNums, { color: colors.textSubtle }]}>
          ({reviewCount.toLocaleString('en-IN')})
        </Text>
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  flex: { flex: 1 },
  strike: { textDecorationLine: 'line-through' },

  card: {
    width: 200,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardImageWrap: { backgroundColor: colors.surfaceAlt },
  cardImage: { width: '100%', aspectRatio: 4 / 3 },
  cardImageBadge: { position: 'absolute', left: spacing.sm, bottom: spacing.sm },
  cardBody: { padding: spacing.sm, gap: spacing.xs },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardBookmark: { position: 'absolute', top: spacing.sm, right: spacing.sm },

  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, alignItems: 'flex-start' },
  rowImage: { width: 96, height: 72, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 2, flexWrap: 'wrap' },
  rowPriceLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screen,
    paddingVertical: spacing.md,
  },
  continueImage: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  continueProgress: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  continuePlay: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  instructorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: layout.screen, paddingVertical: spacing.md },
  instructorAvatar: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  instructorName: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: layout.screen,
  },
  lessonIndex: { width: 20 },
  lessonMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2, flexWrap: 'wrap' },

  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  summaryDivider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.xs },

  review: { paddingHorizontal: layout.screen, paddingVertical: spacing.md, gap: spacing.sm },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reviewAvatar: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' },
  reviewStars: { flexDirection: 'row', gap: 1 },

  stickyBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stickyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screen,
    paddingTop: spacing.md,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
  },
});
