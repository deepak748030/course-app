import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleCheck, ShieldCheck, Tag } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PriceSummary } from '@/components/course-cards';
import { AppText, Badge, ErrorState, FormField, PrimaryButton, ScreenHeader } from '@/components/ui';
import { colors, maxContentWidth, radius, screenPadding, spacing, type } from '@/constants/theme';
import { courseById, instructorById } from '@/data/catalog';
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
  const instructor = course ? instructorById(course.instructorId) : undefined;

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; percentOff: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<DemoScenario>('success');
  const [processing, setProcessing] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  if (!course) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader onBack={() => router.replace('/explore')} />
        <ErrorState title="Course unavailable" body="We could not load this course. Start again from the catalog." onRetry={() => router.replace('/explore')} />
      </View>
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
    const result = await demoPaymentService.authorize({
      courseId: course.id,
      amountInr: payable,
      scenario,
    });
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
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 150 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Checkout" />

        <View style={styles.summaryCard}>
          <Image source={course.cover} style={styles.thumb} contentFit="cover" transition={150} />
          <View style={styles.flex}>
            <Text style={[type.cardTitle, { color: colors.text }]} numberOfLines={2}>
              {course.title}
            </Text>
            <Text style={[type.supporting, { color: colors.textSecondary }]} numberOfLines={1}>
              {instructor?.name}
            </Text>
            <Text style={[type.meta, { color: colors.textSecondary }]}>
              {course.lessonCount} lessons · {formatDuration(course.hours * 60)} · {course.level}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[type.section, { color: colors.text }]}>What you get</Text>
          <View style={styles.termsList}>
            {purchaseTerms.map((term) => (
              <View key={term} style={styles.termRow}>
                <CircleCheck size={17} color={colors.sage} strokeWidth={1.9} />
                <Text style={[type.body, { color: colors.textSecondary, flex: 1, fontSize: 15.5 }]}>{term}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[type.section, { color: colors.text }]}>Coupon</Text>
          {coupon ? (
            <View style={styles.appliedCoupon}>
              <Tag size={16} color={colors.success} strokeWidth={2} />
              <Text style={[type.label, { color: colors.success, flex: 1 }]}>
                {coupon.code} applied · {coupon.percentOff}% off
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove coupon"
                onPress={() => setCoupon(null)}
                hitSlop={8}>
                <Text style={[type.meta, { color: colors.textSecondary }]}>Remove</Text>
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
              hint={`Try ${demoCoupons[0].code} — demo codes only, nothing is charged.`}
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
                      type.label,
                      { color: couponInput.trim().length === 0 ? colors.textSecondary : colors.primary },
                    ]}>
                    Apply
                  </Text>
                </Pressable>
              }
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={[type.section, { color: colors.text }]}>Price details</Text>
          <PriceSummary course={course} couponPercent={coupon?.percentOff ?? 0} couponCode={coupon?.code} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[type.section, { color: colors.text }]}>Demo payment mode</Text>
            <Badge label="No real payment" tone="gold" />
          </View>
          <Text style={[type.supporting, { color: colors.textSecondary }]}>
            This build has no payment gateway connected. Choose which scenario the demo should reproduce — no card
            details are ever collected.
          </Text>
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
                    <Text style={[type.body, { color: colors.text, fontSize: 15.5 }]}>{option.label}</Text>
                    <Text style={[type.meta, { color: colors.textSecondary }]}>{option.help}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.securityRow}>
          <ShieldCheck size={18} color={colors.sage} strokeWidth={1.9} />
          <Text style={[type.supporting, { color: colors.textSecondary, flex: 1 }]}>
            No card, UPI or bank details are requested or stored. A demo purchase only unlocks the course locally.
          </Text>
        </View>

        {outcome?.kind === 'failed' ? (
          <ErrorState title="Payment failed" body={`${outcome.message} Nothing was charged.`} onRetry={pay} />
        ) : null}

        {outcome?.kind === 'cancelled' ? (
          <View style={styles.cancelled}>
            <Badge label="Cancelled" tone="neutral" />
            <Text style={[type.supporting, { color: colors.textSecondary }]}>
              You closed the demo payment before it finished. Nothing was charged and the course stays locked.
            </Text>
            <PrimaryButton label="Try the demo payment again" variant="secondary" onPress={pay} />
          </View>
        ) : null}

        {enrolled ? (
          <View style={styles.owned}>
            <Badge label="Already purchased" tone="success" icon={CircleCheck} />
            <Text style={[type.supporting, { color: colors.textSecondary }]}>
              This course is already unlocked on your account. Buying again would only create a duplicate demo
              enrolment.
            </Text>
            <PrimaryButton
              label="Go to the course"
              variant="secondary"
              onPress={() => router.replace({ pathname: '/course/[id]', params: { id: course.id } })}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.stickyBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.flex}>
          <AppText variant="cardTitle">{formatInr(payable)}</AppText>
          <Text style={[type.meta, { color: colors.textSecondary }]}>
            {coupon ? `${coupon.code} applied · ` : ''}Total payable
          </Text>
        </View>
        <PrimaryButton
          label={processing ? 'Processing demo payment' : `Pay ${formatInr(payable)} (demo)`}
          onPress={pay}
          loading={processing}
          disabled={enrolled}
          fullWidth={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.lg,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  thumb: { width: 92, height: 72, borderRadius: radius.image, backgroundColor: colors.surfaceWarm },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  termsList: { gap: spacing.sm },
  termRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  appliedCoupon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.input,
    padding: spacing.sm,
  },
  scenarioList: { gap: spacing.xs, marginTop: spacing.xxs },
  scenarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    minHeight: 60,
  },
  scenarioRowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  securityRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  cancelled: { gap: spacing.sm, backgroundColor: colors.surfaceWarm, borderRadius: radius.card, padding: spacing.md },
  owned: { gap: spacing.sm, backgroundColor: colors.surfaceWarm, borderRadius: radius.card, padding: spacing.md },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
