#!/usr/bin/env node
/**
 * PRD storyboard POC — hand-authored vector panels (design tokens, no generative AI).
 * Writes to docs/design-refs/storyboard-opening-poc/ and public/assets/storyboard-poc/.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const OUT_DIRS = [
  join(ROOT, "docs/design-refs/storyboard-opening-poc/panels"),
  join(ROOT, "public/assets/storyboard-poc/panels"),
];

const C = {
  sand: "#f5efe0",
  panel: "#fdfbf4",
  rasen: "#2e9e46",
  rasenHell: "#bfdec2",
  rasenDunkel: "#1d6b31",
  tinte: "#3e3128",
  tinteWeich: "#6b5d4f",
  staub: "#9dbfd0",
  terra: "#e07a3f",
  sonne: "#ffc933",
  panelMuted: "#efebe0",
};

function svgWrap(body, w = 390, h = 220) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img">
  <rect width="${w}" height="${h}" fill="${C.sand}"/>
  <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="10" fill="${C.panel}" stroke="${C.tinte}" stroke-width="2"/>
  ${body}
</svg>`;
}

function caption(y, text) {
  const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<text x="24" y="${y}" fill="${C.tinte}" font-family="Nunito, system-ui, sans-serif" font-size="13" font-weight="700">${safe}</text>`;
}

function crest(x, y, s = 1) {
  return `<g transform="translate(${x},${y}) scale(${s})">
    <polygon points="30,4 56,18 56,42 30,56 4,42 4,18" fill="${C.staub}" stroke="${C.tinte}" stroke-width="2"/>
    <text x="30" y="36" text-anchor="middle" fill="${C.tinte}" font-size="14" font-weight="800">★</text>
  </g>`;
}

function pitchStrip(y = 120) {
  return `<rect x="24" y="${y}" width="342" height="72" rx="6" fill="${C.rasen}" stroke="${C.tinte}" stroke-width="2"/>
    <line x1="195" y1="${y}" x2="195" y2="${y + 72}" stroke="${C.rasenHell}" stroke-width="2"/>
    <circle cx="195" cy="${y + 36}" r="18" fill="none" stroke="${C.rasenHell}" stroke-width="2"/>`;
}

function peep(x, y, skin = C.staub, shirt = C.terra) {
  return `<g transform="translate(${x},${y})">
    <ellipse cx="28" cy="22" rx="22" ry="24" fill="${skin}" stroke="${C.tinte}" stroke-width="2"/>
    <path d="M8 78c6-28 20-40 28-44 8 4 22 16 28 44H8z" fill="${shirt}" stroke="${C.tinte}" stroke-width="2"/>
  </g>`;
}

const PANELS = [
  {
    id: "co-01-empty-office",
    body: `${caption(32, "FC Nordstern — Vereinsbüro")}
      <rect x="48" y="52" width="120" height="70" rx="4" fill="${C.panelMuted}" stroke="${C.tinte}" stroke-width="2"/>
      <rect x="200" y="70" width="140" height="12" rx="2" fill="${C.tinteWeich}"/>
      <rect x="200" y="90" width="100" height="12" rx="2" fill="${C.tinteWeich}"/>
      <text x="200" y="130" fill="${C.tinteWeich}" font-size="11">Kein Trainer auf der Liste.</text>`,
  },
  {
    id: "co-02-empty-bench",
    body: `${caption(32, "Die Ersatzbank ist leer.")}
      ${pitchStrip(100)}
      <rect x="40" y="148" width="90" height="28" rx="4" fill="${C.panelMuted}" stroke="${C.tinte}" stroke-width="2"/>
      <text x="145" y="168" fill="${C.tinte}" font-size="12" font-weight="700">Wo ist der Coach?</text>`,
  },
  {
    id: "co-03-fans-waiting",
    body: `${caption(32, "Die Fans warten.")}
      ${peep(60, 70, C.staub, C.rasen)}
      ${peep(120, 78, C.staub, C.staub)}
      ${peep(180, 72, C.staub, C.terra)}
      ${peep(240, 80, C.staub, C.rasen)}
      <path d="M70 168 Q195 140 320 168" fill="none" stroke="${C.tinte}" stroke-width="2"/>`,
  },
  {
    id: "co-04-board-table",
    body: `${caption(32, "Der Vorstand sitzt zu.")}
      <ellipse cx="195" cy="130" rx="120" ry="40" fill="${C.panelMuted}" stroke="${C.tinte}" stroke-width="2"/>
      ${peep(100, 88, C.staub, C.tinteWeich)}
      ${peep(160, 88, C.staub, C.tinteWeich)}
      ${peep(220, 88, C.staub, C.tinteWeich)}
      <text x="195" y="175" text-anchor="middle" fill="${C.terra}" font-size="12" font-weight="800">Wer führt die Mannschaft?</text>`,
  },
  {
    id: "co-05-hook",
    body: `${crest(165, 48, 1.2)}
      ${caption(120, "Nordstern hat keinen Trainer mehr.")}
      <text x="195" y="150" text-anchor="middle" fill="${C.tinteWeich}" font-size="11">Du wirst gebraucht — irgendwie.</text>`,
  },
  {
    id: "pl-01-writing",
    body: `${caption(32, "Du schreibst, was du fühlst.")}
      ${peep(80, 70)}
      <rect x="150" y="100" width="100" height="70" rx="4" fill="${C.panel}" stroke="${C.tinte}" stroke-width="2"/>
      <line x1="165" y1="120" x2="235" y2="120" stroke="${C.tinteWeich}" stroke-width="2"/>
      <line x1="165" y1="135" x2="220" y2="135" stroke="${C.tinteWeich}" stroke-width="2"/>
      <line x1="165" y1="150" x2="230" y2="150" stroke="${C.tinteWeich}" stroke-width="2"/>`,
  },
  {
    id: "pl-02-envelope",
    body: `${caption(32, "Der Brief geht raus.")}
      <polygon points="120,110 195,70 270,110 270,160 120,160" fill="${C.sonne}" stroke="${C.tinte}" stroke-width="2"/>
      <polyline points="120,110 195,140 270,110" fill="none" stroke="${C.tinte}" stroke-width="2"/>`,
  },
  {
    id: "pl-03-board-reads",
    body: `${caption(32, "Der Vorstand liest.")}
      ${peep(70, 85, C.staub, C.tinteWeich)}
      <rect x="150" y="95" width="90" height="60" rx="4" fill="${C.sonne}" stroke="${C.tinte}" stroke-width="2"/>
      <line x1="165" y1="115" x2="225" y2="115" stroke="${C.tinte}" stroke-width="2"/>
      <line x1="165" y1="128" x2="210" y2="128" stroke="${C.tinteWeich}" stroke-width="2"/>
      <line x1="165" y1="141" x2="220" y2="141" stroke="${C.tinteWeich}" stroke-width="2"/>`,
  },
  {
    id: "pl-04-hired",
    body: `${caption(32, "„Komm. Wir probieren dich.“")}
      ${peep(140, 75)}
      <rect x="220" y="100" width="120" height="50" rx="8" fill="${C.rasenHell}" stroke="${C.tinte}" stroke-width="2"/>
      <text x="280" y="130" text-anchor="middle" fill="${C.tinte}" font-size="11" font-weight="700">Anruf</text>`,
  },
  {
    id: "pl-05-sideline",
    body: `${caption(32, "Plötzlich stehst du an der Linie.")}
      ${pitchStrip(95)}
      ${peep(300, 108, C.staub, C.rasen)}`,
  },
  {
    id: "pl-06-start",
    body: `${crest(165, 40)}
      ${caption(115, "Jetzt bist du Trainer.")}
      <text x="195" y="165" text-anchor="middle" fill="${C.rasenDunkel}" font-size="13" font-weight="800">Saison kann beginnen.</text>`,
  },
  {
    id: "rf-01-draw",
    body: `${caption(32, "Losgewinn — Der Fanverein zieht.")}
      <circle cx="195" cy="125" r="50" fill="${C.staub}" stroke="${C.tinte}" stroke-width="2"/>
      <text x="195" y="132" text-anchor="middle" font-size="14" font-weight="800">?</text>`,
  },
  {
    id: "rf-02-surprise",
    body: `${caption(32, "Dein Name — über Nacht Trainer.")}
      ${peep(150, 75)}
      <rect x="240" y="100" width="100" height="40" rx="6" fill="${C.sonne}" stroke="${C.tinte}" stroke-width="2"/>
      <text x="290" y="126" text-anchor="middle" font-size="12" font-weight="800">GEZOGEN</text>`,
  },
  {
    id: "cm-01-crowd",
    body: `${caption(32, "Gemeinschaft — der Verein gehört euch.")}
      ${peep(50, 80, C.staub, C.rasen)}
      ${peep(110, 88, C.staub, C.terra)}
      ${peep(170, 82, C.staub, C.rasen)}
      ${peep(230, 90, C.staub, C.staub)}
      ${peep(290, 84, C.staub, C.terra)}`,
  },
  {
    id: "cm-02-phone",
    body: `${caption(32, "Niemand wollte den Job — also du.")}
      ${peep(100, 75)}
      <rect x="200" y="105" width="70" height="110" rx="10" fill="${C.tinte}" stroke="${C.tinte}" stroke-width="2"/>
      <rect x="208" y="115" width="54" height="80" rx="4" fill="${C.staub}"/>`,
  },
];

for (const dir of OUT_DIRS) {
  mkdirSync(dir, { recursive: true });
}

for (const panel of PANELS) {
  const svg = svgWrap(panel.body);
  for (const dir of OUT_DIRS) {
    writeFileSync(join(dir, `${panel.id}.svg`), svg, "utf8");
  }
}

// Contact sheet (4 columns)
const cols = 4;
const pw = 200;
const ph = 120;
const rows = Math.ceil(PANELS.length / cols);
const cw = cols * pw + 40;
const ch = rows * ph + 40;
let cells = "";
PANELS.forEach((panel, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const x = 20 + col * pw;
  const y = 20 + row * ph;
  cells += `<rect x="${x}" y="${y}" width="${pw - 8}" height="${ph - 8}" rx="6" fill="${C.panel}" stroke="${C.tinte}" stroke-width="1"/>
    <text x="${x + 8}" y="${y + 18}" font-size="9" font-weight="700" fill="${C.tinte}">${panel.id}</text>
    <image href="panels/${panel.id}.svg" x="${x + 4}" y="${y + 22}" width="${pw - 16}" height="${ph - 30}"/>`;
});

const contact = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${cw} ${ch}">
  <rect width="100%" height="100%" fill="${C.sand}"/>
  <text x="20" y="14" font-size="11" font-weight="800" fill="${C.tinte}">Storyboard opening POC — contact sheet</text>
  ${cells}
</svg>`;

const refDir = join(ROOT, "docs/design-refs/storyboard-opening-poc");
writeFileSync(join(refDir, "contact-sheet.svg"), contact, "utf8");
writeFileSync(join(ROOT, "public/assets/storyboard-poc/contact-sheet.svg"), contact, "utf8");

console.log(`bake-storyboard-poc: ${PANELS.length} panels → docs + public`);
