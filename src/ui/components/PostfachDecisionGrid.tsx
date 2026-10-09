/** WIREFRAME: design.md §9.4 — Postfach-Entscheidungen als Kachel-Grid */
import {
  Briefcase,
  Building2,
  ClipboardList,
  FileSignature,
  Flag,
  MapPin,
  Newspaper,
  Radar,
  Shield,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Player } from "../../types/player.ts";
import { roundStat } from "../../types/player-display.ts";
import { estimateCa } from "../../transfers/market-value.ts";
import { t } from "../../i18n/index.ts";
import type { DecisionInboxItem } from "../../youth/decision-inbox.ts";
import { isStoryInboxItem } from "../../youth/decision-inbox.ts";
import type { StoryCast } from "../../narrative/story-state.ts";
import type { ScoutJobCompleteNotice } from "../../scouting/scout-job-postfach.ts";
import { isCampLeaderPostfachItemId, parseCampLeaderPostfachItemId } from "../../inbox/postfach-camp-leader.ts";
import { isScoutJobPostfachItemId } from "../../inbox/postfach-scout-job.ts";
import {
  campLeaderQueuePreview,
  inboxQueuePreview,
  scoutJobQueuePreview,
} from "../../inbox/postfach-queue-preview.ts";
import { clubLogoUrlForId } from "../assets/club-logo.ts";
import { ClubCrest } from "./ClubCrest.tsx";
import { PlayerPortrait } from "./PlayerPortrait.tsx";

function storyIcon(kind: DecisionInboxItem["kind"]): LucideIcon {
  switch (kind) {
    case "story_press":
      return Newspaper;
    case "story_fan":
      return Users;
    case "story_captain":
      return Shield;
    case "story_assistant":
      return Briefcase;
    default:
      return Building2;
  }
}

function playerIcon(kind: DecisionInboxItem["kind"]): LucideIcon {
  switch (kind) {
    case "departure_risk":
      return Flag;
    case "promotion":
      return TrendingUp;
    case "contract_offer":
      return FileSignature;
    default:
      return ClipboardList;
  }
}

function DecisionTileVisual({
  queueId,
  pending,
  players,
  storyCast,
  scoutJobNotices,
}: {
  queueId: string;
  pending: readonly DecisionInboxItem[];
  players: readonly Player[];
  storyCast: StoryCast;
  scoutJobNotices: readonly ScoutJobCompleteNotice[];
}) {
  if (isCampLeaderPostfachItemId(queueId)) {
    return (
      <span className="postfach-decision-tile-zone" aria-hidden>
        <MapPin size={22} strokeWidth={2.25} />
      </span>
    );
  }
  if (isScoutJobPostfachItemId(queueId)) {
    const notice = scoutJobNotices.find((entry) => entry.id === queueId);
    if (notice?.kind === "opponent_scout_complete") {
      return (
        <span className="postfach-decision-tile-zone" aria-hidden>
          <Radar size={22} strokeWidth={2.25} />
        </span>
      );
    }
    if (notice?.careerClubId) {
      return (
        <ClubCrest
          size={32}
          initials={(notice.clubName ?? "CL").slice(0, 2)}
          logoSrc={clubLogoUrlForId(notice.careerClubId)}
          alt=""
        />
      );
    }
    return (
      <span className="postfach-decision-tile-zone" aria-hidden>
        <MapPin size={22} strokeWidth={2.25} />
      </span>
    );
  }
  const item = pending.find((entry) => entry.id === queueId);
  if (!item) {
    return (
      <span className="postfach-decision-tile-zone" aria-hidden>
        <ClipboardList size={22} strokeWidth={2.25} />
      </span>
    );
  }
  if (isStoryInboxItem(item)) {
    const Icon = storyIcon(item.kind);
    return (
      <span className="postfach-decision-tile-zone" aria-hidden>
        <Icon size={22} strokeWidth={2.25} />
      </span>
    );
  }
  if (item.kind === "kicker_transfer") {
    return (
      <span className="postfach-decision-tile-zone" aria-hidden>
        <Newspaper size={22} strokeWidth={2.25} />
      </span>
    );
  }
  const player = players.find((entry) => entry.id === item.playerId);
  if (player) {
    return (
      <>
        <PlayerPortrait seed={player.portrait_seed} size="sm" variant="known" />
        <PlayerTileTokens player={player} />
      </>
    );
  }
  const Icon = playerIcon(item.kind);
  return (
    <span className="postfach-decision-tile-zone" aria-hidden>
      <Icon size={22} strokeWidth={2.25} />
    </span>
  );
}

function PlayerTileTokens({ player }: { player: Player }) {
  const ca = roundStat(estimateCa(player.attributes, player.position));
  return (
    <div className="postfach-decision-tile-tokens" aria-hidden>
      <span className="postfach-tile-token">{player.position}</span>
      <span className="postfach-tile-token">{player.age}</span>
      <span className="postfach-tile-token">CA {ca}</span>
    </div>
  );
}

function tileExpandHint(
  queueId: string,
  scoutJobNotices: readonly ScoutJobCompleteNotice[],
): string | null {
  if (isCampLeaderPostfachItemId(queueId)) return t("postfach.tile.openCandidates");
  const notice = scoutJobNotices.find((entry) => entry.id === queueId);
  if (notice?.kind === "opponent_scout_complete") return t("postfach.tile.openReport");
  return null;
}

export function PostfachDecisionGrid({
  queueIds,
  activeId,
  pending,
  players,
  storyCast,
  scoutJobNotices,
  onSelect,
}: {
  queueIds: readonly string[];
  activeId: string | null;
  pending: readonly DecisionInboxItem[];
  players: readonly Player[];
  storyCast: StoryCast;
  scoutJobNotices: readonly ScoutJobCompleteNotice[];
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="postfach-decision-grid" role="list">
      {queueIds.map((queueId) => {
        const preview = isCampLeaderPostfachItemId(queueId)
          ? campLeaderQueuePreview(parseCampLeaderPostfachItemId(queueId)!)
          : isScoutJobPostfachItemId(queueId)
            ? scoutJobQueuePreview(scoutJobNotices.find((notice) => notice.id === queueId))
            : inboxQueuePreview(
                pending.find((item) => item.id === queueId)!,
                players,
                storyCast,
              );
        const isActive = queueId === activeId;
        const expandHint = tileExpandHint(queueId, scoutJobNotices);
        return (
          <li key={queueId}>
            <button
              type="button"
              className={isActive ? "postfach-decision-tile is-active" : "postfach-decision-tile"}
              aria-current={isActive ? "true" : undefined}
              onClick={() => onSelect(queueId)}
            >
              <div className="postfach-decision-tile-visual">
                <DecisionTileVisual
                  queueId={queueId}
                  pending={pending}
                  players={players}
                  storyCast={storyCast}
                  scoutJobNotices={scoutJobNotices}
                />
              </div>
              <div className="postfach-decision-tile-copy">
                <span className="postfach-decision-tile-title">{preview.name}</span>
                <span className="postfach-decision-tile-sub">
                  {expandHint ?? preview.topic}
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
