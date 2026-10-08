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

const BAR_COUNT = 25;
const HEIGHT = 56;

function WaveBar({ history, index }: { history: SharedValue<number[]>; index: number }) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: withTiming((4 + history.get()[index] * (HEIGHT - 4)) / HEIGHT, {
      duration: 160,
      easing: Easing.out(Easing.quad),
      reduceMotion: ReduceMotion.System,
    }) }],
  }));
  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

export function RecordingVisualizer({ metering, sampleTime }: {
  metering?: number;
  sampleTime: number;
}) {
  const reducedMotion = useReducedMotion();
  const level = audioLevel(metering);
  const history = useSharedValue<number[]>(Array(BAR_COUNT).fill(0));
  useEffect(() => {
    if (level !== undefined && !reducedMotion)
      history.set((previous) => [...previous.slice(1), level]);
  }, [level, sampleTime, reducedMotion, history]);
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
          ) : Array.from({ length: BAR_COUNT }, (_, i) => <WaveBar key={i} history={history} index={i} />)}
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
