import { Image, type ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { Skeleton } from '@/components/ui';
import { COVER_PLACEHOLDER, COVER_PLACEHOLDER_BG } from '@/constants/covers';
import { colors } from '@/constants/theme';
import { resolveMediaUrl } from '@/services/catalogService';

type Source = ImageProps['source'];

/**
 * Course & banner artwork with skeleton + spinner loading feedback and a consistent fallback.
 * While a remote image or banner is loading over the network, a pulsing skeleton surface and a
 * subtle spinner remain visible so the learner never stares at an empty frame.
 */
export function CourseImage({
  source,
  style,
  transition = 180,
}: {
  source: Source;
  style?: StyleProp<ImageStyle>;
  transition?: number;
}) {
  const [failed, setFailed] = useState(false);

  const rawUri =
    source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source && typeof source.uri === 'string'
      ? source.uri
      : typeof source === 'string'
        ? source
        : null;
  const resolvedUri = rawUri ? resolveMediaUrl(rawUri) : null;
  const effectiveSource: Source = rawUri ? (resolvedUri ? { uri: resolvedUri } : COVER_PLACEHOLDER) : source;
  const isRemote = Boolean(resolvedUri) && !failed && effectiveSource !== COVER_PLACEHOLDER;
  const [loading, setLoading] = useState<boolean>(isRemote);

  // Reset loading & error state whenever the image source URI changes.
  useEffect(() => {
    setFailed(false);
    setLoading(Boolean(resolvedUri));
  }, [resolvedUri, source]);

  // Safety fallback so a dropped network event never leaves a spinner up indefinitely.
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 12_000);
    return () => clearTimeout(timer);
  }, [loading, resolvedUri]);

  const usePlaceholder = failed || effectiveSource === COVER_PLACEHOLDER || effectiveSource == null;

  return (
    <View
      style={[
        styles.container,
        style as StyleProp<ViewStyle>,
        usePlaceholder && { backgroundColor: COVER_PLACEHOLDER_BG },
      ]}>
      <Image
        source={usePlaceholder ? COVER_PLACEHOLDER : effectiveSource}
        onLoadStart={() => {
          if (!usePlaceholder && resolvedUri) setLoading(true);
        }}
        onLoad={() => setLoading(false)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
        cachePolicy="memory-disk"
        style={StyleSheet.absoluteFill}
        contentFit={usePlaceholder ? 'contain' : 'cover'}
        transition={transition}
      />
      {!usePlaceholder && loading ? (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <Skeleton width="100%" height={9999} borderRadius={0} style={StyleSheet.absoluteFill} />
          <ActivityIndicator size="small" color={colors.accentText} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COVER_PLACEHOLDER_BG,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
