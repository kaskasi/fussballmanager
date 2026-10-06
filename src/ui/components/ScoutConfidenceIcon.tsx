import { CheckCircle2, CircleHelp, HelpCircle } from "lucide-react";
import type { ConfidenceBucket } from "../../scouting/market-list.ts";

const BUCKET_CLASS: Record<ConfidenceBucket, string> = {
  known: "scout-confidence-icon is-known",
  unclear: "scout-confidence-icon is-unclear",
  unknown: "scout-confidence-icon is-unknown",
};

export function ScoutConfidenceIcon({
  bucket,
  size = 16,
}: {
  bucket: ConfidenceBucket;
  size?: number;
}) {
  const className = BUCKET_CLASS[bucket];
  if (bucket === "known") {
    return <CheckCircle2 className={className} size={size} aria-hidden="true" strokeWidth={2.5} />;
  }
  if (bucket === "unclear") {
    return <HelpCircle className={className} size={size} aria-hidden="true" strokeWidth={2.5} />;
  }
  return <CircleHelp className={className} size={size} aria-hidden="true" strokeWidth={2.5} />;
}
