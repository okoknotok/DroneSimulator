(function initFlightSimulator(global) {
  const STEP = 1.5;
  const GRID_W = 18;
  const GRID_D = 14;
  const FLOOR_W = GRID_W * STEP;
  const FLOOR_D = GRID_D * STEP;

  const WIND_PUSH = {
    east: { dx: 1, dz: 0 },
    west: { dx: -1, dz: 0 },
    north: { dx: 0, dz: 1 },
    south: { dx: 0, dz: -1 },
  };

  const TIMING = {
    move: 350,
    turn: 300,
    takeoff: 600,
    land: 600,
    blockGap: 120,
    wind: 250,
  };

  function createEmptyStats() {
    return {
      tookOff: false,
      landed: false,
      atTarget: false,
      hitObstacle: false,
      totalMoves: 0,
      checkpointsVisitedCount: 0,
      checkpointsVisitedIndices: [],
      checkpointOrderCorrect: true,
      treasuresCollectedCount: 0,
      treasuresCollected: [],
    };
  }

  function dirToRotY(d) {
    return d * Math.PI / 180;
  }

  function obstacleOccupiesCell(o, gx, gz) {
    if (!o) return false;
    if (o.gx === gx && o.gz === gz) return true;
    if (o.type === 'laserBeam') {
      const dir = o.direction || 'horizontal';
      if (dir === 'horizontal') return o.gz === gz && Math.abs(o.gx - gx) === 1;
      return o.gx === gx && Math.abs(o.gz - gz) === 1;
    }
    return false;
  }

  function isSolidObstacleType(type) {
    return Boolean(type) && type !== 'chargingStation' && type !== 'windZone';
  }

  class FlightSimulator {
    constructor(level, options = {}) {
      this.level = level;
      this.obstacles = level.obstacles || [];
      this.startCell = { gx: level.start.gx, gz: level.start.gz };
      this.targetCell = { gx: level.target.gx, gz: level.target.gz };
      this.pos = { x: level.start.gx * STEP, z: level.start.gz * STEP };
      this.dir = level.start.dir;
      this.flying = false;
      this.crashed = false;
      this.stopRequested = false;
      this.stats = createEmptyStats();
      this.virtualTime = options.startDelay || 0;
      this.timeline = [];
      this.speedMultiplier = Math.max(0.25, options.speedMultiplier || 1);
      this.executionSpeed = Math.max(0.25, options.executionSpeed || 1);
    }

    addTime(ms) {
      const scaled = ms / this.speedMultiplier / this.executionSpeed;
      this.virtualTime += scaled;
      return scaled;
    }

    pushTimeline(event) {
      this.timeline.push({
        t: this.virtualTime,
        x: this.pos.x,
        z: this.pos.z,
        dir: this.dir,
        flying: this.flying,
        ...event,
      });
    }

    getForwardVector() {
      const rad = this.dir * Math.PI / 180;
      return { dx: Math.cos(rad), dz: -Math.sin(rad) };
    }

    checkBounds(x, z) {
      const m = 0.6;
      return x > -FLOOR_W / 2 + m && x < FLOOR_W / 2 - m && z > -FLOOR_D / 2 + m && z < FLOOR_D / 2 - m;
    }

    getCurrentCell() {
      return { gx: Math.round(this.pos.x / STEP), gz: Math.round(this.pos.z / STEP) };
    }

    isAtTarget() {
      const c = this.getCurrentCell();
      return c.gx === this.targetCell.gx && c.gz === this.targetCell.gz;
    }

    distanceToTarget() {
      const c = this.getCurrentCell();
      return Math.abs(c.gx - this.targetCell.gx) + Math.abs(c.gz - this.targetCell.gz);
    }

    getObstacleAt(gx, gz) {
      return this.obstacles.find((o) => obstacleOccupiesCell(o, gx, gz)) || null;
    }

    isSolidObstacleAt(gx, gz) {
      const obstacle = this.getObstacleAt(gx, gz);
      return isSolidObstacleType(obstacle?.type || null);
    }

    getWindZoneAt(gx, gz) {
      return this.obstacles.find((o) => o.type === 'windZone' && o.gx === gx && o.gz === gz) || null;
    }

    obstacleAhead() {
      const v = this.getForwardVector();
      const cur = this.getCurrentCell();
      const ng = { gx: cur.gx + Math.round(v.dx), gz: cur.gz + Math.round(v.dz) };
      return this.isSolidObstacleAt(ng.gx, ng.gz);
    }

    checkCheckpointAt(gx, gz) {
      const checkpoints = this.level.checkpoints || [];
      checkpoints.forEach((cp, idx) => {
        if (cp.gx !== gx || cp.gz !== gz) return;
        if (this.stats.checkpointsVisitedIndices.includes(idx)) return;
        const expectedIdx = this.stats.checkpointsVisitedCount;
        if (idx !== expectedIdx) this.stats.checkpointOrderCorrect = false;
        this.stats.checkpointsVisitedIndices.push(idx);
        this.stats.checkpointsVisitedCount++;
      });
    }

    checkTreasureAt(gx, gz) {
      const treasures = this.level.treasures || [];
      treasures.forEach((t, idx) => {
        if (t.gx === gx && t.gz === gz && !this.stats.treasuresCollected.includes(idx)) {
          this.stats.treasuresCollected.push(idx);
          this.stats.treasuresCollectedCount++;
        }
      });
    }

    takeoff() {
      if (this.flying || this.crashed || this.stopRequested) return;
      this.flying = true;
      this.stats.tookOff = true;
      this.addTime(TIMING.takeoff);
      this.pushTimeline({ event: 'takeoff' });
    }

    land() {
      if (!this.flying || this.crashed || this.stopRequested) return;
      this.addTime(TIMING.land);
      this.flying = false;
      this.stats.landed = true;
      if (this.isAtTarget()) this.stats.atTarget = true;
      this.pushTimeline({ event: 'land' });
    }

    applyWindDrift() {
      const cell = this.getCurrentCell();
      const wind = this.getWindZoneAt(cell.gx, cell.gz);
      if (!wind) return true;
      const push = WIND_PUSH[wind.direction || 'east'] || WIND_PUSH.east;
      const tx = this.pos.x + push.dx * STEP;
      const tz = this.pos.z + push.dz * STEP;
      const pgx = Math.round(tx / STEP);
      const pgz = Math.round(tz / STEP);
      if (!this.checkBounds(tx, tz) || this.isSolidObstacleAt(pgx, pgz)) {
        this.stats.hitObstacle = true;
        this.crashed = true;
        this.pushTimeline({ event: 'crash', reason: 'wind' });
        return false;
      }
      this.addTime(TIMING.wind);
      this.pos.x = tx;
      this.pos.z = tz;
      this.stats.totalMoves++;
      this.checkCheckpointAt(pgx, pgz);
      this.checkTreasureAt(pgx, pgz);
      if (this.isAtTarget()) this.stats.atTarget = true;
      this.pushTimeline({ event: 'wind' });
      return true;
    }

    move(sign) {
      if (this.crashed || this.stopRequested) return false;
      if (!this.flying) this.takeoff();
      const v = this.getForwardVector();
      const tx = this.pos.x + v.dx * sign * STEP;
      const tz = this.pos.z + v.dz * sign * STEP;
      const ngx = Math.round(tx / STEP);
      const ngz = Math.round(tz / STEP);
      if (!this.checkBounds(tx, tz)) return false;
      if (this.isSolidObstacleAt(ngx, ngz)) {
        this.stats.hitObstacle = true;
        this.crashed = true;
        this.pushTimeline({ event: 'crash', reason: 'obstacle' });
        return false;
      }
      this.addTime(TIMING.move);
      this.pos.x = tx;
      this.pos.z = tz;
      this.stats.totalMoves++;
      this.checkCheckpointAt(ngx, ngz);
      this.checkTreasureAt(ngx, ngz);
      if (this.isAtTarget()) this.stats.atTarget = true;
      this.pushTimeline({ event: sign > 0 ? 'forward' : 'backward' });
      if (!this.crashed) this.applyWindDrift();
      return !this.crashed;
    }

    moveSide(sign) {
      if (this.crashed || this.stopRequested) return false;
      if (!this.flying) this.takeoff();
      const rad = (this.dir + (sign > 0 ? 90 : -90)) * Math.PI / 180;
      const tx = this.pos.x + Math.cos(rad) * STEP;
      const tz = this.pos.z - Math.sin(rad) * STEP;
      const ngx = Math.round(tx / STEP);
      const ngz = Math.round(tz / STEP);
      if (!this.checkBounds(tx, tz)) return false;
      if (this.isSolidObstacleAt(ngx, ngz)) {
        this.stats.hitObstacle = true;
        this.crashed = true;
        this.pushTimeline({ event: 'crash', reason: 'obstacle' });
        return false;
      }
      this.addTime(TIMING.move);
      this.pos.x = tx;
      this.pos.z = tz;
      this.stats.totalMoves++;
      this.checkCheckpointAt(ngx, ngz);
      this.checkTreasureAt(ngx, ngz);
      if (this.isAtTarget()) this.stats.atTarget = true;
      this.pushTimeline({ event: sign > 0 ? 'right' : 'left' });
      if (!this.crashed) this.applyWindDrift();
      return !this.crashed;
    }

    turn(angle) {
      if (this.crashed || this.stopRequested) return;
      if (!this.flying) this.takeoff();
      this.addTime(TIMING.turn);
      this.dir = ((this.dir + angle) % 360 + 360) % 360;
      this.pushTimeline({ event: 'turn', angle });
    }

    evalValueBlock(block) {
      if (!block) return false;
      const cell = this.getCurrentCell();
      switch (block.type) {
        case 'sense_obstacle_ahead': return this.obstacleAhead();
        case 'sense_at_target': return this.isAtTarget();
        case 'sense_all_collected': {
          const treasures = this.level.treasures || [];
          if (!treasures.length) return true;
          return this.stats.treasuresCollectedCount >= treasures.length;
        }
        case 'sense_distance': return this.distanceToTarget();
        case 'sense_current_x': return cell.gx;
        case 'sense_current_z': return cell.gz;
        case 'sense_current_direction': return this.dir;
        case 'sense_at_checkpoint':
          return Boolean((this.level.checkpoints || []).some((cp) => cp.gx === cell.gx && cp.gz === cell.gz));
        default: return false;
      }
    }

    execBlock(block) {
      if (!block || this.stopRequested || this.crashed) return;
      switch (block.type) {
        case 'event_start': break;
        case 'action_takeoff': this.takeoff(); break;
        case 'action_land': this.land(); break;
        case 'action_wait': this.addTime(parseInt(block.getFieldValue('MS'), 10) || 0); break;
        case 'action_set_speed':
          this.executionSpeed = Math.max(0.25, Number(block.getFieldValue('SPEED')) || 1);
          break;
        case 'move_forward': {
          const n = parseInt(block.getFieldValue('STEPS'), 10);
          for (let i = 0; i < n; i++) {
            if (this.stopRequested || this.crashed) break;
            if (!this.move(1)) break;
          }
          break;
        }
        case 'move_backward': {
          const n = parseInt(block.getFieldValue('STEPS'), 10);
          for (let i = 0; i < n; i++) {
            if (this.stopRequested || this.crashed) break;
            if (!this.move(-1)) break;
          }
          break;
        }
        case 'move_left': {
          const n = parseInt(block.getFieldValue('STEPS'), 10);
          for (let i = 0; i < n; i++) {
            if (this.stopRequested || this.crashed) break;
            if (!this.moveSide(-1)) break;
          }
          break;
        }
        case 'move_right': {
          const n = parseInt(block.getFieldValue('STEPS'), 10);
          for (let i = 0; i < n; i++) {
            if (this.stopRequested || this.crashed) break;
            if (!this.moveSide(1)) break;
          }
          break;
        }
        case 'turn_left': this.turn(-90); break;
        case 'turn_right': this.turn(90); break;
        case 'control_repeat': {
          const times = parseInt(block.getFieldValue('TIMES'), 10);
          const inner = block.getInputTargetBlock('DO');
          for (let i = 0; i < times; i++) {
            if (this.stopRequested || this.crashed) break;
            if (this.stats.tookOff && !this.flying) break;
            this.execChain(inner);
          }
          break;
        }
        case 'control_repeat_until_target': {
          const inner = block.getInputTargetBlock('DO');
          let safety = 0;
          while (!this.isAtTarget() && safety < 300 && !this.stopRequested && !this.crashed) {
            if (this.stats.tookOff && !this.flying) break;
            this.execChain(inner);
            safety++;
          }
          break;
        }
        case 'control_repeat_forever': {
          const inner = block.getInputTargetBlock('DO');
          let safety = 0;
          while (safety < 800 && !this.stopRequested && !this.crashed) {
            if (this.stats.tookOff && !this.flying) break;
            this.execChain(inner);
            safety++;
          }
          break;
        }
        case 'control_if': {
          const condBlock = block.getInputTargetBlock('COND');
          const cond = this.evalValueBlock(condBlock);
          if (cond) this.execChain(block.getInputTargetBlock('DO'));
          else this.execChain(block.getInputTargetBlock('ELSE'));
          break;
        }
        case 'control_if_obstacle':
          if (this.obstacleAhead()) this.execChain(block.getInputTargetBlock('DO'));
          else this.execChain(block.getInputTargetBlock('ELSE'));
          break;
        default: break;
      }
      this.addTime(TIMING.blockGap);
    }

    execChain(block) {
      while (block && !this.stopRequested && !this.crashed) {
        if (this.stats.tookOff && !this.flying
          && block.type !== 'event_start'
          && block.type !== 'action_takeoff'
          && block.type !== 'action_wait') break;
        this.execBlock(block);
        block = block.getNextBlock();
      }
    }

    runWorkspace(workspace) {
      const startBlock = workspace.getTopBlocks(true).find((b) => b.type === 'event_start');
      if (!startBlock) return this.getResult(false, 'no_start');
      this.pushTimeline({ event: 'start' });
      this.execChain(startBlock);
      return this.getResult();
    }

    getResult(forcedFail = false, reason = '') {
      const success = !forcedFail && !this.crashed && Boolean(this.level.check?.(this.stats));
      return {
        success,
        stats: { ...this.stats },
        moves: this.stats.totalMoves,
        elapsed: this.virtualTime,
        timeline: [...this.timeline],
        distanceToTarget: this.distanceToTarget(),
        pos: { ...this.pos },
        dir: this.dir,
        reason,
      };
    }
  }

  function countBlocks(workspace) {
    if (!workspace) return 0;
    return workspace.getAllBlocks(false).filter((b) => b.type !== 'event_start').length;
  }

  function simulateProgram(level, workspace, options = {}) {
    const sim = new FlightSimulator(level, options);
    return sim.runWorkspace(workspace);
  }

  function simulateFromSolutionXml(level, solutionXml, options = {}) {
    if (!global.Blockly || !solutionXml) {
      return { success: false, moves: 0, elapsed: 0, timeline: [], blockCount: 0, stats: createEmptyStats(), distanceToTarget: 999, reason: 'no_solution' };
    }
    const host = document.createElement('div');
    host.style.display = 'none';
    document.body.appendChild(host);
    const tempWorkspace = global.Blockly.inject(host, {
      readOnly: true,
      scrollbars: false,
      zoom: { controls: false, wheel: false, startScale: 0.7 },
      move: { scrollbars: false, drag: false, wheel: false },
    });
    try {
      const xml = `<xml>${solutionXml.replace(/<block /, '<block x="40" y="40" ')}</xml>`;
      global.Blockly.Xml.domToWorkspace(global.Blockly.utils.xml.textToDom(xml), tempWorkspace);
      const blockCount = countBlocks(tempWorkspace);
      const result = simulateProgram(level, tempWorkspace, options);
      return { ...result, blockCount };
    } finally {
      tempWorkspace.dispose();
      host.remove();
    }
  }

  global.FlightSimulator = {
    STEP,
    TIMING,
    createEmptyStats,
    FlightSimulator,
    countBlocks,
    simulateProgram,
    simulateFromSolutionXml,
    dirToRotY,
  };
})(window);
