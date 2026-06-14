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

  function buildObjectives(state, mission, helpers) {
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

    const firstPending = items.find((item) => !item.done && !item.optional);
    return items.map((item) => ({
      ...item,
      highlight: firstPending && item.id === firstPending.id,
    }));
  }

  function getNextPendingObjectiveLabel(state, mission, helpers) {
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
  };
}(window));
