/** Hair shading model extracted from hair/fur runtime. */

import * as THREE from 'three';

export class MarschnerHairShader {
  private longitudinalWidth: number = 10; // degrees
  private azimuthalWidth: number = 25; // degrees
  private scaleAngle: number = 2.5; // degrees
  
  private ior: number = 1.55; // Index of refraction
  private absorption: THREE.Color = new THREE.Color(0.8, 0.4, 0.2);
  
  // Calculate R (primary specular reflection)
  calculateR(
    lightDir: THREE.Vector3,
    viewDir: THREE.Vector3,
    tangent: THREE.Vector3
  ): number {
    const sinThetaI = lightDir.dot(tangent);
    const sinThetaR = viewDir.dot(tangent);
    
    const cosThetaI = Math.sqrt(1 - sinThetaI * sinThetaI);
    const cosThetaR = Math.sqrt(1 - sinThetaR * sinThetaR);
    
    // Longitudinal scattering (M term)
    const thetaH = (Math.asin(sinThetaI) + Math.asin(sinThetaR)) / 2;
    const thetaD = (Math.asin(sinThetaI) - Math.asin(sinThetaR)) / 2;
    
    const alpha = this.scaleAngle * Math.PI / 180;
    const betaM = this.longitudinalWidth * Math.PI / 180;
    
    const M = this.gaussian(betaM, thetaH - alpha);
    
    // Azimuthal scattering (N term)
    const phi = Math.acos(Math.max(-1, Math.min(1, lightDir.clone().sub(tangent.clone().multiplyScalar(sinThetaI)).normalize().dot(
      viewDir.clone().sub(tangent.clone().multiplyScalar(sinThetaR)).normalize()
    ))));
    
    const betaN = this.azimuthalWidth * Math.PI / 180;
    const N = this.gaussian(betaN, phi);
    
    // Fresnel reflection
    const cosHalfAngle = Math.cos((Math.asin(sinThetaI) - Math.asin(sinThetaR)) / 2);
    const F = this.fresnel(cosHalfAngle, this.ior);
    
    return M * N * F;
  }
  
  // Calculate TT (transmission through hair)
  calculateTT(
    lightDir: THREE.Vector3,
    viewDir: THREE.Vector3,
    tangent: THREE.Vector3,
    color: THREE.Color
  ): THREE.Color {
    const sinThetaI = lightDir.dot(tangent);
    const sinThetaR = viewDir.dot(tangent);
    
    // Longitudinal
    const thetaH = (Math.asin(sinThetaI) + Math.asin(sinThetaR)) / 2;
    const alpha = -this.scaleAngle * Math.PI / 180 / 2;
    const betaM = this.longitudinalWidth * Math.PI / 180 / 2;
    
    const M = this.gaussian(betaM, thetaH - alpha);
    
    // Absorption through hair
    const absorption = new THREE.Color().copy(this.absorption).multiplyScalar(
      1 / Math.cos(Math.asin(sinThetaI * 0.5))
    );
    
    const transmittance = new THREE.Color(
      Math.exp(-absorption.r),
      Math.exp(-absorption.g),
      Math.exp(-absorption.b)
    );
    
    // Fresnel for transmission
    const cosHalfAngle = Math.cos((Math.asin(sinThetaI) - Math.asin(sinThetaR)) / 2);
    const F = 1 - this.fresnel(cosHalfAngle, this.ior);
    
    return color.clone().multiply(transmittance).multiplyScalar(M * F * F);
  }
  
  // Calculate TRT (internal reflection)
  calculateTRT(
    lightDir: THREE.Vector3,
    viewDir: THREE.Vector3,
    tangent: THREE.Vector3,
    color: THREE.Color
  ): THREE.Color {
    const sinThetaI = lightDir.dot(tangent);
    const sinThetaR = viewDir.dot(tangent);
    
    // Longitudinal
    const thetaH = (Math.asin(sinThetaI) + Math.asin(sinThetaR)) / 2;
    const alpha = -3 * this.scaleAngle * Math.PI / 180 / 2;
    const betaM = 2 * this.longitudinalWidth * Math.PI / 180;
    
    const M = this.gaussian(betaM, thetaH - alpha);
    
    // Double absorption
    const absorption = new THREE.Color().copy(this.absorption).multiplyScalar(2);
    const transmittance = new THREE.Color(
      Math.exp(-absorption.r),
      Math.exp(-absorption.g),
      Math.exp(-absorption.b)
    );
    
    const cosHalfAngle = Math.cos((Math.asin(sinThetaI) - Math.asin(sinThetaR)) / 2);
    const F = this.fresnel(cosHalfAngle, this.ior);
    
    return color.clone().multiply(transmittance).multiplyScalar(M * F * (1 - F) * (1 - F));
  }
  
  private gaussian(width: number, x: number): number {
    return Math.exp(-x * x / (2 * width * width)) / (width * Math.sqrt(2 * Math.PI));
  }
  
  private fresnel(cosTheta: number, ior: number): number {
    const r0 = ((1 - ior) / (1 + ior)) ** 2;
    return r0 + (1 - r0) * Math.pow(1 - cosTheta, 5);
  }
  
  setAbsorption(color: THREE.Color): void {
    this.absorption.copy(color);
  }
  
  setIOR(ior: number): void {
    this.ior = ior;
  }
}
