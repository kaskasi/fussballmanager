import { t } from "./index.ts";

export function youthCampNationLabel(nationId: string, fallback: string): string {
  const key = `youth.camp.nation.${nationId}.label`;
  const translated = t(key);
  return translated === key ? fallback : translated;
}
