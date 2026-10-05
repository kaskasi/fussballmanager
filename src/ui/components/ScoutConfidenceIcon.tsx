import { CheckCircle2, CircleHelp, HelpCircle } from "lucide-react";
import type { ConfidenceBucket } from "../../scouting/market-list.ts";

export function ScoutConfidenceIcon({
  bucket,
  size = 16,
}: {
  bucket: ConfidenceBucket;
  size?: number;
}) {
  if (bucket === "known") return <CheckCircle2 size={size} aria-hidden="true" strokeWidth={2.5} />;
  if (bucket === "unclear") return <HelpCircle size={size} aria-hidden="true" strokeWidth={2.5} />;
  return <CircleHelp size={size} aria-hidden="true" strokeWidth={2.5} />;
}
