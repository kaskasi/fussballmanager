/**
 * PRD 18 — Sync-Code cloud save (register / push / pull).
 * Secrets: SYNC_CODE_PEPPER, SUPABASE_SERVICE_ROLE_KEY (default in Supabase Edge).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const PEPPER = Deno.env.get("SYNC_CODE_PEPPER") ?? "";
const MAX_BLOB_BYTES = 8 * 1024 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 120;

type Action = "register" | "push" | "pull";

interface RequestBody {
  action?: Action;
  sync_code?: string;
  blob?: string;
  save_version?: number;
  last_played?: string;
  display_name?: string;
  byte_size?: number;
  client_updated_at?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

async function hashSyncCode(code: string): Promise<string> {
  const normalized = code.trim().toLowerCase().replace(/\s+/g, "");
  const data = new TextEncoder().encode(`${normalized}:${PEPPER}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isValidCode(code: string): boolean {
  return /^fuss-[23456789abcdefghjkmnpqrstuvwxyz]{4}-[23456789abcdefghjkmnpqrstuvwxyz]{4}$/.test(
    code.trim().toLowerCase(),
  );
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  hash: string,
): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / RATE_WINDOW_MS) * RATE_WINDOW_MS).toISOString();
  const { data: row } = await supabase
    .from("cloud_save_rate")
    .select("request_count")
    .eq("sync_code_hash", hash)
    .eq("window_start", windowStart)
    .maybeSingle();

  const count = (row?.request_count as number | undefined) ?? 0;
  if (count >= RATE_MAX_PER_WINDOW) return false;

  await supabase.from("cloud_save_rate").upsert(
    {
      sync_code_hash: hash,
      window_start: windowStart,
      request_count: count + 1,
    },
    { onConflict: "sync_code_hash,window_start" },
  );
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }
  if (!PEPPER) {
    return jsonResponse({ error: "sync_pepper_missing" }, 503);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const action = body.action;
  const syncCode = body.sync_code?.trim().toLowerCase() ?? "";
  if (!action || !syncCode || !isValidCode(syncCode)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const hash = await hashSyncCode(syncCode);
  const allowed = await checkRateLimit(supabase, hash);
  if (!allowed) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  if (action === "register") {
    const { error } = await supabase.from("cloud_saves").upsert(
      {
        sync_code_hash: hash,
        blob: new Uint8Array(0),
        save_version: 0,
        byte_size: 0,
        display_name: body.display_name ?? null,
      },
      { onConflict: "sync_code_hash", ignoreDuplicates: true },
    );
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ ok: true });
  }

  if (action === "pull") {
    const { data, error } = await supabase
      .from("cloud_saves")
      .select("blob, save_version, last_played, display_name, updated_at, byte_size")
      .eq("sync_code_hash", hash)
      .maybeSingle();
    if (error) return jsonResponse({ error: error.message }, 500);
    if (!data || !data.byte_size || data.byte_size <= 0) {
      return jsonResponse({ error: "not_found" }, 404);
    }
    const blobBytes = data.blob instanceof Uint8Array ? data.blob : new Uint8Array(data.blob as ArrayBuffer);
    return jsonResponse({
      blob: bytesToBase64(blobBytes),
      save_version: data.save_version,
      last_played: data.last_played,
      display_name: data.display_name,
      updated_at: data.updated_at,
    });
  }

  if (action === "push") {
    if (!body.blob || body.save_version == null) {
      return jsonResponse({ error: "invalid_push" }, 400);
    }
    const bytes = base64ToBytes(body.blob);
    if (bytes.byteLength > MAX_BLOB_BYTES) {
      return jsonResponse({ error: "blob_too_large" }, 413);
    }
    const { data, error } = await supabase
      .from("cloud_saves")
      .upsert(
        {
          sync_code_hash: hash,
          blob: bytes,
          save_version: body.save_version,
          last_played: body.last_played ?? null,
          display_name: body.display_name ?? null,
          byte_size: bytes.byteLength,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "sync_code_hash" },
      )
      .select("updated_at")
      .single();
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ ok: true, updated_at: data.updated_at });
  }

  return jsonResponse({ error: "unknown_action" }, 400);
});
