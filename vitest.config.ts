import { defineConfig } from "vitest/config";

const isCi = Boolean(process.env.CI);

/** Client-side unit tests (`npm run test:client`). */
export default defineConfig({
  test: {
    include: [
      "src/persistence/**/*.test.ts",
      "src/ui/**/*.test.ts",
      "src/sim/**/*.test.ts",
      "src/narrative/**/*.test.ts",
      "src/telemetry/**/*.test.ts",
    ],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    teardownTimeout: 30_000,
    // Long league sims block a fork; single fork on CI avoids vitest-worker RPC timeouts.
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: isCi,
        maxForks: isCi ? 1 : undefined,
      },
    },
    fileParallelism: !isCi,
  },
});
