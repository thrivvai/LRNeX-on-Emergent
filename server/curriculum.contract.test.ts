import { describe, expect, it } from "vitest";
import { D2D_CURRICULUM } from "../shared/curriculum";

describe("D2D curriculum package", () => {
  it("ships the four standards-aligned field notes", () => {
    expect(D2D_CURRICULUM.map((module) => module.slug)).toEqual([
      "the-money-you-pay",
      "credit-choices",
      "payment-plan-model",
      "carry-it-forward",
    ]);
    expect(D2D_CURRICULUM.every((module) => module.steps.length === 3)).toBe(true);
    expect(D2D_CURRICULUM.every((module) => module.standards.length > 0)).toBe(true);
  });

  it("keeps practice grounded in the behavior thesis", () => {
    const firstStep = D2D_CURRICULUM[0].steps[0];
    expect(firstStep.practice?.choices.length).toBe(3);
    expect(firstStep.practice?.answer).toBe("new_balance");
    expect(firstStep.callout).toContain("New balance");
  });
});
