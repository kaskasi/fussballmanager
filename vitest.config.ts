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
    reporters: isCi ? ["verbose"] : ["default"],
    // One worker on CI: long league sims must not block vitest RPC (fork pool) or flood parallel workers.
    pool: isCi ? "threads" : "forks",
    poolOptions: isCi
      ? {
          threads: {
            singleThread: true,
          },
        }
      : {
          forks: {
            singleFork: false,
          },
        },
    fileParallelism: !isCi,
  },
});
