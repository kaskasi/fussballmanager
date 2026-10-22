/** WIREFRAME: PRD 09 — F2.4 Mentoring, on tc components (design.md §4.3, §9.11) */
import {
  eligibleMentors,
  isMenteeCandidate,
  isMentorCandidate,
  mentorshipProgress,
  type MentorshipProgress,
} from "../../development/mentoring.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { useT } from "../../i18n/react.ts";

function ProgressLine({ progress }: { progress: MentorshipProgress }) {
  const t = useT();
  if (progress.kind === "active") {
    return <span className="tc-state tc-state--good">{t("squad.mentoring.progress.active")}</span>;
  }
  if (progress.kind === "building") {
    return (
      <>
        {t("squad.mentoring.progress.building", {
          weeks: progress.weeks,
          target: progress.target,
          drive: progress.drive.toFixed(2),
        })}
      </>
    );
  }
  return <>{t(`squad.mentoring.progress.${progress.kind}`)}</>;
}

export function MentoringPanel({
  players,
  clubId,
  season,
  week,
  onAssignMentor,
  onClearMentor,
}: {
  players: readonly Player[];
  clubId: string;
  season: number;
  week: number;
  onAssignMentor: (menteeId: string, mentorId: string) => void;
  onClearMentor: (menteeId: string) => void;
}) {
  const t = useT();
  const mentees = players.filter((player) => isMenteeCandidate(player, clubId));
  const mentors = players.filter((player) => isMentorCandidate(player, clubId));

  return (
    <section className="tc-panel" aria-labelledby="squad-mentoring-title">
      <div className="tc-panel__head">
        <h2 className="tc-panel__title" id="squad-mentoring-title">
          {t("squad.mentoring.title")}
        </h2>
        <span className="tc-panel__meta">
          {t("squad.mentoring.meta", { talents: mentees.length, mentors: mentors.length })}
        </span>
      </div>
      <p className="tc-page-sub tc-section__title">{t("squad.mentoring.lead")}</p>

      {mentees.length === 0 ? (
        <p className="tc-empty">{t("squad.mentoring.empty")}</p>
      ) : (
        <ul className="tc-list">
          {mentees.map((mentee) => {
            const mentorId = mentee.state.mentorship?.mentor_player_id;
            const mentor = mentorId ? players.find((player) => player.id === mentorId) : undefined;
            const options = eligibleMentors(players, mentee, clubId);
            const name = formatPlayerName(mentee);
            const selectId = `mentor-${mentee.id}`;
            return (
              <li key={mentee.id} className="tc-list__item tc-list__item--wide tc-list__item--stack-narrow">
                <span className="tc-list__main">
                  <span className="tc-list__name">{name}</span>
                  <span className="tc-list__meta">
                    {t("squad.mentoring.playerMeta", {
                      position: mentee.position,
                      age: mentee.age,
                      morale: mentee.state.morale,
                    })}
                  </span>
                  <span className="tc-list__meta">
                    <ProgressLine progress={mentorshipProgress(mentee, mentor, season, week)} />
                  </span>
                </span>
                <span>
                  <label className="tc-sr" htmlFor={selectId}>
                    {t("squad.mentoring.selectLabel", { name })}
                  </label>
                  <select
                    id={selectId}
                    className="tc-select"
                    value={mentorId ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value) onClearMentor(mentee.id);
                      else onAssignMentor(mentee.id, value);
                    }}
                  >
                    <option value="">{t("squad.mentoring.choose")}</option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {t("squad.mentoring.option", {
                          name: formatPlayerName(option),
                          leadership: option.attributes.leadership,
                        })}
                      </option>
                    ))}
                  </select>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
