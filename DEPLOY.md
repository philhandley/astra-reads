# Getting Astra Reads onto the tablet

## Where it lives

**https://philhandley.github.io/astra-reads/**

This folder (`C:\1. Astra Reads - Phonics`) is the GitHub repository `philhandley/astra-reads`, published by GitHub Pages from `main`. It has its own address outside the other Astra apps, so the tablet installs it as its own app.

## Updating it after a change

```bash
python tools/build_sw.py
```

```bash
git add -A && git commit -m "Update Astra Reads" && git push
```

GitHub Pages redeploys in about two minutes.

## Installing on the Samsung tablet

**Chrome:** open the address, tap the three-dot menu, then **Add to Home screen**, then **Install**.

**Samsung Internet:** open the address, tap the menu (three lines, bottom right), then **Add page to**, then **Home screen**.

Then:
- Open it once on Wi-Fi and open one story, so everything (including all the pictures and the reading font) is saved for offline use. After that it works with Wi-Fi off.
- Turn the tablet sideways. It is designed for landscape.
- Turn the media volume up for the Read-to-me and tap-a-word speech. Chrome on Samsung uses the Google UK English voice; if it sounds American, install the UK voice in the tablet's text-to-speech settings.

## A reading session (about 15 minutes)

1. Pick a story on the shelf. The cover card says which sound to listen for.
2. The Sound card: tap the three spellings and say the words together.
3. The Tricky words card: tap each one. These do not play by the rules.
4. Finn reads each page. Tap any word to hear it and see its sound buttons. The speaker reads the page after Finn has had a go. The sound badge at the top right switches the underlines on and off.
5. At a choice, talk first. The Big Question has no right answer: the point is the chat. Then the Commander taps an option twice.
6. Case cracked! Read the Case File together (the speaker reads each fact).
7. Four questions, easy to hard. A miss gets "Have another look" and a Look-back picture. No scores.
8. Debrief: "What was your favourite part?" plus one question, then the patch.

Read it again another day and pick the other branches: the Crew Log (under Patches) remembers what Finn chose.
