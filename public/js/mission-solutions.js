/**
 * 任務模式參考答案 — 依任務資料自動規劃路線，複雜關卡使用覆寫解法
 */
(function initMissionSolutions(global) {
  const MISSION_FAIL_ANSWER_THRESHOLD = 10;

  function B(type, fields = {}, statements = {}, values = {}, next = null) {
    let xml = `<block type="${type}">`;
    Object.entries(fields).forEach(([k, v]) => { xml += `<field name="${k}">${v}</field>`; });
    Object.entries(values).forEach(([k, v]) => { xml += `<value name="${k}">${v}</value>`; });
    Object.entries(statements).forEach(([k, v]) => { if (v) xml += `<statement name="${k}">${v}</statement>`; });
    if (next) xml += `<next>${next}</next>`;
    xml += '</block>';
    return xml;
  }

  function chain(...items) {
    if (!items.length) return '';
    let result = null;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (typeof item === 'string') { result = item; continue; }
      result = B(item.type, item.fields || {}, item.statements || {}, item.values || {}, result);
    }
    return result;
  }

  function toSolutionXml(blocks) {
    const inner = typeof blocks === 'string' ? blocks : chain(...blocks);
    return `<xml>${inner.replace(/<block /, '<block x="40" y="40" ')}</xml>`;
  }

  const TK = { type: 'action_takeoff' };
  const LD = { type: 'action_land' };
  const TL = { type: 'turn_left' };
  const TR = { type: 'turn_right' };
  const F = (n) => ({ type: 'move_forward', fields: { STEPS: n } });
  const V_DANGER = '<block type="mission_danger_ahead"></block>';
  const V_HEAT = '<block type="mission_heat_ahead"></block>';

  function isBlockedCell(mission, x, z) {
    return (mission.objects || []).some((o) => o.x === x && o.z === z
      && (o.type === 'hazard' || o.type === 'lava' || o.type === 'heat' || o.type === 'volcano'));
  }

  function dirToFaceDelta(dir) {
    const rad = dir * Math.PI / 180;
    return { dx: Math.round(Math.cos(rad)), dz: Math.round(-Math.sin(rad)) };
  }

  function turnSteps(fromDir, toDir) {
    const diff = ((toDir - fromDir) % 360 + 360) % 360;
    if (diff === 0) return [];
    if (diff === 90) return [{ type: 'turn_right' }];
    if (diff === 270) return [{ type: 'turn_left' }];
    return [{ type: 'turn_right' }, { type: 'turn_right' }];
  }

  function faceDir(currentDir, targetDir) {
    return { blocks: turnSteps(currentDir, targetDir), dir: targetDir };
  }

  function moveForward(steps) {
    return steps > 0 ? [{ type: 'move_forward', fields: { STEPS: steps } }] : [];
  }

  function navigate(pos, targetX, targetZ, mission) {
    const blocks = [];
    let { x, z, dir } = pos;
    const dx = targetX - x;
    const dz = targetZ - z;

    if (dx !== 0) {
      const eastDir = dx > 0 ? 0 : 180;
      const turn = faceDir(dir, eastDir);
      blocks.push(...turn.blocks);
      dir = turn.dir;
      const steps = Math.abs(dx);
      const nextX = x + (dx > 0 ? steps : -steps);
      if (!isBlockedCell(mission, nextX, z)) {
        blocks.push(...moveForward(steps));
        x = nextX;
      }
    }

    if (dz !== 0) {
      const southDir = dz < 0 ? 90 : 270;
      const turn = faceDir(dir, southDir);
      blocks.push(...turn.blocks);
      dir = turn.dir;
      const steps = Math.abs(dz);
      const nextZ = z + (dz < 0 ? -steps : steps);
      if (!isBlockedCell(mission, x, nextZ)) {
        blocks.push(...moveForward(steps));
        z = nextZ;
      }
    }

    return { blocks, pos: { x, z, dir } };
  }

  function buildWaypoints(mission) {
    const success = mission.success || {};
    const points = [];

    if (mission.phases?.length) {
      mission.phases.forEach((phase) => {
        (phase.objectives || []).forEach((key) => {
          if (key.startsWith('scan:')) {
            const label = key.slice(5);
            const obj = (mission.objects || []).find((o) => o.type === 'scan' && o.label === label);
            if (obj) points.push({ ...obj, action: 'mission_scan' });
          } else if (key.startsWith('sample:')) {
            const label = key.slice(7);
            const obj = (mission.objects || []).find((o) => o.type === 'sample' && o.label === label);
            if (obj) points.push({ ...obj, action: 'mission_sample' });
          } else if (key.startsWith('report:')) {
            const label = key.slice(7);
            const obj = (mission.objects || []).find((o) => o.type === 'report' && o.label === label);
            if (obj) points.push({ ...obj, action: 'mission_report' });
          } else if (key === 'picked') {
            const obj = (mission.objects || []).find((o) => o.type === 'pickup');
            if (obj) points.push({ ...obj, action: 'mission_pickup' });
          } else if (key === 'delivered') {
            const obj = (mission.objects || []).find((o) => o.type === 'dropoff');
            if (obj) points.push({ ...obj, action: 'mission_dropoff' });
          }
        });
      });
      return points;
    }

    (mission.objects || []).forEach((obj) => {
      if (obj.type === 'scan' && (success.scanAll || success.scans)) {
        points.push({ ...obj, action: 'mission_scan' });
      }
    });

    if (success.collected) {
      (mission.objects || []).filter((o) => o.type === 'collect').forEach((obj) => {
        points.push({ ...obj, action: 'mission_collect' });
      });
    }

    if (success.samples || success.sampleAll) {
      (mission.objects || []).filter((o) => o.type === 'sample').forEach((obj) => {
        points.push({ ...obj, action: 'mission_sample' });
      });
    }

    if (success.picked) {
      const pickup = (mission.objects || []).find((o) => o.type === 'pickup');
      if (pickup) points.push({ ...pickup, action: 'mission_pickup' });
    }

    if (success.delivered) {
      const drop = (mission.objects || []).find((o) => o.type === 'dropoff');
      if (drop) points.push({ ...drop, action: 'mission_dropoff' });
    }

    if (success.reports || success.reportAll) {
      (mission.objects || []).filter((o) => o.type === 'report').forEach((obj) => {
        points.push({ ...obj, action: 'mission_report' });
      });
    }

    if (success.photos) {
      const photoTarget = mission.photoAt
        ? (mission.objects || []).find((o) => o.label === mission.photoAt)
        : (mission.objects || []).find((o) => o.type === 'scan');
      if (photoTarget) points.push({ ...photoTarget, action: 'mission_photo' });
    }

    return points;
  }

  function generateSolution(mission) {
    if (!mission?.start) return null;
    const success = mission.success || {};
    const blocks = [TK];
    let pos = { x: mission.start.x, z: mission.start.z, dir: mission.start.dir || 0 };

    buildWaypoints(mission).forEach((wp) => {
      const nav = navigate(pos, wp.x, wp.z, mission);
      blocks.push(...nav.blocks);
      pos = nav.pos;
      blocks.push({ type: wp.action });
    });

    const dest = success.returnToBase ? mission.start : (mission.target || mission.start);
    if (dest) {
      const nav = navigate(pos, dest.x, dest.z, mission);
      blocks.push(...nav.blocks);
      pos = nav.pos;
    }

    if (success.landed !== false) blocks.push(LD);
    return toSolutionXml([{ type: 'event_start' }, ...blocks]);
  }

  const OVERRIDES = {
    'rescue-3': toSolutionXml([
      { type: 'event_start' },
      TK,
      {
        type: 'mission_repeat_until_done',
        statements: {
          DO: chain({
            type: 'control_if',
            values: { COND: V_DANGER },
            statements: { DO: chain(TR, F(1)), ELSE: chain(F(1)) },
          }, { type: 'mission_scan' }),
        },
      },
      LD,
    ]),

    'space-3': toSolutionXml([
      { type: 'event_start' },
      TK,
      {
        type: 'mission_repeat_until_done',
        statements: {
          DO: chain(F(1), { type: 'mission_scan' }, { type: 'mission_collect' }, TR),
        },
      },
      LD,
    ]),

    'volcano-2': toSolutionXml([
      { type: 'event_start' },
      TK,
      {
        type: 'mission_repeat_until_done',
        statements: {
          DO: chain({
            type: 'control_if',
            values: { COND: V_HEAT },
            statements: { DO: chain(TL, F(1)), ELSE: chain(F(1)) },
          }, { type: 'mission_sample' }),
        },
      },
      F(2),
      { type: 'mission_report' },
      LD,
    ]),
  };

  function getSolutionXml(mission) {
    if (!mission) return null;
    if (typeof mission.solutionXml === 'string' && mission.solutionXml.trim()) {
      return mission.solutionXml.trim();
    }
    if (OVERRIDES[mission.id]) return OVERRIDES[mission.id];
    return generateSolution(mission);
  }

  function hasSolution(mission) {
    return Boolean(getSolutionXml(mission));
  }

  global.MissionSolutions = {
    MISSION_FAIL_ANSWER_THRESHOLD,
    getSolutionXml,
    hasSolution,
    generateSolution,
    toSolutionXml,
  };
}(window));
