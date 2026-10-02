import { useRef } from "react";
import type { SliderProps } from "./slider";

// Use the browser's range control for keyboard and screen-reader support.
export function Slider({
  value,
  maximumValue,
  disabled,
  accessibilityLabel,
  accessibilityValue,
  onValueChange,
  onSlidingStart,
  onSlidingComplete,
}: SliderProps) {
  const dragging = useRef(false);
  const complete = (input: HTMLInputElement) => {
    if (!dragging.current) return;
    dragging.current = false;
    onSlidingComplete(input.valueAsNumber);
  };
  const progress = maximumValue > 0 ? (value / maximumValue) * 100 : 0;

  return (
    <input
      type="range"
      className="playback-slider"
      aria-label={accessibilityLabel}
      aria-valuetext={accessibilityValue?.text}
      min={0}
      max={maximumValue}
      step="any"
      value={value}
      disabled={disabled}
      style={{
        backgroundImage: `linear-gradient(to right, hsl(var(--primary)) ${progress}%, hsl(var(--border)) ${progress}%)`,
      }}
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        onSlidingStart(event.currentTarget.valueAsNumber);
      }}
      onChange={(event) => {
        const next = event.currentTarget.valueAsNumber;
        onValueChange(next);
        if (!dragging.current) onSlidingComplete(next);
      }}
      onPointerUp={(event) => complete(event.currentTarget)}
      onPointerCancel={(event) => complete(event.currentTarget)}
      onBlur={(event) => complete(event.currentTarget)}
    />
  );
}
