/**
 * 任務模式天氣模組 — 使用 @babylonjs/addons Atmosphere 物理大氣散射
 * 使用方式：MissionWeather.apply({ scene, root, theme })
 */
(function (global) {
  const MAP = { halfW: 11, halfD: 9 };

  const profiles = {
    campus: {
      label: '☀️ 晴朗 · 物理天空',
      useAtmosphere: true,
      sky: { top: [0.42, 0.68, 0.98], bottom: [0.78, 0.9, 1] },
      lighting: { hemi: 0.72, dir: 1.05, diffuse: [1, 0.98, 0.9], ground: [0.52, 0.58, 0.4] },
      particle: null,
    },
    rescue: {
      label: '🌫️ 揚塵霾 · 大氣散射',
      useAtmosphere: true,
      sky: { top: [0.38, 0.24, 0.16], bottom: [0.55, 0.36, 0.24] },
      lighting: { hemi: 0.48, dir: 0.72, diffuse: [0.95, 0.7, 0.5], ground: [0.3, 0.22, 0.16] },
      particle: { kind: 'smog', ashCap: 180, ashRate: 62, smokeCap: 60, smokeRate: 18 },
    },
    farm: {
      label: '💨 強風 · 遠景薄霧',
      useAtmosphere: true,
      sky: { top: [0.52, 0.72, 0.92], bottom: [0.72, 0.88, 0.98] },
      lighting: { hemi: 0.78, dir: 0.82, diffuse: [0.9, 0.98, 0.88], ground: [0.38, 0.54, 0.3] },
      particle: { kind: 'wind', cap: 200, emitRate: 86 },
    },
    warehouse: {
      label: '🏭 室內',
      useAtmosphere: false,
      fog: { color: [0.08, 0.1, 0.14], density: 0.006 },
      lighting: { hemi: 0.44, dir: 0.38, diffuse: [0.86, 0.9, 1], ground: [0.16, 0.18, 0.24] },
      particle: { kind: 'indoor', cap: 120, emitRate: 32 },
    },
    space: {
      label: '🌌 真空 · 深空',
      useAtmosphere: true,
      sky: { top: [0.02, 0.04, 0.12], bottom: [0.05, 0.08, 0.18] },
      lighting: { hemi: 0.3, dir: 0.34, diffuse: [0.78, 0.88, 1], ground: [0.06, 0.08, 0.16] },
      particle: { kind: 'stars', cap: 160, emitRate: 48 },
    },
    night: {
      label: '🌙 夜間警報 · 低照度',
      useAtmosphere: true,
      sky: { top: [0.04, 0.06, 0.14], bottom: [0.08, 0.1, 0.2] },
      lighting: { hemi: 0.22, dir: 0.28, diffuse: [0.55, 0.68, 0.95], ground: [0.08, 0.1, 0.18] },
      particle: { kind: 'indoor', cap: 40, emitRate: 12 },
    },
    coast: {
      label: '🌊 海濱 · 海風',
      useAtmosphere: true,
      sky: { top: [0.35, 0.62, 0.92], bottom: [0.62, 0.82, 0.98] },
      lighting: { hemi: 0.82, dir: 0.95, diffuse: [0.95, 0.98, 1], ground: [0.72, 0.68, 0.48] },
      particle: { kind: 'spray', cap: 140, emitRate: 52 },
    },
    sunset: {
      label: '🌅 黃昏 · 畢業時刻',
      useAtmosphere: true,
      sky: { top: [0.42, 0.28, 0.48], bottom: [0.95, 0.55, 0.32] },
      lighting: { hemi: 0.58, dir: 0.72, diffuse: [1, 0.82, 0.62], ground: [0.48, 0.38, 0.28] },
      particle: { kind: 'spray', cap: 80, emitRate: 28 },
    },
    volcano: {
      label: '🌋 火山灰 · 橙紅天空',
      useAtmosphere: true,
      sky: { top: [0.38, 0.14, 0.08], bottom: [0.62, 0.28, 0.12] },
      lighting: { hemi: 0.52, dir: 0.68, diffuse: [1, 0.72, 0.48], ground: [0.28, 0.16, 0.1] },
      particle: { kind: 'smog', ashCap: 200, ashRate: 72, smokeCap: 80, smokeRate: 24 },
    },
    lab: {
      label: '🔬 實驗室 · 冷光室內',
      useAtmosphere: false,
      fog: { color: [0.06, 0.1, 0.16], density: 0.005 },
      lighting: { hemi: 0.48, dir: 0.42, diffuse: [0.75, 0.88, 1], ground: [0.12, 0.16, 0.24] },
      particle: { kind: 'indoor', cap: 80, emitRate: 22 },
    },
  };

  let state = {
    scene: null,
    root: null,
    particles: [],
    nodes: [],
    baseLighting: null,
    skyDome: null,
    atmosphere: null,
    savedCameraState: null,
    savedClearColor: null,
    usingAtmosphere: false,
  };

  function getProfile(theme) {
    return profiles[theme] || profiles.campus;
  }

  function getAtmosphereApi() {
    return global.BabylonAtmosphere || null;
  }

  function getDirectionalLight(scene) {
    const named = scene.getLightByName('d');
    if (named && named.getClassName?.() === 'DirectionalLight') return named;
    return scene.lights.find((light) => light.getClassName?.() === 'DirectionalLight') || null;
  }

  function cacheBaseLighting(scene) {
    if (state.baseLighting) return;
    const hemi = scene.getLightByName('h');
    const dirL = scene.getLightByName('d');
    if (!hemi || !dirL) return;
    state.baseLighting = {
      hemiIntensity: hemi.intensity,
      hemiDiffuse: hemi.diffuse.clone(),
      hemiGround: hemi.groundColor.clone(),
      dirIntensity: dirL.intensity,
      dirDiffuse: dirL.diffuse?.clone?.() || hemi.diffuse.clone(),
    };
  }

  function applyLighting(scene, profile) {
    cacheBaseLighting(scene);
    const hemi = scene.getLightByName('h');
    const dirL = scene.getLightByName('d');
    if (!hemi || !dirL || !profile.lighting) return;
    hemi.intensity = profile.lighting.hemi ?? state.baseLighting.hemiIntensity;
    dirL.intensity = profile.lighting.dir ?? state.baseLighting.dirIntensity;
    if (profile.lighting.diffuse) {
      hemi.diffuse = new BABYLON.Color3(profile.lighting.diffuse[0], profile.lighting.diffuse[1], profile.lighting.diffuse[2]);
      if (dirL.diffuse) dirL.diffuse = hemi.diffuse.clone();
    }
    if (profile.lighting.ground) {
      hemi.groundColor = new BABYLON.Color3(profile.lighting.ground[0], profile.lighting.ground[1], profile.lighting.ground[2]);
    }
  }

  function applyFog(scene, profile) {
    if (state.usingAtmosphere) {
      scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
      return;
    }
    if (profile.fog) {
      scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
      scene.fogDensity = profile.fog.density;
      scene.fogColor = new BABYLON.Color3(profile.fog.color[0], profile.fog.color[1], profile.fog.color[2]);
      return;
    }
    scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
  }

  function buildAtmosphereOptions(theme, profile) {
    const api = getAtmosphereApi();
    if (!api) return null;
    const { AtmospherePhysicalProperties } = api;
    const props = new AtmospherePhysicalProperties();
    const options = {
      physicalProperties: props,
      originHeight: 0,
      // 小型地圖（幾十公尺）不適合行星級天空合成，會變成全黑；只保留空氣透視。
      skyRenderingGroup: -1,
      globeAtmosphereRenderingGroup: -1,
      aerialPerspectiveRenderingGroup: 0,
      isSkyViewLutEnabled: false,
      isAerialPerspectiveLutEnabled: true,
      isDiffuseSkyIrradianceLutEnabled: true,
      applyApproximateTransmittance: true,
      exposure: 1.0,
      aerialPerspectiveIntensity: 1.0,
      aerialPerspectiveSaturation: 1.0,
      aerialPerspectiveTransmittanceScale: 1.0,
      multiScatteringIntensity: 1.0,
      groundAlbedo: new BABYLON.Color3(0.45, 0.5, 0.38),
    };

    if (theme === 'campus') {
      options.exposure = 1.15;
      options.aerialPerspectiveIntensity = 0.75;
      options.groundAlbedo = new BABYLON.Color3(0.49, 0.58, 0.4);
    } else if (theme === 'rescue') {
      props.mieScatteringScale = 4.2;
      props.mieAbsorptionScale = 2.6;
      props.rayleighScatteringScale = 0.7;
      options.exposure = 0.68;
      options.aerialPerspectiveIntensity = 3.1;
      options.aerialPerspectiveSaturation = 0.48;
      options.aerialPerspectiveTransmittanceScale = 0.58;
      options.multiScatteringIntensity = 1.55;
      options.groundAlbedo = new BABYLON.Color3(0.45, 0.28, 0.18);
    } else if (theme === 'farm') {
      props.mieScatteringScale = 1.35;
      options.exposure = 1.05;
      options.aerialPerspectiveIntensity = 1.25;
      options.aerialPerspectiveSaturation = 0.82;
      options.groundAlbedo = new BABYLON.Color3(0.38, 0.54, 0.3);
    } else if (theme === 'coast') {
      props.mieScatteringScale = 1.1;
      options.exposure = 1.12;
      options.aerialPerspectiveIntensity = 1.05;
      options.aerialPerspectiveSaturation = 0.9;
      options.groundAlbedo = new BABYLON.Color3(0.72, 0.68, 0.48);
    } else if (theme === 'sunset') {
      props.mieScatteringScale = 2.4;
      props.rayleighScatteringScale = 0.85;
      options.exposure = 0.78;
      options.aerialPerspectiveIntensity = 1.8;
      options.aerialPerspectiveSaturation = 0.72;
      options.groundAlbedo = new BABYLON.Color3(0.48, 0.38, 0.28);
    } else if (theme === 'space' || theme === 'night') {
      props.rayleighScatteringScale = theme === 'night' ? 0.12 : 0.04;
      props.mieScatteringScale = 0.02;
      options.exposure = theme === 'night' ? 0.42 : 0.22;
      options.aerialPerspectiveIntensity = theme === 'night' ? 0.55 : 0.35;
      options.diffuseSkyIrradianceIntensity = theme === 'night' ? 0.28 : 0.12;
      options.minimumMultiScatteringColor = new BABYLON.Color3(0.02, 0.04, 0.1);
      options.minimumMultiScatteringIntensity = 0.92;
      options.groundAlbedo = new BABYLON.Color3(theme === 'night' ? 0.1 : 0.06, theme === 'night' ? 0.12 : 0.08, theme === 'night' ? 0.22 : 0.16);
    } else if (profile.lighting?.ground) {
      const g = profile.lighting.ground;
      options.groundAlbedo = new BABYLON.Color3(g[0], g[1], g[2]);
    }

    return options;
  }

  function prepareSceneForAtmosphere(scene, profile) {
    const camera = scene.activeCamera;
    if (!camera) return false;
    state.savedCameraState = { maxZ: camera.maxZ };
    state.savedClearColor = scene.clearColor.clone();
    camera.maxZ = 0;
    if (profile.sky?.bottom) {
      const sky = profile.sky.bottom;
      scene.clearColor = new BABYLON.Color4(sky[0], sky[1], sky[2], 1);
    }
    scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
    return true;
  }

  function restoreSceneFromAtmosphere(scene) {
    const camera = scene?.activeCamera;
    if (camera && state.savedCameraState) {
      camera.maxZ = state.savedCameraState.maxZ;
    }
    if (scene && state.savedClearColor) {
      scene.clearColor = state.savedClearColor.clone();
    }
    state.savedCameraState = null;
    state.savedClearColor = null;
  }

  function disposeAtmosphere() {
    if (state.atmosphere) {
      try { state.atmosphere.dispose(); } catch (error) { console.warn(error); }
      state.atmosphere = null;
    }
    if (state.usingAtmosphere && state.scene) {
      restoreSceneFromAtmosphere(state.scene);
    }
    state.usingAtmosphere = false;
  }

  function applyAtmosphere(scene, theme, profile) {
    disposeAtmosphere();
    if (!profile.useAtmosphere) return false;

    const api = getAtmosphereApi();
    if (!api?.Atmosphere || !api.IsSupported(scene.getEngine())) return false;

    const dirLight = getDirectionalLight(scene);
    if (!dirLight || !prepareSceneForAtmosphere(scene, profile)) return false;

    const options = buildAtmosphereOptions(theme, profile);
    if (!options) return false;

    try {
      state.atmosphere = new api.Atmosphere('missionAtmosphere', scene, [dirLight], options);
      state.usingAtmosphere = true;
      return true;
    } catch (error) {
      console.warn('MissionWeather: Atmosphere 初始化失敗，改用備援天氣', error);
      restoreSceneFromAtmosphere(scene);
      return false;
    }
  }

  function colorToCss([r, g, b]) {
    const to255 = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255);
    return `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`;
  }

  function createSkyDome(scene, root, sky) {
    if (!sky) return;
    const dome = BABYLON.MeshBuilder.CreateSphere('weatherSkyDome', {
      diameter: 90,
      segments: 32,
      sideOrientation: BABYLON.Mesh.BACKSIDE,
    }, scene);
    dome.parent = root;
    dome.position.y = 4;
    dome.isPickable = false;
    dome.infiniteDistance = true;
    const mat = new BABYLON.StandardMaterial('weatherSkyDomeMat', scene);
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    mat.disableDepthWrite = true;
    const texture = new BABYLON.DynamicTexture('weatherSkyGradient', { width: 4, height: 256 }, scene, false);
    const context = texture.getContext();
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, colorToCss(sky.top));
    gradient.addColorStop(1, colorToCss(sky.bottom));
    context.fillStyle = gradient;
    context.fillRect(0, 0, 4, 256);
    texture.update();
    texture.coordinatesMode = BABYLON.Texture.SPHERICAL_MODE;
    mat.emissiveTexture = texture;
    mat.diffuseTexture = texture;
    mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    mat.alpha = state.usingAtmosphere ? 0.92 : 0.72;
    dome.material = mat;
    dome.renderingGroupId = 0;
    state.skyDome = dome;
    state.nodes.push(dome);
  }

  function createTexture(scene, name, type) {
    const size = 128;
    const texture = new BABYLON.DynamicTexture(name, { width: size, height: size }, scene, false);
    const context = texture.getContext();
    context.clearRect(0, 0, size, size);
    if (type === 'streak') {
      const gradient = context.createLinearGradient(8, size / 2, size - 8, size / 2);
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.95)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(8, size / 2 - 12, size - 16, 24);
    } else if (type === 'smoke') {
      const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2 - 2);
      gradient.addColorStop(0, 'rgba(90,60,40,0.42)');
      gradient.addColorStop(0.4, 'rgba(120,80,55,0.22)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    } else if (type === 'grain') {
      const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, 8);
      gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    } else if (type === 'spark') {
      const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2 - 4);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    }
    texture.hasAlpha = true;
    texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
    texture.update();
    return texture;
  }

  function createEmitter(scene, root, name, y, x = 0) {
    const emitter = BABYLON.MeshBuilder.CreateBox(name, { size: 0.1 }, scene);
    emitter.isVisible = false;
    emitter.position = new BABYLON.Vector3(x, y, 0);
    emitter.parent = root;
    state.nodes.push(emitter);
    return emitter;
  }

  function setVolume(system, yMin, yMax) {
    system.minEmitBox = new BABYLON.Vector3(-MAP.halfW, yMin, -MAP.halfD);
    system.maxEmitBox = new BABYLON.Vector3(MAP.halfW, yMax, MAP.halfD);
  }

  function startSystem(system) {
    system.preWarmCycles = 12;
    system.preWarmStepOffset = 0.1;
    system.isBillboardBased = true;
    system.start();
    state.particles.push(system);
  }

  function spawnParticles(scene, root, def) {
    if (!def) return;
    if (def.kind === 'smog') createSmogWeather(scene, root, def);
    else if (def.kind === 'wind') createWindWeather(scene, root, def);
    else if (def.kind === 'indoor') createIndoorWeather(scene, root, def);
    else if (def.kind === 'stars') createStarWeather(scene, root, def);
    else if (def.kind === 'spray') createSprayWeather(scene, root, def);
  }

  function createSprayWeather(scene, root, def) {
    const emitter = createEmitter(scene, root, 'weatherSpray', 0.2, -MAP.halfW + 1);
    const system = new BABYLON.ParticleSystem('weatherSprayParticles', def.cap, scene);
    system.particleTexture = createTexture(scene, 'weatherSprayTexture', 'spark');
    system.emitter = emitter;
    system.minEmitBox = new BABYLON.Vector3(0, -0.2, -MAP.halfD);
    system.maxEmitBox = new BABYLON.Vector3(0.4, 0.6, MAP.halfD);
    system.color1 = new BABYLON.Color4(0.75, 0.92, 1, 0.55);
    system.color2 = new BABYLON.Color4(0.9, 0.98, 1, 0.12);
    system.colorDead = new BABYLON.Color4(0.9, 0.98, 1, 0);
    system.minSize = 0.08;
    system.maxSize = 0.22;
    system.minLifeTime = 1.2;
    system.maxLifeTime = 2.8;
    system.emitRate = def.emitRate;
    system.minEmitPower = 1.4;
    system.maxEmitPower = 2.6;
    system.direction1 = new BABYLON.Vector3(2.4, 0.04, -0.1);
    system.direction2 = new BABYLON.Vector3(3.2, 0.12, 0.1);
    system.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    startSystem(system);
  }

  function createSmogWeather(scene, root, def) {
    const ash = createEmitter(scene, root, 'weatherAsh', 0.45);
    const ashSystem = new BABYLON.ParticleSystem('weatherAshParticles', def.ashCap, scene);
    ashSystem.particleTexture = createTexture(scene, 'weatherAshTexture', 'grain');
    ashSystem.emitter = ash;
    setVolume(ashSystem, 0.08, 1.4);
    ashSystem.color1 = new BABYLON.Color4(0.78, 0.58, 0.38, 0.38);
    ashSystem.color2 = new BABYLON.Color4(0.62, 0.45, 0.3, 0.08);
    ashSystem.colorDead = new BABYLON.Color4(0.62, 0.45, 0.3, 0);
    ashSystem.minSize = 0.05;
    ashSystem.maxSize = 0.14;
    ashSystem.minLifeTime = 3.5;
    ashSystem.maxLifeTime = 7;
    ashSystem.emitRate = def.ashRate;
    ashSystem.minEmitPower = 0.22;
    ashSystem.maxEmitPower = 0.62;
    ashSystem.direction1 = new BABYLON.Vector3(0.45, 0.06, -0.2);
    ashSystem.direction2 = new BABYLON.Vector3(0.85, 0.18, 0.2);
    ashSystem.gravity = new BABYLON.Vector3(0, 0.008, 0);
    ashSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    startSystem(ashSystem);

    const smoke = createEmitter(scene, root, 'weatherSmoke', 0.9);
    const smokeSystem = new BABYLON.ParticleSystem('weatherSmokeParticles', def.smokeCap, scene);
    smokeSystem.particleTexture = createTexture(scene, 'weatherSmokeTexture', 'smoke');
    smokeSystem.emitter = smoke;
    setVolume(smokeSystem, 0.2, 2.2);
    smokeSystem.color1 = new BABYLON.Color4(0.55, 0.36, 0.22, 0.32);
    smokeSystem.color2 = new BABYLON.Color4(0.45, 0.28, 0.18, 0.06);
    smokeSystem.colorDead = new BABYLON.Color4(0.45, 0.28, 0.18, 0);
    smokeSystem.minSize = 0.35;
    smokeSystem.maxSize = 0.95;
    smokeSystem.minLifeTime = 4;
    smokeSystem.maxLifeTime = 8;
    smokeSystem.emitRate = def.smokeRate;
    smokeSystem.minEmitPower = 0.08;
    smokeSystem.maxEmitPower = 0.22;
    smokeSystem.direction1 = new BABYLON.Vector3(0.3, 0.05, -0.12);
    smokeSystem.direction2 = new BABYLON.Vector3(0.55, 0.14, 0.12);
    smokeSystem.gravity = new BABYLON.Vector3(0, 0.012, 0);
    smokeSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    startSystem(smokeSystem);
  }

  function createWindWeather(scene, root, def) {
    const emitter = createEmitter(scene, root, 'weatherWind', 1.2);
    const system = new BABYLON.ParticleSystem('weatherWindParticles', def.cap, scene);
    system.particleTexture = createTexture(scene, 'weatherWindTexture', 'streak');
    system.emitter = emitter;
    setVolume(system, 0.35, 2.4);
    system.color1 = new BABYLON.Color4(0.82, 0.98, 1, 0.5);
    system.color2 = new BABYLON.Color4(0.88, 1, 0.9, 0.12);
    system.colorDead = new BABYLON.Color4(0.88, 1, 0.9, 0);
    system.minSize = 0.42;
    system.maxSize = 1.05;
    system.minLifeTime = 2.2;
    system.maxLifeTime = 4.8;
    system.emitRate = Math.round(def.emitRate * 0.55);
    system.minEmitPower = 1.6;
    system.maxEmitPower = 2.8;
    system.direction1 = new BABYLON.Vector3(2.6, 0.02, -0.12);
    system.direction2 = new BABYLON.Vector3(3.8, 0.1, 0.12);
    system.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    startSystem(system);

    const front = createEmitter(scene, root, 'weatherWindFront', 1.1, -MAP.halfW + 0.4);
    const frontSystem = new BABYLON.ParticleSystem('weatherWindFrontParticles', Math.round(def.cap * 0.45), scene);
    frontSystem.particleTexture = createTexture(scene, 'weatherWindFrontTexture', 'streak');
    frontSystem.emitter = front;
    frontSystem.minEmitBox = new BABYLON.Vector3(0, -0.55, -MAP.halfD);
    frontSystem.maxEmitBox = new BABYLON.Vector3(0.35, 0.55, MAP.halfD);
    frontSystem.color1 = new BABYLON.Color4(0.9, 1, 0.95, 0.62);
    frontSystem.color2 = new BABYLON.Color4(0.9, 1, 0.95, 0.14);
    frontSystem.colorDead = new BABYLON.Color4(0.9, 1, 0.95, 0);
    frontSystem.minSize = 0.5;
    frontSystem.maxSize = 1.2;
    frontSystem.minLifeTime = 2.5;
    frontSystem.maxLifeTime = 5.2;
    frontSystem.emitRate = Math.round(def.emitRate * 0.45);
    frontSystem.minEmitPower = 2.2;
    frontSystem.maxEmitPower = 3.4;
    frontSystem.direction1 = new BABYLON.Vector3(3.2, 0.03, -0.08);
    frontSystem.direction2 = new BABYLON.Vector3(4.2, 0.12, 0.08);
    frontSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    startSystem(frontSystem);
  }

  function createIndoorWeather(scene, root, def) {
    const emitter = createEmitter(scene, root, 'weatherIndoor', 2.2);
    const system = new BABYLON.ParticleSystem('weatherIndoorParticles', def.cap, scene);
    system.particleTexture = createTexture(scene, 'weatherIndoorTexture', 'grain');
    system.emitter = emitter;
    setVolume(system, 0.8, 3.4);
    system.color1 = new BABYLON.Color4(0.94, 0.96, 1, 0.32);
    system.color2 = new BABYLON.Color4(0.94, 0.96, 1, 0.06);
    system.colorDead = new BABYLON.Color4(0.94, 0.96, 1, 0);
    system.minSize = 0.1;
    system.maxSize = 0.24;
    system.minLifeTime = 5;
    system.maxLifeTime = 10;
    system.emitRate = def.emitRate;
    system.minEmitPower = 0.02;
    system.maxEmitPower = 0.08;
    system.direction1 = new BABYLON.Vector3(-0.06, -0.03, -0.05);
    system.direction2 = new BABYLON.Vector3(0.06, 0.03, 0.05);
    system.gravity = new BABYLON.Vector3(0, -0.004, 0);
    system.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    startSystem(system);
  }

  function createStarWeather(scene, root, def) {
    const emitter = createEmitter(scene, root, 'weatherStars', 2.6);
    const system = new BABYLON.ParticleSystem('weatherStarsParticles', def.cap, scene);
    system.particleTexture = createTexture(scene, 'weatherStarsTexture', 'spark');
    system.emitter = emitter;
    setVolume(system, 1.2, 4.8);
    system.color1 = new BABYLON.Color4(0.88, 0.94, 1, 0.72);
    system.color2 = new BABYLON.Color4(1, 1, 1, 0.18);
    system.colorDead = new BABYLON.Color4(1, 1, 1, 0);
    system.minSize = 0.06;
    system.maxSize = 0.18;
    system.minLifeTime = 1.2;
    system.maxLifeTime = 2.8;
    system.emitRate = def.emitRate;
    system.minEmitPower = 0.02;
    system.maxEmitPower = 0.08;
    system.direction1 = new BABYLON.Vector3(-0.03, -0.01, -0.03);
    system.direction2 = new BABYLON.Vector3(0.03, 0.01, 0.03);
    system.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    startSystem(system);
  }

  function dispose() {
    disposeAtmosphere();
    state.particles.forEach((system) => {
      try { system.stop(); system.dispose(); } catch (error) { console.warn(error); }
    });
    state.nodes.forEach((node) => node.dispose && node.dispose());
    state.particles = [];
    state.nodes = [];
    state.skyDome = null;
    state.scene = null;
    state.root = null;
  }

  function resetAtmosphere(scene) {
    if (!scene) return;
    disposeAtmosphere();
    const hemi = scene.getLightByName('h');
    const dirL = scene.getLightByName('d');
    if (state.baseLighting) {
      if (hemi) {
        hemi.intensity = state.baseLighting.hemiIntensity;
        hemi.diffuse = state.baseLighting.hemiDiffuse;
        hemi.groundColor = state.baseLighting.hemiGround;
      }
      if (dirL) {
        dirL.intensity = state.baseLighting.dirIntensity;
        if (dirL.diffuse && state.baseLighting.dirDiffuse) dirL.diffuse = state.baseLighting.dirDiffuse;
      }
    }
    scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
  }

  function apply({ scene, root, theme, override = null }) {
    dispose();
    state.scene = scene;
    state.root = root;
    const effectiveTheme = override && profiles[override] ? override : theme;
    const profile = getProfile(effectiveTheme);
    applyLighting(scene, profile);
    applyAtmosphere(scene, effectiveTheme, profile);
    applyFog(scene, profile);
    if (profile.sky) {
      createSkyDome(scene, root, profile.sky);
    }
    spawnParticles(scene, root, profile.particle);
    return { ...profile, theme: effectiveTheme };
  }

  global.MissionWeather = {
    apply,
    dispose,
    resetAtmosphere,
    getProfile,
    profiles,
    isAtmosphereActive: () => state.usingAtmosphere,
  };
}(window));
