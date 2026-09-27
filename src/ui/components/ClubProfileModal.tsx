import type { TeamId } from "@fussballmanager/shared";
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
          <StatCard icon="👥" label="Fanbase" value={String(profile.fanbase)} hint="Zuschauer-Index" />
          <StatCard icon="📈" label="Kaderstärke" value={String(profile.squadStrength)} hint="Ø Startelf" />
          <StatCard
            icon="🏟️"
            label="Stadion"
            value={profile.stadiumName}
            hint={`${profile.stadiumCapacity.toLocaleString("de-DE")} Plätze`}
          />
          <StatCard icon="🧢" label="Trainer" value={profile.coach} hint="Cheftrainer" />
        </div>

        <section className="club-profile-players" aria-label="Top-Spieler">
          <h3>⭐ Schlüsselspieler</h3>
          {profile.bestPlayers.length > 0 ? (
            <ol className="club-profile-player-list">
              {profile.bestPlayers.map((player) => (
                <li key={player.name}>
                  <span className="club-profile-player-name">{player.name}</span>
                  <span className="club-profile-player-role">{player.role}</span>
                  <strong>{player.strength}</strong>
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
              🏟️ Stadion verwalten
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="club-profile-stat">
      <span className="club-profile-stat-icon" aria-hidden="true">{icon}</span>
      <div>
        <p className="club-profile-stat-label">{label}</p>
        <strong className="club-profile-stat-value">{value}</strong>
        <p className="club-profile-stat-hint">{hint}</p>
      </div>
    </div>
  );
}
