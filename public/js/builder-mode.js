(function initBuilderMode(global) {
  const MAX_UNDO = 50;

  const BUILDER_TOOLS = [
    { id: 'vase', icon: '🏺', label: '花瓶', cat: 'obstacle' },
    { id: 'plant', icon: '🌿', label: '盆栽', cat: 'obstacle' },
    { id: 'tree', icon: '🌳', label: '樹木', cat: 'obstacle' },
    { id: 'rock', icon: '🪨', label: '岩石', cat: 'obstacle' },
    { id: 'crate', icon: '📦', label: '木箱', cat: 'obstacle' },
    { id: 'electricFence', icon: '⚡', label: '電網', cat: 'obstacle' },
    { id: 'laserBeam', icon: '🔴', label: '激光', cat: 'obstacle' },
    { id: 'windZone', icon: '🌪️', label: '風場', cat: 'obstacle' },
    { id: 'chargingStation', icon: '🔋', label: '充電站', cat: 'special' },
    { id: 'noFlyZone', icon: '🚫', label: '禁飛區', cat: 'obstacle' },
    { id: 'checkpoint', icon: '🚩', label: '檢查點', cat: 'special' },
    { id: 'scanPoint', icon: '📡', label: '掃描點', cat: 'special' },
    { id: 'treasure', icon: '💎', label: '寶石', cat: 'special' },
    { id: 'start', icon: '🟢', label: '起點', cat: 'pos' },
    { id: 'target', icon: '🎯', label: '終點', cat: 'pos' },
    { id: 'erase', icon: '🧹', label: '清除', cat: 'tool' },
  ];

  const BUILDER_TOOL_GROUPS = [
    { id: 'obstacle', label: '障礙物', icon: '🧱' },
    { id: 'special', label: '特殊', icon: '⭐' },
    { id: 'pos', label: '位置', icon: '📍' },
    { id: 'tool', label: '工具', icon: '🛠️' },
  ];

  const BUILDER_KID_TOOLS = [
    'vase', 'plant', 'checkpoint', 'treasure', 'start', 'target', 'erase',
  ];

  const BUILDER_EXTRA_TOOLS = [
    'tree', 'rock', 'crate', 'electricFence', 'laserBeam', 'windZone',
    'chargingStation', 'noFlyZone', 'scanPoint',
  ];

  const BUILDER_SCENES = {
    campus: { id: 'campus', label: '校園', icon: '🏫', sky: [0.08, 0.14, 0.2], ground: [0.12, 0.28, 0.18], grid: 0x36506d },
    farm: { id: 'farm', label: '農田', icon: '🌾', sky: [0.08, 0.16, 0.12], ground: [0.18, 0.34, 0.12], grid: 0x2a5a2a },
    coast: { id: 'coast', label: '海邊', icon: '🌊', sky: [0.12, 0.28, 0.42], ground: [0.72, 0.64, 0.46], grid: 0x2a6080 },
    space: { id: 'space', label: '太空', icon: '🚀', sky: [0.02, 0.02, 0.05], ground: [0.16, 0.16, 0.2], grid: 0x2a2a40 },
    volcano: { id: 'volcano', label: '火山', icon: '🌋', sky: [0.22, 0.08, 0.06], ground: [0.32, 0.18, 0.12], grid: 0x6a3020 },
    warehouse: { id: 'warehouse', label: '倉庫', icon: '🏭', sky: [0.06, 0.08, 0.12], ground: [0.12, 0.14, 0.18], grid: 0x3a3f48 },
  };

  const DEFAULT_META = {
    name: '自訂關卡',
    desc: '你設計的關卡',
    goal: '到達終點並降落',
    hint: '用 Blockly 編程到達終點!',
    maxMoves: 0,
    requireCheckpoints: true,
    requireTreasures: true,
    author: '',
    theme: 'campus',
  };

  const BUILDER_TEMPLATES = {
    line: {
      id: 'line',
      label: '直線',
      icon: '➡️',
      desc: '簡單直線飛行關卡',
      data: {
        v: 1,
        meta: {
          name: '直線挑戰',
          desc: '從起點直飛終點',
          goal: '到達 (4, 0) 並降落',
          hint: '起飛後前進 8 格再降落',
          maxMoves: 0,
          requireCheckpoints: true,
          requireTreasures: true,
        },
        s: { gx: -4, gz: 0, dir: 0 },
        t: { gx: 4, gz: 0 },
        o: [],
        c: [],
        tr: [],
      },
    },
    detour: {
      id: 'detour',
      label: '繞路',
      icon: '↪️',
      desc: '繞過花瓶牆到達終點',
      data: {
        v: 1,
        meta: {
          name: '花瓶繞路',
          desc: '障礙物擋住直路，需規劃繞道',
          goal: '避開花瓶到達 (4, 0) 並降落',
          hint: '觀察花瓶位置，規劃 U 形路線',
          maxMoves: 0,
          requireCheckpoints: true,
          requireTreasures: true,
        },
        s: { gx: -4, gz: 0, dir: 0 },
        t: { gx: 4, gz: 0 },
        o: [
          { gx: 0, gz: 0, type: 'vase' },
          { gx: 0, gz: -1, type: 'vase' },
          { gx: 0, gz: 1, type: 'vase' },
          { gx: -2, gz: 2, type: 'plant' },
          { gx: 2, gz: -2, type: 'plant' },
        ],
        c: [],
        tr: [],
      },
    },
    patrol: {
      id: 'patrol',
      label: '巡邏',
      icon: '🔁',
      desc: '繞行正方形巡邏路線',
      data: {
        v: 1,
        meta: {
          name: '花園巡邏',
          desc: '繞過花圃飛行一圈',
          goal: '繞花圃一周返回起點 (-3, 0) 降落',
          hint: '使用「重複 4 次」積木',
          maxMoves: 0,
          requireCheckpoints: true,
          requireTreasures: true,
        },
        s: { gx: -3, gz: 0, dir: 0 },
        t: { gx: -3, gz: 0 },
        o: [
          { gx: -2, gz: -1, type: 'vase' },
          { gx: -1, gz: -2, type: 'plant' },
          { gx: 2, gz: 0, type: 'plant' },
          { gx: -3, gz: 2, type: 'plant' },
        ],
        c: [],
        tr: [],
      },
    },
    collect: {
      id: 'collect',
      label: '收集',
      icon: '💎',
      desc: '收集寶石後到達終點',
      data: {
        v: 1,
        meta: {
          name: '寶物獵人',
          desc: '收集全部寶石後降落',
          goal: '收集全部 4 顆寶石後到 (5, 0) 降落',
          hint: '規劃路線經過每顆寶石',
          maxMoves: 0,
          requireCheckpoints: true,
          requireTreasures: true,
        },
        s: { gx: -5, gz: 0, dir: 0 },
        t: { gx: 5, gz: 0 },
        o: [
          { gx: -2, gz: 0, type: 'vase' },
          { gx: 2, gz: 0, type: 'plant' },
        ],
        c: [],
        tr: [
          { gx: -3, gz: 2 },
          { gx: 0, gz: 2 },
          { gx: 0, gz: -2 },
          { gx: 3, gz: -2 },
        ],
      },
    },
    maze: {
      id: 'maze',
      label: '迷宮',
      icon: '🌀',
      desc: '穿越複雜障礙迷宮',
      data: {
        v: 1,
        meta: {
          name: '花園迷宮',
          desc: '穿越複雜的花園迷宮',
          goal: '從 (-6, 4) 到 (6, -4) 降落',
          hint: '逐步繞過每組障礙物',
          maxMoves: 0,
          requireCheckpoints: true,
          requireTreasures: true,
        },
        s: { gx: -6, gz: 4, dir: 0 },
        t: { gx: 6, gz: -4 },
        o: [
          { gx: -2, gz: 4, type: 'vase' },
          { gx: -2, gz: 3, type: 'plant' },
          { gx: -2, gz: 2, type: 'vase' },
          { gx: -2, gz: 1, type: 'plant' },
          { gx: -3, gz: -1, type: 'vase' },
          { gx: -2, gz: -1, type: 'plant' },
          { gx: 1, gz: 0, type: 'vase' },
          { gx: 1, gz: -1, type: 'plant' },
          { gx: 4, gz: -2, type: 'vase' },
          { gx: 4, gz: -3, type: 'plant' },
          { gx: 4, gz: -4, type: 'vase' },
          { gx: 5, gz: 1, type: 'plant' },
          { gx: 2, gz: 2, type: 'vase' },
          { gx: -4, gz: 0, type: 'plant' },
          { gx: -5, gz: -3, type: 'vase' },
          { gx: -1, gz: -3, type: 'plant' },
        ],
        c: [],
        tr: [],
      },
    },
    blank: {
      id: 'blank',
      label: '空白',
      icon: '📄',
      desc: '從空白畫布開始',
      data: {
        v: 1,
        meta: { ...DEFAULT_META },
        s: { gx: 0, gz: 0, dir: 0 },
        t: { gx: 4, gz: -3 },
        o: [],
        c: [],
        tr: [],
      },
    },
  };

  let ctx = null;
  let active = false;
  let testing = false;
  let builderTool = 'vase';
  let obstacles = [];
  let checkpoints = [];
  let treasures = [];
  let start = { gx: 0, gz: 0, dir: 0 };
  let target = { gx: 4, gz: -3 };
  let meta = { ...DEFAULT_META };
  let meshes = [];
  let undoStack = [];
  let redoStack = [];
  let pointerObs = null;
  let pointerMoveHandler = null;
  let checkpointIdx = 0;
  let laserDir = 'horizontal';
  let windDir = 'east';
  let metaBound = false;
  let builderSceneId = 'campus';

  function STEP() { return ctx?.STEP ?? 1.5; }
  function GRID_W() { return ctx?.GRID_W ?? 18; }
  function GRID_D() { return ctx?.GRID_D ?? 14; }
  function scene() { return ctx?.scene; }
  function OBSTACLE_GUIDE() { return ctx?.OBSTACLE_GUIDE || {}; }

  function toast(msg, type) {
    ctx?.toast?.(msg, type);
  }

  function getSaveData() {
    return ctx?.getSaveData?.() || {};
  }

  function persistSaveData() {
    ctx?.persistSaveData?.();
  }

  function encodeLevel(data) {
    const json = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(json)));
  }

  function decodeLevel(code) {
    try {
      const json = decodeURIComponent(escape(atob(code)));
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function captureSnapshot() {
    return {
      obstacles: clone(obstacles),
      checkpoints: clone(checkpoints),
      treasures: clone(treasures),
      start: clone(start),
      target: clone(target),
      meta: clone(meta),
      checkpointIdx,
      laserDir,
      windDir,
    };
  }

  function applySnapshot(snap) {
    if (!snap) return;
    obstacles = snap.obstacles || [];
    checkpoints = snap.checkpoints || [];
    treasures = snap.treasures || [];
    start = snap.start || { gx: 0, gz: 0, dir: 0 };
    target = snap.target || { gx: 4, gz: -3 };
    meta = { ...DEFAULT_META, ...(snap.meta || {}) };
    checkpointIdx = snap.checkpointIdx || 0;
    laserDir = snap.laserDir || 'horizontal';
    windDir = snap.windDir || 'east';
    rebuildAllMeshes();
    syncMetaForm();
    updateStatsUI();
    updateHealthUI();
    updateToolHintUI();
    saveDraft();
  }

  function pushUndo() {
    undoStack.push(captureSnapshot());
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
    updateDockButtons();
  }

  function undo() {
    if (!undoStack.length) {
      toast('↩️ 沒有可復原的操作', 'info');
      return;
    }
    redoStack.push(captureSnapshot());
    applySnapshot(undoStack.pop());
    toast('↩️ 已復原', 'info');
    updateDockButtons();
  }

  function redo() {
    if (!redoStack.length) {
      toast('↪️ 沒有可重做的操作', 'info');
      return;
    }
    undoStack.push(captureSnapshot());
    applySnapshot(redoStack.pop());
    toast('↪️ 已重做', 'info');
    updateDockButtons();
  }

  function syncMetaFromForm() {
    const name = document.getElementById('builderLevelName');
    const desc = document.getElementById('builderLevelDesc');
    const goal = document.getElementById('builderLevelGoal');
    const hint = document.getElementById('builderLevelHint');
    const maxMoves = document.getElementById('builderMaxMoves');
    const requireCheckpoints = document.getElementById('builderRequireCheckpoints');
    const requireTreasures = document.getElementById('builderRequireTreasures');
    if (!name || !desc || !goal || !hint) return;
    meta = {
      ...meta,
      name: name.value.trim() || DEFAULT_META.name,
      desc: desc.value.trim() || DEFAULT_META.desc,
      goal: goal.value.trim() || DEFAULT_META.goal,
      hint: hint.value.trim() || DEFAULT_META.hint,
      maxMoves: Math.max(0, Number(maxMoves?.value || 0)),
      requireCheckpoints: requireCheckpoints ? requireCheckpoints.checked : true,
      requireTreasures: requireTreasures ? requireTreasures.checked : true,
    };
  }

  function syncMetaForm() {
    const name = document.getElementById('builderLevelName');
    const desc = document.getElementById('builderLevelDesc');
    const goal = document.getElementById('builderLevelGoal');
    const hint = document.getElementById('builderLevelHint');
    const maxMoves = document.getElementById('builderMaxMoves');
    const requireCheckpoints = document.getElementById('builderRequireCheckpoints');
    const requireTreasures = document.getElementById('builderRequireTreasures');
    if (!name || !desc || !goal || !hint) return;
    name.value = meta.name || DEFAULT_META.name;
    desc.value = meta.desc || DEFAULT_META.desc;
    goal.value = meta.goal || DEFAULT_META.goal;
    hint.value = meta.hint || DEFAULT_META.hint;
    if (maxMoves) maxMoves.value = meta.maxMoves || 0;
    if (requireCheckpoints) requireCheckpoints.checked = meta.requireCheckpoints !== false;
    if (requireTreasures) requireTreasures.checked = meta.requireTreasures !== false;
  }

  function getLevelData() {
    syncMetaFromForm();
    return {
      v: 1,
      meta: clone(meta),
      s: clone(start),
      t: clone(target),
      o: clone(obstacles),
      c: clone(checkpoints),
      tr: clone(treasures),
    };
  }

  function applyLevelData(data) {
    meta = { ...DEFAULT_META, ...(data.meta || {}) };
    builderSceneId = BUILDER_SCENES[meta.theme] ? meta.theme : 'campus';
    meta.theme = builderSceneId;
    start = data.s || { gx: 0, gz: 0, dir: 0 };
    target = data.t || { gx: 4, gz: -3 };
    obstacles = data.o || [];
    checkpoints = data.c || [];
    treasures = data.tr || [];
    checkpointIdx = checkpoints.reduce((max, cp) => {
      const code = cp.label ? cp.label.charCodeAt(0) - 64 : 0;
      return code > max ? code : max;
    }, 0);
  }

  function applyCurrentBuilderScene() {
    meta.theme = builderSceneId;
    ctx?.applyBuilderScene?.(builderSceneId);
    renderScenePicker();
    renderSceneGrid();
  }

  function selectScene(id) {
    if (!BUILDER_SCENES[id]) return;
    builderSceneId = id;
    meta.theme = id;
    ctx?.applyBuilderScene?.(id);
    renderScenePicker();
    renderSceneGrid();
    saveDraft();
    const sceneDef = BUILDER_SCENES[id];
    toast(`${sceneDef.icon} 已切換到「${sceneDef.label}」場景`, 'info');
  }

  function saveDraft() {
    const save = getSaveData();
    if (!save || typeof save !== 'object') return;
    save.builderDraft = getLevelData();
    persistSaveData();
  }

  function restoreDraft() {
    const draft = getSaveData().builderDraft;
    if (!draft) return false;
    applyLevelData(draft);
    syncMetaForm();
    return true;
  }

  function hasDraft() {
    return Boolean(getSaveData().builderDraft);
  }

  function gridFromPick(pickResult) {
    if (!pickResult?.hit || !pickResult.pickedPoint) return null;
    const worldPos = pickResult.pickedPoint;
    return {
      gx: Math.round(worldPos.x / STEP()),
      gz: Math.round(worldPos.z / STEP()),
    };
  }

  function markMeshUnpickable(node) {
    if (!node) return;
    if (typeof node.isPickable === 'boolean') node.isPickable = false;
    (node.getChildMeshes?.() || []).forEach(markMeshUnpickable);
  }

  function findObstacleIndex(gx, gz) {
    return obstacles.findIndex((o) => ctx?.obstacleOccupiesCell?.(o, gx, gz));
  }

  function cellBlocked(gx, gz) {
    if (findObstacleIndex(gx, gz) !== -1) return true;
    if (checkpoints.some((cp) => cp.gx === gx && cp.gz === gz)) return true;
    if (treasures.some((t) => t.gx === gx && t.gz === gz)) return true;
    return false;
  }

  function obstaclePlacementCells(obstacleData) {
    const cells = [{ gx: obstacleData.gx, gz: obstacleData.gz }];
    if (obstacleData.type === 'laserBeam') {
      const dir = obstacleData.direction || 'horizontal';
      if (dir === 'horizontal') {
        cells.push({ gx: obstacleData.gx - 1, gz: obstacleData.gz }, { gx: obstacleData.gx + 1, gz: obstacleData.gz });
      } else {
        cells.push({ gx: obstacleData.gx, gz: obstacleData.gz - 1 }, { gx: obstacleData.gx, gz: obstacleData.gz + 1 });
      }
    }
    return cells;
  }

  function placementBlocked(obstacleData) {
    return obstaclePlacementCells(obstacleData).some((cell) => {
      if (cell.gx === start.gx && cell.gz === start.gz) return true;
      if (cell.gx === target.gx && cell.gz === target.gz) return true;
      return cellBlocked(cell.gx, cell.gz);
    });
  }

  function renumberCheckpoints() {
    let letterIdx = 0;
    checkpoints.forEach((cp) => {
      if (cp.label === 'SCAN' || String(cp.label || '').startsWith('SCAN')) {
        cp.label = 'SCAN';
        return;
      }
      letterIdx += 1;
      cp.label = String.fromCharCode(64 + letterIdx);
    });
    checkpointIdx = letterIdx;
  }

  function inGridBounds(gx, gz) {
    const halfW = Math.floor(GRID_W() / 2);
    const halfD = Math.floor(GRID_D() / 2);
    return gx >= -halfW && gx < halfW && gz >= -halfD && gz < halfD;
  }

  function handleClick(gx, gz) {
    if (!active || testing) return;
    if (!inGridBounds(gx, gz)) {
      toast('🚫 超出範圍', 'warn');
      return;
    }
    pushUndo();
    if (builderTool === 'erase') {
      eraseAt(gx, gz);
    } else if (builderTool === 'start') {
      start = { gx, gz, dir: 0 };
      rebuildStart();
    } else if (builderTool === 'target') {
      target = { gx, gz };
      rebuildTarget();
    } else if (['vase', 'plant', 'tree', 'rock', 'crate', 'electricFence', 'laserBeam', 'windZone', 'chargingStation', 'noFlyZone'].includes(builderTool)) {
      placeObstacle(gx, gz, builderTool);
    } else if (builderTool === 'checkpoint') {
      placeCheckpoint(gx, gz);
    } else if (builderTool === 'scanPoint') {
      placeCheckpoint(gx, gz, 'SCAN');
    } else if (builderTool === 'treasure') {
      placeTreasure(gx, gz);
    } else {
      undoStack.pop();
      return;
    }
    updateStatsUI();
    updateHealthUI();
    saveDraft();
  }

  function placeObstacle(gx, gz, type) {
    const obstacleData = { gx, gz, type };
    if (type === 'laserBeam') obstacleData.direction = laserDir;
    else if (type === 'windZone') obstacleData.direction = windDir;
    if (placementBlocked(obstacleData)) {
      toast('⚠️ 此位置或激光覆蓋範圍已有物件', 'warn');
      undoStack.pop();
      return;
    }
    obstacles.push(obstacleData);
    rebuildObstacles();
    const tool = BUILDER_TOOLS.find((t) => t.id === type);
    toast(`${tool?.icon || '📦'} 已放置`, 'success');
  }

  function placeCheckpoint(gx, gz, prefix = '') {
    const existing = checkpoints.find((cp) => cp.gx === gx && cp.gz === gz);
    if (existing) {
      toast('⚠️ 此位置已有檢查點', 'warn');
      undoStack.pop();
      return;
    }
    checkpointIdx += 1;
    const label = prefix || String.fromCharCode(64 + checkpointIdx);
    checkpoints.push({ gx, gz, label });
    rebuildCheckpoints();
    toast(`🚩 檢查點 ${label} 已放置`, 'success');
  }

  function placeTreasure(gx, gz) {
    const existing = treasures.find((t) => t.gx === gx && t.gz === gz);
    if (existing) {
      toast('⚠️ 此位置已有寶石', 'warn');
      undoStack.pop();
      return;
    }
    treasures.push({ gx, gz });
    rebuildTreasures();
    toast('💎 寶石已放置', 'success');
  }

  function eraseAt(gx, gz) {
    let erased = false;
    const obsIdx = findObstacleIndex(gx, gz);
    if (obsIdx !== -1) {
      obstacles.splice(obsIdx, 1);
      rebuildObstacles();
      erased = true;
    }
    const cpIdx = checkpoints.findIndex((cp) => cp.gx === gx && cp.gz === gz);
    if (cpIdx !== -1) {
      checkpoints.splice(cpIdx, 1);
      renumberCheckpoints();
      rebuildCheckpoints();
      erased = true;
    }
    const trIdx = treasures.findIndex((t) => t.gx === gx && t.gz === gz);
    if (trIdx !== -1) {
      treasures.splice(trIdx, 1);
      rebuildTreasures();
      erased = true;
    }
    if (!erased && gx === start.gx && gz === start.gz) {
      start = { gx: 0, gz: 0, dir: 0 };
      rebuildStart();
      erased = true;
    }
    if (!erased && gx === target.gx && gz === target.gz) {
      target = { gx: 4, gz: -3 };
      rebuildTarget();
      erased = true;
    }
    if (erased) toast('🧹 已清除', 'info');
    else toast('此位置沒有物件', 'info');
  }

  function disposeMeshes(type) {
    meshes.filter((m) => m._builderType === type).forEach((m) => {
      if (m.getChildMeshes) {
        m.getChildMeshes().forEach((c) => {
          if (c.material?.diffuseTexture) { try { c.material.diffuseTexture.dispose(); } catch (e) {} }
          if (c.material) { try { c.material.dispose(); } catch (e) {} }
          c.dispose();
        });
      }
      m.dispose();
    });
    meshes = meshes.filter((m) => m._builderType !== type);
  }

  function rebuildObstacles() {
    disposeMeshes('obstacle');
    const sc = scene();
    if (!sc || !ctx) return;
    const offset = Date.now() % 10000;
    obstacles.forEach((obs, idx) => {
      let mesh;
      const i = offset + idx;
      if (obs.type === 'vase') mesh = ctx.createVase(obs.gx, obs.gz, i);
      else if (obs.type === 'plant') mesh = ctx.createPlant(obs.gx, obs.gz, i);
      else if (obs.type === 'tree') mesh = ctx.createTree(obs.gx, obs.gz, i);
      else if (obs.type === 'rock') mesh = ctx.createRock(obs.gx, obs.gz, i);
      else if (obs.type === 'crate') mesh = ctx.createCrate(obs.gx, obs.gz, i);
      else if (obs.type === 'electricFence') mesh = ctx.createElectricFence(obs.gx, obs.gz, i);
      else if (obs.type === 'laserBeam') mesh = ctx.createLaserBeam(obs.gx, obs.gz, i, obs.direction || 'horizontal');
      else if (obs.type === 'windZone') mesh = ctx.createWindZone(obs.gx, obs.gz, i, obs.direction || 'east');
      else if (obs.type === 'chargingStation') mesh = ctx.createChargingStation(obs.gx, obs.gz, i);
      else if (obs.type === 'noFlyZone') mesh = ctx.createNoFlyZone(obs.gx, obs.gz, i);
      else mesh = ctx.createVase(obs.gx, obs.gz, i);
      mesh._builderType = 'obstacle';
      markMeshUnpickable(mesh);
      meshes.push(mesh);
    });
  }

  function rebuildCheckpoints() {
    disposeMeshes('checkpoint');
    const sc = scene();
    if (!sc || !ctx) return;
    const offset = Date.now() % 10000;
    checkpoints.forEach((cp, idx) => {
      const mesh = ctx.createCheckpoint(cp, offset + idx);
      mesh._builderType = 'checkpoint';
      markMeshUnpickable(mesh);
      meshes.push(mesh);
    });
  }

  function rebuildTreasures() {
    disposeMeshes('treasure');
    const sc = scene();
    if (!sc || !ctx) return;
    const offset = Date.now() % 10000;
    treasures.forEach((t, idx) => {
      const mesh = ctx.createTreasure(t, offset + idx);
      mesh._builderType = 'treasure';
      markMeshUnpickable(mesh);
      meshes.push(mesh);
    });
  }

  function rebuildStart() {
    const sc = scene();
    if (!sc || !ctx) return;
    meshes.filter((m) => m._builderType === 'start').forEach((m) => m.dispose());
    meshes = meshes.filter((m) => m._builderType !== 'start');
    const s = ctx.cellToWorld(start.gx, start.gz);
    const startDisc = global.BABYLON.MeshBuilder.CreateGround('builderStart', { width: STEP() * 0.85, height: STEP() * 0.85 }, sc);
    const sTex = new global.BABYLON.DynamicTexture('bsT', { width: 256, height: 256 }, sc, false);
    const sCtx = sTex.getContext();
    sCtx.fillStyle = 'rgba(80,200,120,0.7)';
    sCtx.beginPath();
    sCtx.arc(128, 128, 110, 0, Math.PI * 2);
    sCtx.fill();
    sCtx.fillStyle = '#1a4a2a';
    sCtx.font = 'bold 110px Arial';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('S', 128, 128);
    sTex.update();
    sTex.hasAlpha = true;
    const sm = new global.BABYLON.StandardMaterial('bsm', sc);
    sm.diffuseTexture = sTex;
    sm.diffuseTexture.hasAlpha = true;
    sm.useAlphaFromDiffuseTexture = true;
    startDisc.material = sm;
    startDisc.position = new global.BABYLON.Vector3(s.x, 0.02, s.z);
    startDisc._builderType = 'start';
    markMeshUnpickable(startDisc);
    meshes.push(startDisc);
  }

  function rebuildTarget() {
    const sc = scene();
    if (!sc || !ctx) return;
    meshes.filter((m) => m._builderType === 'target').forEach((m) => m.dispose());
    meshes = meshes.filter((m) => m._builderType !== 'target');
    const t = ctx.cellToWorld(target.gx, target.gz);
    const targetDisc = global.BABYLON.MeshBuilder.CreateGround('builderTarget', { width: STEP() * 0.85, height: STEP() * 0.85 }, sc);
    const tTex = new global.BABYLON.DynamicTexture('btT', { width: 256, height: 256 }, sc, false);
    const tCtx = tTex.getContext();
    tCtx.fillStyle = 'rgba(147,51,234,0.7)';
    tCtx.beginPath();
    tCtx.arc(128, 128, 110, 0, Math.PI * 2);
    tCtx.fill();
    tCtx.fillStyle = '#4a1a6a';
    tCtx.font = 'bold 90px Arial';
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    tCtx.fillText('🎯', 128, 128);
    tTex.update();
    tTex.hasAlpha = true;
    const tm = new global.BABYLON.StandardMaterial('btm', sc);
    tm.diffuseTexture = tTex;
    tm.diffuseTexture.hasAlpha = true;
    tm.useAlphaFromDiffuseTexture = true;
    targetDisc.material = tm;
    targetDisc.position = new global.BABYLON.Vector3(t.x, 0.02, t.z);
    targetDisc._builderType = 'target';
    markMeshUnpickable(targetDisc);
    meshes.push(targetDisc);
  }

  function rebuildAllMeshes() {
    rebuildObstacles();
    rebuildCheckpoints();
    rebuildTreasures();
    rebuildStart();
    rebuildTarget();
  }

  function clearMeshes() {
    meshes.forEach((m) => {
      if (m.getChildMeshes) {
        m.getChildMeshes().forEach((c) => {
          if (c.material?.diffuseTexture) { try { c.material.diffuseTexture.dispose(); } catch (e) {} }
          if (c.material) { try { c.material.dispose(); } catch (e) {} }
          c.dispose();
        });
      }
      m.dispose();
    });
    meshes = [];
  }

  function setupPointerObservers() {
    const sc = scene();
    if (!sc) return;
    if (pointerObs) {
      sc.onPointerObservable.removeCallback(pointerObs);
      pointerObs = null;
    }
    pointerObs = sc.onPointerObservable.add((pointerInfo) => {
      if (!active || testing) return;
      if (pointerInfo.type === global.BABYLON.PointerEventTypes.POINTERPICK) {
        const grid = gridFromPick(pointerInfo.pickInfo);
        if (grid) handleClick(grid.gx, grid.gz);
      }
    }, global.BABYLON.PointerEventTypes.POINTERPICK);

    if (!pointerMoveHandler) {
      pointerMoveHandler = (evt) => {
        if (!active) return;
        const pickResult = sc.pick(evt.offsetX, evt.offsetY);
        const grid = gridFromPick(pickResult);
        const cellEl = document.getElementById('builderStudioCell') || document.getElementById('bInfoCell');
        if (grid && cellEl) cellEl.textContent = `(${grid.gx}, ${grid.gz})`;
      };
      sc.onPointerMove = pointerMoveHandler;
    }
  }

  function teardownPointerObservers() {
    const sc = scene();
    if (sc && pointerObs) {
      sc.onPointerObservable.removeCallback(pointerObs);
      pointerObs = null;
    }
    if (sc && pointerMoveHandler) {
      sc.onPointerMove = null;
      pointerMoveHandler = null;
    }
  }

  function isPathBlocked(gx, gz) {
    const occ = ctx?.obstacleOccupiesCell;
    if (!occ) return false;
    for (const o of obstacles) {
      if (!occ(o, gx, gz)) continue;
      const type = o.type || 'vase';
      if (type === 'windZone' || type === 'chargingStation') continue;
      return true;
    }
    return false;
  }

  function computeHealth() {
    const warnings = [];
    const halfW = Math.floor(GRID_W() / 2);
    const halfD = Math.floor(GRID_D() / 2);
    const key = (gx, gz) => `${gx},${gz}`;

    if (!inGridBounds(start.gx, start.gz)) warnings.push('起點超出網格範圍');
    if (!inGridBounds(target.gx, target.gz)) warnings.push('終點超出網格範圍');
    if (start.gx === target.gx && start.gz === target.gz && checkpoints.length === 0) {
      warnings.push('起點與終點相同，且無檢查點');
    }
    if (isPathBlocked(start.gx, start.gz)) warnings.push('起點被障礙物佔用');
    if (isPathBlocked(target.gx, target.gz)) warnings.push('終點被障礙物佔用');

    checkpoints.forEach((cp, idx) => {
      if (isPathBlocked(cp.gx, cp.gz)) warnings.push(`檢查點 ${cp.label || idx + 1} 被障礙物佔用`);
    });
    treasures.forEach((tr, idx) => {
      if (isPathBlocked(tr.gx, tr.gz)) warnings.push(`寶石 ${idx + 1} 被障礙物佔用`);
    });

    const queue = [{ gx: start.gx, gz: start.gz, dist: 0 }];
    const visited = new Set([key(start.gx, start.gz)]);
    let reachable = false;
    let pathLen = 0;

    while (queue.length) {
      const cur = queue.shift();
      if (cur.gx === target.gx && cur.gz === target.gz) {
        reachable = true;
        pathLen = cur.dist;
        break;
      }
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      dirs.forEach(([dx, dz]) => {
        const nx = cur.gx + dx;
        const nz = cur.gz + dz;
        if (nx < -halfW || nx >= halfW || nz < -halfD || nz >= halfD) return;
        const k = key(nx, nz);
        if (visited.has(k)) return;
        if (isPathBlocked(nx, nz)) return;
        visited.add(k);
        queue.push({ gx: nx, gz: nz, dist: cur.dist + 1 });
      });
    }

    if (!reachable) warnings.push('起點到終點之間沒有可通行路徑');

    const complexity = obstacles.length + checkpoints.length * 2 + treasures.length * 2 + (reachable ? Math.floor(pathLen / 4) : 0);
    let difficulty = 'easy';
    if (!reachable || complexity >= 14) difficulty = 'hard';
    else if (complexity >= 6 || obstacles.length >= 5) difficulty = 'medium';

    if (checkpoints.length > 0 && !reachable) warnings.push('檢查點路線可能無法完成');
    if (treasures.length > 0 && obstacles.length > 8) warnings.push('寶物收集難度偏高');

    return { reachable, difficulty, warnings, pathLen, complexity };
  }

  function getKidHealthTip(health) {
    if (!health.reachable) return '起點到不了終點，再挪一下障礙吧！';
    if (health.difficulty === 'hard') return '這關有點難，同學可能會挑戰很久哦！';
    if (health.difficulty === 'medium') return '這關剛剛好，可以請同學來挑戰！';
    return '這關看起來很簡單，可以試玩了！';
  }

  function difficultyToStars(difficulty) {
    if (difficulty === 'easy') return '⭐☆☆';
    if (difficulty === 'hard') return '⭐⭐⭐';
    return '⭐⭐☆';
  }

  function updateDifficultyStars(health) {
    const el = document.getElementById('builderDifficultyStars');
    if (el) el.textContent = difficultyToStars(health.difficulty);
  }

  function updateKidHealthTip(health) {
    const el = document.getElementById('builderKidHealthTip');
    if (el) el.textContent = getKidHealthTip(health);
  }

  function updateHealthPanel(health) {
    const panel = document.getElementById('builderHealthPanel');
    if (!panel) return;
    const diffLabel = { easy: '簡單', medium: '中等', hard: '困難' }[health.difficulty] || health.difficulty;
    const warnHtml = health.warnings.length
      ? `<ul class="builder-health-warns">${health.warnings.map((w) => `<li>${w}</li>`).join('')}</ul>`
      : '<div class="builder-health-ok">未發現明顯問題</div>';
    panel.innerHTML = `
      <div class="builder-health-detail-row"><span>難度</span><strong>${diffLabel}</strong></div>
      <div class="builder-health-detail-row"><span>可達性</span><strong>${health.reachable ? '可達' : '不可達'}</strong></div>
      <div class="builder-health-detail-row"><span>最短路徑</span><strong>${health.reachable ? `${health.pathLen} 格` : '—'}</strong></div>
      <div class="builder-health-detail-row"><span>複雜度</span><strong>${health.complexity}</strong></div>
      ${warnHtml}
    `;
  }

  function updateHealthUI() {
    const health = computeHealth();
    updateDifficultyStars(health);
    updateKidHealthTip(health);
    updateHealthPanel(health);
  }

  function updateStatsUI() {
    const obsEl = document.getElementById('builderStudioObs') || document.getElementById('bInfoObs');
    const cpEl = document.getElementById('builderStudioCp') || document.getElementById('bInfoCp');
    const trEl = document.getElementById('builderStudioTr') || document.getElementById('bInfoTr');
    if (obsEl) obsEl.textContent = String(obstacles.length);
    if (cpEl) cpEl.textContent = String(checkpoints.length);
    if (trEl) trEl.textContent = String(treasures.length);
  }

  function setLaserDir(dir) {
    laserDir = dir === 'vertical' ? 'vertical' : 'horizontal';
    updateToolHintUI();
  }

  function setWindDir(dir) {
    windDir = ['east', 'west', 'north', 'south'].includes(dir) ? dir : 'east';
    updateToolHintUI();
  }

  function updateToolHintUI() {
    const kidTip = document.getElementById('builderKidHealthTip');
    const guide = OBSTACLE_GUIDE()[builderTool];
    let dirHtml = '';
    if (builderTool === 'laserBeam') {
      dirHtml = [
        { id: 'horizontal', label: '橫向' },
        { id: 'vertical', label: '縱向' },
      ].map((opt) => `<button type="button" class="ghost${laserDir === opt.id ? ' active' : ''}" onclick="setBuilderLaserDir('${opt.id}')">${opt.label}</button>`).join('');
    } else if (builderTool === 'windZone') {
      dirHtml = [
        { id: 'east', label: '東' },
        { id: 'west', label: '西' },
        { id: 'north', label: '北' },
        { id: 'south', label: '南' },
      ].map((opt) => `<button type="button" class="ghost${windDir === opt.id ? ' active' : ''}" onclick="setBuilderWindDir('${opt.id}')">${opt.label}</button>`).join('');
    }
    if ((builderTool === 'laserBeam' || builderTool === 'windZone') && kidTip) {
      const tool = BUILDER_TOOLS.find((t) => t.id === builderTool);
      kidTip.innerHTML = `
        <div class="builder-tool-hint-main">${tool?.icon || ''} 選方向再放上去</div>
        ${dirHtml ? `<div class="builder-tool-hint-dir">${dirHtml}</div>` : ''}
      `;
      return;
    }
    updateKidHealthTip(computeHealth());
  }

  function selectTool(toolId) {
    builderTool = toolId;
    renderToolsSidebar();
    updateToolHintUI();
  }

  function renderToolButton(tool) {
    return `
      <button type="button"
        class="pal-item builder-top-tool${builderTool === tool.id ? ' active' : ''}"
        data-tool="${tool.id}"
        title="${tool.label}"
        onclick="BuilderMode.selectTool('${tool.id}')">
        <span>${tool.icon} ${tool.label}</span>
      </button>
    `;
  }

  function renderToolsSidebar() {
    const container = document.getElementById('builderStudioTools');
    if (!container) return;
    const groups = BUILDER_TOOL_GROUPS.map((group) => {
      const tools = BUILDER_TOOLS.filter((t) => t.cat === group.id);
      if (!tools.length) return '';
      return `
        <div class="builder-tool-group" data-group="${group.id}">
          <span class="builder-tool-group-label">${group.icon} ${group.label}</span>
          <div class="builder-tool-group-items">${tools.map(renderToolButton).join('')}</div>
        </div>
      `;
    }).filter(Boolean);
    container.innerHTML = groups.join('<div class="builder-tool-sep"></div>');
  }

  function renderSceneGrid() {
    const grid = document.getElementById('builderSceneGrid');
    if (!grid) return;
    grid.innerHTML = Object.values(BUILDER_SCENES).map((sc) => `
      <button type="button"
        class="builder-scene-card${builderSceneId === sc.id ? ' active' : ''}"
        onclick="BuilderMode.selectScene('${sc.id}')"
        title="${sc.label}">
        <span class="builder-scene-icon">${sc.icon}</span>
        <span class="builder-scene-label">${sc.label}</span>
      </button>
    `).join('');
  }

  function renderScenePicker() {
    const picker = document.getElementById('builderScenePicker');
    if (!picker) return;
    picker.innerHTML = Object.values(BUILDER_SCENES).map((sc) => `
      <button type="button"
        class="builder-scene-chip${builderSceneId === sc.id ? ' active' : ''}"
        onclick="BuilderMode.selectScene('${sc.id}')"
        title="${sc.label}">
        ${sc.icon} ${sc.label}
      </button>
    `).join('');
  }

  function renderDock() {
    const dock = document.getElementById('builderStudioDock');
    if (!dock) return;
    dock.innerHTML = `
      <button type="button" class="ghost" onclick="BuilderMode.showTemplateModal()">✨ 選模板</button>
      <button type="button" class="tool-btn action" onclick="builderTestRun()">▶ 試一下</button>
      <button type="button" class="tool-btn export" onclick="builderShareChallenge()">🎁 給同學玩</button>
      <button type="button" class="ghost" id="builderUndoBtn" onclick="BuilderMode.undo()">↩ 撤銷</button>
      <button type="button" class="ghost" id="builderRedoBtn" onclick="BuilderMode.redo()">↪ 重做</button>
      <button type="button" class="ghost" onclick="builderShowShare()">📤 關卡碼</button>
      <button type="button" class="ghost danger" onclick="builderClearAll()">🗑️ 清空</button>
      <button type="button" class="tool-btn stop-test" id="builderStopTestBtn" style="display:none" onclick="BuilderMode.endTestPlay()">⏹ 結束試玩</button>
    `;
    updateDockButtons();
  }

  function updateDockButtons() {
    const undoBtn = document.getElementById('builderUndoBtn');
    const redoBtn = document.getElementById('builderRedoBtn');
    const stopBtn = document.getElementById('builderStopTestBtn');
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
    if (stopBtn) stopBtn.style.display = testing ? '' : 'none';
  }

  function renderTemplateGrid() {
    const grid = document.getElementById('builderTemplateGrid');
    if (!grid) return;
    grid.innerHTML = Object.values(BUILDER_TEMPLATES)
      .filter((tpl) => tpl.id !== 'blank')
      .map((tpl) => `
      <div class="builder-template-card ${tpl.id}" role="button" tabindex="0"
        onclick="BuilderMode.pickTemplate('${tpl.id}')"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();BuilderMode.pickTemplate('${tpl.id}')}">
        <span class="builder-template-icon">${tpl.icon}</span>
        <span class="builder-template-label">${tpl.label}</span>
        <span class="builder-template-desc">${tpl.desc}</span>
      </div>
    `).join('');
  }

  function showTemplateModal() {
    renderSceneGrid();
    renderTemplateGrid();
    document.getElementById('builderTemplateModal')?.classList.add('show');
  }

  function closeTemplateModal() {
    document.getElementById('builderTemplateModal')?.classList.remove('show');
  }

  function skipTemplateStart() {
    meta.theme = builderSceneId;
    applyCurrentBuilderScene();
    closeTemplateModal();
    saveDraft();
    toast('📄 已套用場景，從空白開始設計！', 'info');
  }

  function pickTemplate(id) {
    meta.theme = builderSceneId;
    ctx?.applyBuilderScene?.(builderSceneId);
    closeTemplateModal();
    applyTemplate(id, true);
  }

  function bindMetaFields() {
    if (metaBound) return;
    ['builderLevelName', 'builderLevelDesc', 'builderLevelGoal', 'builderLevelHint', 'builderMaxMoves', 'builderRequireCheckpoints', 'builderRequireTreasures'].forEach((id) => {
      const field = document.getElementById(id);
      if (field) field.addEventListener('input', () => {
        syncMetaFromForm();
        saveDraft();
        updateHealthUI();
      });
    });
    metaBound = true;
  }

  function renderLibrary() {
    const list = document.getElementById('builderLibraryList');
    if (!list) return;
    const library = getSaveData().builderLibrary || [];
    if (!library.length) {
      list.innerHTML = '<div class="builder-library-empty">尚無已儲存的挑戰</div>';
      return;
    }
    list.innerHTML = library.map((entry) => {
      const date = entry.savedAt ? new Date(entry.savedAt).toLocaleString('zh-Hant') : '';
      const diff = entry.meta?.difficulty || computeHealthFromData(decodeLevel(entry.preview))?.difficulty || 'medium';
      const diffLabel = { easy: '簡單', medium: '中等', hard: '困難' }[diff] || diff;
      return `
        <button type="button" class="builder-library-item" onclick="BuilderMode.loadLibraryEntry('${entry.id}')">
          <span class="builder-library-name">${entry.meta?.name || '未命名關卡'}</span>
          <span class="builder-library-meta">${diffLabel} · ${date}</span>
        </button>
      `;
    }).join('');
  }

  function computeHealthFromData(data) {
    if (!data) return null;
    const saved = { obstacles, checkpoints, treasures, start, target };
    applyLevelData(data);
    const health = computeHealth();
    obstacles = saved.obstacles;
    checkpoints = saved.checkpoints;
    treasures = saved.treasures;
    start = saved.start;
    target = saved.target;
    return health;
  }

  function drawChallengeMinimap(canvas, data) {
    if (!canvas || !data) return;
    const c2d = canvas.getContext('2d');
    const W = canvas.width || 220;
    const H = canvas.height || 165;
    canvas.width = W;
    canvas.height = H;
    c2d.fillStyle = '#0a1018';
    c2d.fillRect(0, 0, W, H);
    const gw = GRID_W();
    const gd = GRID_D();
    const cellW = W / gw;
    const cellH = H / gd;
    c2d.strokeStyle = 'rgba(80,100,140,0.3)';
    c2d.lineWidth = 1;
    for (let i = 0; i <= gw; i++) {
      c2d.beginPath();
      c2d.moveTo(i * cellW, 0);
      c2d.lineTo(i * cellW, H);
      c2d.stroke();
    }
    for (let j = 0; j <= gd; j++) {
      c2d.beginPath();
      c2d.moveTo(0, j * cellH);
      c2d.lineTo(W, j * cellH);
      c2d.stroke();
    }
    const toMM = (gx, gz) => ({ x: (gx + gw / 2 + 0.5) * cellW, y: (-gz + gd / 2 - 0.5) * cellH });
    const colorMap = {
      plant: '#4caf50', tree: '#2e7d32', rock: '#9e9e9e', crate: '#8d6e63',
      electricFence: '#ff9800', laserBeam: '#f44336', windZone: '#4fc3f7',
      chargingStation: '#66bb6a', noFlyZone: '#ef5350', vase: '#7da8d8',
    };
    (data.o || []).forEach((o) => {
      const type = o.type || 'vase';
      const color = colorMap[type] || '#7da8d8';
      const m = toMM(o.gx, o.gz);
      c2d.fillStyle = color;
      c2d.beginPath();
      c2d.arc(m.x, m.y, Math.min(cellW, cellH) * 0.28, 0, Math.PI * 2);
      c2d.fill();
    });
    (data.c || []).forEach((cp) => {
      const m = toMM(cp.gx, cp.gz);
      c2d.fillStyle = '#FFD700';
      c2d.fillRect(m.x - cellW * 0.2, m.y - cellH * 0.2, cellW * 0.4, cellH * 0.4);
    });
    (data.tr || []).forEach((tr) => {
      const m = toMM(tr.gx, tr.gz);
      c2d.fillStyle = '#E040FB';
      c2d.beginPath();
      c2d.moveTo(m.x, m.y - cellH * 0.22);
      c2d.lineTo(m.x + cellW * 0.22, m.y);
      c2d.lineTo(m.x, m.y + cellH * 0.22);
      c2d.lineTo(m.x - cellW * 0.22, m.y);
      c2d.closePath();
      c2d.fill();
    });
    const s = toMM(data.s?.gx ?? 0, data.s?.gz ?? 0);
    const t = toMM(data.t?.gx ?? 4, data.t?.gz ?? -3);
    c2d.fillStyle = '#50C878';
    c2d.beginPath();
    c2d.arc(s.x, s.y, Math.min(cellW, cellH) * 0.32, 0, Math.PI * 2);
    c2d.fill();
    c2d.fillStyle = '#9333EA';
    c2d.beginPath();
    c2d.arc(t.x, t.y, Math.min(cellW, cellH) * 0.32, 0, Math.PI * 2);
    c2d.fill();
  }

  function showChallengeCard(levelData, shareCode) {
    const modal = document.getElementById('builderChallengeModal');
    if (!modal) return;
    syncMetaFromForm();
    const health = computeHealth();
    const author = meta.author || ctx?.getUserLabel?.() || '匿名設計師';
    const nameEl = document.getElementById('builderChallengeName');
    const authorEl = document.getElementById('builderChallengeAuthor');
    const diffEl = document.getElementById('builderChallengeDifficulty');
    const statsEl = document.getElementById('builderChallengeStats');
    const codeEl = document.getElementById('builderChallengeCode');
    if (nameEl) nameEl.textContent = meta.name || DEFAULT_META.name;
    if (authorEl) authorEl.textContent = author;
    if (diffEl) {
      const diffLabel = { easy: '簡單', medium: '中等', hard: '困難' }[health.difficulty] || health.difficulty;
      diffEl.textContent = diffLabel;
      diffEl.className = `builder-challenge-diff ${health.difficulty}`;
    }
    if (statsEl) {
      statsEl.innerHTML = `
        <span>障礙 ${obstacles.length}</span>
        <span>檢查點 ${checkpoints.length}</span>
        <span>寶物 ${treasures.length}</span>
        <span>${health.reachable ? '可達' : '不可達'}</span>
      `;
    }
    if (codeEl && shareCode) codeEl.value = shareCode;
    drawChallengeMinimap(document.getElementById('builderChallengeMap'), levelData || getLevelData());
    modal.classList.add('show');
  }

  function closeChallengeCard() {
    document.getElementById('builderChallengeModal')?.classList.remove('show');
  }

  function saveToLibrary() {
    const data = getLevelData();
    const health = computeHealth();
    const save = getSaveData();
    save.builderLibrary = save.builderLibrary || [];
    const entry = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      savedAt: Date.now(),
      meta: {
        ...data.meta,
        difficulty: health.difficulty,
        author: meta.author || ctx?.getUserLabel?.() || '匿名設計師',
      },
      preview: encodeLevel(data),
    };
    save.builderLibrary.unshift(entry);
    if (save.builderLibrary.length > 50) save.builderLibrary.length = 50;
    persistSaveData();
    renderLibrary();
    return entry;
  }

  function showStudioUI() {
    document.getElementById('builderStudioTools')?.classList.add('show');
    document.getElementById('builderStudioCard')?.classList.add('show');
    document.getElementById('builderStudioInfo')?.classList.add('show');
    document.getElementById('builderStudioDock')?.classList.add('show');
    document.getElementById('builderToolbar')?.classList.remove('show');
    document.getElementById('builderPalette')?.classList.remove('show');
    document.getElementById('builderInfo')?.classList.remove('show');
  }

  function hideStudioUI() {
    document.getElementById('builderStudioTools')?.classList.remove('show');
    document.getElementById('builderStudioCard')?.classList.remove('show');
    document.getElementById('builderStudioInfo')?.classList.remove('show');
    document.getElementById('builderStudioDock')?.classList.remove('show');
    document.getElementById('builderShareModal')?.classList.remove('show');
    document.getElementById('builderChallengeModal')?.classList.remove('show');
    closeTemplateModal();
    document.getElementById('builderToolbar')?.classList.remove('show');
    document.getElementById('builderPalette')?.classList.remove('show');
    document.getElementById('builderInfo')?.classList.remove('show');
  }

  function setupScene() {
    ctx?.hideMissionUI?.();
    document.getElementById('blocksArea').style.display = 'none';
    document.getElementById('divider').style.display = 'none';
    document.getElementById('levelPanel').style.display = 'none';
    document.getElementById('minimap').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('gameHud')?.classList.remove('show');
    document.getElementById('crosshair')?.classList.remove('show');
    document.getElementById('gameInstructions')?.classList.remove('show');

    if (ctx?.targetMarker) ctx.targetMarker.setEnabled(false);
    if (ctx?.startMarker) ctx.startMarker.setEnabled(false);
    if (ctx?.defaultFloor) ctx.defaultFloor.setEnabled(true);
    ctx?.defaultWalls?.forEach((w) => w.setEnabled(true));
    if (ctx?.drone?._nose) ctx.drone._nose.setEnabled(false);

    const cam = ctx?.camera;
    const cvs = ctx?.canvas;
    if (cam && cvs) {
      cam.attachControl(cvs, true);
      cam.alpha = -Math.PI / 2;
      cam.beta = Math.PI / 3.2;
      cam.radius = 28;
      cam.setTarget(global.BABYLON.Vector3.Zero());
    }
    const sc = scene();
    if (sc) {
      sc.clearColor = new global.BABYLON.Color4(0.05, 0.08, 0.13, 1);
      sc.fogMode = global.BABYLON.Scene.FOGMODE_NONE;
    }
    if (ctx?.drone) {
      ctx.drone.position = new global.BABYLON.Vector3(0, 0.4, 0);
      ctx.drone.rotation = global.BABYLON.Vector3.Zero();
    }

    ctx?.rebuildObstacles?.([]);
    ctx?.rebuildCheckpoints?.([]);
    ctx?.rebuildTreasures?.([]);
  }

  function enter(context) {
    ctx = context;
    active = true;
    testing = false;
    document.body.classList.add('builder-mode');
    document.body.classList.remove('freeflight-mode', 'mission-mode', 'builder-testing');

    builderTool = 'vase';
    obstacles = [];
    checkpoints = [];
    treasures = [];
    start = { gx: 0, gz: 0, dir: 0 };
    target = { gx: 4, gz: -3 };
    meta = { ...DEFAULT_META };
    checkpointIdx = 0;
    laserDir = 'horizontal';
    windDir = 'east';
    undoStack = [];
    redoStack = [];

    setupScene();
    showStudioUI();
    bindMetaFields();

    const hadDraft = restoreDraft();
    if (!hadDraft) syncMetaForm();
    builderSceneId = BUILDER_SCENES[meta.theme] ? meta.theme : 'campus';
    meta.theme = builderSceneId;

    clearMeshes();
    rebuildAllMeshes();
    setupPointerObservers();

    applyCurrentBuilderScene();
    renderToolsSidebar();
    renderDock();
    updateStatsUI();
    updateHealthUI();
    updateToolHintUI();
    renderLibrary();
    updateDockButtons();

    toast('🎨 點格子放東西，然後按「試一下」！', 'success');
    if (!hasDraft()) {
      showTemplateModal();
    }
  }

  function exit() {
    if (testing) endTestPlay();
    active = false;
    teardownPointerObservers();
    hideStudioUI();
    clearMeshes();
    obstacles = [];
    checkpoints = [];
    treasures = [];
    start = { gx: 0, gz: 0, dir: 0 };
    target = { gx: 4, gz: -3 };
    checkpointIdx = 0;
    undoStack = [];
    redoStack = [];
    ctx?.rebuildObstacles?.([]);
    ctx?.rebuildCheckpoints?.([]);
    ctx?.rebuildTreasures?.([]);
    ctx?.resetProgrammingScene?.();
    document.body.classList.remove('builder-mode', 'builder-testing');
    ctx = null;
  }

  function isActive() {
    return active;
  }

  function applyTemplate(id, skipConfirm = false) {
    const tpl = BUILDER_TEMPLATES[id];
    if (!tpl) {
      toast('⚠️ 找不到模板', 'warn');
      return;
    }
    if (!skipConfirm && !confirm(`套用「${tpl.label}」模板？目前的設計將被取代。`)) return;
    pushUndo();
    applyLevelData(clone(tpl.data));
    meta.theme = builderSceneId;
    applyCurrentBuilderScene();
    syncMetaForm();
    rebuildAllMeshes();
    updateStatsUI();
    updateHealthUI();
    updateToolHintUI();
    saveDraft();
    closeTemplateModal();
    toast(`${tpl.icon} 已套用「${tpl.label}」！`, 'success');
  }

  function clearAll() {
    if (!confirm('確定要清空所有物件嗎？')) return;
    pushUndo();
    obstacles = [];
    checkpoints = [];
    treasures = [];
    checkpointIdx = 0;
    const save = getSaveData();
    if (save) save.builderDraft = null;
    persistSaveData();
    clearMeshes();
    rebuildStart();
    rebuildTarget();
    updateStatsUI();
    updateHealthUI();
    saveDraft();
    toast('🗑️ 已清空', 'info');
  }

  function startTestPlay() {
    if (obstacles.length === 0 && checkpoints.length === 0 && treasures.length === 0) {
      toast('⚠️ 請先放置一些物件', 'warn');
      return;
    }
    syncMetaFromForm();
    const data = getLevelData();
    testing = true;
    clearMeshes();
    document.body.classList.add('builder-testing');
    ctx?.setBuilderTestActive?.(true);
    ctx?.applyBuilderTestLevel?.(data);
    ctx?.showTestDrawer?.(true);
    ctx?.runBuilderTest?.();
    updateDockButtons();
    toast('▶ 試玩模式！在抽屜中編程測試', 'success');
  }

  function endTestPlay() {
    if (!testing) return;
    testing = false;
    document.body.classList.remove('builder-testing');
    ctx?.resetBuilderTest?.();
    ctx?.setBuilderTestActive?.(false);
    ctx?.showTestDrawer?.(false);
    updateDockButtons();
    rebuildAllMeshes();
    toast('⏹ 已結束試玩', 'info');
  }

  function showShareModal() {
    saveDraft();
    const code = encodeLevel(getLevelData());
    ctx?.syncCustomLevelToCloud?.(getLevelData());
    const out = document.getElementById('shareCodeOut');
    if (out) out.value = code;
    document.getElementById('builderShareModal')?.classList.add('show');
  }

  function closeShareModal() {
    document.getElementById('builderShareModal')?.classList.remove('show');
  }

  function switchShareTab(tab) {
    document.querySelectorAll('.share-tab').forEach((t) => t.classList.remove('active'));
    if (tab === 'code') {
      document.querySelector('.share-tab:first-child')?.classList.add('active');
      const codeTab = document.getElementById('shareTabCode');
      const importTab = document.getElementById('shareTabImport');
      if (codeTab) codeTab.style.display = 'block';
      if (importTab) importTab.style.display = 'none';
    } else {
      document.querySelector('.share-tab:last-child')?.classList.add('active');
      const codeTab = document.getElementById('shareTabCode');
      const importTab = document.getElementById('shareTabImport');
      if (codeTab) codeTab.style.display = 'none';
      if (importTab) importTab.style.display = 'block';
    }
  }

  function copyShareCode() {
    const code = document.getElementById('shareCodeOut')?.value
      || document.getElementById('builderChallengeCode')?.value
      || '';
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      toast('📋 已複製關卡碼!', 'success');
    }).catch(() => {
      const out = document.getElementById('shareCodeOut');
      out?.select?.();
      document.execCommand('copy');
      toast('📋 已複製!', 'success');
    });
  }

  function importFromCode(code) {
    const trimmed = String(code || '').trim();
    if (!trimmed) {
      toast('⚠️ 請貼上關卡碼', 'warn');
      return false;
    }
    const data = decodeLevel(trimmed);
    if (!data) {
      toast('❌ 關卡碼無效', 'error');
      return false;
    }
    pushUndo();
    applyLevelData(data);
    applyCurrentBuilderScene();
    syncMetaForm();
    saveDraft();
    clearMeshes();
    rebuildAllMeshes();
    updateStatsUI();
    updateHealthUI();
    closeShareModal();
    toast('📥 關卡已匯入!', 'success');
    return true;
  }

  function loadFromLibrary(id) {
    const library = getSaveData().builderLibrary || [];
    const entry = library.find((e) => e.id === id);
    if (!entry) {
      toast('⚠️ 找不到圖書館項目', 'warn');
      return;
    }
    const data = decodeLevel(entry.preview);
    if (!data) {
      toast('❌ 關卡資料損壞', 'error');
      return;
    }
    pushUndo();
    applyLevelData(data);
    applyCurrentBuilderScene();
    syncMetaForm();
    saveDraft();
    clearMeshes();
    rebuildAllMeshes();
    updateStatsUI();
    updateHealthUI();
    toast(`📂 已載入「${entry.meta?.name || '關卡'}」`, 'success');
  }

  function shareChallenge() {
    saveDraft();
    const data = getLevelData();
    const code = encodeLevel(data);
    ctx?.syncCustomLevelToCloud?.(data);
    saveToLibrary();
    showChallengeCard(data, code);
    const out = document.getElementById('shareCodeOut');
    if (out) out.value = code;
  }

  global.BuilderMode = {
    enter,
    exit,
    isActive,
    hasDraft,
    undo,
    redo,
    startTestPlay,
    endTestPlay,
    applyTemplate,
    shareChallenge,
    importCode: importFromCode,
    loadLibraryEntry: loadFromLibrary,
    clearAll,
    getLevelData,
    showShareModal,
    closeShareModal,
    copyShareCode,
    switchShareTab,
    showChallengeCard,
    closeChallengeCard,
    selectTool,
    setLaserDir,
    setWindDir,
    showTemplateModal,
    closeTemplateModal,
    skipTemplateStart,
    pickTemplate,
    selectScene,
    renderLibrary,
    saveToLibrary,
    computeHealth,
    BUILDER_TOOLS,
    BUILDER_TOOL_GROUPS,
    BUILDER_TEMPLATES,
    BUILDER_SCENES,
  };

  global.builderTestRun = () => global.BuilderMode.startTestPlay();
  global.builderStopTest = () => global.BuilderMode.endTestPlay();
  global.builderShowShare = () => global.BuilderMode.showShareModal();
  global.builderClearAll = () => global.BuilderMode.clearAll();
  global.closeBuilderShare = () => global.BuilderMode.closeShareModal();
  global.copyShareCode = () => global.BuilderMode.copyShareCode();
  global.switchShareTab = (tab) => global.BuilderMode.switchShareTab(tab);
  global.importShareCode = () => {
    const code = document.getElementById('shareCodeIn')?.value || '';
    global.BuilderMode.importCode(code);
  };
  global.setBuilderLaserDir = (dir) => global.BuilderMode.setLaserDir(dir);
  global.setBuilderWindDir = (dir) => global.BuilderMode.setWindDir(dir);
  global.builderShareChallenge = () => global.BuilderMode.shareChallenge();
  global.closeBuilderChallenge = () => global.BuilderMode.closeChallengeCard();
})(window);
