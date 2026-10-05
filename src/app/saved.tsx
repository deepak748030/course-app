import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bookmark, BookmarkCheck, BookOpen, ShoppingBasket } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseCardLarge } from '@/components/course-cards';
import { Badge, EmptyState, IconButton, ScreenHeader } from '@/components/ui';
import { colors, maxContentWidth, radius, screenPadding, spacing, type } from '@/constants/theme';
import { courseById, courses, instructorById } from '@/data/catalog';
import { useStore } from '@/store';
import type { Course } from '@/types';
import { formatDuration } from '@/lib/format';

type Segment = 'courses' | 'recipes';

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, toggleSavedRecipe } = useStore();
  const [segment, setSegment] = useState<Segment>('courses');

  const savedCourses = useMemo(
    () => state.savedCourseIds.map((id) => courseById(id)).filter((course): course is Course => Boolean(course)),
    [state.savedCourseIds],
  );

  const savedRecipes = useMemo(
    () =>
      courses
        .flatMap((course) => course.lessons.map((lesson) => ({ course, lesson })))
        .filter(({ lesson }) => lesson.recipe && state.savedRecipeIds.includes(lesson.recipe.id)),
    [state.savedRecipeIds],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Saved" />

        <View style={styles.segment}>
          <SegmentButton label={`Courses (${savedCourses.length})`} active={segment === 'courses'} onPress={() => setSegment('courses')} />
          <SegmentButton label={`Recipes (${savedRecipes.length})`} active={segment === 'recipes'} onPress={() => setSegment('recipes')} />
        </View>

        {segment === 'courses' ? (
          savedCourses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nothing saved yet"
              body="Tap the bookmark on any course card and it will be waiting here, even while you decide."
              actionLabel="Browse courses"
              onAction={() => router.push('/explore')}
            />
          ) : (
            <View style={styles.list}>
              {savedCourses.map((course) => (
                <CourseCardLarge key={course.id} course={course} />
              ))}
            </View>
          )
        ) : savedRecipes.length === 0 ? (
          <EmptyState
            icon={ShoppingBasket}
            title="No saved recipes"
            body="Recipes live inside lessons. Open a lesson, go to the Recipe tab and save the ones you cook often."
            actionLabel="Find a lesson"
            onAction={() => router.push('/explore')}
          />
        ) : (
          <View style={styles.list}>
            {savedRecipes.map(({ course, lesson }) => (
              <Pressable
                key={lesson.id}
                accessibilityRole="button"
                accessibilityLabel={`${lesson.recipe!.title}, from ${course.title}. Open the recipe.`}
                onPress={() =>
                  router.push({
                    pathname: '/lesson/[courseId]/[lessonId]',
                    params: { courseId: course.id, lessonId: lesson.id, tab: 'recipe' },
                  })
                }
                style={({ pressed }) => [styles.recipeCard, pressed && { opacity: 0.85 }]}>
                <Image source={course.cover} style={styles.recipeThumb} contentFit="cover" transition={150} />
                <View style={styles.flex}>
                  <Text style={[type.cardTitle, { color: colors.text }]} numberOfLines={2}>
                    {lesson.recipe!.title}
                  </Text>
                  <Text style={[type.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                    {course.title} · {instructorById(course.instructorId)?.name}
                  </Text>
                  <View style={styles.recipeMeta}>
                    <Badge label={`Serves ${lesson.recipe!.servings}`} tone="neutral" />
                    <Text style={[type.meta, { color: colors.textSecondary }]}>
                      {formatDuration(lesson.recipe!.prepMinutes + lesson.recipe!.cookMinutes)}
                    </Text>
                  </View>
                </View>
                <IconButton
                  icon={BookmarkCheck}
                  active
                  accessibilityLabel={`Remove ${lesson.recipe!.title} from saved recipes`}
                  onPress={() => toggleSavedRecipe(lesson.recipe!.id)}
                  variant="soft"
                  size={40}
                />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.footNote}>
          <Bookmark size={15} color={colors.textSecondary} strokeWidth={1.9} />
          <Text style={[type.meta, { color: colors.textSecondary, flex: 1 }]}>
            Saved items are stored on this device with your session.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentButtonActive]}>
      <Text style={[type.label, { color: active ? colors.textInverse : colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.lg,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceWarm,
    borderRadius: radius.pill,
    padding: spacing.xxs,
    gap: spacing.xxs,
  },
  segmentButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  segmentButtonActive: { backgroundColor: colors.primary },
  list: { gap: spacing.md },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  recipeThumb: { width: 72, height: 72, borderRadius: radius.image, backgroundColor: colors.surfaceWarm },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs },
  footNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
