import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState, Pressable } from "react-native";
import Animated, {
  cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue,
  withSequence, withTiming, type SharedValue,
} from "react-native-reanimated";
import { MASCOT_EASING, MASCOT_MOTIONS, type MascotMotion, type MascotPose } from "@/domain/mascot";

export function KoalaMascot({ size, motion = "idle" }: { size: number; motion?: MascotMotion }) {
  const reducedMotion = useReducedMotion();
  const head = useSharedValue(0);
  const headY = useSharedValue(0);
  const left = useSharedValue(0);
  const right = useSharedValue(0);
  const bodyY = useSharedValue(0);
  const eyes = useSharedValue(1);
  const focused = useRef(false);
  const stop = useCallback(() => {
    for (const joint of [head, headY, left, right, bodyY, eyes]) cancelAnimation(joint);
    head.set(0); headY.set(0); left.set(0); right.set(0); bodyY.set(0); eyes.set(1);
  }, [head, headY, left, right, bodyY, eyes]);
  const play = useCallback(() => {
    stop();
    const animation = MASCOT_MOTIONS[motion];
    if (reducedMotion) {
      const pose = animation.frames[1];
      head.set(pose.head); headY.set(pose.headY); left.set(pose.left);
      right.set(pose.right); bodyY.set(pose.bodyY); eyes.set(pose.eyes);
      return;
    }
    const animate = (joint: SharedValue<number>, key: keyof Omit<MascotPose, "t">) => {
      const steps = animation.frames.slice(1).map((frame, i) => withTiming(frame[key], {
        duration: (frame.t - animation.frames[i].t) * animation.duration,
        easing: Easing.bezier(...MASCOT_EASING),
        reduceMotion: ReduceMotion.System,
      }));
      joint.set(withSequence(ReduceMotion.System, ...steps));
    };
    animate(head, "head"); animate(headY, "headY"); animate(left, "left");
    animate(right, "right"); animate(bodyY, "bodyY"); animate(eyes, "eyes");
  }, [motion, reducedMotion, stop, head, headY, left, right, bodyY, eyes]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    play();
    return () => { focused.current = false; stop(); };
  }, [play, stop]));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") stop();
      else if (focused.current) play();
    });
    return () => subscription.remove();
  }, [play, stop]);
  const scale = size / 512;
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bodyY.get() * scale }] }));
  const headStyle = useAnimatedStyle(() => ({ transform: [{ translateY: headY.get() * scale }, { rotate: `${head.get()}deg` }] }));
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${left.get()}deg` }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${right.get()}deg` }] }));
  const eyeStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: eyes.get() }] }));
  const full = { width: size, height: size };
  const arm = { position: "absolute" as const, top: 187 * scale, width: 200 * scale, height: 200 * scale };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Quippy the koala. ${MASCOT_MOTIONS[motion].label}`}
      accessibilityHint="Tap to replay this gentle animation"
      onPress={play}
      style={{ ...full, alignSelf: "center" }}
    >
      <Image source={require("@/assets/mascot/koala-shadow.svg")} style={full} accessible={false} pointerEvents="none" />
      <Animated.View pointerEvents="none" style={[{ position: "absolute", ...full }, bodyStyle]}>
        <Image source={require("@/assets/mascot/koala-body.svg")} style={full} accessible={false} />
        <Animated.View style={[{ ...arm, left: 96 * scale }, leftStyle]}>
          <Image source={require("@/assets/mascot/koala-left-arm.svg")} style={{ width: "100%", height: "100%" }} accessible={false} />
        </Animated.View>
        <Animated.View style={[{ ...arm, left: 216 * scale }, rightStyle]}>
          <Image source={require("@/assets/mascot/koala-arm.svg")} style={{ width: "100%", height: "100%" }} accessible={false} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: 56 * scale, top: 64 * scale, width: 400 * scale, height: 400 * scale }, headStyle]}>
          <Image source={require("@/assets/mascot/koala-head.svg")} style={{ width: "100%", height: "100%" }} accessible={false} />
          {[136, 232].map((x) => (
            <Animated.View key={x} style={[{ position: "absolute", left: x * scale, top: 104 * scale, width: 32 * scale, height: 32 * scale }, eyeStyle]}>
              <Image source={require("@/assets/mascot/koala-eye.svg")} style={{ width: "100%", height: "100%" }} accessible={false} />
            </Animated.View>
          ))}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
