import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useState } from "react";
import { View } from "react-native";
import { Action, Muted } from "@/components/coach-ui";
import { Text } from "@/components/ui/text";
import { usePractice } from "@/state/practice";
import { clockTime } from "@/domain/practice";
export function AudioPlayback({ uri }: { uri: string }) {
  const { recording } = usePractice();
  const player = useAudioPlayer(uri || null);
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState("");
  const toggle = async () => {
    try {
      setError("");
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      if (status.playing) player.pause();
      else {
        if (status.didJustFinish || status.currentTime >= status.duration)
          await player.seekTo(0);
        player.play();
      }
    } catch {
      setError("This recording could not be played.");
    }
  };
  return (
    <View className="gap-3">
      <Action
        variant="secondary"
        disabled={!uri || recording}
        onPress={() => {
          void toggle();
        }}
      >
        {status.playing ? "Pause recording" : "Play recording"}
      </Action>
      <Muted>
        {clockTime(status.currentTime)} / {clockTime(status.duration)}
      </Muted>
      <View className="flex-row gap-3">
        <Action
          variant="ghost"
          disabled={!uri || recording}
          onPress={() => {
            void player.seekTo(Math.max(0, status.currentTime - 10));
          }}
        >
          Back 10s
        </Action>
        <Action
          variant="ghost"
          disabled={!uri || recording}
          onPress={() => {
            void player.seekTo(
              Math.min(status.duration, status.currentTime + 10),
            );
          }}
        >
          Forward 10s
        </Action>
      </View>
      {!!error && <Text className="text-destructive">{error}</Text>}
      {!uri && <Muted>The saved audio is unavailable on this device.</Muted>}
    </View>
  );
}
