import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { Action, Label, Muted, Panel, Screen } from "@/components/coach-ui";
import { StartPracticeAction } from "@/components/start-practice-action";
import { RecordingPrivacy } from "@/components/recording-privacy";
import { Text } from "@/components/ui/text";
import { modeSchema, MODES, type Difficulty } from "@/domain/practice";
import { generatePrompt } from "@/services/api";
import { newId, usePractice } from "@/state/practice";

export default function Setup() {
  const params = useLocalSearchParams<{ mode: string }>();
  const mode = modeSchema.safeParse(params.mode).data ?? "interview";
  const { state, setSession, recording } = usePractice();
  const [useSavedGoal, setUseSavedGoal] = useState(true);
  const request = useRef<AbortController | null>(null);
  const focused = useRef(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [preparation, setPreparation] = useState(60);
  const [outline, setOutline] = useState("");
  const [audience, setAudience] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useFocusEffect(useCallback(() => {
    focused.current = true;
    setBusy(false);
    return () => {
      focused.current = false;
      request.current?.abort();
      request.current = null;
    };
  }, []));
  const begin = async (expectedPreparationId?: string) => {
    if (request.current || !focused.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      const prompt =
        mode === "rehearse"
          ? undefined
          : await generatePrompt(mode, difficulty, controller.signal, state.preferences?.englishComfort);
      if (controller.signal.aborted || !focused.current) return;
      await setSession({
        id: newId(),
        preparationId: newId(),
        mode,
        prompt,
        ...(mode === "rehearse"
          ? { outline: outline.trim(), audience: audience.trim() }
          : {}),
        preparationDeadline:
          Date.now() + (mode === "rehearse" ? 0 : preparation * 1000),
        preparationSeconds: mode === "rehearse" ? 0 : preparation,
        selectedGoal: useSavedGoal ? state.practiceGoal : undefined,
        coachingPreferences: state.preferences ? {
          englishComfort: state.preferences.englishComfort,
          feedbackStyle: state.preferences.feedbackStyle,
        } : undefined,
      }, expectedPreparationId, controller.signal);
      if (!controller.signal.aborted && focused.current) router.replace("/practice");
    } catch (e) {
      if (!controller.signal.aborted && focused.current)
        setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      if (request.current === controller) {
        request.current = null;
        if (focused.current) setBusy(false);
      }
    }
  };
  return (
    <Screen title={MODES[mode].label}>
      <Muted>
        {MODES[mode].description} Record up to {MODES[mode].maxSeconds / 60}{" "}
        minutes.
      </Muted>
      {mode === "impromptu" && (
        <View className="gap-3">
          <Label>Difficulty</Label>
          <View className="flex-row flex-wrap gap-2">
            {(["beginner", "intermediate", "advanced"] as Difficulty[]).map(
              (d) => (
                <Action
                  key={d}
                  variant={d === difficulty ? "default" : "outline"}
                  className="flex-1 min-w-24 px-2"
                  accessibilityState={{ selected: d === difficulty }}
                  onPress={() => setDifficulty(d)}
                >
                  {d[0].toUpperCase() + d.slice(1)}
                </Action>
              ),
            )}
          </View>
        </View>
      )}
      {state.practiceGoal && (
        <Panel>
          <Label>Saved practice goal</Label>
          <Text>{state.practiceGoal}</Text>
          <Action variant="outline" disabled={busy} onPress={() => setUseSavedGoal(!useSavedGoal)}>
            {useSavedGoal ? "Practice without this goal" : "Use this goal"}
          </Action>
          <Muted>{useSavedGoal ? "This goal will guide your feedback." : "Your goal stays saved for another practice."}</Muted>
        </Panel>
      )}
      {mode === "rehearse" && (
        <View className="gap-3">
          <Label>Main points</Label>
          <TextInput
            className="min-h-36 rounded-2xl border border-input bg-background p-4 font-sans text-base text-foreground"
            multiline
            textAlignVertical="top"
            value={outline}
            onChangeText={setOutline}
            maxLength={6000}
            placeholder="What would you like to cover?"
            placeholderTextColor="#6B7771"
            accessibilityLabel="Speech main points"
          />
          <Label>Audience</Label>
          <TextInput
            className="min-h-24 rounded-2xl border border-input bg-background p-4 font-sans text-base text-foreground"
            multiline
            value={audience}
            onChangeText={setAudience}
            maxLength={1000}
            placeholder="Who is listening, and what do they already know?"
            placeholderTextColor="#6B7771"
            accessibilityLabel="Audience background"
          />
        </View>
      )}
      {mode !== "rehearse" && (
        <View className="gap-3">
          <Label>Preparation time</Label>
          <Muted>Start recording whenever you’re ready.</Muted>
          <View className="flex-row flex-wrap gap-2">
            {[0, 30, 60, 120, 300].map((seconds) => (
              <Action
                key={seconds}
                className="min-h-11 px-3"
                accessibilityState={{ selected: preparation === seconds }}
                variant={preparation === seconds ? "default" : "outline"}
                onPress={() => setPreparation(seconds)}
              >
                {seconds === 0
                  ? "None"
                  : seconds < 60
                    ? `${seconds}s`
                    : `${seconds / 60} min`}
              </Action>
            ))}
          </View>
        </View>
      )}
      {!!error && <Text className="text-destructive">{error}</Text>}
      <StartPracticeAction
        disabled={
          busy ||
          recording ||
          (mode === "rehearse" && (!outline.trim() || !audience.trim()))
        }
        onStart={begin}
        label={busy
          ? mode === "rehearse"
            ? "Opening recording…"
            : "Loading prompt…"
          : mode === "rehearse"
            ? "Continue to recording"
            : "Get my prompt"}
      />
      <RecordingPrivacy />
    </Screen>
  );
}
