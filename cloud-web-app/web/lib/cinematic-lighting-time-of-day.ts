// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
import * as THREE from 'three';

// ============================================================================
// TIME OF DAY SYSTEM
// ============================================================================

export interface TimeOfDayConfig {
  latitude: number;
  longitude: number;
  timezone: number;
  date: Date;

  sunColor: THREE.Color;
  skyColor: THREE.Color;
  ambientColor: THREE.Color;

  sunIntensity: number;
  skyIntensity: number;
  ambientIntensity: number;

  fogColor: THREE.Color;
  fogDensity: number;
}

export class TimeOfDaySystem {
  private config: TimeOfDayConfig;
  private sunLight: THREE.DirectionalLight;
  private skyLight: THREE.HemisphereLight;
  private ambientLight: THREE.AmbientLight;

  private currentTime: number = 12; // 0-24 hours
  private animating: boolean = false;
  private animationSpeed: number = 1; // hours per second

  constructor(config?: Partial<TimeOfDayConfig>) {
    this.config = {
      latitude: 40,
      longitude: -74,
      timezone: -5,
      date: new Date(),
      sunColor: new THREE.Color(1, 1, 1),
      skyColor: new THREE.Color(0.5, 0.7, 1),
      ambientColor: new THREE.Color(0.3, 0.3, 0.4),
      sunIntensity: 1.5,
      skyIntensity: 0.5,
      ambientIntensity: 0.3,
      fogColor: new THREE.Color(0.8, 0.9, 1),
      fogDensity: 0.002,
      ...config,
    };

    // Create lights
    this.sunLight = new THREE.DirectionalLight(this.config.sunColor, this.config.sunIntensity);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.sunLight.shadow.camera.near = 0.1;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;

    this.skyLight = new THREE.HemisphereLight(this.config.skyColor, new THREE.Color(0.3, 0.2, 0.1), this.config.skyIntensity);
    this.ambientLight = new THREE.AmbientLight(this.config.ambientColor, this.config.ambientIntensity);

    this.updateLighting();
  }

  setTime(hours: number): void {
    this.currentTime = hours % 24;
    this.updateLighting();
  }

  getTime(): number {
    return this.currentTime;
  }

  startAnimation(speed: number = 1): void {
    this.animating = true;
    this.animationSpeed = speed;
  }

  stopAnimation(): void {
    this.animating = false;
  }

  update(deltaTime: number): void {
    if (this.animating) {
      this.currentTime += this.animationSpeed * deltaTime;
      this.currentTime = this.currentTime % 24;
      this.updateLighting();
    }
  }

  private updateLighting(): void {
    // Calculate sun position based on time
    const sunPosition = this.calculateSunPosition(this.currentTime);
    this.sunLight.position.copy(sunPosition);

    // Interpolate colors based on time
    const { sunColor, skyColor, ambientColor, sunIntensity } = this.getColorsForTime(this.currentTime);

    this.sunLight.color.copy(sunColor);
    this.sunLight.intensity = sunIntensity;

    this.skyLight.color.copy(skyColor);
    this.skyLight.groundColor.copy(ambientColor);

    this.ambientLight.color.copy(ambientColor);
  }

  private calculateSunPosition(hour: number): THREE.Vector3 {
    // Simplified sun position calculation
    // Real implementation would use proper astronomical calculations

    const angle = ((hour - 6) / 12) * Math.PI; // -PI/2 at 6am, PI/2 at 6pm
    const elevation = Math.sin(angle);
    const azimuth = Math.cos(angle);

    return new THREE.Vector3(
      azimuth * 100,
      elevation * 100,
      50
    );
  }

  private getColorsForTime(hour: number): {
    sunColor: THREE.Color;
    skyColor: THREE.Color;
    ambientColor: THREE.Color;
    sunIntensity: number;
  } {
    // Sunrise: 6am
    // Noon: 12pm
    // Sunset: 6pm
    // Midnight: 12am

    let sunColor: THREE.Color;
    let skyColor: THREE.Color;
    let ambientColor: THREE.Color;
    let sunIntensity: number;

    if (hour >= 5 && hour < 7) {
      // Sunrise
      const t = (hour - 5) / 2;
      sunColor = new THREE.Color().lerpColors(
        new THREE.Color(1, 0.4, 0.2), // Orange
        new THREE.Color(1, 1, 0.9),   // Warm white
        t
      );
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0.3, 0.2, 0.5), // Purple
        new THREE.Color(0.5, 0.7, 1),   // Blue
        t
      );
      ambientColor = new THREE.Color().lerpColors(
        new THREE.Color(0.1, 0.1, 0.2),
        new THREE.Color(0.3, 0.3, 0.4),
        t
      );
      sunIntensity = 0.5 + t * 1.5;
    } else if (hour >= 7 && hour < 17) {
      // Day
      sunColor = new THREE.Color(1, 1, 0.95);
      skyColor = new THREE.Color(0.5, 0.7, 1);
      ambientColor = new THREE.Color(0.4, 0.4, 0.5);
      sunIntensity = 2.0;
    } else if (hour >= 17 && hour < 19) {
      // Sunset
      const t = (hour - 17) / 2;
      sunColor = new THREE.Color().lerpColors(
        new THREE.Color(1, 1, 0.9),
        new THREE.Color(1, 0.3, 0.1), // Deep orange
        t
      );
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0.5, 0.7, 1),
        new THREE.Color(0.4, 0.2, 0.5), // Purple
        t
      );
      ambientColor = new THREE.Color().lerpColors(
        new THREE.Color(0.3, 0.3, 0.4),
        new THREE.Color(0.1, 0.1, 0.2),
        t
      );
      sunIntensity = 2.0 - t * 1.5;
    } else {
      // Night
      sunColor = new THREE.Color(0.1, 0.1, 0.3); // Moonlight
      skyColor = new THREE.Color(0.05, 0.05, 0.2);
      ambientColor = new THREE.Color(0.05, 0.05, 0.1);
      sunIntensity = 0.2;
    }

    return { sunColor, skyColor, ambientColor, sunIntensity };
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.sunLight);
    scene.add(this.skyLight);
    scene.add(this.ambientLight);
  }

  getSunLight(): THREE.DirectionalLight {
    return this.sunLight;
  }

  getSkyLight(): THREE.HemisphereLight {
    return this.skyLight;
  }

  getAmbientLight(): THREE.AmbientLight {
    return this.ambientLight;
  }
}

