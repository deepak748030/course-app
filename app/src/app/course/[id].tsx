import { Image } from 'expo-image';
import { CourseImage } from '@/components/course-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  CircleCheck,
  Clapperboard,
  Clock,
  Globe,
  ListVideo,
  Play,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo, useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppStatusBar } from '@/components/app-status-bar';
import { CatalogSkeleton } from '@/components/skeletons';
import { BottomSheet } from '@/components/bottom-sheet';
import { AnimatedCart, AnimatedCheck, AnimatedIcon } from '@/components/animated-icons';
import { OfferMark } from '@/components/offer-tag';
import { CourseCard, LessonRow, ReviewCard, StickyBar, type LessonRowState } from '@/components/course-cards';
import { StarsDisplay } from '@/components/rating-input';
import { RatingStar } from '@/components/rating-star';
import { SaveButton } from '@/components/save-button';
import { Badge, Button, DataList, EmptyState, IconButton, ProgressBar, Screen, Scrim, SectionHeader } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { discountPercent } from '@/lib/catalog';
import { api, type ServerReview } from '@/services/api';
import { mapCourse } from '@/services/catalogService';
import { track } from '@/services/analytics';
import { useCatalog } from '@/services/catalog-context';
import { useT } from '@/i18n';
import { formatDuration, formatInr, lessonLength } from '@/lib/format';
import { useStore } from '@/store';
import type { Course, Lesson, Review } from '@/types';

/** `8 lessons · 2h 15m` */
function curriculumSummary(course: Course): string {
  const minutes = course.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
  return `${course.lessonCount} lessons · ${formatDuration(minutes)}`;
}

export default function CourseDetailsScreen() {
  const t = useT();

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isEnrolled, isCourseSaved, toggleSavedCourse, completedCount, courseProgressRatio, lessonProgress, ratingFor } = useStore();
  const { byId, categories, status, refresh } = useCatalog();
  const [paywallLesson, setPaywallLesson] = useState<Lesson | null>(null);

  const course = useMemo(() => byId(id), [byId, id]);

  // Every landing on this page is one view for the academy's analytics.
  useEffect(() => {
    if (course) track('course_viewed', { courseId: course.remoteId });
  }, [course?.remoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Related courses (co-purchase, else same track) — powers the recommendation rail.
  const [related, setRelated] = useState<Course[]>([]);
  useEffect(() => {
    if (!course) return;
    let cancelled = false;
    setRelated([]);
    api
      .relatedCourses(course.remoteId)
      .then(({ courses: next }) => {
        if (!cancelled) setRelated(next.map(mapCourse));
      })
      .catch(() => {}); // offline or empty: the rail simply stays hidden
    return () => {
      cancelled = true;
    };
  }, [course?.remoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reviews live on the server — fetched per course page, not bundled.
  const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => {
    if (!course) return;
    let cancelled = false;
    setReviews([]);
    api
      .courseReviews(course.remoteId)
      .then(({ reviews: next }) => {
        if (!cancelled) {
          setReviews(next.map((review) => ({ id: review._id, author: review.author, rating: review.rating, body: review.body, context: '' })));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [course?.remoteId]); // eslint-disable-line react-hooks/exhaustive-deps
  const rating = course ? ratingFor(course.id) : null;
  const offer = course ? discountPercent(course) : null;
  const categoryLabel = useMemo(
    () => categories.find((category) => category.id === course?.categoryId)?.label ?? 'Course',
    [course?.categoryId, categories],
  );

  if (!course) {
    return (
      <Screen header={<CourseAppBar />}>
        {status === 'error' ? (
          <EmptyState
            icon={Clapperboard}
            title={t("Can't reach the academy")}
            body={t("The course server is not responding. Check your connection and try again.")}
            actionLabel={t("Try again")}
            onAction={() => void refresh()}
          />
        ) : status === 'loading' ? (
          <CatalogSkeleton />
        ) : (
          <EmptyState
            icon={Clapperboard}
            title={t("We could not find that course")}
            body={t("This link may be out of date. Browse the catalog to find a course to learn.")}
            actionLabel={t("Browse courses")}
            onAction={() => router.replace('/explore')}
          />
        )}
      </Screen>
    );
  }

  const enrolled = isEnrolled(course.id);
  const saved = isCourseSaved(course.id);
  const previewLesson = course.lessons.find((lesson) => lesson.isPreview) ?? course.lessons[0];
  const done = completedCount(course);
  const ratio = courseProgressRatio(course);
  const resumeLesson = course.lessons.find((lesson) => !lessonProgress(course.id, lesson.id).completed) ?? course.lessons[0];

  const openLesson = (lesson: Lesson) => {
    if (enrolled || lesson.isPreview) {
      router.push({ pathname: '/lesson/[courseId]/[lessonId]', params: { courseId: course.id, lessonId: lesson.id } });
      return;
    }
    setPaywallLesson(lesson);
  };

  const stateFor = (lesson: Lesson): LessonRowState => {
    if (lessonProgress(course.id, lesson.id).completed) return 'completed';
    if (!enrolled && !lesson.isPreview) return 'locked';
    if (enrolled && lesson.id === resumeLesson.id) return 'current';
    return 'available';
  };

  return (
    <View style={styles.root}>
      <AppStatusBar />
      <Screen
        contentStyle={{ paddingBottom: insets.bottom + 120 }}
        header={
          <View style={styles.hero}>
            <CourseImage source={course.cover} style={styles.heroImage} transition={200} />
            <Scrim to={colors.scrim} />
            <View style={[styles.heroBar, { paddingTop: insets.top + spacing.xs }]}>
              <IconButton
                icon={ArrowLeft}
                variant="onImage"
                accessibilityLabel={t("Go back")}
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/explore'))}
              />
              <SaveButton
                saved={saved}
                variant="onImage"
                accessibilityLabel={saved ? 'Remove from saved courses' : 'Save this course'}
                onToggle={() => toggleSavedCourse(course.id)}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Play free preview: ${previewLesson.title}, ${lessonLength(previewLesson)}`}
              onPress={() => openLesson(previewLesson)}
              style={styles.heroPlay}>
              <View style={styles.playCircle}>
                <Play size={20} color={colors.textInverse} strokeWidth={2} fill={colors.textInverse} />
              </View>
              <Text style={[type.labelStrong, { color: colors.textInverse }]}>
                Watch free preview · {lessonLength(previewLesson)}
              </Text>
            </Pressable>
            {/* The discount sits where the player puts its own secondary controls: bottom right,
                the animated tag and the label straight on the scrim — not a badge pasted into the
                text. The tag is the same composition the badges play, tinted for artwork. */}
            {offer ? (
              <View style={styles.heroOffer} accessible accessibilityLabel={`${offer} percent off this course`}>
                <OfferMark percent={offer} color={colors.textInverse} />
              </View>
            ) : null}
          </View>
        }>
        {/* Title block. Reads as a title: an uppercase overline, the largest type on the screen,
            one paragraph, then the facts on their own tone block. The rating is the one thing that
            belongs beside the title rather than under it, so it takes the empty column on the right
            and the block below stays three lines tall instead of six. */}
        <View style={styles.intro}>
          <View style={styles.titleRow}>
            <View style={styles.titleText}>
              <Text style={[type.overline, { color: colors.textSubtle }]}>
                {categoryLabel} · {t(course.level)}
              </Text>
              <Text style={[type.display, { color: colors.text }]}>{course.title}</Text>
            </View>
            <RatingStar rating={course.rating} reviewCount={course.reviewCount} />
          </View>
          <Text style={[type.body, { color: colors.textMuted }]}>{course.promise}</Text>

          <View style={styles.facts}>
            <FactItem icon={Clapperboard} label={`${course.lessonCount} lessons`} />
            <FactItem icon={Clock} label={formatDuration(course.hours * 60)} />
            <FactItem icon={Globe} label={course.language} />
            <FactItem icon={ChartNoAxesColumnIncreasing} label={t(course.level)} />
          </View>

          {enrolled ? (
            <View style={styles.ratingRow}>
              <Badge
                label={t('{done} of {total} done', { done, total: course.lessonCount })}
                tone="success"
                icon={CircleCheck}
              />
            </View>
          ) : null}

          {enrolled ? (
            <View style={styles.progressBlock}>
              <ProgressBar value={ratio} accessibilityLabel={`${course.title} progress`} />
              <Text style={[type.label, tabularNums, { color: colors.textMuted }]}>
                {Math.round(ratio * 100)}% complete · next up “{resumeLesson.title}”
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.rule} />

        <View style={styles.section}>
          <SectionHeader style={styles.headInset} title={t("What you'll learn")} />
          <View style={styles.bullets}>
            {course.outcomes.map((outcome) => (
              <View key={outcome} style={styles.bulletRow}>
                {/* Icon column is one body line tall, so the icon centres on the first line of
                    the text whether the item wraps or not. */}
                <View style={styles.bulletIcon}>
                  <AnimatedCheck size={16} color={colors.gold} strokeWidth={2} />
                </View>
                <Text style={[type.body, { color: colors.text, flex: 1 }]}>{outcome}</Text>
              </View>
            ))}
          </View>
          <Text style={[type.label, styles.sectionNote, { color: colors.textMuted }]}>For {course.audience.toLowerCase()}</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader
            style={styles.headInset}
            title={t("Curriculum")}
            subtitle={curriculumSummary(course)}
          />
          <View style={styles.curriculum}>
            <DataList>
              {course.lessons.map((lesson, lessonIndex) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  index={lessonIndex + 1}
                  state={stateFor(lesson)}
                  onPress={() => openLesson(lesson)}
                />
              ))}
            </DataList>
          </View>
        </View>

        <View style={styles.rule} />

        <View style={[styles.section, styles.sectionTight]}>
          <SectionHeader
            style={styles.headInset}
            title={t("Reviews")}
            subtitle={t('{n} reviews from learners', { n: course.reviewCount.toLocaleString('en-IN') })}
          />
        </View>

        {/* The learner's own rating sits above the sample reviews: it is the one review on this page
            that belongs to them, so it is also the way back into editing it. Only for a course they
            own — nobody else can rate one. */}
        {enrolled ? (
          <View style={styles.padInset}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={rating ? t('Your rating: {n} stars. Edit it.', { n: rating.stars }) : t('Rate this course')}
              onPress={() => router.push({ pathname: '/rate/[courseId]', params: { courseId: course.id } })}
              style={({ pressed }) => [styles.rateCard, pressed && { opacity: 0.75 }]}>
              <View style={styles.flex}>
                <Text style={[type.bodyStrong, { color: colors.text }]}>
                  {rating ? t('Your rating') : t('Rate this course')}
                </Text>
                {rating ? (
                  <View style={styles.rateStars}>
                    <StarsDisplay value={rating.stars} />
                    <Text style={[type.label, { color: colors.textMuted }]}>
                      {t('{n} stars · tap to edit', { n: rating.stars })}
                    </Text>
                  </View>
                ) : (
                  <Text style={[type.label, { color: colors.textMuted }]}>
                    {t('Tell other learners how this course went for you.')}
                  </Text>
                )}
              </View>
              <ArrowRight size={16} color={colors.accentText} strokeWidth={2} />
            </Pressable>
          </View>
        ) : null}

        <DataList>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </DataList>
        <Text style={[type.label, styles.sectionNote, { color: colors.textSubtle }]}>{t("Reviews from learners who own this course, synced from the academy.")}</Text>

        {related.length > 0 ? (
          <>
            <View style={styles.rule} />
            <View style={[styles.section, styles.sectionTight]}>
              <SectionHeader style={styles.headInset} title={t("Learners also took")} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedRail}>
              {related.map((entry) => (
                <CourseCard key={entry.id} course={entry} style={styles.relatedCard} />
              ))}
            </ScrollView>
          </>
        ) : null}
      </Screen>

      <StickyBar bottomInset={insets.bottom}>
        {enrolled ? (
          <>
            <View style={styles.flex}>
              <Text style={[type.label, { color: colors.textMuted }]}>{t("You own this course")}</Text>
              <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={1}>
                {resumeLesson.title}
              </Text>
            </View>
            <Button
              label={done === 0 ? 'Start learning' : 'Continue'}
              icon={Play}
              fullWidth={false}
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
              {/* Price line carries the offer too, so the discount is visible where the decision
                  is made — not only on the artwork. */}
              <View style={styles.priceRow}>
                {/* The payable price wears the theme's accent; the list price it replaced is struck
                    through in red, because that is the one colour that reads as "not this one" at
                    12px and still clears 4.5:1 on white. */}
                <Text style={[type.title, tabularNums, { color: colors.accentText }]}>
                  {formatInr(course.priceInr)}
                </Text>
                {course.listPriceInr ? (
                  <Text style={[type.label, styles.strike, tabularNums, { color: colors.error }]}>
                    {formatInr(course.listPriceInr)}
                  </Text>
                ) : null}
              </View>
              <Text style={[type.label, { color: colors.textMuted }]}>{t("One-time \u00b7 secure checkout")}</Text>
            </View>
            <Button
              label={t("Buy now")}
              fullWidth={false}
              sheen
              iconNode={<AnimatedCart size={18} color={colors.onAccent} />}
              onPress={() => router.push({ pathname: '/checkout/[id]', params: { id: course.id } })}
            />
          </>
        )}
      </StickyBar>

      <BottomSheet
        visible={Boolean(paywallLesson)}
        onClose={() => setPaywallLesson(null)}
        title={t("Unlock this course")}
        subtitle={
          paywallLesson
            ? t('“{lesson}” is part of {course}.', { lesson: paywallLesson.title, course: course.title })
            : undefined
        }>
        <Text style={[type.body, { color: colors.textMuted }]}>
          Buy the course to watch all {course.lessonCount} lessons, keep notes on every lesson and track your progress.
          Free preview lessons stay open to everyone.
        </Text>
        <View style={styles.paywallActions}>
          <Button
            label={t('Buy for {price}', { price: formatInr(course.priceInr) })}
            onPress={() => {
              setPaywallLesson(null);
              router.push({ pathname: '/checkout/[id]', params: { id: course.id } });
            }}
          />
          <Button
            label={t("Watch a free preview instead")}
            variant="ghost"
            onPress={() => {
              const lesson = previewLesson;
              setPaywallLesson(null);
              openLesson(lesson);
            }}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

function CourseAppBar() {
  const t = useT();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.simpleBar, { paddingTop: insets.top + spacing.xs }]}>
      <IconButton icon={ArrowLeft} accessibilityLabel={t("Go back")} onPress={() => router.replace('/explore')} />
    </View>
  );
}

/**
 * One fact in the summary row: animated yellow icon plus its label, the icon column centred on
 * the text line — the same treatment as the check marks under "What you'll learn".
 */
function FactItem({ icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <View style={styles.factItem}>
      <View style={styles.factIcon}>
        <AnimatedIcon icon={icon} size={15} color={colors.gold} motion="pulse" />
      </View>
      <Text style={[type.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  relatedRail: { gap: spacing.md, paddingHorizontal: layout.screen, paddingBottom: spacing.sm },
  relatedCard: { width: 230 },
  hero: { height: 240, backgroundColor: colors.player, overflow: 'hidden' },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: layout.screen },
  heroPlay: { position: 'absolute', left: layout.screen, bottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  /** Mirrors the player's own bottom-right control: glyph + label straight on the scrim. */
  /** Number, percent glyph, `OFF`: one mark, so the gaps stay at 2px rather than the block rhythm. */
  heroOffer: { position: 'absolute', right: layout.screen, bottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 3 },
  padInset: { paddingHorizontal: layout.screen, paddingBottom: spacing.sm },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.touchTarget + spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  rateStars: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.scrim,
    borderWidth: 1,
    borderColor: colors.onPlayerMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleBar: { paddingHorizontal: layout.screen, paddingBottom: spacing.sm },

  intro: {
    paddingHorizontal: layout.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  /** Kicker and title are one unit: 2px between them, and the rating column centred against both. */
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: { flex: 1, gap: 2 },
  /**
   * Full-bleed tone strip: it reaches both screen edges — the negative margin cancels the intro's
   * 8pt gutter — and its contents stay on that same 8pt gutter, so the row lines up with every
   * other line on the screen while the block itself reads as a band, not a card.
   */
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: layout.screen,
    paddingVertical: spacing.md,
    marginHorizontal: -layout.screen,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  progressBlock: { gap: spacing.xs, marginTop: spacing.xs },

  /**
   * Section rhythm: every block gets 24px above and below, and full-bleed hairlines mark the
   * boundaries so titles never run into the block above them. Content sits at 16px, the same
   * inset as the curriculum rows, so text lines up in one column down the screen.
   */
  section: { paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm },
  sectionTight: { paddingBottom: spacing.sm },
  headInset: { paddingHorizontal: layout.screen },
  rule: { height: 1, backgroundColor: colors.divider },
  sectionNote: { paddingHorizontal: layout.screen, paddingTop: spacing.xs },
  bullets: { gap: spacing.sm, paddingHorizontal: layout.screen },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bulletIcon: { height: 22, justifyContent: 'center' },
  factItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  factIcon: { height: 16, justifyContent: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  strike: { textDecorationLine: 'line-through' },

  curriculum: { borderTopWidth: 1, borderColor: colors.border },
  curriculumBlock: { borderBottomWidth: 1, borderColor: colors.border },
  curriculumHeader: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: layout.screen, paddingVertical: spacing.md },
  sectionIndex: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  paywallActions: { gap: spacing.sm },
}));
