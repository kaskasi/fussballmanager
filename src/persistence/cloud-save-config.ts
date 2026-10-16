export interface CloudSaveConfig {
  supabaseUrl: string;
  anonKey: string;
}

let runtimeConfig: CloudSaveConfig | null = null;
let runtimeAttempted = false;

export function readCloudSaveConfig(): CloudSaveConfig | null {
  if (runtimeConfig) return runtimeConfig;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) return null;
  return { supabaseUrl, anonKey };
}

/** Worker runtime config when the Vite build was not given Supabase env. */
export async function ensureCloudSaveConfig(): Promise<CloudSaveConfig | null> {
  const baked = readCloudSaveConfig();
  if (baked) return baked;
  if (runtimeAttempted || typeof fetch === "undefined") return null;
  runtimeAttempted = true;
  try {
    const response = await fetch("/api/client-config");
    if (!response.ok) return null;
    const body = (await response.json()) as {
      supabaseUrl?: string | null;
      supabaseAnonKey?: string | null;
    };
    const supabaseUrl = body.supabaseUrl?.trim();
    const anonKey = body.supabaseAnonKey?.trim();
    if (!supabaseUrl || !anonKey) return null;
    runtimeConfig = { supabaseUrl, anonKey };
    return runtimeConfig;
  } catch {
    return null;
  }
}

export function cloudSaveFunctionUrl(config: CloudSaveConfig): string {
  const base = config.supabaseUrl.replace(/\/$/, "");
  return `${base}/functions/v1/cloud-save`;
}

export function isCloudSaveEnabled(): boolean {
  return readCloudSaveConfig() != null;
}
