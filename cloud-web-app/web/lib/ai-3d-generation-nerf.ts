/**
 * AI 3D generation NeRF runtime internals.
 */

import * as THREE from 'three';

import type { NeRFConfig } from './ai-3d-generation-types';

// POSITIONAL ENCODING

export class PositionalEncoding {
  private numFrequencies: number;
  private includeInput: boolean;

  constructor(numFrequencies: number = 10, includeInput: boolean = true) {
    this.numFrequencies = numFrequencies;
    this.includeInput = includeInput;
  }

  encode(x: number[]): number[] {
    const result: number[] = [];

    if (this.includeInput) {
      result.push(...x);
    }

    for (let freq = 0; freq < this.numFrequencies; freq++) {
      const scale = Math.pow(2, freq) * Math.PI;

      for (const val of x) {
        result.push(Math.sin(val * scale));
        result.push(Math.cos(val * scale));
      }
    }

    return result;
  }

  getOutputDimension(inputDim: number): number {
    const freqDim = inputDim * 2 * this.numFrequencies;
    return this.includeInput ? inputDim + freqDim : freqDim;
  }
}

// SIMPLE MLP (Multi-Layer Perceptron)

export class SimpleMLP {
  private weights: Float32Array[];
  private biases: Float32Array[];
  private layerSizes: number[];

  constructor(layerSizes: number[]) {
    this.layerSizes = layerSizes;
    this.weights = [];
    this.biases = [];

    // Initialize weights with Xavier initialization
    for (let i = 0; i < layerSizes.length - 1; i++) {
      const inputSize = layerSizes[i];
      const outputSize = layerSizes[i + 1];
      const scale = Math.sqrt(2 / (inputSize + outputSize));

      const weights = new Float32Array(inputSize * outputSize);
      for (let j = 0; j < weights.length; j++) {
        weights[j] = (Math.random() * 2 - 1) * scale;
      }
      this.weights.push(weights);

      const biases = new Float32Array(outputSize);
      this.biases.push(biases);
    }
  }

  forward(input: number[]): number[] {
    let current = input;

    for (let layer = 0; layer < this.weights.length; layer++) {
      const weights = this.weights[layer];
      const biases = this.biases[layer];
      const inputSize = this.layerSizes[layer];
      const outputSize = this.layerSizes[layer + 1];

      const output = new Array(outputSize).fill(0);

      // Matrix multiplication
      for (let j = 0; j < outputSize; j++) {
        for (let i = 0; i < inputSize; i++) {
          output[j] += current[i] * weights[i * outputSize + j];
        }
        output[j] += biases[j];

        // ReLU activation (except last layer)
        if (layer < this.weights.length - 1) {
          output[j] = Math.max(0, output[j]);
        }
      }

      current = output;
    }

    return current;
  }

  setWeights(layerIndex: number, weights: Float32Array): void {
    this.weights[layerIndex] = weights;
  }

  setBiases(layerIndex: number, biases: Float32Array): void {
    this.biases[layerIndex] = biases;
  }
}

// NERF RENDERER

export class NeRFRenderer {
  private config: NeRFConfig;
  private positionEncoder: PositionalEncoding;
  private directionEncoder: PositionalEncoding;
  private coarseNetwork: SimpleMLP;
  private fineNetwork: SimpleMLP;

  constructor(config: Partial<NeRFConfig> = {}) {
    this.config = {
      resolution: 128,
      samples: 64,
      bounces: 2,
      nearPlane: 0.1,
      farPlane: 10,
      coarseNetworkSize: 256,
      fineNetworkSize: 256,
      positionEncoding: 10,
      directionEncoding: 4,
      ...config,
    };

    this.positionEncoder = new PositionalEncoding(this.config.positionEncoding);
    this.directionEncoder = new PositionalEncoding(this.config.directionEncoding);

    const posEncDim = this.positionEncoder.getOutputDimension(3);
    const dirEncDim = this.directionEncoder.getOutputDimension(3);

    this.coarseNetwork = new SimpleMLP([
      posEncDim,
      this.config.coarseNetworkSize,
      this.config.coarseNetworkSize,
      this.config.coarseNetworkSize,
      this.config.coarseNetworkSize,
      4,
    ]);

    this.fineNetwork = new SimpleMLP([
      posEncDim + dirEncDim,
      this.config.fineNetworkSize,
      this.config.fineNetworkSize,
      this.config.fineNetworkSize,
      this.config.fineNetworkSize,
      4,
    ]);
  }

  renderRay(origin: THREE.Vector3, direction: THREE.Vector3, useFine: boolean = true): THREE.Color {
    const samples = useFine ? this.config.samples * 2 : this.config.samples;
    const near = this.config.nearPlane;
    const far = this.config.farPlane;

    const tValues: number[] = [];
    const stepSize = (far - near) / samples;

    for (let i = 0; i < samples; i++) {
      const t = near + (i + Math.random()) * stepSize;
      tValues.push(t);
    }

    const colors: THREE.Color[] = [];
    const densities: number[] = [];

    for (const t of tValues) {
      const point = origin.clone().add(direction.clone().multiplyScalar(t));
      const result = this.queryNetwork(point, direction, useFine);

      colors.push(new THREE.Color(result.r, result.g, result.b));
      densities.push(result.density);
    }

    return this.volumeRender(colors, densities, tValues);
  }

  private queryNetwork(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    useFine: boolean
  ): { r: number; g: number; b: number; density: number } {
    const posEncoded = this.positionEncoder.encode([position.x, position.y, position.z]);

    let output: number[];

    if (useFine) {
      const dirNorm = direction.clone().normalize();
      const dirEncoded = this.directionEncoder.encode([dirNorm.x, dirNorm.y, dirNorm.z]);
      output = this.fineNetwork.forward([...posEncoded, ...dirEncoded]);
    } else {
      output = this.coarseNetwork.forward(posEncoded);
    }

    return {
      r: this.sigmoid(output[0]),
      g: this.sigmoid(output[1]),
      b: this.sigmoid(output[2]),
      density: Math.max(0, output[3]),
    };
  }

  private volumeRender(colors: THREE.Color[], densities: number[], tValues: number[]): THREE.Color {
    const result = new THREE.Color(0, 0, 0);
    let transmittance = 1.0;

    for (let i = 0; i < colors.length - 1; i++) {
      const delta = tValues[i + 1] - tValues[i];
      const alpha = 1 - Math.exp(-densities[i] * delta);

      const weight = transmittance * alpha;
      result.r += weight * colors[i].r;
      result.g += weight * colors[i].g;
      result.b += weight * colors[i].b;

      transmittance *= 1 - alpha;

      if (transmittance < 0.001) break;
    }

    return result;
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  renderImage(
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    useFine: boolean = true
  ): ImageData {
    const imageData = new ImageData(width, height);
    const data = imageData.data;

    camera.updateMatrixWorld();
    const cameraMatrix = camera.matrixWorld;
    const origin = new THREE.Vector3();
    origin.setFromMatrixPosition(cameraMatrix);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ndcX = (x / width) * 2 - 1;
        const ndcY = -(y / height) * 2 + 1;

        const rayDirection = new THREE.Vector3(ndcX, ndcY, 0.5)
          .unproject(camera)
          .sub(origin)
          .normalize();

        const color = this.renderRay(origin, rayDirection, useFine);

        const idx = (y * width + x) * 4;
        data[idx] = Math.floor(Math.max(0, Math.min(1, color.r)) * 255);
        data[idx + 1] = Math.floor(Math.max(0, Math.min(1, color.g)) * 255);
        data[idx + 2] = Math.floor(Math.max(0, Math.min(1, color.b)) * 255);
        data[idx + 3] = 255;
      }
    }

    return imageData;
  }

  loadWeights(weightsData: ArrayBuffer): void {
    const view = new DataView(weightsData);
    let offset = 0;

    for (let layer = 0; layer < 5; layer++) {
      const layerSize = view.getUint32(offset, true);
      offset += 4;

      const weights = new Float32Array(weightsData, offset, layerSize);
      this.coarseNetwork.setWeights(layer, weights);
      offset += layerSize * 4;

      const biasSize = view.getUint32(offset, true);
      offset += 4;

      const biases = new Float32Array(weightsData, offset, biasSize);
      this.coarseNetwork.setBiases(layer, biases);
      offset += biasSize * 4;
    }
  }
}

