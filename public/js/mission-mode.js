(function () {
  const STEP = 1.5;
  const GRID_X_MIN = -7;
  const GRID_X_MAX = 7;
  const GRID_Z_MIN = -6;
  const GRID_Z_MAX = 6;
  const MISSION_DATA_URL = '/data/missions.json';
  const ASSET_MANIFEST_URL = '/data/assets-manifest.json';
  const MODEL_SCALE = 0.9;

  let ctx = null;
  let chapters = [];
  let currentChapterIndex = 0;
  let currentMissionIndex = 0;
  let progress = {};
  let route = null;
  let lastRoute = null;
  let guideExpanded = false;
  let mapExpanded = true;
  let root = null;
  let drone = null;
  let missionShadowGenerator = null;
  let environmentNodes = [];
  let weatherLights = [];
  let currentWeatherLabel = '';
  let active = false;
  let running = false;
  let stopRequested = false;
  let speed = 1;
  let state = createEmptyState();
  let dialogueQueue = [];
  let dialogueIndex = 0;
  let assetManifest = null;
  let audioContext = null;
  let objectMarkers = {};
  let workspaceCheckBound = false;
  let tutorialCheckHint = '';
  let objectivePulseObserver = null;
  let objectivePulseTime = 0;
  let npcActors = [];

  const TASK_POINT_TYPES = ['scan', 'sample', 'report', 'pickup', 'dropoff', 'charger', 'collect'];
  const OBJECTIVE_COLORS = {
    scan: [1.0, 0.82, 0.1],
    report: [0.2, 0.75, 1.0],
    sample: [0.4, 0.95, 0.5],
    pickup: [1.0, 0.55, 0.2],
    dropoff: [0.75, 0.45, 1.0],
    charger: [0.3, 0.9, 1.0],
    collect: [0.9, 0.4, 1.0],
  };
  const NPC_ROLE_COLORS = {
    student: [0.35, 0.65, 1.0],
    worker: [0.95, 0.72, 0.25],
    farmer: [0.45, 0.82, 0.35],
    scientist: [0.55, 0.85, 1.0],
    lifeguard: [1.0, 0.45, 0.35],
  };

  const themeColors = {
    campus: { ground: [0.12, 0.28, 0.18], sky: [0.08, 0.14, 0.2] },
    rescue: { ground: [0.3, 0.23, 0.18], sky: [0.18, 0.12, 0.12] },
    farm: { ground: [0.18, 0.34, 0.12], sky: [0.08, 0.16, 0.12] },
    warehouse: { ground: [0.12, 0.14, 0.18], sky: [0.06, 0.08, 0.12] },
    space: { ground: [0.16, 0.16, 0.2], sky: [0.02, 0.02, 0.05] },
    coast: { ground: [0.72, 0.64, 0.46], sky: [0.12, 0.28, 0.42] },
    volcano: { ground: [0.32, 0.18, 0.12], sky: [0.22, 0.08, 0.06] },
    lab: { ground: [0.14, 0.16, 0.22], sky: [0.06, 0.08, 0.14] },
  };

  const themeGridColors = {
    campus: 0x36506d,
    rescue: 0x5a4030,
    farm: 0x2a5a2a,
    warehouse: 0x3a3f48,
    space: 0x2a2a40,
    night: 0x1a2848,
    coast: 0x2a6080,
    sunset: 0x4a3858,
    volcano: 0x6a3020,
    lab: 0x2a4868,
  };

  const weatherAccents = {
    campus: [
      { type: 'beacon', x: 5, z: 2, color: [1, 0.82, 0.35] },
      { type: 'beacon', x: -5, z: -1, color: [1, 0.82, 0.35] },
    ],
    rescue: [{ type: 'warning', x: -5, z: 0, color: [1, 0.2, 0.05] }],
    farm: [
      { type: 'beacon', x: -2, z: 3, color: [1, 0.9, 0.35] },
      { type: 'beacon', x: 4, z: 1, color: [1, 0.9, 0.35] },
      { type: 'beacon', x: -4, z: -1, color: [0.75, 0.95, 0.45] },
    ],
    warehouse: [
      { type: 'warning', x: -1, z: 1, color: [1, 0.65, 0.05] },
      { type: 'warning', x: 3, z: -1, color: [1, 0.2, 0.05] },
    ],
    space: [{ type: 'warning', x: -4, z: 4, color: [0.25, 0.85, 1] }],
    coast: [
      { type: 'beacon', x: 5, z: 2, color: [1, 0.92, 0.55] },
      { type: 'beacon', x: -3, z: -2, color: [1, 0.45, 0.35] },
    ],
    volcano: [
      { type: 'warning', x: 0, z: 0, color: [1, 0.45, 0.12] },
      { type: 'warning', x: 3, z: -2, color: [1, 0.25, 0.08] },
    ],
    lab: [
      { type: 'beacon', x: -2, z: 0, color: [0.35, 0.85, 1] },
      { type: 'beacon', x: 4, z: 1, color: [0.55, 0.95, 0.85] },
    ],
  };

  const OBJECT_FOOTPRINT = {
    base: 1,
    building: 1,
    field: 1,
    tree: 1,
    rubble: 1,
    crop: 1,
    shelf: 1,
    asteroid: 1,
    hazard: 1,
    windTurbine: 1,
    breeze: 0,
    lighthouse: 1,
    heat: 0,
    lava: 1,
    volcano: 2,
    labBench: 1,
    specimen: 1,
    sample: 1,
    report: 1,
    gate: 1,
    canal: 1,
    npc: 0,
  };

  const OBJECT_NUDGE_PRIORITY = {
    base: 0,
    building: 1,
    field: 1,
    tree: 2,
    rubble: 2,
    crop: 2,
    shelf: 2,
    asteroid: 2,
    windTurbine: 2,
    gate: 2,
    canal: 2,
    beacon: 3,
    streetLight: 3,
    npc: 4,
  };

  function createEmptyState() {
    return {
      x: 0,
      z: 0,
      dir: 0,
      flying: false,
      landed: false,
      battery: 100,
      cargo: false,
      scans: new Set(),
      collected: new Set(),
      samples: new Set(),
      reports: new Set(),
      photos: 0,
      hitHazard: false,
      hitNpc: false,
      delivered: false,
      moves: 0,
      log: [],
    };
  }

  async function loadMissions() {
    if (chapters.length) return chapters;
    const response = await fetch(MISSION_DATA_URL);
    const data = await response.json();
    chapters = data.chapters || data;
    return chapters;
  }

  async function loadAssetManifest() {
    if (assetManifest) return assetManifest;
    try {
      const response = await fetch(ASSET_MANIFEST_URL);
      assetManifest = await response.json();
    } catch (error) {
      console.warn('Asset manifest unavailable, using generated fallbacks', error);
      assetManifest = { models: {}, textures: {}, audio: {} };
    }
    return assetManifest;
  }

  function loadProgress() {
    return MissionProgress?.loadProgress?.() || {};
  }

  function saveProgress() {
    MissionProgress?.saveProgress?.(progress);
  }

  function currentChapter() {
    return chapters[currentChapterIndex];
  }

  function currentMission() {
    return currentChapter()?.missions?.[currentMissionIndex];
  }

  function missionKey(chapterIndex = currentChapterIndex, missionIndex = currentMissionIndex) {
    const chapter = chapters[chapterIndex];
    const mission = chapter?.missions?.[missionIndex];
    return chapter && mission ? MissionProgress.missionKey(chapter, mission) : '';
  }

  function isMissionUnlocked(chapterIndex, missionIndex) {
    return MissionProgress.isMissionUnlocked(chapters, chapterIndex, missionIndex, progress);
  }

  function feedbackHelpers() {
    return {
      countObjects,
      isAtMissionTarget,
    };
  }

  function getBlockCount() {
    return ctx?.workspace?.getAllBlocks(false).length || 0;
  }

  function recordRoute(action) {
    MissionRoute?.recordPosition?.(route, state, action, STEP);
  }

  function defineMissionBlocks() {
    if (!Blockly.Blocks.mission_scan) {
    Blockly.Blocks.mission_scan = {
      init() {
        this.appendDummyInput().appendField('📡 掃描任務點');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FFBF00');
      },
    };
    Blockly.Blocks.mission_pickup = {
      init() {
        this.appendDummyInput().appendField('📦 取貨');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FFBF00');
      },
    };
    Blockly.Blocks.mission_dropoff = {
      init() {
        this.appendDummyInput().appendField('📮 放貨');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FFBF00');
      },
    };
    Blockly.Blocks.mission_charge = {
      init() {
        this.appendDummyInput().appendField('🔋 充電');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FFBF00');
      },
    };
    Blockly.Blocks.mission_photo = {
      init() {
        this.appendDummyInput().appendField('📷 拍照記錄');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FFBF00');
      },
    };
    Blockly.Blocks.mission_collect = {
      init() {
        this.appendDummyInput().appendField('💎 收集能量');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FFBF00');
      },
    };
    Blockly.Blocks.mission_repeat_until_done = {
      init() {
        this.appendDummyInput().appendField('🎯 重複直到任務完成');
        this.appendStatementInput('DO').appendField('執行');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FFAB19');
      },
    };
    Blockly.Blocks.mission_danger_ahead = {
      init() {
        this.appendDummyInput().appendField('🚫 前方有危險?');
        this.setOutput(true, 'Boolean');
        this.setColour('#5CB1D6');
      },
    };
    Blockly.Blocks.mission_at_task_point = {
      init() {
        this.appendDummyInput().appendField('📍 在任務點?');
        this.setOutput(true, 'Boolean');
        this.setColour('#5CB1D6');
      },
    };
    Blockly.Blocks.mission_battery_low = {
      init() {
        this.appendDummyInput().appendField('🪫 電量低?');
        this.setOutput(true, 'Boolean');
        this.setColour('#5CB1D6');
      },
    };
    Blockly.Blocks.mission_has_cargo = {
      init() {
        this.appendDummyInput().appendField('📦 已持有貨物?');
        this.setOutput(true, 'Boolean');
        this.setColour('#5CB1D6');
      },
    };
    Blockly.Blocks.mission_done = {
      init() {
        this.appendDummyInput().appendField('✅ 任務完成?');
        this.setOutput(true, 'Boolean');
        this.setColour('#5CB1D6');
      },
    };
    }
    if (!Blockly.Blocks.mission_sample) {
    Blockly.Blocks.mission_sample = {
      init() {
        this.appendDummyInput().appendField('🧪 採集樣本');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FFBF00');
      },
    };
    Blockly.Blocks.mission_report = {
      init() {
        this.appendDummyInput().appendField('📊 回報數據');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FFBF00');
      },
    };
    }
    if (!Blockly.Blocks.mission_heat_ahead) {
    Blockly.Blocks.mission_heat_ahead = {
      init() {
        this.appendDummyInput().appendField('🌋 前方高溫?');
        this.setOutput(true, 'Boolean');
        this.setColour('#5CB1D6');
      },
    };
    }
  }

  async function enter(nextCtx) {
    ctx = nextCtx;
    active = true;
    defineMissionBlocks();
    await loadMissions();
    await loadAssetManifest();
    progress = await MissionProgress.pullFromCloud();
    hideBaseScene();
    updateToolbox('missionToolbox');
    renderCards();
    updateMenuProgressBadge();
    showBottomNav();
    if (!window.__missionNavResizeBound) {
      window.__missionNavResizeBound = true;
      window.addEventListener('resize', syncNavHeight);
    }
    bindWorkspaceTutorialChecks();
    await selectMission(currentChapterIndex, currentMissionIndex);
  }

  function showBottomNav() {
    document.getElementById('missionBottomNav')?.classList.add('show');
  }

  function hideBottomNav() {
    document.getElementById('missionBottomNav')?.classList.remove('show');
  }

  function exit() {
    if (!active) return;
    stopRequested = true;
    running = false;
    clearScene();
    showBaseScene();
    updateToolbox('toolbox');
    resetWeatherAtmosphere();
    active = false;
    hideBottomNav();
    const hud = document.getElementById('missionHud');
    if (hud) hud.classList.remove('show');
    const dock = document.getElementById('missionGuideDock');
    if (dock) dock.classList.remove('show', 'expanded', 'collapsed');
    setWeatherBadge('');
    hideDialogue();
    MissionTutorial?.hideAll?.();
    MissionRoute?.hide?.();
    hideProfile();
    delete document.body.dataset.missionTheme;
  }

  function hideBaseScene() {
    ctx?.drone?.setEnabled?.(false);
    ctx?.targetMarker?.setEnabled?.(false);
    ctx?.startMarker?.setEnabled?.(false);
    ctx?.defaultFloor?.setEnabled?.(false);
    ctx?.defaultWalls?.forEach((wall) => wall.setEnabled(false));
  }

  function showBaseScene() {
    ctx?.drone?.setEnabled?.(true);
    ctx?.targetMarker?.setEnabled?.(true);
    ctx?.startMarker?.setEnabled?.(true);
    ctx?.defaultFloor?.setEnabled?.(true);
    ctx?.defaultWalls?.forEach((wall) => wall.setEnabled(true));
  }

  function updateToolbox(id) {
    if (!ctx?.workspace) return;
    const toolbox = document.getElementById(id);
    if (toolbox) ctx.workspace.updateToolbox(toolbox);
  }

  function updateMissionToolbox() {
    if (!ctx?.workspace) return;
    const chapter = currentChapter();
    const mission = currentMission();
    const themeActions = {
      campus: ['mission_scan', 'mission_photo'],
      rescue: ['mission_scan', 'mission_photo'],
      farm: ['mission_scan', 'mission_photo'],
      warehouse: ['mission_pickup', 'mission_dropoff', 'mission_charge'],
      space: ['mission_scan', 'mission_photo', 'mission_collect'],
      coast: ['mission_scan', 'mission_photo'],
      volcano: ['mission_scan', 'mission_photo', 'mission_sample', 'mission_report'],
      lab: ['mission_scan', 'mission_pickup', 'mission_dropoff', 'mission_charge', 'mission_report'],
    }[chapter.theme] || ['mission_scan'];
    const themeSensors = {
      campus: ['mission_at_task_point', 'mission_done'],
      rescue: ['mission_danger_ahead', 'mission_at_task_point', 'mission_done'],
      farm: ['mission_danger_ahead', 'mission_at_task_point', 'mission_done'],
      warehouse: ['mission_battery_low', 'mission_has_cargo', 'mission_at_task_point', 'mission_done'],
      space: ['mission_danger_ahead', 'mission_at_task_point', 'mission_done'],
      coast: ['mission_danger_ahead', 'mission_at_task_point', 'mission_done'],
      volcano: ['mission_heat_ahead', 'mission_danger_ahead', 'mission_at_task_point', 'mission_done'],
      lab: ['mission_battery_low', 'mission_has_cargo', 'mission_at_task_point', 'mission_done'],
    }[chapter.theme] || ['mission_done'];

    const { actions: missionActions, sensors: missionSensors } = appendMissionToolboxBlocks(
      [...themeActions],
      [...themeSensors],
      mission,
    );

    const xml = `<xml>
      <category name="▶ 任務" colour="#FFBF00">
        <block type="event_start"></block>
        ${missionActions.map((type) => `<block type="${type}"></block>`).join('')}
      </category>
      <category name="⚡ 飛行" colour="#4CBF56">
        <block type="action_takeoff"></block>
        <block type="action_land"></block>
        <block type="action_wait"><field name="MS">500</field></block>
        <block type="action_set_speed"><field name="SPEED">1</field></block>
      </category>
      <category name="🎯 移動" colour="#4C97FF">
        <block type="move_forward"><field name="STEPS">1</field></block>
        <block type="move_backward"><field name="STEPS">1</field></block>
        <block type="move_left"><field name="STEPS">1</field></block>
        <block type="move_right"><field name="STEPS">1</field></block>
        <block type="turn_left"></block>
        <block type="turn_right"></block>
      </category>
      <category name="🔁 控制" colour="#FFAB19">
        <block type="control_repeat"><field name="TIMES">4</field></block>
        <block type="control_if"></block>
        <block type="mission_repeat_until_done"></block>
      </category>
      <category name="📡 任務感測" colour="#5CB1D6">
        ${missionSensors.map((type) => `<block type="${type}"></block>`).join('')}
      </category>
    </xml>`;
    ctx.workspace.updateToolbox(Blockly.utils.xml.textToDom(xml));
  }

  function appendMissionToolboxBlocks(actions, sensors, mission) {
    if (!mission) return { actions, sensors };
    const objs = mission.objects || [];
    const success = mission.success || {};
    const types = objs.map((item) => item.type);
    const add = (list, block) => {
      if (!list.includes(block)) list.push(block);
    };
    if (types.includes('sample') || success.samples || success.sampleAll) add(actions, 'mission_sample');
    if (types.includes('report') || success.reports || success.reportAll) add(actions, 'mission_report');
    if (types.includes('collect') || success.collected) add(actions, 'mission_collect');
    if (success.photos) add(actions, 'mission_photo');
    if (types.includes('scan') || success.scanAll) add(actions, 'mission_scan');
    if (types.includes('pickup') || success.picked || success.delivered) add(actions, 'mission_pickup');
    if (types.includes('dropoff') || success.delivered) add(actions, 'mission_dropoff');
    if (types.includes('charger')) add(actions, 'mission_charge');
    if (types.some((type) => type === 'hazard' || type === 'lava')) add(sensors, 'mission_danger_ahead');
    if (types.some((type) => type === 'heat' || type === 'lava')) add(sensors, 'mission_heat_ahead');
    if (mission.maxRepeatSteps) add(actions, 'mission_repeat_until_done');
    return { actions, sensors };
  }

  function renderCards() {
    const total = MissionProgress.getTotalProgress(chapters, progress);
    const header = document.getElementById('missionProgressSummary');
    if (header) header.textContent = `${total.completed}/${total.total} 關完成`;
    renderChapterBar();
    renderLevelBar();
    updateMapPanelChrome();
    syncNavHeight();
  }

  function renderChapterBar() {
    const container = document.getElementById('missionChapterBar');
    if (!container) return;
    container.innerHTML = chapters.map((chapter, chapterIndex) => {
      const cp = MissionProgress.getChapterProgress(chapter, progress);
      const weather = MissionProgress.THEME_WEATHER[chapter.theme] || '';
      const active = chapterIndex === currentChapterIndex;
      return `
        <button type="button"
          class="mission-chapter-tab ${active ? 'active' : ''}"
          onclick="MissionMode.selectChapter(${chapterIndex})"
          title="${weather}">
          <span class="mission-chapter-tab-icon">${chapter.icon}</span>
          <span class="mission-chapter-tab-title">${chapter.title}</span>
          <span class="mission-chapter-tab-progress">${cp.done}/${cp.total}</span>
        </button>
      `;
    }).join('');
  }

  function renderLevelBar() {
    const container = document.getElementById('missionLevelBar');
    if (!container) return;
    const chapter = chapters[currentChapterIndex];
    if (!chapter) {
      container.innerHTML = '';
      updateMapPanelChrome();
      return;
    }
    container.innerHTML = chapter.missions.map((mission, missionIndex) => {
      const done = progress[missionKey(currentChapterIndex, missionIndex)];
      const activeMission = missionIndex === currentMissionIndex;
      const label = done?.completed ? done.stars : `${missionIndex + 1}`;
      return `
        <button type="button"
          class="mission-level-tab ${activeMission ? 'active' : ''}"
          onclick="MissionMode.selectMission(${currentChapterIndex}, ${missionIndex})"
          title="${mission.title}">
          <span class="mission-level-tab-num">${missionIndex + 1}</span>
          <span class="mission-level-tab-title">${mission.title}</span>
          <span class="mission-level-tab-status">${label}</span>
        </button>
      `;
    }).join('');
    updateMapPanelChrome();
  }

  function updateMapPanelChrome() {
    const panel = document.getElementById('missionMapPanel');
    const summary = document.getElementById('missionMapSummary');
    const toggle = document.getElementById('missionMapToggle');
    const chapter = currentChapter();
    const mission = currentMission();
    const total = MissionProgress.getTotalProgress(chapters, progress);
    if (panel) {
      panel.classList.toggle('expanded', mapExpanded);
      panel.classList.toggle('collapsed', !mapExpanded);
    }
    if (summary && chapter && mission) {
      summary.textContent = `${chapter.icon} ${chapter.title} · ${currentMissionIndex + 1}. ${mission.title} · ${total.completed}/${total.total}`;
    }
    if (toggle) {
      toggle.textContent = mapExpanded ? '收合關卡地圖 ▲' : '展開關卡地圖 ▼';
    }
    syncNavHeight();
  }

  function toggleMap(forceExpanded) {
    mapExpanded = typeof forceExpanded === 'boolean' ? forceExpanded : !mapExpanded;
    updateMapPanelChrome();
  }

  function updateMenuProgressBadge() {
    const total = MissionProgress.getTotalProgress(chapters, progress);
    const tag = document.querySelector('.mode-card.mission .feature-tag.mission-progress');
    if (tag) tag.textContent = `🏁 ${total.completed}/${total.total}`;
    window.dispatchEvent(new CustomEvent('drone-mission-progress', { detail: total }));
  }

  function selectChapter(index) {
    const nextIndex = Math.max(0, Math.min(chapters.length - 1, index));
    if (nextIndex === currentChapterIndex) {
      renderCards();
      return;
    }
    currentChapterIndex = nextIndex;
    return selectMission(currentChapterIndex, 0);
  }

  async function selectMission(chapterIndex, missionIndex) {
    const chapter = chapters[Math.max(0, Math.min(chapters.length - 1, chapterIndex))];
    if (!chapter?.missions?.length) return;
    currentChapterIndex = Math.max(0, Math.min(chapters.length - 1, chapterIndex));
    currentMissionIndex = Math.max(0, Math.min(currentChapter().missions.length - 1, missionIndex));
    state = createEmptyState();
    route = MissionRoute?.createEmptyRoute?.() || { points: [], actions: [] };
    MissionRoute?.clearRouteVisual?.(ctx?.scene);
    MissionRoute?.hide?.();
    renderCards();
    await buildScene();
    updateMissionToolbox();
    loadStarterProgram();
    guideExpanded = false;
    renderGuideDock();
    updateHud('待命');
    MissionTutorial?.showForMission?.(currentMission(), currentChapter(), { showCard: false });
    refreshTutorialCheckHint();
    playSound('missionStart');
    showDialogue(currentMission().dialogueStart || currentChapter().introDialogue || []);
  }

  function clearScene() {
    if (!root) return;
    stopObjectivePulseLoop();
    npcActors = [];
    clearEnvironmentEffects();
    objectMarkers = {};
    if (missionShadowGenerator) {
      missionShadowGenerator.dispose();
      missionShadowGenerator = null;
    }
    root.getChildMeshes().forEach((mesh) => {
      if (mesh.material) mesh.material.dispose();
      mesh.dispose();
    });
    root.dispose();
    root = null;
    drone = null;
  }

  async function buildScene() {
    clearScene();
    const chapter = currentChapter();
    const mission = currentMission();
    const colors = themeColors[chapter.theme] || themeColors.campus;
    ctx.scene.clearColor = new BABYLON.Color4(colors.sky[0], colors.sky[1], colors.sky[2], 1);
    root = new BABYLON.TransformNode('missionRoot', ctx.scene);
    createMissionShadowGenerator();

    createMissionGround(chapter, mission);
    applyWeatherSystem(chapter.theme, mission);
    createMissionDrone(mission.start);

    const sceneObjects = resolveObjectsForStart(
      [...(chapter.objects || []), ...(mission.objects || [])],
      mission.start,
    );
    for (const item of sceneObjects) {
      await createMissionObject(item);
    }

    if (ctx.camera) {
      ctx.camera.alpha = -Math.PI / 2;
      ctx.camera.beta = Math.PI / 3.2;
      ctx.camera.radius = 25;
      ctx.camera.setTarget(BABYLON.Vector3.Zero());
    }
    startObjectivePulseLoop();
  }

  function createMissionGround(chapter, mission) {
    const colors = themeColors[chapter.theme] || themeColors.campus;
    const gridColor = themeGridColors[mission?.weatherOverride] || themeGridColors[chapter.theme] || themeGridColors.campus;
    const gridCols = GRID_X_MAX - GRID_X_MIN + 1;
    const gridRows = GRID_Z_MAX - GRID_Z_MIN + 1;
    const ground = BABYLON.MeshBuilder.CreateGround('missionGround', {
      width: gridCols * STEP,
      height: gridRows * STEP,
    }, ctx.scene);
    const mat = new BABYLON.StandardMaterial('missionGroundMat', ctx.scene);
    mat.diffuseColor = new BABYLON.Color3(colors.ground[0], colors.ground[1], colors.ground[2]);
    ground.material = mat;
    ground.receiveShadows = true;
    ground.parent = root;
    for (let x = GRID_X_MIN; x <= GRID_X_MAX; x++) {
      const gx = (x + 0.5) * STEP;
      createLine(`gx${x}`, gx, (GRID_Z_MIN - 0.5) * STEP, gx, (GRID_Z_MAX + 0.5) * STEP, gridColor, ground);
    }
    for (let z = GRID_Z_MIN; z <= GRID_Z_MAX; z++) {
      const gz = (z + 0.5) * STEP;
      createLine(`gz${z}`, (GRID_X_MIN - 0.5) * STEP, gz, (GRID_X_MAX + 0.5) * STEP, gz, gridColor, ground);
    }
    createThemeDetails(chapter.theme);
  }

  function getObjectFootprint(item) {
    return OBJECT_FOOTPRINT[item.type] ?? 0;
  }

  function occupiesStartCell(item, start, footprint = getObjectFootprint(item)) {
    return Math.abs(item.x - start.x) <= footprint && Math.abs(item.z - start.z) <= footprint;
  }

  function findOpenObjectCell(item, start, occupied) {
    const offsets = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [2, 0], [-2, 0], [0, 2], [0, -2],
      [1, 1], [-1, 1], [1, -1], [-1, -1],
    ];
    for (const [dx, dz] of offsets) {
      const candidate = { ...item, x: item.x + dx, z: item.z + dz };
      if (occupiesStartCell(candidate, start)) continue;
      const key = `${candidate.x},${candidate.z}`;
      if (occupied.has(key)) continue;
      return candidate;
    }
    return null;
  }

  function resolveObjectsForStart(objects, start) {
    const occupied = new Set();
    const resolved = [];
    const sorted = [...objects].sort((a, b) => (
      (OBJECT_NUDGE_PRIORITY[a.type] ?? 9) - (OBJECT_NUDGE_PRIORITY[b.type] ?? 9)
    ));

    sorted.forEach((item) => {
      let placement = { ...item };
      if (occupiesStartCell(placement, start)) {
        const moved = findOpenObjectCell(placement, start, occupied);
        if (!moved) return;
        placement = moved;
      }
      let key = `${placement.x},${placement.z}`;
      if (occupied.has(key)) {
        const moved = findOpenObjectCell(placement, start, occupied);
        if (!moved) return;
        placement = moved;
        key = `${placement.x},${placement.z}`;
        if (occupied.has(key)) return;
      }
      occupied.add(key);
      resolved.push(placement);
    });
    return resolved;
  }

  function setWeatherBadge(label) {
    const weather = document.getElementById('missionWeather');
    if (weather) weather.className = 'mission-weather';
    setText('mhWeather', label || '--');
  }

  function applyWeatherSystem(theme, mission = null) {
    clearEnvironmentEffects();
    document.body.dataset.missionTheme = theme;
    const profile = window.MissionWeather?.apply({
      scene: ctx.scene,
      root,
      theme,
      override: mission?.weatherOverride || null,
    });
    (weatherAccents[theme] || []).forEach((accent) => {
      if (accent.type === 'warning') createWarningLight(accent.x, accent.z, accent.color);
      if (accent.type === 'beacon') createSoftBeacon(accent.x, accent.z, accent.color);
    });
    currentWeatherLabel = profile?.label || '--';
    setWeatherBadge(currentWeatherLabel);
  }

  function clearEnvironmentEffects() {
    window.MissionWeather?.dispose();
    weatherLights.forEach((light) => light.dispose && light.dispose());
    weatherLights = [];
    environmentNodes.forEach((node) => node.dispose && node.dispose());
    environmentNodes = [];
  }

  function resetWeatherAtmosphere() {
    window.MissionWeather?.resetAtmosphere(ctx?.scene);
    currentWeatherLabel = '';
    setWeatherBadge('');
  }

  function createWarningLight(x, z, color) {
    const light = new BABYLON.PointLight(`warningLight${x}${z}`, toWorld(x, z, 1.4), ctx.scene);
    light.diffuse = new BABYLON.Color3(color[0], color[1], color[2]);
    light.specular = light.diffuse;
    light.intensity = 0.9;
    light.range = 5;
    weatherLights.push(light);
    const beacon = parentMesh(BABYLON.MeshBuilder.CreateSphere(`warningBeacon${x}${z}`, { diameter: 0.22, segments: 10 }, ctx.scene), root, createMat(`warningMat${x}${z}`, color, 0.8));
    beacon.position = toWorld(x, z, 1.4);
    environmentNodes.push(beacon);
  }

  function createSoftBeacon(x, z, color) {
    const light = new BABYLON.PointLight(`softBeacon${x}${z}`, toWorld(x, z, 1.7), ctx.scene);
    light.diffuse = new BABYLON.Color3(color[0], color[1], color[2]);
    light.intensity = 0.45;
    light.range = 4;
    weatherLights.push(light);
  }

  function createThemeDetails(theme) {
    if (theme === 'campus') {
      createRoadStrip('campusRoadA', 0, 0, 12, 0.5, [0.22, 0.24, 0.26]);
      createRoadStrip('campusRoadB', -2, 0, 0.5, 8, [0.22, 0.24, 0.26]);
    } else if (theme === 'rescue') {
      createRoadStrip('dangerTapeA', 0.5, 0.5, 9, 0.12, [0.95, 0.72, 0.1]);
      createRoadStrip('dangerTapeB', 1.5, -2.5, 7, 0.12, [0.95, 0.72, 0.1]);
    } else if (theme === 'farm') {
      for (let i = -4; i <= 4; i += 2) createRoadStrip(`farmRow${i}`, i, 0, 0.18, 11, [0.28, 0.48, 0.14]);
      createRoadStrip('farmCanal', 1.5, -3, 8, 0.35, [0.06, 0.38, 0.72]);
    } else if (theme === 'warehouse') {
      createRoadStrip('warehouseAisleA', 0, 0, 12, 0.65, [0.28, 0.3, 0.34]);
      createRoadStrip('warehouseAisleB', 0, -2.5, 12, 0.45, [0.24, 0.26, 0.3]);
      createRoadStrip('warehouseAisleC', 0, 2.5, 12, 0.45, [0.24, 0.26, 0.3]);
    } else if (theme === 'space') {
      for (let i = 0; i < 7; i++) {
        const crater = parentMesh(BABYLON.MeshBuilder.CreateTorus(`crater${i}`, { diameter: 0.7 + i * 0.08, thickness: 0.035, tessellation: 18 }, ctx.scene), root, createMat(`craterMat${i}`, [0.28, 0.28, 0.34]));
        crater.position = new BABYLON.Vector3((-5 + i * 1.6) * STEP, 0.04, ((i % 3) - 1) * STEP * 2);
        crater.rotation.x = Math.PI / 2;
      }
    } else if (theme === 'coast') {
      createRoadStrip('coastSandA', 0, 1, 14, 0.55, [0.82, 0.74, 0.52]);
      createRoadStrip('coastWater', -6, -4, 3.5, 12, [0.08, 0.42, 0.78]);
      createRoadStrip('coastShore', -4, -3, 8, 0.35, [0.55, 0.72, 0.88]);
    } else if (theme === 'volcano') {
      createRoadStrip('volcanoLavaA', 1, -1, 10, 0.4, [0.85, 0.28, 0.08]);
      createRoadStrip('volcanoLavaB', -2, 2, 6, 0.35, [0.72, 0.22, 0.06]);
      createRoadStrip('volcanoAsh', 0, 0, 14, 0.25, [0.38, 0.28, 0.22]);
      for (let i = -3; i <= 3; i += 2) {
        createRoadStrip(`volcanoCrack${i}`, i * 0.8, -4, 0.22, 2.8, [0.48, 0.18, 0.06]);
      }
    } else if (theme === 'lab') {
      createRoadStrip('labHallA', 0, 0, 12, 0.55, [0.22, 0.26, 0.34]);
      createRoadStrip('labHallB', 0, -2.5, 12, 0.45, [0.18, 0.22, 0.3]);
      createRoadStrip('labHallC', 0, 2.5, 12, 0.45, [0.18, 0.22, 0.3]);
      createRoadStrip('labCleanZone', -4, 1, 3.5, 5, [0.12, 0.42, 0.38]);
      createRoadStrip('labCleanZoneB', 4, -1, 3, 4, [0.1, 0.38, 0.34]);
    }
  }

  function createRoadStrip(name, x, z, width, depth, color) {
    const strip = BABYLON.MeshBuilder.CreateBox(name, { width, height: 0.035, depth }, ctx.scene);
    strip.position = new BABYLON.Vector3(x * STEP, 0.045, z * STEP);
    strip.parent = root;
    strip.material = createMat(`${name}Mat`, color);
  }

  function createLine(name, x1, z1, x2, z2, color, parent = root) {
    const line = BABYLON.MeshBuilder.CreateLines(name, {
      points: [new BABYLON.Vector3(x1, 0.025, z1), new BABYLON.Vector3(x2, 0.025, z2)],
    }, ctx.scene);
    line.color = BABYLON.Color3.FromHexString(`#${color.toString(16).padStart(6, '0')}`);
    line.parent = parent;
  }

  function createMissionShadowGenerator() {
    const light = ctx.scene.getLightByName('d');
    if (!light) return;
    missionShadowGenerator = new BABYLON.ShadowGenerator(1024, light);
    missionShadowGenerator.useBlurExponentialShadowMap = true;
  }

  function createMissionDrone(start) {
    state.x = start.x;
    state.z = start.z;
    state.dir = start.dir || 0;
    drone = new BABYLON.TransformNode('missionDrone', ctx.scene);
    drone.position = toWorld(state.x, state.z, 0.4);
    drone.rotation.y = dirToRad(state.dir);
    drone.parent = root;
    createSharedDroneModel(drone);
  }

  function createSharedDroneModel(parent) {
    const meshes = [];
    const body = BABYLON.MeshBuilder.CreateCylinder('missionBody', { height: 0.25, diameter: 1.05, tessellation: 6 }, ctx.scene);
    body.parent = parent;
    const bodyMat = new BABYLON.StandardMaterial('missionBodyMat', ctx.scene);
    bodyMat.diffuseColor = new BABYLON.Color3(0.18, 0.22, 0.32);
    bodyMat.specularColor = new BABYLON.Color3(0.6, 0.7, 0.85);
    body.material = bodyMat;
    meshes.push(body);

    const lowerHull = BABYLON.MeshBuilder.CreateCylinder('missionLowerHull', { height: 0.15, diameterTop: 1.0, diameterBottom: 0.7, tessellation: 6 }, ctx.scene);
    lowerHull.position.y = -0.2;
    lowerHull.parent = parent;
    lowerHull.material = bodyMat;
    meshes.push(lowerHull);

    const dome = BABYLON.MeshBuilder.CreateSphere('missionDome', { diameter: 0.62, slice: 0.5 }, ctx.scene);
    dome.position.y = 0.12;
    dome.parent = parent;
    const domeMat = new BABYLON.StandardMaterial('missionDomeMat', ctx.scene);
    domeMat.diffuseColor = new BABYLON.Color3(0.1, 0.5, 0.9);
    domeMat.emissiveColor = new BABYLON.Color3(0.1, 0.35, 0.7);
    domeMat.alpha = 0.7;
    domeMat.specularColor = new BABYLON.Color3(1, 1, 1);
    dome.material = domeMat;
    meshes.push(dome);

    const nose = BABYLON.MeshBuilder.CreateCylinder('missionNose', { height: 0.55, diameterTop: 0.02, diameterBottom: 0.22 }, ctx.scene);
    nose.position = new BABYLON.Vector3(0.7, 0, 0);
    nose.rotation.z = -Math.PI / 2;
    nose.parent = parent;
    const noseMat = new BABYLON.StandardMaterial('missionNoseMat', ctx.scene);
    noseMat.diffuseColor = new BABYLON.Color3(0.95, 0.2, 0.2);
    noseMat.emissiveColor = new BABYLON.Color3(0.55, 0.1, 0.1);
    nose.material = noseMat;
    parent._nose = nose;
    meshes.push(nose);

    const strip = BABYLON.MeshBuilder.CreateBox('missionStrip', { width: 0.04, height: 0.06, depth: 0.85 }, ctx.scene);
    strip.position = new BABYLON.Vector3(0, 0.15, 0);
    strip.parent = parent;
    const stripMat = new BABYLON.StandardMaterial('missionStripMat', ctx.scene);
    stripMat.emissiveColor = new BABYLON.Color3(0.3, 0.9, 1);
    strip.material = stripMat;
    meshes.push(strip);

    const thrust = BABYLON.MeshBuilder.CreateCylinder('missionThrust', { height: 0.08, diameterTop: 0.45, diameterBottom: 0.3 }, ctx.scene);
    thrust.position.y = -0.32;
    thrust.parent = parent;
    const thrustMat = new BABYLON.StandardMaterial('missionThrustMat', ctx.scene);
    thrustMat.emissiveColor = new BABYLON.Color3(0.4, 0.7, 1);
    thrustMat.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.9);
    thrust.material = thrustMat;
    meshes.push(thrust);

    const armPositions = [
      { x: 0.55, z: 0.55, isFront: true },
      { x: 0.55, z: -0.55, isFront: true },
      { x: -0.55, z: 0.55, isFront: false },
      { x: -0.55, z: -0.55, isFront: false },
    ];
    armPositions.forEach((point, index) => {
      const arm = BABYLON.MeshBuilder.CreateBox(`missionArm${index}`, { width: 0.06, height: 0.06, depth: 0.42 }, ctx.scene);
      arm.position = new BABYLON.Vector3(point.x * 0.6, 0, point.z * 0.6);
      arm.rotation.y = Math.atan2(point.x, point.z);
      arm.parent = parent;
      const armMat = new BABYLON.StandardMaterial(`missionArmMat${index}`, ctx.scene);
      armMat.diffuseColor = new BABYLON.Color3(0.1, 0.13, 0.18);
      arm.material = armMat;
      meshes.push(arm);

      const motor = BABYLON.MeshBuilder.CreateCylinder(`missionMotor${index}`, { height: 0.1, diameter: 0.18 }, ctx.scene);
      motor.position = new BABYLON.Vector3(point.x, 0.08, point.z);
      motor.parent = parent;
      motor.material = armMat;
      meshes.push(motor);

      const led = BABYLON.MeshBuilder.CreateSphere(`missionLed${index}`, { diameter: 0.1, segments: 8 }, ctx.scene);
      led.position = new BABYLON.Vector3(point.x * 1.1, 0.08, point.z * 1.1);
      led.parent = parent;
      const ledMat = new BABYLON.StandardMaterial(`missionLedMat${index}`, ctx.scene);
      ledMat.emissiveColor = point.isFront ? new BABYLON.Color3(1, 0.25, 0.25) : new BABYLON.Color3(0.25, 1, 0.4);
      led.material = ledMat;
      meshes.push(led);

      const prop = BABYLON.MeshBuilder.CreateBox(`missionProp${index}`, { width: 0.46, height: 0.015, depth: 0.04 }, ctx.scene);
      prop.position = new BABYLON.Vector3(point.x, 0.16, point.z);
      prop.parent = parent;
      const propMat = new BABYLON.StandardMaterial(`missionPropMat${index}`, ctx.scene);
      propMat.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.78);
      propMat.alpha = 0.6;
      prop.material = propMat;
      meshes.push(prop);
    });

    meshes.forEach((mesh) => {
      mesh.isPickable = false;
      if (missionShadowGenerator) missionShadowGenerator.addShadowCaster(mesh);
    });
  }

  async function createMissionObject(item) {
    const holder = new BABYLON.TransformNode(`missionObject-${item.type}-${item.label}`, ctx.scene);
    holder.position = toWorld(item.x, item.z, 0);
    holder.parent = root;
    if (item.type === 'npc') {
      const loaded = await tryLoadModel(item, holder);
      if (!loaded) createPedestrian(holder, item.role || 'worker');
      npcActors.push({
        label: item.label,
        role: item.role || 'worker',
        x: item.x,
        z: item.z,
        patrol: (item.patrol?.length ? item.patrol : [{ x: item.x, z: item.z }]).map((p) => ({ x: p.x, z: p.z })),
        patrolIndex: 0,
        holder,
      });
      return;
    }
    const loaded = await tryLoadModel(item, holder);
    if (!loaded) createFallbackObject(item, holder);
    createObjectLabel(item, holder);
    if (item.label && (TASK_POINT_TYPES.includes(item.type) || item.type === 'beacon')) {
      objectMarkers[item.label] = { holder, item, completed: false };
    }
  }

  async function tryLoadModel(item, parent) {
    if (!item.model || !BABYLON.SceneLoader?.ImportMeshAsync) return false;
    try {
      const slash = item.model.lastIndexOf('/');
      const rootUrl = item.model.slice(0, slash + 1);
      const fileName = item.model.slice(slash + 1);
      const result = await BABYLON.SceneLoader.ImportMeshAsync('', rootUrl, fileName, ctx.scene);
      result.meshes.forEach((mesh) => {
        if (mesh !== ctx.scene.meshes[0]) {
          mesh.parent = parent;
          mesh.scaling.scaleInPlace(MODEL_SCALE);
        }
      });
      return true;
    } catch (error) {
      console.warn(`Model fallback for ${item.model}`, error);
      return false;
    }
  }

  function createFallbackObject(item, parent) {
    const mission = currentChapter();
    if (item.type === 'building') createSchoolBuilding(parent);
    else if (item.type === 'field') createTrackField(parent);
    else if (item.type === 'tree') createTreeAsset(parent);
    else if (item.type === 'streetLight') createStreetLight(parent);
    else if (item.type === 'base' && mission.theme === 'rescue') createRescueTent(parent);
    else if (item.type === 'base' && mission.theme === 'space') createMoonBase(parent);
    else if (item.type === 'hazard' && mission.theme === 'coast') createWaveHazard(parent);
    else if (item.type === 'hazard' && mission.theme === 'volcano') createLavaHazard(parent);
    else if (item.type === 'hazard' && mission.theme === 'lab') createLabHazard(parent);
    else if (item.type === 'hazard' && mission.theme === 'space') createAsteroid(parent);
    else if (item.type === 'hazard') createRubble(parent);
    else if (item.type === 'lava') createLavaHazard(parent);
    else if (item.type === 'heat') createHeatZone(parent);
    else if (item.type === 'volcano') createVolcanoCone(parent);
    else if (item.type === 'labBench') createLabBench(parent);
    else if (item.type === 'specimen') createSpecimenJar(parent);
    else if (item.type === 'rubble') createRubble(parent);
    else if (item.type === 'beacon') createSignalBeacon(parent, item.label);
    else if (item.type === 'crop') createCropField(parent);
    else if (item.type === 'canal') createCanal(parent);
    else if (item.type === 'windTurbine') createWindTurbine(parent);
    else if (item.type === 'breeze') createBreezeMarker(parent, item);
    else if (item.type === 'lighthouse') createLighthouse(parent);
    else if (item.type === 'shelf') createWarehouseShelf(parent);
    else if (item.type === 'gate') createSafetyGate(parent);
    else if (item.type === 'asteroid') createAsteroid(parent);
    else if (item.type === 'npc') createPedestrian(parent, item.role || 'worker');
    else createGenericAsset(parent, item.type);

    if (TASK_POINT_TYPES.includes(item.type)) {
      createObjectiveMarker(parent, item);
    } else if (item.type === 'beacon' && item.label) {
      createObjectiveMarker(parent, { ...item, type: 'collect' });
    }
  }

  function createMat(name, color, emissive = 0.08, alpha = 1) {
    const mat = new BABYLON.StandardMaterial(name, ctx.scene);
    mat.diffuseColor = new BABYLON.Color3(color[0], color[1], color[2]);
    mat.emissiveColor = mat.diffuseColor.scale(emissive);
    mat.alpha = alpha;
    return mat;
  }

  function parentMesh(mesh, parent, mat) {
    mesh.parent = parent;
    if (mat) mesh.material = mat;
    mesh.receiveShadows = true;
    if (missionShadowGenerator && mesh.getTotalVertices && mesh.getTotalVertices() > 0) {
      missionShadowGenerator.addShadowCaster(mesh);
    }
    return mesh;
  }

  function getObjectiveDisplayLabel(item) {
    return item.label || ({
      scan: '掃描點',
      report: '登記終端',
      sample: '採樣點',
      pickup: '取貨點',
      dropoff: '放貨點',
      charger: '充電站',
      collect: '收集點',
    }[item.type] || '任務點');
  }

  function createFloatingObjectiveLabel(parent, text, color) {
    const display = (text || '任務點').slice(0, 12);
    const texW = 512;
    const texH = 128;
    const tex = new BABYLON.DynamicTexture(`objLbl-${parent.name}`, { width: texW, height: texH }, ctx.scene, false);
    const ctx2d = tex.getContext();
    ctx2d.fillStyle = 'rgba(8, 16, 32, 0.86)';
    ctx2d.fillRect(0, 0, texW, texH);
    ctx2d.strokeStyle = `rgb(${Math.floor(color[0] * 255)},${Math.floor(color[1] * 255)},${Math.floor(color[2] * 255)})`;
    ctx2d.lineWidth = 6;
    ctx2d.strokeRect(8, 8, texW - 16, texH - 16);
    ctx2d.fillStyle = '#f8fafc';
    ctx2d.font = 'bold 42px "Microsoft YaHei", sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText(display, texW / 2, texH / 2);
    tex.update();

    const plane = BABYLON.MeshBuilder.CreatePlane(`objLblPlane-${parent.name}`, { width: 1.65, height: 0.42 }, ctx.scene);
    const mat = new BABYLON.StandardMaterial(`objLblMat-${parent.name}`, ctx.scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.emissiveColor = new BABYLON.Color3(color[0], color[1], color[2]).scale(0.4);
    mat.backFaceCulling = false;
    mat.disableLighting = true;
    mat.useAlphaFromDiffuseTexture = true;
    plane.material = mat;
    plane.parent = parent;
    plane.position.y = 2.85;
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    plane.metadata = { isLabelPlane: true };
    plane.isPickable = false;
    return plane;
  }

  function createObjectiveMarker(parent, item) {
    const color = OBJECTIVE_COLORS[item.type] || [0.9, 0.9, 0.3];
    const displayText = getObjectiveDisplayLabel(item);
    const ringMat = createMat(`objRing-${item.label}`, color, 0.75);
    const ring = parentMesh(BABYLON.MeshBuilder.CreateTorus(`objRing-${item.label}`, { diameter: 1.35, thickness: 0.09, tessellation: 32 }, ctx.scene), parent, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.07;
    ring.name = 'objectiveRing';

    const beam = parentMesh(
      BABYLON.MeshBuilder.CreateCylinder(`objBeam-${item.label}`, { height: 2.6, diameterTop: 0.18, diameterBottom: 0.42 }, ctx.scene),
      parent,
      createMat(`objBeam-${item.label}`, color, 0.65, 0.32),
    );
    beam.position.y = 1.3;

    const cap = parentMesh(
      BABYLON.MeshBuilder.CreateSphere(`objCap-${item.label}`, { diameter: 0.28, segments: 10 }, ctx.scene),
      parent,
      createMat(`objCap-${item.label}`, color, 0.85),
    );
    cap.position.y = 2.72;

    if (item.type === 'report') {
      const term = parentMesh(
        BABYLON.MeshBuilder.CreateBox(`term-${item.label}`, { width: 0.5, height: 0.7, depth: 0.35 }, ctx.scene),
        parent,
        createMat(`termMat-${item.label}`, [0.15, 0.55, 0.95], 0.35),
      );
      term.position.y = 0.35;
    } else if (item.type === 'pickup') {
      const pkg = parentMesh(
        BABYLON.MeshBuilder.CreateBox(`pkg-${item.label}`, { width: 0.45, height: 0.35, depth: 0.45 }, ctx.scene),
        parent,
        createMat(`pkgMat-${item.label}`, color, 0.4),
      );
      pkg.position.y = 0.2;
    } else if (item.type === 'dropoff') {
      const pad = parentMesh(
        BABYLON.MeshBuilder.CreateCylinder(`dropPad-${item.label}`, { height: 0.08, diameter: 0.9 }, ctx.scene),
        parent,
        createMat(`dropPadMat-${item.label}`, color, 0.35),
      );
      pad.position.y = 0.06;
    } else if (item.type === 'charger') {
      const pole = parentMesh(
        BABYLON.MeshBuilder.CreateCylinder(`chargePole-${item.label}`, { height: 0.9, diameter: 0.12 }, ctx.scene),
        parent,
        createMat(`chargePoleMat-${item.label}`, color, 0.45),
      );
      pole.position.y = 0.45;
    } else if (item.type === 'collect') {
      const crystal = parentMesh(
        BABYLON.MeshBuilder.CreatePolyhedron(`crystal-${item.label}`, { type: 1, size: 0.35 }, ctx.scene),
        parent,
        createMat(`crystalMat-${item.label}`, color, 0.55),
      );
      crystal.position.y = 0.45;
    } else if (item.type === 'sample') {
      const jar = parentMesh(
        BABYLON.MeshBuilder.CreateCylinder(`sampleJar-${item.label}`, { height: 0.45, diameter: 0.28 }, ctx.scene),
        parent,
        createMat(`sampleJarMat-${item.label}`, color, 0.4),
      );
      jar.position.y = 0.24;
    }

    const labelPlane = createFloatingObjectiveLabel(parent, displayText, color);
    const meshes = [ring, beam, cap, labelPlane];
    const baseEmissive = meshes.map((mesh) => mesh.material?.emissiveColor?.clone?.() || new BABYLON.Color3(0.2, 0.2, 0.2));
    parent.metadata = {
      markerType: item.type,
      label: item.label,
      meshes,
      baseEmissive,
      objectiveMarker: true,
    };
  }

  function stopObjectivePulseLoop() {
    if (objectivePulseObserver && ctx?.scene) {
      ctx.scene.onBeforeRenderObservable.remove(objectivePulseObserver);
      objectivePulseObserver = null;
    }
  }

  function startObjectivePulseLoop() {
    if (!ctx?.scene) return;
    stopObjectivePulseLoop();
    objectivePulseTime = 0;
    objectivePulseObserver = ctx.scene.onBeforeRenderObservable.add(() => {
      objectivePulseTime += ctx.scene.getEngine().getDeltaTime() * 0.001;
      const mission = currentMission();
      if (!mission) return;
      const nextLabel = MissionFeedback?.getNextPendingObjectiveLabel?.(state, mission, feedbackHelpers());
      Object.entries(objectMarkers).forEach(([label, entry]) => {
        if (entry.completed) return;
        const meshes = entry.holder?.metadata?.meshes || [];
        const isNext = Boolean(nextLabel && label === nextLabel);
        const pulse = 0.45 + Math.sin(objectivePulseTime * (isNext ? 5 : 3)) * (isNext ? 0.35 : 0.2);
        const scale = 1 + Math.sin(objectivePulseTime * (isNext ? 4 : 2.5)) * (isNext ? 0.08 : 0.04);
        meshes.forEach((mesh, index) => {
          if (mesh.metadata?.isLabelPlane) {
            mesh.position.y = 2.85 + Math.sin(objectivePulseTime * 2) * 0.08;
            return;
          }
          if (mesh.name === 'objectiveRing') {
            mesh.scaling.setAll(scale);
          }
          if (mesh.material?.emissiveColor) {
            const base = entry.holder.metadata.baseEmissive?.[index] || mesh.material.emissiveColor;
            mesh.material.emissiveColor = base.scale(pulse);
          }
        });
      });
    });
  }

  function createPedestrian(parent, role) {
    const color = NPC_ROLE_COLORS[role] || NPC_ROLE_COLORS.worker;
    const skin = createMat(`npcSkin-${parent.name}`, [0.95, 0.82, 0.72], 0.05);
    const bodyMat = createMat(`npcBody-${parent.name}`, color, 0.25);
    const head = parentMesh(BABYLON.MeshBuilder.CreateSphere('npcHead', { diameter: 0.32, segments: 8 }, ctx.scene), parent, skin);
    head.position.y = 1.05;
    const body = parentMesh(BABYLON.MeshBuilder.CreateBox('npcBody', { width: 0.38, height: 0.55, depth: 0.28 }, ctx.scene), parent, bodyMat);
    body.position.y = 0.58;
    [-1, 1].forEach((side) => {
      const arm = parentMesh(BABYLON.MeshBuilder.CreateBox(`npcArm${side}`, { width: 0.1, height: 0.38, depth: 0.1 }, ctx.scene), parent, bodyMat);
      arm.position = new BABYLON.Vector3(side * 0.28, 0.65, 0);
    });
    const legs = parentMesh(
      BABYLON.MeshBuilder.CreateBox('npcLegs', { width: 0.34, height: 0.35, depth: 0.28 }, ctx.scene),
      parent,
      createMat(`npcLegs-${parent.name}`, [0.2, 0.22, 0.3], 0.08),
    );
    legs.position.y = 0.2;
  }

  function syncNpcHolder(actor) {
    if (actor.holder) {
      actor.holder.position = toWorld(actor.x, actor.z, 0);
    }
  }

  function advanceNpcs() {
    npcActors.forEach((actor) => {
      if (!actor.patrol?.length) return;
      actor.patrolIndex = (actor.patrolIndex + 1) % actor.patrol.length;
      const next = actor.patrol[actor.patrolIndex];
      actor.x = next.x;
      actor.z = next.z;
      syncNpcHolder(actor);
    });
  }

  function npcAt(x, z) {
    return npcActors.find((actor) => actor.x === x && actor.z === z);
  }

  function failNpcCollision() {
    state.hitNpc = true;
    state.hitHazard = true;
    updateHud('撞到行人');
    playSound('warning');
    ctx.toast?.('🚶 撞到行人！任務失敗', 'error');
    showResult(false);
  }

  function checkNpcCollisionAt(x, z) {
    if (npcAt(x, z)) {
      failNpcCollision();
      return true;
    }
    return false;
  }

  function createSchoolBuilding(parent) {
    const wall = createMat('schoolWall', [0.74, 0.78, 0.86]);
    const roof = createMat('schoolRoof', [0.18, 0.27, 0.42]);
    const glass = createMat('schoolGlass', [0.16, 0.55, 0.85], 0.3);
    const body = parentMesh(BABYLON.MeshBuilder.CreateBox('schoolBody', { width: 2.8, height: 1.4, depth: 1.4 }, ctx.scene), parent, wall);
    body.position.y = 0.7;
    const roofMesh = parentMesh(BABYLON.MeshBuilder.CreateBox('schoolRoof', { width: 3.0, height: 0.25, depth: 1.6 }, ctx.scene), parent, roof);
    roofMesh.position.y = 1.55;
    for (let i = -1; i <= 1; i++) {
      const win = parentMesh(BABYLON.MeshBuilder.CreateBox(`schoolWindow${i}`, { width: 0.35, height: 0.35, depth: 0.04 }, ctx.scene), parent, glass);
      win.position = new BABYLON.Vector3(i * 0.65, 0.85, -0.72);
    }
  }

  function createTrackField(parent) {
    const fieldMat = createMat('fieldGrass', [0.12, 0.52, 0.18]);
    const trackMat = createMat('trackMat', [0.7, 0.22, 0.12]);
    const field = parentMesh(BABYLON.MeshBuilder.CreateBox('fieldCenter', { width: 2.4, height: 0.04, depth: 1.2 }, ctx.scene), parent, fieldMat);
    field.position.y = 0.04;
    const ring = parentMesh(BABYLON.MeshBuilder.CreateTorus('trackRing', { diameter: 2.3, thickness: 0.12, tessellation: 36 }, ctx.scene), parent, trackMat);
    ring.position.y = 0.08;
    ring.scaling.z = 0.62;
  }

  function createTreeAsset(parent) {
    const trunkMat = createMat('treeTrunk', [0.38, 0.22, 0.1]);
    const leafMat = createMat('treeLeaf', [0.1, 0.55, 0.2], 0.08);
    const trunk = parentMesh(BABYLON.MeshBuilder.CreateCylinder('treeTrunk', { height: 1.0, diameterTop: 0.12, diameterBottom: 0.22 }, ctx.scene), parent, trunkMat);
    trunk.position.y = 0.5;
    [1.05, 1.35, 1.62].forEach((y, index) => {
      const crown = parentMesh(BABYLON.MeshBuilder.CreateSphere(`treeCrown${index}`, { diameter: 1.0 - index * 0.22, segments: 10 }, ctx.scene), parent, leafMat);
      crown.position.y = y;
    });
  }

  function createStreetLight(parent) {
    const poleMat = createMat('lightPole', [0.18, 0.2, 0.24]);
    const lampMat = createMat('lampGlow', [1, 0.82, 0.28], 0.8);
    const pole = parentMesh(BABYLON.MeshBuilder.CreateCylinder('lightPole', { height: 1.8, diameter: 0.08 }, ctx.scene), parent, poleMat);
    pole.position.y = 0.9;
    const lamp = parentMesh(BABYLON.MeshBuilder.CreateSphere('lamp', { diameter: 0.28, segments: 10 }, ctx.scene), parent, lampMat);
    lamp.position.y = 1.85;
  }

  function createRubble(parent) {
    const mat = createMat('rubbleMat', [0.42, 0.36, 0.32]);
    for (let i = 0; i < 7; i++) {
      const rock = parentMesh(BABYLON.MeshBuilder.CreatePolyhedron(`rubble${i}`, { type: 0, size: 0.55 + i * 0.06 }, ctx.scene), parent, mat);
      rock.position = new BABYLON.Vector3((i % 3 - 1) * 0.45, 0.45 + i * 0.08, (Math.floor(i / 3) - 0.8) * 0.45);
      rock.scaling.y = 1.25;
      rock.rotation = new BABYLON.Vector3(i * 0.3, i * 0.5, i * 0.2);
    }
  }

  function createRescueTent(parent) {
    const tentMat = createMat('tentMat', [0.95, 0.28, 0.22]);
    const base = parentMesh(BABYLON.MeshBuilder.CreateBox('tentBase', { width: 1.6, height: 0.75, depth: 1.2 }, ctx.scene), parent, tentMat);
    base.position.y = 0.38;
    const roof = parentMesh(BABYLON.MeshBuilder.CreateCylinder('tentRoof', { height: 1.65, diameterTop: 0, diameterBottom: 1.25, tessellation: 4 }, ctx.scene), parent, tentMat);
    roof.position.y = 0.9;
    roof.rotation.z = Math.PI / 4;
  }

  function createSignalBeacon(parent, label) {
    const ringMat = createMat('scanRingMat', [1, 0.75, 0.1], 0.55);
    const ring = parentMesh(BABYLON.MeshBuilder.CreateTorus('scanRing', { diameter: 1.0, thickness: 0.06 }, ctx.scene), parent, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.07;
    const beam = parentMesh(BABYLON.MeshBuilder.CreateCylinder('scanBeam', { height: 1.5, diameterTop: 0.25, diameterBottom: 0.55 }, ctx.scene), parent, createMat('scanBeamMat', [1, 0.8, 0.2], 0.55, 0.38));
    beam.position.y = 0.75;
    const marker = parentMesh(BABYLON.MeshBuilder.CreateSphere('scanMarker', { diameter: 0.22, segments: 10 }, ctx.scene), parent, ringMat);
    marker.position.y = 1.58;
    parent.metadata = { markerType: 'scan', label, meshes: [ring, beam, marker] };
  }

  function createCropField(parent) {
    const soil = parentMesh(BABYLON.MeshBuilder.CreateBox('cropSoil', { width: 1.8, height: 0.05, depth: 1.2 }, ctx.scene), parent, createMat('soilMat', [0.34, 0.22, 0.12]));
    soil.position.y = 0.03;
    const cropMat = createMat('cropMat', [0.2, 0.7, 0.25], 0.1);
    for (let i = 0; i < 10; i++) {
      const crop = parentMesh(BABYLON.MeshBuilder.CreateCylinder(`crop${i}`, { height: 0.45, diameterTop: 0.03, diameterBottom: 0.08 }, ctx.scene), parent, cropMat);
      crop.position = new BABYLON.Vector3(-0.75 + (i % 5) * 0.35, 0.25, -0.35 + Math.floor(i / 5) * 0.7);
    }
  }

  function createCanal(parent) {
    const water = parentMesh(BABYLON.MeshBuilder.CreateBox('canalWater', { width: 2.0, height: 0.04, depth: 0.45 }, ctx.scene), parent, createMat('waterMat', [0.08, 0.45, 0.85], 0.25));
    water.position.y = 0.04;
  }

  function createWindTurbine(parent) {
    const poleMat = createMat('windPole', [0.85, 0.86, 0.9]);
    const pole = parentMesh(BABYLON.MeshBuilder.CreateCylinder('windPole', { height: 1.6, diameter: 0.08 }, ctx.scene), parent, poleMat);
    pole.position.y = 0.8;
    const hub = parentMesh(BABYLON.MeshBuilder.CreateSphere('windHub', { diameter: 0.18, segments: 10 }, ctx.scene), parent, poleMat);
    hub.position.y = 1.65;
    for (let i = 0; i < 3; i++) {
      const blade = parentMesh(BABYLON.MeshBuilder.CreateBox(`windBlade${i}`, { width: 0.08, height: 0.55, depth: 0.03 }, ctx.scene), parent, poleMat);
      blade.position.y = 1.65;
      blade.rotation.z = (Math.PI * 2 / 3) * i;
      blade.position.x = Math.sin(blade.rotation.z) * 0.22;
      blade.position.z = Math.cos(blade.rotation.z) * 0.22;
    }
  }

  function createBreezeMarker(parent, item) {
    const mat = createMat('breezeMat', [0.35, 0.82, 0.95], 0.35, 0.45);
    const ring = parentMesh(BABYLON.MeshBuilder.CreateTorus('breezeRing', { diameter: 1.05, thickness: 0.05 }, ctx.scene), parent, mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    const arrow = parentMesh(BABYLON.MeshBuilder.CreateBox('breezeArrow', { width: 0.55, height: 0.04, depth: 0.12 }, ctx.scene), parent, mat);
    arrow.position.y = 0.18;
    const wind = item?.windDir || currentChapter()?.windDirection || { dx: 1, dz: 0 };
    if (wind.dx < 0) arrow.rotation.y = Math.PI;
    else if (wind.dz > 0) arrow.rotation.y = Math.PI / 2;
    else if (wind.dz < 0) arrow.rotation.y = -Math.PI / 2;
  }

  function createLighthouse(parent) {
    const baseMat = createMat('lighthouseBase', [0.92, 0.92, 0.94]);
    const stripeMat = createMat('lighthouseStripe', [0.88, 0.22, 0.18], 0.2);
    const tower = parentMesh(BABYLON.MeshBuilder.CreateCylinder('lighthouseTower', { height: 2.2, diameter: 0.75 }, ctx.scene), parent, baseMat);
    tower.position.y = 1.1;
    const stripe = parentMesh(BABYLON.MeshBuilder.CreateCylinder('lighthouseStripeMesh', { height: 0.35, diameter: 0.8 }, ctx.scene), parent, stripeMat);
    stripe.position.y = 1.45;
    const lamp = parentMesh(BABYLON.MeshBuilder.CreateSphere('lighthouseLamp', { diameter: 0.35, segments: 10 }, ctx.scene), parent, createMat('lighthouseLamp', [1, 0.9, 0.45], 0.7));
    lamp.position.y = 2.35;
    const roof = parentMesh(BABYLON.MeshBuilder.CreateCylinder('lighthouseRoof', { height: 0.35, diameterTop: 0, diameterBottom: 0.55, tessellation: 4 }, ctx.scene), parent, createMat('lighthouseRoof', [0.82, 0.2, 0.16]));
    roof.position.y = 2.55;
    roof.rotation.y = Math.PI / 4;
  }

  function createWaveHazard(parent) {
    const mat = createMat('waveHazardMat', [0.12, 0.48, 0.88], 0.25, 0.55);
    for (let i = 0; i < 5; i++) {
      const wave = parentMesh(BABYLON.MeshBuilder.CreateBox(`wave${i}`, { width: 0.55 + i * 0.08, height: 0.25 + i * 0.06, depth: 0.45 }, ctx.scene), parent, mat);
      wave.position = new BABYLON.Vector3((i % 2 - 0.5) * 0.35, 0.18 + i * 0.05, (Math.floor(i / 2) - 0.5) * 0.35);
    }
  }

  function createLavaHazard(parent) {
    const mat = createMat('lavaHazardMat', [0.95, 0.35, 0.08], 0.55, 0.72);
    const pool = parentMesh(BABYLON.MeshBuilder.CreateCylinder('lavaPool', { height: 0.12, diameter: 1.15, tessellation: 12 }, ctx.scene), parent, mat);
    pool.position.y = 0.08;
    for (let i = 0; i < 4; i++) {
      const blob = parentMesh(BABYLON.MeshBuilder.CreateSphere(`lavaBlob${i}`, { diameter: 0.28 + i * 0.06, segments: 8 }, ctx.scene), parent, mat);
      blob.position = new BABYLON.Vector3((i % 2 - 0.5) * 0.35, 0.2, (Math.floor(i / 2) - 0.5) * 0.3);
    }
  }

  function createHeatZone(parent) {
    const mat = createMat('heatZoneMat', [1, 0.55, 0.15], 0.45, 0.38);
    const ring = parentMesh(BABYLON.MeshBuilder.CreateTorus('heatRing', { diameter: 1.0, thickness: 0.05 }, ctx.scene), parent, mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    const shimmer = parentMesh(BABYLON.MeshBuilder.CreateBox('heatShimmer', { width: 0.7, height: 0.5, depth: 0.04 }, ctx.scene), parent, mat);
    shimmer.position.y = 0.35;
  }

  function createVolcanoCone(parent) {
    const rockMat = createMat('volcanoRock', [0.32, 0.24, 0.2]);
    const cone = parentMesh(BABYLON.MeshBuilder.CreateCylinder('volcanoCone', { height: 2.4, diameterTop: 0.2, diameterBottom: 1.8, tessellation: 10 }, ctx.scene), parent, rockMat);
    cone.position.y = 1.2;
    const crater = parentMesh(BABYLON.MeshBuilder.CreateCylinder('volcanoCrater', { height: 0.2, diameter: 0.55 }, ctx.scene), parent, createMat('volcanoCrater', [0.9, 0.32, 0.1], 0.5));
    crater.position.y = 2.45;
  }

  function createLabBench(parent) {
    const benchMat = createMat('labBenchMat', [0.78, 0.82, 0.88]);
    const top = parentMesh(BABYLON.MeshBuilder.CreateBox('labBenchTop', { width: 1.8, height: 0.08, depth: 0.8 }, ctx.scene), parent, benchMat);
    top.position.y = 0.75;
    const leg = parentMesh(BABYLON.MeshBuilder.CreateBox('labBenchLeg', { width: 1.6, height: 0.7, depth: 0.12 }, ctx.scene), parent, createMat('labBenchLeg', [0.28, 0.32, 0.4]));
    leg.position.y = 0.35;
    const screen = parentMesh(BABYLON.MeshBuilder.CreateBox('labScreen', { width: 0.55, height: 0.35, depth: 0.04 }, ctx.scene), parent, createMat('labScreen', [0.2, 0.75, 0.95], 0.45));
    screen.position = new BABYLON.Vector3(0.45, 0.95, 0);
  }

  function createSpecimenJar(parent) {
    const jarMat = createMat('specimenJar', [0.45, 0.85, 0.95], 0.2, 0.65);
    const jar = parentMesh(BABYLON.MeshBuilder.CreateCylinder('specimenJar', { height: 0.65, diameter: 0.42 }, ctx.scene), parent, jarMat);
    jar.position.y = 0.35;
    const cap = parentMesh(BABYLON.MeshBuilder.CreateCylinder('specimenCap', { height: 0.1, diameter: 0.46 }, ctx.scene), parent, createMat('specimenCap', [0.75, 0.78, 0.82]));
    cap.position.y = 0.72;
  }

  function createSamplePoint(parent, label) {
    const ringMat = createMat('sampleRingMat', [0.55, 0.95, 0.45], 0.5);
    const ring = parentMesh(BABYLON.MeshBuilder.CreateTorus('sampleRing', { diameter: 1.0, thickness: 0.06 }, ctx.scene), parent, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.07;
    const vial = parentMesh(BABYLON.MeshBuilder.CreateCylinder('sampleVial', { height: 0.45, diameter: 0.18 }, ctx.scene), parent, createMat('sampleVial', [0.35, 0.9, 0.55], 0.35));
    vial.position.y = 0.35;
    parent.metadata = { markerType: 'sample', label, meshes: [ring, vial] };
  }

  function createReportTerminal(parent, label) {
    const baseMat = createMat('reportBase', [0.22, 0.28, 0.36]);
    const base = parentMesh(BABYLON.MeshBuilder.CreateBox('reportBase', { width: 0.9, height: 0.55, depth: 0.45 }, ctx.scene), parent, baseMat);
    base.position.y = 0.28;
    const screen = parentMesh(BABYLON.MeshBuilder.CreateBox('reportScreen', { width: 0.55, height: 0.35, depth: 0.04 }, ctx.scene), parent, createMat('reportScreen', [0.25, 0.82, 1], 0.55));
    screen.position = new BABYLON.Vector3(0, 0.55, -0.24);
    parent.metadata = { markerType: 'report', label, meshes: [base, screen] };
  }

  function createLabHazard(parent) {
    const mat = createMat('labHazardMat', [0.2, 0.82, 0.45], 0.35, 0.55);
    const pool = parentMesh(BABYLON.MeshBuilder.CreateBox('labHazardPool', { width: 0.95, height: 0.08, depth: 0.85 }, ctx.scene), parent, mat);
    pool.position.y = 0.06;
    for (let i = 0; i < 3; i++) {
      const bubble = parentMesh(BABYLON.MeshBuilder.CreateSphere(`labBubble${i}`, { diameter: 0.18, segments: 8 }, ctx.scene), parent, mat);
      bubble.position = new BABYLON.Vector3((i - 1) * 0.28, 0.18, (i % 2) * 0.2 - 0.1);
    }
  }

  function createWarehouseShelf(parent) {
    const frameMat = createMat('shelfFrame', [0.22, 0.28, 0.34], 0.18);
    const boxMat = createMat('shelfBox', [0.66, 0.42, 0.18], 0.22);
    const frame = parentMesh(BABYLON.MeshBuilder.CreateBox('shelfFrame', { width: 1.5, height: 2.4, depth: 0.45 }, ctx.scene), parent, frameMat);
    frame.position.y = 1.2;
    for (let i = 0; i < 3; i++) {
      const box = parentMesh(BABYLON.MeshBuilder.CreateBox(`shelfPackage${i}`, { width: 0.35, height: 0.28, depth: 0.38 }, ctx.scene), parent, boxMat);
      box.position = new BABYLON.Vector3(-0.45 + i * 0.45, 0.55 + i * 0.55, -0.28);
    }
  }

  function createSafetyGate(parent) {
    const frameMat = createMat('gateFrame', [0.18, 0.26, 0.34]);
    const lightMat = createMat('gateLight', [0.1, 0.8, 1], 0.65);
    const left = parentMesh(BABYLON.MeshBuilder.CreateBox('gateLeft', { width: 0.12, height: 1.4, depth: 0.12 }, ctx.scene), parent, frameMat);
    left.position = new BABYLON.Vector3(-0.55, 0.7, 0);
    const right = parentMesh(BABYLON.MeshBuilder.CreateBox('gateRight', { width: 0.12, height: 1.4, depth: 0.12 }, ctx.scene), parent, frameMat);
    right.position = new BABYLON.Vector3(0.55, 0.7, 0);
    const top = parentMesh(BABYLON.MeshBuilder.CreateBox('gateTop', { width: 1.25, height: 0.12, depth: 0.12 }, ctx.scene), parent, frameMat);
    top.position.y = 1.35;
    const beam = parentMesh(BABYLON.MeshBuilder.CreateBox('gateBeam', { width: 1.05, height: 0.035, depth: 0.035 }, ctx.scene), parent, lightMat);
    beam.position.y = 0.78;
  }

  function createPackage(parent) {
    const box = parentMesh(BABYLON.MeshBuilder.CreateBox('packageBox', { width: 0.75, height: 0.55, depth: 0.75 }, ctx.scene), parent, createMat('packageMat', [0.78, 0.48, 0.2]));
    box.position.y = 0.28;
    const band = parentMesh(BABYLON.MeshBuilder.CreateBox('packageBand', { width: 0.8, height: 0.58, depth: 0.08 }, ctx.scene), parent, createMat('packageBandMat', [0.35, 0.2, 0.08]));
    band.position.y = 0.3;
  }

  function createDeliveryPad(parent) {
    const pad = parentMesh(BABYLON.MeshBuilder.CreateCylinder('deliveryPad', { height: 0.08, diameter: 1.2, tessellation: 32 }, ctx.scene), parent, createMat('deliveryPadMat', [0.25, 0.85, 0.35], 0.25));
    pad.position.y = 0.04;
    const flag = parentMesh(BABYLON.MeshBuilder.CreateBox('deliveryFlag', { width: 0.12, height: 0.8, depth: 0.06 }, ctx.scene), parent, createMat('deliveryFlagMat', [0.95, 0.95, 0.2], 0.2));
    flag.position = new BABYLON.Vector3(0.45, 0.45, 0);
  }

  function createChargingStation(parent) {
    const pad = parentMesh(BABYLON.MeshBuilder.CreateCylinder('chargePad', { height: 0.08, diameter: 1.2, tessellation: 32 }, ctx.scene), parent, createMat('chargePadMat', [0.1, 0.9, 0.45], 0.4));
    pad.position.y = 0.04;
    const bolt = parentMesh(BABYLON.MeshBuilder.CreateBox('chargeBolt', { width: 0.35, height: 0.75, depth: 0.08 }, ctx.scene), parent, pad.material);
    bolt.position.y = 0.55;
    bolt.rotation.z = 0.35;
  }

  function createMoonBase(parent) {
    const domeMat = createMat('moonBaseMat', [0.62, 0.68, 0.78]);
    const dome = parentMesh(BABYLON.MeshBuilder.CreateSphere('moonBaseDome', { diameter: 1.6, slice: 0.55, segments: 16 }, ctx.scene), parent, domeMat);
    dome.position.y = 0.55;
    const door = parentMesh(BABYLON.MeshBuilder.CreateBox('moonBaseDoor', { width: 0.35, height: 0.5, depth: 0.05 }, ctx.scene), parent, createMat('moonDoorMat', [0.08, 0.16, 0.28], 0.2));
    door.position = new BABYLON.Vector3(0, 0.32, -0.78);
  }

  function createAsteroid(parent) {
    const mat = createMat('asteroidMat', [0.45, 0.43, 0.45]);
    const rock = parentMesh(BABYLON.MeshBuilder.CreatePolyhedron('asteroid', { type: 0, size: 1.2 }, ctx.scene), parent, mat);
    rock.position.y = 0.75;
    rock.scaling.y = 0.85;
    rock.rotation = new BABYLON.Vector3(0.4, 0.2, 0.5);
  }

  function createEnergyCrystal(parent) {
    const crystal = parentMesh(BABYLON.MeshBuilder.CreatePolyhedron('energyCrystal', { type: 1, size: 0.65 }, ctx.scene), parent, createMat('crystalMat', [0.25, 0.9, 1], 0.65));
    crystal.position.y = 0.7;
    const ring = parentMesh(BABYLON.MeshBuilder.CreateTorus('crystalRing', { diameter: 1.05, thickness: 0.035 }, ctx.scene), parent, crystal.material);
    ring.position.y = 0.1;
    ring.rotation.x = Math.PI / 2;
    parent.metadata = { markerType: 'collect', meshes: [crystal, ring] };
  }

  function createGenericAsset(parent, type) {
    const mesh = parentMesh(BABYLON.MeshBuilder.CreateBox(`generic-${type}`, { width: 0.9, height: 0.7, depth: 0.9 }, ctx.scene), parent, createMat(`genericMat-${type}`, [0.45, 0.65, 0.9]));
    mesh.position.y = 0.35;
  }

  function colorForType(type) {
    const map = {
      scan: [1, 0.75, 0.1],
      hazard: [1, 0.1, 0.15],
      collect: [0.35, 0.9, 1],
      charger: [0.1, 0.9, 0.45],
      pickup: [0.9, 0.55, 0.15],
      dropoff: [0.35, 0.9, 0.35],
      crop: [0.28, 0.72, 0.24],
      field: [0.2, 0.55, 0.25],
      base: [0.55, 0.65, 0.85],
    };
    const c = map[type] || [0.45, 0.65, 0.9];
    return new BABYLON.Color3(c[0], c[1], c[2]);
  }

  function createObjectLabel(item, parent) {
    const marker = BABYLON.MeshBuilder.CreateBox(`label-${item.label}`, { width: 0.12, height: 0.12, depth: 0.12 }, ctx.scene);
    marker.position.y = 1.55;
    marker.parent = parent;
    marker.isVisible = false;
  }

  function getObjectiveItems() {
    const mission = currentMission();
    if (!mission || !MissionFeedback) return [];
    return MissionFeedback.buildObjectives(state, mission, feedbackHelpers());
  }

  function renderGuideDock() {
    const dock = document.getElementById('missionGuideDock');
    const mission = currentMission();
    const chapter = currentChapter();
    if (!dock || !mission) return;
    dock.classList.add('show', guideExpanded ? 'expanded' : 'collapsed');
    dock.classList.remove(guideExpanded ? 'collapsed' : 'expanded');

    const concept = MissionProgress.CONCEPT_LABELS[mission.concept] || mission.concept || '編程任務';
    const items = getObjectiveItems();
    const chips = MissionFeedback.renderObjectiveChips(items);
    const doneCount = items.filter((item) => item.done).length;
    const hint = MissionTutorial?.getHintMeta?.(mission) || { text: mission.goal || '', index: 1, total: 1 };
    const wsHint = tutorialCheckHint;

    if (!guideExpanded) {
      dock.innerHTML = `
        <div class="mission-guide-collapsed">
          <button type="button" class="mission-guide-toggle" onclick="MissionMode.toggleGuide(true)" title="展開任務資訊">
            <span class="mission-guide-toggle-icon">${chapter?.icon || '📘'}</span>
            <span class="mission-guide-toggle-text">
              <strong>${mission.title}</strong>
              <em>💡 ${hint.text}</em>
            </span>
            <span class="mission-guide-toggle-meta">${doneCount}/${items.length || 0} 目標 · 提示 ${hint.index}/${hint.total}</span>
            <span class="mission-guide-chevron">▲</span>
          </button>
          <div class="mission-guide-collapsed-actions">
            <button type="button" class="ghost" onclick="MissionMode.openTutorial()">教學</button>
            <button type="button" class="primary" onclick="MissionMode.runWorkspace()">▶ 執行</button>
          </div>
        </div>
      `;
    } else {
      dock.innerHTML = `
        <div class="mission-guide-expanded">
          <div class="mission-guide-head">
            <div>
              <strong>${chapter?.icon || '📘'} ${mission.title}</strong>
              <span>${mission.goal || mission.brief || ''}</span>
              <em>${concept}</em>
            </div>
            <button type="button" class="ghost" onclick="MissionMode.toggleGuide(false)">收合 ▼</button>
          </div>
          <div class="mission-objective-chips">${chips || '<span class="mission-objective-chip">完成任務目標</span>'}</div>
          ${wsHint ? `<p class="mission-guide-ws-hint">🧩 ${wsHint}</p>` : ''}
          <div class="mission-guide-hint-row">
            <span class="mission-guide-hint-index">提示 ${hint.index}/${hint.total}</span>
            <p>${hint.text}</p>
            <button type="button" onclick="MissionTutorial.next()">下一提示</button>
          </div>
          <div class="mission-guide-actions">
            <button type="button" class="ghost" onclick="MissionMode.openTutorial()">完整教學卡</button>
            <button type="button" class="primary" onclick="MissionMode.runWorkspace()">開始執行任務</button>
          </div>
        </div>
      `;
    }
    syncNavHeight();
  }

  function refreshGuideHint() {
    renderGuideDock();
  }

  function toggleGuide(forceExpanded) {
    guideExpanded = typeof forceExpanded === 'boolean' ? forceExpanded : !guideExpanded;
    renderGuideDock();
  }

  function syncNavHeight() {
    const nav = document.getElementById('missionBottomNav');
    const height = nav?.offsetHeight || 150;
    document.documentElement.style.setProperty('--mission-nav-height', `${height}px`);
    document.body.classList.toggle('mission-guide-expanded', guideExpanded);
    document.body.classList.toggle('mission-map-collapsed', !mapExpanded);
  }

  function updateBrief() {
    renderGuideDock();
  }

  function getDefaultTutorial() {
    const theme = currentChapter()?.theme;
    if (theme === 'warehouse') return '提示：這類任務通常要先取貨，再移動到平台放貨；電量不足時先找充電站。';
    if (theme === 'rescue') return '提示：使用「如果」配合「前方有危險?」可以避開瓦礫。';
    if (theme === 'farm') return '提示：先規劃掃描順序，再避開風場完成巡檢。';
    if (theme === 'space') return '提示：用「重複直到任務完成」可以製作自動探索流程。';
    if (theme === 'coast') return '提示：順風格省電、逆風格費電，注意電量。';
    if (theme === 'volcano') return '提示：用「前方高溫?」避開熱區，到採樣點執行「採集樣本」。';
    if (theme === 'lab') return '提示：先取標本、送到平台放貨，再到終端「回報數據」。';
    return '提示：像 Scratch 專案一樣，先想清楚角色要做的動作，再把積木按順序拼好。';
  }

  function objectiveHtml() {
    const mission = currentMission();
    if (!mission || !MissionFeedback) return '';
    const items = MissionFeedback.buildObjectives(state, mission, feedbackHelpers());
    return MissionFeedback.renderObjectivesHtml(items);
  }

  function updateHud(label = '', { refreshBrief = false } = {}) {
    const mission = currentMission();
    const hud = document.getElementById('missionHud');
    if (hud) hud.classList.add('show');
    setText('mhScans', `${state.scans.size}/${countObjects('scan')}`);
    setText('mhItems', `${state.collected.size}/${countObjects('collect')}`);
    setText('mhBattery', `${Math.max(0, Math.round(state.battery))}%`);
    setText('mhCargo', state.delivered ? '已送達' : state.cargo ? '持有' : '無');
    setText('mhWeather', currentWeatherLabel || '--');
    setText('mhState', `${label}${state.moves ? ` · ${state.moves}步` : ''}`);
    if (refreshBrief) renderGuideDock();
    else {
      const chips = document.querySelector('#missionGuideDock .mission-objective-chips');
      if (chips) chips.innerHTML = MissionFeedback.renderObjectiveChips(getObjectiveItems());
      const meta = document.querySelector('.mission-guide-toggle-meta');
      if (meta) {
        const items = getObjectiveItems();
        meta.textContent = `${items.filter((i) => i.done).length}/${items.length || 0} 目標`;
      }
    }
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function countObjects(type) {
    const mission = currentMission();
    if (!mission) return 0;
    const chapter = currentChapter();
    const missionCount = (mission.objects || []).filter((item) => item.type === type).length;
    if (missionCount > 0) return missionCount;
    return (chapter?.objects || []).filter((item) => item.type === type).length;
  }

  function toWorld(x, z, y = 0) {
    return new BABYLON.Vector3(x * STEP, y, z * STEP);
  }

  function dirToRad(dir) {
    return dir * Math.PI / 180;
  }

  function forwardVector() {
    const rad = dirToRad(state.dir);
    return { dx: Math.round(Math.cos(rad)), dz: Math.round(-Math.sin(rad)) };
  }

  function objectAt(x, z, types = null) {
    return (currentMission()?.objects || []).find((item) =>
      item.x === x && item.z === z && (!types || types.includes(item.type))
    );
  }

  function dangerAt(x, z) {
    const cell = terrainAt(x, z);
    if (cell?.type === 'lava') return true;
    return Boolean(objectAt(x, z, ['hazard']));
  }

  function dangerAhead() {
    const vector = forwardVector();
    return dangerAt(state.x + vector.dx, state.z + vector.dz);
  }

  function heatAhead() {
    const vector = forwardVector();
    const cell = terrainAt(state.x + vector.dx, state.z + vector.dz);
    return cell?.type === 'heat' || cell?.type === 'lava';
  }

  function isAtMissionTarget() {
    const mission = currentMission();
    const target = mission.success.returnToBase ? mission.start : mission.target;
    return state.x === target.x && state.z === target.z;
  }

  window.MissionMode = {
    enter,
    exit,
    selectChapter,
    selectMission,
    runWorkspace: () => runWorkspace(),
    reset: () => resetMission(),
    loadStarter: () => loadStarterProgram(),
    stop: () => { stopRequested = true; },
    dangerAhead: () => dangerAhead(),
    atTaskPoint: () => Boolean(objectAt(state.x, state.z, ['scan', 'pickup', 'dropoff', 'charger', 'collect'])),
    batteryLow: () => state.battery < 30,
    hasCargo: () => state.cargo,
    isDone: () => checkSuccess(),
    nextDialogue: () => nextDialogue(),
    getCurrentMission: () => currentMission(),
    getCurrentChapter: () => currentChapter(),
    getProgress: () => progress,
    getChapters: () => chapters,
    nextMission: () => nextMission(),
    replayRoute: (animated = false) => replayRoute(animated),
    showProfile: () => showProfile(),
    hideProfile: () => hideProfile(),
    openTutorial: () => {
      hideProfile();
      document.body.classList.add('mission-tutorial-open');
      document.body.classList.remove('mission-profile-open');
      MissionTutorial?.hide?.();
      MissionTutorial?.showForMission?.(currentMission(), currentChapter(), { showCard: true });
    },
    toggleGuide: (expanded) => toggleGuide(expanded),
    toggleMap: (expanded) => toggleMap(expanded),
    toggleLevelBar: (expanded) => toggleMap(expanded),
    renderGuideDock: () => renderGuideDock(),
    refreshGuideHint: () => refreshGuideHint(),
    shareSolution: () => shareSolution(),
  };

  function bindWorkspaceTutorialChecks() {
    if (!ctx?.workspace || workspaceCheckBound) return;
    workspaceCheckBound = true;
    ctx.workspace.addChangeListener(() => refreshTutorialCheckHint());
  }

  function refreshTutorialCheckHint() {
    const mission = currentMission();
    const missing = MissionTutorial?.checkWorkspaceStep?.(mission, ctx?.workspace);
    tutorialCheckHint = missing?.hint || (missing?.block ? `還需要「${missing.block}」積木` : '');
    renderGuideDock();
  }

  function getProgressScore() {
    const mission = currentMission();
    const success = mission?.success || {};
    let score = state.scans.size + state.collected.size + state.samples.size + state.reports.size + state.photos;
    if (state.delivered) score += 2;
    if (state.cargo) score += 1;
    if (success.landed && state.landed) score += 1;
    if (isAtMissionTarget()) score += 1;
    return score;
  }

  function countRemainingTargets(type) {
    const mission = currentMission();
    if (!mission) return 0;
    if (type === 'scan') {
      return (mission.objects || []).filter((item) => item.type === 'scan' && !state.scans.has(item.label)).length;
    }
    if (type === 'collect') {
      const need = mission.success?.collected || countObjects('collect');
      return Math.max(0, need - state.collected.size);
    }
    if (type === 'sample') {
      const need = mission.success?.samples || countObjects('sample');
      return Math.max(0, need - state.samples.size);
    }
    if (type === 'report') {
      const need = mission.success?.reports || countObjects('report');
      return Math.max(0, need - state.reports.size);
    }
    return 0;
  }

  function markObjectiveComplete(label) {
    const entry = objectMarkers[label];
    if (!entry || entry.completed) return;
    entry.completed = true;
    const meshes = entry.holder?.metadata?.meshes || entry.holder?.getChildMeshes?.() || [];
    meshes.forEach((mesh, index) => {
      if (mesh.metadata?.isLabelPlane) {
        mesh.isVisible = false;
        return;
      }
      if (mesh.material) mesh.material = createMat(`done-${label}-${index}`, [0.2, 0.9, 0.45], 0.25, mesh.material?.alpha ?? 1);
    });
    if (entry.holder) entry.holder.position.y -= 0.05;
  }

  function notifyObjectiveMilestone(type, label) {
    const remaining = countRemainingTargets(type);
    updateHud('', { refreshBrief: true });
    if (remaining === 1) {
      playSound('scan');
      ctx.toast?.('🎯 只剩最後一個目標！加油！', 'success');
    } else if (remaining === 0) {
      playSound('missionSuccess');
      ctx.toast?.(`✅ 全部${type === 'collect' ? '收集' : type === 'sample' ? '採樣' : type === 'report' ? '回報' : '掃描'}完成！`, 'success');
    }
    markObjectiveComplete(label);
  }

  function allSceneObjects() {
    const chapter = currentChapter();
    const mission = currentMission();
    return [...(chapter?.objects || []), ...(mission?.objects || [])];
  }

  function terrainAt(x, z) {
    return allSceneObjects().find((item) => item.x === x && item.z === z && item.type !== 'npc');
  }

  function isWindZone(x, z) {
    const cell = terrainAt(x, z);
    return cell?.type === 'windTurbine';
  }

  function isBreezeZone(x, z) {
    const cell = terrainAt(x, z);
    return cell?.type === 'breeze';
  }

  function getWindDirection(cell) {
    if (cell?.windDir) return cell.windDir;
    return currentChapter()?.windDirection || { dx: 1, dz: 0 };
  }

  function applyBreezeMoveCost(x, z, moveDx, moveDz) {
    if (!isBreezeZone(x, z) || (!moveDx && !moveDz)) return;
    const cell = terrainAt(x, z);
    const wind = getWindDirection(cell);
    const dot = moveDx * wind.dx + moveDz * wind.dz;
    if (dot > 0) {
      state.battery = Math.min(100, state.battery + 2);
      ctx.toast?.('🌬️ 順風飛行，省電！', 'success');
      playSound('scan');
    } else if (dot < 0) {
      state.battery = Math.max(0, state.battery - 4);
      ctx.toast?.('💨 逆風了，好費電！', 'warn');
      playSound('warning');
    }
  }

  function applyTerrainMoveCost(x, z) {
    const cell = terrainAt(x, z);
    let extra = 0;
    let message = '';
    if (isWindZone(x, z)) {
      extra = 6;
      message = '💨 強風區，額外耗電！';
    } else if (cell?.type === 'heat') {
      extra = 5;
      message = '🌋 高溫區，散熱耗電！';
    } else if (cell?.type === 'rubble') {
      extra = 4;
      message = '🌫️ 揚塵區，移動成本提高。';
    }
    if (extra > 0) {
      state.battery = Math.max(0, state.battery - extra);
      ctx.toast?.(message, 'warn');
      playSound('warning');
    }
    return extra;
  }

  async function playChapterCompleteCelebration() {
    const chapter = currentChapter();
    const isGameComplete = currentChapterIndex === chapters.length - 1;
    const total = MissionProgress.getTotalProgress(chapters, progress);
    if (isGameComplete) {
      ctx.toast?.(`🏅 恭喜畢業！你完成了全部 ${total.total} 關任務！`, 'success');
    } else {
      ctx.toast?.(`🎉 ${chapter.title} 章節通關！`, 'success');
    }
    playSound('missionSuccess');
    weatherLights.forEach((light) => { if (light) light.intensity = Math.min(2.2, light.intensity * 2.5); });
    environmentNodes.forEach((node) => {
      if (node?.material?.emissiveColor) node.material.emissiveColor = node.material.emissiveColor.scale(2.2);
    });
    await sleep(2000);
    weatherLights.forEach((light, index) => {
      if (light) light.intensity = index < 2 ? 0.9 : 0.45;
    });
    if (isGameComplete) {
      showDialogue([
        { speaker: '教官', text: '從校園巡邏到火山監測，再到科研實驗室——你完成了全部旅程！' },
        { speaker: 'Dr. 林', text: '數據完美、飛行穩定。正式授予「小小飛行員」徽章！' },
        ...(chapter.endingDialogue || []),
      ]);
      return;
    }
    showDialogue(chapter.endingDialogue || []);
  }

  function showDialogue(lines = []) {
    dialogueQueue = lines;
    dialogueIndex = 0;
    renderDialogue();
  }

  function getAudioContext() {
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        audioContext = null;
      }
    }
    if (audioContext?.state === 'suspended') audioContext.resume();
    return audioContext;
  }

  function playSound(name) {
    const src = assetManifest?.audio?.[name];
    if (src) {
      const audio = new Audio(src);
      audio.volume = 0.45;
      audio.play().catch(() => playGeneratedSound(name));
      return;
    }
    playGeneratedSound(name);
  }

  function playGeneratedSound(name) {
    const context = getAudioContext();
    if (!context) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const presets = {
      missionStart: [440, 0.14, 'triangle'],
      missionSuccess: [880, 0.22, 'sine'],
      missionFail: [180, 0.28, 'sawtooth'],
      scan: [720, 0.12, 'square'],
      pickup: [520, 0.1, 'triangle'],
      dropoff: [620, 0.12, 'triangle'],
      charge: [980, 0.16, 'sine'],
      warning: [150, 0.18, 'sawtooth'],
      photo: [1100, 0.08, 'square'],
    };
    const [freq, duration, type] = presets[name] || [440, 0.1, 'sine'];
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  function renderDialogue() {
    const panel = document.getElementById('missionDialogue');
    if (!panel || !dialogueQueue.length || dialogueIndex >= dialogueQueue.length) {
      hideDialogue();
      return;
    }
    const line = dialogueQueue[dialogueIndex];
    document.getElementById('dialogueAvatar').textContent = speakerIcon(line.speaker);
    document.getElementById('dialogueSpeaker').textContent = line.speaker || '任務';
    document.getElementById('dialogueText').textContent = line.text || '';
    const btn = panel.querySelector('button');
    if (btn) btn.textContent = dialogueIndex === dialogueQueue.length - 1 ? '開始' : '下一句';
    panel.classList.add('show');
    syncNavHeight();
  }

  function nextDialogue() {
    dialogueIndex++;
    renderDialogue();
  }

  function hideDialogue() {
    const panel = document.getElementById('missionDialogue');
    if (panel) panel.classList.remove('show');
    syncNavHeight();
  }

  function speakerIcon(speaker = '') {
    if (speaker.includes('AI') || speaker.includes('系統')) return '🤖';
    if (speaker.includes('指揮官')) return '🧑‍✈️';
    if (speaker.includes('教官')) return '👨‍🏫';
    if (speaker.includes('管理員') || speaker.includes('主管')) return '👨‍💼';
    if (speaker.includes('農場')) return '👨‍🌾';
    if (speaker.includes('技術')) return '👩‍🔧';
    if (speaker.includes('求救')) return '🧑‍🚒';
    return '🧑';
  }

  async function resetMission() {
    stopRequested = true;
    running = false;
    stopRequested = false;
    await buildScene();
    updateBrief();
    updateHud('已重置');
  }

  async function runWorkspace() {
    if (!ctx?.workspace || running) return;
    const missing = MissionTutorial?.checkWorkspaceStep?.(currentMission(), ctx.workspace);
    if (missing) {
      tutorialCheckHint = missing.hint || `還需要「${missing.block}」積木`;
      renderGuideDock();
      ctx.toast?.(`🧩 ${tutorialCheckHint}`, 'warn');
      return;
    }
    const topBlocks = ctx.workspace.getTopBlocks(true);
    const startBlock = topBlocks.find((block) => block.type === 'event_start');
    if (!startBlock) {
      ctx.toast?.('⚠️ 找不到「▶ 當開始執行」', 'warn');
      return;
    }
    stopRequested = false;
    running = true;
    await buildScene();
    route = MissionRoute?.createEmptyRoute?.() || { points: [], actions: [] };
    MissionRoute?.clearRouteVisual?.(ctx.scene);
    MissionRoute?.hide?.();
    recordRoute('start');
    setButtonsBusy(true);
    try {
      await execChain(startBlock);
      lastRoute = route;
      MissionRoute?.renderRoute?.(ctx.scene, root, route, STEP);
      if (checkSuccess()) showResult(true);
      else if (!stopRequested && !state.hitHazard) showResult(false);
    } catch (error) {
      console.error(error);
      ctx.toast?.(`❌ 任務錯誤:${error.message}`, 'error');
    } finally {
      running = false;
      stopRequested = false;
      setButtonsBusy(false);
      ctx.workspace.getAllBlocks().forEach((block) => block.removeSelect && block.removeSelect());
    }
  }

  function setButtonsBusy(isBusy) {
    const run = document.getElementById('btnRun');
    const step = document.getElementById('btnStep');
    const stop = document.getElementById('btnStop');
    if (run) run.disabled = isBusy;
    if (step) step.disabled = isBusy;
    if (stop) stop.disabled = !isBusy;
  }

  async function execChain(block) {
    while (block && !stopRequested && !state.hitHazard) {
      await execBlock(block);
      block = block.getNextBlock();
    }
  }

  async function execBlock(block) {
    if (!block || stopRequested) return;
    if (block.addSelect) block.addSelect();
    block.getSvgRoot?.()?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    try {
      switch (block.type) {
        case 'event_start': break;
        case 'action_takeoff': await takeoff(); break;
        case 'action_land': await land(); break;
        case 'action_wait': await sleep(Number(block.getFieldValue('MS')) || 300); break;
        case 'action_set_speed': speed = Math.max(0.5, Number(block.getFieldValue('SPEED')) || 1); break;
        case 'move_forward': await repeatMove(block, 1, 0); break;
        case 'move_backward': await repeatMove(block, -1, 0); break;
        case 'move_left': await repeatMove(block, 0, -1); break;
        case 'move_right': await repeatMove(block, 0, 1); break;
        case 'turn_left': await turn(-90); break;
        case 'turn_right': await turn(90); break;
        case 'mission_scan': scan(); break;
        case 'mission_pickup': pickup(); break;
        case 'mission_dropoff': dropoff(); break;
        case 'mission_charge': charge(); break;
        case 'mission_photo': photo(); break;
        case 'mission_collect': collect(); break;
        case 'mission_sample': sample(); break;
        case 'mission_report': report(); break;
        case 'control_repeat': {
          const times = Number(block.getFieldValue('TIMES')) || 1;
          for (let i = 0; i < times && !stopRequested; i++) await execChain(block.getInputTargetBlock('DO'));
          break;
        }
        case 'mission_repeat_until_done': {
          const mission = currentMission();
          let safety = 0;
          const maxSteps = mission?.maxRepeatSteps || 120;
          let lastProgress = getProgressScore();
          let stagnant = 0;
          const maxStagnant = mission?.maxStagnantLoops || 24;
          while (!checkSuccess() && safety < maxSteps && !stopRequested && !state.hitHazard) {
            await execChain(block.getInputTargetBlock('DO'));
            safety++;
            const now = getProgressScore();
            if (now <= lastProgress) stagnant++;
            else stagnant = 0;
            lastProgress = now;
            if (stagnant >= maxStagnant) {
              ctx.toast?.('⚠️ 重複步數過多且無進展，請加入掃描或收集積木', 'warn');
              break;
            }
          }
          break;
        }
        case 'control_if': {
          const cond = evalValue(block.getInputTargetBlock('COND'));
          await execChain(block.getInputTargetBlock(cond ? 'DO' : 'ELSE'));
          break;
        }
      }
      updateHud(state.hitHazard ? '任務失敗' : '執行中');
      await sleep(120);
    } finally {
      if (block.removeSelect) block.removeSelect();
    }
  }

  function evalValue(block) {
    if (!block) return false;
    switch (block.type) {
      case 'mission_danger_ahead': return dangerAhead();
      case 'mission_heat_ahead': return heatAhead();
      case 'mission_at_task_point': return Boolean(objectAt(state.x, state.z, ['scan', 'pickup', 'dropoff', 'charger', 'collect', 'sample', 'report']));
      case 'mission_battery_low': return state.battery < 30;
      case 'mission_has_cargo': return state.cargo;
      case 'mission_done': return checkSuccess();
      default: return false;
    }
  }

  async function repeatMove(block, forwardSign, sideSign) {
    const steps = Number(block.getFieldValue('STEPS')) || 1;
    for (let i = 0; i < steps && !stopRequested && !state.hitHazard; i++) {
      await move(forwardSign, sideSign);
    }
  }

  async function takeoff() {
    if (state.flying) return;
    state.flying = true;
    state.landed = false;
    await animate((t) => { drone.position.y = 0.4 + (2.5 - 0.4) * t; }, 450);
    recordRoute('takeoff');
    updateHud('起飛完成');
  }

  async function land() {
    if (!state.flying) return;
    await animate((t) => { drone.position.y = drone.position.y + (0.4 - drone.position.y) * t; }, 450);
    drone.position.y = 0.4;
    state.flying = false;
    state.landed = true;
    recordRoute('land');
    updateHud('已降落');
  }

  async function move(forwardSign, sideSign) {
    if (!state.flying) await takeoff();
    const forward = forwardVector();
    const right = { dx: -forward.dz, dz: forward.dx };
    const nx = state.x + forward.dx * forwardSign + right.dx * sideSign;
    const nz = state.z + forward.dz * forwardSign + right.dz * sideSign;
    if (dangerAt(nx, nz)) {
      state.hitHazard = true;
      updateHud('撞入危險區');
      playSound('warning');
      showResult(false, '無人機進入危險區,任務失敗。');
      return;
    }
    if (checkNpcCollisionAt(nx, nz)) return;
    state.battery = Math.max(0, state.battery - 4);
    const moveDx = nx - state.x;
    const moveDz = nz - state.z;
    applyBreezeMoveCost(nx, nz, moveDx, moveDz);
    applyTerrainMoveCost(nx, nz);
    if (state.battery <= 0) {
      state.hitHazard = true;
      updateHud('電量耗盡');
      playSound('missionFail');
      showResult(false, '電量耗盡,任務失敗。請在倉庫任務中善用充電站。');
      return;
    }
    const from = drone.position.clone();
    const to = toWorld(nx, nz, drone.position.y);
    await animate((t) => BABYLON.Vector3.LerpToRef(from, to, t, drone.position), 350 / speed);
    state.x = nx;
    state.z = nz;
    state.moves++;
    recordRoute('move');
    if (currentMission()?.autoCollect !== false) autoCollect();
    advanceNpcs();
    checkNpcCollisionAt(state.x, state.z);
  }

  async function turn(angle) {
    const start = drone.rotation.y;
    state.dir = ((state.dir + angle) % 360 + 360) % 360;
    const end = dirToRad(state.dir);
    await animate((t) => { drone.rotation.y = start + (end - start) * t; }, 260 / speed);
    recordRoute(angle > 0 ? 'turn-right' : 'turn-left');
    advanceNpcs();
    checkNpcCollisionAt(state.x, state.z);
  }

  function scan() {
    const item = objectAt(state.x, state.z, ['scan']);
    if (!item) {
      ctx.toast?.('📡 這裡沒有可掃描任務點', 'warn');
      return;
    }
    if (state.scans.has(item.label)) {
      ctx.toast?.(`📡 「${item.label}」已掃描過`, 'warn');
      return;
    }
    state.scans.add(item.label);
    recordRoute(`scan:${item.label}`);
    playSound('scan');
    ctx.toast?.(`📡 已掃描:${item.label}`, 'success');
    notifyObjectiveMilestone('scan', item.label);
  }

  function pickup() {
    const item = objectAt(state.x, state.z, ['pickup']);
    if (!item) {
      ctx.toast?.('📦 這裡不是取貨區', 'warn');
      return;
    }
    state.cargo = true;
    recordRoute('pickup');
    playSound('pickup');
    ctx.toast?.('📦 已取貨', 'success');
  }

  function dropoff() {
    const item = objectAt(state.x, state.z, ['dropoff']);
    if (!item || !state.cargo) {
      ctx.toast?.('📮 需要持有貨物並到達送貨平台', 'warn');
      return;
    }
    state.cargo = false;
    state.delivered = true;
    recordRoute('dropoff');
    playSound('dropoff');
    ctx.toast?.('📮 已完成送貨', 'success');
  }

  function charge() {
    const item = objectAt(state.x, state.z, ['charger']);
    if (!item) {
      ctx.toast?.('🔋 這裡沒有充電站', 'warn');
      return;
    }
    state.battery = 100;
    recordRoute('charge');
    playSound('charge');
    ctx.toast?.('🔋 電量已補滿', 'success');
  }

  function photo() {
    const mission = currentMission();
    const photoLabel = mission?.photoAt;
    if (photoLabel) {
      const item = objectAt(state.x, state.z, ['scan', 'beacon']);
      if (!item || item.label !== photoLabel) {
        ctx.toast?.(`📷 請在「${photoLabel}」任務點拍照`, 'warn');
        return;
      }
    } else {
      const atPoint = objectAt(state.x, state.z, ['scan', 'pickup', 'dropoff', 'charger', 'collect', 'beacon']);
      if (!atPoint) {
        ctx.toast?.('📷 請先飛到任務點再拍照', 'warn');
        return;
      }
    }
    state.photos++;
    recordRoute('photo');
    playSound('photo');
    ctx.toast?.('📷 已拍照記錄', 'success');
    updateHud('', { refreshBrief: true });
  }

  function collect() {
    const item = objectAt(state.x, state.z, ['collect']);
    if (!item) {
      ctx.toast?.('💎 這裡沒有可收集目標', 'warn');
      return;
    }
    if (state.collected.has(item.label)) {
      ctx.toast?.(`💎 「${item.label}」已收集`, 'warn');
      return;
    }
    state.collected.add(item.label);
    recordRoute(`collect:${item.label}`);
    playSound('pickup');
    ctx.toast?.(`💎 已收集:${item.label}`, 'success');
    notifyObjectiveMilestone('collect', item.label);
  }

  function autoCollect() {
    const item = objectAt(state.x, state.z, ['collect']);
    if (item && !state.collected.has(item.label)) {
      state.collected.add(item.label);
      recordRoute(`collect:${item.label}`);
      playSound('pickup');
      ctx.toast?.(`💎 已收集:${item.label}`, 'success');
      notifyObjectiveMilestone('collect', item.label);
    }
  }

  function sample() {
    const item = objectAt(state.x, state.z, ['sample']);
    if (!item) {
      ctx.toast?.('🧪 這裡沒有採樣點', 'warn');
      return;
    }
    if (state.samples.has(item.label)) {
      ctx.toast?.(`🧪 「${item.label}」已採集`, 'warn');
      return;
    }
    state.samples.add(item.label);
    recordRoute(`sample:${item.label}`);
    playSound('pickup');
    ctx.toast?.(`🧪 已採集樣本:${item.label}`, 'success');
    notifyObjectiveMilestone('sample', item.label);
  }

  function report() {
    const item = objectAt(state.x, state.z, ['report']);
    if (!item) {
      ctx.toast?.('📊 這裡沒有數據終端', 'warn');
      return;
    }
    if (state.reports.has(item.label)) {
      ctx.toast?.(`📊 「${item.label}」已回報`, 'warn');
      return;
    }
    state.reports.add(item.label);
    recordRoute(`report:${item.label}`);
    playSound('scan');
    ctx.toast?.(`📊 已回報數據:${item.label}`, 'success');
    notifyObjectiveMilestone('report', item.label);
  }

  function checkSuccess() {
    const mission = currentMission();
    if (!mission) return false;
    const success = mission.success || {};
    if (state.hitHazard || state.hitNpc) return false;
    if (success.scanAll && state.scans.size < countObjects('scan')) return false;
    if (success.sampleAll && state.samples.size < countObjects('sample')) return false;
    if (success.reportAll && state.reports.size < countObjects('report')) return false;
    if (success.collected && state.collected.size < success.collected) return false;
    if (success.samples && state.samples.size < success.samples) return false;
    if (success.reports && state.reports.size < success.reports) return false;
    if (success.photos && state.photos < success.photos) return false;
    if (success.picked && !state.cargo && !state.delivered) return false;
    if (success.delivered && !state.delivered) return false;
    if ((success.returnToBase || success.atTarget) && !isAtMissionTarget()) return false;
    if (success.landed && !state.landed) return false;
    return true;
  }

  function showResult(ok, customText = '') {
    if (ok) recordMissionComplete();
    else {
      guideExpanded = true;
      renderGuideDock();
    }
    lastRoute = route || lastRoute;
    if (lastRoute) MissionRoute?.renderRoute?.(ctx.scene, root, lastRoute, STEP);
    playSound(ok ? 'missionSuccess' : 'missionFail');
    showDialogue(ok
      ? (currentMission().dialogueSuccess || currentChapter().endingDialogue || [])
      : (currentMission().dialogueFail || []));
    const title = document.getElementById('missionResultTitle');
    const text = document.getElementById('missionResultText');
    const rating = ok ? getMissionRating() : '';
    const nextBtn = document.getElementById('missionResultNext');
    if (title) title.textContent = ok ? `任務完成 ${rating}` : '任務未完成';
    if (text) {
      if (customText) {
        text.textContent = customText;
      } else if (ok) {
        text.textContent = `你完成了「${currentMission().title}」。星級 ${rating}｜移動 ${state.moves} 步｜剩餘電量 ${Math.round(state.battery)}%｜積木 ${getBlockCount()} 塊。試試用更少積木或更短路線重玩！`;
      } else {
        const reason = MissionFeedback?.getFailureReason?.(state, currentMission(), feedbackHelpers())
          || '任務條件尚未全部達成，請對照目標清單調整積木。';
        text.textContent = reason;
      }
    }
    if (nextBtn) nextBtn.style.display = ok && hasNextMission() ? 'inline-flex' : 'none';
    document.getElementById('missionResultModal')?.classList.add('show');
  }

  function hasNextMission() {
    const chapter = currentChapter();
    if (currentMissionIndex < chapter.missions.length - 1) return true;
    return currentChapterIndex < chapters.length - 1;
  }

  async function nextMission() {
    document.getElementById('missionResultModal')?.classList.remove('show');
    const chapter = currentChapter();
    if (currentMissionIndex < chapter.missions.length - 1) {
      return selectMission(currentChapterIndex, currentMissionIndex + 1);
    }
    if (currentChapterIndex < chapters.length - 1) {
      return selectChapter(currentChapterIndex + 1);
    }
    ctx.toast?.('🎉 已通關所有任務！', 'success');
  }

  async function replayRoute(animated = false) {
    if (!lastRoute?.points?.length) {
      ctx.toast?.('⚠️ 暫時沒有可回放路線', 'warn');
      return;
    }
    MissionRoute?.renderRoute?.(ctx.scene, root, lastRoute, STEP);
    if (animated && MissionRoute?.replayAnimated) {
      ctx.toast?.('🎬 開始動畫回放', 'info');
      await MissionRoute.replayAnimated({
        scene: ctx.scene,
        root,
        route: lastRoute,
        STEP,
        liveDrone: drone,
        animate,
        stopCheck: () => stopRequested,
      });
      ctx.toast?.('🎞️ 回放完成', 'success');
      return;
    }
    ctx.toast?.('🎬 已顯示本次路線回放', 'info');
  }

  function shareSolution() {
    if (!ctx?.workspace) return;
    const xml = Blockly.Xml.workspaceToDom(ctx.workspace);
    const text = Blockly.Xml.domToText(xml);
    const code = btoa(unescape(encodeURIComponent(text)));
    navigator.clipboard?.writeText?.(code);
    ctx.toast?.('📋 已複製任務解法碼', 'success');
  }

  function showProfile() {
    MissionTutorial?.hide?.();
    document.body.classList.add('mission-profile-open');
    document.body.classList.remove('mission-tutorial-open');
    const panel = document.getElementById('missionProfile');
    if (!panel) return;
    const summary = MissionProgress.getAchievementSummary(chapters, progress);
    const total = MissionProgress.getTotalProgress(chapters, progress);
    panel.classList.add('show');
    panel.innerHTML = `
      <div class="mission-profile-head">
        <div>
          <div class="mission-kicker">LEARNING PROFILE</div>
          <h2>學習檔案</h2>
        </div>
        <button type="button" onclick="MissionMode.hideProfile()">關閉</button>
      </div>
      <div class="mission-profile-stats">
        <div><strong>${total.completed}/${total.total}</strong><span>關卡完成</span></div>
        <div><strong>${summary.firstClear}</strong><span>首次通關</span></div>
        <div><strong>${summary.perfect}</strong><span>三星通關</span></div>
        <div><strong>${summary.chapterBadges}</strong><span>章節徽章</span></div>
      </div>
      <div class="mission-profile-concepts">
        <h3>概念掌握</h3>
        ${Object.keys(summary.concepts).length
          ? Object.entries(summary.concepts).map(([concept, count]) => `
            <div class="mission-profile-concept">
              <span>${MissionProgress.CONCEPT_LABELS[concept] || concept}</span>
              <strong>${count}</strong>
            </div>
          `).join('')
          : '<p>完成任務後會在這裡顯示概念掌握度。</p>'}
      </div>
      <div class="mission-profile-list">
        <h3>最佳紀錄</h3>
        ${chapters.map((chapter, chapterIndex) => chapter.missions.map((mission, missionIndex) => {
          const entry = progress[missionKey(chapterIndex, missionIndex)];
          if (!entry?.completed) return '';
          return `<div class="mission-profile-row">
            <span>${chapter.icon} ${mission.title}</span>
            <strong>${entry.stars} · ${entry.bestMoves ?? '-'}步</strong>
          </div>`;
        }).join('')).join('') || '<p>尚無通關紀錄。</p>'}
      </div>
    `;
  }

  function hideProfile() {
    document.getElementById('missionProfile')?.classList.remove('show');
    document.body.classList.remove('mission-profile-open');
  }

  function recordMissionComplete() {
    const chapter = currentChapter();
    const wasLastInChapter = currentMissionIndex === chapter.missions.length - 1;
    progress = MissionProgress.recordComplete({
      chapters,
      chapterIndex: currentChapterIndex,
      missionIndex: currentMissionIndex,
      progress,
      stars: getMissionRating(),
      moves: state.moves,
      battery: Math.round(state.battery),
      blockCount: getBlockCount(),
    });
    renderCards();
    updateMenuProgressBadge();
    if (wasLastInChapter) playChapterCompleteCelebration();
  }

  function starCount(stars = '') {
    return MissionProgress.starCount(stars);
  }

  function getMissionRating() {
    const thresholds = currentMission().stars || {};
    let stars = 1;
    if (state.battery >= (thresholds.battery || 45)) stars++;
    if (state.moves <= (thresholds.moves || 18)) stars++;
    return '★'.repeat(stars) + '☆'.repeat(3 - stars);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
  }

  function animate(fn, duration) {
    return new Promise((resolve) => {
      const start = performance.now();
      function frame(now) {
        if (stopRequested) return resolve();
        const t = Math.min((now - start) / duration, 1);
        fn(1 - Math.pow(1 - t, 2));
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  const STARTER_MINIMAL = '<xml><block type="event_start" x="40" y="40"></block></xml>';
  const STARTER_TAKEOFF = '<xml><block type="event_start" x="40" y="40"><next><block type="action_takeoff"></block></next></block></xml>';

  function loadStarterProgram() {
    if (!ctx?.workspace) return;
    const mission = currentMission();
    ctx.workspace.clear();
    const xml = mission?.id === 'campus-1' ? STARTER_TAKEOFF : STARTER_MINIMAL;
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), ctx.workspace);
  }
})();
