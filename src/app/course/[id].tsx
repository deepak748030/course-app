import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bookmark,
  ChartNoAxesColumnIncreasing,
  CircleCheck,
  Clapperboard,
  Clock,
  Globe,
  Play,
  ShoppingBasket,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppStatusBar } from '@/components/app-status-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { LessonRow, RatingInline, ReviewCard, StickyBar, type LessonRowState } from '@/components/course-cards';
import { Badge, Button, DataList, EmptyState, IconButton, MetaItem, ProgressBar, Screen, Scrim, SectionHeader } from '@/components/ui';
import { colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { courseById } from '@/data/catalog';
import { formatDuration, formatInr } from '@/lib/format';
import { useStore } from '@/store';
import type { Lesson } from '@/types';

export default function CourseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isEnrolled, isCourseSaved, toggleSavedCourse, completedCount, courseProgressRatio, lessonProgress } = useStore();
  const [paywallLesson, setPaywallLesson] = useState<Lesson | null>(null);

  const course = useMemo(() => courseById(id), [id]);

  if (!course) {
    return (
      <Screen header={<CourseAppBar />}>
        <EmptyState
          icon={Clapperboard}
          title="We could not find that course"
          body="This link may be out of date. Browse the catalog to find a course to learn."
          actionLabel="Browse courses"
          onAction={() => router.replace('/explore')}
        />
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
            <Image source={course.cover} style={styles.heroImage} contentFit="cover" transition={200} />
            <Scrim to={colors.scrim} />
            <View style={[styles.heroBar, { paddingTop: insets.top + spacing.xs }]}>
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
                <Play size={20} color={colors.textInverse} strokeWidth={2} fill={colors.textInverse} />
              </View>
              <Text style={[type.labelStrong, { color: colors.textInverse }]}>
                Watch free preview · {previewLesson.minutes} min
              </Text>
            </Pressable>
          </View>
        }>
        <View style={styles.intro}>
          <Text style={[type.title, { color: colors.text }]}>{course.title}</Text>
          <Text style={[type.body, { color: colors.textMuted }]}>{course.promise}</Text>

          {/* Facts sit on their own tone block so they read as a summary, not more prose. */}
          <View style={styles.facts}>
            <MetaItem icon={ChartNoAxesColumnIncreasing} label={course.level} />
            <MetaItem icon={Clapperboard} label={`${course.lessonCount} lessons`} />
            <MetaItem icon={Clock} label={formatDuration(course.hours * 60)} />
            <MetaItem icon={Globe} label={course.language} />
          </View>

          <View style={styles.ratingRow}>
            <RatingInline rating={course.rating} reviewCount={course.reviewCount} />
            {enrolled ? <Badge label={`${done} of ${course.lessonCount} done`} tone="success" icon={CircleCheck} /> : null}
          </View>

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
          <SectionHeader style={styles.headInset} title="What you'll learn" />
          <View style={styles.bullets}>
            {course.outcomes.map((outcome) => (
              <View key={outcome} style={styles.bulletRow}>
                <CircleCheck size={16} color={colors.sage} strokeWidth={1.9} />
                <Text style={[type.body, { color: colors.text, flex: 1 }]}>{outcome}</Text>
              </View>
            ))}
          </View>
          <Text style={[type.label, styles.sectionNote, { color: colors.textMuted }]}>For {course.audience.toLowerCase()}</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader
            style={styles.headInset}
            title="Curriculum"
            subtitle={`${course.sections.length} sections · ${course.lessonCount} lessons`}
          />
          <View style={styles.curriculum}>
            {course.sections.map((section, index) => (
              <CurriculumSectionBlock
                key={section.id}
                index={index + 1}
                title={section.title}
                summary={section.summary}
                lessons={course.lessons.filter((lesson) => lesson.sectionId === section.id)}
                stateFor={stateFor}
                onOpen={openLesson}
                locked={!enrolled}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader style={styles.headInset} title="What you'll need" />
          <View style={styles.bullets}>
            {course.equipment.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <ShoppingBasket size={16} color={colors.textMuted} strokeWidth={1.75} />
                <Text style={[type.body, { color: colors.textMuted, flex: 1 }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.rule} />

        <View style={[styles.section, styles.sectionTight]}>
          <SectionHeader
            style={styles.headInset}
            title="Reviews"
            subtitle={`${course.reviewCount.toLocaleString('en-IN')} sample reviews`}
          />
        </View>
        <DataList>
          {course.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </DataList>
        <Text style={[type.label, styles.sectionNote, { color: colors.textSubtle }]}>
          Ratings and reviews in this prototype are authored sample content, not verified facts.
        </Text>

      </Screen>

      <StickyBar bottomInset={insets.bottom}>
        {enrolled ? (
          <>
            <View style={styles.flex}>
              <Text style={[type.label, { color: colors.textMuted }]}>You own this course</Text>
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
              <Text style={[type.title, tabularNums, { color: colors.text }]}>{formatInr(course.priceInr)}</Text>
              <Text style={[type.label, { color: colors.textMuted }]}>One-time · demo checkout</Text>
            </View>
            <Button
              label="Buy course"
              fullWidth={false}
              onPress={() => router.push({ pathname: '/checkout/[id]', params: { id: course.id } })}
            />
          </>
        )}
      </StickyBar>

      <BottomSheet
        visible={Boolean(paywallLesson)}
        onClose={() => setPaywallLesson(null)}
        title="Unlock this course"
        subtitle={paywallLesson ? `“${paywallLesson.title}” is part of ${course.title}.` : undefined}>
        <Text style={[type.body, { color: colors.textMuted }]}>
          Buy the course to watch all {course.lessonCount} lessons, keep notes on every lesson and track your progress.
          Free preview lessons stay open to everyone.
        </Text>
        <View style={styles.paywallActions}>
          <Button
            label={`Buy for ${formatInr(course.priceInr)}`}
            onPress={() => {
              setPaywallLesson(null);
              router.push({ pathname: '/checkout/[id]', params: { id: course.id } });
            }}
          />
          <Button
            label="Watch a free preview instead"
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.simpleBar, { paddingTop: insets.top + spacing.xs }]}>
      <IconButton icon={ArrowLeft} accessibilityLabel="Go back" onPress={() => router.replace('/explore')} />
    </View>
  );
}

/** Section block: number + title row, then lesson rows with dividers. */
function CurriculumSectionBlock({
  index,
  title,
  summary,
  lessons,
  stateFor,
  onOpen,
  locked,
}: {
  index: number;
  title: string;
  summary: string;
  lessons: Lesson[];
  stateFor: (lesson: Lesson) => LessonRowState;
  onOpen: (lesson: Lesson) => void;
  locked: boolean;
}) {
  const [open, setOpen] = useState(index === 1);
  const minutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);

  return (
    <View style={styles.curriculumBlock}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Section ${index}, ${title}. ${lessons.length} lessons, ${formatDuration(minutes)}`}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.curriculumHeader, pressed && { opacity: 0.75 }]}>
        <View style={styles.sectionIndex}>
          <Text style={[type.labelStrong, tabularNums, { color: colors.accentText }]}>{String(index).padStart(2, '0')}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={[type.bodyStrong, { color: colors.text }]}>{title}</Text>
          <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={2}>
            {summary}
          </Text>
          <Text style={[type.label, tabularNums, { color: colors.textSubtle }]}>
            {lessons.length} lessons · {formatDuration(minutes)}
            {locked ? ' · previews marked free' : ''}
          </Text>
        </View>
      </Pressable>

      {open ? (
        <DataList>
          {lessons.map((lesson, lessonIndex) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              index={lessonIndex + 1}
              state={stateFor(lesson)}
              onPress={() => onOpen(lesson)}
            />
          ))}
        </DataList>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  hero: { height: 240, backgroundColor: colors.player, overflow: 'hidden' },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: layout.screen },
  heroPlay: { position: 'absolute', left: layout.section, bottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
    paddingHorizontal: layout.section,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  progressBlock: { gap: spacing.xs, marginTop: spacing.xs },

  /**
   * Section rhythm: every block gets 24px above and below, and full-bleed hairlines mark the
   * boundaries so titles never run into the block above them. Content sits at 16px, the same
   * inset as the curriculum rows, so text lines up in one column down the screen.
   */
  section: { paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  sectionTight: { paddingBottom: spacing.sm },
  headInset: { paddingHorizontal: layout.section },
  rule: { height: 1, backgroundColor: colors.divider },
  sectionNote: { paddingHorizontal: layout.section, paddingTop: spacing.xs },
  bullets: { gap: spacing.md, paddingHorizontal: layout.section },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },

  curriculum: { borderTopWidth: 1, borderColor: colors.border },
  curriculumBlock: { borderBottomWidth: 1, borderColor: colors.border },
  curriculumHeader: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: layout.section, paddingVertical: spacing.md },
  sectionIndex: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  paywallActions: { gap: spacing.sm },
});
