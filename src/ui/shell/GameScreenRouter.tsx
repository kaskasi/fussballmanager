/** WIREFRAME: PRD 09 — routed pipeline screens (extracted from App). */
import { activeScoutCount, listBoardTargets } from "../../scouting/scout-board.ts";
import { boardCashFloor } from "../../economy/spend-runway.ts";
import { prepareCareerMatch, prepareUpcomingCareerMatch } from "../../sim/career-match-setup.ts";
import { usesTrainingNextNexus } from "../../sim/training-next.ts";
import { worldCareerClubId } from "../../world/world-generator.ts";
import { isPlayerListed, listPlayerForSale, unlistPlayer } from "../../transfers/transfer-listings.ts";
import {
  chooseNewCareerMode,
  modePickPending,
  openingBlocked,
} from "../../narrative/opening.ts";
import { curtainLinkTargets, resolveFeatureCurtain } from "../../narrative/career-presentation.ts";
import {
  normalizeClubStadium,
  matchdayCapacity,
} from "../../stadium/club-stadium.ts";
import {
  precinctHasTrainingHall,
  precinctTrainingPitchLevel,
} from "../../stadium/precinct.ts";
import { precinctMedicalCenterLevel } from "../../stadium/precinct-effects.ts";
import type { PersistedSession } from "../session/usePersistedGameSession.ts";
import { useGameSession } from "../session/GameSessionContext.tsx";
import type { LocaleId } from "../../i18n/locale-id.ts";
import { CampLeaderDismissModal } from "../components/CampLeaderDismissModal.tsx";
import { ClubProfileModal } from "../components/ClubProfileModal.tsx";
import { JobOffersModal } from "../components/JobOffersModal.tsx";
import { OpeningStoryModal } from "../components/OpeningStoryModal.tsx";
import { NewCareerModeCard } from "../components/NewCareerModeCard.tsx";
import { careerClubChoices, startCareerAtClub } from "../../narrative/career-club-pick.ts";
import { CalendarScreen } from "../screens/CalendarScreen.tsx";
import { ClubEventsScreen } from "../screens/ClubEventsScreen.tsx";
import { FinancesScreen } from "../screens/FinancesScreen.tsx";
import { FirstTeam } from "../screens/FirstTeam.tsx";
import { HelpScreen } from "../screens/HelpScreen.tsx";
import { SettingsScreen } from "../screens/SettingsScreen.tsx";
import { LeaguesScreen } from "../screens/LeaguesScreen.tsx";
import { Matchday } from "../../match/Matchday.tsx";
import { MedicalCenterScreen } from "../screens/MedicalCenterScreen.tsx";
import { MerchandisingScreen } from "../screens/MerchandisingScreen.tsx";
import { MANAGER_DESK_HUB_ENABLED } from "../../hub/config.ts";
import { markStepCompleted } from "../../tutorial/index.ts";
import { ManagerDeskHub } from "../screens/ManagerDeskHub.tsx";
import { PipelineDashboard } from "../screens/PipelineDashboard.tsx";
import { PostfachScreen } from "../screens/PostfachScreen.tsx";
import { ScoutingCenter } from "../screens/ScoutingCenter.tsx";
import { TacticsScreen } from "../screens/TacticsScreen.tsx";
import { saveTacticsPreset } from "../../match/tactics-presets.ts";
import { StadiumScreen } from "../screens/StadiumScreen.tsx";
import { TrainingCenter } from "../screens/TrainingCenter.tsx";
import { TransfersScreen } from "../screens/TransfersScreen.tsx";
import { YouthCampus } from "../screens/YouthCampus.tsx";
import type { GameScreenRouterProps } from "./game-screen-router-props.ts";

export function GameScreenRouter(props: GameScreenRouterProps) {
  const { session, patchSession, flashNotice } = useGameSession();
  const {
    screen,
    save,
    players,
    season,
    week,
    weekday,
    trainingPlan,
    trainingPlanPresets,
    trainingIntensity,
    individualPrograms,
    league,
    finances,
    board,
    youthInbox,
    scoutBoard,
    clubEvents,
    storyState,
    youthCamps,
    transferState,
    lastSeasonAwards,
    coachingStaff,
    assistantDelegation,
    masterSeed,
    rivalPlayers,
    world,
    scoutNetwork,
    academyFacility,
    stadium,
    medicalStaff,
    medicalState,
    orthopedistHire,
    injuryRiskFactor,
    trainingUnitsCompleted,
    trainingUnitOutcomes,
    financing,
    marketFilters,
    marketSort,
    postfachItemId,
    trainingFocusPlayerId,
    trainingAutoNext,
    campLeaderDismissCampId,
    campusTab,
    campusYouthSort,
    campusInitialTab,
    scoutingInitialTab,
    clubProfileId,
    calendarMilestones,
    stadiumIsHomeMatchWeek,
    stadiumOpponentFanbase,
    playerDivisionId,
    scoutCapacity,
    simulating,
    jobOffers,
    accessibility,
    activeSlot,
    loadSaveSlot,
    applyImportedSave,
    newGameInSlot,
    applyCloudSave,
    openMarketNegotiation,
    setScreen,
    setScoutingInitialTab,
    setCampusInitialTab,
    setCampusTab,
    setCampusYouthSort,
    setTrainingFocusPlayerId,
    setTrainingAutoNext,
    setCampLeaderDismissCampId,
    setClubProfileId,
    setProfileId,
    setForeignPlayerId,
    setMarketFilters,
    setMarketSort,
    setAccessibility,
    openPostfach,
    handleTrainingPlanChange,
    handleTrainingIntensityChange,
    handleIndividualProgramsChange,
    handleTrainingPlanPresetsChange,
    handleAssistantDelegationChange,
    handleHireCoach,
    handleAssignMentor,
    handleClearMentor,
    handleInboxDecision,
    handleOpeningComplete,
    handleHireCampLeader,
    handleHireOrthopedist,
    handleDismissScoutJob,
    handleApplyOpponentScoutPlan,
    handleConfirmDismissCampLeader,
    handleBuyYouthCamp,
    handleCommissionCampLeader,
    handleRequestDismissCampLeader,
    handlePullCampPlayer,
    handleEnqueueScoutTrip,
    handleScoutRegion,
    handleAddScoutAssignment,
    handleCancelScoutWork,
    handleToggleScoutAssignment,
    handleAssignScout,
    handleHireScout,
    handleFireScout,
    handleToggleShortlist,
    handleScoutMapDetailChange,
    handleRecallLoan,
    handleHireMedicalDoctor,
    handleHireMedicalPhysio,
    handleRehabMinigameComplete,
    handleDoctorExamComplete,
    handleSurgery,
    handlePhysioManual,
    handleMerchandisingChange,
    handleMerchBulkPurchase,
    handleMerchOnDemand,
    handleMerchSaleStart,
    handleCommissionMerchExpert,
    handleHireMerchExpert,
    handleDismissMerchExpert,
    handleDrawBankLoan,
    handleStartBlockExpansion,
    handlePlacePrecinct,
    handleUpgradePrecinct,
    handleBuyParcel,
    handlePlaceStreet,
    handleExpandPrecinct,
    handleShrinkPrecinctToMin,
    handleRemovePrecinctPatch,
    handleRemoveStreet,
    handleUpgradeAcademy,
    handleStartOpponentScout,
    handleOpenOpponentScoutReport,
    handleFastForwardToMonth,
    onSimulateUntil,
    handleAcceptJobOffer,
  } = props;

  const curtain = resolveFeatureCurtain(storyState);
  const links = curtainLinkTargets(curtain);
  const openScoutingAt = (tab: "map" | "hits" | null) =>
    links.scouting
      ? () => {
          setScoutingInitialTab(tab);
          setScreen("scouting");
        }
      : undefined;
  const openStadium = links.stadium ? () => setScreen("stadium") : undefined;
  const openTransfers = links.transfers ? () => setScreen("transfers") : undefined;

  return (
    <>
      {screen === "hub" ? (
        MANAGER_DESK_HUB_ENABLED ? (
          <ManagerDeskHub
            key={save.manifest.created}
            session={session}
            players={players}
            trainingPlan={trainingPlan}
            league={league}
            finances={finances}
            board={board}
            stadium={stadium}
            calendarMilestones={calendarMilestones}
            scoutBoard={scoutBoard}
            scoutNetwork={scoutNetwork}
            matchSetup={prepareCareerMatch(session)}
            onStartOpponentScout={handleStartOpponentScout}
            onViewOpponentScoutReport={handleOpenOpponentScoutReport}
            onSelectPlayer={setProfileId}
            rivalPlayers={rivalPlayers}
            onOpenNegotiation={openMarketNegotiation}
            onOpenTraining={() => setScreen("training")}
            onOpenScouting={openScoutingAt(null)}
            onOpenTransfers={openTransfers}
            transferState={session.transferState}
            worldClubs={session.world.clubs}
            postfach={{
              players,
              youthInbox,
              youthCamps,
              clubId: session.clubId,
              season,
              week,
              storyCast: session.storyState.cast,
              masterSeed: session.masterSeed,
              initialItemId: postfachItemId,
              onDecision: handleInboxDecision,
              onSelectPlayer: setProfileId,
              onHireCampLeader: handleHireCampLeader,
              orthopedistHire,
              hasOrthopedist: Boolean(medicalStaff.orthopedist),
              onHireOrthopedist: handleHireOrthopedist,
              scoutBoard,
              onDismissScoutJob: handleDismissScoutJob,
              onOpenScoutingNetwork: openScoutingAt("map"),
              onOpenScoutingHits: openScoutingAt("hits"),
              onApplyOpponentScoutPlan: handleApplyOpponentScoutPlan,
              clubEvents,
              kickerEdition: session.kickerEdition ?? null,
              kickerEditionArchive: session.kickerEditionArchive,
              transferHistory: session.transferState.history ?? [],
              rivalPlayers: session.rivalPlayers,
              worldClubs: session.world.clubs,
              treterSession: session,
              onOpenPostfach: openPostfach,
            }}
          />
        ) : (
          <PipelineDashboard
            key={save.manifest.created}
            players={players}
            season={season}
            week={week}
            trainingPlan={trainingPlan}
            trainingIntensity={trainingIntensity}
            individualPrograms={individualPrograms}
            onTrainingPlanChange={handleTrainingPlanChange}
            activeScouts={activeScoutCount(scoutBoard)}
            league={league}
            finances={finances}
            board={board}
            clubId={session.clubId}
            onSelectPlayer={setProfileId}
            onOpenScouting={(tab) => {
              setScoutingInitialTab(tab === "map" ? "map" : null);
              setScreen("scouting");
            }}
            onOpenTransfers={() => setScreen("transfers")}
            onStoryChoice={handleInboxDecision}
            masterSeed={session.masterSeed}
            onHireCampLeader={handleHireCampLeader}
            onDismissScoutJob={handleDismissScoutJob}
            onOpenScoutingNetwork={openScoutingAt("map")}
            onOpenScoutingHits={openScoutingAt("hits")}
            onOpenJugend={() => setScreen("campus")}
            onSelectScoutTarget={(playerId) => setForeignPlayerId(playerId)}
            youthInbox={youthInbox}
            scoutBoard={scoutBoard}
            clubEvents={clubEvents}
            onOpenTraining={() => setScreen("training")}
            onViewAllEvents={() => setScreen("club-events")}
            lastSeasonAwards={lastSeasonAwards}
            storyState={storyState}
            youthCamps={youthCamps}
            transferState={transferState}
          />
        )
      ) : null}
      {screen === "postfach" ? (
        <PostfachScreen
          players={players}
          youthInbox={youthInbox}
          youthCamps={youthCamps}
          clubId={session.clubId}
          season={season}
          week={week}
          storyCast={session.storyState.cast}
          masterSeed={session.masterSeed}
          initialItemId={postfachItemId}
          onDecision={handleInboxDecision}
          onSelectPlayer={setProfileId}
          onHireCampLeader={handleHireCampLeader}
          orthopedistHire={orthopedistHire}
          hasOrthopedist={Boolean(medicalStaff.orthopedist)}
          onHireOrthopedist={handleHireOrthopedist}
          scoutBoard={scoutBoard}
          onDismissScoutJob={handleDismissScoutJob}
          onOpenScoutingNetwork={openScoutingAt("map")}
          onOpenScoutingHits={openScoutingAt("hits")}
          onApplyOpponentScoutPlan={handleApplyOpponentScoutPlan}
          clubEvents={clubEvents}
          kickerEdition={session.kickerEdition ?? null}
          kickerEditionArchive={session.kickerEditionArchive}
          transferHistory={session.transferState.history ?? []}
          rivalPlayers={session.rivalPlayers}
          worldClubs={session.world.clubs}
          treterSession={session}
        />
      ) : null}
      {modePickPending(session) && accessibility.localeChosen ? (
        <NewCareerModeCard
          clubChoices={careerClubChoices(session)}
          defaultClubId={session.league.player_club_id}
          onPick={(mode, clubId) =>
            patchSession((current) => {
              const picked = chooseNewCareerMode(current, mode);
              return clubId ? startCareerAtClub(picked, clubId) : picked;
            })
          }
        />
      ) : openingBlocked(session) ? (
        <OpeningStoryModal
          managerName={session.managerName}
          players={players}
          clubId={session.clubId}
          localeChosen={Boolean(accessibility.localeChosen)}
          onLocalePick={(locale: LocaleId) =>
            setAccessibility((current: typeof accessibility) => ({
              ...current,
              locale,
              localeChosen: true,
            }))
          }
          onComplete={handleOpeningComplete}
        />
      ) : null}
      {screen === "training" ? (
        <TrainingCenter
          week={week}
          weekday={weekday}
          season={season}
          plan={trainingPlan}
          intensity={trainingIntensity}
          individualPrograms={individualPrograms}
          onPlanChange={handleTrainingPlanChange}
          onIntensityChange={handleTrainingIntensityChange}
          onProgramsChange={handleIndividualProgramsChange}
          players={players}
          clubId={session.clubId}
          coachingStaff={coachingStaff}
          masterSeed={masterSeed}
          onHireCoach={handleHireCoach}
          assistantName={storyState.cast.assistant_name}
          assistantDelegation={assistantDelegation}
          onAssistantDelegationChange={handleAssistantDelegationChange}
          onAssignMentor={handleAssignMentor}
          onClearMentor={handleClearMentor}
          onSelectPlayer={setProfileId}
          focusIndividualPlayerId={trainingFocusPlayerId}
          onClearIndividualFocus={() => setTrainingFocusPlayerId(null)}
          trainingUnlocks={{
            hasTrainingHall: precinctHasTrainingHall(stadium.precinct),
            trainingPitchLevel: precinctTrainingPitchLevel(stadium.precinct),
            medicalCenterLevel: precinctMedicalCenterLevel(stadium.precinct),
          }}
          injuryRiskFactor={injuryRiskFactor}
          trainingUnitsCompleted={trainingUnitsCompleted}
          trainingUnitOutcomes={trainingUnitOutcomes}
          useTrainingUnitProgress={usesTrainingNextNexus(storyState)}
          readOnly={curtain.auto_training}
          trainingPlanPresets={trainingPlanPresets}
          onTrainingPlanPresetsChange={handleTrainingPlanPresetsChange}
          onTrainingPresetNotice={flashNotice}
          onTrainingPresetLoaded={() => {
            patchSession((current) => ({
              ...current,
              storyState: markStepCompleted(current.storyState, "training.load_preset"),
            }));
          }}
          onTrainingPresetSaved={() => {
            patchSession((current) => ({
              ...current,
              storyState: markStepCompleted(current.storyState, "training.save_preset"),
            }));
          }}
          trainingAutoNext={trainingAutoNext}
          onStopTrainingAutoNext={() => setTrainingAutoNext(false)}
        />
      ) : null}
      {campLeaderDismissCampId && youthCamps.some((entry) => entry.id === campLeaderDismissCampId) ? (
        <CampLeaderDismissModal
          camp={youthCamps.find((entry) => entry.id === campLeaderDismissCampId)!}
          onConfirm={handleConfirmDismissCampLeader}
          onCancel={() => setCampLeaderDismissCampId(null)}
        />
      ) : null}
      {screen === "campus" ? (
        <YouthCampus
          players={players}
          youthInbox={youthInbox}
          stadiumCapacity={matchdayCapacity(stadium, season, week)}
          season={season}
          week={week}
          cash={finances.cash}
          clubId={session.clubId}
          trainingPlan={trainingPlan}
          individualPrograms={individualPrograms}
          academyFacility={academyFacility}
          academyProject={session.academyProject ?? null}
          stadium={stadium}
          youthCamps={youthCamps}
          masterSeed={session.masterSeed}
          onSelectPlayer={setProfileId}
          campusTab={campusTab}
          onCampusTabChange={setCampusTab}
          showCamps={curtain.youth_camps || youthCamps.length > 0}
          youthSort={campusYouthSort}
          onYouthSortChange={setCampusYouthSort}
          onOpenInbox={openPostfach}
          onInboxDecision={handleInboxDecision}
          onBuyCamp={handleBuyYouthCamp}
          onCommissionCampLeader={handleCommissionCampLeader}
          onRequestDismissCampLeader={handleRequestDismissCampLeader}
          onPullCampPlayer={handlePullCampPlayer}
          initialTab={campusInitialTab}
          onInitialTabApplied={() => setCampusInitialTab(null)}
        />
      ) : null}
      {screen === "scouting" ? (
        <ScoutingCenter
          cash={finances.cash}
          targets={listBoardTargets(scoutBoard, rivalPlayers, world.clubs)}
          rivalPlayers={rivalPlayers}
          worldClubs={world.clubs}
          playerClub={
            world.clubs.find((entry) => worldCareerClubId(entry.id) === session.clubId) ?? null
          }
          discovery={scoutBoard.discovery}
          playerDivisionId={playerDivisionId}
          activeClubScout={scoutBoard.active_club_scout}
          activeRegionScout={scoutBoard.active_region_scout}
          activeOpponentScout={scoutBoard.active_opponent_scout}
          activeScoutTrips={scoutBoard.active_scout_trips ?? []}
          scoutTripQueue={scoutBoard.scout_trip_queue}
          tripQueueLength={scoutBoard.scout_trip_queue?.length ?? 0}
          onEnqueueScoutTrip={handleEnqueueScoutTrip}
          onScoutRegion={handleScoutRegion}
          filters={marketFilters}
          onFiltersChange={setMarketFilters}
          sort={marketSort}
          onSortChange={setMarketSort}
          assignments={scoutBoard.assignments ?? []}
          onAddAssignment={handleAddScoutAssignment}
          onCancelScoutWork={handleCancelScoutWork}
          onToggleAssignment={handleToggleScoutAssignment}
          onSelectTarget={(playerId) => setForeignPlayerId(playerId)}
          onAssignScout={handleAssignScout}
          scoutNetwork={scoutNetwork}
          scoutCapacity={scoutCapacity}
          season={season}
          week={week}
          masterSeed={masterSeed}
          onHireScout={handleHireScout}
          onFireScout={handleFireScout}
          shortlistIds={transferState.shortlist}
          onToggleShortlist={handleToggleShortlist}
          initialTab={scoutingInitialTab}
          onInitialTabApplied={() => setScoutingInitialTab(null)}
          onScoutMapDetailChange={handleScoutMapDetailChange}
          opponentLabel={prepareCareerMatch(session)?.opponentShortName}
          matchSetup={prepareCareerMatch(session)}
          careerPhase={storyState.career_phase}
        />
      ) : null}
      {screen === "transfers" ? (
        <TransfersScreen
          players={players}
          clubId={session.clubId}
          season={season}
          week={week}
          history={transferState.history}
          worldClubs={world.clubs}
          rivalPlayers={rivalPlayers}
          transferState={transferState}
          onToggleListing={(playerId) =>
            patchSession((current) => {
              const player = current.players.find((entry) => entry.id === playerId);
              if (!player || player.club_id !== current.clubId) return current;
              const transferStateNext = isPlayerListed(current.transferState, playerId)
                ? unlistPlayer(current.transferState, playerId)
                : listPlayerForSale(current.transferState, player, current.season, current.week);
              return { ...current, transferState: transferStateNext };
            })
          }
          onOpenNegotiation={openMarketNegotiation}
          scoutBoard={scoutBoard}
          onScoutPlayer={handleAssignScout}
          onToggleShortlist={handleToggleShortlist}
          onSelectPlayer={(playerId) => {
            if (players.some((entry) => entry.id === playerId)) {
              setProfileId(playerId);
            } else {
              setForeignPlayerId(playerId);
            }
          }}
          onRecallLoan={handleRecallLoan}
        />
      ) : null}
      {screen === "squad" ? (
        <FirstTeam
          players={players}
          clubId={session.clubId}
          season={season}
          week={week}
          trainingIntensity={trainingIntensity}
          coachingStaff={coachingStaff}
          masterSeed={masterSeed}
          cash={finances.cash}
          onHireCoach={handleHireCoach}
          assistantName={storyState.cast.assistant_name}
          assistantDelegation={assistantDelegation}
          onAssistantDelegationChange={handleAssistantDelegationChange}
          onAssignMentor={handleAssignMentor}
          onClearMentor={handleClearMentor}
          onOpenMedical={() => setScreen("medical")}
          onSelectPlayer={setProfileId}
        />
      ) : null}
      {screen === "tactics" ? (
        <TacticsScreen
          setup={prepareUpcomingCareerMatch(session)}
          players={players}
          rivalPlayers={rivalPlayers}
          season={season}
          week={week}
          weekday={weekday}
          stadium={stadium}
          storyState={storyState}
          tacticsPresets={session.tacticsPresets}
          matchLineup={session.matchLineup}
          scoutBoard={scoutBoard}
          scoutNetwork={scoutNetwork}
          onSaveTacticsPreset={(id, plan) =>
            patchSession((current) => ({
              ...current,
              tacticsPresets: saveTacticsPreset(current.tacticsPresets, id, plan),
            }))
          }
          onSaveMatchLineup={(lineup) =>
            patchSession((current) => ({ ...current, matchLineup: lineup }))
          }
          onStartOpponentScout={handleStartOpponentScout}
          onApplyOpponentScoutPlan={handleApplyOpponentScoutPlan}
          onOpenPlayer={setProfileId}
        />
      ) : null}
      {screen === "medical" ? (
        <MedicalCenterScreen
          players={players}
          clubId={session.clubId}
          stadium={stadium}
          season={season}
          week={week}
          cash={finances.cash}
          masterSeed={masterSeed}
          medicalStaff={medicalStaff}
          medicalState={medicalState}
          orthopedistHire={orthopedistHire}
          trainingIntensity={trainingIntensity}
          injuryRiskFactor={injuryRiskFactor}
          onSelectPlayer={setProfileId}
          onHireDoctor={handleHireMedicalDoctor}
          onHirePhysio={handleHireMedicalPhysio}
          onHireOrthopedist={handleHireOrthopedist}
          onRehabMinigameComplete={handleRehabMinigameComplete}
          onDoctorExamComplete={handleDoctorExamComplete}
          onSurgery={handleSurgery}
          onPhysioManual={handlePhysioManual}
        />
      ) : null}
      {screen === "club-events" ? (
        <ClubEventsScreen events={clubEvents} />
      ) : null}
      {screen === "merchandising" ? (
        <MerchandisingScreen
          stadium={stadium}
          players={players}
          clubId={session.clubId}
          finances={finances}
          season={season}
          week={week}
          weekday={weekday}
          masterSeed={masterSeed}
          isHomeMatchWeek={stadiumIsHomeMatchWeek}
          onMerchandisingChange={handleMerchandisingChange}
          onRequestBulkPurchase={handleMerchBulkPurchase}
          onRequestOnDemand={handleMerchOnDemand}
          onStartMerchSale={handleMerchSaleStart}
          onCommissionExpert={handleCommissionMerchExpert}
          onHireExpert={handleHireMerchExpert}
          onDismissExpert={handleDismissMerchExpert}
        />
      ) : null}
      {screen === "finances" ? (
        <FinancesScreen
          finances={finances}
          players={players}
          clubId={session.clubId}
          season={season}
          week={week}
          masterSeed={masterSeed}
          stadium={stadium}
          league={league}
          coachingStaff={coachingStaff}
          scoutNetwork={scoutNetwork}
          boardCashFloor={boardCashFloor(board)}
          boardPressure={board.pressure}
          financing={financing}
          onDrawBankLoan={handleDrawBankLoan}
          onOpenStadium={openStadium}
          onStadiumChange={(next) =>
            patchSession((current: PersistedSession) => ({
              ...current,
              stadium: normalizeClubStadium(next),
            }))
          }
        />
      ) : null}
      {screen === "leagues" ? (
        <LeaguesScreen
          league={league}
          season={season}
          masterSeed={session.masterSeed}
          players={players}
          rivalPlayers={rivalPlayers}
          worldClubs={world.clubs}
          stadium={stadium}
          onOpenStadium={openStadium}
        />
      ) : null}
      {screen === "stadium" ? (
        <StadiumScreen
          stadium={stadium}
          finances={finances}
          season={season}
          week={week}
          isHomeMatchWeek={stadiumIsHomeMatchWeek}
          opponentFanbase={stadiumOpponentFanbase}
          onStadiumChange={(next) =>
            patchSession((current: PersistedSession) => ({
              ...current,
              stadium: normalizeClubStadium(next),
            }))
          }
          onStartBlockExpansion={handleStartBlockExpansion}
          onPlacePrecinct={handlePlacePrecinct}
          onUpgradePrecinct={handleUpgradePrecinct}
          onBuyParcel={handleBuyParcel}
          onPlaceStreet={handlePlaceStreet}
          onExpandPrecinct={handleExpandPrecinct}
          onShrinkPrecinctToMin={handleShrinkPrecinctToMin}
          onRemovePrecinctPatch={handleRemovePrecinctPatch}
          onRemoveStreet={handleRemoveStreet}
          precinctSeasonWeek={week}
          academyFacility={academyFacility}
          academyProject={session.academyProject ?? null}
          youthCamps={youthCamps}
          onUpgradeAcademy={handleUpgradeAcademy}
        />
      ) : null}
      {screen === "calendar" ? (
        <CalendarScreen
          season={season}
          week={week}
          weekday={weekday}
          league={league}
          milestones={calendarMilestones}
          scoutBoard={scoutBoard}
          transfers={transferState.history ?? []}
          editions={session.kickerEditionArchive}
          chronicle={storyState.chronicle_entries}
          onFastForwardToMonth={handleFastForwardToMonth}
          onSimulateUntil={onSimulateUntil}
          busy={simulating}
        />
      ) : null}
      {clubProfileId && screen !== "leagues" ? (
        <ClubProfileModal
          teamId={clubProfileId}
          league={league}
          players={players}
          rivalPlayers={rivalPlayers}
          stadium={stadium}
          worldClubs={world.clubs}
          onClose={() => setClubProfileId(null)}
          onOpenStadium={
            openStadium
              ? () => {
                  setClubProfileId(null);
                  openStadium();
                }
              : undefined
          }
        />
      ) : null}
      {screen === "help" ? <HelpScreen /> : null}
      {screen === "settings" ? (
        <SettingsScreen
          preferences={accessibility}
          onPreferencesChange={setAccessibility}
          activeSlot={activeSlot}
          currentSave={save}
          onLoadSlot={loadSaveSlot}
          onApplyImportedSave={applyImportedSave}
          onNewGameInSlot={newGameInSlot}
          onApplyCloudSave={applyCloudSave}
          onOpenMatchdaySandbox={() => setScreen("matchday")}
        />
      ) : null}
      {screen === "matchday" ? <Matchday /> : null}
    </>
  );
}
