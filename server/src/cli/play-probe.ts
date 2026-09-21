import { probeKnob, probeTacticsSwap, probeVenue, probeShotAutopsy, formatMatchTally, formatSide, formatShotAutopsy, type KnobId } from "../engine/probe.ts";

function isKnob(raw: string | undefined): raw is KnobId {
  return raw === "line" || raw === "marking" || raw === "wide";
}

const mode = process.argv[2] ?? "venue";

if (mode === "knob") {
  const knobRaw = process.argv[3];
  if (!isKnob(knobRaw)) {
    throw new Error("Usage: play-probe knob line|marking|wide");
  }
  const result = probeKnob(knobRaw);
  console.log(`Knob ${result.knob}  (Nordstern vs Rheinwacht, 8 seeds)`);
  console.log(formatMatchTally(result.baselineLabel, result.baseline));
  console.log(formatMatchTally(result.variantLabel, result.variant));
} else if (mode === "tactics") {
  const result = probeTacticsSwap();
  console.log("Same XIs, Nordstern at home, 8 seeds");
  console.log(formatSide("own tactics", result.ownTactics));
  console.log(formatSide("swapped tactics", result.swappedTactics));
} else if (mode === "shots") {
  const { ownTactics, directTactics } = probeShotAutopsy();
  console.log("Nordstern at home vs Rheinwacht, 8 seeds");
  console.log(formatShotAutopsy("own 4-3-3 / false nine", ownTactics));
  console.log(formatShotAutopsy("Rheinwacht-style instructions", directTactics));
} else {
  const result = probeVenue();
  console.log("Same XIs, both venues, 8 seeds");
  console.log(formatSide("Nordstern at home", result.nordsternAtHome));
  console.log(formatSide("Nordstern away", result.nordsternAway));
  console.log(formatSide("Rheinwacht at home", result.rheinwachtAtHome));
  console.log(formatSide("Rheinwacht away", result.rheinwachtAway));
}
