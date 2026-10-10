export interface CloudSaveConfig {
  supabaseUrl: string;
  anonKey: string;
}

export function readCloudSaveConfig(): CloudSaveConfig | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) return null;
  return { supabaseUrl, anonKey };
}

export function cloudSaveFunctionUrl(config: CloudSaveConfig): string {
  const base = config.supabaseUrl.replace(/\/$/, "");
  return `${base}/functions/v1/cloud-save`;
}

export function isCloudSaveEnabled(): boolean {
  return readCloudSaveConfig() != null;
}
