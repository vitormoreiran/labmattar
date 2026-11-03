import { test } from "node:test";
import assert from "node:assert/strict";
import {
  track,
  step,
  compileTrack,
  compileProject,
  poseAt,
  routeTrack,
  createProject,
  sanitizeProject,
  ease,
} from "../src/timeline.mjs";
import { collapseUnpairedChannels } from "../src/morph-continuity.mjs";
import {
  trackDestination,
  iconRotationStep,
  setTrackDestination,
} from "../src/script-controls.mjs";
test("project speed scales delays and all segments without changing the authored timing", () => {
  const p = createProject("composition"),
    original = structuredClone(p),
    normal = compileProject(p);
  p.speed = 2;
  const fast = compileProject(p);
  assert.equal(fast.duration, normal.duration / 2);
  for (let i = 0; i < 6; i++) {
    assert.equal(fast.tracks[i].delay, normal.tracks[i].delay / 2);
    assert.deepEqual(p.tracks[i], original.tracks[i]);
    assert.equal(
      poseAt(fast.tracks[i], normal.tracks[i].segments[1].start / 2 + 0.1).type,
      "morph",
    );
  }
  assert.equal(sanitizeProject(p).speed, 2);
  p.speed = 1;
  assert.equal(compileProject(p).duration, normal.duration);
});
test("destination controls replace both directions, flag experiments, and keep the letter and layout", () => {
  const p = createProject("m-form"),
    t = p.tracks[0],
    position = { ...t.position },
    turn = iconRotationStep(t);
  setTrackDestination(t, "P2", p.geometry);
  assert.equal(trackDestination(t), "P2");
  assert.equal(t.startAsset, "M");
  assert.deepEqual(t.position, position);
  assert.equal(iconRotationStep(t).id, turn.id);
  assert.deepEqual(
    t.steps.filter((s) => s.type === "morph").map((s) => [s.target, s.experimental]),
    [
      ["P2", true],
      ["M", true],
    ],
  );
  assert.equal(compileProject(p).tracks[0].warnings.length, 0);
  setTrackDestination(t, "P8", p.geometry);
  assert.ok(t.steps.filter((s) => s.type === "morph").every((s) => !s.experimental));
  assert.throws(() => setTrackDestination(t, "P99", p.geometry));
});
test("polished easing has stationary velocity and acceleration at both joins", () => {
  const h = 0.0001;
  assert.equal(ease(0, "polished"), 0);
  assert.equal(ease(1, "polished"), 1);
  assert.ok(ease(h, "polished") / h < 1e-5);
  assert.ok((1 - ease(1 - h, "polished")) / h < 1e-5);
  assert.ok(Math.abs((ease(2 * h, "polished") - 2 * ease(h, "polished")) / (h * h)) < 0.01);
  for (let i = 1; i <= 100; i++)
    assert.ok(ease(i / 100, "polished") >= ease((i - 1) / 100, "polished"));
});
test("refined M route keeps one uninterrupted spin and preserves easing on import", () => {
  const p = createProject("m-form"),
    c = compileProject(p).tracks[0];
  assert.deepEqual(
    c.segments.map((s) => s.type),
    ["hold", "rotate", "morph", "rotate", "morph", "rotate", "hold"],
  );
  assert.equal(c.segments[3].to.angle - c.segments[3].from.angle, 360);
  assert.ok(
    sanitizeProject(p)
      .tracks[0].steps.filter((s) => s.type !== "hold")
      .every((s) => s.easing === "polished"),
  );
});
test("M + Forma uses prepared profiles and returns frontally after one complete turn", () => {
  const p = createProject("m-form"),
    c = compileProject(p);
  assert.equal(c.tracks.length, 1);
  assert.equal(c.tracks[0].warnings.length, 0);
  assert.equal(
    c.tracks[0].segments.some((s) => s.automatic),
    false,
  );
  assert.deepEqual(c.tracks[0].endPose, { asset: "M", angle: 360 });
  assert.ok(Math.abs(c.duration - 10.8) < 1e-9);
});
test("rhythmic word enters left to right, returns right to left and holds the complete word", () => {
  const p = createProject("mattar-rhythm"),
    c = compileProject(p);
  assert.equal(c.tracks.length, 6);
  const morphs = c.tracks.map((t) => t.segments.filter((s) => s.type === "morph"));
  for (let i = 0; i < 6; i++) {
    assert.equal(c.tracks[i].warnings.length, 0);
    assert.equal(
      c.tracks[i].segments.some((s) => s.automatic),
      false,
    );
    assert.ok(c.tracks[i].segments.every((s) => s.duration >= 0.1));
    assert.equal(c.tracks[i].endPose.asset, p.tracks[i].startAsset);
    assert.equal(c.tracks[i].endPose.angle, 360);
    if (i) {
      assert.ok(morphs[i][0].start > morphs[i - 1][0].start);
      assert.ok(morphs[i][1].start < morphs[i - 1][1].start);
    }
  }
  assert.ok(Math.abs(c.duration - 5.8) < 1e-9);
});
test("a full spin is preserved as movement and the next clip inherits 450 degrees", () => {
  const t = track();
  t.steps = [
    step("rotate", { degrees: 90 }),
    step("morph", { target: "P8" }),
    step("rotate", { degrees: 360 }),
    step("hold"),
  ];
  const c = compileTrack(t);
  assert.equal(c.endPose.angle, 450);
  assert.equal(c.segments.at(-1).from.angle, 450);
  assert.equal(c.endPose.asset, "P8");
});
test("a profile bridge prepares the correct view without resetting the accumulated turn", () => {
  const t = track();
  t.startAngle = 360;
  t.steps = [step("morph", { target: "P8" })];
  const c = compileTrack(t);
  assert.equal(c.segments.length, 2);
  assert.equal(c.segments[0].automatic, true);
  assert.equal(c.segments[0].to.angle, 450);
  assert.equal(c.endPose.angle, 450);
});
test("known bridges work in reverse and preserve stable step IDs", () => {
  const t = track("P8");
  const s = step("morph", { target: "M" });
  t.steps = [s];
  const c = compileTrack(t);
  assert.equal(c.segments.at(-1).bridge, "M-P8");
  assert.equal(c.segments[0].stepId, s.id);
  assert.equal(c.endPose.asset, "M");
});
test("unprepared combinations are not silently used", () => {
  const t = track("M");
  t.steps = [step("morph", { target: "P1" })];
  assert.equal(compileTrack(t).segments.length, 0);
  t.steps[0].experimental = true;
  assert.equal(compileTrack(t).segments.at(-1).experimental, true);
});
test("route returns to the starting identity while retaining a full revolution", () => {
  const c = compileTrack(routeTrack());
  assert.equal(c.endPose.asset, "M");
  assert.equal(c.endPose.angle, 360);
  assert.equal(c.duration, 17);
});
test("delay and final holds are deterministic at boundaries", () => {
  const t = track("P3");
  t.delay = 2;
  t.steps = [
    step("rotate", { degrees: 90, duration: 2, easing: "linear" }),
    step("hold", { duration: 1 }),
  ];
  const c = compileTrack(t);
  assert.equal(poseAt(c, 1).pose.angle, 0);
  assert.equal(poseAt(c, 3).pose.angle, 45);
  assert.equal(poseAt(c, 4).pose.angle, 90);
  assert.equal(poseAt(c, 5).pose.angle, 90);
});
test("parallel composition ends after the last delayed track", () => {
  const p = createProject("composition");
  const c = compileProject(p);
  assert.equal(c.tracks.length, 6);
  assert.equal(c.duration, 18.2);
});
test("portable import validates known assets and allocates new stable IDs", () => {
  const p = createProject();
  const restored = sanitizeProject(JSON.parse(JSON.stringify(p)));
  assert.notEqual(restored.tracks[0].id, p.tracks[0].id);
  assert.equal(restored.tracks[0].steps.length, 5);
  p.tracks[0].startAsset = "javascript:alert(1)";
  assert.throws(() => sanitizeProject(p));
});
test("an emerging hole starts at zero area rather than copying the filled outer contour", () => {
  const outer = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
    hole = [
      { x: 45, y: 45 },
      { x: 55, y: 45 },
      { x: 55, y: 55 },
      { x: 45, y: 55 },
    ],
    matrix = {
      a: [outer, outer],
      b: [outer, hole],
      sourceIndices: [0, null],
      targetIndices: [0, 1],
    };
  collapseUnpairedChannels(matrix);
  assert.equal(new Set(matrix.a[1].map((p) => `${p.x},${p.y}`)).size, 1);
  assert.equal(matrix.a[1][0].x, 50);
  assert.deepEqual(matrix.a[0], outer);
  assert.deepEqual(matrix.b[1], hole);
});
test("a disappearing contour ends at zero area while retaining equal interpolation lengths", () => {
  const triangle = [
      { x: 10, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ],
    matrix = { a: [triangle], b: [triangle], sourceIndices: [1], targetIndices: [null] };
  collapseUnpairedChannels(matrix);
  assert.equal(matrix.a[0].length, matrix.b[0].length);
  assert.equal(new Set(matrix.b[0].map((p) => `${p.x},${p.y}`)).size, 1);
});
test("the two T recipes preserve the version difference between source studies and final montage", () => {
  const t = track("T1");
  t.startAngle = 90;
  t.steps = [step("morph", { target: "P4" })];
  assert.equal(compileTrack(t, "volume").segments.length, 1);
  assert.equal(compileTrack(t, "silhouette").warnings.length, 1);
});
