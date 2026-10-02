import { Image } from "expo-image";
import { useCallback, useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export function KoalaMascot({ size, wave }: { size: number; wave: boolean }) {
  const rotation = useSharedValue(wave ? -110 : 0);
  const greet = useCallback(() => {
    if (!wave) return;
    cancelAnimation(rotation);
    const timing = {
      duration: 210,
      easing: Easing.inOut(Easing.quad),
      reduceMotion: ReduceMotion.System,
    };
    rotation.set(
      withSequence(
        ReduceMotion.System,
        withTiming(-126, timing),
        withTiming(-94, timing),
        withTiming(-126, timing),
        withTiming(-94, timing),
        withTiming(-110, timing),
      ),
    );
  }, [rotation, wave]);
  useEffect(() => {
    greet();
    return () => cancelAnimation(rotation);
  }, [greet, rotation]);
  const armStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }],
  }));
  const scale = size / 512;
  return (
    <Pressable
      disabled={!wave}
      accessibilityRole={wave ? "button" : "image"}
      accessibilityLabel={wave ? "Koala. Wave hello" : "Speaking Coach koala"}
      accessibilityHint={wave ? "Tap to wave again" : undefined}
      onPress={greet}
      style={{ width: size, height: size, alignSelf: "center" }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            zIndex: 1,
            // The arm artwork is centered on its shoulder joint at (316, 287).
            left: 216 * scale,
            top: 187 * scale,
            width: 200 * scale,
            height: 200 * scale,
          },
          armStyle,
        ]}
      >
        <Image
          source={require("@/assets/mascot/koala-arm.svg")}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
          accessible={false}
        />
      </Animated.View>
      <Image
        source={require("@/assets/mascot/koala.svg")}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessible={false}
        pointerEvents="none"
      />
    </Pressable>
  );
}
