import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "./config.ts";

describe("resolveDatabaseUrl", () => {
  it("prefers DATABASE_URL over the local default", () => {
    expect(
      resolveDatabaseUrl({ DATABASE_URL: "postgres://example/db" }, "/tmp"),
    ).toBe("postgres://example/db");
  });

  it("falls back to the docker-compose credentials", () => {
    expect(resolveDatabaseUrl({}, "/tmp/no-env-here")).toBe(
      "postgres://fussballmanager:fussballmanager@localhost:5432/fussballmanager",
    );
  });
});
