import * as THREE from 'three';

export const WATER_PRESETS = {
  ocean: {
    size: 1000,
    resolution: 256,
    windSpeed: 15,
    waveHeight: 2,
    deepColor: new THREE.Color(0x001e3c),
    shallowColor: new THREE.Color(0x006994),
    foamIntensity: 1.0,
  },

  lake: {
    size: 200,
    resolution: 128,
    windSpeed: 5,
    waveHeight: 0.3,
    deepColor: new THREE.Color(0x002233),
    shallowColor: new THREE.Color(0x336677),
    foamIntensity: 0.3,
  },

  pool: {
    size: 20,
    resolution: 64,
    windSpeed: 1,
    waveHeight: 0.05,
    deepColor: new THREE.Color(0x0044aa),
    shallowColor: new THREE.Color(0x66ccff),
    foamIntensity: 0,
  },

  tropical: {
    size: 500,
    resolution: 192,
    windSpeed: 8,
    waveHeight: 0.8,
    deepColor: new THREE.Color(0x003355),
    shallowColor: new THREE.Color(0x00ccaa),
    foamIntensity: 0.8,
  },

  stormy: {
    size: 1000,
    resolution: 256,
    windSpeed: 30,
    waveHeight: 5,
    deepColor: new THREE.Color(0x001122),
    shallowColor: new THREE.Color(0x334455),
    foamIntensity: 2.0,
  },
};
