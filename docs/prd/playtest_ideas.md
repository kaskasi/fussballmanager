
::: open peeps female in profile :::
its weird that there are male and female players,
- according to gemini:

No, Open Peeps does not have an explicit gender setting or category toggle.
The library operates as a modular, mix-and-match building block system rather than classification by demographics. However, you can deliberately craft characters that lean masculine, feminine, or gender-neutral by combining specific physical features yourself:
• Hair & Facial Hair: You can select shorter, longer, tied-up hairstyles, or add a beard or mustache component to signal gender traits.
• Clothing & Poses: You can choose from various tops, bottoms, dresses, and poses (bust, sitting, or standing) to convey the desired presentation.
• Platform Implementation: If you use Open Peeps via DiceBear's API to dynamically generate avatars, it uses individual feature arguments (like head, face, body, or beard) rather than a master gender configuration.
Ultimately, the options describe style features rather than a specific identity, leaving how the characters are perceived entirely up to you.


-> Also now I get the plan, create, 300 profiles, and throw manually out all females, nice, I can do a couple of these sessions, problem was, tiieing an image to a player (may be you can fake that by remembering which profile s where opened for which user and when I open a profile or show an Image I first check if I had shown this player before and if yes which image was used, this is lightweight, but looks consistent, could be a hassle in long runs)

::: Umtrainieren :::

- Spieler umtrainieren ist super wertvoll, daraus sollte ein mini minigame werden. 
- Es gibt einen Slider. Da kann man einstellen wieviele Wochen der SPieler die neue Position trainieren soll. 
- In diesem Zeitraum gibt es eine Chance das der Spieler die neue Rolle erlernt hat based on : Mentalen Attributen des SPielers, evtl gibt es bonus oder fähigkeiten (zb. anpassungsfähig, mit der man schneller lernt) + ob der Spieler vertraut ist mit der Position (Abw/MIT/ANG, ein CB wird schneller RB als RW) + eingestellte Dauer. 
- Manche lernen schneller manche langsamer. Wenn ich eine zu kurze Zeit einstelle, schlägt mein roll fehl, wenn ich zu hoch einstelle habe ich trainingsressourcen verschwendet,
- wenn ein Spieler eine Rolle beim zweiten mal nicht gelernt hat wird er es wohl nie lernen, option wird nicht mehr angezeigt, Kommentar, das hatten wir doch schon versucht...
- **Stand 2026-10-06:** umgesetzt als PRD 07.7 (Abschluss-Roll, Slider-Vorschau im Training).


::: Trainig Camp Screen :::

A 3 x 2 Grid of Camp Card, with small picture of the countryside(jan needs to go and get), name of coach, small cta to hire and fire, and list of players, their position and ca

- **Stand 2026-10-06:** 3×2 `YouthCampCard` auf Jugend-Tab Camps; Fotos via `npm run bake:camp-photos` (pd_images → `public/assets/photos/camps/`).
- **Camp-Leiter:** Brief-Icon → Agentur-Toast → 5 Werktage NEXT → Hub **Camp-Personal** → 3 Kandidaten-Modal → Campus/Camps.


::: Real Club logos :::
- this would  would be help with immersion, Nordstern is not just a dot in green, no Nordstern ist  cool and sophisticated because it has a really cool logo, I can help do research ping me when help is needed

- **Stand 2026-10-06:** Canva-SVG-Set + `ClubCrest`/`club-logo.ts`; Legal/Attribution in `docs/design-refs/logos/README.md`, `npm run bake:club-logos`.

::: calendar :::

- tldr: instead of jumping from Mo->Sa->Game->Mo, we could use the calendar and show real progression of time along the days of the month. 
- why? this gets some anticipation before the match as well i believe,  


- we would have to introduce time as a real concept
- the calndar looks nice but entries are completely wrong. every day is filled with same oponent, for a week and then moves on to next opponent, expected, show only one entry

- **Stand 2026-10-06:** NEXT = +1 Wochentag (PRD 09.3); Sa-Spielchip einmal pro Spieltag; „Training“-Chip am heutigen Nicht-Spieltag; Monatsfokus folgt `week`.

::: Transferphase :::

Bugs beim Spieler kauf in woche 2 sommertransferfenster, 



::: Mobile Issues :::

Low priority but easily fixable

- **Stand 2026-10-06:** CSS-Pass @480px (`screen-layout.css`); Audit `docs/design-refs/mobile-p2/AUDIT.md` — Screenshots optional nachreichen.



::: General Impression ::: 

- What a great game, 

- it will be worth to keep investing time into it

- it needs more balancing (I can fill the whole Infra and expand the stadium in the first 5 min of the game an)

- new features are not neccessarily more main payoff

- Continue work on director, existing features, improve the engine, text commentary, 



- verletzungen is next session

- what is missing, more world to experience, different leagues and countries, instead of going all premier league and la liga, what if we did offer international leagues but on a similar cozy level,  regional areas in italy for example the beautiful toscana, and in france it has to be la bretagne n'estce pas? In England we need to stay far away from London and Manchester, What is going on in the isle of man they have their own league? whaaat????, cool, and international leagues, in africa in sahara africa and west africa, i dont know my way around there  

- most impact more story events,  