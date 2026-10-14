/**
 * Introduction: three slides, each one drawn edge to edge on the screen.
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
 * footer reports its own height, and the slides pad their contents by that number. That is what keeps
 * the copy clear of the button on a short phone and on a tablet.
 *
 * The first slide is the brand poster. Its artwork already carries the whole message — the lock-up,
 * the name and the tagline are printed in the poster itself — so the slide writes nothing over it:
 * no headline, no lock-up, nothing between the artwork and the reader. The interface around it (the
 * brand row, the dots, the action) is chrome; the poster is the screen.
 */

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from '@/lib/router';
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
import { Button } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, type } from '@/constants/theme';
import { useT } from '@/i18n';
import { images } from '@/media';
import { useStore } from '@/store';
import type { ImageSource } from 'expo-image';

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
};

const slides: Slide[] = [
  {
    key: 'poster',
    image: images.onboardingPoster,
    cta: 'Next',
    poster: true,
    posterLabel: 'YDU Academy — Yadav dairy production. Learn dairy, grow your business.',
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
  // The footer measures itself, but a measurement only arrives after the first paint — so it starts
  // from a close estimate (the footer at its real height on this inset) and the copy never flashes in
  // the wrong place on the first frame.
  const [footerHeight, setFooterHeight] = useState(() => insets.bottom + 132);
  const { completeOnboarding } = useStore();

  const finish = useCallback(() => {
    completeOnboarding();
    router.replace('/auth/phone');
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
              footerInset={footerHeight}
            />
          )}
        />
      </View>

      {/* A white fade under the brand row, so the brand mark and the status bar read on any photo. */}
      <LinearGradient
        pointerEvents="none"
        colors={[colors.background, 'rgba(255,255,255,0.82)', 'transparent']}
        locations={[0, 0.55, 1]}
        style={[styles.topFade, { height: insets.top + TOP_FADE }]}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.brand}>
          {/* The same brand-mark artwork the Home header carries, at the same size. */}
          <Image source={images.brandMark} style={{ width: 40, height: 40 }} contentFit="contain" />
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
            style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.6 }]}>
            <Text numberOfLines={1} style={[type.label, styles.skipLabel, { color: colors.onPlayer }]}>
              {t('Skip')}
            </Text>
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
  footerInset,
}: {
  slide: Slide;
  index: number;
  width: number;
  height: number;
  scrollX: SharedValue<number>;
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

      {/* A poster carries its own lettering — the name, the tagline, the rule are printed in the
          artwork — so nothing is written over it: only the non-poster slides position copy here, on
          the foot of the artwork and clear of the dots and the button. */}
      {!slide.poster && (
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
    width: '100%',
  },
  /* Skip sits on its own scrim pill and can never shrink, so the whole word always shows. */
  skipButton: {
    flexShrink: 0,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.scrim,
  },
  skipLabel: { flexShrink: 0 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { height: 6, borderRadius: radius.pill },
  /* On the scrim: the brand gold marks the step, white at 62% marks the others — both palettes read. */
  dotActive: { width: 22, backgroundColor: colors.gold },
  dotIdle: { width: 6, backgroundColor: colors.onPlayerMuted },
}));
