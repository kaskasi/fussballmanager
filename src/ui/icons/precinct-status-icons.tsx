import type { LucideIcon } from "lucide-react";
import {
  Accessibility,
  Beer,
  Bus,
  Coins,
  Eye,
  Flag,
  Footprints,
  Hotel,
  Landmark,
  Megaphone,
  ParkingCircle,
  Route,
  Shirt,
  Sparkles,
  Sprout,
  TrainFront,
  Trees,
  Utensils,
  UtensilsCrossed,
  Home,
} from "lucide-react";
import type { PrecinctBuilding } from "../../stadium/precinct.ts";
import type { PrecinctStatusGroup } from "../../stadium/precinct-effects.ts";

const GROUP_ICONS: Record<PrecinctStatusGroup, LucideIcon> = {
  crowd: Eye,
  city: Route,
  fans: Megaphone,
  training: Footprints,
  cash: Coins,
};

const BUILDING_ICONS: Record<PrecinctBuilding, LucideIcon> = {
  kiosk: Utensils,
  parking: ParkingCircle,
  fan_services: Accessibility,
  beer_tent: Beer,
  bus: Bus,
  transit: TrainFront,
  fanshop: Shirt,
  clubhouse: Home,
  training_ground: Footprints,
  training_pitch: Trees,
  youth_pitch: Sprout,
  hotel: Hotel,
  restaurant: UtensilsCrossed,
  museum: Landmark,
};

export function PrecinctGroupIcon({
  group,
  size = 16,
}: {
  group: PrecinctStatusGroup;
  size?: number;
}) {
  const Icon = GROUP_ICONS[group];
  return <Icon size={size} aria-hidden="true" strokeWidth={2.5} />;
}

export function PrecinctBuildingIcon({
  building,
  size = 16,
}: {
  building: PrecinctBuilding | "arena";
  size?: number;
}) {
  const Icon = building === "arena" ? Landmark : BUILDING_ICONS[building];
  return <Icon size={size} aria-hidden="true" strokeWidth={2.5} />;
}

export { Eye as PrecinctFillIcon, Megaphone as PrecinctFansIcon, Footprints as PrecinctTrainingIcon, Coins as PrecinctCashIcon, Sparkles as PrecinctSparkleIcon, Flag as PrecinctWarnIcon };
