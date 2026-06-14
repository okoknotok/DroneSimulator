/**
 * 擴充任務至 8 章 26 關：主線劇情 + 火山/實驗室章節
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const missionsPath = path.join(__dirname, '../public/data/missions.json');

const storyPatches = {
  'campus-1': {
    storyBeat: 1,
    storyTitle: '入學第一天',
    dialogueStart: [
      { speaker: '教官', text: '歡迎加入無人機校園巡邏隊，小航！今天是你入學第一天。' },
      { speaker: '小航', text: '報到！我準備好了，想快點飛看看！' },
      { speaker: '教官', text: '先別急，確認起飛和降落流程。到操場標記點後降落。' },
    ],
    dialogueSuccess: [
      { speaker: '教官', text: '起降穩定！校園巡邏任務可以正式開始了。' },
    ],
    dialogueFail: [{ speaker: '教官', text: '先別急，確認到達目標點後才降落。' }],
  },
  'campus-2': {
    storyBeat: 2,
    storyTitle: '操場巡邏',
    dialogueStart: [
      { speaker: '校園管理員', text: '小航，操場今天有活動，請掃描兩個巡邏點確認安全。' },
      { speaker: '教官', text: '記得按順序飛，每個點都要「掃描任務點」。' },
    ],
    dialogueSuccess: [
      { speaker: '校園管理員', text: '操場一切正常，謝謝你！' },
      { speaker: '教官', text: '掃描技巧不錯，下一關要學拍照記錄。' },
    ],
    dialogueFail: [{ speaker: '教官', text: '兩個巡邏點都要掃描到喔。' }],
  },
  'campus-3': {
    storyBeat: 3,
    storyTitle: '夜景警報',
    dialogueStart: [
      { speaker: '教官', text: '校園進入夜間模式了。教學樓那邊有異常訊號，去拍張照。' },
      { speaker: '小航', text: '夜間飛行……好酷！' },
    ],
    dialogueSuccess: [
      { speaker: '教官', text: '只是路燈故障，處理好了。你學會用拍照記錄現場了！' },
    ],
    dialogueFail: [{ speaker: '教官', text: '先到教學樓任務點，再執行拍照。' }],
  },
  'campus-4': {
    storyBeat: 4,
    storyTitle: '花圃總巡邏',
    dialogueStart: [
      { speaker: '教官', text: '最後一關：掃描全部巡邏點，完成校園總巡邏。' },
      { speaker: '校園管理員', text: '花圃和路燈都要確認，拜託了！' },
    ],
    dialogueSuccess: [
      { speaker: '教官', text: '校園巡邏章節完成！校外有緊急任務在等你。' },
      { speaker: '小航', text: '校外？我準備好了！' },
    ],
    dialogueFail: [{ speaker: '教官', text: '還有巡邏點沒掃描，對照目標清單檢查。' }],
  },
  'rescue-1': {
    storyBeat: 5,
    storyTitle: '廢墟求救',
    dialogueStart: [
      { speaker: '教官', text: '校園外廢墟傳來求救訊號，這是你第一次校外任務。' },
      { speaker: '搜救隊長', text: '請掃描求救點，確認人員位置！' },
    ],
    dialogueSuccess: [
      { speaker: '搜救隊長', text: '訊號確認！人員安全，謝謝小航！' },
    ],
    dialogueFail: [{ speaker: '教官', text: '飛到黃色掃描圈再執行掃描。' }],
  },
  'rescue-2': {
    storyBeat: 6,
    storyTitle: '雙點搜救',
    dialogueStart: [
      { speaker: '搜救隊長', text: '還有第二個求救點，兩邊都要掃描。' },
      { speaker: '教官', text: '規劃好路線，少走冤枉路。' },
    ],
    dialogueSuccess: [
      { speaker: '教官', text: '兩點都掃描完成！廢墟裡有危險區，下一關要小心。' },
    ],
    dialogueFail: [{ speaker: '搜救隊長', text: '兩個求救點都要掃描才算完成。' }],
  },
  'rescue-3': {
    storyBeat: 7,
    storyTitle: '避開瓦礫',
    dialogueStart: [
      { speaker: '教官', text: '前方有瓦礫危隺區！用「如果」和「前方有危險?」來繞路。' },
      { speaker: '小航', text: '像玩迷宮一樣……我試試看！' },
    ],
    dialogueSuccess: [
      { speaker: '教官', text: '聰明繞路！你學會用感測積木做判斷了。' },
    ],
    dialogueFail: [{ speaker: '教官', text: '撞進瓦礫會任務失敗，用條件判斷避開。' }],
  },
  'rescue-4': {
    storyBeat: 8,
    storyTitle: '安全通道',
    dialogueStart: [
      { speaker: '搜救隊長', text: '最後掃描安全通道，救援隊就能進場了！' },
      { speaker: '教官', text: '避開危險、掃描通道、安全降落——救援章節收尾！' },
    ],
    dialogueSuccess: [
      { speaker: '搜救隊長', text: '通道確認！廢墟救援任務圓滿結束。' },
      { speaker: '教官', text: '農場那邊也需要無人機幫忙，出發吧！' },
    ],
    dialogueFail: [{ speaker: '教官', text: '掃描安全通道後，回起點降落。' }],
  },
  'farm-1': {
    storyBeat: 9,
    storyTitle: '農場報到',
    dialogueStart: [
      { speaker: '農場伯伯', text: '小航來啦！幫我掃描玉米田和稻田，看看作物狀況。' },
      { speaker: '教官', text: '農場風大，注意電量。' },
    ],
    dialogueSuccess: [
      { speaker: '農場伯伯', text: '作物長得真好，謝謝你！' },
    ],
    dialogueFail: [{ speaker: '農場伯伯', text: '兩塊田都要掃描喔。' }],
  },
  'farm-2': {
    storyBeat: 10,
    storyTitle: '水渠檢查',
    dialogueStart: [
      { speaker: '農場伯伯', text: '水渠可能有堵塞，飛過去掃描檢查點。' },
      { speaker: '教官', text: '強風區會多耗電，路線要規劃好。' },
    ],
    dialogueSuccess: [
      { speaker: '農場伯伯', text: '水渠正常！下一關風更大，要有心理準備。' },
    ],
    dialogueFail: [{ speaker: '教官', text: '先到水渠檢查點掃描。' }],
  },
  'farm-3': {
    storyBeat: 11,
    storyTitle: '強風巡檢',
    dialogueStart: [
      { speaker: '教官', text: '今天風力發電站附近風特別大，掃描全部作物區。' },
      { speaker: '小航', text: '風好大……我會小心的！' },
    ],
    dialogueSuccess: [
      { speaker: '農場伯伯', text: '全部檢查完了！農場任務大功告成！' },
      { speaker: '教官', text: '物流倉庫邀請你去實習，學取貨送貨。' },
    ],
    dialogueFail: [{ speaker: '教官', text: '強風區耗電快，掃描完所有作物區再降落。' }],
  },
  'warehouse-1': {
    storyBeat: 12,
    storyTitle: '倉庫實習',
    dialogueStart: [
      { speaker: '倉庫主管', text: '歡迎來物流中心！先學取貨和放貨。' },
      { speaker: '教官', text: '到取貨區執行「取貨」，再到平台「放貨」。' },
    ],
    dialogueSuccess: [
      { speaker: '倉庫主管', text: '第一單完成！你已經會基本物流了。' },
    ],
    dialogueFail: [{ speaker: '教官', text: '記得先取貨，再到送貨平台放貨。' }],
  },
  'warehouse-2': {
    storyBeat: 13,
    storyTitle: '充電續航',
    dialogueStart: [
      { speaker: '倉庫主管', text: '這趟路比較遠，電量可能不夠。' },
      { speaker: '教官', text: '用「電量低?」判斷，先去充電站補電。' },
    ],
    dialogueSuccess: [
      { speaker: '教官', text: '電量管理學會了！送貨任務越來越複雜。' },
    ],
    dialogueFail: [{ speaker: '倉庫主管', text: '電量不足時找充電站，完成送貨再降落。' }],
  },
  'warehouse-3': {
    storyBeat: 14,
    storyTitle: '夜間配送',
    dialogueStart: [
      { speaker: '倉庫主管', text: '最後一單：夜間配送，取貨、送貨、回基地。' },
      { speaker: '教官', text: '物流章節畢業關，加油！' },
    ],
    dialogueSuccess: [
      { speaker: '倉庫主管', text: '實習合格！你被選上太空見習計畫了！' },
      { speaker: '小航', text: '太空？！太棒了！' },
    ],
    dialogueFail: [{ speaker: '教官', text: '完成取貨送貨，回起點安全降落。' }],
  },
  'space-1': {
    storyBeat: 15,
    storyTitle: '月球基地',
    dialogueStart: [
      { speaker: '基地 AI', text: '歡迎來到月球基地，見習飛手小航。' },
      { speaker: '教官', text: '深空環境不同，先掃描基地外牆。' },
    ],
    dialogueSuccess: [
      { speaker: '基地 AI', text: '外牆狀態正常，可進入下一階段探索。' },
    ],
    dialogueFail: [{ speaker: '基地 AI', text: '請到掃描點執行掃描任務。' }],
  },
  'space-2': {
    storyBeat: 16,
    storyTitle: '能量晶體',
    dialogueStart: [
      { speaker: '基地 AI', text: '偵測到能量晶體，請收集並帶回。' },
      { speaker: '教官', text: '到晶體上方執行「收集能量」。' },
    ],
    dialogueSuccess: [
      { speaker: '基地 AI', text: '晶體已回收，能源補給完成。' },
    ],
    dialogueFail: [{ speaker: '教官', text: '飛到晶體格子上再收集。' }],
  },
  'space-3': {
    storyBeat: 17,
    storyTitle: '自動探索',
    dialogueStart: [
      { speaker: '基地 AI', text: '最後任務：自動探索隕石區，掃描並回航。' },
      { speaker: '教官', text: '用「重複直到任務完成」來寫探索迴圈。' },
    ],
    dialogueSuccess: [
      { speaker: '太空任務指揮官', text: '太空探索章節完成！表現優異。' },
      { speaker: '教官', text: '太棒了！從太空回來了。去海邊燈塔放鬆一下！' },
    ],
    dialogueFail: [{ speaker: '基地 AI', text: '避開隕石，掃描基地並返回降落。' }],
  },
  'coast-1': {
    storyBeat: 18,
    storyTitle: '海邊報到',
    dialogueStart: [
      { speaker: '教官', text: '任務完成後的獎勵旅行——海濱燈塔！先到海邊報到。' },
      { speaker: '救生員', text: '找到黃色旗幟，掃描一下跟我說你到了。' },
    ],
    dialogueSuccess: [
      { speaker: '救生員', text: '報到成功！海風很大，下一關要小心。' },
    ],
    dialogueFail: [{ speaker: '教官', text: '找到救生員旗幟掃描，再安全降落。' }],
  },
  'coast-2': {
    storyBeat: 19,
    storyTitle: '風箏在哪',
    dialogueStart: [
      { speaker: '救生員', text: '有小孩的风箏掉在岸邊了，幫忙找到並掃描！' },
      { speaker: '教官', text: '避開浪花危險區，順風飛行更省電。' },
    ],
    dialogueSuccess: [
      { speaker: '救生員', text: '找到了！最後一關——燈塔留念照！' },
    ],
    dialogueFail: [{ speaker: '教官', text: '避開浪花，到風箏格掃描。' }],
  },
  'coast-3': {
    storyBeat: 20,
    storyTitle: '燈塔留念',
    dialogueStart: [
      { speaker: '教官', text: '掃描燈塔，拍一張留念照，再安全降落。' },
      { speaker: '小航', text: '海邊任務好開心！' },
    ],
    dialogueSuccess: [
      { speaker: '教官', text: '海濱任務完成！燈塔留念照拍得真好。' },
      { speaker: 'Dr. 林', text: '小航，我是首席科學家林博士。火山監測站需要支援，你能來嗎？' },
      { speaker: '小航', text: '火山？！我馬上出發！' },
    ],
    dialogueFail: [{ speaker: '教官', text: '掃描燈塔、拍照，最後回起點降落。' }],
  },
};

const coastChapterPatch = {
  endingDialogue: [
    { speaker: '教官', text: '海濱之旅結束了！但更大的任務才剛開始……' },
    { speaker: 'Dr. 林', text: '火山活動異常，需要你這樣的飛手幫忙採樣。' },
  ],
};

const volcanoChapter = {
  id: 'volcano',
  title: '火山監測',
  icon: '🌋',
  theme: 'volcano',
  introDialogue: [
    { speaker: 'Dr. 林', text: '歡迎來到火山監測站！這裡溫度很高，先熟悉設備。' },
    { speaker: '教官', text: '新積木「採集樣本」和「前方高溫?」會在這章登場。' },
  ],
  endingDialogue: [
    { speaker: 'Dr. 林', text: '樣本和數據都齊了！快送回實驗室分析。' },
    { speaker: '教官', text: '火山章節通關，下一站——科研實驗室！' },
  ],
  objects: [
    { type: 'volcano', label: '火山主峰', x: 4, z: -3 },
    { type: 'beacon', label: '監測營地', x: -4, z: 2 },
    { type: 'streetLight', label: '警示燈', x: -2, z: -1 },
  ],
  missions: [
    {
      id: 'volcano-1',
      title: '營地報到',
      brief: '掃描地震儀並安全降落。',
      goal: '掃描地震儀並回起點降落。',
      storyBeat: 21,
      storyTitle: '火山腳下',
      dialogueStart: [
        { speaker: 'Dr. 林', text: '監測營地到了！先掃描地震儀，確認設備正常。' },
        { speaker: '教官', text: '火山灰會影響視線，慢慢飛、穩穩掃描。' },
      ],
      dialogueSuccess: [
        { speaker: 'Dr. 林', text: '地震儀數據正常。下一關要進入高溫區採樣！' },
      ],
      dialogueFail: [{ speaker: 'Dr. 林', text: '到地震儀掃描點執行掃描，再回起點降落。' }],
      start: { x: -5, z: 3, dir: 0 },
      target: { x: -5, z: 3 },
      objects: [{ type: 'scan', label: '地震儀', x: 2, z: 0 }],
      success: { scanAll: true, returnToBase: true, landed: true },
      stars: { moves: 18, battery: 55 },
      concept: 'sequence-scan',
      conceptLabel: '火山掃描',
      starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"></block></next></block></xml>',
      hintSteps: ['起飛後飛到地震儀。', '執行「掃描任務點」。', '回起點降落。'],
      tutorialChecks: [{ block: 'mission_scan', hint: '到地震儀格執行掃描' }],
    },
    {
      id: 'volcano-2',
      title: '熱氣採樣',
      brief: '避開岩漿，採集兩處氣體樣本。',
      goal: '採集全部樣本並安全降落。',
      storyBeat: 22,
      storyTitle: '高溫區探險',
      dialogueStart: [
        { speaker: 'Dr. 林', text: '火山口附近有高溫區和岩漿！用「前方高溫?」判斷繞路。' },
        { speaker: '教官', text: '到綠色採樣點執行「採集樣本」，兩處都要採。' },
      ],
      dialogueSuccess: [
        { speaker: 'Dr. 林', text: '樣本採集完成！最後把數據回報到山頂終端。' },
      ],
      dialogueFail: [{ speaker: '教官', text: '避開岩漿和高溫區，採集兩份樣本後降落。' }],
      start: { x: -5, z: 3, dir: 0 },
      target: { x: -5, z: 3 },
      objects: [
        { type: 'lava', label: '岩漿池A', x: 0, z: 0 },
        { type: 'lava', label: '岩漿池B', x: 1, z: -1 },
        { type: 'heat', label: '熱氣區A', x: 2, z: 1 },
        { type: 'heat', label: '熱氣區B', x: 3, z: 0 },
        { type: 'sample', label: '氣體採樣A', x: -1, z: 1 },
        { type: 'sample', label: '氣體採樣B', x: 4, z: 2 },
      ],
      success: { samples: 2, returnToBase: true, landed: true },
      stars: { moves: 28, battery: 45 },
      concept: 'if-heat',
      conceptLabel: '高溫感測採樣',
      starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="control_if"><value name="COND"><block type="mission_heat_ahead"></block></value><statement name="DO"><block type="turn_right"></block></statement><statement name="ELSE"><block type="move_forward"><field name="STEPS">1</field></block></statement></block></next></block></next></block></xml>',
      hintSteps: [
        '用「如果」+「前方高溫?」避開熱區。',
        '到採樣點執行「採集樣本」。',
        '兩處都採完後回起點降落。',
      ],
      tutorialChecks: [
        { block: 'mission_heat_ahead', hint: '加入「前方高溫?」判斷' },
        { block: 'mission_sample', hint: '到採樣點執行採集樣本' },
      ],
    },
    {
      id: 'volcano-3',
      title: '山頂回報',
      brief: '拍照、回報數據並回航。',
      goal: '拍照並回報山頂數據，回起點降落。',
      storyBeat: 23,
      storyTitle: '山頂數據',
      photoAt: '觀測掃描點',
      dialogueStart: [
        { speaker: 'Dr. 林', text: '飛到山頂觀測點：掃描、拍照，再到終端「回報數據」。' },
        { speaker: '教官', text: '這是火山章節最後一關，綜合運用所學！' },
      ],
      dialogueSuccess: [
        { speaker: 'Dr. 林', text: '數據已收到！樣本請立刻送往科研實驗室。' },
        { speaker: '教官', text: '火山任務圓滿結束，實驗室在等你！' },
      ],
      dialogueFail: [{ speaker: 'Dr. 林', text: '掃描、拍照、回報數據，最後回起點降落。' }],
      start: { x: -5, z: 3, dir: 0 },
      target: { x: -5, z: 3 },
      objects: [
        { type: 'scan', label: '觀測掃描點', x: 3, z: -2 },
        { type: 'report', label: '山頂終端', x: 5, z: -1 },
      ],
      success: { scanAll: true, photos: 1, reports: 1, returnToBase: true, landed: true },
      stars: { moves: 26, battery: 50 },
      concept: 'sequence-report',
      conceptLabel: '數據回報',
      starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"></block></next></block></xml>',
      hintSteps: ['到觀測點掃描並拍照。', '到終端執行「回報數據」。', '回起點降落。'],
      tutorialChecks: [
        { block: 'mission_report', hint: '到終端執行回報數據' },
        { block: 'mission_photo', hint: '在觀測點拍照' },
      ],
    },
  ],
};

const labChapter = {
  id: 'lab',
  title: '科研實驗室',
  icon: '🔬',
  theme: 'lab',
  introDialogue: [
    { speaker: 'Dr. 林', text: '樣本送到了！歡迎來到科研實驗室，這裡是終極考核場。' },
    { speaker: '教官', text: '取貨、放貨、回報數據——全部用上！' },
  ],
  endingDialogue: [
    { speaker: 'Dr. 林', text: '所有數據驗證通過！你通過了科研實驗室終極考核。' },
    { speaker: '教官', text: '恭喜你，小航！正式畢業，成為小小飛行員！' },
  ],
  objects: [
    { type: 'labBench', label: '實驗台A', x: -3, z: 0 },
    { type: 'labBench', label: '實驗台B', x: 3, z: 1 },
    { type: 'specimen', label: '標本櫃', x: 0, z: -2 },
  ],
  missions: [
    {
      id: 'lab-1',
      title: '淨化通道',
      brief: '掃描入口並回報登記。',
      goal: '掃描淨化入口、回報登記並降落。',
      storyBeat: 24,
      storyTitle: '實驗室大門',
      dialogueStart: [
        { speaker: 'Dr. 林', text: '進實驗室前先掃描淨化入口，再到終端登記。' },
        { speaker: '教官', text: '執行「回報數據」完成登記。' },
      ],
      dialogueSuccess: [
        { speaker: 'Dr. 林', text: '登記完成！下一關要運送火山樣本。' },
      ],
      dialogueFail: [{ speaker: 'Dr. 林', text: '掃描入口、回報登記，再安全降落。' }],
      start: { x: -5, z: 3, dir: 0 },
      target: { x: -5, z: 3 },
      objects: [
        { type: 'scan', label: '淨化入口', x: 0, z: 0 },
        { type: 'report', label: '登記終端', x: 2, z: 1 },
      ],
      success: { scanAll: true, reports: 1, returnToBase: true, landed: true },
      stars: { moves: 20, battery: 60 },
      concept: 'sequence-report',
      conceptLabel: '實驗室登記',
      starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"></block></next></block></xml>',
      hintSteps: ['掃描淨化入口。', '到終端回報數據。', '回起點降落。'],
      tutorialChecks: [{ block: 'mission_report', hint: '到登記終端回報數據' }],
    },
    {
      id: 'lab-2',
      title: '標本快遞',
      brief: '取樣本、送達並回報。',
      goal: '取貨、放貨並回報分析終端。',
      storyBeat: 25,
      storyTitle: '樣本運送',
      dialogueStart: [
        { speaker: 'Dr. 林', text: '把火山樣本從標本櫃取出，送到分析平台，再回報結果。' },
        { speaker: '教官', text: '順序：取貨 → 放貨 → 回報數據。' },
      ],
      dialogueSuccess: [
        { speaker: 'Dr. 林', text: '分析啟動！最後一關是終極綜合考核。' },
      ],
      dialogueFail: [{ speaker: '教官', text: '先取貨、再送貨、最後到終端回報。' }],
      start: { x: -5, z: 3, dir: 0 },
      target: { x: -5, z: 3 },
      objects: [
        { type: 'pickup', label: '標本櫃', x: -2, z: 0 },
        { type: 'dropoff', label: '分析平台', x: 3, z: -1 },
        { type: 'report', label: '分析終端', x: 4, z: 2 },
      ],
      success: { delivered: true, reports: 1, returnToBase: true, landed: true },
      stars: { moves: 24, battery: 50 },
      concept: 'state-delivery',
      conceptLabel: '標本運送',
      starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="mission_pickup"></block></next></block></next></block></xml>',
      hintSteps: ['到標本櫃取貨。', '送到分析平台放貨。', '到終端回報數據並回航。'],
      tutorialChecks: [
        { block: 'mission_pickup', hint: '到標本櫃取貨' },
        { block: 'mission_dropoff', hint: '到分析平台放貨' },
        { block: 'mission_report', hint: '到終端回報數據' },
      ],
    },
    {
      id: 'lab-3',
      title: '終極考核',
      brief: '自動完成掃描、採樣、回報並回航。',
      goal: '掃描、採樣、回報並回基地降落。',
      storyBeat: 26,
      storyTitle: '畢業考核',
      dialogueStart: [
        { speaker: '教官', text: '終極考核！用「重複直到任務完成」自動探索所有目標。' },
        { speaker: 'Dr. 林', text: '掃描、採樣、回報全部完成，你就畢業了！' },
        { speaker: '小航', text: '這是最後一關……我會全力以赴！' },
      ],
      dialogueSuccess: [
        { speaker: 'Dr. 林', text: '完美！所有科研數據驗證通過。' },
        { speaker: '教官', text: '小航，從校園到火山再到實驗室——你畢業了！' },
      ],
      dialogueFail: [{ speaker: '教官', text: '掃描、採樣、回報都要完成，最後回基地降落。' }],
      start: { x: -4, z: 4, dir: 0 },
      target: { x: -4, z: 4 },
      autoCollect: false,
      maxRepeatSteps: 140,
      maxStagnantLoops: 28,
      objects: [
        { type: 'scan', label: '考核掃描點', x: 2, z: 0 },
        { type: 'sample', label: '考核樣本', x: -1, z: -2 },
        { type: 'report', label: '畢業終端', x: 5, z: 1 },
        { type: 'hazard', label: '禁區', x: 0, z: 2 },
      ],
      success: { scanAll: true, samples: 1, reports: 1, returnToBase: true, landed: true },
      stars: { moves: 36, battery: 40 },
      concept: 'composite',
      conceptLabel: '終極畢業考核',
      starterXml: '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"><next><block type="mission_repeat_until_done"><statement name="DO"><block type="control_if"><value name="COND"><block type="mission_at_task_point"></block></value><statement name="DO"><block type="mission_scan"><next><block type="mission_sample"><next><block type="mission_report"></block></next></block></next></block></statement><statement name="ELSE"><block type="control_if"><value name="COND"><block type="mission_danger_ahead"></block></value><statement name="DO"><block type="turn_right"></block></statement><statement name="ELSE"><block type="move_forward"><field name="STEPS">1</field></block></statement></block></statement></block></statement></block></next></block></next></block></xml>',
      hintSteps: [
        '用「重複直到任務完成」包住探索邏輯。',
        '在任務點依序掃描、採樣、回報。',
        '避開禁區，完成後回基地降落。',
      ],
      tutorialChecks: [
        { block: 'mission_repeat_until_done', hint: '使用重複直到任務完成' },
        { block: 'mission_sample', hint: '到樣本點採集' },
        { block: 'mission_report', hint: '到終端回報' },
      ],
    },
  ],
};

const data = JSON.parse(fs.readFileSync(missionsPath, 'utf8'));

for (const chapter of data.chapters) {
  if (chapter.id === 'coast') {
    Object.assign(chapter, coastChapterPatch);
  }
  for (const mission of chapter.missions || []) {
    const patch = storyPatches[mission.id];
    if (patch) Object.assign(mission, patch);
  }
}

const hasVolcano = data.chapters.some((c) => c.id === 'volcano');
const hasLab = data.chapters.some((c) => c.id === 'lab');
if (!hasVolcano) data.chapters.push(volcanoChapter);
if (!hasLab) data.chapters.push(labChapter);

fs.writeFileSync(missionsPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`Updated ${missionsPath}: ${data.chapters.length} chapters, ${data.chapters.reduce((n, c) => n + c.missions.length, 0)} missions`);
