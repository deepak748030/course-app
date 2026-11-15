import { Image, type ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';
import { type StyleProp, type ImageStyle } from 'react-native';

import { COVER_PLACEHOLDER, COVER_PLACEHOLDER_BG } from '@/constants/covers';
import { resolveMediaUrl } from '@/services/catalogService';

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

  const rawUri =
    source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source && typeof source.uri === 'string'
      ? source.uri
      : null;
  const resolvedUri = rawUri ? resolveMediaUrl(rawUri) : null;
  const effectiveSource: Source = rawUri ? (resolvedUri ? { uri: resolvedUri } : COVER_PLACEHOLDER) : source;

  // Reset error state whenever the image source URI changes (e.g. server URL switch or banner update).
  useEffect(() => {
    setFailed(false);
  }, [resolvedUri, source]);

  const usePlaceholder = failed || effectiveSource === COVER_PLACEHOLDER || effectiveSource == null;

  return (
    <Image
      source={usePlaceholder ? COVER_PLACEHOLDER : effectiveSource}
      onError={() => setFailed(true)}
      cachePolicy="memory-disk"
      style={[style, usePlaceholder && { backgroundColor: COVER_PLACEHOLDER_BG }]}
      contentFit={usePlaceholder ? 'contain' : 'cover'}
      transition={transition}
    />
  );
}
