# Vorax Simulator and Solver

Fan-made tools for the Surgical Preparation minigame in Torchlight Infinite (SS11, Vorax):

- **Simulator:** practice runs and a sandbox, with the [Optimal Play](OPTIMAL_PLAY.md) guide.
- **Solver:** advice for your real game. It reads your screen, from a screenshot or by following your game as you play, and shows the best move. It only reads: it never clicks or types for you.
- **Vorax Overlay:** the Solver as a Windows app, with its advice in a small card over the game. Download it from [the releases](https://github.com/tidewarden/tli-vorax-simulator/releases).

**Use them:** https://voraxlab.pages.dev/tli-vorax-simulator/ (the landing page links to both).

The source is published to be read: it's source-available, not open source. See [LICENSE](LICENSE). Not affiliated with Torchlight Infinite or its makers. Inspired by and first built from [Moebing's simulator](https://github.com/Moebing/Torchlight-Infinite-SS11-Vorax-simulator) (MIT).

## How the advice works

The Solver plays your game forward many times before it answers.

1. **A shortlist.** Each card on offer, its best targets, and a refresh are the options. Each is tried on 8 fresh outcomes and the best few are kept.
2. **Futures.** Every option on the shortlist is played to the end of the run 500 times (250 on a PC with fewer than 8 threads), with new cards dealt by the live game's odds and the dice rolled fresh each time.
3. **A player inside the futures.** The rounds inside each future are played by the *smarter player*: it judges the boards a move could leave by the *board value*, a prediction of how games from a board like that tend to end, learned from simulated games and retrained every night. That lets it play for what pays off later (two Bone Sentries for Adherent Metatarsals, triples for Black Goat Gut Suture) instead of only for this round's score.
4. **The answer.** The option whose futures end best wins. The goal is a final board of 840,000 or more (the end-of-run battle bonus turns that into the rainbow reward), so each future counts up to 840,000 and no further: the advice pushes for the target without gambling past it.

Instrument picks are worked out the same way: each instrument offered, and a refresh, is played out 500 times.

The futures run in WebAssembly ([`wasm/`](wasm/), the game engine and the player written in Rust): about 12 times faster than the JavaScript engine, and checked against it on every test run to play exactly the same futures. A move takes about 0.1 s on 16 threads. Where WebAssembly can't load, the JavaScript plays 64 futures a choice instead.

On 480 simulated games with the same dice, 500 futures reached 840,000 in 78% of games, against 71% with the 64 the Solver used before.

**Rules the Solver adds:** an unknown Xenopanacea or a Holy Water rite (cards the simulator can't play out) is always taken; a Potion Kit on offer is taken instead of a potion refresh.

## The Solver

Three ways to get your board:

- **Live** (Chrome or Edge on a PC, or the Overlay). Connect the game's log and share the game window. Each time the log shows a move, the Solver waits for the cards to land, takes one picture of the window, reads the board and updates the advice.
  - Turn the game's log on first: press Esc, open **Account Related**, click **Enable Log**, then log out and back in.
  - In the browser, drag `UE_game.log` onto the page from the log folder, usually `C:\Program Files (x86)\Steam\steamapps\common\Torchlight Infinite\UE_game\TorchLight\Saved\Logs`. Chrome won't open files under Program Files from its file window, but dragging works. The Overlay finds the log by itself.
  - Play with the game windowed or borderless.
- **Screenshot.** Paste (Ctrl+V), drop or choose a screenshot of the Surgical Preparation screen.
- **Manual.** Set the tanks, the cards on offer and your instruments yourself.

Every field it reads can be corrected, and anything it's unsure of is marked ⚠. If it misreads your screen, **Report this** gives you text to paste into a GitHub issue.

### What it sees and what it sends

- It reads **only the log file you give it**, and **only the one window you share**, when the log shows a move or you press Snap now. Pictures stay in your browser and are gone when you close the tab, except the few below.
- **Board sharing is on by default**; turn it off with the switch beside Board state. With it on, the Solver sends to the project's collector (`worker/`):
  - **The boards it reads:** tanks, cards offered, instruments, round, the advice shown, and when a game ends its final score. With them a random install number kept in your browser or app (to count players and tell games apart) and a random number per game. No account, no name, no address: the collector counts uploads against a salted hash of your address that changes every day, and never stores the address.
  - **Your setup, to find out why some setups misread:** the picture's size, your screen's scaling, whether it's HDR, your browser and its version, how the numbers read, how long reading took, and in the Overlay the game window's size.
  - **An instrument you name** ("Which instrument did you pick?"): the name and the icon's 24x24 grey pattern, never a screenshot.
  - **A card it doesn't recognise:** a small picture of that card alone, with the text it read.
  - **A card it has almost no pictures of, or couldn't read quickly:** sometimes one picture of the game window (never the rest of your screen). Each card is wanted only a few times from all players, and at most once from you.
- **Card pictures and game-window pictures are published** with the project on GitHub: game-window pictures as `Training Data: <card>` issues and on the `training-data` branch, new cards in `data/live/new-cards/`. The odds and results measured from the boards are in `data/live/`.
- The text reader (Tesseract) is downloaded from a CDN the first time, and the site's fonts from Google Fonts.
- The Overlay keeps a debug log on your PC (`%APPDATA%\Vorax Overlay\logs\overlay.log`): the game's log path, the game window it found, and the Solver's timings. It isn't sent anywhere.

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
| `PageViewSetUIScale … PageScale = …` | The game's interface scale, which the reader uses to find the board |

### The screen reader

The reader (`src/solver/scan/`) reads the board by pixel matching against reference data (`src/solver/scan/data.json`) made from labelled frames of live games, and the cards by their pictures and their printed names:

- **Board** (tanks, numbers, rarity, archetype, round, refreshes, equipped instruments): pixels, at the interface scale the game logs. Rarity and archetype are read from colour; digits and the instrument panel's icons by comparing with examples.
- **Cards:** each card is matched by its picture while its title is read with OCR ([Tesseract.js](https://github.com/naptha/tesseract.js)); whichever settles it first wins. A picture match must be sure (a score of 0.95 and a clear lead); a title is read cheapest first (the title alone, then the whole title area), matched to the known names allowing for misread letters and for the end of a title hidden under the next card.
- **Instruments** are remembered through a game (`track.ts`): a new icon in the panel must be one of the instruments just offered.

A board's names take about half a second; a card with few reference pictures can take a second or two.

To improve it:

1. Run the dev server (`npm run dev`): it saves every board it reads, picture and read, to `training/reads/` (git-ignored). Or open `solver.html?capture` and pick a folder under **Save frames to a folder**.
2. Label frames in `scripts/scan/truth.json` (whole boards) or `scripts/scan/cards.json` (a frame's hand only). Training screenshots from players come in with `GH_TOKEN=… npx vite-node scripts/scan/pullTraining.ts`.
3. `npx vite-node scripts/scan/build.ts` makes `data.json`.
4. `npx vite-node scripts/scan/score.ts` scores the reader: each frame is read with data built from the others, as captured and rescaled to 0.75x and 1.5x (`--quick` skips the rescaling, `--text` reads card names with OCR, as the site does).

On 141 labelled frames (Oct 24), each read with reference data built from the others: tanks, rarity, archetype, numbers, round, phase and cards 100% (numbers 99% at 0.75x), instruments 99%.

## Live data and the nightly loop

The odds the simulator deals by (`src/data/liveWeights.ts`) are measured from the boards players share. The nightly loop (`scripts/nightly.sh`, run at 4:00 on the owner's PC) pulls new boards from the collector, writes the odds and their 95% ranges (`data/live/rates.json`), checks the advice on 240 simulated games (`data/live/history.jsonl`) and, when the odds changed, trains a new board value and proposes it as a pull request if it beats the shipped one on the same games (`data/sim/smarter-history.jsonl`).

- `worker/`: the collector, a Cloudflare Worker with a D1 database (see [`worker/README.md`](worker/README.md)).
- `desktop/`: the Overlay, an Electron shell around the live site (see [`desktop/README.md`](desktop/README.md)).

## Development

Requirements: Node.js 20 or newer and npm. Rust (with the `wasm32-unknown-unknown` target) only to rebuild the WebAssembly.

```bash
npm install
npm run dev
```

Then open http://localhost:5173/tli-vorax-simulator/.

| Command | What it does |
|---|---|
| `npm test` | Run the test suite |
| `npm run lint` | Lint the source |
| `npm run build` | Build the static site into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run wasm` | Rebuild `src/strategy/futures.wasm` after a change to the rules or the cards (needs Rust) |

Pushes to `main` deploy the site to Cloudflare Pages (`.github/workflows/deploy.yml`, which runs the tests first). Pushing a `vX.Y.Z` tag builds a new Overlay release.

## Reporting issues

Found a card that behaves differently from the game, a misread, or a bug? Please [open an issue](https://github.com/tidewarden/tli-vorax-simulator/issues/new/choose) (there's also a **Report an issue** link in the app). Include the card or instrument name, what you expected (ideally with an in-game screenshot), and what happened instead.
