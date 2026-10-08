import type { Attempt, Mode } from "./practice.ts";

export function practiceProgress(attempts: readonly Attempt[], mode: Mode) {
  const completed = attempts
    .filter((attempt) => attempt.session.mode === mode && attempt.status === "ready" && attempt.analysis)
    .sort((a, b) => a.createdAt - b.createdAt);
  return {
    total: completed.length,
    points: completed.slice(-12).map((attempt) => ({
      id: attempt.id,
      createdAt: attempt.createdAt,
      content: attempt.analysis!.content.score,
      delivery: attempt.analysis!.delivery.score,
      difficulty: attempt.session.prompt?.difficulty,
    })),
  };
}
