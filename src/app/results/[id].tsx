import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
import { StartPracticeAction } from "@/components/start-practice-action";
import { Text } from "@/components/ui/text";
import { clockTime, latestCompleted, MODES, retrySession } from "@/domain/practice";
import { newId, usePractice } from "@/state/practice";

export default function Results() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AttemptResults key={id} id={id} />;
}
function AttemptResults({ id }: { id: string }) {
  const { state, submit, setSession, setPracticeGoal, deleteAttempt, recording } = usePractice();
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
  const baseline = attempt ? latestCompleted(state.attempts, attempt.session.id) : undefined;
  const group = state.attempts.filter((a) => a.session.id === attempt?.session.id).sort((a, b) => a.createdAt - b.createdAt);
  const attemptNumber = (attemptId: string) => group.findIndex((a) => a.id === attemptId) + 1;
  const previous = state.attempts.find((a) => a.id === analysis?.comparison?.previousAttemptId && a.status === "ready");
  const nextGoal = goal ?? analysis?.recommendedGoal;
  const retry = async (expectedPreparationId?: string) => {
    if (!attempt) return;
    await setSession(retrySession(attempt, state.attempts, newId(), nextGoal), expectedPreparationId);
    router.replace("/practice");
  };
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
      {attempt.status === "deleting" ? (
        <Panel>
          <Title>Deletion needs to finish</Title>
          <Muted>{attempt.error ?? "This attempt is marked for deletion. Retry to finish removing it from this device."}</Muted>
          <Action disabled={busy} onPress={() => { void run(async () => {
            await deleteAttempt(attempt.id);
            router.replace("/history");
          }); }}>Retry deletion</Action>
        </Panel>
      ) : analysis ? (
        <>
          <KoalaMessage motion={analysis.seriousFactualMistakes.length ? "nod" : "celebrate"}>
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
            {attempt.session.selectedGoal && (
              <>
                <Label>Goal you practiced</Label>
                <Text>{attempt.session.selectedGoal}</Text>
              </>
            )}
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
            <Action
              variant="outline"
              disabled={busy || recording || state.practiceGoal === nextGoal}
              onPress={() => { void run(() => setPracticeGoal(nextGoal)); }}
            >
              {state.practiceGoal === nextGoal ? "Goal saved for future practice" : "Use this goal next time"}
            </Action>
            <Muted>Save it for new prompts and speeches, including another day.</Muted>
          </Panel>
          {analysis.comparison && previous && (
            <Panel>
              <Label>Compared with completed attempt {attemptNumber(previous.id)}</Label>
              <Muted>{new Date(previous.createdAt).toLocaleString()}</Muted>
              <Text className="font-bold">
                Content {analysis.comparison.contentChange >= 0 ? "+" : ""}
                {analysis.comparison.contentChange} · Delivery{" "}
                {analysis.comparison.deliveryChange >= 0 ? "+" : ""}
                {analysis.comparison.deliveryChange}
              </Text>
              <Text className="leading-6">
                {analysis.comparison.commentary}
              </Text>
              <Muted>
                These are AI score differences. The coach used previous feedback, transcript, filler counts, and speaking rate, but did not hear the previous audio. Changes in pauses or vocal expression are not directly verified.
              </Muted>
              <Action variant="outline" onPress={() => router.push({ pathname: "/results/[id]", params: { id: previous.id } })}>
                Open comparison recording
              </Action>
            </Panel>
          )}
          {!analysis.comparison && attempt.session.previousAttemptId && (
            <Muted>Comparison is unavailable because the baseline has no completed feedback or was deleted. Your current feedback is still saved.</Muted>
          )}
          <FeedbackSection title="Content" section={analysis.content} />
          <FeedbackSection title="Delivery" section={analysis.delivery} />
          <Panel>
            <Label>Recording</Label>
            <AudioPlayback
              uri={attempt.uri}
              durationSeconds={attempt.durationSeconds}
            />
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
          <Muted>
            {baseline ? `Your next retry will compare with completed attempt ${attemptNumber(baseline.id)} (${new Date(baseline.createdAt).toLocaleString()}).` : "Your next attempt will have no comparison until there is completed feedback for this prompt or speech."}
          </Muted>
          <StartPracticeAction
            disabled={recording || busy}
            onStart={(expected) => run(() => retry(expected))}
            label={attempt.session.mode === "rehearse"
              ? "Retry speech"
              : "Retry this"}
          />
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
          <KoalaMessage motion={attempt.status === "processing" ? "think" : "nod"}>
            {attempt.status === "processing" ? "Let’s listen to what you recorded." : "Take your time. We can try again."}
          </KoalaMessage>
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
                {attempt.retryable === false ? (
                  <StartPracticeAction label="Record again" disabled={busy || recording} onStart={(expected) => run(() => retry(expected))} />
                ) : (
                  <Action disabled={busy || recording} onPress={() => { void run(() => submit(attempt.id)); }}>
                    {attempt.status === "interrupted"
                      ? "Submit saved audio"
                      : "Retry analysis"}
                  </Action>
                )}
              </>
            )}
          </Panel>
          <Panel>
            <Label>Saved audio</Label>
            <AudioPlayback
              uri={attempt.uri}
              durationSeconds={attempt.durationSeconds}
            />
          </Panel>
          {attempt.status === "interrupted" && (
            <StartPracticeAction
              disabled={busy || recording}
              onStart={(expected) => run(() => retry(expected))}
              label="Start over"
            />
          )}
          {(attempt.status === "interrupted" || attempt.retryable === false) && (
            <Muted>{baseline ? `Starting again keeps completed attempt ${attemptNumber(baseline.id)} as the comparison baseline.` : "There is no completed feedback yet for comparison. Your saved audio will stay in History."}</Muted>
          )}
        </>
      )}
      {!!error && <Text className="text-destructive">{error}</Text>}
      <Action
        variant="secondary"
        onPress={() => router.replace("/")}
      >
        {attempt.status === "processing" ? "Return home" : "Finish"}
      </Action>
      <Confirm
        label="Delete this attempt"
        disabled={busy}
        message="Remove this recording, feedback, and comparisons that reference it from this device? Other attempts stay. Copies already sent to AI providers are not deleted."
        onConfirm={async () => {
          await deleteAttempt(attempt.id);
          router.replace("/history");
        }}
      />
    </Screen>
  );
}
