/**
 * Settings feedback notes. Service role insert; anon key is only the gateway.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const MAX_BODY = 4000;

interface RequestBody {
  text?: string;
  season?: number;
  week?: number;
  screen?: string;
  locale?: string;
  save_version?: number;
  device_id?: string;
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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return jsonResponse({ ok: true });
  if (request.method !== "POST") return jsonResponse({ ok: false }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return jsonResponse({ ok: false }, 500);

  let payload: RequestBody;
  try {
    payload = (await request.json()) as RequestBody;
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  const text = payload.text?.trim() ?? "";
  if (!text || text.length > MAX_BODY) {
    return jsonResponse({ ok: false, error: "invalid_text" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { error } = await supabase.from("player_feedback").insert({
    body: text,
    save_version: payload.save_version ?? null,
    season: payload.season ?? null,
    week: payload.week ?? null,
    screen: payload.screen?.slice(0, 80) ?? null,
    locale: payload.locale?.slice(0, 16) ?? null,
    device_id: payload.device_id?.slice(0, 80) ?? null,
  });
  if (error) return jsonResponse({ ok: false }, 500);
  return jsonResponse({ ok: true });
});
