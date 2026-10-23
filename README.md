# Vorax Simulator and Solver

Fan-made tools for the Surgical Preparation minigame in Torchlight Infinite (SS11, Vorax):

- **Simulator:** practice runs and a sandbox, with the [Optimal Play](OPTIMAL_PLAY.md) guide.
- **Solver:** advice for your real game. It reads your screen, from a pasted screenshot or by following your game as you play, and shows the best move. It only reads: it never clicks or types for you.

**Use them:** https://voraxlab.pages.dev/tli-vorax-simulator/ (the landing page links to both).

**Strategy:** see [Optimal Play](OPTIMAL_PLAY.md) for which instruments and potions to take, based on simulated games played by bots that never see the dice.

Inspired by [Moebing/Torchlight-Infinite-SS11-Vorax-simulator](https://github.com/Moebing/Torchlight-Infinite-SS11-Vorax-simulator). © 2026 tidewarden, all rights reserved: see [LICENSE](LICENSE).

## The Solver

The Solver has three ways to get your board:

- **Live** (Chrome or Edge on a PC). Connect the game's log and share the game window. Each time the log shows a move, the Solver waits for the cards to settle, takes one picture of the window, reads the board and updates the advice.
  - Turn the game's log on first: press Esc, open **Account Related**, click **Enable Log**, then log out and back in.
  - Drag `UE_game.log` onto the page from the log folder, usually `C:\Program Files (x86)\Steam\steamapps\common\Torchlight Infinite\UE_game\TorchLight\Saved\Logs`. Chrome won't open files under Program Files from its file window, but dragging works.
  - Play with the game windowed or borderless.
- **Screenshot.** Paste (Ctrl+V), drop or choose a screenshot of the Surgical Preparation screen.
- **Manual.** Set the tanks, the cards on offer and your instruments yourself.

Every field it reads can be corrected. Anything it's unsure of is marked ⚠. A card it doesn't know asks "What is this?", and your answer is remembered in your browser. If it misreads your screen, its **Report this** box gives you text to paste into a GitHub issue, with a link that opens the issue form.

**What it can see.** Only the log file you give it, from the moment you connect it, and only the one window you share, when the log shows a move. Pictures stay in your browser and are gone when you close the tab; they are never uploaded. The boards it reads are shared without pictures unless you switch sharing off (see [Live data](#live-data-measuring-the-real-odds)), and so is an instrument icon you name with "Which instrument did you pick?": the name and the icon's 24x24 grey pattern, never a screenshot. The text reader it uses for card names (Tesseract) is downloaded from a CDN the first time.

The Solver's approach (following the game log and reading the shared game window in the browser) comes from CoffeeBns's [Tartarus Simulator](https://github.com/blahdot3h/tartarus-simulator) ([twitch.tv/coffeebns](https://twitch.tv/coffeebns)), used with permission. The code here is our own.

### What the game log shows

The log holds no game data: no card, monster, Activity or round. It shows only *when* things happen, so the Solver uses it as a trigger and reads everything else from the picture.

| Log line | Meaning |
|---|---|
| `PushMgr:RecvPushCombineMsg ProtoId = 5619` | The server sent the new board (after Confirm or Refresh) |
| `S13GamePlayMain Run` | The game screen opened |
| `S13GamePlayMain_C_RefreshBtn` | A refresh |
| `ProtoId = 5621`, `S13GamePlayMain Hide`, `S13GamePlayReward_C_FightBtn`, `S13GamePlayReward_C_GiveUpBtn` | The game ended |
| `Play_UI_S13_KYZ_Card_*` | Card and number animations (`KYZ_Card_Figure_Refresh`: the numbers have landed) |

### Rebuilding the screenshot reader

The reader (`src/solver/scan/`) reads the board by pixel matching against reference data (`src/solver/scan/data.json`) made from labelled frames of live games, and the cards by their printed names with a text reader (OCR, [Tesseract.js](https://github.com/naptha/tesseract.js), as the Tartarus Simulator does):

- **Board** (tanks, numbers, rarity, archetype, round, refreshes, equipped instruments): pixels. Rarity and archetype are read from colour; digits and the instrument panel's icons by comparing with examples.
- **Cards**: each card's title area is straightened, its bright text lifted off whatever glows behind it, and read by OCR (`titles.ts`). The text is matched to the known names, allowing for misread letters and for the end of a title hidden under the next card. A clearly read name decides; when two names fit about as well (Potion Kit (Small) inside Rare Potion Kit (Small)), the card's picture picks between them; when the title can't be read (a card in motion), the picture decides alone, and a card matching no picture asks "What is this?".
- **Instruments** are remembered through a game (`track.ts`): a new icon in the panel must be one of the three instruments just offered.

A card raised by the mouse, or covering the header, is still read: its title is found higher up, and the names show which kind of pick it is. A full read takes about half a second.

1. Open `solver.html?capture`, connect the log and window as for Live, and pick a folder under **Save frames to a folder**. Every board is saved there as you play, with the log lines that triggered it.
2. Copy the frames into `training/` (git-ignored) and label them in `scripts/scan/truth.json` (whole boards) or `scripts/scan/cards.json` (a frame's hand only: `hover` marks a card raised by the mouse, which is kept out of the picture examples).
3. `npx vite-node scripts/scan/build.ts` makes `data.json`.
4. `npx vite-node scripts/scan/score.ts` scores the reader: each frame is read with data built from the others (and without any frame of the same hand in the same game), as captured and rescaled to 0.75x and 1.5x. `--quick` skips the rescaling; `--text` reads card names with OCR, as the site does.
5. `npx vite-node scripts/scan/fixture.ts <frame> <out>` makes a small test fixture (only the parts the reader looks at).

Accuracy on four labelled games at 3440x1440 (2026-10-18): 65 whole boards, each read with reference data built from the others (and from no frame of the same hand), plus 633 cards from frames captured every 500 ms, 233 of them with a card raised by the mouse. Cards read as the site reads them, by name with OCR and by picture where a name can't be read:

| Scale | Tanks | Rarity | Archetype | Numbers | Round | Phase | Cards | Refreshes | Instruments |
|---|---|---|---|---|---|---|---|---|---|
| As captured | 100% | 100% | 100% | 100% | 100% | 100% | 99% | 100% | 98% |
| 0.75x (1080p) | 100% | 100% | 100% | 100% | 100% | 100% | 99% | 100% | 98% |
| 1.5x | 100% | 100% | 100% | 100% | 100% | 100% | 99% | 100% | 98% |

Cards in the 500 ms frames: 100% of 400 at rest and 100% of 233 with a card raised. The misses left are a card with a single example (Potion Kit (Small), whose picture can't be checked against itself) and an empty instrument panel whose only example is the frame left out. Rescaled frames stand in for other resolutions; 16:9 screens still need frames of their own.

## Live data: measuring the real odds

The simulator's offer odds started as guesses: every potion equally likely, a flat 1% Supreme chance, instrument offers uniform, starting tanks 30/40/20/10 by rarity. The Solver shares the boards it reads so these can be measured. Only boards read with certainty (or corrected by the player) from a real screen are shared, with no picture, no time and nothing about the player, and sharing has an on/off switch under the advice.

- `worker/`: the collector, a Cloudflare Worker with a D1 database (see `worker/README.md` for setup).
- `scripts/nightly.sh`: the nightly jobs, run on the owner's PC every night at 4:00 from Windows' Task Scheduler (`scripts/local/schedule.ps1`; Actions minutes cost money on a private repo). The live-data job pulls new boards into `data/live/raw/` and named instrument icons into `data/live/icons.jsonl`, writes `data/live/rates.json` (live odds with 95% ranges next to the engine's), applies the odds changes they support (30+ observations, a 95% range that excludes the current value, at most 2x per update), runs the tests and commits. Then the daily check and the smarter player, when the odds changed. Each job's outcome goes in `data/live/nightly.jsonl`, the dashboard's Loops table.
- By hand: `npx vite-node scripts/live/pull.ts` (with `LIVE_DATA_URL` and `LIVE_DATA_TOKEN`), then `npx vite-node scripts/live/weights.ts` to apply the proposed weights.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173/tli-vorax-simulator/.

## Other commands

| Command | What it does |
|---|---|
| `npm test` | Run the test suite |
| `npm run lint` | Lint the source |
| `npm run build` | Build the static site into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

Pushes to `main` deploy to GitHub Pages automatically (`.github/workflows/deploy.yml`, which runs the tests first).

## Reporting issues

Found a card or instrument that behaves differently from the game, a wrong translation, or a bug? Please [open an issue](https://github.com/tidewarden/tli-vorax-simulator/issues/new/choose) (there's also a **Report an issue** link in the app). Include:

- the card or instrument name
- what you expected (ideally with an in-game screenshot)
- what the simulator did instead
