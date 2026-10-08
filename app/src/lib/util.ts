/** Interaction feedback. Kept separate from @/lib/format so the pure helpers stay runtime-free. */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Restrained interaction feedback. Silently no-ops where a platform lacks haptics (web). */
export const feedback = {
  tap() {
    if (Platform.OS === 'web') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  select() {
    if (Platform.OS === 'web') return;
    void Haptics.selectionAsync().catch(() => {});
  },
  success() {
    if (Platform.OS === 'web') return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  error() {
    if (Platform.OS === 'web') return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
