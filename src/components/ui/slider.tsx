import NativeSlider from "@react-native-community/slider";
import { THEME } from "@/lib/theme";

export type SliderProps = {
  value: number;
  maximumValue: number;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityValue?: { min: number; max: number; now: number; text: string };
  onValueChange: (value: number) => void;
  onSlidingStart: (value: number) => void;
  onSlidingComplete: (value: number) => void;
};

export function Slider(props: SliderProps) {
  return (
    <NativeSlider
      {...props}
      minimumValue={0}
      minimumTrackTintColor={THEME.light.primary}
      maximumTrackTintColor={THEME.light.border}
      thumbTintColor={THEME.light.primary}
      style={{ width: "100%", height: 44 }}
    />
  );
}
