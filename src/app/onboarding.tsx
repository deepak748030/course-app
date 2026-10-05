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
import { colors, layout, radius, spacing, type } from '@/constants/theme';
import { images } from '@/media';
import { useStore } from '@/store';
import type { ImageSource } from 'expo-image';

type Slide = {
  key: string;
  image: ImageSource;
  headline: string;
  support: string;
  cta: string;
};

const slides: Slide[] = [
  {
    key: 'joy',
    image: images.onboardingJoy,
    headline: 'A little practice.\nA lot of flavour.',
    support: 'Discover cooking courses that turn everyday ingredients into something special.',
    cta: 'Next',
  },
  {
    key: 'guided',
    image: images.onboardingGuided,
    headline: 'Learn the why,\nnot just the recipe.',
    support: 'Follow clear, step-by-step video lessons, from the first chop to the plated dish.',
    cta: 'Next',
  },
  {
    key: 'confidence',
    image: images.onboardingConfidence,
    headline: 'Your next great dish\nstarts here.',
    support: 'Build skills at your pace, save your favourites, and cook with confidence.',
    cta: 'Start learning',
  },
];

export default function OnboardingScreen() {
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
          <Text style={[type.bodyStrong, { color: colors.text }]}>Rasoi Studio</Text>
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
          <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${slides.length}`}>
            {slides.map((slide, dotIndex) => (
              <Dot key={slide.key} active={dotIndex === index} />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip introduction"
            hitSlop={12}
            onPress={finish}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <Text style={[type.label, { color: colors.textMuted }]}>Skip</Text>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: { paddingHorizontal: layout.screen, paddingVertical: spacing.sm, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.sm },
  pager: { flex: 1 },
  imageWrap: { flex: 1, minHeight: 220, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
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
});
