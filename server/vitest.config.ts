import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Engine battery tests simulate many full matches; CI runners need more headroom.
    testTimeout: 30_000,
  },
});
