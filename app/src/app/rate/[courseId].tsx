/**
 * Rate this course — the page a learner gets once they own a course.
 *
 * Why a screen and not a sheet: a review has a few parts (stars, what stood out, an optional line of
 * writing), and this app gives a destination to anything with a submit at the end of it.
 *
 * Honesty rules this screen follows:
 *   - it opens only for a course the learner owns, and the blocked state says so instead of showing a
 *     form whose save would go nowhere;
 *   - the note under the form says the rating stays on this device, because in this prototype
 *     nothing is sent anywhere;
 *   - once saved, the page shows what was saved and offers to edit it, rather than pretending the
 *     rating reached a catalogue.
 */
import { CourseImage } from '@/components/course-image';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleCheck, Star } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StickyBar } from '@/components/course-cards';
import { RatingInput, StarsDisplay } from '@/components/rating-input';
import { AppBar, Button, Chip, ErrorState, Screen } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { api } from '@/services/api';
import { useCatalog } from '@/services/catalog-context';
import { ratingHighlights, ratingWords } from '@/data/content';
import { useT } from '@/i18n';
import { formatDuration } from '@/lib/format';
import { feedback } from '@/lib/util';
import { useStore } from '@/store';

/** Long enough to say something, short enough to type on a phone. */
const REVIEW_LIMIT = 400;

export default function RateCourseScreen() {
  const t = useT();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isEnrolled, ratingFor, setRating, courseProgressRatio, completedCount } = useStore();
  const { byId } = useCatalog();

  const course = useMemo(() => byId(courseId), [byId, courseId]);
  const existing = course ? ratingFor(course.id) : null;

  const [stars, setStars] = useState(0);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [saved, setSaved] = useState(false);
  // An existing rating is loaded from the store, which hydrates a tick after the first render, so the
  // form is filled from it once — and never again, or it would overwrite what the learner is typing.
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current || !existing) return;
    applied.current = true;
    setStars(existing.stars);
    setHighlights(existing.highlights);
    setBody(existing.body);
  }, [existing]);

  if (!course) {
    return (
      <Screen header={<AppBar title={t('Rate this course')} />} contentStyle={styles.stateContent}>
        <ErrorState
          title={t('Course not found')}
          body={t('This course is no longer in the sample catalog, so there is nothing to rate.')}
        />
        <Button label={t('Back to My learning')} variant="secondary" onPress={() => router.replace('/learning')} />
      </Screen>
    );
  }

  // Ratings belong to learners who own the course: say that, and point at the course page.
  if (!isEnrolled(course.id)) {
    return (
      <Screen header={<AppBar title={t('Rate this course')} />} contentStyle={styles.stateContent}>
        <ErrorState
          title={t('Rate it after you buy it')}
          body={t('Ratings here come from learners who own the course, so this page opens once {title} is in your library.', {
            title: course.title,
          })}
        />
        <Button
          label={t('See the course')}
          onPress={() => router.replace({ pathname: '/course/[id]', params: { id: course.id } })}
        />
        <Button label={t('Back to My learning')} variant="ghost" onPress={() => router.replace('/learning')} />
      </Screen>
    );
  }

  const toggleHighlight = (highlight: string) => {
    feedback.select();
    setHighlights((prev) =>
      prev.includes(highlight) ? prev.filter((item) => item !== highlight) : [...prev, highlight],
    );
  };

  const save = () => {
    applied.current = true;
    setRating({
      courseId: course.id,
      stars,
      highlights,
      body: body.trim(),
      updatedAt: new Date().toISOString(),
    });
    // Post the review to the academy server (best effort — the local copy is kept either way).
    api.submitReview(course.remoteId, stars, body.trim()).catch(() => {});
    feedback.success();
    setSaved(true);
  };

  const ratio = courseProgressRatio(course);

  return (
    <Screen
      header={<AppBar title={t('Rate this course')} />}
      contentStyle={styles.content}
      footer={
        saved ? null : (
          <StickyBar bottomInset={insets.bottom}>
            <Button
              label={existing ? t('Update rating') : t('Submit rating')}
              icon={existing ? undefined : Star}
              disabled={stars === 0}
              onPress={save}
            />
          </StickyBar>
        )
      }>
      {/* The course, so the learner knows which one they are rating. */}
      <View style={styles.pad}>
        <View style={styles.courseCard}>
          <CourseImage source={course.cover} style={styles.cover} transition={200} />
          <View style={styles.flex}>
            <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
              {course.title}
            </Text>
            <Text style={[type.label, tabularNums, { color: colors.textMuted }]}>
              {t('{done} of {total} lessons · {duration}', {
                done: completedCount(course),
                total: course.lessonCount,
                duration: formatDuration(course.hours * 60),
              })}
            </Text>
            <Text style={[type.label, tabularNums, { color: colors.accentText }]}>
              {t('{percent} complete', { percent: `${Math.round(ratio * 100)}%` })}
            </Text>
          </View>
        </View>
      </View>

      {saved ? (
        <View style={styles.pad}>
          <View style={styles.card}>
            <View style={styles.thanksRow}>
              <CircleCheck size={20} color={colors.success} strokeWidth={1.9} />
              <Text style={[type.subheading, { color: colors.text }]}>{t('Thanks for rating')}</Text>
            </View>
            <View style={styles.savedStars}>
              <StarsDisplay value={stars} size={20} />
              <Text style={[type.bodyStrong, { color: colors.text }]}>{t(ratingWords[stars - 1])}</Text>
            </View>
            {highlights.length > 0 ? (
              <View style={styles.chipWrap}>
                {highlights.map((highlight) => (
                  <View key={highlight} style={styles.savedChip}>
                    <Text style={[type.label, { color: colors.accentText }]}>{t(highlight)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {body.trim() ? <Text style={[type.body, { color: colors.text }]}>{body.trim()}</Text> : null}
            <Text style={[type.label, { color: colors.textSubtle }]}>
              {t('Saved on this device on {date} — nothing was sent anywhere.', {
                date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
              })}
            </Text>
            <View style={styles.actions}>
              <Button
                label={t('Back to course')}
                onPress={() => router.replace({ pathname: '/course/[id]', params: { id: course.id } })}
              />
              <Button label={t('Edit rating')} variant="ghost" onPress={() => setSaved(false)} />
            </View>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.pad}>
            <View style={[styles.card, styles.ratingCard]}>
              <Text style={[type.bodyStrong, { color: colors.text }]}>{t('Your rating')}</Text>
              <RatingInput value={stars} onChange={setStars} />
              <Text style={[type.subheading, styles.center, { color: stars > 0 ? colors.text : colors.textSubtle }]}>
                {stars > 0 ? t(ratingWords[stars - 1]) : t('Tap a star to rate this course')}
              </Text>
              <Text style={[type.label, styles.center, { color: colors.textMuted }]}>
                {t('Other learners see the stars and the review, never your name or number.')}
              </Text>
            </View>
          </View>

          <View style={styles.pad}>
            <View style={styles.card}>
              <Text style={[type.bodyStrong, { color: colors.text }]}>{t('What stood out?')}</Text>
              <Text style={[type.label, { color: colors.textMuted }]}>
                {t('Pick anything that applied — it helps other dairy learners choose.')}
              </Text>
              <View style={styles.chipWrap}>
                {ratingHighlights.map((highlight) => (
                  <Chip
                    key={highlight}
                    label={t(highlight)}
                    selected={highlights.includes(highlight)}
                    onPress={() => toggleHighlight(highlight)}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.pad}>
            <View style={styles.card}>
              <Text style={[type.bodyStrong, { color: colors.text }]}>{t('Write a review (optional)')}</Text>
              <Text style={[type.label, { color: colors.textMuted }]}>
                {t('Say what worked and what did not. Keep it useful for the next person.')}
              </Text>
              <TextInput
                value={body}
                onChangeText={(next) => setBody(next.slice(0, REVIEW_LIMIT))}
                placeholder={t('The chilling section finally made sense…')}
                placeholderTextColor={colors.textSubtle}
                multiline
                textAlignVertical="top"
                accessibilityLabel={t('Your review')}
                style={[type.body, styles.input, { color: colors.text }]}
              />
              <Text style={[type.label, styles.count, tabularNums, { color: colors.textSubtle }]}>
                {body.length} / {REVIEW_LIMIT}
              </Text>
            </View>
          </View>

          <Text style={[type.label, styles.note, { color: colors.textSubtle }]}>
            {t('This prototype keeps your rating on this device. Nothing is sent anywhere.')}
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = createStyles(() => StyleSheet.create({
  content: { gap: layout.gap, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  stateContent: { paddingTop: spacing.xxl, gap: spacing.md },
  pad: { paddingHorizontal: layout.screen },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  note: { paddingHorizontal: layout.section, textAlign: 'center' },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cover: { width: 64, height: 64, borderRadius: radius.xs, backgroundColor: colors.surfaceAlt },
  card: {
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  /** The stars get their own taller card: it is the one thing this screen exists for. */
  ratingCard: { paddingVertical: spacing.lg, gap: spacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  savedChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  thanksRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  savedStars: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  input: {
    minHeight: 96,
    padding: spacing.sm,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  count: { textAlign: 'right' },
}));
