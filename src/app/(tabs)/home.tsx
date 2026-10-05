import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Clapperboard, Clock, Play, Search, Star } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AnimatedBellRing } from '@/components/animated-icons';
import { OfferBadge } from '@/components/offer-tag';
import { CourseCard, CourseRow, ContinueCard } from '@/components/course-cards';
import {
  AvatarButton,
  BrandTile,
  Chip,
  DataList,
  IconButton,
  MetaItem,
  Rail,
  Scrim,
  Screen,
  SectionHeader,
  TabHeader,
  usePressScale,
} from '@/components/ui';
import { BrandMark } from '@/components/marks';
import { createStyles, colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { categories, courses, discountPercent } from '@/data/catalog';
import { notifications } from '@/data/content';
import { images } from '@/media';
import { formatDuration } from '@/lib/format';
import { useStore } from '@/store';
import type { Course } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const { session, state, courseProgressRatio, resumeLesson } = useStore();
  const interestIds = state.interests;

  const rankByInterest = (course: Course) => (interestIds.includes(course.categoryId) ? 0 : 1);

  const featured = useMemo(() => {
    const popular = courses.filter((course) => course.isPopular);
    return [...popular].sort((a, b) => rankByInterest(a) - rankByInterest(b) || b.rating - a.rating)[0] ?? courses[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interestIds]);

  const popular = useMemo(
    () =>
      [...courses]
        .sort((a, b) => rankByInterest(a) - rankByInterest(b) || b.rating - a.rating || b.reviewCount - a.reviewCount)
        .slice(0, 6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interestIds],
  );

  const quickSkills = useMemo(() => [...courses].sort((a, b) => a.hours - b.hours).slice(0, 4), []);
  const beginnerPicks = useMemo(() => courses.filter((course) => course.isBeginnerPick).slice(0, 3), []);

  const activeCourse = useMemo(() => {
    const enrolledIds = Object.keys(state.enrollments);
    return courses.find((course) => enrolledIds.includes(course.id)) ?? null;
  }, [state.enrollments]);

  const resume = activeCourse ? resumeLesson(activeCourse) : null;
  const unread = state.notificationsRead ? 0 : notifications.length;

  return (
    <Screen
      contentStyle={styles.content}
      header={
        /* Identity header: the brand, not a greeting, plus the two things reached from home. */
        <TabHeader
          style={styles.headerCompact}
          leading={
            <BrandTile size={40}>
              <BrandMark size={26} color={colors.onAccent} />
            </BrandTile>
          }
          title="YDU Academy"
          meta={`${courses.length} courses · ${categories.length} tracks`}
          actions={
            <>
              <IconButton
                icon={Search}
                accessibilityLabel="Search courses"
                onPress={() => router.push('/explore')}
              />
              {/* The bell itself is the notification cue, so it is animated, not just badged. */}
              <View style={styles.bellWrap}>
                <IconButton
                  iconNode={<AnimatedBellRing size={20} color={colors.text} animated={unread > 0} />}
                  badge={unread}
                  accessibilityLabel="Notifications"
                  onPress={() => router.push('/notifications')}
                />
              </View>
              <AvatarButton
                name={session?.profile.name ?? 'Guest'}
                accessibilityLabel="Your profile"
                onPress={() => router.push('/profile')}
              />
            </>
          }
        />
      }>
      {/* Banner: full-bleed — zero left/right gap by design. */}
      <HeroBanner course={featured} />

      {activeCourse && resume ? (
        <View style={styles.block}>
          <SectionHeader
            title="Continue learning"
            actionLabel="My learning"
            onAction={() => router.push('/learning')}
          />
          <ContinueCard
            boxed
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
        </View>
      ) : null}

      <View style={styles.block}>
        <SectionHeader title="Browse by" subtitle="Track or skill" />
        <Rail>
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.label}
              selected={interestIds.includes(category.id)}
              onPress={() => router.push({ pathname: '/explore', params: { category: category.id } })}
            />
          ))}
        </Rail>
      </View>

      <View style={styles.block}>
        <SectionHeader title="Popular courses" actionLabel="See all" onAction={() => router.push('/explore')} />
        <Rail>
          {popular.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </Rail>
      </View>

      <View style={styles.block}>
        <SectionHeader title="Quick tracks" subtitle="Short courses you can finish this week" />
        <Rail>
          {quickSkills.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </Rail>
      </View>

      <View style={styles.block}>
        <SectionHeader title="Good first courses" actionLabel="Explore" onAction={() => router.push('/explore')} />
        <DataList>
          {beginnerPicks.map((course) => (
            <CourseRow key={course.id} course={course} />
          ))}
        </DataList>
      </View>

      <View style={styles.brandFooter}>
        <BrandMark size={20} />
        <Text style={[type.label, { color: colors.textSubtle }]}>
          Sample catalog for a prototype build — courses, prices and reviews are fictional.
        </Text>
      </View>
    </Screen>
  );
}

/** Editorial hero: artwork fills the screen edge to edge, native copy sits on the scrim. */
function HeroBanner({ course }: { course: Course }) {
  const router = useRouter();
  const press = usePressScale(0.99);
  const heroOffer = discountPercent(course);

  return (
    <Animated.View style={press.style}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Featured course: ${course.title}. ${course.promise}`}
        onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}>
        <View style={styles.hero}>
          <Image source={images.heroHome} style={styles.heroImage} contentFit="cover" transition={200} />
          <Scrim to={colors.scrim} />
          {heroOffer ? (
            <View style={styles.heroOffer}>
              <OfferBadge percent={heroOffer} />
            </View>
          ) : null}
          <View style={styles.heroCopy}>
            <Text style={[type.overline, { color: colors.onPlayerMuted }]}>Featured this week</Text>
            <Text style={[type.display, { color: colors.textInverse }]} numberOfLines={2}>
              {course.title}
            </Text>
            <View style={styles.heroMeta}>
              <MetaItem icon={Clapperboard} label={`${course.lessonCount} lessons`} color={colors.onPlayerMuted} />
              <MetaItem icon={Clock} label={formatDuration(course.hours * 60)} color={colors.onPlayerMuted} />
              <View style={styles.heroRating}>
                <Star size={12} color={colors.gold} strokeWidth={0} fill={colors.gold} />
                <Text style={[type.labelStrong, tabularNums, { color: colors.textInverse }]}>
                  {course.rating.toFixed(1)}
                </Text>
              </View>
            </View>
            <View style={styles.heroCta}>
              <Text style={[type.labelStrong, { color: colors.text }]}>View course</Text>
              <Play size={13} color={colors.text} strokeWidth={2} fill={colors.text} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  content: { gap: layout.sectionGap, paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  block: { gap: layout.gap },
  /* Tight sides and a tight icon gap, with just enough room under the header for the banner. */
  headerCompact: { paddingHorizontal: layout.screen, paddingBottom: spacing.sm, gap: spacing.xs },
  /* Search and the bell sit almost flush; the avatar keeps its own slot after them. */
  bellWrap: { marginLeft: -spacing.xs },
  hero: { height: 220, backgroundColor: colors.player, overflow: 'hidden' },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroOffer: { position: 'absolute', top: spacing.md, left: spacing.md },
  heroCopy: { flex: 1, justifyContent: 'flex-end', padding: spacing.lg, gap: spacing.sm },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  heroRating: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  heroCta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  brandFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.section,
    paddingTop: spacing.sm,
  },
}));
