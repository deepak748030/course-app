import { Tabs, Redirect } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { BookOpen, Compass, House, UserRound } from 'lucide-react-native';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';

import { colors, font, layout, spacing } from '@/constants/theme';
import { useStore } from '@/store';

/**
 * Tab bar: 4 tabs, 56px, hairline top border, opaque surface (no blur needed since the
 * surface is opaque), filled-feeling active state via colour + semibold label.
 * No status dots here — the only badge in the app is the unread notification count.
 */
function TabItem({ icon: Icon, color, focused, label }: { icon: LucideIcon; color: ColorValue; focused: boolean; label: string }) {
  return (
    <View style={styles.tabItem}>
      <Icon size={22} color={color as string} strokeWidth={focused ? 2 : 1.6} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive, { color: color as string }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { session, ready } = useStore();

  // Deep links must not land inside the app without a session.
  if (ready && !session) return <Redirect href="/auth/phone" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: layout.tabBarHeight + spacing.sm,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          paddingTop: spacing.xs,
        },
        tabBarLabel: () => null,
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabItem icon={House} color={color} focused={focused} label="Home" />,
          tabBarAccessibilityLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => <TabItem icon={Compass} color={color} focused={focused} label="Explore" />,
          tabBarAccessibilityLabel: 'Explore',
        }}
      />
      <Tabs.Screen
        name="learning"
        options={{
          title: 'My learning',
          tabBarIcon: ({ color, focused }) => <TabItem icon={BookOpen} color={color} focused={focused} label="Learning" />,
          tabBarAccessibilityLabel: 'My learning',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <TabItem icon={UserRound} color={color} focused={focused} label="Profile" />,
          tabBarAccessibilityLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', gap: 2, width: 72 },
  tabLabel: { fontFamily: font.regular, fontSize: 10, lineHeight: 13 },
  tabLabelActive: { fontFamily: font.semibold },
});
