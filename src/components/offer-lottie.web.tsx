/**
 * Lottie player, web implementation.
 *
 * `lottie-web` draws the composition with its SVG renderer: pure JavaScript, no WebAssembly, no
 * network. The WASM player was rejected on purpose — it fetches its runtime from a public CDN when
 * it starts, which would make a badge depend on the internet.
 *
 * Two guards, because a decorative badge must never be able to break a screen:
 *   - the import is dynamic and only runs from an effect, so nothing loads during the static
 *     render (or in any environment without a DOM);
 *   - `lottie-web` touches a 2D canvas while it initialises, so the badge checks for a canvas first
 *     and falls back to the still mark where there is none (canvas-less webviews, headless tests).
 */

import { useEffect, useRef } from 'react';
import { View } from 'react-native';

type Destroyable = { destroy: () => void };

export function OfferLottie({
  size,
  data,
  onFail,
}: {
  size: number;
  data: unknown;
  onFail?: () => void;
}) {
  const container = useRef<View>(null);

  useEffect(() => {
    let cancelled = false;
    let animation: Destroyable | null = null;

    const node = container.current as unknown as HTMLElement | null;
    if (!node) {
      onFail?.();
      return undefined;
    }

    // Feature check before the library is even fetched.
    let hasCanvas = false;
    try {
      hasCanvas = typeof document !== 'undefined' && Boolean(document.createElement('canvas').getContext('2d'));
    } catch {
      hasCanvas = false;
    }
    if (!hasCanvas) {
      onFail?.();
      return undefined;
    }

    import('lottie-web')
      .then((module) => {
        if (cancelled) return;
        const lottie = module.default;
        if (!lottie || typeof lottie.loadAnimation !== 'function') {
          onFail?.();
          return;
        }
        try {
          animation = lottie.loadAnimation({
            container: node,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData: data as object,
          });
        } catch {
          onFail?.();
        }
      })
      .catch(() => onFail?.());

    return () => {
      cancelled = true;
      animation?.destroy();
    };
  }, [data, onFail]);

  return <View ref={container} style={{ width: size, height: size }} />;
}
