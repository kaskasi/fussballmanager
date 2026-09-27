import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.ts";
import { SAVE_ROOT } from "./savegame.ts";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  delete process.env.SAVE_ROOT;
});

async function tempSaveRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "fm-api-save-"));
  dirs.push(dir);
  process.env.SAVE_ROOT = dir;
  return dir;
}

describe("save API", () => {
  it("creates and round-trips a folder save through HTTP", async () => {
    await tempSaveRoot();
    const app = await buildApp();
    const created = await app.inject({
      method: "POST",
      url: "/api/save/new",
      payload: {
        playerClubId: "cl_fc_nordstern",
        managerName: "Jan",
        season: 1,
        week: 34,
        masterSeed: 2026,
      },
    });
    expect(created.statusCode).toBe(200);
    const save = created.json();
    expect(save.state.pipeline?.training_plan).toHaveLength(5);

    const put = await app.inject({
      method: "PUT",
      url: "/api/save/nordstern/1",
      payload: { ...save, weekend: true, simulating: false },
    });
    expect(put.statusCode).toBe(200);

    const get = await app.inject({
      method: "GET",
      url: "/api/save/nordstern/1",
    });
    expect(get.statusCode).toBe(200);
    expect(get.json().manifest.manager_name).toBe("Jan");
    expect(path.join(SAVE_ROOT, "savegame_nordstern_1", "manifest.json")).toBeTruthy();
  });
});
