/**
 * 對決模式 — AI 同步編程（積木即時拼接 + 文字模糊防抄襲）
 */
(function initBattleCpuCoder(global) {
  let cpuWorkspace = null;
  let revealTimer = null;
  let startTimeout = null;
  let layoutReadyTimer = null;
  let units = [];
  let revealIndex = 0;
  let blockCount = 0;
  let onProgress = null;
  let locked = false;
  let prevBlockIds = new Set();

  const BLOCK_LIVE_LABELS = {
    action_takeoff: '正在寫入起飛指令…',
    action_land: '正在配置降落流程…',
    move_forward: '正在規劃前進路線…',
    turn_left: '正在調整左轉邏輯…',
    turn_right: '正在調整右轉邏輯…',
    control_repeat: '正在建立迴圈結構…',
    control_if_obstacle: '正在加入避障條件…',
    control_repeat_until_target: '正在設定重複直到終點…',
    control_if: '正在組合條件判斷…',
    sensor_obstacle: '正在連接感測積木…',
  };

  function directChild(parent, tagName) {
    if (!parent?.children) return null;
    for (const child of parent.children) {
      if (child.nodeName === tagName || child.tagName === tagName) return child;
    }
    return null;
  }

  function directNextBlock(blockEl) {
    const next = directChild(blockEl, 'next');
    return next ? directChild(next, 'block') : null;
  }

  function stripBlockNext(blockEl) {
    const clone = blockEl.cloneNode(true);
    Array.from(clone.children).forEach((el) => {
      if (el.nodeName === 'next' || el.tagName === 'next') el.remove();
    });
    return clone;
  }

  function collectChainUnits(firstBlock) {
    const list = [];
    let node = firstBlock;
    while (node) {
      list.push(stripBlockNext(node));
      node = directNextBlock(node);
    }
    return list;
  }

  function parseSolutionUnits(solutionXmlString) {
    if (!solutionXmlString || !global.Blockly) return [];
    try {
      const wrapped = `<xml>${solutionXmlString.replace(/<block /, '<block x="40" y="40" ')}</xml>`;
      const dom = global.Blockly.utils.xml.textToDom(wrapped);
      const start = dom.querySelector('block[type="event_start"]')
        || dom.getElementsByTagName('block')[0];
      if (!start) return [];
      const first = directNextBlock(start);
      return first ? collectChainUnits(first) : [];
    } catch (err) {
      console.warn('[BattleCpuCoder] parseSolutionUnits failed', err);
      return [];
    }
  }

  function getBlockType(blockEl) {
    return blockEl?.getAttribute?.('type') || 'unknown';
  }

  function getLiveLabel(blockEl) {
    const type = getBlockType(blockEl);
    if (BLOCK_LIVE_LABELS[type]) return BLOCK_LIVE_LABELS[type];
    if (type.includes('move')) return '正在調整移動積木…';
    if (type.includes('turn')) return '正在調整轉向邏輯…';
    if (type.includes('control')) return '正在組合控制流程…';
    return '正在拼接程式積木…';
  }

  function buildXmlForUnits(stepUnits, count) {
    const capped = Math.max(0, Math.min(count, stepUnits.length));
    if (capped === 0) {
      return '<xml><block type="event_start" x="40" y="40"></block></xml>';
    }

    let chain = '';
    for (let i = capped - 1; i >= 0; i--) {
      const blockStr = new XMLSerializer().serializeToString(stepUnits[i]);
      if (chain) {
        chain = blockStr.replace(/<\/block>\s*$/, `<next>${chain}</next></block>`);
      } else {
        chain = blockStr;
      }
    }
    return `<xml><block type="event_start" x="40" y="40"><next>${chain}</next></block></xml>`;
  }

  function ensureWorkspace() {
    if (cpuWorkspace) return cpuWorkspace;
    const host = document.getElementById('battleCpuBlockly');
    if (!host || !global.Blockly) return null;
    cpuWorkspace = global.Blockly.inject(host, {
      readOnly: true,
      scrollbars: true,
      zoom: { controls: false, wheel: false, startScale: 0.88, maxScale: 0.88, minScale: 0.88 },
      move: { scrollbars: true, drag: false, wheel: false },
      renderer: 'zelos',
      theme: global.Blockly.Themes?.Zelos,
    });
    return cpuWorkspace;
  }

  function resizeWorkspace() {
    if (!cpuWorkspace) return;
    global.Blockly?.svgResize?.(cpuWorkspace);
    const host = document.getElementById('battleCpuBlockly');
    if (host && host.offsetHeight < 40) {
      host.style.minHeight = '120px';
    }
  }

  function scrollWorkspaceToEnd(ws) {
    if (!ws?.getMetrics || !ws.scroll) return;
    const m = ws.getMetrics();
    ws.scroll(m.contentHeight + 80, m.contentWidth / 2);
  }

  function pulseTyping(blockEl) {
    const shell = document.getElementById('battleCpuBlocklyHost');
    const feed = document.getElementById('battleCpuLiveFeed');
    const sub = document.getElementById('battleCpuHeadSub');
    if (feed) feed.textContent = blockEl ? getLiveLabel(blockEl) : '正在初始化程式…';
    if (sub) sub.textContent = '編寫中…';
    if (shell) {
      shell.classList.remove('battle-cpu-typing');
      void shell.offsetWidth;
      shell.classList.add('battle-cpu-typing');
      shell.dataset.revealed = String(revealIndex);
    }
  }

  function highlightNewBlocks(ws) {
    if (!ws) return;
    const currentIds = new Set(ws.getAllBlocks(false).map((b) => b.id));
    currentIds.forEach((id) => {
      if (prevBlockIds.has(id)) return;
      const block = ws.getBlockById(id);
      const svg = block?.getSvgRoot?.();
      if (svg) {
        svg.classList.add('battle-cpu-new-block');
        setTimeout(() => svg.classList.remove('battle-cpu-new-block'), 520);
      }
    });
    prevBlockIds = currentIds;
  }

  function loadRevealStep(count) {
    const ws = ensureWorkspace();
    if (!ws) return false;
    const blockEl = count > 0 ? units[count - 1] : null;
    const xml = buildXmlForUnits(units, count);
    ws.clear();
    try {
      global.Blockly.Xml.domToWorkspace(global.Blockly.utils.xml.textToDom(xml), ws);
    } catch (err) {
      console.warn('[BattleCpuCoder] domToWorkspace failed', err);
      return false;
    }
    blockCount = global.FlightSimulator?.countBlocks?.(ws) || Math.max(0, count);
    onProgress?.(blockCount);
    const countEl = document.getElementById('battleCpuBlockCount');
    if (countEl) countEl.textContent = `積木 +${blockCount}`;
    pulseTyping(blockEl);
    highlightNewBlocks(ws);
    resizeWorkspace();
    scrollWorkspaceToEnd(ws);
    return true;
  }

  function clearTimers() {
    if (revealTimer) {
      clearInterval(revealTimer);
      revealTimer = null;
    }
    if (startTimeout) {
      clearTimeout(startTimeout);
      startTimeout = null;
    }
    if (layoutReadyTimer) {
      clearTimeout(layoutReadyTimer);
      layoutReadyTimer = null;
    }
  }

  function beginRevealLoop(profile, seconds) {
    const feed = document.getElementById('battleCpuLiveFeed');
    resizeWorkspace();

    if (!units.length) {
      if (feed) feed.textContent = '本關無參考程式';
      return;
    }

    const startDelay = profile?.startDelay || 0;
    const speed = profile?.speedMultiplier || 1;
    const budgetMs = Math.max(1000, seconds * 1000 - startDelay);
    const revealMs = Math.max(420, budgetMs / units.length / speed);

    startTimeout = setTimeout(() => {
      startTimeout = null;
      if (feed) feed.textContent = '開始自動編程…';
      loadRevealStep(0);
      revealIndex = 0;
      revealTimer = setInterval(() => {
        if (locked) {
          clearTimers();
          return;
        }
        if (revealIndex >= units.length) {
          clearTimers();
          if (feed) feed.textContent = '程式組裝完成';
          return;
        }
        revealIndex += 1;
        loadRevealStep(revealIndex);
      }, revealMs);
    }, startDelay);
  }

  function runAfterLayoutReady(fn) {
    let tries = 0;
    const tick = () => {
      tries += 1;
      const host = document.getElementById('battleCpuBlockly');
      const stack = document.getElementById('battleDualStack');
      const ready = stack?.classList.contains('show')
        && host
        && host.offsetWidth > 80
        && host.offsetHeight > 60;
      if (ready || tries >= 30) {
        resizeWorkspace();
        fn();
        return;
      }
      layoutReadyTimer = setTimeout(tick, 50);
    };
    requestAnimationFrame(() => requestAnimationFrame(tick));
  }

  function start({ level, profile, seconds, onProgress: progressCb } = {}) {
    clearTimers();
    locked = false;
    onProgress = progressCb || null;
    units = level?.solutionXml ? parseSolutionUnits(level.solutionXml()) : [];
    revealIndex = 0;
    blockCount = 0;
    prevBlockIds = new Set();

    if (cpuWorkspace) {
      cpuWorkspace.dispose();
      cpuWorkspace = null;
    }
    const host = document.getElementById('battleCpuBlockly');
    if (host) host.innerHTML = '';

    const hostShell = document.getElementById('battleCpuBlocklyHost');
    if (hostShell) {
      hostShell.classList.remove('hidden');
      hostShell.dataset.revealed = '0';
    }

    const countEl = document.getElementById('battleCpuBlockCount');
    const feed = document.getElementById('battleCpuLiveFeed');
    const sub = document.getElementById('battleCpuHeadSub');
    if (countEl) countEl.textContent = '積木 +0';
    if (feed) feed.textContent = '正在分析賽道…';
    if (sub) sub.textContent = '分析中…';

    runAfterLayoutReady(() => beginRevealLoop(profile, seconds));
  }

  function lock() {
    locked = true;
    clearTimers();
    if (units.length && revealIndex < units.length) {
      loadRevealStep(units.length);
      revealIndex = units.length;
    }
    const feed = document.getElementById('battleCpuLiveFeed');
    if (feed) feed.textContent = '程式已鎖定';
    const sub = document.getElementById('battleCpuHeadSub');
    if (sub) sub.textContent = '待出擊';
  }

  function hide() {
    const hostShell = document.getElementById('battleCpuBlocklyHost');
    if (hostShell) hostShell.classList.add('hidden');
  }

  function resize() {
    resizeWorkspace();
  }

  function dispose() {
    clearTimers();
    locked = false;
    units = [];
    revealIndex = 0;
    blockCount = 0;
    prevBlockIds = new Set();
    onProgress = null;
    if (cpuWorkspace) {
      cpuWorkspace.dispose();
      cpuWorkspace = null;
    }
    const host = document.getElementById('battleCpuBlockly');
    if (host) host.innerHTML = '';
    const countEl = document.getElementById('battleCpuBlockCount');
    const feed = document.getElementById('battleCpuLiveFeed');
    if (countEl) countEl.textContent = '積木 +0';
    if (feed) feed.textContent = '待機中...';
    hide();
  }

  function getBlockCount() {
    return blockCount;
  }

  global.BattleCpuCoder = {
    start,
    lock,
    hide,
    dispose,
    resize,
    getBlockCount,
  };
}(window));
