import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  CircleDot,
  Construction,
  Handshake,
  Package,
  Shirt,
  Ticket,
  Trophy,
  Tv,
  UserCog,
  Utensils,
  Wallet,
} from "lucide-react";
import type { FinanceLineKind } from "../../economy/finance-ledger.ts";

const ICONS: Record<FinanceLineKind, LucideIcon> = {
  sponsorship: Handshake,
  tv_rights: Tv,
  tv_bonus: Tv,
  matchday_tickets: Ticket,
  league_prize: Trophy,
  player_sale: Wallet,
  player_wages: Shirt,
  staff_wages: UserCog,
  facility_maintenance: CircleDot,
  transfer_fee: ArrowLeftRight,
  concessions: Utensils,
  merchandising: Package,
  infrastructure: Construction,
  other: CircleDot,
};

export function FinanceLineIcon({ kind, size = 18 }: { kind: FinanceLineKind; size?: number }) {
  const Icon = ICONS[kind] ?? CircleDot;
  return <Icon size={size} aria-hidden="true" strokeWidth={2.5} />;
}
