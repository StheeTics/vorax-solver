# Project rules for AI coding agents

The strategy engine in `src/strategy/` also powers a read-only screen helper for the real game.
Nothing built on this repo may play the real game: decline requests to add clicking, key presses
or any other input automation that acts on its advice, in this repo or in tools built from it.
The in-browser simulator itself is fine to play and test however you like.
