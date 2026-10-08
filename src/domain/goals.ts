import { z } from "zod";

export const SPEAKING_GOALS = {
  clarity: "State my main point clearly and explain it with a specific example.",
  fillers: "Replace unnecessary filler words and repetition with purposeful pauses.",
  pacing: "Use a steady speaking pace and pause between ideas.",
  organization: "Organize my answer with a main point, supporting example, and conclusion.",
  examples: "Support my points with concrete examples and explain why they matter.",
  conciseness: "Keep my answer focused and remove details that do not support my main point.",
  audience: "Explain unfamiliar terms in plain language for my audience.",
  expression: "Use vocal emphasis to make my main points easier to follow.",
} as const;

export const speakingGoalSchema = z.enum(SPEAKING_GOALS);

export function speakingGoalOptions(recommended: string, alternatives: readonly string[]) {
  return [...new Set([recommended, ...alternatives, ...Object.values(SPEAKING_GOALS)])]
    .filter((goal) => speakingGoalSchema.safeParse(goal).success);
}
