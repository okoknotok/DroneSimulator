/**
 * 任務失敗回饋與目標清單
 */
(function (global) {
  const TASK_TYPES = ['scan', 'sample', 'report', 'pickup', 'dropoff', 'charger', 'collect'];

  function getTaskObjects(mission, type) {
    return (mission?.objects || []).filter((item) => item.type === type);
  }

  function getPendingLabels(mission, type, stateSet) {
    return getTaskObjects(mission, type)
      .filter((item) => !stateSet.has(item.label))
      .map((item) => item.label);
  }

  function isPhaseObjectiveDone(state, mission, objectiveKey, helpers) {
    if (!objectiveKey) return true;
    if (objectiveKey === 'photos') return state.photos >= (mission.success?.photos || 0);
    if (objectiveKey === 'picked') return state.cargo || state.delivered;
    if (objectiveKey === 'delivered') return state.delivered;
    if (objectiveKey === 'return') return helpers.isAtMissionTarget();
    if (objectiveKey === 'landed') return state.landed;
    const [type, label] = objectiveKey.split(':');
    if (type === 'scan') return state.scans.has(label);
    if (type === 'report') return state.reports.has(label);
    if (type === 'sample') return state.samples.has(label);
    if (type === 'pickup') return state.cargo || state.delivered;
    if (type === 'dropoff') return state.delivered;
    return false;
  }

  function phaseRequirementsMet(state, phase) {
    return (phase.requires || []).every((id) => state.phasesDone?.has(id));
  }

  function isPhaseComplete(state, mission, phase, helpers) {
    if (!phaseRequirementsMet(state, phase)) return false;
    return (phase.objectives || []).every((key) => isPhaseObjectiveDone(state, mission, key, helpers));
  }

  function getCurrentPhase(state, mission, helpers) {
    if (!mission?.phases?.length) return null;
    for (const phase of mission.phases) {
      if (!phaseRequirementsMet(state, phase)) return phase;
      if (!isPhaseComplete(state, mission, phase, helpers)) return phase;
    }
    return null;
  }

  function objectiveKeyForItem(item) {
    if (!item?.type || !item.label) return null;
    if (TASK_TYPES.includes(item.type)) return `${item.type}:${item.label}`;
    return null;
  }

  function isObjectiveActive(state, mission, item, helpers) {
    const phase = getCurrentPhase(state, mission, helpers);
    if (!phase) return true;
    const key = objectiveKeyForItem(item);
    if (!key) return true;
    return (phase.objectives || []).includes(key);
  }

  function formatScanLabel(mission, state) {
    const total = getTaskObjects(mission, 'scan').length;
    const pending = getPendingLabels(mission, 'scan', state.scans);
    if (!total) return null;
    if (pending.length === 1) return `掃描：「${pending[0]}」`;
    if (pending.length > 1) return `掃描：${pending.join('、')}（${state.scans.size}/${total}）`;
    return `掃描完成（${total}/${total}）`;
  }

  function formatReportLabel(mission, state) {
    const need = mission?.success?.reports || getTaskObjects(mission, 'report').length;
    const pending = getPendingLabels(mission, 'report', state.reports);
    if (!need) return null;
    if (pending.length === 1) return `到「${pending[0]}」回報數據`;
    if (pending.length > 1) return `回報：${pending.join('、')}（${state.reports.size}/${need}）`;
    return `回報完成（${need}/${need}）`;
  }

  function formatSampleLabel(mission, state) {
    const need = mission?.success?.samples || getTaskObjects(mission, 'sample').length;
    const pending = getPendingLabels(mission, 'sample', state.samples);
    if (!need) return null;
    if (pending.length === 1) return `到「${pending[0]}」採集樣本`;
    if (pending.length > 1) return `採樣：${pending.join('、')}（${state.samples.size}/${need}）`;
    return `採樣完成（${need}/${need}）`;
  }

  function getFailureReason(state, mission, helpers) {
    if (!mission) return '任務資料載入失敗，請重新選擇任務。';
    if (state.hitTimeout) return `超過限時 ${mission.timeLimitSec} 秒！請精簡路線或減少重複步數。`;
    if (state.hitNpc) return '撞到移動中的行人！請觀察巡邏路線，規劃避讓後再飛。';
    if (state.hitHazard) return '無人機進入危險區或電量耗盡，請調整路線或加入充電步驟。';

    const success = mission.success || {};
    const scanTotal = helpers.countObjects('scan');
    const collectTotal = helpers.countObjects('collect');

    if (success.scanAll && state.scans.size < scanTotal) {
      const pending = getPendingLabels(mission, 'scan', state.scans);
      return pending.length
        ? `尚未掃描：${pending.join('、')}。請移動到發光標記後執行「掃描任務點」。`
        : '仍有巡邏點未掃描，請檢查路線。';
    }

    if (success.collected && state.collected.size < success.collected) {
      const pending = getPendingLabels(mission, 'collect', state.collected);
      return pending.length
        ? `尚未收集：${pending.join('、')}。`
        : `仍需收集 ${success.collected - state.collected.size} 個物品。`;
    }

    const sampleTotal = success.samples || helpers.countObjects('sample');
    if ((success.sampleAll || success.samples) && state.samples.size < sampleTotal) {
      const pending = getPendingLabels(mission, 'sample', state.samples);
      return pending.length
        ? `尚未採集：${pending.join('、')}。請到綠色光柱執行「採集樣本」。`
        : `仍需採集 ${sampleTotal - state.samples.size} 份樣本。`;
    }

    const reportTotal = success.reports || helpers.countObjects('report');
    if ((success.reportAll || success.reports) && state.reports.size < reportTotal) {
      const pending = getPendingLabels(mission, 'report', state.reports);
      return pending.length
        ? `尚未回報：${pending.join('、')}。請到藍色光柱終端執行「回報數據」。`
        : `仍需回報 ${reportTotal - state.reports.size} 筆數據。`;
    }

    if (success.picked && !state.cargo && !state.delivered) {
      const pickup = getTaskObjects(mission, 'pickup')[0];
      return pickup
        ? `尚未完成取貨。請到「${pickup.label}」執行「取貨」。`
        : '尚未完成取貨。請移動到取貨區並執行「取貨」積木。';
    }

    if (success.delivered && !state.delivered) {
      const drop = getTaskObjects(mission, 'dropoff')[0];
      return drop
        ? `尚未完成送貨。請先到取貨區取貨，再到「${drop.label}」放貨。`
        : '尚未完成送貨。請先取貨，再到送貨平台執行「放貨」。';
    }

    if (success.photos && state.photos < success.photos) {
      const target = mission.photoAt || '任務點';
      return `需要在「${target}」拍照記錄，目前 ${state.photos}/${success.photos} 次。`;
    }

    if ((success.returnToBase || success.atTarget) && !helpers.isAtMissionTarget()) {
      return success.returnToBase
        ? '尚未返回基地。請回到起點後再嘗試降落。'
        : '尚未到達目標區域，請檢查前進步數與轉向。';
    }

    if (success.landed && !state.landed) {
      return '已到達目標附近，但尚未安全降落。請在終點執行「降落」。';
    }

    return '任務條件尚未全部達成，請對照下方目標清單調整積木。';
  }

  function buildPhaseItems(state, mission, helpers) {
    const phase = getCurrentPhase(state, mission, helpers);
    if (!phase) return null;
    const items = [];
    (phase.objectives || []).forEach((key) => {
      if (key.startsWith('scan:')) {
        const label = key.slice(5);
        items.push({ id: key, label: `掃描：「${label}」`, done: state.scans.has(label) });
      } else if (key.startsWith('report:')) {
        const label = key.slice(7);
        items.push({ id: key, label: `到「${label}」回報數據`, done: state.reports.has(label) });
      } else if (key.startsWith('sample:')) {
        const label = key.slice(7);
        items.push({ id: key, label: `到「${label}」採集樣本`, done: state.samples.has(label) });
      } else if (key === 'photos') {
        items.push({
          id: 'photos',
          label: `在「${mission.photoAt || '任務點'}」拍照（${state.photos}/${mission.success?.photos || 1}）`,
          done: state.photos >= (mission.success?.photos || 0),
        });
      } else if (key === 'picked') {
        const pickup = getTaskObjects(mission, 'pickup')[0];
        items.push({
          id: 'picked',
          label: pickup ? `到「${pickup.label}」取貨` : '完成取貨',
          done: state.cargo || state.delivered,
        });
      } else if (key === 'delivered') {
        const drop = getTaskObjects(mission, 'dropoff')[0];
        items.push({
          id: 'delivered',
          label: drop ? `到「${drop.label}」放貨` : '完成送貨',
          done: state.delivered,
        });
      } else if (key === 'return') {
        items.push({ id: 'return', label: '返回基地', done: helpers.isAtMissionTarget() });
      } else if (key === 'landed') {
        items.push({ id: 'landed', label: '安全降落', done: state.landed });
      }
    });
    if (phase.title) {
      items.unshift({ id: 'phase-title', label: `▶ ${phase.title}`, done: false, optional: true });
    }
    return items;
  }

  function getClosedGates(mission, state) {
    return (mission?.objects || []).filter(
      (item) => item.type === 'gate' && item.opensOn && item.opensOn !== 'always'
        && item.closed !== false && !state.gatesOpen?.has(item.label),
    );
  }

  function getGateHintText(gate, open = false) {
    if (open) return '已開啟，可通過';
    if (gate.hint) return gate.hint;
    const opensOn = gate.opensOn;
    if (opensOn?.startsWith('scan:')) return `掃描「${opensOn.slice(5)}」後開啟`;
    if (opensOn === 'pickup') return '取貨後開啟';
    if (opensOn?.startsWith('report:')) return `回報「${opensOn.slice(7)}」後開啟`;
    if (opensOn === 'manual') return '到閘門前執行「開啟閘門」';
    return '完成條件後開啟';
  }

  function formatGateLabel(gate, state) {
    const open = state?.gatesOpen?.has(gate.label);
    if (open) return `✅「${gate.label}」已開啟，可通過`;
    return `🚧「${gate.label}」${getGateHintText(gate, false)}`;
  }

  function buildDefaultHintSteps(mission) {
    const steps = [];
    (mission?.phases || []).forEach((phase) => {
      if (phase.title) steps.push(`下一步建議：${phase.title.replace(/^第.+階段：/, '')}`);
    });
    if (mission?.goal) steps.push(`提示：${mission.goal}`);
    else if (mission?.brief) steps.push(`提示：${mission.brief}`);
    return steps.length ? steps : ['對照目標清單，先完成尚未打勾的項目。'];
  }

  function getProgressiveHint(mission, failCount, state, helpers) {
    if (failCount < 3) return null;
    const custom = mission?.hintSteps;
    const steps = custom?.length ? custom : buildDefaultHintSteps(mission);
    const phase = getCurrentPhase(state, mission, helpers);
    if (phase && !custom?.length) {
      const pending = (phase.objectives || []).find((key) => !isPhaseObjectiveDone(state, mission, key, helpers));
      if (pending) {
        if (pending.startsWith('scan:')) return `下一步建議：先掃描「${pending.slice(5)}」`;
        if (pending.startsWith('report:')) return `下一步建議：先到「${pending.slice(7)}」回報`;
        if (pending.startsWith('sample:')) return `下一步建議：先採集「${pending.slice(7)}」`;
        if (pending === 'picked') return '下一步建議：先到橙色取貨點取貨';
        if (pending === 'delivered') return '下一步建議：再到紫色放貨點放貨';
        if (pending === 'return') return '下一步建議：完成任務後回到起點';
        if (pending === 'landed') return '下一步建議：在起點執行降落';
      }
    }
    const idx = Math.min(failCount - 3, steps.length - 1);
    return steps[idx];
  }

  function buildObjectives(state, mission, helpers) {
    const phaseItems = buildPhaseItems(state, mission, helpers);
    if (phaseItems?.length) {
      const firstPending = phaseItems.find((item) => !item.done && !item.optional);
      const withNpc = [...phaseItems];
      if ((mission.objects || []).some((o) => o.type === 'npc')) {
        withNpc.push({ id: 'npc', label: '注意移動中的行人', done: false, optional: true });
      }
      const gates = getClosedGates(mission, state);
      if (gates.length) {
        gates.forEach((gate) => {
          withNpc.push({ id: `gate-${gate.label}`, label: formatGateLabel(gate, state), done: false, optional: true });
        });
      } else if ((mission.objects || []).some((o) => o.type === 'gate' && o.opensOn)) {
        withNpc.push({ id: 'gate-open', label: '✅ 通道閘門已開啟', done: true, optional: true });
      }
      return withNpc.map((item) => ({
        ...item,
        highlight: firstPending && item.id === firstPending.id,
      }));
    }

    const success = mission?.success || {};
    const scanTotal = helpers.countObjects('scan');
    const collectTotal = helpers.countObjects('collect');
    const sampleTotal = helpers.countObjects('sample');
    const reportTotal = helpers.countObjects('report');
    const items = [];

    const scanLabel = formatScanLabel(mission, state);
    if (scanLabel) {
      items.push({
        id: 'scan',
        label: scanLabel,
        done: state.scans.size >= scanTotal,
      });
    }
    if (collectTotal) {
      items.push({
        id: 'collect',
        label: `收集 ${state.collected.size}/${collectTotal}`,
        done: state.collected.size >= collectTotal,
      });
    }
    if (success.collected) {
      items.push({
        id: 'collect-count',
        label: `收集 ${state.collected.size}/${success.collected}`,
        done: state.collected.size >= success.collected,
      });
    }
    const sampleLabel = formatSampleLabel(mission, state);
    if (sampleLabel) {
      const need = success.samples || sampleTotal;
      items.push({
        id: 'samples',
        label: sampleLabel,
        done: state.samples.size >= need,
      });
    }
    const reportLabel = formatReportLabel(mission, state);
    if (reportLabel) {
      const need = success.reports || reportTotal;
      items.push({
        id: 'reports',
        label: reportLabel,
        done: state.reports.size >= need,
      });
    }
    if (success.picked) {
      const pickup = getTaskObjects(mission, 'pickup')[0];
      items.push({
        id: 'picked',
        label: pickup ? `到「${pickup.label}」取貨` : '完成取貨',
        done: state.cargo || state.delivered,
      });
    }
    if (success.delivered) {
      const drop = getTaskObjects(mission, 'dropoff')[0];
      items.push({
        id: 'delivered',
        label: drop ? `到「${drop.label}」放貨` : '完成送貨',
        done: state.delivered,
      });
    }
    if (success.photos) {
      const target = mission.photoAt || '任務點';
      items.push({
        id: 'photos',
        label: `在「${target}」拍照（${state.photos}/${success.photos}）`,
        done: state.photos >= success.photos,
      });
    }
    if (success.returnToBase || success.atTarget) {
      items.push({
        id: 'target',
        label: success.returnToBase ? '返回基地' : '到達目標區',
        done: helpers.isAtMissionTarget(),
      });
    }
    if (success.landed) {
      items.push({
        id: 'landed',
        label: '安全降落',
        done: state.landed,
      });
    }
    if ((mission.objects || []).some((o) => o.type === 'npc')) {
      items.push({
        id: 'npc',
        label: '注意移動中的行人',
        done: false,
        optional: true,
      });
    }
    getClosedGates(mission, state).forEach((gate) => {
      items.push({
        id: `gate-${gate.label}`,
        label: formatGateLabel(gate, state),
        done: false,
        optional: true,
      });
    });

    const firstPending = items.find((item) => !item.done && !item.optional);
    return items.map((item) => ({
      ...item,
      highlight: firstPending && item.id === firstPending.id,
    }));
  }

  function getNextPendingObjectiveLabel(state, mission, helpers) {
    const phase = getCurrentPhase(state, mission, helpers);
    if (phase) {
      const pendingKey = (phase.objectives || []).find((key) => !isPhaseObjectiveDone(state, mission, key, helpers));
      if (!pendingKey) return null;
      if (pendingKey.startsWith('scan:')) return pendingKey.slice(5);
      if (pendingKey.startsWith('report:')) return pendingKey.slice(7);
      if (pendingKey.startsWith('sample:')) return pendingKey.slice(7);
      if (pendingKey === 'photos') return mission.photoAt || getTaskObjects(mission, 'scan')[0]?.label || null;
      if (pendingKey === 'picked') return getTaskObjects(mission, 'pickup')[0]?.label || null;
      if (pendingKey === 'delivered') return getTaskObjects(mission, 'dropoff')[0]?.label || null;
      return null;
    }
    const items = buildObjectives(state, mission, helpers);
    const pending = items.find((item) => !item.done && !item.optional);
    if (!pending) return null;
    if (pending.id === 'scan') return getPendingLabels(mission, 'scan', state.scans)[0] || null;
    if (pending.id === 'reports') return getPendingLabels(mission, 'report', state.reports)[0] || null;
    if (pending.id === 'samples') return getPendingLabels(mission, 'sample', state.samples)[0] || null;
    if (pending.id === 'picked') return getTaskObjects(mission, 'pickup')[0]?.label || null;
    if (pending.id === 'delivered') return getTaskObjects(mission, 'dropoff')[0]?.label || null;
    if (pending.id === 'photos') return mission.photoAt || getTaskObjects(mission, 'scan')[0]?.label || null;
    return null;
  }

  function renderObjectivesHtml(items) {
    return items.map((item) => {
      const classes = [item.done ? 'done' : '', item.highlight ? 'pending' : ''].filter(Boolean).join(' ');
      return `<li class="${classes}">${item.label}</li>`;
    }).join('');
  }

  function renderObjectiveChips(items) {
    return items.map((item) => {
      const cls = item.done ? 'done' : item.highlight ? 'pending' : item.optional ? 'optional' : '';
      return `<span class="mission-objective-chip ${cls}">${item.label}</span>`;
    }).join('');
  }

  global.MissionFeedback = {
    getFailureReason,
    buildObjectives,
    getNextPendingObjectiveLabel,
    renderObjectivesHtml,
    renderObjectiveChips,
    getCurrentPhase,
    isPhaseComplete,
    isObjectiveActive,
    isPhaseObjectiveDone,
    getGateHintText,
    getProgressiveHint,
  };
}(window));
