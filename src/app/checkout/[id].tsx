import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CircleCheck,
  CircleX,
  Clapperboard,
  Clock,
  Play,
  ShieldCheck,
  Tag,
  Ticket,
  TriangleAlert,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedCart, AnimatedIcon } from '@/components/animated-icons';
import { PriceSummary, StickyBar } from '@/components/course-cards';
import { OfferBadge } from '@/components/offer-tag';
import {
  AppBar,
  AppText,
  Badge,
  Button,
  Chip,
  FormField,
  MetaItem,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { courseById, discountPercent, firstPlayableLesson } from '@/data/catalog';
import { demoCoupons, purchaseTerms } from '@/data/content';
import { demoPaymentService, demoScenarios, type DemoScenario } from '@/services/payments';
import { useStore } from '@/store';
import { formatDuration, formatInr } from '@/lib/format';
import { feedback } from '@/lib/util';

type Outcome = { kind: 'failed'; message: string } | { kind: 'cancelled' } | null;

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isEnrolled, addEnrollment } = useStore();

  const course = useMemo(() => courseById(id), [id]);

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; percentOff: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<DemoScenario>('success');
  const [processing, setProcessing] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/explore'));

  if (!course) {
    return (
      <Screen header={<AppBar title="Checkout" onBack={() => router.replace('/explore')} />}>
        <View style={styles.missing}>
          <Text style={[type.subheading, { color: colors.text }]}>Course unavailable</Text>
          <Text style={[type.body, { color: colors.textMuted, textAlign: 'center' }]}>
            We could not load this course. Start again from the catalog.
          </Text>
          <Button label="Browse courses" onPress={() => router.replace('/explore')} fullWidth={false} />
        </View>
      </Screen>
    );
  }

  const enrolled = isEnrolled(course.id);
  const couponValue = coupon ? Math.round((course.priceInr * coupon.percentOff) / 100) : 0;
  const payable = course.priceInr - couponValue;
  const offer = discountPercent(course);
  const firstLesson = firstPlayableLesson(course);

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    const match = demoCoupons.find((entry) => entry.code === code);
    if (!match) {
      setCoupon(null);
      setCouponError('That code is not in the demo dataset. Try RASOI10.');
      return;
    }
    setCouponError(null);
    setCoupon({ code: match.code, percentOff: match.percentOff });
    setCouponInput('');
  };

  const applyCode = (code: string, percentOff: number) => {
    feedback.select();
    setCoupon({ code, percentOff });
    setCouponInput('');
    setCouponError(null);
  };

  const pay = async () => {
    setProcessing(true);
    setOutcome(null);
    const result = await demoPaymentService.authorize({ courseId: course.id, amountInr: payable, scenario });
    setProcessing(false);

    if (result.status === 'paid') {
      addEnrollment({
        courseId: course.id,
        purchasedAt: new Date().toISOString(),
        priceInr: payable,
        source: 'demo-checkout',
      });
      feedback.success();
      router.replace({ pathname: '/purchase-success', params: { courseId: course.id } });
      return;
    }

    feedback.error();
    if (result.status === 'failed') setOutcome({ kind: 'failed', message: result.reason });
    else setOutcome({ kind: 'cancelled' });
  };

  return (
    <View style={styles.root}>
      <Screen
        header={<AppBar title="Checkout" onBack={back} />}
        contentStyle={{ paddingBottom: insets.bottom + 150, gap: layout.sectionGap }}>
        {/* What is being bought and what it costs are one decision, so they are one card: the course
            on top, the order lines under a hairline, the total last. */}
        <View style={styles.card}>
          <View style={styles.courseRow}>
            <Image source={course.cover} style={styles.thumb} contentFit="cover" transition={150} />
            <View style={styles.flex}>
              <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
                {course.title}
              </Text>
              <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={2}>
                {course.promise}
              </Text>
              <View style={styles.metaRow}>
                <MetaItem icon={Clapperboard} label={`${course.lessonCount} lessons`} />
                <MetaItem icon={Clock} label={formatDuration(course.hours * 60)} />
              </View>
            </View>
          </View>
          <View style={styles.cardRule} />
          <View style={styles.orderBlock}>
            <PriceSummary course={course} couponPercent={coupon?.percentOff ?? 0} couponCode={coupon?.code} />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Coupon" subtitle="Demo codes only — nothing is charged" />
          {coupon ? (
            <View style={styles.couponRow}>
              <Tag size={16} color={colors.success} strokeWidth={2} />
              <Text style={[type.labelStrong, { color: colors.success, flex: 1 }]}>
                {coupon.code} applied · {coupon.percentOff}% off
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove coupon ${coupon.code}`}
                onPress={() => setCoupon(null)}
                hitSlop={8}>
                <Text style={[type.labelStrong, { color: colors.textMuted }]}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.couponBlock}>
              <FormField
                value={couponInput}
                onChangeText={(text) => {
                  setCouponInput(text);
                  if (couponError) setCouponError(null);
                }}
                placeholder="Enter a demo code"
                accessibilityLabel="Coupon code"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!processing}
                error={couponError}
                returnKeyType="done"
                onSubmitEditing={applyCoupon}
                rightSlot={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Apply coupon"
                    onPress={applyCoupon}
                    hitSlop={8}
                    disabled={processing || couponInput.trim().length === 0}>
                    <Text
                      style={[
                        type.labelStrong,
                        {
                          color:
                            processing || couponInput.trim().length === 0 ? colors.textSubtle : colors.accentText,
                        },
                      ]}>
                      Apply
                    </Text>
                  </Pressable>
                }
              />
              {/* The demo codes are one tap away instead of living in a hint nobody reads. */}
              <View style={styles.couponChips}>
                {demoCoupons.map((entry) => (
                  <Chip
                    key={entry.code}
                    label={`${entry.code} · ${entry.percentOff}% off`}
                    icon={Ticket}
                    disabled={processing}
                    onPress={() => applyCode(entry.code, entry.percentOff)}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="What you get" />
          <View style={styles.terms}>
            {purchaseTerms.map((term) => (
              <View key={term} style={styles.termRow}>
                <AnimatedIcon icon={CircleCheck} size={16} color={colors.gold} motion="pulse" />
                <Text style={[type.body, { color: colors.text, flex: 1 }]}>{term}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.headRow}>
            <SectionHeader
              title="Demo payment"
              subtitle="Pick the outcome the demo should reproduce"
              style={styles.flex}
            />
            <Badge label="No real payment" tone="gold" />
          </View>
          <View style={styles.card}>
            {demoScenarios.map((option, index) => {
              const selected = scenario === option.id;
              return (
                <View key={option.id}>
                  {index > 0 ? <View style={styles.rowRule} /> : null}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${option.label}. ${option.help}`}
                    disabled={processing}
                    onPress={() => {
                      feedback.select();
                      setScenario(option.id);
                      setOutcome(null);
                    }}
                    style={({ pressed }) => [styles.scenarioRow, pressed && { opacity: 0.7 }]}>
                    <View style={styles.flex}>
                      <Text style={[type.body, { color: colors.text }]}>{option.label}</Text>
                      <Text style={[type.label, { color: colors.textMuted }]}>{option.help}</Text>
                    </View>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
          <View style={styles.security}>
            <ShieldCheck size={16} color={colors.sage} strokeWidth={1.9} />
            <Text style={[type.label, { color: colors.textMuted, flex: 1 }]}>
              No card, UPI or bank details are requested or stored. A demo purchase only unlocks the course
              locally, on this device.
            </Text>
          </View>
        </View>

        {/* Outcomes sit right above the bar that pays, not buried under the options that caused them. */}
        {outcome ? (
          <View style={[styles.notice, outcome.kind === 'failed' ? styles.noticeError : styles.noticeNeutral]}>
            <View style={styles.noticeHead}>
              {outcome.kind === 'failed' ? (
                <TriangleAlert size={18} color={colors.error} strokeWidth={2} />
              ) : (
                <CircleX size={18} color={colors.textMuted} strokeWidth={2} />
              )}
              <Text style={[type.bodyStrong, { color: colors.text }]}>
                {outcome.kind === 'failed' ? 'Payment failed' : 'Payment cancelled'}
              </Text>
            </View>
            <Text style={[type.body, { color: colors.textMuted }]}>
              {outcome.kind === 'failed'
                ? `${outcome.message} Nothing was charged and the course stays locked.`
                : 'You closed the demo payment before it finished. Nothing was charged and the course stays locked.'}
            </Text>
            <Button
              label="Try the demo payment again"
              variant="secondary"
              fullWidth={false}
              onPress={pay}
              disabled={processing}
            />
          </View>
        ) : null}

        {enrolled ? (
          <View style={styles.notice}>
            <View style={styles.noticeHead}>
              <CircleCheck size={18} color={colors.success} strokeWidth={2} />
              <Text style={[type.bodyStrong, { color: colors.text }]}>Already purchased</Text>
            </View>
            <Text style={[type.body, { color: colors.textMuted }]}>
              This course is already unlocked on your account. Buying again would only create a duplicate demo
              enrolment, so there is nothing to pay.
            </Text>
          </View>
        ) : null}

        <Text style={[type.label, styles.disclaimer, { color: colors.textSubtle }]}>
          Demo checkout: prices, coupons and outcomes are sample data. No payment is processed and no money
          moves.
        </Text>
      </Screen>

      <StickyBar bottomInset={insets.bottom}>
        {enrolled ? (
          <>
            <View style={styles.flex}>
              <Text style={[type.label, { color: colors.textMuted }]}>You own this course</Text>
              <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={1}>
                {firstLesson.title}
              </Text>
            </View>
            <Button
              label="Start learning"
              icon={Play}
              fullWidth={false}
              onPress={() =>
                router.replace({
                  pathname: '/lesson/[courseId]/[lessonId]',
                  params: { courseId: course.id, lessonId: firstLesson.id },
                })
              }
            />
          </>
        ) : (
          <>
            <View style={styles.flex}>
              <View style={styles.payableRow}>
                {/* Same price language as the course page's bar: the amount you pay carries the
                    theme accent, the price it replaced is struck through in red. */}
                <AppText variant="subheading" color={colors.accentText} style={tabularNums}>
                  {formatInr(payable)}
                </AppText>
                {course.listPriceInr && course.listPriceInr > payable ? (
                  <Text style={[type.label, styles.strike, tabularNums, { color: colors.error }]}>
                    {formatInr(course.listPriceInr)}
                  </Text>
                ) : null}
                {offer && !coupon ? <OfferBadge percent={offer} /> : null}
                {coupon ? <Badge label={coupon.code} tone="success" /> : null}
              </View>
              <Text style={[type.label, { color: colors.textMuted }]}>
                {coupon ? `Coupon applied · total` : 'Total payable · one-time'}
              </Text>
            </View>
            <Button
              label={processing ? 'Processing' : `Pay ${formatInr(payable)}`}
              onPress={pay}
              loading={processing}
              fullWidth={false}
              sheen
              iconNode={<AnimatedCart size={18} color={colors.onAccent} />}
            />
          </>
        )}
      </StickyBar>
    </View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  missing: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxl, paddingHorizontal: layout.section },

  /** Full-bleed card with hairlines instead of a box inside the page gutter — the app's group shape. */
  card: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  cardRule: { height: 1, backgroundColor: colors.divider },
  rowRule: { height: 1, backgroundColor: colors.divider, marginLeft: layout.screen },

  courseRow: { flexDirection: 'row', gap: spacing.md, padding: layout.screen, alignItems: 'center' },
  thumb: { width: 88, height: 68, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs, flexWrap: 'wrap' },
  orderBlock: { paddingHorizontal: layout.screen, paddingTop: spacing.md, paddingBottom: spacing.sm },

  section: { gap: layout.gap },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: layout.screen },
  payableRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },

  strike: { textDecorationLine: 'line-through' },
  couponBlock: { gap: spacing.sm, paddingHorizontal: layout.screen },
  couponChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    minHeight: layout.fieldHeight,
    paddingHorizontal: layout.screen,
  },

  terms: { gap: layout.gap, paddingHorizontal: layout.screen },
  termRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },

  scenarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screen,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.accentText },
  radioDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.accentText },
  security: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    paddingHorizontal: layout.screen,
  },

  notice: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: layout.screen,
    paddingVertical: spacing.md,
    alignItems: 'flex-start',
  },
  noticeError: { backgroundColor: colors.errorSoft, borderColor: colors.errorSoft },
  noticeNeutral: { backgroundColor: colors.surfaceAlt },
  noticeHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  disclaimer: { paddingHorizontal: layout.screen },
}));
