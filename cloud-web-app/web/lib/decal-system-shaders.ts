// Deferred decal shader code is split out to keep the runtime manager readable.

export const DEFERRED_DECAL_VERTEX = `
  varying vec4 vProjectedPosition;
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vProjectedPosition = projectionMatrix * viewMatrix * worldPosition;
    gl_Position = vProjectedPosition;
  }
`;

export const DEFERRED_DECAL_FRAGMENT = `
  uniform sampler2D uDecalTexture;
  uniform sampler2D uDecalNormalMap;
  uniform sampler2D uDepthTexture;
  uniform sampler2D uNormalTexture;

  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrixInverse;
  uniform mat4 uDecalMatrixInverse;

  varying vec4 vProjectedPosition;
  varying vec3 vWorldPosition;

  void main() {
    // Get screen UV
    vec2 screenUV = (vProjectedPosition.xy / vProjectedPosition.w) * 0.5 + 0.5;

    // Sample depth and reconstruct world position
    float depth = texture2D(uDepthTexture, screenUV).r;

    vec4 clipPos = vec4(screenUV * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 viewPos = uProjectionMatrixInverse * clipPos;
    viewPos /= viewPos.w;

    vec3 worldPos = (inverse(uViewMatrix) * viewPos).xyz;

    // Transform to decal space
    vec4 decalPos = uDecalMatrixInverse * vec4(worldPos, 1.0);

    // Check if point is inside decal box
    if (abs(decalPos.x) > 0.5 || abs(decalPos.y) > 0.5 || abs(decalPos.z) > 0.5) {
      discard;
    }

    // Calculate decal UV
    vec2 decalUV = decalPos.xy + 0.5;

    // Sample decal texture
    vec4 decalColor = texture2D(uDecalTexture, decalUV);

    if (decalColor.a < 0.01) discard;

    gl_FragColor = decalColor;
  }
`;
