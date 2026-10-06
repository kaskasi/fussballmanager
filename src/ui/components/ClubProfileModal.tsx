import type { TeamId } from "@fussballmanager/shared";
import { Building2, Star, TrendingUp, User, Users, type LucideIcon } from "lucide-react";
import type { Player } from "../../types/player.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import { buildClubProfile } from "../../sim/club-profiles.ts";

/** WIREFRAME: PRD 09.2 — Vereins-Kurzprofil aus Ligatabelle */
export function ClubProfileModal({
  teamId,
  league,
  players,
  rivalPlayers,
  stadium,
  onClose,
  onOpenStadium,
}: {
  teamId: TeamId;
  league: LeagueState;
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  stadium: ClubStadium;
  onClose: () => void;
  onOpenStadium?: () => void;
}) {
  const profile = buildClubProfile(teamId, {
    playerClubId: league.player_club_id,
    careerPlayers: players,
    rivalPlayers,
    stadium,
    pools: league.league_pools,
  });

  if (!profile) return null;

  return (
    <div className="club-profile-backdrop" role="presentation" onClick={onClose}>
      <div
        className="club-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label={profile.name}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="club-profile-head">
          <div>
            <p className="eyebrow">{profile.divisionLabel}</p>
            <h2>{profile.name}</h2>
            <p className="club-profile-sub">
              Gegründet {profile.founded} · {profile.members.toLocaleString("de-DE")} Mitglieder
            </p>
          </div>
          <button type="button" className="club-profile-close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </header>

        <div className="club-profile-grid">
          <StatCard icon={Users} label="Fanbase" value={String(profile.fanbase)} hint="Zuschauer-Index" />
          <StatCard icon={TrendingUp} label="Kaderstärke" value={String(profile.squadStrength)} hint="Ø Startelf" />
          <StatCard
            icon={Building2}
            label="Stadion"
            value={profile.stadiumName}
            hint={`${profile.stadiumCapacity.toLocaleString("de-DE")} Plätze`}
          />
          <StatCard icon={User} label="Trainer" value={profile.coach} hint="Cheftrainer" />
        </div>

        <section className="club-profile-players" aria-label="Top-Spieler">
          <h3>
            <Star size={16} strokeWidth={2.5} aria-hidden className="club-profile-section-icon" /> Schlüsselspieler
          </h3>
          {profile.bestPlayers.length > 0 ? (
            <ol className="club-profile-player-list">
              {profile.bestPlayers.map((player) => (
                <li key={player.name}>
                  <span className="club-profile-player-name">{player.name}</span>
                  <span className="club-profile-player-role">{player.role}</span>
                  <strong>{player.ca}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="club-profile-empty">Keine Kaderdaten</p>
          )}
        </section>

        {profile.isPlayerClub && onOpenStadium ? (
          <footer className="club-profile-foot">
            <button type="button" className="club-profile-stadium-btn" onClick={onOpenStadium}>
              <Building2 size={16} strokeWidth={2.5} aria-hidden /> Stadion verwalten
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="club-profile-stat">
      <span className="club-profile-stat-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2.5} />
      </span>
      <div>
        <p className="club-profile-stat-label">{label}</p>
        <strong className="club-profile-stat-value">{value}</strong>
        <p className="club-profile-stat-hint">{hint}</p>
      </div>
    </div>
  );
}
