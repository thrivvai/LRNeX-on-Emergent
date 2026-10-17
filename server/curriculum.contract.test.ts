import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CURRICULUM_CONTENT_VERSION, D2D_CURRICULUM } from "../shared/curriculum";

type SeededLesson = {
  id?: string;
  slug: string;
  title?: string;
  contentVersion?: string;
  steps?: Array<{ id: string; title: string; prompt: string }>;
};

// Reads the lessons the migrations seed: ids and titles from the demo seed, then content and version
// from the curriculum migration (which updates the vertical-slice lesson in place and inserts the rest).
function seededLessons() {
  const seed = readFileSync("supabase/migrations/20260926090500_d2d_demo_seed.sql", "utf8");
  const curriculum = readFileSync("supabase/migrations/20260927000000_d2d_curriculum_modules.sql", "utf8");
  const content = (sqlLiteral: string) => JSON.parse(sqlLiteral.replaceAll("''", "'")).steps as SeededLesson["steps"];
  const lessons = new Map<string, SeededLesson>();
  for (const [, id, slug, title] of seed.matchAll(/insert into public\.lessons\([^)]*\) values \('([0-9a-f-]{36})','[0-9a-f-]{36}','([^']+)','([^']+)'/g)) {
    lessons.set(slug, { id, slug, title });
  }
  for (const [, contentVersion, json, slug] of curriculum.matchAll(/update public\.lessons\s+set content_version = '([^']+)',\s+framework_phase = '[^']+',\s+content = '(\{.*?\})'::jsonb\s+where slug = '([^']+)'/g)) {
    lessons.set(slug, { ...lessons.get(slug), slug, contentVersion, steps: content(json) });
  }
  for (const [, id, slug, title, contentVersion, json] of curriculum.matchAll(/select '([0-9a-f-]{36})', p\.id, '([^']+)', '([^']+)', '[^']+', '([^']+)', '(\{.*?\})'::jsonb/g)) {
    lessons.set(slug, { id, slug, title, contentVersion, steps: content(json) });
  }
  return lessons;
}

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

  // The UI renders shared/curriculum.ts; progress and telemetry reference the seeded lessons. If the two
  // disagree, students read one text while the database records another.
  it.each(D2D_CURRICULUM.map((module) => [module.slug, module] as const))("%s matches the lesson the database seeds", (slug, module) => {
    const lesson = seededLessons().get(slug);
    expect(lesson).toBeDefined();
    expect(lesson).toMatchObject({ id: module.lessonId, title: module.title, contentVersion: CURRICULUM_CONTENT_VERSION });
    expect(lesson!.steps!.map(({ id, title, prompt }) => ({ id, title, body: prompt }))).toEqual(
      module.steps.map(({ id, title, body }) => ({ id, title, body })),
    );
  });
});
