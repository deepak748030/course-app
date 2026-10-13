import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';
import { type StyleProp, type ImageStyle } from 'react-native';

import { COVER_PLACEHOLDER, COVER_PLACEHOLDER_BG } from '@/constants/covers';

type Source = ImageProps['source'];

/**
 * Course artwork with one consistent fallback. When there is no image (or it fails to load)
 * the shared placeholder is shown whole, centred on its own background, instead of being
 * cropped by `cover`.
 */
export function CourseImage({
  source,
  style,
  transition,
}: {
  source: Source;
  style?: StyleProp<ImageStyle>;
  transition?: number;
}) {
  const [failed, setFailed] = useState(false);
  const usePlaceholder = failed || source === COVER_PLACEHOLDER || source == null;

  return (
    <Image
      source={usePlaceholder ? COVER_PLACEHOLDER : source}
      onError={() => setFailed(true)}
      style={[style, usePlaceholder && { backgroundColor: COVER_PLACEHOLDER_BG }]}
      contentFit={usePlaceholder ? 'contain' : 'cover'}
      transition={transition}
    />
  );
}
