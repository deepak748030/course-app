import { useLocalSearchParams } from 'expo-router';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
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
import { useT } from '@/i18n';
import {
  browseCourses,
  durationOptions,
  emptyFilters,
  levelOptions,
  priceBandOptions,
  type BrowseFilters,
} from '@/lib/catalog';
import { CatalogGate, useCatalog } from '@/services/catalog-context';
import { track } from '@/services/analytics';
import { clearRecentSearches, readRecentSearches, rememberSearch } from '@/lib/recent-searches';
import { useStore } from '@/store';


export default function ExploreScreen() {
  const t = useT();

  const params = useLocalSearchParams<{ category?: string }>();
  const { state } = useStore();
  const { courses, categories } = useCatalog();

  const [filters, setFilters] = useState<BrowseFilters>(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (params.category) setFilters((prev) => ({ ...prev, categoryIds: [String(params.category)] }));
  }, [params.category]);

  // What learners actually search for — debounced so typing one word is one event.
  useEffect(() => {
    const term = filters.query.trim();
    if (term.length < 2) return;
    const timer = setTimeout(() => track('search', { meta: { query: term } }), 1200);
    return () => clearTimeout(timer);
  }, [filters.query]);

  const results = useMemo(() => browseCourses(courses, filters), [filters, courses]);

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
        return browseCourses(courses, { ...emptyFilters, query: seed.term }).length > 0;
      })
      .slice(0, 6);
  }, [courses, categories]);

  const applySearch = useCallback((term: string) => {
    setFilters((prev) => ({ ...prev, query: term }));
    void rememberSearch(term).then(setRecent);
  }, []);
  const personalised = state.interests.length > 0 && filters.categoryIds.length === 0 && filters.query.length === 0;

  // Singular and plural are separate keys on purpose: Hindi has one form, English has two, and the
  // dictionary is keyed by the English source string. Both are written as literal t() calls so the
  // self-check can see them.
  const resultsLabel =
    results.length === 1
      ? { count: t('{n} course', { n: results.length }), show: t('Show {n} course', { n: results.length }) }
      : { count: t('{n} courses', { n: results.length }), show: t('Show {n} courses', { n: results.length }) };

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
          <TabHeader overline={t("Discover")} title={t("What will you make today?")} />
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

      <CatalogGate>
      {searchPanelOpen ? (
        <View style={styles.panel}>
          {recent.length > 0 ? (
            <View style={styles.block}>
              <SectionHeader
                title={t("Recent searches")}
                actionLabel={t("Clear")}
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
            <SectionHeader title={t("Try searching")} subtitle={t("Picked from this catalog")} />
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
          <Chip label={t("All")} selected={filters.categoryIds.length === 0} onPress={() => setFilters((prev) => ({ ...prev, categoryIds: [] }))} />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={t(category.label)}
              selected={filters.categoryIds.includes(category.id)}
              onPress={() => toggleIn('categoryIds', category.id)}
            />
          ))}
        </Rail>

        <View style={styles.pad}>
          {/* The count and its sub-heading on the left, one icon-only filter button on the right,
              centred on the two lines. Sorting lives in the data layer; the default order is by
              interest, which is what the sub-heading names. */}
          <SectionHeader
            align="center"
            title={resultsLabel.count}
            subtitle={personalised ? t('Ordered by your interests') : undefined}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  activeChips.length > 0 ? t('Filters, {n} active', { n: activeChips.length }) : t('Filters')
                }
                onPress={() => setFilterOpen(true)}
                style={({ pressed }) => [
                  styles.filterButton,
                  activeChips.length > 0 && styles.filterButtonActive,
                  pressed && { opacity: 0.7 },
                ]}>
                <SlidersHorizontal
                  size={18}
                  color={activeChips.length > 0 ? colors.accentText : colors.text}
                  strokeWidth={1.9}
                />
              </Pressable>
            }
          />
        </View>

        {activeChips.length > 0 ? (
          <Rail>
            {activeChips.map((chip) => (
              <Pressable
                key={chip.key}
                accessibilityRole="button"
                accessibilityLabel={t('Remove filter {filter}', { filter: chip.label })}
                onPress={chip.clear}
                style={styles.activeChip}>
                <Text style={[type.label, { color: colors.accentText }]}>{chip.label}</Text>
                <X size={13} color={colors.accentText} strokeWidth={2} />
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel={t("Clear all filters")} onPress={clearAll} hitSlop={8}>
              <Text style={[type.label, styles.clearAll, { color: colors.textMuted }]}>{t("Clear all")}</Text>
            </Pressable>
          </Rail>
        ) : null}

        <View style={styles.resultsDivider} />

        {results.length === 0 ? (
          <View style={styles.block}>
            <EmptyState
              icon={Search}
              title={t("No courses match these filters")}
              body={t("Try a different track, level or price range. Clearing the filters brings the full catalog back.")}
              actionLabel={t("Clear filters")}
              onAction={() => setFilters({ ...emptyFilters })}
            />
            <View style={styles.block}>
              <SectionHeader title={t("Try searching")} subtitle={t("Picked from this catalog")} />
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

        </>
      )}

      <BottomSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        title={t("Filters")}
        subtitle={t("Results update as you choose")}
        scrollable
        footer={
          <View style={styles.sheetFooter}>
            <Button
              label={resultsLabel.show}
              onPress={() => setFilterOpen(false)}
            />
            <Button label={t("Clear all filters")} onPress={clearAll} variant="ghost" />
          </View>
        }>
        <FilterGroup title={t("Track or skill")}>
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.label}
              selected={filters.categoryIds.includes(category.id)}
              onPress={() => toggleIn('categoryIds', category.id)}
            />
          ))}
        </FilterGroup>
        <FilterGroup title={t("Level")}>
          {levelOptions.map((level) => (
            <Chip key={level} label={t(level)} selected={filters.levels.includes(level)} onPress={() => toggleIn('levels', level)} />
          ))}
        </FilterGroup>
        <FilterGroup title={t("Price")}>
          {priceBandOptions.map((option) => (
            <Chip
              key={option.id}
              label={t(option.label)}
              selected={filters.priceBands.includes(option.id)}
              onPress={() => toggleIn('priceBands', option.id)}
            />
          ))}
        </FilterGroup>
        <FilterGroup title={t("Duration")}>
          {durationOptions.map((option) => (
            <Chip
              key={option.id}
              label={t(option.label)}
              selected={filters.durations.includes(option.id)}
              onPress={() => toggleIn('durations', option.id)}
            />
          ))}
        </FilterGroup>
      </BottomSheet>
      </CatalogGate>
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
  /* Icon-only filter button: 44pt tap target, hairline edge, accent when filters are on. */
  filterButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterButtonActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
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
