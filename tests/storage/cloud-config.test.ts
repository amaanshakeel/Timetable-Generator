import { it, expect } from "vitest";
import { cloudConfig } from "../../src/cloud/supabase";
it("keeps cloud backups optional when configuration is absent", () => {
  expect(cloudConfig({})).toBeNull();
});
it("accepts public browser credentials and rejects elevated keys or insecure remote URLs", () => {
  expect(
    cloudConfig({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    })?.url,
  ).toBe("https://example.supabase.co");
  expect(() =>
    cloudConfig({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_not_allowed",
    }),
  ).toThrow(/publishable/i);
  expect(() =>
    cloudConfig({
      VITE_SUPABASE_URL: "http://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    }),
  ).toThrow(/secure/i);
});
