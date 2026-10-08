import { test } from "node:test";
import assert from "node:assert/strict";
import { commitState } from "../../../src/services/state-write.ts";
import type { SavedState } from "../../../src/domain/history.ts";

test("failed persistence leaves the visible and current practice intact", async () => {
  const before: SavedState = { attempts: [], practiceGoal: "Reduce fillers" };
  const current = { current: before };
  await assert.rejects(commitState(current, { attempts: [] }, async () => { throw new Error("disk full"); }), /disk full/);
  assert.equal(current.current, before);
});

test("abandoning setup during a save rolls storage back before allowing another mutation", async () => {
  const before: SavedState = { attempts: [], practiceGoal: "Reduce fillers" };
  const current = { current: before };
  const controller = new AbortController();
  const writes: SavedState[] = [];
  let finish!: () => void;
  const pending = commitState(current, { attempts: [], practiceGoal: "New goal" }, async (state) => {
    writes.push(state);
    if (writes.length === 1) await new Promise<void>((resolve) => { finish = resolve; });
  }, controller.signal);
  assert.equal(current.current, before);
  controller.abort();
  finish();
  await assert.rejects(pending, /cancelled/);
  assert.equal(current.current, before);
  assert.equal(writes.at(-1), before);
});

test("a successful write becomes current only after storage completes", async () => {
  const current: { current: SavedState } = { current: { attempts: [] } };
  const next: SavedState = { attempts: [], practiceGoal: "Use shorter sentences" };
  let finish!: () => void;
  const pending = commitState(current, next, async () => new Promise<void>((resolve) => { finish = resolve; }));
  assert.equal(current.current.practiceGoal, undefined);
  finish();
  assert.equal(await pending, next);
  assert.equal(current.current.practiceGoal, "Use shorter sentences");
});
