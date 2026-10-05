import assert from "node:assert/strict";
import test from "node:test";
import { buildProfilingBrief } from "../src/lib/profiling-brief.ts";

test("a diverse questionnaire retains its final answers and recommendation request beyond 2,000 characters", () => {
  const answers = Array.from({ length: 13 }, (_, index) => ({
    question: `Preference question ${index + 1}: ${"Describe the room and existing finishes. ".repeat(3)}`,
    answer:
      index === 12
        ? "Grey sofa, beige curtains, oak doors; make the floor a feature."
        : "Cream, ivory and beige; matte finish, moderate daylight, 10,000 RWF/m² maximum.",
  }));
  const content = buildProfilingBrief(answers);
  assert.ok(content.length > 2000);
  assert.ok(content.includes(answers[12].answer));
  assert.ok(content.includes("Question 13:"));
  assert.ok(content.endsWith("please recommend the 3 best tiles."));
});

test("the configured questionnaire can carry maximum-length individual answers within the API brief limit", () => {
  const content = buildProfilingBrief(
    Array.from({ length: 13 }, () => ({
      question: "Q".repeat(300),
      answer: "A".repeat(2000),
    })),
  );
  assert.ok(content.length < 32_768);
  assert.equal((content.match(/A{2000}/g) ?? []).length, 13);
});
