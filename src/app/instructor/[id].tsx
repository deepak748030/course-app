import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BadgeCheck, ChefHat, Globe, MapPin } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseCardLarge } from '@/components/course-cards';
import { Badge, Chip, EmptyState, MetaItem, ScreenHeader } from '@/components/ui';
import { colors, maxContentWidth, radius, screenPadding, shadow, spacing, type } from '@/constants/theme';
import { instructorById, instructorCourses } from '@/data/catalog';

export default function InstructorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const instructor = useMemo(() => instructorById(id), [id]);
  const taught = useMemo(() => (instructor ? instructorCourses(instructor.id) : []), [instructor]);

  if (!instructor) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader onBack={() => router.replace('/explore')} />
        <EmptyState
          icon={ChefHat}
          title="Instructor not found"
          body="This profile may have moved. Browse courses to find the instructor you were looking for."
          actionLabel="Browse courses"
          onAction={() => router.replace('/explore')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader />

        <View style={styles.identity}>
          <Image source={instructor.portrait} style={styles.portrait} contentFit="cover" transition={200} />
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <Text style={[type.screenTitle, { color: colors.text, fontSize: 25, lineHeight: 32 }]}>
                {instructor.name}
              </Text>
              {instructor.verified ? <BadgeCheck size={19} color={colors.sage} strokeWidth={2} /> : null}
            </View>
            <Text style={[type.body, { color: colors.textSecondary }]}>{instructor.headline}</Text>
            <View style={styles.metaWrap}>
              <MetaItem icon={MapPin} label={instructor.city} />
              <MetaItem icon={ChefHat} label={`${instructor.yearsTeaching} yrs teaching`} />
              <MetaItem icon={Globe} label={instructor.languages.join(', ')} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[type.section, { color: colors.text }]}>About</Text>
          <Text style={[type.body, { color: colors.textSecondary }]}>{instructor.bio}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[type.section, { color: colors.text }]}>Teaches</Text>
          <View style={styles.chips}>
            {instructor.expertise.map((skill) => (
              <Chip key={skill} label={skill} selected={false} onPress={() => router.push('/explore')} />
            ))}
          </View>
          <View style={[styles.styleCard, shadow.card]}>
            <Text style={[type.label, { color: colors.textSecondary }]}>Teaching style</Text>
            <Text style={[type.body, { color: colors.text, fontSize: 15.5 }]}>{instructor.teachingStyle}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[type.section, { color: colors.text }]}>Courses</Text>
            <Badge label={`${taught.length} on Rasoi Studio`} tone="neutral" />
          </View>
          {taught.length === 0 ? (
            <EmptyState
              icon={ChefHat}
              title="No courses published yet"
              body="This instructor has no published courses in the prototype catalog."
            />
          ) : (
            <View style={styles.courseList}>
              {taught.map((course) => (
                <CourseCardLarge key={course.id} course={course} />
              ))}
            </View>
          )}
        </View>

        <Text style={[type.meta, { color: colors.textSecondary }]}>
          Instructor biographies in this prototype are authored sample content, not verified facts.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.xl,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  identity: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  portrait: { width: 104, height: 104, borderRadius: radius.card, backgroundColor: colors.surfaceWarm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flexWrap: 'wrap' },
  metaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  styleCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md, gap: spacing.xxs },
  courseList: { gap: spacing.md },
});
