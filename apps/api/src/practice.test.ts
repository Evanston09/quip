import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analysisContext, completeAnalysis, latestCompleted, retrySession,
  type Attempt, type Coaching, type Session,
} from "../../../src/domain/practice.ts";
import { replacePreparation, savedStateSchema, withoutAttempt } from "../../../src/domain/history.ts";
import { practiceProgress } from "../../../src/domain/progress.ts";

const session: Session = {
  id: "speech", preparationId: "first-preparation", mode: "rehearse",
  outline: "Explain the project", audience: "Peers", preparationSeconds: 0,
  preparationDeadline: 1000, selectedGoal: "Reduce fillers",
};
const coaching: Coaching = {
  transcript: "Um here is my project",
  content: { criteria: [{ name: "Clarity", score: 60, explanation: "Clear idea", evidence: "my project" }], points: ["Explain the result"] },
  delivery: { criteria: [{ name: "Pacing", score: 70, explanation: "Steady pace", evidence: "Short explanation" }], points: ["Replace um with a pause"] },
  strength: "Clear idea", recommendedGoal: "Support my points with concrete examples and explain why they matter.", alternativeGoals: [],
  seriousFactualMistakes: [], fillers: [{ phrase: "Um", count: 1 }], goalCommentary: null,
};
function attempt(id: string, createdAt: number, status: Attempt["status"] = "ready"): Attempt {
  return {
    id, session, uri: `file://${id}.m4a`, mimeType: "audio/mp4", createdAt,
    durationSeconds: 10, status,
    ...(status === "ready" ? { analysis: completeAnalysis(coaching, analysisContext({
      id, session, uri: "", mimeType: "", createdAt, durationSeconds: 10, status,
    }), 10) } : {}),
  };
}

test("progress uses only completed feedback in the selected mode, sorted without mutating history", () => {
  const first = attempt("first", 10);
  const latest = attempt("latest", 30);
  const otherMode = { ...attempt("interview", 20), session: { ...session, mode: "interview" as const } };
  const history = [latest, attempt("failed", 40, "needs-retry"), otherMode,
    attempt("processing", 50, "processing"), first, attempt("deleted", 60, "deleting"),
    attempt("interrupted", 70, "interrupted"), { ...attempt("missing", 80), analysis: undefined }];
  const original = [...history];
  const progress = practiceProgress(history, "rehearse");
  assert.equal(progress.total, 2);
  assert.deepEqual(progress.points.map((point) => point.id), ["first", "latest"]);
  assert.equal(progress.points[1].content, latest.analysis!.content.score);
  assert.equal(progress.points[1].delivery, latest.analysis!.delivery.score);
  assert.deepEqual(history, original);
  assert.deepEqual(practiceProgress(history, "interview").points.map((point) => point.id), ["interview"]);
  assert.deepEqual(practiceProgress(history, "impromptu"), { total: 0, points: [] });
});

test("progress shows the latest twelve real attempts and never invents a baseline", () => {
  const history = Array.from({ length: 15 }, (_, index) => attempt(`attempt-${index}`, index));
  const progress = practiceProgress(history, "rehearse");
  assert.equal(progress.total, 15);
  assert.equal(progress.points.length, 12);
  assert.equal(progress.points[0].id, "attempt-3");
  assert.equal(progress.points[11].id, "attempt-14");
  assert.equal(practiceProgress([history[0]], "rehearse").points.length, 1);
  assert.equal(practiceProgress([], "rehearse").points.length, 0);
});

test("preparation cannot be silently replaced, including by stale requests", () => {
  const saved = { attempts: [], session };
  const next = { ...session, id: "new-speech", preparationId: "new-preparation" };
  assert.throws(() => replacePreparation(saved, next), /unfinished practice changed/);
  assert.throws(() => replacePreparation(saved, next, "stale-preparation"), /unfinished practice changed/);
  assert.equal(replacePreparation(saved, next, session.preparationId).session, next);
  assert.equal(saved.session, session);
  assert.throws(() => replacePreparation({ ...saved, activeRecording: { id: "recording", session, uri: "file://audio", startedAt: 1000 } }, next, session.preparationId), /Finish your recording/);
});

test("retries use the latest completed baseline and keep the goal through interruption", () => {
  const first = attempt("first", 1);
  const second = attempt("second", 2);
  const interrupted = attempt("interrupted", 3, "interrupted");
  const failed = attempt("failed", 4, "needs-retry");
  const deleting = attempt("deleting", 5, "deleting");
  const history = [first, deleting, failed, interrupted, second];
  assert.equal(latestCompleted(history, session.id)?.id, "second");
  const retry = retrySession(interrupted, history, "retry-preparation", undefined, 5000);
  assert.equal(retry.previousAttemptId, "second");
  assert.equal(retry.selectedGoal, "Reduce fillers");
  assert.equal(retry.preparationDeadline, 5000);
  assert.equal(retry.preparationId, "retry-preparation");
  assert.equal(retrySession(first, history, "another", "Use pauses", 6000).previousAttemptId, "second");
  assert.equal(retrySession(failed, [failed], "no-baseline").previousAttemptId, undefined);
});

test("retry preparation retains the user's chosen time and survives persistence", () => {
  const interview: Attempt = { ...attempt("interview", 1), session: {
    ...session, mode: "interview", outline: undefined, audience: undefined,
    prompt: { id: "question", mode: "interview", text: "Describe a challenge", audience: "Interviewer" },
    preparationSeconds: 120,
  } };
  const retry = retrySession(interview, [interview], "retry", "Reduce fillers", 10000);
  const saved = savedStateSchema.parse(JSON.parse(JSON.stringify({
    attempts: [interview], session: retry, practiceGoal: "Reduce fillers",
  })));
  assert.equal(saved.session?.preparationDeadline, 130000);
  assert.equal(saved.practiceGoal, "Reduce fillers");
  assert.equal(saved.session?.selectedGoal, "Reduce fillers");
});

test("comparison includes criterion evidence and supported statistics only for a completed same-speech baseline", () => {
  const old = attempt("old", 1);
  const next = attempt("next", 2);
  const context = analysisContext(next, old);
  assert.deepEqual(context.previousAttempt?.deliveryCriteria, old.analysis?.delivery.criteria);
  assert.deepEqual(context.previousAttempt?.statistics.fillers, [{ phrase: "Um", count: 1 }]);
  assert.equal(context.previousAttempt?.statistics.wordsPerMinute, 30);
  assert.equal(analysisContext(next, { ...old, status: "deleting" }).previousAttempt, undefined);
  assert.equal(analysisContext(next, { ...old, session: { ...session, id: "other" } }).previousAttempt, undefined);
});

test("deleting a baseline removes dependent comparisons but preserves unfinished work and saved goals", () => {
  const old = attempt("old", 1);
  const next = attempt("next", 2);
  next.analysis = completeAnalysis(coaching, analysisContext(next, old), 10);
  const saved = {
    attempts: [next, old], session: { ...session, preparationId: "pending-retry", previousAttemptId: old.id },
    practiceGoal: "Reduce fillers",
  };
  const result = withoutAttempt(saved, old.id);
  assert.deepEqual(result.attempts.map((a) => a.id), ["next"]);
  assert.equal(result.attempts[0].analysis?.comparison, undefined);
  assert.equal(result.session?.preparationId, "pending-retry");
  assert.equal(result.session?.previousAttemptId, undefined);
  assert.equal(result.practiceGoal, "Reduce fillers");
});

test("corrupt nested state is rejected instead of reaching practice screens", () => {
  assert.equal(savedStateSchema.safeParse({ attempts: [{}] }).success, false);
  assert.equal(savedStateSchema.safeParse({ attempts: [], session: { id: "broken" } }).success, false);
  assert.equal(savedStateSchema.safeParse({ attempts: [], practiceGoal: "" }).success, false);
});
