import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Muted } from "@/components/coach-ui";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Text } from "@/components/ui/text";
import { usePractice } from "@/state/practice";
import { clockTime } from "@/domain/practice";
import { THEME } from "@/lib/theme";

type AudioPlaybackProps = { uri: string; durationSeconds?: number };

export function AudioPlayback({ uri, durationSeconds }: AudioPlaybackProps) {
  // Reset transient playback state when the recording changes.
  return <RecordingPlayer key={uri} uri={uri} durationSeconds={durationSeconds} />;
}

function RecordingPlayer({ uri, durationSeconds = 0 }: AudioPlaybackProps) {
  const { recording } = usePractice();
  const player = useAudioPlayer(uri || null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const duration = Number.isFinite(status.duration) && status.duration > 0
    ? status.duration
    : Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0;
  const currentTime = Number.isFinite(status.currentTime)
    ? Math.max(0, status.currentTime)
    : 0;
  const position = Math.min(scrubTime ?? currentTime, duration);
  const disabled = !uri || recording || !status.isLoaded || busy;
  const canSeek = !disabled && duration > 0 && !status.isBuffering;

  const toggle = async () => {
    if (disabled) return;
    setBusy(true);
    try {
      setError("");
      if (status.playing) {
        player.pause();
        return;
      }
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      if (status.didJustFinish || (duration > 0 && currentTime >= duration))
        await player.seekTo(0);
      player.play();
    } catch {
      setError("This recording could not be played. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const seek = async (seconds: number) => {
    if (!canSeek) {
      setScrubTime(null);
      return;
    }
    setBusy(true);
    try {
      setError("");
      await player.seekTo(Math.max(0, Math.min(duration, seconds)));
    } catch {
      setError("Could not skip to that point. Please try again.");
    } finally {
      setScrubTime(null);
      setBusy(false);
    }
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-3">
        <Button
          className="h-12 w-12 rounded-full p-0 sm:h-12"
          disabled={disabled}
          accessibilityLabel={status.playing ? "Pause recording" : "Play recording"}
          accessibilityState={{ disabled, busy: busy || status.isBuffering }}
          onPress={() => void toggle()}
        >
          {uri && (!status.isLoaded || status.isBuffering || busy) ? (
            <ActivityIndicator color={THEME.light.primaryForeground} size="small" />
          ) : (
            <SymbolView
              name={{
                ios: status.playing ? "pause.fill" : "play.fill",
                android: status.playing ? "pause" : "play_arrow",
                web: status.playing ? "pause" : "play_arrow",
              }}
              size={24}
              tintColor={THEME.light.primaryForeground}
            />
          )}
        </Button>
        <View className="min-w-0 flex-1">
          <Slider
            value={position}
            maximumValue={duration || 1}
            disabled={!canSeek}
            accessibilityLabel="Recording playback position"
            accessibilityValue={{
              min: 0,
              max: duration,
              now: position,
              text: `${clockTime(position)} of ${clockTime(duration)}`,
            }}
            onSlidingStart={setScrubTime}
            onValueChange={setScrubTime}
            onSlidingComplete={(seconds) => void seek(seconds)}
          />
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground" style={{ fontVariant: ["tabular-nums"] }}>
              {clockTime(position)}
            </Text>
            <Text className="text-xs text-muted-foreground" style={{ fontVariant: ["tabular-nums"] }}>
              {clockTime(duration)}
            </Text>
          </View>
        </View>
      </View>
      <View className="flex-row justify-center gap-4">
        <Button
          variant="ghost"
          className="h-11 rounded-xl px-3 sm:h-11"
          disabled={!canSeek || scrubTime !== null}
          accessibilityLabel="Rewind 10 seconds"
          onPress={() => void seek(currentTime - 10)}
        >
          <SymbolView
            name={{ ios: "gobackward.10", android: "replay_10", web: "replay_10" }}
            size={20}
            tintColor={THEME.light.primary}
          />
          <Text className="text-xs text-primary">10s</Text>
        </Button>
        <Button
          variant="ghost"
          className="h-11 rounded-xl px-3 sm:h-11"
          disabled={!canSeek || scrubTime !== null}
          accessibilityLabel="Forward 10 seconds"
          onPress={() => void seek(currentTime + 10)}
        >
          <SymbolView
            name={{ ios: "goforward.10", android: "forward_10", web: "forward_10" }}
            size={20}
            tintColor={THEME.light.primary}
          />
          <Text className="text-xs text-primary">10s</Text>
        </Button>
      </View>
      {!!error && <Text accessibilityRole="alert" className="text-destructive">{error}</Text>}
      {!uri && <Muted>The saved audio is unavailable on this device.</Muted>}
    </View>
  );
}
