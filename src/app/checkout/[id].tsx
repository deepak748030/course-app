import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleCheck, ShieldCheck, Tag } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedCart } from '@/components/animated-icons';
import { PriceSummary, StickyBar } from '@/components/course-cards';
import { AppBar, AppText, Badge, Button, DataList, ErrorState, FormField, MetaItem, Screen, SectionHeader } from '@/components/ui';
import { colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { Clapperboard, Clock } from 'lucide-react-native';
import { courseById } from '@/data/catalog';
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

  if (!course) {
    return (
      <Screen header={<AppBar title="Checkout" onBack={() => router.replace('/explore')} />}>
        <ErrorState
          title="Course unavailable"
          body="We could not load this course. Start again from the catalog."
          onRetry={() => router.replace('/explore')}
        />
      </Screen>
    );
  }

  const enrolled = isEnrolled(course.id);
  const couponValue = coupon ? Math.round((course.priceInr * coupon.percentOff) / 100) : 0;
  const payable = course.priceInr - couponValue;

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
        header={<AppBar title="Checkout" />}
        contentStyle={{ paddingBottom: insets.bottom + 150, gap: layout.sectionGap }}>
        <DataList>
          <View style={styles.summaryRow}>
            <Image source={course.cover} style={styles.thumb} contentFit="cover" transition={150} />
            <View style={styles.flex}>
              <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
                {course.title}
              </Text>
              <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={1}>
                {course.promise}
              </Text>
              <View style={styles.metaRow}>
                <MetaItem icon={Clapperboard} label={`${course.lessonCount} lessons`} />
                <MetaItem icon={Clock} label={formatDuration(course.hours * 60)} />
              </View>
            </View>
          </View>
        </DataList>

        <View style={styles.section}>
          <SectionHeader title="What you get" />
          <View style={styles.termsList}>
            {purchaseTerms.map((term) => (
              <View key={term} style={styles.termRow}>
                <CircleCheck size={16} color={colors.sage} strokeWidth={1.9} />
                <Text style={[type.body, { color: colors.text, flex: 1 }]}>{term}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Coupon" subtitle="Demo codes only — nothing is charged" />
          <View style={styles.pad}>
            {coupon ? (
              <View style={styles.appliedCoupon}>
                <Tag size={16} color={colors.success} strokeWidth={2} />
                <Text style={[type.labelStrong, { color: colors.success, flex: 1 }]}>
                  {coupon.code} applied · {coupon.percentOff}% off
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove coupon"
                  onPress={() => setCoupon(null)}
                  hitSlop={8}>
                  <Text style={[type.label, { color: colors.textMuted }]}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <FormField
                value={couponInput}
                onChangeText={(text) => {
                  setCouponInput(text);
                  if (couponError) setCouponError(null);
                }}
                placeholder="Enter a demo code"
                autoCapitalize="characters"
                autoCorrect={false}
                error={couponError}
                hint={`Try ${demoCoupons[0].code}.`}
                returnKeyType="done"
                onSubmitEditing={applyCoupon}
                rightSlot={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Apply coupon"
                    onPress={applyCoupon}
                    hitSlop={8}
                    disabled={couponInput.trim().length === 0}>
                    <Text
                      style={[
                        type.labelStrong,
                        { color: couponInput.trim().length === 0 ? colors.textSubtle : colors.accentText },
                      ]}>
                      Apply
                    </Text>
                  </Pressable>
                }
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Price details" />
          <View style={styles.pad}>
            <PriceSummary course={course} couponPercent={coupon?.percentOff ?? 0} couponCode={coupon?.code} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <SectionHeader title="Demo payment mode" subtitle="Pick which outcome the demo should reproduce" />
            <View style={styles.badgeWrap}>
              <Badge label="No real payment" tone="gold" />
            </View>
          </View>
          <View style={styles.pad}>
            <View style={styles.scenarioList}>
              {demoScenarios.map((option) => {
                const selected = scenario === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${option.label}. ${option.help}`}
                    onPress={() => {
                      feedback.select();
                      setScenario(option.id);
                      setOutcome(null);
                    }}
                    style={[styles.scenarioRow, selected && styles.scenarioRowSelected]}>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <View style={styles.flex}>
                      <Text style={[type.body, { color: colors.text }]}>{option.label}</Text>
                      <Text style={[type.label, { color: colors.textMuted }]}>{option.help}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.securityRow}>
              <ShieldCheck size={16} color={colors.sage} strokeWidth={1.9} />
              <Text style={[type.label, { color: colors.textMuted, flex: 1 }]}>
                No card, UPI or bank details are requested or stored. A demo purchase only unlocks the course locally.
              </Text>
            </View>

            {outcome?.kind === 'failed' ? (
              <ErrorState title="Payment failed" body={`${outcome.message} Nothing was charged.`} onRetry={pay} />
            ) : null}

            {outcome?.kind === 'cancelled' ? (
              <View style={styles.notice}>
                <Badge label="Cancelled" tone="neutral" />
                <Text style={[type.body, { color: colors.text }]}>
                  You closed the demo payment before it finished. Nothing was charged and the course stays locked.
                </Text>
                <Button label="Try the demo payment again" variant="secondary" onPress={pay} />
              </View>
            ) : null}

            {enrolled ? (
              <View style={styles.notice}>
                <Badge label="Already purchased" tone="success" icon={CircleCheck} />
                <Text style={[type.body, { color: colors.text }]}>
                  This course is already unlocked on your account. Buying again would only create a duplicate demo
                  enrolment.
                </Text>
                <Button
                  label="Go to the course"
                  variant="secondary"
                  onPress={() => router.replace({ pathname: '/course/[id]', params: { id: course.id } })}
                />
              </View>
            ) : null}
          </View>
        </View>
      </Screen>

      <StickyBar bottomInset={insets.bottom}>
        <View style={styles.flex}>
          <AppText variant="subheading" style={tabularNums}>
            {formatInr(payable)}
          </AppText>
          <Text style={[type.label, { color: colors.textMuted }]}>
            {coupon ? `${coupon.code} applied · total` : 'Total payable'}
          </Text>
        </View>
        <Button
          label={processing ? 'Processing' : `Pay ${formatInr(payable)}`}
          onPress={pay}
          loading={processing}
          disabled={enrolled}
          fullWidth={false}
          sheen
          iconNode={<AnimatedCart size={18} color={colors.onAccent} />}
        />
      </StickyBar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  pad: { paddingHorizontal: layout.section },
  summaryRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, alignItems: 'center' },
  thumb: { width: 88, height: 68, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs, flexWrap: 'wrap' },
  section: { gap: layout.gap },
  sectionHead: { gap: spacing.xs },
  badgeWrap: { paddingHorizontal: layout.section, marginTop: spacing.xs },
  termsList: { gap: spacing.sm, paddingHorizontal: layout.section },
  termRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  appliedCoupon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: layout.fieldHeight,
  },
  scenarioList: { gap: layout.gap },
  scenarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 60,
  },
  scenarioRowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
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
  securityRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingTop: spacing.md },
  notice: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
});
