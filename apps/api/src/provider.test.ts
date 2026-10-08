import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { generate, ServiceError } from "./provider.ts";

const schema = z.object({ text: z.string().min(1), audience: z.string().min(1) });
const question = { text: "Describe a time you learned from a mistake.", audience: "Interviewer" };
const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENROUTER_API_KEY;
const originalWarn = console.warn;
beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-only";
  console.warn = () => {};
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalKey;
});
const response = (content: string, finish_reason = "stop") =>
  Response.json({ choices: [{ finish_reason, message: { content } }] });

test("a malformed question gets one retry and the successful question is validated", async () => {
  let calls = 0;
  globalThis.fetch = async () => response(JSON.stringify(++calls === 1 ? { text: question.text } : question));
  assert.deepEqual(await generate(schema, "Generate an interview question."), question);
  assert.equal(calls, 2);
});

test("persistent invalid questions fail after two requests with question-specific copy", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response('{"text":"unfinished'); };
  await assert.rejects(generate(schema, "Generate a question."), (error) =>
    error instanceof ServiceError && error.code === "INVALID_PROVIDER_RESPONSE" && /question/.test(error.message));
  assert.equal(calls, 2);
});

test("JSON fences are formatting only; missing fields still fail validation", async () => {
  globalThis.fetch = async () => response(`\`\`\`json\n${JSON.stringify(question)}\n\`\`\``);
  assert.deepEqual(await generate(schema, "Generate a question."), question);
  globalThis.fetch = async () => response('```json\n{"text":"Question"}\n```');
  await assert.rejects(generate(schema, "Generate a question."), ServiceError);
});

test("audio failures, refusals, and rate limits are not automatically resubmitted", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response("invalid"); };
  await assert.rejects(generate(schema, "Analyze speech.", { data: "test", format: "wav" }), ServiceError);
  assert.equal(calls, 1);
  globalThis.fetch = async () => { calls++; return Response.json({ choices: [{ message: { refusal: "Cannot comply" } }] }); };
  await assert.rejects(generate(schema, "Generate a question."), ServiceError);
  assert.equal(calls, 2);
  globalThis.fetch = async () => { calls++; return new Response("{}", { status: 429 }); };
  await assert.rejects(generate(schema, "Generate a question."), ServiceError);
  assert.equal(calls, 3);
});

test("truncated output is rejected even when its JSON happens to parse", async () => {
  globalThis.fetch = async () => response(JSON.stringify(question), "length");
  await assert.rejects(generate(schema, "Generate a question."), ServiceError);
});

test("non-JSON success envelopes fail as provider errors without logging private output", async () => {
  const logs: unknown[][] = [];
  console.warn = (...args: unknown[]) => { logs.push(args); };
  globalThis.fetch = async () => new Response("Private speech text, not JSON");
  await assert.rejects(generate(schema, "Generate a question."), (error) =>
    error instanceof ServiceError && error.status === 502);
  assert.equal(logs.length, 2);
  assert.equal(JSON.stringify(logs).includes("Private speech text"), false);
});
