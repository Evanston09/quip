import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import {
  Action,
  Label,
  Muted,
  Panel,
  Screen,
  Title,
} from "@/components/coach-ui";
import { Text } from "@/components/ui/text";
import { clockTime, MODES } from "@/domain/practice";
import { usePractice } from "@/state/practice";

export default function Practice() {
  const { state, recording, elapsed, start, finish } = usePractice();
  const session = state.session;
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const wasRecording = useRef(recording);
  const recordingSession = useRef(session?.id);
  const latest = state.attempts.find((a) => a.session.id === session?.id);
  useEffect(() => {
    if (recording) recordingSession.current = session?.id;
    if (wasRecording.current && !recording) {
      const saved = state.attempts.find((a) => a.session.id === recordingSession.current);
      if (saved) router.replace({ pathname: "/results/[id]", params: { id: saved.id } });
    }
    wasRecording.current = recording;
  }, [state.attempts, session?.id, recording]);
  const act = async (stop: boolean) => {
    setBusy(true);
    setError("");
    try {
      if (stop) {
        const id = await finish();
        if (id) router.replace({ pathname: "/results/[id]", params: { id } });
      } else await start();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  if (!session)
    return (
      <Screen title="Choose a practice">
        <Muted>Choose a mode to begin your practice.</Muted>
        <Action onPress={() => router.replace("/")}>Choose a practice</Action>
      </Screen>
    );
  const remaining =
    session.mode === "rehearse"
      ? 0
      : Math.max(0, (session.preparationDeadline - now) / 1000);
  const max = MODES[session.mode].maxSeconds;
  return (
    <Screen
      title={
        recording
          ? "Recording"
          : session.mode === "rehearse"
            ? "Rehearse"
            : "Prepare"
      }
      back={!recording}
    >
      <Label>
        {MODES[session.mode].label}
        {session.prompt?.difficulty ? ` · ${session.prompt.difficulty}` : ""}
      </Label>
      <Panel>
        <Text className="text-xl font-semibold leading-8">
          {session.prompt?.text ?? session.outline}
        </Text>
        <Muted>Audience: {session.prompt?.audience ?? session.audience}</Muted>
      </Panel>
      {session.selectedGoal && (
        <Panel className="bg-secondary">
          <Label>Practice goal</Label>
          <Text>{session.selectedGoal}</Text>
        </Panel>
      )}
      <View className="items-center gap-4 py-8">
        <Label>
          {recording
            ? "Recording"
            : remaining > 0
              ? "Preparation time"
              : "Ready to record"}
        </Label>
        {(recording || session.mode !== "rehearse") && (
          <Title>{clockTime(recording ? elapsed : remaining)}</Title>
        )}
        <Muted>
          {recording
            ? `of ${clockTime(max)} maximum`
            : session.mode === "rehearse"
              ? `${clockTime(max)} maximum`
              : "Start when you’re ready."}
        </Muted>
        {recording && max - elapsed <= 15 && (
          <Text className="font-medium text-primary">
            Less than 15 seconds remaining.
          </Text>
        )}
      </View>
      {!!error && <Text className="text-destructive">{error}</Text>}
      <Action
        disabled={busy}
        onPress={() => {
          void act(recording);
        }}
      >
        {busy
          ? "Saving…"
          : recording
            ? "Finish & get feedback"
            : remaining > 0
              ? "Start recording early"
              : "Start recording"}
      </Action>
      {recording ? (
        <Muted>
          Leaving the app stops recording and saves recoverable audio.
        </Muted>
      ) : session.mode !== "rehearse" ? (
        <Muted>
          You can leave to prepare. Your prompt and timer are saved.
        </Muted>
      ) : null}
      {!recording && latest && (
        <Action
          variant="outline"
          onPress={() =>
            router.push({
              pathname: "/results/[id]",
              params: { id: latest.id },
            })
          }
        >
          View last attempt
        </Action>
      )}
    </Screen>
  );
}
