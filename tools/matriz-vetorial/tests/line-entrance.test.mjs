import { test } from "node:test";
import assert from "node:assert/strict";
import { entranceAt } from "../src/entrance.mjs";
import { compileProject, sanitizeProject, poseAt } from "../src/timeline.mjs";
import assembly from "../src/roteiros/01-acervo-mattar.json" with { type: "json" };

test("six staggered lines become forms while their native rotations begin", () => {
  const compiled = compileProject(sanitizeProject(assembly));
  let previous = -1;
  for (const c of compiled.tracks) {
    const entry = c.entrance;
    assert.equal(entry.type, "line");
    assert.ok(entry.start > previous);
    previous = entry.start;
    assert.equal(entranceAt(entry, 0).hidden, true);
    const line = entranceAt(entry, entry.start + entry.duration * 0.06);
    assert.ok(line.line > 0 && line.line < 1);
    assert.equal(line.morph, 0);
    const middle = entranceAt(entry, entry.start + entry.duration * 0.5);
    assert.equal(middle.line, 1);
    assert.ok(middle.morph > 0 && middle.morph < 1);
    const end = entry.start + entry.duration;
    assert.equal(entranceAt(entry, end), null);
    assert.ok(c.segments[0].end < end);
    const turning = poseAt(c, entry.start + entry.duration / 2);
    assert.equal(turning.type, "rotate");
    assert.ok(turning.pose.angle > 0 && turning.pose.angle < 90);
    assert.equal(entranceAt(undefined, 0), null);
  }
});

test("portable line entrances follow the authored project speed", () => {
  const slow = compileProject(sanitizeProject(assembly));
  const fast = compileProject(sanitizeProject({ ...assembly, speed: 2 }));
  for (let i = 0; i < slow.tracks.length; i++) {
    const a = slow.tracks[i].entrance,
      b = fast.tracks[i].entrance;
    assert.equal(a.start / 2, b.start);
    assert.equal(a.duration / 2, b.duration);
    const time = a.start + a.duration * 0.37;
    assert.deepEqual(entranceAt(a, time), entranceAt(b, time / 2));
  }
});
