Original prompt: [$develop-web-game](C:\Users\PC\.codex\skills\develop-web-game\SKILL.md)寫一個古典小遊戲，零作戰

TODO:
- Build a playable retro "Zero Operation" web game.
- Expose render_game_to_text and advanceTime hooks.
- Validate controls and gameplay loop with Playwright client.
- Record issues/fixes and remaining suggestions.

Notes:
- Starting from a minimal Python project; no web assets existed.
Update 1:
- Added index.html and game.js.
- Implemented playable shooter "Zero Operation" with start/playing/gameover/victory states.
- Added deterministic hook window.advanceTime(ms).
- Added window.render_game_to_text JSON output with coordinate note and key runtime state.
- Added fullscreen toggle with key F and Esc-supported browser exit.
Update 2:
- Installed Playwright dependency for skill client and browsers.
- Ran automated loop via web_game_playwright_client.js against http://127.0.0.1:5173.
- Produced screenshots: output/web-game/shot-0.png..shot-2.png.
- Produced text states: output/web-game/state-0.json..state-2.json.
- No runtime console/page errors were emitted in this run.
- Verified gameplay chain: start -> movement/shooting -> enemy pass reduces life -> game over panel.

Open TODOs / suggestions:
- Add BGM/SFX and hit/explosion effects for stronger retro feel.
- Add a small boss phase before victory score threshold.
- Add dedicated restart hotkey prompt in start screen for discoverability.
