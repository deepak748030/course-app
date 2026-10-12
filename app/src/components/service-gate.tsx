import { Image } from 'expo-image';
import { RefreshCw, ArrowUpCircle } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { colors, createStyles, layout, radius, spacing, type } from '@/constants/theme';
import { useT } from '@/i18n';
import { images } from '@/media';
import { feedback } from '@/lib/util';
import { appVersion, isBelowMinimum } from '@/lib/version';
import { useStore } from '@/store';

/**
 * The app-wide gate. While the admin has maintenance mode on, or this build is older than the
 * minimum version, the whole app is replaced by a full-page screen — the screens underneath unmount,
 * so nothing keeps playing or loading behind it. Settings arrive live over the realtime channel,
 * so the gate lifts as soon as the admin turns it off. Until settings have loaded it stays open.
 */
export function ServiceGate({ children }: { children: ReactNode }) {
  const { settings } = useStore();
  if (settings?.maintenanceMode) return <MaintenanceScreen />;
  if (settings && isBelowMinimum(appVersion(), settings.minAppVersion)) {
    return <UpdateRequiredScreen required={settings.minAppVersion.trim()} />;
  }
  return <>{children}</>;
}

/** A value that moves forever between 0 and 1. */
function useLoop(duration: number, delay = 0) {
  const value = useSharedValue(0);
  useEffect(() => {
    value.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, [value, duration, delay]);
  return value;
}

/** The brand mark floating over soft rings that breathe outwards, with a slow dashed orbit. */
function Hero({ icon }: { icon?: 'update' }) {
  const float = useLoop(1500);
  const ringA = useLoop(2400);
  const ringB = useLoop(2400, 1200);
  const orbit = useSharedValue(0);
  useEffect(() => {
    orbit.value = withRepeat(withTiming(1, { duration: 12000, easing: Easing.linear }), -1, false);
  }, [orbit]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (float.value - 0.5) * -18 }, { rotate: `${(float.value - 0.5) * 4}deg` }],
  }));
  const ringStyle = (v: typeof ringA) =>
    useAnimatedStyle(() => ({ opacity: 0.45 * (1 - v.value), transform: [{ scale: 0.8 + v.value * 0.5 }] }));
  const ringAStyle = ringStyle(ringA);
  const ringBStyle = ringStyle(ringB);
  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${orbit.value * 360}deg` }] }));
  const dropStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (float.value - 0.5) * -10 }] }));

  return (
    <View style={styles.hero}>
      <Animated.View style={[styles.ring, ringAStyle]} />
      <Animated.View style={[styles.ring, ringBStyle]} />
      <Animated.View style={[styles.orbit, orbitStyle]} />
      <Animated.View style={[styles.mark, floatStyle]}>
        <Image source={images.brandMark} style={styles.markImage} contentFit="contain" transition={200} />
      </Animated.View>
      {icon === 'update' ? (
        <Animated.View style={[styles.badge, dropStyle]}>
          <ArrowUpCircle size={28} color={colors.accentText} strokeWidth={2} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Three dots that take turns to rise: the "still working" cue. */
function Dots() {
  const a = useLoop(360, 0);
  const b = useLoop(360, 120);
  const c = useLoop(360, 240);
  const style = (v: typeof a) => useAnimatedStyle(() => ({ transform: [{ translateY: -8 * v.value }], opacity: 0.4 + 0.6 * v.value }));
  const aStyle = style(a);
  const bStyle = style(b);
  const cStyle = style(c);
  return (
    <View style={styles.dots}>
      <Animated.View style={[styles.dot, aStyle]} />
      <Animated.View style={[styles.dot, bStyle]} />
      <Animated.View style={[styles.dot, cStyle]} />
    </View>
  );
}

/** A thin track with a highlight sliding across it. */
function Shimmer() {
  const progress = useLoop(1400);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -90 + progress.value * 260 }] }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.trackBar, style]} />
    </View>
  );
}

function ServiceScreen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      {children}
    </View>
  );
}

export function MaintenanceScreen() {
  const t = useT();
  const { settings, reloadSettings } = useStore();
  const [checking, setChecking] = useState(false);
  const [stillDown, setStillDown] = useState(false);

  const check = async () => {
    feedback.tap();
    setChecking(true);
    const next = await reloadSettings();
    setChecking(false);
    // If it is lifted, the gate unmounts this screen by itself; otherwise say so.
    setStillDown(Boolean(next?.maintenanceMode));
  };

  const hasSupport = Boolean(settings?.supportEmail || settings?.supportPhone);

  return (
    <ServiceScreen>
      <Hero />
      <Animated.View entering={FadeInDown.delay(120).duration(480)} style={styles.copy}>
        <Text style={[type.title, styles.center, { color: colors.text }]}>{t("We'll be back shortly")}</Text>
        <Text style={[type.body, styles.center, { color: colors.textMuted }]}>
          {t('YDU Academy is under scheduled maintenance. Your courses, progress and notes are safe.')}
        </Text>
      </Animated.View>

      <Dots />
      <Shimmer />

      {hasSupport ? (
        <Animated.View entering={FadeInDown.delay(260).duration(420)} style={styles.support}>
          <Text style={[type.labelStrong, { color: colors.text }]}>{t('Need help?')}</Text>
          {settings?.supportEmail ? <Text style={[type.label, { color: colors.textMuted }]}>{settings.supportEmail}</Text> : null}
          {settings?.supportPhone ? <Text style={[type.label, { color: colors.textMuted }]}>{settings.supportPhone}</Text> : null}
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(360).duration(420)} style={styles.actions}>
        {stillDown ? (
          <Text style={[type.label, styles.center, { color: colors.textSubtle }]}>
            {t('Still under maintenance. This page checks again when you tap the button.')}
          </Text>
        ) : null}
        <Button
          label={checking ? t('Checking…') : t('Check again')}
          icon={RefreshCw}
          loading={checking}
          onPress={check}
        />
      </Animated.View>
    </ServiceScreen>
  );
}

export function UpdateRequiredScreen({ required }: { required: string }) {
  const t = useT();
  const { reloadSettings } = useStore();
  const [checking, setChecking] = useState(false);
  const [stillOld, setStillOld] = useState(false);
  const current = appVersion();

  const check = async () => {
    feedback.tap();
    setChecking(true);
    const next = await reloadSettings();
    setChecking(false);
    setStillOld(Boolean(next && isBelowMinimum(current, next.minAppVersion)));
  };

  return (
    <ServiceScreen>
      <Hero icon="update" />
      <Animated.View entering={FadeInDown.delay(120).duration(480)} style={styles.copy}>
        <Text style={[type.title, styles.center, { color: colors.text }]}>{t('Update required')}</Text>
        <Text style={[type.body, styles.center, { color: colors.textMuted }]}>
          {t('A newer version of YDU Academy is needed to keep going.')}
        </Text>
        <Text style={[type.labelStrong, styles.center, { color: colors.text }]}>
          {t('You have {current}. The academy needs {required} or later. Update the app, then check again.', { current, required })}
        </Text>
      </Animated.View>

      <Shimmer />

      <Animated.View entering={FadeInDown.delay(300).duration(420)} style={styles.actions}>
        {stillOld ? (
          <Text style={[type.label, styles.center, { color: colors.textSubtle }]}>
            {t('Still on {current}. Update the app first.', { current })}
          </Text>
        ) : null}
        <Button label={checking ? t('Checking…') : t('Check again')} icon={RefreshCw} loading={checking} onPress={check} />
      </Animated.View>
    </ServiceScreen>
  );
}

const styles = createStyles(() =>
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: layout.screen,
      gap: spacing.lg,
    },
    hero: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
    ring: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      borderWidth: 2,
      borderColor: colors.accentText,
    },
    orbit: {
      position: 'absolute',
      width: 248,
      height: 248,
      borderRadius: 124,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.border,
    },
    mark: { alignItems: 'center', justifyContent: 'center' },
    markImage: { width: 150, height: 150 },
    badge: {
      position: 'absolute',
      bottom: 6,
      right: 26,
      backgroundColor: colors.background,
      borderRadius: radius.pill,
    },
    copy: { alignItems: 'center', gap: spacing.sm },
    center: { textAlign: 'center' },
    dots: { flexDirection: 'row', gap: spacing.sm, height: 14, alignItems: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentText },
    track: {
      width: 240,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    trackBar: { width: 90, height: 4, borderRadius: 2, backgroundColor: colors.accentText },
    support: {
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      width: '100%',
    },
    actions: { width: '100%', gap: spacing.sm, alignItems: 'center' },
  })
);
