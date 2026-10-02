import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import {
  analysisSchema,
  promptSchema,
  type Analysis,
  type AnalysisContext,
  type Attempt,
  type Difficulty,
  type Mode,
} from "@/domain/practice";
export class ApiError extends Error {
  constructor(
    message: string,
    public retryAt?: number,
    public retryable = true,
  ) {
    super(message);
  }
}
function baseUrl() {
  const url = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!url)
    throw new ApiError(
      "The coach is unavailable right now. Please try again later.",
    );
  return url;
}
async function request(
  path: string,
  body: BodyInit,
  json = false,
  userId?: string,
) {
  const auth = await supabase?.auth.getSession();
  const session = auth?.data.session;
  if (auth?.error || !session || (userId && session.user.id !== userId))
    throw new ApiError("Sign in again to continue.", undefined, true);
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method: "POST",
      body,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(json ? { "Content-Type": "application/json" } : {}),
      },
      signal: AbortSignal.timeout(180000),
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Could not reach the coach. Check your connection and try again.",
    );
  }
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && supabase) {
      const current = await supabase.auth.getSession();
      if (current.data.session?.access_token === session.access_token)
        await supabase.auth.signOut({ scope: "local" });
    }
    const retry = response.headers.get("Retry-After");
    const retryAt = retry
      ? /^\d+$/.test(retry)
        ? Date.now() + Number(retry) * 1000
        : Date.parse(retry)
      : undefined;
    throw new ApiError(
      data.error?.message ?? "The coach could not finish. Please try again.",
      retryAt,
      data.error?.retryable !== false,
    );
  }
  return data;
}
export async function generatePrompt(
  mode: Exclude<Mode, "rehearse">,
  difficulty?: Difficulty,
) {
  const data = await request(
    "/v1/prompts",
    JSON.stringify({ mode, ...(mode === "impromptu" ? { difficulty } : {}) }),
    true,
  );
  return promptSchema.parse(data.prompt);
}
export async function analyze(
  attempt: Attempt,
  previous?: Attempt,
  userId?: string,
): Promise<Analysis> {
  const context: AnalysisContext = {
    attemptId: attempt.id,
    mode: attempt.session.mode,
    prompt: attempt.session.prompt,
    outline: attempt.session.outline,
    audience: attempt.session.audience,
    selectedGoal: attempt.session.selectedGoal,
    ...(previous?.analysis
      ? {
          previousAttempt: {
            id: previous.id,
            transcript: previous.analysis.transcript,
            contentScore: previous.analysis.content.score,
            deliveryScore: previous.analysis.delivery.score,
          },
        }
      : {}),
  };
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
    await request("/v1/analyses", form, false, userId),
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
