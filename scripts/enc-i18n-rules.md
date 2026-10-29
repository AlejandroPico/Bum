# Translating the Bum encyclopedia

Bum is a 3D simulator of nuclear-weapon effects and asteroid impacts. Its encyclopedia is
museum-level popular science: clear, rigorous, engaging. You translate it from Spanish.

## Files

- Input chunk `enc-todo/NN.json`: `{"1": "Spanish text", "2": …}`. Texts are in reading order:
  article title, summary, search tags, then paragraphs, headings, list items, table cells, captions,
  quotes… (image/video captions and glossary entries come last). Neighbouring entries give context.
- Output `enc-todo/out/<lang>/NN.json`: a JSON object with EXACTLY the same keys and the
  translation as each value.
- Work one chunk at a time: Read it, Write its translation, run the check below, then the next.
  Never re-read your own output files except to fix a failed check.

Check after writing each chunk (run from /home/claude/ataque-nuclear):

    python3 -c "import json;a=json.load(open('enc-todo/NN.json'));b=json.load(open('enc-todo/out/LANG/NN.json'));assert a.keys()==b.keys(),set(a)^set(b);print('ok',len(b))"

## Rules

1. Natural, fluent, precise target language, as a quality science museum or encyclopedia would
   write it. Not word-for-word. Same meaning: do not add, drop, explain or summarise.
2. Keep markup exactly:
   - `**bold**` and `*italic*`: same number of `**` pairs.
   - `[[article-id|visible text]]`: keep `article-id` unchanged, translate only the visible text.
   - `[[article-id]]`: leave unchanged.
   - `[text](https://…)`: keep the URL.
   - `^{…}` and `_{…}` (super/subscripts): keep.
   - Keep symbols, units (km, kt, Mt, °C, Gy, Sv, rem, MJ, ua…), chemical symbols, formulas and
     isotope names (U-235, Cs-137).
3. Numbers and dates follow the target language (see your language section).
4. Proper names: use the usual form in the target language. Names of weapons, operations, tests,
   ships and missiles keep their official names (Little Boy, Castle Bravo, Tsar Bomba, Minuteman
   III, Topol-M…). Spanish-only descriptive names are translated (e.g. «Pruebas y bombas
   históricas»).
5. Short entries right after a summary are search tags: give the natural term a reader would type
   in the target language. One tag gives one translation; a name that does not change is repeated.
6. Book, film and report titles: the established title in the target language if there is one,
   otherwise the original (often English) title.
7. Quotations: translate them. If the quote was originally in the target language and you know the
   authentic wording, use it (e.g. Oppenheimer in English).
8. Output must be valid JSON: escape inner double quotes as \", no raw line breaks inside values.
   Write the whole chunk in a single Write call.

## Language sections

### en (British English)
- Spelling: colour, metre, centre, programme, defence…
- Numbers: decimal point («1,5» → 1.5); thousands with a comma («10 000» → 10,000; «2000» → 2,000
  except years).
- Quotes: “…”.
- Names: EE. UU. → US; URSS → USSR; Chernóbil → Chernobyl; Proyecto Manhattan → Manhattan Project.
- Terms: fallout, blast wave, fireball, overpressure, yield, air burst, ground zero / hypocentre,
  half-life, critical mass, warhead, re-entry vehicle, nuclear winter, fallout shelter,
  protection factor.

### ca (català normatiu, IEC)
- Numbers: decimal comma; thousands separated as in the source.
- Quotes: «…».
- Names: EE. UU. → EUA; URSS → URSS; Chernóbil → Txernòbil; Proyecto Manhattan → Projecte Manhattan.
- Terms: pluja radioactiva, ona expansiva, bola de foc, sobrepressió, potència, explosió aèria,
  zona zero / hipocentre, període de semidesintegració, massa crítica, ogiva, hivern nuclear,
  refugi antiatòmic.

### fr (français de France)
- Numbers: decimal comma; thousands with a space.
- Quotes: « … » with non-breaking spaces.
- Names: EE. UU. → États-Unis; URSS → URSS; Chernóbil → Tchernobyl; Proyecto Manhattan → projet
  Manhattan.
- Terms: retombées radioactives, onde de choc, boule de feu, surpression, puissance, explosion
  aérienne, point zéro / hypocentre, demi-vie, masse critique, ogive, hiver nucléaire, abri
  antiatomique.

### de (Deutsch)
- Numbers: decimal comma; thousands as in the source (space).
- Quotes: „…“.
- Names: EE. UU. → USA; URSS → UdSSR / Sowjetunion; Chernóbil → Tschernobyl; Proyecto Manhattan →
  Manhattan-Projekt.
- Terms: radioaktiver Niederschlag (Fallout), Druckwelle, Feuerball, Überdruck, Sprengkraft,
  Luftdetonation, Ground Zero / Hypozentrum, Halbwertszeit, kritische Masse, Sprengkopf, nuklearer
  Winter, Schutzraum.

### pt (português europeu, AO 1990)
- Numbers: decimal comma; thousands as in the source.
- Quotes: «…».
- Names: EE. UU. → EUA; URSS → URSS; Chernóbil → Chernobil; Proyecto Manhattan → Projeto Manhattan.
- Terms: precipitação radioativa (chuva radioativa), onda de choque, bola de fogo, sobrepressão,
  potência, explosão aérea, ponto zero / hipocentro, semivida, massa crítica, ogiva, inverno
  nuclear, abrigo antinuclear.

### it (italiano)
- Numbers: decimal comma; thousands as in the source.
- Quotes: «…».
- Names: EE. UU. → USA (Stati Uniti); URSS → URSS; Chernóbil → Černobyl'; Proyecto Manhattan →
  Progetto Manhattan.
- Terms: ricaduta radioattiva (fallout), onda d'urto, palla di fuoco, sovrapressione, potenza,
  esplosione in quota, punto zero / ipocentro, tempo di dimezzamento, massa critica, testata,
  inverno nucleare, rifugio antiatomico.

### ru (русский)
- Numbers: decimal comma; thousands separated with a (non-breaking) space, as in the source.
- Quotes: «…».
- Names: EE. UU. → США; URSS → СССР; Chernóbil → Чернобыль; Proyecto Manhattan → Манхэттенский проект;
  Hiroshima → Хиросима; Nagasaki → Нагасаки. Weapon/test names: the usual Russian form (Царь-бомба, «Малыш»
  for Little Boy, «Толстяк» for Fat Man, Castle Bravo → «Касл Браво»), keeping Latin codes (W88, B61, RDS-1 → РДС-1).
- Terms: радиоактивные осадки, ударная волна, огненный шар, избыточное давление, мощность (тротиловый
  эквивалент), воздушный взрыв, эпицентр / нулевая точка, период полураспада, критическая масса, боеголовка,
  ядерная зима, убежище, коэффициент защиты.
- Units in the Russian form: км, м, км², кт, Мт, °C, Гр, Зв, бэр… (keep «psi» as psi).
- Grammar with numbers: Russian nouns change after numbers. In templates where {0} is a number, prefer
  constructions that stay correct for any number (e.g. «Статей: {0}», «{0} км», «около {0} человек» —
  «человек» works for all numbers), or put the noun before the number.

## Interface strings (only if your task includes `enc-todo/ui/<lang>.json`)

That file is a JSON array of Spanish interface strings from the app: buttons, labels, captions of
animated diagrams, chart legends. `{0}`, `{1}`… are placeholders that must stay in the
translation (you may reorder them). Write `enc-todo/out/<lang>/ui.json` as an object
`{"<Spanish string>": "<translation>"}`. Use `null` for strings that need no translation: code,
CSS classes, place names identical in your language, symbols, brand names. Keep it short and
natural, like interface text.
