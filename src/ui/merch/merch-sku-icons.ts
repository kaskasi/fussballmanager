import {
  Bath,
  BedDouble,
  Footprints,
  Shirt,
  ShoppingBag,
  Tag,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { MerchSkuId } from "../../economy/merchandising-skus.ts";

export const MERCH_SKU_ICON: Record<MerchSkuId, LucideIcon> = {
  trikots: Shirt,
  shirts: ShoppingBag,
  caps: Tag,
  schals: Wind,
  socken: Footprints,
  bettwaesche: BedDouble,
  handtuecher: Bath,
};
