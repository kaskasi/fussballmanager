# ADR 0001 — Merchandising: Händler-Archetypen und Beziehungsstufen

- Status: angenommen
- Datum: 2026-10-24

## Kontext

Der Merch-Einkauf war ein Pool aus 48–96 anonymen „Whitelabel“-Chargen, sortiert nach €/St. und durchgeblättert in einem Modal. Die einzige Figur war „Phillip“ (On Demand). Sein Saison-Sale senkte On-Demand-Kosten **und** den Fanshop-Verkaufspreis. Das war fachlich falsch, denn ein Lieferanten-Rabatt ändert nicht den eigenen VK. Spielerisch gab es keine Entscheidung außer „billigste Zeile kaufen“.

## Entscheidung

1. **Vier feste Archetypen** mit je einem benannten Händler. Jeder hat ein eigenes Profil (Losgröße, Preisband, Laufzeit, Preisverfall, Lieferzeit) als reine Datentabelle in `src/economy/merchandising-vendors.ts`:
   - Großhändler: verlässlich, große Chargen, ~Referenzpreis, lange gelistet
   - Restposten: kleine Chargen, −25 bis −45 %, nur 1–2 Wochen, schneller Verfall
   - Insolvenzverwalter: seltener Riesenposten (8 %/Woche), ca. halber Preis, 1 Woche, Postfach-Hinweis, zusätzlich zum Pool
   - Express-Druckerei: On Demand (ersetzt Phillip), Großhändler-Preis × Aufschlag
2. **Beziehungsstufen je Händler über die Anzahl der Käufe** (3/8/15 → Bekannt/Stammkunde/Partner), nicht über den Umsatz in €. So bleiben die Schwellen unabhängig von der Geld-Skala (`MERCH_UNIT_SCALE`, Fanshop-Stufe), und der Spieler versteht sie sofort („noch 2 Käufe“). Kein Verfall in v1.
3. **Express-Aktionswochen** (die alten Phillip-Fenster) wirken nur auf On-Demand-Kosten.
4. **Express-Basispreis = bester Großhändler-Preis**, nicht der beste Marktpreis. Sonst würden Restposten und Insolvenz-Posten das Eilangebot billiger als jeden normalen Einkauf machen.
5. Alte Spielstände: Angebote ohne `vendor` werden beim Normalisieren dem Großhändler zugeordnet. Es gibt keine Save-Migration, weil das Feld beim Lesen optional ist.

## Alternativen

- **Nur UI-Umbenennung** (Händlername aus Losgröße ableiten): schnell, aber Schnäppchen würden sich nicht anders verhalten. Verworfen.
- **Beziehung über €-Umsatz**: realistischer, aber stark abhängig von der Balance und schwer zu kommunizieren. Bei Bedarf später möglich.
- **Viele zufällige Händler-Instanzen pro Archetyp**: mehr Vielfalt, aber Beziehungen würden sich verteilen und ihre Wirkung verlieren. Verworfen für v1.

## Konsequenzen

- Der Ø-Einkaufspreis sinkt leicht gegenüber vorher (Preisband 0.76–1.18 → Mix um ~0.85). Die Balance muss im Playtest geprüft werden (`MerchandisingAnalyticsPanel`).
- Ohne Phillip-Rabatt fehlt in den Aktionswochen die künstliche Nachfragespitze im Fanshop.
