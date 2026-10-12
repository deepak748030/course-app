/**
 * Transactions: every purchase on this account, newest first — straight from the server.
 *
 * Each order is a real
 * record on the learner's account: amount paid, coupon used, date and status.
 */

import { CourseImage } from '@/components/course-image';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Receipt, WifiOff } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ListSkeleton } from '@/components/skeletons';
import { AppBar, Badge, DataList, EmptyState, Screen } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { useT } from '@/i18n';
import { formatInr } from '@/lib/format';
import { useInfiniteList } from '@/lib/infinite';
import { api, type ServerOrder } from '@/services/api';
import { useCatalog } from '@/services/catalog-context';
import type { Course } from '@/types';

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

type LoadState = 'loading' | 'ready' | 'error';

export default function TransactionsScreen() {
  const t = useT();

  const router = useRouter();
  const { byId } = useCatalog();

  const [state, setState] = useState<LoadState>('loading');
  const [orders, setOrders] = useState<ServerOrder[]>([]);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const { orders: next } = await api.myOrders();
      setOrders(next);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const paid = orders.filter((order) => order.status === 'paid');
  const orderPages = useInfiniteList(orders);
  const paidTotal = paid.reduce((sum, order) => sum + order.amountInr, 0);
  const savedTotal = paid.reduce((sum, order) => sum + (order.discountInr || 0), 0);

  const openCourse = (order: ServerOrder, course: Course | undefined) => {
    if (course) router.push({ pathname: '/course/[id]', params: { id: course.id } });
  };

  return (
    <Screen
      onEndReached={orderPages.loadMore}
      header={<AppBar title={t("Transactions")} />}
      contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}>
      {state === 'loading' ? (
        <ListSkeleton rows={4} />
      ) : state === 'error' ? (
        <EmptyState
          icon={WifiOff}
          title={t("Can't reach the academy")}
          body={t("Your orders live on the academy server. Check your connection and try again.")}
          actionLabel={t("Try again")}
          onAction={() => void load()}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t("No transactions yet")}
          body={t("Courses you unlock are listed here, with the amount paid, the date and the coupon used.")}
          actionLabel={t("Browse courses")}
          onAction={() => router.push('/explore')}
        />
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={[type.labelStrong, { color: colors.textMuted }]}>{t("Paid on this account")}</Text>
              <Text style={[type.title, tabularNums, { color: colors.accentText }]}>{formatInr(paidTotal)}</Text>
            </View>
            <Text style={[type.label, { color: colors.textMuted }]}>
              {t('{n} orders on your account', { n: orders.length })}
              {savedTotal > 0 ? ` · ${formatInr(savedTotal)} saved with coupons` : ''}
            </Text>
            <Text style={[type.label, { color: colors.textSubtle }]}>
              {t("Payments are processed by Razorpay. Each order is kept on your academy account.")}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[type.labelStrong, styles.heading, { color: colors.textMuted }]}>
              {orders.length === 1 ? t('1 transaction') : t('All {n} transactions', { n: orders.length })}
            </Text>
            {/* No gap between rows: the list is framed by a hairline at the top and bottom, with one between rows. */}
            <View style={styles.listFrame}>
            <DataList dividerInset={layout.screen + 64 + spacing.md}>
              {orderPages.visible.map((order) => {
                const course = order.course ? byId(order.course.slug) : undefined;
                const refunded = order.status === 'refunded';
                const pending = order.status === 'pending';
                return (
                  <Pressable
                    key={order._id}
                    accessibilityRole="button"
                    accessibilityLabel={`${order.courseTitle}, ${formatInr(order.amountInr)}, ${formatDay(order.createdAt)}. Open course.`}
                    disabled={!course}
                    onPress={() => openCourse(order, course)}
                    style={({ pressed }) => [styles.row, pressed && { opacity: 0.72 }]}>
                    {course ? (
                      <CourseImage source={course.cover} style={styles.thumb} transition={140} />
                    ) : (
                      <View style={styles.thumb} />
                    )}

                    <View style={styles.flex}>
                      <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
                        {order.courseTitle}
                      </Text>
                      <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={1}>
                        {formatDay(order.createdAt)}
                        {order.couponCode ? ` · ${order.couponCode} applied` : ''}
                      </Text>
                      <View style={styles.badges}>
                        <Badge
                          label={refunded ? 'Refunded' : pending ? 'Pending' : 'Paid'}
                          tone={refunded ? 'error' : pending ? 'neutral' : 'gold'}
                        />
                        {order.discountInr > 0 && !refunded ? (
                          <Badge label={t('Saved {amount}', { amount: formatInr(order.discountInr) })} tone="sage" />
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.amount}>
                      <Text style={[type.bodyStrong, tabularNums, { color: refunded ? colors.textSubtle : colors.accentText }]}>
                        {formatInr(order.amountInr)}
                      </Text>
                      {order.listAmountInr && order.listAmountInr > order.amountInr ? (
                        <Text style={[type.label, tabularNums, styles.strike, { color: colors.textSubtle }]}>
                          {formatInr(order.listAmountInr)}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </DataList>
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = createStyles(() =>
  StyleSheet.create({
    flex: { flex: 1 },
    summary: {
      gap: spacing.sm,
      paddingHorizontal: layout.screen,
      paddingVertical: spacing.sm,
    },
    summaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    section: { gap: spacing.sm },
    heading: { paddingHorizontal: layout.section },
    listFrame: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
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
  }),
);
