import * as BABYLON from '@babylonjs/core';
import { Atmosphere, AtmospherePhysicalProperties } from '@babylonjs/addons/atmosphere';

window.BABYLON = BABYLON;
window.BabylonAtmosphere = {
  Atmosphere,
  AtmospherePhysicalProperties,
  IsSupported: Atmosphere.IsSupported.bind(Atmosphere),
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

await loadScript('/js/mission-weather.js');
await loadScript('/js/mission-progress.js');
await loadScript('/js/mission-feedback.js');
await loadScript('/js/mission-tutorial.js');
await loadScript('/js/mission-route.js');
await loadScript('/js/mission-mode.js');
await loadScript('/js/app.js');
