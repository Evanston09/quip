import { test } from "node:test";
import assert from "node:assert/strict";
import { completeOnboarding, savedStateSchema, type SavedState } from "../../../src/domain/history.ts";
import { GOALS, type Preferences } from "../../../src/domain/preferences.ts";
import { analysisContext, contextSchema, retrySession, type Attempt } from "../../../src/domain/practice.ts";

const preferences: Preferences = {
  improvementGoal: "clarity", englishComfort: "learning", feedbackStyle: "encouraging",
};
const attempt: Attempt = {
  id: "recording", session: {
    id: "speech", preparationId: "prep", mode: "rehearse", outline: "My project",
    audience: "Peers", preparationSeconds: 0, preparationDeadline: 0,
    coachingPreferences: { englishComfort: "learning", feedbackStyle: "encouraging" },
  }, uri: "file://recording.m4a", mimeType: "audio/mp4", createdAt: 1,
  durationSeconds: 10, status: "needs-retry",
};

test("completed and skipped onboarding persist without losing unfinished practice", () => {
  const state: SavedState = { attempts: [attempt], session: attempt.session };
  const completed = savedStateSchema.parse(JSON.parse(JSON.stringify(completeOnboarding(state, preferences))));
  assert.equal(completed.onboardingCompleted, true);
  assert.deepEqual(completed.preferences, preferences);
  assert.equal(completed.practiceGoal, GOALS.clarity.goal);
  assert.deepEqual(completed.attempts, state.attempts);
  assert.deepEqual(completed.session, state.session);
  const skipped = savedStateSchema.parse(JSON.parse(JSON.stringify(completeOnboarding(state))));
  assert.equal(skipped.onboardingCompleted, true);
  assert.equal(skipped.preferences, undefined);
  assert.equal(skipped.practiceGoal, undefined);
  assert.deepEqual(skipped.session, state.session);
});

test("editing feedback style preserves a chosen goal; changing focus selects the new goal", () => {
  const state = { ...completeOnboarding({ attempts: [attempt] }, preferences), practiceGoal: "My custom goal" };
  assert.equal(completeOnboarding(state, { ...preferences, feedbackStyle: "direct" }).practiceGoal, "My custom goal");
  assert.equal(completeOnboarding(state, { ...preferences, improvementGoal: "pacing" }).practiceGoal, GOALS.pacing.goal);
  assert.deepEqual(completeOnboarding(state), state);
  const cleared = { ...state, practiceGoal: undefined };
  assert.equal(completeOnboarding(cleared, { ...preferences, feedbackStyle: "balanced" }).practiceGoal, undefined);
});

test("later preferences do not change pending analyses or retries, and recording blocks edits", () => {
  const state = completeOnboarding({ attempts: [attempt], session: attempt.session }, { ...preferences, feedbackStyle: "direct" });
  assert.deepEqual(analysisContext(state.attempts[0]).coachingPreferences, attempt.session.coachingPreferences);
  assert.deepEqual(retrySession(attempt, state.attempts, "retry").coachingPreferences, attempt.session.coachingPreferences);
  assert.throws(() => completeOnboarding({ ...state, activeRecording: { id: "active", session: attempt.session, uri: attempt.uri, startedAt: 2 } }, preferences), /Finish your recording/);
});

test("invalid preferences cannot reach stored state or analysis context", () => {
  assert.equal(savedStateSchema.safeParse({ attempts: [], preferences: { ...preferences, feedbackStyle: "harsh" } }).success, false);
  assert.throws(() => completeOnboarding({ attempts: [] }, { ...preferences, englishComfort: "expert" } as unknown as Preferences));
  assert.equal(contextSchema.safeParse({
    ...analysisContext(attempt),
    coachingPreferences: { englishComfort: "learning", feedbackStyle: "harsh" },
  }).success, false);
});
