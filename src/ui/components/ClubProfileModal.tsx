import type { TeamId } from "@fussballmanager/shared";
import { Building2, TrendingUp, User, Users, type LucideIcon } from "lucide-react";
import type { Player } from "../../types/player.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import { buildClubProfile } from "../../sim/club-profiles.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import { getLocale } from "../../i18n/index.ts";
import { localeBcp47 } from "../../i18n/locale-id.ts";
import { useT } from "../../i18n/react.ts";
import { ratingBand } from "../design/rating-band.ts";
import { ModalShell } from "./primitives/ModalShell.tsx";

/** WIREFRAME: PRD 09.2 — Vereins-Kurzprofil aus Ligatabelle, on tc-modal (design.md §4.3). */
export function ClubProfileModal({
  teamId,
  league,
  players,
  rivalPlayers,
  stadium,
  worldClubs,
  onClose,
  onOpenStadium,
}: {
  teamId: TeamId;
  league: LeagueState;
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  stadium: ClubStadium;
  worldClubs: readonly WorldClub[];
  onClose: () => void;
  onOpenStadium?: () => void;
}) {
  const t = useT();
  const profile = buildClubProfile(teamId, {
    playerClubId: league.player_club_id,
    careerPlayers: players,
    rivalPlayers,
    stadium,
    pools: league.league_pools,
    worldClubs,
  });

  if (!profile) return null;

  const number = new Intl.NumberFormat(localeBcp47(getLocale()));
  const facts = [
    profile.place,
    t("clubProfile.founded", { year: profile.founded }),
    t("clubProfile.members", { count: number.format(profile.members) }),
  ].filter(Boolean);

  return (
    <ModalShell
      variant="tc"
      ariaLabel={profile.name}
      onClose={onClose}
      title={
        <>
          <span className="tc-label">{profile.divisionLabel}</span>
          <h2 className="tc-modal__title">{profile.name}</h2>
          <p className="tc-modal__sub">{facts.join(" · ")}</p>
        </>
      }
      footer={
        profile.isPlayerClub && onOpenStadium ? (
          <button type="button" className="tc-btn tc-btn--primary" onClick={onOpenStadium}>
            <Building2 className="tc-icon" aria-hidden /> {t("clubProfile.manageStadium")}
          </button>
        ) : undefined
      }
    >
      <dl className="tc-stats">
        <Stat icon={Users} label={t("clubProfile.fanbase")} value={String(profile.fanbase)} hint={t("clubProfile.fanbaseHint")} />
        <Stat
          icon={TrendingUp}
          label={t("clubProfile.squadStrength")}
          value={String(profile.squadStrength)}
          hint={t("clubProfile.squadStrengthHint")}
        />
        <Stat
          icon={Building2}
          label={t("clubProfile.stadium")}
          value={profile.stadiumName}
          hint={t("clubProfile.capacity", { count: number.format(profile.stadiumCapacity) })}
        />
        <Stat
          icon={User}
          label={t("clubProfile.coach")}
          value={profile.coach || t("clubProfile.coachUnknown")}
          hint={t("clubProfile.coachHint")}
        />
      </dl>

      <section aria-labelledby="club-profile-key-players">
        <h3 className="tc-label tc-section__title" id="club-profile-key-players">
          {t("clubProfile.keyPlayers")}
        </h3>
        {profile.bestPlayers.length > 0 ? (
          <ol className="tc-list">
            {profile.bestPlayers.map((player, index) => (
              <li key={player.name} className="tc-list__item">
                <span className="tc-list__rank">{index + 1}</span>
                <span className="tc-list__main">
                  <span className="tc-list__name">{player.name}</span>
                  <span className="tc-list__meta">{player.role}</span>
                </span>
                <span
                  className={`tc-rating tc-rating--${ratingBand(player.ca)}`}
                  aria-label={t("clubProfile.caAria", { ca: player.ca })}
                >
                  {player.ca}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="tc-empty">{t("clubProfile.noSquadData")}</p>
        )}
      </section>
    </ModalShell>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint: string }) {
  return (
    <div className="tc-stats__item">
      <dt className="tc-label tc-stats__label">
        <Icon className="tc-icon" aria-hidden="true" />
        {label}
      </dt>
      <dd>
        <span className="tc-stat__value">{value}</span>
        <span className="tc-caption">{hint}</span>
      </dd>
    </div>
  );
}
