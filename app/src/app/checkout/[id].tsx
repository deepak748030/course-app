import { Image } from 'expo-image';
import { CourseImage } from '@/components/course-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CircleCheck,
  CircleX,
  Clapperboard,
  Clock,
  Play,
  ShieldCheck,
  Tag,
  TriangleAlert,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedCart, AnimatedIcon } from '@/components/animated-icons';
import { PriceSummary, StickyBar } from '@/components/course-cards';
import { OfferBadge } from '@/components/offer-tag';
import {
  AppBar,
  AppText,
  Badge,
  Button,
  FormField,
  MetaItem,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { discountPercent, firstPlayableLesson } from '@/lib/catalog';
import { useAppContent } from '@/services/app-content';
import { ApiError, api, type AvailableCoupon } from '@/services/api';
import { track } from '@/services/analytics';
import { useCatalog } from '@/services/catalog-context';
import { useT } from '@/i18n';
import { razorpayPaymentService, type CheckoutOutcome } from '@/services/payments';
import { useStore } from '@/store';
import { formatDuration, formatInr } from '@/lib/format';
import { feedback } from '@/lib/util';

type Outcome = { kind: 'failed'; message: string } | { kind: 'cancelled' } | null;

export default function CheckoutScreen() {
  const { purchaseTerms } = useAppContent();
  const t = useT();

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  /** Razorpay Checkout (UPI and QR only), shown inside the app while a purchase is in progress. */
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);
  const checkoutResolver = useRef<((outcome: CheckoutOutcome) => void) | null>(null);
  const openPaymentPage = useCallback(
    (html: string) =>
      new Promise<CheckoutOutcome>((resolve) => {
        checkoutResolver.current = resolve;
        setCheckoutHtml(html);
      }),
    [],
  );
  /** Closes the checkout page and hands its outcome to the payment flow. */
  const finishCheckout = useCallback((outcome: CheckoutOutcome) => {
    const resolve = checkoutResolver.current;
    checkoutResolver.current = null;
    setCheckoutHtml(null);
    resolve?.(outcome);
  }, []);
  const { isEnrolled, addEnrollment, settings } = useStore();
  const { byId } = useCatalog();

  const course = useMemo(() => byId(id), [byId, id]);

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discountInr: number; percent: number | null } | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  // Reaching checkout is the funnel's key step — record it once per course.
  useEffect(() => {
    if (course) track('checkout_started', { courseId: course.remoteId });
  }, [course?.remoteId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [couponError, setCouponError] = useState<string | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [processing, setProcessing] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/explore'));

  if (!course) {
    return (
      <Screen header={<AppBar title={t("Checkout")} onBack={() => router.replace('/explore')} />}>
        <View style={styles.missing}>
          <Text style={[type.subheading, { color: colors.text }]}>{t("Course unavailable")}</Text>
          <Text style={[type.body, { color: colors.textMuted, textAlign: 'center' }]}>{t("We could not load this course. Start again from the catalog.")}</Text>
          <Button label={t("Browse courses")} onPress={() => router.replace('/explore')} fullWidth={false} />
        </View>
      </Screen>
    );
  }

  const enrolled = isEnrolled(course.id);
  const couponValue = coupon?.discountInr ?? 0;
  const payable = course.priceInr - couponValue;
  const offer = discountPercent(course);
  const firstLesson = firstPlayableLesson(course);

  // Offered codes are a convenience: if the list fails, the typed-code box still works.
  useEffect(() => {
    let alive = true;
    api
      .availableCoupons()
      .then((list) => alive && setAvailableCoupons(list))
      .catch(() => alive && setAvailableCoupons([]));
    return () => {
      alive = false;
    };
  }, []);

  const applyCoupon = async (typed?: string) => {
    const code = (typed ?? couponInput).trim().toUpperCase();
    if (!code) return;
    setCheckingCoupon(true);
    setCouponError(null);
    try {
      const result = await api.validateCoupon(code, course.remoteId);
      setCoupon({
        code: result.coupon.code,
        discountInr: result.discountInr,
        percent: result.coupon.type === 'percent' ? result.coupon.value : null,
      });
      setCouponInput('');
    } catch (err) {
      setCoupon(null);
      setCouponError(
        err instanceof ApiError && !err.isOffline
          ? err.message
          : 'Could not check this code. Check your connection and try again.',
      );
    } finally {
      setCheckingCoupon(false);
    }
  };

  const pay = async () => {
    setProcessing(true);
    setOutcome(null);
    // Razorpay collects the payment; the server verifies it and grants the course.
    const result = await razorpayPaymentService.pay({
      courseId: course.remoteId,
      couponCode: coupon?.code,
      mode: settings?.checkoutMode ?? 'web',
      openPaymentPage,
    });
    setProcessing(false);

    if (result.status === 'paid') {
      addEnrollment({
        courseId: course.id,
        purchasedAt: new Date().toISOString(),
        priceInr: payable,
        source: 'server',
        couponCode: coupon?.code,
      });
      feedback.success();
      router.replace({ pathname: '/purchase-success', params: { courseId: course.id, orderId: result.orderId } });
      return;
    }

    feedback.error();
    if (result.status === 'failed') setOutcome({ kind: 'failed', message: result.reason });
    else setOutcome({ kind: 'cancelled' });
  };

  return (
    <View style={styles.root}>
      <Screen
        header={<AppBar title={t("Checkout")} onBack={back} />}
        contentStyle={{ paddingBottom: insets.bottom + 150, gap: layout.sectionGap }}>
        {/* What is being bought and what it costs are one decision, so they are one card: the course
            on top, the order lines under a hairline, the total last. */}
        <View style={styles.card}>
          <View style={styles.courseRow}>
            <CourseImage source={course.cover} style={styles.thumb} transition={150} />
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
            <PriceSummary course={course} couponValueInr={coupon?.discountInr ?? 0} couponCode={coupon?.code} />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title={t("Coupon")} subtitle={t("Enter a valid code to apply your discount")} />
          {coupon ? (
            <View style={styles.couponRow}>
              <Tag size={16} color={colors.success} strokeWidth={2} />
              <Text style={[type.labelStrong, { color: colors.success, flex: 1 }]}>
                {coupon.percent !== null
                  ? t('{code} applied · {n}% OFF', { code: coupon.code, n: coupon.percent })
                  : `${coupon.code} applied · ${formatInr(coupon.discountInr)} OFF`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove coupon ${coupon.code}`}
                onPress={() => setCoupon(null)}
                hitSlop={8}>
                <Text style={[type.labelStrong, { color: colors.textMuted }]}>{t("Remove")}</Text>
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
                placeholder={t("Enter a coupon code")}
                accessibilityLabel={t("Coupon code")}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!processing && !checkingCoupon}
                error={couponError}
                returnKeyType="done"
                onSubmitEditing={() => void applyCoupon()}
                rightSlot={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("Apply coupon")}
                    onPress={() => void applyCoupon()}
                    hitSlop={8}
                    disabled={processing || checkingCoupon || couponInput.trim().length === 0}>
                    <Text
                      style={[
                        type.labelStrong,
                        {
                          color:
                            processing || checkingCoupon || couponInput.trim().length === 0
                              ? colors.textSubtle
                              : colors.accentText,
                        },
                      ]}>{checkingCoupon ? t('Checking…') : t("Apply")}</Text>
                  </Pressable>
                }
              />
              {availableCoupons.length > 0 ? (
                <View style={styles.offerList}>
                  <Text style={[type.label, { color: colors.textMuted }]}>{t('Available coupons')}</Text>
                  {availableCoupons.map((offer) => {
                    const offerLabel =
                      offer.type === 'percent'
                        ? t('{n}% OFF', { n: offer.value })
                        : `${formatInr(offer.value)} OFF`;
                    return (
                      <Pressable
                        key={offer.code}
                        accessibilityRole="button"
                        accessibilityLabel={`Apply coupon ${offer.code}, ${offerLabel}`}
                        disabled={processing || checkingCoupon}
                        onPress={() => {
                          setCouponInput(offer.code);
                          void applyCoupon(offer.code);
                        }}
                        style={({ pressed }) => [styles.offerCard, pressed && { opacity: 0.7 }]}>
                        <Tag size={16} color={colors.accentText} strokeWidth={2} />
                        <View style={{ flex: 1 }}>
                          <Text style={[type.labelStrong, { color: colors.text }]}>
                            {offer.code} · {offerLabel}
                          </Text>
                          {offer.description ? (
                            <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={1}>
                              {offer.description}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={[type.labelStrong, { color: colors.accentText }]}>{t('Apply')}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title={t("What you get")} />
          <View style={styles.terms}>
            {purchaseTerms.map((term) => (
              <View key={term} style={styles.termRow}>
                <AnimatedIcon icon={CircleCheck} size={16} color={colors.gold} motion="pulse" />
                <Text style={[type.body, { color: colors.text, flex: 1 }]}>{t(term)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title={t("Secure payment")} subtitle={t("Razorpay Checkout opens when you pay")} />
          <View style={styles.security}>
            <ShieldCheck size={16} color={colors.sage} strokeWidth={1.9} />
            <Text style={[type.label, { color: colors.textMuted, flex: 1 }]}>
              {t("Card, UPI and bank details are entered in Razorpay's secure checkout. They are never shared with this app or the academy server.")}
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
                : 'You closed the payment before it finished. Nothing was charged and the course stays locked.'}
            </Text>
            <Button
              label={t("Try the payment again")}
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
              <Text style={[type.bodyStrong, { color: colors.text }]}>{t("Already purchased")}</Text>
            </View>
            <Text style={[type.body, { color: colors.textMuted }]}>
              {t('This course is already unlocked on your account. Buying again would only create a duplicate enrolment, so there is nothing to pay.')}
            </Text>
          </View>
        ) : null}

        <Text style={[type.label, styles.disclaimer, { color: colors.textSubtle }]}>
          {t('Payments are processed by Razorpay. Your course is recorded on your account once the payment is confirmed.')}
        </Text>
      </Screen>

      <Modal
        visible={checkoutHtml !== null && WebView !== null}
        animationType="slide"
        onRequestClose={() => finishCheckout({ type: 'dismissed' })}>
        {checkoutHtml !== null && WebView ? (
          <View style={[styles.paymentPage, { paddingTop: insets.top }]}>
            <View style={styles.paymentHead}>
              <Text style={[type.bodyStrong, styles.flex]}>{t('Checkout')}</Text>
              <Pressable
                onPress={() => finishCheckout({ type: 'dismissed' })}
                hitSlop={12}
                accessibilityLabel={t('Close')}>
                <X size={22} color={colors.text} />
              </Pressable>
            </View>
            <WebView
              source={{ html: checkoutHtml, baseUrl: 'https://checkout.razorpay.com' }}
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              onMessage={(event) => {
                try {
                  finishCheckout(JSON.parse(event.nativeEvent.data) as CheckoutOutcome);
                } catch {
                  // Not a checkout message: ignore it.
                }
              }}
              // Razorpay opens UPI apps through their own schemes (upi://, intent://, phonepe://).
              // The WebView cannot load those, so they are handed to the phone instead.
              onShouldStartLoadWithRequest={(request) => {
                if (/^(https?:|about:|data:|blob:)/i.test(request.url)) return true;
                Linking.openURL(request.url).catch(() => {});
                return false;
              }}
              style={styles.flex}
            />
          </View>
        ) : null}
      </Modal>

      <StickyBar bottomInset={insets.bottom}>
        {enrolled ? (
          <>
            <View style={styles.flex}>
              <Text style={[type.label, { color: colors.textMuted }]}>{t("You own this course")}</Text>
              <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={1}>
                {firstLesson.title}
              </Text>
            </View>
            <Button
              label={t("Start learning")}
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
                {coupon ? t('Coupon applied · total') : t('Total payable · one-time')}
              </Text>
            </View>
            <Button
              label={processing ? t('Processing…') : t('Pay {amount}', { amount: formatInr(payable) })}
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

const WebView =
  Platform.OS === 'web' ? null : (require('react-native-webview') as typeof import('react-native-webview')).WebView;

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
  offerList: { gap: spacing.sm, marginTop: spacing.xs },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
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
  paymentPage: { flex: 1, backgroundColor: colors.background },
  paymentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screen,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
}));
