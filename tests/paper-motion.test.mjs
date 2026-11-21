import assert from "node:assert/strict";
import { test } from "node:test";
import { reducedPaperMotion, withPaperMotion } from "../dist/render/paper-motion.js";

test("paper motion scope restores preferences across nested previews and failed painters", () => {
  assert.equal(reducedPaperMotion(), false);
  const result = withPaperMotion(true, () => {
    assert.equal(reducedPaperMotion(), true);
    withPaperMotion(false, () => assert.equal(reducedPaperMotion(), false));
    assert.equal(reducedPaperMotion(), true);
    assert.throws(() => withPaperMotion(false, () => { throw new Error("paint failed"); }), /paint failed/);
    assert.equal(reducedPaperMotion(), true);
    return 7;
  });
  assert.equal(result, 7);
  assert.equal(reducedPaperMotion(), false);
  assert.throws(() => withPaperMotion(true, () => { throw new Error("world failed"); }), /world failed/);
  assert.equal(reducedPaperMotion(), false);
});
