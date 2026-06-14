# Drone Blockly v3.4 Current Audit

## Protected User Flows

- Start menu shows three modes: programming, freeflight, and builder.
- Programming mode shows Babylon scene, Blockly panel, level panel, minimap, HUD, and run controls.
- Freeflight mode hides Blockly/level UI and shows game HUD, crosshair, instructions, countdown, score, stage, combo, lives, and game over modal.
- Builder mode shows placement toolbar, palette, builder info, test run, share code, import code, and clear controls.
- Returning to menu should stop/tear down the active mode without leaving mode-specific UI visible.

## Existing Core Functions

- Mode management: `enterMode`, `backToMenu`, `setupProgrammingMode`, `setupFreeflightMode`, `setupBuilderMode`.
- Level flow: `loadLevel`, `changeLevel`, `checkLevelComplete`, `applyAnswer`.
- Flight actions: `takeoff`, `land`, `move`, `turnLeft`, `turnRight`, `resetAll`.
- Blockly: custom blocks, `initBlockly`, `runProgram`, `clearBlocks`, `stopProgram`.
- Scene: `init3D`, `createGridFloor`, `createDrone`, `rebuildObstacles`, `drawMinimap`.
- Freeflight: `startEndlessGame`, `restartEndlessGame`, `updateEndlessGame`, `updateGameHUD`.
- Builder: `builderTestRun`, share code encode/decode, object placement, builder rebuild functions.

## Current Gaps To Improve

- No persistent local progress or saved Blockly drafts.
- No Firebase login, cloud progress, class, or leaderboard storage.
- `index.html` contains HTML, CSS, Blockly definitions, level data, Babylon scene code, game code, and builder code in one large file.
- Builder share code does not include a formal version or metadata layer.
- Blockly execution does not visibly highlight the currently running block.
- Level data lacks structured chapter, difficulty, learning objective, and unlock metadata.
- Teacher/student modes are not yet separated.
