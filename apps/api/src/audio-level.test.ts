import { test } from "node:test";
import assert from "node:assert/strict";
import { audioLevel } from "../../../src/domain/audio-level.ts";

test("microphone display stays flat for silence, scales with sound, and clamps overloads", () => {
  assert.equal(audioLevel(-160), 0);
  assert.equal(audioLevel(-60), 0);
  assert.ok(audioLevel(-40)! < audioLevel(-20)!);
  assert.equal(audioLevel(-6), 1);
  assert.equal(audioLevel(5), 1);
});

test("missing and non-finite measurements remain unavailable instead of showing fake activity", () => {
  for (const reading of [undefined, NaN, Infinity, -Infinity])
    assert.equal(audioLevel(reading), undefined);
});
