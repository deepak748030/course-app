import { Tabs, Redirect } from 'expo-router';

import { TabBar } from '@/components/tab-bar';
import { useT } from '@/i18n';
import { useStore } from '@/store';

/**
 * Four tabs. The bar itself is a custom component (src/components/tab-bar.tsx) so the active
 * state can be a filled icon on a sliding pill instead of a tint swap.
 */
export default function TabsLayout() {
  const { session, ready } = useStore();
  const t = useT();

  // Deep links must not land inside the app without a session.
  if (ready && !session) return <Redirect href="/auth/phone" />;

  return (
    <Tabs
      tabBar={(props) => (
        <TabBar state={props.state} descriptors={props.descriptors} navigation={props.navigation} />
      )}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}>
      <Tabs.Screen name="home" options={{ title: t('Home'), tabBarAccessibilityLabel: t('Home') }} />
      <Tabs.Screen name="explore" options={{ title: t('Explore'), tabBarAccessibilityLabel: t('Explore') }} />
      <Tabs.Screen
        name="learning"
        options={{ title: t('Learning'), tabBarAccessibilityLabel: t('My learning') }}
      />
      <Tabs.Screen name="profile" options={{ title: t('Profile'), tabBarAccessibilityLabel: t('Profile') }} />
    </Tabs>
  );
}
