import { SAVE_VERSION } from "../persistence/savegame-model.ts";
import { GAME_VERSION } from "../persistence/savegame-model.ts";

const DEVICE_KEY = "fc-tycoon-device-id";

export function getOrCreateDeviceId(): string {
  if (typeof localStorage === "undefined") return "server";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function deviceIdPrefix(id: string): string {
  return id.slice(0, 8);
}

export function sniffPlatform(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("steam")) return "steam";
  if (/iphone|ipad|android|mobile/.test(ua)) return "mobile";
  return "desktop";
}

export function buildSessionHeaderContext(input: {
  locale: string;
  deviceId: string;
}): string {
  const build =
    typeof import.meta.env.VITE_APP_BUILD === "string"
      ? import.meta.env.VITE_APP_BUILD
      : import.meta.env.MODE;
  const ua =
    typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80).replace(/\s+/g, " ") : "";
  return [
    `build=${build}`,
    `game_v=${GAME_VERSION}`,
    `save_v=${SAVE_VERSION}`,
    `locale=${input.locale}`,
    `device=${deviceIdPrefix(input.deviceId)}`,
    `platform=${sniffPlatform(typeof navigator !== "undefined" ? navigator.userAgent : "")}`,
    `ua=${ua}`,
  ].join(" ");
}

export function weekContextLabel(season: number, week: number, weekday: number, slot: number): string {
  return `S${season} W${week} d${weekday} slot=${slot} save_v=${SAVE_VERSION}`;
}
