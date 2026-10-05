import { Tabs, Redirect } from 'expo-router';

import { TabBar } from '@/components/tab-bar';
import { useStore } from '@/store';

/**
 * Four tabs. The bar itself is a custom component (src/components/tab-bar.tsx) so the active
 * state can be a filled icon on a sliding pill instead of a tint swap.
 */
export default function TabsLayout() {
  const { session, ready } = useStore();

  // Deep links must not land inside the app without a session.
  if (ready && !session) return <Redirect href="/auth/phone" />;

  return (
    <Tabs
      tabBar={(props) => (
        <TabBar state={props.state} descriptors={props.descriptors} navigation={props.navigation} />
      )}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarAccessibilityLabel: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarAccessibilityLabel: 'Explore' }} />
      <Tabs.Screen name="learning" options={{ title: 'Learning', tabBarAccessibilityLabel: 'My learning' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarAccessibilityLabel: 'Profile' }} />
    </Tabs>
  );
}
