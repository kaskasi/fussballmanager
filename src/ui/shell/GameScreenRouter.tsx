/** WIREFRAME: PRD 09 — routed pipeline screens (extracted from App). */
import { activeScoutCount, listBoardTargets } from "../../scouting/scout-board.ts";
import { boardCashFloor } from "../../economy/spend-runway.ts";
import { prepareCareerMatch } from "../../sim/career-match-setup.ts";
import { usesTrainingNextNexus } from "../../sim/training-next.ts";
import { worldCareerClubId } from "../../world/world-generator.ts";
import { openingBlocked } from "../../narrative/opening.ts";
import {
  normalizeClubStadium,
  stadiumTotalCapacity,
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
import { CalendarScreen } from "../screens/CalendarScreen.tsx";
import { ClubEventsScreen } from "../screens/ClubEventsScreen.tsx";
import { FinancesScreen } from "../screens/FinancesScreen.tsx";
import { FirstTeam } from "../screens/FirstTeam.tsx";
import { HelpScreen } from "../screens/HelpScreen.tsx";
import { LeaguesScreen } from "../screens/LeaguesScreen.tsx";
import { Matchday } from "../../match/Matchday.tsx";
import { MedicalCenterScreen } from "../screens/MedicalCenterScreen.tsx";
import { MerchandisingScreen } from "../screens/MerchandisingScreen.tsx";
import { MANAGER_DESK_HUB_ENABLED } from "../../hub/config.ts";
import { ManagerDeskHub } from "../screens/ManagerDeskHub.tsx";
import { PipelineDashboard } from "../screens/PipelineDashboard.tsx";
import { PostfachScreen } from "../screens/PostfachScreen.tsx";
import { ScoutingCenter } from "../screens/ScoutingCenter.tsx";
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
    handleDrawBankLoan,
    handleStartBlockExpansion,
    handlePurchaseStadiumUpgrade,
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
    handleAcceptJobOffer,
  } = props;

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
            onSelectPlayer={setProfileId}
            onOpenTraining={() => setScreen("training")}
            onOpenScouting={() => {
              setScoutingInitialTab(null);
              setScreen("scouting");
            }}
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
              onOpenScoutingNetwork: () => {
                setScoutingInitialTab("map");
                setScreen("scouting");
              },
              onOpenScoutingHits: () => {
                setScoutingInitialTab("hits");
                setScreen("scouting");
              },
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
            onOpenScoutingNetwork={() => {
              setScoutingInitialTab("map");
              setScreen("scouting");
            }}
            onOpenScoutingHits={() => {
              setScoutingInitialTab("hits");
              setScreen("scouting");
            }}
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
          onOpenScoutingNetwork={() => {
            setScoutingInitialTab("map");
            setScreen("scouting");
          }}
          onOpenScoutingHits={() => {
            setScoutingInitialTab("hits");
            setScreen("scouting");
          }}
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
      {openingBlocked(session) ? (
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
          trainingPlanPresets={trainingPlanPresets}
          onTrainingPlanPresetsChange={handleTrainingPlanPresetsChange}
          onTrainingPresetNotice={flashNotice}
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
          stadiumCapacity={stadiumTotalCapacity(stadium)}
          season={season}
          week={week}
          cash={finances.cash}
          clubId={session.clubId}
          trainingPlan={trainingPlan}
          individualPrograms={individualPrograms}
          academyFacility={academyFacility}
          youthCamps={youthCamps}
          masterSeed={session.masterSeed}
          onSelectPlayer={setProfileId}
          campusTab={campusTab}
          onCampusTabChange={setCampusTab}
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
          onSelectPlayer={setProfileId}
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
          onOpenStadium={() => setScreen("stadium")}
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
          onOpenStadium={() => setScreen("stadium")}
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
          onPurchaseUpgrade={handlePurchaseStadiumUpgrade}
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
          matchSetup={prepareCareerMatch(session)}
          scoutBoard={scoutBoard}
          scoutNetwork={scoutNetwork}
          onStartOpponentScout={handleStartOpponentScout}
          onViewOpponentScoutReport={handleOpenOpponentScoutReport}
          onFastForwardToMonth={handleFastForwardToMonth}
          fastForwardBusy={simulating}
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
          onOpenStadium={() => {
            setClubProfileId(null);
            setScreen("stadium");
          }}
        />
      ) : null}
      {screen === "help" ? <HelpScreen /> : null}
      {screen === "matchday" ? <Matchday /> : null}
    </>
  );
}
