import type { LucideIcon } from 'lucide-react-native';
import { BookOpen, Compass, House, UserRound } from 'lucide-react-native';
import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { View, type ColorValue } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors, font } from '@/constants/theme';
import { useStore } from '@/store';

/** Active state: colour, slightly heavier stroke and a small indicator — no bouncing. */
function TabIcon({ icon: Icon, color, focused }: { icon: LucideIcon; color: ColorValue; focused: boolean }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(focused ? 1 : 0.94);

  useEffect(() => {
    scale.value = reduced ? 1 : withSpring(focused ? 1 : 0.94, { damping: 20, stiffness: 320, mass: 0.6 });
  }, [focused, reduced, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ alignItems: 'center', gap: 3 }, style]}>
      <Icon size={23} color={color as string} strokeWidth={focused ? 2.1 : 1.75} />
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: focused ? (color as string) : 'transparent',
        }}
      />
    </Animated.View>
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
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11.5 },
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={House} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={Compass} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="learning"
        options={{
          title: 'My learning',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={BookOpen} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={UserRound} color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
