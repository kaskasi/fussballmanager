import type { MatchView, MatchViewFrame } from "@fussballmanager/shared";

const ROLE_ORDER = ["GK", "CB", "FB", "DM", "CM", "AM", "W", "ST"] as const;

type LineupProps = {
  view: MatchView;
  frame: MatchViewFrame;
  fullClubNames?: boolean;
};

export function Lineup({ view, frame, fullClubNames = false }: LineupProps) {
  const onPitch = new Set(frame.dots.map((dot) => dot.playerId));
  const homeTitle = fullClubNames ? view.home.name : view.home.shortName;
  const awayTitle = fullClubNames ? view.away.name : view.away.shortName;
  return (
    <div className="lineups">
      <Side
        title={homeTitle}
        teamId={view.home.id}
        view={view}
        onPitch={onPitch}
        carrierId={frame.ballCarrierId}
        accent="home"
      />
      <Side
        title={awayTitle}
        teamId={view.away.id}
        view={view}
        onPitch={onPitch}
        carrierId={frame.ballCarrierId}
        accent="away"
      />
    </div>
  );
}

function Side(props: {
  title: string;
  teamId: string;
  view: MatchView;
  onPitch: Set<string>;
  carrierId: string | null;
  accent: "home" | "away";
}) {
  const players = props.view.roster
    .filter((player) => player.teamId === props.teamId && player.starter)
    .slice()
    .sort(
      (a, b) =>
        a.shirt - b.shirt ||
        ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
    );

  return (
    <section className={`xi xi-${props.accent}`}>
      <h2>{props.title}</h2>
      <ol>
        {players.map((player) => {
          const live = props.onPitch.has(player.id);
          const hasBall = player.id === props.carrierId;
          return (
            <li
              key={player.id}
              className={hasBall ? "has-ball" : live ? undefined : "off"}
            >
              <span className="shirt">{player.shirt}</span>
              <span className="role">{player.role}</span>
              <span>{player.name}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
