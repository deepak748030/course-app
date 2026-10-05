import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BadgeCheck, ChefHat, Globe, MapPin } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CourseRow } from '@/components/course-cards';
import { AppBar, Badge, Chip, DataList, EmptyState, MetaItem, Screen, SectionHeader } from '@/components/ui';
import { colors, layout, radius, spacing, type } from '@/constants/theme';
import { instructorById, instructorCourses } from '@/data/catalog';

export default function InstructorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const instructor = useMemo(() => instructorById(id), [id]);
  const taught = useMemo(() => (instructor ? instructorCourses(instructor.id) : []), [instructor]);

  if (!instructor) {
    return (
      <Screen header={<AppBar onBack={() => router.replace('/explore')} />}>
        <EmptyState
          icon={ChefHat}
          title="Instructor not found"
          body="This profile may have moved. Browse courses to find the instructor you were looking for."
          actionLabel="Browse courses"
          onAction={() => router.replace('/explore')}
        />
      </Screen>
    );
  }

  return (
    <Screen header={<AppBar />} contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}>
      <View style={styles.identity}>
        <Image source={instructor.portrait} style={styles.portrait} contentFit="cover" transition={200} />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <Text style={[type.title, { color: colors.text }]}>{instructor.name}</Text>
            {instructor.verified ? <BadgeCheck size={18} color={colors.sage} strokeWidth={2} /> : null}
          </View>
          <Text style={[type.body, { color: colors.textMuted }]}>{instructor.headline}</Text>
        </View>
      </View>

      <View style={styles.pad}>
        <View style={styles.metaWrap}>
          <MetaItem icon={MapPin} label={instructor.city} />
          <MetaItem icon={ChefHat} label={`${instructor.yearsTeaching} yrs teaching`} />
          <MetaItem icon={Globe} label={instructor.languages.join(', ')} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="About" />
        <Text style={[type.body, styles.prose, { color: colors.text }]}>{instructor.bio}</Text>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Teaches" subtitle="Tap a skill to browse matching courses" />
        <View style={styles.chips}>
          {instructor.expertise.map((skill) => (
            <Chip key={skill} label={skill} selected={false} onPress={() => router.push('/explore')} />
          ))}
        </View>
        <View style={styles.styleCard}>
          <Text style={[type.labelStrong, { color: colors.textMuted }]}>Teaching style</Text>
          <Text style={[type.body, { color: colors.text }]}>{instructor.teachingStyle}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeadPad}>
          <SectionHeader title="Courses" />
          <View style={styles.badgePad}>
            <Badge label={`${taught.length} on Rasoi Studio`} tone="neutral" />
          </View>
        </View>
        {taught.length === 0 ? (
          <EmptyState
            icon={ChefHat}
            title="No courses published yet"
            body="This instructor has no published courses in the prototype catalog."
          />
        ) : (
          <DataList>
            {taught.map((course) => (
              <CourseRow key={course.id} course={course} />
            ))}
          </DataList>
        )}
      </View>

      <Text style={[type.label, styles.prose, { color: colors.textSubtle }]}>
        Instructor biographies in this prototype are authored sample content, not verified facts.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: layout.screen },
  identity: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingHorizontal: layout.section, paddingTop: spacing.sm },
  portrait: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  metaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  section: { gap: layout.gap },
  sectionHeadPad: { gap: spacing.xs },
  badgePad: { paddingHorizontal: layout.section },
  prose: { paddingHorizontal: layout.section },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.gap, paddingHorizontal: layout.screen },
  styleCard: {
    marginHorizontal: layout.section,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
