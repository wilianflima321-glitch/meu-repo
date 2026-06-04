/**
 * Shader source for governed foliage rendering.
 *
 * Kept separate from the runtime classes so the foliage system stays below the
 * large-file ratchet while preserving its rendering behavior.
 */

export const FOLIAGE_VERTEX_SHADER = `
  uniform float uTime;
  uniform vec2 uWindDirection;
  uniform float uWindSpeed;
  uniform float uWindStrength;

  attribute vec3 instancePosition;
  attribute vec4 instanceRotation; // quaternion
  attribute vec3 instanceScale;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  // Wind function
  vec3 applyWind(vec3 pos, float strength) {
    float windPhase = uTime * uWindSpeed + dot(instancePosition.xz, uWindDirection) * 0.1;

    // Height-based wind effect
    float heightFactor = pos.y / (instanceScale.y * 2.0);
    heightFactor = pow(heightFactor, 2.0);

    vec2 windOffset = uWindDirection * sin(windPhase) * strength * heightFactor;
    windOffset += uWindDirection * sin(windPhase * 2.3) * strength * heightFactor * 0.3;

    pos.xz += windOffset;
    return pos;
  }

  // Apply quaternion rotation
  vec3 applyQuaternion(vec3 v, vec4 q) {
    vec3 qv = vec3(q.x, q.y, q.z);
    vec3 uv = cross(qv, v);
    vec3 uuv = cross(qv, uv);
    return v + 2.0 * (q.w * uv + uuv);
  }

  void main() {
    vUv = uv;

    // Scale
    vec3 pos = position * instanceScale;

    // Apply wind before rotation
    pos = applyWind(pos, uWindStrength);

    // Rotate
    pos = applyQuaternion(pos, instanceRotation);

    // Translate
    pos += instancePosition;

    vWorldPosition = pos;
    vNormal = applyQuaternion(normal, instanceRotation);

    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  }
`;

export const FOLIAGE_FRAGMENT_SHADER = `
  uniform sampler2D uDiffuse;
  uniform sampler2D uNormal;
  uniform float uAlphaTest;
  uniform vec3 uSubsurfaceColor;
  uniform float uSubsurfaceStrength;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 diffuse = texture2D(uDiffuse, vUv);

    // Alpha test
    if (diffuse.a < uAlphaTest) discard;

    // Simple lighting
    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
    vec3 normal = normalize(vNormal);

    float diff = max(dot(normal, lightDir), 0.0);
    float backLight = max(dot(-normal, lightDir), 0.0);

    // Subsurface scattering approximation
    vec3 subsurface = uSubsurfaceColor * backLight * uSubsurfaceStrength;

    vec3 ambient = vec3(0.3);
    vec3 color = diffuse.rgb * (ambient + diff * 0.7 + subsurface);

    gl_FragColor = vec4(color, diffuse.a);
  }
`;
