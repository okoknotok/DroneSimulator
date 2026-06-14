/**
 * 任務路線記錄與動畫回放
 */
(function (global) {
  let routeMesh = null;
  let timelineEl = null;
  let ghostDrone = null;
  let replaying = false;

  function createEmptyRoute() {
    return { points: [], actions: [] };
  }

  function recordPosition(route, state, action, STEP) {
    if (!route) return;
    const point = { x: state.x * STEP, z: state.z * STEP, action, moves: state.moves };
    const last = route.points[route.points.length - 1];
    if (!last || last.x !== point.x || last.z !== point.z) {
      route.points.push(point);
    }
    route.actions.push({
      step: route.actions.length + 1,
      action,
      x: state.x,
      z: state.z,
      moves: state.moves,
    });
  }

  function clearRouteVisual(scene) {
    if (routeMesh) {
      routeMesh.dispose();
      routeMesh = null;
    }
    if (ghostDrone) {
      ghostDrone.dispose();
      ghostDrone = null;
    }
    if (timelineEl) timelineEl.remove();
    timelineEl = null;
  }

  function renderRoute(scene, root, route, STEP) {
    clearRouteVisual(scene);
    if (!scene || !route?.points?.length) return;

    const points = route.points.map((point, index) => {
      const y = 0.12 + (index % 2) * 0.02;
      return new BABYLON.Vector3(point.x, y, point.z);
    });

    if (points.length >= 2) {
      routeMesh = BABYLON.MeshBuilder.CreateLines('missionRouteReplay', { points }, scene);
      routeMesh.color = new BABYLON.Color3(0.2, 0.85, 1);
      routeMesh.parent = root;
    }

    const panel = document.getElementById('missionReplay');
    if (!panel) return;
    panel.classList.add('show');
    panel.innerHTML = `
      <div class="mission-replay-head">
        <strong>路線回放</strong>
        <span>${route.actions.length} 步</span>
        <button type="button" onclick="MissionMode.replayRoute(true)">▶ 動畫</button>
        <button type="button" onclick="MissionRoute.hide()">關閉</button>
      </div>
      <div class="mission-replay-timeline">
        ${route.actions.slice(-8).map((entry) => `
          <div class="mission-replay-step">
            <span>#${entry.step}</span>
            <strong>${entry.action}</strong>
            <em>(${entry.x}, ${entry.z})</em>
          </div>
        `).join('')}
      </div>
    `;
    timelineEl = panel;
  }

  function createGhostDrone(scene, root) {
    const body = BABYLON.MeshBuilder.CreateBox('missionGhostBody', { width: 0.55, height: 0.12, depth: 0.55 }, scene);
    body.parent = root;
    const mat = new BABYLON.StandardMaterial('missionGhostMat', scene);
    mat.diffuseColor = new BABYLON.Color3(0.2, 0.85, 1);
    mat.emissiveColor = new BABYLON.Color3(0.1, 0.45, 0.55);
    mat.alpha = 0.55;
    body.material = mat;
    body.position.y = 1.2;
    ghostDrone = body;
    return body;
  }

  async function replayAnimated(options = {}) {
    const {
      scene,
      root,
      route,
      STEP = 1.5,
      liveDrone = null,
      animate,
      onStep,
      stopCheck,
    } = options;
    if (replaying || !scene || !route?.points?.length || !animate) return false;
    replaying = true;
    const ghost = createGhostDrone(scene, root);
    if (liveDrone) liveDrone.setEnabled(false);

    const start = route.points[0];
    ghost.position.x = start.x;
    ghost.position.z = start.z;

    try {
      for (let i = 1; i < route.points.length; i++) {
        if (stopCheck?.()) break;
        const from = ghost.position.clone();
        const target = route.points[i];
        const to = new BABYLON.Vector3(target.x, 1.2, target.z);
        await animate((t) => BABYLON.Vector3.LerpToRef(from, to, t, ghost.position), 280);
        onStep?.(route.actions[i], i);
      }
    } finally {
      ghost.dispose();
      ghostDrone = null;
      if (liveDrone) liveDrone.setEnabled(true);
      replaying = false;
    }
    return true;
  }

  function hide() {
    document.getElementById('missionReplay')?.classList.remove('show');
  }

  function isReplaying() {
    return replaying;
  }

  global.MissionRoute = {
    createEmptyRoute,
    recordPosition,
    clearRouteVisual,
    renderRoute,
    replayAnimated,
    hide,
    isReplaying,
  };
}(window));
