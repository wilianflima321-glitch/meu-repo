struct Particle {
  position: vec3<f32>,
  velocity: vec3<f32>,
  color: vec4<f32>,
  life: f32,
  maxLife: f32,
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;

struct SimParams {
  deltaTime: f32,
  gravity: vec3<f32>,
  drag: f32,
  wind: vec3<f32>,
}
@group(0) @binding(1) var<uniform> params: SimParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
  let index = GlobalInvocationID.x;
  if (index >= arrayLength(&particles)) {
    return;
  }

  var p = particles[index];
  
  // Update life
  p.life -= params.deltaTime;
  if (p.life <= 0.0) {
    // Basic respawn logic for continuous simulation
    p.life = p.maxLife;
    p.position = vec3<f32>(0.0, 10.0, 0.0); // Emit origin
    p.velocity = vec3<f32>(0.0, 0.0, 0.0);
  } else {
    // Physics integration
    let force = params.gravity + params.wind;
    p.velocity = p.velocity + force * params.deltaTime;
    p.velocity = p.velocity * (1.0 - params.drag * params.deltaTime);
    p.position = p.position + p.velocity * params.deltaTime;
    
    // Simple ground collision
    if (p.position.y < 0.0) {
      p.position.y = 0.0;
      p.velocity.y = p.velocity.y * -0.5; // Bounce
    }
  }

  // Fade out color alpha based on life
  p.color.a = clamp(p.life / p.maxLife, 0.0, 1.0);

  particles[index] = p;
}
