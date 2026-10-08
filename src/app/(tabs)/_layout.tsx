import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { THEME } from "@/lib/theme";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.light.primary,
        tabBarInactiveTintColor: "#4B5C54",
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: { fontFamily: "Nunito_700Bold", fontSize: 12 },
        tabBarItemStyle: { paddingTop: 6, paddingBottom: 4 },
        tabBarStyle: {
          backgroundColor: THEME.light.background,
          borderTopColor: THEME.light.border,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: "Home",
        tabBarIcon: ({ color, size, focused }) => (
          <SymbolView name={{ ios: focused ? "house.fill" : "house", android: "home", web: "home" }} size={size} tintColor={color} />
        ),
      }} />
      <Tabs.Screen name="history" options={{
        title: "Previous sessions",
        tabBarIcon: ({ color, size, focused }) => (
          <SymbolView name={{ ios: focused ? "clock.fill" : "clock", android: "history", web: "history" }} size={size} tintColor={color} />
        ),
      }} />
      <Tabs.Screen name="settings" options={{
        title: "Settings",
        tabBarIcon: ({ color, size, focused }) => (
          <SymbolView name={{ ios: focused ? "gearshape.fill" : "gearshape", android: "settings", web: "settings" }} size={size} tintColor={color} />
        ),
      }} />
    </Tabs>
  );
}
