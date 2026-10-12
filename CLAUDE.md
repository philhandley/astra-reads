# Astra Reads: build instructions

Read `PLAN.md` first (the specification). The briefs in `research/` are the source of truth for every phonics rule, question level and creature fact; the plan defers to them.

## Who this is for
Finn (6, Year 2, Little Wandle Phase 5) reads with Mum or Dad on a Samsung Galaxy Tab (the app never assumes which: say "the grown-up" or "together", not "Dad") in landscape, with his little brother Zeb (3) listening in. The stories star Finn and Zeb as explorers. Finn reads the pages; everyone talks about the choices; the Commander (Finn) taps.

## Sister apps
Astra Finn (`C:\1 Astra Nova - Finn`, the space app), Astra Maths (`C:\1. Astra Nova Synthesis  - Maths Tutor`) and Astra Bleeps (`C:\1. Astra Bleeps - Chiptunes`). This app is its own GitHub repo (`philhandley/astra-reads`), live at https://philhandley.github.io/astra-reads/. All four apps share one origin, so the service worker only deletes caches with the `astrareads-` prefix and the manifest `id` is the absolute `/astra-reads/`.

## Hard constraints of this machine
- No Node.js and no npm. No build step, bundler or framework.
- Python 3.12 with Pillow: icons (`python tools/make_icons.py`), pictures (`python -I tools/img_in.py`), checks (`python tools/check_phonics.py`), the service worker list (`python tools/build_sw.py`).
- Local test server: `python -m http.server 8300 --bind 127.0.0.1` (8100 is the maths app, 8200 is Bleeps).
- git with Git Credential Manager; no `gh`.
- Bash heredocs with apostrophes break in this shell: write files with the Write tool.
- Windows Smart App Control is on: pip packages with new unsigned native DLLs (safetensors, spaCy, scikit-learn) are blocked. Do not change that setting; Kokoro voices run in the browser instead (`tools/voice_server.py` + `dev/voices-make.html`).

## Technical rules
- Plain HTML, CSS and ES-module JavaScript. No libraries. Google Fonts (Andika for story text, Lexend for the interface) is the only third-party request.
- Relative paths everywhere (GitHub Pages sub-path).
- `localStorage` key `astrareads.v1` only. No backend, accounts or analytics.
- Pictures: only Figma `generate_image` with `gemini-3.1-flash-image` (or the same Gemini model by API), so every book matches. Codex (gpt-image) was tried on 12 Oct 2026 and rejected as inconsistent; do not use it for book pictures. For reference only, the old Codex route was: `python tools/codex_images.py <book> --refs <ref1.png> <ref2.png> --` makes every missing picture three at a time with the Codex app's image generation, passing existing pictures as references for the boys and the style; check them with `python -I tools/contact_sheet.py <book>`. (2) Figma `generate_image` (3,000 AI credits a month on the Professional plan, about 15 a picture). Either way, pictures follow the style brief in `tools/prompts.py` (one brief per page, stored in the book JSON as `prompt`), brought in with `tools/img_in.py` (trims white bars, 1600 px, WebP, 300 KB max). The page renderer falls back to a soft tinted block if a picture is missing, but every shipped page should have one.
- Speech is recorded: Kokoro `bf_isabella`, chosen by Phil on 12 Oct 2026. Sentences are spoken at speed 0.85, one at a time, and joined in the app with a 0.35 s pause ("slower, with pauses"). Single words use speed 0.9 and are not slowed. `js/core/speak.js` plays a line from `assets/audio` when every sentence in it has a clip, otherwise it falls back to `speechSynthesis` (en-GB).
- After changing any text that is read aloud (book JSON, or a `speak()` call in `js/story.js` or `js/quiz.js`, mirrored in `dev/voice-lines.js`), record the new lines: `python tools/voice_server.py 8303`, then open `http://127.0.0.1:8303/dev/voice-build.html` (headless Edge with `--dump-dom "...?hold=7200"` works; progress goes to `tools/voice/progress.log`). It records only missing clips. Then run `python tools/voice_pack.py` and `python tools/build_sw.py`. Pronunciation fixes (km, kg, sound names, the word "a") live at the top of `dev/voice-build.html`; check new names or numbers with `dev/voice-probe.html?say=...`.

## Reading rules (PLAN.md section 2)
- Every word is Phase 2 to 5 decodable or a Little Wandle tricky word listed in the book's `tricky` array. Names are fine.
- At most two lines a page, each at most 44 characters. One focus-sound word on nearly every page.
- One vowel sound per story, three spellings, shown in `sound.spellings` (use `a-e` for split digraphs). The highlighter and sound buttons live in `js/core/phonics.js`; `tools/check_phonics.py` mirrors its tables, so change both together.
- Choices: one or two which-way choices and one Big Question with three options, no right answer, and a `reveal` with a source URL. Branches fold back; no fail states.
- Four questions following Blank's levels 1 to 4, each with a `hint` page for Look back. Level 1 uses picture options (`img` is a page id from the main path).
- Debrief question and a patch at the end. No scores anywhere. Nothing frightening.

## Testing
- `python tools/check_phonics.py [book-id]` checks structure, line lengths, focus words and pictures; with a book id it lists every word with its sound buttons for eyeballing.
- `bash tools/shot.sh <name> "<path-and-hash>" 1280,800 6000` takes a headless Chrome screenshot (port 8300) and prints console lines. Deep links: `#/book/dino-1?page=c2`, `?step=casefile|quiz|debrief|patch`. Add `?nosw` before the hash to skip the service worker.
- `python tools/build_sw.py` after any change, before committing. Offline test: `python tools/slowserve.py 8301`, then `bash tools/swtest.sh` (headless Edge; headless Chrome fails cache writes on this PC).

## Done means
Installed from the public link on the tablet, one story read end to end (cover, sound card, pages, a Big Question, Case File, four questions, debrief, patch) with no console errors, and the app still opens with Wi-Fi off after one online visit.
