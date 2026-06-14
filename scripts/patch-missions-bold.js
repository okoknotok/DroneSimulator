import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '../public/data/missions.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const PATCHES = {
  'campus-1': {
    tutorialChecks: [
      { block: 'action_takeoff', hint: '先加入「起飛」積木' },
      { block: 'move_forward', hint: '加入「前進」飛向操場' },
      { block: 'action_land', hint: '到達後加入「降落」' },
    ],
  },
  'campus-2': {
    tutorialChecks: [
      { block: 'action_takeoff', hint: '先起飛再規劃路線' },
      { block: 'mission_scan', hint: '每個巡邏點都要「掃描任務點」' },
    ],
  },
  'campus-3': {
    weatherOverride: 'night',
    photoAt: '異常訊號',
    tutorialChecks: [
      { block: 'mission_scan', hint: '到異常點後使用「掃描任務點」' },
      { block: 'mission_photo', hint: '掃描後在同一點「拍照記錄」' },
    ],
  },
  'campus-4': {
    tutorialChecks: [
      { block: 'control_repeat', hint: '試試用「重複」簡化多次掃描' },
      { block: 'action_land', hint: '完成後記得返回起點降落' },
    ],
  },
  'rescue-2': {
    tutorialChecks: [
      { block: 'mission_scan', hint: '兩個求救點都要掃描' },
    ],
  },
  'rescue-3': {
    tutorialChecks: [
      { block: 'control_if', hint: '加入「如果」判斷前方危險' },
      { block: 'mission_danger_ahead', hint: '使用「前方有危險?」感測積木' },
      { block: 'mission_scan', hint: '避開瓦礫後掃描安全通道' },
    ],
  },
  'rescue-4': {
    tutorialChecks: [
      { block: 'control_if', hint: '用條件判斷避開危險區' },
      { block: 'action_land', hint: '返回基地後降落' },
    ],
  },
  'farm-1': {
    tutorialChecks: [
      { block: 'mission_scan', hint: '玉米田與稻田都要掃描' },
    ],
  },
  'farm-2': {
    photoAt: '水渠檢查點',
    tutorialChecks: [
      { block: 'mission_scan', hint: '先掃描水渠檢查點' },
      { block: 'mission_photo', hint: '在同一點拍照留底' },
    ],
  },
  'farm-3': {
    tutorialChecks: [
      { block: 'mission_scan', hint: '掃描全部作物區' },
      { block: 'control_repeat', hint: '可用重複積木減少積木數量' },
    ],
    objects: [
      { type: 'scan', label: '玉米田', x: -2, z: 3 },
      { type: 'scan', label: '稻田', x: 1, z: -1 },
      { type: 'scan', label: '蔬菜田', x: 4, z: 1 },
      { type: 'windTurbine', label: '強風區 A', x: -4, z: -1 },
      { type: 'windTurbine', label: '強風區 B', x: 0, z: 0 },
    ],
    success: { scanAll: true, atTarget: true },
    hintSteps: [
      '規劃繞開強風區（風向標格）的路線，進入會額外耗電。',
      '掃描全部作物區。',
      '到達終點後安全降落。',
    ],
  },
  'warehouse-2': {
    tutorialChecks: [
      { block: 'mission_pickup', hint: '先到取貨區執行「取貨」' },
      { block: 'mission_dropoff', hint: '再移動到送貨平台「放貨」' },
    ],
  },
  'warehouse-3': {
    tutorialChecks: [
      { block: 'mission_battery_low', hint: '電量低時用「電量低?」判斷' },
      { block: 'mission_charge', hint: '前往充電站執行「充電」' },
      { block: 'control_if', hint: '用「如果」組合取貨與充電流程' },
    ],
  },
  'space-2': {
    autoCollect: false,
    tutorialChecks: [
      { block: 'mission_collect', hint: '飛到晶體上方後執行「收集能量」' },
    ],
    hintSteps: [
      '規劃路線飛到晶體 A 與 B。',
      '到達晶體格後執行「收集能量」積木（不會自動收集）。',
      '收集滿 2 個才算完成。',
    ],
  },
  'space-3': {
    autoCollect: false,
    maxRepeatSteps: 80,
    maxStagnantLoops: 20,
    tutorialChecks: [
      { block: 'mission_repeat_until_done', hint: '用「重複直到任務完成」建立探索迴圈' },
      { block: 'mission_scan', hint: '迴圈內要包含掃描基地外牆' },
      { block: 'mission_collect', hint: '迴圈內要包含收集晶體' },
      { block: 'action_land', hint: '回基地後降落' },
    ],
    hintSteps: [
      '用「重複直到任務完成」建立自動探索，迴圈內需含掃描與收集。',
      '若重複 20 次仍無進展會強制停止，請調整積木。',
      '完成掃描與收集後回基地降落。',
    ],
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="mission_repeat_until_done"><statement name="DO"><block type="control_if"><value name="COND"><block type="mission_at_task_point"></block></value><statement name="DO"><block type="mission_scan"><next><block type="mission_collect"></block></next></block></statement><statement name="ELSE"><block type="control_if"><value name="COND"><block type="mission_danger_ahead"></block></value><statement name="DO"><block type="turn_right"></block></statement><statement name="ELSE"><block type="move_forward"><field name="STEPS">1</field></block></statement></block></statement></block></statement></block></next></block></next></block></xml>',
  },
};

for (const chapter of data.chapters) {
  for (const mission of chapter.missions) {
    const patch = PATCHES[mission.id];
    if (!patch) continue;
    Object.assign(mission, patch);
  }
}

fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log('Patched missions.json with bold upgrade fields');
