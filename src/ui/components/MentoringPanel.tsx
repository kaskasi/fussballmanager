/** WIREFRAME: PRD 09 — F2.4 Mentoring */
import {
  eligibleMentors,
  isMenteeCandidate,
  isMentorCandidate,
  mentorshipProgressLabel,
} from "../../development/mentoring.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { Hint } from "./Hint.tsx";

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
  const mentees = players.filter((player) => isMenteeCandidate(player, clubId));
  const mentors = players.filter((player) => isMentorCandidate(player, clubId));

  return (
    <section className="mentoring-panel" aria-label="Mentoring">
      <header className="mentoring-head">
        <Hint
          text="Routinier begleitet Talente. Nach ~26 Wochen und Mentor-Drive ≥1.3 kann mentor_ignition auslösen (PRD 06)."
          block
        >
          <h2>🧭 Mentoring</h2>
        </Hint>
        <p className="mentoring-meta">
          {mentees.length} Talente · {mentors.length} mögliche Mentoren
        </p>
      </header>

      {mentees.length === 0 ? (
        <p className="mentoring-empty">Keine U23-Profis im Kader.</p>
      ) : (
        <ul className="mentoring-list">
          {mentees.map((mentee) => {
            const mentorId = mentee.state.mentorship?.mentor_player_id;
            const mentor = mentorId ? players.find((player) => player.id === mentorId) : undefined;
            const options = eligibleMentors(players, mentee, clubId);
            return (
              <li key={mentee.id} className="mentoring-row">
                <div className="mentoring-player">
                  <strong>{formatPlayerName(mentee)}</strong>
                  <small>
                    {mentee.position} · {mentee.age} J. · Moral {mentee.state.morale}
                  </small>
                  <small className="mentoring-progress">
                    {mentorshipProgressLabel(mentee, mentor, season, week)}
                  </small>
                </div>
                <div className="mentoring-actions">
                  <label className="mentoring-select">
                    <span className="sr-only">Mentor für {formatPlayerName(mentee)}</span>
                    <select
                      value={mentorId ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (!value) onClearMentor(mentee.id);
                        else onAssignMentor(mentee.id, value);
                      }}
                    >
                      <option value="">— Mentor wählen —</option>
                      {options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {formatPlayerName(option)} · Führung {option.attributes.leadership}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
