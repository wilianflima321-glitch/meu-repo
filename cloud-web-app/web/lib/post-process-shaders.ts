export const COMPOSITE_FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform float uTime;

  // Color grading
  uniform float uExposure;
  uniform float uContrast;
  uniform float uSaturation;
  uniform float uTemperature;
  uniform float uTint;

  // Vignette
  uniform bool uVignetteEnabled;
  uniform float uVignetteIntensity;
  uniform float uVignetteSmoothness;
  uniform vec3 uVignetteColor;

  // Film grain
  uniform bool uFilmGrainEnabled;
  uniform float uFilmGrainIntensity;

  // Chromatic aberration
  uniform bool uChromaticAberrationEnabled;
  uniform float uChromaticAberrationIntensity;

  // Tonemapping
  uniform int uTonemappingMode;

  varying vec2 vUv;

  // ACES tonemapping
  vec3 ACESFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  // Reinhard tonemapping
  vec3 Reinhard(vec3 x) {
    return x / (1.0 + x);
  }

  // Filmic tonemapping
  vec3 Filmic(vec3 x) {
    vec3 X = max(vec3(0.0), x - 0.004);
    return (X * (6.2 * X + 0.5)) / (X * (6.2 * X + 1.7) + 0.06);
  }

  // Uncharted 2 tonemapping
  vec3 Uncharted2Tonemap(vec3 x) {
    float A = 0.15;
    float B = 0.50;
    float C = 0.10;
    float D = 0.20;
    float E = 0.02;
    float F = 0.30;
    return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
  }

  // Temperature/tint adjustment
  vec3 adjustTemperature(vec3 color, float temp, float tint) {
    float t = temp * 0.1;
    color.r += t;
    color.b -= t;

    float ti = tint * 0.1;
    color.g += ti;

    return color;
  }

  // Saturation adjustment
  vec3 adjustSaturation(vec3 color, float saturation) {
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(luma), color, saturation);
  }

  // Contrast adjustment
  vec3 adjustContrast(vec3 color, float contrast) {
    return (color - 0.5) * contrast + 0.5;
  }

  // Film grain
  float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;
    vec3 color;

    // Chromatic aberration
    if (uChromaticAberrationEnabled) {
      vec2 direction = uv - 0.5;
      float dist = length(direction);
      vec2 offset = direction * dist * uChromaticAberrationIntensity;

      color.r = texture2D(uTexture, uv + offset).r;
      color.g = texture2D(uTexture, uv).g;
      color.b = texture2D(uTexture, uv - offset).b;
    } else {
      color = texture2D(uTexture, uv).rgb;
    }

    // Exposure
    color *= uExposure;

    // Temperature/tint
    color = adjustTemperature(color, uTemperature, uTint);

    // Contrast
    color = adjustContrast(color, uContrast);

    // Saturation
    color = adjustSaturation(color, uSaturation);

    // Tonemapping
    if (uTonemappingMode == 1) {
      color = Reinhard(color);
    } else if (uTonemappingMode == 2) {
      color = ACESFilm(color);
    } else if (uTonemappingMode == 3) {
      color = Filmic(color);
    } else if (uTonemappingMode == 4) {
      color = Uncharted2Tonemap(color * 2.0) / Uncharted2Tonemap(vec3(11.2));
    }

    // Film grain
    if (uFilmGrainEnabled) {
      float grain = (rand(uv + uTime) - 0.5) * uFilmGrainIntensity;
      color += grain;
    }

    // Vignette
    if (uVignetteEnabled) {
      vec2 center = uv - 0.5;
      float dist = length(center);
      float vignette = smoothstep(0.5 - uVignetteSmoothness, 0.5, dist * uVignetteIntensity);
      color = mix(color, uVignetteColor, vignette);
    }

    // Gamma correction
    color = pow(color, vec3(1.0 / 2.2));

    gl_FragColor = vec4(color, 1.0);
  }
`;
