import { useMemo, useState } from "react";
import { TrainingPixelHoverLine } from "./TrainingPixelHoverLine.tsx";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import {
  attributeHeatCellIntensity,
  formatAttributeHeatDelta,
  formatAttributeHeatSumPrecise,
  squadAttributeTrainingHeatmap,
  type AttributeTrainingCell,
} from "../../player/attribute-training-heatmap.ts";
import { SLOT_COUNT } from "../../development/weekly-plan.ts";
import type { Attributes, Player } from "../../types/player.ts";
import {
  ATTRIBUTE_GROUPS,
  attributeLabel,
  EXTRA_SKILL_KEYS,
} from "../player-profile.ts";

const ATTR_ABBR: Record<AttributeTrainingCell["key"], string> = {
  shooting: "SCH",
  passing: "PAS",
  dribbling: "DRB",
  technique: "TEC",
  pace: "PAC",
  strength: "STK",
  stamina: "AUS",
  composure: "GEL",
  leadership: "FHR",
  positioning: "POS",
  vision: "VIS",
  concentration: "KON",
  teamwork: "TEA",
  weak_foot: "2F",
  gk_handling: "TW",
};

type AttrHeatTone = "idle" | "hot";

const LEGEND_TONES: readonly AttrHeatTone[] = ["hot", "idle"];

function cellForKey(cells: readonly AttributeTrainingCell[], key: keyof Attributes) {
  return cells.find((cell) => cell.key === key) ?? { key, gainSum: 0 };
}

/**
 * WIREFRAME: PRD 09.3b — Team attribute heatmap (grouped like player profile).
 */
export function AttributeTrainingHeatmap({
  players,
  clubId,
  season,
  week,
  trainingUnitsCompleted = 0,
  slotCount = SLOT_COUNT,
  compact = true,
}: {
  players: readonly Player[];
  clubId: string;
  season: number;
  week: number;
  trainingUnitsCompleted?: number;
  slotCount?: number;
  /** Desktop training uses compact strip; mobile uses full grouped layout. */
  compact?: boolean;
}) {
  useT();
  const [legendOpen, setLegendOpen] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<keyof Attributes | null>(null);
  const cells = useMemo(
    () => squadAttributeTrainingHeatmap(players, clubId, season, week),
    [players, clubId, season, week],
  );
  const hovered = hoveredKey ? cellForKey(cells, hoveredKey) : null;

  const groups = [
    ...ATTRIBUTE_GROUPS.map((group) => ({
      id: group.id,
      label: t(`player.attributeGroup.${group.id}`),
      keys: group.keys,
    })),
    {
      id: "extra",
      label: t("training.attrHeat.groupExtra"),
      keys: EXTRA_SKILL_KEYS,
    },
  ];

  return (
    <section
      className={`attr-training-heat training-pixel-pack ${compact ? "is-compact" : "is-full"}`}
      aria-label={t("training.attrHeat.aria")}
    >
      <div className="pipeline-heat-head">
        <p className="pipeline-heat-label">{t("training.attrHeat.title")}</p>
        <button
          type="button"
          className="pipeline-legend-toggle"
          aria-label={t("training.attrHeat.legend.toggle")}
          aria-pressed={legendOpen}
          title={t("training.attrHeat.legend.toggle")}
          onClick={() => setLegendOpen((open) => !open)}
        >
          ?
        </button>
      </div>

      {legendOpen ? (
        <div className="pipeline-heat-legend pipeline-heat-legend-swatches" role="note">
          <p className="pipeline-heat-legend-lead">{t("training.attrHeat.legend.onePerAttribute")}</p>
          <ul className="pipeline-heat-legend-list">
            {LEGEND_TONES.map((tone) => (
              <li key={tone}>
                {tone === "hot" ? (
                  <span className="heat-legend-swatch-pair" aria-hidden="true">
                    <span className="heat-legend-swatch attr-heat-pixel is-hot is-legend-weak" />
                    <span className="heat-legend-swatch attr-heat-pixel is-hot is-legend-strong" />
                  </span>
                ) : (
                  <span className="heat-legend-swatch attr-heat-pixel is-idle" aria-hidden="true" />
                )}
                <span>{t(`training.attrHeat.legend.${tone}`)}</span>
              </li>
            ))}
          </ul>
          <p className="pipeline-heat-legend-hint">{t("training.attrHeat.legend.hover")}</p>
        </div>
      ) : null}

      <div className="training-pixel-bar attr-training-pixel-bar" role="list" aria-label={t("training.attrHeat.aria")}>
        {groups.map((group) => (
          <div
            key={group.id}
            className="training-pixel-stage"
            role="group"
            aria-label={group.label}
          >
            <p className="pipeline-heat-label training-pixel-stage-label">{group.label}</p>
            <div className="pipeline-heat training-pixel-row">
              {group.keys.map((key) => {
                const cell = cellForKey(cells, key);
                const tone: AttrHeatTone = cell.gainSum > 0.000_1 ? "hot" : "idle";
                const deltaLabel = formatAttributeHeatDelta(cell.gainSum);
                return (
                  <button
                    key={key}
                    type="button"
                    role="listitem"
                    className={`attr-heat-pixel is-${tone}`}
                    style={{
                      opacity: attributeHeatCellIntensity(
                        cell.gainSum,
                        trainingUnitsCompleted,
                        slotCount,
                      ),
                    }}
                    aria-label={`${attributeLabel(key)}, ${formatAttributeHeatSumPrecise(cell.gainSum)}`}
                    title={`${attributeLabel(key)} ${deltaLabel}`}
                    onMouseEnter={() => setHoveredKey(key)}
                    onMouseLeave={() => setHoveredKey((k) => (k === key ? null : k))}
                    onFocus={() => setHoveredKey(key)}
                    onBlur={() => setHoveredKey((k) => (k === key ? null : k))}
                  >
                    <span className="attr-heat-pixel-face">
                      {ATTR_ABBR[key]}
                      <small>{deltaLabel}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <TrainingPixelHoverLine
        idleLabel={t("training.attrHeat.hoverCompact")}
        activeTitle={hovered ? attributeLabel(hovered.key) : null}
        activeDetail={
          hovered
            ? t("training.attrHeat.hoverDetail", {
                delta: formatAttributeHeatDelta(hovered.gainSum),
                precise: formatAttributeHeatSumPrecise(hovered.gainSum),
              })
            : null
        }
      />
    </section>
  );
}
