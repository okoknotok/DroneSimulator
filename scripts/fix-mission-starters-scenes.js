/**
 * 1. 將 starterXml 改為空白骨架（避免未玩就有答案）
 * 2. 豐富火山／實驗室章節障礙物
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const missionsPath = path.join(__dirname, '../public/data/missions.json');

const STARTER_MINIMAL = '<xml><block type="event_start" x="40" y="40"></block></xml>';
const STARTER_TAKEOFF = '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"></block></next></block></xml>';

const data = JSON.parse(fs.readFileSync(missionsPath, 'utf8'));

for (const chapter of data.chapters) {
  for (const mission of chapter.missions || []) {
    mission.starterXml = mission.id === 'campus-1' ? STARTER_TAKEOFF : STARTER_MINIMAL;
  }
}

const volcano = data.chapters.find((c) => c.id === 'volcano');
if (volcano) {
  volcano.objects = [
    { type: 'volcano', label: '火山主峰', x: 5, z: -4 },
    { type: 'rubble', label: '火山碎石A', x: 1, z: 2 },
    { type: 'rubble', label: '火山碎石B', x: -3, z: -2 },
    { type: 'heat', label: '地熱噴口', x: 0, z: -2 },
    { type: 'lava', label: '熔岩溪', x: 3, z: 1 },
    { type: 'beacon', label: '監測營地', x: -4, z: 2 },
    { type: 'windTurbine', label: '氣象塔', x: -6, z: 0 },
    { type: 'streetLight', label: '警示燈A', x: -2, z: -1 },
    { type: 'streetLight', label: '警示燈B', x: 2, z: -3 },
    { type: 'hazard', label: '落石區', x: -1, z: 3 },
  ];

  const v1 = volcano.missions.find((m) => m.id === 'volcano-1');
  if (v1) {
    v1.objects = [
      { type: 'scan', label: '地震儀', x: 2, z: 0 },
      { type: 'heat', label: '熱氣警示A', x: 0, z: 2 },
      { type: 'heat', label: '熱氣警示B', x: -1, z: 1 },
      { type: 'rubble', label: '觀測碎石', x: 1, z: 1 },
      { type: 'rubble', label: '火山渣堆', x: -2, z: 0 },
      { type: 'hazard', label: '裂縫區', x: 0, z: 1 },
    ];
    v1.stars = { moves: 22, battery: 50 };
  }

  const v2 = volcano.missions.find((m) => m.id === 'volcano-2');
  if (v2) {
    v2.objects = [
      { type: 'lava', label: '岩漿池A', x: 0, z: 0 },
      { type: 'lava', label: '岩漿池B', x: 1, z: -1 },
      { type: 'lava', label: '岩漿池C', x: 2, z: -2 },
      { type: 'heat', label: '熱氣區A', x: 2, z: 1 },
      { type: 'heat', label: '熱氣區B', x: 3, z: 0 },
      { type: 'heat', label: '熱氣區C', x: 1, z: 2 },
      { type: 'hazard', label: '落石帶A', x: -2, z: 0 },
      { type: 'hazard', label: '落石帶B', x: 0, z: -1 },
      { type: 'rubble', label: '火山渣A', x: -3, z: 2 },
      { type: 'rubble', label: '火山渣B', x: 3, z: 2 },
      { type: 'sample', label: '氣體採樣A', x: -1, z: 1 },
      { type: 'sample', label: '氣體採樣B', x: 4, z: 2 },
    ];
    v2.stars = { moves: 32, battery: 40 };
  }

  const v3 = volcano.missions.find((m) => m.id === 'volcano-3');
  if (v3) {
    v3.objects = [
      { type: 'scan', label: '觀測掃描點', x: 3, z: -2 },
      { type: 'report', label: '山頂終端', x: 5, z: -1 },
      { type: 'lava', label: '岩漿池', x: 1, z: -1 },
      { type: 'lava', label: '熔岩帶', x: 2, z: 0 },
      { type: 'heat', label: '高溫區A', x: 0, z: -2 },
      { type: 'heat', label: '高溫區B', x: 4, z: 0 },
      { type: 'hazard', label: '崩塌區', x: 0, z: 0 },
      { type: 'rubble', label: '山頂碎石', x: 2, z: -3 },
      { type: 'windTurbine', label: '觀測塔', x: 4, z: -3 },
    ];
    v3.stars = { moves: 30, battery: 45 };
  }
}

const lab = data.chapters.find((c) => c.id === 'lab');
if (lab) {
  lab.objects = [
    { type: 'gate', label: '第一道閘門', x: -1, z: 2 },
    { type: 'gate', label: '安全閘門', x: 3, z: -2 },
    { type: 'labBench', label: '實驗台A', x: -3, z: 0 },
    { type: 'labBench', label: '實驗台B', x: 3, z: 1 },
    { type: 'labBench', label: '實驗台C', x: 1, z: -3 },
    { type: 'specimen', label: '標本櫃A', x: 0, z: -2 },
    { type: 'specimen', label: '標本櫃B', x: -5, z: -1 },
    { type: 'shelf', label: '試劑架A', x: -4, z: -1 },
    { type: 'shelf', label: '試劑架B', x: 4, z: -2 },
    { type: 'charger', label: '緊急充電站', x: -3, z: 3 },
    { type: 'hazard', label: '汙染區A', x: 1, z: 0 },
    { type: 'hazard', label: '汙染區B', x: 2, z: 2 },
    { type: 'streetLight', label: '走廊燈A', x: -2, z: -3 },
    { type: 'streetLight', label: '走廊燈B', x: 5, z: 0 },
  ];

  const l1 = lab.missions.find((m) => m.id === 'lab-1');
  if (l1) {
    l1.objects = [
      { type: 'scan', label: '淨化入口', x: 0, z: 0 },
      { type: 'report', label: '登記終端', x: 2, z: 1 },
      { type: 'hazard', label: '未淨化區A', x: 1, z: 2 },
      { type: 'hazard', label: '未淨化區B', x: -1, z: 0 },
      { type: 'gate', label: '氣閘門', x: 0, z: 1 },
      { type: 'shelf', label: '消毒架', x: -2, z: 1 },
    ];
    l1.stars = { moves: 22, battery: 55 };
  }

  const l2 = lab.missions.find((m) => m.id === 'lab-2');
  if (l2) {
    l2.objects = [
      { type: 'pickup', label: '標本櫃', x: -2, z: 0 },
      { type: 'dropoff', label: '分析平台', x: 3, z: -1 },
      { type: 'report', label: '分析終端', x: 4, z: 2 },
      { type: 'hazard', label: '汙染走廊', x: 0, z: 0 },
      { type: 'hazard', label: '限制區', x: 1, z: -1 },
      { type: 'gate', label: '樣本通道', x: 0, z: -2 },
      { type: 'labBench', label: '暫存台', x: 2, z: 0 },
      { type: 'shelf', label: '試劑架', x: -3, z: -1 },
    ];
    l2.stars = { moves: 28, battery: 45 };
  }

  const l3 = lab.missions.find((m) => m.id === 'lab-3');
  if (l3) {
    l3.objects = [
      { type: 'scan', label: '考核掃描點', x: 2, z: 0 },
      { type: 'sample', label: '考核樣本', x: -1, z: -2 },
      { type: 'report', label: '畢業終端', x: 5, z: 1 },
      { type: 'hazard', label: '禁區A', x: 0, z: 2 },
      { type: 'hazard', label: '禁區B', x: 1, z: 1 },
      { type: 'hazard', label: '禁區C', x: 0, z: 0 },
      { type: 'hazard', label: '禁區D', x: 1, z: 3 },
      { type: 'gate', label: '考核閘門', x: -2, z: 1 },
      { type: 'labBench', label: '緩衝實驗台', x: 3, z: 2 },
      { type: 'charger', label: '備用電源', x: -4, z: 2 },
      { type: 'shelf', label: '器材架', x: 4, z: -1 },
    ];
    l3.stars = { moves: 40, battery: 35 };
  }
}

fs.writeFileSync(missionsPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log('Fixed starterXml (minimal) and enriched volcano/lab scenes.');
