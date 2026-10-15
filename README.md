# Vorax Simulator

A fan-made practice simulator for the Surgical Preparation minigame in Torchlight Infinite (SS11, Vorax).

**Play it:** https://tidewarden.github.io/tli-vorax-simulator/

Based on [Moebing/Torchlight-Infinite-SS11-Vorax-simulator](https://github.com/Moebing/Torchlight-Infinite-SS11-Vorax-simulator) (MIT).

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
