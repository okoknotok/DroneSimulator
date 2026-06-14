import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '../public/data/missions.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const META = {
  'campus-1': {
    concept: 'sequence',
    conceptLabel: '順序執行',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="move_forward"><field name="STEPS">7</field><next><block type="action_land"></block></next></block></next></block></next></block></xml>',
    hintSteps: ['先放入「起飛」積木。', '加入「前進」積木，讓無人機飛到操場方向。', '到達目標區後加入「降落」。'],
  },
  'campus-2': {
    concept: 'sequence-scan',
    conceptLabel: '定點掃描',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="move_forward"><field name="STEPS">1</field><next><block type="mission_scan"></block></next></block></next></block></next></block></xml>',
    hintSteps: ['每個巡邏點都要先飛到黃色掃描圈。', '到達後執行一次「掃描任務點」。', '依序完成 3 個掃描點。'],
  },
  'campus-3': {
    concept: 'sequence-events',
    conceptLabel: '事件與記錄',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"></block></next></block></xml>',
    hintSteps: ['先飛到異常訊號點。', '使用「掃描任務點」記錄位置。', '再使用「拍照記錄」留下證據。'],
  },
  'campus-4': {
    concept: 'loop',
    conceptLabel: '重複與優化',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="control_repeat"><field name="TIMES">3</field><statement name="DO"><block type="mission_scan"></block></statement></block></next></block></next></block></xml>',
    hintSteps: ['規劃巡邏順序，減少重複轉彎。', '可嘗試用「重複」積木簡化掃描流程。', '完成後返回起點並降落。'],
  },
  'rescue-1': {
    concept: 'sequence',
    conceptLabel: '順序執行',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"></block></next></block></xml>',
    hintSteps: ['起飛後前往安全入口。', '到達黃色掃描圈後執行掃描。', '確認入口安全再深入災區。'],
  },
  'rescue-2': {
    concept: 'sequence-scan',
    conceptLabel: '定點掃描',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="mission_scan"></block></next></block></next></block></xml>',
    hintSteps: ['先掃描求救信號 A。', '再移動到求救信號 B 掃描。', '兩個信號都要掃描才算完成。'],
  },
  'rescue-3': {
    concept: 'if-sensor',
    conceptLabel: '條件感測',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="control_if"><value name="COND"><block type="mission_danger_ahead"></block></value><statement name="DO"><block type="turn_right"></block></statement><statement name="ELSE"><block type="move_forward"><field name="STEPS">1</field></block></statement></block></next></block></next></block></xml>',
    hintSteps: ['使用「如果」積木判斷前方危險。', '前方有危險就轉向繞路。', '安全時再前進並掃描目標點。'],
  },
  'rescue-4': {
    concept: 'composite',
    conceptLabel: '綜合任務',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"></block></next></block></xml>',
    hintSteps: ['先完成所有掃描點。', '避開瓦礫危險區。', '最後返回救援基地並降落。'],
  },
  'farm-1': {
    concept: 'sequence-scan',
    conceptLabel: '定點掃描',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="mission_scan"></block></next></block></next></block></xml>',
    hintSteps: ['依序飛到玉米田與稻田。', '每個作物區都要掃描一次。', '注意風向，保持穩定路線。'],
  },
  'farm-2': {
    concept: 'sequence-events',
    conceptLabel: '事件與記錄',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"></block></next></block></xml>',
    hintSteps: ['先飛到水渠檢查點。', '執行掃描確認位置。', '使用「拍照記錄」留下水渠狀態。'],
  },
  'farm-3': {
    concept: 'loop-planning',
    conceptLabel: '路線規劃',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="control_repeat"><field name="TIMES">3</field><statement name="DO"><block type="mission_scan"></block></statement></block></next></block></next></block></xml>',
    hintSteps: ['規劃繞開強風區的路線。', '掃描全部作物區。', '到達終點後安全降落。'],
  },
  'warehouse-1': {
    concept: 'state-pickup',
    conceptLabel: '狀態：取貨',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="mission_pickup"></block></next></block></next></block></xml>',
    hintSteps: ['起飛後移動到取貨區。', '執行「取貨」積木。', '確認 HUD 顯示已持有貨物。'],
  },
  'warehouse-2': {
    concept: 'state-delivery',
    conceptLabel: '狀態：送貨',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="mission_pickup"><next><block type="mission_dropoff"></block></next></block></next></block></next></block></xml>',
    hintSteps: ['先到取貨區取貨。', '避開貨架，前往送貨平台。', '到達後執行「放貨」並降落。'],
  },
  'warehouse-3': {
    concept: 'state-battery',
    conceptLabel: '狀態：電量管理',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="mission_pickup"></block></next></block></next></block></xml>',
    hintSteps: ['取貨後注意電量。', '電量不足時先去充電站。', '充電後再送貨並降落。'],
  },
  'space-1': {
    concept: 'sequence',
    conceptLabel: '順序執行',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"></block></next></block></xml>',
    hintSteps: ['起飛後前往基地外牆掃描點。', '到達後執行掃描。', '確認外牆沒有裂縫。'],
  },
  'space-2': {
    concept: 'sequence-collect',
    conceptLabel: '收集任務',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"></block></next></block></xml>',
    hintSteps: ['飛到晶體 A 與 B 上方。', '經過晶體格就會自動收集。', '收集滿 2 個才算完成。'],
  },
  'space-3': {
    concept: 'repeat-until-done',
    conceptLabel: '重複直到完成',
    starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="mission_repeat_until_done"><statement name="DO"><block type="move_forward"><field name="STEPS">1</field></block></statement></block></next></block></next></block></xml>',
    hintSteps: ['用「重複直到任務完成」建立自動探索。', '避開隕石危險區。', '完成掃描與收集後回基地降落。'],
  },
};

data.chapters.forEach((chapter) => {
  chapter.missions.forEach((mission) => {
    const meta = META[mission.id];
    if (meta) Object.assign(mission, meta);
  });
});

fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log('missions.json augmented');
