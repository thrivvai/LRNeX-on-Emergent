import { describe, expect, it } from "vitest";
import { STAGE_ONE_CHECKPOINT, STAGE_ONE_ROUTES } from "../shared/stage-one";

describe("Stage One experience contract", () => {
  it("defines all four representative screens", () => {
    expect(Object.values(STAGE_ONE_ROUTES)).toEqual([
      "/",
      "/student",
      "/lesson",
      "/admin",
    ]);
  });

  it("keeps the Stage Three journey in the required order", () => {
    expect(STAGE_ONE_CHECKPOINT.studentJourney).toEqual([
      "student-entry",
      "pretest",
      "lesson",
      "saved-progress",
      "posttest",
      "student-result",
      "staff-analytics",
    ]);
  });

  it("labels the current checkpoint honestly", () => {
    expect(STAGE_ONE_CHECKPOINT.status).toBe("persisted-vertical-slice");
  });
});
