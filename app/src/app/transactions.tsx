/**
 * Transactions: every course this account has unlocked, newest first.
 *
 * The prototype has no payment gateway, so this screen says so out loud and then lists what actually
 * happened on this device: the demo purchases made in checkout (with the amount paid, the coupon and
 * the saving against the list price) and the sample enrolment the demo account ships with. Nothing
 * here pretends a card was charged.
 */

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Receipt } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppBar, Badge, DataList, EmptyState, Screen } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { courseById } from '@/data/catalog';
import { useT } from '@/i18n';
import { formatInr } from '@/lib/format';
import { useStore } from '@/store';
import type { Course, Enrollment } from '@/types';

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function TransactionsScreen() {
  const t = useT();

  const router = useRouter();
  const { state } = useStore();

  const rows = Object.values(state.enrollments)
    .map((enrollment) => ({ enrollment, course: courseById(enrollment.courseId) }))
    .filter((row): row is { enrollment: Enrollment; course: Course } => Boolean(row.course))
    .sort((a, b) => Date.parse(b.enrollment.purchasedAt) - Date.parse(a.enrollment.purchasedAt));

  // The sample enrolment that ships with the demo account was not paid for, so it never counts as a
  // saving — only the courses actually bought in checkout do.
  const bought = rows.filter((row) => row.enrollment.source === 'demo-checkout');
  const paid = bought.reduce((sum, row) => sum + row.enrollment.priceInr, 0);
  const saved = bought.reduce((sum, row) => {
    const list = row.course.listPriceInr ?? row.course.priceInr;
    return sum + Math.max(0, list - row.enrollment.priceInr);
  }, 0);

  return (
    <Screen
      header={<AppBar title={t("Transactions")} />}
      contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}>
      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t("No transactions yet")}
          body={t("Courses you unlock in this prototype are listed here, with the amount paid, the date and the coupon used.")}
          actionLabel={t("Browse courses")}
          onAction={() => router.push('/explore')}
        />
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={[type.labelStrong, { color: colors.textMuted }]}>{t("Paid in this prototype")}</Text>
              <Text style={[type.title, tabularNums, { color: colors.accentText }]}>{formatInr(paid)}</Text>
            </View>
            <Text style={[type.label, { color: colors.textMuted }]}>
              {t('{n} courses unlocked on this device', { n: rows.length })}
              {saved > 0 ? ` · ${formatInr(saved)} saved against list prices` : ''}
            </Text>
            <Text style={[type.label, { color: colors.textSubtle }]}>{t("No card, UPI or bank details were taken: the checkout is a demo and only unlocks the course here.")}</Text>
          </View>

          <View style={styles.section}>
            <Text style={[type.labelStrong, styles.heading, { color: colors.textMuted }]}>
              {rows.length === 1 ? t('1 transaction') : t('All {n} transactions', { n: rows.length })}
            </Text>
            <DataList dividerInset={layout.screen + 64 + spacing.md}>
              {rows.map(({ enrollment, course }) => {
                const seed = enrollment.source === 'sample-seed';
                const list = course.listPriceInr ?? course.priceInr;
                const savedHere = seed ? 0 : Math.max(0, list - enrollment.priceInr);
                return (
                  <Pressable
                    key={course.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${course.title}, ${seed ? 'included with the sample account' : formatInr(enrollment.priceInr)}, ${formatDay(enrollment.purchasedAt)}. Open course.`}
                    onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
                    style={({ pressed }) => [styles.row, pressed && { opacity: 0.72 }]}>
                    <Image source={course.cover} style={styles.thumb} contentFit="cover" transition={140} />

                    <View style={styles.flex}>
                      <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
                        {course.title}
                      </Text>
                      <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={1}>
                        {formatDay(enrollment.purchasedAt)}
                        {enrollment.couponCode ? ` · ${enrollment.couponCode} applied` : ''}
                      </Text>
                      <View style={styles.badges}>
                        <Badge label={seed ? 'Sample account' : 'Demo purchase'} tone={seed ? 'neutral' : 'gold'} />
                        {savedHere > 0 ? (
                          <Badge label={t('Saved {amount}', { amount: formatInr(savedHere) })} tone="sage" />
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.amount}>
                      <Text style={[type.bodyStrong, tabularNums, { color: colors.accentText }]}>
                        {seed ? 'Included' : formatInr(enrollment.priceInr)}
                      </Text>
                      {!seed && course.listPriceInr ? (
                        <Text style={[type.label, tabularNums, styles.strike, { color: colors.textSubtle }]}>
                          {formatInr(course.listPriceInr)}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </DataList>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = createStyles(() => StyleSheet.create({
  flex: { flex: 1 },
  summary: {
    gap: spacing.sm,
    paddingHorizontal: layout.screen,
    paddingVertical: spacing.sm,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  section: { gap: layout.gap },
  heading: { paddingHorizontal: layout.section },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screen,
    paddingVertical: spacing.md,
  },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' },
  amount: { alignItems: 'flex-end', gap: 2 },
  strike: { textDecorationLine: 'line-through' },
}));
