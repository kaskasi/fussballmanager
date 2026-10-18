import {
  cloudSaveFunctionUrl,
  ensureCloudSaveConfig,
  readCloudSaveConfig,
  type CloudSaveConfig,
} from "./cloud-save-config.ts";
import { decodeSaveGameBlob, encodeSaveGameBlob } from "./save-blob.ts";
import { parseSaveJson } from "./save-transfer.ts";
import type { SaveGame } from "./savegame-model.ts";
import { normalizeSyncCodeInput, isValidSyncCode } from "./sync-code.ts";

export type CloudSaveAction = "register" | "push" | "pull";

export interface CloudSavePushMeta {
  save_version: number;
  last_played: string;
  display_name: string;
  byte_size: number;
  client_updated_at: string;
}

export interface CloudSavePullResult {
  save: SaveGame;
  updated_at: string;
  save_version: number;
  last_played: string;
  display_name: string | null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function requireCloudSaveConfig(): Promise<CloudSaveConfig> {
  const config = (await ensureCloudSaveConfig()) ?? readCloudSaveConfig();
  if (!config) throw new Error("cloud_save_not_configured");
  return config;
}

async function invokeCloudSave(
  config: CloudSaveConfig,
  body: Record<string, unknown>,
): Promise<Response> {
  const url = cloudSaveFunctionUrl(config);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.anonKey}`,
      apikey: config.anonKey,
    },
    body: JSON.stringify(body),
  });
}

export async function registerCloudSyncCode(syncCode: string): Promise<void> {
  const config = await requireCloudSaveConfig();
  const code = normalizeSyncCodeInput(syncCode);
  if (!isValidSyncCode(code)) throw new Error("cloud_save_invalid_code");

  const response = await invokeCloudSave(config, { action: "register", sync_code: code });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `cloud_save_register_${response.status}`);
  }
}

export async function pushCloudSave(syncCode: string, save: SaveGame): Promise<string> {
  const config = await requireCloudSaveConfig();
  const code = normalizeSyncCodeInput(syncCode);
  if (!isValidSyncCode(code)) throw new Error("cloud_save_invalid_code");

  const blob = await encodeSaveGameBlob(save);
  const meta: CloudSavePushMeta = {
    save_version: save.manifest.save_version,
    last_played: save.manifest.last_played,
    display_name: save.manifest.manager_name,
    byte_size: blob.byteLength,
    client_updated_at: new Date().toISOString(),
  };

  const response = await invokeCloudSave(config, {
    action: "push",
    sync_code: code,
    blob: bytesToBase64(blob),
    ...meta,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `cloud_save_push_${response.status}`);
  }
  const payload = (await response.json()) as { updated_at?: string };
  return payload.updated_at ?? new Date().toISOString();
}

export async function pullCloudSave(syncCode: string): Promise<CloudSavePullResult> {
  const config = await requireCloudSaveConfig();
  const code = normalizeSyncCodeInput(syncCode);
  if (!isValidSyncCode(code)) throw new Error("cloud_save_invalid_code");

  const response = await invokeCloudSave(config, { action: "pull", sync_code: code });
  if (response.status === 404) throw new Error("cloud_save_not_found");
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `cloud_save_pull_${response.status}`);
  }
  const payload = (await response.json()) as {
    blob: string;
    updated_at: string;
    save_version: number;
    last_played: string;
    display_name: string | null;
  };
  const json = await decodeSaveGameBlob(base64ToBytes(payload.blob));
  const save = parseSaveJson(json);
  return {
    save,
    updated_at: payload.updated_at,
    save_version: payload.save_version,
    last_played: payload.last_played,
    display_name: payload.display_name,
  };
}
