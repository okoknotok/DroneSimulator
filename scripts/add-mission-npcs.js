/**
 * 為全部 26 關任務加入巡邏 NPC（避開起點與必達任務格）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const missionsPath = path.join(__dirname, '../public/data/missions.json');

const GRID_X_MIN = -7;
const GRID_X_MAX = 7;
const GRID_Z_MIN = -6;
const GRID_Z_MAX = 6;

const TASK_TYPES = new Set(['scan', 'sample', 'report', 'pickup', 'dropoff', 'charger', 'collect', 'beacon']);
const BLOCKED_TYPES = new Set(['hazard', 'lava']);

const ROLE_BY_CHAPTER = {
  campus: 'student',
  rescue: 'worker',
  farm: 'farmer',
  warehouse: 'worker',
  space: 'scientist',
  coast: 'lifeguard',
  volcano: 'scientist',
  lab: 'scientist',
};

const LABELS_BY_ROLE = {
  student: ['校園學生', '路過的同學'],
  worker: ['救援志工', '倉庫巡邏員', '工地巡邏員'],
  farmer: ['農場工人', '巡田員'],
  scientist: ['實驗室助理', '研究員', '火山觀測員'],
  lifeguard: ['海灘救生員', '海岸巡邏員'],
};

function cellKey(x, z) {
  return `${x},${z}`;
}

function getReservedCells(mission) {
  const reserved = new Set();
  const mark = (x, z) => {
    if (x == null || z == null) return;
    reserved.add(cellKey(x, z));
  };
  mark(mission.start?.x, mission.start?.z);
  mark(mission.target?.x, mission.target?.z);
  for (const obj of mission.objects || []) {
    if (TASK_TYPES.has(obj.type) || BLOCKED_TYPES.has(obj.type)) {
      mark(obj.x, obj.z);
    }
  }
  return reserved;
}

function getFreeCells(mission, reserved, used) {
  const free = [];
  for (let x = GRID_X_MIN; x <= GRID_X_MAX; x++) {
    for (let z = GRID_Z_MIN; z <= GRID_Z_MAX; z++) {
      const key = cellKey(x, z);
      if (!reserved.has(key) && !used.has(key)) free.push({ x, z });
    }
  }
  return free;
}

function buildPatrol(start, reserved) {
  const pathCells = [{ x: start.x, z: start.z }];
  const steps = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  let cx = start.x;
  let cz = start.z;
  for (const [dx, dz] of steps) {
    const nx = cx + dx;
    const nz = cz + dz;
    if (
      nx >= GRID_X_MIN && nx <= GRID_X_MAX
      && nz >= GRID_Z_MIN && nz <= GRID_Z_MAX
      && !reserved.has(cellKey(nx, nz))
    ) {
      pathCells.push({ x: nx, z: nz });
      cx = nx;
      cz = nz;
    }
  }
  return pathCells.length >= 2 ? pathCells : [{ x: start.x, z: start.z }];
}

function npcCountForMission(mission) {
  const objects = mission.objects || [];
  const taskCount = objects.filter((o) => TASK_TYPES.has(o.type)).length;
  const hazardCount = objects.filter((o) => BLOCKED_TYPES.has(o.type)).length;
  return taskCount >= 3 || hazardCount >= 3 ? 2 : 1;
}

function addNpcsToMission(mission, chapterId, labelOffset) {
  mission.objects = (mission.objects || []).filter((o) => o.type !== 'npc');
  const reserved = getReservedCells(mission);
  const used = new Set();
  const role = ROLE_BY_CHAPTER[chapterId] || 'worker';
  const labels = LABELS_BY_ROLE[role] || LABELS_BY_ROLE.worker;
  const count = npcCountForMission(mission);
  const free = getFreeCells(mission, reserved, used);

  for (let i = 0; i < count && free.length > 0; i++) {
    const pickIndex = Math.min(i * 3, free.length - 1);
    const start = free.splice(pickIndex, 1)[0];
    used.add(cellKey(start.x, start.z));
    const patrol = buildPatrol(start, reserved);
    patrol.forEach((p) => used.add(cellKey(p.x, p.z)));
    mission.objects.push({
      type: 'npc',
      label: labels[(labelOffset + i) % labels.length],
      role,
      x: start.x,
      z: start.z,
      patrol,
    });
  }
}

const data = JSON.parse(fs.readFileSync(missionsPath, 'utf8'));
let labelOffset = 0;

for (const chapter of data.chapters) {
  for (const mission of chapter.missions || []) {
    addNpcsToMission(mission, chapter.id, labelOffset);
    labelOffset += 1;
  }
}

fs.writeFileSync(missionsPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log('Added NPC patrol data to all missions in missions.json');
