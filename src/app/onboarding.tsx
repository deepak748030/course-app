import { Image } from 'expo-image';
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

type Slide = {
  key: string;
  image: ImageSource;
  /** Copy shown under the image. A poster slide leaves these empty — the artwork says it itself. */
  headline?: string;
  support?: string;
  cta: string;
  /**
   * A poster is artwork with its own logo, headline and tagline (the YDU Academy poster).
   * It is shown whole — `contain`, never cropped — and the slide adds no copy of its own, because
   * anything written over a poster fights the poster. Everything else stays the same: full-bleed
   * width, the same footer, the same dots.
   */
  poster?: boolean;
  /** Spoken description of a poster, since all of its text is inside the image. */
  posterLabel?: string;
  /**
   * Brand lock-up drawn over a poster's empty top area: the YDU name in Hindi and its tagline, the
   * way the printed poster sets them (logo, title, tagline, a short accent rule). It is left-aligned
   * to nothing and simply centred on the artwork.
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
  const { width } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const listRef = useRef<Animated.FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);
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

  const onPagerLayout = (event: LayoutChangeEvent) => setPagerHeight(event.nativeEvent.layout.height);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <AppStatusBar />

      {/* Brand only — nothing competes with the artwork. Skip lives over the image. */}
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <BrandMark size={26} />
          <Text style={[type.bodyStrong, { color: colors.text }]}>YDU Academy</Text>
        </View>
      </View>

      <View style={styles.pager} onLayout={onPagerLayout}>
        {pagerHeight > 0 ? (
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
              <SlideView slide={item} index={itemIndex} width={width} height={pagerHeight} scrollX={scrollX} />
            )}
          />
        ) : null}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
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
            accessibilityLabel={t("Skip introduction")}
            hitSlop={12}
            onPress={finish}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <Text style={[type.label, { color: colors.textMuted }]}>{t("Skip")}</Text>
          </Pressable>
        </View>
        <Button
          label={slides[index].cta}
          onPress={goNext}
          icon={ArrowRight}
          accessibilityHint={index === slides.length - 1 ? 'Opens the sign-in screen' : 'Shows the next introduction screen'}
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
}: {
  slide: Slide;
  index: number;
  width: number;
  height: number;
  scrollX: SharedValue<number>;
}) {
  const reduced = useReducedMotion();

  // Gentle image translation as the page moves; text fades with distance.
  const imageStyle = useAnimatedStyle(() => {
    if (reduced) return { transform: [{ translateX: 0 }] };
    const offset = interpolate(
      scrollX.value,
      [index - 1, index, index + 1],
      [width * 0.12, 0, -width * 0.12],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX: offset }, { scale: 1.06 }] };
  });

  const textStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1, transform: [{ translateY: 0 }] };
    const distance = Math.abs(scrollX.value - index);
    return {
      opacity: interpolate(distance, [0, 0.6], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(distance, [0, 0.6], [0, 12], Extrapolation.CLAMP) }],
    };
  });

  // A poster keeps its own margins: shown whole, on the paper background, with no copy under it.
  if (slide.poster) {
    return (
      <View style={{ width, height }}>
        <View style={styles.posterWrap}>
          <Image
            source={slide.image}
            style={styles.poster}
            contentFit="contain"
            transition={200}
            accessibilityLabel={slide.posterLabel}
          />
          {slide.posterTitle ? (
            /* Sits in the artwork's own empty space at the top: the mark, the name, the tagline and
               a short rule — the poster's lettering, in the poster's green. */
            <View style={styles.posterLockup} pointerEvents="none">
              <View style={styles.posterPlate}>
                <BrandMark size={30} color={POSTER_GREEN} />
              </View>
              <Text style={[type.display, styles.posterTitle, { color: POSTER_GREEN }]}>
                {slide.posterTitle}
              </Text>
              <Text style={[type.subheading, styles.posterTagline, { color: POSTER_GREEN }]}>
                {slide.posterTagline}
              </Text>
              <View style={styles.posterRule} />
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
      {/* Full-bleed: the image touches both screen edges, text sits below it on paper. */}
      <View style={styles.imageWrap}>
        <Animated.View style={[styles.imageInner, imageStyle]}>
          <Image source={slide.image} style={styles.image} contentFit="cover" transition={200} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.copy, textStyle]}>
        <Text style={[type.title, { color: colors.text }]}>{slide.headline}</Text>
        <Text style={[type.body, { color: colors.textMuted, maxWidth: 420 }]}>{slide.support}</Text>
      </Animated.View>
    </View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: { paddingHorizontal: layout.screen, paddingVertical: spacing.sm, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.sm },
  pager: { flex: 1 },
  imageWrap: { flex: 1, minHeight: 220, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  /* A poster shows whole — the two quiet bands around it are the page, not a crop. */
  posterWrap: { flex: 1, paddingHorizontal: layout.screen, paddingVertical: spacing.sm },
  poster: { width: '100%', height: '100%' },
  posterLockup: {
    position: 'absolute',
    top: spacing.lg,
    left: layout.section,
    right: layout.section,
    alignItems: 'center',
    gap: spacing.xs,
  },
  posterPlate: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
  imageInner: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  image: { width: '100%', height: '100%' },
  copy: {
    paddingHorizontal: layout.screen,
    paddingTop: spacing.lg,
    gap: spacing.sm,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
  },
  footer: {
    paddingHorizontal: layout.screen,
    paddingTop: spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  dots: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { height: 6, borderRadius: radius.pill },
  dotActive: { width: 22, backgroundColor: colors.primary },
  dotIdle: { width: 6, backgroundColor: colors.border },
}));
