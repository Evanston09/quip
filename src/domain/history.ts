import { z } from "zod";
import { GOALS, preferencesSchema, type Preferences } from "./preferences.ts";
import { attemptSchema, sessionSchema, type Session } from "./practice.ts";

export const savedStateSchema = z.object({
  attempts: z.array(attemptSchema),
  onboardingCompleted: z.boolean().optional(),
  preferences: preferencesSchema.optional(),
  session: sessionSchema.optional(),
  practiceGoal: z.string().min(1).max(1000).optional(),
  activeRecording: z.object({
    id: z.string().min(1),
    session: sessionSchema,
    uri: z.string(),
    startedAt: z.number().finite(),
  }).optional(),
});
export type SavedState = z.infer<typeof savedStateSchema>;

export function replacePreparation(
  state: SavedState,
  session: Session,
  expectedPreparationId?: string,
): SavedState {
  if (state.activeRecording)
    throw new Error("Finish your recording before starting another practice.");
  if (state.session?.preparationId !== expectedPreparationId)
    throw new Error("Your unfinished practice changed. Review it before replacing it.");
  return { ...state, session };
}

export function withoutAttempt(state: SavedState, id: string): SavedState {
  return {
    ...state,
    session: state.session?.previousAttemptId === id
      ? { ...state.session, previousAttemptId: undefined }
      : state.session,
    attempts: state.attempts.filter((a) => a.id !== id).map((a) =>
      a.analysis?.comparison?.previousAttemptId === id
        ? { ...a, analysis: { ...a.analysis, comparison: undefined } }
        : a,
    ),
  };
}

export function completeOnboarding(state: SavedState, preferences?: Preferences): SavedState {
  if (state.activeRecording)
    throw new Error("Finish your recording before changing coaching preferences.");
  const validated = preferences ? preferencesSchema.parse(preferences) : undefined;
  return {
    ...state,
    onboardingCompleted: true,
    ...(validated ? {
      preferences: validated,
      practiceGoal: state.preferences?.improvementGoal === validated.improvementGoal
        ? state.practiceGoal : GOALS[validated.improvementGoal].goal,
    } : {}),
  };
}
