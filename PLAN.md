# Astra Reads: the plan

A phonics storybook app for Finn (6, Year 2, Little Wandle Phase 5) and his little brother Zeb (3), read with Mum or Dad on a Samsung tablet in landscape. It is the fourth sister app after Astra Finn, Astra Maths and Astra Bleeps, and it borrows their shape: a static PWA, no build step, installed from GitHub Pages, works offline.

## 1. What it is

A shelf of **Explorer Cases**: interactive decodable stories in which Finn and Zeb are explorers. Four themes, each planned as a ten-chapter series. Chapter 1 of each theme ships first.

| Theme | Series | Finn is | Zeb is | Chapter 1 | Sound |
|---|---|---|---|---|---|
| dino | Time Travellers | the time scientist | the spotter | The Dino Trail (Maiasaura nests) | /ai/ ai, ay, a-e |
| space | Space Explorers | the pilot and scientist | the co-pilot | Night Flight (a safe spot for a Mars base) | /igh/ igh, i-e, y, ie |
| wild | Wildlife Explorers | the wildlife scientist | the camera kid | Deep in the Green (counting mountain gorillas) | /ee/ ee, ea, y, e-e |
| ocean | Ocean Explorers | the sea scientist in the pod | the diver | The Glow Below (a glow in the sea, an octopus) | /oa/ oa, ow, o-e, oe |

Every chapter follows the Explorer Case formula (research/03): the Den, a ping (a call for help or a question nobody can answer), gear up and a vehicle, arrival, a which-way choice, meeting the creature or place, a Big Question with no right answer, the real feature of the creature or place helps, home and "Case cracked!", then the Case File (real facts), four comprehension questions, a debrief and a patch.

## 2. Reading rules (from the handwritten brief)

- Level: Little Wandle Phase 5 (Oxford Reading Tree Phonics Level 5). Every word is decodable with Phase 2 to 5 grapheme-phoneme correspondences or is a Little Wandle tricky word (research/01). Names (Finn, Zeb, Mars) are allowed.
- **At most two lines of text per page**, each line at most about 40 characters.
- **One vowel sound per story**, shown with three or four of its spellings (for example /ai/ as ai, ay and a-e: wait, stay, race). Each page carries one to three focus words. The app can underline the focus grapheme in the theme colour ("Spot the sound").
- Tap any word to hear it and see its sound buttons. A Read-to-me button reads the page after Finn has had a go (never automatic on story pages).
- A Sound card opens each story (the sound, its spellings, example words to tap) and a Tricky-words card lists the tricky words in the story.
- Two or three choices per story: one or two **which-way** choices (fun, both fine) and one **Big Question** (a dilemma with three picture-sized options, no right answer, a reveal that says what real explorers do without crowning an option). Branches are one or two pages and fold back into the story. No fail states.
- At the end: **four multiple-choice comprehension questions following Blank's levels** (1 find, 2 describe, 3 explain or predict, 4 reason). Level 1 uses picture options from the story. A miss gets "Not that one, have another look" and a Look-back picture, never a cross or a score.
- Then a debrief ("What was your favourite part?" plus one question for the grown-up reading along to ask; never names Mum or Dad) and a patch for the Crew Log.
- Finn and Zeb are the heroes of every story. Nothing frightening: no one is hurt or in danger.

## 3. Pictures

Every page has its own picture (one or two consecutive pages may share one), generated to a fixed style brief (tools/IMAGES.md) so the brothers look the same from page to page: clean bold flat cartoon, thick outlines, bright colours, like a modern animated kids' detective show. Finn: six, taller, short strawberry-blond hair, blue-grey eyes, freckles, big smile. Zeb: three, blond bowl cut, big blue eyes, cheeky grin. Covers are 4:3, pages 16:9. Stored as WebP, 1600 px and 300 KB max, in `assets/img/books/<book>/`.

## 4. Screens

1. **Home**: the shelf. Four theme rows with the chapter cover, the sound badge, a done tick, and ghost cards for chapters to come. Buttons for Case Files and Patches. A speaker toggle and a settings gear (Spot the sound, Read questions aloud, Reset).
2. **Story**: cover card → Sound card → Tricky-words card → pages → Case cracked → Case File → Questions → Debrief → Patch.
3. **Case Files**: the collection of fact files earned so far, Creature Cases style.
4. **Patches**: the chapter patches earned, plus the Crew Log of choices made.

## 5. Content format

`content/books.json` lists the themes and chapters. Each chapter is `content/books/<id>.json`:

```
{ id, theme, chapter, title, blurb, cover,
  sound: { phoneme, label, spellings: ["ai","ay","a-e"], examples: { ai: "wait", ay: "stay", "a-e": "race" } },
  tricky: ["the", "said"],            // tricky words that appear, in order
  words: { "shake": "sh|a_e|k" },      // optional sound-button overrides
  start: "p1",
  pages: {
    p1: { img, text: ["line one", "line two"], next: "p2", prompt: "picture brief" },
    c1: { img, text, choice: { kind: "way" | "big", title, options: [{ label, next, icon }], reveal: { text, source } } },
    ...
  },
  casefile: { title, img, deadly, facts: [{ text, source }] },
  quiz: [{ level: 1, q, options: [{ text, img? }], answer, hint: "p5" }, ...],
  debrief: { question },
  patch: { name, colour, icon } }
```

## 5a. Picture status (11 October 2026)

Ten pictures are in: the Dino Trail cover and its first eight pages (p01 to p04, c01, b1a, b1a2, b1b). The other 66 (the rest of the Dino Trail, and all of Night Flight, Deep in the Green and The Glow Below, including covers and Case File portraits) are still to be generated. Every one already has its brief in the book JSON; `python tools/prompts.py <book> --missing` prints them ready to paste. Until then those pages show a soft themed backdrop. Generation stopped when Figma's `generate_image` returned "You have reached your usage limit" (the Starter team's AI allowance or the View seat's MCP allowance). Any generator works with the same briefs; describe the boys by appearance only, never by name.

## 6. Build order

1. Engine, styles, PWA plumbing, tools (this session).
2. Four chapter-1 stories, checked with `tools/check_phonics.py`.
3. Pictures for all pages and covers.
4. Test on the browser pane at 1280 x 800, then offline with Edge.
5. Publish to GitHub Pages as `philhandley/astra-reads`, install on the tablet.
6. Later: chapters 2 to 10 per theme, each on a new Phase 5 sound; more Case Files; a "Read it again" mode with the other branches.
