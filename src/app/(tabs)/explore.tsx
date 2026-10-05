import { useLocalSearchParams } from 'expo-router';
import { Check, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { CourseRow } from '@/components/course-cards';
import {
  AppText,
  Badge,
  Button,
  Chip,
  DataList,
  EmptyState,
  Rail,
  Screen,
  SearchField,
  SectionHeader,
  TabHeader,
} from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, type } from '@/constants/theme';
import {
  browseCourses,
  categories,
  courses,
  durationOptions,
  emptyFilters,
  priceBandOptions,
  sortOptions,
  type BrowseFilters,
  type SortKey,
} from '@/data/catalog';
import { clearRecentSearches, readRecentSearches, rememberSearch } from '@/lib/recent-searches';
import { useStore } from '@/store';

const levelOptions = ['Beginner', 'Intermediate', 'Advanced'];

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const { state } = useStore();

  const [filters, setFilters] = useState<BrowseFilters>(emptyFilters);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (params.category) setFilters((prev) => ({ ...prev, categoryIds: [String(params.category)] }));
  }, [params.category]);

  const results = useMemo(() => browseCourses(filters), [filters]);

  // Focus shows what to search instead of an empty field (search rule: recents, then suggestions).
  const searchPanelOpen = searchFocused && filters.query.trim().length === 0;

  useEffect(() => {
    if (!searchFocused) return;
    let cancelled = false;
    void readRecentSearches().then((entries) => {
      if (!cancelled) setRecent(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [searchFocused]);

  // Only offer suggestions the catalog can actually answer, so a suggestion is never a dead end.
  const suggestions = useMemo(() => {
    const stopWords = new Set(['the', 'and', 'your', 'with', 'for', 'from', 'that', 'this', 'into']);
    const words = courses
      .flatMap((course) => course.title.split(/[\s,–-]+/))
      .map((word) => word.replace(/[^A-Za-z]/g, ''))
      .filter((word) => word.length > 3 && !stopWords.has(word.toLowerCase()));

    const seeds = [
      ...words.map((word) => ({ term: word, badge: 'Course' })),
      ...categories.map((category) => ({ term: category.label, badge: 'Track' })),
    ];

    const seen = new Set<string>();
    return seeds
      .filter((seed) => {
        const key = seed.term.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return browseCourses({ ...emptyFilters, query: seed.term }).length > 0;
      })
      .slice(0, 6);
  }, []);

  const applySearch = useCallback((term: string) => {
    setFilters((prev) => ({ ...prev, query: term }));
    void rememberSearch(term).then(setRecent);
  }, []);
  const personalised = state.interests.length > 0 && filters.categoryIds.length === 0 && filters.query.length === 0;

  const toggleIn = (key: 'categoryIds' | 'levels' | 'priceBands' | 'durations', value: string) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((item: string) => item !== value) : [...prev[key], value],
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
    <Screen
      contentStyle={styles.content}
      header={
        <View style={styles.headerBlock}>
          <TabHeader overline="Discover" title="What will you make today?" />
          <View style={styles.searchWrap}>
            <SearchField
              value={filters.query}
              onChangeText={(query) => setFilters((prev) => ({ ...prev, query }))}
              onSubmit={applySearch}
              onFocusChange={setSearchFocused}
              onCancel={() => setSearchFocused(false)}
            />
          </View>
        </View>
      }>

      {searchPanelOpen ? (
        <View style={styles.panel}>
          {recent.length > 0 ? (
            <View style={styles.block}>
              <SectionHeader
                title="Recent searches"
                actionLabel="Clear"
                onAction={() => {
                  setRecent([]);
                  void clearRecentSearches();
                }}
              />
              <Rail>
                {recent.map((term) => (
                  <Chip key={term} label={term} onPress={() => applySearch(term)} />
                ))}
              </Rail>
            </View>
          ) : null}

          <View style={styles.block}>
            <SectionHeader title="Try searching" subtitle="Picked from this catalog" />
            <DataList>
              {suggestions.map((suggestion) => (
                <Pressable
                  key={suggestion.term}
                  accessibilityRole="button"
                  accessibilityLabel={`Search ${suggestion.term}`}
                  onPress={() => applySearch(suggestion.term)}
                  style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
                  <Search size={16} color={colors.textSubtle} strokeWidth={1.9} />
                  <AppText variant="body" style={styles.suggestionLabel}>
                    {suggestion.term}
                  </AppText>
                  <Badge label={suggestion.badge} tone="neutral" />
                </Pressable>
              ))}
            </DataList>
          </View>
        </View>
      ) : (
        <>
        <Rail>
          <Chip label="All" selected={filters.categoryIds.length === 0} onPress={() => setFilters((prev) => ({ ...prev, categoryIds: [] }))} />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.label}
              selected={filters.categoryIds.includes(category.id)}
              onPress={() => toggleIn('categoryIds', category.id)}
            />
          ))}
        </Rail>

        <View style={styles.pad}>
          <SectionHeader
            title={`${results.length} ${results.length === 1 ? 'course' : 'courses'}`}
            subtitle={personalised ? 'Ordered by your interests' : undefined}
          />
          <View style={styles.toolbar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sort results"
              onPress={() => setSortOpen(true)}
              style={({ pressed }) => [styles.tool, pressed && { opacity: 0.7 }]}>
              <Text style={[type.label, { color: colors.text }]}>
                {sortOptions.find((option) => option.id === filters.sort)?.label ?? 'Sort'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={activeChips.length > 0 ? `Filters, ${activeChips.length} active` : 'Filters'}
              onPress={() => setFilterOpen(true)}
              style={({ pressed }) => [
                styles.tool,
                activeChips.length > 0 && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                pressed && { opacity: 0.7 },
              ]}>
              <SlidersHorizontal size={14} color={activeChips.length > 0 ? colors.accentText : colors.text} strokeWidth={1.9} />
              <Text style={[type.label, { color: activeChips.length > 0 ? colors.accentText : colors.text }]}>
                {activeChips.length > 0 ? `Filters · ${activeChips.length}` : 'Filters'}
              </Text>
            </Pressable>
          </View>
        </View>

        {activeChips.length > 0 ? (
          <Rail>
            {activeChips.map((chip) => (
              <Pressable
                key={chip.key}
                accessibilityRole="button"
                accessibilityLabel={`Remove filter ${chip.label}`}
                onPress={chip.clear}
                style={styles.activeChip}>
                <Text style={[type.label, { color: colors.accentText }]}>{chip.label}</Text>
                <X size={13} color={colors.accentText} strokeWidth={2} />
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel="Clear all filters" onPress={clearAll} hitSlop={8}>
              <Text style={[type.label, styles.clearAll, { color: colors.textMuted }]}>Clear all</Text>
            </Pressable>
          </Rail>
        ) : null}

        <View style={styles.resultsDivider} />

        {results.length === 0 ? (
          <View style={styles.block}>
            <EmptyState
              icon={Search}
              title="No courses match these filters"
              body="Try a different track, level or price range. Clearing the filters brings the full catalog back."
              actionLabel="Clear filters"
              onAction={() => setFilters({ ...emptyFilters })}
            />
            <View style={styles.block}>
              <SectionHeader title="Try searching" subtitle="Picked from this catalog" />
              <Rail>
                {suggestions.map((suggestion) => (
                  <Chip key={suggestion.term} label={suggestion.term} onPress={() => applySearch(suggestion.term)} />
                ))}
              </Rail>
            </View>
          </View>
        ) : (
          <DataList>
            {results.map((course) => (
              <CourseRow key={course.id} course={course} />
            ))}
          </DataList>
        )}

        <Text style={[type.label, styles.disclaimer, { color: colors.textSubtle }]}>
          Catalog, ratings and reviews are sample data for this prototype.
        </Text>
        </>
      )}

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
            style={({ pressed }) => [styles.sheetRow, pressed && { opacity: 0.7 }]}>
            <Text style={[type.body, { color: colors.text }]}>{option.label}</Text>
            {filters.sort === option.id ? <Check size={18} color={colors.accentText} strokeWidth={2} /> : null}
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
            <Button
              label={`Show ${results.length} ${results.length === 1 ? 'course' : 'courses'}`}
              onPress={() => setFilterOpen(false)}
            />
            <Button label="Clear all filters" onPress={clearAll} variant="ghost" />
          </View>
        }>
        <FilterGroup title="Track or skill">
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
            <Chip key={level} label={level} selected={filters.levels.includes(level)} onPress={() => toggleIn('levels', level)} />
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
    </Screen>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.filterGroup}>
      <Text style={[type.labelStrong, { color: colors.textMuted }]}>{title}</Text>
      <View style={styles.filterRow}>{children}</View>
    </View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  content: { gap: layout.gap, paddingBottom: spacing.xxl },
  headerBlock: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchWrap: { paddingHorizontal: layout.screen },
  panel: { paddingTop: spacing.sm, gap: layout.sectionGap },
  block: { gap: layout.gap },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.touchTarget,
    paddingVertical: spacing.xs,
  },
  suggestionLabel: { flex: 1 },
  pressed: { opacity: 0.7 },
  pad: { paddingHorizontal: layout.screen, gap: layout.gap },
  toolbar: { flexDirection: 'row', gap: layout.gap },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    minHeight: 32,
    borderRadius: radius.pill,
  },
  clearAll: { textDecorationLine: 'underline', alignSelf: 'center' },
  resultsDivider: { height: 1, backgroundColor: colors.divider, marginHorizontal: layout.screen },
  disclaimer: { paddingHorizontal: layout.section, paddingTop: spacing.sm },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: layout.touchTarget, paddingVertical: spacing.sm },
  sheetFooter: { gap: spacing.sm },
  filterGroup: { gap: spacing.sm, marginBottom: spacing.lg },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
}));
