/**
 * Introduction: four slides, each one drawn edge to edge on the screen.
 *
 * The artwork is the screen. Every slide's image fills the whole window — under the status bar, under
 * the brand row and under the footer — with `cover`, so it is never letterboxed and never leaves a
 * band of page around it. The interface sits on top of it:
 *
 *   - a white fade down from the top, so the brand row and the status bar stay legible on any photo;
 *   - the copy on the app's own scrim (`colors.scrim`, the wash the Home hero uses), in white ink;
 *   - the dots, Skip and the one action over the same scrim.
 *
 * Every block a slide positions against is measured rather than guessed: the pager is the window, the
 * top bar reports its own height, the footer reports its own, and the slides pad their contents by
 * those numbers. That is what keeps the copy clear of the button on a short phone and on a tablet.
 *
 * The first slide is the brand poster. Its artwork carries the whole message, so the slide adds none
 * of its own — no headline over a poster — and draws only the lock-up, and only when the artwork has
 * an empty top for it (`posterTitle` / `posterTagline`). The lock-up sits over the poster's pale top
 * band, so it is written in the poster's own green rather than in white.
 */

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppStatusBar } from '@/components/app-status-bar';
import { BrandMark } from '@/components/marks';
import { Button } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, type } from '@/constants/theme';
import { useT } from '@/i18n';
import { images } from '@/media';
import { useStore } from '@/store';
import type { ImageSource } from 'expo-image';

/** The poster's own green, from the printed artwork — deliberately outside the two app palettes. */
const POSTER_GREEN = '#14532D';

/** How much of the height each fade covers: the top rail's content is small, the scrim's is not. */
const TOP_FADE = 132;
const SCRIM_HEIGHT = '62%';

type Slide = {
  key: string;
  image: ImageSource;
  /** Copy shown over the artwork. A poster slide leaves these empty — the artwork says it itself. */
  headline?: string;
  support?: string;
  cta: string;
  /**
   * A poster is artwork carrying its own lettering (the YDU Academy poster). It is shown whole in
   * spirit — the drawing fills the screen — and the slide adds no copy of its own, because anything
   * written over a poster fights the poster.
   */
  poster?: boolean;
  /** Spoken description of a poster, since all of its text is inside the image. */
  posterLabel?: string;
  /**
   * Brand lock-up drawn over a poster's empty top area: the YDU name in Hindi and its tagline, the
   * way the printed poster sets them (logo, title, tagline, a short accent rule).
   *
   * This is brand artwork, not interface copy, so it is written as-is rather than through `t()` — the
   * brand reads the same in both interface languages, which is exactly how the poster is printed.
   * Drop these two fields when the artwork carries its own lettering.
   */
  posterTitle?: string;
  posterTagline?: string;
};

const slides: Slide[] = [
  {
    key: 'poster',
    image: images.onboardingPoster,
    cta: 'Next',
    poster: true,
    posterLabel: 'YDU Academy — Yadav dairy production. Learn dairy, grow your business.',
    posterTitle: 'यादव दूध उत्पादन',
    posterTagline: 'डेरी सीखें, व्यवसाय बढ़ाएँ',
  },
  {
    key: 'milk',
    image: images.onboardingFreshMilk,
    headline: 'Good dairy starts\nwith good milk.',
    support: 'Learn reception, chilling and testing from structured video courses built for the trade.',
    cta: 'Next',
  },
  {
    key: 'bench',
    image: images.onboardingTesting,
    headline: 'Learn the numbers,\nnot the guesswork.',
    support: 'Fat, SNF, lactometer readings and adulteration tests — shown at the bench, step by step.',
    cta: 'Next',
  },
  {
    key: 'range',
    image: images.onboardingRange,
    headline: 'From milk\nto a finished product.',
    support: 'Paneer, ghee, curd, cheese and frozen desserts: pick a track, follow the make-sheet, sell it.',
    cta: 'Start learning',
  },
];

export default function OnboardingScreen() {
  const t = useT();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const listRef = useRef<Animated.FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  // Both blocks measure themselves, but a measurement only arrives after the first paint — so they
  // start from a close estimate (the brand row, and the footer at its real height on this inset) and
  // the copy never flashes in the wrong place on the first frame.
  const [topBarHeight, setTopBarHeight] = useState(() => insets.top + 44);
  const [footerHeight, setFooterHeight] = useState(() => insets.bottom + 132);
  const { completeOnboarding } = useStore();

  const finish = useCallback(() => {
    completeOnboarding();
    router.replace('/auth/signin');
  }, [completeOnboarding, router]);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x / Math.max(1, width);
  });

  const goNext = useCallback(() => {
    if (index === slides.length - 1) {
      finish();
      return;
    }
    listRef.current?.scrollToOffset({ offset: (index + 1) * width, animated: true });
  }, [finish, index, width]);

  return (
    <View style={styles.root}>
      <AppStatusBar />

      {/* The artwork layer: one full-window image per slide, paged by hand. It sits behind everything,
          including the status bar, which is what makes the picture cover the whole screen. */}
      <View style={styles.canvas}>
        <Animated.FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width)))}
          renderItem={({ item, index: itemIndex }) => (
            <SlideView
              slide={item}
              index={itemIndex}
              width={width}
              height={height}
              scrollX={scrollX}
              topInset={topBarHeight}
              footerInset={footerHeight}
            />
          )}
        />
      </View>

      {/* A white fade under the brand row, so the lockup and the status bar read on any photo. */}
      <LinearGradient
        pointerEvents="none"
        colors={[colors.background, 'rgba(255,255,255,0.82)', 'transparent']}
        locations={[0, 0.55, 1]}
        style={[styles.topFade, { height: insets.top + TOP_FADE }]}
      />

      <View
        style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}
        onLayout={(event: LayoutChangeEvent) => setTopBarHeight(event.nativeEvent.layout.height)}>
        <View style={styles.brand}>
          <BrandMark size={26} />
          <Text style={[type.bodyStrong, { color: colors.text }]}>YDU Academy</Text>
        </View>
      </View>

      <View style={styles.spacer} />

      {/* Dots and the single action. Skip lives here, over the artwork, not on a page of its own. */}
      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
        onLayout={(event: LayoutChangeEvent) => setFooterHeight(event.nativeEvent.layout.height)}>
        <View style={styles.footerRow}>
          <View
            style={styles.dots}
            accessibilityLabel={t('Step {n} of {total}', { n: index + 1, total: slides.length })}>
            {slides.map((slide, dotIndex) => (
              <Dot key={slide.key} active={dotIndex === index} />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Skip introduction')}
            hitSlop={12}
            onPress={finish}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <Text style={[type.label, { color: colors.onPlayer }]}>{t('Skip')}</Text>
          </Pressable>
        </View>
        <Button
          label={slides[index].cta}
          onPress={goNext}
          icon={ArrowRight}
          accessibilityHint={
            index === slides.length - 1 ? 'Opens the sign-in screen' : 'Shows the next introduction screen'
          }
        />
      </View>
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  return <View style={[styles.dot, active ? styles.dotActive : styles.dotIdle]} />;
}

function SlideView({
  slide,
  index,
  width,
  height,
  scrollX,
  topInset,
  footerInset,
}: {
  slide: Slide;
  index: number;
  width: number;
  height: number;
  scrollX: SharedValue<number>;
  /** Height of the brand row, measured by the screen: a poster's lock-up starts below it. */
  topInset: number;
  /** Height of the dots-and-action block: the copy ends above it. */
  footerInset: number;
}) {
  const reduced = useReducedMotion();

  // Gentle image translation as the page moves, so the artwork drifts under the interface.
  const imageStyle = useAnimatedStyle(() => {
    if (reduced) return { transform: [{ translateX: 0 }] };
    const offset = interpolate(
      scrollX.value,
      [index - 1, index, index + 1],
      [width * 0.1, 0, -width * 0.1],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX: offset }, { scale: 1.05 }] };
  });

  const textStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1, transform: [{ translateY: 0 }] };
    const distance = Math.abs(scrollX.value - index);
    return {
      opacity: interpolate(distance, [0, 0.6], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(distance, [0, 0.6], [0, 12], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View style={{ width, height }}>
      {/* The artwork: `cover` on a full-window box, so it fills the height and the width at once. */}
      <Animated.View style={[styles.imageLayer, imageStyle]}>
        <Image
          source={slide.image}
          style={styles.image}
          contentFit="cover"
          transition={200}
          accessibilityLabel={slide.poster ? slide.posterLabel : undefined}
        />
      </Animated.View>

      {/* The scrim the copy and the footer sit on — the same wash the Home hero uses, inside the
          slide so it travels with the artwork. */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', colors.scrim]}
        locations={[0.28, 1]}
        style={styles.bottomScrim}
      />

      {slide.poster ? (
        slide.posterTitle ? (
          /* The artwork's own empty space at the top: the mark, the name, the tagline and a short
             rule — the poster's lettering, in the poster's green. */
          <View style={[styles.posterLockup, { top: topInset + spacing.sm }]} pointerEvents="none">
            <View style={styles.posterPlate}>
              <BrandMark size={30} color={POSTER_GREEN} />
            </View>
            <Text style={[type.display, styles.posterTitle, { color: POSTER_GREEN }]}>{slide.posterTitle}</Text>
            <Text style={[type.subheading, styles.posterTagline, { color: POSTER_GREEN }]}>
              {slide.posterTagline}
            </Text>
            <View style={styles.posterRule} />
          </View>
        ) : null
      ) : (
        /* The copy, on the foot of the artwork and clear of the dots and the button. */
        <Animated.View style={[styles.copy, { bottom: footerInset + spacing.sm }, textStyle]}>
          <Text style={[type.title, { color: colors.textInverse }]}>{slide.headline}</Text>
          <Text style={[type.body, styles.support, { color: colors.onPlayerMuted }]}>{slide.support}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  /* The pager is the window, edge to edge — the image covers what the status bar sits on too. */
  canvas: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  imageLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  image: { width: '100%', height: '100%' },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: SCRIM_HEIGHT },
  topBar: {
    paddingHorizontal: layout.screen,
    paddingBottom: spacing.sm,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.sm },
  spacer: { flex: 1 },
  copy: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: layout.section,
    gap: spacing.sm,
  },
  support: { maxWidth: 420 },
  posterLockup: {
    position: 'absolute',
    left: layout.section,
    right: layout.section,
    alignItems: 'center',
    gap: spacing.xs,
  },
  posterPlate: {
    /* The lock-up sits on the poster's pale top band, so the plate is white against the artwork. */
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(20, 83, 45, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  posterTitle: { textAlign: 'center' },
  posterTagline: { textAlign: 'center' },
  posterRule: {
    width: 52,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: POSTER_GREEN,
    marginTop: spacing.xs,
  },
  footer: {
    paddingHorizontal: layout.screen,
    paddingTop: spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { height: 6, borderRadius: radius.pill },
  /* On the scrim: the brand gold marks the step, white at 62% marks the others — both palettes read. */
  dotActive: { width: 22, backgroundColor: colors.gold },
  dotIdle: { width: 6, backgroundColor: colors.onPlayerMuted },
}));
