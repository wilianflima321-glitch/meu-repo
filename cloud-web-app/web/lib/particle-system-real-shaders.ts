export const PARTICLE_VERTEX_SHADER = `
uniform float time;
uniform vec3 cameraPosition;

attribute vec3 velocity;
attribute vec4 particleColor;
attribute float size;
attribute float age;
attribute float lifetime;
attribute float rotation;
attribute float alive;

varying vec4 vColor;
varying float vRotation;
varying float vAlive;
varying float vAge;
varying float vLifetime;

void main() {
  vColor = particleColor;
  vRotation = rotation;
  vAlive = alive;
  vAge = age;
  vLifetime = lifetime;
  
  // Calculate size based on age
  float ageRatio = age / lifetime;
  float currentSize = size * (1.0 - ageRatio * 0.5);
  
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = currentSize * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const PARTICLE_FRAGMENT_SHADER = `
uniform sampler2D particleTexture;
uniform bool useTexture;

varying vec4 vColor;
varying float vRotation;
varying float vAlive;
varying float vAge;
varying float vLifetime;

void main() {
  if (vAlive < 0.5) discard;
  
  vec2 uv = gl_PointCoord;
  
  // Apply rotation
  float c = cos(vRotation);
  float s = sin(vRotation);
  vec2 center = vec2(0.5, 0.5);
  uv = center + mat2(c, -s, s, c) * (uv - center);
  
  vec4 color = vColor;
  
  if (useTexture) {
    color *= texture2D(particleTexture, uv);
  } else {
    // Default circular particle
    float dist = length(uv - center);
    if (dist > 0.5) discard;
    color.a *= smoothstep(0.5, 0.3, dist);
  }
  
  // Fade based on age
  float ageRatio = vAge / vLifetime;
  color.a *= 1.0 - ageRatio;
  
  gl_FragColor = color;
}
`;
