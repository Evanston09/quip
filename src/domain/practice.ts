import { z } from "zod";

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
export const coachingSchema = z.object({
  transcript: z.string().max(20000),
  content: sectionSchema,
  delivery: sectionSchema,
  strength: z.string().min(1),
  recommendedGoal: z.string().min(1),
  alternativeGoals: z.array(z.string()).max(3),
  seriousFactualMistakes: z.array(z.string()),
  fillers: z.array(
    z.object({
      phrase: z.string().min(1),
      count: z.number().int().nonnegative(),
    }),
  ),
  goalCommentary: z.string().nullable(),
});
export type Coaching = z.infer<typeof coachingSchema>;
export const analysisSchema = coachingSchema
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
    previousAttempt: z
      .object({
        id: z.string(),
        transcript: z.string().max(20000),
        contentScore: z.number().min(0).max(100),
        deliveryScore: z.number().min(0).max(100),
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
export type Session = {
  id: string;
  mode: Mode;
  prompt?: Prompt;
  outline?: string;
  audience?: string;
  preparationDeadline: number;
  selectedGoal?: string;
  previousAttemptId?: string;
};
export type Attempt = {
  id: string;
  session: Session;
  uri: string;
  mimeType: string;
  createdAt: number;
  durationSeconds: number;
  durationUnknown?: boolean;
  status: "processing" | "ready" | "needs-retry" | "interrupted";
  analysis?: Analysis;
  error?: string;
  retryAt?: number;
  retryable?: boolean;
};
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
