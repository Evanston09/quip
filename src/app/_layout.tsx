import "@/global.css";
import { Nunito_400Regular } from "@expo-google-fonts/nunito/400Regular";
import { Nunito_500Medium } from "@expo-google-fonts/nunito/500Medium";
import { Nunito_600SemiBold } from "@expo-google-fonts/nunito/600SemiBold";
import { Nunito_700Bold } from "@expo-google-fonts/nunito/700Bold";
import { Nunito_800ExtraBold } from "@expo-google-fonts/nunito/800ExtraBold";
import { FontDisplay, useFonts } from "expo-font";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { colorScheme } from "nativewind";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PracticeProvider, usePractice } from "@/state/practice";
import { THEME } from "@/lib/theme";
void SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular: { uri: Nunito_400Regular, display: FontDisplay.SWAP },
    Nunito_500Medium: { uri: Nunito_500Medium, display: FontDisplay.SWAP },
    Nunito_600SemiBold: { uri: Nunito_600SemiBold, display: FontDisplay.SWAP },
    Nunito_700Bold: { uri: Nunito_700Bold, display: FontDisplay.SWAP },
    Nunito_800ExtraBold: {
      uri: Nunito_800ExtraBold,
      display: FontDisplay.SWAP,
    },
  });
  useEffect(() => {
    colorScheme.set("light");
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
function RootNavigator() {
  return (
    <PracticeProvider>
      <StatusBar style="dark" />
      <PracticeNavigator />
      <PortalHost />
    </PracticeProvider>
  );
}

function PracticeNavigator() {
  const { loaded, state } = usePractice();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: THEME.light.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Protected guard={!loaded || !!state.onboardingCompleted}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="practice" />
        <Stack.Screen name="results/[id]" />
      </Stack.Protected>
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
