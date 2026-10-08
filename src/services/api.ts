import { type Preferences } from "@/domain/preferences";
import { Platform } from "react-native";
import {
  analysisSchema,
  analysisContext,
  promptSchema,
  type Analysis,
  type Attempt,
  type Difficulty,
  type Mode,
} from "@/domain/practice";
import { ApiError, request } from "@/services/http";
export { ApiError } from "@/services/http";

export async function generatePrompt(
  mode: Exclude<Mode, "rehearse">,
  difficulty?: Difficulty,
  signal?: AbortSignal,
  englishComfort?: Preferences["englishComfort"],
) {
  const data = await request(
    "/v1/prompts",
    JSON.stringify({ mode, englishComfort, ...(mode === "impromptu" ? { difficulty } : {}) }),
    true,
    signal,
  );
  return promptSchema.parse(data.prompt);
}
export async function analyze(
  attempt: Attempt,
  previous?: Attempt,
): Promise<Analysis> {
  const context = analysisContext(attempt, previous);
  const form = new FormData();
  form.append("context", JSON.stringify(context));
  if (!attempt.uri)
    throw new ApiError(
      "This recording is unavailable. Please start a new attempt.",
    );
  if (Platform.OS === "web")
    form.append(
      "audio",
      await (await fetch(attempt.uri)).blob(),
      "recording.webm",
    );
  else
    form.append("audio", {
      uri: attempt.uri,
      name: "recording.m4a",
      type: attempt.mimeType,
    } as unknown as Blob);
  const validated = analysisSchema.safeParse(
    await request("/v1/analyses", form),
  );
  if (!validated.success)
    throw new ApiError(
      "The coach returned incomplete feedback. Please try again.",
    );
  const result = validated.data;
  if (result.attemptId !== attempt.id || !Number.isFinite(result.overallScore))
    throw new ApiError(
      "The coach returned incomplete feedback. Please try again.",
    );
  return result;
}
