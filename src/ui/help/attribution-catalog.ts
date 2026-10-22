/** Player-facing asset credits — mirrors assets/ATTRIBUTION.MD (maintainer source of truth). */

export type AttributionLicense = "CC0" | "CC-BY" | "Apache-2.0" | "Canva" | "Magnific";

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
    id: "facesjs",
    name: "faces.js · ZenGM",
    roleKey: "help.attribution.role.facesjs",
    href: "https://github.com/zengm-games/facesjs",
    license: "Apache-2.0",
    highlight: true,
  },
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
