# ADR 0006 — Akzentfarbe aus der Vereinsfarbe

- Status: angenommen
- Datum: 2026-10-24

## Kontext

Seit dem Regionalliga Manager kann man jeden Verein übernehmen. Die Titelleiste trägt dessen Trikotfarbe (design.md §2.4). Alle Hervorhebungen waren aber auf das Kieler-FC-Grün abgestimmt: Tabs, CTAs, Chips, Hover in Individualtraining, Kalenderauswahl. Bei einem blauen oder violetten Verein stand grünes UI unter einer fremdfarbigen Leiste.

Zwei Ursachen:

- `--accent` und die zugehörigen Tokens waren fest grün.
- Rund 150 Stellen in `index.css`, `training.css` und anderen nutzten statt Tokens hart codierte Tailwind-Emerald-Werte (`#047857`, `#059669`, `#ecfdf5` …).

## Entscheidung

1. **`--accent*` folgt dem Trikot.** `clubAccentColors(kit)` behält Farbton und Sättigung und dunkelt ab, bis Text in Akzentfarbe ≥ 4.5:1 erreicht. `useClubAccent` setzt das Ergebnis auf `<html>`.
2. **Kieler FC bleibt pixelgleich.** Für das Default-Trikot gibt es keine Überschreibung.
3. **Rot, Orange und Gelb → Schiefer.** Diese Farbtöne kollidieren mit `--negative`, `--warning` und NEXT. Statusfarben müssen eindeutig bleiben.
4. **Status bleibt fest.** `--positive` und `--rating-*` bleiben grün. Hart codierte Grüns wurden nach Rolle auf `--accent*` oder `--positive` umgestellt; Pitch, Heatmaps und Heim/Auswärts behalten eigene Farben.

## Alternativen

- **Neutraler Akzent für alle Vereine:** passt zu jeder Leiste, ist am einfachsten. Verworfen, weil Kiel seine Identität verliert und das Spiel farblos wird.
- **Grün behalten, Leiste zurücknehmen** (nur Vereinsstreifen): löst den Clash, nimmt aber die gewünschte Vereinsidentität wieder weg.
- **Akzent auf einem Wrapper statt `<html>`:** verworfen, weil die Legacy-Aliase auf `:root` aufgelöst werden und Portale außerhalb liegen.

## Folgen

- Neue Styles müssen Rollen-Tokens nutzen; ein hart codiertes Grün bleibt bei jedem anderen Verein grün. Der Token-Guardrail (`check:design-tokens`) zählt weiter mit.
- Rund ein Fünftel der generierten Vereine (warme Farbtöne) bekommt Schiefer statt Vereinsfarbe.
- Das Dark Theme wird noch nicht überschrieben; wird es im Spiel schaltbar, braucht `clubAccentColors` eine dunkle Variante (aufhellen statt abdunkeln).
