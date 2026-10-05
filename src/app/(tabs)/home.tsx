import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, Bookmark } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseCardCompact, CourseCardLarge, ContinueCard, InstructorCard } from '@/components/course-cards';
import { AppText, Chip, IconButton, SectionHeader, usePressScale } from '@/components/ui';
import { colors, maxContentWidth, radius, screenPadding, shadow, spacing, type } from '@/constants/theme';
import { categories, courses, instructorById } from '@/data/catalog';
import { images } from '@/media';
import { useStore } from '@/store';
import type { Course } from '@/types';
import { timeOfDayGreeting } from '@/lib/format';
import Animated from 'react-native-reanimated';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, state, completedCount, courseProgressRatio, resumeLesson } = useStore();

  const interestIds = state.interests;
  const rankByInterest = (course: Course) => (interestIds.includes(course.categoryId) ? 0 : 1);

  const featured = useMemo(() => {
    const popular = courses.filter((course) => course.isPopular);
    return [...popular].sort((a, b) => rankByInterest(a) - rankByInterest(b) || b.rating - a.rating)[0] ?? courses[0];
  }, [interestIds]);

  const popular = useMemo(
    () =>
      [...courses]
        .sort((a, b) => rankByInterest(a) - rankByInterest(b) || b.rating - a.rating || b.reviewCount - a.reviewCount)
        .slice(0, 5),
    [interestIds],
  );

  const quickSkills = useMemo(() => [...courses].sort((a, b) => a.hours - b.hours).slice(0, 4), []);
  const beginnerPicks = useMemo(() => courses.filter((course) => course.isBeginnerPick).slice(0, 2), []);

  const spotlight = useMemo(
    () => instructorById(popular[0]?.instructorId) ?? instructorById('rhea')!,
    [popular],
  );

  const activeCourse = useMemo(() => {
    const enrolled = Object.keys(state.enrollments);
    if (enrolled.length === 0) return null;
    return courses.find((course) => course.id === enrolled[0]);
  }, [state.enrollments]);

  const resume = activeCourse ? resumeLesson(activeCourse) : null;
  const firstName = session?.profile.name ?? 'there';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxxl }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={[type.supporting, { color: colors.textSecondary }]}>{timeOfDayGreeting()},</Text>
            <AppText variant="title">{firstName}</AppText>
          </View>
          <IconButton
            icon={Bookmark}
            accessibilityLabel="Saved courses"
            onPress={() => router.push('/saved')}
            variant="soft"
          />
          <IconButton
            icon={Bell}
            accessibilityLabel={
              state.notificationsRead ? 'Notifications' : 'Notifications, unread updates'
            }
            onPress={() => router.push('/notifications')}
            variant="soft"
            showBadge={!state.notificationsRead}
          />
        </View>

        <HeroCard course={featured} />

        {activeCourse && resume ? (
          <View style={styles.section}>
            <SectionHeader title="Continue learning" actionLabel="My learning" onAction={() => router.push('/learning')} />
            <ContinueCard
              course={activeCourse}
              lessonTitle={resume.lesson.title}
              progress={courseProgressRatio(activeCourse)}
              onPress={() =>
                router.push({
                  pathname: '/lesson/[courseId]/[lessonId]',
                  params: { courseId: activeCourse.id, lessonId: resume.lesson.id },
                })
              }
            />
            <Text style={[type.meta, { color: colors.textSecondary }]}>
              {completedCount(activeCourse)} of {activeCourse.lessonCount} lessons complete
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader title="What are you cooking?" subtitle="Browse by cuisine or skill" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}>
            {categories.map((category) => (
              <Chip
                key={category.id}
                label={category.label}
                selected={interestIds.includes(category.id)}
                onPress={() => router.push({ pathname: '/explore', params: { category: category.id } })}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Popular courses" actionLabel="See all" onAction={() => router.push('/explore')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {popular.map((course) => (
              <CourseCardCompact key={course.id} course={course} />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Instructor spotlight" />
          <InstructorCard instructor={spotlight} variant="spotlight" />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Quick skills, big difference" subtitle="Short courses you can finish this week" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {quickSkills.map((course) => (
              <CourseCardCompact key={course.id} course={course} />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Good first courses" actionLabel="Explore" onAction={() => router.push('/explore')} />
          {beginnerPicks.map((course) => (
            <CourseCardLarge key={course.id} course={course} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function HeroCard({ course }: { course: Course }) {
  const router = useRouter();
  const press = usePressScale(0.99);

  return (
    <Animated.View style={[styles.hero, shadow.card, press.style]}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Featured course: ${course.title}. ${course.promise}`}
        onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}>
        <Image source={images.heroHome} style={styles.heroImage} contentFit="cover" transition={220} />
        <LinearGradient
          colors={['rgba(18,20,18,0.82)', 'rgba(18,20,18,0.35)', 'rgba(18,20,18,0.05)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroContent}>
          <Text style={[type.label, { color: colors.goldSoft }]}>Featured this week</Text>
          <Text style={[type.section, { color: colors.textInverse }]} numberOfLines={2}>
            {course.title}
          </Text>
          <Text style={[type.supporting, { color: 'rgba(255,255,255,0.88)' }]} numberOfLines={2}>
            {course.promise}
          </Text>
          <View style={styles.heroCta}>
            <Text style={[type.label, { color: colors.primary }]}>View course</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.xl,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingTop: spacing.sm,
  },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hero: { borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.player },
  heroImage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.surfaceWarm },
  heroContent: {
    position: 'absolute',
    left: spacing.md,
    right: '38%',
    bottom: spacing.md,
    gap: spacing.xxs,
  },
  heroCta: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  section: { gap: spacing.sm },
  rail: { gap: spacing.sm, paddingVertical: spacing.xxs, paddingRight: spacing.md },
});
