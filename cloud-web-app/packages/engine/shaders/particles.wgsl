// Aethel Engine - Particle Compute Shader
// Wave 9.0: Executes particle physics (velocity, gravity, collision) massively in parallel.

struct Particle {
    position: vec3<f32>,
    velocity: vec3<f32>,
    color: vec4<f32>,
    life: f32,
};

// Bind group 0: The Particle buffer containing millions of particles
@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;

// Bind group 1: Environment parameters (gravity, dt)
struct EnvironmentData {
    gravity: vec3<f32>,
    deltaTime: f32,
    wind: vec3<f32>,
};
@group(1) @binding(0) var<uniform> env: EnvironmentData;

// Run in workgroups of 64 threads
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    
    // Bounds check
    if (index >= arrayLength(&particles)) {
        return;
    }
    
    var p = particles[index];
    
    // If particle is dead, skip processing (or handle respawn logic)
    if (p.life <= 0.0) {
        return;
    }
    
    // Apply gravity and wind to velocity
    p.velocity += (env.gravity + env.wind) * env.deltaTime;
    
    // Integrate position
    p.position += p.velocity * env.deltaTime;
    
    // Decrease lifetime
    p.life -= env.deltaTime;
    
    // Simple ground collision plane at Y=0
    if (p.position.y < 0.0) {
        p.position.y = 0.0;
        p.velocity.y *= -0.8; // bounce with dampening
    }
    
    // Write back to VRAM
    particles[index] = p;
}
