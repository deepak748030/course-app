import { useEvent, useEventListener } from 'expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  CircleAlert,
  CircleCheck,
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
  View,
} from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { LessonRow, type LessonRowState } from '@/components/course-cards';
import { Badge, EmptyState, IconButton, PrimaryButton, ScreenHeader } from '@/components/ui';
import { colors, maxContentWidth, radius, screenPadding, spacing, type } from '@/constants/theme';
import { courseById, instructorById, nextLesson } from '@/data/catalog';
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
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader onBack={() => router.replace('/learning')} />
        <EmptyState
          icon={Clapperboard}
          title="Lesson not found"
          body="This lesson may have been moved. Open the course to see the current curriculum."
          actionLabel="Go to My learning"
          onAction={() => router.replace('/learning')}
        />
      </View>
    );
  }

  if (!unlocked) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader onBack={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })} />
        <EmptyState
          icon={Lock}
          title="This lesson is locked"
          body={`“${lesson.title}” is part of ${course.title}. Buy the course to watch all ${course.lessonCount} lessons, or try one of the free previews.`}
          actionLabel="See what is included"
          onAction={() => router.replace({ pathname: '/course/[id]', params: { id: course.id } })}
        />
      </View>
    );
  }

  const instructor = instructorById(course.instructorId);
  const upcoming = nextLesson(course, lesson.id);
  const completed = storedPosition.completed;
  const progressPercent = duration > 0 ? position / duration : 0;
  const recipe = lesson.recipe;
  const baseServings = recipe?.servings ?? 1;
  const currentServings = servings ?? baseServings;
  const factor = currentServings / baseServings;

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
      <StatusBar style="light" />

      <View style={[styles.playerWrap, { paddingTop: 0 }]}>
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
          <View style={styles.centerOverlay} pointerEvents="none">
            <ActivityIndicator color={colors.onPlayer} />
            <Text style={[type.meta, { color: colors.onPlayerMuted }]}>Loading lesson…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.centerOverlay}>
            <CircleAlert size={26} color={colors.onPlayer} strokeWidth={1.9} />
            <Text style={[type.supporting, { color: colors.onPlayer, textAlign: 'center' }]}>
              This lesson video could not be played.
            </Text>
            <PrimaryButton
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
          <Animated.View entering={FadeIn.duration(160)} style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View style={[styles.playerTop, { paddingTop: insets.top + spacing.xs }]}>
              <IconButton
                icon={ArrowLeft}
                variant="onImage"
                accessibilityLabel="Leave the lesson"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/learning'))}
              />
              <View style={styles.playerTitleWrap}>
                <Text style={[type.meta, { color: colors.onPlayerMuted }]} numberOfLines={1}>
                  {course.title}
                </Text>
                <Text style={[type.label, { color: colors.onPlayer }]} numberOfLines={1}>
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

            <View style={styles.playerCenter} pointerEvents="box-none">
              <IconButton
                icon={SkipBack}
                variant="onImage"
                size={52}
                iconSize={24}
                accessibilityLabel="Go back 15 seconds"
                onPress={() => seekTo(position - 15)}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause lesson' : 'Play lesson'}
                onPress={togglePlay}
                style={styles.playButton}>
                {isPlaying ? (
                  <Pause size={30} color={colors.onPlayer} strokeWidth={1.8} fill={colors.onPlayer} />
                ) : (
                  <Play size={30} color={colors.onPlayer} strokeWidth={1.8} fill={colors.onPlayer} />
                )}
              </Pressable>
              <IconButton
                icon={SkipForward}
                variant="onImage"
                size={52}
                iconSize={24}
                accessibilityLabel="Go forward 15 seconds"
                onPress={() => seekTo(position + 15)}
              />
            </View>

            <View style={styles.playerBottom}>
              <Text style={[type.meta, { color: colors.onPlayerMuted }]}>{formatClock(position)}</Text>
              <SeekBar
                progress={progressPercent}
                duration={duration}
                onSeek={(ratio) => seekTo(ratio * duration)}
                accessibilityLabel="Seek within the lesson"
              />
              <Text style={[type.meta, { color: colors.onPlayerMuted }]}>{formatClock(duration)}</Text>
            </View>

            <View style={styles.playerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Playback speed, currently ${player.playbackRate} times`}
                onPress={() => setSpeedOpen(true)}
                style={styles.playerAction}>
                <Gauge size={15} color={colors.onPlayer} strokeWidth={1.9} />
                <Text style={[type.meta, { color: colors.onPlayer }]}>{player.playbackRate}×</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Play in fullscreen"
                onPress={() => void videoRef.current?.enterFullscreen()}
                style={styles.playerAction}>
                <Maximize2 size={15} color={colors.onPlayer} strokeWidth={1.9} />
                <Text style={[type.meta, { color: colors.onPlayer }]}>Fullscreen</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.lessonHeader}>
            <View style={styles.flex}>
              <Text style={[type.section, { color: colors.text }]}>{lesson.title}</Text>
              <View style={styles.metaRow}>
                <Text style={[type.meta, { color: colors.textSecondary }]}>{instructor?.name}</Text>
                <Text style={[type.meta, { color: colors.textSecondary }]}>·</Text>
                <Text style={[type.meta, { color: colors.textSecondary }]}>{lesson.minutes} min</Text>
                {lesson.isPreview ? <Badge label="Free preview" tone="sage" /> : null}
                {completed ? <Badge label="Completed" tone="success" icon={CircleCheck} /> : null}
              </View>
            </View>
            <Badge label={`${Math.round(courseProgressRatio(course) * 100)}%`} tone="primary" />
          </View>

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
              <Text style={[type.body, { color: colors.textSecondary }]}>{lesson.description}</Text>
              <View style={styles.sectionCard}>
                <Text style={[type.label, { color: colors.textSecondary }]}>Section</Text>
                <Text style={[type.body, { color: colors.text }]}>
                  {course.sections.find((section) => section.id === lesson.sectionId)?.title}
                </Text>
              </View>
              <View style={styles.overviewActions}>
                <PrimaryButton
                  label={completed ? 'Completed — mark as not done' : 'Mark lesson as complete'}
                  variant={completed ? 'secondary' : 'primary'}
                  icon={completed ? CircleCheck : Check}
                  onPress={() => markComplete(!completed)}
                />
                {upcoming ? (
                  <PrimaryButton
                    label={`Next: ${upcoming.title}`}
                    variant="ghost"
                    onPress={() => goToLesson(upcoming.id)}
                  />
                ) : (
                  <PrimaryButton
                    label="You have reached the last lesson"
                    variant="ghost"
                    onPress={() => router.replace({ pathname: '/course/[id]', params: { id: course.id } })}
                  />
                )}
                <PrimaryButton label="All lessons in this course" variant="ghost" onPress={() => setLessonListOpen(true)} />
              </View>
              <Text style={[type.meta, { color: colors.textSecondary }]}>
                Playback position is saved on this device, so you can leave and come back.
              </Text>
            </View>
          ) : null}

          {tab === 'recipe' && recipe ? (
            <View style={styles.tabBody}>
              <View style={styles.recipeHead}>
                <View style={styles.flex}>
                  <Text style={[type.cardTitle, { color: colors.text }]}>{recipe.title}</Text>
                  <View style={styles.metaRow}>
                    <Clock size={14} color={colors.textSecondary} strokeWidth={1.9} />
                    <Text style={[type.meta, { color: colors.textSecondary }]}>
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
                <Text style={[type.label, { color: colors.textSecondary }]}>Servings</Text>
                <View style={styles.stepper}>
                  <IconButton
                    icon={Minus}
                    variant="soft"
                    size={36}
                    iconSize={16}
                    accessibilityLabel="Fewer servings"
                    onPress={() => setServings(Math.max(1, currentServings - 1))}
                  />
                  <Text style={[type.cardTitle, { color: colors.text, minWidth: 28, textAlign: 'center' }]}>
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
                  <ShoppingBasket size={17} color={colors.sage} strokeWidth={1.9} />
                  <Text style={[type.label, { color: colors.text }]}>Ingredients</Text>
                </View>
                {recipe.ingredients.map((ingredient) => (
                  <View key={ingredient.item} style={styles.ingredientRow}>
                    <Text style={[type.body, { color: colors.text, flex: 1, fontSize: 15.5 }]}>{ingredient.item}</Text>
                    <Text style={[type.body, { color: colors.textSecondary, fontSize: 15.5 }]}>
                      {scaleQuantity(ingredient.quantity, factor)}
                    </Text>
                  </View>
                ))}
                {factor !== 1 ? (
                  <Text style={[type.meta, { color: colors.textSecondary }]}>
                    Quantities scaled from the original {baseServings} servings.
                  </Text>
                ) : null}
              </View>

              <View style={styles.sectionCard}>
                <Text style={[type.label, { color: colors.text }]}>Method</Text>
                {recipe.steps.map((step, index) => (
                  <View key={step} style={styles.stepRow}>
                    <View style={styles.stepNumber}>
                      <Text style={[type.meta, { color: colors.primary }]}>{index + 1}</Text>
                    </View>
                    <Text style={[type.body, { color: colors.text, flex: 1, fontSize: 15.5 }]}>{step}</Text>
                  </View>
                ))}
              </View>

              {recipe.tips.length > 0 ? (
                <View style={[styles.sectionCard, styles.tipsCard]}>
                  <Text style={[type.label, { color: colors.text }]}>Chef&apos;s notes</Text>
                  {recipe.tips.map((tip) => (
                    <Text key={tip} style={[type.supporting, { color: colors.textSecondary }]}>
                      • {tip}
                    </Text>
                  ))}
                </View>
              ) : null}

              <Text style={[type.meta, { color: colors.textSecondary }]}>
                Sample recipe content for learning. This is not professional dietary, allergy or food-safety advice.
              </Text>
            </View>
          ) : null}

          {tab === 'notes' ? (
            <View style={styles.tabBody}>
              <Text style={[type.supporting, { color: colors.textSecondary }]}>
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
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel={`Notes for ${lesson.title}`}
                style={[styles.notesInput, type.body, { color: colors.text }]}
              />
              <View style={styles.notesFooter}>
                <PrimaryButton
                  label="Save note"
                  variant="secondary"
                  fullWidth={false}
                  onPress={() => {
                    setNote(lesson.id, noteDraft);
                    setNoteSaved(true);
                    feedback.tap();
                  }}
                />
                <Text style={[type.meta, { color: colors.textSecondary, flex: 1 }]}>
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
            <Text style={[type.label, { color: colors.textSecondary }]}>
              {index + 1}. {section.title}
            </Text>
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
            <Text style={[type.body, { color: colors.text }]}>
              {speed === 1 ? 'Normal (1×)' : `${speed}×`}
            </Text>
            {player.playbackRate === speed ? <Check size={18} color={colors.primary} strokeWidth={2.2} /> : null}
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
}: {
  progress: number;
  duration: number;
  onSeek: (ratio: number) => void;
  accessibilityLabel: string;
}) {
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = reduced ? progress : withTiming(progress, { duration: 120 });
  }, [progress, reduced, value]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0.0001, value.value) }] }));

  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onPress={(event) => {
        if (width <= 0) return;
        onSeek(Math.max(0, Math.min(1, event.nativeEvent.locationX / width)));
      }}
      style={styles.seekTrack}>
      <Animated.View style={[styles.seekFill, { transformOrigin: 'left' }, fillStyle]} />
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
      <Text style={[type.label, { color: active ? colors.text : colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  playerWrap: { backgroundColor: colors.player },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.player },
  centerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(18,20,18,0.55)',
  },
  playerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.xs,
  },
  playerTitleWrap: { flex: 1, gap: 1 },
  playerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(18,20,18,0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
  },
  seekTrack: {
    flex: 1,
    height: 26,
    justifyContent: 'center',
  },
  seekFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    width: '100%',
  },
  playerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
    justifyContent: 'flex-end',
  },
  playerAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingVertical: 4 },
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.md,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingTop: spacing.md,
  },
  lessonHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap', marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceWarm,
    borderRadius: radius.pill,
    padding: spacing.xxs,
    gap: spacing.xxs,
  },
  tabButton: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  tabButtonActive: { backgroundColor: colors.surface },
  tabBody: { gap: spacing.md },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tipsCard: { backgroundColor: colors.goldSoft, borderColor: colors.goldSoft },
  overviewActions: { gap: spacing.xs },
  recipeHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  servingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ingredientHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  stepRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notesInput: {
    minHeight: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  notesFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sheetSection: { gap: spacing.xxs, marginBottom: spacing.sm },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: spacing.xs,
  },
});

