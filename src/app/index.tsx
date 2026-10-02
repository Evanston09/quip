import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { View } from "react-native";
import {
  Action,
  Expand,
  KoalaMessage,
  Muted,
  Screen,
  Title,
} from "@/components/coach-ui";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { MODES, type Mode } from "@/domain/practice";
import { usePractice } from "@/state/practice";

export default function Home() {
  const { state, recording } = usePractice();
  const [mode, setMode] = useState<Mode>("interview");
  const completed = state.attempts.filter(
    (a) => a.status === "ready" && a.analysis,
  );
  const recent = state.attempts[0];
  const sessionAttempt = state.attempts.find(
    (a) => a.session.id === state.session?.id,
  );
  const continueAttempt =
    sessionAttempt ?? (!state.session ? recent : undefined);
  return (
    <Screen back={false}>
      <Title botanical>Choose a practice</Title>
      <KoalaMessage>
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
              recording || !continueAttempt
                ? "/practice"
                : {
                    pathname: "/results/[id]",
                    params: { id: continueAttempt.id },
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
      <Expand title="About your recordings">
        <Muted>
          Recordings and history are saved on this device. Audio is sent to
          cloud AI for feedback. No account required.
        </Muted>
      </Expand>
    </Screen>
  );
}
