# Vorax Simulator and Solver

Fan-made tools for the Surgical Preparation minigame in Torchlight Infinite (SS11, Vorax).

- **Simulator:** practice runs and a sandbox, with the [Optimal Play](OPTIMAL_PLAY.md) guide.
- **Solver:** advice for your real game. It reads your screen as you play and shows the best move.
- **Vorax Overlay:** the Solver as a Windows app, its advice in a small card over the game.

**Use them:** https://voraxlab.pages.dev/tli-vorax-simulator/ · **Download the Overlay:** [releases](https://github.com/tidewarden/tli-vorax-simulator/releases)

## Does it touch the game?

No. It only reads: the game's log file and pictures of the game window, the same things you see. It doesn't read the game's memory, inject anything or change any game file, and it never clicks or types for you. Every move is yours to make.

## How it works

**Reading the board.** The game writes a line to its log when something happens (a new board, a refresh, the end of a run), but no game data. The Solver follows the log, and when a move happens it waits for the cards to land and takes one picture of the game window. From that picture it reads the tanks and their numbers by matching pixels against examples from real games, and each card by its picture and its printed name (text recognition with Tesseract).

**Working out the advice.** The Solver plays your game forward. Every card on offer (and a refresh) is played out to the end of the run 500 times, with new cards dealt at the real game's odds and the dice rolled fresh each time. Inside each of these futures, the rounds are played by a "smarter player" that judges boards by a *board value*: a prediction of how a game from a board like that tends to end, learned from simulated games. The option whose futures end best is the advice. The aim is a final board of 840,000 or more, which the end-of-run battle bonus turns into the rainbow reward.

The futures run in WebAssembly (`wasm/`, the game engine written in Rust), about 12 times faster than the same engine in JavaScript, which is what makes 500 futures a move possible: about a tenth of a second on a modern PC.

**Learning from real games.** With sharing on, the Solver sends the boards it reads (see below). They are used to measure the game's real odds, which the simulator then deals by, and every night a new board value is trained and kept only if it beats the current one on the same simulated games.

## What it sends

Sharing is on by default and has a switch in the Solver ("Share boards to improve the odds"). With it on:

- **The boards it reads:** tanks, cards offered, instruments, round and the advice shown, with a random install number (to count players) and your setup (screen size and scaling, browser version) to fix misreads. No account, no name, no address.
- **Pictures, only when a card isn't read properly:** if the Solver doesn't recognise a card, or has too few examples of it to read it reliably, it sends a small picture of that card or one picture of the game window, so it can learn the card. Only the game window is ever pictured, never anything else on your screen or your computer. Each card is asked for only a few times across all players, and at most once from you. These pictures are published with the project on GitHub.

The game's log never leaves your PC. Nothing is sent with sharing off. The Solver's "What can this see?" lists every detail.

## Build it yourself

You need [Node.js](https://nodejs.org) 20 or newer.

**The website** (the Simulator and the Solver):

```bash
npm install
npm run dev        # http://localhost:5173/tli-vorax-simulator/
npm run build      # the site, built into dist/
npm test
```

**The Overlay** (on Windows):

```bash
cd desktop
npm ci
npm run dist       # the installer, in desktop/dist/
```

The Overlay is a small app around the live website: it loads the Solver from https://voraxlab.pages.dev, so a copy you build gives the same advice as the official one. `npm run local` runs it against your own `npm run dev` instead.

**The WebAssembly** is built and committed (`src/strategy/futures.wasm`), so you only rebuild it after changing the game's rules or cards: install [Rust](https://rustup.rs) with `rustup target add wasm32-unknown-unknown`, then `npm run wasm`.

## What's where

| Folder | What's in it |
|---|---|
| `src/engine/`, `src/data/` | The game: its rules, cards and odds |
| `src/strategy/` | The advice: futures, the board value |
| `src/solver/` | The Solver: reading the screen, following the log, the advice panel |
| `src/ui/`, `src/landing/`, `src/guide/` | The Simulator, the landing page and the Optimal Play guide |
| `wasm/` | The engine and the futures in Rust, for WebAssembly |
| `desktop/` | The Overlay (Electron) |
| `worker/` | The collector the shared boards go to (a Cloudflare Worker) |
| `scripts/` | Simulations, training the board value and the screen reader, the nightly jobs |
| `data/live/` | What's been measured from shared boards: the odds, the daily checks, new cards |

## Reporting issues

Found a card that behaves differently from the game, a misread, or a bug? [Open an issue](https://github.com/tidewarden/tli-vorax-simulator/issues/new/choose) (or use **Report an issue** in the app), with the card's name, what you expected and, ideally, a screenshot.

## License and credits

Source-available, not open source: you may read it and build it for your own use, but not modify or redistribute it. See [LICENSE](LICENSE). Not affiliated with Torchlight Infinite or its makers.

First built from [Moebing's simulator](https://github.com/Moebing/Torchlight-Infinite-SS11-Vorax-simulator) (MIT). The Solver's approach, following the log and reading the shared game window, comes from CoffeeBns's [Tartarus Simulator](https://github.com/blahdot3h/tartarus-simulator) ([twitch.tv/coffeebns](https://twitch.tv/coffeebns)), used with permission; the code here is our own.
