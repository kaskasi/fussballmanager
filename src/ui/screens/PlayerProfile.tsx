import { useState } from "react";
import {
  profileMenuItems,
  type PlayerProfileAction,
} from "../../player/profile-actions.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { confidenceLabel, type AbilityEstimate } from "../../scouting/estimate-model.ts";
import {
  formatScoutCa,
  formatScoutStateValue,
  scoutReveal,
} from "../../scouting/scout-visibility.ts";
import { Hint } from "../components/Hint.tsx";
import { ProfileActionsMenu } from "../components/ProfileActionsMenu.tsx";
import {
  achievementBadges,
  contractView,
  flavorForScout,
  seasonStatsStub,
} from "../player-flavor.ts";
import {
  formatCaDelta,
  formatRecentGrowth,
  playerCa,
  weeklyCaDelta,
} from "../../player/ca-tracking.ts";
import {
  attributeBars,
  attributeLabel,
  formMark,
  growthPolyline,
  growthSeries,
  layoutGrowthChart,
  profileFacts,
  stateMark,
  visibleBreakoutFlags,
} from "../player-profile.ts";

type ProfileTab = "overview" | "development" | "stats" | "contract";

const TABS: { id: ProfileTab; label: string; icon: string }[] = [
  { id: "overview", label: "Überblick", icon: "📋" },
  { id: "development", label: "Entwicklung", icon: "📈" },
  { id: "stats", label: "Statistik", icon: "⚽" },
  { id: "contract", label: "Vertrag", icon: "✍️" },
];

export interface PlayerProfileProps {
  player: Player;
  owned: boolean;
  scoutEstimate?: AbilityEstimate;
  scouting?: boolean;
  week?: number;
  season?: number;
  transferWindowOpen?: boolean;
  transferBudget?: number;
  purchasePrice?: number;
  saleOffer?: number;
  saleBlockedReason?: string | null;
  shortlisted?: boolean;
  onBack: () => void;
  onOpenYouth?: () => void;
  onAssignScout?: () => void;
  onToggleShortlist?: () => void;
  onPurchase?: () => void;
  preContractBonus?: number;
  preContractBlockedReason?: string | null;
  onPreContract?: () => void;
  onSell?: () => void;
  onProfileAction?: (action: PlayerProfileAction) => void;
  actionFeedback?: string | null;
}

export function PlayerProfile({
  player,
  owned,
  scoutEstimate,
  scouting = false,
  week,
  season = 1,
  transferBudget,
  purchasePrice,
  saleOffer,
  saleBlockedReason = null,
  onBack,
  onOpenYouth,
  onAssignScout,
  transferWindowOpen = false,
  shortlisted = false,
  onToggleShortlist,
  onPurchase,
  preContractBonus,
  preContractBlockedReason = null,
  onPreContract,
  onSell,
  onProfileAction,
  actionFeedback = null,
}: PlayerProfileProps) {
  const [tab, setTab] = useState<ProfileTab>(owned ? "development" : "overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuItems = profileMenuItems(player, owned, season);
  const canAffordPurchase =
    purchasePrice === undefined || transferBudget === undefined || transferBudget >= purchasePrice;
  const reveal = scoutEstimate ? scoutReveal(scoutEstimate.uncertaintyRange) : null;
  const fitness = stateMark(player.state.fitness);
  const morale = stateMark(player.state.morale);
  const form = formMark(player.state.form);
  const bars = attributeBars(player, owned, scoutEstimate);
  const growth = owned
    ? growthSeries(player, season)
    : reveal?.showExactCa
      ? [{ season: 1, ca: Number(formatScoutCa(player, scoutEstimate!, false)) }]
      : [];
  const timeline = visibleBreakoutFlags(player.hidden.breakout_flags);
  const scoutLabel =
    owned || !scoutEstimate
      ? null
      : confidenceLabel({ status: "scouted", estimate: scoutEstimate });
  const ca = owned
    ? formatScoutCa(player, scoutEstimate ?? { estimatedAbilityMean: 65, uncertaintyRange: 0, sampleSize: 0 }, true)
    : scoutEstimate
      ? formatScoutCa(player, scoutEstimate, false)
      : "?";
  const facts = profileFacts(player, owned);
  const metaLine = facts.map((fact) => `${fact.icon} ${fact.value}`).join(" · ");
  const flavor = flavorForScout(player, owned, scoutEstimate);
  const achievements = achievementBadges(player, owned, scoutEstimate);
  const stats = seasonStatsStub(player, owned, scoutEstimate);
  const contract = contractView(player, owned, scoutEstimate);

  return (
    <main className="profile">
      <header className="profile-toolbar">
        <button type="button" onClick={onBack} aria-label="Zurück">
          ←
        </button>
        <p className="profile-toolbar-title eyebrow">Spieler{week ? ` · Woche ${week}` : ""}</p>
        {owned && onProfileAction ? (
          <ProfileActionsMenu
            open={menuOpen}
            items={menuItems}
            onToggle={() => setMenuOpen((open) => !open)}
            onClose={() => setMenuOpen(false)}
            onSelect={onProfileAction}
          />
        ) : null}
      </header>

      {actionFeedback ? (
        <p className="profile-feedback" role="status">{actionFeedback}</p>
      ) : null}

      <article className="profile-card">
        <div className="profile-identity">
          <span className="profile-portrait" aria-hidden="true">{positionGlyph(player.position)}</span>
          <div className="profile-identity-body">
            <Hint text="Spielername. Fremde Spieler werden erst durch Scouting besser bekannt." block>
              <h1 className="profile-name">{formatPlayerName(player)}</h1>
            </Hint>
            <div className="profile-identity-stats">
              <Hint text="Hauptposition auf dem Platz.">
                <span className="profile-stat">{player.position}</span>
              </Hint>
              <Hint text="Alter in Jahren.">
                <span className="profile-stat">{player.age} J.</span>
              </Hint>
              <Hint text="Current Ability — geschätzte Gesamtstärke.">
                <span className="profile-stat profile-stat-ca">CA {ca}</span>
              </Hint>
              {scoutLabel ? (
                <Hint text="Wie gut dein Verein diesen Spieler kennt.">
                  <span className="profile-scout-badge">{scoutLabel}</span>
                </Hint>
              ) : null}
            </div>
            <Hint text="Stammdaten auf einen Blick." block>
              <p className="profile-meta-line">{metaLine}</p>
            </Hint>
          </div>
        </div>

        <nav className="profile-tabs" aria-label="Profil-Bereiche">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={tab === entry.id ? "profile-tab is-active" : "profile-tab"}
              aria-current={tab === entry.id ? "page" : undefined}
              onClick={() => setTab(entry.id)}
            >
              <span aria-hidden="true">{entry.icon}</span>
              {entry.label}
            </button>
          ))}
        </nav>

        <div className="profile-card-divider" />

        {tab === "overview" ? (
          <OverviewTab flavor={flavor} achievements={achievements} owned={owned} />
        ) : null}
        {tab === "development" ? (
          <DevelopmentTab
            player={player}
            owned={owned}
            scoutEstimate={scoutEstimate}
            fitness={fitness}
            morale={morale}
            form={form}
            bars={bars}
            growth={growth}
            timeline={timeline}
            reveal={reveal}
          />
        ) : null}
        {tab === "stats" ? <StatsTab stats={stats} owned={owned} /> : null}
        {tab === "contract" ? <ContractTab contract={contract} /> : null}
      </article>

      {!owned && onAssignScout ? (
        <div className="profile-actions">
          <Hint text="Scout beobachtet den Spieler jede Woche. Pipeline → Woche simulieren." block>
            <button type="button" className="profile-scout" onClick={onAssignScout} disabled={scouting}>
              {scouting ? "🟢 Scout aktiv · Bericht nach Wochensim" : "👁️ Diesen Spieler scouten"}
            </button>
          </Hint>
          {onToggleShortlist ? (
            <button type="button" className="profile-scout" onClick={onToggleShortlist}>
              {shortlisted ? "⭐ Merkliste" : "☆ Merken"}
            </button>
          ) : null}
          {onPurchase ? (
            <Hint
              text={
                !transferWindowOpen
                  ? "Transfers nur im Sommer- (KW 27–34) und Winterfenster (KW 2–4)."
                  : !canAffordPurchase
                    ? `Transfer-Budget reicht nicht (ca. ${formatMoney(purchasePrice ?? 0)} nötig).`
                    : "Angebot nach Marktwert — Gegenangebot möglich."
              }
              block
            >
              <button
                type="button"
                className="profile-scout"
                onClick={onPurchase}
                disabled={!transferWindowOpen || !canAffordPurchase}
              >
                💰 Kaufen{purchasePrice ? ` · ca. ${formatMoney(purchasePrice)}` : ""}
              </button>
            </Hint>
          ) : null}
          {onPreContract ? (
            <Hint
              text={
                preContractBlockedReason ??
                "Vorvertrag ab 6 Monate vor Vertragsende. Signaturbonus 10–15 % der gesparten Ablöse — 1–3 Liga-Mitbieter."
              }
              block
            >
              <button
                type="button"
                className="profile-scout"
                onClick={onPreContract}
                disabled={Boolean(preContractBlockedReason)}
              >
                ✍️ Vorvertrag{preContractBonus ? ` · ca. ${formatMoney(preContractBonus)}` : ""}
              </button>
            </Hint>
          ) : null}
        </div>
      ) : null}

      {owned && onSell ? (
        <div className="profile-actions">
          <Hint
            text={
              saleBlockedReason ??
              (!transferWindowOpen
                ? "Verkauf nur im Sommer- (KW 27–34) und Winterfenster (KW 2–4)."
                : "Liga-Verein bietet nach Marktwert. 50 % der Ablöse fließen in den Transfer-Topf.")
            }
            block
          >
            <button
              type="button"
              className="profile-scout profile-sell"
              onClick={onSell}
              disabled={!transferWindowOpen || Boolean(saleBlockedReason)}
            >
              🔴 Verkaufen{saleOffer ? ` · ca. ${formatMoney(saleOffer)}` : ""}
            </button>
          </Hint>
        </div>
      ) : null}

      {onOpenYouth ? (
        <button type="button" className="profile-next" onClick={onOpenYouth}>
          → Zur Jahrgangsliste
        </button>
      ) : null}
    </main>
  );
}

function OverviewTab({
  flavor,
  achievements,
  owned,
}: {
  flavor: ReturnType<typeof flavorForScout>;
  achievements: string[];
  owned: boolean;
}) {
  return (
    <section className="profile-panel" aria-label="Überblick">
      <Hint text="Kurzportrait — aus Region, Position und aktuellem Zustand. Rote Eigenschaften spiegeln Form, Moral oder Spielzeit wider." block>
        {flavor ? (
          <div className="profile-flavor">
            <p className="profile-flavor-headline">{flavor.headline}</p>
            <p className="profile-flavor-body">{flavor.body}</p>
            <ul className="profile-trait-list">
              {flavor.traits.map((trait) => (
                <li key={trait.label} className={`profile-trait is-${trait.tone}`}>{trait.label}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="profile-empty">Noch kaum Gerüchte. Scouten und Wochen simulieren, um mehr zu erfahren.</p>
        )}
      </Hint>

      <Hint text="Erfolge aus echten Vereinsereignissen — Jugendleistung, Aufstieg, Vertrag, Leihe. Fremde Spieler: erst nach Scout-Wissen sichtbar." block>
        <div className="profile-achievements">
          <p className="profile-section-label">Erfolge</p>
          {achievements.length > 0 ? (
            <ul className="profile-badge-list">
              {achievements.map((badge) => (
                <li key={badge}>{badge}</li>
              ))}
            </ul>
          ) : (
            <p className="profile-empty">{owned ? "Noch keine Einträge." : "Unbekannt — Scout-Berichte nötig."}</p>
          )}
        </div>
      </Hint>
    </section>
  );
}

function DevelopmentTab({
  player,
  owned,
  scoutEstimate,
  fitness,
  morale,
  form,
  bars,
  growth,
  timeline,
  reveal,
}: {
  player: Player;
  owned: boolean;
  scoutEstimate?: AbilityEstimate;
  fitness: ReturnType<typeof stateMark>;
  morale: ReturnType<typeof stateMark>;
  form: ReturnType<typeof formMark>;
  bars: ReturnType<typeof attributeBars>;
  growth: { season: number; ca: number }[];
  timeline: string[];
  reveal: ReturnType<typeof scoutReveal> | null;
}) {
  const caDelta = owned ? weeklyCaDelta(player) : null;
  const recentGrowth = player.state.recent_growth_26w ?? 0;
  const chartPoints = layoutGrowthChart(growth, 320, 120);

  return (
    <section className="profile-panel" aria-label="Entwicklung">
      {owned ? (
        <div className="profile-dev-hero">
          <div className="profile-dev-momentum">
            <div className="profile-dev-stat">
              <span className="profile-dev-stat-label">CA</span>
              <strong className="profile-dev-stat-value">{playerCa(player)}</strong>
            </div>
            <div className="profile-dev-stat">
              <span className="profile-dev-stat-label">Δ Woche</span>
              <strong className={`profile-dev-stat-value ${caDelta !== null && caDelta > 0 ? "is-up" : caDelta !== null && caDelta < 0 ? "is-down" : ""}`}>
                {formatCaDelta(caDelta)}
              </strong>
            </div>
            <div className="profile-dev-stat">
              <span className="profile-dev-stat-label">26 Wochen</span>
              <strong className="profile-dev-stat-value is-up">{formatRecentGrowth(recentGrowth)}</strong>
            </div>
          </div>

          {growth.length > 0 ? (
            <Hint text="CA-Verlauf über die Saisons — zentral für die Talent-Entwicklung." block>
              <div className="profile-growth profile-growth-hero">
                <svg viewBox="0 0 320 120" role="img" aria-label="CA-Verlauf">
                  {chartPoints.length > 1 ? (
                    <polyline
                      points={growthPolyline(growth, 320, 120)}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="4"
                    />
                  ) : null}
                  {chartPoints.map((point) => (
                    <circle key={`${point.season}-${point.ca}`} cx={point.x} cy={point.y} r="5" fill="#047857" />
                  ))}
                </svg>
                <p className="profile-growth-note">
                  {player.history.growth.length === 0
                    ? `Saison ${growth[0]?.season ?? 1} · erster Stand`
                    : `Saison ${growth[0]?.season ?? 1} → ${growth.at(-1)?.season ?? growth[0]?.season ?? 1}`}
                </p>
              </div>
            </Hint>
          ) : (
            <p className="profile-growth-note profile-growth-empty">Noch kein Saisonverlauf — nach der ersten Saison sichtbar.</p>
          )}
        </div>
      ) : growth.length > 0 ? (
        <Hint text="Scout-Schätzung der Entwicklung." block>
          <div className="profile-growth profile-growth-hero">
            <svg viewBox="0 0 320 120" role="img" aria-label="Attributverlauf">
              <polyline points={growthPolyline(growth, 320, 120)} fill="none" stroke="#059669" strokeWidth="4" />
            </svg>
            <p className="profile-growth-note">
              {reveal?.showExactCa ? "Scout-Schätzung" : "Noch kein belastbarer Verlauf"}
            </p>
          </div>
        </Hint>
      ) : (
        <p className="profile-growth-note profile-growth-empty">Entwicklung noch unbekannt</p>
      )}

      <Hint text="Aktueller Zustand. ● gut, ▲ mittel, ◆ schwach." block>
        <div className="profile-state">
          <StateChip label="Fit" mark={fitness.mark} tone={fitness.tone} value={formatState(player.state.fitness, owned, scoutEstimate)} />
          <StateChip label="Form" mark={form.mark} tone={form.tone} value={formatState(player.state.form, owned, scoutEstimate, true)} />
          <StateChip label="Morale" mark={morale.mark} tone={morale.tone} value={formatState(player.state.morale, owned, scoutEstimate)} />
        </div>
      </Hint>

      <Hint text="Die sechs wichtigsten Skills für diese Position." block>
        <div className="profile-bars">
          <p className="profile-section-label">Kernattribute</p>
          {bars.map((bar) => (
            <div key={bar.key} className={bar.dimmed ? "profile-bar-row is-dimmed" : "profile-bar-row"}>
              <span className="profile-bar-label">{attributeLabel(bar.key)}</span>
              <div className="profile-bar-track">
                {bar.showCi && bar.low !== undefined && bar.high !== undefined ? (
                  <span
                    className="profile-bar-ci"
                    style={{ left: `${(bar.low / 199) * 100}%`, width: `${((bar.high - bar.low) / 199) * 100}%` }}
                  />
                ) : null}
                <span className="profile-bar-fill" style={{ width: `${(bar.value / 199) * 100}%` }} />
              </div>
              <span className="profile-bar-value">{bar.showValue ? bar.value : "?"}</span>
            </div>
          ))}
        </div>
      </Hint>

      {owned && timeline.length > 0 ? (
        <div className="profile-timeline" aria-label="Breakouts">
          {timeline.map((flag) => (
            <span key={flag} title={flag}>💡</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StatsTab({
  stats,
  owned,
}: {
  stats: ReturnType<typeof seasonStatsStub>;
  owned: boolean;
}) {
  return (
    <section className="profile-panel" aria-label="Statistik">
      <Hint text="Saisonwerte aus deinem Karriere-Kader — Minuten, Tore und Vorlagen nach Ligaspiel." block>
        {stats ? (
          <dl className="profile-stat-grid">
            <StatItem icon="👕" label="Einsätze" value={String(stats.apps)} />
            <StatItem icon="⚽" label="Tore" value={String(stats.goals)} />
            <StatItem icon="🅰️" label="Vorlagen" value={String(stats.assists)} />
            <StatItem icon="⏱️" label="Minuten" value={String(stats.minutes)} />
            <StatItem icon="★" label="Ø Note" value={stats.rating} />
          </dl>
        ) : (
          <p className="profile-empty">
            {owned ? "Noch keine Saison-Spiele." : "Statistik unbekannt — mehr Scouting nötig."}
          </p>
        )}
      </Hint>
    </section>
  );
}

function ContractTab({ contract }: { contract: ReturnType<typeof contractView> }) {
  return (
    <section className="profile-panel" aria-label="Vertrag">
      <Hint text="Vertragsdetails aus dem Spielerobjekt. Profi-Verhandlungen laufen über Transfers/Inbox." block>
        <dl className="profile-contract-list">
          <div className="profile-contract-row">
            <dt>Status</dt>
            <dd>{contract.status}</dd>
          </div>
          <div className="profile-contract-row">
            <dt>Gehalt</dt>
            <dd>{contract.wageWeekly}</dd>
          </div>
          <div className="profile-contract-row">
            <dt>Laufzeit bis</dt>
            <dd>{contract.untilSeason}</dd>
          </div>
          <div className="profile-contract-row">
            <dt>Minuten</dt>
            <dd>{contract.minutesPromise}</dd>
          </div>
        </dl>
        <ul className="profile-clause-list">
          {contract.clauses.map((clause) => (
            <li key={clause}>{clause}</li>
          ))}
        </ul>
      </Hint>
    </section>
  );
}

function StatItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="profile-stat-item">
      <span aria-hidden="true">{icon}</span>
      <span className="profile-stat-item-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatState(
  value: number,
  owned: boolean,
  scoutEstimate?: AbilityEstimate,
  signed = false,
): string {
  if (owned || !scoutEstimate) {
    return signed && value > 0 ? `+${value}` : String(value);
  }
  const masked = formatScoutStateValue(value, scoutEstimate, false);
  if (masked === "?") return "?";
  return signed && value > 0 ? `+${value}` : masked;
}

function StateChip({
  label,
  mark,
  tone,
  value,
}: {
  label: string;
  mark: string;
  tone: "good" | "mid" | "low";
  value: string;
}) {
  return (
    <div className={`profile-chip tone-${tone}`}>
      <span aria-hidden="true">{mark}</span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatMoney(amount: number): string {
  return formatClubCash(amount);
}

function positionGlyph(position: Player["position"]): string {
  if (position === "GK") return "🧤";
  if (position === "CB" || position === "LB" || position === "RB") return "🛡️";
  if (position === "CF") return "⚽";
  return "👟";
}
