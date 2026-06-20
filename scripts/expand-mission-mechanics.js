/**
 * 任務機制擴充：閘門、多階段、限時、風場/NPC 教學
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const missionsPath = path.join(__dirname, '../public/data/missions.json');

const data = JSON.parse(fs.readFileSync(missionsPath, 'utf8'));

function findMission(id) {
  for (const chapter of data.chapters) {
    const mission = chapter.missions?.find((m) => m.id === id);
    if (mission) return { chapter, mission };
  }
  return null;
}

function patchGate(mission, label, patch) {
  const gate = mission.objects?.find((o) => o.type === 'gate' && o.label === label);
  if (gate) Object.assign(gate, patch);
}

function patchChapterGate(chapter, label, patch) {
  const gate = chapter.objects?.find((o) => o.type === 'gate' && o.label === label);
  if (gate) Object.assign(gate, patch);
}

// 章節裝飾閘門：不阻擋
for (const chapter of data.chapters) {
  for (const obj of chapter.objects || []) {
    if (obj.type === 'gate' && obj.opensOn == null && obj.closed == null) {
      obj.closed = false;
    }
  }
}

const lab1 = findMission('lab-1');
if (lab1) {
  patchGate(lab1.mission, '氣閘門', { closed: true, opensOn: 'scan:淨化入口' });
  lab1.mission.showPatrolRoutes = true;
  lab1.mission.phases = [
    { id: 'scan', title: '第一階段：掃描', objectives: ['scan:淨化入口'] },
    { id: 'report', title: '第二階段：登記', objectives: ['report:登記終端'], requires: ['scan'] },
    { id: 'return', title: '第三階段：回航', objectives: ['return', 'landed'], requires: ['report'] },
  ];
  const npc = lab1.mission.objects?.find((o) => o.type === 'npc');
  if (npc) npc.warnRadius = 2;
  lab1.mission.hintSteps = [
    '飛到黃色光柱「淨化入口」掃描，氣閘門會開啟。',
    '通過氣閘門到藍色「登記終端」回報數據。',
    '用「前方有行人?」避讓巡邏員，回起點降落。',
  ];
  lab1.mission.tutorialChecks = [
    { block: 'mission_scan', hint: '先掃描淨化入口以開啟氣閘門' },
    { block: 'mission_report', hint: '到登記終端回報數據' },
    { block: 'mission_npc_ahead', hint: '可加入「前方有行人?」避讓' },
  ];
}

const lab2 = findMission('lab-2');
if (lab2) {
  patchGate(lab2.mission, '樣本通道', { closed: true, opensOn: 'pickup' });
  lab2.mission.showPatrolRoutes = true;
  lab2.mission.hintSteps = [
    '到「標本櫃」取貨，樣本通道閘門會開啟。',
    '通過閘門到「分析平台」放貨並回報。',
    '注意行人巡邏路線（橘色地面線）。',
  ];
  lab2.mission.tutorialChecks = [
    { block: 'mission_pickup', hint: '取貨後樣本通道才會開啟' },
    { block: 'mission_npc_ahead', hint: '可加入「前方有行人?」判斷' },
  ];
}

const lab3 = findMission('lab-3');
if (lab3) {
  patchGate(lab3.mission, '考核閘門', { closed: true, opensOn: 'scan:考核掃描點' });
  lab3.mission.timeLimitSec = 180;
  lab3.mission.stars = { moves: 50, battery: 40, blocks: 18 };
}

const volcano3 = findMission('volcano-3');
if (volcano3) {
  volcano3.mission.phases = [
    { id: 'scan', title: '第一階段：掃描', objectives: ['scan:觀測掃描點'] },
    { id: 'photo', title: '第二階段：拍照', objectives: ['photos'], requires: ['scan'] },
    { id: 'report', title: '第三階段：回報', objectives: ['report:山頂終端'], requires: ['photo'] },
    { id: 'return', title: '第四階段：回航', objectives: ['return', 'landed'], requires: ['report'] },
  ];
}

const warehouse3 = findMission('warehouse-3');
if (warehouse3) {
  warehouse3.mission.timeLimitSec = 120;
  warehouse3.mission.stars = { ...(warehouse3.mission.stars || {}), blocks: 16 };
}

const farm2 = findMission('farm-2');
if (farm2) {
  farm2.mission.tutorialChecks = [
    ...(farm2.mission.tutorialChecks || []),
    { block: 'mission_wind_ahead', hint: '可加入「前方有風區?」規劃路線' },
    { block: 'mission_strong_wind_ahead', hint: '逆風會多耗電，考慮繞路' },
  ];
}

const farm3 = findMission('farm-3');
if (farm3) {
  farm3.mission.tutorialChecks = [
    ...(farm3.mission.tutorialChecks || []),
    { block: 'mission_strong_wind_ahead', hint: '用「前方逆風?」避開耗電路線' },
  ];
}

const coast2 = findMission('coast-2');
if (coast2) {
  coast2.mission.tutorialChecks = [
    ...(coast2.mission.tutorialChecks || []),
    { block: 'mission_wind_ahead', hint: '海風區可用感測積木判斷' },
    { block: 'mission_strong_wind_ahead', hint: '逆風時改轉向繞路' },
  ];
}

const coast3 = findMission('coast-3');
if (coast3) {
  coast3.mission.tutorialChecks = [
    ...(coast3.mission.tutorialChecks || []),
    { block: 'mission_strong_wind_ahead', hint: '綜合運用逆風感測規劃路線' },
  ];
}

const rescue1 = findMission('rescue-1');
if (rescue1) {
  rescue1.mission.showPatrolRoutes = true;
}

patchChapterGate(data.chapters.find((c) => c.id === 'volcano'), '第一道閘門', { closed: false });
patchChapterGate(data.chapters.find((c) => c.id === 'volcano'), '安全閘門', { closed: false });
patchChapterGate(data.chapters.find((c) => c.id === 'lab'), '第一道閘門', { closed: false });
patchChapterGate(data.chapters.find((c) => c.id === 'lab'), '安全閘門', { closed: false });

fs.writeFileSync(missionsPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log('Patched missions.json for gate/phase/timer mechanics');
