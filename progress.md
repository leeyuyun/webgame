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
Update 3:
- Reworked gameplay progression for user feedback:
  - Faster horizontal pursuit with directional chase assist.
  - Added Shift boost for manual burst movement.
  - Added level/weapon progression at score 700/1700/3200.
  - Weapon upgrades: single -> dual -> triple -> ace wing pattern.
  - Increased scoring pace and tuned spawn pacing to reduce grind.
  - Added HUD indicators: level, weapon, next upgrade score, win score.
  - Expanded render_game_to_text with progression fields.
Update 4:
- Fixed major pacing issue where firing was effectively single-shot in automation/manual hold cases.
- Added hold-to-fire behavior (holding Space now continuously fires by cooldown).
- Reworked collision outcome from instant death to life loss + temporary invulnerability.
- Tuned spawn/speed to keep pressure but allow consistent progression.
- Verified progression in automated run:
  - Reached LV3 (TRIPLE), LV4 (ACE WING), and VICTORY (score 5340).
  - Screenshots confirm weapon upgrade banners and victory panel.
  - No console/page errors generated.
Update 5:
- Implemented dual progression system:
  - Player progression by score (weapon levels unchanged in concept).
  - Enemy progression by score with explicit enemy levels and wave labels.
- Added enemy wave tiers and archetypes:
  - Scout swarm, intercept wing, siege fleet, meteor storm.
  - New enemy types: interceptor, gunship (shoots), meteor (high HP, splits).
- Added enemy bullet system and rendering.
- Added enemy upgrade banner + HUD status for enemy level and next enemy threshold.
- Expanded render_game_to_text with enemy level, wave, enemy bullets, and enemy types.
Update 6:
- Added documentation updates for dual progression in README.
- Automated verification confirms enemy progression now visibly advances by score:
  - E-LV2 (INTERCEPT WING) observed.
  - E-LV3 (SIEGE FLEET) observed.
  - E-LV4 (METEOR STORM) observed with meteor-type enemies and enemy bullets.
- Victory run reached score 5739 with player/enemy both at LV4.
- No console/page runtime errors in latest test cycle.
