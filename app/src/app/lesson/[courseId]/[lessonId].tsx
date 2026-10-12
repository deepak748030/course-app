import { useEvent, useEventListener } from 'expo';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  ArrowLeft,
  Check,
  CircleAlert,
  CircleCheck,
  CirclePlay,
  ChartNoAxesColumnIncreasing,
  Clapperboard,
  Clock,
  Gauge,
  Hd,
  ListVideo,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  Pause,
  Play,
  Plus,
  ShoppingBasket,
  SkipBack,
  SkipForward,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedCheck } from '@/components/animated-icons';
import { SaveButton } from '@/components/save-button';
import { AppStatusBar } from '@/components/app-status-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { LessonRow, type LessonRowState } from '@/components/course-cards';
import {
  AppBar,
  Badge,
  Button,
  DataList,
  EmptyState,
  IconButton,
  ListRow,
  MetaItem,
  ProgressBar,
  Screen,
  scrollClip,
} from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { nextLesson } from '@/lib/catalog';
import { track } from '@/services/analytics';
import { useCatalog } from '@/services/catalog-context';
import { api } from '@/services/api';
import { useT } from '@/i18n';
import { CLIP_RENDITION, videos } from '@/media';
import { useStore } from '@/store';
import { formatClock, lessonLength, scaleQuantity } from '@/lib/format';
import { feedback } from '@/lib/util';

type TabKey = 'overview' | 'recipe' | 'notes';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

/** `720` → `720p`; a legacy single file has no size, so it is `Original`. */
const qualityLabel = (quality: string) => (quality === 'original' ? 'Original' : `${quality}p`);
const SAVE_INTERVAL_SEC = 10;
/** How long the player controls stay on screen after they are called up. */
const CONTROLS_HIDE_MS = 3000;

/**
 * Every player control's size, derived from the picture's height. `safe` is the notch and home-indicator
 * inset: only the fullscreen picture needs it, because its controls sit on the screen edges.
 */
function playerMetrics(videoHeight: number, safe: { top: number; bottom: number }) {
  const playerScale = Math.max(0.8, Math.min(1, videoHeight / 236));
  const overlayPad = Math.round(spacing.sm * playerScale); // 6..8
  const blockGap = Math.max(2, Math.round((spacing.xs / 2) * playerScale)); // 3..4
  const trackHeight = Math.round(20 * playerScale); // 16..20
  const actionHeight = Math.round(40 * playerScale); // 32..40, hit-slopped to 44
  const timelineHeight = Math.max(trackHeight, spacing.lg);
  const topBlockHeight = layout.touchTarget + overlayPad * 2 + safe.top;
  const bottomBlockHeight = actionHeight + blockGap + timelineHeight + overlayPad + safe.bottom;
  const freeBandHeight = Math.max(44, videoHeight - topBlockHeight - bottomBlockHeight);
  const playSize = Math.round(Math.min(64, freeBandHeight - 4));
  const skipSize = Math.max(44, Math.min(52, Math.round(playSize * 0.8)));
  const largeGlyph = playSize >= 56;
  return {
    playerScale,
    overlayPad,
    blockGap,
    trackHeight,
    actionHeight,
    timelineHeight,
    topBlockHeight,
    bottomBlockHeight,
    playSize,
    skipSize,
    largeGlyph,
  };
}

export default function LessonPlayerScreen() {
  const t = useT();

  const params = useLocalSearchParams<{ courseId: string; lessonId: string; tab?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    isEnrolled,
    lessonProgress,
    setLessonComplete,
    setLessonPosition,
    noteFor,
    setNote,
    isRecipeSaved,
    toggleSavedRecipe,
    courseProgressRatio,
  } = useStore();

  const { byId } = useCatalog();
  const course = useMemo(() => byId(params.courseId), [byId, params.courseId]);
  const lesson = useMemo(
    () => course?.lessons.find((entry) => entry.id === params.lessonId) ?? course?.lessons[0],
    [course, params.lessonId],
  );

  const initialTab: TabKey =
    params.tab === 'recipe' && lesson?.recipe ? 'recipe' : params.tab === 'notes' ? 'notes' : 'overview';
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [lessonListOpen, setLessonListOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  /** True once the lesson has actually played in this visit: the extras wait for that. */
  const [hasStarted, setHasStarted] = useState(false);
  const [servings, setServings] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState(() => (lesson ? noteFor(lesson.id) : ''));
  const [noteSaved, setNoteSaved] = useState(true);

  const unlocked = Boolean(course && lesson && (isEnrolled(course.id) || lesson.isPreview));
  const storedPosition = course && lesson ? lessonProgress(course.id, lesson.id) : { positionSec: 0, completed: false };

  /** Course videos are private: the server signs a short-lived link for this learner only. */
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  /** Why the server refused the link (e.g. an expired session), shown instead of the generic line. */
  const [playbackReason, setPlaybackReason] = useState<string | null>(null);
  const [playbackAttempt, setPlaybackAttempt] = useState(0);
  /** Quality the learner picked; null = best available. */
  const [quality, setQuality] = useState<string | null>(null);
  /** Versions the server carries for this lesson, and the one actually streaming. */
  const [qualities, setQualities] = useState<string[]>([]);
  const [playingQuality, setPlayingQuality] = useState<string | null>(null);
  /** Playhead to restore once a different quality has loaded. */
  const resumeAtRef = useRef<number | null>(null);
  const needsPlaybackUrl = Boolean(unlocked && lesson?.hasCourseVideo);
  const courseRemoteId = course?.remoteId;
  const lessonRemoteId = lesson?.id;
  useEffect(() => {
    setPlaybackUrl(null);
    setPlaybackFailed(false);
    setPlaybackReason(null);
    if (!needsPlaybackUrl || !courseRemoteId || !lessonRemoteId) return;
    let cancelled = false;
    api
      .lessonVideoUrl(courseRemoteId, lessonRemoteId, quality ?? undefined)
      .then((res) => {
        if (cancelled) return;
        setPlaybackUrl(res.url);
        setPlayingQuality(res.quality);
        setQualities(res.qualities);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPlaybackFailed(true);
          setPlaybackReason(err instanceof Error ? err.message : null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [needsPlaybackUrl, courseRemoteId, lessonRemoteId, playbackAttempt, quality]);

  /** Switching version keeps the learner at the same moment instead of restarting the lesson. */
  const chooseQuality = (next: string | null) => {
    if (next === quality) return;
    resumeAtRef.current = player.currentTime;
    setQuality(next);
  };

  /** The course video once its link is ready, otherwise the bundled demo clip. */
  const videoSource = !unlocked || !lesson
    ? null
    : lesson.hasCourseVideo
      ? playbackUrl
        ? { uri: playbackUrl, useCaching: true }
        : null
      : videos[lesson.video];

  const player = useVideoPlayer(videoSource, (instance) => {
    instance.timeUpdateEventInterval = 1;
    // Keep ~10 seconds buffered ahead of the playhead; start as soon as a little is ready.
    instance.bufferOptions = { preferredForwardBufferDuration: 10, minBufferForPlayback: 2, waitsToMinimizeStalling: true };
    if (storedPosition.positionSec > 0) instance.currentTime = storedPosition.positionSec;
  });

  const lastSavedRef = useRef(storedPosition.positionSec);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Bumped by `showControls` so the peek effect restarts the three-second window. */
  const [showTick, setShowTick] = useState(0);

  /**
   * Every player control floats over the picture, so the picture's height is the budget everything
   * has to fit into. The surface is 16:9 and full-bleed, so on a phone it is only ~200pt tall: the
   * sizes below are derived from the measured height (with the 16:9 estimate for the first frame)
   * and the play button takes exactly the free band between the top row and the transport, which is
   * why nothing ever lands on the scrubber, the speed row or the two timers.
   */
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [measuredVideoHeight, setMeasuredVideoHeight] = useState(0);
  const videoHeight = measuredVideoHeight || Math.round((windowWidth * 9) / 16);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenHeight, setFullscreenHeight] = useState(0);

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const mutedEvent = useEvent(player, 'mutedChange', { muted: player.muted });
  const muted = mutedEvent?.muted ?? player.muted;
  /**
   * The rendition the lesson is playing. Android and iOS report the video tracks a source carries;
   * web reports none, so the bundled clips' known size stands in. The demo lessons ship a single
   * 540p file, and this list says exactly that — the control never invents options to switch to.
   */
  const tracks = player.availableVideoTracks ?? [];
  const rendition = tracks[0] ?? null;
  const renditionSize = rendition?.size ?? { width: CLIP_RENDITION.width, height: CLIP_RENDITION.height };
  const renditionLabel = playingQuality ? qualityLabel(playingQuality) : `${renditionSize.height}p`;
  const statusEvent = useEvent(player, 'statusChange', { status: player.status });
  const status = statusEvent?.status ?? player.status;
  const error = statusEvent?.error || playbackFailed;
  const [position, setPosition] = useState(storedPosition.positionSec);
  const [duration, setDuration] = useState(player.duration || 0);

  useEventListener(player, 'sourceLoad', ({ duration: loaded }) => {
    if (loaded > 0) setDuration(loaded);
    if (resumeAtRef.current !== null) {
      player.currentTime = resumeAtRef.current;
      resumeAtRef.current = null;
    }
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    setPosition(currentTime);
    if (player.duration) setDuration(player.duration);
    if (course && lesson && Math.abs(currentTime - lastSavedRef.current) >= SAVE_INTERVAL_SEC) {
      lastSavedRef.current = currentTime;
      setLessonPosition(course, lesson.id, currentTime);
    }
  });

  // Lessons can share the same demo clip, so the player is not recreated on every navigation.
  // Move it to the incoming lesson's saved position whenever the lesson changes.
  useEffect(() => {
    if (!course || !lesson) return;
    track('lesson_started', { courseId: course.remoteId, meta: { lessonId: lesson.id } });
    const target = lessonProgress(course.id, lesson.id).positionSec;
    lastSavedRef.current = target;
    setPosition(target);
    // A lesson the learner has not played yet is back to the short transport.
    setHasStarted(player.playing);
    if (player.status === 'readyToPlay') player.currentTime = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  // Persist the last position when leaving the lesson.
  useEffect(() => {
    if (!course || !lesson) return;
    return () => {
      if (unlocked) setLessonPosition(course, lesson.id, position);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, lesson?.id, unlocked]);

  /** Call the controls up: on mount, on a tap on the picture, or after any transport action. */
  const showControls = useCallback(() => {
    setControlsVisible(true);
    setShowTick((value) => value + 1);
  }, []);

  // Playback is what unlocks the extras, so the flag latches on the first play and stays for the
  // rest of the visit — pausing afterwards must not take the speed and fullscreen buttons away.
  useEffect(() => {
    if (isPlaying) setHasStarted(true);
  }, [isPlaying]);

  /**
   * The peek only runs while the lesson is playing — that is the whole point of it: the picture gets
   * out of the way once there is motion to watch. Before the first play, and whenever the video is
   * paused, the transport stays up for as long as the learner needs it, so the very first tap is not
   * something they have to aim at a picture that keeps going blank. Only a deliberate action (the
   * tap layer, play/pause, a seek, another lesson) restarts the three-second window; the
   * once-a-second time updates deliberately do not, or the timer would reset itself forever and the
   * controls would never leave.
   */
  useEffect(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!isPlaying) {
      setControlsVisible(true);
      return;
    }
    hideTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isPlaying, showTick, lesson?.id]);

  useEventListener(player, 'playToEnd', () => {
    showControls();
    if (course && lesson) setLessonPosition(course, lesson.id, 0);
  });

  // Leaving the lesson always gives the screen back to portrait.
  useEffect(
    () => () => {
      if (Platform.OS !== 'web') {
        void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
    },
    []
  );

  if (!course || !lesson) {
    return (
      <Screen header={<AppBar onBack={() => router.replace('/learning')} />}>
        <EmptyState
          icon={Clapperboard}
          title={t("Lesson not found")}
          body={t("This lesson may have been moved. Open the course to see the current curriculum.")}
          actionLabel={t("Go to My learning")}
          onAction={() => router.replace('/learning')}
        />
      </Screen>
    );
  }

  if (!unlocked) {
    return (
      <Screen header={<AppBar onBack={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })} />}>
        <EmptyState
          icon={Lock}
          title={t("This lesson is locked")}
          body={`“${lesson.title}” is part of ${course.title}. Buy the course to watch all ${course.lessonCount} lessons, or try one of the free previews.`}
          actionLabel={t("See what is included")}
          onAction={() => router.replace({ pathname: '/course/[id]', params: { id: course.id } })}
        />
      </Screen>
    );
  }

  const upcoming = nextLesson(course, lesson.id);
  const completed = storedPosition.completed;
  const progressPercent = duration > 0 ? position / duration : 0;
  const recipe = lesson.recipe;
  const baseServings = recipe?.servings ?? 1;
  const currentServings = servings ?? baseServings;
  const factor = currentServings / baseServings;
  const lessonNumber = course.lessons.findIndex((item) => item.id === lesson.id) + 1;

  const seekTo = (seconds: number) => {
    const clamped = Math.max(0, Math.min(seconds, duration || seconds));
    player.currentTime = clamped;
    setPosition(clamped);
    showControls();
  };

  const togglePlay = () => {
    feedback.tap();
    if (isPlaying) player.pause();
    else player.play();
    showControls();
  };

  const goToLesson = (lessonId: string) => {
    setLessonListOpen(false);
    showControls();
    router.replace({ pathname: '/lesson/[courseId]/[lessonId]', params: { courseId: course.id, lessonId } });
  };

  const markComplete = (value: boolean) => {
    if (value) track('lesson_completed', { courseId: course.remoteId, meta: { lessonId: lesson.id } });
    setLessonComplete(course, lesson.id, value);
    setLessonPosition(course, lesson.id, value ? 0 : position);
    if (value) feedback.success();
  };

  const stateFor = (lessonId: string): LessonRowState => {
    const entry = lessonProgress(course.id, lessonId);
    if (entry.completed) return 'completed';
    if (lessonId === lesson.id) return 'current';
    return 'available';
  };

  /** Rotates the screen for the picture: a wide video goes landscape, a tall one stays portrait. */
  const enterFullscreen = () => {
    feedback.tap();
    const portrait = renditionSize.height > renditionSize.width;
    setFullscreenOpen(true);
    showControls();
    if (Platform.OS !== 'web') {
      void ScreenOrientation.lockAsync(
        portrait ? ScreenOrientation.OrientationLock.PORTRAIT_UP : ScreenOrientation.OrientationLock.LANDSCAPE
      ).catch(() => {});
    }
  };

  const exitFullscreen = () => {
    setFullscreenOpen(false);
    showControls();
    if (Platform.OS !== 'web') {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
  };

  /** Sheets open under the fullscreen picture, so from fullscreen the picture steps back first. */
  /** Sheets open over the player where it is — including fullscreen — so the picture never shrinks. */
  const openFromPlayer = (open: (value: boolean) => void) => {
    open(true);
  };

  /**
   * The picture and its controls. The same markup is drawn inline and in the fullscreen modal; only the
   * size it is laid out for differs. While the lesson loads, only the spinner shows and every control waits.
   */
  const renderSurface = (height: number, fullscreen: boolean) => {
    const {
      playerScale,
      overlayPad,
      blockGap,
      trackHeight,
      actionHeight,
      topBlockHeight,
      bottomBlockHeight,
      playSize,
      skipSize,
      largeGlyph,
    } = playerMetrics(height, fullscreen ? { top: insets.top, bottom: insets.bottom } : { top: 0, bottom: 0 });
    const safeTop = fullscreen ? insets.top : 0;
    const safeBottom = fullscreen ? insets.bottom : 0;
    const sideTop = fullscreen
      ? { paddingLeft: layout.screen + insets.left, paddingRight: layout.screen + insets.right }
      : null;
    const sideBottom = fullscreen
      ? { paddingLeft: layout.section + insets.left, paddingRight: layout.section + insets.right }
      : null;
    const chromeVisible = controlsVisible && !error && status !== 'loading';
    const hit = { top: 0, bottom: Math.max(0, layout.touchTarget - actionHeight), left: spacing.xs, right: spacing.xs };
    const FullscreenIcon = fullscreen ? Minimize2 : Maximize2;
    const leave = () => {
      if (fullscreen) {
        exitFullscreen();
        return;
      }
      if (router.canGoBack()) router.back();
      else router.replace('/learning');
    };

    return (
      <>
        <VideoView
          player={player}
          style={styles.video}
          nativeControls={false}
          contentFit="contain"
          surfaceType="textureView"
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Show player controls")}
          accessibilityHint={t("They hide again a few seconds after the lesson starts playing")}
          onPress={showControls}
          style={StyleSheet.absoluteFill}
        />

        {status === 'loading' ? (
          <View style={[styles.centerOverlay, styles.noTouch]}>
            <ActivityIndicator color={colors.onPlayer} />
            <Text style={[type.label, { color: colors.onPlayerMuted }]}>{t("Loading lesson\u2026")}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.centerOverlay}>
            <CircleAlert size={26} color={colors.onPlayer} strokeWidth={1.9} />
            <Text style={[type.body, { color: colors.onPlayer, textAlign: 'center' }]}>
              {playbackReason ?? t("This lesson video could not be played.")}
            </Text>
            <Button
              label={t("Try again")}
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                if (lesson.hasCourseVideo && !playbackUrl) {
                  setPlaybackAttempt((n) => n + 1);
                  return;
                }
                if (videoSource) player.replace(videoSource);
                player.play();
              }}
            />
          </View>
        ) : null}

        {chromeVisible ? (
          <Animated.View
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(140)}
            style={[StyleSheet.absoluteFill, styles.boxNone]}>
            {/* Two short gradients so white glyphs stay readable on a bright frame. */}
            <LinearGradient
              colors={[colors.scrim, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[styles.topScrim, styles.noTouch, { height: topBlockHeight + spacing.lg }]}
            />
            <LinearGradient
              colors={['transparent', colors.scrim]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[styles.bottomScrim, styles.noTouch, { height: bottomBlockHeight + spacing.lg }]}
            />

            <View
              style={[
                styles.playerTop,
                { paddingTop: overlayPad + safeTop, paddingBottom: overlayPad, minHeight: topBlockHeight },
                sideTop,
              ]}>
              <IconButton
                icon={ArrowLeft}
                variant="onImage"
                accessibilityLabel={fullscreen ? t("Exit fullscreen") : t("Leave the lesson")}
                onPress={leave}
              />
              <View style={styles.playerTitleWrap}>
                <Text style={[type.label, { color: colors.onPlayerMuted }]} numberOfLines={1}>
                  {course.title}
                </Text>
                <Text style={[type.bodyStrong, { color: colors.onPlayer }]} numberOfLines={1}>
                  {lesson.title}
                </Text>
              </View>
              <IconButton
                icon={Clapperboard}
                variant="onImage"
                accessibilityLabel={t("Open lesson list")}
                onPress={() => openFromPlayer(setLessonListOpen)}
              />
            </View>

            <View
              style={[
                styles.playerCenter,
                styles.boxNone,
                { top: topBlockHeight, bottom: bottomBlockHeight, gap: Math.round(spacing.xl * playerScale) },
              ]}>
              <IconButton
                icon={SkipBack}
                variant="onImage"
                size={skipSize}
                iconSize={largeGlyph ? 24 : 20}
                accessibilityLabel={t("Go back 15 seconds")}
                onPress={() => seekTo(position - 15)}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause lesson' : 'Play lesson'}
                onPress={togglePlay}
                style={[styles.playButton, { width: playSize, height: playSize }]}>
                {isPlaying ? (
                  <Pause size={largeGlyph ? 30 : 24} color={colors.onPlayer} strokeWidth={1.8} fill={colors.onPlayer} />
                ) : (
                  <Play size={largeGlyph ? 30 : 24} color={colors.onPlayer} strokeWidth={1.8} fill={colors.onPlayer} />
                )}
              </Pressable>
              <IconButton
                icon={SkipForward}
                variant="onImage"
                size={skipSize}
                iconSize={largeGlyph ? 24 : 20}
                accessibilityLabel={t("Go forward 15 seconds")}
                onPress={() => seekTo(position + 15)}
              />
            </View>

            <View
              style={[
                styles.playerBottom,
                { paddingBottom: overlayPad + safeBottom, gap: blockGap },
                sideBottom,
              ]}>
              {/* Speed and fullscreen are for a lesson that is under way; before the first play
                  their band is reserved but empty, so the timeline and the play button hold their place. */}
              {hasStarted ? (
                <Animated.View
                  entering={FadeIn.duration(160)}
                  style={[styles.playerActions, { minHeight: actionHeight }]}>
                  <View style={[styles.actionGroup, { gap: overlayPad }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Playback speed, currently ${player.playbackRate} times`}
                      hitSlop={hit}
                      onPress={() => openFromPlayer(setSpeedOpen)}
                      style={styles.playerAction}>
                      <Gauge size={15} color={colors.onPlayer} strokeWidth={1.9} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Video quality, currently ${renditionLabel}`}
                      accessibilityHint={
                        tracks.length > 1
                          ? `${tracks.length} renditions available`
                          : 'This demo clip ships one rendition'
                      }
                      hitSlop={hit}
                      onPress={() => openFromPlayer(setQualityOpen)}
                      style={styles.playerAction}>
                      <Hd size={15} color={colors.onPlayer} strokeWidth={1.9} />
                    </Pressable>
                  </View>
                  <View style={[styles.actionGroup, { gap: overlayPad }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={muted ? 'Turn lesson sound on' : 'Mute lesson sound'}
                      hitSlop={hit}
                      onPress={() => {
                        feedback.tap();
                        player.muted = !muted;
                        showControls();
                      }}
                      style={styles.playerAction}>
                      {muted ? (
                        <VolumeX size={15} color={colors.onPlayer} strokeWidth={1.9} />
                      ) : (
                        <Volume2 size={15} color={colors.onPlayer} strokeWidth={1.9} />
                      )}
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={fullscreen ? t("Exit fullscreen") : t("Play in fullscreen")}
                      hitSlop={hit}
                      onPress={fullscreen ? exitFullscreen : enterFullscreen}
                      style={styles.playerAction}>
                      <FullscreenIcon size={15} color={colors.onPlayer} strokeWidth={1.9} />
                    </Pressable>
                  </View>
                </Animated.View>
              ) : (
                <View style={[styles.playerActions, { minHeight: actionHeight }]} />
              )}
              {/* Timeline between the two times: the track is shorter than the picture, so the
                  start and end numbers own the ends of the row. */}
              <View style={[styles.timeRow, { gap: overlayPad }]}>
                <Text style={[type.label, tabularNums, styles.timeText, { color: colors.onPlayer }]}>
                  {formatClock(position)}
                </Text>
                <SeekBar
                  progress={progressPercent}
                  onSeek={(ratio) => seekTo(ratio * duration)}
                  accessibilityLabel={t("Seek within the lesson")}
                  style={{ height: trackHeight }}
                />
                <Text style={[type.label, tabularNums, styles.timeText, { color: colors.onPlayer }]}>
                  {formatClock(duration)}
                </Text>
              </View>
            </View>
          </Animated.View>
        ) : null}
      </>
    );
  };


  /** The lesson list, speed and quality sheets. Drawn inline, or inside the fullscreen modal while it is open. */
  const sheets = (
    <>
      <BottomSheet
        visible={lessonListOpen}
        onClose={() => {
          setLessonListOpen(false);
          showControls();
        }}
        title={t("Lessons")}
        subtitle={`${course.lessonCount} lessons · ${Math.round(courseProgressRatio(course) * 100)}% complete`}
        scrollable>
        <DataList>
          {course.lessons.map((entry, lessonIndex) => (
            <LessonRow
              key={entry.id}
              lesson={entry}
              index={lessonIndex + 1}
              state={stateFor(entry.id)}
              onPress={() => goToLesson(entry.id)}
            />
          ))}
        </DataList>
      </BottomSheet>

      <BottomSheet
        visible={speedOpen}
        onClose={() => {
          setSpeedOpen(false);
          showControls();
        }}
        title={t("Playback speed")}>
        {SPEEDS.map((speed) => (
          <Pressable
            key={speed}
            accessibilityRole="radio"
            accessibilityState={{ selected: player.playbackRate === speed }}
            accessibilityLabel={`${speed} times speed`}
            onPress={() => {
              player.playbackRate = speed;
              setSpeedOpen(false);
              showControls();
            }}
            style={({ pressed }) => [styles.sheetRow, pressed && { opacity: 0.7 }]}>
            <Text style={[type.body, { color: colors.text }]}>{speed === 1 ? 'Normal (1×)' : `${speed}×`}</Text>
            {player.playbackRate === speed ? <Check size={18} color={colors.accentText} strokeWidth={2.2} /> : null}
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet
        visible={qualityOpen}
        onClose={() => {
          setQualityOpen(false);
          showControls();
        }}
        title={t("Video quality")}
        subtitle={
          qualities.length > 0
            ? `${qualities.length} versions uploaded for this lesson`
            : tracks.length > 1
            ? `${tracks.length} renditions in this lesson`
            : 'This demo lesson ships a single rendition'
        }>
        {qualities.length > 0 ? (
          <>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: quality === null }}
              onPress={() => {
                chooseQuality(null);
                setQualityOpen(false);
                showControls();
              }}
              style={({ pressed }) => [styles.sheetRow, pressed && { opacity: 0.7 }]}>
              <View style={styles.flex}>
                <Text style={[type.body, { color: colors.text }]}>{t('Best available')}</Text>
                <Text style={[type.label, { color: colors.textMuted }]}>
                  {quality === null && playingQuality ? `Playing ${qualityLabel(playingQuality)}` : t('Chosen automatically')}
                </Text>
              </View>
              {quality === null ? <Check size={18} color={colors.accentText} strokeWidth={2.2} /> : null}
            </Pressable>
            {qualities.map((q) => (
              <Pressable
                key={q}
                accessibilityRole="radio"
                accessibilityState={{ selected: quality === q }}
                accessibilityLabel={qualityLabel(q)}
                onPress={() => {
                  chooseQuality(q);
                  setQualityOpen(false);
                  showControls();
                }}
                style={({ pressed }) => [styles.sheetRow, pressed && { opacity: 0.7 }]}>
                <Text style={[type.body, styles.flex, { color: colors.text }]}>{qualityLabel(q)}</Text>
                {quality === q ? <Check size={18} color={colors.accentText} strokeWidth={2.2} /> : null}
              </Pressable>
            ))}
          </>
        ) : null}
        {(qualities.length > 0 ? [] : tracks.length > 1 ? tracks : [{ id: 'demo', size: renditionSize, averageBitrate: null }]).map((track, index) => {
          const active = rendition ? track.id === rendition.id : index === 0;
          const size = track.size;
          const bitrate = 'averageBitrate' in track ? track.averageBitrate : null;
          const detail = [
            `${size.width} × ${size.height}`,
            bitrate ? `${Math.round(bitrate / 1000)} kbps` : null,
            active ? 'in use' : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <View key={track.id} style={styles.sheetRow} accessibilityLabel={`${size.height}p, ${detail}`}>
              <View style={styles.flex}>
                <Text style={[type.body, { color: colors.text }]}>{size.height}p</Text>
                <Text style={[type.label, { color: colors.textMuted }]}>{detail}</Text>
              </View>
              {active ? <Check size={18} color={colors.accentText} strokeWidth={2.2} /> : null}
            </View>
          );
        })}
        {/* Honest about the demo: one bundled file, and adaptive quality arrives with streaming. */}
        {qualities.length === 0 ? (
          <Text style={[type.label, styles.sheetNote, { color: colors.textSubtle }]}>
            {t('The bundled demo clips are one 540p file each, so there is nothing to switch between here. Lessons that stream from a server list every rendition they carry, and the player picks the best one for the connection automatically.')}
          </Text>
        ) : null}
      </BottomSheet>
    </>
  );

  return (
    <View style={styles.root}>
      <AppStatusBar />

      {/* Player. The system bar strip is left to the app background and the video sits below it.
          The controls float over the picture; the picture is 16:9 inline and fills the screen in
          fullscreen (see `renderSurface`). */}
      <View style={[styles.playerWrap, { paddingTop: insets.top }]}>
        <View
          style={styles.playerSurface}
          onLayout={(event: LayoutChangeEvent) => setMeasuredVideoHeight(event.nativeEvent.layout.height)}>
          {renderSurface(videoHeight, false)}
        </View>
      </View>

      <Modal
        visible={fullscreenOpen}
        animationType="fade"
        supportedOrientations={['portrait', 'landscape']}
        statusBarTranslucent
        onRequestClose={exitFullscreen}>
        <View
          style={styles.fullscreenRoot}
          onLayout={(event: LayoutChangeEvent) => setFullscreenHeight(event.nativeEvent.layout.height)}>
          <StatusBar hidden />
          {renderSurface(fullscreenHeight || windowHeight, true)}
          {sheets}
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={[styles.flex, styles.clipPanel]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}>
        <ScrollView
          style={scrollClip}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Title block under the video: section and status on one line, then the title, the
              facts and the progress — four short lines instead of a stack of loose labels, and
              then a hairline so the tabs read as a separate control instead of more body copy. */}
          <View style={styles.lessonHead}>
            <View style={styles.kickerRow}>
              <Text style={[type.overline, styles.flex, { color: colors.textSubtle }]} numberOfLines={1}>
                {course.title}
              </Text>
              {lesson.isPreview ? <Badge label={t("Free preview")} tone="sage" icon={CirclePlay} /> : null}
            </View>
            <Text style={[type.title, { color: colors.text }]}>{lesson.title}</Text>
            <View style={styles.metaWrap}>
              <MetaItem icon={Clapperboard} label={`Lesson ${lessonNumber} of ${course.lessonCount}`} />
              <MetaItem icon={Clock} label={lessonLength(lesson)} />
              <MetaItem icon={ChartNoAxesColumnIncreasing} label={course.level} />
            </View>
            {completed ? (
              <View style={styles.badgeRow}>
                <Badge label={t("Completed")} tone="success" icon={CircleCheck} />
              </View>
            ) : null}
            <View style={styles.progressBlock}>
              <View style={styles.progressHead}>
                <Text style={[type.label, { color: colors.textMuted }]}>{t("Course progress")}</Text>
                <Text style={[type.labelStrong, tabularNums, { color: colors.text }]}>
                  {Math.round(courseProgressRatio(course) * 100)}%
                </Text>
              </View>
              <ProgressBar value={courseProgressRatio(course)} accessibilityLabel={`${course.title} progress`} />
            </View>
          </View>

          <View style={styles.rule} />

          <View style={styles.tabs}>
            <TabButton label={t("Overview")} active={tab === 'overview'} onPress={() => setTab('overview')} />
            <TabButton
              label={t("Sheet")}
              active={tab === 'recipe'}
              disabled={!recipe}
              hint={recipe ? undefined : 'This lesson has no batch sheet'}
              onPress={() => recipe && setTab('recipe')}
            />
            <TabButton label={t("Notes")} active={tab === 'notes'} onPress={() => setTab('notes')} />
          </View>

          {tab === 'overview' ? (
            <View style={styles.tabBody}>
              <Text style={[type.body, { color: colors.text }]}>{lesson.description}</Text>
              <Button
                label={completed ? 'Mark as not done' : 'Mark lesson as complete'}
                variant={completed ? 'secondary' : 'primary'}
                icon={completed ? CircleCheck : undefined}
                iconNode={completed ? undefined : <AnimatedCheck size={18} color={colors.onAccent} />}
                accessibilityHint={completed ? 'Removes the completed mark from this lesson' : undefined}
                onPress={() => markComplete(!completed)}
              />
              {/* Where to go next lives in one hairline list: a row with an icon tile and a chevron
                  reads as somewhere to tap, which three stacked text links did not. */}
              <View style={styles.actionCard}>
                <DataList dividerInset={layout.screen + 32 + spacing.md}>
                  {upcoming ? (
                    <ListRow
                      icon={Play}
                      label={upcoming.title}
                      subtitle={`Next lesson · ${lessonLength(upcoming)}`}
                      onPress={() => goToLesson(upcoming.id)}
                    />
                  ) : (
                    <ListRow
                      icon={Trophy}
                      label={t("You have reached the last lesson")}
                      subtitle={t("Open the course for what comes next")}
                      onPress={() => router.replace({ pathname: '/course/[id]', params: { id: course.id } })}
                    />
                  )}
                  <ListRow
                    icon={ListVideo}
                    label={t("All lessons in this course")}
                    subtitle={`${course.lessonCount} lessons`}
                    onPress={() => setLessonListOpen(true)}
                  />
                </DataList>
              </View>
              <Text style={[type.label, { color: colors.textSubtle }]}>{t("Playback position is saved on this device, so you can leave and come back.")}</Text>
            </View>
          ) : null}

          {tab === 'recipe' && recipe ? (
            <View style={styles.tabBody}>
              <View style={styles.recipeHead}>
                <View style={styles.flex}>
                  <Text style={[type.subheading, { color: colors.text }]}>{recipe.title}</Text>
                  <View style={styles.metaRow}>
                    <Clock size={14} color={colors.textMuted} strokeWidth={1.9} />
                    <Text style={[type.label, tabularNums, { color: colors.textMuted }]}>
                      {recipe.prepMinutes} min prep · {recipe.cookMinutes} min make
                    </Text>
                  </View>
                </View>
                <SaveButton
                  saved={isRecipeSaved(recipe.id)}
                  variant="soft"
                  accessibilityLabel={isRecipeSaved(recipe.id) ? 'Remove batch sheet from saved' : 'Save batch sheet'}
                  onToggle={() => toggleSavedRecipe(recipe.id)}
                />
              </View>

              <View style={styles.servingsRow}>
                <Text style={[type.label, { color: colors.textMuted }]}>{t("Batch")}</Text>
                <View style={styles.stepper}>
                  <IconButton
                    icon={Minus}
                    variant="soft"
                    size={36}
                    iconSize={16}
                    accessibilityLabel={t("Smaller batch")}
                    onPress={() => setServings(Math.max(1, currentServings - 1))}
                  />
                  <Text style={[type.bodyStrong, tabularNums, styles.servingValue, { color: colors.text }]}>
                    {currentServings}
                  </Text>
                  <IconButton
                    icon={Plus}
                    variant="soft"
                    size={36}
                    iconSize={16}
                    accessibilityLabel={t("Larger batch")}
                    onPress={() => setServings(Math.min(12, currentServings + 1))}
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.ingredientHead}>
                  <ShoppingBasket size={16} color={colors.sage} strokeWidth={1.9} />
                  <Text style={[type.labelStrong, { color: colors.text }]}>{t("Materials")}</Text>
                </View>
                {recipe.ingredients.map((ingredient) => (
                  <View key={ingredient.item} style={styles.ingredientRow}>
                    <Text style={[type.body, { color: colors.text, flex: 1 }]}>{ingredient.item}</Text>
                    <Text style={[type.body, tabularNums, { color: colors.textMuted }]}>
                      {scaleQuantity(ingredient.quantity, factor)}
                    </Text>
                  </View>
                ))}
                {factor !== 1 ? (
                  <Text style={[type.label, { color: colors.textSubtle }]}>
                    Quantities scaled from the original batch of {baseServings}.
                  </Text>
                ) : null}
              </View>

              <View style={styles.sectionCard}>
                <Text style={[type.labelStrong, { color: colors.text }]}>{t("Steps")}</Text>
                {recipe.steps.map((step, index) => (
                  <View key={step} style={styles.stepRow}>
                    <View style={styles.stepNumber}>
                      <Text style={[type.labelStrong, tabularNums, { color: colors.accentText }]}>{index + 1}</Text>
                    </View>
                    <Text style={[type.body, { color: colors.text, flex: 1 }]}>{step}</Text>
                  </View>
                ))}
              </View>

              {recipe.tips.length > 0 ? (
                <View style={[styles.sectionCard, styles.tipsCard]}>
                  <Text style={[type.labelStrong, { color: colors.text }]}>{t("Notes for this lesson")}</Text>
                  {recipe.tips.map((tip) => (
                    <Text key={tip} style={[type.body, { color: colors.textMuted }]}>
                      • {tip}
                    </Text>
                  ))}
                </View>
              ) : null}

              <Text style={[type.label, { color: colors.textSubtle }]}>{t("Sample batch sheet for learning. This is not food-safety or regulatory advice \u2014 check your own process and local rules.")}</Text>
            </View>
          ) : null}

          {tab === 'notes' ? (
            <View style={styles.tabBody}>
              <Text style={[type.body, { color: colors.textMuted }]}>
                Notes are private to this device and stay with “{lesson.title}”.
              </Text>
              <TextInput
                value={noteDraft}
                onChangeText={(text) => {
                  setNoteDraft(text);
                  setNoteSaved(false);
                }}
                onBlur={() => {
                  setNote(lesson.id, noteDraft);
                  setNoteSaved(true);
                }}
                multiline
                placeholder={t("What did you change? What will you try next time?")}
                placeholderTextColor={colors.textSubtle}
                accessibilityLabel={`Notes for ${lesson.title}`}
                style={[styles.notesInput, type.body, { color: colors.text }]}
              />
              <View style={styles.notesFooter}>
                <Button
                  label={t("Save note")}
                  variant="secondary"
                  fullWidth={false}
                  onPress={() => {
                    setNote(lesson.id, noteDraft);
                    setNoteSaved(true);
                    feedback.tap();
                  }}
                />
                <Text style={[type.label, { color: colors.textMuted, flex: 1 }]}>
                  {noteSaved ? 'Saved on this device' : 'Unsaved changes'}
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {!fullscreenOpen ? sheets : null}
    </View>
  );
}

/** Tap anywhere on the track to seek; buttons cover the accessible path. */
function SeekBar({
  progress,
  onSeek,
  accessibilityLabel,
  style,
}: {
  progress: number;
  onSeek: (ratio: number) => void;
  accessibilityLabel: string;
  /** The track's height is set by the player, which sizes the transport from the video height. */
  style?: StyleProp<ViewStyle>;
}) {
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = reduced ? progress : withTiming(progress, { duration: 120 });
  }, [progress, reduced, value]);

  const fillStyle = useAnimatedStyle(() => ({ width: Math.round(Math.max(0, Math.min(1, value.value)) * width) }));

  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      onPress={(event) => {
        if (width <= 0) return;
        onSeek(Math.max(0, Math.min(1, event.nativeEvent.locationX / width)));
      }}
      style={[styles.seekTrack, style]}>
      <View style={styles.seekRail}>
        <View style={styles.seekRailLine} />
      </View>
      <Animated.View style={[styles.seekFill, fillStyle]} />
    </Pressable>
  );
}

function TabButton({
  label,
  active,
  onPress,
  disabled = false,
  hint,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.tabButton, active && styles.tabButtonActive, disabled && { opacity: 0.45 }]}>
      <Text style={[active ? type.labelStrong : type.label, { color: active ? colors.text : colors.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = createStyles(() => StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
  boxNone: { pointerEvents: 'box-none' },
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  /* Android would otherwise let the panel's content scroll up over the video (see <Screen>). */
  clipPanel: { overflow: 'hidden' },
  playerWrap: { backgroundColor: colors.background },
  fullscreenRoot: { flex: 1, backgroundColor: colors.player, overflow: 'hidden' },
  /** The picture, and the whole dark area: nothing is painted below it. */
  playerSurface: { aspectRatio: 16 / 9, backgroundColor: colors.player, overflow: 'hidden' },
  video: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.player },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  /* Transport: the bars are pinned to the picture's own edges, so the rows never push each other. */
  playerBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout.section,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  /** Fixed width keeps the track from jiggling as the timer gains a digit. */
  timeText: { minWidth: 34, textAlign: 'center' },
  centerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.scrim,
    paddingHorizontal: layout.section,
  },
  playerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screen,
  },
  playerTitleWrap: { flex: 1, alignItems: 'center', gap: 2 },
  /** Fills the band between the top row and the transport, so play/pause lands dead centre. */
  playerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    borderRadius: radius.pill,
    backgroundColor: colors.scrim,
    borderWidth: 1,
    borderColor: colors.onPlayerMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekTrack: { flex: 1, height: 22, justifyContent: 'center' },
  /** The unfilled part of the track, so the position reads against the picture too. */
  seekRail: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center' },
  seekRailLine: { height: 4, borderRadius: 2, backgroundColor: colors.onPlayerMuted, opacity: 0.45 },
  seekFill: { height: 4, borderRadius: 2, backgroundColor: colors.gold },
  playerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionGroup: { flexDirection: 'row', alignItems: 'center' },
  /** The one line of honest explanation the sheets end on. */
  sheetNote: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  playerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  content: { gap: layout.gap },
  lessonHead: {
    paddingHorizontal: layout.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap', marginTop: spacing.xs },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  /** A little air above the bar, so progress reads as its own group under the facts. */
  progressBlock: { gap: spacing.xs, marginTop: spacing.md },
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rule: { height: 1, backgroundColor: colors.divider },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' },

  tabs: {
    flexDirection: 'row',
    gap: layout.gap,
    paddingHorizontal: layout.screen,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: { flex: 1, minHeight: layout.touchTarget, alignItems: 'center', justifyContent: 'center' },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },

  tabBody: { gap: layout.gap, paddingTop: layout.gap, paddingHorizontal: layout.screen },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  tipsCard: { backgroundColor: colors.surfaceAlt, borderColor: 'transparent' },
  /** Full-bleed list out of the body's 8pt gutter, the same shape as the groups on Profile. */
  actionCard: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginHorizontal: -layout.screen,
  },

  recipeHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  servingValue: { minWidth: 28, textAlign: 'center' },
  ingredientHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ingredientRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  stepRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notesInput: {
    minHeight: 160,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  notesFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  sheetSection: { gap: spacing.sm, paddingBottom: spacing.md },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.touchTarget,
    paddingVertical: spacing.sm,
  },
}));
