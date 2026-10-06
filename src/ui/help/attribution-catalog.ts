/** Player-facing asset credits — mirrors assets/ATTRIBUTION.MD (maintainer source of truth). */

export type AttributionLicense = "CC0" | "CC-BY" | "Canva" | "Magnific";

export interface AttributionCredit {
  id: string;
  name: string;
  roleKey: string;
  href: string;
  license: AttributionLicense;
  highlight?: boolean;
}

export const ATTRIBUTION_CC0_CREDITS: readonly AttributionCredit[] = [
  {
    id: "open-peeps",
    name: "Open Peeps · Pablo Stanley",
    roleKey: "help.attribution.role.openPeeps",
    href: "https://www.openpeeps.com/",
    license: "CC0",
    highlight: true,
  },
  {
    id: "kenney",
    name: "Kenney.nl",
    roleKey: "help.attribution.role.kenney",
    href: "https://www.kenney.nl",
    license: "CC0",
    highlight: true,
  },
  {
    id: "ambientcg",
    name: "ambientCG",
    roleKey: "help.attribution.role.ambientcg",
    href: "https://ambientcg.com/",
    license: "CC0",
    highlight: true,
  },
];

export const ATTRIBUTION_OTHER_CREDITS: readonly AttributionCredit[] = [
  {
    id: "commons",
    name: "Wikimedia Commons / Geograph",
    roleKey: "help.attribution.role.commons",
    href: "https://commons.wikimedia.org/",
    license: "CC-BY",
  },
  {
    id: "magnific",
    name: "Magnific",
    roleKey: "help.attribution.role.magnific",
    href: "https://www.magnific.com/",
    license: "Magnific",
  },
  {
    id: "canva-crests",
    name: "Canva (fictional club crests)",
    roleKey: "help.attribution.role.canva",
    href: "https://www.canva.com/policies/content-license-agreement/",
    license: "Canva",
  },
];
