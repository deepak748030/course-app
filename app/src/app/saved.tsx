import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bookmark, BookOpen, ShoppingBasket } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SaveButton } from '@/components/save-button';
import { AppBar, Badge, DataList, EmptyState, MetaItem, Screen, Segmented } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, type } from '@/constants/theme';
import { useCatalog } from '@/services/catalog-context';
import { useT } from '@/i18n';
import { useStore } from '@/store';
import type { Course } from '@/types';
import { formatDuration } from '@/lib/format';
import { Clock, Milk } from 'lucide-react-native';

type Segment = 'courses' | 'recipes';

export default function SavedScreen() {
  const t = useT();

  const router = useRouter();
  const { state, toggleSavedRecipe } = useStore();
  const { courses, byId } = useCatalog();
  const [segment, setSegment] = useState<Segment>('courses');

  const savedCourses = useMemo(
    () => state.savedCourseIds.map((id) => byId(id)).filter((course): course is Course => Boolean(course)),
    [state.savedCourseIds, byId],
  );

  const savedRecipes = useMemo(
    () =>
      courses
        .flatMap((course) => course.lessons.map((lesson) => ({ course, lesson })))
        .filter(({ lesson }) => lesson.recipe && state.savedRecipeIds.includes(lesson.recipe.id)),
    [state.savedRecipeIds, courses],
  );

  return (
    <Screen header={<AppBar title={t("Saved")} />} contentStyle={{ paddingBottom: spacing.xxl, gap: layout.gap }}>
      <View style={styles.segmentWrap}>
        <Segmented<Segment>
          options={[
            { id: 'courses', label: t('Courses · {n}', { n: savedCourses.length }) },
            { id: 'recipes', label: t('Batch sheets · {n}', { n: savedRecipes.length }) },
          ]}
          value={segment}
          onChange={setSegment}
        />
      </View>

      {segment === 'courses' ? (
        savedCourses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={t("Nothing saved yet")}
            body={t("Tap the bookmark on any course card and it will be waiting here, even while you decide.")}
            actionLabel={t("Browse courses")}
            onAction={() => router.push('/explore')}
          />
        ) : (
          <DataList>
            {savedCourses.map((course) => (
              <Pressable
                key={course.id}
                accessibilityRole="button"
                accessibilityLabel={`${course.title}, saved. Open course.`}
                onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
                style={({ pressed }) => [styles.courseRow, pressed && { opacity: 0.75 }]}>
                <Image source={course.cover} style={styles.thumb} contentFit="cover" transition={140} />
                <View style={styles.flex}>
                  <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
                    {course.title}
                  </Text>
                  <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={1}>
                    {course.promise}
                  </Text>
                  <View style={styles.metaRow}>
                    <MetaItem icon={Clock} label={formatDuration(course.hours * 60)} />
                    <Badge label={t(course.level)} tone="neutral" />
                  </View>
                </View>
              </Pressable>
            ))}
          </DataList>
        )
      ) : savedRecipes.length === 0 ? (
        <EmptyState
          icon={ShoppingBasket}
          title={t("No saved batch sheets")}
          body={t("Batch sheets live inside lessons. Open a lesson, go to the Sheet tab and save the ones you make often.")}
          actionLabel={t("Find a lesson")}
          onAction={() => router.push('/explore')}
        />
      ) : (
        <DataList>
          {savedRecipes.map(({ course, lesson }) => (
            <View key={lesson.id} style={styles.recipeRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${lesson.recipe!.title}, from ${course.title}. Open the batch sheet.`}
                onPress={() =>
                  router.push({
                    pathname: '/lesson/[courseId]/[lessonId]',
                    params: { courseId: course.id, lessonId: lesson.id, tab: 'recipe' },
                  })
                }
                style={({ pressed }) => [styles.recipeInner, pressed && { opacity: 0.75 }]}>
                <Image source={course.cover} style={styles.thumb} contentFit="cover" transition={140} />
                <View style={styles.flex}>
                  <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
                    {lesson.recipe!.title}
                  </Text>
                  <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={1}>
                    {course.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <MetaItem icon={Milk} label={t('Makes {n}', { n: lesson.recipe!.servings })} />
                    <MetaItem
                      icon={Clock}
                      label={formatDuration(lesson.recipe!.prepMinutes + lesson.recipe!.cookMinutes)}
                    />
                  </View>
                </View>
              </Pressable>
              <SaveButton
                saved
                variant="soft"
                size={layout.touchTarget}
                accessibilityLabel={`Remove ${lesson.recipe!.title} from saved batch sheets`}
                onToggle={() => {
                  // The row leaves the list once this runs, so give the icon its pop first.
                  setTimeout(() => toggleSavedRecipe(lesson.recipe!.id), UNLIST_MS);
                }}
              />
            </View>
          ))}
        </DataList>
      )}

      <View style={styles.footNote}>
        <Bookmark size={14} color={colors.textSubtle} strokeWidth={1.9} />
        <Text style={[type.label, { color: colors.textSubtle, flex: 1 }]}>{t("Saved items are stored on this device with your session.")}</Text>
      </View>
    </Screen>
  );
}

/** How long the remove animation gets before the row leaves the list. */
const UNLIST_MS = 280;

const styles = createStyles(() => StyleSheet.create({
  flex: { flex: 1 },
  segmentWrap: { paddingHorizontal: 0 },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' },
  recipeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  recipeInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  footNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: layout.section, paddingTop: spacing.sm },
}));
