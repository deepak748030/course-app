import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  ChartNoAxesColumnIncreasing,
  ChefHat,
  CircleCheck,
  Clapperboard,
  Clock,
  Globe,
  Lock,
  Play,
  ShoppingBasket,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { InstructorCard, LessonRow, ReviewCard } from '@/components/course-cards';
import {
  Accordion,
  Badge,
  EmptyState,
  IconButton,
  MetaItem,
  PrimaryButton,
  ProgressBar,
  RatingSummary,
  ScreenHeader,
} from '@/components/ui';
import { colors, maxContentWidth, radius, screenPadding, shadow, spacing, type } from '@/constants/theme';
import { courseById, instructorById } from '@/data/catalog';
import { useStore } from '@/store';
import type { Lesson } from '@/types';
import { formatDuration, formatInr } from '@/lib/format';

export default function CourseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isEnrolled, isCourseSaved, toggleSavedCourse, completedCount, courseProgressRatio, lessonProgress } =
    useStore();
  const [paywallLesson, setPaywallLesson] = useState<Lesson | null>(null);

  const course = useMemo(() => courseById(id), [id]);
  const instructor = course ? instructorById(course.instructorId) : undefined;

  if (!course || !instructor) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader onBack={() => router.replace('/explore')} />
        <EmptyState
          icon={Clapperboard}
          title="We could not find that course"
          body="The link may be out of date. Browse the catalog to find a course to learn."
          actionLabel="Browse courses"
          onAction={() => router.replace('/explore')}
        />
      </View>
    );
  }

  const enrolled = isEnrolled(course.id);
  const saved = isCourseSaved(course.id);
  const previewLesson = course.lessons.find((lesson) => lesson.isPreview) ?? course.lessons[0];
  const done = completedCount(course);
  const ratio = courseProgressRatio(course);

  const openLesson = (lesson: Lesson) => {
    if (enrolled || lesson.isPreview) {
      router.push({
        pathname: '/lesson/[courseId]/[lessonId]',
        params: { courseId: course.id, lessonId: lesson.id },
      });
      return;
    }
    setPaywallLesson(lesson);
  };

  const buy = () =>
    router.push({ pathname: '/checkout/[id]', params: { id: course.id } });

  const resumeLesson = course.lessons.find((lesson) => !lessonProgress(course.id, lesson.id).completed) ?? course.lessons[0];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={course.cover} style={styles.heroImage} contentFit="cover" transition={200} />
          <LinearGradient
            colors={['rgba(18,20,18,0.55)', 'rgba(18,20,18,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(18,20,18,0)', 'rgba(18,20,18,0.6)']}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroTop, { paddingTop: insets.top + spacing.xs }]}>
            <IconButton
              icon={ArrowLeft}
              variant="onImage"
              accessibilityLabel="Go back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/explore'))}
            />
            <IconButton
              icon={Bookmark}
              variant="onImage"
              active={saved}
              accessibilityLabel={saved ? 'Remove from saved courses' : 'Save this course'}
              onPress={() => toggleSavedCourse(course.id)}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Play free preview: ${previewLesson.title}, ${previewLesson.minutes} minutes`}
            onPress={() => openLesson(previewLesson)}
            style={styles.heroPlay}>
            <View style={styles.playCircle}>
              <Play size={22} color={colors.textInverse} strokeWidth={2} fill={colors.textInverse} />
            </View>
            <Text style={[type.label, { color: colors.textInverse }]}>
              Watch free preview · {previewLesson.minutes} min
            </Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.titleBlock}>
            <Text style={[type.screenTitle, { color: colors.text }]}>{course.title}</Text>
            <Text style={[type.body, { color: colors.textSecondary }]}>{course.promise}</Text>
            <View style={styles.metaWrap}>
              <MetaItem icon={ChartNoAxesColumnIncreasing} label={course.level} />
              <MetaItem icon={Clapperboard} label={`${course.lessonCount} lessons`} />
              <MetaItem icon={Clock} label={formatDuration(course.hours * 60)} />
              <MetaItem icon={Globe} label={course.language} />
            </View>
            <View style={styles.ratingRow}>
              <RatingSummary rating={course.rating} reviewCount={course.reviewCount} />
              {enrolled ? <Badge label={`${done} of ${course.lessonCount} done`} tone="success" icon={CircleCheck} /> : null}
            </View>
          </View>

          <InstructorCard instructor={instructor} />

          {enrolled ? (
            <View style={styles.progressBlock}>
              <ProgressBar value={ratio} accessibilityLabel={`${course.title} progress`} />
              <Text style={[type.meta, { color: colors.textSecondary }]}>
                {Math.round(ratio * 100)}% complete · pick up at “{resumeLesson.title}”
              </Text>
            </View>
          ) : null}

          <Text style={[type.body, { color: colors.textSecondary }]}>{course.description}</Text>

          <View style={styles.section}>
            <Text style={[type.section, { color: colors.text }]}>What you&apos;ll learn</Text>
            <View style={styles.outcomeList}>
              {course.outcomes.map((outcome) => (
                <View key={outcome} style={styles.outcomeRow}>
                  <CircleCheck size={18} color={colors.sage} strokeWidth={1.9} />
                  <Text style={[type.body, { color: colors.text, flex: 1, fontSize: 15.5 }]}>{outcome}</Text>
                </View>
              ))}
            </View>
            <Text style={[type.meta, { color: colors.textSecondary }]}>For {course.audience.toLowerCase()}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={[type.section, { color: colors.text }]}>Curriculum</Text>
              <Text style={[type.meta, { color: colors.textSecondary }]}>
                {course.sections.length} sections · {course.lessonCount} lessons
              </Text>
            </View>
            {course.sections.map((section, index) => {
              const lessons = course.lessons.filter((lesson) => lesson.sectionId === section.id);
              const sectionMinutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
              const hasPreview = lessons.some((lesson) => lesson.isPreview);
              return (
                <Accordion
                  key={section.id}
                  title={section.title}
                  subtitle={`${lessons.length} lessons · ${formatDuration(sectionMinutes)}${
                    hasPreview ? ' · includes free preview' : ''
                  }`}
                  defaultOpen={index === 0}
                  right={!enrolled && !hasPreview ? <Lock size={14} color={colors.textSecondary} strokeWidth={1.9} /> : undefined}>
                  <Text style={[type.supporting, { color: colors.textSecondary }]}>{section.summary}</Text>
                  {lessons.map((lesson, lessonIndex) => {
                    const entry = lessonProgress(course.id, lesson.id);
                    const state = entry.completed
                      ? 'completed'
                      : !enrolled && !lesson.isPreview
                        ? 'locked'
                        : lesson.id === resumeLesson.id && enrolled
                          ? 'current'
                          : 'available';
                    return (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        state={state}
                        index={lessonIndex + 1}
                        onPress={() => openLesson(lesson)}
                      />
                    );
                  })}
                </Accordion>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={[type.section, { color: colors.text }]}>What you&apos;ll need</Text>
            <View style={styles.outcomeList}>
              {course.equipment.map((item) => (
                <View key={item} style={styles.outcomeRow}>
                  <ShoppingBasket size={17} color={colors.textSecondary} strokeWidth={1.9} />
                  <Text style={[type.body, { color: colors.textSecondary, flex: 1, fontSize: 15.5 }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[type.section, { color: colors.text }]}>Your instructor</Text>
            <View style={[styles.instructorCard, shadow.card]}>
              <View style={styles.instructorHead}>
                <Image source={instructor.portrait} style={styles.instructorPortrait} contentFit="cover" transition={180} />
                <View style={styles.flex}>
                  <View style={styles.nameRow}>
                    <Text style={[type.cardTitle, { color: colors.text }]}>{instructor.name}</Text>
                    {instructor.verified ? <BadgeCheck size={16} color={colors.sage} strokeWidth={2} /> : null}
                  </View>
                  <Text style={[type.meta, { color: colors.textSecondary }]}>
                    {instructor.city} · {instructor.yearsTeaching} years teaching
                  </Text>
                </View>
              </View>
              <Text style={[type.supporting, { color: colors.textSecondary }]}>{instructor.bio}</Text>
              <View style={styles.teachingRow}>
                <ChefHat size={16} color={colors.sage} strokeWidth={1.9} />
                <Text style={[type.supporting, { color: colors.text, flex: 1 }]}>{instructor.teachingStyle}</Text>
              </View>
              <PrimaryButton
                label="View instructor profile"
                variant="secondary"
                onPress={() => router.push({ pathname: '/instructor/[id]', params: { id: instructor.id } })}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={[type.section, { color: colors.text }]}>Reviews</Text>
              <RatingSummary rating={course.rating} reviewCount={course.reviewCount} />
            </View>
            {course.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
            <Text style={[type.meta, { color: colors.textSecondary }]}>
              Showing {course.reviews.length} of {course.reviewCount.toLocaleString('en-IN')} sample reviews. Ratings and
              reviews in this prototype are authored sample content.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.stickyBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        {enrolled ? (
          <>
            <View style={styles.flex}>
              <Text style={[type.meta, { color: colors.textSecondary }]}>You own this course</Text>
              <Text style={[type.cardTitle, { color: colors.text, fontSize: 17 }]} numberOfLines={1}>
                {resumeLesson.title}
              </Text>
            </View>
            <PrimaryButton
              label={done === 0 ? 'Start learning' : 'Continue'}
              fullWidth={false}
              icon={Play}
              onPress={() =>
                router.push({
                  pathname: '/lesson/[courseId]/[lessonId]',
                  params: { courseId: course.id, lessonId: resumeLesson.id },
                })
              }
            />
          </>
        ) : (
          <>
            <View style={styles.flex}>
              <View style={styles.priceLine}>
                <Text style={[type.screenTitle, { color: colors.text, fontSize: 24, lineHeight: 30 }]}>
                  {formatInr(course.priceInr)}
                </Text>
                {course.listPriceInr ? (
                  <Text style={[type.supporting, styles.strike, { color: colors.textSecondary }]}>
                    {formatInr(course.listPriceInr)}
                  </Text>
                ) : null}
              </View>
              <Text style={[type.meta, { color: colors.textSecondary }]}>One-time purchase · demo checkout</Text>
            </View>
            <PrimaryButton label="Buy course" fullWidth={false} onPress={buy} />
          </>
        )}
      </View>

      <BottomSheet
        visible={Boolean(paywallLesson)}
        onClose={() => setPaywallLesson(null)}
        title="Unlock this course"
        subtitle={paywallLesson ? `“${paywallLesson.title}” is part of ${course.title}.` : undefined}>
        <Text style={[type.body, { color: colors.textSecondary }]}>
          Buy the course to watch all {course.lessonCount} lessons, keep notes on every lesson and track your progress.
          The free preview lessons stay open to everyone.
        </Text>
        <View style={styles.paywallActions}>
          <PrimaryButton
            label={`Buy for ${formatInr(course.priceInr)}`}
            onPress={() => {
              setPaywallLesson(null);
              buy();
            }}
          />
          {previewLesson ? (
            <PrimaryButton
              label="Watch a free preview instead"
              variant="ghost"
              onPress={() => {
                const lesson = previewLesson;
                setPaywallLesson(null);
                router.push({
                  pathname: '/lesson/[courseId]/[lessonId]',
                  params: { courseId: course.id, lessonId: lesson.id },
                });
              }}
            />
          ) : null}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  flex: { flex: 1 },
  hero: { backgroundColor: colors.player },
  heroImage: { width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.surfaceWarm },
  heroTop: {
    position: 'absolute',
    top: 0,
    left: screenPadding,
    right: screenPadding,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroPlay: { position: 'absolute', left: screenPadding, bottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  playCircle: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(18,20,18,0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: screenPadding, gap: spacing.xl, paddingTop: spacing.lg },
  titleBlock: { gap: spacing.sm },
  metaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  progressBlock: { gap: spacing.xs },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  outcomeList: { gap: spacing.sm },
  outcomeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  instructorCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md, gap: spacing.sm },
  instructorHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  instructorPortrait: { width: 60, height: 60, borderRadius: radius.pill, backgroundColor: colors.surfaceWarm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  teachingRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  strike: { textDecorationLine: 'line-through' },
  paywallActions: { gap: spacing.xs },
});
