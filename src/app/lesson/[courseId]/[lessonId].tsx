import { useEvent, useEventListener } from 'expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  CircleAlert,
  CircleCheck,
  ChartNoAxesColumnIncreasing,
  Clapperboard,
  Clock,
  Gauge,
  Lock,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  ShoppingBasket,
  SkipBack,
  SkipForward,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppStatusBar } from '@/components/app-status-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { LessonRow, type LessonRowState } from '@/components/course-cards';
import { AppBar, Badge, Button, DataList, EmptyState, IconButton, MetaItem, ProgressBar, Screen } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { courseById, nextLesson } from '@/data/catalog';
import { videos } from '@/media';
import { useStore } from '@/store';
import { formatClock, scaleQuantity } from '@/lib/format';
import { feedback } from '@/lib/util';

type TabKey = 'overview' | 'recipe' | 'notes';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const SAVE_INTERVAL_SEC = 10;

export default function LessonPlayerScreen() {
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

  const course = useMemo(() => courseById(params.courseId), [params.courseId]);
  const lesson = useMemo(
    () => course?.lessons.find((entry) => entry.id === params.lessonId) ?? course?.lessons[0],
    [course, params.lessonId],
  );

  const initialTab: TabKey =
    params.tab === 'recipe' && lesson?.recipe ? 'recipe' : params.tab === 'notes' ? 'notes' : 'overview';
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [lessonListOpen, setLessonListOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [servings, setServings] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState(() => (lesson ? noteFor(lesson.id) : ''));
  const [noteSaved, setNoteSaved] = useState(true);

  const unlocked = Boolean(course && lesson && (isEnrolled(course.id) || lesson.isPreview));
  const storedPosition = course && lesson ? lessonProgress(course.id, lesson.id) : { positionSec: 0, completed: false };

  const player = useVideoPlayer(unlocked && lesson ? videos[lesson.video] : null, (instance) => {
    instance.timeUpdateEventInterval = 1;
    if (storedPosition.positionSec > 0) instance.currentTime = storedPosition.positionSec;
  });

  const videoRef = useRef<VideoView>(null);
  const lastSavedRef = useRef(storedPosition.positionSec);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Every player control floats over the picture, so the picture's height is the budget everything
   * has to fit into. The surface is 16:9 and full-bleed, so on a phone it is only ~200pt tall: the
   * sizes below are derived from the measured height (with the 16:9 estimate for the first frame)
   * and the play button takes exactly the free band between the top row and the transport, which is
   * why nothing ever lands on the scrubber, the speed row or the two timers.
   */
  const { width: windowWidth } = useWindowDimensions();
  const [measuredVideoHeight, setMeasuredVideoHeight] = useState(0);
  const videoHeight = measuredVideoHeight || Math.round((windowWidth * 9) / 16);
  const playerScale = Math.max(0.8, Math.min(1, videoHeight / 236));
  const overlayPad = Math.round(spacing.sm * playerScale);          // 6..8
  const blockGap = Math.max(2, Math.round((spacing.xs / 2) * playerScale)); // 3..4
  const trackHeight = Math.round(20 * playerScale);                 // 16..20
  const actionHeight = Math.round(40 * playerScale);                // 32..40, hit-slopped to 44
  const topBlockHeight = layout.touchTarget + overlayPad * 2;
  const bottomBlockHeight = trackHeight + blockGap * 2 + actionHeight + spacing.lg + overlayPad;
  const freeBandHeight = Math.max(44, videoHeight - topBlockHeight - bottomBlockHeight);
  const playSize = Math.round(Math.min(64, freeBandHeight - 4));
  const skipSize = Math.max(44, Math.min(52, Math.round(playSize * 0.8)));
  const largeGlyph = playSize >= 56;

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const statusEvent = useEvent(player, 'statusChange', { status: player.status });
  const status = statusEvent?.status ?? player.status;
  const error = statusEvent?.error;
  const [position, setPosition] = useState(storedPosition.positionSec);
  const [duration, setDuration] = useState(player.duration || 0);

  useEventListener(player, 'sourceLoad', ({ duration: loaded }) => {
    if (loaded > 0) setDuration(loaded);
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    setPosition(currentTime);
    if (player.duration) setDuration(player.duration);
    if (course && lesson && Math.abs(currentTime - lastSavedRef.current) >= SAVE_INTERVAL_SEC) {
      lastSavedRef.current = currentTime;
      setLessonPosition(course.id, lesson.id, currentTime);
    }
  });

  // Lessons can share the same demo clip, so the player is not recreated on every navigation.
  // Move it to the incoming lesson's saved position whenever the lesson changes.
  useEffect(() => {
    if (!course || !lesson) return;
    const target = lessonProgress(course.id, lesson.id).positionSec;
    lastSavedRef.current = target;
    setPosition(target);
    if (player.status === 'readyToPlay') player.currentTime = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  // Persist the last position when leaving the lesson.
  useEffect(() => {
    if (!course || !lesson) return;
    return () => {
      if (unlocked) setLessonPosition(course.id, lesson.id, position);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, lesson?.id, unlocked]);

  // Auto-hide the controls while playing, the way a player is expected to behave.
  useEffect(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!isPlaying) {
      setControlsVisible(true);
      return;
    }
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3200);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isPlaying, position]);

  useEventListener(player, 'playToEnd', () => {
    setControlsVisible(true);
    if (course && lesson) setLessonPosition(course.id, lesson.id, 0);
  });

  if (!course || !lesson) {
    return (
      <Screen header={<AppBar onBack={() => router.replace('/learning')} />}>
        <EmptyState
          icon={Clapperboard}
          title="Lesson not found"
          body="This lesson may have been moved. Open the course to see the current curriculum."
          actionLabel="Go to My learning"
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
          title="This lesson is locked"
          body={`“${lesson.title}” is part of ${course.title}. Buy the course to watch all ${course.lessonCount} lessons, or try one of the free previews.`}
          actionLabel="See what is included"
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
  const currentSection = course.sections.find((section) => section.id === lesson.sectionId);
  const lessonNumber = course.lessons.findIndex((item) => item.id === lesson.id) + 1;

  const seekTo = (seconds: number) => {
    const clamped = Math.max(0, Math.min(seconds, duration || seconds));
    player.currentTime = clamped;
    setPosition(clamped);
  };

  const togglePlay = () => {
    feedback.tap();
    if (isPlaying) player.pause();
    else player.play();
    setControlsVisible(true);
  };

  const goToLesson = (lessonId: string) => {
    setLessonListOpen(false);
    router.replace({ pathname: '/lesson/[courseId]/[lessonId]', params: { courseId: course.id, lessonId } });
  };

  const markComplete = (value: boolean) => {
    setLessonComplete(course.id, lesson.id, value);
    setLessonPosition(course.id, lesson.id, value ? 0 : position);
    if (value) feedback.success();
  };

  const stateFor = (lessonId: string): LessonRowState => {
    const entry = lessonProgress(course.id, lessonId);
    if (entry.completed) return 'completed';
    if (lessonId === lesson.id) return 'current';
    return 'available';
  };

  return (
    <View style={styles.root}>
      <AppStatusBar />

      {/* Player. The system bar strip is left to the app background and the video sits below it.
          Everything else floats over the picture, so the dark area is exactly the 16:9 video and
          nothing hangs under it: play/pause and the skip buttons in the free band in the middle,
          then — in the order asked for — the scrubber, the speed and fullscreen row, and the two
          timers on the very bottom line. The rows are sized from the surface height (see
          `videoHeight` above) so they stay clear of each other on every screen. */}
      <View style={[styles.playerWrap, { paddingTop: insets.top }]}>
        <View
          style={styles.playerSurface}
          onLayout={(event: LayoutChangeEvent) => setMeasuredVideoHeight(event.nativeEvent.layout.height)}>
          <VideoView
            ref={videoRef}
            player={player}
            style={styles.video}
            nativeControls={false}
            contentFit="contain"
            fullscreenOptions={{ enable: true }}
            surfaceType="textureView"
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={controlsVisible ? 'Hide player controls' : 'Show player controls'}
            onPress={() => setControlsVisible((value) => !value)}
            style={StyleSheet.absoluteFill}
          />

          {status === 'loading' ? (
            <View style={[styles.centerOverlay, styles.noTouch]}>
              <ActivityIndicator color={colors.onPlayer} />
              <Text style={[type.label, { color: colors.onPlayerMuted }]}>Loading lesson…</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.centerOverlay}>
              <CircleAlert size={26} color={colors.onPlayer} strokeWidth={1.9} />
              <Text style={[type.body, { color: colors.onPlayer, textAlign: 'center' }]}>
                This lesson video could not be played.
              </Text>
              <Button
                label="Try again"
                variant="secondary"
                fullWidth={false}
                onPress={() => {
                  player.replace(videos[lesson.video]);
                  player.play();
                }}
              />
            </View>
          ) : null}

          {controlsVisible && !error ? (
            <Animated.View entering={FadeIn.duration(160)} style={[StyleSheet.absoluteFill, styles.boxNone]}>
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
                  { paddingTop: overlayPad, paddingBottom: overlayPad, minHeight: topBlockHeight },
                ]}>
                <IconButton
                  icon={ArrowLeft}
                  variant="onImage"
                  accessibilityLabel="Leave the lesson"
                  onPress={() => (router.canGoBack() ? router.back() : router.replace('/learning'))}
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
                  accessibilityLabel="Open lesson list"
                  onPress={() => setLessonListOpen(true)}
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
                  accessibilityLabel="Go back 15 seconds"
                  onPress={() => seekTo(position - 15)}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? 'Pause lesson' : 'Play lesson'}
                  onPress={togglePlay}
                  style={[styles.playButton, { width: playSize, height: playSize }]}>
                  {isPlaying ? (
                    <Pause
                      size={largeGlyph ? 30 : 24}
                      color={colors.onPlayer}
                      strokeWidth={1.8}
                      fill={colors.onPlayer}
                    />
                  ) : (
                    <Play
                      size={largeGlyph ? 30 : 24}
                      color={colors.onPlayer}
                      strokeWidth={1.8}
                      fill={colors.onPlayer}
                    />
                  )}
                </Pressable>
                <IconButton
                  icon={SkipForward}
                  variant="onImage"
                  size={skipSize}
                  iconSize={largeGlyph ? 24 : 20}
                  accessibilityLabel="Go forward 15 seconds"
                  onPress={() => seekTo(position + 15)}
                />
              </View>

              <View style={[styles.playerBottom, { paddingBottom: overlayPad, gap: blockGap }]}>
                <SeekBar
                  progress={progressPercent}
                  onSeek={(ratio) => seekTo(ratio * duration)}
                  accessibilityLabel="Seek within the lesson"
                  style={{ height: trackHeight }}
                />
                <View style={[styles.playerActions, { minHeight: actionHeight }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Playback speed, currently ${player.playbackRate} times`}
                    hitSlop={{ top: 0, bottom: Math.max(0, layout.touchTarget - actionHeight), left: spacing.xs, right: spacing.xs }}
                    onPress={() => setSpeedOpen(true)}
                    style={styles.playerAction}>
                    <Gauge size={15} color={colors.onPlayer} strokeWidth={1.9} />
                    <Text style={[type.label, tabularNums, { color: colors.onPlayer }]}>{player.playbackRate}×</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Play in fullscreen"
                    hitSlop={{ top: 0, bottom: Math.max(0, layout.touchTarget - actionHeight), left: spacing.xs, right: spacing.xs }}
                    onPress={() => void videoRef.current?.enterFullscreen()}
                    style={styles.playerAction}>
                    <Maximize2 size={15} color={colors.onPlayer} strokeWidth={1.9} />
                    <Text style={[type.label, { color: colors.onPlayer }]}>Fullscreen</Text>
                  </Pressable>
                </View>
                <View style={styles.timeRow}>
                  <Text style={[type.label, tabularNums, { color: colors.onPlayer }]}>{formatClock(position)}</Text>
                  <Text style={[type.label, tabularNums, { color: colors.onPlayer }]}>{formatClock(duration)}</Text>
                </View>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Title block under the video: overline, title, facts and progress, then a hairline
              so the tabs read as a separate control instead of more body copy. */}
          <View style={styles.lessonHead}>
            <Text style={[type.overline, { color: colors.textSubtle }]} numberOfLines={1}>
              {currentSection?.title ?? course.title}
            </Text>
            <Text style={[type.title, { color: colors.text }]}>{lesson.title}</Text>
            <View style={styles.metaWrap}>
              <MetaItem icon={Clapperboard} label={`Lesson ${lessonNumber} of ${course.lessonCount}`} />
              <MetaItem icon={Clock} label={`${lesson.minutes} min`} />
              <MetaItem icon={ChartNoAxesColumnIncreasing} label={course.level} />
            </View>
            {lesson.isPreview || completed ? (
              <View style={styles.badgeRow}>
                {lesson.isPreview ? <Badge label="Free preview" tone="sage" /> : null}
                {completed ? <Badge label="Completed" tone="success" icon={CircleCheck} /> : null}
              </View>
            ) : null}
            <View style={styles.progressBlock}>
              <View style={styles.progressHead}>
                <Text style={[type.label, { color: colors.textMuted }]}>Course progress</Text>
                <Text style={[type.labelStrong, tabularNums, { color: colors.text }]}>
                  {Math.round(courseProgressRatio(course) * 100)}%
                </Text>
              </View>
              <ProgressBar value={courseProgressRatio(course)} accessibilityLabel={`${course.title} progress`} />
            </View>
          </View>

          <View style={styles.rule} />

          <View style={styles.tabs}>
            <TabButton label="Overview" active={tab === 'overview'} onPress={() => setTab('overview')} />
            <TabButton
              label="Recipe"
              active={tab === 'recipe'}
              disabled={!recipe}
              hint={recipe ? undefined : 'This lesson has no recipe'}
              onPress={() => recipe && setTab('recipe')}
            />
            <TabButton label="Notes" active={tab === 'notes'} onPress={() => setTab('notes')} />
          </View>

          {tab === 'overview' ? (
            <View style={styles.tabBody}>
              <Text style={[type.body, styles.prose, { color: colors.text }]}>{lesson.description}</Text>
              <View style={styles.overviewActions}>
                <Button
                  label={completed ? 'Completed — mark as not done' : 'Mark lesson as complete'}
                  variant={completed ? 'secondary' : 'primary'}
                  icon={completed ? CircleCheck : Check}
                  onPress={() => markComplete(!completed)}
                />
                {upcoming ? (
                  <Button label={`Next: ${upcoming.title}`} variant="ghost" onPress={() => goToLesson(upcoming.id)} />
                ) : (
                  <Button
                    label="You have reached the last lesson"
                    variant="ghost"
                    onPress={() => router.replace({ pathname: '/course/[id]', params: { id: course.id } })}
                  />
                )}
                <Button label="All lessons in this course" variant="ghost" onPress={() => setLessonListOpen(true)} />
              </View>
              <Text style={[type.label, styles.prose, { color: colors.textSubtle }]}>
                Playback position is saved on this device, so you can leave and come back.
              </Text>
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
                      {recipe.prepMinutes} min prep · {recipe.cookMinutes} min cook
                    </Text>
                  </View>
                </View>
                <IconButton
                  icon={isRecipeSaved(recipe.id) ? BookmarkCheck : Bookmark}
                  variant="soft"
                  active={isRecipeSaved(recipe.id)}
                  accessibilityLabel={isRecipeSaved(recipe.id) ? 'Remove recipe from saved' : 'Save recipe'}
                  onPress={() => toggleSavedRecipe(recipe.id)}
                />
              </View>

              <View style={styles.servingsRow}>
                <Text style={[type.label, { color: colors.textMuted }]}>Servings</Text>
                <View style={styles.stepper}>
                  <IconButton
                    icon={Minus}
                    variant="soft"
                    size={36}
                    iconSize={16}
                    accessibilityLabel="Fewer servings"
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
                    accessibilityLabel="More servings"
                    onPress={() => setServings(Math.min(12, currentServings + 1))}
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.ingredientHead}>
                  <ShoppingBasket size={16} color={colors.sage} strokeWidth={1.9} />
                  <Text style={[type.labelStrong, { color: colors.text }]}>Ingredients</Text>
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
                    Quantities scaled from the original {baseServings} servings.
                  </Text>
                ) : null}
              </View>

              <View style={styles.sectionCard}>
                <Text style={[type.labelStrong, { color: colors.text }]}>Method</Text>
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
                  <Text style={[type.labelStrong, { color: colors.text }]}>Notes for this lesson</Text>
                  {recipe.tips.map((tip) => (
                    <Text key={tip} style={[type.body, { color: colors.textMuted }]}>
                      • {tip}
                    </Text>
                  ))}
                </View>
              ) : null}

              <Text style={[type.label, styles.prose, { color: colors.textSubtle }]}>
                Sample recipe content for learning. This is not professional dietary, allergy or food-safety advice.
              </Text>
            </View>
          ) : null}

          {tab === 'notes' ? (
            <View style={styles.tabBody}>
              <Text style={[type.body, styles.prose, { color: colors.textMuted }]}>
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
                placeholder="What did you change? What will you try next time?"
                placeholderTextColor={colors.textSubtle}
                accessibilityLabel={`Notes for ${lesson.title}`}
                style={[styles.notesInput, type.body, { color: colors.text }]}
              />
              <View style={styles.notesFooter}>
                <Button
                  label="Save note"
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

      <BottomSheet
        visible={lessonListOpen}
        onClose={() => setLessonListOpen(false)}
        title="Lessons"
        subtitle={`${course.lessonCount} lessons · ${Math.round(courseProgressRatio(course) * 100)}% complete`}
        scrollable>
        {course.sections.map((section, index) => (
          <View key={section.id} style={styles.sheetSection}>
            <Text style={[type.labelStrong, { color: colors.text }]}>
              {index + 1}. {section.title}
            </Text>
            <DataList>
              {course.lessons
                .filter((entry) => entry.sectionId === section.id)
                .map((entry, lessonIndex) => (
                  <LessonRow
                    key={entry.id}
                    lesson={entry}
                    index={lessonIndex + 1}
                    state={stateFor(entry.id)}
                    onPress={() => goToLesson(entry.id)}
                  />
                ))}
            </DataList>
          </View>
        ))}
      </BottomSheet>

      <BottomSheet visible={speedOpen} onClose={() => setSpeedOpen(false)} title="Playback speed">
        {SPEEDS.map((speed) => (
          <Pressable
            key={speed}
            accessibilityRole="radio"
            accessibilityState={{ selected: player.playbackRate === speed }}
            accessibilityLabel={`${speed} times speed`}
            onPress={() => {
              player.playbackRate = speed;
              setSpeedOpen(false);
            }}
            style={({ pressed }) => [styles.sheetRow, pressed && { opacity: 0.7 }]}>
            <Text style={[type.body, { color: colors.text }]}>{speed === 1 ? 'Normal (1×)' : `${speed}×`}</Text>
            {player.playbackRate === speed ? <Check size={18} color={colors.accentText} strokeWidth={2.2} /> : null}
          </Pressable>
        ))}
      </BottomSheet>
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
  playerWrap: { backgroundColor: colors.background },
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
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  seekTrack: { height: 22, justifyContent: 'center' },
  /** The unfilled part of the track, so the position reads against the picture too. */
  seekRail: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center' },
  seekRailLine: { height: 4, borderRadius: 2, backgroundColor: colors.onPlayerMuted, opacity: 0.45 },
  seekFill: { height: 4, borderRadius: 2, backgroundColor: colors.gold },
  playerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  content: { gap: layout.gap },
  lessonHead: {
    paddingHorizontal: layout.section,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  metaWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  progressBlock: { gap: spacing.xs },
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
  prose: { paddingHorizontal: spacing.sm },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  tipsCard: { backgroundColor: colors.surfaceAlt, borderColor: 'transparent' },
  overviewActions: { gap: layout.gap, paddingTop: spacing.sm },

  recipeHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingHorizontal: spacing.sm },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
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
