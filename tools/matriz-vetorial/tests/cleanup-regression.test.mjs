import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createProject, compileProject } from "../src/timeline.mjs";

// Captured from the working version before cleanup; IDs intentionally vary.
const fixtures = JSON.parse(
  await readFile(new URL("./fixtures/behavior-before-cleanup.json", import.meta.url)),
);

test("the cleaned compiler preserves all 30 pre-cleanup scenarios", () => {
  for (const fixture of fixtures) {
    const project = createProject(fixture.kind);
    project.geometry = fixture.geometry;
    project.speed = fixture.speed;
    const compiled = JSON.stringify(compileProject(project), (key, value) =>
      ["id", "stepId", "parentId"].includes(key) ? undefined : value,
    );
    const actual = createHash("sha256").update(compiled).digest("hex");
    assert.equal(actual, fixture.sha256, `${fixture.kind}/${fixture.geometry}/${fixture.speed}`);
  }
});
