import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.ts";
import { inspectAudio } from "./audio.ts";
import {
  coachingSchema,
  completeAnalysis,
  contextSchema,
  type Coaching,
} from "../../../src/domain/practice.ts";

const realFetch = globalThis.fetch;
const originalSupabaseUrl = process.env.SUPABASE_URL;
const originalSupabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const authHeaders = { Authorization: "Bearer test-session" };
beforeEach(() => {
  process.env.SUPABASE_URL = "https://auth.test";
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-only";
  globalThis.fetch = async (url, init) => {
    if (String(url) === "https://auth.test/auth/v1/user") {
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        authHeaders.Authorization,
      );
      return Response.json({
        id: "test-user",
        email: "test@example.com",
        is_anonymous: false,
      });
    }
    throw new Error(`Unexpected network request: ${url}`);
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
  if (originalSupabaseUrl) process.env.SUPABASE_URL = originalSupabaseUrl;
  else delete process.env.SUPABASE_URL;
  if (originalSupabaseKey)
    process.env.SUPABASE_PUBLISHABLE_KEY = originalSupabaseKey;
  else delete process.env.SUPABASE_PUBLISHABLE_KEY;
});

function wav(seconds: number) {
  const rate = 8000,
    samples = Math.floor(seconds * rate),
    bytes = Buffer.alloc(44 + samples * 2);
  bytes.write("RIFF");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVE", 8);
  bytes.write("fmt ", 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    bytes.writeInt16LE(
      Math.round(3000 * Math.sin((i * 2 * Math.PI * 220) / rate)),
      44 + i * 2,
    );
  return bytes;
}
const post = (path: string, data: unknown) =>
  app.request(path, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
const criterion = (name: string, score: number) => ({
  name,
  score,
  explanation: "Test explanation",
  evidence: "Test evidence",
});
const feedback: Coaching = {
  transcript: "One two three four",
  content: {
    criteria: [criterion("Clarity", 60), criterion("Organization", 80)],
    points: ["A point"],
  },
  delivery: { criteria: [criterion("Pacing", 90)], points: ["A point"] },
  strength: "A strength",
  recommendedGoal: "A goal",
  alternativeGoals: [],
  seriousFactualMistakes: [],
  fillers: [],
  goalCommentary: "Less repetition this time.",
};

test("averages criteria and equal sections, calculates comparisons and transcript rate", () => {
  const context = contextSchema.parse({
    attemptId: "new",
    mode: "rehearse",
    outline: "Point",
    audience: "Peers",
    previousAttempt: {
      id: "old",
      transcript: "Old speech",
      contentScore: 80,
      deliveryScore: 70,
    },
  });
  const result = completeAnalysis(feedback, context, 30);
  assert.equal(result.content.score, 70);
  assert.equal(result.overallScore, 80);
  assert.equal(result.statistics.wordsPerMinute, 8);
  assert.deepEqual(result.comparison, {
    previousAttemptId: "old",
    contentChange: -10,
    deliveryChange: 20,
    commentary: "Less repetition this time.",
  });
});
test("rejects incomplete context and out of range scores", () => {
  assert.equal(
    contextSchema.safeParse({ attemptId: "a", mode: "rehearse" }).success,
    false,
  );
  assert.equal(
    contextSchema.safeParse({
      attemptId: "a",
      mode: "interview",
      prompt: { id: "p", mode: "impromptu", text: "Wrong mode" },
    }).success,
    false,
  );
  assert.equal(
    coachingSchema.safeParse({
      ...feedback,
      content: { ...feedback.content, criteria: [criterion("Clarity", 101)] },
    }).success,
    false,
  );
});
test("measures actual uploaded duration and rejects over-cap and malformed audio", async () => {
  assert.equal((await inspectAudio(wav(2), 180)).duration, 2);
  await assert.rejects(
    inspectAudio(wav(181.5), 180),
    (error) => (error as { status: number }).status === 413,
  );
  await assert.rejects(
    inspectAudio(Buffer.from("not audio"), 180),
    (error) => (error as { status: number }).status === 422,
  );
});
test("REST rejects invalid JSON/context and missing audio consistently", async () => {
  const bad = await post("/v1/prompts", { mode: "rehearse" });
  assert.equal(bad.status, 400);
  const missingDifficulty = await post("/v1/prompts", { mode: "impromptu" });
  assert.equal(missingDifficulty.status, 400);
  const body = new FormData();
  body.set(
    "context",
    JSON.stringify({
      attemptId: "a",
      mode: "rehearse",
      outline: "A point",
      audience: "Peers",
    }),
  );
  const response = await app.request("/v1/analyses", {
    method: "POST",
    headers: authHeaders,
    body,
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "MISSING_AUDIO");
});
test("unconfigured AI returns recoverable service error without fabricated feedback", async () => {
  const old = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  try {
    const response = await post("/v1/prompts", { mode: "interview" });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.retryable, true);
  } finally {
    if (old) process.env.OPENROUTER_API_KEY = old;
  }
});
test("provider rate limit and Retry-After reach the app", async () => {
  const old = process.env.OPENROUTER_API_KEY;
  const original = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "test-only";
  globalThis.fetch = async (url, init) =>
    String(url).startsWith("https://auth.test/")
      ? original(url, init)
      : new Response("{}", { status: 429, headers: { "Retry-After": "30" } });
  try {
    const response = await post("/v1/prompts", { mode: "interview" });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("Retry-After"), "30");
  } finally {
    globalThis.fetch = original;
    if (old) process.env.OPENROUTER_API_KEY = old;
    else delete process.env.OPENROUTER_API_KEY;
  }
});

test("full multipart analysis uses actual audio and computes scores server-side", async () => {
  const old = process.env.OPENROUTER_API_KEY;
  const original = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "test-only";
  const coaching = {
    ...feedback,
    content: {
      criteria: [
        "Clarity",
        "Organization",
        "Relevance",
        "Conciseness",
        "Outline coverage",
        "Audience appropriateness",
      ].map((name) => criterion(name, 60)),
      points: ["Clear outline."],
    },
    delivery: {
      criteria: [
        "Pacing",
        "Pause placement",
        "Fillers and repetition",
        "Intelligibility",
        "Vocal expression",
      ].map((name) => criterion(name, 80)),
      points: ["Audible variation."],
    },
  };
  globalThis.fetch = async (_url, init) => {
    if (String(_url).startsWith("https://auth.test/"))
      return original(_url, init);
    const request = JSON.parse(String(init?.body));
    assert.equal(request.model, "google/gemini-2.5-flash");
    assert.equal(request.messages[1].content[1].input_audio.format, "wav");
    assert.ok(request.messages[1].content[1].input_audio.data.length > 0);
    assert.equal(request.response_format.type, "json_schema");
    return Response.json({
      choices: [{ message: { content: JSON.stringify(coaching) } }],
    });
  };
  try {
    const form = new FormData();
    form.set(
      "context",
      JSON.stringify({
        attemptId: "recording-1",
        mode: "rehearse",
        outline: "A point",
        audience: "Peers",
      }),
    );
    form.set("audio", new Blob([wav(2)], { type: "audio/wav" }), "speech.wav");
    const response = await app.request("/v1/analyses", {
      method: "POST",
      headers: authHeaders,
      body: form,
    });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.attemptId, "recording-1");
    assert.equal(result.overallScore, 70);
    assert.equal(result.statistics.durationSeconds, 2);
    assert.equal(result.content.score, 60);
    assert.equal(result.delivery.score, 80);
  } finally {
    globalThis.fetch = original;
    if (old) process.env.OPENROUTER_API_KEY = old;
    else delete process.env.OPENROUTER_API_KEY;
  }
});

test("requires authentication before parsing prompts or uploaded recordings", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("Must not call a provider");
  };
  for (const path of ["/v1/prompts", "/v1/analyses"]) {
    const response = await app.request(path, {
      method: "POST",
      body: "invalid",
    });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, "SIGN_IN_REQUIRED");
  }
  assert.equal(calls, 0);
});

test("rejects expired tokens and anonymous users", async () => {
  for (const authResponse of [
    new Response("{}", { status: 401 }),
    Response.json({ id: "guest", is_anonymous: true }),
  ]) {
    globalThis.fetch = async () => authResponse;
    const response = await post("/v1/prompts", { mode: "interview" });
    assert.equal(response.status, 401);
  }
});

test("fails closed when Supabase is unconfigured or unavailable", async () => {
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  assert.equal((await post("/v1/prompts", { mode: "interview" })).status, 503);
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-only";
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  assert.equal((await post("/v1/prompts", { mode: "interview" })).status, 503);
});
