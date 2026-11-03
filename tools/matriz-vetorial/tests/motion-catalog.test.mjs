import { test } from "node:test";
import assert from "node:assert/strict";
import { motionProjects } from "../src/motion-catalog.mjs";
import { reviewFromLink } from "../src/review-projects.mjs";
import { compileProject } from "../src/timeline.mjs";
test("all eight gallery links open their matching project; approval is explicit", () => {
  const entries = motionProjects();
  assert.equal(entries.length, 8);
  assert.equal(entries.filter((x) => x.status === "approved").length, 3);
  assert.equal(entries.filter((x) => x.status === "review").length, 5);
  for (const entry of entries) {
    const project = reviewFromLink("?roteiro=" + entry.id);
    assert.equal(project.name, entry.project.name);
    assert.ok(Math.abs(compileProject(project).duration - entry.duration) < 1e-8);
  }
  assert.equal(reviewFromLink("?roteiro=desconhecido"), null);
});
