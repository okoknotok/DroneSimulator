/**
 * 任務教學卡與提示階梯
 */
(function (global) {
  let hintIndex = 0;

  function getHintSteps(mission) {
    if (Array.isArray(mission?.hintSteps) && mission.hintSteps.length) return mission.hintSteps;
    if (mission?.tutorial) return [mission.tutorial];
    return ['先從「起飛」開始，再依任務目標逐步拼接積木。'];
  }

  function resetHints() {
    hintIndex = 0;
  }

  function getCurrentHint(mission) {
    const steps = getHintSteps(mission);
    return steps[Math.min(hintIndex, steps.length - 1)];
  }

  function nextHint(mission) {
    const steps = getHintSteps(mission);
    hintIndex = Math.min(hintIndex + 1, steps.length - 1);
    return getCurrentHint(mission);
  }

  function prevHint(mission) {
    hintIndex = Math.max(0, hintIndex - 1);
    return getCurrentHint(mission);
  }

  function renderTutorialCard(mission, chapter) {
    const panel = document.getElementById('missionTutorial');
    if (!panel || !mission) return;
    const steps = getHintSteps(mission);
    const concept = mission.conceptLabel || global.MissionProgress?.CONCEPT_LABELS?.[mission.concept] || mission.concept || '編程任務';
    panel.classList.add('show');
    panel.innerHTML = `
      <div class="mission-tutorial-head">
        <div>
          <div class="mission-tutorial-kicker">教學卡 · ${concept}</div>
          <strong>${chapter?.icon || '📘'} ${mission.title}</strong>
        </div>
        <button type="button" onclick="MissionTutorial.hide()">關閉</button>
      </div>
      <div class="mission-tutorial-steps">
        ${steps.map((step, index) => `
          <div class="mission-tutorial-step ${index === hintIndex ? 'active' : ''} ${index < hintIndex ? 'done' : ''}">
            <span>${index + 1}</span>
            <p>${step}</p>
          </div>
        `).join('')}
      </div>
      <div class="mission-tutorial-actions">
        <button type="button" onclick="MissionTutorial.prev()">上一步</button>
        <button type="button" onclick="MissionTutorial.next()">下一步提示</button>
        <button type="button" class="primary" onclick="MissionTutorial.hide()">開始拼積木</button>
      </div>
    `;
  }

  function renderHintBar(mission) {
    const dock = document.getElementById('missionGuideDock');
    if (!dock || !mission) return;
    global.MissionMode?.refreshGuideHint?.();
  }

  function hideHintBar() {
    /* hint merged into mission guide dock */
  }

  function hideTutorialCard() {
    document.getElementById('missionTutorial')?.classList.remove('show');
    document.body.classList.remove('mission-tutorial-open');
  }

  function showForMission(mission, chapter, { showCard = false } = {}) {
    resetHints();
    global.MissionMode?.hideProfile?.();
    if (showCard) renderTutorialCard(mission, chapter);
    else hideTutorialCard();
    renderHintBar(mission);
    global.MissionMode?.renderGuideDock?.();
  }

  function checkWorkspaceStep(mission, workspace) {
    if (!workspace || !mission?.tutorialChecks) return null;
    const blocks = workspace.getAllBlocks(false);
    const types = new Set(blocks.map((block) => block.type));
    return mission.tutorialChecks.find((rule) => !types.has(rule.block)) || null;
  }

  function getHintMeta(mission) {
    const steps = getHintSteps(mission);
    return {
      index: hintIndex + 1,
      total: steps.length,
      text: getCurrentHint(mission),
    };
  }

  global.MissionTutorial = {
    resetHints,
    getCurrentHint,
    getHintMeta,
    next: () => {
      const mission = global.MissionMode?.getCurrentMission?.();
      if (!mission) return;
      nextHint(mission);
      global.MissionMode?.renderGuideDock?.();
      renderTutorialCard(mission, global.MissionMode?.getCurrentChapter?.());
    },
    prev: () => {
      const mission = global.MissionMode?.getCurrentMission?.();
      if (!mission) return;
      prevHint(mission);
      global.MissionMode?.renderGuideDock?.();
      renderTutorialCard(mission, global.MissionMode?.getCurrentChapter?.());
    },
    showForMission,
    hide: () => {
      hideTutorialCard();
    },
    hideAll: () => {
      hideTutorialCard();
      hideHintBar();
    },
    renderHintBar,
    checkWorkspaceStep,
  };
}(window));
