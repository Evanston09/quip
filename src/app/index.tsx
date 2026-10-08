import { STYLES } from "@/domain/preferences";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { View } from "react-native";
import {
  Action,
  KoalaMessage,
  Muted,
  Label,
  Panel,
  Screen,
  Title,
} from "@/components/coach-ui";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { MODES, type Mode } from "@/domain/practice";
import { usePractice } from "@/state/practice";
import { RecordingPrivacy } from "@/components/recording-privacy";

export default function Home() {
  const { state, recording, setPracticeGoal } = usePractice();
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("interview");
  const completed = state.attempts.filter(
    (a) => a.status === "ready" && a.analysis,
  );
  const recent = state.attempts[0];
  return (
    <Screen back={false}>
      <Title botanical>Choose a practice</Title>
      <KoalaMessage motion={recording ? "listen" : "wave"}>
        {recording
          ? "Still recording. I’m all ears."
          : mode === "impromptu"
            ? "What can you teach me today?"
            : mode === "rehearse"
              ? "Go on. I’m all ears."
              : "Want to run through a few questions?"}
      </KoalaMessage>
      {(state.session || recent) && (
        <Action
          variant="secondary"
          onPress={() =>
            router.push(
              recording || state.session
                ? "/practice"
                : {
                    pathname: "/results/[id]",
                    params: { id: recent!.id },
                  },
            )
          }
        >
          {recording
            ? "Return to recording"
            : state.session
              ? "Continue practice"
              : "View latest feedback"}
        </Action>
      )}
      {state.practiceGoal && (
        <Panel>
          <Label>Your saved practice goal</Label>
          <Text>{state.practiceGoal}</Text>
          <Muted>Available for your next prompt or speech, even after closing the app.</Muted>
          <Action disabled={recording} variant="ghost" onPress={async () => {
            try { await setPracticeGoal(undefined); setError(""); }
            catch (e) { setError(e instanceof Error ? e.message : "Could not clear your goal."); }
          }}>Clear saved goal</Action>
        </Panel>
      )}
      {!!error && <Text className="text-destructive">{error}</Text>}
      <View
        className="gap-3"
        accessibilityRole="radiogroup"
        accessibilityLabel="Practice mode"
      >
        {(Object.keys(MODES) as Mode[]).map((m) => {
          const selected = mode === m;
          return (
            <Button
              key={m}
              variant="outline"
              disabled={recording}
              role="radio"
              aria-checked={selected}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: recording }}
              accessibilityLabel={`${MODES[m].label}. ${MODES[m].description}`}
              onPress={() => setMode(m)}
              className={`h-auto min-h-24 justify-between gap-4 rounded-2xl border-2 p-5 shadow-none ${selected ? "border-primary bg-secondary" : "border-border bg-white"}`}
            >
              <View className="flex-1 gap-1">
                <Text className="text-lg font-bold">{MODES[m].label}</Text>
                <Text className="text-sm leading-5 text-muted-foreground">
                  {MODES[m].description}
                </Text>
              </View>
              <SymbolView
                name={{
                  ios: selected ? "checkmark.circle.fill" : "circle",
                  android: selected ? "check_circle" : "radio_button_unchecked",
                  web: selected ? "check_circle" : "radio_button_unchecked",
                }}
                size={24}
                tintColor={selected ? "#347553" : "#8A8F8C"}
              />
            </Button>
          );
        })}
      </View>
      <Action
        disabled={recording}
        onPress={() => router.push({ pathname: "/setup", params: { mode } })}
      >{`Practice ${MODES[mode].label.toLowerCase()}`}</Action>
      {completed.length > 0 && (
        <View className="flex-row items-center justify-between border-t border-border pt-4">
          <Muted>
            {completed.length}{" "}
            {completed.length === 1
              ? "practice completed"
              : "practices completed"}
          </Muted>
          <Action variant="ghost" onPress={() => router.push("/history")}>
            View progress
          </Action>
        </View>
      )}
      <View className="gap-1 border-t border-border pt-4">
        <Action variant="ghost" disabled={recording} onPress={() => router.push("./onboarding")}>
          Coaching preferences
        </Action>
        <Muted>{state.preferences ? `${STYLES[state.preferences.feedbackStyle].label} feedback · Change your focus, comfort, or feedback style.` : "Choose your focus, English comfort, and feedback style."}</Muted>
      </View>
      <RecordingPrivacy />
    </Screen>
  );
}
