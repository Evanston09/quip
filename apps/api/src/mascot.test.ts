import { test } from "node:test";
import assert from "node:assert/strict";
import { MASCOT_MOTIONS } from "../../../src/domain/mascot.ts";

test("koala gestures are finite, return to rest, and stay within gentle joint limits", () => {
  const neutral = { bodyY: 0, head: 0, headY: 0, left: 0, right: 0, eyes: 1 };
  for (const motion of Object.values(MASCOT_MOTIONS)) {
    assert.ok(motion.duration >= 1000 && motion.duration <= 4000);
    assert.deepEqual(motion.frames[0], { t: 0, ...neutral });
    assert.deepEqual(motion.frames.at(-1), { t: 1, ...neutral });
    for (let i = 0; i < motion.frames.length; i++) {
      const frame = motion.frames[i];
      if (i > 0) assert.ok(frame.t > motion.frames[i - 1].t);
      assert.ok(Math.abs(frame.head) <= 7);
      assert.ok(Math.abs(frame.bodyY) <= 5);
      assert.ok(Math.abs(frame.headY) <= 4);
      assert.ok(Math.abs(frame.left) <= 126 && Math.abs(frame.right) <= 126);
      assert.ok(frame.eyes >= 0.08 && frame.eyes <= 1);
      assert.ok(Object.values(frame).every(Number.isFinite));
    }
  }
});
