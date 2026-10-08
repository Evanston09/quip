import { z } from "zod";
import { coachingPreferencesSchema } from "./preferences.ts";
import { speakingGoalSchema } from "./goals.ts";

export const modeSchema = z.enum(["impromptu", "interview", "rehearse"]);
export type Mode = z.infer<typeof modeSchema>;
export const difficultySchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);
export type Difficulty = z.infer<typeof difficultySchema>;
export const promptSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(2000),
  mode: z.enum(["impromptu", "interview"]),
  difficulty: difficultySchema.optional(),
  audience: z.string().max(1000).optional(),
});
export type Prompt = z.infer<typeof promptSchema>;
export const criterionSchema = z.object({
  name: z.string().min(1),
  score: z.number().min(0).max(100),
  explanation: z.string().min(1),
  evidence: z.string(),
});
const sectionSchema = z.object({
  criteria: z.array(criterionSchema).min(1),
  points: z.array(z.string().min(1)).min(1).max(3),
});
const feedbackSchema = z.object({
  transcript: z.string().max(20000),
  content: sectionSchema,
  delivery: sectionSchema,
  strength: z.string().min(1),
  recommendedGoal: z.string().min(1).max(1000),
  alternativeGoals: z.array(z.string().min(1).max(1000)).max(3),
  seriousFactualMistakes: z.array(z.string()),
  fillers: z.array(
    z.object({
      phrase: z.string().min(1),
      count: z.number().int().nonnegative(),
    }),
  ),
  goalCommentary: z.string().nullable(),
});
export const coachingSchema = feedbackSchema.extend({
  recommendedGoal: speakingGoalSchema,
  alternativeGoals: z.array(speakingGoalSchema).max(3),
});
export type Coaching = z.infer<typeof coachingSchema>;
// Stored feedback preserves the original wording; new provider output uses the goal catalog.
export const analysisSchema = feedbackSchema
  .omit({ fillers: true, goalCommentary: true })
  .extend({
    transcript: z.string().min(1).max(20000),
    attemptId: z.string().min(1),
    rubricVersion: z.string().min(1),
    overallScore: z.number().min(0).max(100),
    content: sectionSchema.extend({ score: z.number().min(0).max(100) }),
    delivery: sectionSchema.extend({ score: z.number().min(0).max(100) }),
    statistics: z.object({
      fillers: coachingSchema.shape.fillers,
      durationSeconds: z.number().positive(),
      wordsPerMinute: z.number().nonnegative(),
    }),
    comparison: z
      .object({
        previousAttemptId: z.string(),
        contentChange: z.number().min(-100).max(100),
        deliveryChange: z.number().min(-100).max(100),
        commentary: z.string(),
      })
      .optional(),
  });
export type Analysis = z.infer<typeof analysisSchema>;
export const contextSchema = z
  .object({
    attemptId: z.string().min(1).max(100),
    mode: modeSchema,
    prompt: promptSchema.optional(),
    outline: z.string().max(6000).optional(),
    audience: z.string().max(1000).optional(),
    selectedGoal: z.string().max(1000).optional(),
    coachingPreferences: coachingPreferencesSchema.optional(),
    previousAttempt: z
      .object({
        id: z.string(),
        transcript: z.string().max(20000),
        contentScore: z.number().min(0).max(100),
        deliveryScore: z.number().min(0).max(100),
        contentCriteria: z.array(criterionSchema).max(6),
        deliveryCriteria: z.array(criterionSchema).max(5),
        statistics: analysisSchema.shape.statistics,
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.mode === "rehearse"
        ? !value.outline?.trim() || !value.audience?.trim()
        : !value.prompt ||
          value.prompt.mode !== value.mode ||
          (value.mode === "impromptu" && !value.prompt.difficulty)
    )
      ctx.addIssue({
        code: "custom",
        message: "Provide the prompt or speech outline and audience.",
      });
  });
export type AnalysisContext = z.infer<typeof contextSchema>;
export const sessionSchema = z.object({
  id: z.string().min(1),
  preparationId: z.string().min(1),
  mode: modeSchema,
  prompt: promptSchema.optional(),
  outline: z.string().max(6000).optional(),
  audience: z.string().max(1000).optional(),
  preparationSeconds: z.number().int().min(0).max(300),
  preparationDeadline: z.number().finite(),
  selectedGoal: z.string().min(1).max(1000).optional(),
  coachingPreferences: coachingPreferencesSchema.optional(),
  previousAttemptId: z.string().optional(),
});
export type Session = z.infer<typeof sessionSchema>;
export const attemptSchema = z.object({
  id: z.string().min(1),
  session: sessionSchema,
  uri: z.string(),
  mimeType: z.string(),
  createdAt: z.number().finite(),
  durationSeconds: z.number().nonnegative(),
  durationUnknown: z.boolean().optional(),
  status: z.enum(["processing", "ready", "needs-retry", "interrupted", "deleting"]),
  analysis: analysisSchema.optional(),
  error: z.string().optional(),
  retryAt: z.number().finite().optional(),
  retryable: z.boolean().optional(),
});
export type Attempt = z.infer<typeof attemptSchema>;
export const MODES: Record<
  Mode,
  { label: string; description: string; maxSeconds: number; icon: string }
> = {
  impromptu: {
    label: "Impromptu",
    description: "Explain a scientific topic.",
    maxSeconds: 180,
    icon: "✦",
  },
  interview: {
    label: "Interview",
    description: "Answer common interview questions.",
    maxSeconds: 180,
    icon: "↗",
  },
  rehearse: {
    label: "Rehearse",
    description: "Practice a speech from your main points.",
    maxSeconds: 300,
    icon: "≋",
  },
};
export function sectionScore(section: Coaching["content"]) {
  return Math.round(
    section.criteria.reduce((sum, c) => sum + c.score, 0) /
      section.criteria.length,
  );
}
export function completeAnalysis(
  coaching: Coaching,
  context: AnalysisContext,
  duration: number,
): Analysis {
  const contentScore = sectionScore(coaching.content),
    deliveryScore = sectionScore(coaching.delivery);
  const previous = context.previousAttempt;
  const { fillers, goalCommentary, ...feedback } = coaching;
  return {
    ...feedback,
    attemptId: context.attemptId,
    rubricVersion: "1",
    content: { ...coaching.content, score: contentScore },
    delivery: { ...coaching.delivery, score: deliveryScore },
    overallScore: Math.round((contentScore + deliveryScore) / 2),
    statistics: {
      fillers,
      durationSeconds: duration,
      wordsPerMinute: Math.round(
        coaching.transcript.trim().split(/\s+/).length / (duration / 60),
      ),
    },
    ...(previous
      ? {
          comparison: {
            previousAttemptId: previous.id,
            contentChange: contentScore - previous.contentScore,
            deliveryChange: deliveryScore - previous.deliveryScore,
            commentary:
              goalCommentary ??
              "Compare the two recordings with your selected goal in mind.",
          },
        }
      : {}),
  };
}
export function clockTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function latestCompleted(attempts: Attempt[], sessionId: string) {
  return attempts
    .filter((a) => a.session.id === sessionId && a.status === "ready" && a.analysis)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}
export function retrySession(
  attempt: Attempt,
  attempts: Attempt[],
  preparationId: string,
  selectedGoal?: string,
  now = Date.now(),
): Session {
  const previous = latestCompleted(attempts, attempt.session.id);
  return {
    ...attempt.session,
    preparationId,
    previousAttemptId: previous?.id,
    selectedGoal: selectedGoal ?? attempt.session.selectedGoal ?? previous?.analysis?.recommendedGoal,
    preparationDeadline: now + attempt.session.preparationSeconds * 1000,
  };
}
export function analysisContext(attempt: Attempt, previous?: Attempt): AnalysisContext {
  return {
    attemptId: attempt.id,
    mode: attempt.session.mode,
    prompt: attempt.session.prompt,
    outline: attempt.session.outline,
    audience: attempt.session.audience,
    selectedGoal: attempt.session.selectedGoal,
    coachingPreferences: attempt.session.coachingPreferences,
    ...(previous?.status === "ready" && previous.analysis && previous.session.id === attempt.session.id
      ? {
          previousAttempt: {
            id: previous.id,
            transcript: previous.analysis.transcript,
            contentScore: previous.analysis.content.score,
            deliveryScore: previous.analysis.delivery.score,
            contentCriteria: previous.analysis.content.criteria,
            deliveryCriteria: previous.analysis.delivery.criteria,
            statistics: previous.analysis.statistics,
          },
        }
      : {}),
  };
}
