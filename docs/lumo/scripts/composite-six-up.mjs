/**
 * 2×3 grid from docs/lumo/screens/01–06-*.png → screens-six-up.png
 * Run: node docs/lumo/scripts/composite-six-up.mjs
 */
import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const screensDir = join(root, "screens");
const outPath = join(root, "screens-six-up.png");

const files = [
  "01-hub.png",
  "02-training.png",
  "03-inbox.png",
  "04-youth.png",
  "05-scouting.png",
  "06-finances.png",
];

const COLS = 2;
const ROWS = 3;
const CELL_W = 720;
const GAP = 12;
const LABEL_H = 28;

const labels = [
  "Hub (Pipeline)",
  "Training",
  "Inbox / Postfach",
  "Youth campus",
  "Scouting",
  "Finances",
];

async function cellWithLabel(file, label) {
  const img = sharp(join(screensDir, file));
  const resized = await img
    .resize(CELL_W, null, { fit: "inside" })
    .toBuffer({ resolveWithObject: true });
  const h = resized.info.height;
  const svg = `<svg width="${CELL_W}" height="${LABEL_H}">
    <text x="8" y="20" font-family="system-ui,sans-serif" font-size="14" fill="#1a1a1a">${label}</text>
  </svg>`;
  const labelBuf = await sharp(Buffer.from(svg)).png().toBuffer();
  return sharp({
    create: {
      width: CELL_W,
      height: h + LABEL_H,
      channels: 4,
      background: { r: 245, g: 240, b: 230, alpha: 1 },
    },
  })
    .composite([
      { input: labelBuf, top: 0, left: 0 },
      { input: resized.data, top: LABEL_H, left: 0 },
    ])
    .png()
    .toBuffer({ resolveWithObject: true });
}

const cells = await Promise.all(files.map((f, i) => cellWithLabel(f, labels[i])));
const cellW = CELL_W;
const cellHeights = cells.map((c) => c.info.height);
const rowHeights = [
  Math.max(cellHeights[0], cellHeights[1]),
  Math.max(cellHeights[2], cellHeights[3]),
  Math.max(cellHeights[4], cellHeights[5]),
];
const canvasW = COLS * cellW + GAP;
const canvasH = rowHeights.reduce((a, b) => a + b, 0) + GAP * (ROWS - 1);

const composites = [];
let y = 0;
for (let row = 0; row < ROWS; row++) {
  let x = 0;
  for (let col = 0; col < COLS; col++) {
    const idx = row * COLS + col;
    composites.push({ input: cells[idx].data, top: y, left: x });
    x += cellW + GAP;
  }
  y += rowHeights[row] + GAP;
}

await sharp({
  create: {
    width: canvasW,
    height: canvasH,
    channels: 4,
    background: { r: 30, g: 30, b: 30, alpha: 1 },
  },
})
  .composite(composites)
  .png()
  .toFile(outPath);

console.log(`Wrote ${outPath} (${canvasW}×${canvasH})`);
