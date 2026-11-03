import { test } from "node:test";
import assert from "node:assert/strict";
import { entranceAt, exitAt } from "../src/entrance.mjs";
import { createProject, compileProject, sanitizeProject } from "../src/timeline.mjs";

test("line exit reverses the geometry transition and leaves the frame empty", () => {
  const exit = {
    type: "line",
    start: 1.5,
    duration: 0.4,
    lineFraction: 0.12,
    easing: "polished",
    baseline: -1,
  };
  assert.equal(exitAt(exit, 1.5), null);
  const closing = exitAt(exit, 1.7);
  const opening = entranceAt({ ...exit, start: 0 }, 0.2);
  assert.equal(closing.hidden, opening.hidden);
  assert.equal(closing.line, opening.line);
  assert.ok(Math.abs(closing.morph - opening.morph) < 1e-12);
  assert.equal(exitAt(exit, 1.9).hidden, true);
  assert.equal(exitAt(exit, 3).hidden, true);
  assert.equal(exitAt(undefined, 3), null);
});
test("line exits remain portable and follow project speed", () => {
  const p = createProject("empty");
  p.tracks[0].exit = {
    type: "line",
    start: 1.5,
    duration: 0.4,
    lineFraction: 0.12,
    easing: "polished",
    baseline: -1,
  };
  const slow = compileProject(sanitizeProject(p)).tracks[0];
  const fast = compileProject(sanitizeProject({ ...p, speed: 2 })).tracks[0];
  assert.equal(slow.exit.start / 2, fast.exit.start);
  assert.equal(slow.exit.duration / 2, fast.exit.duration);
  assert.deepEqual(exitAt(slow.exit, 1.7), exitAt(fast.exit, 0.85));
});
