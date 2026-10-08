import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Muted } from "@/components/coach-ui";
import { audioLevel } from "@/domain/audio-level";
import { THEME } from "@/lib/theme";

// A shaped volume display, not frequency bins or samples from earlier moments.
const PEAKS = [0.15, 0.27, 0.39, 0.24, 0.55, 0.82, 0.46, 0.64, 0.95, 0.6, 0.78, 1, 0.88, 1, 0.78, 0.6, 0.95, 0.64, 0.46, 0.82, 0.55, 0.24, 0.39, 0.27, 0.15];
const HEIGHT = 56;

function WaveBar({ level, peak }: { level: SharedValue<number>; peak: number }) {
  const animatedStyle = useAnimatedStyle(() => {
    const current = level.get();
    const scale = (4 + current * peak * (HEIGHT - 4)) / HEIGHT;
    return { transform: [{ scaleY: current === 0 ? 4 / HEIGHT : withTiming(scale, {
      duration: 100,
      easing: Easing.out(Easing.quad),
      reduceMotion: ReduceMotion.System,
    }) }] };
  });
  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

export function RecordingVisualizer({ metering }: {
  metering?: number;
}) {
  const reducedMotion = useReducedMotion();
  const level = audioLevel(metering);
  const currentLevel = useSharedValue(0);
  useEffect(() => {
    currentLevel.set(level ?? 0);
  }, [level, currentLevel]);
  const available = level !== undefined;
  return (
    <View style={styles.container}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={available ? "Live microphone level" : "Microphone level unavailable"}
        accessibilityValue={available ? { min: 0, max: 100, now: Math.round(level * 100) } : { text: "Unavailable" }}
        accessibilityHint="Shows sound volume, not a speaking score."
        style={styles.frame}
      >
        <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {reducedMotion || !available ? (
            Array.from({ length: 12 }, (_, i) => (
              <View key={i} style={[styles.segment, {
                backgroundColor: available && level > i / 12 ? THEME.light.primary : THEME.light.border,
              }]} />
            ))
          ) : PEAKS.map((peak, i) => <WaveBar key={i} level={currentLevel} peak={peak} />)}
        </View>
      </View>
      <Muted>{available ? "Live microphone level" : "Recording · audio level unavailable"}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", maxWidth: 320, alignItems: "center", gap: 6 },
  frame: { width: "100%", height: 64, justifyContent: "center" },
  bars: { flexDirection: "row", alignItems: "center", gap: 5, height: HEIGHT },
  bar: { flex: 1, height: HEIGHT, borderRadius: 3, backgroundColor: THEME.light.primary },
  segment: { flex: 1, height: 8, borderRadius: 3 },
});
