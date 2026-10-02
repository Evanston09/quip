import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { AudioPlayback } from "@/components/audio-playback";
import {
  Action,
  Confirm,
  Expand,
  KoalaMessage,
  Label,
  Muted,
  Panel,
  Screen,
  Title,
} from "@/components/coach-ui";
import { FeedbackSection, Transcript } from "@/components/feedback-section";
import { Text } from "@/components/ui/text";
import { clockTime, MODES } from "@/domain/practice";
import { usePractice } from "@/state/practice";

export default function Results() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, submit, setSession, deleteAttempt, recording } = usePractice();
  const attempt = state.attempts.find((a) => a.id === id);
  const [goal, setGoal] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const analysis = attempt?.analysis;
  const retry = useCallback(async () => {
    if (!attempt) return;
    await setSession({
      ...attempt.session,
      selectedGoal: goal ?? analysis?.recommendedGoal,
      previousAttemptId: state.attempts.find(
        (a) => a.session.id === attempt.session.id,
      )?.id,
      preparationDeadline:
        Date.now() + (attempt.session.mode === "rehearse" ? 0 : 60000),
    });
    router.replace("/practice");
  }, [attempt, analysis, goal, setSession, state.attempts]);
  if (!attempt)
    return (
      <Screen title="Attempt unavailable">
        <Muted>This attempt may have been deleted.</Muted>
        <Action onPress={() => router.replace("/")}>Return home</Action>
      </Screen>
    );

  return (
    <Screen title="Feedback" botanical>
      <Label>
        {MODES[attempt.session.mode].label} ·{" "}
        {attempt.durationUnknown
          ? "Saved audio"
          : clockTime(attempt.durationSeconds)}
      </Label>
      <Panel>
        <Text className="font-semibold leading-6">
          {attempt.session.prompt?.text ?? attempt.session.outline}
        </Text>
      </Panel>
      {analysis ? (
        <>
          <KoalaMessage>
            Okay, here’s what stood out.
          </KoalaMessage>
          <View className="items-center gap-2">
            <Title>{analysis.overallScore} / 100</Title>
            <Muted>Overall score</Muted>
          </View>
          <Panel>
            <Label>Strength</Label>
            <Text className="text-lg leading-7">{analysis.strength}</Text>
          </Panel>
          {!!analysis.seriousFactualMistakes.length && (
            <Panel className="border-destructive">
              <Label>Scientific corrections</Label>
              {analysis.seriousFactualMistakes.map((point, i) => (
                <Text key={i}>{point}</Text>
              ))}
              <Muted>
                Scientific corrections are Gemini’s AI feedback, without
                external fact-checking.
              </Muted>
            </Panel>
          )}
          <Panel className="bg-secondary">
            <Label>Next practice goal</Label>
            <Text className="text-lg font-semibold leading-7">
              {goal ?? analysis.recommendedGoal}
            </Text>
            <Expand title="Change goal">
              {[analysis.recommendedGoal, ...analysis.alternativeGoals].map(
                (g, i) => (
                  <Action
                    key={i}
                    variant={
                      (goal ?? analysis.recommendedGoal) === g
                        ? "default"
                        : "outline"
                    }
                    onPress={() => setGoal(g)}
                  >
                    {g}
                  </Action>
                ),
              )}
            </Expand>
          </Panel>
          {analysis.comparison && (
            <Panel>
              <Label>Compared with your previous attempt</Label>
              <Text className="font-bold">
                Content {analysis.comparison.contentChange >= 0 ? "+" : ""}
                {analysis.comparison.contentChange} · Delivery{" "}
                {analysis.comparison.deliveryChange >= 0 ? "+" : ""}
                {analysis.comparison.deliveryChange}
              </Text>
              <Text className="leading-6">
                {analysis.comparison.commentary}
              </Text>
            </Panel>
          )}
          <FeedbackSection title="Content" section={analysis.content} />
          <FeedbackSection title="Delivery" section={analysis.delivery} />
          <Panel>
            <Label>Recording</Label>
            <AudioPlayback uri={attempt.uri} />
            <Expand title="Transcript & detected fillers">
              <Transcript
                text={analysis.transcript}
                phrases={analysis.statistics.fillers.map((f) => f.phrase)}
              />
              <Muted>
                {analysis.statistics.wordsPerMinute} words/minute · derived from
                transcript and audio duration
              </Muted>
              <Text>
                {analysis.statistics.fillers.length
                  ? analysis.statistics.fillers
                      .map((f) => `${f.phrase}: ${f.count}`)
                      .join(" · ")
                  : "No fillers detected."}
              </Text>
              <Muted>
                AI detections may miss fillers. Highlighting marks matching
                phrases in the transcript.
              </Muted>
            </Expand>
          </Panel>
          <Action
            disabled={recording || busy}
            onPress={() => {
              void run(retry);
            }}
          >
            {attempt.session.mode === "rehearse"
              ? "Retry speech"
              : "Retry this"}
          </Action>
          {attempt.session.mode !== "rehearse" && (
            <Action
              variant="outline"
              disabled={recording}
              onPress={() =>
                router.push({
                  pathname: "/setup",
                  params: { mode: attempt.session.mode },
                })
              }
            >
              New prompt
            </Action>
          )}
        </>
      ) : (
        <>
          <Panel>
            {attempt.status === "processing" ? (
              <>
                <ActivityIndicator color="#3D705B" />
                <Title>Analyzing recording…</Title>
                <Muted>
                  Recording is saved. You can return home while your coach
                  listens.
                </Muted>
              </>
            ) : (
              <>
                <Title>
                  {attempt.status === "interrupted"
                    ? "Recording interrupted"
                    : "Feedback unavailable"}
                </Title>
                <Muted>
                  {attempt.status === "interrupted"
                    ? "Recording was interrupted. Submit the recoverable audio or start over."
                    : (attempt.error ??
                      "Feedback is not available yet. Try analysis when you’re ready.")}
                </Muted>
                <Action
                  disabled={busy || recording}
                  onPress={() => {
                    void run(
                      attempt.retryable === false
                        ? retry
                        : () => submit(attempt.id),
                    );
                  }}
                >
                  {attempt.retryable === false
                    ? "Record again"
                    : attempt.status === "interrupted"
                      ? "Submit saved audio"
                      : "Retry analysis"}
                </Action>
              </>
            )}
          </Panel>
          <Panel>
            <Label>Saved audio</Label>
            <AudioPlayback uri={attempt.uri} />
          </Panel>
          {attempt.status === "interrupted" && (
            <Action
              variant="outline"
              disabled={busy || recording}
              onPress={() => {
                void run(retry);
              }}
            >
              Start over
            </Action>
          )}
        </>
      )}
      {!!error && <Text className="text-destructive">{error}</Text>}
      <Action
        variant="secondary"
        onPress={() => {
          void run(async () => {
            if (!recording) await setSession(undefined);
            router.replace("/");
          });
        }}
      >
        {attempt.status === "processing" ? "Return home" : "Finish"}
      </Action>
      <Confirm
        label="Delete this attempt"
        message="Permanently remove this recording, feedback, and comparisons that reference it? Other attempts will stay."
        onConfirm={async () => {
          await deleteAttempt(attempt.id);
          router.replace("/history");
        }}
      />
    </Screen>
  );
}
