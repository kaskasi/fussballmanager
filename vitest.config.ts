import { defineConfig } from "vitest/config";

const isCi = Boolean(process.env.CI);

/** Client-side unit tests (`npm run test:client`). */
export default defineConfig({
  test: {
    include: [
      "src/development/**/*.test.ts",
      "src/hub/**/*.test.ts",
      "src/player/**/*.test.ts",
      "src/youth/**/*.test.ts",
      "src/stadium/**/*.test.ts",
      "src/economy/**/*.test.ts",
      "src/inbox/**/*.test.ts",
      "src/world/**/*.test.ts",
      "src/persistence/**/*.test.ts",
      "src/ui/**/*.test.ts",
      "src/sim/**/*.test.ts",
      "src/transfers/**/*.test.ts",
      "src/narrative/**/*.test.ts",
      "src/telemetry/**/*.test.ts",
      "src/board/**/*.test.ts",
      "src/match/**/*.test.ts",
      "src/playtest/**/*.test.ts",
      "src/press/**/*.test.ts",
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
