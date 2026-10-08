import { useEffect } from "react";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { KoalaMascot } from "@/components/koala-mascot";
import { Text } from "@/components/ui/text";

/** Quippy stays mounted as the welcome illustration becomes a question guide. */
export function OnboardingGuide({ started }: { started: boolean }) {
  const progress = useSharedValue(0);
  const width = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(started ? 1 : 0, {
      duration: 520,
      easing: Easing.out(Easing.exp),
      reduceMotion: ReduceMotion.System,
    }));
  }, [started, progress]);
  const containerStyle = useAnimatedStyle(() => ({
    height: 208 - progress.get() * 120,
  }));
  const mascotStyle = useAnimatedStyle(() => ({
    top: -16 - progress.get() * 60,
    transform: [
      { translateX: progress.get() * (44 - width.get() / 2) },
      { scale: 0.9 - progress.get() * 0.56 },
    ],
  }));
  const messageStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  return (
    <Animated.View
      onLayout={(event) => width.set(event.nativeEvent.layout.width)}
      style={containerStyle}
    >
      <Animated.View
        style={[{ position: "absolute", left: "50%", marginLeft: -120, width: 240, height: 240 }, mascotStyle]}
      >
        <KoalaMascot size={240} motion={started ? "nod" : "wave"} />
      </Animated.View>
      {started && (
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: 96, right: 0, justifyContent: "center" }, messageStyle]}>
          <Text className="text-base font-semibold leading-6 text-secondary-foreground">
            Let’s make practice feel like you.
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}
