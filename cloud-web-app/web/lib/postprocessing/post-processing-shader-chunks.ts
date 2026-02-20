export const COMMON_SHADER = `
  varying vec2 vUv;
  
  vec3 saturate3(vec3 x) {
    return clamp(x, 0.0, 1.0);
  }
  
  float luminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
  }
`;

export const TONEMAPPING_FUNCTIONS = `
  vec3 tonemapReinhard(vec3 color) {
    return color / (1.0 + color);
  }
  
  vec3 tonemapCineon(vec3 color) {
    color = max(vec3(0.0), color - 0.004);
    return pow((color * (6.2 * color + 0.5)) / (color * (6.2 * color + 1.7) + 0.06), vec3(2.2));
  }
  
  vec3 tonemapACES(vec3 color) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return saturate3((color * (a * color + b)) / (color * (c * color + d) + e));
  }
  
  vec3 tonemapFilmic(vec3 color) {
    vec3 x = max(vec3(0.0), color - 0.004);
    return (x * (6.2 * x + 0.5)) / (x * (6.2 * x + 1.7) + 0.06);
  }
`;
