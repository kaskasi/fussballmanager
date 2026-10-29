import { useState } from "react";
import type { TeamId } from "@fussballmanager/shared";
import type { CareerClubChoice } from "../../narrative/career-club-pick.ts";
import type { ProductGameMode } from "../../narrative/game-mode.ts";
import { useT } from "../../i18n/react.ts";
import { ModalShell } from "./primitives/ModalShell.tsx";
import { careerStartDivisionIds } from "../../sim/league-pyramid.ts";

const MODES: ReadonlyArray<{ id: ProductGameMode; icon: string }> = [
  { id: "regionalliga_manager", icon: "📋" },
  { id: "story_mode", icon: "📖" },
];

/**
 * PRD 24 — mode card for a fresh save, between the language pick and the opening story.
 * Regionalliga Manager continues to a club pick (all 36 clubs, ranked by squad strength).
 */
export function NewCareerModeCard({
  clubChoices,
  defaultClubId,
  onPick,
}: {
  clubChoices: readonly CareerClubChoice[];
  defaultClubId: TeamId;
  onPick: (mode: ProductGameMode, clubId?: TeamId) => void;
}) {
  const t = useT();
  const [step, setStep] = useState<"mode" | "club">("mode");
  const [clubId, setClubId] = useState<TeamId>(defaultClubId);

  return (
    <ModalShell
      ariaLabel={t("newCareer.mode.dialogLabel")}
      closeOnBackdrop={false}
      showCloseButton={false}
      panelClassName="opening-modal inbox-modal new-career-modal"
      bodyClassName=""
    >
      <header className="inbox-head">
        <div>
          <p className="eyebrow">{t("newCareer.mode.eyebrow")}</p>
          <h2>{step === "mode" ? t("newCareer.mode.title") : t("newCareer.club.title")}</h2>
        </div>
      </header>
      {step === "mode" ? (
        <>
          <p className="opening-lead">{t("newCareer.mode.lead")}</p>
          <div className="opening-origin-grid">
            {MODES.map(({ id, icon }) => (
              <button
                key={id}
                type="button"
                className="opening-origin-card"
                onClick={() => (id === "regionalliga_manager" ? setStep("club") : onPick(id))}
              >
                <span className="opening-origin-icon" aria-hidden="true">
                  {icon}
                </span>
                <strong>{t(`newCareer.mode.${id}.title`)}</strong>
                <span>{t(`newCareer.mode.${id}.hint`)}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="opening-lead">{t("newCareer.club.lead")}</p>
          <div className="tc-table-wrap new-career-clubs">
            <table className="tc-table tc-table--compact">
              <thead>
                <tr>
                  <th scope="col">{t("newCareer.club.col.club")}</th>
                  <th scope="col" className="tc-num">
                    {t("newCareer.club.col.strength")}
                  </th>
                  <th scope="col" className="tc-num">
                    {t("newCareer.club.col.avgCa")}
                  </th>
                  <th scope="col">{t("newCareer.club.col.goal")}</th>
                </tr>
              </thead>
              {careerStartDivisionIds().map((divisionId) => {
                const rows = clubChoices.filter((choice) => choice.divisionId === divisionId);
                return (
                  <tbody key={divisionId}>
                    <tr>
                      <th scope="colgroup" colSpan={4}>
                        {rows[0]?.divisionLabel}
                      </th>
                    </tr>
                    {rows.map((choice) => (
                      <tr key={choice.teamId} aria-selected={choice.teamId === clubId}>
                        <td>
                          <button
                            type="button"
                            className="tc-sort"
                            aria-pressed={choice.teamId === clubId}
                            onClick={() => setClubId(choice.teamId)}
                          >
                            {choice.name}
                          </button>
                        </td>
                        <td className="tc-num">
                          {choice.strengthRank}/{choice.clubCount}
                        </td>
                        <td className="tc-num">{choice.avgCa.toFixed(1)}</td>
                        <td>{t(`newCareer.club.goal.${choice.tier}`)}</td>
                      </tr>
                    ))}
                  </tbody>
                );
              })}
            </table>
          </div>
          <footer className="opening-actions">
            <button type="button" className="opening-back-btn" onClick={() => setStep("mode")}>
              {t("newCareer.club.back")}
            </button>
            <button
              type="button"
              className="opening-start-btn"
              onClick={() => onPick("regionalliga_manager", clubId)}
            >
              {t("newCareer.club.start", {
                club: clubChoices.find((choice) => choice.teamId === clubId)?.name ?? "",
              })}
            </button>
          </footer>
        </>
      )}
    </ModalShell>
  );
}
