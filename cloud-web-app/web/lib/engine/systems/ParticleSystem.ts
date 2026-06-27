import { WebGPUContext } from '../renderer/WebGPUContext';

/**
 * ParticleSystem (WebGPU)
 * Despacha blocos WGSL para processar milhões de partículas na VRAM.
 */
export class ParticleSystem {
  private pipeline: GPUComputePipeline | null = null;
  private particleBuffer: GPUBuffer | null = null;
  private envBuffer: GPUBuffer | null = null;
  private particleCount: number = 0;

  public async init(count: number, shaderSource: string) {
    const device = WebGPUContext.getDevice();
    this.particleCount = count;

    // Compile shader
    const shaderModule = device.createShaderModule({
      label: 'Particle Compute Shader',
      code: shaderSource,
    });

    this.pipeline = device.createComputePipeline({
      label: 'Particle Compute Pipeline',
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main',
      },
    });

    // Create particle buffer (Storage)
    const particleByteSize = count * (4 * 3 + 4 * 3 + 4 * 4 + 4); // pos, vel, color, life
    this.particleBuffer = device.createBuffer({
      size: particleByteSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
    });

    // Create environment buffer (Uniform)
    this.envBuffer = device.createBuffer({
      size: 4 * 8, // padded for vec3/f32 alignments
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create bind group mapping buffer to shader @group(0) and @group(1)
    // Note: in a real implementation we would split them or combine layout.
    // Simplifying mapping for blueprint execution.
  }

  public update(deltaTime: number) {
    if (!this.pipeline || !this.particleBuffer || !this.envBuffer) return;
    
    const device = WebGPUContext.getDevice();
    
    // Update Uniforms (Gravity, Wind, DeltaTime)
    device.queue.writeBuffer(this.envBuffer, 0, new Float32Array([
      0, -9.81, 0, 0, // gravity
      deltaTime,      // dt
      0.5, 0, 0       // wind
    ]));

    // Dispatch Compute Pass
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    
    passEncoder.setPipeline(this.pipeline);
    // passEncoder.setBindGroup(0, this.bindGroup);
    
    // Workgroup size is 64, so dispatch (particleCount / 64) groups
    const workgroups = Math.ceil(this.particleCount / 64);
    passEncoder.dispatchWorkgroups(workgroups);
    
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
  }
}
