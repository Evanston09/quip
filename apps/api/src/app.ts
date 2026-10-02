import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import {
  coachingSchema,
  completeAnalysis,
  contextSchema,
  difficultySchema,
  MODES,
} from "../../../src/domain/practice.ts";
import { generate, ServiceError } from "./provider.ts";
import { inspectAudio, MAX_BYTES } from "./audio.ts";
import { requireAuth } from "./auth.ts";

export const app = new Hono();
app.use(
  "*",
  cors({
    origin: (origin) =>
      /^(https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?)$/.test(
        origin,
      )
        ? origin
        : "",
    exposeHeaders: ["Retry-After"],
  }),
);
app.use("/v1/*", requireAuth);
app.use(
  "*",
  bodyLimit({
    maxSize: MAX_BYTES + 256 * 1024,
    onError: (c) =>
      c.json(
        {
          error: {
            code: "UPLOAD_TOO_LARGE",
            message: "Audio must be under 24 MB.",
            retryable: false,
          },
        },
        413,
      ),
  }),
);
app.get("/health", (c) =>
  c.json({ status: "ok", configured: Boolean(process.env.OPENROUTER_API_KEY) }),
);
app.post("/v1/prompts", async (c) => {
  const input = z
    .object({
      mode: z.enum(["impromptu", "interview"]),
      difficulty: difficultySchema.optional(),
    })
    .parse(await c.req.json());
  if (input.mode === "impromptu" && !input.difficulty)
    throw new ServiceError(400, "INVALID_CONTEXT", "Choose a difficulty.");
  const result = await generate(
    z.object({
      text: z.string().min(1).max(2000),
      audience: z.string().min(1).max(1000),
    }),
    input.mode === "impromptu"
      ? `Generate one scientific, non-political explanation prompt at ${input.difficulty} difficulty. Specify a target audience. Vary the scientific subject. No answer or sample speech.`
      : "Generate one common behavioral interview question about a weakness, past project, teamwork, or learning experience. No role setup. Specify the interviewer audience. No sample answer.",
  );
  return c.json({ prompt: { id: randomUUID(), ...result, ...input } });
});
app.post("/v1/analyses", async (c) => {
  const form = await c.req.formData();
  const rawContext = form.get("context");
  if (typeof rawContext !== "string")
    throw new ServiceError(400, "INVALID_CONTEXT", "Provide attempt context.");
  let json: unknown;
  try {
    json = JSON.parse(rawContext);
  } catch {
    throw new ServiceError(400, "INVALID_CONTEXT", "Context must be JSON.");
  }
  const context = contextSchema.parse(json);
  const audio = form.get("audio");
  if (!audio || typeof audio === "string")
    throw new ServiceError(400, "MISSING_AUDIO", "Provide an audio recording.");
  if (audio.size > MAX_BYTES)
    throw new ServiceError(
      413,
      "UPLOAD_TOO_LARGE",
      "Audio must be under 24 MB.",
    );
  const bytes = new Uint8Array(await audio.arrayBuffer());
  const { duration, format } = await inspectAudio(
    bytes,
    MODES[context.mode].maxSeconds,
  );
  const contentNames = [
    "Clarity",
    "Organization",
    "Relevance",
    "Conciseness",
    ...(context.mode === "impromptu"
      ? ["Scientific accuracy", "Audience explanation"]
      : context.mode === "interview"
        ? ["Concrete examples", "Question answered"]
        : ["Outline coverage", "Audience appropriateness"]),
  ];
  const deliveryNames = [
    "Pacing",
    "Pause placement",
    "Fillers and repetition",
    "Intelligibility",
    "Vocal expression",
  ];
  const coaching = await generate(
    coachingSchema,
    `Analyze this actual English recording (${duration.toFixed(2)} seconds) against the following context: ${JSON.stringify(context)}.
Transcribe verbatim including audible fillers; never invent words, evidence, or timestamps. If no assessable English speech exists, return an empty transcript so the service can report unusable audio.
Content criteria, each scored 0–100: ${contentNames.join(", ")}. Clarity = comprehensibility of ideas; Organization = logical sequence; Relevance = on-topic statements; Conciseness = unnecessary material; Question answered = coverage of every requested part, distinct from relevance.
Delivery criteria, each scored 0–100: ${deliveryNames.join(", ")}. Judge the audio, not personality or confidence. Never penalize accent itself. Explain each opinion with concise evidence. For limited evidence give a tentative coaching opinion and say why.
Give up to three useful specific points per section, one strength and one main goal plus up to three alternatives. Flag serious scientific mistakes as AI judgments (not external fact-checking), and prioritize their correction as recommendedGoal. Include detected filler phrase counts. Goal commentary must assess the selected goal against the previous transcript and scores when provided, acknowledge that previous audio is unavailable, and never assume improvement. No numerical score changes; code computes them.`,
    { data: Buffer.from(bytes).toString("base64"), format },
  );
  if (!coaching.transcript.trim())
    throw new ServiceError(
      422,
      "UNUSABLE_AUDIO",
      "No assessable English speech was detected. Please record again.",
    );
  if (
    contentNames.some(
      (name) => !coaching.content.criteria.some((c) => c.name === name),
    ) ||
    coaching.content.criteria.length !== contentNames.length ||
    deliveryNames.some(
      (name) => !coaching.delivery.criteria.some((c) => c.name === name),
    ) ||
    coaching.delivery.criteria.length !== deliveryNames.length
  )
    throw new ServiceError(
      502,
      "INCOMPLETE_RUBRIC",
      "The coach returned incomplete scoring. Please try again.",
      true,
    );
  return c.json(completeAnalysis(coaching, context, duration));
});
app.onError((error, c) => {
  if (error instanceof ServiceError) {
    if (error.retryAfter) c.header("Retry-After", error.retryAfter);
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
        },
      },
      error.status,
    );
  }
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return c.json(
      {
        error: {
          code: "INVALID_CONTEXT",
          message: "Check the practice context and try again.",
          retryable: false,
        },
      },
      400,
    );
  return c.json(
    {
      error: {
        code: "ANALYSIS_FAILED",
        message: "The coach could not finish. Please try again.",
        retryable: true,
      },
    },
    502,
  );
});
