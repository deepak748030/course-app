import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';

/** Placeholder rows shown while a list loads. Same spacing as the real list. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.list} accessibilityLabel="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={56} height={56} borderRadius={radius.md} />
          <View style={styles.lines}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="45%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Placeholder for the home catalog: a hero block followed by course cards. */
export function CatalogSkeleton() {
  return (
    <View style={styles.list} accessibilityLabel="Loading">
      <Skeleton height={140} borderRadius={radius.lg} />
      <Skeleton width="40%" height={16} />
      {[0, 1].map((i) => (
        <View key={i} style={styles.card}>
          <Skeleton height={150} borderRadius={radius.lg} />
          <Skeleton width="80%" height={14} />
          <Skeleton width="50%" height={12} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lines: { flex: 1, gap: spacing.xs },
  card: { gap: spacing.xs },
});
