import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { CourseCardLarge } from '@/components/course-cards';
import { Chip, EmptyState, FormField, PrimaryButton, AppText } from '@/components/ui';
import { colors, radius, screenPadding, spacing, type } from '@/constants/theme';
import {
  browseCourses,
  categories,
  durationOptions,
  emptyFilters,
  priceBandOptions,
  sortOptions,
  type BrowseFilters,
  type SortKey,
} from '@/data/catalog';
import { useStore } from '@/store';

const levelOptions = ['Beginner', 'Intermediate', 'Advanced'];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const { state } = useStore();

  const [filters, setFilters] = useState<BrowseFilters>({
    ...emptyFilters,
    // A first visit leans on the interests chosen during onboarding.
    categoryIds: [],
  });
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (params.category) {
      setFilters((prev) => ({ ...prev, categoryIds: [params.category as string] }));
    }
  }, [params.category]);

  const results = useMemo(() => browseCourses(filters), [filters]);
  const dense = filters.categoryIds.length > 0 || filters.levels.length > 0 || filters.priceBands.length > 0 || filters.durations.length > 0 || filters.query.length > 0;

  const toggleIn = (key: 'categoryIds' | 'levels' | 'priceBands' | 'durations', value: string) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((item) => item !== value) : [...prev[key], value],
    }));

  const activeChips = [
    ...filters.categoryIds.map((id) => ({
      key: `cat-${id}`,
      label: categories.find((category) => category.id === id)?.label ?? id,
      clear: () => toggleIn('categoryIds', id),
    })),
    ...filters.levels.map((level) => ({ key: `lvl-${level}`, label: level, clear: () => toggleIn('levels', level) })),
    ...filters.priceBands.map((band) => ({
      key: `price-${band}`,
      label: priceBandOptions.find((option) => option.id === band)?.label ?? band,
      clear: () => toggleIn('priceBands', band),
    })),
    ...filters.durations.map((band) => ({
      key: `dur-${band}`,
      label: durationOptions.find((option) => option.id === band)?.label ?? band,
      clear: () => toggleIn('durations', band),
    })),
  ];

  const clearAll = () => setFilters((prev) => ({ ...emptyFilters, query: prev.query, sort: prev.sort }));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <AppText variant="title">Explore courses</AppText>

        <FormField
          icon={Search}
          value={filters.query}
          onChangeText={(query) => setFilters((prev) => ({ ...prev, query }))}
          placeholder="Search courses, chefs or skills"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search courses"
          rightSlot={
            filters.query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={10}
                onPress={() => setFilters((prev) => ({ ...prev, query: '' }))}>
                <X size={18} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            ) : null
          }
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip
            label="All"
            selected={filters.categoryIds.length === 0}
            onPress={() => setFilters((prev) => ({ ...prev, categoryIds: [] }))}
          />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.label}
              selected={filters.categoryIds.includes(category.id)}
              onPress={() => toggleIn('categoryIds', category.id)}
            />
          ))}
        </ScrollView>

        <View style={styles.toolbar}>
          <Text style={[type.supporting, { color: colors.textSecondary }]}>
            {results.length} {results.length === 1 ? 'course' : 'courses'}
            {state.interests.length > 0 && !dense ? ' · personalised for you' : ''}
          </Text>
          <View style={styles.toolbarActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sort results"
              onPress={() => setSortOpen(true)}
              style={({ pressed }) => [styles.toolButton, pressed && { opacity: 0.7 }]}>
              <Text style={[type.label, { color: colors.text }]}>
                {sortOptions.find((option) => option.id === filters.sort)?.label ?? 'Sort'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={activeChips.length > 0 ? `Filters, ${activeChips.length} active` : 'Filters'}
              onPress={() => setFilterOpen(true)}
              style={({ pressed }) => [
                styles.toolButton,
                activeChips.length > 0 && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                pressed && { opacity: 0.7 },
              ]}>
              <SlidersHorizontal size={15} color={activeChips.length > 0 ? colors.primary : colors.text} strokeWidth={2} />
              <Text style={[type.label, { color: activeChips.length > 0 ? colors.primary : colors.text }]}>
                {activeChips.length > 0 ? `Filters (${activeChips.length})` : 'Filters'}
              </Text>
            </Pressable>
          </View>
        </View>

        {activeChips.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {activeChips.map((chip) => (
              <Pressable
                key={chip.key}
                accessibilityRole="button"
                accessibilityLabel={`Remove filter ${chip.label}`}
                onPress={chip.clear}
                style={styles.activeChip}>
                <Text style={[type.meta, { color: colors.primary }]}>{chip.label}</Text>
                <X size={13} color={colors.primary} strokeWidth={2.2} />
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel="Clear all filters" onPress={clearAll} hitSlop={8}>
              <Text style={[type.meta, { color: colors.textSecondary, textDecorationLine: 'underline' }]}>Clear all</Text>
            </Pressable>
          </ScrollView>
        ) : null}

        {results.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No courses match these filters"
            body="Try a different cuisine, level or price range. Clearing the filters brings everything back."
            actionLabel="Clear filters"
            onAction={() => setFilters({ ...emptyFilters })}
          />
        ) : (
          <View style={styles.results}>
            {results.map((course) => (
              <CourseCardLarge key={course.id} course={course} />
            ))}
          </View>
        )}

        <View style={styles.demoNote}>
          <Text style={[type.meta, { color: colors.textSecondary }]}>
            Catalog, ratings and reviews are sample data for this prototype.
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open help" onPress={() => router.push('/help')}>
            <Text style={[type.meta, { color: colors.primary }]}>Questions?</Text>
          </Pressable>
        </View>
      </ScrollView>

      <BottomSheet visible={sortOpen} onClose={() => setSortOpen(false)} title="Sort by">
        {sortOptions.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: filters.sort === option.id }}
            accessibilityLabel={option.label}
            onPress={() => {
              setFilters((prev) => ({ ...prev, sort: option.id as SortKey }));
              setSortOpen(false);
            }}
            style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.7 }]}>
            <Text style={[type.body, { color: colors.text }]}>{option.label}</Text>
            {filters.sort === option.id ? <Check size={18} color={colors.primary} strokeWidth={2.2} /> : null}
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filters"
        subtitle="Results update as you choose"
        scrollable
        footer={
          <View style={styles.sheetFooter}>
            <PrimaryButton
              label={`Show ${results.length} ${results.length === 1 ? 'course' : 'courses'}`}
              onPress={() => setFilterOpen(false)}
            />
            <PrimaryButton label="Clear all filters" onPress={clearAll} variant="ghost" />
          </View>
        }>
        <FilterGroup title="Cuisine or skill">
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.label}
              selected={filters.categoryIds.includes(category.id)}
              onPress={() => toggleIn('categoryIds', category.id)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Level">
          {levelOptions.map((level) => (
            <Chip
              key={level}
              label={level}
              selected={filters.levels.includes(level)}
              onPress={() => toggleIn('levels', level)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Price">
          {priceBandOptions.map((option) => (
            <Chip
              key={option.id}
              label={option.label}
              selected={filters.priceBands.includes(option.id)}
              onPress={() => toggleIn('priceBands', option.id)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Duration">
          {durationOptions.map((option) => (
            <Chip
              key={option.id}
              label={option.label}
              selected={filters.durations.includes(option.id)}
              onPress={() => toggleIn('durations', option.id)}
            />
          ))}
        </FilterGroup>
      </BottomSheet>
    </View>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.filterGroup}>
      <Text style={[type.label, { color: colors.textSecondary }]}>{title}</Text>
      <View style={styles.filterRow}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  chipRow: { gap: spacing.xs, paddingVertical: spacing.xxs, alignItems: 'center' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  toolbarActions: { flexDirection: 'row', gap: spacing.xs },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    minHeight: 30,
  },
  results: { gap: spacing.md, marginTop: spacing.xxs },
  demoNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.sm },
  filterGroup: { gap: spacing.xs, marginBottom: spacing.md },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  sheetFooter: { gap: spacing.xs },
});
