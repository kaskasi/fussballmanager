/**
 * WIREFRAME: PRD 09 — F2.4 Mentoring as a slot grid, same layout as Individual training (ADR 0002).
 * Header: pairs used and where the slots come from. Grid: one card per slot (taken, free, locked).
 * Free slot → pick a talent → pick a mentor. Taken slot → change or end the pairing.
 */
import { useMemo, useState } from "react";
import { HeartHandshake, Lock, Plus } from "lucide-react";
import { careerProYears } from "../../development/experience.ts";
import {
  eligibleMentors,
  isMenteeCandidate,
  isMentorCandidate,
  mentorQuality,
  mentorshipProgress,
  mentorshipWeeks,
  MENTORSHIP_WEEKS_FOR_SIGNAL,
  MENTOR_MIN_PRO_YEARS,
  teachableAttributes,
  type MentorshipProgress,
} from "../../development/mentoring.ts";
import {
  MENTORING_SLOTS_CAP,
  mentoringSlots,
  type MentoringSlotPart,
  type MentoringSlots,
  type MentoringSlotUnlock,
} from "../../development/mentoring-capacity.ts";
import { t } from "../../i18n/index.ts";
import { formatDecimal } from "../../i18n/number-display.ts";
import { useT } from "../../i18n/react.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName, formatPlayerPositionLabel } from "../../types/player-display.ts";
import { attributeLabel } from "../player-profile.ts";
import { useGameSession } from "../session/GameSessionContext.tsx";
import { Hint } from "./Hint.tsx";
import { PlayerPortrait } from "./PlayerPortrait.tsx";
import { ModalShell } from "./primitives/ModalShell.tsx";

function ProgressLine({ progress }: { progress: MentorshipProgress }) {
  const tr = useT();
  if (progress.kind === "active") {
    return <span className="tc-state tc-state--good">{tr("squad.mentoring.progress.active")}</span>;
  }
  if (progress.kind === "building") {
    return (
      <>
        {tr("squad.mentoring.progress.building", {
          weeks: progress.weeks,
          target: progress.target,
          drive: progress.drive.toFixed(2),
        })}
      </>
    );
  }
  return <>{tr(`squad.mentoring.progress.${progress.kind}`)}</>;
}

function partLabel(part: MentoringSlotPart): string {
  if (part.source === "base") return t("squad.mentoring.part.base");
  if (part.source === "clubhouse") return t("squad.mentoring.part.clubhouse", { level: part.level ?? 1 });
  return t("squad.mentoring.part.restaurant");
}

function unlockLabel(unlock: MentoringSlotUnlock): string {
  if (unlock.source === "clubhouse") return t("squad.mentoring.unlock.clubhouse", { level: unlock.level ?? 1 });
  return t("squad.mentoring.unlock.restaurant");
}

/** Locked cards show what unlocks the next slots, never beyond the cap. */
function slotsToShowLocked(slots: MentoringSlots): MentoringSlotUnlock[] {
  const room = Math.max(0, MENTORING_SLOTS_CAP - slots.total);
  return slots.next.slice(0, room);
}

function QualityBar({ mentor }: { mentor: Player }) {
  const tr = useT();
  const pct = Math.round(mentorQuality(mentor) * 100);
  return (
    <span className="mentoring__quality" title={tr("squad.mentoring.qualityHint")}>
      <span className="tc-caption">{tr("squad.mentoring.quality")}</span>
      <span className="tc-bar" aria-hidden>
        <span className="tc-bar__fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="tc-caption mentoring__pct">{pct}%</span>
    </span>
  );
}

function TeachChips({ mentee, mentor }: { mentee: Player; mentor: Player }) {
  const tr = useT();
  const taught = teachableAttributes(mentee, mentor);
  if (taught.length === 0) {
    return <span className="tc-caption">{tr("squad.mentoring.teachesNothing")}</span>;
  }
  return (
    <ul className="tc-chips mentoring__teach" aria-label={tr("squad.mentoring.teaches")}>
      {taught.map((entry) => (
        <li key={entry.attribute} className="tc-chip tc-chip--dense mentoring__chip">
          {attributeLabel(entry.attribute)} <strong>+{Math.round(entry.gap)}</strong>
        </li>
      ))}
    </ul>
  );
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
  const tr = useT();
  const { session } = useGameSession();
  const slots = useMemo(() => mentoringSlots(session.stadium.precinct), [session.stadium.precinct]);
  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const mentees = players.filter((player) => isMenteeCandidate(player, clubId));
  const pairs = mentees.filter((player) => player.state.mentorship);
  const open = mentees.filter((player) => !player.state.mentorship);
  const mentorCount = players.filter((player) => isMentorCandidate(player, clubId)).length;
  const [picking, setPicking] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  const free = Math.max(0, slots.total - pairs.length);
  const locked = slotsToShowLocked(slots);

  return (
    <section className="training-solo mentoring" aria-labelledby="squad-mentoring-title">
      <header className="tc-panel training-solo__head">
        <div className="training-solo__count">
          <span className="tc-label" id="squad-mentoring-title">
            {tr("squad.mentoring.title")}
          </span>
          <Hint text={tr("squad.mentoring.lead", { years: MENTOR_MIN_PRO_YEARS })}>
            <span className="training-solo__used">
              {tr("squad.mentoring.slotsUsed", { used: pairs.length, total: slots.total })}
            </span>
          </Hint>
        </div>
        <div className="training-solo__sources">
          <ul className="tc-chips" aria-label={tr("squad.mentoring.slotsHow")}>
            {slots.parts.map((part) => (
              <li key={part.source} className="tc-chip tc-chip--dense training-solo__source">
                {partLabel(part)} <strong>+{part.slots}</strong>
              </li>
            ))}
          </ul>
          {slots.next.length > 0 && slots.total < MENTORING_SLOTS_CAP ? (
            <p className="tc-caption">
              {tr("squad.mentoring.more")} {slots.next.map(unlockLabel).join(" · ")}
            </p>
          ) : null}
          <p className="tc-caption">
            {tr("squad.mentoring.meta", { talents: mentees.length, mentors: mentorCount })}
          </p>
        </div>
      </header>

      {pairs.length > slots.total ? (
        <p className="tc-callout tc-callout--warn" role="status">
          {tr("squad.mentoring.overCapacity")}
        </p>
      ) : null}

      {mentees.length === 0 ? <p className="tc-empty">{tr("squad.mentoring.empty")}</p> : null}

      <ul className="training-solo__grid" aria-label={tr("squad.mentoring.title")}>
        {pairs.map((mentee) => (
          <li key={mentee.id}>
            <TakenSlot
              mentee={mentee}
              mentor={byId.get(mentee.state.mentorship!.mentor_player_id)}
              season={season}
              week={week}
              onOpen={() => setSelectedId(mentee.id)}
            />
          </li>
        ))}
        {Array.from({ length: free }, (_, index) => (
          <li key={`free_${index}`}>
            <button
              type="button"
              className="training-solo__slot training-solo__slot--free"
              disabled={open.length === 0 || mentorCount === 0}
              onClick={() => setPicking(true)}
            >
              <Plus className="tc-icon" aria-hidden />
              <span className="training-solo__free-title">{tr("squad.mentoring.assign")}</span>
              <span className="tc-caption">
                {mentorCount === 0
                  ? tr("squad.mentoring.noMentors", { years: MENTOR_MIN_PRO_YEARS })
                  : tr("squad.mentoring.freeSlot")}
              </span>
            </button>
          </li>
        ))}
        {locked.map((unlock, index) => (
          <li key={`locked_${index}`}>
            <div className="training-solo__slot training-solo__slot--locked">
              <Lock className="tc-icon" aria-hidden />
              <span className="training-solo__free-title">{tr("squad.mentoring.lockedSlot")}</span>
              <span className="tc-caption">{unlockLabel(unlock)}</span>
            </div>
          </li>
        ))}
      </ul>

      {picking ? (
        <MenteePicker
          mentees={open}
          onClose={() => setPicking(false)}
          onPick={(playerId) => {
            setPicking(false);
            setSelectedId(playerId);
          }}
        />
      ) : null}

      {selected ? (
        <MentorPairModal
          mentee={selected}
          players={players}
          clubId={clubId}
          onClose={() => setSelectedId(null)}
          onAssign={(mentorId) => {
            onAssignMentor(selected.id, mentorId);
            setSelectedId(null);
          }}
          onEnd={() => {
            onClearMentor(selected.id);
            setSelectedId(null);
          }}
        />
      ) : null}
    </section>
  );
}

function TakenSlot({
  mentee,
  mentor,
  season,
  week,
  onOpen,
}: {
  mentee: Player;
  mentor: Player | undefined;
  season: number;
  week: number;
  onOpen: () => void;
}) {
  const tr = useT();
  const link = mentee.state.mentorship!;
  const weeks = mentorshipWeeks(link, season, week);
  const pct = Math.min(100, Math.round((weeks / MENTORSHIP_WEEKS_FOR_SIGNAL) * 100));
  const gained = link.gained ?? 0;
  return (
    <button type="button" className="training-solo__slot training-solo__slot--taken" onClick={onOpen}>
      <span className="training-solo__who">
        <PlayerPortrait seed={mentee.portrait_seed} nationality={mentee.nationality} clubId={mentee.club_id} size="sm" />
        <span className="training-solo__id">
          <span className="training-solo__name">{formatPlayerName(mentee)}</span>
          <span className="tc-caption">
            {formatPlayerPositionLabel(mentee)} · {tr("training.individual.age", { age: mentee.age })}
          </span>
        </span>
        <HeartHandshake className="tc-icon mentoring__icon" aria-hidden />
      </span>
      <span className="training-solo__program">
        {mentor
          ? tr("squad.mentoring.mentorLine", { name: formatPlayerName(mentor) })
          : tr("squad.mentoring.progress.unavailable")}
      </span>
      {mentor ? <TeachChips mentee={mentee} mentor={mentor} /> : null}
      <span className="training-solo__progress">
        <span className="tc-bar" aria-hidden>
          <span className="tc-bar__fill" style={{ width: `${pct}%` }} />
        </span>
        <span className="tc-caption">
          <ProgressLine progress={mentorshipProgress(mentee, mentor, season, week)} />
        </span>
      </span>
      <span className={gained <= 0.05 ? "training-solo__effect is-empty" : "training-solo__effect"}>
        {gained <= 0.05
          ? tr("squad.mentoring.effect.none")
          : tr("squad.mentoring.effect.gain", { value: formatDecimal(gained, 1) })}
        {" · "}
        {tr("squad.mentoring.effect.moodForm", {
          morale: Math.round(mentee.state.morale),
          form: formatDecimal(mentee.state.form, 1),
        })}
      </span>
    </button>
  );
}

function MenteePicker({
  mentees,
  onClose,
  onPick,
}: {
  mentees: Player[];
  onClose: () => void;
  onPick: (playerId: string) => void;
}) {
  const tr = useT();
  return (
    <ModalShell
      variant="tc"
      ariaLabel={tr("squad.mentoring.pickTalent")}
      title={
        <>
          <h2 className="tc-modal__title">{tr("squad.mentoring.pickTalent")}</h2>
          <p className="tc-modal__sub">{tr("squad.mentoring.pickTalentHint")}</p>
        </>
      }
      onClose={onClose}
    >
      <ul className="training-solo__pick-list">
        {mentees.map((player) => (
          <li key={player.id}>
            <button type="button" className="mentoring__pick" onClick={() => onPick(player.id)}>
              <span className="training-solo__name">{formatPlayerName(player)}</span>
              <span className="tc-caption">
                {formatPlayerPositionLabel(player)} · {tr("training.individual.age", { age: player.age })}
              </span>
              <span className="tc-caption">
                {tr("squad.mentoring.moodForm", {
                  morale: Math.round(player.state.morale),
                  form: formatDecimal(player.state.form, 1),
                })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </ModalShell>
  );
}

function MentorPairModal({
  mentee,
  players,
  clubId,
  onClose,
  onAssign,
  onEnd,
}: {
  mentee: Player;
  players: readonly Player[];
  clubId: string;
  onClose: () => void;
  onAssign: (mentorId: string) => void;
  onEnd: () => void;
}) {
  const tr = useT();
  const current = mentee.state.mentorship?.mentor_player_id ?? null;
  const options = useMemo(() => eligibleMentors(players, mentee, clubId), [players, mentee, clubId]);
  const [choice, setChoice] = useState<string | null>(current ?? options[0]?.id ?? null);
  const changed = choice !== null && choice !== current;

  return (
    <ModalShell
      variant="tc"
      ariaLabel={tr("squad.mentoring.selectLabel", { name: formatPlayerName(mentee) })}
      title={
        <div className="training-solo__modal-id">
          <PlayerPortrait seed={mentee.portrait_seed} nationality={mentee.nationality} clubId={mentee.club_id} size="md" />
          <div>
            <p className="tc-label">
              {formatPlayerPositionLabel(mentee)} · {tr("training.individual.age", { age: mentee.age })}
            </p>
            <h2 className="tc-modal__title">{formatPlayerName(mentee)}</h2>
          </div>
        </div>
      }
      onClose={onClose}
      footer={
        <>
          {current ? (
            <button type="button" className="tc-btn tc-btn--ghost" onClick={onEnd}>
              {tr("squad.mentoring.end")}
            </button>
          ) : null}
          <button
            type="button"
            className="tc-btn tc-btn--primary"
            disabled={!changed}
            onClick={() => choice && onAssign(choice)}
          >
            {current ? tr("squad.mentoring.change") : tr("squad.mentoring.start")}
          </button>
        </>
      }
    >
      <div className="training-solo__form">
        <p className="tc-caption">{tr("squad.mentoring.rules", { years: MENTOR_MIN_PRO_YEARS })}</p>
        {options.length === 0 ? (
          <p className="tc-empty">{tr("squad.mentoring.noMentors", { years: MENTOR_MIN_PRO_YEARS })}</p>
        ) : (
          <ul className="mentoring__mentor-list" role="radiogroup" aria-label={tr("squad.mentoring.choose")}>
            {options.map((mentor) => (
              <li key={mentor.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={choice === mentor.id}
                  className={choice === mentor.id ? "mentoring__mentor is-active" : "mentoring__mentor"}
                  onClick={() => setChoice(mentor.id)}
                >
                  <span className="mentoring__mentor-id">
                    <span className="training-solo__name">{formatPlayerName(mentor)}</span>
                    <span className="tc-caption">
                      {formatPlayerPositionLabel(mentor)} ·{" "}
                      {tr("squad.mentoring.proYears", { years: careerProYears(mentor) })} ·{" "}
                      {tr("squad.mentoring.leadership", { value: Math.round(mentor.attributes.leadership) })}
                    </span>
                  </span>
                  <QualityBar mentor={mentor} />
                  <TeachChips mentee={mentee} mentor={mentor} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ModalShell>
  );
}
