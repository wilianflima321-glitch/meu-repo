import * as THREE from 'three';
import { WebGPUContext } from './WebGPUContext';

// We fetch the raw WGSL file content. In a Next.js environment with raw-loader
// or by fetching a static asset. For now, we will assume it's loaded as a string.
// Aethel Engine WGSL Loader pattern:
const WGSL_SOURCE = `
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
  
  p.life -= params.deltaTime;
  if (p.life <= 0.0) {
    p.life = p.maxLife;
    p.position = vec3<f32>(0.0, 10.0, 0.0);
    p.velocity = vec3<f32>(0.0, 0.0, 0.0);
  } else {
    let force = params.gravity + params.wind;
    p.velocity = p.velocity + force * params.deltaTime;
    p.velocity = p.velocity * (1.0 - params.drag * params.deltaTime);
    p.position = p.position + p.velocity * params.deltaTime;
    
    if (p.position.y < 0.0) {
      p.position.y = 0.0;
      p.velocity.y = p.velocity.y * -0.5;
    }
  }

  p.color.a = clamp(p.life / p.maxLife, 0.0, 1.0);
  particles[index] = p;
}
`;

export class ParticleComputeSystem {
  private device!: GPUDevice;
  private pipeline!: GPUComputePipeline;
  private particleBuffer!: GPUBuffer;
  private paramsBuffer!: GPUBuffer;
  private readBuffer!: GPUBuffer;
  private bindGroup!: GPUBindGroup;

  private particleCount: number;
  private workgroupCount: number;

  // Stride is 12 floats: position(3) + pad(1) + velocity(3) + pad(1) + color(4) + life(1) + maxLife(1) + pad(2) = 16 floats = 64 bytes
  private readonly PARTICLE_STRIDE_BYTES = 64;

  constructor(particleCount: number) {
    this.particleCount = particleCount;
    // Workgroup size is 64
    this.workgroupCount = Math.ceil(particleCount / 64);
  }

  public async init(): Promise<void> {
    await WebGPUContext.init();
    this.device = WebGPUContext.getDevice();

    const shaderModule = this.device.createShaderModule({
      label: 'Particle Compute Shader',
      code: WGSL_SOURCE,
    });

    this.pipeline = await this.device.createComputePipelineAsync({
      label: 'Particle Compute Pipeline',
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main',
      },
    });

    const bufferSize = this.particleCount * this.PARTICLE_STRIDE_BYTES;

    this.particleBuffer = this.device.createBuffer({
      label: 'Particle Storage Buffer',
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });

    // Initialize particles on CPU and upload
    const initialData = new Float32Array(bufferSize / 4);
    for (let i = 0; i < this.particleCount; i++) {
      const offset = i * 16;
      // Position
      initialData[offset + 0] = (Math.random() - 0.5) * 20;
      initialData[offset + 1] = Math.random() * 20;
      initialData[offset + 2] = (Math.random() - 0.5) * 20;
      // Velocity
      initialData[offset + 4] = 0;
      initialData[offset + 5] = 0;
      initialData[offset + 6] = 0;
      // Color
      initialData[offset + 8] = 1.0;
      initialData[offset + 9] = 1.0;
      initialData[offset + 10] = 1.0;
      initialData[offset + 11] = 1.0;
      // Life
      initialData[offset + 12] = Math.random() * 5.0;
      // MaxLife
      initialData[offset + 13] = 5.0;
    }
    this.device.queue.writeBuffer(this.particleBuffer, 0, initialData);

    this.paramsBuffer = this.device.createBuffer({
      label: 'Simulation Params Uniform',
      size: 32, // 8 floats (deltaTime, pad, pad, pad, gravity.x, y, z, drag, wind.x, y, z, pad)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.readBuffer = this.device.createBuffer({
      label: 'Particle Read Buffer',
      size: bufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    this.bindGroup = this.device.createBindGroup({
      label: 'Particle Bind Group',
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: this.paramsBuffer } },
      ],
    });
  }

  public simulate(deltaTime: number): void {
    if (!this.device) return;

    // Update params
    // struct SimParams { deltaTime: f32, gravity: vec3<f32>, drag: f32, wind: vec3<f32> }
    // memory layout aligned to 16 bytes (vec4)
    const paramsData = new Float32Array(12);
    paramsData[0] = deltaTime;
    // pad 1, 2, 3
    paramsData[4] = 0.0; // gravity.x
    paramsData[5] = -9.81; // gravity.y
    paramsData[6] = 0.0; // gravity.z
    paramsData[7] = 0.1; // drag
    paramsData[8] = 2.0; // wind.x
    paramsData[9] = 0.0; // wind.y
    paramsData[10] = 0.0; // wind.z
    
    this.device.queue.writeBuffer(this.paramsBuffer, 0, paramsData);

    const commandEncoder = this.device.createCommandEncoder({ label: 'Particle Compute Encoder' });
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.dispatchWorkgroups(this.workgroupCount);
    passEncoder.end();

    // Copy to read buffer for WebGL sync
    commandEncoder.copyBufferToBuffer(
      this.particleBuffer, 0,
      this.readBuffer, 0,
      this.particleCount * this.PARTICLE_STRIDE_BYTES
    );

    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Sincroniza de forma assíncrona o buffer da GPU para a CPU (InstancedMesh)
  public async syncToWebGL(instancedMesh: THREE.InstancedMesh): Promise<void> {
    if (this.readBuffer.mapState === 'unmapped') {
      await this.readBuffer.mapAsync(GPUMapMode.READ);
      const arrayBuffer = this.readBuffer.getMappedRange();
      const gpuData = new Float32Array(arrayBuffer);

      const dummy = new THREE.Object3D();
      for (let i = 0; i < this.particleCount; i++) {
        const offset = i * 16;
        dummy.position.set(gpuData[offset + 0], gpuData[offset + 1], gpuData[offset + 2]);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;

      this.readBuffer.unmap();
    }
  }
}
