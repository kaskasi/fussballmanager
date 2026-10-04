import type { PipelineStage } from "../player/growth-heatmap.ts";
import { t } from "./index.ts";

export function pipelineStageDisplay(stage: PipelineStage): string {
  return t(`hub.stage.${stage}`);
}
