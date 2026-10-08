import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ApiError, request } from "../../../src/services/http.ts";

const realFetch = globalThis.fetch;
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
afterEach(() => {
  globalThis.fetch = realFetch;
  if (originalUrl) process.env.EXPO_PUBLIC_API_URL = originalUrl;
  else delete process.env.EXPO_PUBLIC_API_URL;
});

test("abandoning setup aborts the pending prompt request", async () => {
  process.env.EXPO_PUBLIC_API_URL = "http://coach.test";
  let receivedSignal: AbortSignal | undefined;
  globalThis.fetch = async (_url, init) => {
    receivedSignal = init?.signal as AbortSignal;
    return new Promise((_resolve, reject) => {
      receivedSignal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
  };
  const controller = new AbortController();
  const pending = request("/v1/prompts", "{}", true, controller.signal);
  controller.abort();
  await assert.rejects(pending, /aborted/);
  assert.equal(receivedSignal?.aborted, true);
});

test("a late response cannot complete an abandoned setup even if transport ignores abort", async () => {
  process.env.EXPO_PUBLIC_API_URL = "http://coach.test";
  let resolve!: (response: Response) => void;
  globalThis.fetch = async () => new Promise((done) => { resolve = done; });
  const controller = new AbortController();
  const pending = request("/v1/prompts", "{}", true, controller.signal);
  controller.abort();
  resolve(Response.json({ prompt: "too late" }));
  await assert.rejects(pending, /cancelled/);
});

test("uploads leave multipart boundaries to fetch and propagate retry timing", async () => {
  process.env.EXPO_PUBLIC_API_URL = "http://coach.test";
  globalThis.fetch = async (_url, init) => {
    assert.equal(init?.headers, undefined);
    return Response.json({ error: { message: "Coach busy", retryable: true } }, { status: 429, headers: { "Retry-After": "30" } });
  };
  const before = Date.now();
  await assert.rejects(request("/v1/analyses", new FormData()), (error) =>
    error instanceof ApiError && error.retryable && error.retryAt! >= before + 30000,
  );
});
