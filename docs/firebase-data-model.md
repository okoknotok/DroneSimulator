# Firebase Data Model

## Configuration

Edit `public/js/firebase-config.js` with the Firebase Web App config. If the config is empty, the app stays fully usable offline and only uses `localStorage`.

## Collections

### `progress/{userId}`

Stores the latest level progress snapshot for one user.

- `userId`: Firebase Auth user id.
- `progress`: map keyed by `level-0`, `level-1`, etc.
- `updatedAt`: Firestore server timestamp.

### `submissions`

Stores each programming run result.

- `userId`: Firebase Auth user id.
- `levelId`: stable level id, for example `level-1`.
- `levelName`: display name.
- `result`: `completed` or `failed`.
- `moves`: total movement count.
- `attempts`: current attempt count.
- `blocklyXml`: submitted Blockly XML.
- `createdAt`: Firestore server timestamp.

### `customLevels`

Stores shared builder levels.

- `ownerId`: Firebase Auth user id.
- `v`: share-code data version.
- `meta`: name, description, goal, and hint.
- `s`: start position.
- `t`: target position.
- `o`: obstacles.
- `c`: checkpoints.
- `tr`: treasures.
- `createdAt`: Firestore server timestamp.
- `updatedAt`: Firestore server timestamp.

### `missionProgress/{userId}`

Stores mission story mode progress for one user.

- `userId`: Firebase Auth user id.
- `progress`: map keyed by `chapterId.missionId`, for example `campus.takeoff`.
- `updatedAt`: Firestore server timestamp.

Each progress entry may include:

- `completed`: boolean.
- `stars`: best star string, for example `★★☆`.
- `bestMoves`: lowest move count.
- `bestBattery`: highest remaining battery percentage.
- `bestBlocks`: fewest Blockly blocks used.
- `completedAt`: ISO timestamp.
- `attempts`: number of completed runs.

### `missionLeaderboard`

Stores public best-effort mission runs for anonymous leaderboard display.

- `userId`: Firebase Auth user id.
- `missionId`: mission id, for example `takeoff`.
- `chapterId`: chapter id, for example `campus`.
- `missionTitle`: display title.
- `stars`: star string.
- `moves`: move count.
- `battery`: remaining battery percentage.
- `blockCount`: Blockly block count.
- `displayName`: user display name or guest label.
- `createdAt`: Firestore server timestamp.

## Next Collections

- `users`: profile, role, class id, display name.
- `classes`: teacher-owned class metadata.
- `leaderboards`: precomputed top scores by level or class.
