import { describe, expect, it } from "vitest";

describe("D2D Supabase connection", () => {
  it("accepts the configured publishable client credentials", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    expect(url).toMatch(/^https:\/\/[^/]+\.supabase\.co$/);
    expect(publishableKey).toMatch(/^(sb_publishable_|eyJ)/);

    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: publishableKey!,
        Authorization: `Bearer ${publishableKey}`,
      },
    });

    expect(response.status).toBeLessThan(500);
  }, 15_000);
});
