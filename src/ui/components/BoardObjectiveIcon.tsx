import type { LucideIcon } from "lucide-react";
import {
  Award,
  Banknote,
  Circle,
  HeartPulse,
  MapPin,
  Shirt,
  Building2,
  Shield,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";

const BOARD_OBJECTIVE_ICONS: Record<string, LucideIcon> = {
  survival: Shield,
  cash: Banknote,
  growth: TrendingUp,
  table: Award,
  goals: Target,
  trophy: Trophy,
  points: Award,
  camp: MapPin,
  stadium: Building2,
  medical: HeartPulse,
  merch: Shirt,
};

export function BoardObjectiveIcon({ icon }: { icon: string }) {
  const Icon = BOARD_OBJECTIVE_ICONS[icon] ?? Circle;
  return (
    <span className="board-objective-icon" aria-hidden="true">
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}
