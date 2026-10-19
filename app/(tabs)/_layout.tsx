import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useSessionStore } from '@/store/session';
import { useTheme } from '@/theme';

export const unstable_settings = {
  initialRouteName: 'authenticator',
};

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function TabBarIcon({
  focused,
  color,
  size,
  name,
  outline,
}: {
  focused: boolean;
  color: ColorValue;
  size: number;
  name: IoniconName;
  outline: IoniconName;
}) {
  return <Ionicons name={focused ? name : outline} size={size} color={color} />;
}

export default function TabsLayout() {
  const theme = useTheme();
  const unlocked = useSessionStore((s) => s.unlocked);

  if (!unlocked) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.ink,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: theme.border.width,
          borderTopColor: theme.colors.ink,
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontFamily: theme.fonts.uiBold, fontSize: 11 },
        sceneStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Tabs.Screen
        name="authenticator"
        options={{
          title: 'Authenticator',
          tabBarIcon: (props) => (
            <TabBarIcon
              {...props}
              name="shield-checkmark"
              outline="shield-checkmark-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="password"
        options={{
          title: 'Password',
          tabBarIcon: (props) => (
            <TabBarIcon {...props} name="key" outline="key-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Dokumen',
          tabBarIcon: (props) => (
            <TabBarIcon
              {...props}
              name="document-text"
              outline="document-text-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Pengaturan',
          tabBarIcon: (props) => (
            <TabBarIcon {...props} name="settings" outline="settings-outline" />
          ),
        }}
      />
    </Tabs>
  );
}
