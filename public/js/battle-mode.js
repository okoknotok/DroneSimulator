(function initBattleMode(global) {
  const BATTLE_DUELS = [
    { levelIndex: 1, title: '直線競速', tag: '入門' },
    { levelIndex: 4, title: '花瓶繞路', tag: '路徑' },
    { levelIndex: 10, title: '雙檢查點', tag: '順序' },
    { levelIndex: 11, title: '寶物獵人', tag: '收集' },
    { levelIndex: 5, title: '智能避障', tag: '條件' },
    { levelIndex: 15, title: 'AI 巡邏對決', tag: '進階' },
  ];

  const CPU_PROFILES = {
    rookie: { id: 'rookie', name: '見習 AI', icon: '🤖', speedMultiplier: 0.75, startDelay: 2000, label: '反應較慢' },
    patrol: { id: 'patrol', name: '巡邏 AI', icon: '🛰️', speedMultiplier: 1, startDelay: 0, label: '標準對手' },
    master: { id: 'master', name: '大師 AI', icon: '👑', speedMultiplier: 1.25, startDelay: 0, label: '高速精準' },
  };

  const ROUND_CODING_SECONDS = [90, 75, 60];
  const PHASE_LABELS = {
    select: '選擇對戰',
    briefing: '開局',
    coding: '編程回合',
    cpuReveal: '對手亮牌',
    race: '出擊競速',
    result: '結算',
    matchOver: '對戰結束',
  };

  let ctx = null;
  let active = false;
  let phase = 'select';
  let matchFormat = 'bo3';
  let cpuDifficulty = 'rookie';
  let duelIndex = 0;
  let roundIndex = 0;
  let playerScore = 0;
  let cpuScore = 0;
  let codingTimer = null;
  let codingSecondsLeft = 0;
  let cpuPreview = null;
  let raceState = null;
  let raceAnimHandle = null;
  let raceSyncTimer = null;
  let finishingCoding = false;
  const STEP = global.FlightSimulator?.STEP || 2;

  function getDuel() {
    return BATTLE_DUELS[duelIndex] || BATTLE_DUELS[0];
  }

  function getLevel() {
    const duel = getDuel();
    return ctx?.getLevel?.(duel.levelIndex) || null;
  }

  function ensureBattleStats() {
    if (!ctx?.saveData) return {};
    ctx.saveData.battleStats = ctx.saveData.battleStats || {
      wins: 0,
      losses: 0,
      draws: 0,
      matches: 0,
      bestDifficulty: 'rookie',
      lastDifficulty: 'rookie',
    };
    return ctx.saveData.battleStats;
  }

  function recordMatchResult(winner) {
    const stats = ensureBattleStats();
    stats.matches++;
    if (winner === 'player') stats.wins++;
    else if (winner === 'cpu') stats.losses++;
    else stats.draws++;
    stats.lastDifficulty = cpuDifficulty;
    const rank = { rookie: 1, patrol: 2, master: 3 };
    if (rank[cpuDifficulty] > (rank[stats.bestDifficulty] || 0)) stats.bestDifficulty = cpuDifficulty;
    ctx?.persistSaveData?.();
  }

  function updateCpuHead() {
    const titleEl = document.getElementById('battleCpuHeadTitle');
    const subEl = document.getElementById('battleCpuHeadSub');
    if (!titleEl || !subEl) return;
    const cpu = CPU_PROFILES[cpuDifficulty] || CPU_PROFILES.rookie;
    titleEl.textContent = `${cpu.icon} ${cpu.name}`;
    const subByPhase = {
      select: cpu.label,
      briefing: '準備開局…',
      coding: '正在分析並編寫程式',
      cpuReveal: '對手程式已就緒',
      race: '同步競速中',
      result: '本局結算',
      matchOver: '對戰結束',
    };
    subEl.textContent = subByPhase[phase] || cpu.label;
  }

  function setPhase(next) {
    phase = next;
    applyBattleLayout();
    applyPhaseVisibility();
    renderBattleChrome();
    renderLobby();
    renderMissionCard();
    renderVsStrip();
    renderVsSplash();
    updateRacePips();
    updateBattleControls();
    updateCpuHead();
  }

  function applyPhaseVisibility() {
    if (!active) return;
    const isSelect = phase === 'select';
    const isBriefing = phase === 'briefing';
    const isCoding = phase === 'coding';
    const isRace = phase === 'race';
    const showChrome = !isSelect;

    const toggle = (id, on) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('show', on);
    };

    toggle('battleLobby', isSelect);
    toggle('battleChrome', showChrome);
    toggle('battleDock', false);
    toggle('battleHud', false);
    toggle('battleAiIntel', false);
    toggle('battleVsSplash', false);
    toggle('battleDualStack', isCoding);
    toggle('battleRowDivider', isCoding);
    toggle('battlePlayerZoom', isCoding);
    toggle('battleSplitOverlay', isRace);
    toggle('battleRaceBanners', isRace);

    if (isCoding) ctx?.enterBattleCodingLayout?.();
    else ctx?.exitBattleCodingLayout?.();

    const blocksArea = document.getElementById('blocksArea');
    const divider = document.getElementById('divider');
    if (blocksArea) blocksArea.style.display = isCoding ? 'flex' : 'none';
    if (divider) divider.style.display = 'none';

    const hud = document.getElementById('hud');
    const minimap = document.getElementById('minimap');
    if (hud) hud.style.display = 'none';
    if (minimap) minimap.style.display = (isCoding || isRace || isSelect) ? 'none' : 'block';

    document.body.classList.toggle('battle-select', isSelect);
    document.body.classList.toggle('battle-cpu-reveal', false);
  }

  function renderBattleChrome() {
    const chrome = document.getElementById('battleChrome');
    if (!chrome || !active) return;
    const showChrome = phase !== 'select';
    if (!showChrome) {
      chrome.classList.remove('show');
      return;
    }
    chrome.classList.add('show');

    const duel = getDuel();
    const cpu = CPU_PROFILES[cpuDifficulty] || CPU_PROFILES.rookie;
    const roundLabel = matchFormat === 'bo3' ? `第 ${roundIndex + 1} 局` : '單局';

    const roundChip = document.getElementById('battleRoundChip');
    const scoreLine = document.getElementById('battleScoreLine');
    const phaseChip = document.getElementById('battlePhaseChip');
    const topTimer = document.getElementById('battleTopTimer');
    const leadArrow = document.getElementById('battleLeadArrow');
    const topActions = document.getElementById('battleTopActions');

    if (roundChip) roundChip.textContent = `${roundLabel} · ${duel?.title || ''}`;
    if (scoreLine) {
      scoreLine.innerHTML = `<span class="score-p">你</span><strong class="score-num">${playerScore}</strong><span class="score-sep">-</span><strong class="score-num">${cpuScore}</strong><span class="score-c">${cpu.icon} AI</span>`;
    }
    if (phaseChip) phaseChip.textContent = PHASE_LABELS[phase] || phase;

    if (topTimer) {
      topTimer.classList.remove('active', 'player', 'cpu', 'draw');
      if (phase === 'coding') {
        topTimer.textContent = formatTime(codingSecondsLeft);
        topTimer.classList.add('active');
      } else {
        topTimer.textContent = '';
      }
    }

    if (leadArrow) {
      leadArrow.classList.remove('show', 'player', 'cpu', 'draw');
      if (phase === 'race' && raceState) {
        const lead = getCurrentRaceLead();
        leadArrow.classList.add('show', lead);
        leadArrow.textContent = lead === 'player' ? '◀ 你領先' : lead === 'cpu' ? 'AI 領先 ▶' : '平手';
      } else {
        leadArrow.textContent = '';
      }
    }

    if (topActions) {
      let html = '';
      if (phase === 'coding') {
        html += '<button type="button" class="battle-primary" onclick="BattleMode.finishCodingRound()">確認出擊</button>';
      } else if (phase === 'result') {
        const nextLabel = playerScore >= 2 || cpuScore >= 2 || matchFormat === 'quick' ? '查看總結' : '下一局';
        html += `<button type="button" class="battle-primary" onclick="BattleMode.nextAfterResult()">${nextLabel}</button>`;
        html += '<button type="button" class="ghost" onclick="BattleMode.backToSelect()">換關卡</button>';
      } else if (phase === 'matchOver') {
        html += '<button type="button" class="battle-primary" onclick="BattleMode.startMatch()">再戰</button>';
        html += '<button type="button" class="ghost" onclick="BattleMode.backToSelect()">返回選單</button>';
      }
      if (phase !== 'race' && phase !== 'matchOver' && phase !== 'briefing') {
        html += '<button type="button" class="ghost" onclick="BattleMode.abort()">退出</button>';
      }
      topActions.innerHTML = html;
    }
  }

  function renderLobby() {
    const lobby = document.getElementById('battleLobby');
    if (!lobby || !active) return;
    if (phase !== 'select') {
      lobby.classList.remove('show');
      lobby.innerHTML = '';
      return;
    }
    const stats = ensureBattleStats();
    const cpu = CPU_PROFILES[cpuDifficulty] || CPU_PROFILES.rookie;
    lobby.innerHTML = `
      <div class="battle-lobby-inner">
        <h2>編程對決</h2>
        <p class="battle-lobby-sub">選擇對手與賽道，開始競速編程</p>
        <div class="battle-lobby-section">
          <div class="battle-lobby-label">對手難度</div>
          <div class="battle-diff-cards">
            ${Object.values(CPU_PROFILES).map((p) => `
              <button type="button" class="battle-diff-card ${p.id === cpuDifficulty ? 'active' : ''}" onclick="BattleMode.setDifficulty('${p.id}')">
                <span class="diff-icon">${p.icon}</span>
                <strong>${p.name}</strong>
                <em>${p.label}</em>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="battle-lobby-section">
          <div class="battle-lobby-label">賽制</div>
          <div class="battle-format-row">
            <button type="button" class="battle-format-btn ${matchFormat === 'quick' ? 'active' : ''}" onclick="BattleMode.setFormat('quick')">課堂版 · 單局 90 秒</button>
            <button type="button" class="battle-format-btn ${matchFormat === 'bo3' ? 'active' : ''}" onclick="BattleMode.setFormat('bo3')">挑戰版 · 三局兩勝</button>
          </div>
        </div>
        <div class="battle-lobby-section">
          <div class="battle-lobby-label">賽道</div>
          <div class="battle-lobby-duels">
            ${BATTLE_DUELS.map((d, i) => `
              <button type="button" class="battle-lobby-duel ${i === duelIndex ? 'active' : ''}" onclick="BattleMode.selectDuel(${i})">
                <span>${d.title}</span><em>${d.tag}</em>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="battle-lobby-record">戰績 ${stats.wins} 勝 ${stats.losses} 負 · 最高 ${CPU_PROFILES[stats.bestDifficulty || 'rookie']?.name || '見習 AI'}</div>
        <button type="button" class="battle-primary battle-lobby-start" onclick="BattleMode.startMatch()">開始對戰</button>
      </div>
    `;
    lobby.classList.add('show');
  }

  function renderVsStrip() {
    const strip = document.getElementById('battleVsStrip');
    if (!strip) return;
    const show = active && phase === 'coding';
    if (!show) {
      strip.classList.remove('show');
      strip.innerHTML = '';
      return;
    }
    const cpu = CPU_PROFILES[cpuDifficulty] || CPU_PROFILES.rookie;
    strip.innerHTML = `
      <div class="vs-strip-player"><span class="vs-strip-badge player">你</span></div>
      <div class="vs-strip-mid">VS</div>
      <div class="vs-strip-cpu">
        <span class="vs-strip-badge cpu">${cpu.icon} ${cpu.name}</span>
        <span class="vs-strip-pulse">AI 正在分析賽道...</span>
      </div>
      <div class="vs-strip-stats">
        <span>積木 <em>???</em></span>
        <span>步數 <em>???</em></span>
        <span>完成 <em>???</em></span>
      </div>
    `;
    strip.classList.add('show');
  }

  function renderVsSplash() {
    const splash = document.getElementById('battleVsSplash');
    if (!splash || !active) return;
    if (phase !== 'cpuReveal') {
      splash.classList.remove('show');
      return;
    }
    const cpu = CPU_PROFILES[cpuDifficulty] || CPU_PROFILES.rookie;
    const vsCpu = document.getElementById('battleVsCpu');
    if (vsCpu) {
      const blocks = cpuPreview?.blockCount ?? '???';
      const moves = cpuPreview?.moves ?? '???';
      const ok = cpuPreview?.success ? '可完成' : '不確定';
      vsCpu.innerHTML = `
        <span class="vs-avatar">${cpu.icon}</span>
        <strong>${cpu.name}</strong>
        <div class="vs-reveal-stats">${blocks} 積木 · ${moves} 步 · ${ok}</div>
      `;
    }
    splash.classList.add('show');
  }

  function getCurrentRaceLead() {
    if (!raceState) return 'draw';
    const level = getLevel();
    const playerSnap = ctx?.getPlayerBattleSnapshot?.() || { stats: {}, distance: 999 };
    const cpuStats = getCpuStatsAtTime(level, raceState.cpuTimeline?.timeline, raceState.cpuVirtualNow || 0);
    const cpuSnap = {
      stats: cpuStats,
      distance: getCpuDistanceAtTime(level, raceState.cpuTimeline?.timeline, raceState.cpuVirtualNow || 0),
    };
    return compareRaceLead(playerSnap, cpuSnap, level);
  }

  function renderPips(el, objectives) {
    if (!el) return;
    el.innerHTML = objectives.map((o) => `<span class="battle-pip ${o.done ? 'done' : ''}" title="${o.label}"></span>`).join('');
  }

  function updateRacePips() {
    if (phase !== 'race' || !raceState) return;
    const level = getLevel();
    const cpu = CPU_PROFILES[cpuDifficulty] || CPU_PROFILES.rookie;
    const playerSnap = ctx?.getPlayerBattleSnapshot?.() || { stats: {}, distance: 999, status: '' };
    const cpuStats = getCpuStatsAtTime(level, raceState.cpuTimeline?.timeline, raceState.cpuVirtualNow || 0);
    const cpuSnap = {
      stats: cpuStats,
      distance: getCpuDistanceAtTime(level, raceState.cpuTimeline?.timeline, raceState.cpuVirtualNow || 0),
      status: raceState.cpuDone ? (raceState.cpuSuccess ? '完成' : '失敗') : (raceState.cpuVirtualNow > 0 ? '飛行中' : '待命'),
    };

    const playerStatus = document.getElementById('battlePlayerStatus');
    const cpuStatus = document.getElementById('battleCpuStatus');
    const playerPips = document.getElementById('battlePlayerPips');
    const cpuPips = document.getElementById('battleCpuPips');
    const cpuLabel = document.getElementById('battleCpuLabel');

    if (cpuLabel) cpuLabel.textContent = `${cpu.icon} ${cpu.name}`;
    if (playerStatus) playerStatus.textContent = `距終點 ${playerSnap.distance ?? '--'} 格`;
    if (cpuStatus) cpuStatus.textContent = `距終點 ${cpuSnap.distance ?? '--'} 格`;
    renderPips(playerPips, buildObjectives(level, playerSnap.stats));
    renderPips(cpuPips, buildObjectives(level, cpuSnap.stats));
    renderBattleChrome();
  }

  function applyBattleLayout() {
    const body = document.body;
    body.classList.remove('battle-briefing', 'battle-coding', 'battle-race');
    if (!active) return;
    if (phase === 'briefing') {
      body.classList.add('battle-briefing');
      ctx?.disableSplitCameras?.();
    } else if (phase === 'coding') {
      body.classList.add('battle-coding');
      ctx?.enableSplitCameras?.('vertical');
      ctx?.resizeEngine?.();
    } else if (phase === 'race') {
      body.classList.add('battle-race');
      ctx?.enableSplitCameras?.('horizontal');
      ctx?.resizeEngine?.();
    } else {
      ctx?.disableSplitCameras?.();
    }
  }

  function buildObjectives(level, stats) {
    if (!level || !stats) return [];
    const items = [{ label: '起飛', done: Boolean(stats.tookOff) }];
    if (level.checkpoints?.length) {
      const visited = stats.checkpointsVisitedCount || 0;
      const orderOk = stats.checkpointOrderCorrect !== false;
      items.push({
        label: `檢查點 ${visited}/${level.checkpoints.length}`,
        done: visited >= level.checkpoints.length && orderOk,
      });
    }
    if (level.treasures?.length) {
      const collected = stats.treasuresCollectedCount || 0;
      items.push({
        label: `收集寶石 ${collected}/${level.treasures.length}`,
        done: collected >= level.treasures.length,
      });
    }
    items.push({ label: '到達終點', done: Boolean(stats.atTarget) });
    items.push({ label: '降落', done: Boolean(stats.landed) });
    return items;
  }

  function getCpuStatsAtTime(level, timeline, virtualNow) {
    const empty = global.FlightSimulator?.createEmptyStats?.() || {};
    const stats = { ...empty, checkpointsVisitedIndices: [], treasuresCollected: [] };
    let lastFrame = null;
    for (const frame of timeline || []) {
      if (frame.t > virtualNow) break;
      if (frame.event === 'takeoff') stats.tookOff = true;
      if (frame.event === 'land') stats.landed = true;
      if (frame.event === 'crash') stats.hitObstacle = true;
      const gx = Math.round(frame.x / STEP);
      const gz = Math.round(frame.z / STEP);
      (level.checkpoints || []).forEach((cp, idx) => {
        if (cp.gx !== gx || cp.gz !== gz) return;
        if (stats.checkpointsVisitedIndices.includes(idx)) return;
        const expectedIdx = stats.checkpointsVisitedCount;
        if (idx !== expectedIdx) stats.checkpointOrderCorrect = false;
        stats.checkpointsVisitedIndices.push(idx);
        stats.checkpointsVisitedCount++;
      });
      (level.treasures || []).forEach((t, idx) => {
        if (t.gx === gx && t.gz === gz && !stats.treasuresCollected.includes(idx)) {
          stats.treasuresCollected.push(idx);
          stats.treasuresCollectedCount++;
        }
      });
      lastFrame = frame;
    }
    if (lastFrame) {
      const gx = Math.round(lastFrame.x / STEP);
      const gz = Math.round(lastFrame.z / STEP);
      if (gx === level.target.gx && gz === level.target.gz) stats.atTarget = true;
    }
    return stats;
  }

  function getCpuDistanceAtTime(level, timeline, virtualNow) {
    let lastFrame = null;
    for (const frame of timeline || []) {
      if (frame.t > virtualNow) break;
      lastFrame = frame;
    }
    if (!lastFrame) return 999;
    const gx = Math.round(lastFrame.x / STEP);
    const gz = Math.round(lastFrame.z / STEP);
    return Math.abs(gx - level.target.gx) + Math.abs(gz - level.target.gz);
  }

  function compareRaceLead(playerSnap, cpuSnap, level) {
    const pObj = buildObjectives(level, playerSnap.stats);
    const cObj = buildObjectives(level, cpuSnap.stats);
    const pDone = pObj.filter((o) => o.done).length;
    const cDone = cObj.filter((o) => o.done).length;
    if (pDone > cDone) return 'player';
    if (cDone > pDone) return 'cpu';
    if ((playerSnap.distance ?? 999) < (cpuSnap.distance ?? 999)) return 'player';
    if ((cpuSnap.distance ?? 999) < (playerSnap.distance ?? 999)) return 'cpu';
    return 'draw';
  }

  function startRaceSyncTimer() {
    stopRaceSyncTimer();
    raceSyncTimer = setInterval(() => {
      updateRacePips();
    }, 200);
  }

  function stopRaceSyncTimer() {
    if (raceSyncTimer) {
      clearInterval(raceSyncTimer);
      raceSyncTimer = null;
    }
  }

  function renderMissionCard() {
    const card = document.getElementById('battleMissionCard');
    if (!card) return;
    if (phase !== 'briefing' || !active) {
      card.classList.remove('show');
      card.innerHTML = '';
      return;
    }
    const duel = getDuel();
    const level = getLevel();
    const cpu = CPU_PROFILES[cpuDifficulty] || CPU_PROFILES.rookie;
    const roundLabel = matchFormat === 'bo3' ? `第 ${roundIndex + 1} 局` : '單局決勝';
    const preview = prepareCpuPreview();
    const estSteps = preview?.moves > 0 ? `預估 ${preview.moves} 步` : cpu.label;
    card.innerHTML = `
      <div class="battle-mission-card-inner">
        <div class="battle-mission-kicker">${roundLabel} · ${duel.title}</div>
        <h2>⚔️ 任務簡報</h2>
        <p><strong>你的任務：</strong>${level?.goal || '--'}</p>
        <p><strong>對手：</strong>${cpu.icon} ${cpu.name}（${estSteps}）</p>
        <p><strong>贏法：</strong>先完成目標；平手比步數與積木數</p>
        <button type="button" class="battle-primary battle-mission-continue" onclick="BattleMode.beginCodingRound()">進入編程回合</button>
      </div>
    `;
    card.classList.add('show');
  }

  function showBattleUI() {
    document.body.classList.add('battle-mode');
    document.getElementById('levelPanel')?.style && (document.getElementById('levelPanel').style.display = 'none');
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }

  function hideBattleUI() {
    global.BattleCpuCoder?.dispose?.();
    document.body.classList.remove('battle-mode', 'battle-briefing', 'battle-coding', 'battle-race', 'battle-select', 'battle-cpu-reveal');
    document.getElementById('battleChrome')?.classList.remove('show');
    document.getElementById('battleLobby')?.classList.remove('show');
    document.getElementById('battleVsSplash')?.classList.remove('show');
    document.getElementById('battleDualStack')?.classList.remove('show');
    document.getElementById('battleRowDivider')?.classList.remove('show');
    document.getElementById('battlePlayerZoom')?.classList.remove('show');
    document.getElementById('battleVsStrip')?.classList.remove('show');
    document.getElementById('battleDock')?.classList.remove('show');
    document.getElementById('battleHud')?.classList.remove('show');
    document.getElementById('battleAiIntel')?.classList.remove('show');
    document.getElementById('battleSplitOverlay')?.classList.remove('show');
    document.getElementById('battleMissionCard')?.classList.remove('show');
    document.getElementById('battleCountdown')?.classList.remove('show');
    document.getElementById('battleResultModal')?.classList.remove('show');
    document.getElementById('levelPanel')?.style && (document.getElementById('levelPanel').style.display = 'block');
    const hud = document.getElementById('hud');
    const minimap = document.getElementById('minimap');
    if (hud) hud.style.display = 'block';
    if (minimap) minimap.style.display = 'block';
    stopCodingTimer();
    stopRaceAnimation();
    clearRaceState();
    stopRaceSyncTimer();
    ctx?.disableSplitCameras?.();
  }

  function showCountdown(seconds = 3) {
    return new Promise((resolve) => {
      const el = document.getElementById('battleCountdown');
      if (!el) {
        resolve();
        return;
      }
      let n = seconds;
      const tick = () => {
        if (n <= 0) {
          el.classList.remove('show');
          el.textContent = '';
          resolve();
          return;
        }
        el.textContent = String(n);
        el.classList.add('show');
        n -= 1;
        setTimeout(tick, n < 0 ? 350 : 900);
      };
      tick();
    });
  }

  function getWinStepNote() {
    if (!raceState) return '';
    const level = getLevel();
    const pStats = raceState.playerPreview?.stats || ctx?.getPlayerBattleSnapshot?.()?.stats || {};
    const cStats = raceState.cpuTimeline?.stats || {};
    const pObj = buildObjectives(level, pStats);
    const cObj = buildObjectives(level, cStats);
    for (let i = 0; i < pObj.length; i++) {
      if (pObj[i].done && !cObj[i]?.done) return `你領先在：${pObj[i].label}`;
      if (cObj[i]?.done && !pObj[i].done) return `AI 領先在：${cObj[i].label}`;
    }
    if (raceState.playerElapsed < raceState.cpuElapsed) return '你以較短用時取勝';
    if (raceState.cpuElapsed < raceState.playerElapsed) return 'AI 以較短用時取勝';
    return '';
  }

  function stopCodingTimer() {
    if (codingTimer) {
      clearInterval(codingTimer);
      codingTimer = null;
    }
  }

  function stopRaceAnimation() {
    if (raceAnimHandle) {
      cancelAnimationFrame(raceAnimHandle);
      raceAnimHandle = null;
    }
    stopRaceSyncTimer();
    finishingCoding = false;
  }

  function clearRaceState() {
    raceState = null;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateBattleControls() {
    const runBtn = document.getElementById('btnRun');
    const stepBtn = document.getElementById('btnStep');
    if (runBtn) runBtn.disabled = Boolean(active && phase !== 'race');
    if (stepBtn) stepBtn.disabled = Boolean(active && phase !== 'race');
    const ws = getWorkspace();
    if (ws?.setResizesEnabled) ws.setResizesEnabled(!active || phase === 'coding' || phase === 'select');
  }

  function workspaceGuard() {
    return Boolean(getWorkspace());
  }

  function loadCurrentDuelLevel() {
    const duel = getDuel();
    ctx?.loadLevelIndex?.(duel.levelIndex);
    ctx?.resetDrone?.();
    loadDefaultBattleBlocks();
  }

  function getWorkspace() {
    return typeof ctx?.workspace === 'function' ? ctx.workspace() : null;
  }

  function loadDefaultBattleBlocks() {
    ctx?.loadDefaultBlocks?.();
  }

  function prepareCpuPreview() {
    const level = getLevel();
    const cpu = CPU_PROFILES[cpuDifficulty] || CPU_PROFILES.rookie;
    if (!level?.solutionXml || !global.FlightSimulator) {
      cpuPreview = { blockCount: 0, moves: 0, success: false, elapsed: 0, timeline: [] };
      return cpuPreview;
    }
    cpuPreview = global.FlightSimulator.simulateFromSolutionXml(
      level,
      level.solutionXml(),
      { speedMultiplier: cpu.speedMultiplier, startDelay: cpu.startDelay },
    );
    return cpuPreview;
  }

  function beginCodingRound() {
    stopCodingTimer();
    document.getElementById('battleMissionCard')?.classList.remove('show');
    const seconds = matchFormat === 'quick'
      ? 90
      : (ROUND_CODING_SECONDS[roundIndex] || 60);
    codingSecondsLeft = seconds;
    ctx?.createCpuDrone?.();
    ctx?.resetDrone?.();
    setPhase('coding');
    ctx?.enableSplitCameras?.('vertical');
    ctx?.resizeEngine?.();
    const level = getLevel();
    const cpu = CPU_PROFILES[cpuDifficulty] || CPU_PROFILES.rookie;
    const startCpuCoder = () => global.BattleCpuCoder?.start?.({
      level,
      profile: cpu,
      seconds,
    });
    requestAnimationFrame(() => requestAnimationFrame(startCpuCoder));
    codingTimer = setInterval(() => {
      codingSecondsLeft -= 1;
      renderBattleChrome();
      if (codingSecondsLeft <= 0) finishCodingRound();
    }, 1000);
  }

  function prepareRaceShowcase() {
    ctx?.exitBattleCodingLayout?.();
    document.getElementById('battleDualStack')?.classList.remove('show');
    document.getElementById('battleRowDivider')?.classList.remove('show');
    document.getElementById('battlePlayerZoom')?.classList.remove('show');
    document.body.classList.remove('battle-coding');
    document.body.classList.add('battle-race');
    ctx?.setBattleViewportLayout?.('horizontal');
    ctx?.enableSplitCameras?.('horizontal');
    ctx?.resizeEngine?.();
    document.getElementById('battleSplitOverlay')?.classList.add('show');
    document.getElementById('battleRaceBanners')?.classList.add('show');
    const blocksArea = document.getElementById('blocksArea');
    const divider = document.getElementById('divider');
    if (blocksArea) blocksArea.style.display = 'none';
    if (divider) divider.style.display = 'none';
  }

  async function finishCodingRound() {
    if (finishingCoding) return;
    if (phase !== 'coding') return;
    finishingCoding = true;
    stopCodingTimer();
    global.BattleCpuCoder?.lock?.();
    global.BattleCpuCoder?.hide?.();
    prepareCpuPreview();
    prepareRaceShowcase();
    await showCountdown(3);
    if (!active || phase !== 'coding') {
      finishingCoding = false;
      return;
    }
    finishingCoding = false;
    await startRaceRound();
  }

  async function startRaceRound() {
    setPhase('race');
    startRaceSyncTimer();
    updateRacePips();
    const level = getLevel();
    const cpu = CPU_PROFILES[cpuDifficulty] || CPU_PROFILES.rookie;
    if (!cpuPreview) prepareCpuPreview();

    ctx?.createCpuDrone?.();
    ctx?.resetDrone?.();

    const ws = getWorkspace();
    const playerBlockCount = global.FlightSimulator?.countBlocks?.(ws) || 0;
    const playerPreview = ws
      ? global.FlightSimulator.simulateProgram(level, ws, { speedMultiplier: 1 })
      : { success: false, distanceToTarget: 999 };

    raceState = {
      startedAt: Date.now(),
      playerDone: false,
      cpuDone: false,
      playerSuccess: false,
      cpuSuccess: false,
      playerElapsed: 0,
      cpuElapsed: 0,
      playerMoves: 0,
      cpuMoves: cpuPreview?.moves || 0,
      playerBlocks: playerBlockCount,
      cpuBlocks: cpuPreview?.blockCount || 0,
      cpuTimeline: cpuPreview,
      cpuVirtualNow: 0,
      winner: null,
      playerPreview,
    };

    const raceStart = Date.now();
    const cpuDelayMs = cpu.startDelay || 0;

    const cpuPromise = new Promise((resolve) => {
      const timeline = cpuPreview?.timeline || [];
      const totalVirtual = cpuPreview?.elapsed || 1;
      const tick = () => {
        if (!raceState || phase !== 'race') return;
        const elapsedReal = Date.now() - raceStart - cpuDelayMs;
        if (elapsedReal < 0) {
          raceAnimHandle = requestAnimationFrame(tick);
          updateRacePips();
          return;
        }
        const virtualNow = Math.min(totalVirtual, Math.max(0, elapsedReal));
        raceState.cpuVirtualNow = virtualNow;
        let frame = timeline[0];
        for (let i = 0; i < timeline.length; i++) {
          if (timeline[i].t <= virtualNow) frame = timeline[i];
          else break;
        }
        if (frame) {
          ctx?.updateCpuDrone?.(frame.x, frame.z, frame.dir, frame.flying);
        }
        if (!raceState.cpuDone && virtualNow >= totalVirtual) {
          raceState.cpuDone = true;
          raceState.cpuSuccess = Boolean(cpuPreview?.success);
          raceState.cpuElapsed = Math.max(0, (Date.now() - raceStart) / 1000);
          resolve();
          updateRacePips();
          return;
        }
        if (totalVirtual <= 0) {
          raceState.cpuDone = true;
          raceState.cpuSuccess = false;
          raceState.cpuElapsed = 0;
          resolve();
          return;
        }
        updateRacePips();
        if (!raceState.cpuDone) raceAnimHandle = requestAnimationFrame(tick);
        else resolve();
      };
      raceAnimHandle = requestAnimationFrame(tick);
    });

    const playerPromise = ctx?.runStudentRace?.().then((result) => {
      if (!raceState) return result;
      raceState.playerDone = true;
      raceState.playerSuccess = Boolean(result?.success);
      raceState.playerElapsed = result?.elapsed ?? ((Date.now() - raceStart) / 1000);
      raceState.playerMoves = result?.moves ?? 0;
      raceState.playerBlocks = result?.blockCount ?? playerBlockCount;
      if (result?.stats) raceState.playerPreview = { ...raceState.playerPreview, stats: result.stats };
      updateRacePips();
      return result;
    });

    await Promise.all([cpuPromise, playerPromise]);
    stopRaceAnimation();
    resolveRoundWinner();
    setPhase('result');
    showRoundResultModal();
  }

  function resolveRoundWinner() {
    if (!raceState) return;
    const p = raceState;
    let winner = 'draw';
    if (p.playerSuccess && !p.cpuSuccess) winner = 'player';
    else if (!p.playerSuccess && p.cpuSuccess) winner = 'cpu';
    else if (p.playerSuccess && p.cpuSuccess) {
      if (p.playerElapsed < p.cpuElapsed - 0.05) winner = 'player';
      else if (p.cpuElapsed < p.playerElapsed - 0.05) winner = 'cpu';
      else if (p.playerMoves < p.cpuMoves) winner = 'player';
      else if (p.cpuMoves < p.playerMoves) winner = 'cpu';
      else if (p.playerBlocks < p.cpuBlocks) winner = 'player';
      else if (p.cpuBlocks < p.playerBlocks) winner = 'cpu';
    } else {
      const level = getLevel();
      const pDist = p.playerPreview?.distanceToTarget ?? 999;
      const cDist = p.cpuPreview?.distanceToTarget ?? 999;
      if (pDist < cDist) winner = 'player';
      else if (cDist < pDist) winner = 'cpu';
      else winner = 'draw';
      void level;
    }
    p.winner = winner;
    if (winner === 'player') playerScore++;
    else if (winner === 'cpu') cpuScore++;
    renderBattleChrome();
  }

  function showRoundResultModal() {
    const modal = document.getElementById('battleResultModal');
    if (!modal || !raceState) return;
    const p = raceState;
    const winnerText = p.winner === 'player' ? '你贏了這一局！' : p.winner === 'cpu' ? '電腦贏了這一局' : '本局平手';
    const stepNote = getWinStepNote();
    modal.innerHTML = `
      <div class="battle-result-box">
        <h2>${winnerText}</h2>
        ${stepNote ? `<p style="color:#b0c4de;font-size:13px;margin:0 0 10px">${stepNote}</p>` : ''}
        <div class="battle-result-grid">
          <div><span>完成</span><strong>${p.playerSuccess ? '是' : '否'} / ${p.cpuSuccess ? '是' : '否'}</strong></div>
          <div><span>用時</span><strong>${p.playerElapsed.toFixed(1)}s / ${p.cpuElapsed.toFixed(1)}s</strong></div>
          <div><span>步數</span><strong>${p.playerMoves} / ${p.cpuMoves}</strong></div>
          <div><span>積木</span><strong>${p.playerBlocks} / ${p.cpuBlocks}</strong></div>
        </div>
        <div class="battle-result-score">總比分 你 ${playerScore} : ${cpuScore} CPU</div>
      </div>
    `;
    modal.classList.add('show');
    setTimeout(() => modal.classList.remove('show'), 2600);
  }

  function nextAfterResult() {
    const needed = matchFormat === 'quick' ? 1 : 2;
    if (playerScore >= needed || cpuScore >= needed || matchFormat === 'quick') {
      const winner = playerScore > cpuScore ? 'player' : cpuScore > playerScore ? 'cpu' : 'draw';
      recordMatchResult(winner);
      setPhase('matchOver');
      const modal = document.getElementById('battleResultModal');
      if (modal) {
        modal.innerHTML = `
          <div class="battle-result-box">
            <h2>${winner === 'player' ? '🏆 對戰勝利！' : winner === 'cpu' ? '💻 電腦獲勝' : '🤝 平局'}</h2>
            <p>最終比分 你 ${playerScore} : ${cpuScore} ${CPU_PROFILES[cpuDifficulty]?.name || 'AI'}</p>
            <button type="button" class="battle-primary" onclick="BattleMode.startMatch()">再戰一局</button>
            <button type="button" class="ghost" onclick="BattleMode.backToSelect()">返回選單</button>
          </div>
        `;
        modal.classList.add('show');
      }
      renderBattleChrome();
      return;
    }
    roundIndex++;
    duelIndex = (duelIndex + 1) % BATTLE_DUELS.length;
    startRound();
  }

  function startRound() {
    loadCurrentDuelLevel();
    setPhase('briefing');
    ctx?.toast?.(`⚔️ ${getDuel().title} — ${getLevel()?.goal || ''}`, 'info');
  }

  function startMatch() {
    document.getElementById('battleResultModal')?.classList.remove('show');
    playerScore = 0;
    cpuScore = 0;
    roundIndex = 0;
    startRound();
  }

  function backToSelect() {
    document.getElementById('battleResultModal')?.classList.remove('show');
    playerScore = 0;
    cpuScore = 0;
    roundIndex = 0;
    setPhase('select');
    loadDefaultBattleBlocks();
  }

  function abort() {
    stopCodingTimer();
    stopRaceAnimation();
    clearRaceState();
    global.BattleCpuCoder?.dispose?.();
    backToSelect();
    ctx?.toast?.('已退出對戰', 'info');
  }

  function enter(context) {
    ctx = context;
    active = true;
    showBattleUI();
    setPhase('select');
    updateBattleControls();
  }

  function exit() {
    active = false;
    global.BattleCpuCoder?.dispose?.();
    hideBattleUI();
    ctx = null;
    phase = 'select';
  }

  function isActive() {
    return active;
  }

  function getPhase() {
    return phase;
  }

  function canRunProgram() {
    return active && phase === 'race';
  }

  function canEditBlocks() {
    return !active || phase === 'coding' || phase === 'select';
  }

  global.BattleMode = {
    enter,
    exit,
    isActive,
    getPhase,
    canRunProgram,
    canEditBlocks,
    setDifficulty: (id) => { cpuDifficulty = CPU_PROFILES[id] ? id : 'rookie'; renderLobby(); updateCpuHead(); },
    setFormat: (id) => { matchFormat = id === 'bo3' ? 'bo3' : 'quick'; renderLobby(); },
    selectDuel: (idx) => { duelIndex = Math.max(0, Math.min(BATTLE_DUELS.length - 1, idx)); renderLobby(); },
    startMatch,
    beginCodingRound,
    finishCodingRound,
    nextAfterResult,
    backToSelect,
    abort,
    zoomPlayerScene: (factor) => ctx?.zoomPlayerCamera?.(factor),
    BATTLE_DUELS,
    CPU_PROFILES,
  };
})(window);
