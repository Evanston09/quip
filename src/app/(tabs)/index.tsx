import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { View } from "react-native";
import {
  Action,
  KoalaMessage,
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
  return (
    <Screen back={false} tabScreen>
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
      {(state.session || recording) && (
        <Action
          variant="secondary"
          onPress={() => router.push("/practice")}
        >
          {recording
            ? "Return to recording"
            : "Continue practice"}
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
    </Screen>
  );
}
