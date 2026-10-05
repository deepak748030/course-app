/**
 * Lottie player, native implementation.
 *
 * Native renderer (no WASM, no CDN): the composition is inlined by Metro and handed to
 * `lottie-react-native` as JSON, so the badge animates offline on Android and iOS.
 * The web counterpart is `offer-lottie.web.tsx`, picked up automatically by Metro.
 */

import LottieView, { type AnimationObject } from 'lottie-react-native';

export function OfferLottie({
  size,
  data,
  onFail,
}: {
  size: number;
  data: unknown;
  onFail?: () => void;
}) {
  return (
    <LottieView
      source={data as AnimationObject}
      autoPlay
      loop
      speed={0.9}
      onAnimationFailure={onFail}
      style={{ width: size, height: size }}
    />
  );
}
