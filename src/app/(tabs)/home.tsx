import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowRight, Clapperboard, Clock, Play, Search, Star } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type ViewStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

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
import { formatDuration } from '@/lib/format';
import { useStore } from '@/store';
import type { Course } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const { session, state, courseProgressRatio, resumeLesson } = useStore();
  const interestIds = state.interests;

  const rankByInterest = (course: Course) => (interestIds.includes(course.categoryId) ? 0 : 1);

  // Banner slides: the ranked popular pick first, then the rest of the catalog so the carousel fills.
  const featured = useMemo(() => {
    const popular = courses.filter((course) => course.isPopular);
    const ranked = [...popular].sort((a, b) => rankByInterest(a) - rankByInterest(b) || b.rating - a.rating);
    const rest = courses.filter((course) => !course.isPopular);
    return [...ranked, ...rest].slice(0, 3);
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
      {/* Banner: full-bleed — zero left/right gap by design. It scrolls, and it pages itself. */}
      <HeroCarousel courses={featured} />

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
        <SectionHeader
          title="Popular courses"
          actionLabel="See all"
          actionIcon={ArrowRight}
          onAction={() => router.push('/explore')}
        />
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
        <SectionHeader
          title="Good first courses"
          actionLabel="Explore"
          actionIcon={ArrowRight}
          onAction={() => router.push('/explore')}
        />
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

/** Banner slides advance on their own every four and a half seconds; a swipe takes over. */
const SLIDE_MS = 4500;

/**
 * Featured carousel: full-bleed, one slide per featured course. It scrolls by hand *and* pages
 * itself forever. Reduced-motion users get the first slide, static and swipeable.
 */
function HeroCarousel({ courses: slides }: { courses: Course[] }) {
  const reduced = useReducedMotion();
  const window = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [step, setStep] = useState(window.width);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const dragging = useRef(false);
  const paused = useRef(false);
  const page = Math.max(step, 1);

  const show = (next: number) => {
    indexRef.current = next;
    setIndex(next);
    scroller.current?.scrollTo({ x: next * page, y: 0, animated: true });
  };

  useEffect(() => {
    if (reduced || slides.length < 2) return;
    const timer = setInterval(() => {
      if (dragging.current || paused.current) return;
      show((indexRef.current + 1) % slides.length);
    }, SLIDE_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, slides.length, page]);

  const settle = (offsetX: number) => {
    const next = Math.max(0, Math.min(slides.length - 1, Math.round(offsetX / page)));
    indexRef.current = next;
    setIndex(next);
  };

  return (
    <View style={styles.carousel}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        accessibilityLabel={`Featured courses, ${slides.length} banners. Swipe for the next one.`}
        onLayout={(event) => setStep(Math.round(event.nativeEvent.layout.width))}
        onScroll={(event) => {
          if (dragging.current) settle(event.nativeEvent.contentOffset.x);
        }}
        onScrollBeginDrag={() => {
          dragging.current = true;
        }}
        onScrollEndDrag={() => {
          dragging.current = false;
        }}
        onMomentumScrollEnd={(event) => {
          dragging.current = false;
          paused.current = false;
          settle(event.nativeEvent.contentOffset.x);
        }}>
        {slides.map((course) => (
          <View key={course.id} style={[styles.hero, { width: page }, Platform.OS === 'web' && styles.snap]}>
            <HeroSlide course={course} />
          </View>
        ))}
      </ScrollView>

      {slides.length > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {slides.map((course, dot) => (
            <View key={course.id} style={[styles.dot, dot === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** One slide: artwork fills the frame edge to edge, native copy sits on the scrim. */
function HeroSlide({ course }: { course: Course }) {
  const router = useRouter();
  const press = usePressScale(0.99);
  const heroOffer = discountPercent(course);

  return (
    <Animated.View style={[styles.flex, press.style]}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Featured course: ${course.title}. ${course.promise}`}
        onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={styles.flex}>
        <Image source={course.cover} style={styles.heroImage} contentFit="cover" transition={200} />
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
  carousel: { height: 220, backgroundColor: colors.player },
  hero: { height: 220, overflow: 'hidden' },
  /* Native paging snaps by itself; the web scroll-snap container needs each slide to name its point. */
  snap: { scrollSnapAlign: 'start' } as ViewStyle,
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroOffer: { position: 'absolute', top: spacing.md, left: spacing.md },
  heroCopy: { flex: 1, justifyContent: 'flex-end', padding: spacing.lg, gap: spacing.sm },
  dots: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: colors.onPlayerMuted },
  dotActive: { width: 18, backgroundColor: colors.textInverse },
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
