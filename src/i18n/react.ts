import { useSyncExternalStore } from "react";
import { getLocale, subscribeLocale, t as translate } from "./index.ts";
import type { LocaleId } from "./locale-id.ts";

export function useLocale(): LocaleId {
  return useSyncExternalStore(subscribeLocale, getLocale, () => "de" as LocaleId);
}

export function useT(): typeof translate {
  useLocale();
  return translate;
}
